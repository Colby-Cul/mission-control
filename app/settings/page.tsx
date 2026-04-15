import { getUserProfile, getIntegrations } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  let profile: any = null
  try { profile = await getUserProfile() } catch { profile = null }
  let integrations: any[] = []
  try { integrations = await getIntegrations() } catch { integrations = [] }

  const connected = integrations.filter((i: any) => i.status === 'connected' || i.connected === true)
  const settings = (profile?.settings as Record<string, any>) ?? {}

  return (
    <>
      <div className="hero">
        <div className="hero-label">⚙ SETTINGS · PROFILE &amp; ACCESS</div>
        <h1>Settings</h1>
        <div className="big">{profile?.display_name ?? 'Unnamed operator'}</div>
        <p>
          {profile?.role ?? 'principal'} · level {profile?.level ?? 1} · {connected.length} of {integrations.length} integrations connected
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Profile</h3>
          {profile ? (
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              <Row label="Display name" value={profile.display_name} />
              <Row label="Role" value={profile.role} />
              <Row label="Member since" value={profile.since?.slice(0, 10)} />
              <Row label="Level" value={`${profile.level ?? 1} · ${profile.xp ?? 0}/${profile.xp_next ?? '—'} XP`} />
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>No profile on file yet — one will be created on first sign-in.</div>
          )}
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Preferences</h3>
          {Object.keys(settings).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>No custom preferences saved. Defaults in effect.</div>
          ) : (
            <div style={{ fontSize: 13, lineHeight: 1.8 }}>
              {Object.entries(settings).map(([k, v]) => (
                <Row key={k} label={k} value={typeof v === 'object' ? JSON.stringify(v) : String(v)} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Integrations</h3>
        {integrations.length === 0 ? (
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>No integrations wired up yet. Plaid, Gmail, and Supabase MCP come online as credentials are added.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
            {integrations.map((i: any) => {
              const ok = i.status === 'connected' || i.connected === true
              return (
                <div key={i.id ?? i.provider} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: ok ? 'var(--green)' : 'var(--t4)' }} />
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{i.provider}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                    {i.status ?? (ok ? 'connected' : 'disconnected')}
                  </div>
                  {i.last_sync_at && (
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                      last sync {String(i.last_sync_at).slice(0, 16).replace('T', ' ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '6px 0' }}>
      <div style={{ color: 'var(--t3)', fontSize: 12, textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</div>
      <div style={{ fontFamily: 'var(--mo)', fontSize: 12 }}>{value ?? '—'}</div>
    </div>
  )
}
