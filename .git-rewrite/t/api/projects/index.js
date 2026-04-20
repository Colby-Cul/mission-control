const { supabaseRest } = require("../_lib/supabase");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    if (req.method === "GET") {
      const projects = await supabaseRest("projects", {
        query: "order=created_at.desc",
      });
      return res.status(200).json(projects || []);
    }

    if (req.method === "POST") {
      const { id, name, description, status, priority, agents, tags } = req.body || {};
      if (!name) return res.status(400).json({ error: "name is required" });

      const project = await supabaseRest("projects", {
        method: "POST",
        body: {
          id: id || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40),
          name,
          description: description || null,
          status: status || "active",
          priority: priority || "normal",
          agents: agents || [],
          tags: tags || [],
        },
      });
      return res.status(201).json({ ok: true, project: project?.[0] || project });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Projects API error:", err);
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
};
