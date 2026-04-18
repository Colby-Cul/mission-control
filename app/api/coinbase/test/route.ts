/**
 * GET /api/coinbase/test
 *
 * Diagnostic — used by the Integrations Hub "Test Connection" button.
 * Hits GET /v2/user with the configured API key to verify auth works.
 *
 * Response:
 *   { ok: boolean, status: number, error: string | null, configured: boolean }
 */
import { NextResponse } from 'next/server'
import { isCoinbaseConfigured, pingCoinbase } from '../../../lib/coinbase'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = isCoinbaseConfigured()
  if (!configured) {
    return NextResponse.json(
      { ok: false, status: 0, error: 'not-configured', configured: false },
      { status: 200 },
    )
  }
  const result = await pingCoinbase()
  return NextResponse.json({ ...result, configured: true }, { status: 200 })
}
