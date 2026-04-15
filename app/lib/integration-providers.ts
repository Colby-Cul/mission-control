/**
 * Integration provider registry.
 *
 * Each entry describes:
 *   - `kind`: 'oauth' | 'api-key' | 'info-only' — drives which UI flow the
 *             Connect/Manage button triggers.
 *   - `envVars`: list of Vercel environment variable names that back this
 *                provider's credentials.
 *   - `connectHref`: (oauth only) URL to start the consent flow.
 *   - `docsUrl`: provider's own docs for how to get the key.
 *   - `keyFormat`: display hint shown next to the input (e.g. 'fka_...').
 *   - `testEndpoint`: optional — where to probe "is this key live?"
 *   - `rotateInstructions`: plain-English steps shown above the input.
 *
 * This file is imported from both server (page.tsx) and client
 * (IntegrationKeyModal) — keep it framework-free.
 */

export type IntegrationKind = 'api-key' | 'oauth' | 'info-only'

export interface IntegrationProvider {
  provider: string
  kind: IntegrationKind
  envVars: string[]
  connectHref?: string
  docsUrl?: string
  keyFormat?: string
  testEndpoint?: string
  rotateInstructions?: string
  multiTenant?: boolean
  tenants?: { tenant: string; label: string; envVars: string[] }[]
}

// Canonical registry — keyed by the `provider` slug used in KNOWN_INTEGRATIONS.
export const PROVIDERS: Record<string, IntegrationProvider> = {
  // ── AI Models ───────────────────────────────────────────────────────────
  'anthropic': {
    provider: 'anthropic',
    kind: 'api-key',
    envVars: ['ANTHROPIC_API_KEY'],
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyFormat: 'sk-ant-...',
    rotateInstructions:
      '1. Log into the Anthropic Console\n' +
      '2. Settings → API Keys\n' +
      '3. Click "Create Key" (or regenerate an existing one)\n' +
      '4. Copy the new key and paste it below',
  },
  'openai': {
    provider: 'openai',
    kind: 'api-key',
    envVars: ['OPENAI_API_KEY'],
    docsUrl: 'https://platform.openai.com/api-keys',
    keyFormat: 'sk-proj-... or sk-...',
    rotateInstructions:
      '1. Log into OpenAI Platform\n' +
      '2. API Keys → Create new secret key\n' +
      '3. Copy and paste below (OpenAI only shows the key once)',
  },
  'ollama': {
    provider: 'ollama',
    kind: 'info-only',
    envVars: [],
    docsUrl: 'https://ollama.com/download',
  },
  'openai-codex': {
    provider: 'openai-codex',
    kind: 'info-only',
    envVars: [],
    docsUrl: 'https://github.com/openai/codex-cli',
  },
  'exa': {
    provider: 'exa',
    kind: 'api-key',
    envVars: ['EXA_API_KEY'],
    docsUrl: 'https://dashboard.exa.ai/api-keys',
    keyFormat: '<uuid-like>',
  },

  // ── Messaging ───────────────────────────────────────────────────────────
  'telegram': {
    provider: 'telegram',
    kind: 'api-key',
    envVars: ['TELEGRAM_BOT_TOKEN'],
    docsUrl: 'https://t.me/BotFather',
    keyFormat: '<bot-id>:<hash>',
    rotateInstructions:
      '1. Open Telegram → chat with @BotFather\n' +
      '2. /mybots → select your bot → API Token\n' +
      '3. Use /revoke to rotate, then copy the new token',
  },
  'slack': {
    provider: 'slack',
    kind: 'oauth',
    envVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET', 'SLACK_SIGNING_SECRET'],
    connectHref: '/api/auth/slack',
    docsUrl: 'https://api.slack.com/apps',
  },
  'discord': {
    provider: 'discord',
    kind: 'api-key',
    envVars: ['DISCORD_BOT_TOKEN'],
    docsUrl: 'https://discord.com/developers/applications',
    keyFormat: '<bot-token>',
    rotateInstructions:
      '1. Open the Discord Developer Portal\n' +
      '2. Your App → Bot → Reset Token\n' +
      '3. Copy and paste below',
  },

  // ── STR / Rentals ───────────────────────────────────────────────────────
  'lodgify': {
    provider: 'lodgify',
    kind: 'api-key',
    envVars: ['LODGIFY_API_KEY'],
    docsUrl: 'https://developers.lodgify.com/',
    keyFormat: '<api-key>',
    rotateInstructions:
      '1. Log into Lodgify\n' +
      '2. Settings → Public API → Regenerate\n' +
      '3. Copy the new key and paste below',
  },
  'pricelabs': {
    provider: 'pricelabs',
    kind: 'api-key',
    envVars: ['PRICELABS_API_KEY'],
    docsUrl: 'https://app.pricelabs.co/account/api',
    keyFormat: '<api-key>',
  },

  // ── Business / Finance ──────────────────────────────────────────────────
  'monday-xome': {
    provider: 'monday-xome',
    kind: 'api-key',
    envVars: ['MONDAY_XOME_API_KEY'],
    docsUrl: 'https://developer.monday.com/api-reference/docs/authentication',
    keyFormat: 'eyJ... (JWT)',
    testEndpoint: 'https://api.monday.com/v2',
    rotateInstructions:
      '1. Log into Monday (Xome Home account)\n' +
      '2. Click your avatar → Developers → My Access Tokens\n' +
      '3. Delete the old token\n' +
      '4. Click Generate and paste the new one below',
  },
  'monday-culbertson': {
    provider: 'monday-culbertson',
    kind: 'api-key',
    envVars: ['MONDAY_CULBERTSON_API_KEY'],
    docsUrl: 'https://developer.monday.com/api-reference/docs/authentication',
    keyFormat: 'eyJ... (JWT)',
    testEndpoint: 'https://api.monday.com/v2',
    rotateInstructions:
      '1. Log into Monday (Culbertson & Culbertson account)\n' +
      '2. Avatar → Developers → My Access Tokens\n' +
      '3. Generate a new token, then paste it below',
  },
  'followupboss': {
    provider: 'followupboss',
    kind: 'api-key',
    envVars: ['FUB_API_KEY'],
    docsUrl: 'https://app.followupboss.com/2/admin/api',
    keyFormat: 'fka_...',
    testEndpoint: 'https://api.followupboss.com/v1/identity',
    rotateInstructions:
      '1. Log into Follow Up Boss → Admin → API\n' +
      '2. Revoke the old key (Remove)\n' +
      '3. Click "Create API Key"\n' +
      '4. Copy the new key and paste it below',
  },
  'quickbooks': {
    provider: 'quickbooks',
    kind: 'oauth',
    envVars: [
      'QUICKBOOKS_CLIENT_ID',
      'QUICKBOOKS_CLIENT_SECRET',
      'QUICKBOOKS_REDIRECT_URI',
      'QUICKBOOKS_ENV',
    ],
    connectHref: '/api/qb/connect?returnTo=/integrations',
    docsUrl: 'https://developer.intuit.com/app/developer/dashboard',
    rotateInstructions:
      '1. Log into developer.intuit.com\n' +
      '2. Create a new app (or use existing)\n' +
      '3. Under Keys & OAuth, copy Client ID and Client Secret\n' +
      '4. Add https://mc-merge-v7-latest.vercel.app/api/qb/callback to redirect URIs\n' +
      '5. Paste below',
  },
  'plaid': {
    provider: 'plaid',
    kind: 'api-key',
    envVars: [
      'PLAID_CLIENT_ID',
      'PLAID_SECRET',
      'PLAID_ENV',
      'PLAID_TOKEN_ENCRYPTION_KEY',
    ],
    docsUrl: 'https://dashboard.plaid.com/team/keys',
    keyFormat: 'see Plaid dashboard',
    rotateInstructions:
      '1. Log into the Plaid Dashboard\n' +
      '2. Team Settings → Keys\n' +
      '3. Copy Client ID + Secret for your target environment (sandbox/development/production)\n' +
      '4. Paste each value into the fields below',
  },
  'coinbase': {
    provider: 'coinbase',
    kind: 'oauth',
    envVars: ['COINBASE_CLIENT_ID', 'COINBASE_CLIENT_SECRET'],
    connectHref: undefined,
    docsUrl: 'https://www.coinbase.com/settings/api',
  },
  'canva': {
    provider: 'canva',
    kind: 'api-key',
    envVars: ['CANVA_API_KEY'],
    docsUrl: 'https://www.canva.dev/docs/connect/',
    keyFormat: '<api-key>',
  },
  'notion': {
    provider: 'notion',
    kind: 'oauth',
    envVars: ['NOTION_CLIENT_ID', 'NOTION_CLIENT_SECRET'],
    connectHref: undefined,
    docsUrl: 'https://www.notion.so/my-integrations',
  },
  'stripe': {
    provider: 'stripe',
    kind: 'api-key',
    envVars: ['STRIPE_SECRET_KEY'],
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    keyFormat: 'sk_live_... or sk_test_...',
    rotateInstructions:
      '1. Stripe Dashboard → Developers → API keys\n' +
      '2. Roll the key (or create a restricted key)\n' +
      '3. Paste the secret here',
  },

  // ── Google Workspace (OAuth family) ─────────────────────────────────────
  'google': {
    provider: 'google',
    kind: 'oauth',
    envVars: [
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_OAUTH_REDIRECT_URI',
    ],
    connectHref: '/api/auth/google',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  'gmail': {
    provider: 'gmail',
    kind: 'oauth',
    envVars: [
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_OAUTH_REDIRECT_URI',
    ],
    connectHref: '/api/auth/google',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
  },
  'google-calendar': {
    provider: 'google-calendar',
    kind: 'oauth',
    envVars: [
      'GOOGLE_OAUTH_CLIENT_ID',
      'GOOGLE_OAUTH_CLIENT_SECRET',
      'GOOGLE_OAUTH_REDIRECT_URI',
    ],
    connectHref: '/api/auth/google',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
  },

  // ── Infrastructure ──────────────────────────────────────────────────────
  'supabase': {
    provider: 'supabase',
    kind: 'info-only',
    envVars: [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ],
    docsUrl: 'https://supabase.com/dashboard/project/_/settings/api',
  },
  'vercel': {
    provider: 'vercel',
    kind: 'info-only',
    envVars: ['VERCEL_API_TOKEN'],
    docsUrl: 'https://vercel.com/account/tokens',
  },
  'grafana': {
    provider: 'grafana',
    kind: 'api-key',
    envVars: ['GRAFANA_API_KEY'],
    docsUrl: 'https://grafana.com/docs/grafana/latest/administration/api-keys/',
    keyFormat: '<api-key>',
  },
  'tailscale': {
    provider: 'tailscale',
    kind: 'info-only',
    envVars: [],
    docsUrl: 'https://login.tailscale.com/admin/machines',
  },
  'cloudflare': {
    provider: 'cloudflare',
    kind: 'info-only',
    envVars: ['CLOUDFLARE_API_TOKEN'],
    docsUrl: 'https://dash.cloudflare.com/profile/api-tokens',
  },

  // ── Dev Tools ───────────────────────────────────────────────────────────
  'github': {
    provider: 'github',
    kind: 'info-only',
    envVars: [],
    docsUrl: 'https://github.com/settings/tokens',
  },
  'brave': {
    provider: 'brave',
    kind: 'api-key',
    envVars: ['BRAVE_SEARCH_API_KEY'],
    docsUrl: 'https://brave.com/search/api/',
    keyFormat: '<api-key>',
  },
  'dropbox': {
    provider: 'dropbox',
    kind: 'oauth',
    envVars: ['DROPBOX_APP_KEY', 'DROPBOX_APP_SECRET'],
    connectHref: undefined,
    docsUrl: 'https://www.dropbox.com/developers/apps',
  },
  'fast.io': {
    provider: 'fast.io',
    kind: 'info-only',
    envVars: [],
    docsUrl: 'https://fast.io',
  },

  // ── Automation / Monitoring ─────────────────────────────────────────────
  'n8n': {
    provider: 'n8n',
    kind: 'api-key',
    envVars: ['N8N_API_KEY'],
    docsUrl: 'https://docs.n8n.io/api/',
    keyFormat: '<api-key>',
  },
  'spike.sh': {
    provider: 'spike.sh',
    kind: 'api-key',
    envVars: ['SPIKE_SH_API_KEY'],
    docsUrl: 'https://spike.sh/',
    keyFormat: '<api-key>',
  },

  // ── System / Local ──────────────────────────────────────────────────────
  'macos': {
    provider: 'macos',
    kind: 'info-only',
    envVars: [],
    docsUrl: 'https://support.apple.com/guide/mac-help/change-login-items-mtusr005/mac',
  },
}

/**
 * Lookup helper. Returns a generic fallback for unknown providers so the
 * calling UI never crashes — the modal will render a "Manual configuration
 * required" message.
 */
export function getProvider(slug: string | null | undefined): IntegrationProvider {
  const key = (slug ?? '').toLowerCase()
  const hit = PROVIDERS[key]
  if (hit) return hit
  return {
    provider: key || 'unknown',
    kind: 'info-only',
    envVars: [],
  }
}

export function isKnownProvider(slug: string | null | undefined): boolean {
  return !!PROVIDERS[(slug ?? '').toLowerCase()]
}
