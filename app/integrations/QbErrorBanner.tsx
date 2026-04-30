'use client'

/**
 * QbErrorBanner — reads ?error + ?error_detail + ?highlight=quickbooks from
 * the URL (set by the QB callback on failure) and renders a red banner at the
 * top of the Integrations page with the raw error code and human-readable
 * detail. Especially useful for the SUPABASE_SERVICE_ROLE_KEY missing case.
 */
import { useSearchParams } from 'next/navigation'

const FRIENDLY_LABELS: Record<string, string> = {
  'service-role-missing':
    'SUPABASE_SERVICE_ROLE_KEY is not configured — admin must set this in Vercel env to enable QB token storage.',
  'entity-required':
    'An entity slug is required to connect QuickBooks. Pick an entity from the Manage modal.',
  'unknown-entity':
    'The entity slug in the connect URL does not match any row in entity_ownership.',
  'entity-missing-in-state':
    'OAuth state was missing the entity slug — try clicking Connect again from the Manage modal.',
  'no-code': 'Intuit did not return an authorization code.',
  'no-realm': 'Intuit did not return a realm id — the company selector may have been cancelled.',
  'state-mismatch': 'OAuth state cookie did not match — try again.',
  'state-decode': 'OAuth state could not be decoded — try again.',
  'oauth-not-configured':
    'QuickBooks OAuth env vars missing — admin must set QUICKBOOKS_CLIENT_ID / CLIENT_SECRET / REDIRECT_URI.',
}

export default function QbErrorBanner() {
  const params = useSearchParams()
  const highlight = params.get('highlight')
  const error = params.get('error')
  const errorDetail = params.get('error_detail')
  if (!error || highlight?.toLowerCase() !== 'quickbooks') return null

  const friendly = FRIENDLY_LABELS[error] ?? null
  const display = friendly ?? decodeURIComponent(error)

  return (
    <div
      role="alert"
      style={{
        marginBottom: 16,
        padding: 14,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.35)',
        borderRadius: 12,
        color: 'var(--red)',
        fontSize: 13,
        lineHeight: 1.55,
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: '0.08em',
          fontFamily: 'IBM Plex Mono, monospace',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 6,
        }}
      >
        QuickBooks · Connect failed
      </div>
      <div style={{ fontWeight: 600 }}>{display}</div>
      {errorDetail && (
        <div style={{ marginTop: 6, color: 'rgba(239,68,68,0.8)' }}>
          {decodeURIComponent(errorDetail)}
        </div>
      )}
      <div
        style={{
          marginTop: 10,
          fontSize: 11,
          color: 'rgba(239,68,68,0.75)',
          fontFamily: 'IBM Plex Mono, monospace',
        }}
      >
        error code: {error}
      </div>
    </div>
  )
}
