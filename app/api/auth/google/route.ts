/**
 * GET /api/auth/google
 *
 * Kicks off the Google OAuth consent flow. Generates a state token (CSRF),
 * stores it in a short-lived cookie, and redirects the browser to Google.
 *
 * Required env:
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET  (not used here, but required for callback)
 *   GOOGLE_OAUTH_REDIRECT_URI
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from '../../../lib/google'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!isGoogleOAuthConfigured()) {
    // Prefer configured redirect origin; fall back to the incoming request origin
    // so on Vercel we bounce back to the same deployment (never localhost:3001).
    let origin = new URL(req.url).origin
    if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
      try { origin = new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI).origin } catch {}
    }
    return NextResponse.redirect(`${origin}/integrations?highlight=google&error=oauth-not-configured`)
  }

  const state = crypto.randomUUID()
  const url = buildGoogleAuthUrl(state)
  const res = NextResponse.redirect(url)
  // 10-min CSRF cookie
  res.cookies.set('g_oauth_state', state, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
