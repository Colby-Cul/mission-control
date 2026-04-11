// TheForge - Supabase-powered SaaS idea tracker
import { useState, useEffect } from "react";
import { C } from "../../data/constants";

const SUPABASE_URL = "https://bdlvwfobjqvnrffzxrfz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbHZ3Zm9ianF2bnJmZnp4cmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzUwNjAsImV4cCI6MjA4OTkxMTA2MH0.eJ0nKEHBSr8jKTAFxSvPC8VNjjYZJJRn0n-yHAnsFXI";

const COMPETITION_COLORS = { Low: C.green, "Low-Medium": C.teal, Medium: C.amber, "Medium-High": "#f97316", High: C.red };

const Badge = ({ color, children }) => (
  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: color + "18", color, fontWeight: 600 }}>{children}</span>
);

const KPI = ({ label, value, sub, color }) => (
  <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: "1px solid " + C.border }}>
    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: color || C.text }}>{value}</div>
    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
  </div>
);

export default function TheForge() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [sortBy, setSortBy] = useState("confidence_score");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${SUPABASE_URL}/rest/v1/forge_ideas?select=*&order=confidence_score.desc`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIdeas(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...ideas]
    .filter(i => filterStatus === "all" || i.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "confidence_score") return (b.confidence_score || 0) - (a.confidence_score || 0);
      if (sortBy === "date_added") return (b.date_added || "").localeCompare(a.date_added || "");
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  const avgConfidence = ideas.length > 0 ? (ideas.reduce((s, i) => s + (i.confidence_score || 0), 0) / ideas.length).toFixed(1) : 0;
  const highConf = ideas.filter(i => i.confidence_score >= 9).length;
  const statuses = [...new Set(ideas.map(i => i.status))];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: C.muted }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>\u2692\uFE0F</div>
        <div style={{ fontSize: 14 }}>Loading The Forge...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>\u2692\uFE0F The Forge</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>SaaS idea factory \u2014 100% agentic, $100K+ MRR potential</div>
        </div>
        <button onClick={fetchIdeas} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>\u21BB Refresh</button>
      </div>

      {error && <div style={{ padding: 12, background: C.red + "22", borderRadius: 8, color: C.red, fontSize: 13 }}>Error loading ideas: {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <KPI label="Total Ideas" value={ideas.length} sub="In the forge" color={C.accent} />
        <KPI label="Avg Confidence" value={avgConfidence} sub="Out of 10" color={C.amber} />
        <KPI label="High Confidence" value={highConf} sub="Score \u2265 9" color={C.green} />
        <KPI label="New Today" value={ideas.filter(i => i.date_added === new Date().toISOString().slice(0, 10)).length} sub={new Date().toLocaleDateString()} color={C.cyan} />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }}>
          <option value="confidence_score">Sort: Confidence</option>
          <option value="date_added">Sort: Newest</option>
          <option value="name">Sort: Name</option>
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }}>
          <option value="all">All Status</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 12, color: C.muted, marginLeft: 8 }}>Showing {sorted.length} of {ideas.length}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {sorted.map(idea => (
          <div key={idea.id} onClick={() => setSelectedIdea(selectedIdea?.id === idea.id ? null : idea)}
            style={{
              background: C.surface, borderRadius: 14, padding: 16, border: `1px solid ${selectedIdea?.id === idea.id ? C.accent : C.border}`,
              cursor: "pointer", transition: "border-color 0.15s", position: "relative", overflow: "hidden"
            }}>
            <div style={{ position: "absolute", top: 12, right: 12, background: idea.confidence_score >= 9 ? C.green + "22" : C.amber + "22",
              color: idea.confidence_score >= 9 ? C.green : C.amber, padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
              {idea.confidence_score}/10
            </div>

            <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 4, paddingRight: 60 }}>{idea.name}</div>
            <div style={{ fontSize: 12, color: C.accentLight, marginBottom: 10, lineHeight: 1.4 }}>{idea.tagline}</div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              <Badge color={COMPETITION_COLORS[idea.competition_level] || C.muted}>{idea.competition_level}</Badge>
              <Badge color={C.cyan}>{idea.estimated_build_time}</Badge>
              <Badge color={C.green}>{idea.monthly_revenue_potential}</Badge>
            </div>

            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{idea.problem?.slice(0, 140)}{idea.problem?.length > 140 ? "..." : ""}</div>

            {selectedIdea?.id === idea.id && (
              <div style={{ marginTop: 14, borderTop: `1px solid ${C.border}`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <DetailSection label="Target Audience" text={idea.target_audience} />
                <DetailSection label="How It Works" text={idea.how_it_works} />
                <DetailSection label="Agentic Architecture" text={idea.agentic_architecture} />
                <DetailSection label="Revenue Model" text={idea.revenue_model} />
                <DetailSection label="Path to $100K MRR" text={idea.path_to_100k} />
                <DetailSection label="MVP Scope" text={idea.mvp_scope} />
                <DetailSection label="Competition Notes" text={idea.competition_notes} />
                {idea.source_signals?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 4 }}>Source Signals</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {idea.source_signals.map((s, i) => <span key={i} style={{ fontSize: 11, padding: "3px 8px", background: C.card, borderRadius: 6, color: C.muted, border: `1px solid ${C.border}` }}>{s}</span>)}
                    </div>
                  </div>
                )}
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Added: {idea.date_added} \u00B7 ID: {idea.id}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!sorted.length && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>\uD83D\uDD25</div>
          <div>No ideas match your filters</div>
        </div>
      )}
    </div>
  );
}

const DetailSection = ({ label, text }) => {
  if (!text) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, opacity: 0.85 }}>{text}</div>
    </div>
  );
};
