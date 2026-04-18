import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/orchestrator/tick
 *
 * The autonomous heartbeat of the agentic projects system. Fires every 5 min
 * via Vercel cron. Reads `task_lifecycle_events` outbox + finds stalled tasks
 * and dispatches the right agent for each transition.
 *
 * Transition → agent mapping:
 *   ready       → tasks.agent (specialist owns it)
 *   in_progress → tasks.agent (continue / resume)
 *   in_review   → 'validation'  (QA/verify the work)
 *   blocked     → 'main' (Jarvis triages, either unblocks or reassigns)
 *
 * Stalled task rules:
 *   - in_progress with no activity >30 min → re-dispatch agent
 *   - blocked with no triage activity >60 min → re-escalate to Jarvis
 *   - ready in active project >120 min with no pickup → escalate to Jarvis
 *
 * Auth: CRON_SECRET via Bearer or ?key=. Vercel cron passes it automatically.
 */
export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim() || ''
  const authHeader = req.headers.get('authorization') || ''
  const queryKey = new URL(req.url).searchParams.get('key') || ''
  if (expected && authHeader !== `Bearer ${expected}` && queryKey !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const openclawBase = process.env.NEXT_PUBLIC_OPENCLAW_API_URL || ''
  if (!openclawBase) {
    return NextResponse.json({ ok: false, error: 'NEXT_PUBLIC_OPENCLAW_API_URL not set' }, { status: 500 })
  }

  const results: {
    processed: number
    dispatched: number
    errored: number
    stalled_redispatched: number
    details: Array<Record<string, unknown>>
  } = { processed: 0, dispatched: 0, errored: 0, stalled_redispatched: 0, details: [] }

  // 1) Process outbox events. Limit per tick is small (6) because the gateway
  // can't handle >4 parallel Sonnet calls — we saw 42/42 timeouts when all 21
  // events dispatched simultaneously. With */5 cron, 6 events × 12 ticks/hr
  // = 72 tasks/hr capacity, which is way more than we'll produce.
  // BATCH_SIZE = concurrent dispatches. INTER_BATCH_MS = stagger.
  const BATCH_SIZE = 4
  const INTER_BATCH_MS = 3000
  const MAX_PER_TICK = 12

  const { data: events, error: qErr } = await supabase
    .from('task_lifecycle_events')
    .select('*')
    .is('processed_at', null)
    .lt('retry_count', 5)
    .order('created_at', { ascending: true })
    .limit(MAX_PER_TICK)
  if (qErr) {
    return NextResponse.json({ ok: false, error: qErr.message }, { status: 500 })
  }

  // Batch the event list into groups of BATCH_SIZE. Within a batch, dispatch
  // in parallel. Between batches, sleep INTER_BATCH_MS so the gateway can
  // finish the previous round before we pile on more.
  const allEvents = (events ?? []) as Array<Record<string, unknown>>
  const batches: Array<typeof allEvents> = []
  for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
    batches.push(allEvents.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    await Promise.all(batch.map(async (ev) => {
      results.processed++
      const taskId = ev.task_id as string
      const toStage = ev.to_stage as string
      const assignedAgent = ev.assigned_agent as string | null
      const fromStage = ev.from_stage as string | null

      try {
        const targetAgent = resolveAgentForStage(toStage, assignedAgent)
        if (!targetAgent) {
          await markProcessed(ev.id as string, { skipped: `no agent for stage=${toStage}` })
          return
        }

        const [{ data: task }, { data: project }] = await Promise.all([
          supabase.from('tasks').select('*').eq('id', taskId).maybeSingle(),
          ev.project_id
            ? supabase.from('projects').select('*').eq('id', ev.project_id as string).maybeSingle()
            : Promise.resolve({ data: null }),
        ])
        if (!task) {
          await markProcessed(ev.id as string, { error: 'task not found' })
          return
        }

        const prompt = composePrompt(toStage, task as Record<string, unknown>, project as Record<string, unknown> | null, fromStage)
        const runId = `orch-${taskId}-${Date.now()}`

        const resp = await fetch(`${openclawBase.replace(/\/$/, '')}/api/agent/invoke`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: targetAgent,
            runId,
            contextType: 'task',
            contextId: taskId,
            contextLabel: String(task.name ?? ''),
            payload: {
              action: `orchestrator:${toStage}`,
              prompt,
              taskId,
              projectId: ev.project_id,
              fromStage,
              toStage,
            },
          }),
          signal: AbortSignal.timeout(12000),
        })
        const ok = resp.ok
        const body = await resp.json().catch(() => ({}))

        if (!ok) {
          await supabase.from('task_lifecycle_events').update({
            retry_count: ((ev.retry_count as number) ?? 0) + 1,
            error: `HTTP ${resp.status}: ${JSON.stringify(body).slice(0, 200)}`,
          } as never).eq('id', ev.id as string)
          results.errored++
          results.details.push({ task_id: taskId, to_stage: toStage, error: `HTTP ${resp.status}` })
          return
        }

        await supabase.from('task_lifecycle_events').update({
          processed_at: new Date().toISOString(),
          processed_by: 'orchestrator-tick',
          dispatch_run_id: runId,
        } as never).eq('id', ev.id as string)

        await supabase.from('tasks').update({
          dispatch_count: ((task.dispatch_count as number) ?? 0) + 1,
          last_activity_at: new Date().toISOString(),
        } as never).eq('id', taskId)

        await supabase.from('task_activity').insert({
          task_id: taskId,
          project_id: ev.project_id,
          event_type: 'dispatched',
          actor: 'orchestrator',
          from_value: fromStage,
          to_value: toStage,
          details: { agent: targetAgent, runId },
        } as never)

        results.dispatched++
        results.details.push({ task_id: taskId, to_stage: toStage, agent: targetAgent, run_id: runId })
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        await supabase.from('task_lifecycle_events').update({
          retry_count: ((ev.retry_count as number) ?? 0) + 1,
          error: msg.slice(0, 500),
        } as never).eq('id', ev.id as string)
        results.errored++
        results.details.push({ task_id: taskId, error: msg.slice(0, 120) })
      }
    }))
    // Inter-batch stagger — gives the gateway time to finish the previous
    // batch's Sonnet calls before we pile on more.
    if (batches.indexOf(batch) < batches.length - 1) {
      await new Promise((r) => setTimeout(r, INTER_BATCH_MS))
    }
  }

  // 2) Stalled tasks — push a fresh outbox row if agent hasn't acted
  const STALL_IN_PROGRESS_MIN = 30
  const STALL_BLOCKED_MIN = 60
  const STALL_READY_MIN = 120

  for (const rule of [
    { stage: 'in_progress', stall_min: STALL_IN_PROGRESS_MIN, reason: 'in_progress-stalled' },
    { stage: 'blocked',     stall_min: STALL_BLOCKED_MIN,     reason: 'blocked-no-triage' },
    { stage: 'ready',       stall_min: STALL_READY_MIN,       reason: 'ready-not-picked-up' },
  ]) {
    const cutoff = new Date(Date.now() - rule.stall_min * 60 * 1000).toISOString()
    const { data: stalled } = await supabase
      .from('tasks')
      .select('id, project_id, status, agent, name, last_activity_at, dispatch_count')
      .eq('status', rule.stage)
      .or(`last_activity_at.is.null,last_activity_at.lt.${cutoff}`)
      .lt('dispatch_count', 10)  // safety: stop after 10 dispatches
      .limit(10)
    for (const t of (stalled ?? []) as Array<Record<string, unknown>>) {
      await supabase.from('task_lifecycle_events').insert({
        task_id: t.id,
        project_id: t.project_id,
        from_stage: t.status,
        to_stage: t.status,
        assigned_agent: t.agent,
        payload: { reason: rule.reason, task_name: t.name },
      } as never)
      await supabase.from('tasks').update({
        last_activity_at: new Date().toISOString(),
      } as never).eq('id', t.id as string)
      results.stalled_redispatched++
    }
  }

  return NextResponse.json({ ok: true, ranAt: new Date().toISOString(), ...results })

  async function markProcessed(eventId: string, extra: Record<string, unknown>) {
    await supabase.from('task_lifecycle_events').update({
      processed_at: new Date().toISOString(),
      processed_by: 'orchestrator-tick',
      error: extra.error ?? null,
    } as never).eq('id', eventId)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveAgentForStage(stage: string, assignedAgent: string | null): string | null {
  if (stage === 'in_review') return 'validation'
  if (stage === 'blocked') return 'main' // Jarvis triages
  // ready / in_progress → the task's assigned agent; fallback main if unset
  if (assignedAgent && assignedAgent.trim()) return assignedAgent.trim()
  return 'main'
}

function composePrompt(
  toStage: string,
  task: Record<string, unknown>,
  project: Record<string, unknown> | null,
  fromStage: string | null,
): string {
  const name = String(task.name ?? 'Untitled task')
  const description = task.description ? String(task.description) : ''
  const ac = task.acceptance_criteria ? String(task.acceptance_criteria) : ''
  const blocks = task.blocks_reason ? String(task.blocks_reason) : ''
  const priority = String(task.priority ?? 'p2')
  const size = String(task.size ?? 'm')
  const projectName = project?.name ? String(project.name) : ''

  if (toStage === 'ready' || toStage === 'in_progress') {
    return [
      `TASK ASSIGNMENT — you own this and are expected to complete it now.`,
      ``,
      `Project: ${projectName}`,
      `Task: ${name}`,
      `Priority: ${priority}    Size: ${size}`,
      description ? `Description: ${description}` : '',
      ac ? `\nAcceptance criteria (Definition of Done):\n${ac}` : '',
      fromStage ? `\nMoved from ${fromStage} → ${toStage}.` : '',
      ``,
      `Deliver the work end-to-end. If you finish: produce the artifact or summary, then write a one-paragraph status ending with DONE. If you hit a blocker you can't resolve, respond with your blocker prefaced with BLOCKED: <specific reason> and what you need from the human.`,
      `Do not defer. Do not say "I'll get back to you." Produce real output now.`,
    ].filter(Boolean).join('\n')
  }
  if (toStage === 'in_review') {
    return [
      `VALIDATION REQUEST — review the work completed on this task and decide pass/fail.`,
      ``,
      `Project: ${projectName}`,
      `Task: ${name}`,
      description ? `Description: ${description}` : '',
      ac ? `\nAcceptance criteria to check against:\n${ac}` : '',
      ``,
      `Pull the recent agent_runs for this task, compare the output to the acceptance criteria, and respond with either:`,
      `  PASS — acceptance criteria met. Summary: <one line>.`,
      `  FAIL — criteria not met. Gap: <specific gap> Recommended next step: <action>.`,
    ].filter(Boolean).join('\n')
  }
  if (toStage === 'blocked') {
    return [
      `BLOCKED TASK TRIAGE — as Jarvis, decide how to unblock this or escalate.`,
      ``,
      `Project: ${projectName}`,
      `Task: ${name}`,
      `Priority: ${priority}`,
      blocks ? `Blocker reason: ${blocks}` : '',
      description ? `Description: ${description}` : '',
      ``,
      `Options:`,
      `  1. If you can unblock autonomously: describe the fix + dispatch the right agent.`,
      `  2. If you need external input (credentials, human decision, data): write BLOCKER-FOR-HUMAN: <the exact ask> so the daily digest surfaces it.`,
      `  3. If the task is obsolete or wrong: recommend CANCEL with reason.`,
    ].filter(Boolean).join('\n')
  }
  return `Task ${name} moved to stage ${toStage}. Respond with current state.`
}
