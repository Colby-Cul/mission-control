/**
 * GET /api/auth/google/callback
 *
 * Google redirects here after the user grants consent. We:
 *   1. Verify the state cookie (CSRF).
 *   2. Exchange the authorization code for access + refresh tokens.
 *   3. Upsert into Supabase `user_tokens` (user_id, provider='google').
 *   4. Redirect back to /integrations?connected=google with a success flag.
 *
 * Any failure lands the user at /integrations?highlight=google&error=<code>.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  GOOGLE_SCOPES,
  currentUserId,
  exchangeCodeForTokens,
  isGoogleOAuthConfigured,
  upsertGoogleToken,
} from '../../../../lib/google'

export const dynamic = 'force-dynamic'

function appOrigin(req: NextRequest): string {
  // Prefer the configured redirect URI's origin so we always return to the same host
  // Google approved. Fall back to the incoming request origin.
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    try {
      return new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI).origin
    } catch {}
  }
  return new URL(req.url).origin
}

export async function GET(req: NextRequest) {
  const origin = appOrigin(req)
  const search = req.nextUrl.searchParams

  if (!isGoogleOAuthConfigured()) {
    return NextResponse.redirect(
      `${origin}/integrations?highlight=google&error=oauth-not-configured`,
    )
  }

  const code = search.get('code')
  const state = search.get('state')
  const oauthErr = search.get('error')

  if (oauthErr) {
    return NextResponse.redirect(
      `${origin}/integrations?highlight=google&error=${encodeURIComponent(oauthErr)}`,
    )
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/integrations?highlight=google&error=no-code`)
  }

  // CSRF: state cookie must match the ?state= param
  const stateCookie = req.cookies.get('g_oauth_state')?.value
  if (!stateCookie || !state || stateCookie !== state) {
    return NextResponse.redirect(
      `${origin}/integrations?highlight=google&error=state-mismatch`,
    )
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    const scope = tokens.scope ? tokens.scope.split(' ') : GOOGLE_SCOPES

    await upsertGoogleToken({
      userId: currentUserId(),
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt,
      scope,
    })

    const res = NextResponse.redirect(`${origin}/integrations?connected=google`)
    // Clear the state cookie
    res.cookies.set('g_oauth_state', '', { path: '/', maxAge: 0 })
    return res
  } catch (e: any) {
    console.error('[google callback] error', e)
    return NextResponse.redirect(
      `${origin}/integrations?highlight=google&error=${encodeURIComponent(
        e?.message?.slice(0, 80) ?? 'exchange-failed',
      )}`,
    )
  }
}
