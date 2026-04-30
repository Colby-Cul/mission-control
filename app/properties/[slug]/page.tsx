/**
 * Per-Property Page — detailed view for a single property.
 * Hero metric: Property current value
 * Animation: house silhouette with window light pulses + ambient particles
 * Sources: property_assets (slug lookup), entity_documents
 */
import { notFound } from 'next/navigation'
import Hero from '../../_components/Hero'
import Achievements from '../../_components/Achievements'
import { SpecCard } from '../../_components/SpecCard'
import ComingSoon from '../../_components/ComingSoon'
import OwnershipCard from '../../_components/OwnershipCard'
import HeroCanvas from './HeroCanvas'
import LodgifyPropertyWidgets from './LodgifyPropertyWidgets'
import { getProperties, getEntityDocuments, getUserProfile, getAchievements } from '../../lib/queries'
import {
  isLodgifyConfigured,
  getLodgifyBookings,
  getLodgifyOccupancy,
  getLodgifyReviews,
  getLodgifyUpcomingCheckins,
  getLodgifyProperties,
  type LodgifyBooking,
} from '../../lib/lodgify'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const PCT = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`

const FALLBACK_ACHIEVEMENTS = [
  { name: 'Property Added',    description: 'Added this property to the portfolio.',           xp: 100, progress: 100, icon: '🏠', earned: true  },
  { name: 'Equity Tracker',    description: 'Equity tracked and positive.',                   xp: 200, progress: 100, icon: '💎', earned: true  },
  { name: 'Cash-Flow Pro',     description: 'Property generates positive monthly cash flow.',  xp: 300, progress: 60,  icon: '💵', earned: false },
  { name: 'Appreciated 10%',   description: 'Property value appreciated 10%+ since purchase.', xp: 400, progress: 40,  icon: '📈', earned: false },
]

function slugify(name: string, id: string) {
  return name
    ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    : id
}

export default async function PropertyPage({ params }: { params: { slug: string } }) {
  const [properties, profile, dbAchievements] = await Promise.all([
    getProperties().catch(() => []),
    getUserProfile().catch(() => null),
    getAchievements('property').catch(() => []),
  ])

  // Find property by slug field, or derive slug from name/id
  const property = (properties as any[]).find(p => {
    const derived = p.slug ?? slugify(p.name ?? p.address ?? '', p.id)
    return derived === params.slug
  })
  if (!property) notFound()

  const p = property
  const value     = Number(p.current_value    ?? 0)
  const equity    = Number(p.equity           ?? 0)
  const mortgage  = Number(p.mortgage_balance ?? 0)
  const equityPct = value > 0 ? (equity / value) * 100 : 0

  // Documents for this property
  let propertyDocs: any[] = []
  try {
    const allDocs = await getEntityDocuments()
    propertyDocs = allDocs.filter((d: any) =>
      d.property_id === p.id || d.entity_id === p.entity_id
    )
  } catch { /* table may not exist */ }

  // ── Lodgify live data when matched ────────────────────────────
  const lodgifyOn = isLodgifyConfigured()
  const lId: number | null = p.lodgify_property_id != null ? Number(p.lodgify_property_id)
                         : p.lodgify_id != null ? Number(p.lodgify_id)
                         : null
  const [lodgifyBookings, occupancy12, reviews, upcoming7, allLodgifyProps] = await Promise.all([
    lodgifyOn && lId ? getLodgifyBookings({ stayFilter: 'All', max: 500 }).then(list => list.filter(b => b.property_id === lId)).catch(() => [] as LodgifyBooking[]) : Promise.resolve([] as LodgifyBooking[]),
    lodgifyOn && lId ? getLodgifyOccupancy({ propertyId: lId, monthsBack: 12 }).catch(() => null) : Promise.resolve(null),
    lodgifyOn ? getLodgifyReviews().catch(() => null) : Promise.resolve(null),
    lodgifyOn ? getLodgifyUpcomingCheckins({ days: 90 }).catch(() => []) : Promise.resolve([]),
    lodgifyOn ? getLodgifyProperties().catch(() => []) : Promise.resolve([]),
  ])
  const nextReservations = (upcoming7 ?? []).filter(c => c.propertyId === lId).slice(0, 10)
  const thisYear = new Date().getFullYear()
  const revOnly = lodgifyBookings.filter(b => {
    const s = String(b.status ?? '').toLowerCase()
    const src = String(b.source ?? '').toLowerCase()
    if (s === 'declined' || s === 'cancelled' || s === 'canceled') return false
    if (src === 'oh' || src === 'ownerhold') return false
    return (b.total_amount ?? 0) > 0
  })
  const revenueYTD = revOnly
    .filter(b => b.arrival?.slice(0, 4) === String(thisYear))
    .reduce((s, b) => s + Number(b.total_amount ?? 0), 0)
  const threadUids = new Set<string>()
  for (const b of lodgifyBookings) {
    const uid = (b as { thread_uid?: string | null }).thread_uid
    if (uid) threadUids.add(uid)
  }
  const lodgifyName = allLodgifyProps.find(lp => lp.id === lId)?.name ?? p.name ?? p.address ?? ''

  const achievements = (dbAchievements as any[]).length > 0
    ? (dbAchievements as any[]).map((a: any) => ({
        name:        a.name ?? '',
        description: a.description ?? '',
        xp:          Number(a.xp ?? 0),
        progress:    Number(a.progress ?? (a.earned_at ? 100 : 0)),
        icon:        a.icon ?? '🏆',
        earned:      !!a.earned_at,
      }))
    : FALLBACK_ACHIEVEMENTS
  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    stats: [
      { key: 'Value',    value: '$' + (value / 1e6).toFixed(2) + 'M' },
      { key: 'Equity',   value: '$' + (equity / 1e3).toFixed(0) + 'K' },
      { key: 'Equity %', value: equityPct.toFixed(0) + '%' },
      { key: 'XP',       value: (profile.xp ?? 0).toLocaleString() },
    ],
  } : undefined

  return (
    <>
      <Hero
        label={`⌂ PROPERTY · ${(p.name ?? p.address ?? 'PROPERTY').toUpperCase()}`}
        greeting={p.address ?? 'Real Estate Asset'}
        primaryMetric={USD(value)}
        metricSubtitle={`${equityPct.toFixed(0)}% equity · ${p.property_type ?? 'Residential'}`}
        kpiCards={[
          { label: 'Equity',         value: USD(equity),                   deltaPositive: true  },
          { label: 'Mortgage',       value: USD(mortgage),                 deltaPositive: false },
          { label: 'Monthly Income', value: p.income_monthly ? USD(Number(p.income_monthly)) : '—' },
          { label: 'Type',           value: p.is_rental ? 'Rental' : 'Primary' },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Current Value',  value: USD(value),    color: 'var(--accent)' },
          { label: 'Equity',         value: USD(equity),   color: 'var(--green)'  },
          { label: 'Mortgage',       value: USD(mortgage), color: 'var(--red)'    },
          { label: 'Equity %',       value: equityPct.toFixed(1) + '%', color: 'var(--purple)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="property_assets">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color, wordBreak: 'break-all' }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Financials card */}
      <SpecCard accent dataSource="property_assets" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Financials
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {[
            { label: 'Purchase Price',    value: p.purchase_price        ? USD(Number(p.purchase_price))        : '—' },
            { label: 'Current Value',     value: USD(value) },
            { label: 'Mortgage Balance',  value: USD(mortgage) },
            { label: 'Interest Rate',     value: p.mortgage_rate         ? Number(p.mortgage_rate).toFixed(2) + '%' : '—' },
            { label: 'Monthly Payment',   value: p.payment_monthly       ? USD(Number(p.payment_monthly))       : '—' },
            { label: 'Monthly Expenses',  value: p.expenses_monthly      ? USD(Number(p.expenses_monthly))      : '—' },
            { label: 'Monthly Income',    value: p.income_monthly        ? USD(Number(p.income_monthly))        : '—' },
            { label: 'Purchase Date',     value: p.purchase_date?.slice(0,10) ?? '—' },
          ].map(f => (
            <div key={f.label}>
              <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{f.label}</div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 13, fontWeight: 600 }}>{f.value}</div>
            </div>
          ))}
        </div>
      </SpecCard>

      {/* Photo gallery */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Photo Gallery"
          reason="property_photos table exists but has 0 rows. Upload photos to activate."
          icon="📷"
          dataSource="coming-soon:property_photos"
          skeleton="chart"
          minHeight={200}
        />
      </div>

      {/* Bookings / Occupancy — live when matched */}
      {lodgifyOn && lId ? (
        <div style={{ marginBottom: 24 }}>
          <LodgifyPropertyWidgets
            propertyId={lId}
            propertyName={lodgifyName}
            occupancy={occupancy12}
            bookings={lodgifyBookings.map(b => ({
              id: b.id,
              arrival: b.arrival,
              departure: b.departure,
              status: b.status,
              source: b.source ?? null,
              total_amount: Number(b.total_amount ?? 0),
              currency_code: b.currency_code,
              guestInitials: (() => {
                const g = b.guest?.name
                if (!g) return null
                return g.trim().split(/\s+/).map(n => (n[0] ?? '').toUpperCase()).slice(0, 2).join('. ') + '.'
              })(),
            }))}
            nextReservations={nextReservations.map(r => ({
              arrival: r.arrival, departure: r.departure, nights: r.nights,
              guestInitials: r.guestInitials, source: r.source, total: r.total, status: r.status,
            }))}
            revenueYTD={revenueYTD}
            threadCount={threadUids.size}
            reviews={reviews}
          />
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <ComingSoon
            title="Bookings & Occupancy"
            reason={lodgifyOn ? 'No Lodgify id matched for this property — set `lodgify_property_id` in property_assets.' : 'Requires Lodgify integration — connect in Settings → Integrations to pull booking calendar.'}
            icon="📅"
            connect="lodgify"
            dataSource="coming-soon:bookings"
            skeleton="table"
            minHeight={160}
          />
        </div>
      )}

      {/* Documents */}
      <SpecCard accent dataSource="entity_documents" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Documents ({propertyDocs.length})
        </div>
        {propertyDocs.length === 0 ? (
          <p style={{ fontSize: 12, color: 'var(--dim)' }}>No documents linked to this property yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {propertyDocs.map((d: any) => (
              <div key={d.id} style={{ padding: 10, background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase' }}>{d.document_type ?? 'doc'}</div>
                <div style={{ fontWeight: 600, fontSize: 12, marginTop: 3, wordBreak: 'break-word' }}>{d.filename ?? d.title ?? d.id}</div>
                <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 3 }}>{d.created_at?.slice(0,10) ?? '—'}</div>
              </div>
            ))}
          </div>
        )}
      </SpecCard>

      {/* Ownership Structure */}
      <div style={{ marginBottom: 24 }}>
        <OwnershipCard
          entityId={p.id}
          entityName={p.address ?? p.city ?? 'Property'}
          entityType={null}
          childType="property"
        />
      </div>

      {/* Maintenance Log */}
      <div style={{ marginBottom: 24 }}>
        <ComingSoon
          title="Maintenance Log"
          reason="maintenance_log table not yet created. Tracks repairs, inspections, and schedules."
          icon="🔧"
          dataSource="coming-soon:maintenance_log"
          skeleton="table"
          minHeight={160}
        />
      </div>
    </>
  )
}
