const { sendJson } = require("../_lib/coinbase");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const holdings = await supabaseRest("crypto_holdings", {
      query: "select=*,coinbase_connections(last_synced_at,error_code)&order=balance_usd.desc.nullslast",
    });

    return sendJson(res, 200, { holdings: holdings || [] });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
