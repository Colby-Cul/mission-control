import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="SETTINGS · PREFERENCES & ACCESS"
    title="Settings"
    tagline="Your profile, notification rules, and who can see what."
    sections={[
      { title: 'Profile', desc: 'Name, timezone, default entity, and display preferences.' },
      { title: 'Notifications', desc: 'What gets pushed to your phone, email, or Slack.' },
      { title: 'Access', desc: 'People and agents who can act on your behalf.' },
    ]}
  />
}
