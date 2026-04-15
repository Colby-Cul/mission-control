/**
 * Photos — property photo manager.
 * Hero metric: total photos
 * Animation: photo-grid mosaic with random cells lighting up
 * Sources: property_photos, property_assets
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import HeroCanvas from './HeroCanvas'
import { getProperties, getAchievements } from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Upload',      description: 'Uploaded your first property photo.',          xp: 100, progress: 100, icon: '📸', earned: true  },
  { name: '100 Photos',        description: 'Portfolio has 100+ property photos.',          xp: 200, progress: 100, icon: '🖼️', earned: true  },
  { name: 'All Properties',    description: 'Every property has at least one photo.',       xp: 300, progress: 60,  icon: '🏠', earned: false },
  { name: 'Virtual Tour',      description: 'Property has 20+ photos for a virtual tour.',  xp: 400, progress: 40,  icon: '🎞️', earned: false },
]

async function getAllPhotos() {
  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) return []
  return data ?? []
}

export default async function PhotosPage() {
  const [properties, photos, dbAchievements] = await Promise.allSettled([
    getProperties(),
    getAllPhotos(),
    getAchievements('photos'),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const propList  = (properties as any[])
  const photoList = (photos as any[])

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

  const byProp = photoList.reduce<Record<string, any[]>>((m, p: any) => {
    ;(m[p.property_id] ??= []).push(p)
    return m
  }, {})

  const propsWithPhotos = propList.filter((p: any) => (byProp[p.id] ?? []).length > 0)

  return (
    <>
      <Hero
        label="≈ PHOTO MANAGER · PROPERTY ASSETS"
        greeting="Visual property portfolio."
        primaryMetric={`${photoList.length}`}
        metricSubtitle={`photos across ${Object.keys(byProp).length} properties`}
        kpiCards={[
          { label: 'Total Photos',    value: String(photoList.length),                             deltaPositive: true                                               },
          { label: 'Properties',      value: String(Object.keys(byProp).length),                   delta: 'with photos',             deltaPositive: true             },
          { label: 'Coverage',        value: propList.length > 0
              ? `${Math.round((Object.keys(byProp).length / propList.length) * 100)}%`
              : '—',                                                                                delta: 'properties covered',      deltaPositive: true             },
          { label: 'Avg per Prop',    value: Object.keys(byProp).length > 0
              ? String(Math.round(photoList.length / Object.keys(byProp).length))
              : '0',                                                                                delta: 'photos per property'                                      },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* Photo grids per property */}
      {propsWithPhotos.length === 0 ? (
        <SpecCard accent dataSource="property_photos" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No photos yet</div>
          <div style={{ fontSize: 12, color: 'var(--dim)' }}>Upload property photos to populate this gallery.</div>
        </SpecCard>
      ) : (
        propsWithPhotos.map((p: any) => {
          const ps = byProp[p.id] ?? []
          return (
            <section key={p.id} style={{ marginBottom: 24 }}>
              <div className="section-header">
                <div className="section-header-left">
                  <h2 className="section-title" style={{ fontSize: 15 }}>{p.name ?? p.address}</h2>
                  <span className="achieve-count">{ps.length} photos</span>
                </div>
              </div>
              <SpecCard accent dataSource="property_photos">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                  {ps.slice(0, 24).map((ph: any) => (
                    <div key={ph.id} style={{
                      aspectRatio: '4/3',
                      background: 'rgba(255,255,255,.03)',
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: '1px solid var(--border)',
                    }}>
                      {ph.url || ph.public_url ? (
                        <img
                          src={ph.url ?? ph.public_url}
                          alt={ph.caption ?? ''}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{ padding: 8, fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                          {ph.caption ?? ph.filename ?? 'photo'}
                        </div>
                      )}
                    </div>
                  ))}
                  {ps.length > 24 && (
                    <div style={{
                      aspectRatio: '4/3', borderRadius: 8,
                      border: '1px dashed var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, color: 'var(--dim)',
                    }}>
                      +{ps.length - 24} more
                    </div>
                  )}
                </div>
              </SpecCard>
            </section>
          )
        })
      )}
    </>
  )
}
