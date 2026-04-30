import { NextRequest, NextResponse } from 'next/server'
import {
  getPlaidClient, plaidConfigured, syncTransactionsForItem,
  getWebhookUrl, decryptToken,
} from '../../../lib/plaid'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/plaid/register-webhooks
 *
 * One-off back-fill. Iterates all plaid_items where webhook_url IS NULL,
 * calls Plaid's /item/webhook/update to register our webhook URL, then runs
 * /transactions/sync to pull whatever's been accumulating since last sync.
 *
 * Fire this once after deploy. Safe to re-run — it's idempotent. Writes
 * webhook_url to the row so future runs skip already-registered items.
 *
 * Auth: requires CRON_SECRET (same as sync-all) via Bearer header or ?key=.
 */
export async function POST(req: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ ok: false, error: 'Plaid not configured' }, { status: 501 })
  }

  const expected = process.env.CRON_SECRET?.trim() || ''
  const authHeader = req.headers.get('authorization') || ''
  const queryKey = new URL(req.url).searchParams.get('key') || ''
  const authed =
    !expected ||
    authHeader === `Bearer ${expected}` ||
    queryKey === expected
  if (!authed) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const force = new URL(req.url).searchParams.get('force') === '1'
  const webhookUrl = getWebhookUrl()
  const client = getPlaidClient()

  const query = supabase
    .from('plaid_items')
    .select('id, item_id, institution_name, access_token_enc, webhook_url, account_scope, entity_id, cursor')
  const { data: items, error } = force
    ? await query
    : await query.is('webhook_url', null)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const results: Array<{
    item_id: string
    institution: string
    webhook_registered: boolean
    sync?: { added: number; modified: number; removed: number; error?: string }
    error?: string
  }> = []

  for (const row of (items ?? []) as Array<Record<string, unknown>>) {
    const encVal = row.access_token_enc as unknown as string
    const encBuf = typeof encVal === 'string'
      ? (encVal.startsWith('\\x') ? Buffer.from(encVal.slice(2), 'hex') : Buffer.from(encVal, 'base64'))
      : (encVal as Buffer)
    let accessToken: string
    try {
      accessToken = decryptToken(encBuf)
    } catch (e) {
      results.push({
        item_id: row.id as string,
        institution: (row.institution_name as string) || '?',
        webhook_registered: false,
        error: `decrypt failed: ${e instanceof Error ? e.message : String(e)}`,
      })
      continue
    }

    // Register webhook with Plaid
    let registered = false
    try {
      await client.itemWebhookUpdate({ access_token: accessToken, webhook: webhookUrl })
      registered = true
      await supabase.from('plaid_items').update({ webhook_url: webhookUrl } as never).eq('id', row.id as string)
    } catch (e) {
      const err = e as { response?: { data?: unknown }; message?: string }
      const msg = err.response?.data ? JSON.stringify(err.response.data).slice(0, 200) : (err.message ?? String(e))
      results.push({
        item_id: row.id as string,
        institution: (row.institution_name as string) || '?',
        webhook_registered: false,
        error: `webhookUpdate failed: ${msg}`,
      })
      continue
    }

    // Immediately pull anything that accumulated while webhook was absent
    const handlerItem = {
      id: row.id as string,
      access_token_enc: encBuf,
      account_scope: (row.account_scope as string) ?? 'personal',
      entity_id: (row.entity_id as string | null) ?? null,
      cursor: (row.cursor as string | null) ?? null,
    }
    const sync = await syncTransactionsForItem(client, handlerItem, supabase as never)
    results.push({
      item_id: row.id as string,
      institution: (row.institution_name as string) || '?',
      webhook_registered: registered,
      sync,
    })
  }

  return NextResponse.json({
    ok: true,
    webhook_url: webhookUrl,
    items_processed: results.length,
    results,
    ranAt: new Date().toISOString(),
  })
}
