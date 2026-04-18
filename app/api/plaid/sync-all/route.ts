import { NextRequest, NextResponse } from 'next/server'
import { getPlaidClient, plaidConfigured, syncTransactionsForItem } from '../../../lib/plaid'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * GET /api/plaid/sync-all
 *
 * Safety-net cron. Vercel fires this every 6h (see vercel.json). Iterates all
 * plaid_items, runs /transactions/sync for each, upserts rows. Catches anything
 * webhooks missed (downtime, dropped pushes, etc.).
 *
 * Auth: Vercel sets Authorization: Bearer <CRON_SECRET> on cron requests when
 * CRON_SECRET is in env. We require it so this endpoint can't be spammed by
 * anyone. Also accepts ?key=<CRON_SECRET> for manual test triggers.
 */
export async function GET(req: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ ok: false, error: 'Plaid not configured' }, { status: 501 })
  }

  const expected = process.env.CRON_SECRET?.trim() || ''
  const authHeader = req.headers.get('authorization') || ''
  const queryKey = new URL(req.url).searchParams.get('key') || ''
  const authed =
    !expected ||  // if no secret set, allow (v1 convenience)
    authHeader === `Bearer ${expected}` ||
    queryKey === expected
  if (!authed) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const client = getPlaidClient()

  const { data: items, error } = await supabase
    .from('plaid_items')
    .select('id, access_token_enc, account_scope, entity_id, cursor, institution_name, item_id')
    .is('error_code', null)
    .order('last_synced_at', { ascending: true, nullsFirst: true })
    .limit(50)
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const results: Array<{ item_id: string; institution: string; added: number; modified: number; removed: number; error?: string }> = []

  for (const row of (items ?? []) as Array<Record<string, unknown>>) {
    const enc = row.access_token_enc as unknown as string
    const encBuf = typeof enc === 'string'
      ? (enc.startsWith('\\x') ? Buffer.from(enc.slice(2), 'hex') : Buffer.from(enc, 'base64'))
      : (enc as Buffer)
    const handlerItem = {
      id: row.id as string,
      access_token_enc: encBuf,
      account_scope: (row.account_scope as string) ?? 'personal',
      entity_id: (row.entity_id as string | null) ?? null,
      cursor: (row.cursor as string | null) ?? null,
    }
    const r = await syncTransactionsForItem(client, handlerItem, supabase as never)
    results.push({
      item_id: row.id as string,
      institution: (row.institution_name as string) || '?',
      ...r,
    })
  }

  const total = results.reduce((acc, r) => ({
    added: acc.added + r.added,
    modified: acc.modified + r.modified,
    removed: acc.removed + r.removed,
    errors: acc.errors + (r.error ? 1 : 0),
  }), { added: 0, modified: 0, removed: 0, errors: 0 })

  return NextResponse.json({
    ok: true,
    items_synced: results.length,
    ...total,
    results,
    ranAt: new Date().toISOString(),
  })
}
