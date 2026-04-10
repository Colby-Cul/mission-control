const { getPlaidClient, withCredentials, sendJson, readJsonBody } = require("../_lib/plaid");
const { encryptToken } = require("../_lib/crypto");
const { supabaseRest, supabaseUpsert } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const client = getPlaidClient();
    const body = await readJsonBody(req);
    const { public_token, account_scope = "personal", entity_id = null } = body;

    if (!public_token) {
      return sendJson(res, 400, { error: "public_token is required" });
    }

    // Exchange public token for access token
    const exchangeResponse = await client.itemPublicTokenExchange(withCredentials({
      public_token,
    }));

    const accessToken = exchangeResponse.data.access_token;
    const itemId = exchangeResponse.data.item_id;

    // Get institution info
    const itemResponse = await client.itemGet(withCredentials({ access_token: accessToken }));
    const institutionId = itemResponse.data.item.institution_id;

    let institutionName = institutionId;
    try {
      const instResponse = await client.institutionsGetById(withCredentials({
        institution_id: institutionId,
        country_codes: ["US"],
      }));
      institutionName = instResponse.data.institution.name;
    } catch {
      // Use institution ID as fallback
    }

    // Encrypt and store
    const encryptedToken = await encryptToken(accessToken);

    const plaidItem = await supabaseRest("plaid_items", {
      method: "POST",
      body: {
        institution_id: institutionId,
        institution_name: institutionName,
        access_token_enc: encryptedToken,
        item_id: itemId,
        account_scope,
        entity_id,
        products: body.products || ["transactions"],
      },
    });

    const plaidItemId = Array.isArray(plaidItem) ? plaidItem[0].id : plaidItem.id;

    // Pull initial account data
    const accountsResponse = await client.accountsGet(withCredentials({ access_token: accessToken }));
    const accounts = accountsResponse.data.accounts;

    const accountRows = accounts.map((acct) => ({
      plaid_item_id: plaidItemId,
      plaid_account_id: acct.account_id,
      name: acct.name,
      official_name: acct.official_name,
      type: acct.type,
      subtype: acct.subtype,
      mask: acct.mask,
      currency_code: acct.balances.iso_currency_code || "USD",
      balance_current: acct.balances.current,
      balance_available: acct.balances.available,
      balance_limit: acct.balances.limit,
      account_scope,
      entity_id,
      last_synced_at: new Date().toISOString(),
    }));

    if (accountRows.length > 0) {
      await supabaseUpsert("financial_accounts", accountRows);
    }

    const requestedProducts = body.products || ["transactions"];

    // Pull initial transactions (only if transactions product was requested)
    if (requestedProducts.includes("transactions")) {
      try {
        await syncTransactions(client, accessToken, plaidItemId, account_scope, entity_id);
      } catch (err) {
        console.error("Initial transaction sync warning:", err.message);
        // Non-fatal: transactions will arrive via webhook HISTORICAL_UPDATE
      }
    }

    // Pull investment holdings if applicable
    const hasInvestments = accounts.some(
      (a) => a.type === "investment" || a.type === "brokerage"
    );
    if (hasInvestments && requestedProducts.includes("investments")) {
      try {
        await syncHoldings(client, accessToken, account_scope, entity_id);
      } catch (err) {
        console.error("Initial holdings sync warning:", err.message);
      }
    }

    // For assets-only connections (Schwab, Chase, Citi, etc.), create an Asset Report
    if (requestedProducts.includes("assets") && !requestedProducts.includes("investments")) {
      try {
        await createAssetReport(client, accessToken, plaidItemId, account_scope, entity_id);
      } catch (err) {
        console.error("Asset report creation warning:", err.message);
      }
    }

    return sendJson(res, 200, {
      success: true,
      item_id: itemId,
      institution: institutionName,
      accounts_linked: accounts.length,
      account_types: accounts.map((a) => `${a.name} (${a.subtype})`),
    });
  } catch (error) {
    console.error("Plaid exchange error:", error.response?.data || error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.response?.data?.error_message || error.message,
    });
  }
};

async function syncTransactions(client, accessToken, plaidItemId, accountScope, entityId) {
  const { supabaseRest: rest } = require("../_lib/supabase");

  // Get cursor from plaid_items
  const items = await rest("plaid_items", {
    query: `id=eq.${plaidItemId}&select=cursor`,
  });
  let cursor = items?.[0]?.cursor || "";

  let hasMore = true;
  const allAdded = [];

  while (hasMore) {
    const { withCredentials } = require("../_lib/plaid");
    const response = await client.transactionsSync(withCredentials({
      access_token: accessToken,
      cursor: cursor || undefined,
    }));

    const { added, modified, removed, has_more, next_cursor } = response.data;

    for (const txn of added) {
      allAdded.push({
        account_id: txn.account_id,
        plaid_transaction_id: txn.transaction_id,
        date: txn.date,
        datetime: txn.datetime,
        name: txn.name,
        merchant_name: txn.merchant_name,
        amount: txn.amount,
        currency_code: txn.iso_currency_code || "USD",
        category: txn.category,
        personal_finance_category: txn.personal_finance_category?.primary,
        pending: txn.pending,
        account_scope: accountScope,
        entity_id: entityId,
      });
    }

    cursor = next_cursor;
    hasMore = has_more;
  }

  if (allAdded.length > 0) {
    // Resolve plaid_account_id -> our account_id
    const accounts = await rest("financial_accounts", {
      query: `plaid_item_id=eq.${plaidItemId}&select=id,plaid_account_id`,
    });
    const acctMap = {};
    accounts.forEach((a) => { acctMap[a.plaid_account_id] = a.id; });

    const rows = allAdded
      .filter((t) => acctMap[t.account_id])
      .map((t) => ({ ...t, account_id: acctMap[t.account_id] }));

    if (rows.length > 0) {
      // Batch in groups of 100
      for (let i = 0; i < rows.length; i += 100) {
        const batch = rows.slice(i, i + 100);
        await require("../_lib/supabase").supabaseUpsert("financial_transactions", batch);
      }
    }
  }

  // Update cursor
  await rest("plaid_items", {
    method: "PATCH",
    query: `id=eq.${plaidItemId}`,
    body: { cursor, last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  });
}

async function syncHoldings(client, accessToken, accountScope, entityId) {
  const { supabaseUpsert: upsert, supabaseRest: rest } = require("../_lib/supabase");

  const { withCredentials } = require("../_lib/plaid");
  const response = await client.investmentsHoldingsGet(withCredentials({
    access_token: accessToken,
  }));

  const { holdings, securities, accounts } = response.data;

  // Upsert securities
  if (securities.length > 0) {
    const secRows = securities.map((s) => ({
      plaid_security_id: s.security_id,
      ticker_symbol: s.ticker_symbol,
      name: s.name,
      type: s.type,
      close_price: s.close_price,
      close_price_as_of: s.close_price_as_of,
      iso_currency_code: s.iso_currency_code || "USD",
      isin: s.isin,
      cusip: s.cusip,
      sedol: s.sedol,
      updated_at: new Date().toISOString(),
    }));
    await upsert("securities", secRows);
  }

  // Get our account IDs and security IDs
  const allAccounts = await rest("financial_accounts", {
    query: `select=id,plaid_account_id`,
  });
  const acctMap = {};
  allAccounts.forEach((a) => { acctMap[a.plaid_account_id] = a.id; });

  const allSecurities = await rest("securities", {
    query: `select=id,plaid_security_id`,
  });
  const secMap = {};
  allSecurities.forEach((s) => { secMap[s.plaid_security_id] = s.id; });

  // Upsert holdings
  if (holdings.length > 0) {
    const holdingRows = holdings
      .filter((h) => acctMap[h.account_id] && secMap[h.security_id])
      .map((h) => ({
        account_id: acctMap[h.account_id],
        security_id: secMap[h.security_id],
        quantity: h.quantity,
        cost_basis: h.cost_basis,
        institution_value: h.institution_value,
        institution_price: h.institution_price,
        institution_price_as_of: h.institution_price_as_of,
        iso_currency_code: h.iso_currency_code || "USD",
        updated_at: new Date().toISOString(),
      }));

    if (holdingRows.length > 0) {
      await upsert("holdings", holdingRows);
    }
  }
}

async function createAssetReport(client, accessToken, plaidItemId, accountScope, entityId) {
  const { withCredentials } = require("../_lib/plaid");
  const { supabaseRest: rest } = require("../_lib/supabase");

  // Create an asset report (90 days of history)
  const createResponse = await client.assetReportCreate(withCredentials({
    access_tokens: [accessToken],
    days_requested: 90,
  }));

  const assetReportToken = createResponse.data.asset_report_token;

  // Store the token on the plaid_item for later retrieval
  await rest("plaid_items", {
    method: "PATCH",
    query: `id=eq.${plaidItemId}`,
    body: { asset_report_token: assetReportToken, updated_at: new Date().toISOString() },
  });

  // Try to get the report immediately (it may not be ready yet)
  // Plaid generates asset reports asynchronously, usually ready in seconds
  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    try {
      const reportResponse = await client.assetReportGet(withCredentials({
        asset_report_token: assetReportToken,
      }));
      await processAssetReport(reportResponse.data.report, plaidItemId, accountScope, entityId);
      return;
    } catch (err) {
      const errCode = err.response?.data?.error_code;
      if (errCode === "PRODUCT_NOT_READY") {
        // Wait 3 seconds and retry
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      throw err;
    }
  }

  console.log("Asset report not ready after 5 attempts — will be fetched by sync endpoint later.");
}

async function processAssetReport(report, plaidItemId, accountScope, entityId) {
  const { supabaseUpsert: upsert, supabaseRest: rest } = require("../_lib/supabase");

  if (!report || !report.items) return;

  for (const item of report.items) {
    for (const acct of item.accounts || []) {
      // Update account balances from the asset report
      const existing = await rest("financial_accounts", {
        query: `plaid_item_id=eq.${plaidItemId}&plaid_account_id=eq.${acct.account_id}&select=id`,
      });

      if (existing && existing.length > 0) {
        await rest("financial_accounts", {
          method: "PATCH",
          query: `id=eq.${existing[0].id}`,
          body: {
            balance_current: acct.balances?.current,
            balance_available: acct.balances?.available,
            last_synced_at: new Date().toISOString(),
          },
        });
      }

      // Process historical transactions from the asset report
      if (acct.historical_balances && acct.historical_balances.length > 0) {
        console.log(`Asset report: ${acct.historical_balances.length} historical balance records for ${acct.name}`);
      }

      if (acct.transactions && acct.transactions.length > 0 && existing?.[0]?.id) {
        const txnRows = acct.transactions.map(t => ({
          account_id: existing[0].id,
          plaid_transaction_id: t.transaction_id || `asset_${acct.account_id}_${t.date}_${Math.random().toString(36).slice(2,8)}`,
          date: t.date,
          name: t.description || t.name || "Unknown",
          amount: t.amount,
          currency_code: t.iso_currency_code || "USD",
          pending: false,
          account_scope: accountScope,
          entity_id: entityId,
        }));

        for (let i = 0; i < txnRows.length; i += 100) {
          const batch = txnRows.slice(i, i + 100);
          await upsert("financial_transactions", batch);
        }
        console.log(`Asset report: synced ${txnRows.length} transactions for ${acct.name}`);
      }
    }
  }
}

module.exports.syncTransactions = syncTransactions;
module.exports.syncHoldings = syncHoldings;
module.exports.createAssetReport = createAssetReport;
module.exports.processAssetReport = processAssetReport;
