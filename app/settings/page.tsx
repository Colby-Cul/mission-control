/**
 * Settings — profile, preferences, integrations, billing, security, theme.
 * Hero metric: user display name (no big number — avatar & level prominent)
 * Animation: subtle particles + gear rotation motif
 * Sources: users_profile (live), integrations (live)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getUserProfile, getIntegrations, getAchievements, getGoogleToken } from '../lib/queries'
import { isGoogleOAuthConfigured } from '../lib/google'
import Link from 'next/link'
import { CalmModeToggle } from '../_components/CalmMode'

export const dynamic = 'force-dynamic'

const FALLBACK_ACHIEVEMENTS = [
  { name: 'Profile Set',   description: 'Completed your user profile.',               xp: 100, progress: 100, icon: '👤', earned: true  },
  { name: 'Bank Linked',   description: 'Connected Plaid to at least one bank.',       xp: 250, progress: 100, icon: '🏦', earned: true  },
  { name: '2FA Enabled',   description: 'Two-factor authentication is active.',        xp: 300, progress: 40,  icon: '🛡️', earned: false },
  { name: 'Fully Integrated', description: 'Connected all recommended integrations.', xp: 750, progress: 15,  icon: '🌐', earned: false },
]

export default async function SettingsPage() {
  const [profile, integrations, dbAchievements, googleToken] = await Promise.all([
    getUserProfile().catch(() => null),
    getIntegrations().catch(() => []),
    getAchievements('settings').catch(() => []),
    getGoogleToken().catch(() => null),
  ])
  const googleOAuthReady = isGoogleOAuthConfigured()
  const isGoogleConnected = !!googleToken

  const achievements = (dbAchievements as any[]).length > 0
    ? (dbAchievements as any[]).map((a: any) => ({
        name:        a.name ?? '',
        description: a.description ?? '',
        xp:          Number(a.xp ?? 0),
        progress:    Number(a.progress ?? (a.earned_at ? 100 : 0)),
        icon:        a.icon ?? '🏆',
        earned:      !!a.earned_at,
      }))
    : FALLBACK_ACHIEVEMENTS
  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)
  const intgList = (integrations as any[]) ?? []
  const connected = intgList.filter((i: any) => i.status === 'connected' || i.connected)
  const settings = (profile?.settings as Record<string, any>) ?? {}
  const displayName = profile?.full_name ?? profile?.display_name ?? 'You'
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const xpPct = profile ? Math.round(((profile.xp ?? 0) / (profile.xp_next ?? 1000)) * 100) : 0

  const playerCard = profile ? {
    name: displayName,
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Level',      value: String(profile.level ?? 1) },
      { key: 'XP',         value: String((profile.xp ?? 0).toLocaleString()) },
      { key: 'Integrations', value: String(connected.length) },
      { key: 'Since',      value: (profile.since ?? profile.created_at)?.slice(0, 7) ?? '—' },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="⚙ SETTINGS · PROFILE &amp; PREFERENCES"
        greeting="Welcome back,"
        primaryMetric={displayName}
        metricSubtitle={`Level ${profile?.level ?? 1} · ${(profile?.xp ?? 0).toLocaleString()} XP`}
        kpiCards={[
          { label: 'XP / Level',   value: `L${profile?.level ?? 1}`,  delta: `${(profile?.xp ?? 0).toLocaleString()} XP`, deltaPositive: true },
          { label: 'Streak',       value: `${profile?.streak ?? 0}d`,  delta: profile?.streak ? 'active' : 'start today'                      },
          { label: 'Connected',    value: String(connected.length),    delta: `of ${intgList.length} integrations`,         deltaPositive: connected.length > 0 },
          { label: 'Badges',       value: String(achievements.filter((a: any) => a.earned).length), delta: `of ${achievements.length}`               },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* Profile Card + XP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <SpecCard accent dataSource="users_profile">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Profile
          </div>
          {profile ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Avatar row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--orange), var(--purple))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 20, color: '#fff', flexShrink: 0,
                }}>{initials}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 18 }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginTop: 2 }}>{profile.role ?? 'Chief Executive'}</div>
                  <div style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 600, marginTop: 2, fontFamily: 'var(--mo)' }}>
                    LVL {profile.level ?? 1}
                  </div>
                </div>
              </div>

              {/* XP bar */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginBottom: 4 }}>
                  <span>{(profile.xp ?? 0).toLocaleString()} XP</span>
                  <span>{(profile.xp_next ?? 1000).toLocaleString()} XP</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${xpPct}%`, background: 'linear-gradient(90deg, var(--orange), var(--pink))', borderRadius: 3 }} />
                </div>
              </div>

              {/* Profile fields */}
              {[
                { label: 'Email',   value: profile.email ?? '—' },
                { label: 'Since',   value: (profile.since ?? profile.created_at)?.slice(0, 10) ?? '—' },
                { label: 'Streak',  value: `${profile.streak ?? 0} days` },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>{f.label}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mo)' }}>{f.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No profile found — one will be created on first sign-in.</p>
          )}
        </SpecCard>

        <SpecCard accent dataSource="users_profile">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Preferences
          </div>
          {/* Neurodivergent-friendly settings — stored in localStorage,
              mirrored to body[data-calm] by CalmModeProvider in layout. */}
          <div style={{ marginBottom: 16 }}>
            <CalmModeToggle />
          </div>
          {Object.keys(settings).length === 0 ? (
            <div>
              <p style={{ fontSize: 13, color: 'var(--dim)', marginBottom: 16 }}>No custom preferences saved — defaults are in effect.</p>
              {/* Default preference tiles */}
              {[
                { key: 'Theme',         value: 'Dark (Default)' },
                { key: 'Currency',      value: 'USD' },
                { key: 'Notifications', value: 'Enabled' },
                { key: 'Timezone',      value: 'America/Los_Angeles' },
              ].map(pref => (
                <div key={pref.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>{pref.key}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mo)' }}>{pref.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {Object.entries(settings).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mo)' }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      </div>

      {/* Google OAuth status */}
      <SpecCard accent dataSource="user_tokens" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Google Workspace
          </div>
          {isGoogleConnected ? (
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--green)',
              background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
              padding: '3px 10px', borderRadius: 5, textTransform: 'uppercase',
              letterSpacing: '0.05em', fontFamily: 'var(--mo)',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)' }} />
              CONNECTED
            </div>
          ) : (
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--dim)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              padding: '3px 10px', borderRadius: 5, textTransform: 'uppercase',
              letterSpacing: '0.05em', fontFamily: 'var(--mo)',
            }}>
              NOT CONNECTED
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>
          Calendar events + Gmail threads on the Home dashboard. Uses OAuth — tokens stored encrypted per user.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {googleOAuthReady ? (
            <>
              <a href="/api/auth/google" style={{
                fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
                background: 'rgba(249,115,22,0.15)', color: 'var(--orange)',
                border: '1px solid rgba(249,115,22,0.3)', textDecoration: 'none',
              }}>
                {isGoogleConnected ? 'Reconnect' : 'Connect Google'}
              </a>
              {isGoogleConnected && (
                <form action="/api/auth/google/disconnect" method="post" style={{ display: 'inline' }}>
                  <button type="submit" style={{
                    fontSize: 11, fontWeight: 600, padding: '5px 14px', borderRadius: 6,
                    background: 'rgba(239,68,68,0.08)', color: 'var(--red)',
                    border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}>
                    Disconnect
                  </button>
                </form>
              )}
            </>
          ) : (
            <div style={{
              fontSize: 11, color: 'var(--dim)', fontStyle: 'italic',
              padding: '5px 10px', background: 'rgba(255,255,255,0.02)',
              borderRadius: 6, border: '1px dashed rgba(255,255,255,0.08)',
            }}>
              Waiting on OAuth setup — contact admin
            </div>
          )}
        </div>
      </SpecCard>

      {/* Integrations summary — link to /integrations */}
      <SpecCard accent dataSource="integrations" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Integrations ({connected.length} connected)
          </div>
          <Link href="/integrations" style={{ fontSize: 11, color: 'var(--orange)', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(249,115,22,0.3)', padding: '4px 12px', borderRadius: 6 }}>
            Manage All
          </Link>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
          {intgList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No integrations configured yet.</p>
          ) : (
            intgList.map((i: any) => {
              const isOn = i.status === 'connected' || i.connected
              return (
                <div key={i.id ?? i.provider} style={{
                  padding: 10, background: 'rgba(255,255,255,0.025)', borderRadius: 10,
                  border: `1px solid ${isOn ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOn ? 'var(--green)' : 'var(--dim)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{i.provider ?? i.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 1, fontFamily: 'var(--mo)' }}>
                      {isOn ? 'connected' : (i.status ?? 'disconnected')}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </SpecCard>

      {/* Billing & Security */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <ComingSoon
          title="Billing & Plan"
          reason="Connect Stripe to manage subscription, seats, and payment methods."
          icon="💳"
          connect="stripe"
          dataSource="coming-soon:settings_billing"
          skeleton="kpi"
        />
        {/* Security — show real Google OAuth + connection status */}
        <SpecCard accent dataSource="integrations,user_tokens">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Security</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Google OAuth', val: isGoogleConnected ? 'Connected' : 'Not connected', color: isGoogleConnected ? 'var(--green)' : 'var(--dim)' },
              { label: 'Supabase Auth', val: 'Server-side', color: 'var(--green)' },
              { label: '2FA', val: 'Pending setup', color: 'var(--amber)' },
              { label: 'Connected Integrations', val: `${connected.length}/${intgList.length}`, color: 'var(--orange)' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--dim)' }}>{row.label}</span>
                <span style={{ fontFamily: 'var(--mo)', color: row.color }}>{row.val}</span>
              </div>
            ))}
          </div>
        </SpecCard>
      </div>

      {/* Team Members summary — link to /team */}
      <SpecCard accent dataSource="team_members" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Team Members</div>
          <Link href="/team" style={{ fontSize: 11, color: 'var(--orange)', textDecoration: 'none', fontWeight: 600, border: '1px solid rgba(249,115,22,0.3)', padding: '4px 12px', borderRadius: 6 }}>
            Manage →
          </Link>
        </div>
        <div style={{ fontSize: 12, color: 'var(--dim)' }}>
          team_members table ready. Add human teammates and track AI agents in one view from the Team page.
        </div>
      </SpecCard>
    </>
  )
}
