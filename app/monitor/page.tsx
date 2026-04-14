import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="SYSTEM MONITOR · INFRASTRUCTURE HEALTH"
    title="System Monitor"
    tagline="Is everything that should be running, actually running?"
    sections={[
      { title: 'Services', desc: 'Mac Mini Worker, Supabase, Vercel, cron jobs — green or red.' },
      { title: 'Sync Status', desc: 'Plaid, QuickBooks, bank feeds — last successful pull per source.' },
      { title: 'Errors', desc: 'Failures in the last 24h with one-click replay.' },
    ]}
  />
}
