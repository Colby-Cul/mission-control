import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="WORKSPACE FILES · UPLOADS & ASSETS"
    title="Workspace Files"
    tagline="Drop files here — agents index them automatically."
    sections={[
      { title: 'Recent Uploads', desc: 'The last files you or an agent added to the workspace.' },
      { title: 'By Project', desc: 'Files grouped by the project or entity they belong to.' },
      { title: 'Indexed', desc: 'Files agents can search and quote from.' },
    ]}
  />
}
