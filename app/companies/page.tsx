import { getEntities } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function CompaniesPage() {
  const entities = await getEntities()
  const operating = entities.filter((e: any) => /llc|inc|corp|c-corp|s-corp/i.test(e.entity_type ?? ''))

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ COMPANIES · OPERATING BUSINESSES</div>
        <h1>Companies</h1>
        <div className="big">{operating.length}</div>
        <p>{operating.length} operating companies · {entities.length} total entities</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {operating.map((e: any) => (
          <div key={e.id} className="mc-card accent">
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {e.entity_type ?? '—'} · {e.state ?? '—'}
            </div>
            <h3 style={{ fontSize: 16, margin: '6px 0' }}>{e.entity_name}</h3>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{e.purpose ?? e.description ?? ''}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8, fontFamily: 'var(--mo)' }}>
              Formed {e.formation_date ?? '—'} · {e.ownership_pct != null ? `${e.ownership_pct}% owned` : ''}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
