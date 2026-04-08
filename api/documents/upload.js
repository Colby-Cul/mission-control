const { requireSupabaseConfig } = require("../_lib/supabase");
const { supabaseRest } = require("../_lib/supabase");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { url, key } = requireSupabaseConfig();

    // Parse multipart form data manually since Vercel doesn't auto-parse
    const contentType = req.headers["content-type"] || "";

    if (contentType.includes("application/json")) {
      // Handle base64-encoded file upload
      const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
      const { filename, content_base64, mime_type, document_type, entity_id, entity_name } = body;

      if (!filename || !content_base64) {
        return sendJson(res, 400, { error: "filename and content_base64 are required" });
      }

      const fileBuffer = Buffer.from(content_base64, "base64");
      const storagePath = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      // Upload to Supabase Storage
      const uploadRes = await fetch(`${url}/storage/v1/object/legal-documents/${storagePath}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          apikey: key,
          "Content-Type": mime_type || "application/pdf",
          "x-upsert": "true",
        },
        body: fileBuffer,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        return sendJson(res, 500, { error: `Storage upload failed: ${errText}` });
      }

      // Create metadata record
      const doc = await supabaseRest("entity_documents", {
        method: "POST",
        body: {
          filename,
          storage_path: storagePath,
          file_size: fileBuffer.length,
          mime_type: mime_type || "application/pdf",
          document_type: document_type || "other",
          entity_id: entity_id || null,
          entity_name: entity_name || null,
          analysis_status: "pending",
        },
      });

      return sendJson(res, 201, {
        document: Array.isArray(doc) ? doc[0] : doc,
      });
    }

    return sendJson(res, 400, { error: "Send JSON with content_base64 field" });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};

// Vercel needs this to handle large payloads
module.exports.config = {
  api: { bodyParser: { sizeLimit: "50mb" } },
};
