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

// ─── Hard-coded fallback agent roster (used when agents table is empty) ───────

export const BUILTIN_AGENTS: Agent[] = [
  { id: 'main',                name: 'Jarvis (main)',       description: 'Primary orchestrator',         status: 'active', capabilities: ['research','plan','execute'], created_at: '' },
  { id: 'worker',              name: 'Worker',              description: 'Mac Mini heavy-compute node',  status: 'active', capabilities: ['build','test','deploy'],    created_at: '' },
  { id: 'validation',          name: 'Validator',           description: 'QA & verification agent',      status: 'idle',   capabilities: ['validate','review'],        created_at: '' },
  { id: 'executive-assistant', name: 'Victoria',            description: 'Executive assistant & comms',  status: 'idle',   capabilities: ['draft','schedule','comms'], created_at: '' },
  { id: 'research',            name: 'Research Agent',      description: 'Web research & analysis',      status: 'idle',   capabilities: ['search','summarize'],       created_at: '' },
  { id: 'deployment',          name: 'Deploy Agent',        description: 'CI/CD & deployment pipeline',  status: 'idle',   capabilities: ['deploy','release'],         created_at: '' },
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
