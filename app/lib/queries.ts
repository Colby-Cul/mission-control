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

/** Slim account rows for the Entity Org Chart leaf layer. */
export async function getAccountsForGraph() {
  // Try joining plaid_items for institution_name; fall back if join unavailable.
  const joined = await supabase
    .from('financial_accounts')
    .select('id, name, mask, balance_current, type, subtype, account_scope, entity_id, plaid_item:plaid_items(institution_name)')
    .order('balance_current', { ascending: false })
  if (!joined.error && joined.data) {
    return (joined.data as any[]).map(a => ({
      id: a.id,
      name: a.name,
      mask: a.mask ?? null,
      balance: Number(a.balance_current ?? 0),
      type: a.type ?? null,
      subtype: a.subtype ?? null,
      scope: a.account_scope ?? 'personal',
      entity_id: a.entity_id ?? null,
      institution: a.plaid_item?.institution_name ?? null,
    }))
  }
  const { data } = await supabase
    .from('financial_accounts')
    .select('id, name, mask, balance_current, type, subtype, account_scope, entity_id')
    .order('balance_current', { ascending: false })
  return (data ?? []).map((a: any) => ({
    id: a.id,
    name: a.name,
    mask: a.mask ?? null,
    balance: Number(a.balance_current ?? 0),
    type: a.type ?? null,
    subtype: a.subtype ?? null,
    scope: a.account_scope ?? 'personal',
    entity_id: a.entity_id ?? null,
    institution: null,
  }))
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

// ═══ Company Assets (websites, apps, IP, domains owned by an entity) ═══
// Surfaces on /companies/[slug] and lets the CEO see at-a-glance what digital
// assets each company owns — CaliforniaLuxuryStays.com under CLS, OpenClaw +
// Mission Control under Cabo Tropic Horizons Enterprises, etc.
export async function getCompanyAssets(entityId: string) {
  const { data, error } = await supabase
    .from('company_assets')
    .select('*')
    .eq('entity_id', entityId)
    .order('kind', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.warn('[getCompanyAssets] soft-fail:', error.message)
    return []
  }
  return (data ?? []) as Array<{
    id: string
    entity_id: string
    name: string
    kind: string
    url: string | null
    description: string | null
    status: string
    github_repo: string | null
    vercel_project_id: string | null
    monthly_revenue: number | null
    launched_at: string | null
    tags: string[] | null
    notes: string | null
  }>
}

/** All company assets across all entities — for dashboard rollups. */
export async function getAllCompanyAssets() {
  const { data, error } = await supabase
    .from('company_assets')
    .select('*, entity:entity_ownership(entity_name, slug, display_name)')
    .order('entity_id')
    .order('kind')
  if (error) {
    console.warn('[getAllCompanyAssets] soft-fail:', error.message)
    return []
  }
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
// Soft-fail: these tables don't exist on PROD Supabase yet (seed-only in dev
// branch). Return [] rather than throwing — pages fall back to BUILTIN_AGENTS
// and the live gateway feed instead of hard-crashing the server render.
export async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('tier', { ascending: false })
  if (error) {
    console.warn('[getAgents] soft-fail:', error.message)
    return []
  }
  return data ?? []
}

export async function getAgentRunFeed(limit = 50) {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*, agent:agents(name, color)')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) {
    console.warn('[getAgentRunFeed] soft-fail:', error.message)
    return []
  }
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

/**
 * Look up the current user's Google OAuth token row (for Calendar / Gmail).
 * Returns null if no token row exists or the table hasn't been created yet —
 * callers should fall back to the ComingSoon UI.
 */
export async function getGoogleToken(): Promise<{
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  scope: string[] | null
} | null> {
  const userId = process.env.NEXT_PUBLIC_SEED_USER_ID
  if (!userId) return null
  const { data, error } = await (supabase as any)
    .from('user_tokens')
    .select('access_token, refresh_token, expires_at, scope')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()
  if (error) return null
  return data ?? null
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

/** Aggregated costs — prefers agent_runs (source of truth once the gateway
 *  writes there), falls back to tasks totals if runs haven't accumulated yet.
 *  Also rolls up a real progress % from task completion. */
export async function getProjectCosts(projectId: string) {
  const tasks = await getProjectTasks(projectId)

  // Live agent_runs for this project — cost, tokens, duration
  const { data: runs } = await supabase
    .from('agent_runs')
    .select('cost, tokens, started_at, ended_at, status, agent_id')
    .eq('project_id', projectId)

  const runsList = (runs ?? []) as any[]
  const runCost = runsList.reduce((s, r) => s + Number(r.cost ?? 0), 0)
  const runTokens = runsList.reduce((s, r) => s + Number(r.tokens ?? 0), 0)
  const runSeconds = runsList.reduce((s, r) => {
    if (!r.started_at || !r.ended_at) return s
    const ms = new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()
    return s + Math.max(0, ms / 1000)
  }, 0)

  // Fallbacks from tasks when agent_runs hasn't populated yet
  const fallbackCost   = tasks.reduce((s: number, t: any) => s + Number(t.total_cost ?? 0), 0)
  const fallbackTokens = tasks.reduce((s: number, t: any) => s + Number(t.tokens ?? 0), 0)
  const fallbackSeconds = tasks.reduce((s: number, t: any) => s + Number(t.time_logged ?? 0) * 3600, 0)

  const totalCost       = runCost   > 0 ? runCost   : fallbackCost
  const totalTokens     = runTokens > 0 ? runTokens : fallbackTokens
  const totalSeconds    = runSeconds > 0 ? runSeconds : fallbackSeconds
  const totalTimeLogged = totalSeconds / 3600  // hours

  // Task completion rollup
  const done = tasks.filter((t: any) => ['done','completed'].includes(String(t.status ?? '').toLowerCase())).length
  const active = tasks.filter((t: any) => ['active','running','in_progress'].includes(String(t.status ?? '').toLowerCase())).length
  const blocked = tasks.filter((t: any) => String(t.status ?? '').toLowerCase() === 'blocked').length
  const pending = tasks.filter((t: any) => ['pending','new','queued'].includes(String(t.status ?? '').toLowerCase())).length
  const pctComplete = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0

  // Estimated total cost = actual spent / fraction complete (simple extrapolation)
  const estimatedTotal = pctComplete > 0 && totalCost > 0
    ? Math.round(totalCost / (pctComplete / 100))
    : null

  // Live session activity (from agent_runs not-yet-ended)
  const liveRuns = runsList.filter(r => !r.ended_at && r.status !== 'error').length

  return {
    totalCost,
    totalTokens,
    totalTimeLogged,
    taskCount: tasks.length,
    done,
    active,
    blocked,
    pending,
    pctComplete,
    estimatedTotal,
    liveRuns,
    runsCount: runsList.length,
  }
}

/** Pulls the forge idea linked to this project, if any. Projects created
 *  from the Forge carry `source_forge_idea_id` — the idea contains the
 *  richer PRD fields (problem, how_it_works, agentic_architecture, revenue
 *  model, path-to-100k, mvp_scope, build time, confidence). */
export async function getForgeIdeaForProject(projectId: string) {
  const project = await getProjectById(projectId)
  const ideaId = project?.source_forge_idea_id as string | undefined
  if (!ideaId) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('forge_ideas') as any)
    .select('*')
    .eq('id', ideaId)
    .maybeSingle()
  return data as Record<string, unknown> | null
}

/** Per-agent and per-model cost + token breakdown for this project.
 *  Source: agent_runs (the real gateway trace). Falls back to task totals
 *  only if there are no runs recorded yet. */
export async function getProjectCostBreakdown(projectId: string) {
  const { data: runs } = await supabase
    .from('agent_runs')
    .select('agent_id, cost, tokens, started_at, ended_at, status')
    .eq('project_id', projectId)
  const list = (runs ?? []) as Array<{
    agent_id: string | null
    cost: number | null
    tokens: number | null
    started_at: string | null
    ended_at: string | null
    status: string | null
  }>

  const byAgent = new Map<string, { runs: number; cost: number; tokens: number; seconds: number }>()
  let total = { runs: 0, cost: 0, tokens: 0, seconds: 0 }

  for (const r of list) {
    const agent = r.agent_id || 'unknown'
    const cost = Number(r.cost ?? 0)
    const tokens = Number(r.tokens ?? 0)
    const secs = r.started_at && r.ended_at
      ? Math.max(0, (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 1000)
      : 0
    const cur = byAgent.get(agent) || { runs: 0, cost: 0, tokens: 0, seconds: 0 }
    cur.runs += 1
    cur.cost += cost
    cur.tokens += tokens
    cur.seconds += secs
    byAgent.set(agent, cur)
    total.runs += 1
    total.cost += cost
    total.tokens += tokens
    total.seconds += secs
  }

  const agents = Array.from(byAgent.entries())
    .map(([agent, v]) => ({ agent, ...v }))
    .sort((a, b) => b.cost - a.cost)

  return { agents, total }
}

/** Most recent agent runs for a project — activity feed. Newest first. */
export async function getProjectRecentRuns(projectId: string, limit = 12) {
  const { data } = await supabase
    .from('agent_runs')
    .select('id, agent_id, task_id, status, started_at, ended_at, cost, tokens, error')
    .eq('project_id', projectId)
    .order('started_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as Array<{
    id: string
    agent_id: string | null
    task_id: string | null
    status: string | null
    started_at: string | null
    ended_at: string | null
    cost: number | null
    tokens: number | null
    error: string | null
  }>
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
  byEntity: { entityId: string; entityName: string; amount: number; effectivePct: number; rentalRevenueYtd?: number }[]
  /** Portfolio-level YTD rental revenue from Lodgify (undefined when not configured) */
  rentalRevenueYtd?: number
}

/**
 * Per-property YTD rental revenue sourced from Lodgify bookings. Keyed by the
 * Supabase `property_assets.id` so the caller can feed it into the ownership
 * cascade (DFS through `entity_ownership_edges`).
 *
 * Returns `{}` when Lodgify is not configured or an error is raised.
 */
export async function getLodgifyPropertyRevenueYtdMap(): Promise<Record<string, number>> {
  try {
    const [{ isLodgifyConfigured, getLodgifyBookings }, propsRes] = await Promise.all([
      import('./lodgify'),
      supabase.from('property_assets').select('id, lodgify_property_id, lodgify_id'),
    ])
    if (!isLodgifyConfigured()) return {}
    const props = propsRes.data ?? []
    const pidToSupabase: Record<string, string> = {}
    for (const p of props as any[]) {
      const lp = p.lodgify_property_id != null ? String(p.lodgify_property_id)
               : p.lodgify_id != null ? String(p.lodgify_id)
               : null
      if (lp) pidToSupabase[lp] = p.id
    }
    const bookings = await getLodgifyBookings({ stayFilter: 'All', max: 1000 })
    const year = new Date().getFullYear()
    const revMap: Record<string, number> = {}
    for (const b of bookings) {
      const s = String(b.status ?? '').toLowerCase()
      const src = String(b.source ?? '').toLowerCase()
      if (s === 'declined' || s === 'cancelled' || s === 'canceled') continue
      if (src === 'oh' || src === 'ownerhold') continue
      if (!(b.arrival?.slice(0, 4) === String(year))) continue
      const amt = Number(b.total_amount ?? 0)
      if (amt <= 0) continue
      const propId = pidToSupabase[String(b.property_id)]
      if (!propId) continue
      revMap[propId] = (revMap[propId] ?? 0) + amt
    }
    return revMap
  } catch {
    return {}
  }
}

/**
 * Walk the ownership graph starting from 'colby' and accumulate
 * account balances weighted by ownership percentage along each path.
 * Also cascades through property edges: equity = current_value − mortgage_balance,
 * multiplied by cumulative ownership %.
 * Returns total + per-entity breakdown.
 *
 * Also cascades live Lodgify YTD rental revenue onto each entity via
 * a second DFS so the entity tooltip / hover can show
 * "X properties, $Y equity, $Z YTD rental revenue".
 */
export async function getNetWorthFromGraph(): Promise<NetWorthBreakdown> {
  // Fetch all edges, financial accounts, entities, properties, and Lodgify
  // per-property revenue in parallel.
  const [edgesResult, accountsResult, entitiesResult, propertiesResult, rentalRevMap] = await Promise.all([
    supabase.from('entity_ownership_edges').select('parent_entity_id, parent_type, child_entity_id, child_type, ownership_pct'),
    supabase.from('financial_accounts').select('entity_id, account_scope, balance_current, type'),
    supabase.from('entity_ownership').select('id, entity_name'),
    supabase.from('property_assets').select('id, address, city, current_value, mortgage_balance'),
    getLodgifyPropertyRevenueYtdMap().catch(() => ({} as Record<string, number>)),
  ])

  const edges: any[] = edgesResult.data ?? []
  const accounts: any[] = accountsResult.data ?? []
  const entities: any[] = entitiesResult.data ?? []
  const properties: any[] = propertiesResult.data ?? []

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

  // ── Rental revenue cascade: for each entity, sum downstream property revenue
  //    weighted by ownership %. Walk starting at every entity (not only Colby)
  //    so child entities also see the share they directly hold.
  function rentalRevenueFor(entityId: string): number {
    const seen = new Set<string>()
    let sum = 0
    function walk(nodeId: string, frac: number) {
      if (seen.has(nodeId)) return
      seen.add(nodeId)
      const children = childMap[nodeId] ?? []
      for (const { childId, pct, childType } of children) {
        if (childType === 'property') {
          const propRev = rentalRevMap[childId] ?? 0
          if (propRev) sum += propRev * frac * pct
        } else {
          walk(childId, frac * pct)
        }
      }
      seen.delete(nodeId)
    }
    walk(entityId, 1.0)
    return sum
  }
  for (const row of breakdown) {
    const rr = rentalRevenueFor(row.entityId)
    if (rr > 0) row.rentalRevenueYtd = Math.round(rr)
  }
  const portfolioRentalRevenueYtd = Object.values(rentalRevMap).reduce((s, v) => s + v, 0)

  // If graph has no data, fall back to sum of all accounts
  if (total === 0) {
    const fallback = accounts.reduce((s: number, a: any) => {
      const bal = Number(a.balance_current ?? 0)
      const t = String(a.type ?? '').toLowerCase()
      return s + ((t === 'credit' || t === 'loan') ? -bal : bal)
    }, 0)
    return { total: fallback, direct: fallback, byEntity: [], rentalRevenueYtd: portfolioRentalRevenueYtd }
  }

  return { total, direct: directBal, byEntity: breakdown, rentalRevenueYtd: portfolioRentalRevenueYtd }
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

// ═══ Derived: Agent Activity Feed (union of agent_runs + sessions) ═
/**
 * Unified agent activity feed. Since agent_runs is empty in most environments,
 * we also surface cron sessions (agent_name + cron_id) as a first-class signal.
 * Used by Dashboard / Executive / Activity pages.
 */
export async function getAgentActivityFeed(limit = 20) {
  // Try agent_runs first
  const [runsRes, sessionsRes] = await Promise.allSettled([
    supabase.from('agent_runs').select('*, agent:agents(name, color)').order('started_at', { ascending: false }).limit(limit),
    supabase.from('sessions').select('id, title, agent_name, status, trigger_source, cron_id, started_at, ended_at, cost_usd, cost').order('started_at', { ascending: false }).limit(limit),
  ])
  const runs = runsRes.status === 'fulfilled' ? (runsRes.value.data ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []

  const norm: Array<{
    id: string
    when: string | null
    agent: string
    kind: string
    status: string
    title: string
    cost: number
    source: 'agent_runs' | 'sessions'
  }> = []
  for (const r of runs as any[]) {
    norm.push({
      id: r.id,
      when: r.started_at ?? r.created_at,
      agent: r.agent?.name ?? r.agent_id ?? 'Agent',
      kind: 'run',
      status: r.status ?? '—',
      title: (r.input?.title ?? r.input?.prompt ?? r.task_id ?? 'Agent run').toString().slice(0, 120),
      cost: Number(r.cost ?? 0),
      source: 'agent_runs',
    })
  }
  for (const s of sessions as any[]) {
    norm.push({
      id: s.id,
      when: s.started_at,
      agent: s.agent_name ?? 'System',
      kind: s.trigger_source === 'cron' ? 'cron' : 'session',
      status: s.status ?? 'completed',
      title: (s.title ?? s.cron_id ?? 'Session').toString().slice(0, 120),
      cost: Number(s.cost_usd ?? s.cost ?? 0),
      source: 'sessions',
    })
  }
  return norm.sort((a, b) => (b.when ?? '').localeCompare(a.when ?? '')).slice(0, limit)
}

// ═══ Derived: Daily Brief data bundle ══════════════════════════════
/**
 * Morning briefing bundle — pulls counts/highlights from across the empire.
 * Used by /home and /executive daily brief cards.
 */
export async function getDailyBrief() {
  const [agentFeed, openTasks, upcomingDeadlines, entities, milestones] = await Promise.allSettled([
    getAgentActivityFeed(5),
    getOpenTasks(),
    getUpcomingTaxDeadlines(),
    getEntities(),
    getCompanyMilestones(),
  ])
  const feed = agentFeed.status === 'fulfilled' ? agentFeed.value : []
  const tasks = openTasks.status === 'fulfilled' ? openTasks.value : []
  const dls = upcomingDeadlines.status === 'fulfilled' ? upcomingDeadlines.value : []
  const ents = entities.status === 'fulfilled' ? entities.value : []
  const ms = milestones.status === 'fulfilled' ? milestones.value : []

  const todayStr = new Date().toISOString().slice(0, 10)
  const runsToday = feed.filter((f: any) => (f.when ?? '').startsWith(todayStr)).length
  const highPriTasks = (tasks as any[]).filter((t: any) => t.priority === 'high' || t.priority === 'critical').slice(0, 5)
  const nextDeadline = (dls as any[])[0] ?? null
  const nextMilestone = (ms as any[]).filter((m: any) => m.status === 'upcoming')[0] ?? null

  return {
    runsToday,
    agentFeed: feed,
    openTaskCount: (tasks as any[]).length,
    highPriTasks,
    nextDeadline,
    nextMilestone,
    entityCount: (ents as any[]).length,
  }
}

// ═══ Derived: Agent cost budget rollup ═════════════════════════════
/**
 * Aggregate spend per agent from sessions (the cron run history).
 * Returns rows like { agent, spend, runs, budget, pctUsed }.
 */
export async function getAgentCostBudgets() {
  const [agentsRes, sessionsRes] = await Promise.allSettled([
    supabase.from('agents').select('id, name, monthly_budget, cost_ytd'),
    supabase.from('sessions').select('agent_name, cost_usd, cost, started_at'),
  ])
  const agents = agentsRes.status === 'fulfilled' ? (agentsRes.value.data ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []

  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
  const since = monthStart.toISOString()

  const spendMap: Record<string, { spend: number; runs: number }> = {}
  for (const s of sessions as any[]) {
    if ((s.started_at ?? '') < since) continue
    const key = String(s.agent_name ?? 'system').toLowerCase()
    if (!spendMap[key]) spendMap[key] = { spend: 0, runs: 0 }
    spendMap[key].spend += Number(s.cost_usd ?? s.cost ?? 0)
    spendMap[key].runs += 1
  }

  return (agents as any[]).map((a: any) => {
    const key = String(a.name ?? a.id).toLowerCase()
    const agg = spendMap[key] ?? { spend: 0, runs: 0 }
    const budget = Number(a.monthly_budget ?? 0)
    const pctUsed = budget > 0 ? Math.min(100, (agg.spend / budget) * 100) : null
    return {
      id: a.id,
      name: a.name,
      spend: agg.spend,
      runs: agg.runs,
      budget,
      pctUsed,
      costYtd: Number(a.cost_ytd ?? 0),
    }
  })
}

// ═══ Derived: Permission / capability matrix ══════════════════════
export async function getAgentCapabilityMatrix() {
  const { data } = await supabase.from('agents').select('id, name, capabilities, tier, status')
  const rows = (data ?? []) as any[]
  const allCapSet = new Set<string>()
  for (const a of rows) {
    const caps = Array.isArray(a.capabilities) ? a.capabilities : []
    caps.forEach((c: string) => allCapSet.add(c))
  }
  const allCaps = [...allCapSet].sort()
  const matrix = rows.map((a: any) => ({
    id: a.id,
    name: a.name,
    tier: a.tier,
    status: a.status,
    capabilities: allCaps.map(cap => ({
      cap,
      has: Array.isArray(a.capabilities) && a.capabilities.includes(cap),
    })),
  }))
  return { caps: allCaps, matrix }
}

// ═══ Derived: Service Health from sessions + agents ════════════════
/**
 * Ping-style service status grid — last successful heartbeat per agent.
 * Source: last session.started_at per agent_name.
 */
export async function getServiceStatusGrid() {
  const [agentsRes, sessionsRes] = await Promise.allSettled([
    supabase.from('agents').select('id, name, status, health_status, last_run_ts'),
    supabase.from('sessions').select('agent_name, status, started_at, ended_at')
      .order('started_at', { ascending: false }).limit(200),
  ])
  const agents = agentsRes.status === 'fulfilled' ? (agentsRes.value.data ?? []) : []
  const sessions = sessionsRes.status === 'fulfilled' ? (sessionsRes.value.data ?? []) : []

  const lastByAgent: Record<string, { when: string; status: string }> = {}
  for (const s of sessions as any[]) {
    const key = String(s.agent_name ?? '').toLowerCase()
    if (!key) continue
    if (!lastByAgent[key] || (s.started_at ?? '') > lastByAgent[key].when) {
      lastByAgent[key] = { when: s.started_at ?? '', status: s.status ?? 'completed' }
    }
  }

  return (agents as any[]).map((a: any) => {
    const key = String(a.name ?? a.id).toLowerCase()
    const beat = lastByAgent[key] ?? null
    let health: 'healthy' | 'degraded' | 'down' | 'unknown' = a.health_status ?? 'unknown'
    if (beat?.when) {
      const ageH = (Date.now() - new Date(beat.when).getTime()) / 3600_000
      if (beat.status && beat.status !== 'completed' && beat.status !== 'success') health = 'degraded'
      else if (ageH < 24) health = 'healthy'
      else if (ageH < 72) health = 'degraded'
      else health = 'down'
    }
    return {
      id: a.id,
      name: a.name,
      status: a.status ?? 'idle',
      health,
      lastBeat: beat?.when ?? a.last_run_ts ?? null,
    }
  })
}

// ═══ Derived: Performance timeseries (sessions cost per hour) ════
export async function getPerformanceTimeseries(days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const { data } = await supabase
    .from('sessions')
    .select('started_at, ended_at, cost_usd, cost, status')
    .gte('started_at', since)
    .order('started_at', { ascending: true })
  const rows = (data ?? []) as any[]
  // Bucket by day
  const dayMap: Record<string, { runs: number; cost: number; durationMin: number }> = {}
  for (const r of rows) {
    const day = (r.started_at ?? '').slice(0, 10)
    if (!day) continue
    if (!dayMap[day]) dayMap[day] = { runs: 0, cost: 0, durationMin: 0 }
    dayMap[day].runs += 1
    dayMap[day].cost += Number(r.cost_usd ?? r.cost ?? 0)
    if (r.started_at && r.ended_at) {
      dayMap[day].durationMin += (new Date(r.ended_at).getTime() - new Date(r.started_at).getTime()) / 60000
    }
  }
  return Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }))
}

// ═══ Derived: Cash-flow projection & runway ════════════════════════
/**
 * 12-month projection derived from kpi_snapshots net_worth deltas (monthly).
 * If <2 snapshots, falls back to showing flat projection.
 */
export async function getNetWorthProjection() {
  const { data } = await supabase
    .from('kpi_snapshots')
    .select('value, as_of')
    .eq('metric_key', 'net_worth')
    .order('as_of', { ascending: true })
  const snaps = (data ?? []) as any[]
  if (snaps.length < 2) return { past: snaps, forecast: [] as any[] }
  // Simple average monthly delta over last 6 snapshots
  const recent = snaps.slice(-6)
  const deltas: number[] = []
  for (let i = 1; i < recent.length; i++) {
    deltas.push(Number(recent[i].value) - Number(recent[i - 1].value))
  }
  const avgDelta = deltas.reduce((a, b) => a + b, 0) / (deltas.length || 1)
  const last = snaps[snaps.length - 1]
  const forecast: any[] = []
  let v = Number(last.value)
  for (let i = 1; i <= 12; i++) {
    v = v + avgDelta
    const d = new Date(last.as_of)
    d.setMonth(d.getMonth() + i)
    forecast.push({ as_of: d.toISOString(), value: v })
  }
  return { past: snaps, forecast }
}

// ═══ Derived: Per-entity revenue via account join ════════════════
/**
 * Attribute transactions to entities through the account → entity linkage.
 * financial_transactions.entity_id may be NULL but financial_accounts.entity_id
 * is often set — so we derive by joining on account_id.
 * Also aggregates KPI values (revenue_mtd, cash_flow_mtd, ...) from company_kpis
 * as a fallback when transactions aren't tagged yet.
 */
export async function getEntityFinancialRollup() {
  const [txnRes, accountsRes, kpiRes, entityRes] = await Promise.allSettled([
    supabase.from('financial_transactions').select('amount, entity_id, account_id, date, personal_finance_category'),
    supabase.from('financial_accounts').select('id, entity_id, account_scope, balance_current, type'),
    supabase.from('company_kpis').select('entity_id, kpi_key, value'),
    supabase.from('entity_ownership').select('id, entity_name, entity_type, slug'),
  ])
  const txns = txnRes.status === 'fulfilled' ? (txnRes.value.data ?? []) : []
  const accounts = accountsRes.status === 'fulfilled' ? (accountsRes.value.data ?? []) : []
  const kpis = kpiRes.status === 'fulfilled' ? (kpiRes.value.data ?? []) : []
  const entities = entityRes.status === 'fulfilled' ? (entityRes.value.data ?? []) : []

  const accountEntityMap: Record<string, string> = {}
  for (const a of accounts as any[]) {
    if (a.entity_id) accountEntityMap[a.id] = a.entity_id
  }

  // Per entity stats
  const stats: Record<string, {
    txnCount: number
    inflow: number
    outflow: number
    balanceSum: number
    revenueMtd: number
    cashFlowMtd: number
  }> = {}

  for (const t of txns as any[]) {
    const eid = t.entity_id ?? accountEntityMap[t.account_id]
    if (!eid) continue
    if (!stats[eid]) stats[eid] = { txnCount: 0, inflow: 0, outflow: 0, balanceSum: 0, revenueMtd: 0, cashFlowMtd: 0 }
    stats[eid].txnCount += 1
    const amt = Number(t.amount ?? 0)
    if (amt < 0) stats[eid].inflow += Math.abs(amt)
    else stats[eid].outflow += amt
  }
  for (const a of accounts as any[]) {
    const eid = a.entity_id
    if (!eid) continue
    if (!stats[eid]) stats[eid] = { txnCount: 0, inflow: 0, outflow: 0, balanceSum: 0, revenueMtd: 0, cashFlowMtd: 0 }
    const bal = Number(a.balance_current ?? 0)
    const t = String(a.type ?? '').toLowerCase()
    stats[eid].balanceSum += (t === 'credit' || t === 'loan') ? -bal : bal
  }
  for (const k of kpis as any[]) {
    const eid = k.entity_id
    if (!eid) continue
    if (!stats[eid]) stats[eid] = { txnCount: 0, inflow: 0, outflow: 0, balanceSum: 0, revenueMtd: 0, cashFlowMtd: 0 }
    if (k.kpi_key === 'revenue_mtd') stats[eid].revenueMtd = Number(k.value ?? 0)
    if (k.kpi_key === 'cash_flow_mtd') stats[eid].cashFlowMtd = Number(k.value ?? 0)
  }

  return (entities as any[]).map((e: any) => ({
    entityId: e.id,
    entityName: e.entity_name,
    entityType: e.entity_type,
    slug: e.slug,
    ...(stats[e.id] ?? { txnCount: 0, inflow: 0, outflow: 0, balanceSum: 0, revenueMtd: 0, cashFlowMtd: 0 }),
  }))
}

// ═══ Derived: Compliance / Audit score per entity ═════════════════
/**
 * Per-entity compliance score derived from completeness of required data:
 *   - Has EIN (+25)
 *   - Formation state / date set (+15)
 *   - Has tax classification (+15)
 *   - is_active status set (+10)
 *   - At least one document (+20)
 *   - At least one bank account linked (+15)
 */
export async function getComplianceChecklist() {
  const [entRes, docsRes, accountsRes] = await Promise.allSettled([
    supabase.from('entity_ownership').select('id, entity_name, entity_type, ein, formation_state, tax_classification, is_active, slug'),
    supabase.from('entity_documents').select('id, entity_id'),
    supabase.from('financial_accounts').select('entity_id').eq('account_scope', 'entity'),
  ])
  const entities = entRes.status === 'fulfilled' ? (entRes.value.data ?? []) : []
  const docs = docsRes.status === 'fulfilled' ? (docsRes.value.data ?? []) : []
  const accounts = accountsRes.status === 'fulfilled' ? (accountsRes.value.data ?? []) : []

  const docCountMap: Record<string, number> = {}
  for (const d of docs as any[]) if (d.entity_id) docCountMap[d.entity_id] = (docCountMap[d.entity_id] ?? 0) + 1
  const bankCountMap: Record<string, number> = {}
  for (const a of accounts as any[]) if (a.entity_id) bankCountMap[a.entity_id] = (bankCountMap[a.entity_id] ?? 0) + 1

  return (entities as any[]).map((e: any) => {
    const checks = [
      { key: 'EIN',          pass: !!e.ein,                 weight: 25 },
      { key: 'Formation',    pass: !!e.formation_state,     weight: 15 },
      { key: 'Tax Class',    pass: !!e.tax_classification,  weight: 15 },
      { key: 'Active Status',pass: e.is_active === true,    weight: 10 },
      { key: 'Documents',    pass: (docCountMap[e.id] ?? 0) > 0, weight: 20 },
      { key: 'Bank Account', pass: (bankCountMap[e.id] ?? 0) > 0, weight: 15 },
    ]
    const score = checks.reduce((s, c) => s + (c.pass ? c.weight : 0), 0)
    return {
      entityId: e.id,
      entityName: e.entity_name,
      entityType: e.entity_type,
      slug: e.slug,
      score,
      checks,
      docCount: docCountMap[e.id] ?? 0,
      bankCount: bankCountMap[e.id] ?? 0,
    }
  })
}

/**
 * Overall audit readiness — rolled up across all entities.
 */
export async function getAuditReadiness() {
  const rows = await getComplianceChecklist()
  if (rows.length === 0) return { pct: 0, rows, summary: '—' }
  const avg = rows.reduce((s, r) => s + r.score, 0) / rows.length
  return { pct: Math.round(avg), rows, summary: `${rows.length} entities reviewed` }
}

// ═══ Derived: Tax deductions YTD by category ═══════════════════════
/**
 * YTD deductions = expenses in deductible-looking categories from
 * financial_transactions, grouped. When txns are empty, falls back to
 * tax_entities_meta.deductions (per-entity pre-filled value).
 */
export async function getDeductionsYtd() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10)
  const [txnRes, metaRes] = await Promise.allSettled([
    supabase.from('financial_transactions').select('amount, personal_finance_category, date').gte('date', yearStart),
    supabase.from('tax_entities_meta').select('entity_id, deductions'),
  ])
  const txns = txnRes.status === 'fulfilled' ? (txnRes.value.data ?? []) : []
  const meta = metaRes.status === 'fulfilled' ? (metaRes.value.data ?? []) : []

  const DEDUCTIBLE_CATEGORIES = new Set([
    'TRANSPORTATION', 'TRAVEL', 'RENT_AND_UTILITIES', 'HOME_IMPROVEMENT',
    'OFFICE_SUPPLIES', 'PROFESSIONAL_SERVICES', 'BANK_FEES', 'INSURANCE',
    'GENERAL_SERVICES', 'FOOD_AND_DRINK',
  ])
  const catMap: Record<string, number> = {}
  for (const t of txns as any[]) {
    const amt = Number(t.amount ?? 0)
    if (amt <= 0) continue
    const cat = String(t.personal_finance_category ?? 'OTHER').toUpperCase()
    if (!DEDUCTIBLE_CATEGORIES.has(cat)) continue
    catMap[cat] = (catMap[cat] ?? 0) + amt
  }
  const fromTxn = Object.entries(catMap).map(([cat, total]) => ({ category: cat, total, source: 'transactions' as const }))
  const totalFromTxn = fromTxn.reduce((s, r) => s + r.total, 0)
  const totalFromMeta = (meta as any[]).reduce((s: number, m: any) => s + Number(m.deductions ?? 0), 0)

  if (totalFromTxn > 0) return { rows: fromTxn.sort((a, b) => b.total - a.total), total: totalFromTxn, source: 'transactions' as const }
  return {
    rows: (meta as any[]).map((m: any) => ({ category: m.entity_id ?? 'unknown', total: Number(m.deductions ?? 0), source: 'tax_entities_meta' as const })),
    total: totalFromMeta,
    source: 'tax_entities_meta' as const,
  }
}

// ═══ Derived: Recurring subscription detection ═══════════════════
/**
 * Detect recurring subscriptions — same merchant_name + approx amount recurring
 * within ~27-34 day intervals. Needs at least 2 occurrences.
 */
export async function getRecurringCharges() {
  const since = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('financial_transactions')
    .select('merchant_name, name, amount, date')
    .gte('date', since)
    .gt('amount', 0)
  const rows = (data ?? []) as any[]
  if (rows.length === 0) return []

  const groups: Record<string, { merchant: string; amounts: number[]; dates: string[] }> = {}
  for (const t of rows) {
    const merchant = String(t.merchant_name ?? t.name ?? '').trim()
    if (!merchant) continue
    const bucketKey = `${merchant}|${Math.round(Number(t.amount))}`
    if (!groups[bucketKey]) groups[bucketKey] = { merchant, amounts: [], dates: [] }
    groups[bucketKey].amounts.push(Number(t.amount))
    groups[bucketKey].dates.push(t.date)
  }

  const recurring: Array<{ merchant: string; amount: number; cadenceDays: number; occurrences: number; lastDate: string }> = []
  for (const g of Object.values(groups)) {
    if (g.dates.length < 2) continue
    const sorted = [...g.dates].sort()
    const diffs: number[] = []
    for (let i = 1; i < sorted.length; i++) {
      diffs.push((new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000)
    }
    const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length
    if (avgDiff >= 25 && avgDiff <= 35) {
      recurring.push({
        merchant: g.merchant,
        amount: g.amounts.reduce((a, b) => a + b, 0) / g.amounts.length,
        cadenceDays: Math.round(avgDiff),
        occurrences: g.amounts.length,
        lastDate: sorted[sorted.length - 1],
      })
    }
  }
  return recurring.sort((a, b) => b.amount - a.amount)
}

// ═══ Derived: Portfolio geo summary ════════════════════════════════
/**
 * Group properties by city/state for simple geographic rollup.
 */
export async function getPortfolioGeo() {
  const { data } = await supabase.from('property_assets').select('id, address, city, state, current_value, is_rental')
  const rows = (data ?? []) as any[]
  const groups: Record<string, { count: number; value: number; rentals: number; properties: any[] }> = {}
  for (const p of rows) {
    const key = `${p.city ?? '—'}, ${p.state ?? '—'}`
    if (!groups[key]) groups[key] = { count: 0, value: 0, rentals: 0, properties: [] }
    groups[key].count += 1
    groups[key].value += Number(p.current_value ?? 0)
    if (p.is_rental) groups[key].rentals += 1
    groups[key].properties.push(p)
  }
  return Object.entries(groups)
    .map(([region, d]) => ({ region, ...d }))
    .sort((a, b) => b.value - a.value)
}

// ═══ Derived: Tax moves (seeded static suggestions if empty) ═══════
/**
 * Returns tax_moves from DB; if empty, generate heuristic suggestions
 * from financial state (e.g. "Consider Q4 estimated payment if YTD income > X").
 */
export async function getDerivedTaxMoves() {
  const existing = await getTaxMoves()
  if ((existing as any[]).length > 0) return existing

  const [entRes, metaRes] = await Promise.allSettled([
    supabase.from('entity_ownership').select('id, entity_name, tax_classification, entity_type'),
    supabase.from('tax_entities_meta').select('entity_id, ytd_income, ytd_paid'),
  ])
  const entities = entRes.status === 'fulfilled' ? (entRes.value.data ?? []) : []
  const meta = metaRes.status === 'fulfilled' ? (metaRes.value.data ?? []) : []
  const moves: any[] = []
  for (const m of meta as any[]) {
    const inc = Number(m.ytd_income ?? 0)
    const paid = Number(m.ytd_paid ?? 0)
    if (inc > 50_000 && paid < inc * 0.15) {
      moves.push({
        id: `derived-${m.entity_id}-quarterly`,
        action: `Review Q-estimated payments for ${m.entity_id}`,
        status: 'open',
        priority: 'high',
        detail: `YTD income ${inc.toLocaleString()} vs paid ${paid.toLocaleString()} — likely under-withheld.`,
        savings_label: 'Avoid penalties',
        deadline: 'Before quarter end',
      })
    }
  }
  for (const e of entities as any[]) {
    if (e.entity_type === 'LLC' && !e.tax_classification) {
      moves.push({
        id: `derived-${e.id}-tax-election`,
        action: `Choose tax classification for ${e.entity_name}`,
        status: 'evaluate',
        priority: 'medium',
        detail: 'Default tax status may not be optimal. Consider S-Corp or disregarded election.',
        savings_label: 'Potential savings',
        deadline: 'Before year end',
      })
    }
  }
  return moves
}

// ═══ Derived: Expiring Documents ═══════════════════════════════════
export async function getExpiringDocuments(daysAhead = 90) {
  const cutoff = new Date(Date.now() + daysAhead * 86400000).toISOString()
  const { data } = await supabase
    .from('entity_documents')
    .select('id, filename, entity_name, entity_id, document_type, expires_at')
    .not('expires_at', 'is', null)
    .lte('expires_at', cutoff)
    .order('expires_at', { ascending: true })
  return (data ?? []) as any[]
}
