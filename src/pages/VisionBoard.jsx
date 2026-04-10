import { C } from "../data/constants";

const VISION_ITEMS = [
  { id: 1, name: "New Family Home", target: "$2.5M \u2014 $3.5M", targetLow: 2500000, targetHigh: 3500000, deadline: "Apr 2027", monthsOut: 12, category: "Real Estate", status: "planning", img: "\u{1F3E1}", note: "Primary residence upgrade \u2014 need 20% down ($500k-$700k)" },
  { id: 2, name: "Beachfront Cabo Property", target: "$1.8M \u2014 $2.4M", targetLow: 1800000, targetHigh: 2400000, deadline: "2028", monthsOut: 24, category: "Real Estate", status: "future", img: "\u{1F334}", note: "Investment property / personal retreat in Cabo San Lucas" },
  { id: 3, name: "Tesla Model X Plaid", target: "$95K \u2014 $120K", targetLow: 95000, targetHigh: 120000, deadline: "Dec 2026", monthsOut: 8, category: "Vehicle", status: "active", img: "\u{1F697}", note: "Family vehicle upgrade" },
  { id: 4, name: "$10M Net Worth Milestone", target: "$10,000,000", targetLow: 10000000, targetHigh: 10000000, deadline: "2030", monthsOut: 48, category: "Milestone", status: "tracking", img: "\u{1F48E}", note: "First major wealth milestone" },
  { id: 5, name: "Passive Income > $50K/mo", target: "$50,000/mo", targetLow: 600000, targetHigh: 600000, deadline: "2029", monthsOut: 36, category: "Cash Flow", status: "tracking", img: "\u{1F4C8}", note: "Rental + business dividends + investments" },
];

const monthlyCashFlow = 6950;

const fmtMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
};

function GradientBar({ pct, height = 4 }) {
  return (
    <div style={{ height, background: "rgba(255,255,255,.06)", borderRadius: height, width: "100%", overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: "linear-gradient(90deg, #f97316, #ec4899, #8b5cf6)", borderRadius: height, transition: "width .6s ease" }} />
    </div>
  );
}

const statusColors = {
  active: { bg: "rgba(251,191,36,.1)", color: "#fbbf24" },
  planning: { bg: "rgba(129,140,248,.1)", color: "#818cf8" },
  future: { bg: "rgba(100,116,139,.06)", color: C.muted },
  tracking: { bg: "rgba(249,115,22,.1)", color: "#f97316" },
};

const VisionBoard = () => {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        {VISION_ITEMS.map(v => {
          const needPerMonth = v.targetHigh / v.monthsOut;
          const canAfford = monthlyCashFlow > 0 ? Math.round(v.targetHigh / monthlyCashFlow) : 999;
          const gap = needPerMonth - monthlyCashFlow;
          const sc = statusColors[v.status] || statusColors.future;
          const progressPct = Math.min((monthlyCashFlow * v.monthsOut / v.targetHigh) * 100, 100);

          return (
            <div key={v.id} style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 20,
              transition: "all .25s",
              cursor: "pointer",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 36 }}>{v.img}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 4, background: sc.bg, color: sc.color }}>{v.status}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginTop: 8, marginBottom: 4 }}>{v.name}</div>
              <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 600, background: "linear-gradient(135deg, #f97316, #ec4899, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>{v.target}</div>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 12 }}>Target: {v.deadline} ({v.monthsOut} months)</div>
              <GradientBar pct={progressPct} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11, color: C.muted }}>
                <span>Need {fmtMoney(Math.round(needPerMonth))}/mo to save</span>
                <span>{canAfford}mo at current pace</span>
              </div>
              <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginTop: 10 }}>{v.note}</div>
              {gap > 0 && v.category === "Real Estate" && (
                <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "rgba(249,115,22,.06)", border: "1px solid rgba(249,115,22,.12)", fontSize: 12, color: "#fb923c", lineHeight: 1.5 }}>
                  Gap: Need +{fmtMoney(Math.round(gap))}/mo more cash flow to hit this timeline
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VisionBoard;
