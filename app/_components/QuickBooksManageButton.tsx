'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Opens the QuickBooks multi-tenant connection manager modal.
 *
 * The QB integration is multi-tenant: one OAuth connection per entity slug.
 * This button lives on the Integrations page QB card and opens a modal that
 * lists every currently-connected entity (realm + token expiry + disconnect)
 * plus an entity-picker dropdown for connecting a new entity.
 */

export interface QbConnRow {
  company_key: string
  realm_id: string | null
  expires_at: string
  refresh_token_expires_at: string | null
  updated_at: string
}

export interface EntityOption {
  slug: string
  name: string
}

interface Props {
  /** Current list of connections, keyed by entity slug. */
  connections: QbConnRow[]
  /** Entities known to Mission Control (for the "Connect new" picker). */
  entities: EntityOption[]
  /** Where the button appears on the integrations card — controls the label. */
  hasAny: boolean
  /** returnTo for the OAuth callback — defaults to /integrations. */
  returnTo?: string
}

export default function QuickBooksManageButton({
  connections,
  entities,
  hasAny,
  returnTo = '/integrations',
}: Props) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-integration-action
        style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '4px 12px',
          borderRadius: 6,
          background: '#2ca01c',
          color: '#fff',
          textDecoration: 'none',
          border: '1px solid rgba(44,160,28,0.5)',
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        {hasAny ? 'Manage' : 'Connect QuickBooks'}
      </button>
      {open && (
        <QuickBooksManageModal
          connections={connections}
          entities={entities}
          returnTo={returnTo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

interface ModalProps {
  connections: QbConnRow[]
  entities: EntityOption[]
  returnTo: string
  onClose: () => void
}

function QuickBooksManageModal({
  connections,
  entities,
  returnTo,
  onClose,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedEntity, setSelectedEntity] = useState<string>('')
  const [busy, setBusy] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const connectedSlugs = new Set(connections.map(c => c.company_key))
  const availableEntities = entities.filter(e => !connectedSlugs.has(e.slug))

  // Slug → human name for the connected list.
  const entityByslug: Record<string, string> = {}
  for (const e of entities) entityByslug[e.slug] = e.name

  function formatDate(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString().slice(0, 5)
  }

  async function handleDisconnect(slug: string) {
    const entityName = entityByslug[slug] ?? slug
    if (!confirm(`Disconnect QuickBooks for ${entityName}?`)) return
    setBusy(slug)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(
        `/api/qb/disconnect?entity=${encodeURIComponent(slug)}`,
        { method: 'DELETE' },
      )
      if (res.status !== 204) {
        const msg = await res.text().catch(() => '')
        setErrorMsg(`Disconnect failed (${res.status}): ${msg.slice(0, 120)}`)
      } else {
        setSuccessMsg(`Disconnected ${entityName}. Refreshing…`)
        setTimeout(() => {
          window.location.reload()
        }, 700)
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  function handleConnectNew() {
    if (!selectedEntity) {
      setErrorMsg('Pick an entity to connect.')
      return
    }
    const url =
      `/api/qb/connect?entity=${encodeURIComponent(selectedEntity)}` +
      `&returnTo=${encodeURIComponent(returnTo)}`
    window.location.href = url
  }

  if (!mounted) return null

  const content = (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qb-modal-title"
        style={{
          background: 'var(--bg, #0a0a0b)',
          border: '1px solid rgba(44,160,28,0.35)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          color: 'var(--t1, #e8e8e8)',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 18,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(44,160,28,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: '#2ca01c',
              }}
            >
              QB
            </div>
            <div>
              <h2
                id="qb-modal-title"
                style={{ margin: 0, fontSize: 16, fontWeight: 700 }}
              >
                QuickBooks — Connected Companies
              </h2>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--mo)',
                  color: 'var(--dim)',
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}
              >
                {connections.length} ENTITY {connections.length === 1 ? 'CONNECTED' : 'CONNECTIONS'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--t2, #ccc)',
              borderRadius: 6,
              width: 30,
              height: 30,
              cursor: 'pointer',
              fontSize: 14,
            }}
          >
            ×
          </button>
        </div>

        {/* Connected list */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--mo)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--dim)',
              marginBottom: 10,
            }}
          >
            Currently Connected
          </div>
          {connections.length === 0 ? (
            <div
              style={{
                padding: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--dim)',
              }}
            >
              No QuickBooks companies connected yet. Use the picker below to
              connect your first entity.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {connections.map((c) => {
                const name = entityByslug[c.company_key] ?? c.company_key
                const expires = formatDate(c.expires_at)
                const refreshExp = formatDate(c.refresh_token_expires_at)
                const slug = c.company_key
                return (
                  <div
                    key={slug}
                    style={{
                      padding: 12,
                      background: 'rgba(44,160,28,0.05)',
                      border: '1px solid rgba(44,160,28,0.2)',
                      borderRadius: 10,
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      gap: 12,
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          marginBottom: 4,
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--dim)',
                          fontFamily: 'var(--mo)',
                          display: 'flex',
                          gap: 14,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span>slug: {slug}</span>
                        <span>realm: {c.realm_id ?? '—'}</span>
                        <span>token expires: {expires}</span>
                        <span>refresh expires: {refreshExp}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(slug)}
                      disabled={busy === slug}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(239,68,68,0.4)',
                        color: 'var(--red)',
                        borderRadius: 8,
                        padding: '6px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: busy === slug ? 'wait' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {busy === slug ? 'Working…' : 'Disconnect'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Connect new */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              fontFamily: 'var(--mo)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--dim)',
              marginBottom: 10,
            }}
          >
            Connect New Entity
          </div>
          {availableEntities.length === 0 ? (
            <div
              style={{
                padding: 14,
                background: 'rgba(255,255,255,0.02)',
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: 10,
                fontSize: 12,
                color: 'var(--dim)',
              }}
            >
              All known entities are already connected, or no entities are
              configured in <code>entity_ownership</code>.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                value={selectedEntity}
                onChange={(e) => setSelectedEntity(e.target.value)}
                style={{
                  flex: '1 1 220px',
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: 12,
                  color: 'var(--t1, #e8e8e8)',
                  fontFamily: 'inherit',
                }}
              >
                <option value="">— Select an entity —</option>
                {availableEntities.map((e) => (
                  <option key={e.slug} value={e.slug}>
                    {e.name} ({e.slug})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleConnectNew}
                disabled={!selectedEntity}
                style={{
                  background: selectedEntity ? '#2ca01c' : 'rgba(44,160,28,0.35)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 18px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: selectedEntity ? 'pointer' : 'not-allowed',
                  fontFamily: 'inherit',
                }}
              >
                Connect
              </button>
            </div>
          )}
        </div>

        {/* Feedback */}
        {errorMsg && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--red)',
              fontFamily: 'var(--mo)',
            }}
          >
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div
            style={{
              marginTop: 14,
              padding: 10,
              background: 'rgba(16,185,129,0.08)',
              border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--green)',
              fontFamily: 'var(--mo)',
            }}
          >
            {successMsg}
          </div>
        )}

        {/* Footnote */}
        <div
          style={{
            marginTop: 18,
            padding: 10,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            fontSize: 10,
            color: 'var(--dim)',
            lineHeight: 1.5,
          }}
        >
          Tokens are stored in <code>quickbooks_connections</code>, keyed by
          entity slug. One row per entity. The OAuth state carries the slug so
          the callback can upsert to the right row.
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
