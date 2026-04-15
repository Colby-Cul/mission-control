'use client'
/**
 * LinkAccountBar — compact "Link new account" bar at the top of /accounts.
 * Scope selector (Personal / Entity) + entity dropdown + Link Bank / Link Brokerage.
 * Plaid is not wired in v7 yet — buttons show a toast. When Plaid is configured,
 * wire the success handler to POST /api/accounts/link with scope + entity_id.
 *
 * TODO: replace the stub toast with a real PlaidLink component once
 *   NEXT_PUBLIC_PLAID_CLIENT_ID / PLAID_SECRET are configured in Vercel env.
 */
import { useState } from 'react'

interface Entity {
  id: string
  entity_name: string
}

interface Props {
  entities: Entity[]
}

const sel: React.CSSProperties = {
  padding: '5px 10px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--t1)',
  fontSize: 12,
  cursor: 'pointer',
  outline: 'none',
  fontFamily: 'inherit',
}

const btn: React.CSSProperties = {
  padding: '6px 14px',
  background: 'rgba(255,255,255,0.08)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--t1)',
  fontSize: 12,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 500,
  whiteSpace: 'nowrap',
}

export default function LinkAccountBar({ entities }: Props) {
  const [scope, setScope] = useState<'personal' | 'entity'>('personal')
  const [entityId, setEntityId] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  function handleLink(product: 'bank' | 'brokerage') {
    // TODO: integrate real Plaid Link once NEXT_PUBLIC_PLAID_CLIENT_ID is set.
    // On success, POST /api/accounts/link with { scope, entity_id, public_token, product }.
    showToast('Plaid not yet configured — set PLAID_SECRET + NEXT_PUBLIC_PLAID_CLIENT_ID in Vercel env, then wire PlaidLink here.')
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      flexWrap: 'wrap',
      padding: '12px 16px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid var(--border)',
      borderRadius: 10,
      marginBottom: 20,
      position: 'relative',
    }}>
      <span style={{ fontSize: 11, color: 'var(--dim)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap', marginRight: 4 }}>
        Link Account
      </span>

      <select value={scope} style={sel} onChange={e => {
        setScope(e.target.value as 'personal' | 'entity')
        if (e.target.value === 'personal') setEntityId('')
      }}>
        <option value="personal">Personal</option>
        <option value="entity">Entity</option>
      </select>

      {scope === 'entity' && (
        <select value={entityId} style={{ ...sel, minWidth: 160 }} onChange={e => setEntityId(e.target.value)}>
          <option value="">Select entity…</option>
          {entities.map(ent => (
            <option key={ent.id} value={ent.id}>{ent.entity_name}</option>
          ))}
        </select>
      )}

      <button style={btn} onClick={() => handleLink('bank')}>
        Link Bank Account
      </button>
      <button style={btn} onClick={() => handleLink('brokerage')}>
        Link Brokerage
      </button>

      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: 'rgba(30,30,40,0.97)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          color: 'var(--amber)',
          zIndex: 50,
          lineHeight: 1.5,
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
