const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { id, status, agent, completed_at } = req.body || {};
    if (!id || !status) return res.status(400).json({ error: "id and status are required" });

    const updates = { status, updated_at: new Date().toISOString() };
    if (agent) updates.agent = agent;
    if (status === "done" || status === "completed") {
      updates.completed_at = completed_at || new Date().toISOString();
    }

    const result = await supabaseRest("tasks", {
      method: "PATCH",
      query: `id=eq.${id}`,
      body: updates,
    });
    return res.status(200).json({ ok: true, task: result?.[0] || result });
  } catch (err) {
    console.error("Task update error:", err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
