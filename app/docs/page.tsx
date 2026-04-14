import { getDocs } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function DocsPage() {
  const docs = await getDocs()

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ DOCS HUB · LIVING DOCUMENTS</div>
        <h1>Docs Hub</h1>
        <div className="big">{docs.length}</div>
        <p>SOPs, playbooks, and reference docs your agents can read.</p>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>All Docs</h3>
        {docs.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>No docs yet. Add SOPs and playbooks here.</div>}
        {docs.map((d: any) => (
          <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{d.title ?? d.name}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>{d.category ?? d.type ?? '—'} · updated {d.updated_at ?? d.created_at ?? ''}</div>
          </div>
        ))}
      </div>
    </>
  )
}
