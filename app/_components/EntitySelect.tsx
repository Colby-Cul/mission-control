'use client'
/**
 * EntitySelect — inline per-row owner assignment for financial_accounts.
 * Renders a "Personal / Entity" scope toggle + entity dropdown when scope='entity'.
 * Persists immediately to Supabase on change (anon key + RLS authenticated update).
 */
import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'

interface Entity {
  id: string
  entity_name: string
}

interface Props {
  accountId: string
  currentScope?: 'personal' | 'entity'
  currentEntity?: string | null
  entities: Entity[]
  onUpdate?: () => void
}

const sel: React.CSSProperties = {
  padding: '4px 8px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: 5,
  color: 'var(--t1)',
  fontSize: 11,
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
}

export default function EntitySelect({
  accountId,
  currentScope = 'personal',
  currentEntity,
  entities,
  onUpdate,
}: Props) {
  const [scope, setScope] = useState<'personal' | 'entity'>(currentScope)
  const [entityId, setEntityId] = useState<string>(currentEntity ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function save(next: { scope: 'personal' | 'entity'; entityId: string | null }) {
    setSaving(true)
    setErr(null)
    const { error } = await supabase
      .from('financial_accounts')
      .update({
        account_scope: next.scope,
        entity_id: next.scope === 'entity' ? (next.entityId || null) : null,
      })
      .eq('id', accountId)
    setSaving(false)
    if (error) {
      setErr('Save failed')
      console.error('EntitySelect save error:', error)
    } else {
      onUpdate?.()
    }
  }

  return (
    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <select
        value={scope}
        style={sel}
        onChange={e => {
          const newScope = e.target.value as 'personal' | 'entity'
          setScope(newScope)
          if (newScope === 'personal') setEntityId('')
          save({ scope: newScope, entityId: newScope === 'entity' ? entityId : null })
        }}
      >
        <option value="personal">Personal</option>
        <option value="entity">Entity</option>
      </select>

      {scope === 'entity' && (
        <select
          value={entityId}
          style={{ ...sel, maxWidth: 160 }}
          onChange={e => {
            setEntityId(e.target.value)
            save({ scope: 'entity', entityId: e.target.value || null })
          }}
        >
          <option value="">Select entity…</option>
          {entities.map(ent => (
            <option key={ent.id} value={ent.id}>
              {ent.entity_name}
            </option>
          ))}
        </select>
      )}

      {saving && (
        <span style={{ fontSize: 10, color: 'var(--dim)', whiteSpace: 'nowrap' }}>saving…</span>
      )}
      {err && (
        <span style={{ fontSize: 10, color: 'var(--red)', whiteSpace: 'nowrap' }}>{err}</span>
      )}
    </div>
  )
}
