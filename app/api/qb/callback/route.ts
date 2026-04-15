/**
 * GET /api/qb/callback
 *
 * Intuit redirects here after the user grants consent. We:
 *   1. Validate state against the qb_oauth_state cookie (CSRF).
 *   2. Decode the entity slug + returnTo from state.
 *   3. Exchange `code` for access + refresh tokens at the bearer endpoint.
 *   4. Upsert the row into `quickbooks_connections` keyed by entity slug.
 *   5. Bounce to `/companies/<slug>?connected=quickbooks` by default, or to
 *      a caller-provided returnTo when present.
 *
 * Any failure lands on `<returnTo>?highlight=quickbooks&error=<code>`.
 *
 * SUPABASE_SERVICE_ROLE_KEY must be set — `upsertQbConnection` throws with a
 * clear message otherwise, which surfaces to the user as `?error=<msg>`.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  exchangeCodeForTokens,
  isQbOAuthConfigured,
  logQbEvent,
  upsertQbConnection,
} from '../../../lib/quickbooks'

export const dynamic = 'force-dynamic'

function appOrigin(req: NextRequest): string {
  if (process.env.QUICKBOOKS_REDIRECT_URI) {
    try {
      return new URL(process.env.QUICKBOOKS_REDIRECT_URI).origin
    } catch {}
  }
  return new URL(req.url).origin
}

function decodeState(
  state: string | null,
): { nonce: string; returnTo: string; entity: string | null } | null {
  if (!state) return null
  try {
    const raw = Buffer.from(state, 'base64url').toString('utf8')
    const parsed = JSON.parse(raw)
    if (typeof parsed?.n !== 'string' || typeof parsed?.r !== 'string') return null
    return {
      nonce: parsed.n,
      returnTo: parsed.r,
      entity: typeof parsed.e === 'string' && parsed.e.length > 0 ? parsed.e : null,
    }
  } catch {
    return null
  }
}

function bounce(origin: string, returnTo: string, params: Record<string, string>): NextResponse {
  const safe = returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/integrations'
  const dest = new URL(safe, origin)
  for (const [k, v] of Object.entries(params)) dest.searchParams.set(k, v)
  return NextResponse.redirect(dest.toString(), 303)
}

export async function GET(req: NextRequest) {
  const origin = appOrigin(req)
  const search = req.nextUrl.searchParams

  if (!isQbOAuthConfigured()) {
    await logQbEvent({ kind: 'callback-not-configured', status: 'error' })
    return bounce(origin, '/integrations', {
      highlight: 'quickbooks',
      error: 'oauth-not-configured',
    })
  }

  const code = search.get('code')
  const state = search.get('state')
  const realmId = search.get('realmId')
  const oauthErr = search.get('error')

  const decoded = decodeState(state)
  const returnTo = decoded?.returnTo ?? '/integrations'
  const entitySlug = decoded?.entity ?? null

  if (oauthErr) {
    await logQbEvent({ kind: 'callback-provider-error', status: 'error', detail: { oauthErr, entitySlug } })
    return bounce(origin, returnTo, { highlight: 'quickbooks', error: oauthErr })
  }
  if (!code) {
    return bounce(origin, returnTo, { highlight: 'quickbooks', error: 'no-code' })
  }
  if (!realmId) {
    return bounce(origin, returnTo, { highlight: 'quickbooks', error: 'no-realm' })
  }
  if (!decoded) {
    return bounce(origin, returnTo, { highlight: 'quickbooks', error: 'state-decode' })
  }
  if (!entitySlug) {
    // Legacy state without entity — happens only for pre-multitenant OAuth links.
    return bounce(origin, returnTo, {
      highlight: 'quickbooks',
      error: 'entity-missing-in-state',
    })
  }

  const cookieNonce = req.cookies.get('qb_oauth_state')?.value
  if (!cookieNonce || cookieNonce !== decoded.nonce) {
    await logQbEvent({ kind: 'callback-state-mismatch', status: 'error' })
    return bounce(origin, returnTo, { highlight: 'quickbooks', error: 'state-mismatch' })
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const now = Date.now()
    const expiresAt = new Date(now + tokens.expires_in * 1000).toISOString()
    const refreshExp = tokens.x_refresh_token_expires_in
      ? new Date(now + tokens.x_refresh_token_expires_in * 1000).toISOString()
      : null

    // NOTE: upsertQbConnection throws with a clear message if
    // SUPABASE_SERVICE_ROLE_KEY is missing — we catch below and surface it.
    await upsertQbConnection({
      companyKey: entitySlug,
      realmId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      refreshTokenExpiresAt: refreshExp,
      scope: tokens.scope ?? null,
      tokenType: tokens.token_type ?? 'bearer',
    })
    await logQbEvent({
      kind: 'connect-success',
      status: 'ok',
      detail: { realmId, entitySlug },
    })

    // Default landing page: the entity's own dashboard. Callers that pass a
    // returnTo (e.g. /integrations) get honored verbatim.
    const defaultReturn = `/companies/${encodeURIComponent(entitySlug)}`
    const effectiveReturn =
      returnTo && returnTo !== '/integrations' ? returnTo : defaultReturn

    const res = bounce(origin, effectiveReturn, {
      connected: 'quickbooks',
      entity: entitySlug,
    })
    res.cookies.set('qb_oauth_state', '', { path: '/', maxAge: 0 })
    return res
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[qb callback] error', msg)
    await logQbEvent({ kind: 'token-exchange', status: 'error', detail: msg })
    return bounce(origin, returnTo, {
      highlight: 'quickbooks',
      error: encodeURIComponent(msg.slice(0, 120)),
    })
  }
}
