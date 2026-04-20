const { supabaseRest } = require("../_lib/supabase");

const RAPIDAPI_KEY = (process.env.RAPIDAPI_KEY || "").trim();
const ZILLOW_HOST = "private-zillow.p.rapidapi.com";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!RAPIDAPI_KEY) {
    return sendJson(res, 500, { error: "RAPIDAPI_KEY not configured" });
  }

  try {
    const properties = await supabaseRest("property_assets", {
      query: "select=id,address,city,state,zip,zillow_zpid",
    });

    if (!properties || !properties.length) {
      return sendJson(res, 200, { message: "No properties to update" });
    }

    const results = [];

    for (const prop of properties) {
      try {
        let zpid = prop.zillow_zpid;

        // Look up ZPID if missing
        if (!zpid) {
          const fullAddr = `${prop.address} ${prop.city} ${prop.state} ${prop.zip || ""}`.trim();
          const autoRes = await fetch(
            `https://www.zillowstatic.com/autocomplete/v3/suggestions?q=${encodeURIComponent(fullAddr)}&abKey=6666272a-4b99-474c-b857-110ec2fa8939&clientId=homepage-render`
          );
          const autoData = await autoRes.json();
          zpid = autoData.results?.[0]?.metaData?.zpid;
          if (!zpid) {
            results.push({ address: prop.address, status: "error", error: "ZPID not found" });
            continue;
          }
        }

        // Fetch Zestimate via Private Zillow API
        const zillowUrl = `https://www.zillow.com/homedetails/${zpid}_zpid/`;
        const r = await fetch(`https://${ZILLOW_HOST}/byurl?url=${encodeURIComponent(zillowUrl)}`, {
          headers: {
            "x-rapidapi-key": RAPIDAPI_KEY,
            "x-rapidapi-host": ZILLOW_HOST,
          },
        });

        if (!r.ok) {
          results.push({ address: prop.address, status: "error", error: `HTTP ${r.status}` });
          continue;
        }

        const data = await r.json();
        const zestimate = data.zestimate || data.Price;

        if (!zestimate) {
          results.push({ address: prop.address, status: "error", error: "No Zestimate in response" });
          continue;
        }

        // Update database
        await supabaseRest("property_assets", {
          method: "PATCH",
          query: `id=eq.${prop.id}`,
          body: {
            zestimate,
            current_value: zestimate,
            zillow_zpid: String(zpid),
            valuation_source: "zillow_private_api",
            zestimate_updated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });

        results.push({ address: prop.address, status: "updated", zestimate });

        // Brief delay between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        results.push({ address: prop.address, status: "error", error: err.message });
      }
    }

    return sendJson(res, 200, {
      updated_at: new Date().toISOString(),
      properties_processed: properties.length,
      results,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
