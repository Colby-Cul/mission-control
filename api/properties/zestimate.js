const { supabaseRest } = require("../_lib/supabase");

const RAPIDAPI_KEY = (process.env.RAPIDAPI_KEY || "").trim();
const ZILLOW_HOST = "private-zillow.p.rapidapi.com";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

async function fetchZestimateByZpid(zpid) {
  const zillowUrl = `https://www.zillow.com/homedetails/${zpid}_zpid/`;
  const r = await fetch(`https://${ZILLOW_HOST}/byurl?url=${encodeURIComponent(zillowUrl)}`, {
    headers: {
      "x-rapidapi-key": RAPIDAPI_KEY,
      "x-rapidapi-host": ZILLOW_HOST,
    },
  });

  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Zillow API error (${r.status}): ${errText.substring(0, 200)}`);
  }

  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!RAPIDAPI_KEY) {
    return sendJson(res, 500, { error: "RAPIDAPI_KEY not configured." });
  }

  try {
    const body = typeof req.body === "object" ? req.body : JSON.parse(req.body || "{}");
    const { property_id } = body;

    if (!property_id) {
      return sendJson(res, 400, { error: "property_id is required" });
    }

    // Get property from DB
    const props = await supabaseRest("property_assets", {
      query: `id=eq.${property_id}&select=id,address,city,state,zip,zillow_zpid`,
    });

    if (!props || !props.length) {
      return sendJson(res, 404, { error: "Property not found" });
    }

    const prop = props[0];
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
        return sendJson(res, 404, { error: "Property not found on Zillow" });
      }
    }

    // Fetch Zestimate
    const data = await fetchZestimateByZpid(zpid);
    const zestimate = data.zestimate || data.Price;

    if (!zestimate) {
      return sendJson(res, 404, { error: "No Zestimate available", zpid, raw: data });
    }

    // Update database
    await supabaseRest("property_assets", {
      method: "PATCH",
      query: `id=eq.${property_id}`,
      body: {
        zestimate,
        current_value: zestimate,
        zillow_zpid: String(zpid),
        valuation_source: "zillow_private_api",
        zestimate_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    });

    return sendJson(res, 200, {
      zpid,
      zestimate,
      address: `${data.PropertyAddress?.streetAddress}, ${data.PropertyAddress?.city}`,
      bedrooms: data.Bedrooms,
      bathrooms: data.Bathrooms,
      sqft: data["Area(sqft)"],
      yearBuilt: data.yearBuilt,
      updated: true,
    });
  } catch (error) {
    console.error("Zestimate error:", error.message);
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};

module.exports.fetchZestimateByZpid = fetchZestimateByZpid;
