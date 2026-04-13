const crypto = require("crypto");
const { execFileSync } = require("child_process");
const { supabaseRest, supabaseUpsert, supabaseDelete } = require("./supabase");

// ── Intuit OAuth Endpoints ──────────────────────────────────────────────────
const QUICKBOOKS_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QUICKBOOKS_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const QUICKBOOKS_SCOPES = (process.env.QUICKBOOKS_SCOPES || "com.intuit.quickbooks.accounting")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);
const QUICKBOOKS_REDIRECT_URI =
  process.env.QUICKBOOKS_REDIRECT_URI ||
  "https://mission-control-peach-omega.vercel.app/api/qb/callback";

// ── QuickBooks API ──────────────────────────────────────────────────────────
const QB_SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com";
const QB_PROD_BASE = "https://quickbooks.api.intuit.com";
const QB_API_BASE = process.env.QB_PRODUCTION === "1" ? QB_PROD_BASE : QB_SANDBOX_BASE;
const QB_API_VERSION = "v3";

// Rate-limit: Intuit allows 500 req/min per realm. We enforce a conservative
// per-process token-bucket (burst 40, refill 8/s ≈ 480/min).
const RATE_BUCKET_MAX = 40;
const RATE_REFILL_PER_SEC = 8;
let _rateBucket = RATE_BUCKET_MAX;
let _rateLastRefill = Date.now();

function _refillBucket() {
  const now = Date.now();
  const elapsed = (now - _rateLastRefill) / 1000;
  _rateBucket = Math.min(RATE_BUCKET_MAX, _rateBucket + elapsed * RATE_REFILL_PER_SEC);
  _rateLastRefill = now;
}

function _consumeToken() {
  _refillBucket();
  if (_rateBucket < 1) return false;
  _rateBucket -= 1;
  return true;
}

// ── Client Credentials ──────────────────────────────────────────────────────

function getClientCredentialFromKeychain(service) {
  try {
    return execFileSync(
      "security",
      ["find-generic-password", "-s", service, "-a", "jarvis", "-w"],
      { encoding: "utf8" }
    ).trim();
  } catch {
    return "";
  }
}

function getQuickBooksClientConfig() {
  const clientId = (
    process.env.QUICKBOOKS_CLIENT_ID ||
    (process.platform === "darwin"
      ? getClientCredentialFromKeychain("quickbooks-client-id")
      : "")
  ).trim();
  const clientSecret = (
    process.env.QUICKBOOKS_CLIENT_SECRET ||
    (process.platform === "darwin"
      ? getClientCredentialFromKeychain("quickbooks-client-secret")
      : "")
  ).trim();

  return {
    clientId,
    clientSecret,
    redirectUri: QUICKBOOKS_REDIRECT_URI,
    scopes: QUICKBOOKS_SCOPES,
  };
}

function requireClientConfig() {
  const config = getQuickBooksClientConfig();

  if (!config.clientId || !config.clientSecret) {
    const error = new Error(
      "Missing QuickBooks client credentials. Set QUICKBOOKS_CLIENT_ID and QUICKBOOKS_CLIENT_SECRET in Vercel."
    );
    error.statusCode = 500;
    throw error;
  }

  return config;
}

// ── CSRF State ──────────────────────────────────────────────────────────────

function makeState(payload = {}) {
  const nonce = crypto.randomBytes(24).toString("hex");
  const encoded = Buffer.from(JSON.stringify({ nonce, ...payload })).toString(
    "base64url"
  );
  return { nonce, encoded };
}

function parseState(value) {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

// ── Cookie Helpers ──────────────────────────────────────────────────────────

function getCookies(req) {
  const raw = req.headers.cookie || "";
  return raw.split(";").reduce((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly !== false) parts.push("HttpOnly");
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure !== false) parts.push("Secure");

  const existing = res.getHeader("Set-Cookie");
  const next = existing
    ? Array.isArray(existing)
      ? existing.concat(parts.join("; "))
      : [existing, parts.join("; ")]
    : parts.join("; ");

  res.setHeader("Set-Cookie", next);
}

function clearCookie(res, name, path = "/") {
  setCookie(res, name, "", { maxAge: 0, path });
}

// ── HTTP Helpers ────────────────────────────────────────────────────────────

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

function getIntuitTid(response) {
  return response.headers.get("intuit_tid") || null;
}

async function parseQuickBooksResponse(response) {
  const intuitTid = getIntuitTid(response);
  let data = {};
  try {
    data = await response.json();
  } catch {}
  return { data, intuitTid };
}

// ── Token Exchange & Revocation ─────────────────────────────────────────────

async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = requireClientConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const { data, intuitTid } = await parseQuickBooksResponse(response);

  if (!response.ok) {
    const error = new Error(data.error_description || data.error || "Token exchange failed");
    error.statusCode = response.status;
    error.details = data;
    error.intuitTid = intuitTid;
    throw error;
  }

  return data;
}

async function refreshAccessToken(companyKey) {
  const connection = await loadConnection(companyKey);
  if (!connection) {
    throw new Error(`No QuickBooks connection found for key: ${companyKey}`);
  }

  const { clientId, clientSecret } = requireClientConfig();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: connection.refresh_token,
  });

  const response = await fetch(QUICKBOOKS_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const { data, intuitTid } = await parseQuickBooksResponse(response);

  if (!response.ok) {
    const error = new Error(data.error_description || data.error || "Token refresh failed");
    error.statusCode = response.status;
    error.details = data;
    error.intuitTid = intuitTid;
    throw error;
  }

  // Persist the refreshed tokens
  const now = new Date();
  const updatedRecord = {
    company_key: companyKey,
    realm_id: connection.realm_id,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type || "bearer",
    scope: data.scope || connection.scope,
    expires_at: new Date(now.getTime() + data.expires_in * 1000).toISOString(),
    refresh_token_expires_at: data.x_refresh_token_expires_in
      ? new Date(now.getTime() + data.x_refresh_token_expires_in * 1000).toISOString()
      : connection.refresh_token_expires_at,
    updated_at: now.toISOString(),
  };

  await storeConnection(companyKey, updatedRecord);

  return { accessToken: data.access_token, expiresIn: data.expires_in };
}

async function revokeToken(token) {
  const { clientId, clientSecret } = requireClientConfig();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({ token });

  const response = await fetch(QUICKBOOKS_REVOKE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const { data, intuitTid } = await parseQuickBooksResponse(response);

  if (response.status === 200) {
    return { revoked: true };
  }

  const error = new Error(data.error_description || data.error || "Token revocation failed");
  error.statusCode = response.status;
  error.details = data;
  error.intuitTid = intuitTid;
  throw error;
}

// ── Connection Storage (Supabase primary, Keychain fallback) ────────────────

async function storeConnection(companyKey, record) {
  const row = {
    company_key: companyKey,
    realm_id: record.realm_id || record.realmId || null,
    access_token: record.access_token || record.accessToken,
    refresh_token: record.refresh_token || record.refreshToken,
    token_type: record.token_type || record.tokenType || "bearer",
    scope: record.scope || null,
    expires_at: record.expires_at || record.expiresAt
      || new Date(Date.now() + (record.expiresIn || 3600) * 1000).toISOString(),
    refresh_token_expires_at: record.refresh_token_expires_at || record.refreshTokenExpiresAt
      || (record.refreshTokenExpiresIn
        ? new Date(Date.now() + record.refreshTokenExpiresIn * 1000).toISOString()
        : null),
    connected_at: record.connected_at || record.connectedAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await supabaseUpsert("quickbooks_connections", row);
    return { stored: true, store: "supabase" };
  } catch (supaError) {
    // Fallback to Keychain on local dev
    if (process.platform === "darwin") {
      const kcResult = _storeConnectionInKeychain(companyKey, record);
      return { stored: kcResult.stored, store: kcResult.store, supabaseError: supaError.message };
    }
    return { stored: false, store: "none", error: supaError.message };
  }
}

async function loadConnection(companyKey) {
  if (!companyKey) return null;

  try {
    const rows = await supabaseRest("quickbooks_connections", {
      query: `company_key=eq.${encodeURIComponent(companyKey)}&limit=1`,
    });
    if (rows && rows.length > 0) return rows[0];
  } catch {
    // Supabase unavailable — fall through to Keychain
  }

  // Keychain fallback for local dev
  if (process.platform === "darwin") {
    return _loadConnectionFromKeychain(companyKey);
  }

  return null;
}

async function loadAllConnections() {
  try {
    const rows = await supabaseRest("quickbooks_connections", {
      query: "order=updated_at.desc",
    });
    return rows || [];
  } catch {
    return [];
  }
}

async function deleteConnection(companyKey) {
  if (!companyKey) return { deleted: false };

  try {
    await supabaseDelete(
      "quickbooks_connections",
      `company_key=eq.${encodeURIComponent(companyKey)}`
    );
    // Also clean Keychain if local
    if (process.platform === "darwin") {
      _deleteConnectionFromKeychain(companyKey);
    }
    return { deleted: true, store: "supabase" };
  } catch (supaError) {
    if (process.platform === "darwin") {
      const kcResult = _deleteConnectionFromKeychain(companyKey);
      return { deleted: kcResult.deleted, store: kcResult.store, supabaseError: supaError.message };
    }
    return { deleted: false, store: "none", error: supaError.message };
  }
}

// ── Keychain Helpers (local dev fallback) ───────────────────────────────────

function _getConnectionServiceName(key) {
  return `quickbooks-oauth-${key}`;
}

function _storeConnectionInKeychain(key, payload) {
  if (!key || process.platform !== "darwin") {
    return { stored: false, store: "none" };
  }
  try {
    execFileSync(
      "security",
      [
        "add-generic-password", "-U",
        "-a", "jarvis",
        "-s", _getConnectionServiceName(key),
        "-w", JSON.stringify(payload),
      ],
      { encoding: "utf8" }
    );
    return { stored: true, store: "macos-keychain", service: _getConnectionServiceName(key) };
  } catch (error) {
    return { stored: false, store: "macos-keychain", error: error.message };
  }
}

function _loadConnectionFromKeychain(key) {
  if (!key || process.platform !== "darwin") return null;
  try {
    const raw = execFileSync(
      "security",
      ["find-generic-password", "-s", _getConnectionServiceName(key), "-a", "jarvis", "-w"],
      { encoding: "utf8" }
    ).trim();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function _deleteConnectionFromKeychain(key) {
  if (!key || process.platform !== "darwin") {
    return { deleted: false, store: "none" };
  }
  try {
    execFileSync(
      "security",
      ["delete-generic-password", "-s", _getConnectionServiceName(key), "-a", "jarvis"],
      { encoding: "utf8" }
    );
    return { deleted: true, store: "macos-keychain", service: _getConnectionServiceName(key) };
  } catch {
    return { deleted: false, store: "macos-keychain", service: _getConnectionServiceName(key) };
  }
}

// ── QuickBooks API Client ───────────────────────────────────────────────────

const ALLOWED_QB_ENTITIES = new Set([
  "Account", "Bill", "BillPayment", "Budget", "Class", "CompanyInfo",
  "CreditMemo", "Customer", "Department", "Deposit", "Employee",
  "Estimate", "Invoice", "Item", "JournalEntry", "Payment",
  "PaymentMethod", "Purchase", "PurchaseOrder", "RefundReceipt",
  "SalesReceipt", "TaxCode", "TaxRate", "Term", "TimeActivity",
  "Transfer", "Vendor", "VendorCredit",
]);

const ALLOWED_QB_REPORTS = new Set([
  "ProfitAndLoss", "ProfitAndLossDetail", "BalanceSheet", "BalanceSheetDetail",
  "CashFlow", "TrialBalance", "GeneralLedger", "AccountList",
  "TransactionList", "CustomerIncome", "CustomerBalance", "CustomerBalanceDetail",
  "VendorBalance", "VendorBalanceDetail", "VendorExpenses",
  "AgedPayableDetail", "AgedPayables", "AgedReceivableDetail", "AgedReceivables",
]);

function validateEntity(entity) {
  if (!entity || typeof entity !== "string") {
    throw Object.assign(new Error("Entity name is required"), { statusCode: 400 });
  }
  const normalized = entity.charAt(0).toUpperCase() + entity.slice(1);
  if (!ALLOWED_QB_ENTITIES.has(normalized)) {
    throw Object.assign(
      new Error(`Invalid QuickBooks entity: ${entity}`),
      { statusCode: 400 }
    );
  }
  return normalized;
}

function validateReportName(name) {
  if (!name || typeof name !== "string") {
    throw Object.assign(new Error("Report name is required"), { statusCode: 400 });
  }
  if (!ALLOWED_QB_REPORTS.has(name)) {
    throw Object.assign(
      new Error(`Invalid QuickBooks report: ${name}`),
      { statusCode: 400 }
    );
  }
  return name;
}

function sanitizeQueryWhere(where) {
  if (!where) return "";
  // Strip characters that could break out of a QB query string
  return where.replace(/[;\-\-\/\*]/g, "").trim();
}

async function qbApiCall(companyKey, { method = "GET", path, body } = {}) {
  const connection = await loadConnection(companyKey);
  if (!connection) {
    throw Object.assign(new Error("No QuickBooks connection found"), { statusCode: 401 });
  }

  // Auto-refresh if token expired or expiring within 2 minutes
  let accessToken = connection.access_token;
  const expiresAt = new Date(connection.expires_at).getTime();
  if (Date.now() > expiresAt - 120_000) {
    const refreshed = await refreshAccessToken(companyKey);
    accessToken = refreshed.accessToken;
  }

  // Rate limiting
  if (!_consumeToken()) {
    throw Object.assign(
      new Error("QuickBooks API rate limit exceeded — try again shortly"),
      { statusCode: 429 }
    );
  }

  const realmId = connection.realm_id;
  const url = `${QB_API_BASE}/${QB_API_VERSION}/company/${realmId}${path}`;

  const options = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const { data, intuitTid } = await parseQuickBooksResponse(response);

  // Handle Intuit 429 with retry-after
  if (response.status === 429) {
    const retryAfter = response.headers.get("Retry-After") || "60";
    throw Object.assign(
      new Error(`Intuit rate limit hit. Retry after ${retryAfter}s`),
      { statusCode: 429, retryAfter: Number(retryAfter), intuitTid }
    );
  }

  if (!response.ok) {
    const errMsg = data?.Fault?.Error?.[0]?.Detail
      || data?.Fault?.Error?.[0]?.Message
      || JSON.stringify(data);
    throw Object.assign(
      new Error(`QuickBooks API error (${response.status}): ${errMsg}`),
      { statusCode: response.status, intuitTid, details: data }
    );
  }

  return { data, intuitTid, status: response.status };
}

// ── Request Body Reader ─────────────────────────────────────────────────────

async function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

// ── Webhook Signature Verification ──────────────────────────────────────────

function verifyIntuitWebhookSignature(payload, signature, webhookVerifierToken) {
  if (!webhookVerifierToken) return false;
  const expected = crypto
    .createHmac("sha256", webhookVerifierToken)
    .update(payload)
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ""));
}

// ── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  // Constants
  QUICKBOOKS_AUTH_URL,
  QUICKBOOKS_REDIRECT_URI,
  QUICKBOOKS_SCOPES,
  QB_API_BASE,
  // Client config
  requireClientConfig,
  // OAuth
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeToken,
  // CSRF
  makeState,
  parseState,
  // Cookies
  getCookies,
  setCookie,
  clearCookie,
  // HTTP
  sendJson,
  redirect,
  readJsonBody,
  // Connection storage
  storeConnection,
  loadConnection,
  loadAllConnections,
  deleteConnection,
  // API client
  qbApiCall,
  validateEntity,
  validateReportName,
  sanitizeQueryWhere,
  // Webhook
  verifyIntuitWebhookSignature,
};
