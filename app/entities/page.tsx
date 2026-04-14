import { getEntities } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function EntitiesPage() {
  const entities = await getEntities()

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ ENTITY MAP · OWNERSHIP STRUCTURE</div>
        <h1>Entities</h1>
        <div className="big">{entities.length}</div>
        <p>{entities.length} active entities across your holdings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {entities.map((e: any) => (
          <div key={e.id} className="mc-card accent">
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {e.entity_type ?? '—'} · {e.state ?? '—'}
            </div>
            <h3 style={{ fontSize: 15, margin: '6px 0' }}>{e.entity_name}</h3>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{e.purpose ?? e.description ?? ''}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8, fontFamily: 'var(--mo)' }}>
              Formed {e.formation_date ?? '—'} · {e.ownership_pct != null ? `${e.ownership_pct}% owned` : ''}
            </div>
            {e.parent_entity && (
              <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                Parent: {e.parent_entity}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  )
}
