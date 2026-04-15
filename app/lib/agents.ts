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

// ─── Hard-coded fallback agent roster (all 50 OpenClaw agents) ───────────────
// Source: ls ~/.openclaw/agents/ — excludes placeholder your_discord_monitor_agent_id

export const BUILTIN_AGENTS: Agent[] = [
  { id: 'acp-codex',           name: 'ACP Codex',           description: 'ACP coding delegation runtime',              status: 'idle',   capabilities: ['code','delegate'],             tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'acp-defaultagent',    name: 'ACP Default Agent',   description: 'ACP default agent handler',                  status: 'idle',   capabilities: ['route','handle'],              tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'general',    model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'agentmail',           name: 'AgentMail',           description: 'Inbox AI — Christine CLS contact handler',   status: 'active', capabilities: ['email','triage','respond'],     tier: 'primary',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 12,   created_at: '' },
  { id: 'analytics-bot',       name: 'Analytics Bot',       description: 'Data analytics and reporting agent',         status: 'idle',   capabilities: ['analyze','report','query'],     tier: 'utility',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 8,    created_at: '' },
  { id: 'apex-coder-backup',   name: 'Apex Coder Backup',   description: 'Backup coding agent for heavy tasks',        status: 'idle',   capabilities: ['code','build','test'],          tier: 'backup',   trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'assistant',           name: 'Assistant',           description: 'General-purpose assistant agent',            status: 'idle',   capabilities: ['assist','draft','plan'],        tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'general',    model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 5,    created_at: '' },
  { id: 'beacon',              name: 'Beacon',              description: 'Signal & notification dispatch agent',       status: 'idle',   capabilities: ['notify','alert','broadcast'],   tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 13,   created_at: '' },
  { id: 'bookkeeper',          name: 'Bookkeeper',          description: 'Expense tracking and financial review',      status: 'idle',   capabilities: ['finance','expense','audit'],    tier: 'primary',  trigger_type: 'cron',    health_status: 'degraded', knowledge_level: 'expert',    model: 'claude-opus-4-6',    owner: 'Jarvis', cost_ytd: 359,  created_at: '' },
  { id: 'brinley',             name: 'Brinley',             description: 'Specialized workflow agent',                 status: 'idle',   capabilities: ['workflow','execute'],           tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'cfo',                 name: 'CFO',                 description: 'Chief Financial Officer AI — financial ops', status: 'active', capabilities: ['finance','forecast','budget'],   tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-opus-4-6',    owner: 'Jarvis', cost_ytd: 0.59, created_at: '' },
  { id: 'claude-opus',         name: 'Claude Opus',         description: 'Anthropic Claude Opus model agent',          status: 'idle',   capabilities: ['reason','analyze','write'],     tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-opus-4-6',    owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'claude-sonnet',       name: 'Claude Sonnet',       description: 'Anthropic Claude Sonnet model agent',        status: 'active', capabilities: ['reason','code','write'],        tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'codex',               name: 'Codex',               description: 'OpenAI Codex coding agent',                  status: 'idle',   capabilities: ['code','refactor','generate'],   tier: 'backup',   trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'codex-default',       name: 'Codex Default',       description: 'Default Codex agent configuration',         status: 'idle',   capabilities: ['code','complete'],              tier: 'backup',   trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'coding-agent',        name: 'Coding Agent',        description: 'General coding and development agent',       status: 'active', capabilities: ['code','debug','review'],        tier: 'primary',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 50,   created_at: '' },
  { id: 'communication-bot',   name: 'Communication Bot',   description: 'Multi-channel messaging agent',              status: 'idle',   capabilities: ['message','send','slack'],       tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 2,    created_at: '' },
  { id: 'cron',                name: 'Cron',                description: 'Scheduled task execution agent',             status: 'active', capabilities: ['schedule','run','trigger'],     tier: 'primary',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 20,   created_at: '' },
  { id: 'crypto-analyst',      name: 'Crypto Analyst',      description: 'Cryptocurrency portfolio analysis agent',    status: 'idle',   capabilities: ['analyze','price','portfolio'],  tier: 'utility',  trigger_type: 'cron',    health_status: 'degraded', knowledge_level: 'specialist', model: 'claude-opus-4-6',  owner: 'Jarvis', cost_ytd: 221,  created_at: '' },
  { id: 'default',             name: 'Default',             description: 'Default fallback agent',                    status: 'idle',   capabilities: ['route','handle'],              tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'general',    model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'designer',            name: 'Designer',            description: 'Design and creative assets agent',           status: 'idle',   capabilities: ['design','create','canva'],      tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-opus-4-6',    owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'discord',             name: 'Discord',             description: 'Discord guild messaging agent',              status: 'active', capabilities: ['message','monitor','reply'],    tier: 'primary',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 5,    created_at: '' },
  { id: 'discord-chat',        name: 'Discord Chat',        description: 'Discord chat interaction handler',           status: 'idle',   capabilities: ['chat','respond','moderate'],    tier: 'backup',   trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 2,    created_at: '' },
  { id: 'echo',                name: 'Echo',                description: 'Echo and relay agent for debugging',         status: 'idle',   capabilities: ['relay','debug','test'],         tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'general',    model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 40,   created_at: '' },
  { id: 'exec',                name: 'Exec',                description: 'Executive command execution agent',          status: 'idle',   capabilities: ['execute','command','run'],      tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'execassistant',       name: 'Exec Assistant',      description: 'Executive assistant operations',             status: 'idle',   capabilities: ['assist','schedule','draft'],    tier: 'backup',   trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'executive-assistant', name: 'Executive Assistant', description: 'Victoria — executive assistant & comms',    status: 'active', capabilities: ['draft','schedule','comms'],     tier: 'primary',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 15,   created_at: '' },
  { id: 'fin-researcher',      name: 'Fin Researcher',      description: 'Financial research and market analysis',    status: 'idle',   capabilities: ['research','analyze','finance'], tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 10,   created_at: '' },
  { id: 'herald',              name: 'Herald',              description: 'Announcement and broadcast agent',           status: 'idle',   capabilities: ['announce','broadcast','notify'], tier: 'utility', trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 158,  created_at: '' },
  { id: 'infrastructure-bot',  name: 'Infrastructure Bot',  description: 'Infrastructure monitoring and ops agent',   status: 'active', capabilities: ['monitor','deploy','infra'],     tier: 'primary',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 25,   created_at: '' },
  { id: 'lens',                name: 'Lens',                description: 'Visual analysis and image processing agent', status: 'idle',   capabilities: ['vision','analyze','extract'],   tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-opus-4-6',    owner: 'Jarvis', cost_ytd: 54,   created_at: '' },
  { id: 'main',                name: 'Main (Jarvis)',        description: 'Primary orchestrator — Mac Mini worker',    status: 'active', capabilities: ['research','plan','execute','delegate'], tier: 'primary', trigger_type: 'event', health_status: 'healthy', knowledge_level: 'expert', model: 'claude-sonnet-4-6', owner: 'Jarvis', cost_ytd: 300, dependencies: ['coding-agent','executive-assistant','cron'], created_at: '' },
  { id: 'maven',               name: 'Maven',               description: 'Knowledge management and research agent',   status: 'idle',   capabilities: ['research','index','retrieve'],  tier: 'utility',  trigger_type: 'manual',  health_status: 'degraded', knowledge_level: 'specialist', model: 'gpt-4o',           owner: 'Jarvis', cost_ytd: 2.1,  created_at: '' },
  { id: 'monday-com',          name: 'Monday.com',          description: 'Monday.com integration agent',              status: 'idle',   capabilities: ['tasks','boards','update'],      tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'monday-com-agent',    name: 'Monday.com Agent',    description: 'Extended Monday.com automation agent',      status: 'idle',   capabilities: ['automate','boards','items'],    tier: 'backup',   trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'mtp',                 name: 'MTP',                 description: 'Mission-to-plan execution agent',            status: 'idle',   capabilities: ['plan','execute','track'],       tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'openai-codex',        name: 'OpenAI Codex',        description: 'OpenAI Codex ACP delegation runtime',       status: 'idle',   capabilities: ['code','generate','refactor'],   tier: 'backup',   trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'expert',     model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'openai-gpt-4o-mini',  name: 'OpenAI GPT-4o Mini',  description: 'OpenAI GPT-4o Mini lightweight agent',      status: 'idle',   capabilities: ['respond','draft','classify'],   tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'general',    model: 'gpt-4o-mini',        owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'ops-runner',          name: 'Ops Runner',          description: 'Operational task runner and executor',      status: 'idle',   capabilities: ['run','execute','ops'],          tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'pulse',               name: 'Pulse',               description: 'Real-time monitoring and health-check agent', status: 'active', capabilities: ['monitor','alert','health'],   tier: 'primary',  trigger_type: 'cron',    health_status: 'degraded', knowledge_level: 'expert',    model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 115,  created_at: '' },
  { id: 'quentin',             name: 'Quentin',             description: 'Query and question-answering agent',        status: 'idle',   capabilities: ['query','answer','retrieve'],    tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'gpt-4o',             owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'quill',               name: 'Quill',               description: 'Writing and content creation agent',        status: 'idle',   capabilities: ['write','draft','edit'],         tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'scribe',              name: 'Scribe',              description: 'Documentation and transcript agent',        status: 'idle',   capabilities: ['document','transcribe','note'],  tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'sentinel',            name: 'Sentinel',            description: 'Security monitoring and alerting agent',   status: 'active', capabilities: ['monitor','alert','secure'],     tier: 'primary',  trigger_type: 'cron',    health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 10,   created_at: '' },
  { id: 'short-term-rental',   name: 'Short-Term Rental',   description: 'STR operations and guest management agent', status: 'idle',   capabilities: ['str','bookings','guests'],      tier: 'utility',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 5,    created_at: '' },
  { id: 'spark',               name: 'Spark',               description: 'Idea generation and brainstorming agent',   status: 'idle',   capabilities: ['ideate','brainstorm','create'],  tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'stock-analyst',       name: 'Stock Analyst',       description: 'Stock market analysis and tracking agent',  status: 'idle',   capabilities: ['analyze','price','portfolio'],  tier: 'utility',  trigger_type: 'cron',    health_status: 'degraded', knowledge_level: 'specialist', model: 'claude-opus-4-6',  owner: 'Jarvis', cost_ytd: 165,  created_at: '' },
  { id: 'task-master',         name: 'Task Master',         description: 'Task planning and management agent',        status: 'idle',   capabilities: ['tasks','plan','delegate'],      tier: 'utility',  trigger_type: 'manual',  health_status: 'healthy', knowledge_level: 'specialist', model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'taskmaster',          name: 'Taskmaster',          description: 'Advanced task orchestration agent',         status: 'idle',   capabilities: ['orchestrate','tasks','run'],    tier: 'primary',  trigger_type: 'event',   health_status: 'healthy', knowledge_level: 'expert',     model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 0,    created_at: '' },
  { id: 'tax-advisor',         name: 'Tax Advisor',         description: 'Tax strategy and compliance agent',         status: 'idle',   capabilities: ['tax','advise','compliance'],    tier: 'utility',  trigger_type: 'cron',    health_status: 'degraded', knowledge_level: 'expert',    model: 'claude-opus-4-6',    owner: 'Jarvis', cost_ytd: 204,  created_at: '' },
  { id: 'validation',          name: 'Validation',          description: 'QA & verification agent',                  status: 'idle',   capabilities: ['validate','review','qa'],       tier: 'primary',  trigger_type: 'event',   health_status: 'degraded', knowledge_level: 'expert',    model: 'claude-sonnet-4-6',  owner: 'Jarvis', cost_ytd: 176,  created_at: '' },
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

  // 1. Write the queued row — this is always real
  const { data: runRow, error: insertErr } = await supabase
    .from('agent_runs')
    .insert({
      agent_id: agentId,
      status: 'queued',
      payload,
      context_type: contextType ?? null,
      context_id: contextId ?? null,
      result: null,
    })
    .select()
    .single()

  if (insertErr || !runRow) {
    // Supabase insert failed (table might not exist yet) — return synthetic run
    const synthetic: AgentRun = {
      id: `stub-${Date.now()}`,
      agent_id: agentId,
      status: 'queued',
      payload,
      result: null,
      context_type: contextType ?? null,
      context_id: contextId ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    console.warn('[agents] agent_runs insert failed:', insertErr?.message, '— using synthetic run')
    // Still attempt HTTP fire-and-forget
    _fireAgentHttp(agentId, payload, synthetic.id).catch(() => {})
    return synthetic
  }

  const run = runRow as AgentRun

  // 2. Fire-and-forget to OpenClaw HTTP endpoint
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
    // No endpoint configured — update run to reflect stub state
    await supabase
      .from('agent_runs')
      .update({ status: 'queued', result: { stub: true, reason: 'no_endpoint_configured' } })
      .eq('id', runId)
    return
  }

  try {
    const resp = await fetch(`${base}/api/agent/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, payload, runId }),
    })
    const json = await resp.json().catch(() => ({}))
    await supabase
      .from('agent_runs')
      .update({ status: resp.ok ? 'running' : 'error', result: json })
      .eq('id', runId)
  } catch (err) {
    await supabase
      .from('agent_runs')
      .update({ status: 'error', result: { error: String(err) } })
      .eq('id', runId)
  }
}
