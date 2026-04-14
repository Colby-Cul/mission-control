import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="SKILL LAB · AGENT CAPABILITIES"
    title="Skill Lab"
    tagline="Where you teach agents new tricks and track what they can do."
    sections={[
      { title: 'Skill Registry', desc: 'Every capability available to your agents, versioned and tagged.' },
      { title: 'Training Runs', desc: 'Test a skill before promoting it into production agent stacks.' },
      { title: 'Gaps & Requests', desc: 'Skills you wish existed — collected from agent failures.' },
    ]}
  />
}
