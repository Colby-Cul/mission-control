const { getPlaidClient, sendJson, readJsonBody } = require("../_lib/plaid");
const { decryptToken } = require("../_lib/crypto");
const { supabaseRest, supabaseDelete } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const { item_id } = body;

    if (!item_id) {
      return sendJson(res, 400, { error: "item_id is required" });
    }

    // Look up the item
    const items = await supabaseRest("plaid_items", {
      query: `id=eq.${item_id}&select=id,access_token_enc,institution_name,item_id`,
    });

    if (!items || items.length === 0) {
      return sendJson(res, 404, { error: "Item not found" });
    }

    const plaidItem = items[0];

    // Revoke Plaid access token
    try {
      const accessToken = await decryptToken(plaidItem.access_token_enc);
      const client = getPlaidClient();
      await client.itemRemove({ access_token: accessToken });
    } catch (err) {
      console.error("Plaid token revocation warning:", err.message);
      // Continue with deletion even if revocation fails
    }

    // Delete from Supabase (cascade will remove accounts, transactions, holdings)
    await supabaseDelete("plaid_items", `id=eq.${item_id}`);

    return sendJson(res, 200, {
      disconnected: true,
      institution: plaidItem.institution_name,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
