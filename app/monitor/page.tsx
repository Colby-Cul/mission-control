import { getIntegrations, getAgents } from '../lib/queries'

export const dynamic = 'force-dynamic'

function staleness(lastSync?: string | null): { label: string; color: string } {
  if (!lastSync) return { label: 'never', color: 'var(--t4)' }
  const age = Date.now() - new Date(lastSync).getTime()
  const hours = age / 36e5
  if (hours < 1) return { label: `${Math.round(age / 6e4)}m ago`, color: 'var(--green)' }
  if (hours < 24) return { label: `${Math.round(hours)}h ago`, color: 'var(--green)' }
  if (hours < 24 * 7) return { label: `${Math.round(hours / 24)}d ago`, color: 'var(--amber)' }
  return { label: `${Math.round(hours / 24)}d ago`, color: 'var(--red)' }
}

export default async function MonitorPage() {
  const [integrations, agents] = await Promise.all([getIntegrations(), getAgents()])
  const connected = integrations.filter((i: any) => i.status === 'connected' || i.connected)
  const stale = integrations.filter((i: any) => {
    if (!i.last_sync) return true
    return Date.now() - new Date(i.last_sync).getTime() > 24 * 36e5
  })

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ SYSTEM MONITOR · HEALTH CHECK</div>
        <h1>System Monitor</h1>
        <div className="big" style={{ color: stale.length === 0 ? 'var(--green)' : 'var(--amber)' }}>
          {stale.length === 0 ? 'All Green' : `${stale.length} Stale`}
        </div>
        <p>{connected.length}/{integrations.length} integrations connected · {agents.length} agents registered</p>
      </div>

      <div className="mc-card accent" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Data Sources</h3>
        {integrations.map((i: any) => {
          const s = staleness(i.last_sync)
          const isOn = i.status === 'connected' || i.connected
          return (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOn ? s.color : 'var(--t4)' }} />
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{i.provider ?? i.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{i.category ?? ''}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 11, color: s.color }}>
                {isOn ? s.label : (i.status ?? 'off')}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Agents</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
          {agents.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(255,255,255,.02)', borderRadius: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.status === 'active' ? 'var(--green)' : a.status === 'idle' ? 'var(--amber)' : 'var(--t4)' }} />
              <div style={{ fontSize: 12 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto', fontFamily: 'var(--mo)' }}>{a.status ?? 'idle'}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
