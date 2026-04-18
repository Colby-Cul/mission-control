/**
 * formatDbError — turn ANY error shape into a human-readable string.
 *
 * Why: Supabase / PostgREST errors aren't native Error instances, so
 * String(e) returns the useless "[object Object]". We had that bug
 * visible on the Forge Convert-to-Project button. This helper handles:
 *
 *   - native Error (e.message)
 *   - Supabase PostgrestError ({ message, code, details, hint })
 *   - Fetch Response-ish ({ statusText, status })
 *   - plain objects (JSON.stringify)
 *   - strings, null, undefined
 *
 * Returns a short, surface-safe string with the useful bit first.
 */
export function formatDbError(e: unknown): string {
  if (e == null) return 'Unknown error'
  if (typeof e === 'string') return e
  if (e instanceof Error && e.message) return e.message

  if (typeof e === 'object') {
    const obj = e as Record<string, unknown>

    // Supabase PostgrestError
    if (typeof obj.message === 'string' && obj.message.length > 0) {
      const parts: string[] = [obj.message as string]
      if (typeof obj.code === 'string' && obj.code) parts.push(`[${obj.code}]`)
      if (typeof obj.hint === 'string' && obj.hint) parts.push(`— ${obj.hint}`)
      if (typeof obj.details === 'string' && obj.details) parts.push(`(${obj.details})`)
      return parts.join(' ')
    }

    // Fetch Response-ish
    if (typeof obj.status === 'number' && (typeof obj.statusText === 'string' || typeof obj.url === 'string')) {
      const status = obj.status
      const text = typeof obj.statusText === 'string' ? obj.statusText : ''
      const url = typeof obj.url === 'string' ? ` at ${obj.url}` : ''
      return `HTTP ${status}${text ? ' ' + text : ''}${url}`.trim()
    }

    // Error wrapped in { error } envelope
    if (obj.error && typeof obj.error === 'object') return formatDbError(obj.error)
    if (typeof obj.error === 'string') return obj.error

    try {
      const s = JSON.stringify(obj)
      // Avoid dumping huge blobs; first 240 chars is enough to triage
      return s.length > 240 ? s.slice(0, 240) + '…' : s
    } catch {
      /* fall through */
    }
  }

  return String(e)
}
