const COINBASE_AUTH_URL = "https://www.coinbase.com/oauth/authorize";
const COINBASE_TOKEN_URL = "https://api.coinbase.com/oauth/token";
const COINBASE_API_BASE = "https://api.coinbase.com/v2";
const COINBASE_REDIRECT_URI =
  process.env.COINBASE_REDIRECT_URI ||
  "https://mission-control-peach-omega.vercel.app/api/coinbase/callback";
const COINBASE_SCOPES = "wallet:accounts:read,wallet:transactions:read";

function getCoinbaseConfig() {
  const clientId = process.env.COINBASE_CLIENT_ID;
  const clientSecret = process.env.COINBASE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    const error = new Error(
      "Missing Coinbase credentials. Set COINBASE_CLIENT_ID and COINBASE_CLIENT_SECRET in Vercel."
    );
    error.statusCode = 500;
    throw error;
  }

  return { clientId, clientSecret, redirectUri: COINBASE_REDIRECT_URI };
}

async function exchangeCodeForTokens(code) {
  const { clientId, clientSecret, redirectUri } = getCoinbaseConfig();

  const response = await fetch(COINBASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error_description || data.error || "Coinbase token exchange failed");
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

async function refreshAccessToken(refreshToken) {
  const { clientId, clientSecret } = getCoinbaseConfig();

  const response = await fetch(COINBASE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.error_description || "Coinbase token refresh failed");
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

async function coinbaseApi(accessToken, path) {
  const response = await fetch(`${COINBASE_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "CB-VERSION": "2024-01-01",
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data.errors?.[0]?.message || "Coinbase API error");
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = {
  COINBASE_AUTH_URL,
  COINBASE_SCOPES,
  getCoinbaseConfig,
  exchangeCodeForTokens,
  refreshAccessToken,
  coinbaseApi,
  sendJson,
};
