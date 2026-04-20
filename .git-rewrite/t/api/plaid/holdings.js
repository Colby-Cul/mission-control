const { sendJson } = require("../_lib/plaid");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { account_id } = req.query;
    let query = "select=*,securities(ticker_symbol,name,type,close_price,close_price_as_of)";

    if (account_id) query += `&account_id=eq.${account_id}`;
    query += "&order=institution_value.desc.nullslast";

    const holdings = await supabaseRest("holdings", { query });

    return sendJson(res, 200, { holdings: holdings || [] });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
