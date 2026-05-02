import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'

// POST /api/agent-runs
// Called by OpenClaw agents to log a run to Mission Control.
// Auth: Bearer token matching GATEWAY_AUTH_TOKEN env var.
//
// Body: {
//   agent_id: string          (required)
//   status:   'running' | 'completed' | 'error'  (required)
//   project_id?: string       (uuid — from /api/agent-context lookup)
//   task_id?:    string       (uuid — if working on a specific task)
//   input?:      string       (what the agent was asked to do)
//   output?:     string       (what the agent produced)
//   error?:      string       (error message if status=error)
//   tokens?:     number
//   cost?:       number       (USD)
//   started_at?: string       (ISO timestamp — defaults to now)
//   ended_at?:   string       (ISO timestamp)
//   run_id?:     string       (existing run ID to update instead of insert)
// }
//
// Returns: { run_id, project_id }

export const dynamic = 'force-dynamic'

const AUTH_TOKEN = process.env.GATEWAY_AUTH_TOKEN ?? ''

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  if (!AUTH_TOKEN || auth !== `Bearer ${AUTH_TOKEN}`) return unauthorized()

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const { agent_id, status, project_id, task_id, input, output, error: errMsg,
          tokens, cost, started_at, ended_at, run_id } = body as Record<string, string | number | undefined>

  if (!agent_id || typeof agent_id !== 'string') {
    return NextResponse.json({ error: 'agent_id required' }, { status: 400 })
  }

  const now = new Date().toISOString()

  // UPDATE an existing run (e.g. set status=completed after polling)
  if (run_id && typeof run_id === 'string') {
    const update: Record<string, unknown> = { status: status ?? 'completed', ended_at: ended_at ?? now }
    if (output !== undefined) update.output = output
    if (errMsg !== undefined) update.error = errMsg
    if (tokens !== undefined) update.tokens = tokens
    if (cost !== undefined) update.cost = cost

    const { data, error } = await supabase
      .from('agent_runs')
      .update(update as never)
      .eq('id', run_id)
      .select('id, project_id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ run_id: (data as Record<string,unknown>).id, project_id: (data as Record<string,unknown>).project_id })
  }

  // INSERT a new run
  const insert: Record<string, unknown> = {
    agent_id,
    status: status ?? 'running',
    started_at: started_at ?? now,
  }
  if (project_id) insert.project_id = project_id
  if (task_id) insert.task_id = task_id
  if (input !== undefined) insert.input = input
  if (output !== undefined) insert.output = output
  if (errMsg !== undefined) insert.error = errMsg
  if (tokens !== undefined) insert.tokens = tokens
  if (cost !== undefined) insert.cost = cost
  if (ended_at) insert.ended_at = ended_at

  const { data, error } = await supabase
    .from('agent_runs')
    .insert(insert as never)
    .select('id, project_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(
    { run_id: (data as Record<string,unknown>).id, project_id: (data as Record<string,unknown>).project_id },
    { status: 201 }
  )
}

// PATCH /api/agent-runs  (convenience alias for updating by run_id in body)
export { POST as PATCH }
