'use client'
/**
 * OwnershipCard — shows parent/child ownership edges for an entity,
 * a mini SVG tree, and Add Parent / Add Child buttons.
 * Rendered client-side so the modals and mutations work.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { SpecCard } from './SpecCard'
import { supabase } from '../lib/supabase'

interface Edge {
  id: string
  parent_entity_id: string
  parent_type: string
  child_entity_id: string
  child_type?: string
  ownership_pct: number
  role: string | null
  acquired_at: string | null
  notes: string | null
  // enriched
  counterpart_name?: string
  counterpart_slug?: string | null
  counterpart_type?: string | null
}

interface EntityOption {
  id: string
  entity_name: string
  entity_type: string | null
  slug: string | null
}

const ROLE_OPTIONS = [
  'sole member', 'managing member', 'member', 'shareholder',
  'beneficiary', 'grantor/beneficiary', '99% member', '1% member',
  'general partner', 'limited partner', 'trustee',
]

const COLOR: Record<string, string> = {
  Person: 'var(--purple)',
  Trust: 'var(--amber)',
  LLC: 'var(--orange)',
  'C-Corp': 'var(--green)',
  'S-Corp': 'var(--green)',
  Partnership: 'var(--lime)',
  'Sole Prop': 'var(--pink)',
  holding: 'var(--pink)',
}

function entityColor(type: string | null | undefined, purpose?: string | null) {
  if (purpose === 'holding') return 'var(--pink)'
  return COLOR[type ?? ''] ?? 'var(--dim)'
}

// ── Mini SVG tree ───────────────────────────────────────────────────
function MiniTree({
  entityName,
  entityType,
  parents,
  children,
}: {
  entityName: string
  entityType: string | null
  parents: Edge[]
  children: Edge[]
}) {
  const CX = 260
  const ROOT_Y = parents.length > 0 ? 90 : 40
  const PARENT_Y = 24
  const CHILD_Y = ROOT_Y + 70
  const W = 520
  const H = children.length > 0 ? CHILD_Y + 36 : ROOT_Y + 40

  const parentXs = parents.map((_, i) => {
    const span = Math.min(parents.length - 1, 3) * 120
    const start = CX - span / 2
    return start + i * (span / Math.max(parents.length - 1, 1))
  })
  const childXs = children.map((_, i) => {
    const span = Math.min(children.length - 1, 3) * 120
    const start = CX - span / 2
    return start + i * (span / Math.max(children.length - 1, 1))
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', maxWidth: 520, display: 'block', margin: '16px auto 0' }}>
      <defs>
        <linearGradient id="oc-edge-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(249,115,22,0.6)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0.3)" />
        </linearGradient>
      </defs>
      {/* edges parent → root */}
      {parents.map((p, i) => (
        <line key={`pe-${i}`} x1={parentXs[i]} y1={PARENT_Y + 14} x2={CX} y2={ROOT_Y - 14}
          stroke="url(#oc-edge-grad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      ))}
      {/* edges root → children */}
      {children.map((c, i) => (
        <line key={`ce-${i}`} x1={CX} y1={ROOT_Y + 14} x2={childXs[i]} y2={CHILD_Y - 14}
          stroke="url(#oc-edge-grad)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.7" />
      ))}
      {/* parent nodes */}
      {parents.map((p, i) => (
        <g key={`pn-${i}`}>
          <circle cx={parentXs[i]} cy={PARENT_Y} r={13} fill={`rgba(${hexToRgb(entityColor(p.counterpart_type, null))},0.15)`}
            stroke={entityColor(p.counterpart_type, null)} strokeWidth="1.5" />
          <text x={parentXs[i]} y={PARENT_Y + 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)" fontFamily="DM Sans, sans-serif">
            {(p.counterpart_name ?? p.parent_entity_id).substring(0, 10)}
          </text>
          <text x={parentXs[i]} y={PARENT_Y + 24} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="IBM Plex Mono, monospace">
            {p.ownership_pct}%
          </text>
        </g>
      ))}
      {/* root node */}
      <circle cx={CX} cy={ROOT_Y} r={18} fill="rgba(249,115,22,0.15)" stroke="var(--orange)" strokeWidth="2" />
      <text x={CX} y={ROOT_Y + 4} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.9)" fontFamily="DM Sans, sans-serif" fontWeight="600">
        {entityName.substring(0, 12)}
      </text>
      {/* child nodes */}
      {children.map((c, i) => (
        <g key={`cn-${i}`}>
          <circle cx={childXs[i]} cy={CHILD_Y} r={13} fill={`rgba(${hexToRgb(entityColor(c.counterpart_type, null))},0.15)`}
            stroke={entityColor(c.counterpart_type, null)} strokeWidth="1.5" />
          <text x={childXs[i]} y={CHILD_Y + 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.7)" fontFamily="DM Sans, sans-serif">
            {(c.counterpart_name ?? c.child_entity_id).substring(0, 10)}
          </text>
          <text x={childXs[i]} y={CHILD_Y + 24} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.4)" fontFamily="IBM Plex Mono, monospace">
            {c.ownership_pct}%
          </text>
        </g>
      ))}
    </svg>
  )
}

// crude CSS-var → rgba helper (only handles our known tokens)
function hexToRgb(cssVar: string): string {
  const map: Record<string, string> = {
    'var(--orange)': '249,115,22',
    'var(--pink)': '236,72,153',
    'var(--purple)': '139,92,246',
    'var(--green)': '16,185,129',
    'var(--amber)': '245,158,11',
    'var(--lime)': '132,204,22',
    'var(--dim)': '120,120,120',
  }
  return map[cssVar] ?? '120,120,120'
}

// ── Add Edge Modal ────────────────────────────────────────────────
function AddEdgeModal({
  mode,
  thisEntityId,
  thisEntityName,
  allEntities,
  childType,
  onClose,
  onSaved,
}: {
  mode: 'parent' | 'child'
  thisEntityId: string
  thisEntityName: string
  allEntities: EntityOption[]
  childType?: 'entity' | 'property'
  onClose: () => void
  onSaved: () => void
}) {
  const [counterpartId, setCounterpartId] = useState('')
  const [pct, setPct] = useState('')
  const [role, setRole] = useState('')
  const [customRole, setCustomRole] = useState('')
  const [acquiredAt, setAcquiredAt] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  async function handleSave() {
    if (!counterpartId || !pct) { setErr('Counterparty and % required'); return }
    const pctNum = parseFloat(pct)
    if (isNaN(pctNum) || pctNum < 0 || pctNum > 100) { setErr('% must be 0–100'); return }
    setSaving(true)
    setErr('')
    const finalRole = role === '_custom' ? customRole : role
    // For property ownership, mode is always 'parent' (entity owns this property)
    const effectiveChildType = childType === 'property' ? 'property' : 'entity'
    const payload = mode === 'parent'
      ? { parent_entity_id: counterpartId, parent_type: 'entity', child_entity_id: thisEntityId, child_type: effectiveChildType, ownership_pct: pctNum, role: finalRole || null, acquired_at: acquiredAt || null, notes: notes || null }
      : { parent_entity_id: thisEntityId, parent_type: 'entity', child_entity_id: counterpartId, child_type: effectiveChildType, ownership_pct: pctNum, role: finalRole || null, acquired_at: acquiredAt || null, notes: notes || null }
    const { error } = await supabase.from('entity_ownership_edges').insert(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onSaved()
    onClose()
  }

  const label = mode === 'parent'
    ? (childType === 'property' ? 'Owned By (which entity owns this property)' : 'Parent (who owns this entity)')
    : 'Child (entity this entity owns)'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: '#0a0a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 32, width: '100%', maxWidth: 480 }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
          {mode === 'parent' ? '+ Add Parent' : '+ Add Child'}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
          {mode === 'parent' ? `Who owns ${thisEntityName}?` : `What does ${thisEntityName} own?`}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={labelStyle}>
            {label}
            <select style={inputStyle} value={counterpartId} onChange={e => setCounterpartId(e.target.value)}>
              <option value="">— select entity —</option>
              {allEntities
                .filter(e => e.id !== thisEntityId)
                .map(e => (
                  <option key={e.id} value={e.id}>{e.entity_name} ({e.entity_type ?? '?'})</option>
                ))}
            </select>
          </label>

          <label style={labelStyle}>
            Ownership %
            <input style={inputStyle} type="number" min="0" max="100" step="0.01" placeholder="e.g. 99" value={pct} onChange={e => setPct(e.target.value)} />
          </label>

          <label style={labelStyle}>
            Role
            <select style={inputStyle} value={role} onChange={e => setRole(e.target.value)}>
              <option value="">— select or type —</option>
              {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
              <option value="_custom">Custom…</option>
            </select>
          </label>
          {role === '_custom' && (
            <input style={inputStyle} placeholder="e.g. silent partner" value={customRole} onChange={e => setCustomRole(e.target.value)} />
          )}

          <label style={labelStyle}>
            Acquired Date (optional)
            <input style={inputStyle} type="date" value={acquiredAt} onChange={e => setAcquiredAt(e.target.value)} />
          </label>

          <label style={labelStyle}>
            Notes (optional)
            <textarea style={{ ...inputStyle, height: 64, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
          </label>

          {err && <div style={{ fontSize: 12, color: 'var(--red)' }}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button style={btnStyle('var(--orange)')} disabled={saving} onClick={handleSave}>
              {saving ? 'Saving…' : 'Save Edge'}
            </button>
            <button style={btnStyle('rgba(255,255,255,0.1)')} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 5,
  fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em',
}
const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'rgba(255,255,255,0.9)',
  fontFamily: 'DM Sans, sans-serif', outline: 'none', width: '100%',
}
const btnStyle = (bg: string): React.CSSProperties => ({
  padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, background: bg, color: 'rgba(255,255,255,0.9)',
  fontFamily: 'DM Sans, sans-serif',
})

// ── Main Component ────────────────────────────────────────────────
export default function OwnershipCard({
  entityId,
  entityName,
  entityType,
  childType = 'entity',
}: {
  entityId: string
  entityName: string
  entityType: string | null
  /** 'entity' (default) for companies; 'property' for property pages */
  childType?: 'entity' | 'property'
}) {
  const [parents, setParents] = useState<Edge[]>([])
  const [children, setChildren] = useState<Edge[]>([])
  const [allEntities, setAllEntities] = useState<EntityOption[]>([])
  const [modal, setModal] = useState<'parent' | 'child' | null>(null)
  const [loading, setLoading] = useState(true)

  const isPropertyMode = childType === 'property'

  const load = useCallback(async () => {
    setLoading(true)

    // For property mode: only query parent edges scoped to child_type='property'
    // For entity mode: query all edges (default child_type='entity' or null)
    const parentQuery = isPropertyMode
      ? supabase.from('entity_ownership_edges').select('*').eq('child_entity_id', entityId).eq('child_type', 'property')
      : supabase.from('entity_ownership_edges').select('*').eq('child_entity_id', entityId).neq('child_type', 'property')

    const childQuery = isPropertyMode
      ? Promise.resolve({ data: [] })  // properties have no children
      : supabase.from('entity_ownership_edges').select('*').eq('parent_entity_id', entityId).neq('child_type', 'property')

    const [pRes, cRes, eRes] = await Promise.all([
      parentQuery,
      childQuery,
      supabase.from('entity_ownership').select('id, entity_name, entity_type, slug, purpose'),
    ])

    const entityMap: Record<string, EntityOption> = {}
    ;(eRes.data ?? []).forEach((e: any) => { entityMap[e.id] = e })

    const enrich = (edges: any[], keyField: 'parent_entity_id' | 'child_entity_id') =>
      (edges ?? []).map((e: any) => ({
        ...e,
        ownership_pct: Number(e.ownership_pct),
        counterpart_name: entityMap[e[keyField]]?.entity_name,
        counterpart_slug: entityMap[e[keyField]]?.slug,
        counterpart_type: entityMap[e[keyField]]?.entity_type,
      }))

    setParents(enrich(pRes.data ?? [], 'parent_entity_id'))
    setChildren(enrich((cRes as any).data ?? [], 'child_entity_id'))
    setAllEntities(eRes.data ?? [])
    setLoading(false)
  }, [entityId, isPropertyMode])

  useEffect(() => { load() }, [load])

  const dimText: React.CSSProperties = { fontSize: 12, color: 'rgba(255,255,255,0.45)' }
  const edgeRow: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
  }

  return (
    <>
      <SpecCard accent dataSource="entity_ownership_edges">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Ownership Structure
            </div>
            <div style={{ fontSize: 15, fontWeight: 600 }}>
              {isPropertyMode ? 'Property Ownership' : 'Entity Graph'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={{ ...btnStyle('rgba(249,115,22,0.12)'), border: '1px solid rgba(249,115,22,0.2)', color: 'var(--orange)', fontSize: 11, padding: '6px 12px' }}
              onClick={() => setModal('parent')}>
              + Add Parent
            </button>
            {!isPropertyMode && (
              <button style={{ ...btnStyle('rgba(139,92,246,0.12)'), border: '1px solid rgba(139,92,246,0.2)', color: 'var(--purple)', fontSize: 11, padding: '6px 12px' }}
                onClick={() => setModal('child')}>
                + Add Child
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div style={dimText}>Loading ownership data…</div>
        ) : isPropertyMode ? (
          /* Property mode: single "Owned By" column, no children */
          <div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Owned By</div>
            {parents.length === 0 ? (
              <div style={dimText}>No parent owners recorded — use "+ Add Parent" to link an entity</div>
            ) : (
              parents.map(p => (
                <div key={p.id} style={edgeRow}>
                  <div>
                    {p.counterpart_slug ? (
                      <a href={`/companies/${p.counterpart_slug}`} style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                        {p.counterpart_name ?? p.parent_entity_id}
                      </a>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                        {p.counterpart_name ?? p.parent_entity_id}
                      </span>
                    )}
                    {p.role && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.role}</div>}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--orange)' }}>
                    {p.ownership_pct}%
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Entity mode: two-column Owned By / Owns */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Owned By */}
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Owned By</div>
              {parents.length === 0 ? (
                <div style={dimText}>No parent owners recorded</div>
              ) : (
                parents.map(p => (
                  <div key={p.id} style={edgeRow}>
                    <div>
                      {p.counterpart_slug ? (
                        <a href={`/companies/${p.counterpart_slug}`} style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                          {p.counterpart_name ?? p.parent_entity_id}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                          {p.counterpart_name ?? p.parent_entity_id}
                        </span>
                      )}
                      {p.role && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.role}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--orange)' }}>
                      {p.ownership_pct}%
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Owns */}
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 12 }}>Owns</div>
              {children.length === 0 ? (
                <div style={dimText}>No child entities recorded</div>
              ) : (
                children.map(c => (
                  <div key={c.id} style={edgeRow}>
                    <div>
                      {c.counterpart_slug ? (
                        <a href={`/companies/${c.counterpart_slug}`} style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)', textDecoration: 'none' }}>
                          {c.counterpart_name ?? c.child_entity_id}
                        </a>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                          {c.counterpart_name ?? c.child_entity_id}
                        </span>
                      )}
                      {c.role && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{c.role}</div>}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'IBM Plex Mono, monospace', color: 'var(--purple)' }}>
                      {c.ownership_pct}%
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Mini tree SVG — only for entity mode */}
        {!isPropertyMode && !loading && (parents.length > 0 || children.length > 0) && (
          <MiniTree
            entityName={entityName}
            entityType={entityType}
            parents={parents}
            children={children}
          />
        )}
      </SpecCard>

      {modal && (
        <AddEdgeModal
          mode={modal}
          thisEntityId={entityId}
          thisEntityName={entityName}
          allEntities={allEntities}
          childType={childType}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </>
  )
}
