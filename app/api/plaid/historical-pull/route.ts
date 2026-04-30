import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getPlaidClient, plaidConfigured, decryptToken } from '../../../lib/plaid'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/plaid/historical-pull
 *
 * Bulk historical import via Plaid /transactions/get — bypasses the
 * cursor-based /transactions/sync model entirely. Use this to backfill
 * items that lost their history (cursor advanced past transactions that
 * failed to persist, etc.). Pulls up to 2 years per item.
 *
 * Does NOT advance the sync cursor — safe to re-run without losing forward
 * deltas.
 *
 * Body: { item_id?: string }  // optional filter to one plaid_items.id
 * Auth: CRON_SECRET
 */
export async function POST(req: NextRequest) {
  if (!plaidConfigured()) return NextResponse.json({ ok: false, error: 'Plaid not configured' }, { status: 501 })
  const expected = process.env.CRON_SECRET?.trim() || ''
  const authHeader = req.headers.get('authorization') || ''
  const queryKey = new URL(req.url).searchParams.get('key') || ''
  if (expected && authHeader !== `Bearer ${expected}` && queryKey !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { item_id?: string } = {}
  try { body = await req.json() } catch { body = {} }

  const client = getPlaidClient()
  const q = supabase.from('plaid_items').select('id, institution_name, access_token_enc').is('error_code', null)
  const { data: items } = body.item_id
    ? await q.eq('id', body.item_id)
    : await q

  const endDate = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const results: Array<{
    institution: string
    plaid_total: number
    plaid_returned: number
    db_upserted: number
    skipped_unmapped: number
    error?: string
  }> = []

  for (const row of (items ?? []) as Array<Record<string, unknown>>) {
    const institution = (row.institution_name as string) || '?'
    const result = { institution, plaid_total: 0, plaid_returned: 0, db_upserted: 0, skipped_unmapped: 0 } as (typeof results)[number]
    try {
      const encRaw = row.access_token_enc as unknown as string
      const encBuf = typeof encRaw === 'string'
        ? (encRaw.startsWith('\\x') ? Buffer.from(encRaw.slice(2), 'hex') : Buffer.from(encRaw, 'base64'))
        : (encRaw as Buffer)
      const accessToken = decryptToken(encBuf)

      // Resolve Plaid account_id → our UUID
      const { data: accts } = await supabase
        .from('financial_accounts')
        .select('id, plaid_account_id')
        .eq('plaid_item_id', row.id as string)
      const plaidToUuid = new Map<string, string>()
      for (const a of (accts ?? []) as Array<{ id: string; plaid_account_id: string }>) {
        plaidToUuid.set(a.plaid_account_id, a.id)
      }

      // Page through /transactions/get
      const batch: Array<Record<string, unknown>> = []
      let offset = 0
      const PAGE = 500
      let total = 0
      while (offset < 10_000) {
        const resp = await client.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: PAGE, offset },
        })
        total = resp.data.total_transactions
        const page = resp.data.transactions ?? []
        result.plaid_returned += page.length
        for (const t of page) {
          const accountUuid = plaidToUuid.get(t.account_id)
          if (!accountUuid) { result.skipped_unmapped++; continue }
          batch.push({
            id: t.transaction_id,
            account_id: accountUuid,
            plaid_transaction_id: t.transaction_id,
            date: t.date,
            datetime: t.datetime ?? null,
            name: t.name,
            merchant_name: t.merchant_name ?? null,
            amount: t.amount,
            currency_code: t.iso_currency_code ?? 'USD',
            category: t.category ?? null,
            personal_finance_category: t.personal_finance_category?.primary ?? null,
            pending: t.pending ?? false,
          })
        }
        offset += page.length
        if (offset >= total || page.length === 0) break
      }
      result.plaid_total = total

      if (batch.length > 0) {
        // Chunk upserts to avoid huge payloads
        const CHUNK = 200
        for (let i = 0; i < batch.length; i += CHUNK) {
          const slice = batch.slice(i, i + CHUNK)
          // Upsert on plaid_transaction_id: v6 rows used uuid for id but the
          // plaid_transaction_id column is unique. Matching on it lets us
          // update existing rows in place rather than collide on the
          // unique constraint.
          const { error, count } = await supabase
            .from('financial_transactions')
            .upsert(slice as never, { onConflict: 'plaid_transaction_id', count: 'exact' })
          if (error) {
            result.error = (result.error ? result.error + '; ' : '') + `upsert: ${error.message}`
          } else {
            result.db_upserted += slice.length
          }
          void count
        }
      }
    } catch (e) {
      const err = e as { response?: { data?: unknown }; message?: string }
      result.error = err.response?.data
        ? JSON.stringify(err.response.data).slice(0, 200)
        : err.message ?? String(e)
    }
    results.push(result)
  }

  const totals = results.reduce((a, r) => ({
    plaid_total: a.plaid_total + r.plaid_total,
    plaid_returned: a.plaid_returned + r.plaid_returned,
    db_upserted: a.db_upserted + r.db_upserted,
    skipped: a.skipped + r.skipped_unmapped,
    errored: a.errored + (r.error ? 1 : 0),
  }), { plaid_total: 0, plaid_returned: 0, db_upserted: 0, skipped: 0, errored: 0 })

  // discard unused destructuring
  void randomUUID

  return NextResponse.json({ ok: true, ...totals, results, ranAt: new Date().toISOString() })
}
