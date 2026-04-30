/**
 * fub.ts — Follow Up Boss (FUB) adapter for The Culbertson and Gray Group.
 *
 * All fetches return a FubResult<T> = { data: T | null, error: string | null }.
 * Server components treat `data === null` as the ComingSoon state. We never
 * throw from this module.
 *
 * ENV:
 *   FUB_API_KEY  — issued from FUB → Settings → API. Stored in Vercel env
 *                  (prod + preview + dev) and locally in .env.local.
 *
 * Auth pattern (required by FUB):
 *   - HTTP Basic with API key as username, blank password.
 *   - Plus `X-System: MissionControl-v7` and `X-System-Key: <api-key>` as the
 *     required system-identifier headers.
 *
 * Caching: 60s in-memory cache + Next.js `next.revalidate: 60`. Rate limit
 * 429 returns a soft error (data: null, error: '429 ...') so widgets
 * degrade to ComingSoon rather than 500.
 *
 * Related inventory:
 *   - /Users/jarvisculbertson/openclaw/docs/fub-inventory.md
 *   - /Users/jarvisculbertson/openclaw/docs/fub-inventory.json
 *
 * Related page:
 *   - /companies/culbertson-gray
 */

// ─── Types ──────────────────────────────────────────────────────────────

export interface FubResult<T = unknown> {
  data: T | null
  error: string | null
  cached?: boolean
}

export interface FubIdentity {
  id?: number
  account?: {
    id?: number
    name?: string
    domain?: string
  }
  user?: {
    id?: number
    name?: string
    role?: string
  }
  [k: string]: unknown
}

export interface FubUser {
  id: number
  name?: string
  firstName?: string
  lastName?: string
  role?: string
  status?: string
  email?: string
  phone?: string
  picture?: {
    '30x30'?: string
    '40x40'?: string
    '60x60'?: string
    '162x162'?: string
    original?: string
  } | null
  teams?: Array<{ id: number; name: string }>
  timezone?: string
  created?: string
  updated?: string
}

export interface FubStage {
  id: number
  name: string
}

export interface FubPipeline {
  id: number
  name: string
  stagesCount?: number | null
}

export interface FubCall {
  id: number
  created: string
  updated?: string
  personId?: number
  name?: string
  firstName?: string
  lastName?: string
  userId?: number
  userName?: string
  duration?: number
  outcome?: string
  isIncoming?: boolean
  startedAt?: string
  note?: string | null
  recordingUrl?: string | null
}

export interface FubAppointment {
  id: number
  title?: string
  start?: string
  end?: string
  type?: string | null
  status?: string
  createdById?: number
  userIds?: number[]
  attendeeIds?: number[]
  description?: string
  location?: string
  allDay?: boolean
  invitees?: Array<{ userId?: number; personId?: number; response?: string }>
}

export interface FubDeal {
  id: number
  name?: string
  status?: string
  type?: number
  price?: number
  createdAt?: string
  projectedCloseDate?: string | null
  pipelineId?: number
  pipelineName?: string
  stageId?: number
  stageName?: string
  enteredStageAt?: string
  commissionValue?: number
  agentCommission?: number
  teamCommission?: number
  timeToClose?: number
  userIds?: number[]
  [k: string]: unknown
}

export interface FubSmartList {
  id: number
  name: string
  count?: number
  peopleCount?: number
}

export interface FubTeam {
  id: number
  name: string
  userIds?: number[]
}

export interface FubEvent {
  id: number
  created: string
  occurred?: string
  personId?: number
  type?: string
  source?: string
  description?: string | null
  pageUrl?: string | null
  pageTitle?: string | null
  property?: {
    street?: string
    city?: string
    state?: string
    code?: string
    price?: string
    bedrooms?: string
    bathrooms?: string
  } | null
}

export interface FubPerson {
  id: number
  name?: string
  firstName?: string
  lastName?: string
  stage?: string
  stageId?: number
  source?: string
  created?: string
  updated?: string
  firstCommunication?: string | null
  lastCommunication?: string | null
  assignedUserId?: number | null
  assignedTo?: string | null
  [k: string]: unknown
}

// ─── Config + auth ──────────────────────────────────────────────────────

const BASE = 'https://api.followupboss.com/v1'
const SYSTEM = 'MissionControl-v7'

function apiKey(): string | null {
  const v = process.env.FUB_API_KEY
  return v && v.trim() ? v.trim() : null
}

function authHeader(key: string): string {
  // Node + modern runtimes both expose Buffer; fall back to btoa for safety.
  if (typeof Buffer !== 'undefined') {
    return 'Basic ' + Buffer.from(`${key}:`).toString('base64')
  }
  return 'Basic ' + btoa(`${key}:`)
}

// ─── In-memory cache (60s) ──────────────────────────────────────────────

interface CacheEntry {
  data: unknown
  expiresAt: number
}
const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 60_000

function cget(key: string): unknown | null {
  const e = CACHE.get(key)
  if (!e) return null
  if (Date.now() > e.expiresAt) {
    CACHE.delete(key)
    return null
  }
  return e.data
}

function cset(key: string, data: unknown): void {
  CACHE.set(key, { data, expiresAt: Date.now() + TTL_MS })
}

// ─── Core fetch ─────────────────────────────────────────────────────────

/**
 * Low-level FUB GET. Returns a FubResult<T>.
 *
 *   - Missing API key  → { data: null, error: 'FUB_API_KEY not configured' }
 *   - 401              → { data: null, error: '401 Unauthorized — ...' }
 *   - 429              → { data: null, error: '429 Rate limited — retry in 60s' }
 *   - 4xx/5xx          → { data: null, error: 'FUB HTTP <status>' }
 *   - Network error    → { data: null, error: <message> }
 */
export async function fubFetch<T = unknown>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>
): Promise<FubResult<T>> {
  const key = apiKey()
  if (!key) return { data: null, error: 'FUB_API_KEY not configured' }

  const url = new URL(BASE + path)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue
      url.searchParams.set(k, String(v))
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader(key),
        'X-System': SYSTEM,
        'X-System-Key': key,
        Accept: 'application/json',
      },
      // 60s ISR cache; widgets will see fresh data within a minute
      next: { revalidate: 60 },
    })

    if (res.status === 401) {
      return { data: null, error: '401 Unauthorized — bad or expired FUB API key' }
    }
    if (res.status === 403) {
      return { data: null, error: '403 Forbidden — FUB permissions issue' }
    }
    if (res.status === 404) {
      return { data: null, error: `404 Not Found for ${path}` }
    }
    if (res.status === 429) {
      return { data: null, error: '429 Rate limited by FUB — retry in 60s' }
    }
    if (!res.ok) {
      return { data: null, error: `FUB HTTP ${res.status} for ${path}` }
    }

    const json = (await res.json()) as T
    return { data: json, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: null, error: msg }
  }
}

// ─── Redaction helpers ──────────────────────────────────────────────────

/**
 * Redact a person's name to "F. Last" (or "F.L." if only first+last initial
 * are desired). Used for compliance — we never render full PII in UI.
 */
export function redactName(first?: string | null, last?: string | null): string {
  const f = (first || '').trim()
  const l = (last || '').trim()
  if (f && l) return `${f[0]?.toUpperCase() ?? ''}. ${l}`
  if (l) return l
  if (f) return `${f[0]?.toUpperCase() ?? ''}.`
  return '—'
}

export function redactBoth(first?: string | null, last?: string | null): string {
  const f = (first || '').trim()
  const l = (last || '').trim()
  const fi = f ? `${f[0]?.toUpperCase() ?? ''}.` : ''
  const li = l ? `${l[0]?.toUpperCase() ?? ''}.` : ''
  const joined = [fi, li].filter(Boolean).join(' ')
  return joined || '—'
}

// ─── Public API: discovery ──────────────────────────────────────────────

export async function getFubIdentity(): Promise<FubResult<FubIdentity>> {
  const cacheKey = 'fub:identity'
  const c = cget(cacheKey)
  if (c) return { data: c as FubIdentity, error: null, cached: true }
  const r = await fubFetch<FubIdentity>('/identity')
  if (r.data) cset(cacheKey, r.data)
  return r
}

export async function getFubUsers(): Promise<FubResult<FubUser[]>> {
  const cacheKey = 'fub:users'
  const c = cget(cacheKey)
  if (c) return { data: c as FubUser[], error: null, cached: true }
  const r = await fubFetch<{ users?: FubUser[]; _metadata?: unknown }>(
    '/users',
    { limit: 100, includeDeleted: 'false' }
  )
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = r.data.users ?? []
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

export async function getFubTeams(): Promise<FubResult<FubTeam[]>> {
  const cacheKey = 'fub:teams'
  const c = cget(cacheKey)
  if (c) return { data: c as FubTeam[], error: null, cached: true }
  const r = await fubFetch<{ teams?: FubTeam[] }>('/teams')
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = r.data.teams ?? []
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

export async function getFubStages(): Promise<FubResult<FubStage[]>> {
  const cacheKey = 'fub:stages'
  const c = cget(cacheKey)
  if (c) return { data: c as FubStage[], error: null, cached: true }
  const r = await fubFetch<{ stages?: FubStage[] }>('/stages')
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = r.data.stages ?? []
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

export async function getFubPipelines(): Promise<FubResult<FubPipeline[]>> {
  const cacheKey = 'fub:pipelines'
  const c = cget(cacheKey)
  if (c) return { data: c as FubPipeline[], error: null, cached: true }
  const r = await fubFetch<{ pipelines?: FubPipeline[] }>('/pipelines')
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = r.data.pipelines ?? []
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

// ─── Calls ──────────────────────────────────────────────────────────────

/**
 * Get calls over the last `days` days (default 7).
 * FUB returns them in reverse-chron by default.
 * We collect multiple pages (default 3 x 100 = 300 recent calls)
 * to feed daily-volume charts.
 */
export async function getFubCalls(days = 7, limit = 300): Promise<FubResult<FubCall[]>> {
  const cacheKey = `fub:calls:${days}:${limit}`
  const c = cget(cacheKey)
  if (c) return { data: c as FubCall[], error: null, cached: true }

  const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString()
  const pages: FubCall[] = []
  const pageSize = Math.min(limit, 100)
  let offset = 0
  let safety = 0

  while (pages.length < limit && safety < 10) {
    safety++
    const r = await fubFetch<{ calls?: FubCall[]; _metadata?: { total?: number; next?: string | null } }>(
      '/calls',
      { limit: pageSize, offset, sort: '-created' }
    )
    if (r.error || !r.data) {
      if (pages.length === 0) return { data: null, error: r.error }
      break
    }
    const chunk = r.data.calls ?? []
    if (chunk.length === 0) break
    // Stop once we pass the cutoff
    let reachedCutoff = false
    for (const call of chunk) {
      const created = call.created || call.startedAt || ''
      if (created && created < sinceIso) {
        reachedCutoff = true
        break
      }
      pages.push(call)
      if (pages.length >= limit) break
    }
    if (reachedCutoff) break
    if (chunk.length < pageSize) break
    offset += pageSize
  }

  cset(cacheKey, pages)
  return { data: pages, error: null }
}

// ─── Appointments ───────────────────────────────────────────────────────

/**
 * Upcoming appointments. `range` accepts 'today' | 'week' | 'month'.
 * Returns items sorted ascending by start.
 */
export async function getFubAppointments(
  range: 'today' | 'week' | 'month' = 'week'
): Promise<FubResult<FubAppointment[]>> {
  const cacheKey = `fub:appointments:${range}`
  const c = cget(cacheKey)
  if (c) return { data: c as FubAppointment[], error: null, cached: true }

  const now = new Date()
  const endMs =
    range === 'today'
      ? now.getTime() + 86_400_000
      : range === 'month'
      ? now.getTime() + 30 * 86_400_000
      : now.getTime() + 7 * 86_400_000

  const start = now.toISOString()
  const end = new Date(endMs).toISOString()

  const r = await fubFetch<{ appointments?: FubAppointment[] }>('/appointments', {
    limit: 100,
    start,
    end,
    sort: 'start',
  })
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = (r.data.appointments ?? []).slice().sort((a, b) => {
    return (a.start ?? '').localeCompare(b.start ?? '')
  })
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

// ─── Deals / pipeline ───────────────────────────────────────────────────

/**
 * Get all deals (paginated up to 1k total for pipeline aggregation). Caches
 * for 60s. Larger cursors would be needed for 5k+ but this is sufficient for
 * the active pipeline view we render.
 */
export async function getFubDeals(limit = 500): Promise<FubResult<FubDeal[]>> {
  const cacheKey = `fub:deals:${limit}`
  const c = cget(cacheKey)
  if (c) return { data: c as FubDeal[], error: null, cached: true }

  const pages: FubDeal[] = []
  const pageSize = 100
  let offset = 0
  let safety = 0

  while (pages.length < limit && safety < 20) {
    safety++
    const r = await fubFetch<{ deals?: FubDeal[]; _metadata?: unknown }>(
      '/deals',
      { limit: pageSize, offset }
    )
    if (r.error || !r.data) {
      if (pages.length === 0) return { data: null, error: r.error }
      break
    }
    const chunk = r.data.deals ?? []
    if (chunk.length === 0) break
    pages.push(...chunk)
    if (chunk.length < pageSize) break
    offset += pageSize
  }

  cset(cacheKey, pages)
  return { data: pages, error: null }
}

// ─── Smart lists ────────────────────────────────────────────────────────

export async function getFubSmartLists(): Promise<FubResult<FubSmartList[]>> {
  const cacheKey = 'fub:smartLists'
  const c = cget(cacheKey)
  if (c) return { data: c as FubSmartList[], error: null, cached: true }
  const r = await fubFetch<{ smartLists?: FubSmartList[] }>('/smartLists', {
    limit: 100,
  })
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = r.data.smartLists ?? []
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

// ─── Events (activity feed) ─────────────────────────────────────────────

export async function getFubEvents(limit = 50): Promise<FubResult<FubEvent[]>> {
  const cacheKey = `fub:events:${limit}`
  const c = cget(cacheKey)
  if (c) return { data: c as FubEvent[], error: null, cached: true }
  const r = await fubFetch<{ events?: FubEvent[] }>('/events', {
    limit,
    sort: '-created',
  })
  if (r.error || !r.data) return { data: null, error: r.error }
  const arr = r.data.events ?? []
  cset(cacheKey, arr)
  return { data: arr, error: null }
}

// ═══════════════════════════════════════════════════════════════════════
// Widget-level transforms (derive view models from raw FUB objects)
// ═══════════════════════════════════════════════════════════════════════

// ── Pipeline by stage ─────────────────────────────────────────────
export interface PipelineStageRow {
  stageId: number
  stageName: string
  pipelineId: number | null
  pipelineName: string | null
  count: number
  totalValue: number
  avgValue: number
}

export interface PipelineView {
  totalDeals: number
  totalValue: number
  stages: PipelineStageRow[]
  generatedAt: string
}

export async function getFubLeadPipeline(
  pipelineName?: string
): Promise<FubResult<PipelineView>> {
  const r = await getFubDeals(1000)
  if (r.error || !r.data) return { data: null, error: r.error }

  const deals = pipelineName
    ? r.data.filter(d => (d.pipelineName || '').toLowerCase() === pipelineName.toLowerCase())
    : r.data

  // Only show active-ish deals (status !== Closed/Lost)
  const active = deals.filter(d => {
    const s = (d.status || '').toLowerCase()
    return s !== 'closed' && s !== 'lost' && s !== 'won'
  })

  const byStage = new Map<number, PipelineStageRow>()
  for (const d of active) {
    const sid = d.stageId ?? 0
    const sname = d.stageName || 'Unstaged'
    if (!byStage.has(sid)) {
      byStage.set(sid, {
        stageId: sid,
        stageName: sname,
        pipelineId: d.pipelineId ?? null,
        pipelineName: d.pipelineName ?? null,
        count: 0,
        totalValue: 0,
        avgValue: 0,
      })
    }
    const row = byStage.get(sid)!
    row.count++
    row.totalValue += Number(d.price ?? 0)
  }
  const stages = Array.from(byStage.values()).map(row => ({
    ...row,
    avgValue: row.count > 0 ? row.totalValue / row.count : 0,
  }))
  stages.sort((a, b) => b.totalValue - a.totalValue || b.count - a.count)

  return {
    data: {
      totalDeals: active.length,
      totalValue: active.reduce((s, d) => s + Number(d.price ?? 0), 0),
      stages,
      generatedAt: new Date().toISOString(),
    },
    error: null,
  }
}

// ── Agent roster / performance ────────────────────────────────────
export interface AgentRosterRow {
  userId: number
  userName: string
  role: string
  status: string
  pictureUrl: string | null
  callsMtd: number
  appointmentsMtd: number
  dealsActive: number
  dealsClosedYtd: number
  pipelineValue: number
  closedValueYtd: number
}

export async function getFubAgentRoster(): Promise<FubResult<AgentRosterRow[]>> {
  const [usersR, callsR, apptsR, dealsR] = await Promise.all([
    getFubUsers(),
    getFubCalls(45, 500),
    getFubAppointments('month'),
    getFubDeals(1000),
  ])

  if (usersR.error || !usersR.data) {
    return { data: null, error: usersR.error ?? 'No users' }
  }

  const now = new Date()
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ytdStart = new Date(now.getFullYear(), 0, 1)

  const calls = callsR.data ?? []
  const appts = apptsR.data ?? []
  const deals = dealsR.data ?? []

  const rows: Record<number, AgentRosterRow> = {}
  for (const u of usersR.data) {
    rows[u.id] = {
      userId: u.id,
      userName: u.name || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || `User ${u.id}`,
      role: u.role || 'Agent',
      status: u.status || 'Active',
      pictureUrl: u.picture?.['60x60'] ?? u.picture?.['40x40'] ?? null,
      callsMtd: 0,
      appointmentsMtd: 0,
      dealsActive: 0,
      dealsClosedYtd: 0,
      pipelineValue: 0,
      closedValueYtd: 0,
    }
  }

  for (const c of calls) {
    const uid = c.userId ?? 0
    if (!rows[uid]) continue
    const when = new Date(c.startedAt || c.created || 0)
    if (when >= mtdStart) rows[uid].callsMtd++
  }

  for (const a of appts) {
    const start = new Date(a.start || 0)
    if (start < mtdStart) continue
    // Match by invitees[].userId, fallback createdById
    const userIds = new Set<number>()
    if (a.createdById) userIds.add(a.createdById)
    for (const iv of a.invitees ?? []) {
      if (iv.userId) userIds.add(iv.userId)
    }
    for (const uid of Array.from(userIds)) {
      if (rows[uid]) rows[uid].appointmentsMtd++
    }
  }

  for (const d of deals) {
    const assigned = d.userIds ?? []
    const status = (d.status || '').toLowerCase()
    const isClosed = status === 'closed' || status === 'won'
    const isActive = !isClosed && status !== 'lost'
    const closeDate = d.projectedCloseDate ? new Date(d.projectedCloseDate) : null

    for (const uid of assigned) {
      if (!rows[uid]) continue
      if (isActive) {
        rows[uid].dealsActive++
        rows[uid].pipelineValue += Number(d.price ?? 0)
      } else if (isClosed && closeDate && closeDate >= ytdStart) {
        rows[uid].dealsClosedYtd++
        rows[uid].closedValueYtd += Number(d.price ?? 0)
      }
    }
  }

  // Filter out inactive users (no activity in any column) to keep roster clean
  const active = Object.values(rows)
    .filter(r => r.status === 'Active')
    .sort(
      (a, b) =>
        b.closedValueYtd - a.closedValueYtd ||
        b.dealsClosedYtd - a.dealsClosedYtd ||
        b.callsMtd - a.callsMtd ||
        a.userName.localeCompare(b.userName)
    )

  return { data: active, error: null }
}

// ── Today's activity ──────────────────────────────────────────────
export interface TodaysActivity {
  callsToday: number
  appointmentsToday: number
  dealsCreatedToday: number
  callsByHour: Array<{ hour: number; count: number }>
  spark7d: Array<{ date: string; count: number }>
}

export async function getFubTodayActivity(): Promise<FubResult<TodaysActivity>> {
  const [callsR, apptsR, dealsR] = await Promise.all([
    getFubCalls(7, 500),
    getFubAppointments('today'),
    getFubDeals(500),
  ])

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayIso = todayStart.toISOString().slice(0, 10)

  const calls = callsR.data ?? []
  const appts = apptsR.data ?? []
  const deals = dealsR.data ?? []

  const callsToday = calls.filter(c => (c.startedAt || c.created || '').startsWith(todayIso)).length
  const apptsToday = appts.filter(a => (a.start || '').startsWith(todayIso)).length
  const dealsCreatedToday = deals.filter(d => (d.createdAt || '').startsWith(todayIso)).length

  // Call count by hour for today
  const byHour = new Array(24).fill(0) as number[]
  for (const c of calls) {
    const when = c.startedAt || c.created
    if (!when || !when.startsWith(todayIso)) continue
    const hr = new Date(when).getHours()
    byHour[hr]++
  }
  const callsByHour = byHour.map((count, hour) => ({ hour, count }))

  // 7-day sparkline (oldest left → newest right)
  const spark: Array<{ date: string; count: number }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    d.setHours(0, 0, 0, 0)
    const iso = d.toISOString().slice(0, 10)
    const count = calls.filter(c => (c.startedAt || c.created || '').startsWith(iso)).length
    spark.push({ date: iso, count })
  }

  return {
    data: {
      callsToday,
      appointmentsToday: apptsToday,
      dealsCreatedToday,
      callsByHour,
      spark7d: spark,
    },
    error: null,
  }
}

// ── Call volume (30d) for chart ───────────────────────────────────
export interface CallVolumeDaily {
  date: string
  count: number
  incoming: number
  outgoing: number
}

export async function getFubCallVolume30d(): Promise<FubResult<CallVolumeDaily[]>> {
  const r = await getFubCalls(30, 1000)
  if (r.error || !r.data) return { data: null, error: r.error }

  // Bucket by day
  const buckets = new Map<string, CallVolumeDaily>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000)
    d.setHours(0, 0, 0, 0)
    const iso = d.toISOString().slice(0, 10)
    buckets.set(iso, { date: iso, count: 0, incoming: 0, outgoing: 0 })
  }

  for (const c of r.data) {
    const when = c.startedAt || c.created
    if (!when) continue
    const key = when.slice(0, 10)
    const b = buckets.get(key)
    if (!b) continue
    b.count++
    if (c.isIncoming) b.incoming++
    else b.outgoing++
  }

  return { data: Array.from(buckets.values()), error: null }
}

// ── KPIs (top-line metrics for hero) ──────────────────────────────
export interface FubKpis {
  activeDeals: number
  activePipelineValue: number
  closedYtdDeals: number
  closedYtdValue: number
  callsMtd: number
  appointmentsWeek: number
  avgDealSize: number
  totalAgents: number
  totalPeople: number | null
}

export async function getFubKpis(): Promise<FubResult<FubKpis>> {
  const [dealsR, usersR, callsR, apptsR, peopleMetaR] = await Promise.all([
    getFubDeals(1000),
    getFubUsers(),
    getFubCalls(45, 1000),
    getFubAppointments('week'),
    // Just the metadata for people count — don't actually pull 85k people
    fubFetch<{ _metadata?: { total?: number } }>('/people', { limit: 1 }),
  ])

  const deals = dealsR.data ?? []
  const users = usersR.data ?? []
  const calls = callsR.data ?? []
  const appts = apptsR.data ?? []

  const now = new Date()
  const mtdStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const ytdStart = new Date(now.getFullYear(), 0, 1)

  let activeDeals = 0
  let activeValue = 0
  let closedYtdDeals = 0
  let closedYtdValue = 0
  let closedSum = 0
  let closedCount = 0

  for (const d of deals) {
    const status = (d.status || '').toLowerCase()
    const price = Number(d.price ?? 0)
    const isActive = status !== 'closed' && status !== 'won' && status !== 'lost'
    const isClosed = status === 'closed' || status === 'won'
    const closeDate = d.projectedCloseDate ? new Date(d.projectedCloseDate) : null

    if (isActive) {
      activeDeals++
      activeValue += price
    }
    if (isClosed) {
      closedSum += price
      closedCount++
      if (closeDate && closeDate >= ytdStart) {
        closedYtdDeals++
        closedYtdValue += price
      }
    }
  }

  const callsMtd = calls.filter(c => {
    const d = new Date(c.startedAt || c.created || 0)
    return d >= mtdStart
  }).length

  const totalPeople = peopleMetaR.data?._metadata?.total ?? null

  return {
    data: {
      activeDeals,
      activePipelineValue: activeValue,
      closedYtdDeals,
      closedYtdValue,
      callsMtd,
      appointmentsWeek: appts.length,
      avgDealSize: closedCount > 0 ? closedSum / closedCount : 0,
      totalAgents: users.filter(u => u.status === 'Active').length,
      totalPeople,
    },
    error: null,
  }
}

// ── Recent closed deals (last 10) ────────────────────────────────
export interface RecentClosedDeal {
  id: number
  borrower: string  // redacted
  amount: number
  pipelineName: string
  stageName: string
  status: string
  closedAt: string | null
  commissionValue: number
}

export async function getFubRecentClosed(limit = 10): Promise<FubResult<RecentClosedDeal[]>> {
  const r = await getFubDeals(1000)
  if (r.error || !r.data) return { data: null, error: r.error }

  const closed = r.data.filter(d => {
    const s = (d.status || '').toLowerCase()
    return s === 'closed' || s === 'won'
  })
  closed.sort((a, b) => {
    const ad = a.projectedCloseDate ?? a.createdAt ?? ''
    const bd = b.projectedCloseDate ?? b.createdAt ?? ''
    return bd.localeCompare(ad)
  })

  const rows: RecentClosedDeal[] = closed.slice(0, limit).map(d => {
    // Deal.name often *is* a PII-ish borrower name. Extract initials.
    const nameRaw = (d.name || '').trim()
    const parts = nameRaw.split(/\s+/)
    const borrower =
      parts.length >= 2
        ? `${parts[0][0]?.toUpperCase() ?? ''}.${parts[parts.length - 1][0]?.toUpperCase() ?? ''}.`
        : parts[0]
        ? `${parts[0][0]?.toUpperCase() ?? ''}.`
        : '—'
    return {
      id: d.id,
      borrower,
      amount: Number(d.price ?? 0),
      pipelineName: d.pipelineName || '—',
      stageName: d.stageName || '—',
      status: d.status || '—',
      closedAt: d.projectedCloseDate || null,
      commissionValue: Number(d.commissionValue ?? 0),
    }
  })

  return { data: rows, error: null }
}

// ── Response time KPI (lead-created → first-contacted) ───────────
export interface ResponseTimeKpi {
  sampleSize: number
  averageMinutes: number | null
  medianMinutes: number | null
  under5min: number
  under15min: number
  under1hour: number
}

/**
 * Computes avg response-time from the first N of `/people` where
 * firstCommunication is present. We sample the 100 newest people.
 */
export async function getFubResponseTime(): Promise<FubResult<ResponseTimeKpi>> {
  const cacheKey = 'fub:responseTime'
  const c = cget(cacheKey)
  if (c) return { data: c as ResponseTimeKpi, error: null, cached: true }

  const r = await fubFetch<{ people?: FubPerson[] }>('/people', {
    limit: 100,
    sort: '-created',
    fields: 'id,created,firstCommunication',
  })
  if (r.error || !r.data) return { data: null, error: r.error }
  const people = r.data.people ?? []

  const deltasMin: number[] = []
  for (const p of people) {
    const c0 = p.created ? new Date(p.created).getTime() : 0
    const fc = p.firstCommunication ? new Date(p.firstCommunication).getTime() : 0
    if (!c0 || !fc || fc < c0) continue
    const deltaMin = Math.round((fc - c0) / 60_000)
    // Cap at 30 days to avoid outliers from dormant leads
    if (deltaMin > 43_200) continue
    deltasMin.push(deltaMin)
  }
  deltasMin.sort((a, b) => a - b)

  const avg =
    deltasMin.length > 0 ? Math.round(deltasMin.reduce((s, x) => s + x, 0) / deltasMin.length) : null
  const med =
    deltasMin.length > 0 ? deltasMin[Math.floor(deltasMin.length / 2)] : null

  const out: ResponseTimeKpi = {
    sampleSize: deltasMin.length,
    averageMinutes: avg,
    medianMinutes: med,
    under5min: deltasMin.filter(x => x <= 5).length,
    under15min: deltasMin.filter(x => x <= 15).length,
    under1hour: deltasMin.filter(x => x <= 60).length,
  }
  cset(cacheKey, out)
  return { data: out, error: null }
}

// ─── Activity feed ──────────────────────────────────────────────────────

/**
 * Unified FUB activity feed — merges calls, appointments, events, deals into
 * a normalized timeline. Used by /activity global feed and the
 * Culbertson-Gray page's activity section.
 */
export interface FubActivityItem {
  id: string
  when: string
  kind: 'call' | 'appointment' | 'event' | 'deal'
  title: string
  actor: string | null
  source: 'fub'
  meta?: Record<string, unknown>
}

export async function getFubActivityFeed(limit = 50): Promise<FubResult<FubActivityItem[]>> {
  const [callsR, apptsR, eventsR, dealsR] = await Promise.all([
    getFubCalls(7, 100),
    getFubAppointments('week'),
    getFubEvents(limit),
    getFubDeals(100),
  ])

  const items: FubActivityItem[] = []
  for (const c of callsR.data ?? []) {
    items.push({
      id: `call:${c.id}`,
      when: c.startedAt || c.created || '',
      kind: 'call',
      title: `${c.isIncoming ? 'Incoming' : 'Outgoing'} call · ${c.outcome || 'Logged'}${c.duration ? ` · ${c.duration}s` : ''}`,
      actor: c.userName || null,
      source: 'fub',
      meta: { duration: c.duration ?? 0, outcome: c.outcome ?? null },
    })
  }
  for (const a of apptsR.data ?? []) {
    items.push({
      id: `appt:${a.id}`,
      when: a.start || '',
      kind: 'appointment',
      title: a.title || a.type || 'Appointment',
      actor: null,
      source: 'fub',
      meta: { type: a.type, location: a.location },
    })
  }
  for (const e of eventsR.data ?? []) {
    const prop = e.property
    const propStr = prop ? ` · ${prop.city ?? ''}, ${prop.state ?? ''}`.trim() : ''
    items.push({
      id: `event:${e.id}`,
      when: e.occurred || e.created || '',
      kind: 'event',
      title: `${e.type || 'Event'}${propStr}${e.source ? ` · ${e.source}` : ''}`,
      actor: null,
      source: 'fub',
      meta: { source: e.source, type: e.type },
    })
  }
  for (const d of dealsR.data ?? []) {
    const parts = (d.name ?? '').split(/\s+/)
    const redacted =
      parts.length >= 2
        ? `${parts[0][0]?.toUpperCase() ?? ''}.${parts[parts.length - 1][0]?.toUpperCase() ?? ''}.`
        : parts[0] ?? '—'
    items.push({
      id: `deal:${d.id}`,
      when: d.enteredStageAt || d.createdAt || '',
      kind: 'deal',
      title: `Deal ${redacted} · ${d.stageName || 'Unstaged'} · $${(Number(d.price ?? 0) / 1000).toFixed(0)}K`,
      actor: null,
      source: 'fub',
      meta: { pipelineName: d.pipelineName, stageName: d.stageName },
    })
  }

  items.sort((a, b) => (b.when || '').localeCompare(a.when || ''))
  return { data: items.slice(0, limit), error: null }
}

// ─── Smart lists view ──────────────────────────────────────────────

export interface SmartListSnapshot {
  total: number
  lists: Array<{ id: number; name: string; count: number }>
}

export async function getFubSmartListsSnapshot(): Promise<FubResult<SmartListSnapshot>> {
  const r = await getFubSmartLists()
  if (r.error || !r.data) return { data: null, error: r.error }
  const rows = r.data.map(l => ({
    id: l.id,
    name: l.name,
    count: Number(l.count ?? l.peopleCount ?? 0),
  }))
  rows.sort((a, b) => b.count - a.count)
  return {
    data: {
      total: rows.reduce((s, r) => s + r.count, 0),
      lists: rows,
    },
    error: null,
  }
}

// ─── Create operations (write-side) ─────────────────────────────────────

/**
 * Create a person (lead/contact) in FUB. Returns the created record on
 * success, { data: null, error } on failure.
 *
 * Used by /api/fub/contact-create.
 *
 * Input shape (per FUB reference):
 *   {
 *     firstName: string,
 *     lastName:  string,
 *     emails:    [{ value: string, type?: string }],
 *     phones:    [{ value: string, type?: string }],
 *     stage:     string,   // optional — defaults to 'Lead'
 *     source:    string,   // optional
 *     tags:      string[], // optional
 *     customMissionControlLeadId: string, // custom field for bidir sync
 *   }
 */
export async function createFubPerson(input: {
  firstName?: string
  lastName?: string
  emails?: Array<{ value: string; type?: string }>
  phones?: Array<{ value: string; type?: string }>
  stage?: string
  source?: string
  tags?: string[]
  assignedUserId?: number
  customMissionControlLeadId?: string
}): Promise<FubResult<FubPerson>> {
  const key = apiKey()
  if (!key) return { data: null, error: 'FUB_API_KEY not configured' }

  try {
    const res = await fetch(BASE + '/people', {
      method: 'POST',
      headers: {
        Authorization: authHeader(key),
        'X-System': SYSTEM,
        'X-System-Key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text()
      return { data: null, error: `FUB POST /people HTTP ${res.status}: ${body.slice(0, 300)}` }
    }
    const json = (await res.json()) as FubPerson
    return { data: json, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: null, error: msg }
  }
}

/**
 * Create a task in FUB. Used by MC → FUB task sync (e.g. when an OpenClaw
 * agent completes a follow-up action that needs a human confirmation step).
 */
export async function createFubTask(input: {
  personId?: number
  name: string
  type?: string
  dueDate?: string
  assignedUserId?: number
  isCompleted?: boolean
}): Promise<FubResult<{ id: number }>> {
  const key = apiKey()
  if (!key) return { data: null, error: 'FUB_API_KEY not configured' }
  try {
    const res = await fetch(BASE + '/tasks', {
      method: 'POST',
      headers: {
        Authorization: authHeader(key),
        'X-System': SYSTEM,
        'X-System-Key': key,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(input),
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.text()
      return { data: null, error: `FUB POST /tasks HTTP ${res.status}: ${body.slice(0, 300)}` }
    }
    const json = (await res.json()) as { id: number }
    return { data: json, error: null }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { data: null, error: msg }
  }
}

/**
 * Helper: is the adapter configured at all? Handy for /integrations page.
 */
export function isFubConfigured(): boolean {
  return apiKey() !== null
}
