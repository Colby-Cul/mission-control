const { getPlaidClient, withCredentials, sendJson } = require("../_lib/plaid");
const { decryptToken } = require("../_lib/crypto");
const { supabaseRest } = require("../_lib/supabase");
const { syncTransactions, syncHoldings, createAssetReport } = require("./exchange");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const client = getPlaidClient();

    // Get all plaid items
    const items = await supabaseRest("plaid_items", {
      query: "select=id,access_token_enc,account_scope,entity_id,institution_name,products",
    });

    if (!items || items.length === 0) {
      return sendJson(res, 200, { message: "No linked accounts to sync" });
    }

    const results = [];

    for (const item of items) {
      try {
        const accessToken = await decryptToken(item.access_token_enc);

        // Sync balances
        const accountsResponse = await client.accountsGet(withCredentials({ access_token: accessToken }));
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

        const products = item.products || ["transactions"];

        // Sync transactions (only for transactions-product connections)
        if (products.includes("transactions")) {
          await syncTransactions(client, accessToken, item.id, item.account_scope, item.entity_id);
        }

        // Sync holdings if applicable
        const hasInvestments = accountsResponse.data.accounts.some(
          (a) => a.type === "investment" || a.type === "brokerage"
        );
        if (hasInvestments && products.includes("investments")) {
          await syncHoldings(client, accessToken, item.account_scope, item.entity_id);
        }

        // For assets-only connections, refresh the asset report
        if (products.includes("assets") && !products.includes("investments") && !products.includes("transactions")) {
          try {
            await createAssetReport(client, accessToken, item.id, item.account_scope, item.entity_id);
          } catch (err) {
            console.error(`Asset report refresh warning for ${item.institution_name}:`, err.message);
          }
        }

        // Clear errors
        await supabaseRest("plaid_items", {
          method: "PATCH",
          query: `id=eq.${item.id}`,
          body: {
            error_code: null,
            error_message: null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });

        results.push({ institution: item.institution_name, status: "synced" });
      } catch (err) {
        console.error(`Sync error for ${item.institution_name}:`, err.message);
        results.push({ institution: item.institution_name, status: "error", error: err.message });
      }
    }

    return sendJson(res, 200, { synced: true, results });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
