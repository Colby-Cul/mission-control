'use client'

import { useState } from 'react'
import Link from 'next/link'
import IntegrationKeyModal from './IntegrationKeyModal'
import { getProvider } from '../lib/integration-providers'

interface Props {
  provider: string
  isConnected: boolean
  /** Controls the button label ("Manage" vs "Connect"). */
  label?: string
  /** Optional inline style override — used by the integrations grid which
   *  wants orange/green accents depending on status. */
  style?: React.CSSProperties
}

/**
 * Unified action button for an integration card. Picks the right behavior
 * based on the provider's registry entry:
 *   - oauth + connectHref → <Link> to the consent URL
 *   - api-key             → button that opens the IntegrationKeyModal
 *   - info-only           → <a> to docsUrl if set, otherwise disabled label
 *   - oauth w/o connectHref → shows "Setup required" inline
 */
export default function IntegrationActionButton({
  provider,
  isConnected,
  label,
  style,
}: Props) {
  const [open, setOpen] = useState(false)
  const cfg = getProvider(provider)

  const baseBtnStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    padding: '4px 12px',
    borderRadius: 6,
    background: isConnected ? 'rgba(16,185,129,0.1)' : 'rgba(249,115,22,0.15)',
    color: isConnected ? 'var(--green)' : 'var(--orange)',
    border: `1px solid ${isConnected ? 'rgba(16,185,129,0.2)' : 'rgba(249,115,22,0.3)'}`,
    textDecoration: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    ...(style ?? {}),
  }

  const buttonLabel = label ?? (isConnected ? 'Manage' : 'Connect')

  // ── OAuth: wire the consent URL ───────────────────────────────────────
  if (cfg.kind === 'oauth' && cfg.connectHref) {
    return (
      <Link
        href={cfg.connectHref}
        data-integration-action
        style={baseBtnStyle}
      >
        {isConnected ? 'Reconnect' : buttonLabel}
      </Link>
    )
  }

  // OAuth but no consent URL configured yet — point at docs instead of crashing.
  if (cfg.kind === 'oauth' && !cfg.connectHref) {
    return (
      <a
        href={cfg.docsUrl ?? '/docs/integrations'}
        target={cfg.docsUrl ? '_blank' : undefined}
        rel="noopener noreferrer"
        data-integration-action
        style={{
          ...baseBtnStyle,
          background: 'rgba(255,255,255,0.04)',
          color: 'var(--dim)',
          border: '1px dashed rgba(255,255,255,0.12)',
          cursor: 'pointer',
        }}
      >
        Setup required ↗
      </a>
    )
  }

  // ── info-only: link to docs ──────────────────────────────────────────
  if (cfg.kind === 'info-only') {
    if (cfg.docsUrl) {
      return (
        <a
          href={cfg.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-integration-action
          style={baseBtnStyle}
        >
          View docs ↗
        </a>
      )
    }
    return (
      <span
        data-integration-action
        style={{
          ...baseBtnStyle,
          cursor: 'default',
          color: 'var(--dim)',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        Local only
      </span>
    )
  }

  // ── api-key: open modal ──────────────────────────────────────────────
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-integration-action
        style={baseBtnStyle}
      >
        {buttonLabel}
      </button>
      {open && (
        <IntegrationKeyModal provider={provider} onClose={() => setOpen(false)} />
      )}
    </>
  )
}
