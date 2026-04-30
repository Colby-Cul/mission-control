'use client'
/**
 * RentalsWidgets — all booking analytics ported from live Rentals.jsx.
 * Client component: state, sorting, recharts.
 * Data: accepts bookings[] fetched server-side via getRentalBookings().
 */
import { useState, useMemo } from 'react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, ComposedChart, ReferenceLine,
} from 'recharts'
import { SpecCard } from '../_components/SpecCard'
import PropertyQuickActions from '../_components/PropertyQuickActions'

// ─── constants ────────────────────────────────────────────────────────────────
const TT = {
  backgroundColor: '#12131a',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f9fafb',
  fontSize: 12,
}
const PROP_MAP: Record<string, string> = { '533203': 'Graeagle Cabin', '746614': 'Northstar Luxury' }
const PROP_COLORS: Record<string, string> = { '533203': '#10b981', '746614': '#8b5cf6' }
const SRC_COLORS: Record<string, string> = {
  AirbnbIntegration: '#ef4444',
  BookingCom: '#6366f1',
  HomeAway: '#f59e0b',
  OH: '#06b6d4',
  Direct: '#10b981',
}
const SRC_LABELS: Record<string, string> = {
  AirbnbIntegration: 'Airbnb',
  BookingCom: 'Booking.com',
  HomeAway: 'VRBO',
  OH: 'Owner Hold',
  Direct: 'Direct',
}
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444']

const MONTHLY_EXPENSES: Record<string, Record<string, number>> = {
  '533203': { mortgage: 2200, utilities: 350, insurance: 180, maintenance: 400, cleaning: 600, platform: 0, marketing: 100 },
  '746614': { mortgage: 4500, utilities: 500, insurance: 320, maintenance: 600, cleaning: 900, platform: 0, marketing: 200 },
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtCurrency(v: number) {
  return '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtPct(v: number) { return (v * 100).toFixed(1) + '%' }
function nightsBetween(a: string, d: string) {
  return Math.max(1, Math.round((new Date(d).getTime() - new Date(a).getTime()) / 86400000))
}

// ─── sub-components ───────────────────────────────────────────────────────────
function KpiTile({
  label, value, sub, color,
}: { label: string; value: string | number; sub: string; color: string }) {
  return (
    <div style={{
      padding: '16px 18px',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: 10,
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mo)', color }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function SortTh({
  col, label, sortCol, sortDir, onSort,
}: { col: string; label: string; sortCol: string; sortDir: 'asc' | 'desc'; onSort: (c: string) => void }) {
  const active = sortCol === col
  return (
    <th
      onClick={() => onSort(col)}
      style={{
        padding: '8px 6px', textAlign: 'left',
        color: active ? 'var(--accent)' : 'var(--dim)',
        cursor: 'pointer', borderBottom: '1px solid var(--border)',
        fontWeight: 600, whiteSpace: 'nowrap', userSelect: 'none',
        fontSize: 11,
      }}
    >
      {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )
}

// ─── main export ──────────────────────────────────────────────────────────────
/** Map lodgify property_id (string) → Supabase UUID for quick-action modals */
export default function RentalsWidgets({ bookings, propertyIdMap = {} }: { bookings: any[]; propertyIdMap?: Record<string, string> }) {
  const [propFilter, setPropFilter] = useState<string>('all')
  const [sortCol, setSortCol] = useState('arrival')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filtered = useMemo(
    () => propFilter === 'all' ? bookings : bookings.filter(b => String(b.property_id) === propFilter),
    [bookings, propFilter],
  )

  // ── KPI calculations ──────────────────────────────────────────────
  const totalRevenue = useMemo(() => filtered.reduce((s: number, b: any) => s + (b.total_amount || 0), 0), [filtered])
  const totalNights = useMemo(() => filtered.reduce((s: number, b: any) => s + nightsBetween(b.arrival, b.departure), 0), [filtered])
  const avgNightlyRate = totalNights > 0 ? totalRevenue / totalNights : 0
  const totalExpenses = useMemo(() => {
    const months = 10
    const propIds = propFilter === 'all' ? Object.keys(MONTHLY_EXPENSES) : [propFilter]
    return propIds.reduce((s: number, pid: string) => {
      return s + Object.values(MONTHLY_EXPENSES[pid] || {}).reduce((a, b) => a + b, 0)
    }, 0) * months
  }, [propFilter])
  const netProfit = totalRevenue - totalExpenses
  const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue : 0
  const availableNights = (propFilter === 'all' ? 2 : 1) * 300
  const occupancyRate = totalNights / availableNights
  const revPAR = totalRevenue / availableNights
  const avgGuests = filtered.length > 0
    ? filtered.reduce((s: number, b: any) => s + (b.guest_count ?? b.rooms?.[0]?.people ?? 2), 0) / filtered.length
    : 0

  // ── Monthly revenue + P&L ─────────────────────────────────────────
  const monthlyData = useMemo(() => {
    const months: Record<string, any> = {}
    filtered.forEach((b: any) => {
      const m = b.arrival?.slice(0, 7)
      if (!m) return
      if (!months[m]) months[m] = { month: m, graeagle: 0, northstar: 0, total: 0, bookings: 0 }
      const amt = b.total_amount || 0
      months[m].total += amt
      months[m].bookings += 1
      if (String(b.property_id) === '533203') months[m].graeagle += amt
      else months[m].northstar += amt
    })
    const propIds = propFilter === 'all' ? Object.keys(MONTHLY_EXPENSES) : [propFilter]
    const monthlyExp = propIds.reduce((s: number, pid: string) => {
      return s + Object.values(MONTHLY_EXPENSES[pid] || {}).reduce((a, b) => a + b, 0)
    }, 0)
    return Object.values(months)
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((m: any) => ({
        ...m,
        expenses: monthlyExp,
        profit: Math.round(m.total - monthlyExp),
        label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      }))
  }, [filtered, propFilter])

  // ── Source distribution ───────────────────────────────────────────
  const sourceData = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((b: any) => {
      const src = b.source || 'Direct'
      map[src] = (map[src] || 0) + (b.total_amount || 0)
    })
    return Object.entries(map).map(([name, value], i) => ({
      name: SRC_LABELS[name] || name,
      value: Math.round(value as number),
      fill: SRC_COLORS[name] || COLORS[i % COLORS.length],
    })).sort((a, b) => b.value - a.value)
  }, [filtered])

  // ── Expense breakdown ─────────────────────────────────────────────
  const expenseData = useMemo(() => {
    const combined: Record<string, number> = {}
    const propIds = propFilter === 'all' ? Object.keys(MONTHLY_EXPENSES) : [propFilter]
    propIds.forEach(pid => {
      const exp = MONTHLY_EXPENSES[pid] || {}
      Object.entries(exp).forEach(([k, v]) => { combined[k] = (combined[k] || 0) + v * 10 })
    })
    const labels: Record<string, string> = {
      mortgage: 'Mortgage', utilities: 'Utilities', insurance: 'Insurance',
      maintenance: 'Maintenance', cleaning: 'Cleaning', platform: 'Platform Fees', marketing: 'Marketing',
    }
    return Object.entries(combined)
      .filter(([, v]) => v > 0)
      .map(([k, v], i) => ({ name: labels[k] || k, value: v, fill: COLORS[i % COLORS.length] }))
      .sort((a, b) => b.value - a.value)
  }, [propFilter])

  // ── Occupancy by month ────────────────────────────────────────────
  const occupancyData = useMemo(() => {
    const propCount = propFilter === 'all' ? 2 : 1
    const daysPerMonth = propCount * 30
    const months: Record<string, any> = {}
    filtered.forEach((b: any) => {
      const m = b.arrival?.slice(0, 7)
      if (!m) return
      if (!months[m]) months[m] = { month: m, nights: 0 }
      months[m].nights += nightsBetween(b.arrival, b.departure)
    })
    return Object.values(months)
      .sort((a: any, b: any) => a.month.localeCompare(b.month))
      .map((m: any) => {
        const monthEntry = monthlyData.find((d: any) => d.month === m.month)
        return {
          ...m,
          occupancy: Math.round((m.nights / daysPerMonth) * 100),
          adr: monthEntry ? monthEntry.total / Math.max(1, m.nights) : 0,
          revpar: monthEntry ? monthEntry.total / daysPerMonth : 0,
          label: new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }),
        }
      })
  }, [filtered, monthlyData, propFilter])

  // ── Property performance ──────────────────────────────────────────
  const propertyPerf = useMemo(() => {
    return Object.entries(PROP_MAP).map(([pid, name]) => {
      const propBookings = bookings.filter((b: any) => String(b.property_id) === pid)
      const rev = propBookings.reduce((s: number, b: any) => s + (b.total_amount || 0), 0)
      const nights = propBookings.reduce((s: number, b: any) => s + nightsBetween(b.arrival, b.departure), 0)
      const exp = Object.values(MONTHLY_EXPENSES[pid] || {}).reduce((a, b) => a + b, 0) * 10
      return {
        id: pid, name, bookings: propBookings.length, revenue: rev, nights,
        adr: nights > 0 ? Math.round(rev / nights) : 0,
        occupancy: Math.round((nights / 300) * 100),
        expenses: exp,
        profit: rev - exp,
        avgGuests: propBookings.length > 0
          ? Math.round(propBookings.reduce((s: number, b: any) => s + (b.guest_count ?? b.rooms?.[0]?.people ?? 2), 0) / propBookings.length)
          : 0,
      }
    })
  }, [bookings])

  // ── Sortable bookings table ───────────────────────────────────────
  const sortedBookings = useMemo(() => {
    const list = [...filtered]
    list.sort((a: any, b: any) => {
      let va = a[sortCol]; let vb = b[sortCol]
      if (sortCol === 'total_amount') { va = va || 0; vb = vb || 0 }
      if (sortCol === 'property_id') { va = PROP_MAP[String(va)] || va; vb = PROP_MAP[String(vb)] || vb }
      if (sortCol === 'nights') {
        va = nightsBetween(a.arrival, a.departure)
        vb = nightsBetween(b.arrival, b.departure)
      }
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va
      return sortDir === 'asc'
        ? String(va || '').localeCompare(String(vb || ''))
        : String(vb || '').localeCompare(String(va || ''))
    })
    return list
  }, [filtered, sortCol, sortDir])

  const handleSort = (col: string) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // ── if no bookings, show empty state ─────────────────────────────
  if (!bookings.length) {
    return (
      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--dim)', fontSize: 14 }}>
        No booking data — connect Lodgify or populate the <code style={{ fontFamily: 'var(--mo)' }}>rental_bookings</code> table.
      </div>
    )
  }

  return (
    <>
      {/* ── Property filter ── */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Booking Analytics</h2>
          <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
            {([['all', 'All Properties'], ['533203', 'Graeagle Cabin'], ['746614', 'Northstar Luxury']] as [string, string][]).map(([v, l]) => (
              <button
                key={v}
                onClick={() => setPropFilter(v)}
                style={{
                  background: propFilter === v ? 'var(--accent)' : 'rgba(255,255,255,0.04)',
                  color: propFilter === v ? '#fff' : 'var(--dim)',
                  border: `1px solid ${propFilter === v ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* ── 8-up KPI strip ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
          <KpiTile label="Total Revenue"   value={fmtCurrency(totalRevenue)}      sub="All bookings"                         color="var(--green)"  />
          <KpiTile label="Net Profit"      value={fmtCurrency(netProfit)}          sub={`Margin: ${fmtPct(profitMargin)}`}   color={netProfit >= 0 ? 'var(--green)' : 'var(--red)'} />
          <KpiTile label="Occupancy Rate"  value={fmtPct(occupancyRate)}           sub="Avg across properties"               color={occupancyRate > 0.7 ? 'var(--green)' : 'var(--amber)'} />
          <KpiTile label="ADR"             value={fmtCurrency(avgNightlyRate)}     sub="Avg nightly rate"                    color="var(--cyan)"   />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <KpiTile label="RevPAR"          value={fmtCurrency(revPAR)}             sub="Rev per avail night"                 color="var(--purple)" />
          <KpiTile label="Bookings"        value={filtered.length}                 sub={`${bookings.length - filtered.length} declined`} color="var(--accent)" />
          <KpiTile label="Nights Booked"   value={totalNights}                     sub={`of ${availableNights} available`}   color="var(--cyan)"   />
          <KpiTile label="Avg Guests"      value={avgGuests.toFixed(1)}            sub="Per booking"                         color="var(--amber)"  />
        </div>
      </section>

      {/* ── Revenue & P&L charts ── */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SpecCard dataSource="rental_bookings">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Revenue by Property</div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gGraeV7" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gNorthV7" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT} formatter={(v) => fmtCurrency(Number(v))} />
                <Area type="monotone" dataKey="graeagle"  stackId="1" stroke="#10b981" fill="url(#gGraeV7)"  name="Graeagle" />
                <Area type="monotone" dataKey="northstar" stackId="1" stroke="#8b5cf6" fill="url(#gNorthV7)" name="Northstar" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </AreaChart>
            </ResponsiveContainer>
          </SpecCard>

          <SpecCard dataSource="rental_bookings">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Monthly P&amp;L</div>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={monthlyData}>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={TT} formatter={(v) => fmtCurrency(Number(v))} />
                <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                <Bar dataKey="total"    fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#ef444488" radius={[4, 4, 0, 0]} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Profit" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </SpecCard>
        </div>
      </section>

      {/* ── Expense breakdown + Source distribution ── */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SpecCard dataSource="rental_bookings">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Expense Breakdown (YTD Est.)</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={expenseData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                  {expenseData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => fmtCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--dim)' }} />
              </PieChart>
            </ResponsiveContainer>
          </SpecCard>

          <SpecCard dataSource="rental_bookings">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Revenue by Source</div>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={sourceData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                  {sourceData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                </Pie>
                <Tooltip contentStyle={TT} formatter={(v) => fmtCurrency(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 10, color: 'var(--dim)' }} />
              </PieChart>
            </ResponsiveContainer>
          </SpecCard>
        </div>
      </section>

      {/* ── Occupancy + ADR/RevPAR ── */}
      <section style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <SpecCard dataSource="rental_bookings">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Occupancy Rate by Month</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={occupancyData}>
                <defs>
                  <linearGradient id="gOccV7" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[0, 100]} />
                <ReferenceLine y={85} stroke="#10b981" strokeDasharray="4 4" label={{ value: '85% target', fill: '#10b981', fontSize: 10, position: 'right' }} />
                <Tooltip contentStyle={TT} formatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Area type="monotone" dataKey="occupancy" stroke="#06b6d4" fill="url(#gOccV7)" name="Occupancy %" />
              </AreaChart>
            </ResponsiveContainer>
          </SpecCard>

          <SpecCard dataSource="rental_bookings">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>ADR &amp; RevPAR Trend</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={occupancyData}>
                <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v.toFixed(0)}`} />
                <Tooltip contentStyle={TT} formatter={(v) => fmtCurrency(Math.round(Number(v)))} />
                <Line type="monotone" dataKey="adr"    stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="ADR" />
                <Line type="monotone" dataKey="revpar" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} name="RevPAR" />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </LineChart>
            </ResponsiveContainer>
          </SpecCard>
        </div>
      </section>

      {/* ── Property performance cards ── */}
      <section style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Property Performance</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {propertyPerf.map(p => {
            const supabaseId = propertyIdMap[String(p.id)]
            return (
            <SpecCard key={p.id} accent dataSource="rental_bookings">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--dim)' }}>Lodgify ID: {p.id}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {supabaseId && (
                    <PropertyQuickActions
                      propertyId={supabaseId}
                      propertyName={p.name}
                      slug={null}
                    />
                  )}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px',
                    borderRadius: 6, letterSpacing: '0.08em', textTransform: 'uppercase',
                    background: p.profit > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                    color: p.profit > 0 ? '#10b981' : '#ef4444',
                    border: `1px solid ${p.profit > 0 ? '#10b981' : '#ef4444'}`,
                  }}>
                    {p.profit > 0 ? 'Profitable' : 'Loss'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 10 }}>
                {([
                  ['Revenue',  fmtCurrency(p.revenue),  '#10b981'],
                  ['Expenses', fmtCurrency(p.expenses), '#ef4444'],
                  ['Profit',   fmtCurrency(p.profit),   p.profit > 0 ? '#10b981' : '#ef4444'],
                  ['Bookings', p.bookings,               'var(--accent)'],
                  ['Nights',   p.nights,                 '#06b6d4'],
                ] as [string, string | number, string][]).map(([label, val, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--dim)' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color }}>{val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {([
                  ['ADR',       `$${p.adr}`,                    '#f59e0b'],
                  ['Occupancy', `${p.occupancy}%`,               p.occupancy >= 85 ? '#10b981' : '#f59e0b'],
                  ['Avg Guests', p.avgGuests,                    '#8b5cf6'],
                  ['RevPAR',    fmtCurrency(Math.round(p.revenue / 300)), '#06b6d4'],
                ] as [string, string | number, string][]).map(([label, val, color]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--dim)' }}>{label}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color }}>{val}</div>
                  </div>
                ))}
              </div>
            </SpecCard>
          )})}
        </div>
      </section>

      {/* ── Bookings table ── */}
      <section style={{ marginBottom: 28 }}>
        <SpecCard dataSource="rental_bookings">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Bookings ({sortedBookings.length})</div>
            <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
              {bookings.length - filtered.length > 0 ? `+ ${bookings.length - filtered.length} declined` : 'all statuses'}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr>
                  {([
                    ['arrival',      'Check-in'],
                    ['departure',    'Check-out'],
                    ['nights',       'Nights'],
                    ['property_id',  'Property'],
                    ['source',       'Source'],
                    ['total_amount', 'Revenue'],
                    ['status',       'Status'],
                    ['guest',        'Guest'],
                  ] as [string, string][]).map(([col, label]) => (
                    <SortTh key={col} col={col} label={label} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedBookings.slice(0, 30).map((b: any) => (
                  <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '6px' }}>{b.arrival}</td>
                    <td style={{ padding: '6px' }}>{b.departure}</td>
                    <td style={{ padding: '6px', color: '#06b6d4', fontFamily: 'var(--mo)' }}>
                      {nightsBetween(b.arrival, b.departure)}
                    </td>
                    <td style={{ padding: '6px' }}>
                      <span style={{ color: PROP_COLORS[String(b.property_id)] || 'inherit' }}>
                        {PROP_MAP[String(b.property_id)] || b.property_id}
                      </span>
                    </td>
                    <td style={{ padding: '6px', color: 'var(--dim)' }}>
                      {SRC_LABELS[b.source] || b.source}
                    </td>
                    <td style={{ padding: '6px', color: '#10b981', fontWeight: 600, fontFamily: 'var(--mo)' }}>
                      {fmtCurrency(b.total_amount)}
                    </td>
                    <td style={{ padding: '6px' }}>
                      <span style={{
                        padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700,
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        background: b.status === 'Booked' ? 'rgba(16,185,129,0.15)'
                          : b.status === 'Open' ? 'rgba(6,182,212,0.15)'
                          : 'rgba(239,68,68,0.15)',
                        color: b.status === 'Booked' ? '#10b981'
                          : b.status === 'Open' ? '#06b6d4'
                          : '#ef4444',
                      }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: '6px', color: 'var(--dim)' }}>
                      {b.guest?.name ?? b.guest_name ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SpecCard>
      </section>
    </>
  )
}
