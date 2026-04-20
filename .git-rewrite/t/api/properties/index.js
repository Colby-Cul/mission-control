const { supabaseRest, supabaseUpsert, supabaseDelete } = require("../_lib/supabase");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const properties = await supabaseRest("property_assets", {
        query: "select=*&order=city.asc,address.asc",
      });
      return sendJson(res, 200, { properties: properties || [] });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");

      if (body.id) {
        // Update existing
        const { id, ...updates } = body;
        updates.updated_at = new Date().toISOString();
        await supabaseRest("property_assets", {
          method: "PATCH",
          query: `id=eq.${id}`,
          body: updates,
        });
        const updated = await supabaseRest("property_assets", {
          query: `id=eq.${id}`,
        });
        return sendJson(res, 200, { property: updated?.[0] || null });
      } else {
        // Create new
        const result = await supabaseRest("property_assets", {
          method: "POST",
          body,
        });
        return sendJson(res, 201, { property: Array.isArray(result) ? result[0] : result });
      }
    }

    if (req.method === "DELETE") {
      const { id } = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
      if (!id) return sendJson(res, 400, { error: "id is required" });
      await supabaseDelete("property_assets", `id=eq.${id}`);
      return sendJson(res, 200, { deleted: true });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
