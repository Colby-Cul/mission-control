/**
 * Plaid server-side client + encryption helpers.
 *
 * Env required (all in Vercel prod):
 *   PLAID_CLIENT_ID, PLAID_SECRET
 *   PLAID_ENV = 'sandbox' | 'development' | 'production'
 *   PLAID_TOKEN_ENCRYPTION_KEY = 32-byte hex (64 chars) or base64 of 32 random bytes
 *
 * access_tokens are NEVER stored in plaintext. We AES-256-GCM encrypt them
 * before writing to `plaid_items.access_token_enc` (bytea). The encryption
 * key stays only in Vercel env — anyone reading the DB sees ciphertext.
 */
import { Configuration, PlaidApi, PlaidEnvironments, type Products, CountryCode } from 'plaid'
import crypto from 'node:crypto'

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env: ${name}`)
  return v
}

export function plaidConfigured(): boolean {
  return !!(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET && process.env.PLAID_ENV)
}

export function getPlaidClient(): PlaidApi {
  const clientId = requireEnv('PLAID_CLIENT_ID')
  const secret = requireEnv('PLAID_SECRET')
  // Plaid SDK v42 dropped the 'development' tier — it was merged into
  // production. Accept the legacy value and alias it so deployments with
  // PLAID_ENV=development keep working.
  const raw = requireEnv('PLAID_ENV').toLowerCase().trim()
  const env = (raw === 'development' ? 'production' : raw) as keyof typeof PlaidEnvironments
  if (!PlaidEnvironments[env]) {
    throw new Error(`Invalid PLAID_ENV: "${raw}". Must be sandbox|production (legacy "development" aliased to production).`)
  }
  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId,
        'PLAID-SECRET': secret,
        'Plaid-Version': '2020-09-14',
      },
    },
  })
  return new PlaidApi(configuration)
}

// ── Encryption: AES-256-GCM. key = 32 bytes. iv = 12 bytes. tag = 16 bytes. ──
// Wire format written to bytea: iv (12) || tag (16) || ciphertext (N)

function loadKey(): Buffer {
  // Env may contain literal \n / \r escape sequences from sloppy paste, or
  // surrounding quotes. Normalize before validating.
  const raw = requireEnv('PLAID_TOKEN_ENCRYPTION_KEY')
    .replace(/\\[nrt]/g, '')    // literal backslash-n, backslash-r, backslash-t
    .replace(/^["']|["']$/g, '') // surrounding quotes
    .trim()
  // Accept hex (64 chars) or base64 (22-44 chars decoding to 32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  // Try URL-safe base64 first (handles - and _), padding agnostic
  const padded = raw + '='.repeat((4 - raw.length % 4) % 4)
  const b64 = Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
  if (b64.length === 32) return b64
  const b = Buffer.from(raw, 'base64')
  if (b.length === 32) return b
  throw new Error(`PLAID_TOKEN_ENCRYPTION_KEY must be 32 bytes (got hex-len=${raw.length}, b64-bytes=${b.length})`)
}

// Legacy v6 format: rows written by ~/mission-control stored the ciphertext
// as a UTF-8 string "aes256:<iv-hex>:<tag-hex>:<ct-hex>" inside a bytea column.
// The key in env was used as a passphrase, not raw bytes — scrypt-stretched
// with fixed salt 'plaid-token-salt' to derive the 32-byte AES key. IV was
// 16 bytes, not 12. We keep decrypt compatibility so the 7 existing items
// still work.

function legacyV6Key(): Buffer {
  // v6 originally encrypted with a passphrase that included an actual newline
  // character. When Vercel stores the env var, that newline round-trips as
  // the two-char sequence `\n`. To recover the original passphrase bytes we
  // must interpret the literal `\n` / `\r` / `\t` as their escape codes
  // (NOT strip them, which is what v7-native loadKey does).
  const raw = requireEnv('PLAID_TOKEN_ENCRYPTION_KEY')
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
  return crypto.scryptSync(raw, 'plaid-token-salt', 32)
}

function decryptV6Legacy(cipherText: string): string {
  const prefixed = cipherText.startsWith('aes256:') ? cipherText.slice(7) : cipherText
  const parts = prefixed.split(':')
  if (parts.length !== 3) throw new Error('legacy: expected aes256:iv:tag:ct (3 segments)')
  const [ivHex, tagHex, dataHex] = parts
  const key = legacyV6Key()
  const iv = Buffer.from(ivHex, 'hex')
  const tag = Buffer.from(tagHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(dataHex, 'hex'), decipher.final()])
  return plain.toString('utf8')
}

// v7 native format (what new exchanges write): raw binary in bytea,
// iv(12) || tag(16) || ciphertext(N), key loaded as raw 32 bytes.

export function encryptToken(plain: string): Buffer {
  const key = loadKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct])
}

export function decryptToken(enc: Buffer): string {
  // Detect v6 legacy: the first 7 bytes are the ASCII of "aes256:".
  // ASCII 'a'=0x61 'e'=0x65 's'=0x73 '2'=0x32 '5'=0x35 '6'=0x36 ':'=0x3A
  if (enc.length >= 7 &&
      enc[0] === 0x61 && enc[1] === 0x65 && enc[2] === 0x73 &&
      enc[3] === 0x32 && enc[4] === 0x35 && enc[5] === 0x36 &&
      enc[6] === 0x3a) {
    return decryptV6Legacy(enc.toString('utf8'))
  }
  // Native v7 binary format
  const key = loadKey()
  const iv = enc.subarray(0, 12)
  const tag = enc.subarray(12, 28)
  const ct = enc.subarray(28)
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  const plain = Buffer.concat([decipher.update(ct), decipher.final()])
  return plain.toString('utf8')
}

// ── Product presets ──────────────────────────────────────────────────────────
// 'bank' → transactions + auth (ACH account/routing).
// 'brokerage' → investments + investment transactions.

export function productsFor(product: 'bank' | 'brokerage'): Products[] {
  if (product === 'brokerage') {
    return ['investments' as Products]
  }
  return ['transactions' as Products]
}

export const PLAID_COUNTRIES: CountryCode[] = ['US' as CountryCode]

// ── Webhook URL ──────────────────────────────────────────────────────────────
// The URL Plaid POSTs to when transactions/items change. Prefer PLAID_WEBHOOK_URL
// (set once in Vercel env), fall back to VERCEL_URL, final fallback to the
// known prod alias. Must be HTTPS and publicly reachable.

export function getWebhookUrl(): string {
  const explicit = process.env.PLAID_WEBHOOK_URL?.trim()
  if (explicit) return explicit
  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) return `https://${vercel.replace(/^https?:\/\//, '')}/api/plaid/webhook`
  return 'https://mc-merge-v7.vercel.app/api/plaid/webhook'
}

// ── OAuth Redirect URI ───────────────────────────────────────────────────────
// Required for OAuth-based institutions (Schwab, Chase, Citi, etc.) that
// redirect the user to the bank's login page, then back to us. Must match
// an entry in Plaid Dashboard → Team Settings → API → Allowed redirect URIs.

export function getRedirectUri(): string {
  const explicit = process.env.PLAID_REDIRECT_URI?.trim()
  if (explicit) return explicit
  return 'https://mc-merge-v7.vercel.app/'
}

// ── Shared transactions sync ─────────────────────────────────────────────────
// Used by: initial exchange, webhook handler (SYNC_UPDATES_AVAILABLE), safety
// cron. Pulls from /transactions/sync with the stored cursor, paginates until
// has_more=false, upserts into financial_transactions, updates cursor +
// last_synced_at. Returns { added, modified, removed } counts.

export interface PlaidItemRow {
  id: string
  access_token_enc: Buffer
  account_scope: string
  entity_id: string | null
  cursor: string | null
}

export interface SyncResult {
  added: number
  modified: number
  removed: number
  error?: string
  // Diagnostic counters
  accountsMapped?: number
  plaidAdded?: number
  plaidModified?: number
  plaidRemoved?: number
  skippedUnmapped?: number
  pagesFetched?: number
}

export async function syncTransactionsForItem(
  client: PlaidApi,
  item: PlaidItemRow,
  supa: {
    from: (table: string) => {
      upsert: (rows: unknown, opts?: unknown) => Promise<{ error: { message: string } | null }>
      update: (row: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> }
      delete: () => { in: (col: string, vals: string[]) => Promise<{ error: { message: string } | null }> }
      select: (cols?: string) => {
        eq: (col: string, val: string) => Promise<{ data: Array<Record<string, unknown>> | null; error: { message: string } | null }>
      }
    }
  },
): Promise<SyncResult> {
  let accessToken: string
  try {
    accessToken = decryptToken(item.access_token_enc)
  } catch (e) {
    return { added: 0, modified: 0, removed: 0, error: `decrypt failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  // financial_accounts.id is an internal UUID; Plaid returns its own
  // account_id. We must translate Plaid's id → our UUID before writing txns
  // or the FK (financial_transactions.account_id → financial_accounts.id)
  // rejects the insert. v6 wrote all 23 existing accounts with UUID PKs.
  const { data: accts, error: acctErr } = await supa
    .from('financial_accounts')
    .select('id, plaid_account_id')
    .eq('plaid_item_id', item.id)
  if (acctErr) {
    return { added: 0, modified: 0, removed: 0, error: `account lookup failed: ${acctErr.message}` }
  }
  const plaidToUuid = new Map<string, string>()
  for (const a of (accts ?? []) as Array<{ id: string; plaid_account_id: string }>) {
    plaidToUuid.set(a.plaid_account_id, a.id)
  }

  let cursor = item.cursor ?? undefined
  let added = 0
  let modified = 0
  let removed = 0
  let skippedUnmapped = 0
  let plaidAdded = 0
  let plaidModified = 0
  let plaidRemoved = 0
  let pagesFetched = 0
  const upsertBatch: Array<Record<string, unknown>> = []
  const modifyBatch: Array<Record<string, unknown>> = []
  const removedIds: string[] = []

  // If we have no cursor yet (fresh item or reset), use /transactions/get for
  // a historical pull — /transactions/sync will return empty when Plaid has
  // already acknowledged everything via our past cursor advances.
  if (!cursor) {
    try {
      const endDate = new Date().toISOString().slice(0, 10)
      const startDate = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      let offset = 0
      const PAGE = 500
      while (offset < 10_000) {
        const resp = await client.transactionsGet({
          access_token: accessToken,
          start_date: startDate,
          end_date: endDate,
          options: { count: PAGE, offset },
        })
        pagesFetched++
        const page = resp.data.transactions ?? []
        plaidAdded += page.length
        for (const t of page) {
          const accountUuid = plaidToUuid.get(t.account_id)
          if (!accountUuid) { skippedUnmapped++; continue }
          upsertBatch.push({
            id: t.transaction_id,
            account_id: accountUuid,
            plaid_transaction_id: t.transaction_id,
            date: t.date,
            datetime: t.datetime ?? null,
            name: t.name,
            merchant_name: t.merchant_name ?? null,
            amount: t.amount,
            currency_code: t.iso_currency_code ?? 'USD',
            category: t.category ?? null,
            personal_finance_category: t.personal_finance_category?.primary ?? null,
            pending: t.pending ?? false,
            account_scope: item.account_scope,
            entity_id: item.entity_id,
          })
        }
        const total = resp.data.total_transactions
        offset += page.length
        if (offset >= total || page.length === 0) break
      }
    } catch (e) {
      // Fall through — the /transactions/sync loop below is a no-op if we get
      // here with upsertBatch populated, OR it may succeed if transactions/get
      // failed but sync works.
      console.warn('[syncTxns] transactionsGet failed', e instanceof Error ? e.message : String(e))
    }
  }

  try {
    for (let i = 0; i < 20; i++) {
      const resp = await client.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
      })
      pagesFetched++
      cursor = resp.data.next_cursor
      plaidAdded += (resp.data.added ?? []).length
      plaidModified += (resp.data.modified ?? []).length
      plaidRemoved += (resp.data.removed ?? []).length
      for (const t of resp.data.added ?? []) {
        const accountUuid = plaidToUuid.get(t.account_id)
        if (!accountUuid) { skippedUnmapped++; continue }
        upsertBatch.push({
          id: t.transaction_id,
          account_id: accountUuid,
          plaid_transaction_id: t.transaction_id,
          date: t.date,
          datetime: t.datetime ?? null,
          name: t.name,
          merchant_name: t.merchant_name ?? null,
          amount: t.amount,
          currency_code: t.iso_currency_code ?? 'USD',
          category: t.category ?? null,
          personal_finance_category: t.personal_finance_category?.primary ?? null,
          pending: t.pending ?? false,
          account_scope: item.account_scope,
          entity_id: item.entity_id,
        })
      }
      for (const t of resp.data.modified ?? []) {
        const accountUuid = plaidToUuid.get(t.account_id)
        if (!accountUuid) { skippedUnmapped++; continue }
        modifyBatch.push({
          id: t.transaction_id,
          account_id: accountUuid,
          plaid_transaction_id: t.transaction_id,
          date: t.date,
          datetime: t.datetime ?? null,
          name: t.name,
          merchant_name: t.merchant_name ?? null,
          amount: t.amount,
          currency_code: t.iso_currency_code ?? 'USD',
          category: t.category ?? null,
          personal_finance_category: t.personal_finance_category?.primary ?? null,
          pending: t.pending ?? false,
          account_scope: item.account_scope,
          entity_id: item.entity_id,
        })
      }
      for (const r of resp.data.removed ?? []) {
        if (r.transaction_id) removedIds.push(r.transaction_id)
      }
      if (!resp.data.has_more) break
    }
  } catch (e) {
    return { added, modified, removed, error: `transactionsSync failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  added = upsertBatch.length
  modified = modifyBatch.length
  removed = removedIds.length

  let upsertErr: string | undefined
  if (upsertBatch.length > 0) {
    const { error } = await supa.from('financial_transactions').upsert(upsertBatch, { onConflict: 'id' })
    if (error) {
      console.warn('[syncTxns] upsert added failed', error.message)
      upsertErr = error.message
    }
  }
  if (modifyBatch.length > 0) {
    const { error } = await supa.from('financial_transactions').upsert(modifyBatch, { onConflict: 'id' })
    if (error) {
      console.warn('[syncTxns] upsert modified failed', error.message)
      upsertErr = upsertErr || error.message
    }
  }
  if (removedIds.length > 0) {
    const { error } = await supa.from('financial_transactions').delete().in('id', removedIds)
    if (error) console.warn('[syncTxns] delete removed failed', error.message)
  }

  // Only advance the cursor if all writes succeeded. If upsert failed, keep
  // the old cursor so the next sync re-pulls the same window. (This is why
  // the 2,047 txns disappeared on the first back-fill — we advanced past
  // them even though the FK violation dropped all writes.)
  const updatePayload: Record<string, unknown> = {
    last_synced_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  }
  if (!upsertErr) updatePayload.cursor = cursor ?? null
  const { error: updErr } = await supa.from('plaid_items').update(updatePayload).eq('id', item.id)
  if (updErr) console.warn('[syncTxns] plaid_items update failed', updErr.message)

  // Surface unmapped accounts and upsert errors so register-webhooks /
  // sync-all responses tell us what broke instead of lying about success.
  const issues: string[] = []
  if (skippedUnmapped > 0) issues.push(`${skippedUnmapped} txns skipped (no matching financial_accounts row for their Plaid account_id)`)
  if (upsertErr) issues.push(`upsert: ${upsertErr}`)

  return {
    added: upsertErr ? 0 : added,
    modified: upsertErr ? 0 : modified,
    removed,
    ...(issues.length > 0 ? { error: issues.join('; ') } : {}),
    accountsMapped: plaidToUuid.size,
    plaidAdded,
    plaidModified,
    plaidRemoved,
    skippedUnmapped,
    pagesFetched,
  }
}
