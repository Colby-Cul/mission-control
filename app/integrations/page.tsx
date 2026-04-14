import { getIntegrations } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const integrations = await getIntegrations()
  const connected = integrations.filter((i: any) => i.status === 'connected' || i.connected)

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ INTEGRATIONS · CONNECTED SYSTEMS</div>
        <h1>Integrations Hub</h1>
        <div className="big">{connected.length}</div>
        <p>{connected.length} connected · {integrations.length} total providers</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {integrations.map((i: any) => {
          const isOn = i.status === 'connected' || i.connected
          return (
            <div key={i.id} className="mc-card accent">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{i.provider ?? i.name}</div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mo)', padding: '2px 8px', borderRadius: 4, background: isOn ? 'rgba(0,200,100,.15)' : 'rgba(255,255,255,.05)', color: isOn ? 'var(--green)' : 'var(--t3)' }}>
                  {isOn ? 'CONNECTED' : (i.status ?? 'OFF').toUpperCase()}
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 6 }}>{i.description ?? i.category ?? ''}</div>
              {i.last_sync && (
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 6, fontFamily: 'var(--mo)' }}>Last sync {i.last_sync}</div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
