/**
 * Real-data replacement for the stripped demo HTML blocks on /finance.
 * Every number rendered here traces to a live Supabase query:
 *   - Net Worth donut + 4 bucket cards  ← getPortfolioAllocation
 *   - Business Entities grid             ← entity_ownership + financial_accounts
 *   - Real Estate Portfolio grid         ← property_assets (live Zestimate)
 * No hardcoded "YoY" deltas or "On Track" badges unless we have the data.
 */
import { fmtMoney, fmtMoneyExact, fmtPct } from '../../lib/format'

interface PortfolioBucket { key: string; label: string; value: number; color: string }

// ─── TRUE NET WORTH (real) ─────────────────────────────────────────────

export function RealNetWorth({
  buckets, totalAssets, totalDebt, netWorth, propertyCount, accountCount,
}: {
  buckets: PortfolioBucket[]
  totalAssets: number
  totalDebt: number
  netWorth: number
  propertyCount: number
  accountCount: number
}) {
  // Map to real accent colors from the palette
  const paintOf: Record<string, { color: string; grad: string; glow: string }> = {
    realEstate: { color: 'var(--green)',  grad: 'linear-gradient(135deg, var(--green), var(--cyan))',  glow: '#10b98140' },
    cash:       { color: 'var(--amber)',  grad: 'linear-gradient(135deg, var(--amber), var(--orange))', glow: '#f59e0b40' },
    brokerage:  { color: 'var(--purple)', grad: 'linear-gradient(135deg, var(--purple), var(--pink))', glow: '#8b5cf640' },
  }

  // Build donut with real percentages
  const R = 36
  const CIRC = 2 * Math.PI * R
  let offset = 0
  const segments = buckets.map(b => {
    const pct = totalAssets > 0 ? b.value / totalAssets : 0
    const len = pct * CIRC
    const seg = { ...b, pct, len, start: offset }
    offset += len
    return seg
  })

  return (
    <div className="section" data-source="financial_accounts,property_assets">
      <div className="section-title">TRUE NET WORTH</div>
      <div className="section-subtitle">{fmtMoneyExact(netWorth)} · Multi-Asset Allocation · Live</div>

      <div className="mc-card accent" style={{ marginTop: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 36, alignItems: 'center' }}>
          {/* Donut */}
          <div style={{ position: 'relative', width: 260, height: 260, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width={260} height={260} viewBox="-90 -90 180 180" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={0} cy={0} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={26} />
              {segments.map(s => (
                <circle
                  key={s.key}
                  cx={0} cy={0} r={R}
                  fill="none"
                  stroke={paintOf[s.key]?.color ?? 'var(--orange)'}
                  strokeWidth={26}
                  strokeDasharray={`${s.len} ${CIRC - s.len}`}
                  strokeDashoffset={-s.start}
                />
              ))}
            </svg>
            <div style={{
              position: 'absolute', width: 168, height: 168, borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,23,42,0.98))',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{
                fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)',
                background: 'var(--grad-metric)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}>
                {fmtMoney(netWorth)}
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, letterSpacing: '0.1em', fontWeight: 600, textTransform: 'uppercase' }}>
                Net Worth
              </div>
            </div>
          </div>

          {/* Breakdown cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {segments.map(s => {
              const paint = paintOf[s.key] ?? paintOf.realEstate
              return (
                <div key={s.key} style={{
                  padding: '16px 18px',
                  background: `linear-gradient(135deg, rgba(15,23,42,0.4), rgba(15,23,42,0.6))`,
                  border: `1px solid ${paint.glow}`,
                  borderRadius: 14,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                    background: paint.grad, borderRadius: '14px 14px 0 0',
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{s.label}</span>
                    <span style={{ fontSize: 10, color: paint.color, fontFamily: 'var(--mo)', fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.04)' }}>
                      {fmtPct(s.pct * 100)}
                    </span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--t1)' }}
                       title={fmtMoneyExact(s.value)}>
                    {fmtMoney(s.value)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, fontFamily: 'var(--mo)', letterSpacing: '0.04em' }}>
                    {s.key === 'realEstate' && `${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'}`}
                    {s.key === 'cash'       && `${accountCount} account${accountCount === 1 ? '' : 's'}`}
                    {s.key === 'brokerage'  && 'live balances'}
                  </div>
                </div>
              )
            })}
            {/* Debt tile */}
            {totalDebt > 0 && (
              <div style={{
                padding: '16px 18px',
                background: 'linear-gradient(135deg, rgba(239,68,68,0.05), rgba(239,68,68,0.1))',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 14, position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: 'linear-gradient(135deg, var(--red), var(--orange))',
                  borderRadius: '14px 14px 0 0',
                }} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--red)' }}>Total Debt</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--red)' }}>
                  {fmtMoney(totalDebt)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, fontFamily: 'var(--mo)' }}>
                  credit + loans
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── BUSINESS ENTITIES (real rollup) ──────────────────────────────────

interface EntityRow {
  id: string
  entity_name: string
  entity_type: string | null
  assets: number
  debt: number
  account_count: number
}

export function RealBusinessEntities({ entities }: { entities: EntityRow[] }) {
  const operating = entities.filter(e => e.account_count > 0).slice(0, 8)
  if (operating.length === 0) {
    return (
      <div className="section" data-source="entity_ownership">
        <div className="section-title">Business Entities</div>
        <div className="section-subtitle">no entities with linked accounts yet</div>
        <div className="mc-card accent" style={{ marginTop: 16, padding: '24px 20px', textAlign: 'center', color: 'var(--dim)', fontSize: 13 }}>
          Link a bank account to an entity to see the rollup here. All 12 registered entities
          are visible on the Entity Map → /settings/entities.
        </div>
      </div>
    )
  }

  const typeColor: Record<string, string> = {
    LLC: 'var(--orange)',
    'S-Corp': 'var(--pink)',
    'C-Corp': 'var(--pink)',
    LP: 'var(--amber)',
    Trust: 'var(--purple)',
    Person: 'var(--cyan)',
  }

  return (
    <div className="section" data-source="entity_ownership,financial_accounts">
      <div className="section-title">Business Entities</div>
      <div className="section-subtitle">{operating.length} operating · live balances from linked accounts</div>

      <div style={{
        marginTop: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 12,
      }}>
        {operating.map(e => {
          const net = e.assets - e.debt
          const color = typeColor[e.entity_type ?? ''] ?? 'var(--orange)'
          return (
            <a key={e.id} href={`/companies/${e.id}`} className="mc-card accent" style={{
              padding: '18px 20px', textDecoration: 'none', color: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color, fontFamily: 'var(--mo)',
                  textTransform: 'uppercase', letterSpacing: '.06em',
                  padding: '3px 8px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}40`,
                }}>
                  {e.entity_type ?? '—'}
                </span>
                <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                  {e.account_count} acct{e.account_count === 1 ? '' : 's'}
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {e.entity_name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    Assets
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mo)' }}
                       title={fmtMoneyExact(e.assets)}>
                    {fmtMoney(e.assets)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    Debt
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: e.debt > 0 ? 'var(--red)' : 'var(--dim)', fontFamily: 'var(--mo)' }}
                       title={fmtMoneyExact(e.debt)}>
                    {e.debt > 0 ? fmtMoney(e.debt) : '—'}
                  </div>
                </div>
              </div>
              <div style={{
                paddingTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 11, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>Net</span>
                <span style={{
                  fontSize: 16, fontWeight: 700, fontFamily: 'var(--mo)',
                  color: net >= 0 ? 'var(--t1)' : 'var(--red)',
                }} title={fmtMoneyExact(net)}>
                  {fmtMoney(net)}
                </span>
              </div>
            </a>
          )
        })}
      </div>
    </div>
  )
}

// ─── REAL ESTATE PORTFOLIO (real Zestimate) ──────────────────────────

interface Property {
  id: string
  address: string | null
  city: string | null
  state: string | null
  property_type: string | null
  current_value: number | null
  zestimate: number | null
  zestimate_updated_at: string | null
  mortgage_balance: number | null
  equity: number | null
  is_rental: boolean | null
}

export function RealRealEstate({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return (
      <div className="section" data-source="property_assets">
        <div className="section-title">Real Estate Portfolio</div>
        <div className="section-subtitle">no properties yet</div>
      </div>
    )
  }

  const totalValue = properties.reduce((s, p) => s + Number(p.current_value ?? p.zestimate ?? 0), 0)
  const totalDebt  = properties.reduce((s, p) => s + Number(p.mortgage_balance ?? 0), 0)
  const totalEquity = totalValue - totalDebt

  return (
    <div className="section" data-source="property_assets">
      <div className="section-title">Real Estate Portfolio</div>
      <div className="section-subtitle">
        {properties.length} propert{properties.length === 1 ? 'y' : 'ies'} ·
        {' '}{fmtMoney(totalValue)} total ·
        {' '}{fmtMoney(totalEquity)} equity
      </div>

      <div style={{
        marginTop: 16,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 12,
      }}>
        {properties.map(p => {
          const value = Number(p.current_value ?? p.zestimate ?? 0)
          const mort  = Number(p.mortgage_balance ?? 0)
          const equity = value - mort
          const zUpdated = p.zestimate_updated_at ? new Date(p.zestimate_updated_at) : null
          const isFresh = zUpdated && (Date.now() - zUpdated.getTime()) < 14 * 86400000
          return (
            <div key={p.id} className="mc-card accent" style={{
              padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', lineHeight: 1.3 }}>
                    {p.city ?? '—'}{p.state ? `, ${p.state}` : ''}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                       title={p.address ?? ''}>
                    {p.address ?? '—'}
                  </div>
                </div>
                {p.is_rental && (
                  <span style={{
                    fontSize: 9, padding: '2px 8px', borderRadius: 12,
                    background: 'rgba(16,185,129,0.12)', color: 'var(--green)',
                    fontFamily: 'var(--mo)', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                  }}>Rental</span>
                )}
              </div>

              <div>
                <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>
                  Current Value
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--t1)' }}
                     title={fmtMoneyExact(value)}>
                  {fmtMoney(value)}
                </div>
                <div style={{ fontSize: 10, color: isFresh ? 'var(--green)' : 'var(--amber)', marginTop: 3, fontFamily: 'var(--mo)' }}>
                  {zUpdated ? `Zestimate · ${zUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'no Zestimate yet'}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    Mortgage
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: mort > 0 ? 'var(--red)' : 'var(--dim)', fontFamily: 'var(--mo)' }}>
                    {mort > 0 ? fmtMoney(mort) : 'Owned free'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--dim)', fontFamily: 'var(--mo)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    Equity
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green)', fontFamily: 'var(--mo)' }}
                       title={fmtMoneyExact(equity)}>
                    {fmtMoney(equity)}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
