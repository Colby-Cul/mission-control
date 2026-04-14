import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="DOCS HUB · LIVING DOCUMENTS"
    title="Docs Hub"
    tagline="SOPs, playbooks, and reference docs your agents use to operate."
    sections={[
      { title: 'Playbooks', desc: 'Repeatable processes — from guest onboarding to quarterly close.' },
      { title: 'SOPs', desc: 'Standard operating procedures, versioned and owned.' },
      { title: 'Reference', desc: 'Cheat sheets, glossaries, and decision trees.' },
    ]}
  />
}
