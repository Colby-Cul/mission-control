/**
 * Google OAuth + Calendar helpers.
 *
 * OAuth lives entirely in API routes — this file is imported from server components
 * and /api handlers only. Never include in a client bundle. All secrets come from
 * environment variables; we intentionally do NOT read ~/.openclaw/credentials
 * because Vercel serverless has no access to the local user's home dir.
 *
 * Env vars (set in Vercel):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GOOGLE_OAUTH_REDIRECT_URI  e.g. https://mc-merge-v7-latest.vercel.app/api/auth/google/callback
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY  — used by token-write paths (OAuth callback / refresh)
 *                                to bypass RLS. Falls back to the anon client with
 *                                NEXT_PUBLIC_SEED_USER_ID if not present.
 */
import { createClient } from '@supabase/supabase-js'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
]

export function isGoogleOAuthConfigured(): boolean {
  return !!(
    process.env.GOOGLE_OAUTH_CLIENT_ID &&
    process.env.GOOGLE_OAUTH_CLIENT_SECRET &&
    process.env.GOOGLE_OAUTH_REDIRECT_URI
  )
}

/** Supabase client with service-role if available (needed to write tokens under RLS). */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Returns the current user id. v7 is still seed-user based until real auth lands. */
export function currentUserId(): string {
  return (
    process.env.NEXT_PUBLIC_SEED_USER_ID ||
    '00000000-0000-0000-0000-000000000001'
  )
}

export interface GoogleTokenRow {
  user_id: string
  provider: string
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  scope: string[] | null
  updated_at: string | null
}

/** Build the Google OAuth consent URL. */
export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

/** Exchange an authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
}> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI!,
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google token exchange failed (${res.status}): ${txt}`)
  }
  return res.json()
}

/** Use the refresh_token to mint a fresh access_token. */
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
  scope?: string
  token_type: string
}> {
  const body = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google token refresh failed (${res.status}): ${txt}`)
  }
  return res.json()
}

/** Persist a token row for a user+provider (upsert). */
export async function upsertGoogleToken(input: {
  userId: string
  accessToken: string
  refreshToken?: string | null
  expiresAt: string
  scope: string[]
}) {
  const sb = supabaseAdmin()
  const row = {
    user_id: input.userId,
    provider: 'google',
    access_token: input.accessToken,
    refresh_token: input.refreshToken ?? null,
    expires_at: input.expiresAt,
    scope: input.scope,
    updated_at: new Date().toISOString(),
  }
  const { error } = await sb
    .from('user_tokens')
    .upsert(row, { onConflict: 'user_id,provider' })
  if (error) throw error
}

/** Get the current user's google token row (or null). */
export async function getGoogleTokenRow(userId: string): Promise<GoogleTokenRow | null> {
  const sb = supabaseAdmin()
  const { data, error } = await sb
    .from('user_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle()
  if (error) return null
  return (data as GoogleTokenRow | null) ?? null
}

/** Refresh the token if it's expired (or within 60s of expiring). Returns a live access_token. */
export async function refreshAccessTokenIfExpired(userId: string): Promise<string | null> {
  const row = await getGoogleTokenRow(userId)
  if (!row) return null
  const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : 0
  const stillFresh = expiresAtMs - Date.now() > 60_000
  if (stillFresh) return row.access_token
  if (!row.refresh_token) return row.access_token // no refresh token, return what we have

  try {
    const fresh = await refreshAccessToken(row.refresh_token)
    const newExpiresAt = new Date(Date.now() + fresh.expires_in * 1000).toISOString()
    const scope = fresh.scope ? fresh.scope.split(' ') : row.scope ?? GOOGLE_SCOPES
    await upsertGoogleToken({
      userId,
      accessToken: fresh.access_token,
      refreshToken: row.refresh_token, // Google doesn't return refresh on refresh
      expiresAt: newExpiresAt,
      scope,
    })
    return fresh.access_token
  } catch (e) {
    console.error('[google] refresh failed', e)
    return row.access_token
  }
}

export interface GoogleCalendarEvent {
  id: string
  summary?: string
  location?: string
  description?: string
  start?: { dateTime?: string; date?: string; timeZone?: string }
  end?: { dateTime?: string; date?: string; timeZone?: string }
  hangoutLink?: string
  conferenceData?: { entryPoints?: Array<{ uri?: string; entryPointType?: string }> }
  attendees?: Array<{ email?: string; displayName?: string; responseStatus?: string }>
  organizer?: { email?: string; displayName?: string }
  colorId?: string
  htmlLink?: string
}

/** GET primary calendar events in a window. */
export async function getCalendarEvents(
  userId: string,
  opts: { timeMin: Date; timeMax: Date; maxResults?: number },
): Promise<GoogleCalendarEvent[]> {
  const accessToken = await refreshAccessTokenIfExpired(userId)
  if (!accessToken) return []

  const qs = new URLSearchParams({
    timeMin: opts.timeMin.toISOString(),
    timeMax: opts.timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(opts.maxResults ?? 20),
  })
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${qs.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' },
  )
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[google] calendar list failed', res.status, txt)
    return []
  }
  const data = await res.json()
  return (data.items ?? []) as GoogleCalendarEvent[]
}
