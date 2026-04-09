import { useState, useEffect, useCallback } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { getApiUrl } from "../utils/api";
import { statusColor } from "./liveViewUtils";

const INTEGRATION_META = {
  // AI Models
  "anthropic": { name: "Anthropic Claude", desc: "Primary AI — Sonnet 4.6, Haiku 4.5, Opus 4.6", category: "AI Models", knownStatus: "active" },
  "openai": { name: "OpenAI", desc: "GPT-4o, GPT-5.4, Whisper, DALL-E", category: "AI Models", knownStatus: "active" },
  "ollama": { name: "Ollama", desc: "Local inference — qwen2.5-coder:32b", category: "AI Models", knownStatus: "active" },
  "openai-codex": { name: "OpenAI Codex", desc: "ACP coding delegation runtime", category: "AI Models", knownStatus: "active" },
  "exa": { name: "Exa Search", desc: "Neural web search MCP server", category: "AI Models", knownStatus: "active" },
  // Messaging
  "telegram": { name: "Telegram", desc: "Bot messaging — agent delivery channel", category: "Messaging", knownStatus: "active" },
  "slack": { name: "Slack", desc: "Workspace messaging via MCP + Socket Mode", category: "Messaging", knownStatus: "active" },
  "discord": { name: "Discord", desc: "Guild messaging — all channels", category: "Messaging", knownStatus: "active" },
  // STR / Rentals
  "lodgify": { name: "Lodgify", desc: "PMS — property management + bookings", category: "STR", knownStatus: "active" },
  "pricelabs": { name: "Price Labs", desc: "Dynamic pricing + revenue management", category: "STR", knownStatus: "active" },
  // Business / Finance
  "monday.com": { name: "Monday.com", desc: "Connected — not used for task mgmt (Mission Control only)", category: "Business", knownStatus: "active" },
  "monday": { name: "Monday.com", desc: "Connected — not used for task mgmt (Mission Control only)", category: "Business", knownStatus: "active", aliasOf: "monday.com" },
  "quickbooks": { name: "QuickBooks", desc: "Accounting + financial management via OAuth", category: "Business", knownStatus: "not configured" },
  "plaid": { name: "Plaid", desc: "Bank + brokerage account aggregation (read-only)", category: "Business", knownStatus: "not configured" },
  "coinbase": { name: "Coinbase", desc: "Crypto portfolio + trading via OAuth API", category: "Business", knownStatus: "not configured" },
  "canva": { name: "Canva", desc: "Design + marketing assets via MCP", category: "Business", knownStatus: "active" },
  "notion": { name: "Notion", desc: "Knowledge base + docs via MCP", category: "Business", knownStatus: "active" },
  // Google Workspace
  "google": { name: "Google Workspace", desc: "OAuth — Calendar, Gmail, Tasks, Drive", category: "Google", knownStatus: "active" },
  "gmail": { name: "Gmail", desc: "Email management via MCP", category: "Google", knownStatus: "active" },
  "google-calendar": { name: "Google Calendar", desc: "Calendar management via MCP", category: "Google", knownStatus: "active" },
  // Infrastructure
  "supabase": { name: "Supabase", desc: "PostgreSQL database + auth via MCP", category: "Infrastructure", knownStatus: "active" },
  "vercel": { name: "Vercel", desc: "Production deployment platform via MCP", category: "Infrastructure", knownStatus: "active" },
  "grafana": { name: "Grafana Cloud", desc: "Monitoring + observability dashboards", category: "Infrastructure", knownStatus: "active" },
  "tailscale": { name: "Tailscale", desc: "Mesh VPN — Mac Mini cluster", category: "Infrastructure", knownStatus: "active" },
  "cloudflare": { name: "Cloudflare", desc: "DNS + CDN + security", category: "Infrastructure", knownStatus: "active" },
  // Dev Tools
  "github": { name: "GitHub", desc: "Code repos, CI/CD, GitHub Pages", category: "Dev Tools" },
  "brave": { name: "Brave Search", desc: "Web search API for agents", category: "Dev Tools", knownStatus: "active" },
  "dropbox": { name: "Dropbox", desc: "Cloud file storage (dbxcli)", category: "Dev Tools", knownStatus: "active" },
  "fast.io": { name: "Fast.io", desc: "CDN file hosting from Google Drive", category: "Dev Tools", knownStatus: "active" },
  // Automation / Monitoring
  "n8n": { name: "n8n", desc: "Workflow automation platform via MCP", category: "Automation", knownStatus: "active" },
  "spike.sh": { name: "Spike.sh", desc: "Incident alerting + webhooks", category: "Monitoring", knownStatus: "active" },
  // System
  "macos": { name: "macOS", desc: "System screen unlock credential", category: "System", knownStatus: "active" },
};

// ── QuickBooks Status Hook ──────────────────────────────────────────────────

function useQuickBooksStatus() {
  const [qbStatus, setQbStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    fetch("/api/qb/status?test=true")
      .then(r => r.json())
      .then(data => {
        setQbStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setQbStatus(null);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Check URL params for post-OAuth status
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("qb_status")) {
      refresh();
      // Clean up URL params
      const url = new URL(window.location);
      url.searchParams.delete("qb_status");
      url.searchParams.delete("qb_error");
      url.searchParams.delete("qb_error_description");
      url.searchParams.delete("realmId");
      url.searchParams.delete("companyId");
      url.searchParams.delete("qb_store");
      window.history.replaceState({}, "", url.toString());
    }
  }, [refresh]);

  const connected = qbStatus?.statuses?.some(s => s.token_status === "valid" && s.api_test === "ok");
  const firstConn = qbStatus?.statuses?.[0] || null;

  return { qbStatus, firstConn, connected, loading, refresh };
}

// ── QuickBooks Card Detail ──────────────────────────────────────────────────

function QuickBooksDetail({ qb, onRefresh }) {
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = async () => {
    if (!confirm("Disconnect QuickBooks? This will revoke the OAuth tokens.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/qb/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: qb.firstConn?.company_key || "",
          realmId: qb.firstConn?.realm_id || "",
        }),
      });
      onRefresh();
    } catch {
      // refresh anyway to show current state
      onRefresh();
    }
    setDisconnecting(false);
  };

  if (qb.loading) {
    return (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, color: C.muted }}>Checking QuickBooks connection...</div>
      </div>
    );
  }

  if (!qb.connected) {
    return (
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
          QuickBooks is not connected. Authorize access to enable financial data sync.
        </div>
        <a
          href="/api/qb/connect?returnTo=/integrations"
          style={{
            display: "inline-block", background: "#2ca01c", color: "#fff", border: "none",
            borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600,
            textDecoration: "none", cursor: "pointer",
          }}
        >
          Connect QuickBooks
        </a>
      </div>
    );
  }

  const conn = qb.firstConn;
  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
      {conn.company_name && (
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
          {conn.company_name}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
        <div>
          <span style={{ color: C.muted }}>Realm ID: </span>
          <span style={{ color: C.text, fontFamily: "monospace" }}>{conn.realm_id || "—"}</span>
        </div>
        <div>
          <span style={{ color: C.muted }}>Environment: </span>
          <span style={{ color: C.text }}>{qb.qbStatus?.environment || "sandbox"}</span>
        </div>
        <div>
          <span style={{ color: C.muted }}>Token: </span>
          <Badge color={conn.token_status === "valid" ? C.green : C.red}>{conn.token_status}</Badge>
        </div>
        <div>
          <span style={{ color: C.muted }}>Expires: </span>
          <span style={{ color: C.text }}>
            {conn.minutes_remaining > 0 ? `${conn.minutes_remaining}m` : "expired"}
          </span>
        </div>
        {conn.refresh_days_remaining != null && (
          <div>
            <span style={{ color: C.muted }}>Refresh token: </span>
            <span style={{ color: conn.refresh_days_remaining > 7 ? C.green : C.amber }}>
              {conn.refresh_days_remaining}d remaining
            </span>
          </div>
        )}
        <div>
          <span style={{ color: C.muted }}>API test: </span>
          <Badge color={conn.api_test === "ok" ? C.green : C.red}>{conn.api_test || "—"}</Badge>
        </div>
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button
          onClick={onRefresh}
          style={{
            background: C.surface, color: C.muted, border: `1px solid ${C.border}`,
            borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          Refresh Status
        </button>
        <button
          onClick={handleDisconnect}
          disabled={disconnecting}
          style={{
            background: "transparent", color: C.red, border: `1px solid ${C.red}44`,
            borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer",
            opacity: disconnecting ? 0.5 : 1,
          }}
        >
          {disconnecting ? "Disconnecting..." : "Disconnect"}
        </button>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

const IntegrationsHub = () => {
  const { snapshot } = useMissionControlData();
  const apiCreds = snapshot?.apiCredentials || [];
  const [expanded, setExpanded] = useState(null);
  const [updateKeys, setUpdateKeys] = useState({});
  const [updateResults, setUpdateResults] = useState({});
  const [filter, setFilter] = useState("all");

  const qb = useQuickBooksStatus();

  // Merge live apiCredentials with the full INTEGRATION_META registry
  const integrations = (() => {
    const credsByProvider = {};
    apiCreds.forEach(cred => { credsByProvider[cred.provider] = cred; });
    const seen = new Set();
    const result = [];
    // First: entries from live data, enriched with metadata
    apiCreds.forEach(cred => {
      const meta = INTEGRATION_META[cred.provider] || { name: cred.provider, desc: cred.provider, category: "Other" };
      if (meta.aliasOf) return; // skip aliases if the canonical exists
      seen.add(cred.provider);
      result.push({ ...cred, ...meta, status: cred.status || meta.knownStatus || "not configured" });
    });
    // Second: entries from INTEGRATION_META that aren't in live data
    Object.entries(INTEGRATION_META).forEach(([key, meta]) => {
      if (seen.has(key) || meta.aliasOf) return;
      const entry = { id: key, provider: key, ...meta, status: meta.knownStatus || "not configured", maskedKey: null };
      // Override QuickBooks status with live status
      if (key === "quickbooks") {
        if (qb.loading) {
          entry.status = "checking...";
        } else if (qb.connected) {
          entry.status = "active";
          if (qb.firstConn?.company_name) {
            entry.desc = qb.firstConn.company_name + " — " + (qb.qbStatus?.environment || "sandbox");
          }
        } else {
          entry.status = "not configured";
        }
      }
      result.push(entry);
    });
    return result;
  })();

  const categories = [...new Set(integrations.map(i => i.category))];
  const filtered = filter === "all" ? integrations : integrations.filter(i => i.category === filter);
  const connected = integrations.filter(i => i.status === "active").length;
  const issues = integrations.filter(i => i.status !== "active" && i.status !== "checking...").length;

  const handleUpdateKey = async (provider) => {
    if (!(updateKeys[provider] || "").trim()) return;
    setUpdateResults(prev => ({...prev, [provider]: null}));
    try {
      const resp = await fetch(`${getApiUrl()}/task`, { method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({name:`Update API key: ${provider}`,agent:"main",status:"pending",description:`Update ${provider} API key via Settings`})});
      const data = await resp.json();
      setUpdateResults(prev => ({...prev, [provider]: data.ok ? { ok: true, msg: "Key update dispatched to agent" } : { ok: false, msg: data.error }}));
      setUpdateKeys(prev => ({...prev, [provider]: ""}));
    } catch(e) {
      setUpdateResults(prev => ({...prev, [provider]: { ok: false, msg: `Run: openclaw config set ... manually` }}));
    }
    setTimeout(() => setUpdateResults(prev => ({...prev, [provider]: null})), 5000);
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
          const isQB = integ.provider === "quickbooks";
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

              {isExpanded && isQB && (
                <QuickBooksDetail qb={qb} onRefresh={qb.refresh} />
              )}

              {isExpanded && !isQB && (
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
                      <input type="password" value={updateKeys[expanded] || ""} onChange={e => setUpdateKeys(prev => ({...prev, [expanded]: e.target.value}))} placeholder="New API key..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 8px", color: C.text, fontSize: 12 }} />
                      <button onClick={() => handleUpdateKey(integ.provider)} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Dispatch Update</button>
                    </div>
                    <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>Sends a task to the main agent to update this key</div>
                  </div>
                  {updateResults[expanded] && (
                    <div style={{ marginTop: 6, padding: 6, borderRadius: 4, background: updateResults[expanded].ok ? C.green+"22" : C.red+"22", color: updateResults[expanded].ok ? C.green : C.red, fontSize: 11 }}>
                      {updateResults[expanded].msg}
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
