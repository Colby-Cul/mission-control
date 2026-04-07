const { sendJson } = require("../_lib/plaid");
const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { account_id, start, end, limit = "100", offset = "0" } = req.query;
    let query = "select=*";

    if (account_id) query += `&account_id=eq.${account_id}`;
    if (start) query += `&date=gte.${start}`;
    if (end) query += `&date=lte.${end}`;
    query += `&order=date.desc,created_at.desc`;
    query += `&limit=${Math.min(parseInt(limit, 10), 500)}`;
    query += `&offset=${parseInt(offset, 10)}`;

    const transactions = await supabaseRest("financial_transactions", { query });

    return sendJson(res, 200, { transactions: transactions || [] });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, { error: error.message });
  }
};
