import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import {
  getPlaidClient, plaidConfigured, encryptToken, productsFor,
  getWebhookUrl, syncTransactionsForItem,
} from '../../../../lib/plaid'
import { supabase } from '../../../../lib/supabase'
import type { AccountBase, InstitutionsGetByIdResponse } from 'plaid'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/accounts/link/exchange
 *
 * Body: {
 *   public_token: string,           // from react-plaid-link's onSuccess
 *   product: 'bank' | 'brokerage',
 *   scope: 'personal' | 'entity',
 *   entity_id?: string,
 *   institution?: { institution_id?: string, name?: string }  // from Plaid metadata
 * }
 *
 * Flow:
 *   1. Exchange public_token → access_token (Plaid /item/public_token/exchange)
 *   2. Encrypt access_token (AES-256-GCM) and insert plaid_items row
 *   3. Pull accounts via /accounts/get → upsert financial_accounts
 *   4. Pull first 30d of transactions via /transactions/sync → upsert financial_transactions
 *   5. Return counts so the UI can toast "Linked Chase · 3 accounts · 127 transactions"
 */
export async function POST(req: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json(
      { ok: false, error: 'Plaid env vars not set' },
      { status: 501 },
    )
  }

  let body: {
    public_token?: string
    product?: string
    scope?: string
    entity_id?: string
    institution?: { institution_id?: string; name?: string }
  }
  try { body = await req.json() } catch { body = {} }

  const publicToken = String(body.public_token || '').trim()
  if (!publicToken) {
    return NextResponse.json({ ok: false, error: 'public_token required' }, { status: 400 })
  }
  const product = body.product === 'brokerage' ? 'brokerage' : 'bank'
  const scope = body.scope === 'entity' ? 'entity' : 'personal'
  const entityId = scope === 'entity' ? String(body.entity_id || '').trim() || null : null
  if (scope === 'entity' && !entityId) {
    return NextResponse.json({ ok: false, error: 'entity_id required when scope=entity' }, { status: 400 })
  }

  const client = getPlaidClient()

  // 1) Exchange public_token → access_token
  let accessToken: string
  let itemId: string
  try {
    const exch = await client.itemPublicTokenExchange({ public_token: publicToken })
    accessToken = exch.data.access_token
    itemId = exch.data.item_id
  } catch (e) {
    return plaidError(e, 'exchange')
  }

  // 2) Institution metadata — prefer what the client sent; else fetch from Plaid
  let institutionId = body.institution?.institution_id ?? ''
  let institutionName = body.institution?.name ?? ''
  if (!institutionId || !institutionName) {
    try {
      const itemResp = await client.itemGet({ access_token: accessToken })
      institutionId = institutionId || itemResp.data.item.institution_id || 'unknown'
      if (!institutionName && institutionId !== 'unknown') {
        const instResp: { data: InstitutionsGetByIdResponse } = await client.institutionsGetById({
          institution_id: institutionId,
          country_codes: ['US' as never],
        })
        institutionName = instResp.data.institution.name
      }
    } catch {
      // non-fatal
      institutionId = institutionId || 'unknown'
      institutionName = institutionName || 'Unknown Institution'
    }
  }

  // 3) Insert plaid_items row (encrypted token)
  const itemsRowId = randomUUID()
  const enc = encryptToken(accessToken)
  const webhookUrl = getWebhookUrl()
  const { error: insErr } = await supabase.from('plaid_items').insert({
    id: itemsRowId,
    institution_id: institutionId,
    institution_name: institutionName,
    access_token_enc: enc as never,
    item_id: itemId,
    account_scope: scope,
    entity_id: entityId,
    products: productsFor(product) as unknown as string[],
    webhook_url: webhookUrl,
    last_synced_at: new Date().toISOString(),
  } as never)
  if (insErr) {
    console.error('[plaid exchange] plaid_items insert failed', insErr)
    return NextResponse.json({ ok: false, error: `DB insert failed: ${insErr.message}` }, { status: 500 })
  }

  // 4) Pull accounts
  let accounts: AccountBase[] = []
  try {
    const aResp = await client.accountsGet({ access_token: accessToken })
    accounts = aResp.data.accounts
  } catch (e) {
    console.warn('[plaid exchange] accountsGet failed', e)
  }

  const accountRows = accounts.map((a) => ({
    // Internal UUID for PK (matches v6 pattern). Plaid's ID goes in
    // plaid_account_id. The transaction sync helper maps between them.
    id: randomUUID(),
    plaid_item_id: itemsRowId,
    plaid_account_id: a.account_id,
    name: a.name,
    official_name: a.official_name ?? null,
    type: a.type,
    subtype: a.subtype ?? null,
    mask: a.mask ?? null,
    currency_code: a.balances.iso_currency_code ?? 'USD',
    balance_current: a.balances.current ?? null,
    balance_available: a.balances.available ?? null,
    balance_limit: a.balances.limit ?? null,
    account_scope: scope,
    entity_id: entityId,
    last_synced_at: new Date().toISOString(),
  }))

  if (accountRows.length > 0) {
    const { error: accErr } = await supabase
      .from('financial_accounts')
      .upsert(accountRows as never, { onConflict: 'id' })
    if (accErr) console.warn('[plaid exchange] financial_accounts upsert', accErr.message)
  }

  // 5) Initial transaction pull — use the shared sync helper so we get the
  // plaid_account_id → UUID mapping + cursor-on-success semantics instead of
  // duplicating the logic (and its bugs) here.
  let txnCount = 0
  let syncError: string | undefined
  if (product === 'bank') {
    const res = await syncTransactionsForItem(client, {
      id: itemsRowId,
      access_token_enc: enc,
      account_scope: scope,
      entity_id: entityId,
      cursor: null,
    }, supabase as never)
    txnCount = res.added
    syncError = res.error
  }

  return NextResponse.json({
    ok: true,
    item_id: itemsRowId,
    institution: institutionName,
    account_count: accountRows.length,
    transaction_count: txnCount,
    ...(syncError ? { sync_warning: syncError } : {}),
  })
}

function plaidError(e: unknown, stage: string) {
  const err = e as { response?: { data?: unknown }; message?: string }
  const msg = err.response?.data
    ? `Plaid ${stage}: ${JSON.stringify(err.response.data).slice(0, 300)}`
    : err.message ?? String(e)
  console.error(`[plaid ${stage}]`, msg)
  return NextResponse.json({ ok: false, error: msg }, { status: 500 })
}
