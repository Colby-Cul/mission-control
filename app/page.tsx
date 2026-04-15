import { getEntities, getAgents, getVisions, getAchievements, getUpcomingTaxDeadlines, getForgeIdeas, getAccounts, accountSignedBalance, getNetWorthTimeline, getCashFlowTimeline } from './lib/queries'
import Sparkline from './_components/Sparkline'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [entities, agents, visions, achievements, deadlines, ideas, accounts, nwTimeline, cfTimeline] = await Promise.all([
    getEntities(),
    getAgents(),
    getVisions(),
    getAchievements('dashboard'),
    getUpcomingTaxDeadlines(),
    getForgeIdeas('new'),
    getAccounts(),
    getNetWorthTimeline(),
    getCashFlowTimeline(),
  ])
  const netWorth = accounts.reduce((s: number, a: any) => s + accountSignedBalance(a), 0)

  return (
    <>
      <div className="hero">
        <div className="hero-label">◆ NORTH STAR · LIVE FROM SUPABASE</div>
        <h1>Good morning, Colby.</h1>
        <div className="big">${netWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        <p>
          {entities.length} active entities · {agents.filter(a => a.status === 'active').length} of {agents.length} agents online ·
          {' '}{ideas.length} new Forge ideas waiting review · {deadlines.length} upcoming tax deadlines
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Net Worth · last {nwTimeline.length} snapshots</h3>
          <Sparkline data={nwTimeline as any} color="var(--green)" fill="rgba(80,200,120,0.12)" />
        </div>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Cash Flow · last {cfTimeline.length} snapshots</h3>
          <Sparkline data={cfTimeline as any} color="var(--blue, #4aa3ff)" fill="rgba(74,163,255,0.12)" />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Active Visions</h3>
          {visions.map(v => (
            <div key={v.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600 }}>{v.img} {v.name}</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{v.target_label} · {v.deadline}</div>
            </div>
          ))}
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Agent Team</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {agents.slice(0, 8).map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(255,255,255,.02)', borderRadius: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.status === 'active' ? 'var(--green)' : a.status === 'idle' ? 'var(--amber)' : 'var(--t4)' }} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginLeft: 'auto' }}>{a.role}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Upcoming Tax Deadlines</h3>
          {deadlines.map(d => (
            <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{d.kind}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{d.entity_id ?? 'All entities'}</div>
              </div>
              <div style={{ fontFamily: 'var(--mo)', color: 'var(--red)', fontSize: 12 }}>
                ${d.amount_due?.toLocaleString()} · {d.deadline_date}
              </div>
            </div>
          ))}
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Achievements</h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {achievements.filter(a => a.earned_at).slice(0, 8).map(a => (
              <div key={a.id} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28 }}>{a.icon}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{a.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
