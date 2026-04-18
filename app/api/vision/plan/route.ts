/**
 * POST /api/vision/plan
 *
 * Produces a personalized financial plan for a single vision.
 *
 * Request: { visionId: string, userId?: string }
 *
 * Response:
 *   {
 *     headline: string
 *     time_to_target_months: number | null
 *     pct_of_net_worth: number | null
 *     pct_of_liquid: number | null
 *     target_midpoint: number
 *     monthly_savings: number
 *     recommendations: { title: string; detail: string; impact: string; category: 'savings' | 'expenses' | 'revenue' | 'tax' | 'other' }[]
 *     used_ai: boolean
 *     notes?: string
 *   }
 *
 * Rate-limited to 5 calls/minute per user.
 * Aggregates only (no raw balances/transactions) are sent to Claude.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '../../../lib/supabase'
import { getNetWorthFromGraph } from '../../../lib/queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ── Rate limit ────────────────────────────────────────────────────────────────
const RATE_LIMIT = 5
const WINDOW_MS = 60_000
const callLog: Map<string, number[]> = new Map()

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const calls = (callLog.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (calls.length >= RATE_LIMIT) return false
  calls.push(now)
  callLog.set(key, calls)
  return true
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Recommendation {
  title: string
  detail: string
  impact: string
  category: 'savings' | 'expenses' | 'revenue' | 'tax' | 'other'
}

interface PlanResponse {
  headline: string
  time_to_target_months: number | null
  pct_of_net_worth: number | null
  pct_of_liquid: number | null
  target_midpoint: number
  monthly_savings: number
  recommendations: Recommendation[]
  used_ai: boolean
  notes?: string
}

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { visionId?: string; userId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const visionId = (body.visionId ?? '').trim()
  if (!visionId) return NextResponse.json({ error: 'Missing visionId' }, { status: 400 })

  const rateKey = body.userId ?? req.headers.get('x-forwarded-for') ?? 'anonymous'
  if (!checkRateLimit(rateKey)) {
    return NextResponse.json({ error: 'Rate limit: 5 plans/minute. Try again shortly.' }, { status: 429 })
  }

  // 1) Fetch vision
  const { data: vision, error: visionErr } = await supabase
    .from('visions')
    .select('*')
    .eq('id', visionId)
    .single()
  if (visionErr || !vision) {
    return NextResponse.json({ error: 'Vision not found' }, { status: 404 })
  }

  // 2) Aggregate financial context (no raw data to AI)
  const targetLow = Number(vision.target_low ?? 0)
  const targetHigh = Number(vision.target_high ?? targetLow)
  const midpoint = (targetLow + targetHigh) / 2 || 0

  const [netWorth, savingsInfo, topCategories, entitiesSummary] = await Promise.all([
    getNetWorthFromGraph().catch(() => ({ total: 0, direct: 0, byEntity: [] })),
    getMonthlySavings().catch(() => ({ monthlySavings: 0, monthlyRevenue: 0, monthlyExpenses: 0 })),
    getTopExpenseCategoriesAgg().catch(() => []),
    getEntitiesRevenueSummary().catch(() => []),
  ])

  const liquidAssets = await getLiquidAssets().catch(() => 0)

  const pctOfNetWorth = netWorth.total > 0 ? (midpoint / netWorth.total) * 100 : null
  const pctOfLiquid = liquidAssets > 0 ? (midpoint / liquidAssets) * 100 : null
  const monthly = savingsInfo.monthlySavings
  const monthsToTarget = monthly > 0 ? Math.ceil(midpoint / monthly) : null

  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY

  const baseline: PlanResponse = {
    headline: buildFallbackHeadline(midpoint, monthly, monthsToTarget, pctOfNetWorth),
    time_to_target_months: monthsToTarget,
    pct_of_net_worth: pctOfNetWorth ? round(pctOfNetWorth, 1) : null,
    pct_of_liquid: pctOfLiquid ? round(pctOfLiquid, 1) : null,
    target_midpoint: midpoint,
    monthly_savings: monthly,
    recommendations: buildFallbackRecommendations(monthly, topCategories, entitiesSummary),
    used_ai: false,
  }

  if (!hasAnthropic) {
    baseline.notes = 'Set ANTHROPIC_API_KEY in Vercel env to unlock personalized AI recommendations. Showing baseline plan from your aggregate financials.'
    return NextResponse.json(baseline)
  }

  // 3) AI-generated recommendations (aggregates only)
  // startedAt + contextJson hoisted so the catch block can persist a truthful
  // error row via logAgentRun.
  const startedAt = new Date().toISOString()
  const contextJson = {
      vision: {
        name: vision.name,
        category: vision.category,
        target_low: targetLow,
        target_high: targetHigh,
        target_midpoint: midpoint,
        deadline: vision.deadline,
        priority: vision.priority,
        note: vision.note?.slice(0, 400) ?? null,
      },
      user_financial_snapshot: {
        net_worth_total: round(netWorth.total, 0),
        liquid_assets: round(liquidAssets, 0),
        monthly_savings_rate: round(monthly, 0),
        monthly_revenue: round(savingsInfo.monthlyRevenue, 0),
        monthly_expenses: round(savingsInfo.monthlyExpenses, 0),
        top_expense_categories: topCategories.slice(0, 5).map((c) => ({
          category: c.category,
          monthly_avg: round(c.monthly_avg, 0),
          pct_of_expenses: round(c.pct, 1),
        })),
        entity_revenue_mix: entitiesSummary.slice(0, 5).map((e) => ({
          entity: e.entity_name,
          monthly_revenue: round(e.revenue, 0),
        })),
      vision_midpoint_as_pct_of_net_worth: pctOfNetWorth != null ? round(pctOfNetWorth, 1) : null,
      vision_midpoint_as_pct_of_liquid: pctOfLiquid != null ? round(pctOfLiquid, 1) : null,
    },
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

    const system = `You are a sharp, pragmatic financial planner advising a high-net-worth entrepreneur on achieving a specific "vision board" goal (car, house, yacht, experience, etc.). You receive an aggregate snapshot — no raw transactions, no account numbers.

Return ONLY a JSON object (no prose, no markdown fences):
{
  "headline": string,               // ≤ 140 chars, compelling one-liner: "At $X/mo, you'll reach $Y in N months"
  "recommendations": [              // 3-5 items
    {
      "title": string,              // ≤ 60 chars, action-oriented
      "detail": string,             // ≤ 200 chars, 1-2 sentences explaining HOW
      "impact": string,             // ≤ 60 chars, e.g. "+$500/mo" or "Saves 4 months"
      "category": "savings" | "expenses" | "revenue" | "tax" | "other"
    }
  ]
}

Guidelines:
- Ground every recommendation in the user's actual numbers (cite amounts).
- Be specific: "Cut dining-out by $400/mo" NOT "reduce expenses".
- Mix categories: savings rate, expense cuts, revenue growth, tax moves.
- For tax/equity: mention 1031 exchange, cost segregation, retirement account contributions when relevant.
- Priority 8-10 visions need aggressive tactics; 1-3 can be long-horizon.
- Dyslexia-friendly: short sentences, concrete numbers.`

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system,
      messages: [{ role: 'user', content: `FINANCIAL CONTEXT:\n${JSON.stringify(contextJson, null, 2)}` }],
    })

    const textBlock = msg.content.find((b) => b.type === 'text')
    const text = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Claude did not return JSON')
    const parsed = JSON.parse(jsonMatch[0]) as { headline?: string; recommendations?: Recommendation[] }

    const response: PlanResponse = {
      ...baseline,
      headline: parsed.headline ?? baseline.headline,
      recommendations: Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0
        ? parsed.recommendations.map(normalizeRec).filter(Boolean) as Recommendation[]
        : baseline.recommendations,
      used_ai: true,
    }

    void logAgentRun({
      startedAt,
      input: contextJson,
      output: response,
      tokens: (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0),
      cost:
        (msg.usage?.input_tokens ?? 0) * 0.000003 +
        (msg.usage?.output_tokens ?? 0) * 0.000015,
      status: 'success',
      kind: 'vision.plan',
    })

    return NextResponse.json(response)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[vision/plan] Claude error:', msg)
    void logAgentRun({
      startedAt,
      input: contextJson,
      output: null,
      tokens: 0,
      cost: 0,
      status: 'error',
      error: msg,
      kind: 'vision.plan',
    })
    baseline.notes = `AI call failed (${msg.slice(0, 120)}) — showing baseline plan.`
    return NextResponse.json(baseline)
  }
}

// ── Aggregate helpers (no raw data leaves this module) ───────────────────────

interface MonthlyAgg {
  monthlySavings: number
  monthlyRevenue: number
  monthlyExpenses: number
}

async function getMonthlySavings(): Promise<MonthlyAgg> {
  // Last 90 days of transactions, averaged to monthly.
  // Plaid convention: amount > 0 = money out, amount < 0 = money in.
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('financial_transactions')
    .select('amount')
    .gte('date', since)
  const txns = data ?? []
  let inflow = 0
  let outflow = 0
  for (const t of txns) {
    const amt = Number(t.amount ?? 0)
    if (amt < 0) inflow += Math.abs(amt)
    else outflow += amt
  }
  const monthlyRevenue = inflow / 3
  const monthlyExpenses = outflow / 3
  return {
    monthlyRevenue,
    monthlyExpenses,
    monthlySavings: Math.max(0, monthlyRevenue - monthlyExpenses),
  }
}

async function getLiquidAssets(): Promise<number> {
  // "Liquid" = depository + investment (non-credit, non-loan) accounts.
  const { data } = await supabase
    .from('financial_accounts')
    .select('balance_current, type, subtype')
  const liquid = (data ?? []).filter((a) => {
    const t = String(a.type ?? '').toLowerCase()
    return t === 'depository' || t === 'investment' || t === 'brokerage'
  })
  return liquid.reduce((sum, a) => sum + Number(a.balance_current ?? 0), 0)
}

interface TopCatAgg { category: string; monthly_avg: number; pct: number }
async function getTopExpenseCategoriesAgg(): Promise<TopCatAgg[]> {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data } = await supabase
    .from('financial_transactions')
    .select('amount, personal_finance_category')
    .gte('date', since)
    .gt('amount', 0)
  const catMap: Record<string, number> = {}
  let total = 0
  for (const t of data ?? []) {
    const cat = (t.personal_finance_category ?? 'OTHER') as string
    const amt = Number(t.amount ?? 0)
    catMap[cat] = (catMap[cat] ?? 0) + amt
    total += amt
  }
  return Object.entries(catMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([category, sum]) => ({
      category,
      monthly_avg: sum / 3,
      pct: total > 0 ? (sum / total) * 100 : 0,
    }))
}

async function getEntitiesRevenueSummary(): Promise<{ entity_name: string; revenue: number }[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: entities } = await supabase
    .from('entity_ownership')
    .select('id, entity_name')
    .eq('status', 'active')
  const out: { entity_name: string; revenue: number }[] = []
  for (const e of (entities ?? []).slice(0, 10)) {
    const { data: txns } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('entity_id', e.id)
      .lt('amount', 0)
      .gte('date', since)
    const rev = (txns ?? []).reduce((s, t) => s + Math.abs(Number(t.amount ?? 0)), 0)
    if (rev > 0) out.push({ entity_name: e.entity_name, revenue: rev })
  }
  return out.sort((a, b) => b.revenue - a.revenue)
}

// ── Formatting / fallback ─────────────────────────────────────────────────────

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits)
  return Math.round(n * f) / f
}

function buildFallbackHeadline(
  midpoint: number,
  monthly: number,
  months: number | null,
  pctNw: number | null,
): string {
  if (midpoint <= 0) return 'Set a target range on this vision to unlock a plan.'
  if (monthly <= 0) return `Target midpoint: $${midpoint.toLocaleString()}. Start tracking cash flow to see time-to-target.`
  if (months == null) return `Target midpoint: $${midpoint.toLocaleString()}. Monthly surplus not yet measured.`
  const pctStr = pctNw != null ? ` (${pctNw.toFixed(1)}% of net worth)` : ''
  return `At $${Math.round(monthly).toLocaleString()}/mo saved, you hit $${midpoint.toLocaleString()}${pctStr} in ~${months} months.`
}

function buildFallbackRecommendations(
  monthly: number,
  topCats: TopCatAgg[],
  entities: { entity_name: string; revenue: number }[],
): Recommendation[] {
  const recs: Recommendation[] = []
  // Savings bump
  recs.push({
    title: `Increase monthly savings by 10%`,
    detail: `Moving from $${Math.round(monthly).toLocaleString()}/mo to $${Math.round(monthly * 1.1).toLocaleString()}/mo compounds fast on long-horizon targets.`,
    impact: `+$${Math.round(monthly * 0.1).toLocaleString()}/mo`,
    category: 'savings',
  })
  // Expense cut
  const topCat = topCats[0]
  if (topCat) {
    recs.push({
      title: `Trim ${prettifyCategory(topCat.category)} spend by 15%`,
      detail: `Your biggest monthly bucket averages $${Math.round(topCat.monthly_avg).toLocaleString()}/mo. A 15% cut frees up meaningful capital.`,
      impact: `+$${Math.round(topCat.monthly_avg * 0.15).toLocaleString()}/mo`,
      category: 'expenses',
    })
  }
  // Revenue boost
  const topEntity = entities[0]
  if (topEntity) {
    recs.push({
      title: `Boost ${topEntity.entity_name} revenue 10%`,
      detail: `Your strongest revenue entity books $${Math.round(topEntity.revenue).toLocaleString()}/mo. A 10% lift adds directly to savings capacity.`,
      impact: `+$${Math.round(topEntity.revenue * 0.1).toLocaleString()}/mo`,
      category: 'revenue',
    })
  }
  // Tax move
  recs.push({
    title: 'Explore tax-advantaged acceleration',
    detail: 'Depending on category, a 1031 exchange, cost segregation study, or SEP-IRA contribution may free up capital toward this vision.',
    impact: 'Varies',
    category: 'tax',
  })
  return recs
}

function prettifyCategory(cat: string): string {
  return cat
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizeRec(r: unknown): Recommendation | null {
  if (!r || typeof r !== 'object') return null
  const rec = r as Record<string, unknown>
  const title = String(rec.title ?? '').slice(0, 80)
  if (!title) return null
  return {
    title,
    detail: String(rec.detail ?? '').slice(0, 240),
    impact: String(rec.impact ?? '').slice(0, 80),
    category: ['savings', 'expenses', 'revenue', 'tax', 'other'].includes(rec.category as string)
      ? (rec.category as Recommendation['category'])
      : 'other',
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
      input: { kind: opts.kind, ...(opts.input as Record<string, unknown>) },
      output: opts.output as unknown as Record<string, unknown>,
      tokens: opts.tokens,
      cost: opts.cost,
      status: opts.status,
      started_at: opts.startedAt,
      ended_at: new Date().toISOString(),
      error: opts.error ?? null,
    } as never)
  } catch {
    /* log-only */
  }
}
