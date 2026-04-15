/**
 * POST /api/integrations/rotate
 *   body: { provider: string, values: Record<envVar, string> }
 *   → Writes each value to the Vercel project's env, then triggers a redeploy.
 *
 * DELETE /api/integrations/rotate
 *   body: { provider: string }
 *   → Removes every env var bound to that provider + redeploys.
 *
 * Auth: session cookie check (placeholder). TODO — add proper admin check
 * once v7 ships real auth. Today the app is still in single-seed-user mode
 * behind its own domain so this is a soft guardrail, not a hard wall.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  updateVercelEnv,
  deleteVercelEnv,
  triggerRedeploy,
  isVercelApiConfigured,
} from '../../../lib/vercel-env'
import { getProvider, isKnownProvider } from '../../../lib/integration-providers'

export const dynamic = 'force-dynamic'

// Placeholder auth — accept any request that has our seed cookie or is same-origin.
// TODO: replace with real admin RBAC when v7 auth lands.
function authorize(req: NextRequest): { ok: boolean; reason?: string } {
  const origin = req.headers.get('origin') ?? ''
  const host = req.headers.get('host') ?? ''
  if (origin && !origin.endsWith(host) && !origin.includes('localhost')) {
    return { ok: false, reason: 'origin mismatch' }
  }
  return { ok: true }
}

export async function POST(req: NextRequest) {
  const auth = authorize(req)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 403 })
  }
  if (!isVercelApiConfigured()) {
    return NextResponse.json(
      { success: false, error: 'VERCEL_API_TOKEN not configured — admin action required' },
      { status: 503 },
    )
  }

  let body: { provider?: string; values?: Record<string, string> }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, error: 'invalid JSON' }, { status: 400 })
  }
  const slug = (body.provider ?? '').toLowerCase()
  if (!slug || !isKnownProvider(slug)) {
    return NextResponse.json({ success: false, error: 'unknown provider' }, { status: 400 })
  }
  const cfg = getProvider(slug)
  if (cfg.envVars.length === 0) {
    return NextResponse.json({ success: false, error: 'provider has no env vars' }, { status: 400 })
  }
  const values = body.values ?? {}
  const allowedKeys = new Set(cfg.envVars)
  const toWrite = Object.entries(values).filter(([k, v]) => allowedKeys.has(k) && v && v.trim())
  if (toWrite.length === 0) {
    return NextResponse.json({ success: false, error: 'no valid values to write' }, { status: 400 })
  }

  for (const [key, value] of toWrite) {
    const res = await updateVercelEnv({
      key,
      value: value.trim(),
      target: ['production', 'preview', 'development'],
    })
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: `failed to write ${key}: ${res.error}` },
        { status: 500 },
      )
    }
  }

  // Kick off redeploy async — don't await long; client closes immediately after.
  const deploy = await triggerRedeploy()
  return NextResponse.json({
    success: true,
    deployUrl: deploy.url,
    deployError: deploy.success ? undefined : deploy.error,
    written: toWrite.map(([k]) => k),
  })
}

export async function DELETE(req: NextRequest) {
  const auth = authorize(req)
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: auth.reason }, { status: 403 })
  }
  if (!isVercelApiConfigured()) {
    return NextResponse.json(
      { success: false, error: 'VERCEL_API_TOKEN not configured — admin action required' },
      { status: 503 },
    )
  }
  let body: { provider?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ success: false, error: 'invalid JSON' }, { status: 400 })
  }
  const slug = (body.provider ?? '').toLowerCase()
  if (!slug || !isKnownProvider(slug)) {
    return NextResponse.json({ success: false, error: 'unknown provider' }, { status: 400 })
  }
  const cfg = getProvider(slug)
  if (cfg.envVars.length === 0) {
    return NextResponse.json({ success: true, removed: [] })
  }
  for (const key of cfg.envVars) {
    const res = await deleteVercelEnv(key)
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: `failed to delete ${key}: ${res.error}` },
        { status: 500 },
      )
    }
  }
  const deploy = await triggerRedeploy()
  return NextResponse.json({
    success: true,
    deployUrl: deploy.url,
    removed: cfg.envVars,
  })
}
