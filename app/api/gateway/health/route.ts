import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/gateway/health — probe the OpenClaw gateway for reachability.
 *
 * Returns { ok, url, status, latencyMs, error? } so UI components can gate
 * "Invoke" buttons on whether the backend will actually accept the request.
 *
 * NEXT_PUBLIC_OPENCLAW_API_URL is the mc-api URL (port 7070 or its tunnel
 * proxy). We hit its /health endpoint with a 3s timeout.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_OPENCLAW_API_URL || ''
  if (!url) {
    return NextResponse.json({
      ok: false,
      url: null,
      status: 0,
      error: 'NEXT_PUBLIC_OPENCLAW_API_URL not set',
    })
  }
  const t0 = Date.now()
  try {
    const resp = await fetch(`${url.replace(/\/$/, '')}/health`, {
      signal: AbortSignal.timeout(3000),
      cache: 'no-store',
    })
    const latencyMs = Date.now() - t0
    return NextResponse.json({
      ok: resp.ok,
      url,
      status: resp.status,
      latencyMs,
    })
  } catch (e) {
    const latencyMs = Date.now() - t0
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({
      ok: false,
      url,
      status: 0,
      latencyMs,
      error: msg,
    })
  }
}
