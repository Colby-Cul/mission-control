const {
  loadAllConnections,
  refreshAccessToken,
  sendJson,
} = require("../_lib/quickbooks");

/**
 * QuickBooks Token Refresh
 *
 * Called via Vercel Cron to keep tokens alive. Also callable manually via POST.
 *
 * Intuit access tokens expire in ~1 hour, refresh tokens in ~100 days.
 * This cron runs every 45 minutes to ensure tokens never expire during
 * agent operations.
 */
module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const connections = await loadAllConnections();

    if (connections.length === 0) {
      return sendJson(res, 200, { ok: true, message: "No QuickBooks connections to refresh", refreshed: 0 });
    }

    const results = [];

    for (const conn of connections) {
      const expiresAt = new Date(conn.expires_at).getTime();
      const minutesRemaining = (expiresAt - Date.now()) / 60_000;

      // Refresh if token expires within 15 minutes
      if (minutesRemaining > 15) {
        results.push({
          company_key: conn.company_key,
          status: "skipped",
          minutesRemaining: Math.round(minutesRemaining),
        });
        continue;
      }

      try {
        const refreshed = await refreshAccessToken(conn.company_key);
        results.push({
          company_key: conn.company_key,
          status: "refreshed",
          expiresIn: refreshed.expiresIn,
        });
      } catch (err) {
        results.push({
          company_key: conn.company_key,
          status: "error",
          error: err.message,
        });
      }
    }

    const refreshedCount = results.filter(r => r.status === "refreshed").length;
    const errorCount = results.filter(r => r.status === "error").length;

    return sendJson(res, 200, {
      ok: errorCount === 0,
      total: connections.length,
      refreshed: refreshedCount,
      errors: errorCount,
      results,
    });
  } catch (error) {
    console.error("QuickBooks token refresh cron failed", { message: error.message });
    return sendJson(res, 500, { error: error.message });
  }
};
