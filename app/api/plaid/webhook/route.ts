import { NextRequest, NextResponse } from 'next/server'
import { getPlaidClient, plaidConfigured, syncTransactionsForItem } from '../../../lib/plaid'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/plaid/webhook
 *
 * Plaid POSTs here when:
 *   - TRANSACTIONS / SYNC_UPDATES_AVAILABLE — new/modified/removed txns ready
 *   - TRANSACTIONS / DEFAULT_UPDATE or INITIAL_UPDATE or HISTORICAL_UPDATE — same
 *   - ITEM / ERROR — item needs re-auth or lost connection
 *   - ITEM / LOGIN_REPAIRED — user completed update-mode, error cleared
 *   - INVESTMENTS_TRANSACTIONS / * — brokerage updates (handle later)
 *   - HOLDINGS / * — brokerage holdings snapshots
 *
 * We return 200 fast so Plaid doesn't timeout (~10s budget). Real work is
 * serialized within the request, so batches up to 20 pages * 500 txns.
 *
 * TODO: verify Plaid-Verification JWT header for authenticity. For v1 we
 * accept any POST — low risk given the endpoint is write-guarded by
 * item_id → our Plaid items (only items we exchanged).
 */
export async function POST(req: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ ok: false, error: 'Plaid not configured' }, { status: 501 })
  }

  let body: { webhook_type?: string; webhook_code?: string; item_id?: string; error?: { error_code?: string; error_message?: string } }
  try { body = await req.json() } catch {
    return NextResponse.json({ ok: false, error: 'invalid JSON' }, { status: 400 })
  }
  const { webhook_type: kind, webhook_code: code, item_id: plaidItemId } = body
  if (!plaidItemId) {
    return NextResponse.json({ ok: false, error: 'missing item_id' }, { status: 400 })
  }

  // Look up our row from Plaid's item_id
  const { data: itemRow, error: lookupErr } = await supabase
    .from('plaid_items')
    .select('id, access_token_enc, account_scope, entity_id, cursor')
    .eq('item_id', plaidItemId)
    .maybeSingle()
  if (lookupErr || !itemRow) {
    console.warn('[plaid webhook] unknown item_id', plaidItemId, lookupErr?.message)
    // Return 200 anyway — Plaid will disable webhooks if we 4xx/5xx repeatedly
    return NextResponse.json({ ok: true, handled: false, reason: 'unknown item' })
  }

  // access_token_enc comes back from postgrest as base64 string (bytea encoding)
  const enc = itemRow.access_token_enc as unknown as string
  const encBuf = typeof enc === 'string'
    ? (enc.startsWith('\\x')
        ? Buffer.from(enc.slice(2), 'hex')
        : Buffer.from(enc, 'base64'))
    : (enc as Buffer)

  const handlerItem = {
    id: itemRow.id as string,
    access_token_enc: encBuf,
    account_scope: (itemRow.account_scope as string) ?? 'personal',
    entity_id: (itemRow.entity_id as string | null) ?? null,
    cursor: (itemRow.cursor as string | null) ?? null,
  }

  const client = getPlaidClient()

  // TRANSACTIONS family → run the shared sync
  if (kind === 'TRANSACTIONS' && (
    code === 'SYNC_UPDATES_AVAILABLE' ||
    code === 'DEFAULT_UPDATE' ||
    code === 'INITIAL_UPDATE' ||
    code === 'HISTORICAL_UPDATE'
  )) {
    const r = await syncTransactionsForItem(client, handlerItem, supabase as never)
    console.log(`[plaid webhook] ${plaidItemId} ${code} → +${r.added} ~${r.modified} -${r.removed}${r.error ? ' err=' + r.error : ''}`)
    return NextResponse.json({ ok: true, ...r })
  }

  // ITEM errors → record + surface in UI
  if (kind === 'ITEM' && code === 'ERROR') {
    const errCode = body.error?.error_code ?? 'UNKNOWN'
    const errMsg = body.error?.error_message ?? ''
    await supabase.from('plaid_items').update({
      error_code: errCode,
      error_message: errMsg,
    } as never).eq('id', handlerItem.id)
    console.warn(`[plaid webhook] ITEM ERROR ${plaidItemId} ${errCode}: ${errMsg}`)
    return NextResponse.json({ ok: true, recorded: 'error' })
  }

  // LOGIN_REPAIRED → clear the error
  if (kind === 'ITEM' && code === 'LOGIN_REPAIRED') {
    await supabase.from('plaid_items').update({
      error_code: null,
      error_message: null,
    } as never).eq('id', handlerItem.id)
    return NextResponse.json({ ok: true, recorded: 'login-repaired' })
  }

  // Other webhook types we don't handle yet (HOLDINGS, INVESTMENTS_TRANSACTIONS, ASSETS)
  console.log(`[plaid webhook] unhandled ${kind}/${code} for ${plaidItemId}`)
  return NextResponse.json({ ok: true, handled: false, reason: `unhandled ${kind}/${code}` })
}

// Plaid sometimes sends a GET to verify the URL is reachable
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: '/api/plaid/webhook' })
}
