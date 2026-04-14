import { getSkills } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function SkillsPage() {
  const skills = await getSkills()

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ SKILL LAB · AGENT CAPABILITIES</div>
        <h1>Skill Lab</h1>
        <div className="big">{skills.length}</div>
        <p>Every capability available to your agent roster.</p>
      </div>

      <div className="mc-card accent">
        <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Skill Registry</h3>
        {skills.length === 0 && <div style={{ color: 'var(--t3)', fontSize: 12 }}>No skills registered yet.</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
          {skills.map((s: any) => (
            <div key={s.id} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>{s.description ?? ''}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                {s.category ?? '—'} · v{s.version ?? '1'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
