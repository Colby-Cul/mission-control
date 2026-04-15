import React from 'react'
import Link from 'next/link'

type SkeletonShape = 'chart' | 'table' | 'kpi' | 'none'

interface ComingSoonProps {
  title: string
  /** Human-readable reason / teaser for what will live here */
  reason?: string
  /** Icon or emoji to show */
  icon?: string
  /** Integration to connect — links CTA to Settings → Integrations */
  connect?: 'plaid' | 'qb' | 'stripe' | 'google' | 'notion' | 'gmail' | string
  /** Ghost skeleton layout */
  skeleton?: SkeletonShape
  /** Optional extra className */
  className?: string
  /** Optional min-height override */
  minHeight?: number
  /** For spec-lint data-source attribute */
  dataSource?: string
}

function SkeletonRows({ shape }: { shape: SkeletonShape }) {
  if (shape === 'none') return null
  const widths =
    shape === 'kpi'   ? ['60%', '80%', '40%'] :
    shape === 'chart' ? ['100%', '70%', '90%'] :
    /* table */         ['100%', '85%', '95%']

  return (
    <div className="cs-skeleton">
      {widths.map((w, i) => (
        <div key={i} className="cs-skeleton-row" style={{ width: w }} />
      ))}
    </div>
  )
}

/**
 * ComingSoon — uniform widget-level placeholder per Master Redesign Plan §6.
 * Never removed from pages — always ships instead of a blank widget.
 * Server component.
 */
export default function ComingSoon({
  title,
  reason,
  icon = '🔮',
  connect,
  skeleton = 'table',
  className = '',
  minHeight,
  dataSource,
}: ComingSoonProps) {
  // Route through integrations hub so the provider card highlights + scrolls into view.
  const connectHref = connect ? `/integrations?highlight=${connect}` : '/settings'
  const connectLabel = connect
    ? `Connect ${connect.charAt(0).toUpperCase() + connect.slice(1)} to activate`
    : 'Configure in Settings'

  return (
    <div
      className={`coming-soon-card${className ? ' ' + className : ''}`}
      style={minHeight ? { minHeight } : undefined}
      data-source={dataSource ?? `coming-soon:${title}`}
    >
      <div className="coming-soon-pill">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <circle cx="4" cy="4" r="3" fill="currentColor" opacity="0.7" />
        </svg>
        COMING SOON
      </div>

      <span className="coming-soon-icon">{icon}</span>
      <p className="coming-soon-title">{title}</p>
      {reason && <p className="coming-soon-reason">{reason}</p>}

      <SkeletonRows shape={skeleton} />

      {connect && (
        <Link href={connectHref} className="coming-soon-cta">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {connectLabel}
        </Link>
      )}
    </div>
  )
}
