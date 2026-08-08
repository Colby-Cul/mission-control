import { Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { getAchievements } from '../lib/queries'
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import ForgeClient from './ForgeClient'
import { deriveForgeStage } from './stageMapper'

export const dynamic = 'force-dynamic'

const DEFAULT_FORGE_ACHIEVEMENTS = [
  { name: 'First Idea',    description: 'Added first idea to the Forge.',          xp: 50,  progress: 100, icon: '💡', earned: true  },
  { name: 'Pipeline Live', description: 'Moved an idea through 3+ stages.',        xp: 200, progress: 100, icon: '🚀', earned: true  },
  { name: 'Launcher',      description: 'Shipped your first Forge idea.',          xp: 500, progress: 60,  icon: '🎯', earned: false },
  { name: 'Idea Factory',  description: 'Added 10+ ideas to the pipeline.',        xp: 150, progress: 80,  icon: '🏭', earned: false },
  { name: 'AI-Assisted',   description: 'Used an agent to evaluate an idea.',      xp: 300, progress: 20,  icon: '🤖', earned: false },
  { name: 'Full Pipeline', description: 'Had ideas in every stage at once.',       xp: 250, progress: 40,  icon: '⚡', earned: false },
  { name: 'Speed Builder',  description: 'Moved from Sourced to Launched in <30d.', xp: 400, progress: 0,  icon: '⚡', earned: false },
  { name: 'Evaluator',     description: 'Evaluated and approved 5 ideas.',         xp: 100, progress: 100, icon: '✅', earned: true  },
]

async function fetchForgeData() {
  const [ideasRes, runsRes, rawAchievements] = await Promise.all([
    supabase
      .from('forge_ideas')
      .select('*')
      .order('date_added', { ascending: false }),
    supabase
      .from('agent_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20),
    getAchievements('forge').catch(() => []),
  ])
  return {
    ideas: (ideasRes.data ?? []) as any[],
    recentRuns: (runsRes.data ?? []) as any[],
    rawAchievements: rawAchievements as any[],
  }
}

export default async function ForgePage() {
  const { ideas, recentRuns, rawAchievements } = await fetchForgeData()

  const launched  = ideas.filter((i: any) => deriveForgeStage(i) === 'launched').length
  const building  = ideas.filter((i: any) => deriveForgeStage(i) === 'building').length
  const evaluating = ideas.filter((i: any) => deriveForgeStage(i) === 'evaluating').length
  const sourced   = ideas.filter((i: any) => deriveForgeStage(i) === 'sourced').length

  const achievements = rawAchievements.length > 0
    ? rawAchievements.slice(0, 8).map((a: any) => ({
        name: a.achievement_key ?? a.name ?? 'Achievement',
        description: a.description ?? '',
        xp: a.xp ?? 100,
        progress: a.progress_pct ?? (a.earned_at ? 100 : 0),
        icon: a.icon ?? '🏆',
        earned: !!a.earned_at,
      }))
    : DEFAULT_FORGE_ACHIEVEMENTS

  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="◆ FORGE · IDEA PIPELINE"
        greeting="Build What Matters"
        primaryMetric={String(ideas.length)}
        metricSubtitle={`ideas in pipeline · ${launched} launched`}
        kpiCards={[
          { label: 'Launched',   value: String(launched),   delta: 'shipped',        deltaPositive: launched > 0 },
          { label: 'Building',   value: String(building),   delta: 'in development'  },
          { label: 'Evaluating', value: String(evaluating), delta: 'under review'    },
          { label: 'Sourced',    value: String(sourced),    delta: 'new ideas'       },
        ]}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      <Suspense>
        <ForgeClient initialIdeas={ideas} initialRuns={recentRuns} />
      </Suspense>
    </>
  )
}
