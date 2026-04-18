import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// database.types.ts was generated before the lifecycle schema + RPCs landed,
// and writes use `as never` to bypass the stale generated types. `sb` is the
// same client typed loosely for RPC calls + inserts where TS has no schema.
const sb = supabase as unknown as {
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

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

  // 1) Process outbox events via atomic RPC claim. Before 2026-04-18 this was
  // SELECT-then-UPDATE which raced across concurrent ticks: same row claimed
  // twice, processed_at updated but the next tick still saw it as pending.
  // Observed 2026-04-18: same 2 events "processed" across 4+ ticks.
  // Fix: claim_lifecycle_events() RPC uses FOR UPDATE SKIP LOCKED + sets
  // processed_at=now() in the same statement. If the downstream dispatch
  // fails, release_lifecycle_event(id, error) puts it back on the queue.
  const BATCH_SIZE = 4
  const INTER_BATCH_MS = 3000
  const MAX_PER_TICK = 12

  // Bypass supabase-js for the claim — call the RPC via raw fetch so we know
  // exactly what URL + key are used, and get a fresh connection every time.
  // supabase-js with pooled connections produced stale reads: claimed events
  // showed pre-update processed_at values despite the RPC's SET clause.
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  // Service-role key in Vercel env has literal \n suffix (known issue,
  // shared with PLAID_TOKEN_ENCRYPTION_KEY). Normalize by stripping all
  // non-JWT chars after trim.
  const rawSrk = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  const srk = rawSrk.replace(/\\n/g, '').replace(/[^A-Za-z0-9._-]/g, '').trim()
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()
  const supaKey = srk || anonKey

  const claimResp = await fetch(`${supaUrl}/rest/v1/rpc/claim_lifecycle_events`, {
    method: 'POST',
    headers: {
      'apikey': supaKey,
      'Authorization': `Bearer ${supaKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      'Cache-Control': 'no-cache',
    },
    body: JSON.stringify({ p_limit: MAX_PER_TICK }),
    cache: 'no-store',
  })
  if (!claimResp.ok) {
    const txt = await claimResp.text()
    return NextResponse.json({ ok: false, error: `claim failed: ${claimResp.status} ${txt}` }, { status: 500 })
  }
  const events = await claimResp.json() as Array<Record<string, unknown>>

  // Diagnostic passthrough: ?debug=1 returns claim result + env fingerprint
  // and skips dispatch. Useful when something regresses — hit the endpoint
  // with debug=1 to confirm the RPC sees what we expect before burning agent
  // invocations. Safe to keep in prod since it requires the CRON_SECRET.
  if (new URL(req.url).searchParams.get('debug') === '1') {
    return NextResponse.json({
      tickVersion: 'v3-raw-fetch-2026-04-18',
      supabaseUrl: supaUrl,
      keyRole: supaKey.startsWith('eyJ') ? 'jwt' : 'publishable',
      claimedEventCount: events.length,
      claimedEvents: events,
    })
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
          // Release the claim so the event can retry on next tick
          await sb.rpc('release_lifecycle_event', {
            p_id: ev.id as string,
            p_error: `HTTP ${resp.status}: ${JSON.stringify(body).slice(0, 400)}`,
          })
          results.errored++
          results.details.push({ task_id: taskId, to_stage: toStage, error: `HTTP ${resp.status}` })
          return
        }

        // Finalize the claim with real dispatch_run_id (claim RPC used a
        // placeholder). processed_at is already set by the RPC.
        await supabase.from('task_lifecycle_events').update({
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
        // Release the claim so it can retry (release RPC also bumps retry_count)
        await sb.rpc('release_lifecycle_event', {
          p_id: ev.id as string,
          p_error: msg.slice(0, 500),
        })
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
      // Dedup: a partial unique index on (task_id, to_stage) WHERE
      // processed_at IS NULL prevents a duplicate pending row. If one exists
      // we silently skip; otherwise insert a fresh stall event.
      const { data: ins, error: insErr } = await (supabase
        .from('task_lifecycle_events') as any)
        .insert({
          task_id: t.id,
          project_id: t.project_id,
          from_stage: t.status,
          to_stage: t.status,
          assigned_agent: t.agent,
          payload: { reason: rule.reason, task_name: t.name },
        })
        .select('id')
      if (!insErr && ins && ins.length > 0) {
        await supabase.from('tasks').update({
          last_activity_at: new Date().toISOString(),
        } as never).eq('id', t.id as string)
        results.stalled_redispatched++
      }
      // If insErr is a unique-violation (23505) we treat as already-queued
      // and move on without bumping last_activity_at.
    }
  }

  return NextResponse.json({
    ok: true,
    tickVersion: 'v2-rpc-claim-2026-04-18',
    ranAt: new Date().toISOString(),
    pendingBefore: (events as unknown[] | null)?.length ?? 0,
    ...results,
  })

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
