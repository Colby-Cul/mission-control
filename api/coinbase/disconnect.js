const { sendJson } = require("../_lib/coinbase");
const { supabaseDelete, supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { connection_id } = body;

    if (!connection_id) {
      return sendJson(res, 400, { error: "connection_id is required" });
    }

    const connections = await supabaseRest("coinbase_connections", {
      query: `id=eq.${connection_id}&select=id`,
    });

    if (!connections || connections.length === 0) {
      return sendJson(res, 404, { error: "Connection not found" });
    }

    // Cascade delete will remove crypto_holdings
    await supabaseDelete("coinbase_connections", `id=eq.${connection_id}`);

    return sendJson(res, 200, { disconnected: true });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
