import React from 'react'

interface SpecCardProps {
  children: React.ReactNode
  accent?: boolean
  className?: string
  style?: React.CSSProperties
  dataSource?: string
}

/**
 * SpecCard — the canonical glassmorphic .mc-card base.
 * Pass `accent` for the 3px gradient top bar (orange→pink→purple).
 * Pass `dataSource` to satisfy spec lint §7 rule 6.
 * Server component.
 */
export function SpecCard({ children, accent = false, className = '', style, dataSource }: SpecCardProps) {
  return (
    <div
      className={`mc-card${accent ? ' accent' : ''}${className ? ' ' + className : ''}`}
      style={style}
      data-source={dataSource}
    >
      {children}
    </div>
  )
}
