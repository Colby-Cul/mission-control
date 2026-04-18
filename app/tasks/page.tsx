import { Suspense } from 'react'
import { supabase } from '../lib/supabase'
import TasksClient from './TasksClient'

export const dynamic = 'force-dynamic'

async function fetchData() {
  const [tasksRes, projectsRes, entitiesRes] = await Promise.all([
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
  ])

  const tasks = (tasksRes.data ?? []) as any[]

  // Enrich each task with its most-recent agent_run so the UI can show
  // last-run status, duration, cost, and error without the caller drilling in.
  // Single round-trip: pull every run whose task_id matches one of our task ids,
  // then fold them in client-side.
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
  }
}

export default async function TasksPage() {
  const { tasks, projects, entities } = await fetchData()
  return (
    <Suspense>
      <TasksClient initialTasks={tasks} projects={projects} entities={entities} />
    </Suspense>
  )
}
