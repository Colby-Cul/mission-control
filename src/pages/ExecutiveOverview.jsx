import { Card, KPI, Badge } from "../components/shared";
import { mockSummary } from "../data/mockFinancialData.js";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const MISSION = "Our mission is to create an autonomous wealth-building organization that grows revenue, cuts inefficiency, manages capital intelligently, and compounds value across every company and investment\u2014transforming complexity into control, execution into scale, and scale into generational wealth.";

const STANDING_PRIORITIES = [
  { rank: 1, name: "Revenue Growth", desc: "Grow top-line across all entities relentlessly" },
  { rank: 2, name: "Expense Reduction", desc: "Cut waste, renegotiate, automate cost centers" },
  { rank: 3, name: "Margin / Cash Flow", desc: "Improve margins and free cash flow every quarter" },
  { rank: 4, name: "Autonomous Operations", desc: "Remove human bottlenecks, build self-running systems" },
  { rank: 5, name: "Intelligent Capital Allocation", desc: "Deploy capital where risk-adjusted returns are highest" },
  { rank: 6, name: "Entity / Asset Coordination", desc: "Orchestrate entities, trusts, and assets as one portfolio" },
  { rank: 7, name: "Financial Integration", desc: "Unify personal and business finances into a single view" },
];

const COMMAND_LAYERS = [
  { id: "CMD-1", name: "Executive Overview", status: "Active", color: C.green, desc: "Founder profile, mission, standing priorities" },
  { id: "CMD-2", name: "Entity Map", status: "Not Started", color: C.muted, desc: "All companies, trusts, and ownership structure" },
  { id: "CMD-3", name: "Revenue Engine", status: "Not Started", color: C.muted, desc: "Revenue tracking across C&C, Xome, and all entities" },
  { id: "CMD-4", name: "Expense Control", status: "Not Started", color: C.muted, desc: "Expense monitoring, reduction targets, automation" },
  { id: "CMD-5", name: "Cash Flow Command", status: "Not Started", color: C.muted, desc: "Cash flow forecasting and optimization" },
  { id: "CMD-6", name: "Investment HQ", status: "Not Started", color: C.muted, desc: "Portfolio management, real estate, crypto, equities" },
  { id: "CMD-7", name: "Operations Center", status: "Not Started", color: C.muted, desc: "Autonomous ops, agent orchestration, workflows" },
  { id: "CMD-8", name: "Strategic Planning", status: "Not Started", color: C.muted, desc: "Long-term goals, milestones, scenario planning" },
  { id: "CMD-9", name: "Risk & Compliance", status: "Not Started", color: C.muted, desc: "Risk register, insurance, legal, tax compliance" },
  { id: "CMD-10", name: "Memory & Knowledge", status: "Not Started", color: C.muted, desc: "Institutional memory, decision logs, knowledge base" },
];

/* METRICS is now computed inside the component using live data */

function statusBadgeColor(status) {
  if (status === "Active") return C.green;
  if (status === "In Progress") return C.amber;
  return C.muted;
}

const ExecutiveOverview = () => {
  const { agents, acpSessions, projects, skills } = useMissionControlData();

  const financialData = mockSummary;

  const METRICS = [
    { label: "Net Worth", value: `$${financialData.net_worth.toLocaleString()}`, sub: "Total net worth", color: C.purple },
    { label: "Banking Total", value: `$${financialData.banking.total.toLocaleString()}`, sub: "Total bank balances", color: C.green },
    { label: "Investments", value: `$${financialData.investments.total.toLocaleString()}`, sub: "Current investments value", color: C.amber },
    { label: "Real Estate Equity", value: `$${financialData.real_estate.owned_equity.toLocaleString()}`, sub: "Equity in properties", color: C.cyan },
    { label: "Crypto Holdings", value: `$${financialData.crypto.total.toLocaleString()}`, sub: "Cryptocurrency value", color: C.blue },
    { label: "Active Sessions", value: acpSessions.filter(s => s.status !== "done").length, sub: "In-progress tasks", color: C.green },
    { label: "Total Cost", value: "$" + acpSessions.reduce((s, t) => s + (t.totalCost || 0), 0).toFixed(2), sub: "Across all sessions", color: C.purple },
    { label: "Projects", value: projects.length, sub: "Tracked projects", color: C.cyan },
    { label: "Skills Deployed", value: skills.length, sub: "Active skills", color: C.amber },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Founder Profile Card */}
      <div style={{
        padding: "28px 32px",
        borderRadius: 16,
        background: `linear-gradient(135deg, ${C.accent}18, ${C.purple}12, ${C.cyan}08)`,
        border: `1px solid ${C.border}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 800, color: "#fff", flexShrink: 0,
          }}>CC</div>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: C.text, margin: 0 }}>Colby Culbertson</h1>
            <div style={{ fontSize: 14, color: C.accentLight, fontWeight: 600, marginTop: 2 }}>
              Entrepreneur / Founder / Operator / Investor
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <Badge color={C.green}>CMD-1 Active</Badge>
          </div>
        </div>

        {/* Mission Statement */}
        <div style={{
          padding: "16px 20px",
          borderRadius: 12,
          background: C.surface,
          border: `1px solid ${C.border}`,
          marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Mission Statement
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.65, fontStyle: "italic" }}>
            "{MISSION}"
          </div>
        </div>

        {/* Objective */}
        <div style={{
          padding: "12px 20px",
          borderRadius: 12,
          background: C.card,
          border: `1px solid ${C.border}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.cyan, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
            Objective
          </div>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>
            Multi-billion-dollar family net worth by age 50
          </div>
          <div style={{ marginLeft: "auto", fontSize: 12, color: C.muted, whiteSpace: "nowrap" }}>
            Family: Kristi, Cash (2013), Chanel (2015)
          </div>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${METRICS.length}, 1fr)`, gap: 10 }}>
        {METRICS.map(m => (
          <KPI key={m.label} label={m.label} value={m.value} sub={m.sub} color={m.color} />
        ))}
      </div>

      {/* Standing Priorities + Command Layers side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Standing Priorities */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>
            Standing Priorities
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {STANDING_PRIORITIES.map(p => (
              <div key={p.rank} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px", borderRadius: 8,
                background: p.rank <= 3 ? `${C.accent}08` : "transparent",
                borderBottom: `1px solid ${C.border}22`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: p.rank <= 3 ? C.accent : C.card,
                  border: `1px solid ${p.rank <= 3 ? C.accent : C.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: p.rank <= 3 ? "#fff" : C.muted,
                }}>{p.rank}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Command View - 10 Layers */}
        <Card>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>
            Command View
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {COMMAND_LAYERS.map(layer => (
              <div key={layer.id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 8,
                borderBottom: `1px solid ${C.border}22`,
              }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: layer.color,
                  boxShadow: layer.status === "Active" ? `0 0 8px ${layer.color}` : "none",
                  flexShrink: 0,
                }} />
                <div style={{
                  fontSize: 11, fontWeight: 700, color: C.muted,
                  width: 48, flexShrink: 0,
                }}>{layer.id}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{layer.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>{layer.desc}</div>
                </div>
                <Badge color={statusBadgeColor(layer.status)}>{layer.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ExecutiveOverview;
