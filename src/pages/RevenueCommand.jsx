import { useState, useEffect } from "react";
import { Card, Badge, KPI } from "../components/shared";
import { C } from "../data/constants";

const fmt = (n) => {
  const num = Number(n);
  if (!isFinite(num)) return "$0";
  if (Math.abs(num) >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (Math.abs(num) >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toFixed(0)}`;
};
const fmtPct = (n) => `${Number(n) >= 0 ? "+" : ""}${Number(n).toFixed(1)}%`;
const clr = (n) => (Number(n) >= 0 ? C.green : C.red);

const BUSINESSES = [
  { id: "cg", name: "Culbertson & Gray Group", abbrev: "C&G Group",
    type: "Real Estate Brokerage", color: C.accent, emoji: "🏡",
    annualRevenue: 284000, annualExpenses: 196000, monthlyBurn: 16333, netIncome: 88000,
    mom: null, yoy: null, qbConnected: false, status: "active",
    dataSource: "constants.js baseline (QB blocked — MATON_API_KEY required)" },
  { id: "xome", name: "Xome Home Mortgage", abbrev: "Xome",
    type: "Proptech / Mortgage", color: C.cyan, emoji: "🏦",
    annualRevenue: null, annualExpenses: null, monthlyBurn: null, netIncome: null,
    mom: null, yoy: null, qbConnected: false, status: "active", dashboardLink: "/xome",
    dataSource: "QB blocked — MATON_API_KEY required" },
  { id: "cls", name: "California Luxury Stays", abbrev: "CLS / STR",
    type: "Short-Term Rentals", color: C.teal, emoji: "🏔️",
    annualRevenue: null, annualExpenses: null, monthlyBurn: null, netIncome: null,
    mom: null, yoy: null, qbConnected: false, status: "active",
    dataSource: "Lodgify API (not yet connected)",
    properties: [
      { name: "47 Shasta Trail", location: "Graeagle, CA", status: "live" },
      { name: "210 Bitter Brush Way", location: "Northstar, CA", status: "live" },
    ] },
];

const GROWTH_INITIATIVES = [
  { id: "mc-expansion", name: "Mission Control OS Build", business: "All",
    status: "in_progress", priority: "critical", performing: true,
    notes: "28 tasks active. CMD-1 ✅, CMD-6 done. Core infra in flight.", owner: "Jarvis + Colton" },
  { id: "guest-welcome-book", name: "Guest Welcome Book (CLS)", business: "CLS",
    status: "in_progress", priority: "high", performing: true,
    notes: "2/5 tasks done. Site live. Dynamic CMS + Lodgify pending.", owner: "Soren (coding-agent)" },
  { id: "str-website", name: "Pineside Cabins Website", business: "CLS",
    status: "in_progress", priority: "high", performing: true,
    notes: "2/3 tasks done. Next.js site live. Guest portal routing pending.", owner: "STR agent" },
  { id: "qb-pipeline", name: "QuickBooks Data Pipeline", business: "All",
    status: "blocked", priority: "critical", performing: false,
    notes: "❌ MATON_API_KEY not set. No QB data until configured.", owner: "Soren (coding-agent)" },
  { id: "monday-pipeline", name: "Monday.com C&G Pipeline", business: "C&G Group",
    status: "blocked", priority: "high", performing: false,
    notes: "❌ Token exists, exec unavailable. Pipeline data inaccessible.", owner: "Colton (cfo)" },
  { id: "entity-map", name: "Entity Map & Ownership (CMD-2)", business: "All",
    status: "in_progress", priority: "critical", performing: true,
    notes: "Backend schema + API in progress. Designer building viz.", owner: "apex-coder-backup" },
  { id: "seo", name: "SEO & Digital Presence", business: "CLS",
    status: "todo", priority: "normal", performing: null,
    notes: "Research queued. CaliforniaLuxuryStays.com live — SEO audit needed.", owner: "Serena (beacon)" },
];

const statusColor = (s) => ({ active: C.green, in_progress: C.amber, blocked: C.red, todo: C.muted, done: C.green }[s] || C.muted);
const priorityColor = (p) => ({ critical: C.red, high: C.amber, normal: C.cyan, low: C.muted }[p] || C.muted);

const MiniBar = ({ value, max, color }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ height: 6, borderRadius: 4, background: C.border, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4 }} />
    </div>
  );
};

export default function RevenueCommand() {
  const [activeTab, setActiveTab] = useState("overview");
  const [qbStatus] = useState("blocked");
  const [mondayStatus] = useState("blocked");

  useEffect(() => {
    document.title = "Revenue Command (CMD-3) — Mission Control";
    // ── TODO: Wire QB when MATON_API_KEY is set ──
    // fetch(`https://gateway.maton.ai/quickbooks/v3/company/:realmId/reports/ProfitAndLoss?start_date=2026-01-01&end_date=2026-12-31`, {
    //   headers: { Authorization: `Bearer ${import.meta.env.VITE_MATON_API_KEY}` }
    // }).then(r => r.json()).then(data => { /* parse and setBusinesses() */ });
  }, []);

  const totalKnownRevenue = BUSINESSES.reduce((s, b) => s + (b.annualRevenue || 0), 0);
  const totalKnownExpenses = BUSINESSES.reduce((s, b) => s + (b.annualExpenses || 0), 0);
  const totalKnownNet = totalKnownRevenue - totalKnownExpenses;
  const activeInits = GROWTH_INITIATIVES.filter(i => i.status === "in_progress").length;
  const blockedInits = GROWTH_INITIATIVES.filter(i => i.status === "blocked").length;
  const performingInits = GROWTH_INITIATIVES.filter(i => i.performing === true).length;

  const tabs = ["overview", "businesses", "growth", "pipeline", "trends"];
  const tabStyle = (t) => ({
    padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "all 0.15s",
    background: activeTab === t ? C.accent : "transparent",
    color: activeTab === t ? "#fff" : C.muted,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>💰 CMD-3: Revenue Command</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Revenue by business · Growth initiatives · Pipeline &amp; Trends</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Badge color={qbStatus === "live" ? C.green : C.red}>QB: {qbStatus === "live" ? "Live" : "Blocked"}</Badge>
          <Badge color={mondayStatus === "live" ? C.green : C.red}>Monday: {mondayStatus === "live" ? "Live" : "Blocked"}</Badge>
          <Badge color={C.amber}>Partial Data</Badge>
        </div>
      </div>

      {/* Warning banner */}
      <div style={{ padding: "12px 16px", borderRadius: 10, background: `${C.amber}15`, border: `1px solid ${C.amber}40`, fontSize: 13, color: C.amber }}>
        ⚠️ <strong>Partial data mode.</strong> QuickBooks requires <code>MATON_API_KEY</code> in auth.json.
        Monday.com pipeline requires exec access. C&amp;G baseline ($284K rev) is the only confirmed figure.
      </div>

      {/* KPI Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <KPI label="Known Annual Revenue" value={fmt(totalKnownRevenue)} sub="C&G confirmed; Xome + CLS pending" color={C.green} />
        <KPI label="Known Net Income" value={fmt(totalKnownNet)} sub="C&G only; 31% margin" color={totalKnownNet >= 0 ? C.green : C.red} />
        <KPI label="Growth Initiatives" value={`${activeInits} Active`} sub={`${blockedInits} blocked · ${performingInits} performing`} color={blockedInits > 0 ? C.amber : C.green} />
        <KPI label="Pipeline Value" value="N/A" sub="Monday.com exec required" color={C.muted} />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, background: C.surface, padding: 4, borderRadius: 10, border: `1px solid ${C.border}` }}>
        {tabs.map(t => <button key={t} style={tabStyle(t)} onClick={() => setActiveTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>)}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
          {BUSINESSES.map(b => (
            <Card key={b.id} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 22 }}>{b.emoji}</span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{b.abbrev}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>{b.type}</div>
                  </div>
                </div>
                <Badge color={b.qbConnected ? C.green : C.red}>{b.qbConnected ? "QB Live" : "QB Offline"}</Badge>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  { label: "Annual Rev", value: b.annualRevenue ? fmt(b.annualRevenue) : "—", color: b.annualRevenue ? C.green : C.muted },
                  { label: "Net Income", value: b.netIncome !== null ? fmt(b.netIncome) : "—", color: b.netIncome !== null ? clr(b.netIncome) : C.muted },
                  { label: "MoM", value: b.mom !== null ? fmtPct(b.mom) : "QB req'd", color: b.mom !== null ? clr(b.mom) : C.muted },
                  { label: "YoY", value: b.yoy !== null ? fmtPct(b.yoy) : "QB req'd", color: b.yoy !== null ? clr(b.yoy) : C.muted },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{m.label}</div>
                    <div style={{ fontSize: m.label === "Annual Rev" || m.label === "Net Income" ? 20 : 14, fontWeight: 700, color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>
              {b.annualRevenue && (
                <>
                  <MiniBar value={b.netIncome} max={b.annualRevenue} color={b.color} />
                  <div style={{ fontSize: 11, color: C.muted }}>Margin: {((b.netIncome / b.annualRevenue) * 100).toFixed(1)}% · Burn: {fmt(b.monthlyBurn)}/mo</div>
                </>
              )}
              {b.properties && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {b.properties.map(p => (
                    <div key={p.name} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.muted, padding: "4px 8px", background: C.surface, borderRadius: 6 }}>
                      <span>{p.name}</span>
                      <span style={{ color: C.green }}>{p.location}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ fontSize: 11, color: C.muted, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>📡 {b.dataSource}</div>
            </Card>
          ))}
        </div>
      )}

      {/* BUSINESSES TAB */}
      {activeTab === "businesses" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Business Revenue Breakdown</div>
            {BUSINESSES.map(b => (
              <div key={b.id} style={{ padding: "14px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{b.emoji}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{b.name}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{b.type}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 20 }}>
                    {[
                      { label: "Revenue", value: b.annualRevenue ? fmt(b.annualRevenue) : "—", color: b.annualRevenue ? C.green : C.muted },
                      { label: "Expenses", value: b.annualExpenses ? fmt(b.annualExpenses) : "—", color: b.annualExpenses ? C.red : C.muted },
                      { label: "Net", value: b.netIncome !== null ? fmt(b.netIncome) : "—", color: b.netIncome !== null ? clr(b.netIncome) : C.muted },
                      { label: "MoM", value: b.mom !== null ? fmtPct(b.mom) : "—", color: b.mom !== null ? clr(b.mom) : C.muted },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, color: C.muted }}>{m.label}</div>
                        <div style={{ fontWeight: 700, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {b.annualRevenue
                  ? <div style={{ marginTop: 10 }}><MiniBar value={b.annualRevenue} max={500000} color={b.color} /></div>
                  : <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, fontSize: 12, color: C.amber, background: `${C.amber}12`, border: `1px solid ${C.amber}30` }}>Revenue data requires QB connection (MATON_API_KEY)</div>
                }
              </div>
            ))}
          </Card>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>C&amp;G Group — P&L Baseline</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              {[
                { label: "Annual Revenue", v: "$284K", c: C.green }, { label: "Annual Expenses", v: "$196K", c: C.red },
                { label: "Net Income", v: "$88K", c: C.green }, { label: "Profit Margin", v: "31%", c: C.cyan },
                { label: "Monthly Burn", v: "$16.3K/mo", c: C.amber }, { label: "Monthly Revenue", v: "$23.7K/mo", c: C.green },
                { label: "Monthly Net", v: "$7.3K/mo", c: C.green }, { label: "Break-Even", v: "≈$196K/yr", c: C.muted },
              ].map(m => (
                <div key={m.label} style={{ background: C.surface, borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: m.c }}>{m.v}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, fontSize: 12, color: C.muted }}>Source: <code>src/data/constants.js</code> — update when QB connects.</div>
          </Card>
        </div>
      )}

      {/* GROWTH TAB */}
      {activeTab === "growth" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {[
              { n: performingInits, label: "Performing", c: C.green },
              { n: activeInits, label: "In Progress", c: C.amber },
              { n: blockedInits, label: "Blocked", c: C.red },
            ].map(m => (
              <div key={m.label} style={{ padding: "14px 16px", borderRadius: 10, background: `${m.c}15`, border: `1px solid ${m.c}30` }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: m.c }}>{m.n}</div>
                <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{m.label}</div>
              </div>
            ))}
          </div>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Growth Initiatives Tracker</div>
            {GROWTH_INITIATIVES.map(init => (
              <div key={init.id} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor(init.status), flexShrink: 0 }} />
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 14, flex: 1 }}>{init.name}</div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <Badge color={statusColor(init.status)}>{init.status.replace("_", " ")}</Badge>
                    <Badge color={priorityColor(init.priority)}>{init.priority}</Badge>
                    {init.performing === true && <Badge color={C.green}>✓ Performing</Badge>}
                    {init.performing === false && <Badge color={C.red}>✗ Blocked</Badge>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: C.muted, paddingLeft: 18, marginTop: 4 }}>
                  <span style={{ marginRight: 16 }}>Business: {init.business}</span>
                  <span>Owner: {init.owner}</span>
                </div>
                <div style={{ fontSize: 12, color: C.muted, paddingLeft: 18, marginTop: 3 }}>{init.notes}</div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* PIPELINE TAB */}
      {activeTab === "pipeline" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "20px 24px", borderRadius: 12, background: `${C.red}12`, border: `1px solid ${C.red}30` }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.red, marginBottom: 8 }}>🚫 Monday.com Pipeline — Blocked</div>
            <div style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>
              Pipeline requires <code>monday_api.MondayClient</code> via Python (exec). Not available this session.
            </div>
            <div style={{ marginTop: 14, fontSize: 13, color: C.muted }}>
              <strong style={{ color: C.text }}>To unblock:</strong><br/>
              1. Spawn ops-runner with exec access<br/>
              2. <code>from monday_api import MondayClient; c=MondayClient(); boards=c.query('query {"{ boards(limit:50) { id name } }"}')</code><br/>
              3. Find C&amp;G Pipeline board, fetch items with deal value + stage<br/>
              4. Write to <code>src/data/pipeline-data.json</code> → this component reads it
            </div>
          </div>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 6 }}>Pipeline Preview — Placeholder</div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>Replace with Monday.com live data when exec available</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Deal / Property", "Business", "Stage", "Value", "Days Open", "Status"].map(h => (
                    <th key={h} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.muted }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr><td colSpan={6} style={{ padding: "20px 10px", textAlign: "center", color: C.muted, fontSize: 13 }}>— Monday.com exec required —</td></tr>
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* TRENDS TAB */}
      {activeTab === "trends" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ padding: "16px 20px", borderRadius: 10, background: `${C.amber}12`, border: `1px solid ${C.amber}30`, fontSize: 13, color: C.amber }}>
            ⚠️ MoM and YoY trend data requires QuickBooks P&amp;L reports. Set MATON_API_KEY to unlock.
          </div>
          <Card>
            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Revenue Trends — Awaiting QB</div>
            {["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026 (MTD)"].map(month => (
              <div key={month} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 120, fontSize: 13, color: C.muted }}>{month}</div>
                <div style={{ flex: 1, height: 28, background: C.surface, borderRadius: 6, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 11, color: C.muted }}>QB data required</span>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* Data Sources Footer */}
      <Card style={{ background: C.surface }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Data Sources &amp; Integration Status</div>
        {[
          { source: "QuickBooks (Maton Gateway)", status: "blocked", detail: "Add MATON_API_KEY to config/auth.json. Get key at maton.ai/settings." },
          { source: "Monday.com (C&G Pipeline Board)", status: "blocked", detail: "Token in auth.json ✅ — needs exec tool (ops-runner or coding-agent session)." },
          { source: "constants.js (C&G baseline)", status: "live", detail: "Manual baseline: $284K rev / $196K exp. Update when QB is live." },
          { source: "Lodgify (CLS STR bookings)", status: "blocked", detail: "Not yet integrated. Will feed CLS revenue when connected." },
        ].map(s => (
          <div key={s.source} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: C.card, border: `1px solid ${s.status === "live" ? C.green + "30" : C.border}`, marginBottom: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, marginTop: 5, background: s.status === "live" ? C.green : C.red, boxShadow: s.status === "live" ? `0 0 6px ${C.green}` : "none" }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.source}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{s.detail}</div>
            </div>
            <Badge color={s.status === "live" ? C.green : C.red}>{s.status === "live" ? "Live" : "Blocked"}</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}
