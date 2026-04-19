/**
 * QuickBooks Online OAuth + API helpers.
 *
 * Server-only: imported from API routes and server components. Never in the
 * client bundle (contains secret handling).
 *
 * Env vars (set in Vercel):
 *   QUICKBOOKS_CLIENT_ID
 *   QUICKBOOKS_CLIENT_SECRET
 *   QUICKBOOKS_REDIRECT_URI   e.g. https://mc-merge-v7-latest.vercel.app/api/qb/callback
 *   QUICKBOOKS_ENV            'sandbox' (default) | 'production'
 *   SUPABASE_SERVICE_ROLE_KEY required for upsert under RLS — admin-only
 *
 * Storage: `quickbooks_connections` keyed by `company_key`. We now key each
 * row by an entity slug (e.g. `xome-home`, `culbertson-gray`) so the user can
 * connect multiple QuickBooks companies — one per entity. Each row carries its
 * own `realm_id`, `expires_at`, and `refresh_token_expires_at` so we can
 * detect a stale refresh_token (101-day lifetime) and force a reconnect.
 */
import { createClient } from '@supabase/supabase-js'

export const QB_SCOPE = 'com.intuit.quickbooks.accounting'
export const QB_TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
export const QB_AUTHORIZE_URL = 'https://appcenter.intuit.com/connect/oauth2'

/** Mission Control v7 uses a seed user until real auth lands; same pattern as google.ts. */
export function currentUserId(): string {
  return (
    process.env.NEXT_PUBLIC_SEED_USER_ID ||
    '00000000-0000-0000-0000-000000000001'
  )
}

export function isQbOAuthConfigured(): boolean {
  return !!(
    process.env.QUICKBOOKS_CLIENT_ID &&
    process.env.QUICKBOOKS_CLIENT_SECRET &&
    process.env.QUICKBOOKS_REDIRECT_URI
  )
}

/**
 * True when `SUPABASE_SERVICE_ROLE_KEY` is set. Writes into
 * `quickbooks_connections` require the service role to bypass RLS.
 */
export function isQbStorageWritable(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY
}

/**
 * Supabase admin (service-role) client for server-side writes under RLS.
 *
 * NOTE: for WRITE operations use `supabaseAdminStrict()` which throws when
 * the service role key is missing. Reads can still use this fallback-anon
 * client because the `quickbooks_connections` RLS policy permits SELECT for
 * everyone today.
 */
// Vercel sometimes stores SUPABASE_SERVICE_ROLE_KEY with a trailing literal
// `\n` (same issue we saw on PLAID_TOKEN_ENCRYPTION_KEY + the orchestrator).
// Supabase then rejects every request with "Invalid API key". Strip stray
// whitespace and non-JWT characters so the createClient call lands clean.
function normalizeJwt(raw: string | undefined | null): string {
  if (!raw) return ''
  return raw
    .replace(/\\n/g, '')          // literal backslash-n suffix
    .replace(/[^A-Za-z0-9._-]/g, '')  // drop any other non-JWT noise
    .trim()
}

export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey =
    normalizeJwt(process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    normalizeJwt(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Strict admin client: throws if the service role key isn't configured.
 * Use for writes — protects against silent insert-under-RLS failures.
 */
export function supabaseAdminStrict() {
  const key = normalizeJwt(process.env.SUPABASE_SERVICE_ROLE_KEY)
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY not configured — admin must set this in Vercel env to enable QB token storage',
    )
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Return sandbox or production base URL for v3 API calls. */
export function qbBaseUrl(realmId: string): string {
  const env = (process.env.QUICKBOOKS_ENV ?? 'sandbox').toLowerCase()
  const host =
    env === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com'
  return `${host}/v3/company/${encodeURIComponent(realmId)}`
}

export interface QbConnection {
  company_key: string
  realm_id: string | null
  access_token: string
  refresh_token: string
  expires_at: string
  refresh_token_expires_at: string | null
  scope: string | null
  token_type: string | null
  connected_at: string
  updated_at: string
}

/** Build the Intuit consent URL with CSRF-safe state. */
export function buildQbAuthUrl(state: string): string {
  const p = new URLSearchParams({
    client_id: process.env.QUICKBOOKS_CLIENT_ID!,
    response_type: 'code',
    scope: QB_SCOPE,
    redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
    state,
  })
  return `${QB_AUTHORIZE_URL}?${p.toString()}`
}

interface QbTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  x_refresh_token_expires_in: number
  token_type: string
  scope?: string
}

/** Basic auth header for the token endpoint. */
function basicAuthHeader(): string {
  const raw = `${process.env.QUICKBOOKS_CLIENT_ID}:${process.env.QUICKBOOKS_CLIENT_SECRET}`
  return 'Basic ' + Buffer.from(raw, 'utf8').toString('base64')
}

/** Exchange the authorization code for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<QbTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI!,
  })
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`QB token exchange failed (${res.status}): ${txt.slice(0, 200)}`)
  }
  return (await res.json()) as QbTokenResponse
}

/** Use the refresh_token to mint a fresh access_token. */
async function refreshAccessToken(refreshToken: string): Promise<QbTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  })
  const res = await fetch(QB_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`QB token refresh failed (${res.status}): ${txt.slice(0, 200)}`)
  }
  return (await res.json()) as QbTokenResponse
}

/**
 * Persist (upsert) a QB connection row for company_key.
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY`. Throws a descriptive error when that
 * env var is missing so the callback can bounce the user to an error page
 * rather than silently failing under RLS.
 */
export async function upsertQbConnection(input: {
  companyKey: string
  realmId: string | null
  accessToken: string
  refreshToken: string
  expiresAt: string
  refreshTokenExpiresAt: string | null
  scope?: string | null
  tokenType?: string | null
}): Promise<void> {
  // Strict admin — throws the SUPABASE_SERVICE_ROLE_KEY error message when unset.
  const sb = supabaseAdminStrict()
  const row = {
    company_key: input.companyKey,
    realm_id: input.realmId,
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
    expires_at: input.expiresAt,
    refresh_token_expires_at: input.refreshTokenExpiresAt,
    scope: input.scope ?? QB_SCOPE,
    token_type: input.tokenType ?? 'bearer',
    updated_at: new Date().toISOString(),
  }
  const { error } = await sb
    .from('quickbooks_connections')
    .upsert(row, { onConflict: 'company_key' })
  if (error) {
    console.error('[qb] upsert error', error)
    throw new Error(error.message)
  }
}

/** Load the QB connection for a company_key (null if none). */
export async function getQbConnection(companyKey: string): Promise<QbConnection | null> {
  if (!companyKey) return null
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from('quickbooks_connections')
      .select('*')
      .eq('company_key', companyKey)
      .maybeSingle()
    if (error) {
      console.error('[qb] getQbConnection error', error)
      return null
    }
    return (data as QbConnection | null) ?? null
  } catch (e) {
    console.error('[qb] getQbConnection threw', e)
    return null
  }
}

/** List every QB connection row — for the multi-connection admin view. */
export async function listQbConnections(): Promise<QbConnection[]> {
  try {
    const sb = supabaseAdmin()
    const { data, error } = await sb
      .from('quickbooks_connections')
      .select('*')
      .order('updated_at', { ascending: false })
    if (error) {
      console.error('[qb] listQbConnections error', error)
      return []
    }
    return (data as QbConnection[] | null) ?? []
  } catch (e) {
    console.error('[qb] listQbConnections threw', e)
    return []
  }
}

/** Delete a connection row. */
export async function deleteQbConnection(companyKey: string): Promise<void> {
  if (!companyKey) return
  try {
    const sb = isQbStorageWritable() ? supabaseAdminStrict() : supabaseAdmin()
    await sb.from('quickbooks_connections').delete().eq('company_key', companyKey)
  } catch (e) {
    console.error('[qb] delete threw', e)
  }
}

/** Best-effort log to agent_runs for OAuth / API debugging. Never throws. */
export async function logQbEvent(input: {
  kind: string
  status: 'ok' | 'error'
  detail?: unknown
}): Promise<void> {
  try {
    const sb = supabaseAdmin()
    await sb.from('agent_runs').insert({
      agent_id: null,
      status: input.status === 'ok' ? 'completed' : 'error',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      input: { source: 'quickbooks', kind: input.kind },
      output: (input.detail && typeof input.detail === 'object')
        ? (input.detail as Record<string, unknown>)
        : { detail: String(input.detail ?? '') },
      error: input.status === 'error' ? String(input.detail ?? '').slice(0, 500) : null,
      user_id: currentUserId(),
    })
  } catch {
    // swallow — logging must not break OAuth
  }
}

/**
 * Return a live access_token + realmId for a specific companyKey (entity
 * slug), refreshing if needed. Returns null if not connected or refresh_token
 * has expired.
 */
export async function getQbClient(
  companyKey: string,
): Promise<{ realmId: string; accessToken: string } | null> {
  if (!companyKey) return null
  const row = await getQbConnection(companyKey)
  if (!row || !row.realm_id) return null

  // Refresh-token expiration check (101 days from Intuit). If expired, drop the row.
  if (row.refresh_token_expires_at) {
    const rtExp = new Date(row.refresh_token_expires_at).getTime()
    if (rtExp <= Date.now()) {
      await deleteQbConnection(companyKey)
      await logQbEvent({
        kind: 'refresh-token-expired',
        status: 'error',
        detail: { companyKey, rtExp },
      })
      return null
    }
  }

  const expiresAtMs = row.expires_at ? new Date(row.expires_at).getTime() : 0
  const stillFresh = expiresAtMs - Date.now() > 5 * 60 * 1000 // 5 min window

  if (stillFresh) {
    return { realmId: row.realm_id, accessToken: row.access_token }
  }

  // Needs refresh
  try {
    const fresh = await refreshAccessToken(row.refresh_token)
    const now = Date.now()
    const newAccessExp = new Date(now + fresh.expires_in * 1000).toISOString()
    const newRefreshExp = fresh.x_refresh_token_expires_in
      ? new Date(now + fresh.x_refresh_token_expires_in * 1000).toISOString()
      : row.refresh_token_expires_at

    await upsertQbConnection({
      companyKey,
      realmId: row.realm_id,
      accessToken: fresh.access_token,
      refreshToken: fresh.refresh_token || row.refresh_token,
      expiresAt: newAccessExp,
      refreshTokenExpiresAt: newRefreshExp,
      scope: fresh.scope ?? row.scope,
      tokenType: fresh.token_type ?? row.token_type,
    })
    await logQbEvent({ kind: 'token-refresh', status: 'ok', detail: { companyKey } })
    return { realmId: row.realm_id, accessToken: fresh.access_token }
  } catch (e) {
    console.error('[qb] refresh failed', e)
    await logQbEvent({ kind: 'token-refresh', status: 'error', detail: String(e) })
    // Don't delete — caller decides. Return stale token; API will 401 and upstream can act.
    return { realmId: row.realm_id, accessToken: row.access_token }
  }
}

// ─── 60-second per-(companyKey,path) cache ────────────────────────────────────

interface CacheEntry {
  t: number
  data: unknown
}
const CACHE = new Map<string, CacheEntry>()
const CACHE_TTL_MS = 60_000

function cacheKey(companyKey: string, path: string): string {
  return `${companyKey}::${path}`
}

function cacheGet<T>(key: string): T | null {
  const hit = CACHE.get(key)
  if (!hit) return null
  if (Date.now() - hit.t > CACHE_TTL_MS) {
    CACHE.delete(key)
    return null
  }
  return hit.data as T
}

function cacheSet(key: string, data: unknown) {
  CACHE.set(key, { t: Date.now(), data })
}

/**
 * Low-level authed fetch against the QBO v3 API. Swallows every error and
 * returns null so server components never throw from a failed QB call.
 *
 * Keyed by `companyKey` (entity slug) so each entity has its own realm /
 * token cache.
 */
export async function qbFetch<T>(
  companyKey: string,
  path: string,
  opts: RequestInit = {},
): Promise<T | null> {
  if (!companyKey) return null
  const isGet = !opts.method || opts.method.toUpperCase() === 'GET'
  const key = cacheKey(companyKey, path)
  if (isGet) {
    const cached = cacheGet<T>(key)
    if (cached !== null) return cached
  }

  const client = await getQbClient(companyKey)
  if (!client) return null

  try {
    const url = `${qbBaseUrl(client.realmId)}/${path.replace(/^\//, '')}`
    const res = await fetch(url, {
      ...opts,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${client.accessToken}`,
        ...(opts.headers ?? {}),
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      await logQbEvent({
        kind: 'api-error',
        status: 'error',
        detail: { companyKey, path, status: res.status, body: txt.slice(0, 300) },
      })
      return null
    }
    const data = (await res.json()) as T
    if (isGet) cacheSet(key, data)
    return data
  } catch (e) {
    console.error('[qb] fetch threw', path, e)
    await logQbEvent({
      kind: 'api-exception',
      status: 'error',
      detail: { companyKey, path, error: String(e) },
    })
    return null
  }
}

// ─── Typed helpers (all entity-scoped) ────────────────────────────────────────

export async function getQbCompanyInfo(companyKey: string): Promise<any> {
  if (!companyKey) return null
  const client = await getQbClient(companyKey)
  if (!client) return null
  return qbFetch<any>(
    companyKey,
    `companyinfo/${encodeURIComponent(client.realmId)}?minorversion=70`,
  )
}

/** YTD default date range helper. */
function ytdRange(): { start: string; end: string } {
  const now = new Date()
  const start = `${now.getUTCFullYear()}-01-01`
  const end = now.toISOString().slice(0, 10)
  return { start, end }
}

export async function getQbProfitLoss(
  companyKey: string,
  startDate?: string,
  endDate?: string,
): Promise<any> {
  if (!companyKey) return null
  const r = ytdRange()
  const start = startDate ?? r.start
  const end = endDate ?? r.end
  const qs = new URLSearchParams({
    start_date: start,
    end_date: end,
    summarize_column_by: 'Total',
    minorversion: '70',
  })
  return qbFetch<any>(companyKey, `reports/ProfitAndLoss?${qs.toString()}`)
}

export async function getQbBalanceSheet(companyKey: string, asOf?: string): Promise<any> {
  if (!companyKey) return null
  const end = asOf ?? new Date().toISOString().slice(0, 10)
  const qs = new URLSearchParams({
    end_date: end,
    summarize_column_by: 'Total',
    minorversion: '70',
  })
  return qbFetch<any>(companyKey, `reports/BalanceSheet?${qs.toString()}`)
}

export async function getQbAccountsList(companyKey: string): Promise<any> {
  if (!companyKey) return null
  // QBO uses ?query=select * from Account
  const q = encodeURIComponent("select * from Account where Active = true")
  return qbFetch<any>(companyKey, `query?query=${q}&minorversion=70`)
}

export async function getQbRecentTransactions(
  companyKey: string,
  limit = 20,
): Promise<any> {
  if (!companyKey) return null
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 20))
  const q = encodeURIComponent(
    `select * from Purchase order by TxnDate DESC maxresults ${safeLimit}`,
  )
  return qbFetch<any>(companyKey, `query?query=${q}&minorversion=70`)
}

// ─── P&L / Balance Sheet parsers ──────────────────────────────────────────────

/** Intuit's report JSON is deeply nested — flatten to totals for widgets. */
export interface ParsedPL {
  totalIncome: number
  totalExpenses: number
  netIncome: number
  periodLabel: string
  currency: string
}

function findSectionTotal(rows: any[] | undefined, groupName: string): number {
  if (!rows || !Array.isArray(rows)) return 0
  for (const r of rows) {
    const name = String(r?.group ?? r?.Header?.ColData?.[0]?.value ?? '').toLowerCase()
    if (!name.includes(groupName.toLowerCase())) continue
    // Summary row total
    const sum = r?.Summary?.ColData
    if (Array.isArray(sum) && sum.length > 1) {
      const v = Number(sum[sum.length - 1]?.value ?? 0)
      if (!Number.isNaN(v)) return v
    }
  }
  return 0
}

function findRowWithName(rows: any[] | undefined, needle: string): number {
  if (!rows || !Array.isArray(rows)) return 0
  for (const r of rows) {
    const label = String(r?.ColData?.[0]?.value ?? '').toLowerCase()
    if (label.includes(needle.toLowerCase())) {
      const v = Number(r?.ColData?.[r.ColData.length - 1]?.value ?? 0)
      if (!Number.isNaN(v)) return v
    }
    // Recurse into subsections
    const childTotal = findRowWithName(r?.Rows?.Row, needle)
    if (childTotal) return childTotal
  }
  return 0
}

export function parseProfitLoss(raw: any): ParsedPL | null {
  if (!raw) return null
  const report = raw?.Rows?.Row ? raw : raw?.Header || raw
  const rows = raw?.Rows?.Row ?? report?.Rows?.Row
  if (!rows) return null

  const totalIncome = findSectionTotal(rows, 'Income') || findRowWithName(rows, 'Total Income')
  const totalExpenses = findSectionTotal(rows, 'Expenses') || findRowWithName(rows, 'Total Expenses')
  // Net Income often lives as its own summary row at the bottom
  const netIncome = findRowWithName(rows, 'Net Income') || totalIncome - totalExpenses

  const header = raw?.Header
  const periodLabel = [
    header?.StartPeriod,
    header?.EndPeriod,
  ].filter(Boolean).join(' → ') || 'YTD'
  const currency = header?.Currency ?? 'USD'

  return { totalIncome, totalExpenses, netIncome, periodLabel, currency }
}

export interface ParsedBS {
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  asOf: string
  currency: string
}

export function parseBalanceSheet(raw: any): ParsedBS | null {
  if (!raw) return null
  const rows = raw?.Rows?.Row
  if (!rows) return null

  const totalAssets =
    findSectionTotal(rows, 'ASSETS') ||
    findRowWithName(rows, 'Total Assets')
  const totalLiabilities =
    findSectionTotal(rows, 'Liabilities') ||
    findRowWithName(rows, 'Total Liabilities')
  const totalEquity =
    findSectionTotal(rows, 'Equity') ||
    findRowWithName(rows, 'Total Equity')

  const header = raw?.Header
  const asOf = header?.EndPeriod ?? new Date().toISOString().slice(0, 10)
  const currency = header?.Currency ?? 'USD'

  return { totalAssets, totalLiabilities, totalEquity, asOf, currency }
}
