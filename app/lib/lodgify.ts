/**
 * Lodgify adapter (Mission Control v7).
 *
 * Server-only — imported from server components (page.tsx) and route handlers.
 * Wraps the Lodgify Public API v2 (https://api.lodgify.com/v2/...).
 *
 *   Auth header: `X-ApiKey: <LODGIFY_API_KEY>`
 *   Env:         LODGIFY_API_KEY (Vercel → production)
 *
 * Rules:
 *   - never throw — return null / [] on any error so every widget degrades
 *     gracefully to ComingSoon.
 *   - 60 s cache via `next: { revalidate: 60 }` to keep Lodgify out of the
 *     request hot-path while still feeling live.
 *   - no PII leaks in logs — only statuses.
 *
 * Portfolio KPIs are derived from the /v2/reservations/bookings endpoint
 * because /v2/reviews, /v2/guests and /v2/messaging/threads are out of
 * scope for the current key (404). See `docs/lodgify-inventory.md`.
 */

export const LODGIFY_BASE = 'https://api.lodgify.com'

export interface LodgifyProperty {
  id: number
  name: string
  internal_name: string | null
  has_addons?: boolean
  subscription_plans?: string[] | null
  room_type?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  // passthrough for any other fields
  [key: string]: unknown
}

export interface LodgifyBooking {
  id: number
  property_id: number
  arrival: string        // YYYY-MM-DD
  departure: string      // YYYY-MM-DD
  status: string         // Open | Booked | Declined | ...
  source: string | null
  source_text: string | null
  total_amount: number
  amount_paid: number
  amount_due: number
  currency_code: string
  guest: { name: string | null; email: string | null; phone: string | null; country_code: string | null } | null
  guest_count?: number
  rooms?: Array<{ room_type_id: number; people: number; key_code?: string }>
  created_at?: string
  updated_at?: string
  thread_uid?: string | null
  notes?: string | null
}

export interface LodgifyReview {
  id: number | string
  property_id?: number
  rating?: number
  guest_name?: string
  comment?: string
  created_at?: string
  [key: string]: unknown
}

// ── Config / guard ─────────────────────────────────────────────────
export function isLodgifyConfigured(): boolean {
  return !!process.env.LODGIFY_API_KEY
}

function authHeaders(): HeadersInit | null {
  const key = process.env.LODGIFY_API_KEY
  if (!key) return null
  return { 'X-ApiKey': key, Accept: 'application/json' }
}

// ── Core fetch helper ──────────────────────────────────────────────
/** Never throws. Returns parsed JSON, [] (list endpoints), or null on 4xx/5xx. */
export async function lodgifyFetch<T = unknown>(path: string, opts: { revalidate?: number } = {}): Promise<T | null> {
  const h = authHeaders()
  if (!h) return null
  const url = LODGIFY_BASE + path
  try {
    const r = await fetch(url, {
      headers: h,
      next: { revalidate: opts.revalidate ?? 60 },
    })
    if (!r.ok) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[lodgify] ' + path + ' -> ' + r.status)
      }
      return null
    }
    return (await r.json()) as T
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[lodgify] ' + path + ' failed: ' + (e as Error).message)
    }
    return null
  }
}

// ── Low-level endpoint wrappers ────────────────────────────────────
function itemsFrom(body: unknown): unknown[] {
  if (!body) return []
  if (Array.isArray(body)) return body
  const b = body as Record<string, unknown>
  if (Array.isArray(b.items)) return b.items
  if (Array.isArray(b.data)) return b.data
  if (Array.isArray(b.results)) return b.results
  return []
}

export async function getLodgifyProperties(): Promise<LodgifyProperty[]> {
  const body = await lodgifyFetch<unknown>('/v2/properties?size=100')
  return itemsFrom(body) as LodgifyProperty[]
}

export async function getLodgifyProperty(id: number | string): Promise<LodgifyProperty | null> {
  return await lodgifyFetch<LodgifyProperty>(`/v2/properties/${id}`)
}

export async function getLodgifyRooms(id: number | string): Promise<unknown[] | null> {
  const body = await lodgifyFetch<unknown>(`/v2/properties/${id}/rooms`)
  return body ? itemsFrom(body) : null
}

/**
 * Fetch bookings. `stayFilter` accepts Upcoming | Current | Stayed | All (default Upcoming).
 * Merges pages up to `max` items.
 */
export async function getLodgifyBookings(opts: { stayFilter?: 'Upcoming' | 'Current' | 'Stayed' | 'All'; max?: number } = {}): Promise<LodgifyBooking[]> {
  const stayFilter = opts.stayFilter ?? 'All'
  const max = opts.max ?? 500
  // stayFilter 'All' isn't supported directly — fan out and de-dupe by id.
  const buckets = stayFilter === 'All' ? ['Upcoming', 'Stayed'] as const : [stayFilter] as const
  const seen = new Map<number, LodgifyBooking>()
  for (const f of buckets) {
    let page = 1
    const size = 100
    while (seen.size < max) {
      const body = await lodgifyFetch<unknown>(`/v2/reservations/bookings?size=${size}&page=${page}&stayFilter=${f}`)
      const items = itemsFrom(body) as LodgifyBooking[]
      if (!items.length) break
      for (const b of items) if (b && typeof b.id === 'number') seen.set(b.id, b)
      if (items.length < size) break
      page++
      if (page > 20) break // safety
    }
  }
  return Array.from(seen.values())
}

export async function getLodgifyRateSettings(propertyId: number | string): Promise<unknown | null> {
  return await lodgifyFetch<unknown>(`/v2/rates/settings?HouseId=${propertyId}`)
}

export async function getLodgifyRateCalendar(propertyId: number | string, roomTypeId: number | string, startDate: string, endDate: string): Promise<unknown | null> {
  return await lodgifyFetch<unknown>(`/v2/rates/calendar?HouseId=${propertyId}&RoomTypeId=${roomTypeId}&StartDate=${startDate}&EndDate=${endDate}`)
}

export async function getLodgifyReviews(): Promise<LodgifyReview[] | null> {
  // /v2/reviews is 404 for this key — gracefully return null so UI falls back.
  const body = await lodgifyFetch<unknown>('/v2/reviews')
  if (!body) return null
  return itemsFrom(body) as LodgifyReview[]
}

// ── Derived / KPI helpers ──────────────────────────────────────────
function nightsBetween(a: string, d: string): number {
  const t = new Date(d).getTime() - new Date(a).getTime()
  return Math.max(1, Math.round(t / 86400000))
}

function isRevenueBooking(b: LodgifyBooking): boolean {
  // Treat any non-Declined, non-OwnerHold booking with a positive total as revenue.
  const s = String(b.status ?? '').toLowerCase()
  if (s === 'declined' || s === 'cancelled' || s === 'canceled') return false
  const src = String(b.source ?? '').toLowerCase()
  if (src === 'oh' || src === 'ownerhold') return false
  return (b.total_amount ?? 0) > 0
}

/**
 * Portfolio & per-property KPI summary derived entirely from /v2/reservations/bookings.
 * Assumes a 365-day annualised window (propertyCount × 365 available nights).
 * `propertyCount` defaults to the number of distinct property_ids seen in bookings.
 */
export interface LodgifyPortfolioKPIs {
  revenue: number
  nightsBooked: number
  availableNights: number
  occupancy: number        // 0..1
  adr: number              // $ per night
  revpar: number           // $ per avail night
  bookingsCount: number
  propertyCount: number
  currency: string
}

export async function getLodgifyPortfolioKPIs(opts: { windowDays?: number } = {}): Promise<LodgifyPortfolioKPIs | null> {
  if (!isLodgifyConfigured()) return null
  const windowDays = opts.windowDays ?? 365
  const all = await getLodgifyBookings({ stayFilter: 'All', max: 1000 })
  if (!all.length) return null
  const rev = all.filter(isRevenueBooking)
  const revenue = rev.reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
  const nights = rev.reduce((s, b) => s + nightsBetween(b.arrival, b.departure), 0)
  const propIds = new Set(all.map(b => b.property_id))
  const propCount = Math.max(1, propIds.size)
  const avail = propCount * windowDays
  const currency = rev[0]?.currency_code ?? 'USD'
  return {
    revenue,
    nightsBooked: nights,
    availableNights: avail,
    occupancy: avail > 0 ? nights / avail : 0,
    adr: nights > 0 ? revenue / nights : 0,
    revpar: avail > 0 ? revenue / avail : 0,
    bookingsCount: rev.length,
    propertyCount: propCount,
    currency,
  }
}

/** Per-property occupancy for the last `monthsBack` months (including the current month). */
export interface OccupancyPoint {
  month: string              // YYYY-MM
  label: string              // "Aug '25"
  nights: number
  available: number
  occupancy: number          // 0..100 (percent for chart convenience)
  adr: number
  revpar: number
  revenue: number
}
export async function getLodgifyOccupancy(opts: { propertyId?: number | string | null; monthsBack?: number } = {}): Promise<OccupancyPoint[] | null> {
  if (!isLodgifyConfigured()) return null
  const monthsBack = opts.monthsBack ?? 12
  const all = await getLodgifyBookings({ stayFilter: 'All', max: 1000 })
  if (!all.length) return null
  const filter = opts.propertyId != null ? String(opts.propertyId) : null
  const list = filter ? all.filter(b => String(b.property_id) === filter) : all
  const revOnly = list.filter(isRevenueBooking)
  const propCount = filter ? 1 : Math.max(1, new Set(all.map(b => b.property_id)).size)

  const buckets = new Map<string, { nights: number; revenue: number }>()
  for (const b of revOnly) {
    const m = b.arrival?.slice(0, 7)
    if (!m) continue
    const e = buckets.get(m) ?? { nights: 0, revenue: 0 }
    e.nights += nightsBetween(b.arrival, b.departure)
    e.revenue += Number(b.total_amount ?? 0)
    buckets.set(m, e)
  }
  // Build last N months so chart always has a timeline even when a month has no bookings.
  const now = new Date()
  const points: OccupancyPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.toISOString().slice(0, 7)
    const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    const available = daysInMonth * propCount
    const entry = buckets.get(month) ?? { nights: 0, revenue: 0 }
    const nights = Math.min(entry.nights, available)
    points.push({
      month,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      nights,
      available,
      occupancy: available > 0 ? Math.round((nights / available) * 1000) / 10 : 0,
      adr: nights > 0 ? Math.round(entry.revenue / nights) : 0,
      revpar: available > 0 ? Math.round(entry.revenue / available) : 0,
      revenue: Math.round(entry.revenue),
    })
  }
  return points
}

/** 12-month ADR trend for a property (or the portfolio when `propertyId` is null). */
export async function getLodgifyADR(opts: { propertyId?: number | string | null; monthsBack?: number } = {}): Promise<{ month: string; label: string; adr: number }[] | null> {
  const pts = await getLodgifyOccupancy(opts)
  return pts ? pts.map(p => ({ month: p.month, label: p.label, adr: p.adr })) : null
}
export async function getLodgifyRevPAR(opts: { propertyId?: number | string | null; monthsBack?: number } = {}): Promise<{ month: string; label: string; revpar: number }[] | null> {
  const pts = await getLodgifyOccupancy(opts)
  return pts ? pts.map(p => ({ month: p.month, label: p.label, revpar: p.revpar })) : null
}

/**
 * Monthly revenue breakdown per property.
 * Returns [{ month, label, byProperty: { [propId]: $ }, total }, ...]
 */
export interface RevenueByPropertyPoint {
  month: string
  label: string
  total: number
  byProperty: Record<string, number>
}
export async function getLodgifyRevenue(opts: { monthsBack?: number } = {}): Promise<RevenueByPropertyPoint[] | null> {
  if (!isLodgifyConfigured()) return null
  const monthsBack = opts.monthsBack ?? 12
  const all = await getLodgifyBookings({ stayFilter: 'All', max: 1000 })
  if (!all.length) return null
  const rev = all.filter(isRevenueBooking)
  const buckets = new Map<string, RevenueByPropertyPoint>()
  const now = new Date()
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const month = d.toISOString().slice(0, 7)
    buckets.set(month, {
      month,
      label: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      total: 0,
      byProperty: {},
    })
  }
  for (const b of rev) {
    const m = b.arrival?.slice(0, 7)
    if (!m) continue
    const entry = buckets.get(m)
    if (!entry) continue
    const amt = Number(b.total_amount ?? 0)
    const pid = String(b.property_id)
    entry.total += amt
    entry.byProperty[pid] = (entry.byProperty[pid] ?? 0) + amt
  }
  return Array.from(buckets.values())
}

/** Upcoming check-ins in the next `days` days (default 7). */
export interface UpcomingCheckin {
  id: number
  propertyId: number
  propertyName?: string
  arrival: string
  departure: string
  nights: number
  guestName: string | null
  guestInitials: string | null
  source: string | null
  status: string
  total: number
  currency: string
}
export async function getLodgifyUpcomingCheckins(opts: { days?: number; properties?: LodgifyProperty[] } = {}): Promise<UpcomingCheckin[] | null> {
  if (!isLodgifyConfigured()) return null
  const days = opts.days ?? 7
  const list = await getLodgifyBookings({ stayFilter: 'Upcoming', max: 200 })
  if (!list.length) return []
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const horizon = new Date(now.getTime() + days * 86400000)
  const propMap: Record<string, string> = {}
  const props = opts.properties ?? []
  for (const p of props) propMap[String(p.id)] = p.name
  const items: UpcomingCheckin[] = []
  for (const b of list) {
    if (!isRevenueBooking(b)) continue
    const arr = new Date(b.arrival + 'T00:00:00')
    if (arr < now || arr > horizon) continue
    const gname = b.guest?.name ?? null
    const initials = gname ? gname.trim().split(/\s+/).map(p => (p[0] ?? '').toUpperCase()).slice(0, 2).join('. ') + '.' : null
    items.push({
      id: b.id,
      propertyId: b.property_id,
      propertyName: propMap[String(b.property_id)],
      arrival: b.arrival,
      departure: b.departure,
      nights: nightsBetween(b.arrival, b.departure),
      guestName: gname,
      guestInitials: initials,
      source: b.source ?? null,
      status: b.status,
      total: Number(b.total_amount ?? 0),
      currency: b.currency_code ?? 'USD',
    })
  }
  items.sort((a, b) => a.arrival.localeCompare(b.arrival))
  return items
}

/**
 * Aggregated activity-feed rows for `/activity`.
 * Derived from recently created / updated bookings (since Lodgify has no generic events endpoint for this key).
 */
export interface LodgifyActivityItem {
  id: string
  when: string             // ISO timestamp
  kind: 'booking_new' | 'booking_modified' | 'booking_cancelled' | 'message' | 'review'
  title: string
  propertyId: number | null
  pill: string
  color: string
}
export async function getLodgifyActivityFeed(opts: { max?: number } = {}): Promise<LodgifyActivityItem[] | null> {
  if (!isLodgifyConfigured()) return null
  const max = opts.max ?? 50
  const bookings = await getLodgifyBookings({ stayFilter: 'All', max: 500 })
  if (!bookings.length) return []
  const items: LodgifyActivityItem[] = []
  for (const b of bookings) {
    const created = b.created_at ?? null
    const updated = b.updated_at ?? null
    const cancelled = (b as unknown as { canceled_at?: string | null }).canceled_at ?? null
    const guest = b.guest?.name ?? 'Guest'
    const initials = guest.split(/\s+/).map(p => (p[0] ?? '').toUpperCase()).slice(0, 2).join('. ') + '.'
    const title = `${initials} · ${b.arrival} → ${b.departure}`
    if (cancelled) {
      items.push({ id: `bk-cancel-${b.id}`, when: cancelled, kind: 'booking_cancelled', title, propertyId: b.property_id, pill: 'Booking cancelled', color: 'var(--red)' })
      continue
    }
    if (created) {
      items.push({ id: `bk-new-${b.id}`, when: created, kind: 'booking_new', title, propertyId: b.property_id, pill: 'New booking', color: 'var(--green)' })
    }
    if (updated && created && updated !== created) {
      items.push({ id: `bk-mod-${b.id}`, when: updated, kind: 'booking_modified', title, propertyId: b.property_id, pill: 'Booking modified', color: 'var(--accent)' })
    }
  }
  items.sort((a, b) => (b.when || '').localeCompare(a.when || ''))
  return items.slice(0, max)
}
