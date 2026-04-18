/**
 * OpenClaw Agent Integration Layer
 *
 * Master branch pattern: agents hit http://localhost:7070/api/* (getApiUrl()).
 * In v7 (Next.js, server + client), we stub the actual HTTP call with a TODO
 * but always write a real row to agent_runs in Supabase so the queue is real.
 */

import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentId = string

export interface Agent {
  id: AgentId
  name: string
  description: string | null
  status: 'active' | 'idle' | 'offline'
  capabilities: string[]
  created_at: string
  // Extended data fields (added via migration add_agent_data_fields)
  knowledge_level?: string | null   // e.g. 'expert', 'specialist', 'general'
  current_task?: string | null      // description of the task currently assigned
  last_run_ts?: string | null       // ISO timestamp of last run
  runs_today?: number               // count of runs started today
  success_rate?: number | null      // 0–100 percentage of successful runs
  avg_latency_ms?: number | null    // average ms per completed run
  cost_ytd?: number                 // total cost year-to-date in USD
  owner?: string | null             // human responsible (e.g. "Jarvis")
  dependencies?: string[]           // agent ids this agent depends on
  trigger_type?: string | null      // 'cron' | 'event' | 'manual'
  health_status?: string | null     // 'healthy' | 'degraded' | 'down' | 'unknown'
  model?: string | null             // model slug e.g. 'claude-sonnet-4-6'
  tier?: string | null              // 'primary' | 'backup' | 'utility'
  color?: string | null             // display color hex
}

export interface AgentRun {
  id: string
  agent_id: AgentId
  status: 'queued' | 'running' | 'done' | 'error'
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  context_type: string | null   // e.g. 'project', 'task', 'forge_idea'
  context_id: string | null
  created_at: string
  updated_at: string
}

export interface InvokeAgentOptions {
  agentId: AgentId
  payload: Record<string, unknown>
  contextType?: string
  contextId?: string
}

// ─── Hard-coded fallback agent roster — the 23 REAL OpenClaw agents ─────────
// Source of truth: ~/.openclaw/agents/ + PROD `agents` table on Supabase.
// Models here reflect the 5-tier routing plan locked 2026-04-18 (see
// ~/.claude/.../project_openclaw_reliability_plan.md).

export const BUILTIN_AGENTS: Agent[] = [
  { id: 'main',                name: 'Jarvis',              description: 'Chief of Staff — primary orchestrator, your interface',        status: 'active', capabilities: ['research','plan','execute','delegate'],  tier: 'primary',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, dependencies: ['coding-agent','executive-assistant'], created_at: '' },
  { id: 'cfo',                 name: 'CFO',                 description: 'Financial orchestration + strategy across entities',           status: 'active', capabilities: ['finance','forecast','budget','tax'],       tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'bookkeeper',          name: 'Bookkeeper',          description: 'QuickBooks operations, expense categorization, reconciliation',status: 'idle',   capabilities: ['quickbooks','expense','reconcile'],        tier: 'utility',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'fin-researcher',      name: 'Fin Researcher',      description: 'Long-context financial research + market analysis',            status: 'idle',   capabilities: ['research','analyze','finance'],            tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gemini-2.5-flash',   owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'tax-advisor',         name: 'Tax Advisor',         description: 'Tax strategy + compliance, S-Corp/C-Corp/LLC rules',           status: 'idle',   capabilities: ['tax','advise','compliance'],               tier: 'primary',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'crypto-analyst',      name: 'Crypto Analyst',      description: 'Crypto portfolio analysis + signal tracking',                  status: 'idle',   capabilities: ['analyze','price','portfolio'],             tier: 'utility',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'stock-analyst',       name: 'Stock Analyst',       description: 'Equity market analysis, portfolio tracking',                   status: 'idle',   capabilities: ['analyze','price','portfolio'],             tier: 'utility',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'coding-agent',        name: 'Coding Agent',        description: 'Production code generation, debug, review',                    status: 'active', capabilities: ['code','debug','review'],                    tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'designer',            name: 'Designer',            description: 'UI/UX + creative assets',                                      status: 'idle',   capabilities: ['design','create','canva'],                 tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'ops-runner',          name: 'Ops Runner',          description: 'DevOps, deploys, infra ops',                                   status: 'idle',   capabilities: ['deploy','run','ops'],                       tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'validation',          name: 'Validation',          description: 'QA + post-deploy verification',                                status: 'idle',   capabilities: ['validate','review','qa'],                   tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'maven',               name: 'Maven',               description: 'CMO — marketing orchestration, strategy',                      status: 'idle',   capabilities: ['market','strategy','campaign'],            tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'quill',               name: 'Quill',               description: 'Long-form content, customer-facing writing',                   status: 'idle',   capabilities: ['write','draft','edit'],                    tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'echo',                name: 'Echo',                description: 'Social media + short-form comms',                              status: 'idle',   capabilities: ['social','relay','reply'],                  tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'spark',               name: 'Spark',               description: 'Creative campaigns, brainstorming',                            status: 'idle',   capabilities: ['ideate','brainstorm','create'],            tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'beacon',              name: 'Beacon',              description: 'SEO + analytics signal agent',                                 status: 'idle',   capabilities: ['seo','analyze','notify'],                  tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'lens',                name: 'Lens',                description: 'Long-context market research synthesis',                       status: 'idle',   capabilities: ['research','market','synthesize'],          tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gemini-2.5-flash',   owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'herald',              name: 'Herald',              description: 'PR + announcements, high-quality outbound',                    status: 'idle',   capabilities: ['announce','pr','broadcast'],               tier: 'primary',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'scribe',              name: 'Scribe',              description: 'Documentation + meeting transcripts',                          status: 'idle',   capabilities: ['document','transcribe','note'],             tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'executive-assistant', name: 'Victoria',            description: 'Executive assistant — scheduling, comms, meetings',            status: 'active', capabilities: ['schedule','draft','comms'],                 tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'short-term-rental',   name: 'STR Specialist',      description: 'Lodgify/Airbnb operations, guest management, pricing',         status: 'idle',   capabilities: ['str','bookings','guests'],                  tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'sentinel',            name: 'Sentinel',            description: 'Security monitoring + anomaly detection',                      status: 'active', capabilities: ['monitor','alert','secure'],                 tier: 'utility',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
  { id: 'pulse',               name: 'Pulse',               description: 'Real-time health monitoring, digest synthesis',                status: 'active', capabilities: ['monitor','alert','health'],                 tier: 'utility',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0, created_at: '' },
]

// ─── List available agents ────────────────────────────────────────────────────

export async function listAvailableAgents(): Promise<Agent[]> {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('status', 'active')
      .order('name')
    if (error || !data?.length) return BUILTIN_AGENTS
    return data as Agent[]
  } catch {
    return BUILTIN_AGENTS
  }
}

// ─── Get run status ───────────────────────────────────────────────────────────

export async function getAgentStatus(runId: string): Promise<AgentRun | null> {
  try {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .eq('id', runId)
      .single()
    if (error) return null
    return data as AgentRun
  } catch {
    return null
  }
}

// ─── List recent runs ─────────────────────────────────────────────────────────

export async function listRecentRuns(limit = 20): Promise<AgentRun[]> {
  try {
    const { data, error } = await supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return []
    return (data ?? []) as AgentRun[]
  } catch {
    return []
  }
}

// ─── Invoke agent ─────────────────────────────────────────────────────────────
// Always writes a queued row to agent_runs (real Supabase write).
// Then attempts the actual HTTP call to the OpenClaw runtime.
// TODO: replace localhost:7070 with env var NEXT_PUBLIC_OPENCLAW_API_URL once
//       the v7 Vercel project has that secret set.

export async function invokeAgent(opts: InvokeAgentOptions): Promise<AgentRun> {
  const { agentId, payload, contextType, contextId } = opts

  // 1. Write the queued row. Schema on PROD: id/user_id/agent_id/project_id/
  //    task_id/started_at/ended_at/status/input/output/tokens/cost/error.
  //    The fields `payload`, `context_type`, `context_id`, `result` that the
  //    old code used don't exist — they silently failed every insert. Now we
  //    map correctly: payload→input, context_id→project_id OR task_id.
  const projectId = contextType === 'project' ? contextId ?? null : null
  const taskId    = contextType === 'task'    ? contextId ?? null : null

  const { data: runRow, error: insertErr } = await supabase
    .from('agent_runs')
    .insert({
      agent_id: agentId,
      status:   'queued',
      input:    payload as never,
      project_id: projectId,
      task_id:  taskId,
      started_at: new Date().toISOString(),
    } as never)
    .select()
    .single()

  if (insertErr || !runRow) {
    // DB persistence failed — the UI MUST see this instead of a fake "queued".
    // Still attempt HTTP fire-and-forget so the agent does run, but mark the
    // returned object as error so callers don't lie to the user.
    const errMsg = insertErr?.message ?? 'agent_runs insert returned no row'
    const synthetic: AgentRun = {
      id: `stub-${Date.now()}`,
      agent_id: agentId,
      status: 'error',
      payload,
      result: null,
      context_type: contextType ?? null,
      context_id: contextId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      error: `Failed to persist agent run: ${errMsg}`,
    } as AgentRun & { error: string }
    console.error('[agents] agent_runs insert failed:', errMsg)
    _fireAgentHttp(agentId, payload, synthetic.id).catch(() => {})
    return synthetic
  }

  const run = {
    id: (runRow as any).id,
    agent_id: (runRow as any).agent_id,
    status: (runRow as any).status,
    payload,
    result: (runRow as any).output ?? null,
    context_type: contextType ?? null,
    context_id: contextId ?? null,
    created_at: (runRow as any).started_at ?? new Date().toISOString(),
    updated_at: (runRow as any).started_at ?? new Date().toISOString(),
  } as AgentRun

  // 2. Fire-and-forget to OpenClaw HTTP endpoint (gateway handles CLI dispatch)
  _fireAgentHttp(agentId, payload, run.id).catch(() => {})

  return run
}

// ─── Internal HTTP dispatch ───────────────────────────────────────────────────
// TODO: set NEXT_PUBLIC_OPENCLAW_API_URL=http://localhost:7070 in .env.local
//       and/or in the Vercel project env vars to activate live agent dispatch.

async function _fireAgentHttp(
  agentId: string,
  payload: Record<string, unknown>,
  runId: string,
): Promise<void> {
  const base =
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_OPENCLAW_API_URL) ||
    (typeof window !== 'undefined' && (window as any).__OPENCLAW_API_URL) ||
    null

  if (!base) {
    // No endpoint configured — mark as error so the UI can surface it
    await supabase
      .from('agent_runs')
      .update({ status: 'error', error: 'OpenClaw gateway not configured (NEXT_PUBLIC_OPENCLAW_API_URL)', ended_at: new Date().toISOString() } as never)
      .eq('id', runId)
    return
  }

  try {
    const resp = await fetch(`${base}/api/agent/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, payload, runId }),
    })
    const json = (await resp.json().catch(() => ({}))) as any

    if (!resp.ok) {
      // Gateway rejected (e.g. 400 unknown agent). Surface the real error in
      // agent_runs.error so task UIs can render it.
      const errMsg = json?.error
        ? `${json.error}${json.hint ? ' — ' + json.hint : ''}`
        : `Gateway returned HTTP ${resp.status}`
      await supabase
        .from('agent_runs')
        .update({ status: 'error', error: errMsg, ended_at: new Date().toISOString() } as never)
        .eq('id', runId)
      return
    }

    await supabase
      .from('agent_runs')
      .update({ status: 'running', output: json as never } as never)
      .eq('id', runId)
  } catch (err) {
    await supabase
      .from('agent_runs')
      .update({ status: 'error', error: String(err), ended_at: new Date().toISOString() } as never)
      .eq('id', runId)
  }
}

// ─── OpenClaw live-data.json feed ─────────────────────────────────────────────
// Polls the runtime gateway for the LIVE agent roster + session activity.
// v6 uses the same endpoint via gateway polling; we now mirror that on v7.
//
// Cached 30 s upstream — agent activity is bursty, but the dashboard doesn't
// need sub-second freshness.

export interface OpenclawLiveAgent {
  id: string
  name: string
  sessionCount: number
  knowledge?: unknown
}

export interface OpenclawLiveSession {
  id: string
  sessionId: string
  agent: string
  task: string
  status: string           // 'in_progress' | 'done' | 'blocked' | 'queued' | ...
  lane: string             // 'inprogress' | 'done' | 'blocked' | 'queued'
  dateCreated: string
  dateFinished: string | null
  startTime: string
  endTime: string | null
  totalCost?: number
  tokens?: number
  model?: string
  modelsUsed?: string[]
  projectId?: string
  isCron?: boolean
  spawns?: number
  parentSession?: string
  estimatedTimeToCompletion?: string
}

export interface OpenclawLiveProject {
  id: string
  name: string
  status: string
  taskCount: number
  doneCount: number
  activeCount: number
  totalCost: number
  agents: string[]
  agentsWorkedOn: string[]
  modelsUsed: string[]
  apiModelsUsed: string[]
  sessions: OpenclawLiveSession[]
  estimatedCostToCompletion: number
  estimatedTimeToCompletion: string
}

export interface OpenclawLiveData {
  generatedAt: string
  agents: OpenclawLiveAgent[]
  acpSessions: OpenclawLiveSession[]
  projects: OpenclawLiveProject[]
  metrics?: {
    totalSessions?: number
    totalTokens?: number
    totalCost?: number
    activeProjects?: number
    cronJobsEnabled?: number
  }
}

function gatewayBase(): string | null {
  return (
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_OPENCLAW_API_URL) ||
    null
  )
}

/**
 * Fetches /live-data.json from the OpenClaw runtime gateway.
 * Returns null if the env var is missing, the gateway is unreachable,
 * or the response isn't the expected shape — so callers can show a
 * graceful "Gateway offline" fallback instead of crashing.
 */
export async function getOpenclawLiveData(): Promise<OpenclawLiveData | null> {
  const base = gatewayBase()
  if (!base) return null
  try {
    const res = await fetch(`${base}/live-data.json`, {
      next: { revalidate: 30 },
    })
    if (!res.ok) return null
    const json = (await res.json()) as OpenclawLiveData
    if (!json || !Array.isArray(json.agents) || !Array.isArray(json.acpSessions)) {
      return null
    }
    return json
  } catch {
    return null
  }
}

/**
 * Builds a Map<agentId, {sessionCount, activeSessions, doneToday}> from the
 * live feed — used by /agents page to overlay real live activity on top of
 * the BUILTIN_AGENTS / DB agents roster.
 */
export function buildAgentActivity(
  live: OpenclawLiveData | null,
): Map<
  string,
  {
    sessionCount: number
    activeSessions: OpenclawLiveSession[]
    doneToday: number
    lastActivityAt: string | null
    inProgressCount: number
    blockedCount: number
    totalCost: number
  }
> {
  const out = new Map<
    string,
    {
      sessionCount: number
      activeSessions: OpenclawLiveSession[]
      doneToday: number
      lastActivityAt: string | null
      inProgressCount: number
      blockedCount: number
      totalCost: number
    }
  >()
  if (!live) return out

  // Start from the live agents list (has sessionCount)
  for (const a of live.agents) {
    out.set(a.id.toLowerCase(), {
      sessionCount: a.sessionCount || 0,
      activeSessions: [],
      doneToday: 0,
      lastActivityAt: null,
      inProgressCount: 0,
      blockedCount: 0,
      totalCost: 0,
    })
  }

  // Fold in per-session detail from acpSessions
  const today = new Date().toISOString().slice(0, 10)
  for (const s of live.acpSessions) {
    const key = (s.agent || '').toLowerCase()
    if (!key) continue
    const bucket = out.get(key) || {
      sessionCount: 0,
      activeSessions: [],
      doneToday: 0,
      lastActivityAt: null,
      inProgressCount: 0,
      blockedCount: 0,
      totalCost: 0,
    }
    if (s.status === 'in_progress' || s.lane === 'inprogress') {
      bucket.inProgressCount++
      bucket.activeSessions.push(s)
    }
    if (s.status === 'blocked' || s.lane === 'blocked') bucket.blockedCount++
    const endIso = s.dateFinished || s.endTime
    if (endIso && endIso.startsWith(today)) bucket.doneToday++
    const anchor = endIso || s.startTime || s.dateCreated
    if (anchor && (!bucket.lastActivityAt || anchor > bucket.lastActivityAt)) {
      bucket.lastActivityAt = anchor
    }
    bucket.totalCost += Number(s.totalCost || 0)
    out.set(key, bucket)
  }

  return out
}

