// Polls Google Drive "Statement Inbox" folder for new files
// Downloads them, uploads to Mission Control, triggers Victoria analysis

const { supabaseRest } = require("../_lib/supabase");

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_DRIVE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_DRIVE_CLIENT_SECRET || "").trim();
const GOOGLE_REFRESH_TOKEN = (process.env.GOOGLE_DRIVE_REFRESH_TOKEN || "").trim();
const FOLDER_ID = "14iWbxTX4v0lA0-8MWwEddxycmmMhZEkA";
const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Token refresh failed: ${data.error}`);
  return data.access_token;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    return sendJson(res, 500, {
      error: "Google Drive credentials not configured. Visit /api/drive/auth to set up.",
    });
  }

  try {
    const accessToken = await getAccessToken();

    // List files in the Statement Inbox folder
    const listRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${FOLDER_ID}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,createdTime,size)&orderBy=createdTime+desc`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!listRes.ok) {
      const err = await listRes.text();
      return sendJson(res, listRes.status, { error: `Drive API error: ${err}` });
    }

    const { files } = await listRes.json();

    if (!files || files.length === 0) {
      return sendJson(res, 200, { message: "No files in Statement Inbox", processed: 0 });
    }

    // Check which files we've already processed
    const existingDocs = await supabaseRest("entity_documents", {
      query: "select=filename,storage_path",
    });
    const processedFiles = new Set((existingDocs || []).map(d => d.filename));

    const newFiles = files.filter(f => !processedFiles.has(f.name));

    if (newFiles.length === 0) {
      return sendJson(res, 200, { message: "No new files to process", total_files: files.length });
    }

    const results = [];

    for (const file of newFiles) {
      try {
        // Download file content
        const downloadRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!downloadRes.ok) {
          results.push({ file: file.name, status: "error", error: "Download failed" });
          continue;
        }

        const fileBuffer = await downloadRes.arrayBuffer();
        const base64Content = Buffer.from(fileBuffer).toString("base64");

        // Upload to Supabase Storage
        const { requireSupabaseConfig } = require("../_lib/supabase");
        const { url, key } = requireSupabaseConfig();
        const storagePath = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        await fetch(`${url}/storage/v1/object/legal-documents/${storagePath}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            apikey: key,
            "Content-Type": file.mimeType || "application/pdf",
            "x-upsert": "true",
          },
          body: Buffer.from(fileBuffer),
        });

        // Create document record
        const doc = await supabaseRest("entity_documents", {
          method: "POST",
          body: {
            filename: file.name,
            storage_path: storagePath,
            file_size: file.size ? parseInt(file.size) : Buffer.from(fileBuffer).length,
            mime_type: file.mimeType || "application/pdf",
            document_type: "statement",
            analysis_status: "pending",
            notes: `Auto-imported from Google Drive Statement Inbox`,
          },
        });

        const docId = Array.isArray(doc) ? doc[0].id : doc.id;

        // Trigger Victoria analysis
        if (ANTHROPIC_API_KEY && docId) {
          try {
            // Mark as analyzing
            await supabaseRest("entity_documents", {
              method: "PATCH",
              query: `id=eq.${docId}`,
              body: { analysis_status: "analyzing" },
            });

            // Call the analyze endpoint internally
            const analyzeUrl = `https://mc-merge-v7.vercel.app/api/documents/analyze`;
            const analyzeRes = await fetch(analyzeUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ document_id: docId }),
            });
            const analyzeData = await analyzeRes.json();

            results.push({
              file: file.name,
              status: "analyzed",
              document_id: docId,
              analysis_status: analyzeData.status,
            });
          } catch (analyzeErr) {
            results.push({
              file: file.name,
              status: "uploaded",
              document_id: docId,
              note: "Upload succeeded but analysis failed: " + analyzeErr.message,
            });
          }
        } else {
          results.push({
            file: file.name,
            status: "uploaded",
            document_id: docId,
          });
        }

        // Brief delay between files
        await new Promise(r => setTimeout(r, 500));
      } catch (fileErr) {
        results.push({ file: file.name, status: "error", error: fileErr.message });
      }
    }

    return sendJson(res, 200, {
      processed: results.length,
      total_in_folder: files.length,
      results,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};

module.exports.config = {
  maxDuration: 120,
};
