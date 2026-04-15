import { Suspense } from 'react'
import { supabase } from '../lib/supabase'
import ForgeClient from './ForgeClient'

export const dynamic = 'force-dynamic'

async function fetchForgeData() {
  const [ideasRes, runsRes] = await Promise.all([
    supabase
      .from('forge_ideas')
      .select('*')
      .order('date_added', { ascending: false }),
    supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  return {
    ideas: (ideasRes.data ?? []) as any[],
    recentRuns: (runsRes.data ?? []) as any[],
  }
}

export default async function ForgePage() {
  const { ideas, recentRuns } = await fetchForgeData()
  return (
    <Suspense>
      <ForgeClient initialIdeas={ideas} initialRuns={recentRuns} />
    </Suspense>
  )
}
