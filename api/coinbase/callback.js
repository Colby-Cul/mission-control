const { exchangeCodeForTokens, coinbaseApi, sendJson } = require("../_lib/coinbase");
const { encryptToken } = require("../_lib/crypto");
const { supabaseRest, supabaseUpsert } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { code, error: oauthError } = req.query;

    if (oauthError) {
      return redirectToApp(res, `?coinbase_error=${encodeURIComponent(oauthError)}`);
    }

    if (!code) {
      return sendJson(res, 400, { error: "Missing authorization code" });
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const { access_token, refresh_token, expires_in, scope } = tokens;

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Encrypt tokens
    const encAccessToken = await encryptToken(access_token);
    const encRefreshToken = await encryptToken(refresh_token);

    // Store connection
    const connection = await supabaseRest("coinbase_connections", {
      method: "POST",
      body: {
        access_token_enc: encAccessToken,
        refresh_token_enc: encRefreshToken,
        token_expires_at: expiresAt,
        scope,
        account_scope: "personal",
        last_synced_at: new Date().toISOString(),
      },
    });

    const connectionId = Array.isArray(connection) ? connection[0].id : connection.id;

    // Fetch initial holdings
    try {
      const accountsData = await coinbaseApi(access_token, "/accounts?limit=100");
      const holdings = (accountsData.data || [])
        .filter((a) => parseFloat(a.balance.amount) > 0)
        .map((a) => ({
          connection_id: connectionId,
          currency: a.balance.currency,
          balance: parseFloat(a.balance.amount),
          balance_usd: parseFloat(a.native_balance?.amount || 0),
          updated_at: new Date().toISOString(),
        }));

      if (holdings.length > 0) {
        await supabaseUpsert("crypto_holdings", holdings);
      }
    } catch (err) {
      console.error("Coinbase initial sync warning:", err.message);
    }

    return redirectToApp(res, "?coinbase_connected=true");
  } catch (error) {
    console.error("Coinbase callback error:", error.message);
    return redirectToApp(res, `?coinbase_error=${encodeURIComponent(error.message)}`);
  }
};

function redirectToApp(res, queryString) {
  res.statusCode = 302;
  res.setHeader("Location", `/#/accounts${queryString}`);
  res.end();
}
