const { qbApiCall, validateReportName, sendJson, loadAllConnections } = require("../_lib/quickbooks");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const { name, company_key, start_date, end_date } = req.query || {};

    if (!name) return sendJson(res, 400, { error: "Report name is required (e.g., ProfitAndLoss)" });

    const validatedName = validateReportName(name);
    const companyKey = company_key || "cg";

    // Build QB report query params
    const params = new URLSearchParams();
    if (start_date) params.set("start_date", start_date);
    if (end_date) params.set("end_date", end_date);

    const queryString = params.toString();
    const path = `/reports/${validatedName}${queryString ? `?${queryString}` : ""}`;

    const { data, intuitTid } = await qbApiCall(companyKey, { path });

    return sendJson(res, 200, {
      report: data,
      reportName: validatedName,
      companyKey,
      intuitTid,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("QB Report error:", err.message);
    return sendJson(res, err.statusCode || 500, {
      error: err.message,
      connected: false,
    });
  }
};
