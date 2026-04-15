/**
 * POST /api/qb/refresh?entity=<slug>  (internal helper)
 *
 * Reads the stored refresh_token for the given entity and swaps it for a
 * new access_token. Not user-facing — use this from internal jobs / cron /
 * warmup routes when you want to eagerly refresh before expiry.
 *
 * Response:
 *   200 { ok: true, entity, realmId, expiresAt } on success
 *   400 { ok: false, error: 'entity-required' } when no entity slug
 *   404 { ok: false, error: 'not-connected' } when there's no row
 *   500 { ok: false, error: '<msg>' } on refresh failure
 *
 * Note: the public `qbFetch` helper already auto-refreshes lazily — this
 * route exists for diagnostic and pre-warm use cases.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getQbClient,
  getQbConnection,
  logQbEvent,
} from '../../../lib/quickbooks'

export const dynamic = 'force-dynamic'

function entityFromSearch(req: NextRequest): string | null {
  const q = req.nextUrl.searchParams.get('entity')
  if (q && q.trim()) return q.trim()
  return null
}

export async function POST(req: NextRequest) {
  const entity = entityFromSearch(req)
  if (!entity) {
    return NextResponse.json({ ok: false, error: 'entity-required' }, { status: 400 })
  }

  const existing = await getQbConnection(entity)
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'not-connected' }, { status: 404 })
  }

  try {
    // getQbClient handles the refresh cycle and upserts the new token.
    const client = await getQbClient(entity)
    if (!client) {
      return NextResponse.json(
        { ok: false, error: 'refresh-failed-or-revoked' },
        { status: 500 },
      )
    }
    const after = await getQbConnection(entity)
    await logQbEvent({ kind: 'manual-refresh', status: 'ok', detail: { entity } })
    return NextResponse.json({
      ok: true,
      entity,
      realmId: client.realmId,
      expiresAt: after?.expires_at ?? null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logQbEvent({ kind: 'manual-refresh', status: 'error', detail: msg })
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}

/** GET mirrors POST for simpler debugging via the browser. */
export async function GET(req: NextRequest) {
  return POST(req)
}
