/**
 * Home — personal CEO home base, quick actions, and daily briefing.
 * Derived from: agent_runs + sessions + tasks + deadlines (Daily Brief),
 * hard-coded quick actions matrix, tasks (Today's Focus).
 */
import Link from 'next/link'
import Hero from '../_components/Hero'
import { SpecCard } from '../_components/SpecCard'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from '../_components/HeroCanvasDefault'
import UpcomingEventsCard from './UpcomingEventsCard'
import { getDailyBrief, getOpenTasks } from '../lib/queries'

export const dynamic = 'force-dynamic'

const QUICK_ACTIONS = [
  { label: 'Invoke Agent',   href: '/agents',     icon: '🤖', color: 'var(--orange)' },
  { label: 'Create Task',    href: '/tasks',      icon: '✓',  color: 'var(--green)'  },
  { label: 'Cash Flow',      href: '/cash-flow',  icon: '≈',  color: 'var(--amber)'  },
  { label: 'Tax Center',     href: '/tax',        icon: '⚖', color: 'var(--purple)' },
  { label: 'Properties',     href: '/properties', icon: '⌂',  color: 'var(--cyan)'   },
  { label: 'Files',          href: '/files',      icon: '📁', color: 'var(--pink)'   },
]

export default async function HomePage() {
  const [brief, tasks] = await Promise.allSettled([
    getDailyBrief().catch(() => null),
    getOpenTasks().catch(() => []),
  ]).then(r => r.map(x => (x.status === 'fulfilled' ? x.value : null)))

  const b = brief as any
  const todayStr = new Date().toISOString().slice(0, 10)
  const tasksDueToday = ((tasks as any[]) ?? []).filter((t: any) => (t.due_date ?? '').startsWith(todayStr))
  const focusTasks = ((tasks as any[]) ?? [])
    .slice()
    .sort((a: any, b: any) => {
      const order = { critical: 0, high: 1, medium: 2, normal: 3, low: 4 } as any
      return (order[a.priority] ?? 5) - (order[b.priority] ?? 5)
    })
    .slice(0, 3)

  return (
    <>
      <Hero
        label="⌂ HOME · DAILY BRIEFING"
        greeting="Welcome home."
        primaryMetric="Today"
        metricSubtitle="your personal command base"
        kpiCards={[
          { label: 'Events Today',  value: String(b?.runsToday ?? 0),       delta: 'agent runs + sessions', deltaPositive: (b?.runsToday ?? 0) > 0 },
          { label: 'Open Tasks',    value: String(b?.openTaskCount ?? 0),   delta: `${b?.highPriTasks?.length ?? 0} high-pri` },
          { label: 'Due Today',     value: String(tasksDueToday.length),    delta: 'on calendar' },
          { label: 'Next Deadline', value: b?.nextDeadline?.deadline_date ?? 'None', delta: b?.nextDeadline?.kind ?? 'all clear', deltaPositive: !b?.nextDeadline },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        {/* Daily Briefing — real data */}
        <SpecCard accent dataSource="derived:daily_brief">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Daily Briefing</div>
            <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--orange)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </span>
          </div>
          {!b ? (
            <div style={{ fontSize: 12, color: 'var(--dim)' }}>Gathering today's context…</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                `${b.runsToday} agent runs logged today`,
                `${b.openTaskCount} open tasks in the queue`,
                b.nextDeadline ? `Next deadline: ${b.nextDeadline.kind} on ${new Date(b.nextDeadline.deadline_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}` : 'No tax deadlines in the next 90 days',
                b.nextMilestone ? `Upcoming milestone: ${b.nextMilestone.title}` : null,
                `${b.entityCount} active entities under management`,
              ].filter(Boolean).map((line: string, i: number) => (
                <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, lineHeight: 1.5 }}>
                  <span style={{ color: 'var(--orange)', fontFamily: 'var(--mo)' }}>▸</span>
                  <span>{line}</span>
                </div>
              ))}
            </div>
          )}
        </SpecCard>

        {/* Quick Actions — populated grid */}
        <SpecCard accent dataSource="static:quick_actions">
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Quick Actions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
            {QUICK_ACTIONS.map(a => (
              <Link key={a.label} href={a.href} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                background: 'rgba(255,255,255,0.025)', borderRadius: 8,
                border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit',
                fontSize: 12, fontWeight: 500,
              }}>
                <span style={{ fontSize: 16, color: a.color }}>{a.icon}</span>
                <span>{a.label}</span>
              </Link>
            ))}
          </div>
        </SpecCard>

        <UpcomingEventsCard />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Inbox Digest"
          reason="Requires Gmail OAuth — connect Google in Settings to see AgentMail thread summaries here."
          icon="📬"
          connect="google"
          dataSource="coming-soon:home.inbox"
          skeleton="table"
        />

        {/* Today's Focus — derived from priority-sorted open tasks */}
        <SpecCard accent dataSource="tasks">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Today's Focus</div>
            <span style={{ fontSize: 10, fontFamily: 'var(--mo)', color: 'var(--dim)' }}>top 3 by priority</span>
          </div>
          {focusTasks.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: '20px 0' }}>
              No open tasks. <Link href="/tasks" style={{ color: 'var(--orange)' }}>+ Add task</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {focusTasks.map((t: any, i: number) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--orange), var(--purple))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0,
                  }}>{i + 1}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title ?? t.name ?? 'Task'}</div>
                    <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 2 }}>
                      {t.priority ?? 'normal'} · {t.status ?? 'open'}
                      {t.due_date && <span> · due {new Date(t.due_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SpecCard>
      </div>
    </>
  )
}
