import ComingSoon from '../_components/ComingSoon'
export const dynamic = 'force-dynamic'
export default function Page() {
  return <ComingSoon
    label="LEGAL DOCS · CONTRACTS & FILINGS"
    title="Legal Docs"
    tagline="Operating agreements, contracts, insurance, and state filings in one place."
    sections={[
      { title: 'Entity Filings', desc: 'Annual reports, franchise taxes, and formation docs per entity.' },
      { title: 'Contracts', desc: 'Active agreements with vendors, partners, and guests.' },
      { title: 'Insurance', desc: 'Policies, renewals, and claims across properties and businesses.' },
    ]}
  />
}
