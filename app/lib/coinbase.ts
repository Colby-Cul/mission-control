/**
 * Coinbase adapter (Mission Control v7).
 *
 * Server-only — imported from server components (page.tsx) and route handlers.
 * Wraps the Coinbase Consumer API v2 (https://api.coinbase.com/v2/...).
 *
 *   Auth: HMAC-signed request per Coinbase v2 docs.
 *         Headers: CB-ACCESS-KEY, CB-ACCESS-SIGN, CB-ACCESS-TIMESTAMP, CB-VERSION.
 *         Sig:     HMAC-SHA256(COINBASE_API_SECRET, timestamp + METHOD + path + body)
 *
 *   Env: COINBASE_API_KEY, COINBASE_API_SECRET (Vercel → production).
 *        Generate at https://coinbase.com/settings/api — scope "wallet:accounts:read".
 *
 * Rules (match lodgify.ts, monday.ts conventions):
 *   - never throw — return null / [] on any error so every widget degrades
 *     gracefully to a ComingSoon fallback.
 *   - 120 s cache via `next: { revalidate: 120 }` — crypto prices move but we
 *     don't need second-level freshness for a CEO dashboard.
 *   - no PII or secrets in logs — only statuses.
 */

import crypto from 'node:crypto'

export const COINBASE_API_BASE = 'https://api.coinbase.com'
export const COINBASE_API_VERSION = '2024-01-01'

const REVALIDATE_SECONDS = 120

export function isCoinbaseConfigured(): boolean {
  return Boolean(process.env.COINBASE_API_KEY && process.env.COINBASE_API_SECRET)
}

export interface CoinbaseAccount {
  id: string
  name: string
  primary: boolean
  type: string
  currency_code: string
  balance_amount: number
  balance_usd: number | null
  updated_at: string
}

export interface CoinbaseHoldingsSummary {
  configured: boolean
  accounts: CoinbaseAccount[]
  total_usd: number
  last_fetched_at: string
  error: string | null
}

/* ═════ HMAC signing ═══════════════════════════════════════════════════════ */

function sign(timestamp: string, method: string, path: string, body = ''): string {
  const secret = process.env.COINBASE_API_SECRET!
  return crypto.createHmac('sha256', secret).update(timestamp + method + path + body).digest('hex')
}

async function coinbaseGet<T = unknown>(
  path: string,
): Promise<{ data: T | null; status: number; error: string | null }> {
  if (!isCoinbaseConfigured()) {
    return { data: null, status: 0, error: 'not-configured' }
  }
  const key = process.env.COINBASE_API_KEY!
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = sign(timestamp, 'GET', path)
  try {
    const res = await fetch(`${COINBASE_API_BASE}${path}`, {
      method: 'GET',
      headers: {
        'CB-ACCESS-KEY': key,
        'CB-ACCESS-SIGN': signature,
        'CB-ACCESS-TIMESTAMP': timestamp,
        'CB-VERSION': COINBASE_API_VERSION,
        'Accept': 'application/json',
      },
      next: { revalidate: REVALIDATE_SECONDS },
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return {
        data: null,
        status: res.status,
        error: `coinbase ${res.status}: ${txt.slice(0, 200)}`,
      }
    }
    const json = (await res.json()) as T
    return { data: json, status: res.status, error: null }
  } catch (e: any) {
    return { data: null, status: 0, error: String(e?.message || e) }
  }
}

/* ═════ Public data fetchers ═══════════════════════════════════════════════ */

interface V2AccountsResponse {
  data: Array<{
    id: string
    name: string
    primary: boolean
    type: string
    currency: { code: string; name?: string }
    balance: { amount: string; currency: string }
    updated_at: string
  }>
  pagination?: { next_uri?: string | null }
}

interface V2SpotPriceResponse {
  data: { amount: string; base: string; currency: string }
}

/** List all accounts (one per currency). Filters out zero balances by default. */
export async function getCoinbaseAccounts(opts: { includeZero?: boolean } = {}): Promise<
  { accounts: CoinbaseAccount[]; error: string | null }
> {
  const { data, error } = await coinbaseGet<V2AccountsResponse>('/v2/accounts?limit=100')
  if (!data || !Array.isArray(data.data)) {
    return { accounts: [], error: error || 'empty-response' }
  }

  const raw = data.data
  const nonZero = opts.includeZero
    ? raw
    : raw.filter(a => Number(a.balance?.amount || 0) > 0)

  // Fetch spot prices in parallel (one call per unique currency)
  const uniqueCurrencies = Array.from(new Set(nonZero.map(a => a.currency.code)))
  const priceMap: Record<string, number | null> = {}
  await Promise.all(
    uniqueCurrencies.map(async code => {
      if (code === 'USD' || code === 'USDC') {
        priceMap[code] = 1
        return
      }
      const resp = await coinbaseGet<V2SpotPriceResponse>(
        `/v2/prices/${encodeURIComponent(code)}-USD/spot`,
      )
      priceMap[code] = resp.data ? Number(resp.data.data.amount) : null
    }),
  )

  const accounts: CoinbaseAccount[] = nonZero.map(a => {
    const balance = Number(a.balance?.amount || 0)
    const spot = priceMap[a.currency.code]
    return {
      id: a.id,
      name: a.name,
      primary: !!a.primary,
      type: a.type,
      currency_code: a.currency.code,
      balance_amount: balance,
      balance_usd: spot != null ? balance * spot : null,
      updated_at: a.updated_at,
    }
  })

  accounts.sort((x, y) => (y.balance_usd || 0) - (x.balance_usd || 0))
  return { accounts, error: null }
}

/** Full holdings summary — top-level card consumer. */
export async function getCoinbaseHoldings(): Promise<CoinbaseHoldingsSummary> {
  const configured = isCoinbaseConfigured()
  if (!configured) {
    return {
      configured: false,
      accounts: [],
      total_usd: 0,
      last_fetched_at: new Date().toISOString(),
      error: null,
    }
  }
  const { accounts, error } = await getCoinbaseAccounts()
  const total_usd = accounts.reduce((s, a) => s + (a.balance_usd || 0), 0)
  return {
    configured: true,
    accounts,
    total_usd,
    last_fetched_at: new Date().toISOString(),
    error,
  }
}

/** Diagnostic — for /api/coinbase/test and Integrations Hub. */
export async function pingCoinbase(): Promise<{ ok: boolean; status: number; error: string | null }> {
  if (!isCoinbaseConfigured()) return { ok: false, status: 0, error: 'not-configured' }
  const { status, error } = await coinbaseGet('/v2/user')
  return { ok: !error, status, error }
}
