'use client'
/**
 * EditOwnershipModal — edit ALL ownership edges for one entity at once.
 * Columns: Counterparty | Direction | % | Role | Acquired | Actions (delete)
 * "+ Add Row" at bottom. Save commits all rows (insert new, update changed, delete removed).
 * Validation: per-entity sum of parent % warns if != 100 but does not block.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

interface Edge {
  id?: string           // undefined = new (not yet saved)
  counterpart_id: string
  counterpart_name?: string
  direction: 'owns' | 'owned-by'  // 'owns' = this entity is parent; 'owned-by' = this entity is child
  pct: string
  role: string
  acquired: string
  _deleted?: boolean
  _dirty?: boolean
}

interface EntityOption {
  id: string
  entity_name: string
  entity_type: string | null
}

const ROLE_OPTIONS = [
  'sole member', 'managing member', 'member', 'shareholder',
  'beneficiary', 'grantor/beneficiary', '99% member', '1% member',
  'general partner', 'limited partner', 'trustee',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

interface Props {
  entityId: string
  entityName: string
  childType?: 'entity' | 'property'
  onClose: () => void
  onSaved?: () => void
}

export default function EditOwnershipModal({ entityId, entityName, childType = 'entity', onClose, onSaved }: Props) {
  const [rows, setRows] = useState<Edge[]>([])
  const [allEntities, setAllEntities] = useState<EntityOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [parentRes, childRes, entRes] = await Promise.all([
      // edges where this entity is the child (owned-by)
      childType === 'property'
        ? supabase.from('entity_ownership_edges').select('*').eq('child_entity_id', entityId).eq('child_type', 'property')
        : supabase.from('entity_ownership_edges').select('*').eq('child_entity_id', entityId).neq('child_type', 'property'),
      // edges where this entity is the parent (owns)
      childType === 'entity'
        ? supabase.from('entity_ownership_edges').select('*').eq('parent_entity_id', entityId).neq('child_type', 'property')
        : Promise.resolve({ data: [] }),
      supabase.from('entity_ownership').select('id, entity_name, entity_type'),
    ])

    const entityMap: Record<string, EntityOption> = {}
    ;(entRes.data ?? []).forEach((e: any) => { entityMap[e.id] = e })
    setAllEntities(entRes.data ?? [])

    const parentRows: Edge[] = (parentRes.data ?? []).map((e: any) => ({
      id: e.id,
      counterpart_id: e.parent_entity_id,
      counterpart_name: entityMap[e.parent_entity_id]?.entity_name,
      direction: 'owned-by' as const,
      pct: String(Number(e.ownership_pct)),
      role: e.role ?? '',
      acquired: e.acquired_at ?? '',
    }))
    const childRows: Edge[] = (childRes.data ?? []).map((e: any) => ({
      id: e.id,
      counterpart_id: e.child_entity_id,
      counterpart_name: entityMap[e.child_entity_id]?.entity_name,
      direction: 'owns' as const,
      pct: String(Number(e.ownership_pct)),
      role: e.role ?? '',
      acquired: e.acquired_at ?? '',
    }))

    setRows([...parentRows, ...childRows])
    setLoading(false)
  }, [entityId, childType])

  useEffect(() => { load() }, [load])

  function validateAndWarn(currentRows: Edge[]) {
    const parentPct = currentRows
      .filter(r => r.direction === 'owned-by' && !r._deleted)
      .reduce((s, r) => s + (parseFloat(r.pct) || 0), 0)
    if (parentPct > 0 && Math.abs(parentPct - 100) > 0.01) {
      setWarn(`Parent ownership sums to ${parentPct.toFixed(1)}% — should be 100%`)
    } else {
      setWarn('')
    }
  }

  function updateRow(idx: number, patch: Partial<Edge>) {
    setRows(prev => {
      const next = prev.map((r, i) => i === idx ? { ...r, ...patch, _dirty: true } : r)
      validateAndWarn(next)
      return next
    })
  }

  function addRow() {
    setRows(prev => [...prev, {
      counterpart_id: '',
      direction: 'owned-by',
      pct: '',
      role: '',
      acquired: '',
      _dirty: true,
    }])
  }

  function removeRow(idx: number) {
    setRows(prev => {
      const next = prev.map((r, i) => i === idx ? { ...r, _deleted: true } : r)
      validateAndWarn(next)
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setErr('')
    try {
      for (const row of rows) {
        if (!row._dirty && !row._deleted && row.id) continue // skip untouched

        if (row._deleted && row.id) {
          const { error } = await supabase.from('entity_ownership_edges').delete().eq('id', row.id)
          if (error) throw error
          continue
        }
        if (row._deleted) continue // was new + deleted before saving

        if (!row.counterpart_id) continue // skip empty rows
        const pctNum = parseFloat(row.pct)
        if (isNaN(pctNum)) { setErr('All rows need a valid % value'); setSaving(false); return }

        const effectiveChildType = childType === 'property' ? 'property' : 'entity'
        const payload = row.direction === 'owned-by'
          ? {
              parent_entity_id: row.counterpart_id,
              parent_type: 'entity',
              child_entity_id: entityId,
              child_type: effectiveChildType,
              ownership_pct: pctNum,
              role: row.role || null,
              acquired_at: row.acquired || null,
            }
          : {
              parent_entity_id: entityId,
              parent_type: 'entity',
              child_entity_id: row.counterpart_id,
              child_type: effectiveChildType,
              ownership_pct: pctNum,
              role: row.role || null,
              acquired_at: row.acquired || null,
            }

        if (row.id) {
          const { error } = await supabase.from('entity_ownership_edges').update(payload).eq('id', row.id)
          if (error) throw error
        } else {
          const { error } = await supabase.from('entity_ownership_edges').insert(payload)
          if (error) throw error
        }
      }
      onSaved?.()
      onClose()
    } catch (e: any) {
      setErr(e.message ?? 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const visibleRows = rows.filter(r => !r._deleted)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '28px 32px', width: '100%', maxWidth: 780, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Ownership Edges
            </div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Edit Ownership — {entityName}</div>
          </div>
          <button style={iconBtn} onClick={onClose}>✕</button>
        </div>

        {warn && (
          <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#f59e0b', marginBottom: 14 }}>
            ⚠ {warn}
          </div>
        )}

        {loading ? (
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '20px 0' }}>Loading edges…</div>
        ) : (
          <>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['Counterparty', 'Direction', '%', 'Role', 'Acquired', ''].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={6} style={{ padding: '20px 10px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
                        No ownership edges — add one below
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((row, displayIdx) => {
                    // find actual index in rows array (needed for mutation)
                    const actualIdx = rows.indexOf(row)
                    return (
                      <tr key={actualIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        {/* Counterparty */}
                        <td style={{ padding: '8px 10px' }}>
                          <select
                            style={cellInput}
                            value={row.counterpart_id}
                            onChange={e => updateRow(actualIdx, { counterpart_id: e.target.value })}
                          >
                            <option value="">— select —</option>
                            {allEntities
                              .filter(e => e.id !== entityId)
                              .map(e => (
                                <option key={e.id} value={e.id}>{e.entity_name}</option>
                              ))}
                          </select>
                        </td>
                        {/* Direction */}
                        <td style={{ padding: '8px 10px' }}>
                          <select
                            style={{ ...cellInput, minWidth: 110 }}
                            value={row.direction}
                            onChange={e => updateRow(actualIdx, { direction: e.target.value as 'owns' | 'owned-by' })}
                          >
                            <option value="owned-by">Owned by ↑</option>
                            {childType === 'entity' && <option value="owns">Owns ↓</option>}
                          </select>
                        </td>
                        {/* % */}
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            style={{ ...cellInput, width: 72 }}
                            type="number" min="0" max="100" step="0.01"
                            placeholder="100"
                            value={row.pct}
                            onChange={e => updateRow(actualIdx, { pct: e.target.value })}
                          />
                        </td>
                        {/* Role */}
                        <td style={{ padding: '8px 10px' }}>
                          <select
                            style={{ ...cellInput, minWidth: 130 }}
                            value={row.role}
                            onChange={e => updateRow(actualIdx, { role: e.target.value })}
                          >
                            <option value="">— role —</option>
                            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </td>
                        {/* Acquired */}
                        <td style={{ padding: '8px 10px' }}>
                          <input
                            style={{ ...cellInput, width: 120 }}
                            type="date"
                            value={row.acquired}
                            onChange={e => updateRow(actualIdx, { acquired: e.target.value })}
                          />
                        </td>
                        {/* Delete */}
                        <td style={{ padding: '8px 10px' }}>
                          <button
                            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#ef4444', cursor: 'pointer' }}
                            onClick={() => removeRow(actualIdx)}
                          >
                            Del
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Row */}
            <button
              style={{ ...addBtn, marginTop: 12 }}
              onClick={addRow}
            >
              + Add Row
            </button>

            {err && <div style={{ marginTop: 12, fontSize: 12, color: '#ef4444' }}>{err}</div>}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button style={primaryBtn} disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save All Changes'}
              </button>
              <button style={cancelBtn} onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────
const cellInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 6,
  padding: '5px 8px',
  fontSize: 12,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
  width: '100%',
}

const iconBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '4px 10px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.5)',
  cursor: 'pointer',
  flexShrink: 0,
}

const addBtn: React.CSSProperties = {
  background: 'rgba(249,115,22,0.1)',
  border: '1px solid rgba(249,115,22,0.2)',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600,
}

const primaryBtn: React.CSSProperties = {
  background: 'rgba(249,115,22,0.15)',
  border: '1px solid rgba(249,115,22,0.3)',
  borderRadius: 10,
  padding: '10px 22px',
  fontSize: 13,
  fontWeight: 700,
  color: '#f97316',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
}

const cancelBtn: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 10,
  padding: '10px 22px',
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
}
