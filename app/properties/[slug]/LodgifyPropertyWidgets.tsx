'use client'
/**
 * Per-property live Lodgify widgets:
 *   - Booking calendar strip (90 days forward)
 *   - Upcoming reservations (10)
 *   - 12-mo occupancy chart
 *   - ADR trend
 *   - Revenue YTD KPI
 *   - Guest reviews (ComingSoon when /v2/reviews returns null)
 *   - Messaging thread count (derived from unique thread_uid across bookings)
 */
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts'
import { SpecCard } from '../../_components/SpecCard'
import ComingSoon from '../../_components/ComingSoon'

const TT = {
  backgroundColor: '#12131a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f9fafb',
  fontSize: 12,
}
function USD(v: number) { return '$' + Math.round(v).toLocaleString('en-US') }

interface OccupancyPoint { month: string; label: string; occupancy: number; adr: number; revpar: number; revenue: number }
interface BookingRow {
  id: number
  arrival: string
  departure: string
  status: string
  source: string | null
  total_amount: number
  currency_code: string
  guestInitials: string | null
}
interface ReservationRow {
  arrival: string
  departure: string
  nights: number
  guestInitials: string | null
  source: string | null
  total: number
  status: string
}
interface ReviewItem { id: number | string; rating?: number; guest_name?: string; comment?: string; property_id?: number }

export default function LodgifyPropertyWidgets({
  propertyId, propertyName, occupancy, bookings, nextReservations, revenueYTD, threadCount, reviews,
}: {
  propertyId: number
  propertyName: string
  occupancy: OccupancyPoint[] | null
  bookings: BookingRow[]
  nextReservations: ReservationRow[]
  revenueYTD: number
  threadCount: number
  reviews: ReviewItem[] | null
}) {
  return (
    <>
      {/* KPI strip: Revenue YTD + Threads + Bookings count */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Revenue YTD</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(revenueYTD)}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>Lodgify · {new Date().getFullYear()}</div>
        </SpecCard>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Upcoming</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--orange)' }}>{nextReservations.length}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>Reservations (next 90 d)</div>
        </SpecCard>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Messaging</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--purple)' }}>{threadCount}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>Unique guest threads</div>
        </SpecCard>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Lodgify Property</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--cyan)' }}>#{propertyId}</div>
          <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{propertyName}</div>
        </SpecCard>
      </div>

      {/* Occupancy + ADR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
        <SpecCard dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Occupancy (12 mo)</div>
          {occupancy?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={occupancy}>
                <defs>
                  <linearGradient id={`occProp${propertyId}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: '85%', fill: '#10b981', fontSize: 10, position: 'right' }} />
                <Tooltip contentStyle={TT} formatter={(v: number) => `${Number(v).toFixed(1)}%`} />
                <Area type="monotone" dataKey="occupancy" stroke="#06b6d4" fill={`url(#occProp${propertyId})`} name="Occupancy" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--dim)' }}>No occupancy data yet.</p>
          )}
        </SpecCard>
        <SpecCard dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>ADR Trend (12 mo)</div>
          {occupancy?.length ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={occupancy}>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip contentStyle={TT} formatter={(v: number) => USD(Number(v))} />
                <Line type="monotone" dataKey="adr" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="ADR" />
                <Line type="monotone" dataKey="revpar" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="RevPAR" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--dim)' }}>No ADR data yet.</p>
          )}
        </SpecCard>
      </div>

      {/* Booking calendar + next reservations */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14, marginBottom: 16 }}>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
            Booking Calendar <span style={{ color: 'var(--dim)', fontWeight: 400, fontSize: 11 }}>(next 90 days)</span>
          </div>
          <SingleRowCalendar bookings={bookings} days={90} />
        </SpecCard>
        <SpecCard accent dataSource="lodgify:/v2/reservations/bookings">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Upcoming Reservations</div>
          {nextReservations.length === 0 ? (
            <p style={{ fontSize: 12, color: 'var(--dim)' }}>No upcoming reservations.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {nextReservations.map((r, i) => (
                <div key={i} style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)', fontSize: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mo)' }}>
                    <span style={{ color: 'var(--orange)' }}>{r.arrival}</span>
                    <span style={{ color: 'var(--green)' }}>{USD(r.total)}</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                    {r.guestInitials ?? 'Guest'} · {r.nights}n · {r.source ?? 'direct'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      </div>

      {/* Reviews */}
      {reviews === null ? (
        <div style={{ marginBottom: 0 }}>
          <ComingSoon
            title="Guest Reviews"
            reason="Lodgify /v2/reviews returns 404 for this API key scope. Widget will populate automatically once enabled."
            icon="⭐"
            dataSource="lodgify:/v2/reviews"
            skeleton="table"
          />
        </div>
      ) : reviews.filter(r => !r.property_id || r.property_id === propertyId).length === 0 ? (
        <SpecCard accent dataSource="lodgify:/v2/reviews">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Guest Reviews</div>
          <p style={{ fontSize: 12, color: 'var(--dim)' }}>No reviews yet.</p>
        </SpecCard>
      ) : (
        <SpecCard accent dataSource="lodgify:/v2/reviews">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Guest Reviews</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {reviews.filter(r => !r.property_id || r.property_id === propertyId).slice(0, 6).map(r => (
              <div key={r.id} style={{ padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600 }}>{r.guest_name ?? 'Guest'}</span>
                  <span style={{ fontSize: 11, color: 'var(--orange)', fontFamily: 'var(--mo)' }}>★ {r.rating ?? '—'}</span>
                </div>
                {r.comment ? (
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 4, lineHeight: 1.4 }}>
                    {String(r.comment).slice(0, 200)}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </SpecCard>
      )}
    </>
  )
}

function SingleRowCalendar({ bookings, days }: { bookings: BookingRow[]; days: number }) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const cellW = 10
  function toIdx(d: string) {
    return Math.round((new Date(d + 'T00:00:00').getTime() - start.getTime()) / 86400000)
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ position: 'relative', height: 58, minWidth: days * cellW }}>
        {/* grid */}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(start.getTime() + i * 86400000)
          const isMonthStart = d.getDate() === 1
          return (
            <div key={i} style={{
              position: 'absolute', left: i * cellW, top: 22, bottom: 0, width: cellW,
              borderLeft: isMonthStart ? '1px solid rgba(249,115,22,0.5)' : '1px solid rgba(255,255,255,0.03)',
              background: 'rgba(255,255,255,0.02)',
            }} />
          )
        })}
        {/* month labels */}
        {Array.from({ length: days }, (_, i) => {
          const d = new Date(start.getTime() + i * 86400000)
          if (d.getDate() !== 1 && i !== 0) return null
          return (
            <div key={'m' + i} style={{
              position: 'absolute', left: i * cellW + 2, top: 0, fontSize: 9, fontFamily: 'var(--mo)', color: 'var(--orange)',
            }}>
              {d.toLocaleDateString('en-US', { month: 'short' })}
            </div>
          )
        })}
        {/* bookings */}
        {bookings.map((b, i) => {
          const s = toIdx(b.arrival)
          const e = toIdx(b.departure)
          if (e <= 0 || s >= days) return null
          const sClamp = Math.max(0, s)
          const eClamp = Math.min(days, e)
          const status = String(b.status ?? '').toLowerCase()
          const color = status === 'declined' || status === 'cancelled' ? 'rgba(239,68,68,0.5)'
                     : status === 'open' ? 'rgba(6,182,212,0.55)'
                     : 'rgba(16,185,129,0.65)'
          return (
            <div key={b.id} title={`${b.arrival} → ${b.departure} · ${b.guestInitials ?? 'Guest'} · ${USD(b.total_amount)}`} style={{
              position: 'absolute', left: sClamp * cellW + 1, top: 26, height: 24,
              width: Math.max(4, (eClamp - sClamp) * cellW - 2),
              background: color,
              border: status === 'open' ? '1px dashed rgba(6,182,212,0.8)' : '1px solid rgba(16,185,129,0.9)',
              borderRadius: 4, fontSize: 9, color: '#fff', padding: '2px 4px',
              fontFamily: 'var(--mo)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{b.guestInitials ?? 'Guest'}</div>
          )
        })}
      </div>
    </div>
  )
}
