/**
 * POST /api/integrations/test
 *   body: { provider: string }
 *   → Probes the provider's testEndpoint (if any) with the currently-set
 *     API key from process.env. Returns {success, message} or {success:false, error}.
 *
 * This is a best-effort health check — each provider has its own auth shape,
 * so we handle the common ones explicitly and return a neutral error for
 * unsupported providers.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getProvider } from '../../../lib/integration-providers'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: { provider?: string; values?: Record<string, string> }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, error: 'invalid JSON' }, { status: 400 })
  }
  const slug = (body.provider ?? '').toLowerCase()
  const candidate = body.values ?? {}
  const cfg = getProvider(slug)
  if (!cfg.testEndpoint) {
    return NextResponse.json({ success: false, error: 'no test endpoint configured' }, { status: 400 })
  }

  // Prefer in-flight values from the modal; fall back to stored env only if field left blank.
  const getKey = (envVar: string) => {
    const v = candidate[envVar]
    return (v && v.trim()) ? v.trim() : process.env[envVar]
  }

  try {
    switch (slug) {
      case 'followupboss': {
        const key = getKey('FUB_API_KEY')
        if (!key) return NextResponse.json({ success: false, error: 'FUB_API_KEY missing' })
        const auth = Buffer.from(`${key}:`).toString('base64')
        const res = await fetch('https://api.followupboss.com/v1/identity', {
          headers: { Authorization: `Basic ${auth}`, 'X-System': 'MissionControl' },
        })
        if (!res.ok) return NextResponse.json({ success: false, error: `HTTP ${res.status} — token invalid or revoked` })
        const data = (await res.json()) as { name?: string; email?: string; account?: { name?: string } }
        return NextResponse.json({ success: true, message: `✓ Authenticated · ${data.account?.name ?? data.name ?? data.email ?? 'OK'}` })
      }
      case 'monday-xome':
      case 'monday-culbertson': {
        const envKey = slug === 'monday-xome' ? 'MONDAY_XOME_API_KEY' : 'MONDAY_CULBERTSON_API_KEY'
        const key = getKey(envKey)
        if (!key) return NextResponse.json({ success: false, error: `${envKey} missing` })
        const res = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: { Authorization: key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'query { me { id name email account { name } } }' }),
        })
        const data = (await res.json()) as { data?: { me?: { name?: string; email?: string; account?: { name?: string } } }; errors?: { message?: string }[] }
        if (!res.ok || data.errors) {
          const msg = data.errors?.[0]?.message ?? `HTTP ${res.status}`
          return NextResponse.json({ success: false, error: `${msg} — token invalid or revoked` })
        }
        const account = data.data?.me?.account?.name
        const name = data.data?.me?.name
        return NextResponse.json({
          success: true,
          message: `✓ Authenticated · ${account ? `${account} (${name})` : name ?? 'OK'}`,
        })
      }
      default:
        return NextResponse.json({ success: false, error: 'test not implemented for this provider' })
    }
  } catch (e: unknown) {
    return NextResponse.json({
      success: false,
      error: e instanceof Error ? e.message : String(e),
    })
  }
}
