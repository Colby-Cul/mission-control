import { getAgentRunFeed } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const runs = await getAgentRunFeed(100)
  const running = runs.filter((r: any) => r.status === 'running')
  const completed = runs.filter((r: any) => r.status === 'completed' || r.status === 'success')

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ ACTIVITY FEED · AGENT RUNS LIVE</div>
        <h1>Activity Feed</h1>
        <div className="big">{running.length}</div>
        <p>{running.length} agents running · {completed.length} completed · {runs.length} total logged</p>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Recent Runs</h3>
        {runs.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>No agent activity yet.</div>}
        {runs.map((r: any) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.agent?.color ?? 'var(--accent)' }} />
              <div>
                <div style={{ fontWeight: 500 }}>{r.agent?.name ?? 'Agent'} · {r.task ?? r.description ?? 'run'}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{r.started_at}</div>
              </div>
            </div>
            <div style={{ fontFamily: 'var(--mo)', fontSize: 10, color: r.status === 'running' ? 'var(--accent)' : r.status === 'failed' ? 'var(--red)' : 'var(--green)' }}>
              {r.status ?? '—'}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
