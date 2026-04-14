import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="THE FLOOR · LIVE OPS VIEW"
    title="The Floor"
    tagline="Trading-floor view of everything happening right now across the business."
    sections={[
      { title: 'Live Agents', desc: 'Who\'s working on what, in real time.' },
      { title: 'Money Moving', desc: 'Transactions clearing, invoices paid, bookings in.' },
      { title: 'Alerts', desc: 'Things that just changed and need a human glance.' },
    ]}
  />
}
