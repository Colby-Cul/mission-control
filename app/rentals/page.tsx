/**
 * Rentals — income properties portfolio.
 * Hero metric: Monthly Rental Income
 * Animation: property pins on abstract map-grid; pin color = occupancy status
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getRentalProperties,
} from '../lib/queries'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Rental',      description: 'First rental property added to the portfolio.',       xp: 150, progress: 100, icon: '🏠', earned: true  },
  { name: '3 Doors',           description: 'Portfolio reached 3+ rental doors.',                   xp: 300, progress: 100, icon: '🔑', earned: true  },
  { name: 'Cash Flow+',        description: 'All rentals generating positive monthly cash flow.',    xp: 400, progress: 60,  icon: '💵', earned: false },
  { name: 'Appreciation Pro',  description: 'Portfolio appreciated 20%+ since acquisition.',        xp: 350, progress: 100, icon: '📈', earned: true  },
  { name: '90% Occupancy',     description: 'Maintained 90%+ occupancy across all rentals.',        xp: 250, progress: 70,  icon: '📅', earned: false },
  { name: 'High ADR',          description: 'Average daily rate above $400 across the portfolio.',   xp: 200, progress: 80,  icon: '⭐', earned: false },
  { name: 'Zero Maintenance',  description: 'No open maintenance requests for 30 days.',             xp: 150, progress: 10,  icon: '🔧', earned: false },
  { name: 'Top Rated',         description: 'All properties rated 4.9+ on booking platforms.',      xp: 500, progress: 30,  icon: '🌟', earned: false },
]

export default async function RentalsPage() {
  const rentals = await getRentalProperties().catch(() => [])

  const monthlyRent = rentals.reduce((s, p: any) => s + Number(p.mortgage_payment ?? 0), 0)
  const totalValue = rentals.reduce((s, p: any) => s + Number(p.current_value ?? 0), 0)
  const totalEquity = rentals.reduce((s, p: any) => s + Number(p.owned_equity ?? p.equity ?? 0), 0)
  const totalExpenses = rentals.reduce((s, p: any) => s + Number(p.monthly_expenses ?? 0), 0)
  const netMonthly = monthlyRent - totalExpenses

  // KPIs based on available fields
  // monthly_payment = gross rent estimate; monthly_expenses = running costs
  const xpEarned = DEFAULT_ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="⌂ RENTALS · INCOME PROPERTY PORTFOLIO"
        greeting="Your short-term rental empire."
        primaryMetric={USD(monthlyRent)}
        metricSubtitle="Monthly Rental Income · mortgage payments"
        kpiCards={[
          { label: 'Occupancy Rate', value: '—',                delta: 'wire bookings table', deltaPositive: false },
          { label: 'ADR',            value: '—',                delta: 'wire bookings table', deltaPositive: false },
          { label: 'RevPAR',         value: '—',                delta: 'wire bookings table', deltaPositive: false },
          { label: 'Properties',     value: String(rentals.length), delta: 'active rentals',  deltaPositive: true },
        ]}
        playerCard={{
          name: 'Colby Culbertson',
          role: 'CEO · Property',
          level: 12,
          xpCurrent: xpEarned,
          xpNext: xpEarned + 500,
          stats: [
            { key: 'Properties', value: String(rentals.length) },
            { key: 'Total Value', value: USD(totalValue) },
            { key: 'Equity',      value: USD(totalEquity) },
            { key: 'Expenses',    value: USD(totalExpenses) + '/mo' },
          ],
        }}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={DEFAULT_ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* Portfolio KPI Strip */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Portfolio Overview</h2>
            <span className="achieve-count">{rentals.length} properties</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} data-source="property_assets">
          <SpecCard accent dataSource="property_assets.current_value">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Total Portfolio Value</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(totalValue)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Zillow estimates · {rentals.length} properties</div>
          </SpecCard>
          <SpecCard accent dataSource="property_assets.owned_equity">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Owned Equity</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--orange)' }}>{USD(totalEquity)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Pro-rated by ownership %</div>
          </SpecCard>
          <SpecCard accent dataSource="property_assets.monthly_expenses">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Monthly Expenses</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--red)' }}>{USD(totalExpenses)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Running costs across portfolio</div>
          </SpecCard>
          <SpecCard accent dataSource="property_assets">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Net Monthly</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: netMonthly >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {netMonthly >= 0 ? '+' : ''}{USD(netMonthly)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Revenue - expenses</div>
          </SpecCard>
        </div>
      </section>

      {/* Property Cards Grid */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Properties</h2>
          </div>
        </div>
        {rentals.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }} data-source="property_assets">
            {rentals.map((p: any) => {
              const valPct = p.purchase_price
                ? Math.round(((Number(p.current_value) - Number(p.purchase_price)) / Number(p.purchase_price)) * 100)
                : null
              return (
                <SpecCard key={p.id} accent dataSource="property_assets">
                  {/* Photo placeholder */}
                  <div
                    style={{
                      height: 140,
                      borderRadius: 12,
                      marginBottom: 14,
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(139,92,246,0.12))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border)',
                      fontSize: 36,
                    }}
                  >
                    🏡
                  </div>

                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                    {p.address}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 12 }}>
                    {p.city}, {p.state} {p.zip} · {p.entity_name}
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Current Value</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{USD(Number(p.current_value))}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Owned Equity</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--orange)' }}>{USD(Number(p.owned_equity ?? p.equity ?? 0))}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Monthly Expenses</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--red)' }}>{USD(Number(p.monthly_expenses ?? 0))}</div>
                    </div>
                    <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>Ownership</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--purple)' }}>{Number(p.ownership_pct)}%</div>
                    </div>
                  </div>

                  {/* Appreciation bar */}
                  {valPct !== null && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 4 }}>
                        <span>Appreciation</span>
                        <span style={{ color: valPct >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mo)', fontWeight: 600 }}>
                          {valPct >= 0 ? '+' : ''}{valPct}%
                        </span>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, Math.abs(valPct))}%`, background: valPct >= 0 ? 'var(--green)' : 'var(--red)', borderRadius: 2 }} />
                      </div>
                    </div>
                  )}

                  {/* Source badge */}
                  {p.valuation_source && (
                    <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 10, fontFamily: 'var(--mo)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Valuation: {p.valuation_source.replace(/_/g, ' ')}
                      {p.zestimate_updated_at && ` · ${new Date(p.zestimate_updated_at).toLocaleDateString()}`}
                    </div>
                  )}
                </SpecCard>
              )
            })}
          </div>
        ) : (
          <ComingSoon title="Properties" reason="No rental properties found in property_assets." icon="🏠" dataSource="property_assets" skeleton="table" />
        )}
      </section>

      {/* Booking Calendar + Maintenance + Reviews — all Coming Soon (tables not present) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Booking Calendar"
          reason="Wire bookings table (Lodgify or direct) to see occupancy calendar and ADR/RevPAR."
          icon="📅"
          dataSource="coming-soon:bookings"
          skeleton="chart"
        />
        <ComingSoon
          title="Maintenance Requests"
          reason="Open maintenance tickets from maintenance_requests table. Not yet populated."
          icon="🔧"
          dataSource="coming-soon:maintenance_requests"
          skeleton="table"
        />
        <ComingSoon
          title="Recent Reviews"
          reason="Guest reviews from property_reviews table. Connect Lodgify to activate."
          icon="⭐"
          dataSource="coming-soon:property_reviews"
          skeleton="table"
        />
      </div>

      {/* Upcoming bookings KPI */}
      <ComingSoon
        title="Upcoming Bookings (7d)"
        reason="Connect Lodgify via bookings table to see check-ins, check-outs, and guest details."
        icon="🏨"
        dataSource="coming-soon:bookings.checkin_date"
        skeleton="table"
        minHeight={120}
      />
    </>
  )
}
