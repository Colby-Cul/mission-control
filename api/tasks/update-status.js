const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { id, sessionId, status, lane, priority, agent, completed_at } = req.body || {};
    const taskId = id || sessionId;
    if (!taskId) return res.status(400).json({ error: "id or sessionId is required" });
    if (!status && !priority && !lane) return res.status(400).json({ error: "At least one of status, priority, or lane is required" });

    const updates = { updated_at: new Date().toISOString() };
    if (status) updates.status = status;
    if (lane) updates.lane = lane;
    if (priority) updates.priority = priority;
    if (agent) updates.agent = agent;
    if (status === "done" || status === "completed") {
      updates.completed_at = completed_at || new Date().toISOString();
    }

    const result = await supabaseRest("tasks", {
      method: "PATCH",
      query: `id=eq.${taskId}`,
      body: updates,
    });
    return res.status(200).json({ ok: true, task: result?.[0] || result });
  } catch (err) {
    console.error("Task update error:", err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
