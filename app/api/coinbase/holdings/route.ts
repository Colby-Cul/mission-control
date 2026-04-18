/**
 * GET /api/coinbase/holdings
 *
 * Returns current Coinbase holdings + total USD value, fetched live via
 * HMAC-signed Coinbase v2 API call.
 *
 * Response shape:
 *   {
 *     configured: boolean,
 *     total_usd: number,
 *     accounts: [{ id, name, currency_code, balance_amount, balance_usd, ... }],
 *     last_fetched_at: ISO string,
 *     error: string | null
 *   }
 *
 * - 200 even on upstream error; `error` field explains what went wrong.
 * - Cached 120 s upstream (see app/lib/coinbase.ts) so clients can poll freely.
 *
 * Required env:
 *   COINBASE_API_KEY
 *   COINBASE_API_SECRET
 */
import { NextResponse } from 'next/server'
import { getCoinbaseHoldings } from '../../../lib/coinbase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const summary = await getCoinbaseHoldings()
  return NextResponse.json(summary, { status: 200 })
}
