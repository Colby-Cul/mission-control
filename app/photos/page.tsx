import { getProperties } from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

async function getAllPhotos() {
  const { data, error } = await supabase
    .from('property_photos')
    .select('*')
    .order('sort_order', { ascending: true })
  if (error) throw error
  return data ?? []
}

export default async function PhotosPage() {
  const [properties, photos] = await Promise.all([getProperties(), getAllPhotos()])
  const byProp = photos.reduce<Record<string, any[]>>((m, p: any) => {
    ;(m[p.property_id] ??= []).push(p)
    return m
  }, {})

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ PHOTO MANAGER · PROPERTY ASSETS</div>
        <h1>Photo Manager</h1>
        <div className="big">{photos.length}</div>
        <p>{photos.length} photos across {Object.keys(byProp).length} properties</p>
      </div>

      {properties.map((p: any) => {
        const ps = byProp[p.id] ?? []
        if (ps.length === 0) return null
        return (
          <div key={p.id} className="mc-card accent" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 4 }}>{p.name ?? p.address}</h3>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 12 }}>{ps.length} photos</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
              {ps.slice(0, 24).map((ph: any) => (
                <div key={ph.id} style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,.03)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  {ph.url || ph.public_url ? (
                    <img src={ph.url ?? ph.public_url} alt={ph.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ padding: 8, fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{ph.caption ?? ph.filename ?? 'photo'}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}
