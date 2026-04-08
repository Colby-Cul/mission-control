const { sendJson, readJsonBody } = require("../_lib/plaid");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const { account_id, entity_id, account_scope } = body;

    if (!account_id) {
      return sendJson(res, 400, { error: "account_id is required" });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (entity_id !== undefined) updates.entity_id = entity_id || null;
    if (account_scope) updates.account_scope = account_scope;

    await supabaseRest("financial_accounts", {
      method: "PATCH",
      query: `id=eq.${account_id}`,
      body: updates,
    });

    return sendJson(res, 200, { updated: true, account_id, entity_id, account_scope });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
