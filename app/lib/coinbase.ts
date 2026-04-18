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

/* ═════ Auth: HMAC (legacy v2 keys) or JWT/ES256 (CDP keys) ═══════════════ */
// If COINBASE_API_SECRET is a PEM-encoded EC private key (starts with
// "-----BEGIN"), we're using a Coinbase Developer Platform (CDP) key and must
// sign a JWT with ES256. Otherwise fall back to the legacy HMAC scheme.

function isCdpKey(): boolean {
  const secret = process.env.COINBASE_API_SECRET || ''
  return secret.includes('-----BEGIN')
}

function normalizePem(raw: string): string {
  // Vercel env often stores PEMs with literal `\n` instead of real newlines.
  return raw.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim()
}

function buildJwt(method: string, path: string): string {
  const keyName = process.env.COINBASE_API_KEY!
  const pem = normalizePem(process.env.COINBASE_API_SECRET!)
  const host = new URL(COINBASE_API_BASE).host
  // Strip query string from uri claim (Coinbase validates against path only).
  const pathNoQuery = path.split('?')[0]
  const uri = `${method} ${host}${pathNoQuery}`
  const now = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomBytes(16).toString('hex')
  const header = { alg: 'ES256', typ: 'JWT', kid: keyName, nonce }
  const payload = { sub: keyName, iss: 'cdp', nbf: now, exp: now + 120, uri }
  const encode = (o: object) =>
    Buffer.from(JSON.stringify(o)).toString('base64url')
  const signingInput = `${encode(header)}.${encode(payload)}`
  const sig = crypto.sign(
    'SHA256',
    Buffer.from(signingInput),
    { key: pem, dsaEncoding: 'ieee-p1363' },
  )
  return `${signingInput}.${sig.toString('base64url')}`
}

function hmacSign(timestamp: string, method: string, path: string, body = ''): string {
  const secret = process.env.COINBASE_API_SECRET!
  return crypto.createHmac('sha256', secret).update(timestamp + method + path + body).digest('hex')
}

async function coinbaseGet<T = unknown>(
  path: string,
): Promise<{ data: T | null; status: number; error: string | null }> {
  if (!isCoinbaseConfigured()) {
    return { data: null, status: 0, error: 'not-configured' }
  }
  const useJwt = isCdpKey()
  const headers: Record<string, string> = {
    'CB-VERSION': COINBASE_API_VERSION,
    Accept: 'application/json',
  }
  if (useJwt) {
    try {
      headers['Authorization'] = `Bearer ${buildJwt('GET', path)}`
    } catch (e) {
      return { data: null, status: 0, error: `jwt-sign-failed: ${String((e as Error).message)}` }
    }
  } else {
    const key = process.env.COINBASE_API_KEY!
    const timestamp = Math.floor(Date.now() / 1000).toString()
    headers['CB-ACCESS-KEY'] = key
    headers['CB-ACCESS-SIGN'] = hmacSign(timestamp, 'GET', path)
    headers['CB-ACCESS-TIMESTAMP'] = timestamp
  }
  try {
    const res = await fetch(`${COINBASE_API_BASE}${path}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
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

interface V3BrokerageAccountsResponse {
  accounts: Array<{
    uuid: string
    name: string
    currency: string
    available_balance: { value: string; currency: string }
    default: boolean
    active: boolean
    type: string
    ready: boolean
    updated_at: string
  }>
}

interface V3ProductResponse {
  price: string
  price_percentage_change_24h?: string
}

/** List all accounts (one per currency). Filters out zero balances by default. */
export async function getCoinbaseAccounts(opts: { includeZero?: boolean } = {}): Promise<
  { accounts: CoinbaseAccount[]; error: string | null }
> {
  // CDP (JWT) keys use v3 Advanced Trade endpoints; legacy HMAC keys use v2.
  const useV3 = isCdpKey()

  if (useV3) {
    const { data, error } = await coinbaseGet<V3BrokerageAccountsResponse>(
      '/api/v3/brokerage/accounts?limit=250',
    )
    if (!data || !Array.isArray(data.accounts)) {
      return { accounts: [], error: error || 'empty-response' }
    }
    const raw = data.accounts
    const nonZero = opts.includeZero
      ? raw
      : raw.filter(a => Number(a.available_balance?.value || 0) > 0)

    const uniqueCurrencies = Array.from(new Set(nonZero.map(a => a.currency)))
    const priceMap: Record<string, number | null> = {}
    await Promise.all(
      uniqueCurrencies.map(async code => {
        if (code === 'USD' || code === 'USDC') { priceMap[code] = 1; return }
        const resp = await coinbaseGet<V3ProductResponse>(
          `/api/v3/brokerage/products/${encodeURIComponent(code)}-USD`,
        )
        priceMap[code] = resp.data?.price ? Number(resp.data.price) : null
      }),
    )

    const accounts: CoinbaseAccount[] = nonZero.map(a => {
      const balance = Number(a.available_balance?.value || 0)
      const spot = priceMap[a.currency]
      return {
        id: a.uuid,
        name: a.name,
        primary: !!a.default,
        type: a.type,
        currency_code: a.currency,
        balance_amount: balance,
        balance_usd: spot != null ? balance * spot : null,
        updated_at: a.updated_at,
      }
    })
    accounts.sort((x, y) => (y.balance_usd || 0) - (x.balance_usd || 0))
    return { accounts, error: null }
  }

  // Legacy v2 path
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
  const path = isCdpKey() ? '/api/v3/brokerage/accounts?limit=1' : '/v2/user'
  const { status, error } = await coinbaseGet(path)
  return { ok: !error, status, error }
}
