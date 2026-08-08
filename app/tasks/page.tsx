import { Suspense } from 'react'
import { supabase } from '../lib/supabase'
import { getAchievements } from '../lib/queries'
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import TasksClient from './TasksClient'

export const dynamic = 'force-dynamic'

const DEFAULT_TASK_ACHIEVEMENTS = [
  { name: 'First Task',     description: 'Created your first task.',              xp: 50,  progress: 100, icon: '✅', earned: true  },
  { name: 'On a Roll',      description: 'Completed 5 tasks in a row.',           xp: 150, progress: 100, icon: '🔥', earned: true  },
  { name: 'P0 Slayer',      description: 'Closed a critical P0 task.',            xp: 300, progress: 100, icon: '⚡', earned: true  },
  { name: 'Inbox Zero',     description: 'Cleared all open tasks for a day.',     xp: 200, progress: 40,  icon: '🎯', earned: false },
  { name: 'Automator',      description: 'Had an agent complete a task for you.', xp: 250, progress: 20,  icon: '🤖', earned: false },
  { name: '10-Task Sprint',  description: 'Completed 10 tasks in one week.',      xp: 400, progress: 60,  icon: '🏃', earned: false },
  { name: 'Planner',        description: 'Created tasks across 3+ projects.',     xp: 100, progress: 100, icon: '📋', earned: true  },
  { name: 'Zero Overdue',   description: 'No overdue tasks for 7 days.',          xp: 150, progress: 10,  icon: '⏰', earned: false },
]

async function fetchData() {
  const [tasksRes, projectsRes, entitiesRes, rawAchievements] = await Promise.all([
    supabase
      .from('tasks')
      .select('*, project:projects(id,name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('projects')
      .select('id, name, status')
      .order('name'),
    supabase
      .from('entity_ownership')
      .select('id, entity_name, entity_type')
      .eq('status', 'active')
      .order('entity_name'),
    getAchievements('tasks').catch(() => []),
  ])

  const tasks = (tasksRes.data ?? []) as any[]

  const taskIds = tasks.map((t) => t.id).filter(Boolean)
  if (taskIds.length > 0) {
    const { data: runs } = await supabase
      .from('agent_runs')
      .select('id, agent_id, task_id, status, started_at, ended_at, output, error, cost, tokens')
      .in('task_id', taskIds)
      .order('started_at', { ascending: false })
    const byTask = new Map<string, any[]>()
    for (const r of (runs ?? []) as any[]) {
      if (!r.task_id) continue
      const arr = byTask.get(r.task_id) ?? []
      arr.push(r)
      byTask.set(r.task_id, arr)
    }
    for (const t of tasks) {
      const runs = byTask.get(t.id) ?? []
      t.agent_runs = runs
      t.latest_run = runs[0] ?? null
      t.run_count = runs.length
    }
  }

  return {
    tasks,
    projects: (projectsRes.data ?? []) as any[],
    entities: (entitiesRes.data ?? []) as any[],
    rawAchievements: rawAchievements as any[],
  }
}

export default async function TasksPage() {
  const { tasks, projects, entities, rawAchievements } = await fetchData()

  const today = new Date().toISOString().slice(0, 10)
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)

  const openTasks  = tasks.filter((t: any) => !['done','completed','closed','cancelled'].includes(String(t.status ?? '').toLowerCase()))
  const doneTasks  = tasks.filter((t: any) =>  ['done','completed','closed'].includes(String(t.status ?? '').toLowerCase()))
  const overdue    = openTasks.filter((t: any) => t.due_date && t.due_date < today)
  const dueThisWeek = openTasks.filter((t: any) => t.due_date && t.due_date >= today && t.due_date <= weekEnd)
  const p0Tasks    = openTasks.filter((t: any) => ['p0','critical','0'].includes(String(t.priority ?? '').toLowerCase()))

  const achievements = rawAchievements.length > 0
    ? rawAchievements.slice(0, 8).map((a: any) => ({
        name: a.achievement_key ?? a.name ?? 'Achievement',
        description: a.description ?? '',
        xp: a.xp ?? 100,
        progress: a.progress_pct ?? (a.earned_at ? 100 : 0),
        icon: a.icon ?? '🏆',
        earned: !!a.earned_at,
      }))
    : DEFAULT_TASK_ACHIEVEMENTS

  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="◆ TASKS · MISSION CONTROL"
        greeting="Task Command Center"
        primaryMetric={String(openTasks.length)}
        metricSubtitle={`open tasks · ${doneTasks.length} completed all-time`}
        kpiCards={[
          { label: 'Due This Week', value: String(dueThisWeek.length),  delta: 'next 7 days',        deltaPositive: dueThisWeek.length === 0 },
          { label: 'Overdue',       value: String(overdue.length),       delta: 'needs attention',    deltaPositive: overdue.length === 0 },
          { label: 'P0 Critical',   value: String(p0Tasks.length),       delta: 'top priority',       deltaPositive: p0Tasks.length === 0 },
          { label: 'Projects',      value: String(projects.length),      delta: 'active' },
        ]}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      <Suspense>
        <TasksClient initialTasks={tasks} projects={projects} entities={entities} />
      </Suspense>
    </>
  )
}
