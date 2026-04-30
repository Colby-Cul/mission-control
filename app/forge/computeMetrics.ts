// ─── Forge Metric Computations ────────────────────────────────────────────────
// Ported from master src/pages/TheForge/utils/computeMetrics.js

const CATEGORY_REVENUE: Record<string, { min: number; max: number }> = {
  str:      { min: 2000, max: 8000  },
  saas:     { min: 1000, max: 15000 },
  internal: { min: 500,  max: 3000  },
  service:  { min: 1000, max: 5000  },
  content:  { min: 200,  max: 2000  },
}

function inferCategory(idea: Record<string, unknown>): string {
  const name = String(idea.name ?? idea.title ?? '').toLowerCase()
  const all = name
  if (all.includes('str') || all.includes('rental') || all.includes('guest')) return 'str'
  if (all.includes('saas') || all.includes('widget') || all.includes('api')) return 'saas'
  if (all.includes('internal') || all.includes('ops') || all.includes('mission')) return 'internal'
  if (all.includes('service') || all.includes('concierge')) return 'service'
  if (all.includes('content') || all.includes('blog') || all.includes('seo')) return 'content'
  return 'saas'
}

function hashCode(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0
  return Math.abs(h)
}

export function computeConfidence(idea: Record<string, unknown>): number {
  if (typeof idea.confidence_score === 'number') return idea.confidence_score
  let score = 40
  const id = String(idea.id ?? 'x')
  const jitter = (hashCode(id) % 20) - 10
  return Math.max(15, Math.min(98, Math.round(score + jitter)))
}

export function computeRevenueEstimate(idea: Record<string, unknown>): { min: number; max: number; period: string } {
  const cat = inferCategory(idea)
  const range = CATEGORY_REVENUE[cat] ?? CATEGORY_REVENUE.saas
  const h = hashCode(String(idea.id ?? 'x'))
  const spread = range.max - range.min
  const min = range.min + Math.round((h % 40) / 40 * spread * 0.3)
  const max = range.min + Math.round(spread * 0.5) + Math.round((h % 60) / 60 * spread * 0.5)
  return { min, max, period: 'month' }
}

export function computeBuildCost(idea: Record<string, unknown>): number {
  if (typeof idea.build_cost_estimate === 'number') return idea.build_cost_estimate
  const h = hashCode(String(idea.id ?? 'x'))
  return 150 + (h % 1200)
}

export function computeTimeToMVP(idea: Record<string, unknown>): string {
  if (idea.time_to_mvp) return String(idea.time_to_mvp)
  const h = hashCode(String(idea.id ?? 'x'))
  const weeks = 1 + (h % 6)
  return `${weeks} week${weeks > 1 ? 's' : ''}`
}

export function isQuickWin(idea: Record<string, unknown>): boolean {
  const cost = computeBuildCost(idea)
  const conf = computeConfidence(idea)
  return cost < 500 && conf >= 70
}

export function fmtRevenue(r: { min: number; max: number; period: string }): string {
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
  return `${fmt(r.min)}–${fmt(r.max)}/${r.period}`
}

export function fmtBuildCost(n: number): string {
  return n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n}`
}

export function computeROI(idea: Record<string, unknown>): number | null {
  const rev = computeRevenueEstimate(idea)
  const cost = computeBuildCost(idea)
  if (!cost) return null
  return Math.round(((rev.min * 12) / cost) * 10) / 10
}
