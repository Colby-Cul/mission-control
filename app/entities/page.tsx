/**
 * Entities — full ownership org-chart + entity constellation.
 * Hero metric: total active entities
 * Sources: entity_ownership, entity_ownership_edges
 */
import { Suspense } from 'react'
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import HeroCanvas from './HeroCanvas'
import { getEntities, getAchievements, getOwnershipEdges, getAllEntitiesForGraph, getProperties, getAccountsForGraph } from '../lib/queries'
import EntityOrgChart from './EntityOrgChart'
import WizardNudgeBanner from '../_components/WizardNudgeBanner'
import WizardSuccessToast from '../_components/WizardSuccessToast'

export const dynamic = 'force-dynamic'

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Entity',      description: 'Added your first legal entity.',                   xp: 100, progress: 100, icon: '🏛️', earned: true  },
  { name: 'LLC Formed',        description: 'At least one LLC in the portfolio.',                xp: 150, progress: 100, icon: '📋', earned: true  },
  { name: 'Multi-State',       description: 'Entities registered in 2+ states.',                xp: 300, progress: 80,  icon: '🗺️', earned: false },
  { name: 'Holding Structure', description: 'Parent/child entity structure established.',        xp: 400, progress: 50,  icon: '🌳', earned: false },
]

export default async function EntitiesPage() {
  const [entities, dbAchievements, edges, allEntities, properties, accounts] = await Promise.allSettled([
    getEntities(),
    getAchievements('entities'),
    getOwnershipEdges(),
    getAllEntitiesForGraph(),
    getProperties(),
    getAccountsForGraph(),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const entityList = (entities as any[])
  const edgeList = (edges as any[])
  const allEntityList = (allEntities as any[])
  const accountList = (accounts as any[])
  const propertyList = (properties as any[]).map((p: any) => ({
    id: p.id,
    address: p.address ?? p.city ?? 'Property',
    city: p.city ?? null,
    state: p.state ?? null,
    slug: p.slug ?? null,
    purpose: p.purpose ?? (p.is_rental ? 'rental' : null),
    ownership_pct: p.ownership_pct ?? null,
    current_value: p.current_value ?? null,
    mortgage_balance: p.mortgage_balance ?? null,
  }))
  const achievements = (dbAchievements as any[]).length > 0
    ? (dbAchievements as any[]).map((a: any) => ({
        name:        a.name ?? '',
        description: a.description ?? '',
        xp:          Number(a.xp ?? 0),
        progress:    Number(a.progress ?? (a.earned_at ? 100 : 0)),
        icon:        a.icon ?? '🏆',
        earned:      !!a.earned_at,
      }))
    : DEFAULT_ACHIEVEMENTS

  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  // Entity type breakdown
  const typeMap: Record<string, number> = {}
  allEntityList.forEach((e: any) => {
    const t = e.entity_type ?? 'Other'
    typeMap[t] = (typeMap[t] ?? 0) + 1
  })
  const stateMap: Record<string, number> = {}
  entityList.forEach((e: any) => {
    const s = e.state ?? 'Unknown'
    stateMap[s] = (stateMap[s] ?? 0) + 1
  })

  const TYPE_COLORS: Record<string, string> = {
    LLC: 'var(--accent)', Corporation: 'var(--pink)', Trust: 'var(--amber)',
    'C-Corp': 'var(--green)', 'S-Corp': 'var(--green)',
    LP: 'var(--green)', 'S-Corp_2': 'var(--amber)', Other: 'var(--dim)',
    Person: 'var(--purple)',
  }

  return (
    <>
      <Suspense fallback={null}><WizardSuccessToast /></Suspense>
      <Hero
        label="≈ ENTITY MAP · OWNERSHIP STRUCTURE"
        greeting="Your legal constellation."
        primaryMetric={`${allEntityList.length}`}
        metricSubtitle={`entities · ${edgeList.length} ownership edges`}
        kpiCards={[
          { label: 'Total Entities',  value: String(allEntityList.length),                          deltaPositive: true              },
          { label: 'Ownership Edges', value: String(edgeList.length),                               delta: 'graph edges'             },
          { label: 'Entity Types',    value: String(Object.keys(typeMap).length),                   delta: 'distinct types'          },
          { label: 'States',          value: String(Object.keys(stateMap).length),                  delta: 'jurisdictions'           },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* Wizard nudge — only visible when zero ownership edges */}
      <WizardNudgeBanner edgeCount={edgeList.length} />

      {/* Full Org-Chart */}
      {(allEntityList.length > 0 || edgeList.length > 0) && (
        <section style={{ marginBottom: 40 }}>
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">Ownership Graph</h2>
              <span className="achieve-count">{allEntityList.length} entities · {propertyList.length} props · {accountList.length} accounts · {edgeList.length} edges</span>
            </div>
          </div>
          <EntityOrgChart
            entities={allEntityList}
            edges={edgeList}
            properties={propertyList}
            accounts={accountList}
          />
        </section>
      )}

      {/* Entity Type Breakdown */}
      {Object.keys(typeMap).length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">By Type</h2>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {Object.entries(typeMap).map(([type, count]) => (
              <SpecCard key={type} accent dataSource="entity_ownership.entity_type"
                style={{ minWidth: 120, textAlign: 'center', padding: '16px 20px' }}>
                <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: TYPE_COLORS[type] ?? 'var(--dim)' }}>{count}</div>
                <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{type}</div>
              </SpecCard>
            ))}
          </div>
        </section>
      )}

      {/* Entity Cards Grid */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">All Entities</h2>
            <span className="achieve-count">{allEntityList.length} total</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
             data-source="entity_ownership">
          {allEntityList.map((e: any) => (
            <SpecCard key={e.id} accent dataSource="entity_ownership">
              <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                {e.entity_type ?? '—'}
                {e.purpose && ` · ${e.purpose}`}
              </div>
              <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>{e.entity_name}</h3>
              {e.slug ? (
                <a href={`/companies/${e.slug}`} style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                  View Dashboard →
                </a>
              ) : null}
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 8, fontFamily: 'var(--mo)' }}>
                {e.is_active ? 'Active' : 'Inactive'}
              </div>
            </SpecCard>
          ))}
        </div>
      </section>
    </>
  )
}
