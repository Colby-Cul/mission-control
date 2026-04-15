import { getEntityDocuments, getEntities, getUpcomingTaxDeadlines } from '../lib/queries'

export const dynamic = 'force-dynamic'

const LEGAL_TYPES = ['operating_agreement', 'contract', 'insurance', 'formation', 'filing', 'ein', 'annual_report', 'legal']

export default async function LegalPage() {
  const [docs, entities, deadlines] = await Promise.all([
    getEntityDocuments(LEGAL_TYPES),
    getEntities(),
    getUpcomingTaxDeadlines(),
  ])

  const buckets = {
    'Entity Filings': docs.filter((d: any) => ['formation', 'filing', 'annual_report', 'ein'].includes(d.document_type)),
    'Operating Agreements': docs.filter((d: any) => d.document_type === 'operating_agreement'),
    Contracts: docs.filter((d: any) => d.document_type === 'contract'),
    Insurance: docs.filter((d: any) => d.document_type === 'insurance'),
  }

  return (
    <>
      <div className="hero">
        <div className="hero-label">⚖ LEGAL DOCS · CONTRACTS &amp; FILINGS</div>
        <h1>Legal Docs</h1>
        <div className="big">{docs.length}</div>
        <p>{entities.length} entities under management · {deadlines.length} upcoming filings</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Entities on file</h3>
          {entities.map((e: any) => (
            <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{e.entity_name}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{e.entity_type} · {e.state ?? '—'}</div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mo)' }}>EIN {e.ein ? '••' + String(e.ein).slice(-4) : '—'}</div>
            </div>
          ))}
        </div>

        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Upcoming Filings</h3>
          {deadlines.length === 0 && <div style={{ fontSize: 12, color: 'var(--t3)' }}>No filings on the calendar.</div>}
          {deadlines.map((d: any) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div>
                <div style={{ fontWeight: 500 }}>{d.kind}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{d.entity_id ?? 'All entities'}</div>
              </div>
              <div style={{ fontFamily: 'var(--mo)', fontSize: 11, color: 'var(--red)' }}>{d.deadline_date}</div>
            </div>
          ))}
        </div>
      </div>

      {Object.entries(buckets).map(([title, list]) => (
        <div key={title} className="mc-card accent" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>{title} · {list.length}</h3>
          {list.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>Nothing filed in this bucket yet.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {list.map((d: any) => (
                <div key={d.id} style={{ padding: 10, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase' }}>{d.entity_name ?? d.entity_id ?? 'unfiled'}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, margin: '4px 0', wordBreak: 'break-word' }}>{d.filename}</div>
                  <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>{d.created_at?.slice(0, 10)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  )
}
