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

  return {
    tasks: (tasksRes.data ?? []) as any[],
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
