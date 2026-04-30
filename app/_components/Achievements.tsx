'use client'
/**
 * Achievements — spec-locked achievement rings section (DASHBOARD-TEMPLATE-SPEC §2).
 * 88px rings, gradient #3b82f6→#ec4899→#8b5cf6 via SVG `achieveGrad`.
 * Tooltip on hover, earned/locked states, XP chip, "view all" button.
 * Client component (hover state requires JS).
 */

const CIRCUMFERENCE = 2 * Math.PI * 40 // r=40

interface AchievementItem {
  name: string
  description: string
  xp: number
  /** 0–100 */
  progress: number
  icon: string
  earned: boolean
}

interface AchievementsProps {
  items: AchievementItem[]
  xpEarned: number
  onViewAll?: () => void
}

export default function Achievements({ items, xpEarned, onViewAll }: AchievementsProps) {
  const earnedCount = items.filter(i => i.earned).length

  return (
    <section aria-label="Achievements" style={{ marginBottom: 28 }}>
      {/* Required hidden SVG gradient — must appear exactly once per page that uses Achievements */}
      <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
        <defs>
          <linearGradient id="achieveGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#3b82f6" />
            <stop offset="50%"  stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      <div className="section-header">
        <div className="section-header-left">
          <h2 className="section-title">Achievements</h2>
          <span className="achieve-count">{earnedCount} / {items.length}</span>
          <span className="xp-earned">+{xpEarned.toLocaleString()} XP</span>
        </div>
        <button className="view-all-btn" onClick={onViewAll} aria-label="View all achievements">
          View All
        </button>
      </div>

      <div className="achieve-grid" role="list">
        {items.map(item => {
          const offset = CIRCUMFERENCE * (1 - item.progress / 100)
          return (
            <div
              key={item.name}
              className={`achieve-card${item.earned ? ' earned' : ' locked'}`}
              role="listitem"
              aria-label={`${item.name} — ${item.earned ? 'earned' : 'locked'}`}
            >
              <div className="achieve-ring-wrap">
                <svg
                  className="achieve-ring-svg"
                  viewBox="0 0 88 88"
                  aria-hidden="true"
                >
                  <circle className="achieve-ring-bg" cx="44" cy="44" r="40" />
                  <circle
                    className="achieve-ring-fill"
                    cx="44"
                    cy="44"
                    r="40"
                    strokeDasharray={CIRCUMFERENCE}
                    strokeDashoffset={offset}
                  />
                </svg>

                <span className="achieve-icon-center" aria-hidden="true">
                  {item.icon}
                </span>

                {item.earned && (
                  <div className="achieve-check" aria-hidden="true">✓</div>
                )}
              </div>

              <p className="achieve-name">{item.name}</p>
              <p className="achieve-xp">+{item.xp} XP</p>

              {/* Tooltip */}
              <div className="achieve-tooltip" role="tooltip">
                <p className="achieve-tooltip-name">{item.name}</p>
                <p className="achieve-tooltip-desc">{item.description}</p>
                <p className="achieve-tooltip-xp">+{item.xp} XP {item.earned ? 'earned' : 'available'}</p>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
