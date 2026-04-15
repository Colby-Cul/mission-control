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
import { getProperties, getUserProfile } from '../lib/queries'

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
  const [properties, profile] = await Promise.all([
    getProperties().catch(() => []),
    getUserProfile().catch(() => null),
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
          return (
            <Link key={p.id} href={`/properties/${slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <SpecCard accent dataSource="property_assets" style={{ cursor: 'pointer', transition: 'transform 0.25s', display: 'block' }}>
                {/* Photo placeholder */}
                <div style={{
                  height: 140, borderRadius: '12px 12px 0 0', marginBottom: 16, overflow: 'hidden',
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(139,92,246,0.15))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36,
                }}>
                  🏠
                </div>
                <div style={{ padding: '0 4px 4px' }}>
                  <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    {p.property_type ?? 'Residential'} · {p.is_rental ? 'Rental' : 'Owner-occupied'}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{p.name ?? p.address ?? 'Unnamed Property'}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 12 }}>{p.address ?? '—'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
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
                  {/* Equity bar */}
                  <div style={{ marginTop: 12 }}>
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

      {/* Portfolio Map - Coming Soon */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Portfolio Map"
          reason="Geographic pins for all properties with value overlays."
          icon="🗺️"
          dataSource="coming-soon:property_assets.geocoded"
          skeleton="chart"
          minHeight={220}
        />
      </div>

      {/* Equity Growth */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Equity Growth Timeline"
          reason="Line chart of equity accumulation across all properties over time."
          icon="📈"
          dataSource="coming-soon:kpi_snapshots.equity"
          skeleton="chart"
          minHeight={200}
        />
      </div>
    </>
  )
}
