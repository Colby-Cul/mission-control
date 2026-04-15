/**
 * GET /api/vision/parse-url?url=...
 *
 * LEGACY endpoint — now a thin wrapper around `intakeUrl()`.
 * Kept for backward-compat with any external callers. Preferred path is
 * POST /api/vision/generate for AI-augmented intake.
 */
import { NextRequest, NextResponse } from 'next/server'
import { intakeUrl } from '../../../lib/url-intake'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Missing or invalid url parameter.' }, { status: 400 })
  }

  try {
    const result = await intakeUrl(url)
    const priceStr = result.price?.low != null ? String(result.price.low) : null
    return NextResponse.json({
      title: result.title ?? null,
      description: result.description ?? null,
      image: result.image ?? null,
      price: priceStr,
      price_range: result.price ?? null,
      category_hint: result.category ?? null,
      url: result.url,
      domain: result.domain ?? null,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: `Failed to parse URL: ${msg}` })
  }
}
