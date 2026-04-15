import { getEntityDocuments } from '../lib/queries'

export const dynamic = 'force-dynamic'

function fmtSize(bytes?: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function FilesPage() {
  const docs = await getEntityDocuments()
  const byEntity = docs.reduce<Record<string, any[]>>((m, d: any) => {
    const k = d.entity_name ?? d.entity_id ?? 'Unfiled'
    if (!m[k]) m[k] = []
    m[k].push(d)
    return m
  }, {})

  const analyzed = docs.filter((d: any) => d.analysis_status === 'completed').length

  return (
    <>
      <div className="hero">
        <div className="hero-label">≈ WORKSPACE FILES · UPLOADS &amp; ASSETS</div>
        <h1>Workspace Files</h1>
        <div className="big">{docs.length}</div>
        <p>
          {docs.length === 0
            ? 'Nothing uploaded yet — drop files here and agents will index them automatically.'
            : `${Object.keys(byEntity).length} entities · ${analyzed} indexed by agents`}
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="mc-card accent">
          <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Getting Started</h3>
          <div style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6 }}>
            <p>When a file lands in your workspace, it shows up here grouped by the entity it belongs to. Agents read each file and pull out:</p>
            <ul style={{ marginTop: 8, paddingLeft: 20 }}>
              <li>Contract terms, counterparties, renewal dates</li>
              <li>Ownership structures and entity relationships</li>
              <li>Searchable text you can @-mention in any chat</li>
            </ul>
            <p style={{ marginTop: 12, fontSize: 12, color: 'var(--t4)' }}>Upload pipeline is scheduled for the next build — for now, files added directly to the <code>entity_documents</code> table will appear here automatically.</p>
          </div>
        </div>
      ) : (
        Object.entries(byEntity).map(([entity, list]) => (
          <div key={entity} className="mc-card accent" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>{entity} · {list.length}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
              {list.map((d: any) => (
                <div key={d.id} style={{ padding: 12, background: 'rgba(255,255,255,.02)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{d.document_type ?? 'document'}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, margin: '4px 0', wordBreak: 'break-word' }}>{d.filename}</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mo)' }}>
                    {fmtSize(d.file_size)} · {d.mime_type ?? '—'}
                  </div>
                  <div style={{ fontSize: 10, color: d.analysis_status === 'completed' ? 'var(--green)' : d.analysis_status === 'failed' ? 'var(--red)' : 'var(--amber)', marginTop: 6, fontFamily: 'var(--mo)' }}>
                    {d.analysis_status ?? 'pending'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </>
  )
}
