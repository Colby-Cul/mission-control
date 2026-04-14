import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="MEMORY & KNOWLEDGE · WHAT AGENTS REMEMBER"
    title="Memory & Knowledge"
    tagline="The shared brain — facts, preferences, and context every agent can read."
    sections={[
      { title: 'Facts', desc: 'Long-lived truths: entities, properties, people, accounts.' },
      { title: 'Preferences', desc: 'How you like things done. Agents respect these by default.' },
      { title: 'Feedback', desc: 'Corrections you gave agents — so they don\'t repeat mistakes.' },
    ]}
  />
}
