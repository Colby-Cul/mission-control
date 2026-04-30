/**
 * GET /api/qb/connect?entity=<slug>&returnTo=/companies/<slug>
 *
 * Kicks off the QuickBooks Online OAuth flow, scoped to a specific entity.
 *
 * Mission Control is now multi-tenant for QB — the user can connect multiple
 * QuickBooks companies, one per operating entity. The entity slug is baked
 * into the OAuth `state` JSON so the callback can persist the tokens in the
 * correct `quickbooks_connections` row (keyed by entity slug).
 *
 * Required env (else falls back to returnTo with ?error=oauth-not-configured):
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET  (unused here but required by callback)
 *   QUICKBOOKS_REDIRECT_URI
 *
 * Required query:
 *   entity=<slug>   — must match a row in `entity_ownership.slug`
 *
 * Missing-entity redirects to `/integrations?highlight=quickbooks&error=entity-required`
 */
import { NextRequest, NextResponse } from 'next/server'
import { buildQbAuthUrl, isQbOAuthConfigured, logQbEvent } from '../../../lib/quickbooks'
import { supabase } from '../../../lib/supabase'

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

// 5-min cache of known entity slugs (entity_ownership.slug) to avoid hitting
// Supabase on every /connect click.
let KNOWN_SLUGS_CACHE: { slugs: Set<string>; t: number } | null = null
const SLUG_CACHE_TTL_MS = 5 * 60 * 1000

async function loadKnownSlugs(): Promise<Set<string>> {
  if (KNOWN_SLUGS_CACHE && Date.now() - KNOWN_SLUGS_CACHE.t < SLUG_CACHE_TTL_MS) {
    return KNOWN_SLUGS_CACHE.slugs
  }
  try {
    const { data, error } = await supabase
      .from('entity_ownership')
      .select('slug')
      .not('slug', 'is', null)
    if (error) {
      console.error('[qb connect] loadKnownSlugs error', error)
      return new Set()
    }
    const slugs = new Set<string>(
      (data as any[])
        .map(r => String(r?.slug ?? '').trim())
        .filter(s => s.length > 0),
    )
    KNOWN_SLUGS_CACHE = { slugs, t: Date.now() }
    return slugs
  } catch (e) {
    console.error('[qb connect] loadKnownSlugs threw', e)
    return new Set()
  }
}

export async function GET(req: NextRequest) {
  const origin = appOrigin(req)
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'))
  const entityRaw = req.nextUrl.searchParams.get('entity')
  const entity = entityRaw ? entityRaw.trim() : ''

  if (!isQbOAuthConfigured()) {
    await logQbEvent({
      kind: 'connect-not-configured',
      status: 'error',
      detail: { returnTo, entity },
    })
    const dest = new URL(returnTo, origin)
    dest.searchParams.set('error', 'oauth-not-configured')
    dest.searchParams.set('highlight', 'quickbooks')
    return NextResponse.redirect(dest.toString(), 307)
  }

  if (!entity) {
    await logQbEvent({
      kind: 'connect-entity-required',
      status: 'error',
      detail: { returnTo },
    })
    const dest = new URL('/integrations', origin)
    dest.searchParams.set('highlight', 'quickbooks')
    dest.searchParams.set('error', 'entity-required')
    return NextResponse.redirect(dest.toString(), 307)
  }

  // Validate that the entity slug exists in entity_ownership. We load the
  // full slug list once per 5 min — small table (< 20 rows).
  const knownSlugs = await loadKnownSlugs()
  if (knownSlugs.size > 0 && !knownSlugs.has(entity)) {
    await logQbEvent({
      kind: 'connect-unknown-entity',
      status: 'error',
      detail: { entity },
    })
    const dest = new URL('/integrations', origin)
    dest.searchParams.set('highlight', 'quickbooks')
    dest.searchParams.set('error', 'unknown-entity')
    return NextResponse.redirect(dest.toString(), 307)
  }

  // Encode entity + returnTo inside state so the callback can resume.
  const nonce = crypto.randomUUID()
  const statePayload = JSON.stringify({ n: nonce, r: returnTo, e: entity })
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
