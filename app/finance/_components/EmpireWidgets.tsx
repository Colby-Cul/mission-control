'use client'

import { Target, TrendingUp, AlertTriangle, Activity, Wallet } from 'lucide-react'
import { fmtMoney, fmtMoneyExact, fmtPct } from '../../lib/format'

const C = {
  ink: '#f5f5f7',
  dim: 'rgba(255,255,255,0.55)',
  dim2: 'rgba(255,255,255,0.35)',
  card: 'rgba(255,255,255,0.03)',
  line: 'rgba(255,255,255,0.07)',
}

// ─── Portfolio Allocation Donut ────────────────────────────────────────────

interface PortfolioBucket { key: string; label: string; value: number; color: string }

export function PortfolioDonut({ buckets, totalAssets, totalDebt, netWorth }: {
  buckets: PortfolioBucket[]
  totalAssets: number
  totalDebt: number
  netWorth: number
}) {
  if (buckets.length === 0) {
    return (
      <EmptyWidget title="Portfolio Allocation">
        No asset-class data yet. Link a bank or add a property to populate.
      </EmptyWidget>
    )
  }

  const R = 72
  const stroke = 24
  const C_ = 2 * Math.PI * R
  let offset = 0
  const segments = buckets.map(b => {
    const pct = b.value / totalAssets
    const len = pct * C_
    const seg = { ...b, pct, len, start: offset }
    offset += len
    return seg
  })

  return (
    <Panel title="Portfolio Allocation" icon={<Wallet size={13} />} tone="green">
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'center' }}>
        <svg width={180} height={180} viewBox="-90 -90 180 180" style={{ transform: 'rotate(-90deg)' }}>
          {segments.map((s) => (
            <circle
              key={s.key}
              cx={0} cy={0} r={R}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${s.len} ${C_ - s.len}`}
              strokeDashoffset={-s.start}
            />
          ))}
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ marginBottom: 6 }}>
            <div style={{ fontSize: 10, color: C.dim2, fontFamily: 'var(--mo)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Net Worth
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.ink, fontFamily: 'var(--mo)' }}
                 title={fmtMoneyExact(netWorth)}>
              {fmtMoney(netWorth)}
            </div>
            <div style={{ fontSize: 10, color: C.dim2, marginTop: 2 }}>
              Assets {fmtMoney(totalAssets)} · Debt {fmtMoney(totalDebt)}
            </div>
          </div>
          {segments.map((s) => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontWeight: 600, color: C.ink, flex: 1 }}>{s.label}</span>
              <span style={{ fontFamily: 'var(--mo)', color: C.dim }}>
                {fmtPct(s.pct * 100)}
              </span>
              <span style={{ fontFamily: 'var(--mo)', color: C.ink, minWidth: 60, textAlign: 'right' }}
                    title={fmtMoneyExact(s.value)}>
                {fmtMoney(s.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Panel>
  )
}

// ─── Cash Flow Strip (simple flow-of-funds, 12 months) ──────────────────────

export function CashFlowStrip({ months }: {
  months: Array<{ month: string; inflow: number; outflow: number; net: number; count: number }>
}) {
  if (months.length === 0) {
    return (
      <EmptyWidget title="Monthly Cash Flow">
        No transaction data yet. Link a bank to populate.
      </EmptyWidget>
    )
  }
  const max = Math.max(...months.map(m => Math.max(m.inflow, m.outflow)), 1)
  const totalIn = months.reduce((s, m) => s + m.inflow, 0)
  const totalOut = months.reduce((s, m) => s + m.outflow, 0)
  const totalNet = totalIn - totalOut

  return (
    <Panel title={`Cash Flow · last ${months.length} mo`} icon={<TrendingUp size={13} />} tone="cyan">
      {/* Top numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        <MiniStat label="Inflow"  value={fmtMoney(totalIn)}  color="#10b981" mono />
        <MiniStat label="Outflow" value={fmtMoney(totalOut)} color="#ef4444" mono />
        <MiniStat label="Net"     value={fmtMoney(totalNet)} color={totalNet >= 0 ? '#10b981' : '#ef4444'} mono />
      </div>
      {/* Bar chart */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${months.length}, 1fr)`,
        gap: 4, alignItems: 'end', height: 120,
      }}>
        {months.map(m => {
          const inPct = (m.inflow / max) * 100
          const outPct = (m.outflow / max) * 100
          return (
            <div key={m.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
              <div style={{ height: 100, display: 'flex', alignItems: 'end', gap: 1 }}>
                <div title={`In: ${fmtMoneyExact(m.inflow)}`} style={{
                  flex: 1, background: '#10b981', height: `${inPct}%`,
                  borderRadius: '2px 2px 0 0', minHeight: 2,
                }} />
                <div title={`Out: ${fmtMoneyExact(m.outflow)}`} style={{
                  flex: 1, background: '#ef4444', height: `${outPct}%`,
                  borderRadius: '2px 2px 0 0', minHeight: 2, opacity: 0.85,
                }} />
              </div>
              <div style={{ fontSize: 9, color: C.dim2, fontFamily: 'var(--mo)', textAlign: 'center' }}>
                {m.month.slice(5)}
              </div>
            </div>
          )
        })}
      </div>
    </Panel>
  )
}

// ─── Entity Heat Map ────────────────────────────────────────────────────────

interface EntityTile { id: string; name: string; type: string | null; state: string | null; balance: number; health: 'healthy' | 'watch' | 'action' }

export function EntityHeatMap({ entities }: { entities: EntityTile[] }) {
  if (entities.length === 0) return <EmptyWidget title="Entity Heat Map">No active entities.</EmptyWidget>
  return (
    <Panel title={`Entity Heat Map · ${entities.length} active`} icon={<Target size={13} />} tone="amber">
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: 8,
      }}>
        {entities.map(e => {
          const color = e.health === 'healthy' ? '#10b981' : e.health === 'action' ? '#ef4444' : '#f59e0b'
          return (
            <a key={e.id} href={`/companies/${e.id}`} style={{
              display: 'flex', flexDirection: 'column', gap: 4,
              padding: '10px 12px',
              background: `${color}0D`,
              border: `1px solid ${color}40`,
              borderRadius: 10,
              textDecoration: 'none', color: 'inherit',
              transition: 'transform .1s, background .1s',
            }}
            onMouseEnter={(el) => { (el.currentTarget as HTMLElement).style.background = `${color}20` }}
            onMouseLeave={(el) => { (el.currentTarget as HTMLElement).style.background = `${color}0D` }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.04em', fontFamily: 'var(--mo)' }}>
                  {e.type ?? '—'}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.ink, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                   title={e.name}>
                {e.name}
              </div>
              <div style={{ fontSize: 11, color: C.dim, fontFamily: 'var(--mo)' }}
                   title={fmtMoneyExact(e.balance)}>
                {fmtMoney(e.balance)}
              </div>
            </a>
          )
        })}
      </div>
    </Panel>
  )
}

// ─── Top Revenue Entities ────────────────────────────────────────────────

export function TopRevenueEntities({ entities }: { entities: Array<{ id: string; name: string; revenue: number }> }) {
  if (entities.length === 0) {
    return (
      <EmptyWidget title="Top Revenue Entities" hint>
        Revenue rollup requires financial_accounts.entity_id populated. Once you link
        each bank account to an entity, deposits over the last 90 days roll up here.
      </EmptyWidget>
    )
  }
  const max = entities[0]?.revenue ?? 1
  return (
    <Panel title="Top Revenue · 90d" icon={<Activity size={13} />} tone="green">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entities.map((e, i) => (
          <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '20px 1fr 80px', gap: 10, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: C.dim2, fontFamily: 'var(--mo)', fontWeight: 700 }}>#{i + 1}</span>
            <div>
              <div style={{ fontSize: 12, color: C.ink, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${(e.revenue / max) * 100}%`, height: '100%', background: '#10b981', borderRadius: 3 }} />
              </div>
            </div>
            <span style={{ fontSize: 11, fontFamily: 'var(--mo)', color: C.ink, textAlign: 'right', fontWeight: 600 }}
                  title={fmtMoneyExact(e.revenue)}>
              {fmtMoney(e.revenue)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ─── Risk Flags ────────────────────────────────────────────────────────

export function RiskFlags({ entities }: { entities: EntityTile[] }) {
  const risks = entities.filter(e => e.health !== 'healthy').slice(0, 5)
  if (risks.length === 0) {
    return (
      <Panel title="Risk Flags" icon={<AlertTriangle size={13} />} tone="amber">
        <div style={{ padding: '20px 10px', textAlign: 'center', fontSize: 12, color: '#10b981' }}>
          ✓ No entities flagged. All active entities have balance &gt; 0 and clean task state.
        </div>
      </Panel>
    )
  }
  return (
    <Panel title={`Risk Flags · ${risks.length}`} icon={<AlertTriangle size={13} />} tone="red">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {risks.map(r => (
          <div key={r.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px',
            background: r.health === 'action' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
            border: `1px solid ${r.health === 'action' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
            borderRadius: 8,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: r.health === 'action' ? '#ef4444' : '#f59e0b',
            }} />
            <span style={{ fontSize: 12, color: C.ink, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.name}
            </span>
            <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: C.dim, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {r.health === 'action' ? 'Act' : 'Watch'}
            </span>
            <span style={{ fontSize: 11, fontFamily: 'var(--mo)', color: C.dim }}>
              {fmtMoney(r.balance)}
            </span>
          </div>
        ))}
      </div>
    </Panel>
  )
}

// ─── Shared layout bits ─────────────────────────────────────────────────────

function Panel({ title, icon, children, tone }: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  tone?: 'green' | 'cyan' | 'amber' | 'red' | 'purple'
}) {
  const toneColor = {
    green:  '#10b981',
    cyan:   '#06b6d4',
    amber:  '#f59e0b',
    red:    '#ef4444',
    purple: '#8b5cf6',
  }[tone ?? 'green']
  return (
    <section style={{
      background: C.card,
      border: `1px solid ${C.line}`,
      borderRadius: 14,
      padding: '16px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ color: toneColor, display: 'flex' }}>{icon}</span>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: toneColor,
          fontFamily: 'var(--mo)',
        }}>{title}</span>
      </div>
      {children}
    </section>
  )
}

function MiniStat({ label, value, color, mono }: { label: string; value: string; color: string; mono?: boolean }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, padding: '10px 12px' }}>
      <div style={{ fontSize: 10, color: C.dim2, fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.08em', marginBottom: 2 }}>
        {label.toUpperCase()}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color, fontFamily: mono ? 'var(--mo)' : undefined }}>{value}</div>
    </div>
  )
}

function EmptyWidget({ title, children, hint = false }: { title: string; children: React.ReactNode; hint?: boolean }) {
  return (
    <Panel title={title} tone="purple">
      <div style={{
        padding: '24px 12px', textAlign: 'center',
        fontSize: 12, color: hint ? C.dim : C.dim2,
        lineHeight: 1.5,
      }}>
        {children}
      </div>
    </Panel>
  )
}
