import { NextResponse } from 'next/server'
import { supabase } from '../../lib/supabase'

// Returns the full agent→project mapping so OpenClaw agents know
// which project_id to attach when logging agent_runs.
// GET /api/agent-context
// Response: { byAgent: { [agentId]: [{ projectId, projectName, status }] }, byProject: { [projectId]: string[] } }

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, name, status, agents')
    .neq('status', 'archived')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byAgent: Record<string, { projectId: string; projectName: string; status: string }[]> = {}
  const byProject: Record<string, string[]> = {}

  for (const p of (projects ?? [])) {
    const agentList: string[] = Array.isArray(p.agents) ? p.agents : []
    byProject[p.id] = agentList
    for (const agentId of agentList) {
      if (!byAgent[agentId]) byAgent[agentId] = []
      byAgent[agentId].push({ projectId: p.id, projectName: p.name, status: p.status })
    }
  }

  return NextResponse.json(
    { byAgent, byProject, generatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } }
  )
}
