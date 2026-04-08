const { supabaseRest } = require("../_lib/supabase");

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const ownership = await supabaseRest("entity_ownership", {
      query: "select=*&order=entity_name.asc",
    });
    return sendJson(res, 200, { ownership: ownership || [] });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
