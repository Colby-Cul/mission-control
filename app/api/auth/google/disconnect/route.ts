/**
 * POST /api/auth/google/disconnect
 *
 * Deletes the current user's Google token row. Does NOT revoke the grant on Google's side
 * — user can do that at myaccount.google.com. On success, redirects back to /integrations.
 */
import { NextRequest, NextResponse } from 'next/server'
import { currentUserId, supabaseAdmin } from '../../../../lib/google'

export const dynamic = 'force-dynamic'

function appOrigin(req: NextRequest): string {
  if (process.env.GOOGLE_OAUTH_REDIRECT_URI) {
    try {
      return new URL(process.env.GOOGLE_OAUTH_REDIRECT_URI).origin
    } catch {}
  }
  return new URL(req.url).origin
}

export async function POST(req: NextRequest) {
  const origin = appOrigin(req)
  try {
    const sb = supabaseAdmin()
    await sb
      .from('user_tokens')
      .delete()
      .eq('user_id', currentUserId())
      .eq('provider', 'google')
  } catch (e) {
    console.error('[google disconnect]', e)
  }
  return NextResponse.redirect(`${origin}/integrations?disconnected=google`, 303)
}
