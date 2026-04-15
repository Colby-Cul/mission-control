/**
 * Entities — ownership structure & entity constellation.
 * Hero metric: total active entities
 * Animation: entity-constellation dots with connection web
 * Sources: entity_ownership
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import HeroCanvas from './HeroCanvas'
import { getEntities, getAchievements } from '../lib/queries'

export const dynamic = 'force-dynamic'

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Entity',      description: 'Added your first legal entity.',                   xp: 100, progress: 100, icon: '🏛️', earned: true  },
  { name: 'LLC Formed',        description: 'At least one LLC in the portfolio.',                xp: 150, progress: 100, icon: '📋', earned: true  },
  { name: 'Multi-State',       description: 'Entities registered in 2+ states.',                xp: 300, progress: 80,  icon: '🗺️', earned: false },
  { name: 'Holding Structure', description: 'Parent/child entity structure established.',        xp: 400, progress: 50,  icon: '🌳', earned: false },
]

export default async function EntitiesPage() {
  const [entities, dbAchievements] = await Promise.allSettled([
    getEntities(),
    getAchievements('entities'),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const entityList = (entities as any[])
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
  entityList.forEach((e: any) => {
    const t = e.entity_type ?? 'Other'
    typeMap[t] = (typeMap[t] ?? 0) + 1
  })
  const stateMap: Record<string, number> = {}
  entityList.forEach((e: any) => {
    const s = e.state ?? 'Unknown'
    stateMap[s] = (stateMap[s] ?? 0) + 1
  })

  const TYPE_COLORS: Record<string, string> = {
    LLC: 'var(--orange)', Corporation: 'var(--pink)', Trust: 'var(--purple)',
    LP: 'var(--green)', 'S-Corp': 'var(--amber)', Other: 'var(--dim)',
  }

  return (
    <>
      <Hero
        label="≈ ENTITY MAP · OWNERSHIP STRUCTURE"
        greeting="Your legal constellation."
        primaryMetric={`${entityList.length}`}
        metricSubtitle={`active entities · ${Object.keys(stateMap).length} states`}
        kpiCards={[
          { label: 'Total Entities',  value: String(entityList.length),                                       deltaPositive: true              },
          { label: 'Entity Types',    value: String(Object.keys(typeMap).length),                             delta: 'distinct types'          },
          { label: 'States',          value: String(Object.keys(stateMap).length),                            delta: 'jurisdictions'            },
          { label: 'With Parent',     value: String(entityList.filter((e: any) => e.parent_entity).length),   delta: 'in holding structure'    },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

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
            <span className="achieve-count">{entityList.length} active</span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
             data-source="entity_ownership">
          {entityList.map((e: any) => (
            <SpecCard key={e.id} accent dataSource="entity_ownership">
              <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
                {e.entity_type ?? '—'} · {e.state ?? '—'}
              </div>
              <h3 style={{ fontSize: 15, margin: '0 0 6px' }}>{e.entity_name}</h3>
              <div style={{ fontSize: 12, color: 'var(--dim)' }}>{e.purpose ?? e.description ?? ''}</div>
              <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 8, fontFamily: 'var(--mo)' }}>
                Formed {e.formation_date ?? '—'} · {e.ownership_pct != null ? `${e.ownership_pct}% owned` : ''}
              </div>
              {e.parent_entity && (
                <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                  Parent: {e.parent_entity}
                </div>
              )}
            </SpecCard>
          ))}
        </div>
      </section>
    </>
  )
}
