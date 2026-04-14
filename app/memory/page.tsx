import { getMemoryEntries } from '../lib/queries'

export const dynamic = 'force-dynamic'

export default async function MemoryPage() {
  const entries = await getMemoryEntries()
  const byKind = entries.reduce<Record<string, any[]>>((m, e: any) => {
    const k = e.kind ?? e.category ?? 'general'
    ;(m[k] ??= []).push(e)
    return m
  }, {})

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ MEMORY · SHARED AGENT BRAIN</div>
        <h1>Memory & Knowledge</h1>
        <div className="big">{entries.length}</div>
        <p>Facts, preferences, and feedback your agents carry across every conversation.</p>
      </div>

      {entries.length === 0 && (
        <div className="mc-card accent">
          <div style={{ color: 'var(--t3)', fontSize: 12 }}>No memories yet. This fills as agents learn your preferences.</div>
        </div>
      )}

      {Object.entries(byKind).map(([kind, items]) => (
        <div key={kind} className="mc-card accent" style={{ marginBottom: 16 }}>
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>
            {kind} ({items.length})
          </h3>
          {items.map((e: any) => (
            <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12 }}>
              <div style={{ fontWeight: 500 }}>{e.title ?? e.key ?? 'Entry'}</div>
              <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{e.content ?? e.value ?? ''}</div>
            </div>
          ))}
        </div>
      ))}
    </>
  )
}
