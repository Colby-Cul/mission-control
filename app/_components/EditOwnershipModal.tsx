'use client'
/**
 * EditOwnershipModal — plain-English two-section editor.
 * Section 1: "THIS ENTITY IS OWNED BY" (parent relationships)
 * Section 2: "THIS ENTITY OWNS" (child relationships)
 * Each row reads like a sentence, no ambiguous direction arrows.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ── Inline ⓘ tooltip for non-expert users ────────────────────────
function Tip({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <span style={{ position: 'relative', display: 'inline-block', verticalAlign: 'middle', marginLeft: 4 }}>
      <span
        onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        tabIndex={0} role="button" aria-label="More info"
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 14, height: 14, borderRadius: '50%',
          background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
          color: '#a78bfa', fontSize: 9, fontWeight: 700, cursor: 'default', lineHeight: 1,
        }}
      >i</span>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 7px)', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(10,10,30,0.97)', border: '1px solid rgba(139,92,246,0.25)',
          borderRadius: 8, padding: '8px 12px', fontSize: 11, color: 'rgba(255,255,255,0.78)',
          width: 200, lineHeight: 1.5, zIndex: 9999, boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
          whiteSpace: 'normal' as const, textAlign: 'left' as const, pointerEvents: 'none' as const,
        }}>
          {text}
        </div>
      )}
    </span>
  )
}

interface Edge {
  id?: string
  counterpart_id: string
  counterpart_name?: string
  direction: 'owns' | 'owned-by'
  pct: string
  role: string
  acquired: string
  _deleted?: boolean
  _dirty?: boolean
  /** preserved from DB for existing rows so UPDATE uses the right child_type */
  _child_type?: string
}

interface EntityOption {
  id: string
  entity_name: string
  entity_type: string | null
}

interface PropertyOption {
  id: string
  name: string | null
  address: string
  purpose: string | null
}

const ROLE_OPTIONS = [
  'sole member', 'managing member', 'member', 'shareholder',
  'beneficiary', 'grantor/beneficiary', '99% member', '1% member',
  'general partner', 'limited partner', 'trustee',
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
  const [allProperties, setAllProperties] = useState<PropertyOption[]>([])
  const [entityFormationDate, setEntityFormationDate] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [warn, setWarn] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [parentRes, childRes, entRes, propRes, thisEntityRes] = await Promise.all([
      childType === 'property'
        ? supabase.from('entity_ownership_edges').select('*').eq('child_entity_id', entityId).eq('child_type', 'property')
        : supabase.from('entity_ownership_edges').select('*').eq('child_entity_id', entityId).neq('child_type', 'property'),
      childType === 'entity'
        ? supabase.from('entity_ownership_edges').select('*').eq('parent_entity_id', entityId)
        : Promise.resolve({ data: [] }),
      supabase.from('entity_ownership').select('id, entity_name, entity_type'),
      supabase.from('property_assets').select('id, name, address, purpose'),
      supabase.from('entity_ownership').select('formation_date').eq('id', entityId).single(),
    ])

    const entityMap: Record<string, EntityOption> = {}
    ;(entRes.data ?? []).forEach((e: any) => { entityMap[e.id] = e })
    setAllEntities(entRes.data ?? [])
    setAllProperties(propRes.data ?? [])

    // Formation date for Bug 2 auto-fill
    const formDate = (thisEntityRes as any)?.data?.formation_date ?? ''
    setEntityFormationDate(formDate)

    // Build a property map for display names in child rows
    const propMap: Record<string, PropertyOption> = {}
    ;(propRes.data ?? []).forEach((p: any) => { propMap[p.id] = p })

    const parentRows: Edge[] = (parentRes.data ?? []).map((e: any) => ({
      id: e.id,
      counterpart_id: e.parent_entity_id,
      counterpart_name: entityMap[e.parent_entity_id]?.entity_name,
      direction: 'owned-by' as const,
      pct: String(Number(e.ownership_pct)),
      role: e.role ?? '',
      acquired: e.acquired_at ?? '',
      _child_type: e.child_type ?? 'entity',
    }))
    const childRows: Edge[] = ((childRes as any).data ?? []).map((e: any) => {
      // For child rows, the counterpart is the child (entity or property)
      const isProperty = e.child_type === 'property'
      const name = isProperty
        ? (propMap[e.child_entity_id]?.name || propMap[e.child_entity_id]?.address || e.child_entity_id)
        : entityMap[e.child_entity_id]?.entity_name
      return {
        id: e.id,
        counterpart_id: e.child_entity_id,
        counterpart_name: name,
        direction: 'owns' as const,
        pct: String(Number(e.ownership_pct)),
        role: e.role ?? '',
        acquired: e.acquired_at ?? '',
        _child_type: e.child_type ?? 'entity',
      }
    })

    setRows([...parentRows, ...childRows])
    setLoading(false)
  }, [entityId, childType])

  useEffect(() => { load() }, [load])

  function validateAndWarn(currentRows: Edge[]) {
    const parentPct = currentRows
      .filter(r => r.direction === 'owned-by' && !r._deleted)
      .reduce((s, r) => s + (parseFloat(r.pct) || 0), 0)
    if (parentPct > 0 && Math.abs(parentPct - 100) > 0.01) {
      setWarn(`Parent ownership sums to ${parentPct.toFixed(1)}% — ideally 100%`)
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

  function addParentRow() {
    // Bug 2: default Since to this entity's formation_date if available
    setRows(prev => [...prev, { counterpart_id: '', direction: 'owned-by', pct: '', role: '', acquired: entityFormationDate, _dirty: true }])
  }

  function addChildRow() {
    // Bug 2: for child rows, leave Since blank — child entity may not exist yet
    setRows(prev => [...prev, { counterpart_id: '', direction: 'owns', pct: '', role: '', acquired: '', _dirty: true }])
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
        if (!row._dirty && !row._deleted && row.id) continue

        if (row._deleted && row.id) {
          const { error } = await supabase.from('entity_ownership_edges').delete().eq('id', row.id)
          if (error) throw error
          continue
        }
        if (row._deleted) continue

        if (!row.counterpart_id) continue
        const pctNum = parseFloat(row.pct)
        if (isNaN(pctNum)) { setErr('All rows need a valid % value'); setSaving(false); return }

        // Bug 1 + Bug 4: for existing rows, preserve the original child_type from DB
        // For new rows: if direction=owns and counterpart is a property, use 'property'; else use modal's childType
        let effectiveChildType: string
        if (row.id && row._child_type) {
          // existing edge — preserve the stored child_type so UPDATE is correct
          effectiveChildType = row._child_type
        } else if (row.direction === 'owns' && allProperties.some(p => p.id === row.counterpart_id)) {
          // Bug 4: new child edge targeting a property asset
          effectiveChildType = 'property'
        } else {
          effectiveChildType = childType === 'property' ? 'property' : 'entity'
        }

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
          // Bug 1: explicit UPDATE on all editable fields for existing rows
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

  const parentRows = rows.filter(r => r.direction === 'owned-by' && !r._deleted)
  const childRows  = rows.filter(r => r.direction === 'owns'     && !r._deleted)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#0a0a1a',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 900,
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Fixed header */}
        <div style={{ padding: '28px 32px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Ownership Structure
                </div>
                <a
                  href="/setup/ownership"
                  style={{
                    fontSize: 11,
                    color: '#a78bfa',
                    textDecoration: 'none',
                    borderBottom: '1px dotted rgba(167,139,250,0.4)',
                    paddingBottom: 1,
                    whiteSpace: 'nowrap' as const,
                  }}
                >
                  New to this? Try guided setup →
                </a>
              </div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
                {entityName}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                Define who owns this entity (parents) and what this entity owns (children).
              </p>
            </div>
            <button style={iconBtn} onClick={onClose}>✕</button>
          </div>

          {warn && (
            <div style={{ marginTop: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#f59e0b' }}>
              ⚠ {warn}
            </div>
          )}
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 28px' }}>
          {loading ? (
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: '20px 0' }}>Loading…</div>
          ) : (
            <>
              {/* ── SECTION 1: PARENTS ─────────────────────────────── */}
              <SectionHeader
                pill="PARENT"
                pillColor="#8b5cf6"
                title="THIS ENTITY IS OWNED BY"
                subtitle={`Who holds an ownership stake in ${entityName}`}
              />

              {parentRows.length === 0 ? (
                <EmptyState message={`${entityName} has no recorded owners yet.`} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                  {parentRows.map((row) => {
                    const actualIdx = rows.indexOf(row)
                    return (
                      <ParentRow
                        key={actualIdx}
                        row={row}
                        entityName={entityName}
                        allEntities={allEntities}
                        entityId={entityId}
                        onChange={patch => updateRow(actualIdx, patch)}
                        onDelete={() => removeRow(actualIdx)}
                      />
                    )
                  })}
                </div>
              )}

              <button style={addBtn} onClick={addParentRow}>
                + Add Parent
              </button>

              {/* Divider */}
              <div style={{ margin: '32px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }} />

              {/* ── SECTION 2: CHILDREN ────────────────────────────── */}
              {childType === 'entity' && (
                <>
                  <SectionHeader
                    pill="CHILD"
                    pillColor="#3b82f6"
                    title="THIS ENTITY OWNS"
                    subtitle={`Entities and stakes that ${entityName} holds`}
                  />

                  {childRows.length === 0 ? (
                    <EmptyState message={`${entityName} doesn't own other entities or properties yet.`} />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {childRows.map((row) => {
                        const actualIdx = rows.indexOf(row)
                        return (
                          <ChildRow
                            key={actualIdx}
                            row={row}
                            entityName={entityName}
                            allEntities={allEntities}
                            allProperties={allProperties}
                            entityId={entityId}
                            onChange={patch => updateRow(actualIdx, patch)}
                            onDelete={() => removeRow(actualIdx)}
                          />
                        )
                      })}
                    </div>
                  )}

                  <button style={{ ...addBtn, color: '#3b82f6', borderColor: 'rgba(59,130,246,0.25)', background: 'rgba(59,130,246,0.06)' }} onClick={addChildRow}>
                    + Add Child
                  </button>
                </>
              )}

              {err && <div style={{ marginTop: 16, fontSize: 13, color: '#ef4444', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, padding: '8px 14px' }}>{err}</div>}
            </>
          )}
        </div>

        {/* Fixed footer */}
        <div style={{ padding: '16px 32px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 10, flexShrink: 0 }}>
          <button style={primaryBtn} disabled={saving} onClick={handleSave}>
            {saving ? 'Saving…' : 'Save All Changes'}
          </button>
          <button style={cancelBtn} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function SectionHeader({ pill, pillColor, title, subtitle }: { pill: string; pillColor: string; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          color: pillColor, background: `${pillColor}18`,
          border: `1px solid ${pillColor}40`,
          borderRadius: 20, padding: '2px 9px',
          fontFamily: 'IBM Plex Mono, monospace',
        }}>
          {pill}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
          {title}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', paddingLeft: 2 }}>{subtitle}</p>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      border: '1px dashed rgba(255,255,255,0.08)',
      borderRadius: 12,
      padding: '16px 20px',
      fontSize: 12,
      color: 'rgba(255,255,255,0.3)',
      marginBottom: 12,
      fontStyle: 'italic',
    }}>
      {message}
    </div>
  )
}

interface RowProps {
  row: { counterpart_id: string; pct: string; role: string; acquired: string }
  entityName: string
  allEntities: { id: string; entity_name: string; entity_type: string | null }[]
  allProperties?: PropertyOption[]
  entityId: string
  onChange: (patch: any) => void
  onDelete: () => void
}

/** Sentence: [Entity name] owns [X]% of this entity · [role] */
function ParentRow({ row, entityName, allEntities, entityId, onChange, onDelete }: RowProps) {
  return (
    <div style={rowContainer('#8b5cf6')}>
      {/* Entity select */}
      <div style={{ flex: '0 0 220px' }}>
        <label style={rowLabel}>
          Parent entity
          <Tip text="The person, trust, or business that owns a stake in this entity. You can add multiple owners — percentages should add up to 100%." />
        </label>
        <select style={cellSelect} value={row.counterpart_id} onChange={e => onChange({ counterpart_id: e.target.value })}>
          <option value="">— select owner —</option>
          {allEntities.filter(e => e.id !== entityId).map(e => (
            <option key={e.id} value={e.id}>{e.entity_name}</option>
          ))}
        </select>
      </div>

      {/* Sentence connector */}
      <div style={connectorText}>owns</div>

      {/* % */}
      <div style={{ flex: '0 0 90px' }}>
        <label style={rowLabel}>
          Ownership %
          <Tip text="How much of this entity this person/entity owns. All owners must add up to 100%." />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            style={{ ...cellInput, width: '100%' }}
            type="number" min="0" max="100" step="0.01"
            placeholder="100"
            value={row.pct}
            onChange={e => onChange({ pct: e.target.value })}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>%</span>
        </div>
      </div>

      {/* Sentence connector */}
      <div style={connectorText}>of this entity</div>

      {/* Role */}
      <div style={{ flex: '1 1 150px', minWidth: 120 }}>
        <label style={rowLabel}>
          Role
          <Tip text="Your title in this entity — e.g. 'managing member' for the main person running an LLC, 'member' for other owners." />
        </label>
        <select style={cellSelect} value={row.role} onChange={e => onChange({ role: e.target.value })}>
          <option value="">— role —</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Acquired */}
      <div style={{ flex: '0 0 130px' }}>
        <label style={rowLabel}>Since</label>
        <input style={cellInput} type="date" value={row.acquired} onChange={e => onChange({ acquired: e.target.value })} />
      </div>

      {/* Delete */}
      <button style={deleteBtn} onClick={onDelete} title="Remove">✕</button>
    </div>
  )
}

/** Sentence: [Entity name] owns [X]% of [child entity/property] · [role] */
function ChildRow({ row, entityName, allEntities, allProperties = [], entityId, onChange, onDelete }: RowProps) {
  return (
    <div style={rowContainer('#3b82f6')}>
      {/* Entity name label */}
      <div style={{ flex: '0 0 auto', paddingTop: 18 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#fdba74', whiteSpace: 'nowrap' as const }}>
          {entityName}
        </span>
      </div>

      {/* Sentence connector */}
      <div style={connectorText}>owns</div>

      {/* % */}
      <div style={{ flex: '0 0 90px' }}>
        <label style={rowLabel}>
          Ownership %
          <Tip text="How much of the child entity or property this entity owns. Must add up to 100% across all owners." />
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            style={{ ...cellInput, width: '100%' }}
            type="number" min="0" max="100" step="0.01"
            placeholder="100"
            value={row.pct}
            onChange={e => onChange({ pct: e.target.value })}
          />
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>%</span>
        </div>
      </div>

      {/* Sentence connector */}
      <div style={connectorText}>of</div>

      {/* Child entity/property select — Bug 4: includes properties as children */}
      <div style={{ flex: '0 0 240px' }}>
        <label style={rowLabel}>
          Child entity or property
          <Tip text="A legal entity (LLC, trust, etc.) or real estate property that this entity owns a stake in." />
        </label>
        <select style={cellSelect} value={row.counterpart_id} onChange={e => onChange({ counterpart_id: e.target.value })}>
          <option value="">— select —</option>
          {allEntities.filter(e => e.id !== entityId).length > 0 && (
            <optgroup label="── Entities ──">
              {allEntities.filter(e => e.id !== entityId).map(e => (
                <option key={e.id} value={e.id}>{e.entity_name}</option>
              ))}
            </optgroup>
          )}
          {allProperties.length > 0 && (
            <optgroup label="── Properties ──">
              {allProperties.map(p => (
                <option key={p.id} value={p.id}>
                  ⌂ {p.name || p.address}{p.purpose ? ` (${p.purpose.replace(/-/g, ' ')})` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {/* Role */}
      <div style={{ flex: '1 1 150px', minWidth: 120 }}>
        <label style={rowLabel}>
          Role
          <Tip text="The position this entity holds in the child entity — e.g. 'managing member', 'shareholder', 'general partner'." />
        </label>
        <select style={cellSelect} value={row.role} onChange={e => onChange({ role: e.target.value })}>
          <option value="">— role —</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Acquired */}
      <div style={{ flex: '0 0 130px' }}>
        <label style={rowLabel}>Since</label>
        <input style={cellInput} type="date" value={row.acquired} onChange={e => onChange({ acquired: e.target.value })} />
      </div>

      {/* Delete */}
      <button style={deleteBtn} onClick={onDelete} title="Remove">✕</button>
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────────

const rowContainer = (accentColor: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'flex-end',
  gap: 10,
  flexWrap: 'wrap' as const,
  background: `${accentColor}07`,
  border: `1px solid ${accentColor}18`,
  borderRadius: 12,
  padding: '12px 16px',
})

const rowLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 4,
  fontFamily: 'DM Sans, sans-serif',
}

const connectorText: React.CSSProperties = {
  fontSize: 11,
  color: 'rgba(255,255,255,0.3)',
  fontStyle: 'italic',
  paddingBottom: 8,
  flexShrink: 0,
  alignSelf: 'flex-end',
}

const cellInput: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8,
  padding: '7px 10px',
  fontSize: 13,
  color: 'rgba(255,255,255,0.85)',
  fontFamily: 'DM Sans, sans-serif',
  outline: 'none',
}

const cellSelect: React.CSSProperties = {
  ...cellInput,
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

const deleteBtn: React.CSSProperties = {
  background: 'rgba(239,68,68,0.08)',
  border: '1px solid rgba(239,68,68,0.15)',
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  color: 'rgba(239,68,68,0.7)',
  cursor: 'pointer',
  alignSelf: 'flex-end',
  marginBottom: 1,
  flexShrink: 0,
}

const addBtn: React.CSSProperties = {
  background: 'rgba(139,92,246,0.07)',
  border: '1px solid rgba(139,92,246,0.2)',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 12,
  color: '#a78bfa',
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
  fontWeight: 600,
}

const primaryBtn: React.CSSProperties = {
  background: 'rgba(59,130,246,0.15)',
  border: '1px solid rgba(59,130,246,0.3)',
  borderRadius: 10,
  padding: '10px 22px',
  fontSize: 13,
  fontWeight: 700,
  color: '#3b82f6',
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
