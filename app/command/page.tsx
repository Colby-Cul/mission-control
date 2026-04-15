/**
 * Command Deck — real-time operational command center.
 * Ported from live CommandDeck.jsx: KPIs, blocked queue, recent completed,
 * sessions task table, quick actions.
 * Sources: sessions, tasks, agent_runs
 */
import Hero from '../_components/Hero'
import Achievements from '../_components/Achievements'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from '../_components/HeroCanvasDefault'
import {
  getSessionsForWindow,
  getOpenTasks,
  getActiveProjects,
  getIncidents,
  getServiceStatusGrid,
  getAgentCostBudgets,
  getPerformanceTimeseries,
} from '../lib/queries'

export const dynamic = 'force-dynamic'

const USD2 = (n: number) => `$${Number(n ?? 0).toFixed(2)}`

function fmtDate(s: string | null): string {
  if (!s) return '—'
  const d = new Date(s)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ACHIEVEMENTS = [
  { name: 'First Mission',    description: 'First agent task dispatched from Command Deck.',   xp: 50,  progress: 100, icon: '🎯', earned: true  },
  { name: 'Clear Deck',       description: 'No blocked tasks in the queue.',                   xp: 200, progress: 100, icon: '✅', earned: true  },
  { name: 'Fleet Commander',  description: 'Managed 10+ simultaneous agent sessions.',        xp: 300, progress: 80,  icon: '⚓', earned: false },
  { name: 'Cron King',        description: 'All cron jobs running without error for 7 days.', xp: 250, progress: 40,  icon: '🕐', earned: false },
]

export default async function CommandPage() {
  const [sessions, tasks, projects, incidents, services, costBudgets, perfSeries] = await Promise.allSettled([
    getSessionsForWindow('24h'),
    getOpenTasks(),
    getActiveProjects(),
    getIncidents().catch(() => []),
    getServiceStatusGrid().catch(() => []),
    getAgentCostBudgets().catch(() => []),
    getPerformanceTimeseries(7).catch(() => []),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const todayCount   = (sessions as any[]).length
  const blockedTasks = (sessions as any[]).filter((s: any) => s.status === 'error' || s.status === 'failed')
  const completed    = (sessions as any[]).filter((s: any) => s.status === 'done' || s.status === 'completed')
  const projectCount = (projects as any[]).filter((p: any) => p.status === 'active').length
  const openIncidents = (incidents as any[]).filter((i: any) => i.status !== 'resolved').length

  const xpEarned = ACHIEVEMENTS.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="⊕ COMMAND · DECK · OPERATIONS"
        greeting="Command Deck"
        primaryMetric={String(todayCount)}
        metricSubtitle="Sessions today (24h)"
        kpiCards={[
          { label: "Today's Sessions", value: String(todayCount),      delta: 'last 24h',          deltaPositive: true  },
          { label: 'Blocked / Error',  value: String(blockedTasks.length), delta: blockedTasks.length === 0 ? 'all clear' : 'needs attention', deltaPositive: blockedTasks.length === 0 },
          { label: 'Active Projects',  value: String(projectCount),    delta: 'in progress',       deltaPositive: true  },
          { label: 'Open Incidents',   value: String(openIncidents),   delta: 'open',              deltaPositive: openIncidents === 0 },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={ACHIEVEMENTS} xpEarned={xpEarned} />

      {/* Blocked Queue + Recent Completed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <SpecCard accent dataSource="sessions">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: blockedTasks.length > 0 ? 'var(--red)' : 'inherit' }}>
            Blocked / Error Queue ({blockedTasks.length})
          </div>
          {blockedTasks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {blockedTasks.slice(0, 8).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(t.title || 'Session').slice(0, 50)}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)' }}>{t.agent_name ?? 'agent'} · {fmtDate(t.started_at)}</div>
                  </div>
                  <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: 'var(--red)', marginLeft: 8 }}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--green)', fontSize: 13, padding: '12px 0' }}>No blocked or error sessions in the last 24h.</div>
          )}
        </SpecCard>

        <SpecCard accent dataSource="sessions">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Recently Completed</div>
          {completed.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {completed.slice(0, 8).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {(t.title || 'Session').slice(0, 45)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', flexShrink: 0, marginLeft: 8 }}>
                    {t.cost_usd ? USD2(t.cost_usd) : '—'} · {fmtDate(t.ended_at)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '12px 0', textAlign: 'center' }}>No completed sessions in last 24h.</div>
          )}
        </SpecCard>
      </div>

      {/* Sessions Table */}
      {(sessions as any[]).length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SpecCard dataSource="sessions">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Sessions (24h) — {(sessions as any[]).length}</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr>
                    {(['Title', 'Agent', 'Status', 'Cost', 'Started'] as string[]).map(h => (
                      <th key={h} style={{ fontSize: 10, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '8px 8px', textAlign: 'left', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(sessions as any[]).slice(0, 20).map((t: any, i: number) => {
                    const stColor = t.status === 'done' || t.status === 'completed' ? 'var(--green)'
                      : t.status === 'error' || t.status === 'failed' ? 'var(--red)'
                      : 'var(--amber)'
                    return (
                      <tr key={t.id} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                        <td style={{ padding: '8px 8px', fontWeight: 500 }}>{(t.title || '—').slice(0, 50)}</td>
                        <td style={{ padding: '8px 8px', color: 'var(--dim)' }}>{t.agent_name ?? '—'}</td>
                        <td style={{ padding: '8px 8px' }}>
                          <span style={{ fontSize: 9, padding: '2px 5px', borderRadius: 3, background: `${stColor}18`, color: stColor, fontWeight: 700, textTransform: 'uppercase' }}>{t.status}</span>
                        </td>
                        <td style={{ padding: '8px 8px', fontFamily: 'var(--mo)', color: 'var(--dim)' }}>{t.cost_usd ? USD2(t.cost_usd) : '—'}</td>
                        <td style={{ padding: '8px 8px', color: 'var(--dim)' }}>{fmtDate(t.started_at)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </SpecCard>
        </section>
      )}

      {/* Open Tasks */}
      {(tasks as any[]).length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <SpecCard accent dataSource="tasks">
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Open Tasks</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(tasks as any[]).slice(0, 10).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.priority === 'high' || t.priority === 'critical' ? 'var(--red)' : t.priority === 'medium' ? 'var(--amber)' : 'var(--dim)', flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name ?? t.title ?? 'Task'}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', flexShrink: 0 }}>{t.status ?? 'open'}</div>
                </div>
              ))}
            </div>
          </SpecCard>
        </section>
      )}

      {/* Service Map + Cost Burn — all derived from sessions + agents */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Live System Map (service status grid) */}
        <SpecCard accent dataSource="agents,sessions">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Live System Map</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{(services as any[]).length} services</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {((services as any[]) ?? []).slice(0, 10).map((s: any) => {
              const col = s.health === 'healthy' ? 'var(--green)' : s.health === 'degraded' ? 'var(--amber)' : s.health === 'down' ? 'var(--red)' : 'var(--dim)'
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: col, flexShrink: 0, boxShadow: s.health === 'healthy' ? `0 0 6px ${col}` : 'none' }} />
                  <div style={{ flex: 1, fontSize: 11, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 9, color: col, fontFamily: 'var(--mo)', textTransform: 'uppercase' }}>{s.health}</div>
                </div>
              )
            })}
          </div>
        </SpecCard>

        {/* Deployment Pipeline — kept as ComingSoon (requires Vercel/GitHub API) */}
        <ComingSoon
          title="Deployment Pipeline"
          reason="Requires GitHub Actions + Vercel integration — not yet configured. Connect in Settings → Integrations."
          icon="🚀"
          dataSource="coming-soon:command.deployments"
          skeleton="table"
        />

        {/* Cost Burn Rate — aggregated from sessions */}
        <SpecCard accent dataSource="sessions">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Cost Burn Rate</div>
            <span style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>7d</span>
          </div>
          {(() => {
            const series = (perfSeries as any[]) ?? []
            if (series.length === 0) return <div style={{ fontSize: 12, color: 'var(--dim)' }}>No cost data in the last 7 days.</div>
            const totalCost = series.reduce((s, d: any) => s + Number(d.cost ?? 0), 0)
            const totalRuns = series.reduce((s, d: any) => s + Number(d.runs ?? 0), 0)
            const maxCost = Math.max(...series.map((d: any) => Number(d.cost ?? 0)), 0.001)
            return (
              <>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--amber)', marginBottom: 4 }}>
                  ${totalCost.toFixed(3)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 14 }}>{totalRuns} runs · 7-day total</div>
                <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 60 }}>
                  {series.slice(-14).map((d: any, i: number) => {
                    const barH = Math.max(2, Math.round((Number(d.cost ?? 0) / maxCost) * 58))
                    return (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                        <div style={{ height: barH, background: 'var(--amber)', borderRadius: '2px 2px 0 0', opacity: 0.7 }} />
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </SpecCard>
      </div>
    </>
  )
}
