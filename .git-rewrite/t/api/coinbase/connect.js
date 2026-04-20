const { COINBASE_AUTH_URL, COINBASE_SCOPES, getCoinbaseConfig, sendJson } = require("../_lib/coinbase");
const crypto = require("crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { clientId, redirectUri } = getCoinbaseConfig();
    const state = crypto.randomBytes(24).toString("hex");

    // Store state in a cookie for CSRF protection
    const cookieParts = [
      `cb_oauth_state=${state}`,
      "Max-Age=600",
      "HttpOnly",
      "Path=/api/coinbase/callback",
      "SameSite=Lax",
      "Secure",
    ];
    res.setHeader("Set-Cookie", cookieParts.join("; "));

    const authUrl = new URL(COINBASE_AUTH_URL);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", COINBASE_SCOPES);
    authUrl.searchParams.set("state", state);

    res.statusCode = 302;
    res.setHeader("Location", authUrl.toString());
    res.end();
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
