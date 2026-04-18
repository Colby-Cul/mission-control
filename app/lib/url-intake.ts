/**
 * url-intake.ts — Universal URL intake for Vision Board.
 *
 * Strategy chain (first strategy to yield a non-empty result wins each field):
 *   1. OpenGraph scrape (open-graph-scraper)
 *   2. Twitter Card (part of open-graph-scraper result)
 *   3. JSON-LD Schema.org extraction (Product, Accommodation, Vehicle, Event, Offer)
 *   4. Generic HTML parse — <title>, <meta name="description">, first large <img>
 *   5. If all else fails: return just the URL + empty fields. Caller/AI will
 *      make best effort with user-provided description.
 *
 * Domain hints (optional nudges — not required for success):
 *   - zillow.com / redfin.com / realtor.com → price via JSON-LD or meta tags
 *   - amazon.com → price via ogPriceAmount or JSON-LD Offer
 *   - tesla.com → model + configured price
 *   - yachtworld.com / boattrader.com → length + price
 *   - cars.com / autotrader.com → year/make/model + price
 *   - vrbo.com / airbnb.com → nightly rate + location
 *
 * This module runs server-side only (Node.js). It uses `fetch` for raw HTML.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
const ogs = require('open-graph-scraper') as (opts: {
  url: string
  timeout: number
  fetchOptions: RequestInit
  html?: string
}) => Promise<{ error: boolean; result: Record<string, unknown>; html?: string }>

export interface IntakeResult {
  url: string
  domain?: string
  title?: string
  description?: string
  image?: string
  price?: { low?: number; high?: number; currency?: string; label?: string }
  category?: string
  attributes?: Record<string, string | number>
  raw?: {
    og?: Record<string, unknown>
    jsonLd?: unknown
    htmlSnippet?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function getDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function parsePriceString(raw: string): { low?: number; high?: number; currency?: string; label?: string } | undefined {
  // Match "$1,250,000", "$850K", "$2M", "$2M-$5M", "$50k-$100k", "€1.2M", "£500"
  // Also handles "from $3,000" or "starting at $5M"
  const cleaned = raw.replace(/[,\s]/g, ' ').toLowerCase()
  // Range pattern
  const range = cleaned.match(/(\$|€|£)?([\d.]+)\s*([kmb])?\s*[-–—to]+\s*(\$|€|£)?([\d.]+)\s*([kmb])?/i)
  if (range) {
    const low = parsePrice(range[2], range[3])
    const high = parsePrice(range[5], range[6])
    if (low != null && high != null) {
      return {
        low,
        high,
        currency: range[1] === '€' ? 'EUR' : range[1] === '£' ? 'GBP' : 'USD',
        label: raw.trim(),
      }
    }
  }
  // Single price
  const single = cleaned.match(/(\$|€|£)?([\d.]+)\s*([kmb])?/i)
  if (single) {
    const val = parsePrice(single[2], single[3])
    if (val != null && val > 0) {
      return {
        low: val,
        high: val,
        currency: single[1] === '€' ? 'EUR' : single[1] === '£' ? 'GBP' : 'USD',
        label: raw.trim(),
      }
    }
  }
  return undefined
}

function parsePrice(numStr: string, suffix?: string): number | undefined {
  const n = parseFloat(numStr)
  if (!Number.isFinite(n)) return undefined
  const s = (suffix ?? '').toLowerCase()
  if (s === 'k') return n * 1_000
  if (s === 'm') return n * 1_000_000
  if (s === 'b') return n * 1_000_000_000
  return n
}

function classifyCategory(domain: string, title: string, description: string): string | undefined {
  const hay = `${domain} ${title} ${description}`.toLowerCase()
  if (/(zillow|redfin|realtor|trulia|homes\.com|compass\.com)/.test(domain)) return 'Real Estate'
  if (/(vrbo|airbnb|booking\.com|expedia|hotels\.com|kayak)/.test(domain)) return 'Experience'
  if (/(tesla|rivian|ford|toyota|bmw|mercedes|cars\.com|autotrader|cargurus|carvana)/.test(domain)) return 'Vehicle'
  if (/(yachtworld|boattrader|boats\.com|denisonyacht)/.test(domain)) return 'Vehicle'
  if (/(coursera|udemy|masterclass|edx|khanacademy)/.test(domain)) return 'Education'
  if (/(robinhood|fidelity|schwab|vanguard|coinbase|etoro)/.test(domain)) return 'Investment'
  // Title-based fallbacks
  if (/\b(house|home|condo|apartment|property|acre|sq\.?\s*ft|bedroom)\b/.test(hay)) return 'Real Estate'
  if (/\b(yacht|boat|car|truck|suv|sedan|coupe|sailboat|catamaran|motorcycle|rv)\b/.test(hay)) return 'Vehicle'
  if (/\b(vacation|cruise|trip|flight|resort|villa|tour)\b/.test(hay)) return 'Experience'
  if (/\b(course|class|degree|mba|bootcamp|certification)\b/.test(hay)) return 'Education'
  return undefined
}

function extractJsonLd(html: string): unknown[] {
  const out: unknown[] = []
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    const raw = m[1].trim()
    if (!raw) continue
    try {
      out.push(JSON.parse(raw))
    } catch {
      /* ignore malformed JSON-LD */
    }
  }
  return out
}

function pickFromJsonLd(blocks: unknown[]): {
  title?: string
  description?: string
  image?: string
  price?: { low?: number; high?: number; currency?: string; label?: string }
  category?: string
  attributes?: Record<string, string | number>
} {
  const out: ReturnType<typeof pickFromJsonLd> = {}
  const attrs: Record<string, string | number> = {}

  const walk = (node: unknown) => {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { node.forEach(walk); return }
    const n = node as Record<string, unknown>
    // Unwrap @graph arrays
    if (Array.isArray(n['@graph'])) { (n['@graph'] as unknown[]).forEach(walk) }

    const type = Array.isArray(n['@type']) ? (n['@type'][0] as string) : (n['@type'] as string | undefined)

    if (type && /Product|Accommodation|Vehicle|Car|Boat|Event|House|SingleFamilyResidence|Hotel|LodgingBusiness|Course|Offer|RealEstateListing/.test(type)) {
      out.title ??= (n.name as string) ?? (n.headline as string) ?? out.title
      out.description ??= (n.description as string) ?? out.description
      if (!out.image) {
        const img = n.image
        if (typeof img === 'string') out.image = img
        else if (Array.isArray(img) && typeof img[0] === 'string') out.image = img[0] as string
        else if (img && typeof img === 'object') out.image = (img as Record<string, unknown>).url as string
      }
      if (type === 'Vehicle' || type === 'Car') out.category ??= 'Vehicle'
      if (type === 'Accommodation' || type === 'House' || type === 'SingleFamilyResidence' || type === 'RealEstateListing') out.category ??= 'Real Estate'
      if (type === 'Hotel' || type === 'LodgingBusiness') out.category ??= 'Experience'
      if (type === 'Course') out.category ??= 'Education'

      // Offer price (embedded or nested)
      const offers = n.offers
      const offerObj = Array.isArray(offers) ? offers[0] : offers
      if (offerObj && typeof offerObj === 'object') {
        const o = offerObj as Record<string, unknown>
        const low = Number(o.lowPrice ?? o.price ?? NaN)
        const high = Number(o.highPrice ?? o.price ?? NaN)
        if (Number.isFinite(low) || Number.isFinite(high)) {
          out.price ??= {
            low: Number.isFinite(low) ? low : undefined,
            high: Number.isFinite(high) ? high : Number.isFinite(low) ? low : undefined,
            currency: (o.priceCurrency as string) ?? 'USD',
            label: `${o.priceCurrency ?? '$'}${o.price ?? ''}`,
          }
        }
      }

      // Common numeric attributes
      for (const k of ['numberOfRooms', 'numberOfBedrooms', 'numberOfBathroomsTotal', 'floorSize', 'mileageFromOdometer', 'modelYear']) {
        const v = n[k]
        if (typeof v === 'number' || typeof v === 'string') attrs[k] = v as string | number
      }
    }

    // Recurse through values that might contain nested types
    for (const v of Object.values(n)) walk(v)
  }

  blocks.forEach(walk)
  if (Object.keys(attrs).length > 0) out.attributes = attrs
  return out
}

function parseGenericHtml(html: string): { title?: string; description?: string; image?: string } {
  const out: { title?: string; description?: string; image?: string } = {}
  const titleM = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (titleM) out.title = decodeEntities(titleM[1]).trim().slice(0, 200)
  const descM = html.match(/<meta\s+[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
  if (descM) out.description = decodeEntities(descM[1]).trim().slice(0, 500)
  const imgM = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imgM) out.image = imgM[1]
  return out
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

// ── Zillow via RapidAPI ──────────────────────────────────────────────────────
// Zillow blocks plain scrapers. The zillow-com1.p.rapidapi.com partner API
// returns structured property data including price, beds, baths, sqft, images.
// Requires RAPIDAPI_KEY env var + active subscription to that RapidAPI.

function extractZpid(url: string): string | null {
  // Zillow homedetails URLs look like:
  //   /homedetails/<slug>/<zpid>_zpid/
  //   /b/<zpid>/
  //   ?zpid=<zpid>
  const m1 = url.match(/\/(\d{6,})_zpid/)
  if (m1) return m1[1]
  const m2 = url.match(/\/b\/(\d{6,})/)
  if (m2) return m2[1]
  try {
    const u = new URL(url)
    const q = u.searchParams.get('zpid')
    if (q && /^\d{6,}$/.test(q)) return q
  } catch { /* ignore */ }
  return null
}

interface ZillowIntakeResult {
  title?: string
  description?: string
  image?: string
  price?: { low?: number; high?: number; currency?: string; label?: string }
  attributes?: Record<string, string | number>
}

async function fetchZillowViaRapidApi(
  zpid: string,
  rapidKey: string,
): Promise<ZillowIntakeResult | null> {
  const host = 'zillow-com1.p.rapidapi.com'
  const url = `https://${host}/property?zpid=${encodeURIComponent(zpid)}`
  try {
    const resp = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': rapidKey,
        'X-RapidAPI-Host': host,
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!resp.ok) {
      console.warn(`[url-intake] Zillow RapidAPI ${resp.status} for zpid=${zpid}`)
      return null
    }
    const body = await resp.json()
    // The endpoint returns a flat object with fields like:
    //   price, bedrooms, bathrooms, livingArea, yearBuilt, address, imgSrc,
    //   hdpUrl, streetAddress, city, state, zipcode, description, ...
    const priceNum = typeof body.price === 'number' ? body.price : null
    const city = body.city ?? body.address?.city ?? null
    const state = body.state ?? body.address?.state ?? null
    const streetAddress = body.streetAddress ?? body.address?.streetAddress ?? null
    const beds = body.bedrooms ?? null
    const baths = body.bathrooms ?? null
    const sqft = body.livingArea ?? null
    const yearBuilt = body.yearBuilt ?? null
    const image = body.imgSrc ?? body.image ?? null

    const titleParts: string[] = []
    if (streetAddress) titleParts.push(streetAddress)
    if (city && state) titleParts.push(`${city}, ${state}`)
    const title = titleParts.join(' — ') || `Zillow property ${zpid}`

    const descParts: string[] = []
    if (beds) descParts.push(`${beds} bed`)
    if (baths) descParts.push(`${baths} bath`)
    if (sqft) descParts.push(`${sqft.toLocaleString()} sqft`)
    if (yearBuilt) descParts.push(`built ${yearBuilt}`)
    if (city && state) descParts.push(`${city}, ${state}`)
    const description = descParts.join(' · ') || body.description || undefined

    const attributes: Record<string, string | number> = {}
    if (city) attributes.city = String(city)
    if (state) attributes.state = String(state)
    if (beds) attributes.bedrooms = Number(beds)
    if (baths) attributes.bathrooms = Number(baths)
    if (sqft) attributes.living_area_sqft = Number(sqft)
    if (yearBuilt) attributes.year_built = Number(yearBuilt)
    if (body.homeType) attributes.home_type = String(body.homeType)
    if (body.homeStatus) attributes.home_status = String(body.homeStatus)

    return {
      title,
      description,
      image,
      price: priceNum && priceNum > 0
        ? { low: priceNum, high: priceNum, currency: 'USD', label: `$${priceNum.toLocaleString()}` }
        : undefined,
      attributes,
    }
  } catch (e) {
    console.warn('[url-intake] Zillow RapidAPI fetch failed:', e instanceof Error ? e.message : String(e))
    return null
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

/**
 * Universal URL intake.  Always returns a result object; never throws on
 * recoverable errors (logs and returns bare `{ url }`).
 */
export async function intakeUrl(url: string): Promise<IntakeResult> {
  const domain = getDomain(url)
  const result: IntakeResult = { url, domain }

  // ── Domain-specialized fast paths (before generic HTML scrape) ──────────────
  // Zillow serves a JS SPA with bot detection — plain HTTP returns null. If we
  // have a RapidAPI key, hit the Zillow partner API for real structured data.
  if (/zillow\.com/.test(domain)) {
    const zpid = extractZpid(url)
    const rapidKey = process.env.RAPIDAPI_KEY
    if (zpid && rapidKey) {
      const zData = await fetchZillowViaRapidApi(zpid, rapidKey)
      if (zData) {
        result.title = zData.title
        result.description = zData.description
        result.image = zData.image
        result.price = zData.price
        result.category = 'Real Estate'
        result.attributes = zData.attributes
        result.raw = { og: undefined, jsonLd: undefined, htmlSnippet: undefined }
        return result
      }
    }
    // Fall through — we'll try generic scrape but it almost always fails on Zillow
  }

  // 1) Pull raw HTML ourselves so we can run multiple strategies in parallel
  let rawHtml = ''
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8000),
    })
    if (res.ok) {
      rawHtml = await res.text()
    }
  } catch {
    /* fallthrough — we'll still try ogs which does its own fetch */
  }

  // 2) OpenGraph / Twitter Card (library)
  let ogResult: Record<string, unknown> = {}
  try {
    const ogResp = await ogs({
      url,
      timeout: 6000,
      fetchOptions: {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      },
      // Reuse HTML if we have it
      ...(rawHtml ? { html: rawHtml } : {}),
    })
    if (!ogResp.error) ogResult = ogResp.result
  } catch {
    /* fallthrough */
  }

  // 3) JSON-LD extraction
  const ldBlocks = rawHtml ? extractJsonLd(rawHtml) : []
  const ld = ldBlocks.length > 0 ? pickFromJsonLd(ldBlocks) : {}

  // 4) Generic HTML fallback
  const generic = rawHtml ? parseGenericHtml(rawHtml) : {}

  // Merge fields: OpenGraph > Twitter > JSON-LD > generic
  result.title =
    (ogResult.ogTitle as string) ??
    (ogResult.twitterTitle as string) ??
    (ogResult.dcTitle as string) ??
    ld.title ??
    generic.title ??
    undefined

  result.description =
    (ogResult.ogDescription as string) ??
    (ogResult.twitterDescription as string) ??
    ld.description ??
    generic.description ??
    undefined

  const ogImgs = ogResult.ogImage as Array<{ url?: string }> | undefined
  if (Array.isArray(ogImgs) && ogImgs[0]?.url) {
    result.image = ogImgs[0].url
  } else if (ogResult.twitterImage && typeof ogResult.twitterImage === 'object') {
    const ti = ogResult.twitterImage as { url?: string } | Array<{ url?: string }>
    result.image = Array.isArray(ti) ? ti[0]?.url : ti.url
  } else if (ld.image) {
    result.image = ld.image
  } else if (generic.image) {
    result.image = generic.image?.startsWith('http') ? generic.image : undefined
  }

  // Price: OG numeric → JSON-LD Offer → regex on description
  const ogPrice =
    (ogResult.ogPriceAmount as string | number | undefined) ??
    (ogResult['product:price:amount'] as string | number | undefined)
  if (ogPrice != null) {
    const n = Number(ogPrice)
    if (Number.isFinite(n) && n > 0) {
      result.price = { low: n, high: n, currency: (ogResult.ogPriceCurrency as string) ?? 'USD', label: `$${n.toLocaleString()}` }
    }
  }
  if (!result.price && ld.price) result.price = ld.price
  if (!result.price && result.description) {
    const p = parsePriceString(result.description)
    if (p) result.price = p
  }
  // Extra pass: try to find a price hiding in the title (common for vehicle listings)
  if (!result.price && result.title) {
    const p = parsePriceString(result.title)
    if (p && (p.low ?? 0) > 100) result.price = p
  }

  result.category = ld.category ?? classifyCategory(domain, result.title ?? '', result.description ?? '')
  if (ld.attributes) result.attributes = ld.attributes
  result.raw = {
    og: Object.keys(ogResult).length > 0 ? ogResult : undefined,
    jsonLd: ldBlocks.length > 0 ? ldBlocks : undefined,
    htmlSnippet: rawHtml ? rawHtml.slice(0, 1200) : undefined,
  }

  return result
}
