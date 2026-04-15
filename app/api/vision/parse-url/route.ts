/**
 * GET /api/vision/parse-url?url=...
 * Fetches OG / Twitter Card metadata from a URL.
 * Returns { title, description, image, price, url }
 * or { error: '...' } on failure.
 */
import { NextRequest, NextResponse } from 'next/server'
// open-graph-scraper uses ESM default export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ogs = require('open-graph-scraper') as (opts: {
  url: string
  timeout: number
  fetchOptions: RequestInit
}) => Promise<{
  error: boolean
  result: Record<string, unknown>
  html?: string
}>

// ── Domain-specific field hints ────────────────────────────────────────────────
const DOMAIN_HINTS: Record<string, { priceHint?: string }> = {
  'zillow.com': { priceHint: 'ogDescription' },
  'redfin.com': { priceHint: 'ogDescription' },
  'realtor.com': { priceHint: 'ogDescription' },
  'amazon.com': { priceHint: 'ogPriceAmount' },
  'tesla.com': {},
  'cars.com': { priceHint: 'ogDescription' },
  'autotrader.com': { priceHint: 'ogDescription' },
}

function getDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function extractPriceFromDescription(desc: string): string | null {
  // Match patterns like "$1,250,000" "$850K" "Price: $400,000"
  const m = desc.match(/\$[\d,]+(?:\.\d{1,2})?(?:K|M)?/i)
  if (!m) return null
  const raw = m[0].replace(/[,$]/g, '').toUpperCase()
  if (raw.endsWith('K')) return String(parseFloat(raw) * 1000)
  if (raw.endsWith('M')) return String(parseFloat(raw) * 1_000_000)
  return raw
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')
  if (!url || !url.startsWith('http')) {
    return NextResponse.json({ error: 'Missing or invalid url parameter.' }, { status: 400 })
  }

  const domain = getDomain(url)

  try {
    const { error, result } = await ogs({
      url,
      timeout: 6000,
      fetchOptions: {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
      },
    })

    if (error) {
      return NextResponse.json({ error: 'Could not fetch page metadata. The site may block scrapers.' })
    }

    // Pull fields from OG result
    const title =
      (result.ogTitle as string) ??
      (result.twitterTitle as string) ??
      (result.dcTitle as string) ??
      null

    const description =
      (result.ogDescription as string) ??
      (result.twitterDescription as string) ??
      null

    // Image: prefer ogImage array, then twitterImage
    let image: string | null = null
    const ogImages = result.ogImage as Array<{ url?: string }> | undefined
    if (Array.isArray(ogImages) && ogImages[0]?.url) {
      image = ogImages[0].url
    } else if (typeof result.twitterImage === 'object' && result.twitterImage !== null) {
      image = (result.twitterImage as { url?: string }).url ?? null
    }

    // Price: ogPriceAmount > extract from description
    let price: string | null =
      (result.ogPriceAmount as string) ??
      (result['product:price:amount'] as string) ??
      null

    if (!price && description) {
      const hint = DOMAIN_HINTS[domain]
      if (hint || domain.includes('zillow') || domain.includes('redfin') || domain.includes('amazon')) {
        price = extractPriceFromDescription(description)
      }
    }

    return NextResponse.json({
      title,
      description,
      image,
      price,
      url,
      domain,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('timeout') || msg.includes('ETIMEDOUT') || msg.includes('ECONNREFUSED')) {
      return NextResponse.json({ error: 'Request timed out — the site may be slow or blocking.' })
    }
    return NextResponse.json({ error: `Failed to parse URL: ${msg}` })
  }
}
