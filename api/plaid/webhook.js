const { getPlaidClient, sendJson, readJsonBody } = require("../_lib/plaid");
const { decryptToken } = require("../_lib/crypto");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const { webhook_type, webhook_code, item_id } = body;

    console.log(`Plaid webhook: ${webhook_type} / ${webhook_code} for item ${item_id}`);

    if (!item_id) {
      return sendJson(res, 400, { error: "Missing item_id" });
    }

    // Look up the plaid item
    const items = await supabaseRest("plaid_items", {
      query: `item_id=eq.${item_id}&select=id,access_token_enc,account_scope,entity_id,cursor`,
    });

    if (!items || items.length === 0) {
      return sendJson(res, 404, { error: "Unknown item_id" });
    }

    const plaidItem = items[0];
    const accessToken = await decryptToken(plaidItem.access_token_enc);
    const client = getPlaidClient();

    switch (webhook_type) {
      case "TRANSACTIONS": {
        if (["SYNC_UPDATES_AVAILABLE", "HISTORICAL_UPDATE", "DEFAULT_UPDATE", "INITIAL_UPDATE"].includes(webhook_code)) {
          const { syncTransactions } = require("./exchange");
          await syncTransactions(client, accessToken, plaidItem.id, plaidItem.account_scope, plaidItem.entity_id);
        }
        break;
      }

      case "INVESTMENTS_TRANSACTIONS":
      case "HOLDINGS": {
        if (["DEFAULT_UPDATE", "HISTORICAL_UPDATE"].includes(webhook_code)) {
          const { syncHoldings } = require("./exchange");
          await syncHoldings(client, accessToken, plaidItem.account_scope, plaidItem.entity_id);
        }
        break;
      }

      case "ITEM": {
        if (webhook_code === "ERROR") {
          await supabaseRest("plaid_items", {
            method: "PATCH",
            query: `id=eq.${plaidItem.id}`,
            body: {
              error_code: body.error?.error_code,
              error_message: body.error?.error_message,
              updated_at: new Date().toISOString(),
            },
          });
        } else if (webhook_code === "PENDING_EXPIRATION") {
          await supabaseRest("plaid_items", {
            method: "PATCH",
            query: `id=eq.${plaidItem.id}`,
            body: {
              error_code: "PENDING_EXPIRATION",
              error_message: "Consent is about to expire. Re-authenticate via Plaid Link update mode.",
              updated_at: new Date().toISOString(),
            },
          });
        }
        break;
      }
    }

    // Update balance on any sync
    if (["TRANSACTIONS", "HOLDINGS"].includes(webhook_type)) {
      try {
        const accountsResponse = await client.accountsGet({ access_token: accessToken });
        for (const acct of accountsResponse.data.accounts) {
          await supabaseRest("financial_accounts", {
            method: "PATCH",
            query: `plaid_account_id=eq.${acct.account_id}`,
            body: {
              balance_current: acct.balances.current,
              balance_available: acct.balances.available,
              balance_limit: acct.balances.limit,
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        console.error("Balance update warning:", err.message);
      }
    }

    return sendJson(res, 200, { received: true });
  } catch (error) {
    console.error("Plaid webhook error:", error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.message,
    });
  }
};
