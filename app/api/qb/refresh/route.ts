/**
 * POST /api/qb/refresh  (internal helper)
 *
 * Reads the stored refresh_token for the current company and swaps it for a
 * new access_token. Not user-facing — use this from internal jobs / cron /
 * warmup routes when you want to eagerly refresh before expiry.
 *
 * Response:
 *   200 { ok: true, realmId, expiresAt } on success
 *   404 { ok: false, error: 'not-connected' } when there's no row
 *   500 { ok: false, error: '<msg>' } on refresh failure
 *
 * Note: the public `qbFetch` helper already auto-refreshes lazily — this
 * route exists for diagnostic and pre-warm use cases.
 */
import { NextResponse } from 'next/server'
import {
  currentCompanyKey,
  getQbClient,
  getQbConnection,
  logQbEvent,
} from '../../../lib/quickbooks'

export const dynamic = 'force-dynamic'

export async function POST() {
  const companyKey = currentCompanyKey()
  const existing = await getQbConnection(companyKey)
  if (!existing) {
    return NextResponse.json({ ok: false, error: 'not-connected' }, { status: 404 })
  }

  try {
    // getQbClient handles the refresh cycle and upserts the new token.
    const client = await getQbClient(companyKey)
    if (!client) {
      return NextResponse.json(
        { ok: false, error: 'refresh-failed-or-revoked' },
        { status: 500 },
      )
    }
    const after = await getQbConnection(companyKey)
    await logQbEvent({ kind: 'manual-refresh', status: 'ok' })
    return NextResponse.json({
      ok: true,
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
export async function GET() {
  return POST()
}
