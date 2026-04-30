/**
 * GET /api/integrations/status?provider=<slug>
 *
 * Returns masked values + computed status for a provider's env vars,
 * plus whether VERCEL_API_TOKEN is configured at all. Powers the
 * IntegrationKeyModal's read-side UI and will also back the integrations
 * page's status pills (step 6).
 *
 * Response:
 *   {
 *     provider: string,
 *     configured: boolean,
 *     status: 'active' | 'partial' | 'not-configured',
 *     envVars: string[],
 *     masked: Record<key, { masked, updated_at, targets }>,
 *     vercelConfigured: boolean,
 *   }
 *
 * Results are cached in-memory for 60 seconds per provider to stay under
 * Vercel API rate limits.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  getEnvMaskedValues,
  isVercelApiConfigured,
} from '../../../lib/vercel-env'
import { getProvider } from '../../../lib/integration-providers'

export const dynamic = 'force-dynamic'

interface CacheEntry {
  t: number
  data: Awaited<ReturnType<typeof getEnvMaskedValues>>
}
const CACHE = new Map<string, CacheEntry>()
const TTL_MS = 60_000

async function cachedMasked(keys: string[]): Promise<Record<string, { masked: string; updated_at: string | null; targets: string[] }>> {
  const cacheKey = keys.slice().sort().join('|')
  const hit = CACHE.get(cacheKey)
  if (hit && Date.now() - hit.t < TTL_MS) return hit.data
  const data = await getEnvMaskedValues(keys)
  CACHE.set(cacheKey, { t: Date.now(), data })
  return data
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const slug = (searchParams.get('provider') ?? '').toLowerCase()
  const cfg = getProvider(slug)
  const vercelConfigured = isVercelApiConfigured()

  let masked: Record<string, { masked: string; updated_at: string | null; targets: string[] }> = {}
  if (vercelConfigured && cfg.envVars.length > 0) {
    masked = await cachedMasked(cfg.envVars)
  }

  const present = cfg.envVars.filter((k) => masked[k])
  const status: 'active' | 'partial' | 'not-configured' =
    cfg.envVars.length === 0
      ? 'not-configured'
      : present.length === cfg.envVars.length
      ? 'active'
      : present.length === 0
      ? 'not-configured'
      : 'partial'

  return NextResponse.json({
    provider: slug,
    configured: present.length > 0,
    status,
    envVars: cfg.envVars,
    masked,
    vercelConfigured,
  })
}
