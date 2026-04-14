import { getActiveProjects } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function ProjectsPage() {
  const projects = await getActiveProjects()

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ PROJECTS · ACTIVE INITIATIVES</div>
        <h1>Projects</h1>
        <div className="big">{projects.length}</div>
        <p>{projects.length} active projects in flight</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {projects.map((p: any) => (
          <div key={p.id} className="mc-card accent">
            <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              Priority {p.priority ?? '—'} · {p.status ?? 'active'}
            </div>
            <h3 style={{ fontSize: 15, margin: '6px 0' }}>{p.name ?? p.title}</h3>
            <div style={{ fontSize: 12, color: 'var(--t2)' }}>{p.description ?? p.details ?? ''}</div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 8, fontFamily: 'var(--mo)' }}>
              {p.start_date ?? ''} {p.target_date ? `→ ${p.target_date}` : ''}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
