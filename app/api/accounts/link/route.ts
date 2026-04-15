import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/accounts/link
 *
 * TODO: Wire Plaid Link token exchange here.
 * Expected body: { public_token: string, product: 'bank'|'brokerage', scope: 'personal'|'entity', entity_id?: string }
 *
 * Steps when Plaid is configured:
 *   1. Exchange public_token via Plaid /item/public_token/exchange → access_token
 *   2. Fetch accounts from Plaid /accounts/get
 *   3. Insert rows into financial_accounts with account_scope = scope, entity_id = entity_id
 *   4. Insert plaid_item row
 *   5. Return { ok: true, count: number }
 *
 * Required env vars (set in Vercel):
 *   PLAID_CLIENT_ID, PLAID_SECRET, PLAID_ENV (sandbox|development|production)
 */
export async function POST(req: NextRequest) {
  // TODO: remove this stub once Plaid is configured
  const body = await req.json().catch(() => ({}))
  console.log('[/api/accounts/link] stub called with:', body)
  return NextResponse.json(
    { ok: false, error: 'Plaid not configured — see TODO in app/api/accounts/link/route.ts' },
    { status: 501 },
  )
}
