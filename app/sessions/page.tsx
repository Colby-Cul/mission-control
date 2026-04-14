import { getSessions } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function SessionsPage() {
  const sessions = await getSessions()

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ SESSIONS · CONVERSATION HISTORY</div>
        <h1>Sessions</h1>
        <div className="big">{sessions.length}</div>
        <p>Every conversation with every agent, searchable and resumable.</p>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Recent</h3>
        {sessions.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>No sessions logged yet.</div>}
        {sessions.map((s: any) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div>
              <div style={{ fontWeight: 500 }}>{s.title ?? s.summary ?? 'Session'}</div>
              <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{s.agent_name ?? '—'} · {s.platform ?? ''}</div>
            </div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--t3)' }}>
              {s.started_at ?? ''}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
