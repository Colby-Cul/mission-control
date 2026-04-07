const { sendJson } = require("../_lib/plaid");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    // Get all accounts with institution info
    const accounts = await supabaseRest("financial_accounts", {
      query: "select=*,plaid_items(institution_name,last_synced_at,error_code)",
    });

    if (!accounts || accounts.length === 0) {
      return sendJson(res, 200, {
        net_worth: 0,
        banking: { total: 0, checking: 0, savings: 0, accounts: [] },
        investments: { total: 0, accounts: [] },
        credit: { total_balance: 0, total_limit: 0, accounts: [] },
        linked_institutions: 0,
      });
    }

    // Aggregate by type
    const banking = { total: 0, checking: 0, savings: 0, accounts: [] };
    const investments = { total: 0, accounts: [] };
    const credit = { total_balance: 0, total_limit: 0, accounts: [] };
    const institutions = new Set();

    for (const acct of accounts) {
      const inst = acct.plaid_items?.institution_name || "Unknown";
      institutions.add(inst);
      const summary = {
        name: acct.name,
        institution: inst,
        balance: acct.balance_current,
        scope: acct.account_scope,
        entity_id: acct.entity_id,
        mask: acct.mask,
      };

      switch (acct.type) {
        case "depository":
          banking.total += acct.balance_current || 0;
          if (acct.subtype === "checking") banking.checking += acct.balance_current || 0;
          if (acct.subtype === "savings") banking.savings += acct.balance_current || 0;
          banking.accounts.push(summary);
          break;
        case "investment":
        case "brokerage":
          investments.total += acct.balance_current || 0;
          investments.accounts.push(summary);
          break;
        case "credit":
          credit.total_balance += acct.balance_current || 0;
          credit.total_limit += acct.balance_limit || 0;
          credit.accounts.push(summary);
          break;
      }
    }

    // Get crypto holdings
    let cryptoTotal = 0;
    try {
      const crypto = await supabaseRest("crypto_holdings", {
        query: "select=currency,balance_usd",
      });
      if (crypto) {
        cryptoTotal = crypto.reduce((sum, h) => sum + (h.balance_usd || 0), 0);
      }
    } catch {
      // No crypto connected yet
    }

    const netWorth = banking.total + investments.total + cryptoTotal - credit.total_balance;

    return sendJson(res, 200, {
      net_worth: Math.round(netWorth * 100) / 100,
      banking,
      investments,
      credit,
      crypto: { total: cryptoTotal },
      linked_institutions: institutions.size,
      last_sync: accounts.reduce((latest, a) => {
        const synced = a.plaid_items?.last_synced_at;
        return synced && synced > (latest || "") ? synced : latest;
      }, null),
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
