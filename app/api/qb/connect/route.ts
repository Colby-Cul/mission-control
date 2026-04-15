/**
 * GET /api/qb/connect?returnTo=/integrations
 *
 * Kicks off the QuickBooks Online OAuth flow. Generates a state token
 * (random + base64-encoded returnTo), stores it in a short-lived signed
 * httpOnly cookie, and 307-redirects the browser to the Intuit authorize
 * endpoint.
 *
 * Required env (else falls back to returnTo with ?error=oauth-not-configured):
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET  (unused here but required by callback)
 *   QUICKBOOKS_REDIRECT_URI
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildQbAuthUrl, isQbOAuthConfigured, logQbEvent } from '../../../lib/quickbooks'

export const dynamic = 'force-dynamic'

function appOrigin(req: NextRequest): string {
  if (process.env.QUICKBOOKS_REDIRECT_URI) {
    try {
      return new URL(process.env.QUICKBOOKS_REDIRECT_URI).origin
    } catch {}
  }
  return new URL(req.url).origin
}

function safeReturnTo(raw: string | null): string {
  const fallback = '/integrations'
  if (!raw) return fallback
  // Only accept same-origin relative paths — prevents open-redirect.
  if (!raw.startsWith('/')) return fallback
  if (raw.startsWith('//')) return fallback
  return raw
}

export async function GET(req: NextRequest) {
  const origin = appOrigin(req)
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'))

  if (!isQbOAuthConfigured()) {
    await logQbEvent({
      kind: 'connect-not-configured',
      status: 'error',
      detail: { returnTo },
    })
    const dest = new URL(returnTo, origin)
    dest.searchParams.set('error', 'oauth-not-configured')
    dest.searchParams.set('highlight', 'quickbooks')
    return NextResponse.redirect(dest.toString(), 307)
  }

  // Encode returnTo inside state so the callback can bounce the user back.
  const nonce = crypto.randomUUID()
  const statePayload = JSON.stringify({ n: nonce, r: returnTo })
  const state = Buffer.from(statePayload, 'utf8').toString('base64url')

  const authorizeUrl = buildQbAuthUrl(state)
  const res = NextResponse.redirect(authorizeUrl, 307)
  // 10-min httpOnly cookie holds just the nonce — callback compares against
  // the decoded state to defeat CSRF while avoiding cookie size bloat.
  res.cookies.set('qb_oauth_state', nonce, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
