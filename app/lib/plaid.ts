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
  const env = requireEnv('PLAID_ENV').toLowerCase() as keyof typeof PlaidEnvironments
  if (!PlaidEnvironments[env]) {
    throw new Error(`Invalid PLAID_ENV: ${env}. Must be sandbox|development|production.`)
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
