const {
  loadAllConnections,
  qbApiCall,
  sendJson,
} = require("../_lib/quickbooks");

/**
 * QuickBooks Connection Status
 *
 * Returns the status of all QuickBooks connections including token health
 * and an optional live connectivity test.
 *
 * Query params:
 *   ?test=true — also ping the QuickBooks API to verify the token works
 */
module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const connections = await loadAllConnections();
    const doTest = req.query.test === "true";

    const statuses = [];

    for (const conn of connections) {
      const expiresAt = new Date(conn.expires_at).getTime();
      const refreshExpiresAt = conn.refresh_token_expires_at
        ? new Date(conn.refresh_token_expires_at).getTime()
        : null;

      const entry = {
        company_key: conn.company_key,
        realm_id: conn.realm_id,
        token_status: Date.now() < expiresAt ? "valid" : "expired",
        expires_at: conn.expires_at,
        minutes_remaining: Math.round((expiresAt - Date.now()) / 60_000),
        refresh_token_expires_at: conn.refresh_token_expires_at,
        refresh_days_remaining: refreshExpiresAt
          ? Math.round((refreshExpiresAt - Date.now()) / 86_400_000)
          : null,
        connected_at: conn.connected_at,
        updated_at: conn.updated_at,
      };

      if (doTest && entry.token_status === "valid") {
        try {
          const result = await qbApiCall(conn.company_key, {
            path: `/companyinfo/${conn.realm_id}`,
          });
          entry.api_test = "ok";
          entry.company_name = result.data?.CompanyInfo?.CompanyName || null;
        } catch (testErr) {
          entry.api_test = "error";
          entry.api_error = testErr.message;
        }
      }

      statuses.push(entry);
    }

    return sendJson(res, 200, {
      ok: true,
      environment: process.env.QB_PRODUCTION === "1" ? "production" : "sandbox",
      connections: statuses.length,
      statuses,
    });
  } catch (error) {
    console.error("QuickBooks status check failed", { message: error.message });
    return sendJson(res, 500, { error: error.message });
  }
};
