const { coinbaseApi, refreshAccessToken, sendJson } = require("../_lib/coinbase");
const { encryptToken, decryptToken } = require("../_lib/crypto");
const { supabaseRest, supabaseUpsert } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const connections = await supabaseRest("coinbase_connections", {
      query: "select=id,access_token_enc,refresh_token_enc,token_expires_at",
    });

    if (!connections || connections.length === 0) {
      return sendJson(res, 200, { message: "No Coinbase connections" });
    }

    for (const conn of connections) {
      let accessToken = await decryptToken(conn.access_token_enc);

      // Refresh if expired
      if (conn.token_expires_at && new Date(conn.token_expires_at) < new Date()) {
        const refreshToken = await decryptToken(conn.refresh_token_enc);
        const tokens = await refreshAccessToken(refreshToken);

        accessToken = tokens.access_token;
        const encAccess = await encryptToken(tokens.access_token);
        const encRefresh = await encryptToken(tokens.refresh_token);

        await supabaseRest("coinbase_connections", {
          method: "PATCH",
          query: `id=eq.${conn.id}`,
          body: {
            access_token_enc: encAccess,
            refresh_token_enc: encRefresh,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          },
        });
      }

      // Fetch accounts
      const accountsData = await coinbaseApi(accessToken, "/accounts?limit=100");
      const holdings = (accountsData.data || [])
        .filter((a) => parseFloat(a.balance.amount) > 0)
        .map((a) => ({
          connection_id: conn.id,
          currency: a.balance.currency,
          balance: parseFloat(a.balance.amount),
          balance_usd: parseFloat(a.native_balance?.amount || 0),
          updated_at: new Date().toISOString(),
        }));

      if (holdings.length > 0) {
        await supabaseUpsert("crypto_holdings", holdings);
      }

      await supabaseRest("coinbase_connections", {
        method: "PATCH",
        query: `id=eq.${conn.id}`,
        body: {
          last_synced_at: new Date().toISOString(),
          error_code: null,
          error_message: null,
          updated_at: new Date().toISOString(),
        },
      });
    }

    return sendJson(res, 200, { synced: true });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
