import { NextRequest, NextResponse } from 'next/server'
import { getPlaidClient, plaidConfigured, productsFor, PLAID_COUNTRIES, getWebhookUrl } from '../../../../lib/plaid'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/accounts/link/create-token
 *
 * Body: { product: 'bank' | 'brokerage', scope: 'personal' | 'entity', entity_id?: string }
 *
 * Returns: { link_token, expiration } — client passes link_token to react-plaid-link's
 * usePlaidLink hook. Token is single-use and expires in ~30 min.
 *
 * The scope/entity_id are NOT sent to Plaid; we round-trip them via the
 * browser and receive them back on the /exchange call so they land on the
 * resulting plaid_items row.
 */
export async function POST(req: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Plaid env vars not set. Need PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV.' },
      { status: 501 },
    )
  }

  let body: { product?: string; scope?: string; entity_id?: string; client_user_id?: string }
  try { body = await req.json() } catch { body = {} }

  const product = body.product === 'brokerage' ? 'brokerage' : 'bank'
  const scope = body.scope === 'entity' ? 'entity' : 'personal'
  const entityId = scope === 'entity' ? String(body.entity_id || '').trim() : ''
  if (scope === 'entity' && !entityId) {
    return NextResponse.json({ ok: false, error: 'entity_id required when scope=entity' }, { status: 400 })
  }

  const clientUserId = String(body.client_user_id || 'colby').slice(0, 64)

  try {
    const client = getPlaidClient()
    const products = productsFor(product)
    const resp = await client.linkTokenCreate({
      user: { client_user_id: clientUserId },
      client_name: 'Mission Control',
      products,
      country_codes: PLAID_COUNTRIES,
      language: 'en',
      // Webhook: Plaid POSTs here when transactions change, item errors, etc.
      // Without this set, v6's items went 8+ days stale because Plaid had
      // nowhere to push updates. See /api/plaid/webhook route.
      webhook: getWebhookUrl(),
    })
    return NextResponse.json({
      ok: true,
      link_token: resp.data.link_token,
      expiration: resp.data.expiration,
      // Echo so the client can pass them back to /exchange without state storage
      product,
      scope,
      entity_id: entityId || null,
    })
  } catch (e: unknown) {
    const err = e as { response?: { data?: unknown }; message?: string }
    const msg = err.response?.data
      ? `Plaid: ${JSON.stringify(err.response.data).slice(0, 300)}`
      : err.message ?? String(e)
    console.error('[plaid create-token]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
