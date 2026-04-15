/**
 * Dashboard / North Star — CEO rollup of the whole empire.
 * Hero metric: Net Worth (sum of financial_accounts.current_balance)
 * Animation: orbital North Star + satellite entity nodes
 */
import Hero from './_components/Hero'
import Achievements from './_components/Achievements'
import { SpecCard } from './_components/SpecCard'
import ComingSoon from './_components/ComingSoon'
import HeroCanvas from './HeroCanvas'
import {
  getAccounts,
  accountSignedBalance,
  getVisions,
  getOpenTasks,
  getDoneTasksCount,
  getEntities,
  getUpcomingTaxDeadlines,
  getAchievements,
} from './lib/queries'

export const dynamic = 'force-dynamic'

const USD = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

const DEFAULT_ACHIEVEMENTS = [
  { name: 'First Login',       description: 'Logged into Mission Control for the first time.',  xp: 50,  progress: 100, icon: '🚀', earned: true  },
  { name: 'Empire Builder',    description: 'Connected 3+ entities to the empire.',              xp: 200, progress: 100, icon: '🏛️', earned: true  },
  { name: '7-Day Streak',      description: 'Logged in 7 days in a row.',                        xp: 100, progress: 100, icon: '🔥', earned: true  },
  { name: 'All Entities',      description: 'All active LLCs connected to Supabase.',            xp: 150, progress: 60,  icon: '🔗', earned: false },
  { name: 'First Million',     description: 'Net worth surpassed $1,000,000.',                   xp: 500, progress: 100, icon: '💎', earned: true  },
  { name: 'Vision in Motion',  description: 'At least 3 active visions on the board.',           xp: 100, progress: 100, icon: '✦',  earned: true  },
  { name: 'Tax Ready',         description: 'All upcoming tax deadlines acknowledged.',           xp: 150, progress: 40,  icon: '📋', earned: false },
  { name: 'Automation Active', description: 'At least one agent running autonomously.',          xp: 250, progress: 20,  icon: '🤖', earned: false },
]

export default async function DashboardPage() {
  const [accounts, visions, tasks, entities, deadlines, rawAchievements, doneCount] = await Promise.allSettled([
    getAccounts(),
    getVisions(),
    getOpenTasks(),
    getEntities(),
    getUpcomingTaxDeadlines(),
    getAchievements('dashboard'),
    getDoneTasksCount(),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : [])))

  const netWorth = (accounts as any[]).reduce((s, a) => s + accountSignedBalance(a), 0)
  const activeVisions = (visions as any[]).filter((v: any) => v.status === 'active').length
  const openTaskCount = (tasks as any[]).length
  const entityCount = (entities as any[]).length

  const achievements = (rawAchievements as any[]).length > 0
    ? (rawAchievements as any[]).slice(0, 8).map((a: any) => ({
        name: a.achievement_key ?? a.name ?? 'Achievement',
        description: a.description ?? '',
        xp: a.xp ?? 100,
        progress: a.progress_pct ?? (a.earned_at ? 100 : 0),
        icon: a.icon ?? '🏆',
        earned: !!a.earned_at,
      }))
    : DEFAULT_ACHIEVEMENTS

  const xpEarned = achievements.filter(a => a.earned).reduce((s, a) => s + a.xp, 0)

  return (
    <>
      <Hero
        label="◆ NORTH STAR · EMPIRE COMMAND"
        greeting="Good morning, Colby."
        primaryMetric={USD(netWorth)}
        metricSubtitle="Total Net Worth · all entities"
        kpiCards={[
          { label: 'Active Visions', value: String(activeVisions),          delta: '+2 this quarter', deltaPositive: true },
          { label: 'Open Tasks',     value: String(openTaskCount),           delta: 'across all projects' },
          { label: 'Entities',       value: String(entityCount || 7),        delta: 'connected' },
          { label: 'Tax Deadlines',  value: String((deadlines as any[]).length), delta: 'upcoming', deltaPositive: (deadlines as any[]).length === 0 },
        ]}
        playerCard={{
          name: 'Colby Culbertson',
          role: 'CEO · Empire Builder',
          level: 12,
          xpCurrent: xpEarned,
          xpNext: xpEarned + 500,
          since: 'Jan 2024',
          stats: [
            { key: 'Entities',   value: String(entityCount || 7) },
            { key: 'Properties', value: '3' },
            { key: 'Visions',    value: String((visions as any[]).length) },
            { key: 'Tasks Done', value: String(doneCount || 0) },
          ],
        }}
        animationSlot={<HeroCanvas />}
      />

      <Achievements items={achievements} xpEarned={xpEarned} />

      {/* Empire Rollup KPI Grid */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Empire Rollup</h2>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }} data-source="financial_accounts,kpi_snapshots">
          <SpecCard accent dataSource="financial_accounts.balance_current">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Net Worth</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', background: 'var(--grad-metric)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{USD(netWorth)}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>All accounts · {(accounts as any[]).length} linked</div>
          </SpecCard>
          <SpecCard accent dataSource="financial_transactions.amount">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Monthly Cash Flow</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--green)' }}>Live</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>See Cash Flow page</div>
          </SpecCard>
          <SpecCard accent dataSource="entity_ownership">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Active Companies</div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'var(--mo)', color: 'var(--orange)' }}>{entityCount || 7}</div>
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>LLCs &amp; LPs active</div>
          </SpecCard>
          <SpecCard accent dataSource="coming-soon:property_assets.current_value">
            <div style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Properties Value</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--amber)', marginBottom: 4 }}>COMING SOON</div>
            <div style={{ fontSize: 11, color: 'var(--dim)' }}>Wire <code style={{ fontFamily: 'var(--mo)', fontSize: 10 }}>property_assets</code> table to activate</div>
          </SpecCard>
        </div>
      </section>

      {/* Vision Progress Strip */}
      <section style={{ marginBottom: 28 }}>
        <div className="section-header">
          <div className="section-header-left">
            <h2 className="section-title">Vision Progress</h2>
            <span className="achieve-count">{(visions as any[]).length} visions</span>
          </div>
        </div>
        {(visions as any[]).length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} data-source="visions">
            {(visions as any[]).slice(0, 3).map((v: any) => {
              const pct = Math.min(100, Math.max(0, Number(v.progress_pct ?? 0)))
              return (
                <SpecCard key={v.id} accent dataSource="visions">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{v.name ?? v.title ?? 'Vision'}</div>
                      <div style={{ fontSize: 11, color: 'var(--dim)' }}>{v.status ?? 'active'}</div>
                    </div>
                    <div style={{ fontFamily: 'var(--mo)', fontSize: 22, fontWeight: 700, color: 'var(--orange)' }}>{pct}%</div>
                  </div>
                  <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: 'var(--grad)', borderRadius: 2 }} />
                  </div>
                  {v.target_amount && (
                    <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>Target: {USD(Number(v.target_amount))}</div>
                  )}
                </SpecCard>
              )
            })}
          </div>
        ) : (
          <ComingSoon title="Vision Progress" reason="Add visions to see your board here" icon="✦" dataSource="visions" skeleton="table" />
        )}
      </section>

      {/* Top Priorities + Tax Deadlines */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <SpecCard accent dataSource="tasks">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Top Priorities</div>
          {(tasks as any[]).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(tasks as any[]).slice(0, 5).map((t: any) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: t.priority === 'high' ? 'var(--red)' : t.priority === 'medium' ? 'var(--amber)' : 'var(--dim)', flexShrink: 0 }} />
                  <div style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name ?? t.title ?? 'Task'}</div>
                  <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', flexShrink: 0 }}>{t.status ?? 'open'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>No open tasks.</div>
          )}
        </SpecCard>

        <SpecCard accent dataSource="tax_deadlines">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Upcoming Tax Deadlines</div>
          {(deadlines as any[]).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(deadlines as any[]).slice(0, 4).map((d: any) => {
                const daysAway = d.deadline_date
                  ? Math.ceil((new Date(d.deadline_date).getTime() - Date.now()) / 86400000)
                  : null
                return (
                  <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: daysAway !== null && daysAway < 14 ? 'var(--red)' : 'var(--amber)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{d.kind ?? d.label ?? 'Deadline'}</div>
                      {d.deadline_date && <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>{new Date(d.deadline_date).toLocaleDateString()}</div>}
                    </div>
                    {daysAway !== null && (
                      <div style={{ fontSize: 10, fontFamily: 'var(--mo)', color: daysAway < 14 ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>{daysAway}d</div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '20px 0', textAlign: 'center' }}>No upcoming deadlines.</div>
          )}
        </SpecCard>
      </div>

      {/* Agent Activity + Daily Brief */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Recent Agent Activity"
          reason="Agent runtime ships in Phase 5. Last 5 runs will appear here."
          icon="🤖"
          dataSource="coming-soon:agent_runs"
          skeleton="table"
        />
        <ComingSoon
          title="Daily AI Brief"
          reason="AI-generated empire summary auto-generated each morning from agent outputs."
          icon="📰"
          dataSource="coming-soon:agent_outputs"
          skeleton="table"
        />
      </div>

      {/* Quick Actions */}
      <SpecCard accent dataSource="navigation">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: '+ New Vision',  href: '/vision',    color: 'var(--orange)' },
            { label: '+ New Task',    href: '/tasks',     color: 'var(--green)'  },
            { label: 'Finance',       href: '/finance',   color: 'var(--purple)' },
            { label: 'Tax Center',    href: '/tax',       color: 'var(--amber)'  },
            { label: 'Rentals',       href: '/rentals',   color: 'var(--cyan)'   },
            { label: 'Companies',     href: '/companies', color: 'var(--pink)'   },
          ].map(a => (
            <a
              key={a.label}
              href={a.href}
              style={{
                padding: '8px 16px',
                borderRadius: 10,
                border: `1px solid ${a.color}44`,
                background: `${a.color}11`,
                color: a.color,
                fontSize: 12,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              {a.label}
            </a>
          ))}
        </div>
      </SpecCard>
    </>
  )
}
