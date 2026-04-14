import { getTaxEntities, getTaxMoves, getUpcomingTaxDeadlines } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function TaxPage() {
  const [entities, moves, deadlines] = await Promise.all([
    getTaxEntities(),
    getTaxMoves(),
    getUpcomingTaxDeadlines(),
  ])

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ TAX CENTER · PLANNING & DEADLINES</div>
        <h1>Tax Center</h1>
        <div className="big">{deadlines.length}</div>
        <p>{deadlines.length} upcoming deadlines · {moves.length} planning moves · {entities.length} entities tracked</p>
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Upcoming Deadlines</h3>
        {deadlines.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Nothing on the radar.</div>}
        {deadlines.map((d: any) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{d.title ?? d.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)' }}>{d.description ?? d.notes ?? '—'}</div>
            </div>
            <div style={{ fontFamily: 'var(--mo)', color: 'var(--t2)' }}>{d.deadline_date}</div>
          </div>
        ))}
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Planning Moves</h3>
        {moves.map((m: any) => (
          <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div style={{ fontWeight: 500 }}>{m.title ?? m.name}</div>
            <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{m.description ?? m.details ?? ''}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, fontFamily: 'var(--mo)' }}>
              Priority {m.priority ?? '—'} · {m.status ?? '—'}
            </div>
          </div>
        ))}
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Entities</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {entities.map((e: any) => (
            <div key={e.id} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{e.entity?.entity_name ?? e.entity_name ?? 'Entity'}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                {e.entity?.entity_type ?? e.entity_type ?? '—'} · {e.entity?.state ?? e.state ?? '—'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                EIN {e.ein ?? '—'} · filing {e.filing_status ?? '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
