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
