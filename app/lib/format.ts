/**
 * Consistent number/date/duration formatters.
 *
 * Dyslexic/ADHD-friendly rule: render money in short form ($1.29M) by
 * default — the eye parses the shape of 1.29M ~40% faster than the literal
 * $1,289,223 string. Callers that need exact values use `fmtMoneyExact` or
 * pair a short display with a `title={fmtMoneyExact(n)}` tooltip.
 */

export function fmtMoney(n: number | null | undefined, opts: { digits?: number } = {}): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  const digits = opts.digits ?? 2
  const sign = v < 0 ? '-' : ''
  const abs = Math.abs(v)
  if (abs === 0) return '$0'
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(digits).replace(/\.?0+$/, '')}B`
  if (abs >= 1_000_000)     return `${sign}$${(abs / 1_000_000).toFixed(digits).replace(/\.?0+$/, '')}M`
  if (abs >= 1_000)         return `${sign}$${(abs / 1_000).toFixed(digits).replace(/\.?0+$/, '')}k`
  if (abs >= 1)             return `${sign}$${abs.toFixed(2)}`
  if (abs >= 0.01)          return `${sign}$${abs.toFixed(3)}`
  return `${sign}< $0.01`
}

export function fmtMoneyExact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return '$' + Number(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function fmtNumber(n: number | null | undefined, opts: { digits?: number } = {}): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  const v = Number(n)
  const digits = opts.digits ?? 1
  const abs = Math.abs(v)
  if (abs >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(digits)}B`
  if (abs >= 1_000_000)     return `${(v / 1_000_000).toFixed(digits)}M`
  if (abs >= 1_000)         return `${(v / 1_000).toFixed(digits)}k`
  return String(Math.round(v))
}

export function fmtPct(n: number | null | undefined, opts: { digits?: number } = {}): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `${Number(n).toFixed(opts.digits ?? 1)}%`
}

export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return '—'
  const d = s instanceof Date ? s : new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateShort(s: string | Date | null | undefined): string {
  if (!s) return '—'
  const d = s instanceof Date ? s : new Date(s)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtRelative(s: string | Date | null | undefined): string {
  if (!s) return '—'
  const t = (s instanceof Date ? s : new Date(s)).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = Date.now() - t
  if (diff < 0) {
    const future = -diff
    if (future < 60_000)      return `in ${Math.floor(future / 1000)}s`
    if (future < 3_600_000)   return `in ${Math.floor(future / 60_000)}m`
    if (future < 86_400_000)  return `in ${Math.floor(future / 3_600_000)}h`
    return `in ${Math.floor(future / 86_400_000)}d`
  }
  if (diff < 60_000)      return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3_600_000)   return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)  return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return fmtDateShort(s)
}

export function fmtDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(Number(seconds))) return '—'
  const s = Number(seconds)
  if (s < 60)    return `${s.toFixed(1)}s`
  if (s < 3600)  return `${(s / 60).toFixed(1)}m`
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`
  return `${(s / 86400).toFixed(1)}d`
}
