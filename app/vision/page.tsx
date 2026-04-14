import { getVisions } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function VisionPage() {
  const visions = await getVisions()

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ VISION BOARD · NORTH STAR</div>
        <h1>Vision Board</h1>
        <div className="big">{visions.length}</div>
        <p>{visions.length} visions being tracked</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {visions.map((v: any) => (
          <div key={v.id} className="mc-card accent">
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Priority {v.priority ?? '—'} · {v.timeframe ?? v.horizon ?? '—'}
            </div>
            <h3 style={{ fontSize: 16, margin: '6px 0' }}>{v.title ?? v.name}</h3>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{v.description ?? v.details ?? ''}</div>
            {v.target_date && (
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8, fontFamily: 'var(--mo)' }}>
                Target {v.target_date}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
