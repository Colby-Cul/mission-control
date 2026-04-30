'use client'
import React, { useMemo, useState } from 'react'

export default function DocsSearch({ docs }: { docs: any[] }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return [] as any[]
    return docs.filter((d: any) => {
      const hay = [d.filename, d.title, d.entity_name, d.entity_id, d.document_type, d.notes, d.version]
        .filter(Boolean).map(String).join(' ').toLowerCase()
      return hay.includes(needle)
    }).slice(0, 50)
  }, [q, docs])

  return (
    <div className="mc-card accent" data-source="entity_documents.search" style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Document Search</div>
      <input
        type="text"
        placeholder="Search by filename, entity, type, notes…"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          color: 'inherit',
          fontSize: 13,
          fontFamily: 'var(--b)',
          marginBottom: q ? 12 : 0,
        }}
      />
      {q && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginBottom: 4 }}>
            {results.length} result{results.length === 1 ? '' : 's'}
          </div>
          {results.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--dim)', padding: '8px 0' }}>No matches.</div>
          ) : results.map((d: any) => (
            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ fontSize: 12, minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.filename ?? d.title ?? d.id}
                </div>
                <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginTop: 1 }}>
                  {d.entity_name ?? d.entity_id ?? 'Unfiled'} · {d.document_type ?? '—'}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', flexShrink: 0, marginLeft: 12, alignSelf: 'center' }}>
                {d.created_at?.slice(0, 10) ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
