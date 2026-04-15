import { Suspense } from 'react'
import { supabase } from '../lib/supabase'
import ProjectsClient from './ProjectsClient'

export const dynamic = 'force-dynamic'

async function fetchProjectsData() {
  const [projectsRes, entitiesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('*, tasks:tasks(count)')
      .order('priority', { ascending: true }),
    supabase
      .from('entity_ownership')
      .select('id, entity_name, entity_type')
      .eq('status', 'active')
      .order('entity_name'),
  ])
  return {
    projects: (projectsRes.data ?? []) as any[],
    entities: (entitiesRes.data ?? []) as any[],
  }
}

export default async function ProjectsPage() {
  const { projects, entities } = await fetchProjectsData()
  return (
    <Suspense>
      <ProjectsClient initialProjects={projects} entities={entities} />
    </Suspense>
  )
}
