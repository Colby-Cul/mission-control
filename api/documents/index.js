const { supabaseRest, requireSupabaseConfig } = require("../_lib/supabase");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const docs = await supabaseRest("entity_documents", {
        query: "select=*&order=created_at.desc",
      });
      return sendJson(res, 200, { documents: docs || [] });
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
      const { id } = body;
      if (!id) return sendJson(res, 400, { error: "id is required" });

      // Get storage path before deleting
      const docs = await supabaseRest("entity_documents", {
        query: `id=eq.${id}&select=storage_path`,
      });

      // Delete from storage
      if (docs?.[0]?.storage_path) {
        const { url, key } = requireSupabaseConfig();
        await fetch(`${url}/storage/v1/object/legal-documents/${docs[0].storage_path}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${key}`, apikey: key },
        });
      }

      // Delete metadata
      const { supabaseDelete } = require("../_lib/supabase");
      await supabaseDelete("entity_documents", `id=eq.${id}`);
      return sendJson(res, 200, { deleted: true });
    }

    res.setHeader("Allow", "GET, DELETE");
    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
