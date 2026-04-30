'use client'
import React, { useMemo, useState } from 'react'

export default function MemorySearch({ entries }: { entries: any[] }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')

  const categories = useMemo(() => {
    const set = new Set<string>()
    for (const e of entries) set.add(String(e.category ?? e.memory_type ?? e.kind ?? 'general'))
    return ['all', ...[...set].sort()]
  }, [entries])

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter((e: any) => {
      const c = String(e.category ?? e.memory_type ?? e.kind ?? 'general')
      if (cat !== 'all' && c !== cat) return false
      if (!needle) return true
      const hay = [e.name, e.title, e.body, e.content, e.description, e.key]
        .filter(Boolean).map(String).join(' ').toLowerCase()
      return hay.includes(needle)
    })
  }, [q, cat, entries])

  return (
    <div className="mc-card accent" data-source="memory_entries.search">
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Memory Search</div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder={`Search ${entries.length} entries…`}
          value={q}
          onChange={e => setQ(e.target.value)}
          style={{
            flex: 1, padding: '8px 10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'inherit', fontSize: 12, fontFamily: 'var(--b)',
          }}
        />
        <select
          value={cat}
          onChange={e => setCat(e.target.value)}
          style={{
            padding: '8px 10px', background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)', borderRadius: 8,
            color: 'inherit', fontSize: 12, fontFamily: 'var(--mo)',
          }}
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)', marginBottom: 8 }}>
        {results.length} of {entries.length} entries
      </div>
      {results.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--dim)', padding: '8px 0' }}>No matches.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
          {results.slice(0, 30).map((e: any) => (
            <div key={e.id} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{e.name ?? e.title ?? e.key ?? 'Memory'}</div>
              <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 3, lineHeight: 1.5 }}>
                {String(e.body ?? e.content ?? e.description ?? '').slice(0, 160)}
              </div>
              <div style={{ fontSize: 9, color: 'var(--dim)', marginTop: 4, fontFamily: 'var(--mo)' }}>
                {e.memory_type ?? e.category ?? 'general'} · {e.created_at?.slice(0, 10) ?? '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
