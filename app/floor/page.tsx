/**
 * The Floor — agents deployed, tasks in flight, agent queue.
 * Hero metric: Agents deployed
 * Animation: Top-down floor-plan — desk nodes, agents moving between workstations
 * Sources: agents (live), agent_runs (live), agent_queue (ComingSoon)
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getAgents, getAgentRunFeed, getOpenTasks,
  getUserProfile, getCompanyMilestones, getUpcomingTaxDeadlines,
} from '../lib/queries'
import { supabase } from '../lib/supabase'

export const dynamic = 'force-dynamic'

const ACHIEVEMENTS = [
  { name: 'First Deploy',   description: 'Deployed your first AI agent.',              xp: 150, progress: 100, icon: '🚀', earned: true  },
  { name: 'Agent Swarm',    description: '5+ agents deployed simultaneously.',          xp: 400, progress: 100, icon: '🤖', earned: true  },
  { name: 'Clear The Floor',description: 'Task queue fully empty for 24 hours.',        xp: 300, progress: 50,  icon: '✅', earned: false },
  { name: 'Max Throughput', description: '100 tasks completed by agents in one day.',   xp: 500, progress: 30,  icon: '⚡', earned: false },
  { name: 'Ops Commander',  description: 'Agents cover 5+ different role categories.',  xp: 350, progress: 60,  icon: '🎖️', earned: false },
  { name: 'Zero Queue',     description: 'Agent queue depth maintained below 5.',       xp: 400, progress: 20,  icon: '0️⃣', earned: false },
  { name: 'Night Shift',    description: 'Agents completed 50 tasks overnight.',        xp: 600, progress: 10,  icon: '🌙', earned: false },
  { name: 'Full Automation',description: 'All recurring tasks delegated to agents.',    xp: 1000,progress: 5,   icon: '♾️', earned: false },
]

async function getAgentQueue() {
  try {
    const { data, error } = await supabase.from('agent_queue').select('*').order('created_at', { ascending: false }).limit(20)
    if (error) return null
    return data ?? []
  } catch { return null }
}

export default async function FloorPage() {
  const [agents, agentRuns, openTasks, agentQueue, milestones, taxDeadlines, profile] = await Promise.all([
    getAgents().catch(() => []),
    getAgentRunFeed(30).catch(() => []),
    getOpenTasks().catch(() => []),
    getAgentQueue(),
    getCompanyMilestones().catch(() => []),
    getUpcomingTaxDeadlines().catch(() => []),
    getUserProfile().catch(() => null),
  ])

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)
  const agentList = (agents as any[]) ?? []
  const runList   = (agentRuns as any[]) ?? []
  const taskList  = (openTasks as any[]) ?? []
  const queueList = (agentQueue as any[]) ?? []
  const milestoneList = (milestones as any[]) ?? []
  const deadlineList  = (taxDeadlines as any[]) ?? []

  const activeAgents = agentList.filter((a: any) => a.status === 'active')
  const tasksInFlight = taskList.filter((t: any) => t.status === 'doing' || t.status === 'in_progress')

  // Today's completed tasks
  const todayStr = new Date().toISOString().slice(0, 10)
  const completedToday = runList.filter((r: any) => (r.ended_at ?? r.completed_at ?? '').startsWith(todayStr) && (r.status === 'completed' || r.status === 'success')).length

  const playerCard = profile ? {
    name: profile.full_name ?? 'CEO',
    role: profile.role ?? 'Chief Executive',
    level: profile.level ?? 1,
    xpCurrent: profile.xp ?? 0,
    xpNext: profile.xp_next ?? 1000,
    since: profile.since ?? profile.created_at?.slice(0, 7),
    stats: [
      { key: 'Agents',    value: String(agentList.length) },
      { key: 'Active',    value: String(activeAgents.length) },
      { key: 'Tasks',     value: String(taskList.length) },
      { key: 'Done Today',value: String(completedToday) },
    ],
  } : undefined

  const statusColor = (s: string) =>
    s === 'active' ? 'var(--green)' : s === 'idle' ? 'var(--amber)' : s === 'error' ? 'var(--red)' : 'var(--dim)'

  return (
    <>
      <Hero
        label="🏢 THE FLOOR · LIVE OPS"
        greeting="Agents Deployed"
        primaryMetric={String(agentList.length)}
        metricSubtitle="agents deployed"
        kpiCards={[
          { label: 'Active Agents',   value: String(activeAgents.length),  delta: `of ${agentList.length}`, deltaPositive: activeAgents.length > 0 },
          { label: 'Tasks in Flight', value: String(tasksInFlight.length), delta: 'in progress',            deltaPositive: tasksInFlight.length > 0 },
          { label: 'Completed Today', value: String(completedToday),       delta: 'runs done',              deltaPositive: completedToday > 0 },
          { label: 'Queue Depth',     value: agentQueue !== null ? String(queueList.length) : '—', delta: queueList.length === 0 ? 'clear' : 'pending', deltaPositive: queueList.length === 0 },
        ]}
        playerCard={playerCard}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Active Agents',   value: String(activeAgents.length),  color: activeAgents.length > 0 ? 'var(--green)' : 'var(--dim)' },
          { label: 'Tasks in Flight', value: String(tasksInFlight.length), color: 'var(--orange)' },
          { label: 'Completed Today', value: String(completedToday),       color: 'var(--green)'  },
          { label: 'Queue Depth',     value: agentQueue !== null ? String(queueList.length) : '—', color: queueList.length === 0 ? 'var(--green)' : 'var(--amber)' },
        ].map(k => (
          <SpecCard key={k.label} accent dataSource="agents">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--mo)', color: k.color }}>{k.value}</div>
          </SpecCard>
        ))}
      </div>

      {/* Agent Status Grid */}
      <SpecCard accent dataSource="agents" style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
          Agent Roster ({agentList.length})
        </div>
        {agentList.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--dim)' }}>No agents deployed yet — add agents in the Agents registry.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {agentList.map((a: any) => {
              const sColor = statusColor(a.status ?? 'idle')
              return (
                <div key={a.id} style={{
                  padding: 14, background: 'rgba(255,255,255,0.025)', borderRadius: 12,
                  border: `1px solid ${sColor}22`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `${a.color ?? 'var(--purple)'}33`,
                    border: `2px solid ${a.color ?? 'var(--purple)'}55`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16,
                  }}>🤖</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{a.role ?? a.description?.slice(0, 30) ?? '—'}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: sColor, marginTop: 4, textTransform: 'uppercase', fontFamily: 'var(--mo)' }}>
                      {a.status ?? 'idle'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SpecCard>

      {/* Task Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <SpecCard accent dataSource="tasks" style={{ minHeight: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Open Tasks ({taskList.length})
          </div>
          {taskList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Queue clear — no open tasks.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {taskList.slice(0, 10).map((t: any) => {
                const tColor = t.status === 'doing' ? 'var(--orange)' : t.status === 'blocked' ? 'var(--red)' : 'var(--dim)'
                return (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title ?? t.name ?? 'Task'}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{t.project?.name ?? t.project_id ?? '—'}</div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: tColor, textTransform: 'uppercase', marginLeft: 8, alignSelf: 'center' }}>
                      {t.status ?? 'todo'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>

        {/* Recent Agent Runs */}
        <SpecCard accent dataSource="agent_runs" style={{ minHeight: 200 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Recent Runs ({runList.length})
          </div>
          {runList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--dim)' }}>No agent runs yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {runList.slice(0, 10).map((r: any) => {
                const rColor = r.status === 'running' ? 'var(--orange)' : r.status === 'failed' ? 'var(--red)' : 'var(--green)'
                return (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{r.agent?.name ?? 'Agent'}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                        {r.started_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}
                      </div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 700, color: rColor, textTransform: 'uppercase', alignSelf: 'center' }}>
                      {r.status ?? '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      </div>

      {/* Agent Queue — ComingSoon */}
      {agentQueue !== null ? (
        <SpecCard accent dataSource="agent_queue" style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
            Agent Queue ({queueList.length})
          </div>
          {queueList.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>Queue empty — all caught up.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {queueList.map((q: any) => (
                <div key={q.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: 12 }}>
                  <div style={{ fontWeight: 600 }}>{q.task ?? q.type ?? 'Queued job'}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 2 }}>{q.created_at?.slice(0, 16)?.replace('T', ' ') ?? '—'}</div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      ) : (
        <div style={{ marginBottom: 24 }}>
          <ComingSoon
            title="Agent Queue"
            reason="Pending jobs waiting for agent capacity — job type, priority, and estimated execution time."
            icon="📋"
            dataSource="coming-soon:agent_queue"
            skeleton="table"
          />
        </div>
      )}

      {/* Tax Deadlines & Milestones summary */}
      {(deadlineList.length > 0 || milestoneList.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {deadlineList.length > 0 && (
            <SpecCard accent dataSource="tax_deadlines">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
                Upcoming Tax Deadlines
              </div>
              {deadlineList.slice(0, 5).map((d: any) => {
                const days = Math.round((new Date(d.deadline_date).getTime() - Date.now()) / 86400000)
                const col = days <= 7 ? 'var(--red)' : days <= 30 ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{d.kind ?? 'Deadline'}</span>
                    <span style={{ fontFamily: 'var(--mo)', fontSize: 10, color: col }}>{days}d</span>
                  </div>
                )
              })}
            </SpecCard>
          )}

          {milestoneList.length > 0 && (
            <SpecCard accent dataSource="company_milestones">
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--dim)' }}>
                Upcoming Milestones
              </div>
              {milestoneList.slice(0, 5).map((m: any) => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
                  <span style={{ fontWeight: 600 }}>{m.title}</span>
                  <span style={{ fontFamily: 'var(--mo)', fontSize: 10, color: 'var(--dim)' }}>{m.target_date?.slice(0, 10) ?? '—'}</span>
                </div>
              ))}
            </SpecCard>
          )}
        </div>
      )}
    </>
  )
}
