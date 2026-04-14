import { getIncidents } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function IncidentsPage() {
  const incidents = await getIncidents()
  const open = incidents.filter((i: any) => i.status !== 'resolved' && i.status !== 'closed')
  const resolved = incidents.filter((i: any) => i.status === 'resolved' || i.status === 'closed')

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ INCIDENT ROOM · THINGS ON FIRE</div>
        <h1>Incident Room</h1>
        <div className="big">{open.length}</div>
        <p>{open.length} open · {resolved.length} resolved · {incidents.length} total tracked</p>
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Open Incidents</h3>
        {open.length === 0 && <div style={{ color: 'var(--green)', fontSize: 12 }}>All clear. Nothing on fire.</div>}
        {open.map((i: any) => (
          <div key={i.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{i.title ?? i.summary}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{i.description ?? ''}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: 'var(--mo)' }}>
              Severity {i.severity ?? '—'} · {i.status ?? 'open'} · opened {i.created_at ?? ''}
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Resolved</h3>
          {resolved.slice(0, 20).map((i: any) => (
            <div key={i.id} style={{ padding: '6px 0', fontSize: 12, color: 'var(--t3)' }}>
              {i.title ?? i.summary}
            </div>
          ))}
        </div>
      )}
    </>
  )
}
