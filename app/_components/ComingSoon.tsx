export default function ComingSoon({
  label, title, tagline, sections,
}: {
  label: string
  title: string
  tagline: string
  sections: { title: string; desc: string }[]
}) {
  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ {label}</div>
        <h1>{title}</h1>
        <div className="big" style={{ fontSize: 28, color: 'var(--t3)' }}>Coming Soon</div>
        <p>{tagline}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {sections.map(s => (
          <div key={s.title} className="mc-card accent">
            <h3 style={{ fontSize: 13, color: 'var(--t2)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 6 }}>
              {s.title}
            </h3>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </>
  )
}
