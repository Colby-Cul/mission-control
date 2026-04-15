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
import RentalsWidgets from './RentalsWidgets'
import LodgifyWidgets from './LodgifyWidgets'
import {
  getRentalProperties,
  getRentalBookings,
  getPropertyOwnershipMap,
} from '../lib/queries'
import {
  isLodgifyConfigured,
  getLodgifyProperties,
  getLodgifyBookings,
  getLodgifyPortfolioKPIs,
  getLodgifyOccupancy,
  getLodgifyRevenue,
  getLodgifyUpcomingCheckins,
  getLodgifyReviews,
  type LodgifyBooking,
} from '../lib/lodgify'

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
  const lodgifyOn = isLodgifyConfigured()
  const [
    rentals, supaBookings, ownershipMap,
    lodgifyProperties, lodgifyBookings, portfolioKPIs, occupancy12, revenue12, upcomingCheckins, reviews,
  ] = await Promise.all([
    getRentalProperties().catch(() => []),
    getRentalBookings().catch(() => []),
    getPropertyOwnershipMap().catch(() => ({})),
    lodgifyOn ? getLodgifyProperties().catch(() => []) : Promise.resolve([]),
    lodgifyOn ? getLodgifyBookings({ stayFilter: 'All', max: 1000 }).catch(() => []) : Promise.resolve([] as LodgifyBooking[]),
    lodgifyOn ? getLodgifyPortfolioKPIs().catch(() => null) : Promise.resolve(null),
    lodgifyOn ? getLodgifyOccupancy({ monthsBack: 12 }).catch(() => null) : Promise.resolve(null),
    lodgifyOn ? getLodgifyRevenue({ monthsBack: 12 }).catch(() => null) : Promise.resolve(null),
    lodgifyOn ? getLodgifyUpcomingCheckins({ days: 7 }).catch(() => []) : Promise.resolve([]),
    lodgifyOn ? getLodgifyReviews().catch(() => null) : Promise.resolve(null),
  ])

  // Replace Supabase rental_bookings with the live Lodgify feed when available so
  // the existing RentalsWidgets (charts/tables) stays the body source of truth.
  const bookings = (lodgifyOn && lodgifyBookings.length > 0)
    ? lodgifyBookings.map(b => ({
        id: b.id,
        property_id: b.property_id,
        arrival: b.arrival,
        departure: b.departure,
        source: b.source,
        source_text: b.source_text,
        total_amount: b.total_amount,
        status: b.status,
        currency_code: b.currency_code,
        guest: b.guest,
        guest_name: b.guest?.name ?? null,
        guest_count: b.rooms?.[0]?.people ?? b.guest_count ?? 2,
        rooms: b.rooms,
      }))
    : supaBookings

  const monthlyRent = rentals.reduce((s, p: any) => s + Number(p.mortgage_payment ?? 0), 0)
  const totalValue = rentals.reduce((s, p: any) => s + Number(p.current_value ?? 0), 0)
  const totalEquity = rentals.reduce((s, p: any) => s + Number(p.owned_equity ?? p.equity ?? 0), 0)
  const totalExpenses = rentals.reduce((s, p: any) => s + Number(p.monthly_expenses ?? 0), 0)
  const netMonthly = monthlyRent - totalExpenses

  // Hero KPIs: prefer the live Lodgify portfolio KPIs; fall back to sums across bookings[]
  const totalRevenue = bookings.reduce((s: number, b: any) => s + Number(b.total_amount ?? 0), 0)
  function nightsBetweenServer(a: string, d: string) {
    return Math.max(1, Math.round((new Date(d).getTime() - new Date(a).getTime()) / 86400000))
  }
  const totalNights = bookings.reduce((s: number, b: any) => s + nightsBetweenServer(b.arrival, b.departure), 0)
  const availableNights = Math.max(1, (lodgifyProperties.length || 2)) * 365
  const heroADR    = portfolioKPIs ? Math.round(portfolioKPIs.adr)    : (totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0)
  const heroRevPAR = portfolioKPIs ? Math.round(portfolioKPIs.revpar) : (availableNights > 0 ? Math.round(totalRevenue / availableNights) : 0)
  const heroOcc    = portfolioKPIs ? (portfolioKPIs.occupancy * 100).toFixed(1) : (availableNights > 0 ? ((totalNights / availableNights) * 100).toFixed(1) : '—')
  const heroCheckins = upcomingCheckins?.length ?? 0

  // Hero primary metric = current-month rental revenue (sum of bookings arriving this month)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyRentalRevenue = (lodgifyOn && lodgifyBookings.length > 0)
    ? lodgifyBookings.filter(b => {
        const s = String(b.status ?? '').toLowerCase()
        const src = String(b.source ?? '').toLowerCase()
        if (s === 'declined' || s === 'cancelled' || s === 'canceled') return false
        if (src === 'oh' || src === 'ownerhold') return false
        return b.arrival?.slice(0, 7) === thisMonth
      }).reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
    : monthlyRent

  const xpEarned = DEFAULT_ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="⌂ RENTALS · INCOME PROPERTY PORTFOLIO"
        greeting="Your short-term rental empire."
        primaryMetric={USD(monthlyRentalRevenue)}
        metricSubtitle={lodgifyOn && lodgifyBookings.length > 0
          ? `Monthly rental revenue · Lodgify · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
          : 'Monthly Rental Income · mortgage payments'}
        kpiCards={[
          {
            label: 'Portfolio Occupancy',
            value: portfolioKPIs ? `${heroOcc}%` : (bookings.length > 0 ? `${heroOcc}%` : '—'),
            delta: portfolioKPIs ? `${portfolioKPIs.nightsBooked} nights / ${availableNights} avail` : (bookings.length > 0 ? `${totalNights} nights booked` : 'connect Lodgify'),
            deltaPositive: !!portfolioKPIs || bookings.length > 0,
          },
          {
            label: 'ADR',
            value: heroADR > 0 ? `$${heroADR.toLocaleString()}` : '—',
            delta: portfolioKPIs ? 'Lodgify · avg nightly' : (bookings.length > 0 ? 'avg nightly rate' : 'connect Lodgify'),
            deltaPositive: heroADR > 0,
          },
          {
            label: 'RevPAR',
            value: heroRevPAR > 0 ? `$${heroRevPAR.toLocaleString()}` : '—',
            delta: portfolioKPIs ? 'Lodgify · rev/avail night' : (bookings.length > 0 ? 'rev per avail night' : 'connect Lodgify'),
            deltaPositive: heroRevPAR > 0,
          },
          {
            label: 'Upcoming Check-ins',
            value: String(heroCheckins),
            delta: heroCheckins > 0 ? 'next 7 days' : 'none scheduled',
            deltaPositive: heroCheckins > 0,
          },
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
              // Live Lodgify per-property metrics.
              const lId = p.lodgify_property_id ?? (p.lodgify_id ? Number(p.lodgify_id) : null)
              const thisYear = new Date().getFullYear()
              const propBookings = lId ? lodgifyBookings.filter(b => b.property_id === Number(lId)) : []
              const revOnly = propBookings.filter(b => {
                const s = String(b.status ?? '').toLowerCase()
                const src = String(b.source ?? '').toLowerCase()
                if (s === 'declined' || s === 'cancelled' || s === 'canceled') return false
                if (src === 'oh' || src === 'ownerhold') return false
                return (b.total_amount ?? 0) > 0
              })
              const ytdRevenue = revOnly
                .filter(b => b.arrival?.slice(0, 4) === String(thisYear))
                .reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
              function nB(a: string, d: string) { return Math.max(1, Math.round((new Date(d).getTime() - new Date(a).getTime()) / 86400000)) }
              const propNights = revOnly.reduce((s, b) => s + nB(b.arrival, b.departure), 0)
              const propRev = revOnly.reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
              const propAdr = propNights > 0 ? Math.round(propRev / propNights) : 0
              const propOcc = propNights > 0 ? Math.round((propNights / 365) * 1000) / 10 : 0
              const propRevPAR = Math.round(propRev / 365)
              const nextCheckin = upcomingCheckins?.find(c => c.propertyId === Number(lId)) ?? null
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
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 6 }}>
                    {p.city}, {p.state} {p.zip} · {p.entity_name}
                  </div>
                  {/* Compact ownership line from entity_ownership_edges */}
                  {(() => {
                    const owners = (ownershipMap as any)[p.id] ?? []
                    if (!owners.length) return null
                    return (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 9 }}>Owned by:</span>
                        {owners.map((o: any, i: number) => (
                          <span key={i}>
                            {o.slug ? (
                              <a href={`/companies/${o.slug}`} style={{ color: 'var(--orange)', textDecoration: 'none', fontWeight: 600 }}>
                                {o.entityName}
                              </a>
                            ) : (
                              <span style={{ fontWeight: 600 }}>{o.entityName}</span>
                            )}
                            <span style={{ color: 'rgba(255,255,255,0.3)' }}> {o.pct}%{o.role ? ` · ${o.role}` : ''}</span>
                            {i < owners.length - 1 && <span style={{ color: 'rgba(255,255,255,0.2)' }}> · </span>}
                          </span>
                        ))}
                      </div>
                    )
                  })()}

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

                  {/* Live Lodgify metrics when matched */}
                  {lId ? (
                    <div style={{ marginTop: 12, padding: 10, background: 'rgba(6,182,212,0.05)', borderRadius: 8, border: '1px solid rgba(6,182,212,0.18)' }} data-source="lodgify:/v2/reservations/bookings">
                      <div style={{ fontSize: 9, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 6 }}>
                        Lodgify #{lId} · live
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                        <div><div style={{ fontSize: 9, color: 'var(--dim)' }}>Occupancy</div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mo)', color: propOcc >= 70 ? 'var(--green)' : 'var(--amber)' }}>{propOcc}%</div></div>
                        <div><div style={{ fontSize: 9, color: 'var(--dim)' }}>ADR</div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--cyan)' }}>{propAdr > 0 ? '$' + propAdr : '—'}</div></div>
                        <div><div style={{ fontSize: 9, color: 'var(--dim)' }}>RevPAR</div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--purple)' }}>{propRevPAR > 0 ? '$' + propRevPAR : '—'}</div></div>
                        <div><div style={{ fontSize: 9, color: 'var(--dim)' }}>YTD Rev</div><div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>{ytdRevenue > 0 ? USD(ytdRevenue) : '—'}</div></div>
                      </div>
                      {nextCheckin ? (
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 6, fontFamily: 'var(--mo)' }}>
                          Next check-in · <span style={{ color: 'var(--orange)' }}>{nextCheckin.arrival}</span> · {nextCheckin.guestInitials ?? '—'} · {nextCheckin.nights}n
                        </div>
                      ) : null}
                    </div>
                  ) : null}

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

      {/* ── Live Lodgify widgets (charts + check-ins + calendar) ── */}
      {lodgifyOn ? (
        <LodgifyWidgets
          occupancy={occupancy12}
          revenue={revenue12}
          checkins={upcomingCheckins ?? []}
          reviews={reviews}
          properties={lodgifyProperties.map(p => ({ id: p.id, name: p.name ?? p.internal_name ?? `Property ${p.id}` }))}
          calendarBookings={lodgifyBookings
            .filter(b => {
              const s = String(b.status ?? '').toLowerCase()
              return s !== 'declined' && s !== 'cancelled' && s !== 'canceled'
            })
            .map(b => ({
              propertyId: b.property_id,
              propertyName: lodgifyProperties.find(p => p.id === b.property_id)?.name ?? `#${b.property_id}`,
              arrival: b.arrival,
              departure: b.departure,
              status: b.status,
            }))}
        />
      ) : null}

      {/* ── Full booking analytics (ported from live Rentals.jsx) ── */}
      {bookings.length > 0 ? (
        <RentalsWidgets
          bookings={bookings}
          propertyIdMap={Object.fromEntries(
            (rentals as any[])
              .filter((r: any) => r.lodgify_property_id ?? r.lodgify_id)
              .map((r: any) => [String(r.lodgify_property_id ?? r.lodgify_id), r.id])
          )}
        />
      ) : (
        <>
          {/* Stubs shown until rental_bookings table is populated */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
            <ComingSoon
              title="Booking Analytics (KPIs + Charts)"
              reason="Requires Lodgify integration — connect in /integrations to unlock Revenue, Occupancy, ADR, RevPAR."
              icon="📊"
              connect="lodgify"
              dataSource="coming-soon:rental_bookings"
              skeleton="chart"
            />
            <ComingSoon
              title="Maintenance Requests"
              reason="maintenance_requests table not yet created. Plan: tickets raised by guests or periodic inspections."
              icon="🔧"
              dataSource="coming-soon:maintenance_requests"
              skeleton="table"
            />
            <ComingSoon
              title="Recent Reviews"
              reason="Requires Lodgify or AirDNA integration — connect in /integrations."
              icon="⭐"
              connect="lodgify"
              dataSource="coming-soon:property_reviews"
              skeleton="table"
            />
          </div>

          <ComingSoon
            title="Bookings Table"
            reason="Requires Lodgify integration — connect to pull sortable check-ins, guest names, and nightly revenue."
            icon="🏨"
            connect="lodgify"
            dataSource="coming-soon:rental_bookings"
            skeleton="table"
            minHeight={120}
          />
        </>
      )}
    </>
  )
}
