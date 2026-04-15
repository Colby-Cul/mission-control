'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getProvider } from '../lib/integration-providers'

interface EnvStatus {
  masked: string
  updated_at: string | null
  targets: string[]
}

interface Props {
  provider: string
  onClose: () => void
}

interface StatusPayload {
  provider: string
  configured: boolean
  status: 'active' | 'partial' | 'not-configured'
  envVars: string[]
  masked: Record<string, EnvStatus>
  vercelConfigured: boolean
}

/**
 * Renders a full-viewport portal modal for rotating an integration's API
 * key(s). One input per env var from the registry. Submit calls
 * `POST /api/integrations/rotate`; disconnect calls DELETE.
 */
export default function IntegrationKeyModal({ provider, onClose }: Props) {
  const cfg = useMemo(() => getProvider(provider), [provider])
  const [mounted, setMounted] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<StatusPayload | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const firstInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Load masked status for this provider.
  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const res = await fetch(
          `/api/integrations/status?provider=${encodeURIComponent(provider)}`,
          { cache: 'no-store' },
        )
        if (!cancelled && res.ok) {
          const data = (await res.json()) as StatusPayload
          setStatus(data)
        }
      } catch {
        // noop — render will show "status unavailable"
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [provider])

  // Esc closes, focus-trap the first input on open.
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    const t = setTimeout(() => firstInputRef.current?.focus(), 50)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(t)
    }
  }, [onClose])

  const envVars = cfg.envVars
  const isKnown = envVars.length > 0
  const canEdit = status?.vercelConfigured ?? false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // Only submit non-empty values (partial updates allowed).
    const payload: Record<string, string> = {}
    for (const k of envVars) {
      const v = values[k]
      if (v && v.trim()) payload[k] = v.trim()
    }
    if (Object.keys(payload).length === 0) {
      setErrorMsg('Enter at least one value to save.')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/integrations/rotate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, values: payload }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error ?? `Save failed (${res.status})`)
        setSubmitting(false)
        return
      }
      setSuccessMsg(
        data.deployUrl
          ? '✓ Saved · Redeploying…'
          : '✓ Saved',
      )
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm(`Disconnect ${provider}? This removes all env vars and redeploys.`)) return
    setErrorMsg(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/integrations/rotate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setErrorMsg(data?.error ?? `Disconnect failed (${res.status})`)
        setSubmitting(false)
        return
      }
      setSuccessMsg('✓ Disconnected · Redeploying…')
      setTimeout(() => onClose(), 2000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setSubmitting(false)
    }
  }

  async function handleTest() {
    if (!cfg.testEndpoint) return
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.success) {
        setTestResult(`× ${data?.error ?? 'probe failed'}`)
      } else {
        setTestResult(`✓ ${data.message ?? 'Connected'}`)
      }
    } catch (err: unknown) {
      setTestResult(`× ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTesting(false)
    }
  }

  if (!mounted) return null

  const connectedCount = status
    ? envVars.filter((k) => status.masked[k]).length
    : 0
  const totalCount = envVars.length
  const statusText = status?.status === 'active'
    ? 'CONNECTED'
    : status?.status === 'partial'
    ? 'PARTIAL'
    : 'NOT CONFIGURED'
  const statusColor = status?.status === 'active'
    ? 'var(--green)'
    : status?.status === 'partial'
    ? 'var(--amber)'
    : 'var(--dim)'

  const monogram = cfg.provider.slice(0, 2).toUpperCase()

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
        aria-labelledby="integration-modal-title"
        style={{
          background: 'var(--bg, #0a0a0b)',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 16,
          padding: 24,
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
          color: 'var(--t1, #e8e8e8)',
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(249,115,22,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--orange)',
              }}
            >
              {monogram}
            </div>
            <div>
              <h2
                id="integration-modal-title"
                style={{ margin: 0, fontSize: 16, fontWeight: 700, textTransform: 'capitalize' }}
              >
                {cfg.provider.replace(/-/g, ' ')}
              </h2>
              <div
                style={{
                  fontSize: 10,
                  fontFamily: 'var(--mo)',
                  color: statusColor,
                  letterSpacing: '0.06em',
                  marginTop: 2,
                }}
              >
                {loading ? 'LOADING…' : statusText} {totalCount > 0 && !loading ? `· ${connectedCount}/${totalCount}` : ''}
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

        {/* Not-in-registry / info-only fallback */}
        {!isKnown && (
          <div
            style={{
              padding: 14,
              background: 'rgba(249,115,22,0.06)',
              border: '1px dashed rgba(249,115,22,0.25)',
              borderRadius: 10,
              fontSize: 12,
              color: 'var(--t2, #ccc)',
            }}
          >
            Manual configuration required. This provider has no environment-variable
            credentials in Mission Control.
            {cfg.docsUrl && (
              <>
                {' '}
                <a
                  href={cfg.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--orange)', textDecoration: 'underline' }}
                >
                  Open provider docs ↗
                </a>
              </>
            )}
          </div>
        )}

        {/* Admin-token missing warning */}
        {isKnown && !loading && !canEdit && (
          <div
            style={{
              padding: 12,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8,
              fontSize: 11,
              color: 'var(--red)',
              marginBottom: 14,
            }}
          >
            VERCEL_API_TOKEN not configured — admin action required. You can view
            current values below but cannot save changes from this UI.
          </div>
        )}

        {/* Rotate instructions — collapsible */}
        {isKnown && cfg.rotateInstructions && (
          <div style={{ marginBottom: 14 }}>
            <button
              type="button"
              onClick={() => setShowInstructions((v) => !v)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'var(--t2, #ccc)',
                fontSize: 11,
                padding: '6px 10px',
                borderRadius: 6,
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              {showInstructions ? '▾ How to rotate this key' : '▸ How to rotate this key'}
            </button>
            {showInstructions && (
              <pre
                style={{
                  background: 'rgba(0,0,0,0.35)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 11,
                  color: 'var(--t2, #ccc)',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--mo)',
                  margin: '8px 0 0 0',
                }}
              >
                {cfg.rotateInstructions}
              </pre>
            )}
          </div>
        )}

        {/* Input fields */}
        {isKnown && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {envVars.map((key, idx) => {
              const current = status?.masked[key]
              return (
                <div key={key}>
                  <label
                    htmlFor={`env-${key}`}
                    style={{
                      display: 'block',
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: 'var(--mo)',
                      letterSpacing: '0.04em',
                      color: 'var(--t2, #ccc)',
                      marginBottom: 6,
                    }}
                  >
                    {key}
                  </label>
                  {current && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--dim)',
                        fontFamily: 'var(--mo)',
                        marginBottom: 4,
                      }}
                    >
                      Current: {current.masked}
                      {current.updated_at && (
                        <span> · updated {new Date(current.updated_at).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      ref={idx === 0 ? firstInputRef : undefined}
                      id={`env-${key}`}
                      type={show[key] ? 'text' : 'password'}
                      autoComplete="off"
                      spellCheck={false}
                      value={values[key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                      disabled={!canEdit || submitting}
                      placeholder={current ? 'Paste new value to rotate…' : 'Paste value to set…'}
                      style={{
                        flex: 1,
                        background: 'rgba(0,0,0,0.35)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 6,
                        padding: '8px 10px',
                        fontSize: 12,
                        color: 'var(--t1, #e8e8e8)',
                        fontFamily: 'var(--mo)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShow((s) => ({ ...s, [key]: !s[key] }))}
                      aria-label={show[key] ? 'Hide' : 'Show'}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'var(--t2, #ccc)',
                        borderRadius: 6,
                        padding: '0 10px',
                        cursor: 'pointer',
                        fontSize: 11,
                      }}
                    >
                      {show[key] ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {idx === 0 && cfg.keyFormat && (
                    <div style={{ fontSize: 10, color: 'var(--dim)', marginTop: 4 }}>
                      Expected format: <code style={{ fontFamily: 'var(--mo)' }}>{cfg.keyFormat}</code>
                    </div>
                  )}
                </div>
              )
            })}

            {cfg.docsUrl && (
              <a
                href={cfg.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11,
                  color: 'var(--orange)',
                  textDecoration: 'underline',
                }}
              >
                Where do I get this? ↗
              </a>
            )}

            {/* Feedback */}
            {errorMsg && (
              <div
                style={{
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
            {testResult && (
              <div
                style={{
                  padding: 10,
                  background: testResult.startsWith('✓') ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${testResult.startsWith('✓') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: 8,
                  fontSize: 11,
                  color: testResult.startsWith('✓') ? 'var(--green)' : 'var(--red)',
                  fontFamily: 'var(--mo)',
                }}
              >
                {testResult}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button
                type="submit"
                disabled={!canEdit || submitting}
                style={{
                  flex: '1 1 auto',
                  background: canEdit ? 'var(--orange, #f97316)' : 'rgba(249,115,22,0.3)',
                  color: '#0a0a0b',
                  border: 'none',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: canEdit && !submitting ? 'pointer' : 'not-allowed',
                  opacity: submitting ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {submitting ? 'Saving…' : 'Save & Redeploy'}
              </button>
              {cfg.testEndpoint && (
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'var(--t1, #e8e8e8)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: testing ? 'wait' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {testing ? 'Testing…' : 'Test Connection'}
                </button>
              )}
              {status?.configured && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={!canEdit || submitting}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: 'var(--red)',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: canEdit && !submitting ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  )

  return createPortal(content, document.body)
}
