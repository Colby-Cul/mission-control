/**
 * Activity Feed — events today, timeline, filters.
 * Hero metric: Events today
 * Animation: Timeline river — horizontal event-dot streams per lane (agent/user/system)
 * Sources: activity_log (ComingSoon), audit_log (ComingSoon), agent_runs (live)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import { getAgentRunFeed, getUserProfile, getAgentActivityFeed } from '../lib/queries'
import { supabase } from '../lib/supabase'
import { getFubActivityFeed, isFubConfigured, type FubActivityItem } from '../lib/fub'
import { isLodgifyConfigured, getLodgifyActivityFeed, type LodgifyActivityItem } from '../lib/lodgify'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Event',    description: 'The first event was recorded in the feed.',      xp: 100, progress: 100, icon: '📡', earned: true  },
  { name: 'Daily Watcher',  description: 'Checked the activity feed 7 days in a row.',     xp: 200, progress: 100, icon: '📅', earned: true  },
  { name: 'Power User',     description: '100 events logged in a single day.',              xp: 350, progress: 60,  icon: '⚡', earned: false },
  { name: 'Audit Ready',    description: 'Full audit log coverage enabled.',                xp: 300, progress: 40,  icon: '📋', earned: false },
  { name: 'Agent Wrangler', description: '50 agent runs tracked.',                          xp: 250, progress: 70,  icon: '🤖', earned: false },
  { name: 'Data Detective', description: 'Filtered events by 3+ criteria in one session.', xp: 200, progress: 20,  icon: '🔍', earned: false },
  { name: 'Event Tsunami',  description: '1,000 events logged total.',                      xp: 500, progress: 10,  icon: '🌊', earned: false },
  { name: 'Full Audit',     description: 'Audit log covers all entity activity.',           xp: 750, progress: 5,   icon: '🏛️', earned: false },
]

async function getActivityLog() {
  try {
    const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(50)
    if (error) return null
    return data ?? []
  } catch { return null }
}

async function getAuditLog() {
  try {
    const { data, error } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(20)
    if (error) return null
    return data ?? []
  } catch { return null }
}

export default async function ActivityPage() {
  const [activityLog, auditLog, agentRuns, profile, unifiedFeed, fubFeedR, lodgifyFeedR] = await Promise.all([
    getActivityLog(),
    getAuditLog(),
    getAgentRunFeed(50).catch(() => []),
    getUserProfile().catch(() => null),
    getAgentActivityFeed(100).catch(() => []),
    isFubConfigured()
      ? getFubActivityFeed(100).catch(() => ({ data: null, error: 'fetch failed' }))
      : Promise.resolve({ data: null, error: 'not configured' }),
    isLodgifyConfigured()
      ? getLodgifyActivityFeed({ max: 100 }).catch(() => null)
      : Promise.resolve(null),
  ])
  const fubFeed: FubActivityItem[] = fubFeedR.data ?? []
  const lodgifyFeed: LodgifyActivityItem[] = lodgifyFeedR ?? []

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const runs = (agentRuns as any[]) ?? []
  const activityList = (activityLog as any[]) ?? []

  // Count today's events from agent_runs + Lodgify
  const todayStr = new Date().toISOString().slice(0, 10)
  const todayRuns = runs.filter((r: any) => (r.started_at ?? '').startsWith(todayStr))
  const todayLodgify = lodgifyFeed.filter(e => (e.when ?? '').startsWith(todayStr))
  const eventsToday = (activityLog !== null ? activityList.filter((e: any) => (e.created_at ?? '').startsWith(todayStr)).length : todayRuns.length) + todayLodgify.length

  const running = runs.filter((r: any) => r.status === 'running')
  const completed = runs.filter((r: any) => r.status === 'completed' || r.status === 'success')

  // Top actor
  const actorMap: Record<string, number> = {}
  runs.forEach((r: any) => { const a = r.agent?.name ?? 'System'; actorMap[a] = (actorMap[a] ?? 0) + 1 })
  const topActor = Object.entries(actorMap).sort(([, a], [, b]) => b - a)[0]?.[0] ?? '—'

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Today',     value: String(eventsToday) },
      { key: 'This Week', value: String(runs.length) },
      { key: 'Top Actor', value: topActor.slice(0, 8) },
      { key: 'Level',     value: String(profile.level ?? 1) },
    ],
  } : undefined

  const statusColor = (s: string) =>
    s === 'running' ? 'var(--accent)' : s === 'failed' || s === 'error' ? 'var(--red)' : 'var(--green)'

  return (
    <>
      <Hero
        label="≈ ACTIVITY · LIVE EVENT FEED"
        greeting="Events Today"
        primaryMetric={String(eventsToday)}
        metricSubtitle="events logged today"
        kpiCards={[
          { label: 'Today',        value: String(eventsToday), delta: 'live',            deltaPositive: true },
          { label: 'This Week',    value: String(runs.length), delta: 'agent runs'                          },
          { label: 'Top Actor',    value: topActor.slice(0, 10)                                              },
          { label: 'Running Now',  value: String(running.length), delta: running.length > 0 ? 'active' : 'idle', deltaPositive: running.length > 0 },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Events Today',  value: String(eventsToday),   color: 'var(--accent)' },
          { label: 'This Week',     value: String(runs.length),   color: 'var(--purple)' },
          { label: 'Top Actor',     value: topActor,              color: 'var(--green)'  },
          { label: 'Running Now',   value: String(running.length),color: running.length > 0 ? 'var(--amber)' : 'var(--dim)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="agent_runs">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: k.label === 'Top Actor' ? 16 : 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* ─── Unified Global Activity (MC + FUB + Lodgify) ─────── */}
      {(fubFeed.length > 0 || runs.length > 0 || lodgifyFeed.length > 0) && (
        <SpecCard accent dataSource="unified:agent+fub+lodgify" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
              Global Activity Feed (agent + FUB + Lodgify)
            </div>
            <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
              {fubFeed.length} FUB · {lodgifyFeed.length} Lodgify · {runs.length} agent runs
            </div>
          </div>
          {(() => {
            type UnifiedItem = {
              id: string
              when: string
              kind: 'agent_run' | 'fub_call' | 'fub_text' | 'fub_appt' | 'fub_event' | 'fub_deal' | 'system' | 'lodgify_booking_new' | 'lodgify_booking_modified' | 'lodgify_booking_cancelled' | 'lodgify_message' | 'lodgify_review'
              title: string
              actor: string
              pill: string
              color: string
            }
            const items: UnifiedItem[] = []

            for (const r of runs as any[]) {
              items.push({
                id: `run:${r.id}`,
                when: r.started_at ?? r.created_at ?? '',
                kind: 'agent_run',
                title: (r.input?.title ?? r.input?.prompt ?? r.task_id ?? 'Agent run').toString().slice(0, 120),
                actor: r.agent?.name ?? 'Agent',
                pill: '🤖 Agent',
                color: 'var(--purple)',
              })
            }
            for (const e of fubFeed) {
              const kind =
                e.kind === 'call' ? 'fub_call'
                : e.kind === 'appointment' ? 'fub_appt'
                : e.kind === 'deal' ? 'fub_deal'
                : 'fub_event'
              const pill =
                kind === 'fub_call' ? '📞 FUB Call'
                : kind === 'fub_appt' ? '📅 FUB Appt'
                : kind === 'fub_deal' ? '💼 FUB Deal'
                : '🏠 FUB Event'
              const color =
                kind === 'fub_call' ? 'var(--accent)'
                : kind === 'fub_appt' ? 'var(--amber)'
                : kind === 'fub_deal' ? 'var(--green)'
                : 'var(--lime)'
              items.push({
                id: e.id,
                when: e.when,
                kind,
                title: e.title,
                actor: e.actor || 'FUB',
                pill,
                color,
              })
            }
            for (const e of lodgifyFeed) {
              const kind: UnifiedItem['kind'] =
                e.kind === 'booking_new' ? 'lodgify_booking_new'
                : e.kind === 'booking_modified' ? 'lodgify_booking_modified'
                : e.kind === 'booking_cancelled' ? 'lodgify_booking_cancelled'
                : e.kind === 'message' ? 'lodgify_message'
                : 'lodgify_review'
              const pill =
                kind === 'lodgify_booking_new' ? '🏠 Booking created'
                : kind === 'lodgify_booking_modified' ? '🏠 Booking modified'
                : kind === 'lodgify_booking_cancelled' ? '🏠 Booking cancelled'
                : kind === 'lodgify_message' ? '📩 Guest message'
                : '⭐ Review'
              items.push({
                id: `lodgify:${e.id}`,
                when: e.when,
                kind,
                title: e.title,
                actor: 'Lodgify',
                pill,
                color: e.color,
              })
            }

            items.sort((a, b) => (b.when || '').localeCompare(a.when || ''))
            const top = items.slice(0, 50)

            if (top.length === 0) {
              return <p style={{ fontSize: 13, color: 'var(--dim)' }}>No activity yet.</p>
            }

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 560, overflowY: 'auto' }}>
                {top.map(it => (
                  <div
                    key={it.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.04)',
                      gap: 12,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <span
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(255,255,255,0.04)',
                          color: it.color,
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        {it.pill}
                      </span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontWeight: 600,
                            fontSize: 12,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {it.title}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--dim)',
                            marginTop: 2,
                            fontFamily: 'var(--mo)',
                          }}
                        >
                          {it.actor}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--dim)',
                        fontFamily: 'var(--mo)',
                        flexShrink: 0,
                        alignSelf: 'center',
                      }}
                    >
                      {it.when
                        ? new Date(it.when).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
          {!isFubConfigured() && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--dim)' }}>
              Connect FUB at <code>/integrations</code> to include call/appointment/deal events.
            </div>
          )}
        </SpecCard>
      )}

      {/* Activity Log — live or ComingSoon */}
      {activityLog !== null ? (
        <SpecCard accent dataSource="activity_log" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Activity Log ({activityList.length})
          </div>
          {activityList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No activity entries yet — add rows to the <code>activity_log</code> table.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activityList.map((evt: any) => {
                const actor = evt.actor ?? evt.user_id ?? evt.agent_id ?? 'system'
                const kind = evt.event_type ?? evt.kind ?? evt.action ?? 'event'
                const kindColor = kind.includes('agent') ? 'var(--purple)' : kind.includes('user') ? 'var(--accent)' : 'var(--green)'
                return (
                  <div key={evt.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: kindColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {evt.description ?? evt.message ?? kind}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                          {actor}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', flexShrink: 0, marginLeft: 12 }}>
                      {evt.created_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      ) : (
        <SpecCard accent dataSource="derived:activity_feed" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Activity Feed (derived from agent_runs + sessions)
          </div>
          {((unifiedFeed as any[]) ?? []).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No activity yet. Agents and cron sessions will appear here.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {((unifiedFeed as any[]) ?? []).slice(0, 30).map((evt: any) => {
                const kindColor = evt.kind === 'cron' ? 'var(--amber)' : evt.kind === 'run' ? 'var(--purple)' : 'var(--green)'
                return (
                  <div key={`${evt.source}-${evt.id}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: kindColor, flexShrink: 0 }} />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{evt.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                          {evt.agent} · {evt.kind} · {evt.source}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', flexShrink: 0, marginLeft: 12, alignSelf: 'center' }}>
                      {evt.when ? new Date(evt.when).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      )}

      {/* Agent Runs Feed — always live from agent_runs */}
      <SpecCard accent dataSource="agent_runs" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Agent Runs ({runs.length})
        </div>
        {runs.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--dim)' }}>No agent runs yet. Runs will appear here once agents are deployed.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runs.slice(0, 20).map((r: any) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.agent?.color ?? 'var(--purple)', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 12 }}>{r.agent?.name ?? 'Agent'}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                      {r.started_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: statusColor(r.status ?? ''), textTransform: 'uppercase', fontFamily: 'var(--mo)', alignSelf: 'center' }}>
                  {r.status ?? '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </SpecCard>

      {/* Audit Log — live or ComingSoon */}
      {auditLog !== null ? (
        <SpecCard accent dataSource="audit_log" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Audit Log ({(auditLog as any[]).length})
          </div>
          {(auditLog as any[]).length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No audit entries yet — add rows to the <code>audit_log</code> table.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(auditLog as any[]).map((entry: any) => (
                <div key={entry.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ fontWeight: 500 }}>{entry.action ?? entry.event ?? 'action'}</span>
                  <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{entry.created_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      ) : (
        <ComingSoon
          title="Audit Log"
          reason="audit_log table exists but is empty. Populated automatically by admin actions and agent audit triggers."
          icon="🏛️"
          dataSource="coming-soon:audit_log"
          skeleton="table"
        />
      )}
    </>
  )
}
