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
    const properties = await supabaseRest("property_assets", {
      query: "select=*&order=city.asc",
    });

    if (!properties || properties.length === 0) {
      return sendJson(res, 200, {
        total_market_value: 0,
        total_mortgage: 0,
        total_equity: 0,
        total_owned_equity: 0,
        property_count: 0,
        properties: [],
      });
    }

    let totalMarketValue = 0;
    let totalMortgage = 0;
    let totalEquity = 0;
    let totalOwnedEquity = 0;

    const summaries = properties.map((p) => {
      const marketValue = p.current_value || p.zestimate || p.purchase_price || 0;
      const mortgage = p.mortgage_balance || 0;
      const equity = marketValue - mortgage;
      const ownedEquity = equity * (p.ownership_pct || 100) / 100;

      totalMarketValue += marketValue;
      totalMortgage += mortgage;
      totalEquity += equity;
      totalOwnedEquity += ownedEquity;

      return {
        id: p.id,
        address: `${p.address}, ${p.city}, ${p.state}`,
        entity_name: p.entity_name,
        ownership_pct: p.ownership_pct,
        market_value: marketValue,
        mortgage_balance: mortgage,
        equity,
        owned_equity: Math.round(ownedEquity * 100) / 100,
        is_rental: p.is_rental,
        valuation_source: p.valuation_source,
        zestimate_updated_at: p.zestimate_updated_at,
      };
    });

    return sendJson(res, 200, {
      total_market_value: Math.round(totalMarketValue * 100) / 100,
      total_mortgage: Math.round(totalMortgage * 100) / 100,
      total_equity: Math.round(totalEquity * 100) / 100,
      total_owned_equity: Math.round(totalOwnedEquity * 100) / 100,
      property_count: properties.length,
      properties: summaries,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
