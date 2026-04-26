import { Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { getAchievements } from '../lib/queries'
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

const DEFAULT_PROJECT_ACHIEVEMENTS = [
  { name: 'First Project',  description: 'Created your first project.',             xp: 50,  progress: 100, icon: '📁', earned: true  },
  { name: 'Ship It',        description: 'Completed your first project.',            xp: 300, progress: 100, icon: '🚢', earned: true  },
  { name: 'Multi-Entity',   description: 'Projects spanning 3+ entities.',          xp: 200, progress: 60,  icon: '🏛️', earned: false },
  { name: 'P0 Closed',      description: 'Closed a P0-priority project on time.',   xp: 400, progress: 40,  icon: '⚡', earned: false },
  { name: 'Parallel Ops',   description: '5+ projects active simultaneously.',      xp: 250, progress: 80,  icon: '⚙️', earned: false },
  { name: 'AI-Managed',     description: 'Agent closed tasks in a project for you.', xp: 300, progress: 20,  icon: '🤖', earned: false },
  { name: 'Planner',        description: 'Added tasks to all active projects.',      xp: 100, progress: 100, icon: '📋', earned: true  },
  { name: '100% Complete',  description: 'Brought a project to 100% task done.',    xp: 500, progress: 30,  icon: '💎', earned: false },
]

async function fetchProjectsData() {
  const [projectsRes, entitiesRes, rawAchievements] = await Promise.all([
    supabase
      .from('projects')
      .select('*, tasks:tasks(count)')
      .order('priority', { ascending: true }),
    supabase
      .from('entity_ownership')
      .select('id, entity_name, entity_type')
      .eq('status', 'active')
      .order('entity_name'),
    getAchievements('projects').catch(() => []),
  ])
  return {
    projects: (projectsRes.data ?? []) as any[],
    entities: (entitiesRes.data ?? []) as any[],
    rawAchievements: rawAchievements as any[],
  }
}

export default async function ProjectsPage() {
  const { projects, entities, rawAchievements } = await fetchProjectsData()

  const active    = projects.filter((p: any) => !['done','completed','closed','archived'].includes(String(p.status ?? '').toLowerCase()))
  const done      = projects.filter((p: any) =>  ['done','completed','closed'].includes(String(p.status ?? '').toLowerCase()))
  const p0        = active.filter((p: any) => ['p0','critical'].includes(String(p.priority ?? '').toLowerCase()))
  const totalTasks = projects.reduce((s: number, p: any) => {
    const count = p.tasks?.[0]?.count ?? p.tasks?.count ?? 0
    return s + Number(count)
  }, 0)

  const achievements = rawAchievements.length > 0
    ? rawAchievements.slice(0, 8).map((a: any) => ({
        name: a.achievement_key ?? a.name ?? 'Achievement',
        description: a.description ?? '',
        xp: a.xp ?? 100,
        progress: a.progress_pct ?? (a.earned_at ? 100 : 0),
        icon: a.icon ?? '🏆',
        earned: !!a.earned_at,
      }))
    : DEFAULT_PROJECT_ACHIEVEMENTS

  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="◆ PROJECTS · MISSION CONTROL"
        greeting="Project Command"
        primaryMetric={String(active.length)}
        metricSubtitle={`active projects · ${done.length} completed · ${totalTasks} total tasks`}
        kpiCards={[
          { label: 'Active',    value: String(active.length),    delta: 'in progress',   deltaPositive: active.length > 0 },
          { label: 'P0 / Crit', value: String(p0.length),        delta: 'top priority',  deltaPositive: p0.length === 0 },
          { label: 'Completed', value: String(done.length),      delta: 'all time',      deltaPositive: true },
          { label: 'Entities',  value: String(entities.length),  delta: 'connected' },
        ]}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      <Suspense>
        <ProjectsClient initialProjects={projects} entities={entities} />
      </Suspense>
    </>
  )
}
