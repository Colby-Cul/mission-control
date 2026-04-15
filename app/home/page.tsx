/**
 * Home — personal CEO home base, quick actions, and daily briefing.
 * Hero metric: today's date / daily context
 * Animation: sunrise — warm gradient sweep with time-of-day awareness
 * Sources: coming-soon
 */
import Hero from '../_components/Hero'
import ComingSoon from '../_components/ComingSoon'
import HeroCanvas from '../_components/HeroCanvasDefault'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <>
      <Hero
        label="⌂ HOME · DAILY BRIEFING"
        greeting="Welcome home."
        primaryMetric="Today"
        metricSubtitle="your personal command base"
        kpiCards={[
          { label: 'Events Today',  value: '—', delta: 'calendar',   deltaPositive: true },
          { label: 'Messages',      value: '—', delta: 'unread',     deltaPositive: false },
          { label: 'Pending Tasks', value: '—', delta: 'due today',  deltaPositive: false },
          { label: 'Agent Updates', value: '—', delta: 'since last',  deltaPositive: true },
        ]}
        animationSlot={<HeroCanvas />}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Daily Briefing"
          reason="AI-generated morning briefing: calendar, priorities, market data, and open threads."
          icon="☀️"
          dataSource="coming-soon:home.briefing"
          skeleton="table"
        />
        <ComingSoon
          title="Quick Actions"
          reason="One-click shortcuts to most common workflows — invoke agent, create task, draft email."
          icon="⚡"
          dataSource="coming-soon:home.quick_actions"
          skeleton="kpi"
        />
        <ComingSoon
          title="Upcoming Events"
          reason="Next 7 days from Google Calendar — meetings, deadlines, and important dates."
          icon="📅"
          connect="google"
          dataSource="coming-soon:home.calendar"
          skeleton="table"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <ComingSoon
          title="Inbox Digest"
          reason="Summarized email threads surfaced by AgentMail — reply, delegate, or archive."
          icon="📬"
          connect="gmail"
          dataSource="coming-soon:home.inbox"
          skeleton="table"
        />
        <ComingSoon
          title="Today's Focus"
          reason="AI-selected top 3 priorities for the day based on tasks, revenue impact, and deadlines."
          icon="🎯"
          dataSource="coming-soon:home.focus"
          skeleton="kpi"
        />
      </div>
    </>
  )
}
