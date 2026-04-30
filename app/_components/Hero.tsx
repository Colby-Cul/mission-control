import React from 'react'
import HeroCanvasDefault from './HeroCanvasDefault'

interface KpiCard {
  label: string
  value: string
  delta?: string
  deltaPositive?: boolean
}

interface PlayerCard {
  name: string
  role: string
  level: number
  xpCurrent: number
  xpNext: number
  since?: string
  stats?: { key: string; value: string }[]
  initials?: string
}

interface HeroProps {
  label: string
  greeting: string
  primaryMetric: string
  metricSubtitle?: string
  kpiCards?: KpiCard[]
  playerCard?: PlayerCard
  /** Page-specific canvas client component. Defaults to the financial-network animation. */
  animationSlot?: React.ReactNode
}

/**
 * Hero — the locked hero banner (DASHBOARD-TEMPLATE-SPEC §1).
 * 3-column flex, 480px min-height, glassmorphic, HUD corners, scanline.
 * Server component. animationSlot is a client component passed from the page.
 */
export default function Hero({
  label,
  greeting,
  primaryMetric,
  metricSubtitle,
  kpiCards = [],
  playerCard,
  animationSlot,
}: HeroProps) {
  const xpPct = playerCard
    ? Math.round((playerCard.xpCurrent / (playerCard.xpNext || 1)) * 100)
    : 42

  const initials = playerCard?.initials ??
    (playerCard?.name
      ? playerCard.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
      : 'C')

  return (
    <div className="hero-banner" aria-label={`${label} hero banner`}>
      {/* Canvas element — HeroCanvas client components attach to #heroCanvas via useEffect */}
      <canvas id="heroCanvas" aria-hidden="true" />
      {animationSlot ?? <HeroCanvasDefault />}

      {/* HUD corner brackets */}
      <div className="hud-corner hud-tl" aria-hidden="true" />
      <div className="hud-corner hud-bl" aria-hidden="true" />
      <div className="hud-corner hud-tr" aria-hidden="true" />
      <div className="hud-corner hud-br" aria-hidden="true" />

      {/* Animated scanline */}
      <div className="hero-scanline" aria-hidden="true" />

      <div className="hero-inner">
        {/* LEFT — metrics & KPIs */}
        <div className="hero-left">
          <p className="hero-label">{label}</p>
          <p className="hero-greeting">{greeting}</p>
          <div className="hero-metric" aria-label={`Primary metric: ${primaryMetric}`}>
            {primaryMetric}
          </div>
          {metricSubtitle && <p className="hero-metric-sub">{metricSubtitle}</p>}

          {kpiCards.length > 0 && (
            <div className="hero-kpi-row">
              {kpiCards.map(k => (
                <div key={k.label} className="hero-kpi-card">
                  <div className="hero-kpi-label">{k.label}</div>
                  <div className="hero-kpi-val">{k.value}</div>
                  {k.delta && (
                    <div
                      className="hero-kpi-delta"
                      style={{ color: k.deltaPositive === false ? 'var(--red)' : 'var(--green)' }}
                    >
                      {k.delta}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER — canvas placeholder (canvas is absolutely positioned behind) */}
        <div className="hero-center" style={{ position: 'relative', minWidth: 200 }} aria-hidden="true" />

        {/* RIGHT — player card */}
        {playerCard ? (
          <div className="hero-right">
            <div className="player-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="player-avatar">{initials}</div>
                <div>
                  <div className="player-name">{playerCard.name}</div>
                  <div className="player-role">{playerCard.role}</div>
                  <div className="player-level">LVL {playerCard.level}</div>
                </div>
              </div>

              {/* XP bar */}
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 10,
                    fontFamily: 'var(--mo)',
                    color: 'var(--dim)',
                    marginBottom: 4,
                  }}
                >
                  <span>{playerCard.xpCurrent.toLocaleString()} XP</span>
                  <span>{playerCard.xpNext.toLocaleString()} XP</span>
                </div>
                <div className="player-xp-bar">
                  <div className="player-xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
              </div>

              {/* Stats grid */}
              {playerCard.stats && playerCard.stats.length > 0 && (
                <div className="player-stats">
                  {playerCard.stats.slice(0, 4).map(s => (
                    <div key={s.key} className="player-stat">
                      <div className="player-stat-val">{s.value}</div>
                      <div className="player-stat-key">{s.key}</div>
                    </div>
                  ))}
                </div>
              )}

              {playerCard.since && (
                <div style={{ fontSize: 10, color: 'var(--dim)', fontFamily: 'var(--mo)' }}>
                  Since {playerCard.since}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hero-right" />
        )}
      </div>
    </div>
  )
}
