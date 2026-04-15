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
import { NextResponse } from 'next/server'
import { buildGoogleAuthUrl, isGoogleOAuthConfigured } from '../../../lib/google'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      new URL(
        '/integrations?highlight=google&error=oauth-not-configured',
        process.env.GOOGLE_OAUTH_REDIRECT_URI
          ? new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI).origin
          : 'http://localhost:3001',
      ),
    )
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
