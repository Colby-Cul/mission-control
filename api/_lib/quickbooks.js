const crypto = require("crypto");
const { execFileSync } = require("child_process");

const QUICKBOOKS_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QUICKBOOKS_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const QUICKBOOKS_REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke";
const QUICKBOOKS_SCOPES = [
  "com.intuit.quickbooks.accounting",
  "com.intuit.quickbooks.payment",
];
const QUICKBOOKS_REDIRECT_URI =
  "https://mission-control-peach-omega.vercel.app/api/qb/callback";

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
  const clientId =
    process.env.QUICKBOOKS_CLIENT_ID ||
    (process.platform === "darwin"
      ? getClientCredentialFromKeychain("quickbooks-client-id")
      : "");
  const clientSecret =
    process.env.QUICKBOOKS_CLIENT_SECRET ||
    (process.platform === "darwin"
      ? getClientCredentialFromKeychain("quickbooks-client-secret")
      : "");

  return {
    clientId,
    clientSecret,
    redirectUri: process.env.QUICKBOOKS_REDIRECT_URI || QUICKBOOKS_REDIRECT_URI,
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

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error_description || data.error || "Token exchange failed");
    error.statusCode = response.status;
    error.details = data;
    throw error;
  }

  return data;
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

  if (response.status === 200) {
    return { revoked: true };
  }

  let data = {};
  try {
    data = await response.json();
  } catch {}

  const error = new Error(data.error_description || data.error || "Token revocation failed");
  error.statusCode = response.status;
  error.details = data;
  throw error;
}

function getConnectionServiceName(key) {
  return `quickbooks-oauth-${key}`;
}

function storeConnectionInKeychain(key, payload) {
  if (!key || process.platform !== "darwin") {
    return { stored: false, store: "none" };
  }

  try {
    execFileSync(
      "security",
      [
        "add-generic-password",
        "-U",
        "-a",
        "jarvis",
        "-s",
        getConnectionServiceName(key),
        "-w",
        JSON.stringify(payload),
      ],
      { encoding: "utf8" }
    );
    return { stored: true, store: "macos-keychain", service: getConnectionServiceName(key) };
  } catch (error) {
    return { stored: false, store: "macos-keychain", error: error.message };
  }
}

function loadConnectionFromKeychain(key) {
  if (!key || process.platform !== "darwin") return null;

  try {
    const raw = execFileSync(
      "security",
      [
        "find-generic-password",
        "-s",
        getConnectionServiceName(key),
        "-a",
        "jarvis",
        "-w",
      ],
      { encoding: "utf8" }
    ).trim();
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function deleteConnectionFromKeychain(key) {
  if (!key || process.platform !== "darwin") {
    return { deleted: false, store: "none" };
  }

  try {
    execFileSync(
      "security",
      ["delete-generic-password", "-s", getConnectionServiceName(key), "-a", "jarvis"],
      { encoding: "utf8" }
    );
    return { deleted: true, store: "macos-keychain", service: getConnectionServiceName(key) };
  } catch {
    return { deleted: false, store: "macos-keychain", service: getConnectionServiceName(key) };
  }
}

async function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;

  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

module.exports = {
  QUICKBOOKS_AUTH_URL,
  QUICKBOOKS_REDIRECT_URI,
  QUICKBOOKS_SCOPES,
  clearCookie,
  deleteConnectionFromKeychain,
  exchangeCodeForTokens,
  getCookies,
  loadConnectionFromKeychain,
  makeState,
  parseState,
  readJsonBody,
  redirect,
  requireClientConfig,
  revokeToken,
  sendJson,
  setCookie,
  storeConnectionInKeychain,
};
