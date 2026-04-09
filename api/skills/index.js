module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();

  // Skills data is bundled in live-data.json at build time
  return res.status(200).json({ ok: true, skills: [], note: "Skills are loaded from live-data.json" });
};
