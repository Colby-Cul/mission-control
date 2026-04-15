/**
 * Sessions — AI session cost analytics, cron job breakdown, optimization candidates.
 * Hero metric: Total AI spend
 * Animation: Concentric presence rings pulsing outward + device icons drifting
 * Sources: sessions (live), user_sessions (ComingSoon), auth_events (ComingSoon)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getSessions,
  getUserProfile,
  getDistinctAgents,
  getDistinctCronIds,
  type TimeWindow,
} from '../lib/queries'
import { supabase } from '../lib/supabase'
import CronAnalytics, { type SessionRow, cleanTitle } from './CronAnalytics'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Session',   description: 'Started your first session.',                  xp: 100, progress: 100, icon: '🔑', earned: true  },
  { name: 'Multi-Device',    description: 'Active on 2+ device types simultaneously.',    xp: 200, progress: 100, icon: '📱', earned: true  },
  { name: 'Security Scan',   description: 'Reviewed all active sessions.',                xp: 150, progress: 60,  icon: '🔒', earned: false },
  { name: 'Long Session',    description: 'Single session lasting 4+ hours.',             xp: 250, progress: 40,  icon: '⏱️', earned: false },
  { name: '2FA Enabled',     description: 'Two-factor authentication is active.',         xp: 300, progress: 30,  icon: '🛡️', earned: false },
  { name: 'Zero Threats',    description: 'No suspicious activity for 30 days.',          xp: 400, progress: 20,  icon: '✅', earned: false },
  { name: 'Session Master',  description: '100 total sessions completed.',                 xp: 350, progress: 15,  icon: '💫', earned: false },
  { name: 'Fortress',        description: 'All security recommendations implemented.',    xp: 750, progress: 5,   icon: '🏰', earned: false },
]

async function getUserSessions() {
  try {
    const { data, error } = await supabase.from('user_sessions').select('*').order('created_at', { ascending: false }).limit(30)
    if (error) return null
    return data ?? []
  } catch { return null }
}

async function getAuthEvents() {
  try {
    const { data, error } = await supabase.from('auth_events').select('*').order('created_at', { ascending: false }).limit(20)
    if (error) return null
    return data ?? []
  } catch { return null }
}

export default async function SessionsPage() {
  const [userSessions, authEvents, sessionHistory, profile, agents, cronIds] = await Promise.all([
    getUserSessions(),
    getAuthEvents(),
    getSessions().catch(() => [] as any[]),
    getUserProfile().catch(() => null),
    getDistinctAgents().catch(() => [] as string[]),
    getDistinctCronIds().catch(() => [] as string[]),
  ])

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const historyList = (sessionHistory as any[]) ?? []
  const uSessions = (userSessions as any[]) ?? []
  const aEvents = (authEvents as any[]) ?? []

  // Cron analytics — pass all sessions to the client component
  const allSessions: SessionRow[] = historyList.map((s: any) => ({
    id: s.id,
    title: s.title,
    agent_name: s.agent_name,
    status: s.status,
    cron_id: s.cron_id ?? s.metadata?.cron_id ?? null,
    trigger_source: s.trigger_source,
    input_tokens: s.input_tokens,
    output_tokens: s.output_tokens,
    cost_usd: s.cost_usd ?? s.cost,
    tokens: s.tokens,
    cost: s.cost,
    started_at: s.started_at,
    ended_at: s.ended_at,
    metadata: s.metadata,
  }))

  const totalCostAll = historyList.reduce((s: number, r: any) =>
    s + Number(r.cost_usd ?? r.cost ?? 0), 0)
  const cronSessionCount = historyList.filter((s: any) =>
    s.trigger_source === 'cron' || s.cron_id).length
  const avgCostPerSession = historyList.length > 0 ? totalCostAll / historyList.length : 0

  const activeSessions = userSessions !== null
    ? uSessions.filter((s: any) => s.status === 'active' || !s.ended_at).length
    : historyList.filter((s: any) => !s.ended_at).length

  const deviceMap: Record<string, number> = {}
  uSessions.forEach((s: any) => {
    const d = s.device_type ?? s.device ?? 'unknown'
    deviceMap[d] = (deviceMap[d] ?? 0) + 1
  })
  const deviceTypes = Object.keys(deviceMap).length
    ? String(Object.keys(deviceMap).length)
    : historyList.length > 0 ? '1' : '—'

  const sessionsWithDuration = historyList.filter((s: any) => s.started_at && s.ended_at)
  const avgMinutes = sessionsWithDuration.length > 0
    ? Math.round(sessionsWithDuration.reduce((sum: number, s: any) => {
        return sum + (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 60000
      }, 0) / sessionsWithDuration.length)
    : null

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'AI Spend',  value: `$${totalCostAll.toFixed(2)}` },
      { key: 'Sessions',  value: String(historyList.length) },
      { key: 'Cron Jobs', value: String(cronIds.length) },
      { key: 'Level',     value: String(profile.level ?? 1) },
    ],
  } : undefined

  return (
    <>
      <Hero
        label="◉ SESSIONS · AI COST ANALYTICS"
        greeting="AI Session Costs"
        primaryMetric={`$${totalCostAll.toFixed(2)}`}
        metricSubtitle="total AI spend across all sessions"
        kpiCards={[
          { label: 'Total Sessions',  value: String(historyList.length),           deltaPositive: historyList.length > 0 },
          { label: 'Cron Sessions',   value: String(cronSessionCount),             deltaPositive: true },
          { label: 'Avg Cost/Session',value: `$${avgCostPerSession.toFixed(4)}`,   deltaPositive: avgCostPerSession < 0.05 },
          { label: 'Cron Job Types',  value: String(cronIds.length),               deltaPositive: cronIds.length > 0 },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Spend',     value: `$${totalCostAll.toFixed(4)}`,        color: totalCostAll > 5 ? 'var(--red)' : totalCostAll > 1 ? 'var(--amber)' : 'var(--green)' },
          { label: 'Total Sessions',  value: String(historyList.length),            color: 'var(--blue)' },
          { label: 'Cron Job Types',  value: String(cronIds.length),                color: 'var(--orange)' },
          { label: 'Avg / Session',   value: `$${avgCostPerSession.toFixed(4)}`,    color: 'var(--purple)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="sessions">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* ── Cron Analytics (client component with all charts) ── */}
      <CronAnalytics sessions={allSessions} agents={agents} cronIds={cronIds} />

      {/* ── Active Sessions (user_sessions table) ── */}
      {userSessions !== null ? (
        <SpecCard accent dataSource="user_sessions" style={{ marginBottom: 24, marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Active User Sessions ({uSessions.length})
          </div>
          {uSessions.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No active sessions — add rows to <code>user_sessions</code>.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uSessions.map((s: any) => {
                const isActive = s.status === 'active' || !s.ended_at
                return (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px',
                    background: 'rgba(255,255,255,0.025)',
                    borderRadius: 10,
                    border: `1px solid ${isActive ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: isActive ? 'var(--green)' : 'var(--dim)', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.user_agent ?? s.device ?? s.device_type ?? 'Session'}</div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                          {s.ip_address ?? s.location ?? '—'} · {s.created_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: isActive ? 'var(--green)' : 'var(--dim)', textTransform: 'uppercase' }}>
                      {isActive ? 'active' : 'ended'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      ) : (
        <SpecCard accent dataSource="sessions" style={{ marginBottom: 24, marginTop: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Running / Open Sessions
          </div>
          {(() => {
            const openList = (historyList as any[]).filter((s: any) => !s.ended_at || s.status === 'running')
            if (openList.length === 0) return <p style={{ fontSize: 13, color: 'var(--green)' }}>No sessions currently running.</p>
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {openList.slice(0, 10).map((s: any) => (
                  <div key={s.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', background: 'rgba(255,255,255,0.025)',
                    borderRadius: 10, border: '1px solid rgba(16,185,129,0.2)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', flexShrink: 0, boxShadow: '0 0 6px var(--green)' }} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{s.title ?? s.agent_name ?? 'Session'}</div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                          {s.agent_name ?? '—'} · started {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase' }}>active</div>
                  </div>
                ))}
              </div>
            )
          })()}
        </SpecCard>
      )}

      {/* ── Auth Events ── */}
      {authEvents !== null ? (
        <SpecCard accent dataSource="auth_events" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Auth Events ({aEvents.length})
          </div>
          {aEvents.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>No auth events recorded — all clear.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {aEvents.map((e: any) => (
                <div key={e.id} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 10px',
                  background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12,
                }}>
                  <span style={{ fontWeight: 600 }}>{e.event_type ?? e.type ?? 'auth event'}</span>
                  <span style={{ fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--dim)' }}>
                    {e.created_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      ) : (
        <ComingSoon
          title="Auth Events & Suspicious Activity"
          reason="Failed logins, new device alerts, IP anomalies — sourced from auth_events."
          icon="🚨"
          dataSource="coming-soon:auth_events"
          skeleton="table"
        />
      )}
    </>
  )
}
