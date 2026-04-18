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
  const key = process.env.COINBASE_API_KEY || ''
  const secret = process.env.COINBASE_API_SECRET || ''
  const diag = {
    key_prefix: key.slice(0, 20),
    key_looks_like_cdp: key.startsWith('organizations/'),
    secret_starts_with_begin: secret.includes('-----BEGIN'),
    secret_has_literal_backslash_n: secret.includes('\\n'),
    secret_has_real_newline: secret.includes('\n'),
    secret_length: secret.length,
  }
  const result = await pingCoinbase()
  return NextResponse.json({ ...result, configured: true, diag }, { status: 200 })
}
