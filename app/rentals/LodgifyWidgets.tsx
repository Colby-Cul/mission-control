'use client'
/**
 * LodgifyWidgets — live data widgets that live above the existing
 * RentalsWidgets (booking tables/charts) on `/rentals`. Everything here is
 * client-side because recharts + dynamic sort state need it.
 *
 * Sources:
 *   - occupancy by month + ADR/RevPAR trend: `getLodgifyOccupancy`
 *   - revenue stacked per property:          `getLodgifyRevenue`
 *   - upcoming check-ins (7 d):               `getLodgifyUpcomingCheckins`
 *   - booking calendar strip (45 d forward):   derived from bookings[]
 *   - recent reviews:                         Lodgify /v2/reviews (404 → ComingSoon)
 */
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'

const TT = {
  backgroundColor: '#12131a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f9fafb',
  fontSize: 12,
}

function USD(v: number) {
  return '$' + Math.round(v).toLocaleString('en-US')
}

interface OccupancyPoint { month: string; label: string; occupancy: number; adr: number; revpar: number; revenue: number }
interface RevenueByPropertyPoint { month: string; label: string; total: number; byProperty: Record<string, number> }
interface UpcomingCheckin {
  id: number
  propertyId: number
  propertyName?: string
  arrival: string
  departure: string
  nights: number
  guestInitials: string | null
  source: string | null
  status: string
  total: number
  currency: string
}
interface ReviewItem { id: number | string; rating?: number; guest_name?: string; comment?: string; created_at?: string; property_id?: number }

const PROP_COLOR_SEQ = ['#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899', '#ef4444']

export default function LodgifyWidgets({
  occupancy, revenue, checkins, reviews, properties, calendarBookings,
}: {
  occupancy: OccupancyPoint[] | null
  revenue: RevenueByPropertyPoint[] | null
  checkins: UpcomingCheckin[] | null
  reviews: ReviewItem[] | null
  properties: { id: number; name: string }[]
  calendarBookings: { propertyId: number; propertyName: string; arrival: string; departure: string; status: string }[]
}) {
  const propColorMap: Record<string, string> = {}
  properties.forEach((p, i) => { propColorMap[String(p.id)] = PROP_COLOR_SEQ[i % PROP_COLOR_SEQ.length] })

  // Stack keys in descending order of total revenue so the largest sits on the bottom
  const revStackKeys: string[] = (() => {
    if (!revenue?.length) return []
    const totals: Record<string, number> = {}
    for (const r of revenue) for (const [k, v] of Object.entries(r.byProperty)) totals[k] = (totals[k] ?? 0) + v
    return Object.keys(totals).sort((a, b) => (totals[b] ?? 0) - (totals[a] ?? 0))
  })()

  const revenueData = (revenue ?? []).map(r => {
    const row: Record<string, string | number> = { month: r.month, label: r.label, total: r.total }
    for (const k of revStackKeys) row[k] = r.byProperty[k] ?? 0
    return row
  })

  return (
    <>
      {/* ── Portfolio live charts (Lodgify) ───────────────────────── */}
      <section style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Live Occupancy & Revenue (Lodgify)</h2>
            <span className="achieve-count">12 months rolling</span>
          </div>
        </div>

        {occupancy ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <SpecCard dataSource="lodgify:/v2/reservations/bookings">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Occupancy by Month</div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={occupancy}>
                  <defs>
                    <linearGradient id="gOccLive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                  <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: '85% target', fill: '#10b981', fontSize: 10, position: 'right' }} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                  <Area type="monotone" dataKey="occupancy" stroke="#06b6d4" fill="url(#gOccLive)" name="Occupancy %" />
                </AreaChart>
              </ResponsiveContainer>
            </SpecCard>
            <SpecCard dataSource="lodgify:/v2/reservations/bookings">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>ADR &amp; RevPAR Trend</div>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={occupancy}>
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => USD(Number(v))} />
                  <Line type="monotone" dataKey="adr" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="ADR" />
                  <Line type="monotone" dataKey="revpar" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="RevPAR" />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </LineChart>
              </ResponsiveContainer>
            </SpecCard>
          </div>
        ) : (
          <ComingSoon title="Occupancy & ADR/RevPAR" reason="Connect Lodgify in /integrations to unlock live charts." connect="lodgify" icon="📉" dataSource="lodgify:/v2/reservations/bookings" skeleton="chart" />
        )}

        {revenueData.length > 0 ? (
          <SpecCard dataSource="lodgify:/v2/reservations/bookings" style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Revenue by Property (stacked)</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueData}>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT} formatter={(v: number) => USD(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {revStackKeys.map((k, i) => {
                  const prop = properties.find(p => String(p.id) === k)
                  const label = prop ? prop.name.slice(0, 26) : `Property ${k}`
                  return (
                    <Bar key={k} dataKey={k} stackId="rev" name={label} fill={propColorMap[k] ?? PROP_COLOR_SEQ[i]} radius={i === revStackKeys.length - 1 ? [4, 4, 0, 0] : 0} />
                  )
                })}
              </BarChart>
            </ResponsiveContainer>
          </SpecCard>
        ) : null}
      </section>

      {/* ── Upcoming check-ins + reviews ──────────────────────────── */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SpecCard accent dataSource="lodgify:/v2/reservations/bookings?stayFilter=Upcoming">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
              Upcoming Check-ins <span style={{ color: 'var(--dim)', fontWeight: 400, fontSize: 11 }}>(next 7 days)</span>
            </div>
            {(!checkins || checkins.length === 0) ? (
              <p style={{ fontSize: 12, color: 'var(--dim)' }}>No check-ins scheduled in the next 7 days.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {checkins.slice(0, 10).map(c => (
                  <div key={c.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', background: 'rgba(255,255,255,0.02)',
                    borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, gap: 12,
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{c.guestInitials ?? 'Guest'} <span style={{ color: 'var(--dim)', fontWeight: 400 }}>· {c.nights}n</span></div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                        {c.propertyName ?? `#${c.propertyId}`} · {c.source ?? 'direct'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'var(--mo)' }}>
                      <div style={{ color: 'var(--orange)', fontWeight: 600 }}>{c.arrival}</div>
                      <div style={{ color: 'var(--green)', fontWeight: 600 }}>{USD(c.total)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SpecCard>

          {reviews === null ? (
            <ComingSoon
              title="Recent Reviews"
              reason="Lodgify /v2/reviews returns 404 for this API key scope. The adapter will pick these up automatically once the scope is added."
              icon="⭐"
              dataSource="lodgify:/v2/reviews"
              skeleton="table"
            />
          ) : reviews.length === 0 ? (
            <SpecCard accent dataSource="lodgify:/v2/reviews">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recent Reviews</div>
              <p style={{ fontSize: 12, color: 'var(--dim)' }}>No reviews posted yet.</p>
            </SpecCard>
          ) : (
            <SpecCard accent dataSource="lodgify:/v2/reviews">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Recent Reviews</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {reviews.slice(0, 6).map(r => (
                  <div key={r.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{r.guest_name ?? 'Guest'}</span>
                      <span style={{ fontSize: 11, color: 'var(--orange)', fontFamily: 'var(--mo)' }}>★ {r.rating ?? '—'}</span>
                    </div>
                    {r.comment ? (
                      <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.4 }}>{String(r.comment).slice(0, 160)}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </SpecCard>
          )}
        </div>
      </section>

      {/* ── Booking calendar strip (next 45 days) ─────────────────── */}
      <section style={{ marginBottom: 20 }}>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Booking Calendar <span style={{ color: 'var(--dim)', fontWeight: 400, fontSize: 11 }}>(next 45 days)</span>
          </div>
          <CalendarStrip properties={properties} bookings={calendarBookings} days={45} />
        </SpecCard>
      </section>
    </>
  )
}

// ── Calendar strip ────────────────────────────────────────────────
function CalendarStrip({
  properties,
  bookings,
  days,
}: {
  properties: { id: number; name: string }[]
  bookings: { propertyId: number; propertyName: string; arrival: string; departure: string; status: string }[]
  days: number
}) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const grid: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86400000)
    grid.push(d.toISOString().slice(0, 10))
  }
  const cellW = 18
  const rowH = 26
  function dateToIdx(d: string) {
    const t = new Date(d + 'T00:00:00').getTime()
    return Math.round((t - start.getTime()) / 86400000)
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `120px repeat(${days}, ${cellW}px)`, gap: 0, minWidth: 120 + days * cellW }}>
        <div />
        {grid.map((d, i) => {
          const dt = new Date(d + 'T00:00:00')
          const isMonthStart = dt.getDate() === 1
          return (
            <div key={d} style={{
              fontSize: 9, color: isMonthStart ? 'var(--orange)' : 'var(--dim)',
              fontFamily: 'var(--mo)', textAlign: 'center', borderLeft: isMonthStart ? '1px solid rgba(249,115,22,0.35)' : '1px solid transparent',
              paddingBottom: 4,
            }}>
              {isMonthStart ? dt.toLocaleDateString('en-US', { month: 'short' }) : ''}
              <div style={{ color: 'var(--dim)' }}>{dt.getDate()}</div>
            </div>
          )
        })}
        {properties.map(p => {
          return (
            <div key={p.id} style={{ display: 'contents' }}>
              <div style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)', alignSelf: 'center', paddingRight: 8, borderRight: '1px solid var(--border)' }}>
                {p.name.slice(0, 16)}
              </div>
              <div style={{ gridColumn: `2 / span ${days}`, position: 'relative', height: rowH, background: 'rgba(255,255,255,0.02)', borderRadius: 4, margin: '2px 0' }}>
                {grid.map((d, i) => (
                  <div key={d} style={{ position: 'absolute', left: i * cellW, top: 0, width: cellW, height: rowH, borderLeft: '1px solid rgba(255,255,255,0.03)' }} />
                ))}
                {bookings.filter(b => b.propertyId === p.id).map(b => {
                  const s = Math.max(0, dateToIdx(b.arrival))
                  const e = Math.min(days, dateToIdx(b.departure))
                  if (e <= 0 || s >= days) return null
                  const status = String(b.status ?? '').toLowerCase()
                  const color = status === 'declined' || status === 'cancelled' ? 'rgba(239,68,68,0.5)'
                              : status === 'open' ? 'rgba(6,182,212,0.45)'
                              : 'rgba(16,185,129,0.55)'
                  const border = status === 'open' ? '1px dashed rgba(6,182,212,0.8)' : '1px solid rgba(16,185,129,0.8)'
                  return (
                    <div key={`${b.propertyId}-${b.arrival}-${b.departure}`}
                         title={`${b.arrival} → ${b.departure}`}
                         style={{
                           position: 'absolute', left: s * cellW + 1, top: 3,
                           width: Math.max(4, (e - s) * cellW - 2), height: rowH - 6,
                           background: color, border, borderRadius: 4,
                           fontSize: 9, color: 'rgba(255,255,255,0.9)', fontFamily: 'var(--mo)',
                           padding: '1px 4px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                         }}>
                      {b.arrival}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
