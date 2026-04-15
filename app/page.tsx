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
  getProperties,
  getNetWorthFromGraph,
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
  const [accounts, visions, tasks, entities, deadlines, rawAchievements, doneCount, properties, nwGraph] = await Promise.allSettled([
    getAccounts(),
    getVisions(),
    getOpenTasks(),
    getEntities(),
    getUpcomingTaxDeadlines(),
    getAchievements('dashboard'),
    getDoneTasksCount(),
    getProperties().catch(() => []),
    getNetWorthFromGraph().catch(() => null),
  ]).then(results => results.map(r => (r.status === 'fulfilled' ? r.value : (r.status === 'rejected' ? null : null))))

  const netWorthGraph = nwGraph as Awaited<ReturnType<typeof getNetWorthFromGraph>> | null
  // Use graph-cascaded total if available, otherwise fall back to raw account sum
  const rawNetWorth = (accounts as any[]).reduce((s, a) => s + accountSignedBalance(a), 0)
  const netWorth = netWorthGraph?.total ?? rawNetWorth
  const activeVisions = (visions as any[]).filter((v: any) => v.status === 'active').length
  const openTaskCount = (tasks as any[]).length
  const entityCount = (entities as any[]).length

  // Portfolio breakdown (for Goal Tracker + Portfolio bars)
  const GOAL_TARGET = 10_000_000
  const goalPct = Math.min(100, parseFloat(((netWorth / GOAL_TARGET) * 100).toFixed(1)))

  const liquidCash = (accounts as any[])
    .filter((a: any) => String(a.type ?? '').toLowerCase() === 'depository')
    .reduce((s: number, a: any) => s + accountSignedBalance(a), 0)
  const investments = (accounts as any[])
    .filter((a: any) => ['investment', 'brokerage'].includes(String(a.type ?? '').toLowerCase()))
    .reduce((s: number, a: any) => s + accountSignedBalance(a), 0)
  const realEstateEquity = (properties as any[])
    .reduce((s: number, p: any) => s + Number(p.owned_equity ?? p.equity ?? 0), 0)
  const totalAssets = Math.max(1, liquidCash + investments + realEstateEquity)

  const portfolioRows = [
    { label: 'Real Estate (Owned Equity)', val: realEstateEquity, color: 'var(--orange)', pct: Math.round((realEstateEquity / totalAssets) * 100) },
    { label: 'Liquid Cash',               val: liquidCash,        color: 'var(--green)',  pct: Math.round((liquidCash        / totalAssets) * 100) },
    { label: 'Investments',               val: investments,       color: 'var(--purple)', pct: Math.round((investments       / totalAssets) * 100) },
  ]

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
            <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 6 }}>Cascaded ownership · {(accounts as any[]).length} accounts</div>
            {netWorthGraph && netWorthGraph.byEntity.length > 0 && (
              <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {netWorthGraph.direct !== 0 && (
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 5 }}>
                    direct: {USD(netWorthGraph.direct)}
                  </span>
                )}
                {netWorthGraph.byEntity.slice(0, 3).map(b => (
                  <span key={b.entityId} style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.04)', padding: '2px 7px', borderRadius: 5 }}>
                    {b.entityName.split(' ').slice(0, 2).join(' ')}: {USD(b.amount)}
                  </span>
                ))}
              </div>
            )}
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

      {/* Goal Tracker + Portfolio Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
        {/* Goal Tracker — $10M by 2030 */}
        <SpecCard accent dataSource="financial_accounts.balance_current">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>50-Year Goal · $10M Milestone</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* SVG donut */}
            <div style={{ position: 'relative', width: 100, height: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width={100} height={100} style={{ position: 'absolute', transform: 'rotate(-90deg)' }}>
                <defs>
                  <linearGradient id="ns-dg-v7" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#f97316" />
                    <stop offset="50%"  stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <circle cx={50} cy={50} r={42} fill="none" stroke="rgba(255,255,255,.05)" strokeWidth={8} />
                <circle cx={50} cy={50} r={42} fill="none" stroke="url(#ns-dg-v7)" strokeWidth={8}
                  strokeDasharray={2 * Math.PI * 42}
                  strokeDashoffset={2 * Math.PI * 42 * (1 - goalPct / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--mo)' }}>{goalPct}%</div>
                <div style={{ fontSize: 9, color: 'var(--dim)' }}>TO $10M</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: 'var(--dim)', marginBottom: 8 }}>
                Next milestone: <strong style={{ color: 'inherit' }}>$10M by 2030</strong>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ height: '100%', width: `${goalPct}%`, background: 'linear-gradient(90deg,var(--orange),var(--pink),var(--purple))', borderRadius: 3, transition: 'width .6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--dim)', marginBottom: 10 }}>
                <span>Current: {USD(netWorth)}</span>
                <span>Gap: {USD(Math.max(0, GOAL_TARGET - netWorth))}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--dim)', lineHeight: 1.6 }}>
                At 18% annual growth, reaching $10M by{' '}
                <strong style={{ color: 'var(--green)' }}>2031</strong>.{' '}
                +$8K/mo cash flow accelerates to{' '}
                <strong style={{ color: 'var(--orange)' }}>2029</strong>.
              </div>
            </div>
          </div>
        </SpecCard>

        {/* Portfolio Breakdown */}
        <SpecCard accent dataSource="financial_accounts,property_assets">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Portfolio Breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {portfolioRows.map((r, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, color: 'var(--dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: r.color, display: 'inline-block' }} />
                    {r.label}
                  </span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mo)' }}>
                    {USD(Math.round(r.val))} <span style={{ color: 'var(--dim)', fontSize: 10 }}>{r.pct}%</span>
                  </span>
                </div>
                <div style={{ height: 4, background: 'rgba(255,255,255,.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 2, transition: 'width .5s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </SpecCard>
      </div>

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

      {/* Entity List */}
      {(entities as any[]).length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <div className="section-header">
            <div className="section-header-left">
              <h2 className="section-title">Entities</h2>
              <span className="achieve-count">{(entities as any[]).length} active</span>
            </div>
          </div>
          <SpecCard accent dataSource="entity_ownership">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(entities as any[]).map((e: any) => (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--mo)', color: 'var(--dim)', background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: 4, minWidth: 28, textAlign: 'center' }}>
                    {e.state ?? 'US'}
                  </span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{e.entity_name}</span>
                  <span style={{ fontSize: 12, color: 'var(--dim)' }}>{e.entity_type}</span>
                </div>
              ))}
            </div>
          </SpecCard>
        </section>
      )}

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
