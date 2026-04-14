import { getAgents } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const agents = await getAgents()
  const byTier = agents.reduce<Record<string, any[]>>((m, a: any) => {
    const t = String(a.tier ?? 'other')
    ;(m[t] ??= []).push(a)
    return m
  }, {})
  const tiers = Object.keys(byTier).sort((a, b) => Number(b) - Number(a))

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ TEAM · YOUR AGENT ROSTER</div>
        <h1>Team</h1>
        <div className="big">{agents.length}</div>
        <p>{agents.length} agents across {tiers.length} tiers</p>
      </div>

      {tiers.map(tier => (
        <div key={tier} className="mc-card accent" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
            Tier {tier} ({byTier[tier].length})
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
            {byTier[tier].map((a: any) => (
              <div key={a.id} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)', borderLeft: `3px solid ${a.color ?? 'var(--accent)'}` }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{a.role ?? a.specialty ?? '—'}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                  {a.status ?? 'idle'} · {a.model ?? ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}
