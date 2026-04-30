'use client'

import { useState } from 'react'
import Link from 'next/link'
import IntegrationKeyModal from './IntegrationKeyModal'
import { getProvider } from '../lib/integration-providers'

interface Props {
  /** Provider slug from the integration registry. */
  connect: string
  /** Optional label override — defaults to "Connect {Provider} to activate". */
  label?: string
  className?: string
}

/**
 * Client-only CTA rendered inside the server-side <ComingSoon> widget.
 * Instead of bouncing the user to /settings (the old bug), we:
 *   - api-key   → open IntegrationKeyModal inline
 *   - oauth     → Link to cfg.connectHref
 *   - info-only → <a> to docsUrl (fallback to /integrations highlight)
 */
export default function ComingSoonConnectCTA({ connect, label, className }: Props) {
  const [open, setOpen] = useState(false)
  const cfg = getProvider(connect)
  const defaultLabel =
    label ?? `Connect ${connect.charAt(0).toUpperCase() + connect.slice(1)} to activate`

  const iconSvg = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )

  if (cfg.kind === 'oauth' && cfg.connectHref) {
    return (
      <Link href={cfg.connectHref} className={className ?? 'coming-soon-cta'}>
        {iconSvg}
        {defaultLabel}
      </Link>
    )
  }

  if (cfg.kind === 'info-only') {
    const href = cfg.docsUrl ?? `/integrations?highlight=${connect}`
    return (
      <a
        href={href}
        target={cfg.docsUrl ? '_blank' : undefined}
        rel={cfg.docsUrl ? 'noopener noreferrer' : undefined}
        className={className ?? 'coming-soon-cta'}
      >
        {iconSvg}
        {defaultLabel}
      </a>
    )
  }

  // api-key (or oauth-without-connectHref fallback) → open modal
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? 'coming-soon-cta'}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        {iconSvg}
        {defaultLabel}
      </button>
      {open && <IntegrationKeyModal provider={connect} onClose={() => setOpen(false)} />}
    </>
  )
}
