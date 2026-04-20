const { supabaseRest, requireSupabaseConfig } = require("../_lib/supabase");

const ANTHROPIC_API_KEY = (process.env.ANTHROPIC_API_KEY || "").trim();

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

  if (!ANTHROPIC_API_KEY) {
    return sendJson(res, 500, { error: "ANTHROPIC_API_KEY not configured" });
  }

  try {
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { document_id } = body;

    if (!document_id) {
      return sendJson(res, 400, { error: "document_id is required" });
    }

    // Get document metadata
    const docs = await supabaseRest("entity_documents", {
      query: `id=eq.${document_id}&select=*`,
    });

    if (!docs || !docs.length) {
      return sendJson(res, 404, { error: "Document not found" });
    }

    const doc = docs[0];

    // Mark as analyzing
    await supabaseRest("entity_documents", {
      method: "PATCH",
      query: `id=eq.${document_id}`,
      body: { analysis_status: "analyzing", updated_at: new Date().toISOString() },
    });

    // Download file from Supabase Storage
    const { url, key } = requireSupabaseConfig();
    const fileRes = await fetch(`${url}/storage/v1/object/legal-documents/${doc.storage_path}`, {
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });

    if (!fileRes.ok) {
      throw new Error("Could not download document from storage");
    }

    const fileBuffer = await fileRes.arrayBuffer();
    const base64Content = Buffer.from(fileBuffer).toString("base64");
    const mediaType = doc.mime_type || "application/pdf";

    // Send to Claude for analysis
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "document",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Content,
                },
              },
              {
                type: "text",
                text: `You are Victoria, an executive assistant AI analyzing legal documents for Cabo Tropic Horizon Enterprises, LP.

Analyze this legal document and extract ALL of the following in structured JSON format:

{
  "document_type": "operating_agreement | articles_of_incorporation | partnership_agreement | trust_document | amendment | stock_certificate | other",
  "document_title": "title of the document",
  "effective_date": "YYYY-MM-DD or null",
  "entities": [
    {
      "entity_id": "kebab-case-id",
      "entity_name": "Full Legal Name",
      "entity_type": "LLC | LP | S-Corp | C-Corp | Trust | Sole Prop",
      "state_of_formation": "State",
      "formation_date": "YYYY-MM-DD or null",
      "ein": "XX-XXXXXXX or null",
      "role_in_document": "subject | parent | member | partner | beneficiary"
    }
  ],
  "ownership_structure": [
    {
      "owner_name": "Name of owner/member/partner",
      "owner_entity_id": "kebab-case-id or null if individual",
      "owned_entity_id": "kebab-case-id of entity being owned",
      "owned_entity_name": "Name of entity being owned",
      "ownership_percentage": 50.0,
      "share_class": "Class A | Common | etc or null",
      "shares": 1000,
      "capital_contribution": 50000.00,
      "voting_rights": true,
      "notes": "any relevant details"
    }
  ],
  "key_provisions": [
    "Brief summary of important provisions"
  ],
  "management_structure": "member-managed | manager-managed | board-managed | trustee-managed",
  "registered_agent": "Name and address if mentioned",
  "summary": "2-3 sentence summary of the document"
}

Return ONLY the JSON object, no other text. If a field is not mentioned in the document, use null.`,
              },
            ],
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errData = await claudeResponse.json().catch(() => ({}));
      throw new Error(`Claude API error: ${errData.error?.message || claudeResponse.status}`);
    }

    const claudeData = await claudeResponse.json();
    const analysisText = claudeData.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let analysisResult;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(analysisText);
    } catch (parseErr) {
      await supabaseRest("entity_documents", {
        method: "PATCH",
        query: `id=eq.${document_id}`,
        body: {
          analysis_status: "error",
          analysis_error: `Failed to parse Claude response: ${parseErr.message}`,
          analysis_result: { raw_text: analysisText },
          updated_at: new Date().toISOString(),
        },
      });
      return sendJson(res, 200, {
        status: "error",
        error: "Could not parse analysis",
        raw_text: analysisText,
      });
    }

    // Save analysis results
    await supabaseRest("entity_documents", {
      method: "PATCH",
      query: `id=eq.${document_id}`,
      body: {
        analysis_status: "complete",
        analysis_result: analysisResult,
        extracted_entities: analysisResult.entities || [],
        extracted_ownership: analysisResult.ownership_structure || [],
        analyzed_at: new Date().toISOString(),
        document_type: analysisResult.document_type || doc.document_type,
        updated_at: new Date().toISOString(),
      },
    });

    // Upsert extracted entities into entity_ownership table
    if (analysisResult.ownership_structure) {
      for (const ownership of analysisResult.ownership_structure) {
        if (ownership.owned_entity_id) {
          const entity = analysisResult.entities?.find(
            (e) => e.entity_id === ownership.owned_entity_id
          );

          await supabaseRest("entity_ownership", {
            method: "POST",
            body: {
              entity_id: ownership.owned_entity_id,
              entity_name: ownership.owned_entity_name || entity?.entity_name || ownership.owned_entity_id,
              entity_type: entity?.entity_type,
              state: entity?.state_of_formation,
              parent_entity_id: ownership.owner_entity_id,
              ownership_pct: ownership.ownership_percentage,
              owned_by: ownership.owner_name,
              shares_outstanding: ownership.shares,
              share_class: ownership.share_class,
              formation_date: entity?.formation_date,
              ein: entity?.ein,
              source_document_id: document_id,
              updated_at: new Date().toISOString(),
            },
          });
        }
      }
    }

    return sendJson(res, 200, {
      status: "complete",
      analysis: analysisResult,
    });
  } catch (error) {
    // Mark as error
    const body2 = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    if (body2.document_id) {
      try {
        await supabaseRest("entity_documents", {
          method: "PATCH",
          query: `id=eq.${body2.document_id}`,
          body: {
            analysis_status: "error",
            analysis_error: error.message,
            updated_at: new Date().toISOString(),
          },
        });
      } catch {}
    }
    console.error("Document analysis error:", error.message);
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};

module.exports.config = {
  api: { bodyParser: { sizeLimit: "50mb" } },
  maxDuration: 60,
};
