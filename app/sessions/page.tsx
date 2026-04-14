import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="SESSIONS · CONVERSATION HISTORY"
    title="Sessions"
    tagline="Every conversation with every agent, searchable and resumable."
    sections={[
      { title: 'Active', desc: 'Conversations currently open across Claude, agents, and delegated workers.' },
      { title: 'Recent', desc: 'Last 100 sessions with one-click resume.' },
      { title: 'Pinned', desc: 'Sessions you want to keep handy — RFPs, planning threads, decisions.' },
    ]}
  />
}
