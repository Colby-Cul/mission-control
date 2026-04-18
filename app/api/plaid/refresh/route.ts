import { NextRequest, NextResponse } from 'next/server'
import { getPlaidClient, plaidConfigured, decryptToken } from '../../../lib/plaid'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/plaid/refresh
 *
 * Forces Plaid to re-fetch transactions from the source institution for every
 * item. This triggers Plaid to discover new transactions and fire webhooks,
 * causing our webhook handler or next sync-all to actually receive data.
 *
 * Use this when /transactions/sync returns 0 even after a cursor reset —
 * Plaid's internal delivery state thinks we've consumed everything. Refresh
 * signals "go look at the bank again." When new txns arrive, Plaid fires
 * TRANSACTIONS/SYNC_UPDATES_AVAILABLE which hits our webhook handler.
 *
 * Auth: CRON_SECRET (Bearer or ?key=).
 */
export async function POST(req: NextRequest) {
  if (!plaidConfigured()) {
    return NextResponse.json({ ok: false, error: 'Plaid not configured' }, { status: 501 })
  }
  const expected = process.env.CRON_SECRET?.trim() || ''
  const authHeader = req.headers.get('authorization') || ''
  const queryKey = new URL(req.url).searchParams.get('key') || ''
  if (expected && authHeader !== `Bearer ${expected}` && queryKey !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const client = getPlaidClient()
  const { data: items } = await supabase
    .from('plaid_items')
    .select('id, institution_name, access_token_enc')
    .is('error_code', null)

  const results: Array<{ institution: string; refreshed: boolean; error?: string }> = []
  for (const row of (items ?? []) as Array<Record<string, unknown>>) {
    const enc = row.access_token_enc as unknown as string
    const encBuf = typeof enc === 'string'
      ? (enc.startsWith('\\x') ? Buffer.from(enc.slice(2), 'hex') : Buffer.from(enc, 'base64'))
      : (enc as Buffer)
    try {
      const accessToken = decryptToken(encBuf)
      await client.transactionsRefresh({ access_token: accessToken })
      results.push({ institution: (row.institution_name as string) || '?', refreshed: true })
    } catch (e) {
      const err = e as { response?: { data?: unknown }; message?: string }
      const msg = err.response?.data
        ? JSON.stringify(err.response.data).slice(0, 200)
        : err.message ?? String(e)
      results.push({ institution: (row.institution_name as string) || '?', refreshed: false, error: msg })
    }
  }

  return NextResponse.json({
    ok: true,
    items_refreshed: results.filter(r => r.refreshed).length,
    results,
    note: 'Refresh is async on Plaid’s side. Expect TRANSACTIONS webhooks within 1–5 minutes.',
  })
}
