'use client'

import { fmtMoney, fmtMoneyExact, fmtPct } from '../../lib/format'

// All widgets use the site's design system:
//   • SpecCard (.mc-card.accent) with the orange→pink→purple 3px top bar
//   • section-header / section-title / achieve-count for the heading row
//   • HUD corners on the containing section
//   • CSS vars for all color (--orange/pink/purple/green/amber/red/cyan)
//   • IBM Plex Mono via --mo for all numeric values
// No inline hex colors. No bespoke rounded-rect panels.

// ─── Portfolio Allocation (allocation %, not a net-worth claim) ─────────────

interface PortfolioBucket { key: string; label: string; value: number; color: string }

export function PortfolioDonut({ buckets, totalAssets, totalDebt }: {
  buckets: PortfolioBucket[]
  totalAssets: number
  totalDebt: number
  netWorth: number  // accepted but not displayed — hero owns the headline number
}) {
  // Re-map bucket colors to CSS vars so we don't conflict with the site palette.
  const paint: Record<string, string> = {
    realEstate: 'var(--green)',
    cash:       'var(--cyan)',
    brokerage:  'var(--purple)',
  }

  if (buckets.length === 0) {
    return (
      <section style={{ marginBottom: 28 }}>
        <SectionHeader title="Portfolio Allocation" subtitle="— awaiting data" />
        <div className="mc-card accent">
          <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 13, color: 'var(--dim)' }}>
            No asset-class data yet. Link a bank or add a property to populate.
          </div>
        </div>
      </section>
    )
  }

  const R = 72
  const stroke = 26
  const CIRC = 2 * Math.PI * R
  let offset = 0
  const segments = buckets.map(b => {
    const pct = b.value / totalAssets
    const len = pct * CIRC
    const seg = { ...b, pct, len, start: offset, paintColor: paint[b.key] ?? 'var(--orange)' }
    offset += len
    return seg
  })

  return (
    <section style={{ marginBottom: 28 }} data-source="financial_accounts,property_assets">
      <SectionHeader title="Portfolio Allocation" subtitle={`${buckets.length} classes · ${fmtMoney(totalAssets)} assets · ${fmtMoney(totalDebt)} debt`} />
      <div className="mc-card accent">
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'center' }}>
          <svg width={180} height={180} viewBox="-90 -90 180 180" style={{ transform: 'rotate(-90deg)' }}>
            {segments.map((s) => (
              <circle
                key={s.key}
                cx={0} cy={0} r={R}
                fill="none"
                stroke={s.paintColor}
                strokeWidth={stroke}
                strokeDasharray={`${s.len} ${CIRC - s.len}`}
                strokeDashoffset={-s.start}
              />
            ))}
          </svg>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {segments.map((s) => (
              <div key={s.key} style={{ display: 'grid', gridTemplateColumns: '12px 110px 60px 1fr', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.paintColor }} />
                <span style={{ fontWeight: 600, color: 'var(--t1)' }}>{s.label}</span>
                <span style={{ fontFamily: 'var(--mo)', color: 'var(--dim)', fontSize: 12 }}>{fmtPct(s.pct * 100)}</span>
                <span style={{ fontFamily: 'var(--mo)', color: 'var(--t1)', textAlign: 'right', fontWeight: 600 }}
                      title={fmtMoneyExact(s.value)}>
                  {fmtMoney(s.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Cash Flow (12mo, transfers excluded) ──────────────────────────────────

export function CashFlowStrip({ months }: {
  months: Array<{ month: string; inflow: number; outflow: number; net: number; count: number }>
}) {
  if (months.length === 0) {
    return (
      <section style={{ marginBottom: 28 }}>
        <SectionHeader title="Flow of Funds" subtitle="— transfers excluded" />
        <div className="mc-card accent">
          <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 13, color: 'var(--dim)' }}>
            No transaction data yet. Link a bank to populate.
          </div>
        </div>
      </section>
    )
  }
  const max = Math.max(...months.map(m => Math.max(m.inflow, m.outflow)), 1)
  const ltmIn  = months.reduce((s, m) => s + m.inflow,  0)
  const ltmOut = months.reduce((s, m) => s + m.outflow, 0)
  const ltmNet = ltmIn - ltmOut
  const netColor = ltmNet >= 0 ? 'var(--green)' : 'var(--red)'

  const monthLabel = (m: string) => {
    const [_, mm] = m.split('-')
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(mm) - 1] ?? mm
  }

  return (
    <section style={{ marginBottom: 28 }} data-source="financial_transactions">
      <SectionHeader
        title="Flow of Funds"
        subtitle={`${months.length} months · transfers excluded`}
      />
      <div className="mc-card accent">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <FlowStat label="LTM Inflow"  value={fmtMoney(ltmIn)}  color="var(--green)" />
          <FlowStat label="LTM Outflow" value={fmtMoney(ltmOut)} color="var(--red)" />
          <FlowStat label="Net"         value={fmtMoney(ltmNet)} color={netColor} />
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${months.length}, 1fr)`,
          gap: 6, alignItems: 'end', height: 140,
        }}>
          {months.map(m => {
            const inPct = (m.inflow / max) * 100
            const outPct = (m.outflow / max) * 100
            return (
              <div key={m.month} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ height: 112, display: 'flex', alignItems: 'end', gap: 2 }}>
                  <div
                    title={`In: ${fmtMoneyExact(m.inflow)}`}
                    style={{
                      flex: 1, background: 'var(--green)', height: `${inPct}%`,
                      borderRadius: '3px 3px 0 0', minHeight: 3, opacity: 0.85,
                    }}
                  />
                  <div
                    title={`Out: ${fmtMoneyExact(m.outflow)}`}
                    style={{
                      flex: 1, background: 'var(--red)', height: `${outPct}%`,
                      borderRadius: '3px 3px 0 0', minHeight: 3, opacity: 0.85,
                    }}
                  />
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', textAlign: 'center' }}>
                  {monthLabel(m.month)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Entity Heat Map ────────────────────────────────────────────────────────

interface EntityTile { id: string; name: string; type: string | null; state: string | null; balance: number; health: 'healthy' | 'watch' | 'action' }

export function EntityHeatMap({ entities }: { entities: EntityTile[] }) {
  if (entities.length === 0) {
    return (
      <section style={{ marginBottom: 28 }}>
        <SectionHeader title="Entity Heat Map" subtitle="— no active entities" />
        <div className="mc-card accent">
          <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 13, color: 'var(--dim)' }}>
            No active entities.
          </div>
        </div>
      </section>
    )
  }
  return (
    <section style={{ marginBottom: 28 }} data-source="entity_ownership,financial_accounts">
      <SectionHeader title="Entity Heat Map" subtitle={`${entities.length} active · color by health`} />
      <div className="mc-card accent">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 10,
        }}>
          {entities.map(e => {
            const color =
              e.health === 'healthy' ? 'var(--green)' :
              e.health === 'action'  ? 'var(--red)'   :
                                       'var(--amber)'
            return (
              <a
                key={e.id}
                href={`/companies/${e.id}`}
                className="mc-card"
                style={{
                  padding: '14px 16px',
                  textDecoration: 'none', color: 'inherit',
                  borderRadius: 14,
                  borderLeft: `3px solid ${color}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '.06em', fontFamily: 'var(--mo)' }}>
                    {e.type ?? '—'}
                  </span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}
                     title={e.name}>
                  {e.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--dim)', fontFamily: 'var(--mo)' }}
                     title={fmtMoneyExact(e.balance)}>
                  {fmtMoney(e.balance)}
                </div>
              </a>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Top Revenue Entities ────────────────────────────────────────────────

export function TopRevenueEntities({ entities }: { entities: Array<{ id: string; name: string; revenue: number }> }) {
  if (entities.length === 0) {
    return (
      <section style={{ marginBottom: 28 }}>
        <SectionHeader title="Top Revenue · 90d" subtitle="— link accounts to populate" />
        <div className="mc-card accent">
          <div style={{ padding: '18px 0', fontSize: 13, color: 'var(--dim)', textAlign: 'center', maxWidth: 560, margin: '0 auto', lineHeight: 1.55 }}>
            Revenue rollup requires <code style={{ fontFamily: 'var(--mo)', color: 'var(--orange)' }}>financial_accounts.entity_id</code> populated. Once each bank account is linked to an entity, 90-day deposits roll up here automatically.
          </div>
        </div>
      </section>
    )
  }
  const max = entities[0]?.revenue ?? 1
  return (
    <section style={{ marginBottom: 28 }} data-source="financial_transactions,entity_ownership">
      <SectionHeader title="Top Revenue · 90d" subtitle={`top ${entities.length} entities`} />
      <div className="mc-card accent">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entities.map((e, i) => (
            <div key={e.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr 90px', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: 'var(--orange)', fontFamily: 'var(--mo)', fontWeight: 700 }}>#{i + 1}</span>
              <div>
                <div style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.name}
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${(e.revenue / max) * 100}%`, height: '100%', background: 'var(--grad)', borderRadius: 3 }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontFamily: 'var(--mo)', color: 'var(--green)', textAlign: 'right', fontWeight: 700 }}
                    title={fmtMoneyExact(e.revenue)}>
                {fmtMoney(e.revenue)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Risk Flags ────────────────────────────────────────────────────────

export function RiskFlags({ entities }: { entities: EntityTile[] }) {
  const risks = entities.filter(e => e.health !== 'healthy').slice(0, 5)
  if (risks.length === 0) {
    return (
      <section style={{ marginBottom: 28 }}>
        <SectionHeader title="Risk Flags" subtitle="all clear" />
        <div className="mc-card accent">
          <div style={{ padding: '22px 0', textAlign: 'center', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
            ✓ No entities flagged. All active entities have balance &gt; 0 and clean task state.
          </div>
        </div>
      </section>
    )
  }
  return (
    <section style={{ marginBottom: 28 }} data-source="entity_ownership,tasks">
      <SectionHeader title="Risk Flags" subtitle={`${risks.length} entit${risks.length === 1 ? 'y' : 'ies'} need attention`} />
      <div className="mc-card accent">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {risks.map(r => {
            const tone = r.health === 'action' ? 'var(--red)' : 'var(--amber)'
            return (
              <div key={r.id} style={{
                display: 'grid', gridTemplateColumns: '12px 1fr auto auto', gap: 12, alignItems: 'center',
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderLeft: `3px solid ${tone}`,
                borderRadius: 6,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone }} />
                <span style={{ fontSize: 13, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.name}
                </span>
                <span style={{ fontSize: 10, color: tone, textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: 'var(--mo)', fontWeight: 700 }}>
                  {r.health === 'action' ? 'Act' : 'Watch'}
                </span>
                <span style={{ fontSize: 12, fontFamily: 'var(--mo)', color: 'var(--dim)' }}>
                  {fmtMoney(r.balance)}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Shared section header (matches the rest of the page) ───────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="section-header">
      <div className="section-header-left">
        <h2 className="section-title">{title}</h2>
        {subtitle && <span className="achieve-count">{subtitle}</span>}
      </div>
    </div>
  )
}

function FlowStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color }}>
        {value}
      </div>
    </div>
  )
}
