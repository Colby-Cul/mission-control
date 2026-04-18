/**
 * Agents — AI agent fleet overview.
 * Hero metric: active agents count
 * Animation: swarm — agent-dot nodes with organic movement + connection lines
 * Sources: agents table (fallback to BUILTIN_AGENTS), agent_runs
 * Spec §5.4
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import AgentsClient from './AgentsClient'
import { getAgents, getAgentRunFeed, getAchievements, getAgentCapabilityMatrix, getAgentCostBudgets } from '../lib/queries'
import { BUILTIN_AGENTS, getOpenclawLiveData, buildAgentActivity } from '../lib/agents'

export const dynamic = 'force-dynamic'

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Agent Deployed', description: 'Your first AI agent is live and running.',       xp: 200, progress: 100, icon: '🤖', earned: true  },
  { name: '100 Runs',             description: 'Agents completed 100 total task runs.',           xp: 300, progress: 100, icon: '🏃', earned: true  },
  { name: 'Multi-Agent Orchestration', description: 'Two or more agents collaborated on a task.', xp: 500, progress: 100, icon: '🕸️', earned: true  },
  { name: 'Zero Errors',          description: 'Completed 50 runs with no errors.',              xp: 250, progress: 70,  icon: '✅', earned: false },
  { name: 'Always On',            description: 'Agent fleet maintained uptime for 7 days.',      xp: 400, progress: 40,  icon: '🟢', earned: false },
  { name: 'Cost Optimizer',       description: 'Reduced average run cost by 20%.',               xp: 350, progress: 20,  icon: '💸', earned: false },
]

function agentTypeColor(agent: any): string {
  const name = (agent.name ?? '').toLowerCase()
  if (name.includes('jarvis') || name.includes('orchestrat')) return '#f97316'
  if (name.includes('worker') || name.includes('build'))      return '#10b981'
  if (name.includes('victoria') || name.includes('assistant')) return '#8b5cf6'
  if (name.includes('research'))                              return '#06b6d4'
  if (name.includes('valid'))                                 return '#f59e0b'
  if (name.includes('deploy'))                                return '#ec4899'
  return '#8b5cf6'
}

export default async function AgentsPage() {
  const [agentsRaw, runs, dbAchievements, capMatrix, costBudgets, liveDataRaw] = await Promise.allSettled([
    getAgents(),
    getAgentRunFeed(50),
    getAchievements('agents'),
    getAgentCapabilityMatrix().catch(() => ({ caps: [], matrix: [] })),
    getAgentCostBudgets().catch(() => []),
    getOpenclawLiveData(),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : null)))

  // Live feed from OpenClaw runtime gateway — merged into agent cards below.
  const live = liveDataRaw as Awaited<ReturnType<typeof getOpenclawLiveData>>
  const activityByAgent = buildAgentActivity(live)

  // Merge DB agents with BUILTIN_AGENTS — DB rows override builtins by id/slug
  const dbList = agentsRaw as any[]
  const dbById = new Map(dbList.map((a: any) => [String(a.id ?? a.slug ?? a.name).toLowerCase(), a]))
  const agents: any[] = [
    ...BUILTIN_AGENTS.map((b: any) => {
      const key = String(b.id).toLowerCase()
      return dbById.has(key) ? { ...b, ...dbById.get(key) } : b
    }),
    // Any DB agents not present in builtins
    ...dbList.filter((a: any) => {
      const key = String(a.id ?? a.slug ?? a.name).toLowerCase()
      return !BUILTIN_AGENTS.some((b: any) => String(b.id).toLowerCase() === key)
    }),
  ]
  const runList = (runs as any[])
  const achievements = (dbAchievements as any[]).length > 0
    ? (dbAchievements as any[]).map((a: any) => ({
        name:        a.name ?? '',
        description: a.description ?? '',
        xp:          Number(a.xp ?? 0),
        progress:    Number(a.progress ?? (a.earned_at ? 100 : 0)),
        icon:        a.icon ?? '🏆',
        earned:      !!a.earned_at,
      }))
    : DEFAULT_ACHIEVEMENTS

  // "Active" now means: either the DB/builtin says active, OR the live runtime
  // shows in-progress sessions for this agent. This replaces the stale filter
  // that was missing 30+ agents doing real work.
  const today = new Date().toISOString().slice(0, 10)
  const activeAgents = agents.filter((a: any) => {
    const live = activityByAgent.get(String(a.id ?? a.name).toLowerCase())
    return a.status === 'active' || (live && live.inProgressCount > 0)
  })

  // Runs today = done sessions that finished today across all agents (live feed),
  // or fallback to Supabase agent_runs if live feed unavailable.
  const runsTodayLive = live
    ? live.acpSessions.filter(s => {
        const end = s.dateFinished || s.endTime || ''
        return (s.status === 'done' || s.lane === 'done') && end.startsWith(today)
      })
    : null
  const runsToday = runsTodayLive ?? runList.filter((r: any) => (r.started_at ?? r.created_at ?? '').startsWith(today))

  // Queue depth = live in-progress sessions (preferred), else agent_runs fallback.
  const queueDepth = live
    ? live.acpSessions.filter(s => s.status === 'in_progress' || s.lane === 'inprogress').length
    : runList.filter((r: any) => r.status === 'queued' || r.status === 'running').length

  // Avg latency — live feed has startTime/endTime per session (done only).
  let avgLatencyMs = 0
  if (live) {
    const doneSessions = live.acpSessions.filter(s => (s.status === 'done' || s.lane === 'done') && s.endTime && s.startTime)
    if (doneSessions.length > 0) {
      avgLatencyMs = doneSessions.reduce((sum, s) => {
        const ms = new Date(s.endTime!).getTime() - new Date(s.startTime).getTime()
        return sum + (ms > 0 ? ms : 0)
      }, 0) / doneSessions.length
    }
  } else {
    const completedRuns = runList.filter((r: any) => r.status === 'done')
    avgLatencyMs = completedRuns.length > 0
      ? completedRuns.reduce((s: number, r: any) => {
          const start = r.started_at ? new Date(r.started_at).getTime() : 0
          const end   = r.completed_at ? new Date(r.completed_at).getTime() : 0
          return s + (end > start ? end - start : 0)
        }, 0) / completedRuns.length
      : 0
  }
  const avgLatencyStr = avgLatencyMs > 0
    ? avgLatencyMs > 3600000 ? `${(avgLatencyMs / 3600000).toFixed(1)}h`
      : avgLatencyMs > 60000 ? `${(avgLatencyMs / 60000).toFixed(1)}m`
      : `${(avgLatencyMs / 1000).toFixed(1)}s`
    : '—'

  const xpEarned = achievements.filter((a: any) => a.earned).reduce((s: number, a: any) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="≈ AGENTS · AI FLEET · ORCHESTRATION"
        greeting="Your agent workforce."
        primaryMetric={`${activeAgents.length}`}
        metricSubtitle={`active agents · ${agents.length} total registered`}
        kpiCards={[
          { label: 'Active Agents', value: String(activeAgents.length),  delta: `of ${agents.length} total`,    deltaPositive: activeAgents.length > 0  },
          { label: 'Runs Today',    value: String(runsToday.length),      delta: 'since midnight',               deltaPositive: runsToday.length > 0     },
          { label: 'Avg Latency',   value: avgLatencyStr,                 delta: 'per completed run'                                                      },
          { label: 'Queue Depth',   value: String(queueDepth),            delta: queueDepth > 0 ? 'processing' : 'idle', deltaPositive: queueDepth === 0 },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* Agent Grid */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Agent Fleet</h2>
            <span className="achieve-count">{agents.length} agents</span>
            <span className="xp-earned" style={{ color: 'var(--green)', background: 'rgba(16,185,129,0.1)' }}>
              {activeAgents.length} active
            </span>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}
             data-source="agents">
          {agents.map((agent: any) => {
            const color = agentTypeColor(agent)
            // Live activity from OpenClaw gateway, keyed by lowercased id
            const liveBucket = activityByAgent.get(String(agent.id ?? agent.name).toLowerCase())
            const liveSessionCount = liveBucket?.sessionCount ?? 0
            const liveInProgress = liveBucket?.inProgressCount ?? 0
            const liveDoneToday = liveBucket?.doneToday ?? 0
            const liveLastActivity = liveBucket?.lastActivityAt ?? null
            const liveCostYtd = liveBucket?.totalCost ?? 0
            const currentTask = liveBucket?.activeSessions?.[0]?.task ?? null

            const agentRunsToday = runList.filter((r: any) =>
              r.agent_id === agent.id && (r.started_at ?? r.created_at ?? '').startsWith(today)
            )
            const lastRun = runList.find((r: any) => r.agent_id === agent.id)
            // Agent is active if builtin/DB says so, OR live runtime shows in-progress sessions
            const isActive = agent.status === 'active' || liveInProgress > 0

            // Resolve health color
            const healthColor: Record<string, string> = {
              healthy: 'var(--green)', degraded: 'var(--amber)', down: 'var(--red)', unknown: 'var(--dim)',
            }
            const hColor = healthColor[agent.health_status ?? 'unknown'] ?? 'var(--dim)'

            // Success rate bar color
            const srPct = agent.success_rate != null ? Number(agent.success_rate) : null
            const srColor = srPct == null ? 'var(--dim)' : srPct >= 90 ? 'var(--green)' : srPct >= 70 ? 'var(--amber)' : 'var(--red)'

            // Cost YTD formatting
            const costYtd = Number(agent.cost_ytd ?? 0)
            const costStr = costYtd >= 1000 ? `$${(costYtd/1000).toFixed(1)}k` : costYtd > 0 ? `$${costYtd.toFixed(0)}` : '—'

            // Latency formatting
            const latMs = agent.avg_latency_ms != null ? Number(agent.avg_latency_ms) : null
            const latStr = latMs == null ? '—' : latMs > 60000 ? `${(latMs/60000).toFixed(1)}m` : latMs > 1000 ? `${(latMs/1000).toFixed(1)}s` : `${Math.round(latMs)}ms`

            // Runs today: prefer LIVE (gateway) count, else Supabase agent_runs, else builtin field
            const runsToday =
              liveDoneToday > 0 ? liveDoneToday
                : agentRunsToday.length > 0 ? agentRunsToday.length
                : (agent.runs_today ?? 0)

            return (
              <SpecCard key={agent.id} accent dataSource="agents">
                {/* ── Row 1: name + tier badge ── */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Health/status dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                      background: hColor,
                      boxShadow: isActive ? `0 0 8px ${hColor}` : 'none',
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color }}>{agent.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {agent.status ?? 'idle'}
                        {agent.health_status && agent.health_status !== 'unknown' && (
                          <span style={{ color: hColor, marginLeft: 6 }}>· {agent.health_status}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <div style={{
                      fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 8px',
                      borderRadius: 6, border: `1px solid ${color}40`, color, background: color + '12',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}>
                      {agent.tier ?? 'agent'}
                    </div>
                    {agent.trigger_type && (
                      <div style={{
                        fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 6px',
                        borderRadius: 4, background: 'rgba(255,255,255,0.04)',
                        color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {agent.trigger_type}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Description ── */}
                {agent.description && (
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
                    {agent.description}
                  </div>
                )}

                {/* ── Model + knowledge level ── */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {agent.model && (
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                      color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{agent.model}</span>
                  )}
                  {agent.knowledge_level && (
                    <span style={{
                      fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 7px', borderRadius: 4,
                      background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)',
                      color: 'var(--orange)', textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{agent.knowledge_level}</span>
                  )}
                </div>

                {/* ── Current task ── */}
                {agent.current_task && (
                  <div style={{
                    fontSize: 11, color: 'var(--t2)', marginBottom: 10, lineHeight: 1.4,
                    padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6,
                    borderLeft: `2px solid ${color}`,
                  }}>
                    <span style={{ color: 'var(--dim)', fontSize: 9, fontFamily: 'var(--mo)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Current Task</span>
                    {String(agent.current_task).slice(0, 80)}{String(agent.current_task).length > 80 ? '…' : ''}
                  </div>
                )}

                {/* ── Capabilities ── */}
                {Array.isArray(agent.capabilities) && agent.capabilities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {agent.capabilities.slice(0, 5).map((cap: string) => (
                      <span key={cap} style={{
                        fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 6px', borderRadius: 4,
                        background: 'rgba(255,255,255,0.05)', color: 'var(--dim)',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{cap}</span>
                    ))}
                  </div>
                )}

                {/* ── Stats grid: runs, latency, cost, success rate ── */}
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
                  gap: 8, marginBottom: 10,
                  padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: 8,
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'white' }}>{runsToday}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>runs/day</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: srColor }}>{srPct != null ? `${srPct}%` : '—'}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>success</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--amber)' }}>{latStr}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>latency</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--mo)', color: costYtd > 100 ? 'var(--red)' : costYtd > 20 ? 'var(--amber)' : 'var(--green)' }}>{costStr}</div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>cost YTD</div>
                  </div>
                </div>

                {/* ── Live session counters + last activity ── */}
                {liveSessionCount > 0 && (
                  <div style={{
                    display: 'flex', gap: 8, marginBottom: 10,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(16,185,129,0.06)',
                    border: '1px solid rgba(16,185,129,0.18)',
                  }}>
                    <span style={{ fontSize: 10, color: 'var(--green)', fontFamily: 'var(--mo)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      ● Live
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t2)' }}>
                      {liveInProgress > 0 ? `${liveInProgress} in progress` : `${liveSessionCount} sessions`}
                    </span>
                  </div>
                )}

                {/* ── Current task (live) ── */}
                {currentTask && (
                  <div style={{
                    fontSize: 11, color: 'var(--t2)', marginBottom: 10,
                    padding: '6px 10px', borderRadius: 8,
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `2px solid ${color}`,
                    lineHeight: 1.4,
                  }}>
                    <span style={{ color: 'var(--dim)', fontSize: 9, fontFamily: 'var(--mo)', display: 'block', marginBottom: 2, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Now working on</span>
                    {currentTask.slice(0, 100)}{currentTask.length > 100 ? '…' : ''}
                  </div>
                )}

                {/* ── Last run + owner ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 12 }}>
                  <span>
                    {liveLastActivity
                      ? <>Last activity: <strong style={{ color: 'white' }}>{new Date(liveLastActivity).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></>
                      : lastRun
                        ? <>Last run: <strong style={{ color: 'white' }}>{new Date(lastRun.started_at ?? lastRun.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></>
                        : agent.last_run_ts
                          ? <>Last run: <strong style={{ color: 'white' }}>{new Date(agent.last_run_ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong></>
                          : 'No runs yet'}
                  </span>
                  {agent.owner && (
                    <span>Owner: <strong style={{ color: 'var(--t2)' }}>{agent.owner}</strong></span>
                  )}
                </div>

                {/* ── Dependencies ── */}
                {Array.isArray(agent.dependencies) && agent.dependencies.length > 0 && (
                  <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 10 }}>
                    <span style={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: 9, fontFamily: 'var(--mo)' }}>Deps: </span>
                    {agent.dependencies.map((dep: string) => (
                      <span key={dep} style={{
                        marginLeft: 4, padding: '1px 5px', borderRadius: 3,
                        background: 'rgba(255,255,255,0.04)', fontSize: 9, fontFamily: 'var(--mo)',
                      }}>{dep}</span>
                    ))}
                  </div>
                )}

                {/* ── Invoke button ── */}
                <AgentsClient agentId={agent.id} agentName={agent.name} />
              </SpecCard>
            )
          })}
        </div>
      </section>

      {/* Recent Runs */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Recent Runs</h2>
            <span className="achieve-count">{runList.length} runs</span>
          </div>
        </div>
        <SpecCard accent dataSource="agent_runs">
          {runList.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '24px 0' }}>
              No agent runs yet. Invoke an agent above to get started.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {runList.slice(0, 20).map((run: any) => {
                const statusColor: Record<string, string> = {
                  done: 'var(--green)', running: 'var(--amber)',
                  queued: 'var(--dim)', error: 'var(--red)',
                }
                const col = statusColor[run.status ?? 'queued'] ?? 'var(--dim)'
                const agentName = run.agent?.name ?? run.agent_id ?? '—'
                return (
                  <div key={run.id} style={{
                    display: 'grid', gridTemplateColumns: '120px 1fr 80px 90px',
                    gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)',
                    alignItems: 'center', fontSize: 12,
                  }}>
                    <div style={{ fontWeight: 600, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {agentName}
                    </div>
                    <div style={{ color: 'var(--dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.context_type ? `${run.context_type}: ` : ''}{run.context_id ?? run.id}
                    </div>
                    <div style={{ fontFamily: 'var(--mo)', color: col, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      {run.status ?? 'queued'}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', textAlign: 'right' }}>
                      {run.started_at
                        ? new Date(run.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      </section>

      {/* Permission Matrix + Cost Budget + Agent Skills — all derived */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Permission / Capability Matrix — derived from agents.capabilities */}
        <SpecCard accent dataSource="agents.capabilities">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Capability Matrix</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
              {(capMatrix as any).matrix?.length ?? 0} agents × {(capMatrix as any).caps?.length ?? 0} caps
            </span>
          </div>
          {(capMatrix as any).caps?.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>
              No capabilities declared on any agent yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9 }}>Agent</th>
                    {((capMatrix as any).caps ?? []).slice(0, 5).map((cap: string) => (
                      <th key={cap} style={{ padding: '6px 4px', textAlign: 'center', color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 9, fontWeight: 600 }}>{cap.slice(0, 8)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {((capMatrix as any).matrix ?? []).slice(0, 8).map((row: any) => (
                    <tr key={row.id}>
                      <td style={{ padding: '6px 8px', fontWeight: 600, whiteSpace: 'nowrap' }}>{row.name}</td>
                      {row.capabilities.slice(0, 5).map((c: any) => (
                        <td key={c.cap} style={{ padding: '6px 4px', textAlign: 'center' }}>
                          <span style={{ color: c.has ? 'var(--green)' : 'var(--dim)', fontFamily: 'var(--mo)' }}>
                            {c.has ? '●' : '○'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SpecCard>

        {/* Cost Budget — aggregated from sessions per agent this month */}
        <SpecCard accent dataSource="sessions,agents.monthly_budget">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Monthly Cost Budget</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>this month</span>
          </div>
          {((costBudgets as any[]) ?? []).length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>No spend recorded this month.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {((costBudgets as any[]) ?? []).slice(0, 6).map((b: any) => {
                const pct = b.pctUsed ?? 0
                const col = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--amber)' : 'var(--green)'
                return (
                  <div key={b.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                      <span style={{ fontWeight: 600 }}>{b.name}</span>
                      <span style={{ fontFamily: 'var(--mo)', color: col }}>
                        ${b.spend.toFixed(2)}{b.budget > 0 ? ` / $${b.budget}` : ''}
                      </span>
                    </div>
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: col, borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 2, fontFamily: 'var(--mo)' }}>
                      {b.runs} runs {b.budget === 0 ? '· no budget set' : `· ${Math.round(pct)}% used`}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SpecCard>
      </div>

      {/* Agent Skills Overview (from agents.capabilities) */}
      <SpecCard accent dataSource="agents.capabilities" style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Agent Skills Overview</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
          {agents.map((a: any) => {
            const caps: string[] = Array.isArray(a.capabilities) ? a.capabilities : []
            return (
              <div key={a.id} style={{ padding: 10, background: 'rgba(255,255,255,0.025)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{a.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {caps.length === 0 ? (
                    <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>no skills declared</span>
                  ) : caps.slice(0, 6).map((c: string) => (
                    <span key={c} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, fontFamily: 'var(--mo)', background: 'rgba(249,115,22,0.08)', color: 'var(--orange)', textTransform: 'uppercase' }}>{c}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </SpecCard>
    </>
  )
}
