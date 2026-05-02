import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { BUILTIN_AGENTS } from '../../../../lib/agents'

const VALID_AGENT_IDS = new Set(BUILTIN_AGENTS.map(a => a.id))

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, agents')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ projectId: params.id, agents: data.agents ?? [] })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let body: { agents?: string[] }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

  const agents = body.agents
  if (!Array.isArray(agents)) return NextResponse.json({ error: 'agents must be an array' }, { status: 400 })

  const invalid = agents.filter(a => !VALID_AGENT_IDS.has(a))
  if (invalid.length) return NextResponse.json({ error: `unknown agents: ${invalid.join(', ')}` }, { status: 400 })

  const { data, error } = await supabase
    .from('projects')
    .update({ agents })
    .eq('id', params.id)
    .select('id, agents')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ projectId: params.id, agents: data.agents ?? [] })
}
