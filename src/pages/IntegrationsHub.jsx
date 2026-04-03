import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const MC_API = () => localStorage.getItem("mc-api-url") || "http://localhost:7070";

const INTEGRATION_META = {
  // AI Models
  "anthropic": { name: "Anthropic Claude", desc: "Primary AI — Sonnet 4.6, Haiku 4.5, Opus 4.6", category: "AI Models" },
  "openai": { name: "OpenAI", desc: "Whisper, DALL-E, Image Gen", category: "AI Models" },
  "ollama": { name: "Ollama", desc: "Local inference — llama3.2, qwen, codellama", category: "AI Models" },
  "openai-codex": { name: "OpenAI Codex", desc: "ACP coding delegation runtime", category: "AI Models" },
  "exa": { name: "Exa Search", desc: "Neural web search MCP server", category: "AI Models" },
  "composio": { name: "Composio", desc: "Tool orchestration SDK", category: "AI Models" },
  // Messaging
  "telegram": { name: "Telegram", desc: "Bot messaging channel", category: "Messaging" },
  "slack": { name: "Slack", desc: "Workspace messaging via Socket Mode", category: "Messaging" },
  "discord": { name: "Discord", desc: "Guild messaging — all channels", category: "Messaging" },
  // STR / Rentals
  "lodgify": { name: "Lodgify", desc: "PMS — property management + bookings", category: "STR" },
  "pricelabs": { name: "Price Labs", desc: "Dynamic pricing + revenue management", category: "STR" },
  // Business / Finance
  "monday.com": { name: "Monday.com", desc: "External business project management", category: "Business" },
  "quickbooks": { name: "QuickBooks", desc: "Accounting + financial management", category: "Business" },
  "canva": { name: "Canva", desc: "Design + marketing assets", category: "Business" },
  // Infrastructure
  "supabase": { name: "Supabase", desc: "PostgreSQL database + auth", category: "Infrastructure" },
  "vercel": { name: "Vercel", desc: "Production deployment platform", category: "Infrastructure" },
  "grafana": { name: "Grafana Cloud", desc: "Monitoring + observability dashboards", category: "Infrastructure" },
  "tailscale": { name: "Tailscale", desc: "Mesh VPN — Mac Mini cluster", category: "Infrastructure" },
  "cloud-redis": { name: "Cloud Redis", desc: "Redis cache / message broker", category: "Infrastructure" },
  "cloudflare": { name: "Cloudflare", desc: "DNS + CDN + security", category: "Infrastructure" },
  // Dev Tools
  "github": { name: "GitHub", desc: "Code repos, CI/CD, GitHub Pages", category: "Dev Tools" },
  "brave": { name: "Brave Search", desc: "Web search API for agents", category: "Dev Tools" },
  "fast.io": { name: "Fast.io", desc: "CDN file hosting from Google Drive", category: "Dev Tools" },
  // Automation / Monitoring
  "n8n": { name: "n8n", desc: "Workflow automation platform", category: "Automation" },
  "spike.sh": { name: "Spike.sh", desc: "Incident alerting + webhooks", category: "Monitoring" },
  // Productivity
  "lastpass": { name: "LastPass", desc: "Password manager", category: "Productivity" },
  "1password": { name: "1Password", desc: "Secret management", category: "Productivity" },
};

function statusColor(s) {
  if (s === "active" || s === "connected") return C.green;
  if (s === "degraded" || s === "warning") return C.amber;
  if (s === "disconnected" || s === "missing" || s === "expired") return C.red;
  return C.cyan;
}

const IntegrationsHub = () => {
  const { snapshot } = useMissionControlData();
  const apiCreds = snapshot?.apiCredentials || [];
  const [expanded, setExpanded] = useState(null);
  const [updateKey, setUpdateKey] = useState("");
  const [updateResult, setUpdateResult] = useState(null);
  const [filter, setFilter] = useState("all");

  const integrations = apiCreds.map(cred => {
    const meta = INTEGRATION_META[cred.provider] || { name: cred.provider, desc: cred.provider, category: "Other" };
    return { ...cred, ...meta };
  });

  const categories = [...new Set(integrations.map(i => i.category))];
  const filtered = filter === "all" ? integrations : integrations.filter(i => i.category === filter);
  const connected = integrations.filter(i => i.status === "active").length;
  const issues = integrations.filter(i => i.status !== "active").length;

  const handleUpdateKey = async (provider) => {
    if (!updateKey.trim()) return;
    setUpdateResult(null);
    try {
      // Call local API to update the key
      const resp = await fetch(`${MC_API()}/task`, { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name:`Update API key: ${provider}`,agent:"main",status:"pending",description:`Update ${provider} API key via Settings`})});
      const data = await resp.json();
      setUpdateResult(data.ok ? { ok: true, msg: "Key update dispatched to agent" } : { ok: false, msg: data.error });
      setUpdateKey("");
    } catch(e) {
      setUpdateResult({ ok: false, msg: `Run: openclaw config set ... manually` });
    }
    setTimeout(() => setUpdateResult(null), 5000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Integrations Hub</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Connected services, API keys, and integration health</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Connected" value={connected} sub="Active integrations" color={C.green} />
        <KPI label="Issues" value={issues} sub={issues ? "Needs attention" : "All clear"} color={issues ? C.red : C.green} />
        <KPI label="Total" value={integrations.length} sub="Configured services" color={C.accent} />
      </div>

      {/* Category filters */}
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{ background: filter === "all" ? C.accent : C.surface, color: filter === "all" ? "#fff" : C.muted, border: `1px solid ${filter === "all" ? C.accent : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ background: filter === cat ? C.accent : C.surface, color: filter === cat ? "#fff" : C.muted, border: `1px solid ${filter === cat ? C.accent : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{cat}</button>
        ))}
      </div>

      {/* Integration cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {filtered.map(integ => {
          const isExpanded = expanded === integ.id;
          return (
            <Card key={integ.id}>
              <div onClick={() => setExpanded(isExpanded ? null : integ.id)} style={{ cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: C.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.accent }}>
                      {integ.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{integ.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{integ.desc || integ.category}</div>
                    </div>
                  </div>
                  <Badge color={statusColor(integ.status)}>{integ.status}</Badge>
                </div>
              </div>

              {isExpanded && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>API Key</div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: C.text, padding: "6px 8px", background: C.bg, borderRadius: 4, wordBreak: "break-all" }}>
                    {integ.maskedKey || "Not configured"}
                  </div>
                  {integ.lastUpdated && (
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Last updated: {new Date(integ.lastUpdated).toLocaleDateString()}</div>
                  )}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>Update Key</div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <input type="password" value={updateKey} onChange={e => setUpdateKey(e.target.value)} placeholder="New API key..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontSize: 12 }} />
                      <button onClick={() => handleUpdateKey(integ.provider)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                    </div>
                  </div>
                  {updateResult && (
                    <div style={{ marginTop: 6, padding: 6, borderRadius: 4, background: updateResult.ok ? C.green+"22" : C.red+"22", color: updateResult.ok ? C.green : C.red, fontSize: 11 }}>
                      {updateResult.msg}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default IntegrationsHub;
