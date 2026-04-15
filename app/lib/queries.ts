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
