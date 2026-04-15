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
import { getAgents, getAgentRunFeed, getAchievements } from '../lib/queries'
import { BUILTIN_AGENTS } from '../lib/agents'

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
  const [agentsRaw, runs, dbAchievements] = await Promise.allSettled([
    getAgents(),
    getAgentRunFeed(50),
    getAchievements('agents'),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

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

  const activeAgents = agents.filter((a: any) => a.status === 'active')
  const today = new Date().toISOString().slice(0, 10)
  const runsToday = runList.filter((r: any) => (r.started_at ?? r.created_at ?? '').startsWith(today))
  const completedRuns = runList.filter((r: any) => r.status === 'done')
  const avgLatencyMs = completedRuns.length > 0
    ? completedRuns.reduce((s: number, r: any) => {
        const start = r.started_at ? new Date(r.started_at).getTime() : 0
        const end   = r.completed_at ? new Date(r.completed_at).getTime() : 0
        return s + (end > start ? end - start : 0)
      }, 0) / completedRuns.length
    : 0
  const avgLatencyStr = avgLatencyMs > 0
    ? avgLatencyMs > 60000 ? `${(avgLatencyMs / 60000).toFixed(1)}m` : `${(avgLatencyMs / 1000).toFixed(1)}s`
    : '—'
  const queueDepth = runList.filter((r: any) => r.status === 'queued' || r.status === 'running').length

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}
             data-source="agents">
          {agents.map((agent: any) => {
            const color = agentTypeColor(agent)
            const agentRunsToday = runList.filter((r: any) =>
              r.agent_id === agent.id && (r.started_at ?? r.created_at ?? '').startsWith(today)
            )
            const lastRun = runList.find((r: any) => r.agent_id === agent.id)
            const isActive = agent.status === 'active'
            return (
              <SpecCard key={agent.id} accent dataSource="agents">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Status dot */}
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: isActive ? 'var(--green)' : 'var(--dim)',
                      boxShadow: isActive ? '0 0 8px var(--green)' : 'none',
                      flexShrink: 0,
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: color }}>{agent.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {agent.status ?? 'idle'}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    fontSize: 10, fontFamily: 'var(--mo)', padding: '2px 8px',
                    borderRadius: 6, border: `1px solid ${color}40`,
                    color, background: color + '12',
                  }}>
                    {agent.tier ?? agent.type ?? 'agent'}
                  </div>
                </div>

                {agent.description && (
                  <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 10, lineHeight: 1.5 }}>
                    {agent.description}
                  </div>
                )}

                {/* Capabilities */}
                {Array.isArray(agent.capabilities) && agent.capabilities.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 12 }}>
                    {agent.capabilities.slice(0, 4).map((cap: string) => (
                      <span key={cap} style={{
                        fontSize: 9, fontFamily: 'var(--mo)', padding: '2px 6px',
                        borderRadius: 4, background: 'rgba(255,255,255,0.05)',
                        color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.06em',
                      }}>{cap}</span>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--dim)', marginBottom: 12 }}>
                  <span>Runs today: <strong style={{ color: 'white' }}>{agentRunsToday.length}</strong></span>
                  {lastRun && (
                    <span>Last: <strong style={{ color: 'white' }}>
                      {new Date(lastRun.started_at ?? lastRun.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </strong></span>
                  )}
                </div>

                {/* Invoke button — client-side modal trigger */}
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

      {/* Coming Soon widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Permission Matrix"
          reason="Fine-grained per-agent capability gates — configure which tools each agent can access."
          icon="🔐"
          dataSource="coming-soon:agent_permissions"
          skeleton="table"
        />
        <ComingSoon
          title="Cost Budget"
          reason="Set monthly token & compute budgets per agent; alerts when thresholds are approaching."
          icon="💰"
          dataSource="coming-soon:agent_cost_budgets"
          skeleton="kpi"
        />
        <ComingSoon
          title="Agent Skills"
          reason="Attach custom tools and skills to specific agents from the Skill Lab."
          icon="⚡"
          dataSource="coming-soon:agent_skills"
          skeleton="table"
        />
      </div>
    </>
  )
}
