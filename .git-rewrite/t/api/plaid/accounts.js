const { sendJson } = require("../_lib/plaid");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { scope, entity_id, type } = req.query;
    let query = "select=*,plaid_items(institution_name,institution_id,last_synced_at,error_code)";

    if (scope) query += `&account_scope=eq.${scope}`;
    if (entity_id) query += `&entity_id=eq.${entity_id}`;
    if (type) query += `&type=eq.${type}`;
    query += "&order=type.asc,name.asc";

    const accounts = await supabaseRest("financial_accounts", { query });

    return sendJson(res, 200, { accounts: accounts || [] });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
