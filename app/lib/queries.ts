/**
 * Canonical query layer for v7.
 * Every page imports from here — never writes its own raw queries.
 * Keeps the data layer swappable and testable.
 */
import { supabase } from './supabase'

// ═══ Dashboard / North Star ═══════════════════════════════════════
export async function getNetWorthTimeline() {
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .select('value, as_of')
    .eq('metric_key', 'net_worth')
    .order('as_of', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getCashFlowTimeline() {
  const { data, error } = await supabase
    .from('kpi_snapshots')
    .select('value, as_of')
    .eq('metric_key', 'cash_flow')
    .order('as_of', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getUserProfile() {
  const { data, error } = await supabase
    .from('users_profile')
    .select('*')
    .single()
  if (error) throw error
  return data
}

// ═══ Vision Board ══════════════════════════════════════════════════
export async function getVisions() {
  const { data, error } = await supabase
    .from('visions')
    .select('*')
    .order('priority', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getMilestones() {
  const { data, error } = await supabase
    .from('financial_milestones')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ═══ Finance ═══════════════════════════════════════════════════════
// Sign convention for net worth: depository/investment count positive,
// credit/loan count negative (they're debt owed, not assets held).
export function accountSignedBalance(a: any): number {
  const bal = Number(a?.balance_current ?? 0)
  const t = String(a?.type ?? '').toLowerCase()
  return (t === 'credit' || t === 'loan') ? -bal : bal
}

export async function getAccounts() {
  const { data, error } = await supabase
    .from('financial_accounts')
    .select('*')
    .order('balance_current', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getAccountsByEntityId(entityId: string) {
  const { data, error } = await supabase
    .from('financial_accounts')
    .select('*')
    .eq('entity_id', entityId)
    .order('balance_current', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getRecentTransactions(limit = 50) {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .order('date', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ═══ Tax Center ════════════════════════════════════════════════════
export async function getTaxEntities() {
  const { data, error } = await supabase
    .from('tax_entities_meta')
    .select('*, entity:entity_ownership(entity_name, entity_type, state)')
  if (error) throw error
  return data ?? []
}

export async function getTaxMoves() {
  const { data, error } = await supabase
    .from('tax_moves')
    .select('*')
    .order('priority', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getUpcomingTaxDeadlines() {
  const { data, error } = await supabase
    .from('tax_deadlines')
    .select('*')
    .eq('status', 'upcoming')
    .order('deadline_date', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ═══ Companies / Entities ═════════════════════════════════════════
export async function getEntities() {
  const { data, error } = await supabase
    .from('entity_ownership')
    .select('*')
    .eq('status', 'active')
    .order('entity_name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getCompanyKpis(entityId: string) {
  const { data, error } = await supabase
    .from('company_kpis')
    .select('*')
    .eq('entity_id', entityId)
  if (error) throw error
  return data ?? []
}

// ═══ Properties ════════════════════════════════════════════════════
export async function getProperties() {
  const { data, error } = await supabase
    .from('property_assets')
    .select('*')
    .order('current_value', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPropertyPhotos(propertyId: string) {
  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ═══ People — Agents ═══════════════════════════════════════════════
export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('tier', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getAgentRunFeed(limit = 50) {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*, agent:agents(name, color)')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

// ═══ The Forge (engineering → pinned) ══════════════════════════════
export async function getForgeIdeas(status: 'new' | 'approved' | 'rejected' = 'new') {
  const { data, error } = await supabase
    .from('forge_ideas')
    .select('*')
    .eq('status', status)
    .order('date_added', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getForgeIdeaById(id: string) {
  const { data, error } = await supabase
    .from('forge_ideas')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

// ═══ Work — Projects & Tasks ═══════════════════════════════════════
export async function getActiveProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('status', 'active')
    .order('priority', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getMyTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(name)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

// ═══ Gamification — Achievements ═══════════════════════════════════
export async function getAchievements(dashboardKey?: string) {
  let q = supabase.from('achievements').select('*')
  if (dashboardKey) q = q.eq('dashboard_key', dashboardKey)
  const { data, error } = await q.order('earned_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

// ═══ Docs Hub ══════════════════════════════════════════════════════
export async function getDocs() {
  const { data, error } = await supabase.from('docs').select('*').order('updated_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

// ═══ Memory & Knowledge ════════════════════════════════════════════
export async function getMemoryEntries() {
  const { data, error } = await supabase.from('memory_entries').select('*').order('created_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

// ═══ Incidents ═════════════════════════════════════════════════════
export async function getIncidents() {
  const { data, error } = await supabase.from('incidents').select('*').order('created_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

// ═══ Skill Lab ═════════════════════════════════════════════════════
export async function getSkills() {
  const { data, error } = await supabase.from('skills').select('*').order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ═══ Sessions ══════════════════════════════════════════════════════
export async function getSessions() {
  const { data, error } = await supabase.from('sessions').select('*').order('started_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export type TimeWindow = '24h' | '7d' | '30d' | '90d'

function windowStart(w: TimeWindow): string {
  const ms: Record<TimeWindow, number> = {
    '24h': 1, '7d': 7, '30d': 30, '90d': 90,
  }
  const d = new Date(Date.now() - ms[w] * 24 * 60 * 60 * 1000)
  return d.toISOString()
}

/** All cron sessions in a time window, raw rows for client-side aggregation */
export async function getCronSessions(window: TimeWindow = '7d') {
  const since = windowStart(window)
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, agent_name, status, cron_id, trigger_source, input_tokens, output_tokens, cost_usd, tokens, cost, started_at, ended_at, metadata')
    .eq('trigger_source', 'cron')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

/** All sessions (cron + manual) for filter dropdowns */
export async function getSessionsForWindow(window: TimeWindow = '7d', agentFilter?: string, cronFilter?: string) {
  const since = windowStart(window)
  let q = supabase
    .from('sessions')
    .select('id, title, agent_name, status, cron_id, trigger_source, input_tokens, output_tokens, cost_usd, tokens, cost, started_at, ended_at, metadata')
    .gte('started_at', since)
    .order('started_at', { ascending: false })
  if (agentFilter) q = q.eq('agent_name', agentFilter)
  if (cronFilter)  q = q.eq('cron_id', cronFilter)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

/** Distinct agent names for filter dropdown */
export async function getDistinctAgents(): Promise<string[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('agent_name')
    .not('agent_name', 'is', null)
  if (error) return []
  const names = (data ?? []).map((r: any) => r.agent_name as string).filter(Boolean)
  return [...new Set(names)].sort()
}

/** Distinct cron_ids for filter dropdown */
export async function getDistinctCronIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('cron_id')
    .not('cron_id', 'is', null)
    .eq('trigger_source', 'cron')
  if (error) return []
  const ids = (data ?? []).map((r: any) => r.cron_id as string).filter(Boolean)
  return [...new Set(ids)].sort()
}

// ═══ Integrations Hub ══════════════════════════════════════════════
export async function getIntegrations() {
  const { data, error } = await supabase
    .from('integrations')
    .select('*')
    .order('provider', { ascending: true })
  if (error) throw error
  return data ?? []
}

// ═══ Entity Documents (Files / Legal) ═════════════════════════════
export async function getEntityDocuments(docTypes?: string[]) {
  let q = supabase.from('entity_documents').select('*').order('created_at', { ascending: false, nullsFirst: false })
  if (docTypes && docTypes.length > 0) q = q.in('document_type', docTypes)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

// ═══ Company Milestones ════════════════════════════════════════════
export async function getCompanyMilestones() {
  const { data, error } = await supabase
    .from('company_milestones')
    .select('*')
    .order('target_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function getCompanyMilestonesByEntityId(entityId: string) {
  const { data, error } = await supabase
    .from('company_milestones')
    .select('*')
    .eq('entity_id', entityId)
    .order('target_date', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function getEntityBySlug(slug: string) {
  const { data, error } = await supabase
    .from('entity_ownership')
    .select('*')
    .eq('slug', slug)
    .single()
  if (error) return null
  return data
}

export async function getCompanyTeam(entityId: string) {
  const { data, error } = await supabase
    .from('company_team')
    .select('*')
    .eq('entity_id', entityId)
    .order('sort_order', { ascending: true, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

export async function getCompanyKpisByEntityId(entityId: string) {
  const { data, error } = await supabase
    .from('company_kpis')
    .select('*')
    .eq('entity_id', entityId)
  if (error) throw error
  return data ?? []
}

export async function getAchievementsByEntityId(entityId: string) {
  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('entity_id', entityId)
    .order('earned_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}

// ═══ Cash Flow helpers ════════════════════════════════════════════
export async function getTransactions30d() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('*')
    .gte('date', since)
    .order('date', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getTopExpenseCategories(limit = 5) {
  // Returns aggregated expense categories from last 30 days
  // We aggregate client-side from raw transactions since Supabase RPC isn't defined yet
  const txns = await getTransactions30d()
  const catMap: Record<string, number> = {}
  txns.forEach((t: any) => {
    const cat = (t.personal_finance_category ?? 'OTHER') as string
    const amt = Number(t.amount ?? 0)
    if (amt > 0) catMap[cat] = (catMap[cat] ?? 0) + amt
  })
  return Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([category, total]) => ({ category, total }))
}

// ═══ Rental helpers ════════════════════════════════════════════════

/**
 * Fetch all non-declined bookings from the rental_bookings table.
 * Columns mirror the Lodgify export: property_id, arrival, departure,
 * source, total_amount, status, guest_name, guest_count.
 * Table may not exist yet — returns [] on error so the page degrades gracefully.
 */
export async function getRentalBookings() {
  const { data, error } = await supabase
    .from('rental_bookings')
    .select('*')
    .neq('status', 'Declined')
    .order('arrival', { ascending: false })
  if (error) return []
  return data ?? []
}

export async function getRentalProperties() {
  const { data, error } = await supabase
    .from('property_assets')
    .select('*')
    .eq('is_rental', true)
    .order('current_value', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getRentalPhotos(propertyId: string) {
  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .eq('property_id', propertyId)
    .order('sort_order', { ascending: true })
    .limit(1)
  if (error) return []
  return data ?? []
}

// ═══ Tasks (scoped helpers) ════════════════════════════════════════
export async function getOpenTasks() {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, project:projects(name)')
    .not('status', 'in', '(done,cancelled,completed)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getDoneTasksCount(): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .in('status', ['done', 'completed'])
  if (error) return 0
  return count ?? 0
}

// ═══ Per-entity revenue / expense (last 30 days) ════════════════
export async function getEntityRevenue30d(entityId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('entity_id', entityId)
    .lt('amount', 0)                // negative = money in (Plaid convention)
    .gte('date', since)
  if (error) return 0
  return (data ?? []).reduce((sum: number, t: any) => sum + Math.abs(Number(t.amount ?? 0)), 0)
}

export async function getEntityExpenses30d(entityId: string): Promise<number> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('entity_id', entityId)
    .gt('amount', 0)                // positive = money out (Plaid convention)
    .gte('date', since)
  if (error) return 0
  return (data ?? []).reduce((sum: number, t: any) => sum + Number(t.amount ?? 0), 0)
}

export async function getEntityDocumentsByEntityId(entityId: string) {
  const { data, error } = await supabase
    .from('entity_documents')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false, nullsFirst: false })
  if (error) return []
  return data ?? []
}

// ═══ Project Detail ════════════════════════════════════════════════

/** Single project with all fields */
export async function getProjectById(id: string) {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as any
}

/** All tasks for a given project */
export async function getProjectTasks(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
  if (error) return []
  return (data ?? []) as any[]
}

/** Linked agents derived from tasks.agent + project.linked_agent + project.agents array */
export async function getProjectAgents(projectId: string) {
  const project = await getProjectById(projectId)
  const tasks = await getProjectTasks(projectId)
  const set = new Set<string>()
  if (project?.linked_agent) set.add(project.linked_agent)
  if (Array.isArray(project?.agents)) project.agents.forEach((a: string) => a && set.add(a))
  tasks.forEach((t: any) => { if (t.agent) set.add(t.agent) })
  return [...set]
}

/** Aggregated costs from tasks */
export async function getProjectCosts(projectId: string) {
  const tasks = await getProjectTasks(projectId)
  const totalCost = tasks.reduce((sum: number, t: any) => sum + Number(t.total_cost ?? 0), 0)
  const totalTokens = tasks.reduce((sum: number, t: any) => sum + Number(t.tokens ?? 0), 0)
  const totalTimeLogged = tasks.reduce((sum: number, t: any) => sum + Number(t.time_logged ?? 0), 0)
  return { totalCost, totalTokens, totalTimeLogged, taskCount: tasks.length }
}

// ═══ Ownership Graph ═══════════════════════════════════════════════

/** All ownership edges (entity→entity AND entity→property) */
export async function getOwnershipEdges() {
  const { data, error } = await supabase
    .from('entity_ownership_edges')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) return []
  return data ?? []
}

/** Ownership edges for a specific property (parents only) */
export async function getPropertyOwnershipEdges(propertyId: string) {
  const { data, error } = await supabase
    .from('entity_ownership_edges')
    .select('*, parent:entity_ownership!entity_ownership_edges_parent_entity_id_fkey(id, entity_name, entity_type, slug, purpose)')
    .eq('child_entity_id', propertyId)
    .eq('child_type', 'property')
  if (error) {
    const { data: d2 } = await supabase
      .from('entity_ownership_edges')
      .select('*')
      .eq('child_entity_id', propertyId)
      .eq('child_type', 'property')
    return d2 ?? []
  }
  return data ?? []
}

/** Parent edges for a given entity (who owns this entity) */
export async function getParentEdges(entityId: string) {
  const { data, error } = await supabase
    .from('entity_ownership_edges')
    .select('*, parent:entity_ownership!entity_ownership_edges_parent_entity_id_fkey(id, entity_name, entity_type, slug, purpose)')
    .eq('child_entity_id', entityId)
  if (error) {
    // fallback without join if FK not set up
    const { data: d2 } = await supabase
      .from('entity_ownership_edges')
      .select('*')
      .eq('child_entity_id', entityId)
    return d2 ?? []
  }
  return data ?? []
}

/** Child edges for a given entity (what this entity owns) */
export async function getChildEdges(entityId: string) {
  const { data, error } = await supabase
    .from('entity_ownership_edges')
    .select('*, child:entity_ownership!entity_ownership_edges_child_entity_id_fkey(id, entity_name, entity_type, slug, purpose)')
    .eq('parent_entity_id', entityId)
  if (error) {
    const { data: d2 } = await supabase
      .from('entity_ownership_edges')
      .select('*')
      .eq('parent_entity_id', entityId)
    return d2 ?? []
  }
  return data ?? []
}

/** All entities (including person/trust nodes) for dropdown population */
export async function getAllEntitiesForGraph() {
  const { data, error } = await supabase
    .from('entity_ownership')
    .select('id, entity_id, entity_name, entity_type, slug, purpose, is_active')
    .order('entity_name', { ascending: true })
  if (error) return []
  return data ?? []
}

// ═══ Net Worth — graph-cascaded calculation ════════════════════════

export interface NetWorthBreakdown {
  total: number
  direct: number
  byEntity: { entityId: string; entityName: string; amount: number; effectivePct: number }[]
}

/**
 * Walk the ownership graph starting from 'colby' and accumulate
 * account balances weighted by ownership percentage along each path.
 * Also cascades through property edges: equity = current_value − mortgage_balance,
 * multiplied by cumulative ownership %.
 * Returns total + per-entity breakdown.
 */
export async function getNetWorthFromGraph(): Promise<NetWorthBreakdown> {
  // Fetch all edges, financial accounts, entities, and properties in parallel
  const [edgesResult, accountsResult, entitiesResult, propertiesResult] = await Promise.allSettled([
    supabase.from('entity_ownership_edges').select('parent_entity_id, parent_type, child_entity_id, child_type, ownership_pct'),
    supabase.from('financial_accounts').select('entity_id, account_scope, balance_current, type'),
    supabase.from('entity_ownership').select('id, entity_name'),
    supabase.from('property_assets').select('id, address, city, current_value, mortgage_balance'),
  ])

  const edges: any[] = edgesResult.status === 'fulfilled' ? (edgesResult.value.data ?? []) : []
  const accounts: any[] = accountsResult.status === 'fulfilled' ? (accountsResult.value.data ?? []) : []
  const entities: any[] = entitiesResult.status === 'fulfilled' ? (entitiesResult.value.data ?? []) : []
  const properties: any[] = propertiesResult.status === 'fulfilled' ? (propertiesResult.value.data ?? []) : []

  const entityNameMap: Record<string, string> = {}
  entities.forEach((e: any) => { entityNameMap[e.id] = e.entity_name })

  // Property equity map: propertyId → equity (value − mortgage)
  const propertyEquityMap: Record<string, number> = {}
  const propertyNameMap: Record<string, string> = {}
  for (const prop of properties) {
    const val = Number(prop.current_value ?? 0)
    const mort = Number(prop.mortgage_balance ?? 0)
    propertyEquityMap[prop.id] = val - mort
    propertyNameMap[prop.id] = `${prop.address ?? prop.city ?? 'Property'} (${prop.city ?? ''})`
  }

  // Build adjacency map: parentId → [{childId, pct, childType}]
  const childMap: Record<string, { childId: string; pct: number; childType: string }[]> = {}
  for (const edge of edges) {
    const pid = edge.parent_entity_id
    if (!childMap[pid]) childMap[pid] = []
    childMap[pid].push({
      childId: edge.child_entity_id,
      pct: Number(edge.ownership_pct) / 100,
      childType: edge.child_type ?? 'entity',
    })
  }

  // Build account balance map: entityId → signed balance sum.
  // account_scope='personal'  → attributed directly to 'colby'
  // account_scope='entity'    → attributed to entity_id (matches entity_ownership.id)
  // Legacy null entity_id with scope='entity' → skipped (orphaned row)
  const balanceMap: Record<string, number> = {}
  for (const acct of accounts) {
    const bal = Number(acct.balance_current ?? 0)
    const t = String(acct.type ?? '').toLowerCase()
    const signed = (t === 'credit' || t === 'loan') ? -bal : bal
    const scope = acct.account_scope ?? 'personal'
    if (scope === 'personal') {
      // Personal accounts belong directly to Colby
      balanceMap['colby'] = (balanceMap['colby'] ?? 0) + signed
    } else if (scope === 'entity' && acct.entity_id) {
      // Entity-owned accounts: map to the entity via entity_id = entity_ownership.id
      balanceMap[acct.entity_id] = (balanceMap[acct.entity_id] ?? 0) + signed
    }
  }

  const breakdown: NetWorthBreakdown['byEntity'] = []
  const visited = new Set<string>()

  // DFS from colby, accumulating effective ownership fraction
  function dfs(nodeId: string, effectivePct: number) {
    if (visited.has(nodeId)) return // cycle guard
    visited.add(nodeId)

    // Direct accounts at this node
    const bal = balanceMap[nodeId] ?? 0
    if (bal !== 0 && nodeId !== 'colby') {
      breakdown.push({
        entityId: nodeId,
        entityName: entityNameMap[nodeId] ?? nodeId,
        amount: bal * effectivePct,
        effectivePct: effectivePct * 100,
      })
    }

    // Walk children
    const children = childMap[nodeId] ?? []
    for (const { childId, pct, childType } of children) {
      if (childType === 'property') {
        // Property leaf: compute equity and add Colby's share
        const equity = propertyEquityMap[childId]
        if (equity !== undefined && equity !== 0) {
          breakdown.push({
            entityId: childId,
            entityName: propertyNameMap[childId] ?? childId,
            amount: equity * effectivePct * pct,
            effectivePct: effectivePct * pct * 100,
          })
        }
      } else {
        dfs(childId, effectivePct * pct)
      }
    }

    visited.delete(nodeId) // allow same node via different paths
  }

  dfs('colby', 1.0)

  // Direct accounts held personally by Colby
  const directBal = balanceMap['colby'] ?? 0
  const total = directBal + breakdown.reduce((s, r) => s + r.amount, 0)

  // If graph has no data, fall back to sum of all accounts
  if (total === 0) {
    const fallback = accounts.reduce((s: number, a: any) => {
      const bal = Number(a.balance_current ?? 0)
      const t = String(a.type ?? '').toLowerCase()
      return s + ((t === 'credit' || t === 'loan') ? -bal : bal)
    }, 0)
    return { total: fallback, direct: fallback, byEntity: [] }
  }

  return { total, direct: directBal, byEntity: breakdown }
}

// ═══ Tax Structure (for tax advisor agent) ════════════════════════

export interface TaxStructureNode {
  id: string
  name: string
  entityType: string | null
  taxClassification: string | null
  ein: string | null
  formationState: string | null
  purpose: string | null
  parents: { parentId: string; pct: number; role: string | null }[]
  children: { childId: string; pct: number; role: string | null; childType: string }[]
  // property-specific fields (populated only when entityType === 'property')
  propertyMeta?: {
    address: string | null
    city: string | null
    state: string | null
    propertyPurpose: string | null   // 'primary-residence' | 'rental' | 'vacation' | 'investment'
    purchaseDate: string | null
    purchasePrice: number | null
    costBasis: number | null
    currentValue: number | null
    mortgageBalance: number | null
    depreciationTakenYtd: number
  }
}

export async function getTaxStructure(): Promise<TaxStructureNode[]> {
  const [entitiesResult, edgesResult, propertiesResult] = await Promise.allSettled([
    supabase.from('entity_ownership').select('id, entity_name, entity_type, tax_classification, ein, formation_state, purpose'),
    supabase.from('entity_ownership_edges').select('parent_entity_id, child_entity_id, child_type, ownership_pct, role'),
    supabase.from('property_assets').select('id, address, city, state, purpose, purchase_date, purchase_price, cost_basis, current_value, mortgage_balance, depreciation_taken_ytd'),
  ])

  const entities: any[] = entitiesResult.status === 'fulfilled' ? (entitiesResult.value.data ?? []) : []
  const edges: any[] = edgesResult.status === 'fulfilled' ? (edgesResult.value.data ?? []) : []
  const properties: any[] = propertiesResult.status === 'fulfilled' ? (propertiesResult.value.data ?? []) : []

  const propertyMap: Record<string, any> = {}
  properties.forEach((p: any) => { propertyMap[p.id] = p })

  // Entity nodes
  const entityNodes: TaxStructureNode[] = entities.map((e: any) => ({
    id: e.id,
    name: e.entity_name,
    entityType: e.entity_type,
    taxClassification: e.tax_classification,
    ein: e.ein,
    formationState: e.formation_state,
    purpose: e.purpose,
    parents: edges
      .filter((ed: any) => ed.child_entity_id === e.id && (ed.child_type ?? 'entity') === 'entity')
      .map((ed: any) => ({ parentId: ed.parent_entity_id, pct: Number(ed.ownership_pct), role: ed.role })),
    children: edges
      .filter((ed: any) => ed.parent_entity_id === e.id)
      .map((ed: any) => ({ childId: ed.child_entity_id, pct: Number(ed.ownership_pct), role: ed.role, childType: ed.child_type ?? 'entity' })),
  }))

  // Property nodes (leaf nodes in the tax graph)
  const propertyEdges = edges.filter((ed: any) => ed.child_type === 'property')
  const referencedPropertyIds = new Set(propertyEdges.map((ed: any) => ed.child_entity_id))

  const propertyNodes: TaxStructureNode[] = properties
    .filter((p: any) => referencedPropertyIds.has(p.id))
    .map((p: any) => ({
      id: p.id,
      name: p.address ?? p.city ?? 'Property',
      entityType: 'property',
      taxClassification: null,
      ein: null,
      formationState: p.state ?? null,
      purpose: p.purpose ?? null,
      parents: propertyEdges
        .filter((ed: any) => ed.child_entity_id === p.id)
        .map((ed: any) => ({ parentId: ed.parent_entity_id, pct: Number(ed.ownership_pct), role: ed.role })),
      children: [],
      propertyMeta: {
        address: p.address ?? null,
        city: p.city ?? null,
        state: p.state ?? null,
        propertyPurpose: p.purpose ?? null,
        purchaseDate: p.purchase_date ?? null,
        purchasePrice: p.purchase_price != null ? Number(p.purchase_price) : null,
        costBasis: p.cost_basis != null ? Number(p.cost_basis) : null,
        currentValue: p.current_value != null ? Number(p.current_value) : null,
        mortgageBalance: p.mortgage_balance != null ? Number(p.mortgage_balance) : null,
        depreciationTakenYtd: Number(p.depreciation_taken_ytd ?? 0),
      },
    }))

  return [...entityNodes, ...propertyNodes]
}

/**
 * For each property, fetch its parent ownership edges with entity names/slugs.
 * Returns a map: propertyId → [{entityName, slug, pct, role}]
 */
export async function getPropertyOwnershipMap(): Promise<Record<string, { entityName: string; slug: string | null; pct: number; role: string | null }[]>> {
  const [edgesResult, entitiesResult] = await Promise.allSettled([
    supabase.from('entity_ownership_edges').select('parent_entity_id, child_entity_id, ownership_pct, role').eq('child_type', 'property'),
    supabase.from('entity_ownership').select('id, entity_name, slug'),
  ])
  const edges: any[] = edgesResult.status === 'fulfilled' ? (edgesResult.value.data ?? []) : []
  const entityRows: any[] = entitiesResult.status === 'fulfilled' ? (entitiesResult.value.data ?? []) : []

  const entityMap: Record<string, { entity_name: string; slug: string | null }> = {}
  entityRows.forEach((e: any) => { entityMap[e.id] = { entity_name: e.entity_name, slug: e.slug } })

  const result: Record<string, { entityName: string; slug: string | null; pct: number; role: string | null }[]> = {}
  for (const edge of edges) {
    const propId = edge.child_entity_id
    if (!result[propId]) result[propId] = []
    const ent = entityMap[edge.parent_entity_id]
    result[propId].push({
      entityName: ent?.entity_name ?? edge.parent_entity_id,
      slug: ent?.slug ?? null,
      pct: Number(edge.ownership_pct),
      role: edge.role ?? null,
    })
  }
  return result
}

/** Milestones derived from tasks with is_milestone = true */
export async function getProjectMilestones(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_milestone', true)
    .order('due_date', { ascending: true, nullsFirst: false })
  if (error) return []
  return (data ?? []) as any[]
}
