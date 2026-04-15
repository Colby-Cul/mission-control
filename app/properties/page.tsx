/**
 * Properties Index — total real estate portfolio overview.
 * Hero metric: Total Property Portfolio Value
 * Animation: terrain with property value bars rising from ground
 * Sources: property_assets
 */
import Link from 'next/link'
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getProperties, getUserProfile, getPropertyOwnershipMap, getPortfolioGeo, getNetWorthTimeline } from '../lib/queries'
import PropertyQuickActions from '../_components/PropertyQuickActions'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const ACHIEVEMENTS = [
  { name: 'First Property',     description: 'Added your first property to the portfolio.',  xp: 200, progress: 100, icon: '🏠', earned: true  },
  { name: '3 Doors',            description: 'Portfolio spans 3+ properties.',               xp: 350, progress: 100, icon: '🔑', earned: true  },
  { name: 'Cash-Flow Positive', description: 'All properties cash-flow positive.',           xp: 400, progress: 80,  icon: '💵', earned: false },
  { name: 'Appreciation Pro',   description: 'Portfolio appreciated 10%+ in a year.',        xp: 500, progress: 60,  icon: '📈', earned: false },
  { name: 'Equity Milestone',   description: 'Total equity exceeds $500K.',                  xp: 300, progress: 100, icon: '💎', earned: true  },
  { name: '10-Year Hold',       description: 'Held a property for 10+ years.',               xp: 600, progress: 20,  icon: '⏰', earned: false },
  { name: 'Portfolio Empire',   description: 'Real estate portfolio exceeds $3M.',           xp: 750, progress: 70,  icon: '🏙️', earned: false },
  { name: 'Zero Vacancy',       description: 'All rental units occupied simultaneously.',    xp: 400, progress: 50,  icon: '🎯', earned: false },
]

function slugify(name: string, id: string) {
  return name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : id
}

export default async function PropertiesPage() {
  const [properties, profile, ownershipMap, geo, nwTimeline] = await Promise.all([
    getProperties().catch(() => []),
    getUserProfile().catch(() => null),
    getPropertyOwnershipMap().catch(() => ({})),
    getPortfolioGeo().catch(() => []),
    getNetWorthTimeline().catch(() => []),
  ])

  const totalValue    = properties.reduce((s: number, p: any) => s + Number(p.current_value    ?? 0), 0)
  const totalEquity   = properties.reduce((s: number, p: any) => s + Number(p.equity           ?? 0), 0)
  const totalMortgage = properties.reduce((s: number, p: any) => s + Number(p.mortgage_balance ?? 0), 0)

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Properties', value: String(properties.length) },
      { key: 'Total Value', value: '$' + (totalValue / 1e6).toFixed(1) + 'M' },
      { key: 'Equity', value: '$' + (totalEquity / 1e3).toFixed(0) + 'K' },
      { key: 'XP', value: (profile.xp ?? 0).toLocaleString() },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="⌂ PROPERTIES · REAL ESTATE PORTFOLIO"
        greeting="Portfolio Overview"
        primaryMetric={USD(totalValue)}
        metricSubtitle={`${properties.length} properties · ${USD(totalEquity)} equity`}
        kpiCards={[
          { label: 'Total Value',    value: USD(totalValue),    deltaPositive: true },
          { label: 'Total Equity',   value: USD(totalEquity),   deltaPositive: true },
          { label: 'Total Mortgage', value: USD(totalMortgage), deltaPositive: false },
          { label: 'Properties',     value: String(properties.length) },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Value',    value: USD(totalValue),    color: 'var(--orange)' },
          { label: 'Total Equity',   value: USD(totalEquity),   color: 'var(--green)'  },
          { label: 'Total Mortgage', value: USD(totalMortgage), color: 'var(--red)'    },
          { label: 'Properties',     value: String(properties.length), color: 'var(--purple)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="property_assets">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color, wordBreak: 'break-all' }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Property cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
        {properties.map((p: any) => {
          const slug = p.slug ?? slugify(p.name ?? p.address ?? '', p.id)
          const equityPct = p.current_value
            ? Math.round((Number(p.equity ?? 0) / Number(p.current_value)) * 100)
            : 0
          // Derived fields
          const monthlyPayment  = Number(p.mortgage_payment ?? 0)
          const mortgageRate    = p.mortgage_rate != null ? Number(p.mortgage_rate) : null
          const occupancy       = p.occupancy_pct != null ? Number(p.occupancy_pct) : null
          const adr             = p.adr != null ? Number(p.adr) : null
          const revpar          = p.revpar != null ? Number(p.revpar) : null
          const monthlyRent     = p.monthly_rent != null ? Number(p.monthly_rent) : null
          const maintOpen       = Number(p.maintenance_open_count ?? 0)
          const stars           = p.last_review_stars != null ? Number(p.last_review_stars) : null
          const equityGrowthYtd = p.equity_growth_ytd != null ? Number(p.equity_growth_ytd) : null
          const photoUrl        = p.photo_url_primary ?? null

          return (
            <Link key={p.id} href={`/properties/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <SpecCard accent dataSource="property_assets" style={{ cursor: 'pointer', transition: 'transform 0.25s', display: 'block', padding: 0 }}>
                {/* Photo or gradient hero */}
                <div style={{
                  height: 140, borderRadius: '12px 12px 0 0', overflow: 'hidden',
                  background: photoUrl ? 'none' : 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, position: 'relative',
                }}>
                  {photoUrl
                    ? <img src={photoUrl} alt={p.address ?? 'Property'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : '🏠'}
                  {/* Rental / Occupied badges + quick actions */}
                  <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 5, alignItems: 'center' }}>
                    {p.is_rental && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--mo)', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>RENTAL</span>
                    )}
                    {maintOpen > 0 && (
                      <span style={{ fontSize: 9, fontFamily: 'var(--mo)', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>{maintOpen} maint</span>
                    )}
                    <PropertyQuickActions
                      propertyId={p.id}
                      propertyName={p.name ?? p.address ?? ''}
                      slug={slug}
                    />
                  </div>
                  {stars != null && (
                    <div style={{ position: 'absolute', bottom: 8, left: 8, fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 5, backdropFilter: 'blur(4px)' }}>
                      {'★'.repeat(Math.round(stars))} {stars.toFixed(1)}
                    </div>
                  )}
                </div>
                <div style={{ padding: '14px 16px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {p.property_type ?? 'Residential'} · {p.is_rental ? 'Rental' : 'Owner-occupied'}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name ?? p.address ?? 'Unnamed Property'}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 6 }}>{p.city ?? ''}{p.city && p.state ? ', ' : ''}{p.state ?? ''}</div>
                  {/* Compact ownership line */}
                  {(() => {
                    const owners = (ownershipMap as any)[p.id] ?? []
                    if (!owners.length) return null
                    return (
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                        <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Owned by:</span>
                        {owners.map((o: any, i: number) => (
                          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                            <span style={{ fontWeight: 600, color: 'var(--orange)' }}>{o.entityName}</span>
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}> {o.pct}%</span>
                            {i < owners.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)' }}> · </span>}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

                  {/* Core 3-col KPI row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                      { label: 'VALUE',    value: USD(Number(p.current_value ?? 0)),    color: 'var(--orange)' },
                      { label: 'EQUITY',   value: USD(Number(p.equity ?? 0)),           color: 'var(--green)'  },
                      { label: 'MORTGAGE', value: USD(Number(p.mortgage_balance ?? 0)), color: 'var(--red)'    },
                    ].map(stat => (
                      <div key={stat.label}>
                        <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.1em' }}>{stat.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--mo)', color: stat.color, marginTop: 2 }}>{stat.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mortgage detail row */}
                  {(monthlyPayment > 0 || mortgageRate != null) && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11 }}>
                      {monthlyPayment > 0 && (
                        <span style={{ color: 'var(--dim)' }}>
                          Payment: <span style={{ color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{USD(monthlyPayment)}/mo</span>
                        </span>
                      )}
                      {mortgageRate != null && (
                        <span style={{ color: 'var(--dim)' }}>
                          Rate: <span style={{ color: 'var(--amber)', fontFamily: 'var(--mo)' }}>{mortgageRate.toFixed(2)}%</span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rental KPIs (if is_rental) */}
                  {p.is_rental && (monthlyRent != null || occupancy != null || adr != null || revpar != null) && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 10, padding: '8px', background: 'rgba(16,185,129,0.06)', borderRadius: 6, border: '1px solid rgba(16,185,129,0.12)' }}>
                      {monthlyRent != null && (
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.08em' }}>RENT/MO</div>
                          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--mo)', color: 'var(--green)', marginTop: 2 }}>{USD(monthlyRent)}</div>
                        </div>
                      )}
                      {occupancy != null && (
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.08em' }}>OCC%</div>
                          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--mo)', color: occupancy >= 80 ? 'var(--green)' : 'var(--amber)', marginTop: 2 }}>{occupancy.toFixed(0)}%</div>
                        </div>
                      )}
                      {adr != null && (
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.08em' }}>ADR</div>
                          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--mo)', color: 'var(--amber)', marginTop: 2 }}>${adr.toFixed(0)}</div>
                        </div>
                      )}
                      {revpar != null && (
                        <div>
                          <div style={{ fontSize: 9, color: 'var(--dim)', letterSpacing: '0.08em' }}>RevPAR</div>
                          <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--mo)', color: 'var(--purple)', marginTop: 2 }}>${revpar.toFixed(0)}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Next booking + equity growth YTD */}
                  {(p.next_booking_date != null || equityGrowthYtd != null) && (
                    <div style={{ display: 'flex', gap: 12, marginBottom: 10, fontSize: 11 }}>
                      {p.next_booking_date && (
                        <span style={{ color: 'var(--dim)' }}>
                          Next booking: <span style={{ color: 'var(--t2)', fontFamily: 'var(--mo)' }}>{String(p.next_booking_date)}</span>
                        </span>
                      )}
                      {equityGrowthYtd != null && (
                        <span style={{ color: 'var(--dim)' }}>
                          Equity YTD: <span style={{ color: equityGrowthYtd >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mo)' }}>
                            {equityGrowthYtd >= 0 ? '+' : ''}{USD(equityGrowthYtd)}
                          </span>
                        </span>
                      )}
                    </div>
                  )}

                  {/* Equity bar */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
                      <span>Equity</span><span style={{ fontFamily: 'var(--mo)', color: 'var(--green)' }}>{equityPct}%</span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${equityPct}%`, background: 'linear-gradient(90deg,var(--orange),var(--green))', borderRadius: 2 }} />
                    </div>
                  </div>
                </div>
              </SpecCard>
            </Link>
          )
        })}
      </div>

      {/* Portfolio Geo Grid — derived from property_assets.city/state */}
      <SpecCard accent dataSource="property_assets.city,state" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Portfolio by Region</div>
          <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{((geo as any[]) ?? []).length} region{((geo as any[]) ?? []).length === 1 ? '' : 's'}</span>
        </div>
        {((geo as any[]) ?? []).length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>No geographic data available.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {((geo as any[]) ?? []).map((g: any) => (
              <div key={g.region} style={{ padding: 12, background: 'rgba(255,255,255,0.025)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 18 }}>📍</span>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{g.region}</div>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(g.value)}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>
                  {g.count} propert{g.count === 1 ? 'y' : 'ies'} · {g.rentals} rental{g.rentals === 1 ? '' : 's'}
                </div>
              </div>
            ))}
          </div>
        )}
      </SpecCard>

      {/* Equity Growth Timeline — derived from kpi_snapshots.net_worth as proxy */}
      <SpecCard accent dataSource="kpi_snapshots.net_worth" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Net Worth Timeline (proxy for equity growth)</div>
          <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{((nwTimeline as any[]) ?? []).length} snapshots</span>
        </div>
        {((nwTimeline as any[]) ?? []).length < 2 ? (
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>Need at least 2 snapshots in kpi_snapshots for trend.</div>
        ) : (() => {
          const tl = (nwTimeline as any[]) ?? []
          const maxV = Math.max(...tl.map((r: any) => Number(r.value)))
          const minV = Math.min(...tl.map((r: any) => Number(r.value)))
          const range = maxV - minV || 1
          return (
            <>
              <svg width="100%" height="100" viewBox={`0 0 ${tl.length * 20} 100`} preserveAspectRatio="none" style={{ marginBottom: 8 }}>
                <polyline
                  fill="none"
                  stroke="var(--green)"
                  strokeWidth={2}
                  points={tl.map((r: any, i: number) => `${i * 20},${90 - ((Number(r.value) - minV) / range) * 80}`).join(' ')}
                />
                {tl.map((r: any, i: number) => (
                  <circle key={i} cx={i * 20} cy={90 - ((Number(r.value) - minV) / range) * 80} r={2} fill="var(--green)" />
                ))}
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                <span>{new Date(tl[0].as_of).toLocaleDateString([], { month: 'short', year: '2-digit' })} · {USD(Number(tl[0].value))}</span>
                <span>{new Date(tl[tl.length - 1].as_of).toLocaleDateString([], { month: 'short', year: '2-digit' })} · {USD(Number(tl[tl.length - 1].value))}</span>
              </div>
            </>
          )
        })()}
      </SpecCard>
    </>
  )
}
