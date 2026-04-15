import { getAgents, getCompanyMilestones, getUpcomingTaxDeadlines, getRecentTransactions, getAgentRunFeed, getForgeIdeas, getOpenTasks } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function FloorPage() {
  const [agents, milestones, deadlines, txns, runs, ideas, tasks] = await Promise.all([
    getAgents(),
    getCompanyMilestones(),
    getUpcomingTaxDeadlines(),
    getRecentTransactions(10),
    getAgentRunFeed(10),
    getForgeIdeas('new'),
    getOpenTasks(),
  ])

  const live = agents.filter((a: any) => a.status === 'active')
  const now = Date.now()
  const alerts: { color: string; text: string; meta?: string }[] = []
  deadlines.forEach((d: any) => {
    const days = Math.round((new Date(d.deadline_date).getTime() - now) / (1000 * 60 * 60 * 24))
    if (days <= 30) alerts.push({ color: days <= 7 ? 'var(--red)' : 'var(--amber)', text: `${d.kind} · ${d.entity_id ?? 'all entities'}`, meta: `${days}d · $${d.amount_due?.toLocaleString() ?? '—'}` })
  })
  if (ideas.length > 0) alerts.push({ color: 'var(--amber)', text: `${ideas.length} Forge ideas waiting review`, meta: 'from The Forge' })
  milestones.forEach((m: any) => {
    if (m.status === 'overdue' || (m.target_date && new Date(m.target_date).getTime() < now && !m.completed_at)) {
      alerts.push({ color: 'var(--red)', text: `Overdue: ${m.title}`, meta: m.entity_id })
    }
  })

  return (
    <>
      <div className="hero">
        <div className="hero-label">🏢 THE FLOOR · LIVE OPS VIEW</div>
        <h1>The Floor</h1>
        <div className="big" style={{ color: alerts.length === 0 ? 'var(--green)' : 'var(--amber)' }}>
          {alerts.length === 0 ? 'All Clear' : `${alerts.length} Alert${alerts.length === 1 ? '' : 's'}`}
        </div>
        <p>{live.length} of {agents.length} agents active · {tasks.length} open tasks · {milestones.length} milestones tracked</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Alerts · needs a glance</h3>
          {alerts.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>Nothing urgent. Enjoy the quiet.</div>}
          {alerts.slice(0, 12).map((a, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color }} />
                <div>{a.text}</div>
              </div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 11, color: 'var(--t4)' }}>{a.meta ?? ''}</div>
            </div>
          ))}
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Live Agents</h3>
          {agents.map((a: any) => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.status === 'active' ? 'var(--green)' : a.status === 'idle' ? 'var(--amber)' : 'var(--t4)' }} />
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto', fontFamily: 'var(--mo)' }}>{a.role} · {a.status ?? 'idle'}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Money Moving</h3>
          {txns.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No transactions in staging yet — Plaid sync pending.</div>}
          {txns.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{t.name || t.merchant_name}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{t.date}</div>
              </div>
              <div style={{ fontFamily: 'var(--mo)', color: Number(t.amount) > 0 ? 'var(--red)' : 'var(--green)' }}>
                {Number(t.amount) > 0 ? '-' : '+'}${Math.abs(Number(t.amount)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
            </div>
          ))}
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Agent Activity</h3>
          {runs.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No agent runs logged yet.</div>}
          {runs.map((r: any) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{r.agent?.name ?? r.agent_id} · {r.task ?? r.type ?? 'run'}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{r.status ?? '—'}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>{r.started_at?.slice(11, 16) ?? ''}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
