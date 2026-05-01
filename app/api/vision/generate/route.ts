/**
 * POST /api/vision/generate
 *
 * AI-powered vision intake. Takes { description, url?, image? } and returns
 * a structured vision card draft. Uses Anthropic Claude for the reasoning,
 * and the universal URL intake library to scrape any URL the user paste.
 *
 * Rate-limited to 10 calls/minute per user (in-memory throttle).
 *
 * Response shape:
 *   {
 *     name: string
 *     category: 'Real Estate' | 'Vehicle' | 'Experience' | 'Education' | 'Investment' | 'Other'
 *     target_low: number
 *     target_high: number
 *     target_label: string
 *     description: string
 *     deadline_suggestion?: string  // ISO date
 *     priority_suggestion?: number  // 1-10
 *     image_url?: string
 *     source_url?: string
 *     used_ai: boolean              // false when ANTHROPIC_API_KEY is not set
 *     notes?: string                // when used_ai=false, human-readable fallback note
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { intakeUrl, IntakeResult } from '../../../lib/url-intake'
import { supabase } from '../../../lib/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Rate limit (in-memory) ────────────────────────────────────────────────────
const RATE_LIMIT = 10
const WINDOW_MS = 60_000
const callLog: Map<string, number[]> = new Map()

function checkRateLimit(key: string): { ok: boolean; remaining: number } {
  const now = Date.now()
  const calls = (callLog.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (calls.length >= RATE_LIMIT) return { ok: false, remaining: 0 }
  calls.push(now)
  callLog.set(key, calls)
  return { ok: true, remaining: RATE_LIMIT - calls.length }
}

// ── Category normalization (aligns with VisionClient CATEGORIES) ──────────────
const VALID_CATEGORIES = ['Real Estate', 'Vehicle', 'Experience', 'Education', 'Investment', 'Other']
function normalizeCategory(raw: string | undefined): string {
  if (!raw) return 'Other'
  const match = VALID_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase())
  return match ?? 'Other'
}

// ── Response typing ───────────────────────────────────────────────────────────
interface GeneratedCard {
  name: string
  category: string
  target_low: number
  target_high: number
  target_label: string
  description: string
  deadline_suggestion?: string
  priority_suggestion?: number
  image_url?: string
  source_url?: string
  used_ai: boolean
  notes?: string
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { description?: string; url?: string; image?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const description = (body.description ?? '').trim()
  const url = (body.url ?? '').trim()
  const imageHint = (body.image ?? '').trim()

  if (!description && !url && !imageHint) {
    return NextResponse.json({ error: 'Need at least a description, URL, or image.' }, { status: 400 })
  }

  // Best-effort user key (client IP fallback if not authenticated)
  const userKey =
    req.headers.get('x-user-id') ??
    req.headers.get('x-forwarded-for')?.split(',')[0] ??
    'anonymous'
  const rate = checkRateLimit(userKey)
  if (!rate.ok) {
    return NextResponse.json({ error: 'Rate limit: 10 AI generations/minute. Try again in a moment.' }, { status: 429 })
  }

  // Run URL intake in parallel with AI init (intake is the expensive part)
  const intakePromise: Promise<IntakeResult | null> = url
    ? intakeUrl(url).catch(() => null)
    : Promise.resolve(null)

  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY

  const intake = await intakePromise

  // If no Anthropic key, return a best-effort card built from the URL intake + description
  if (!hasAnthropic) {
    const fallback: GeneratedCard = fallbackCard(description, intake, imageHint, url)
    fallback.notes = 'Set ANTHROPIC_API_KEY in Vercel env to enable AI-powered intake. This card is assembled from URL metadata + your description.'
    return NextResponse.json(fallback)
  }

  // Run Claude to synthesize. startedAt lives outside the try so the catch
  // block can persist an agent_runs row with a correct started_at.
  const startedAt = new Date().toISOString()
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const system = `You are a financial planning assistant helping turn a user's "vision board" dream into a structured card. The user describes something they want to buy, save for, or experience (house, yacht, boat, car, vacation, education, investment, etc.). You must return ONLY valid JSON matching the schema — no prose, no markdown.

CORE PRINCIPLE: A vision is an ASPIRATIONAL GOAL, not a specific listing. Example: the user drops a Zillow URL for "5905 Barton Rd, Loomis CA". The vision name is "New Family Home in Loomis", NOT the street address. The specific property may be sold by the time they're ready to buy — the vision is what they're saving for, not which house.

Schema:
{
  "name": string,                   // ≤ 60 chars, title-case, ASPIRATIONAL + generic. See rules.
  "category": "Real Estate" | "Vehicle" | "Experience" | "Education" | "Investment" | "Other",
  "target_low": number,             // dollars, low end
  "target_high": number,            // dollars, high end (can equal low when we have a real listing price)
  "target_label": string,           // human-friendly, e.g. "$875K (Zillow listing)" or "$2M-$5M range"
  "description": string,            // ≤ 200 chars, 1-2 sentences describing the vision
  "deadline_suggestion": string,    // ISO date, reasonable timeframe (1-10 yrs out)
  "priority_suggestion": number     // 1-10, derived from user's urgency language
}

NAME RULES — this is a vision, not a listing:
- For REAL ESTATE: "New Family Home in <City>", "Dream Beach House in <City>", "Mountain Cabin in <City>", "Investment Duplex in <City>". NEVER include a specific street address or property ID. City + property type + adjective describing the dream.
- For VEHICLES: the make/model/trim IS the vision — "Tesla Model S Plaid", "2024 Porsche 911 Turbo", "Sailboat · 40ft Catamaran".
- For EXPERIENCES: "Family Trip to Japan", "6-Month European Sabbatical", "Honeymoon in Bora Bora".
- For EDUCATION: "Stanford MBA", "Private K-8 Education".
- For INVESTMENTS: the asset class — "Rental Property Portfolio", "Early-Stage Venture Fund Allocation".
- Never prefix with the specific listing's street number, MLS ID, or VIN.

PRICE RULES — prefer real data tightly over guesses loosely:
- If scraped_url.price is present with a confirmed listing price, set target_low = target_high = that exact price (±0%). Use target_label like "$<price> (<domain> listing)".
- If only a price RANGE is scraped (e.g. Airbnb price per night, category base model MSRP), use target_low/target_high from the range verbatim.
- If NO price is scraped AND the user gave no number, estimate conservatively from domain knowledge. In that case use a ±15% range, and target_label should indicate "area estimate — no live listing".
- NEVER apply ±10% hedge to a confirmed listing price. Confirmed = confirmed.

OTHER RULES:
- Description should be SCANNABLE — dyslexic-friendly, 1-2 short sentences. Lead with the user's aspiration, not listing specs.
- If the user mentions a timeframe ("in 5 years", "by 2030"), respect it. Otherwise pick a reasonable default (3-5 yrs for large goals).
- If scraped price disagrees with user's described budget, TRUST the scraped price — it's live data.`

    const userContent: string[] = []
    if (description) userContent.push(`USER'S VISION DESCRIPTION:\n${description}`)
    if (intake) {
      const intakeSummary: Record<string, unknown> = {
        url: intake.url,
        domain: intake.domain,
        title: intake.title,
        description: intake.description,
        image: intake.image,
        price: intake.price,
        category_hint: intake.category,
        attributes: intake.attributes,
      }
      userContent.push(`SCRAPED URL METADATA:\n${JSON.stringify(intakeSummary, null, 2)}`)
    } else if (url) {
      userContent.push(`USER PROVIDED URL (failed to scrape):\n${url}`)
    }
    if (imageHint) userContent.push(`USER UPLOADED AN IMAGE (url):\n${imageHint}`)

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system,
      messages: [{ role: 'user', content: userContent.join('\n\n') }],
    })

    // Parse Claude's text response
    const textBlock = msg.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    // Extract JSON (Claude sometimes wraps in ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude did not return JSON')
    const parsed = JSON.parse(jsonMatch[0]) as Partial<GeneratedCard>

    const card: GeneratedCard = {
      name: String(parsed.name ?? intake?.title ?? 'New Vision').slice(0, 80),
      category: normalizeCategory(parsed.category),
      target_low: Number(parsed.target_low ?? intake?.price?.low ?? 0),
      target_high: Number(parsed.target_high ?? intake?.price?.high ?? intake?.price?.low ?? 0),
      target_label: String(parsed.target_label ?? intake?.price?.label ?? ''),
      description: String(parsed.description ?? intake?.description ?? description.slice(0, 200)),
      deadline_suggestion: parsed.deadline_suggestion,
      priority_suggestion: clamp(Number(parsed.priority_suggestion ?? 5), 1, 10),
      image_url: imageHint || intake?.image || undefined,
      source_url: url || undefined,
      used_ai: true,
    }

    // Log to agent_runs (cost tracking)
    void logAgentRun({
      startedAt,
      input: { description, url, imageHint, intake: summarizeIntake(intake) },
      output: card,
      tokens: (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0),
      // Rough pricing: $3 / 1M input + $15 / 1M output for Sonnet 3.5
      cost:
        (msg.usage?.input_tokens ?? 0) * 0.000003 +
        (msg.usage?.output_tokens ?? 0) * 0.000015,
      status: 'success',
      kind: 'vision.generate',
    })

    return NextResponse.json(card)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[vision/generate] Claude error:', msg)
    // Persist the failure so it surfaces in agent_runs / Command Deck /
    // daily digest instead of silently degrading to fallback card.
    void logAgentRun({
      startedAt,
      input: { description, url, imageHint, intake: summarizeIntake(intake) },
      output: null,
      tokens: 0,
      cost: 0,
      status: 'error',
      error: msg,
      kind: 'vision.generate',
    })
    const fallback = fallbackCard(description, intake, imageHint, url)
    fallback.notes = `AI call failed (${msg.slice(0, 120)}) — fell back to URL metadata + description.`
    return NextResponse.json(fallback)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(n: number, lo: number, hi: number): number {
  if (!Number.isFinite(n)) return lo
  return Math.min(hi, Math.max(lo, n))
}

function summarizeIntake(intake: IntakeResult | null) {
  if (!intake) return null
  return {
    url: intake.url,
    domain: intake.domain,
    title: intake.title,
    price: intake.price,
    category: intake.category,
  }
}

function fallbackCard(
  description: string,
  intake: IntakeResult | null,
  imageHint: string,
  url: string,
): GeneratedCard {
  const price = intake?.price
  return {
    name: (intake?.title ?? description.split('\n')[0] ?? 'New Vision').slice(0, 80),
    category: normalizeCategory(intake?.category),
    target_low: price?.low ?? 0,
    target_high: price?.high ?? price?.low ?? 0,
    target_label: price?.label ?? '',
    description: (intake?.description ?? description).slice(0, 200),
    image_url: imageHint || intake?.image || undefined,
    source_url: url || undefined,
    used_ai: false,
  }
}

async function logAgentRun(opts: {
  startedAt: string
  input: unknown
  output: unknown
  tokens: number
  cost: number
  status: string
  kind: string
  error?: string
}) {
  try {
    await supabase.from('agent_runs').insert({
      agent_id: 'cfo',
      input: { kind: opts.kind, ...(opts.input as Record<string, unknown>) },
      output: opts.output as unknown as Record<string, unknown>,
      tokens: opts.tokens,
      cost: opts.cost,
      status: opts.status,
      started_at: opts.startedAt,
      ended_at: new Date().toISOString(),
      error: opts.error ?? null,
    } as never)
  } catch (e) {
    // Log to console so failure to persist isn't completely invisible.
    console.error('[logAgentRun] insert failed:', e instanceof Error ? e.message : String(e))
  }
}
