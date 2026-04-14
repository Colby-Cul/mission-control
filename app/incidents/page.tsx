import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="INCIDENT ROOM · THINGS ON FIRE"
    title="Incident Room"
    tagline="Where open issues live until resolved — with blast-radius and owner."
    sections={[
      { title: 'Open', desc: 'Active incidents needing attention, ranked by impact.' },
      { title: 'Watching', desc: 'Things trending wrong but not broken yet.' },
      { title: 'Resolved', desc: 'Recent postmortems and fixes — with lessons learned.' },
    ]}
  />
}
