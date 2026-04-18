'use client'
/**
 * LinkAccountBar — real Plaid Link flow.
 *
 * Click → fetch link_token → open Plaid Link popup → on success, POST
 * public_token + metadata to /api/accounts/link/exchange. Server stores
 * encrypted access_token, pulls accounts + initial transactions, returns
 * counts. We toast the result and reload so /accounts shows the new rows.
 */
import { useCallback, useState } from 'react'
import { usePlaidLink, type PlaidLinkOnSuccess, type PlaidLinkOnExit } from 'react-plaid-link'

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

const btnDisabled: React.CSSProperties = { ...btn, opacity: 0.5, cursor: 'wait' }

export default function LinkAccountBar({ entities }: Props) {
  const [scope, setScope] = useState<'personal' | 'entity'>('personal')
  const [entityId, setEntityId] = useState('')
  const [toast, setToast] = useState<{ msg: string; kind: 'info' | 'ok' | 'err' } | null>(null)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [pendingProduct, setPendingProduct] = useState<'bank' | 'brokerage' | null>(null)
  const [pending, setPending] = useState<'create' | 'exchange' | null>(null)

  function showToast(msg: string, kind: 'info' | 'ok' | 'err' = 'info', durationMs = 5000) {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), durationMs)
  }

  // react-plaid-link fires onSuccess with (public_token, metadata). We POST
  // both to /exchange. Metadata includes institution info we use to avoid
  // a second Plaid API round-trip on the server.
  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token, metadata) => {
    setPending('exchange')
    setLinkToken(null)  // single-use; clear so the bar can relink if needed
    try {
      const resp = await fetch('/api/accounts/link/exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          public_token,
          product: pendingProduct ?? 'bank',
          scope,
          entity_id: entityId || null,
          institution: {
            institution_id: metadata.institution?.institution_id,
            name: metadata.institution?.name,
          },
        }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.ok) {
        showToast(`Link failed: ${data.error ?? resp.statusText}`, 'err', 8000)
        setPending(null)
        return
      }
      showToast(
        `Linked ${data.institution} — ${data.account_count} account${data.account_count === 1 ? '' : 's'}, ${data.transaction_count} transactions imported. Refreshing…`,
        'ok',
        4000,
      )
      setTimeout(() => window.location.reload(), 1200)
    } catch (e) {
      showToast(`Link failed: ${e instanceof Error ? e.message : String(e)}`, 'err', 8000)
    } finally {
      setPending(null)
    }
  }, [pendingProduct, scope, entityId])

  const onExit = useCallback<PlaidLinkOnExit>((err) => {
    setLinkToken(null)
    setPending(null)
    if (err) showToast(`Plaid exited: ${err.error_message ?? err.error_code ?? 'user canceled'}`, 'info', 3500)
  }, [])

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit,
  })

  // When the link_token is ready and Plaid's iframe is ready, auto-open.
  // usePlaidLink's `ready` flips true once the token + script are loaded.
  if (linkToken && ready && pending !== 'exchange') {
    // Defer to next tick so state updates settle first
    setTimeout(() => open(), 0)
  }

  async function handleLink(product: 'bank' | 'brokerage') {
    if (scope === 'entity' && !entityId) {
      showToast('Select an entity first', 'err', 3000)
      return
    }
    setPending('create')
    setPendingProduct(product)
    try {
      const resp = await fetch('/api/accounts/link/create-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, scope, entity_id: entityId || null }),
      })
      const data = await resp.json()
      if (!resp.ok || !data.ok) {
        showToast(`Can't start Plaid: ${data.error ?? resp.statusText}`, 'err', 8000)
        setPending(null)
        return
      }
      setLinkToken(data.link_token)  // Triggers auto-open above once ready
    } catch (e) {
      showToast(`Can't start Plaid: ${e instanceof Error ? e.message : String(e)}`, 'err', 8000)
      setPending(null)
    }
  }

  const busy = pending !== null

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

      <select value={scope} style={sel} disabled={busy} onChange={e => {
        setScope(e.target.value as 'personal' | 'entity')
        if (e.target.value === 'personal') setEntityId('')
      }}>
        <option value="personal">Personal</option>
        <option value="entity">Entity</option>
      </select>

      {scope === 'entity' && (
        <select value={entityId} style={{ ...sel, minWidth: 160 }} disabled={busy} onChange={e => setEntityId(e.target.value)}>
          <option value="">Select entity…</option>
          {entities.map(ent => (
            <option key={ent.id} value={ent.id}>{ent.entity_name}</option>
          ))}
        </select>
      )}

      <button
        style={busy ? btnDisabled : btn}
        disabled={busy}
        onClick={() => handleLink('bank')}
      >
        {pending === 'create' && pendingProduct === 'bank' ? 'Starting…' :
         pending === 'exchange' && pendingProduct === 'bank' ? 'Importing…' :
         'Link Bank Account'}
      </button>
      <button
        style={busy ? btnDisabled : btn}
        disabled={busy}
        onClick={() => handleLink('brokerage')}
      >
        {pending === 'create' && pendingProduct === 'brokerage' ? 'Starting…' :
         pending === 'exchange' && pendingProduct === 'brokerage' ? 'Importing…' :
         'Link Brokerage'}
      </button>

      {toast && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(100% + 8px)',
          left: 0,
          right: 0,
          background: 'rgba(30,30,40,0.97)',
          border: `1px solid ${toast.kind === 'err' ? 'rgba(239,68,68,0.5)' : toast.kind === 'ok' ? 'rgba(16,185,129,0.5)' : 'var(--border)'}`,
          borderRadius: 8,
          padding: '10px 14px',
          fontSize: 12,
          color: toast.kind === 'err' ? '#fca5a5' : toast.kind === 'ok' ? '#86efac' : 'var(--amber)',
          zIndex: 50,
          lineHeight: 1.5,
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
