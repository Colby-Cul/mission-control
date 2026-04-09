const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const tasks = await supabaseRest("tasks", {
        query: "order=created_at.desc&limit=100",
      });
      return res.status(200).json(tasks || []);
    }

    if (req.method === "POST") {
      const { name, description, project_id, agent, priority, phase, status } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });

      const task = await supabaseRest("tasks", {
        method: "POST",
        body: {
          name,
          description: description || null,
          project_id: project_id || null,
          agent: agent || "main",
          priority: priority || "normal",
          phase: phase || null,
          status: status || "pending",
        },
      });
      return res.status(201).json({ ok: true, task: task?.[0] || task });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Tasks API error:", err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
