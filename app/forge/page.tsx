import { getForgeIdeas } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function ForgePage() {
  const [neu, approved, rejected] = await Promise.all([
    getForgeIdeas('new'),
    getForgeIdeas('approved'),
    getForgeIdeas('rejected'),
  ])

  const columns = [
    { key: 'new', title: 'New', items: neu, color: 'var(--t2)' },
    { key: 'approved', title: 'Approved', items: approved, color: 'var(--green)' },
    { key: 'rejected', title: 'Rejected', items: rejected, color: 'var(--red)' },
  ]

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ THE FORGE · IDEA PIPELINE</div>
        <h1>The Forge</h1>
        <div className="big">{neu.length + approved.length + rejected.length}</div>
        <p>{neu.length} new · {approved.length} approved · {rejected.length} rejected</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {columns.map(col => (
          <div key={col.key} className="mc-card accent">
            <h3 style={{ fontSize: 13, color: col.color, textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
              {col.title} ({col.items.length})
            </h3>
            {col.items.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Empty.</div>}
            {col.items.map((i: any) => (
              <div key={i.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{i.title ?? i.idea ?? 'Idea'}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{i.description ?? i.notes ?? ''}</div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: 'var(--mo)' }}>{i.date_added ?? ''}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  )
}
