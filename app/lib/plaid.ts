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
  const raw = requireEnv('PLAID_TOKEN_ENCRYPTION_KEY').trim()
  // Accept hex (64 chars) or base64 (44 chars including '=' padding)
  if (/^[0-9a-fA-F]{64}$/.test(raw)) return Buffer.from(raw, 'hex')
  const b = Buffer.from(raw, 'base64')
  if (b.length === 32) return b
  throw new Error('PLAID_TOKEN_ENCRYPTION_KEY must be 32 bytes (hex-64 or base64-44)')
}

export function encryptToken(plain: string): Buffer {
  const key = loadKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ct])
}

export function decryptToken(enc: Buffer): string {
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
}

export async function syncTransactionsForItem(
  client: PlaidApi,
  item: PlaidItemRow,
  supa: {
    from: (table: string) => {
      upsert: (rows: unknown, opts?: unknown) => Promise<{ error: { message: string } | null }>
      update: (row: unknown) => { eq: (col: string, val: string) => Promise<{ error: { message: string } | null }> }
      delete: () => { in: (col: string, vals: string[]) => Promise<{ error: { message: string } | null }> }
    }
  },
): Promise<SyncResult> {
  let accessToken: string
  try {
    accessToken = decryptToken(item.access_token_enc)
  } catch (e) {
    return { added: 0, modified: 0, removed: 0, error: `decrypt failed: ${e instanceof Error ? e.message : String(e)}` }
  }

  let cursor = item.cursor ?? undefined
  let added = 0
  let modified = 0
  let removed = 0
  const upsertBatch: Array<Record<string, unknown>> = []
  const modifyBatch: Array<Record<string, unknown>> = []
  const removedIds: string[] = []

  try {
    for (let i = 0; i < 20; i++) {
      const resp = await client.transactionsSync({
        access_token: accessToken,
        cursor,
        count: 500,
      })
      cursor = resp.data.next_cursor
      for (const t of resp.data.added ?? []) {
        upsertBatch.push({
          id: t.transaction_id,
          account_id: t.account_id,
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
        modifyBatch.push({
          id: t.transaction_id,
          account_id: t.account_id,
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

  if (upsertBatch.length > 0) {
    const { error } = await supa.from('financial_transactions').upsert(upsertBatch, { onConflict: 'id' })
    if (error) console.warn('[syncTxns] upsert added failed', error.message)
  }
  if (modifyBatch.length > 0) {
    const { error } = await supa.from('financial_transactions').upsert(modifyBatch, { onConflict: 'id' })
    if (error) console.warn('[syncTxns] upsert modified failed', error.message)
  }
  if (removedIds.length > 0) {
    const { error } = await supa.from('financial_transactions').delete().in('id', removedIds)
    if (error) console.warn('[syncTxns] delete removed failed', error.message)
  }

  const { error: updErr } = await supa.from('plaid_items').update({
    cursor: cursor ?? null,
    last_synced_at: new Date().toISOString(),
    error_code: null,
    error_message: null,
  }).eq('id', item.id)
  if (updErr) console.warn('[syncTxns] plaid_items update failed', updErr.message)

  return { added, modified, removed }
}
