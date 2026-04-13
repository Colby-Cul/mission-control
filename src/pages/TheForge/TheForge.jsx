import { useState, useEffect, useCallback } from "react";
import { C } from "../../data/constants";
import { supabase } from "../../lib/supabase";

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

const COMPETITION_COLORS = { Low: C.green, "Low-Medium": C.teal, Medium: C.amber, "Medium-High": "#f97316", High: C.red };

const STATUS_CONFIG = {
  new:        { label: "New",        color: C.amber,  icon: "✨", bg: C.amber + "18" },
  evaluating: { label: "Evaluating", color: C.cyan,   icon: "🔍", bg: C.cyan + "18" },
  building:   { label: "Building",   color: C.purple, icon: "⚒️", bg: C.purple + "18" },
  launched:   { label: "Launched",   color: C.green,  icon: "🚀", bg: C.green + "18" },
  parked:     { label: "Parked",     color: C.muted,  icon: "⏸️", bg: C.muted + "18" },
};
const STATUS_FLOW = ["new", "evaluating", "building", "launched", "parked"];

const TheForge = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("confidence_score");
  const [updating, setUpdating] = useState(false);

  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("forge_ideas")
        .select("*")
        .order("confidence_score", { ascending: false });
      if (err) throw err;
      setIdeas(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const updateIdea = async (id, fields) => {
    setUpdating(true);
    try {
      const { error: err } = await supabase
        .from("forge_ideas")
        .update(fields)
        .eq("id", id);
      if (err) throw err;
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
      if (modal?.id === id) setModal(prev => ({ ...prev, ...fields }));
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  const sorted = ideas
    .filter(i => filterStatus === "all" || i.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "confidence_score") return (b.confidence_score || 0) - (a.confidence_score || 0);
      if (sortBy === "date_added") return (b.date_added || "").localeCompare(a.date_added || "");
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  const avgConf = ideas.length ? (ideas.reduce((s, i) => s + (i.confidence_score || 0), 0) / ideas.length).toFixed(1) : 0;
  const highConf = ideas.filter(i => i.confidence_score >= 9).length;
  const today = new Date().toISOString().slice(0, 10);
  const newToday = ideas.filter(i => i.date_added === today).length;
  const statusCounts = ideas.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: C.muted }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚒️</div>
        <div style={{ fontSize: 14 }}>Forging ideas...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>🔥 The Forge</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>SaaS idea factory — 100% agentic, $100K+ MRR potential</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setViewMode(viewMode === "grid" ? "pipeline" : "grid")}
            style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
            {viewMode === "grid" ? "⊞ Pipeline View" : "⊟ Grid View"}
          </button>
          <button onClick={fetchIdeas}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            ↻ Refresh
          </button>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: C.red + "22", borderRadius: 8, color: C.red, fontSize: 13 }}>Error: {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <KPI label="Total Ideas" value={ideas.length} sub="In the forge" color={C.accent} />
        <KPI label="Avg Confidence" value={avgConf} sub="Out of 10" color={C.amber} />
        <KPI label="High Confidence" value={highConf} sub="Score >= 9" color={C.green} />
        <KPI label="New Today" value={newToday} sub={new Date().toLocaleDateString()} color={C.cyan} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            style={{
              background: filterStatus === key ? cfg.color + "33" : C.surface,
              border: `1px solid ${filterStatus === key ? cfg.color : C.border}`,
              borderRadius: 20, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s"
            }}>
            <span style={{ fontSize: 12 }}>{cfg.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: filterStatus === key ? cfg.color : C.muted }}>{cfg.label}</span>
            <span style={{ fontSize: 11, color: C.muted, background: C.card, borderRadius: 8, padding: "1px 6px" }}>{statusCounts[key] || 0}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }}>
          <option value="confidence_score">Sort: Confidence</option>
          <option value="date_added">Sort: Newest</option>
          <option value="name">Sort: Name</option>
        </select>
        <span style={{ fontSize: 12, color: C.muted }}>Showing {sorted.length} of {ideas.length}</span>
      </div>

      {viewMode === "pipeline" ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS_FLOW.length}, 1fr)`, gap: 12, overflowX: "auto" }}>
          {STATUS_FLOW.map(status => {
            const cfg = STATUS_CONFIG[status];
            const columnIdeas = ideas.filter(i => i.status === status).sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
            return (
              <div key={status} style={{ minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.color}33` }}>
                  <span>{cfg.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{columnIdeas.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {columnIdeas.map(idea => (
                    <PipelineCard key={idea.id} idea={idea} onClick={() => setModal(idea)} />
                  ))}
                  {!columnIdeas.length && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 20 }}>Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {sorted.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onClick={() => setModal(idea)} />
          ))}
        </div>
      )}

      {!sorted.length && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
          <div>No ideas match your filters</div>
        </div>
      )}

      {modal && (
        <IdeaModal idea={modal} onClose={() => setModal(null)} onUpdate={updateIdea} updating={updating} />
      )}
    </div>
  );
};

const IdeaCard = ({ idea, onClick }) => {
  const sCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.new;
  return (
    <div onClick={onClick} style={{
      background: C.surface, borderRadius: 14, padding: 18,
      border: `1px solid ${C.border}`, borderLeft: `3px solid ${sCfg.color}`,
      cursor: "pointer", transition: "all 0.15s", position: "relative",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = sCfg.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderLeftColor = sCfg.color; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: sCfg.color, background: sCfg.bg, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.5 }}>
          {sCfg.icon} {sCfg.label}
        </span>
        <span style={{
          background: idea.confidence_score >= 9 ? C.green + "22" : C.amber + "22",
          color: idea.confidence_score >= 9 ? C.green : C.amber,
          padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700
        }}>
          {idea.confidence_score}/10
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{idea.name}</div>
      <div style={{ fontSize: 12, color: C.accentLight, marginBottom: 12, lineHeight: 1.4 }}>{idea.tagline}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge color={COMPETITION_COLORS[idea.competition_level] || C.muted}>{idea.competition_level}</Badge>
        <Badge color={C.cyan}>{idea.estimated_build_time}</Badge>
        <Badge color={C.green}>{idea.monthly_revenue_potential}</Badge>
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        {idea.problem?.slice(0, 120)}{idea.problem?.length > 120 ? "..." : ""}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, opacity: 0.6 }}>Click to expand →</div>
    </div>
  );
};

const PipelineCard = ({ idea, onClick }) => (
  <div onClick={onClick} style={{
    background: C.surface, borderRadius: 10, padding: 14, border: `1px solid ${C.border}`,
    cursor: "pointer", transition: "all 0.15s",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{idea.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: idea.confidence_score >= 9 ? C.green : C.amber }}>{idea.confidence_score}/10</span>
    </div>
    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginBottom: 8 }}>{idea.tagline}</div>
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      <Badge color={C.green}>{idea.monthly_revenue_potential}</Badge>
      <Badge color={C.cyan}>{idea.estimated_build_time}</Badge>
    </div>
  </div>
);

const IdeaModal = ({ idea, onClose, onUpdate, updating }) => {
  const [notes, setNotes] = useState(idea.notes || "");
  const [showNotes, setShowNotes] = useState(false);
  const sCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.new;

  const handleStatusChange = (newStatus) => {
    onUpdate(idea.id, { status: newStatus });
  };

  const saveNotes = () => {
    onUpdate(idea.id, { notes });
    setShowNotes(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "40px 20px", overflowY: "auto",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
        maxWidth: 780, width: "100%", padding: 0, position: "relative",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)", overflow: "hidden",
      }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: sCfg.color, background: sCfg.bg, padding: "4px 10px", borderRadius: 6 }}>
                  {sCfg.icon} {sCfg.label}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>Added {idea.date_added}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3 }}>{idea.name}</h2>
              <p style={{ fontSize: 14, color: C.accentLight, margin: "6px 0 0", lineHeight: 1.4 }}>{idea.tagline}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 24, cursor: "pointer", padding: 4, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
            <MiniStat label="Confidence" value={`${idea.confidence_score}/10`} color={idea.confidence_score >= 9 ? C.green : C.amber} />
            <MiniStat label="Revenue Potential" value={idea.monthly_revenue_potential} color={C.green} />
            <MiniStat label="Build Time" value={idea.estimated_build_time} color={C.cyan} />
          </div>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "55vh", overflowY: "auto" }}>
          <Section icon="⚠️" label="Problem" text={idea.problem} />
          <Section icon="🎯" label="Target Audience" text={idea.target_audience} />
          <Section icon="⚙️" label="How It Works" text={idea.how_it_works} />

          {idea.agentic_architecture && (
            <div style={{ background: C.amber + "0D", border: `1px solid ${C.amber}33`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                🤖 Agentic Architecture <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>(Zero Humans)</span>
              </div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, opacity: 0.9 }}>{idea.agentic_architecture}</div>
            </div>
          )}

          <Section icon="💰" label="Revenue Model" text={idea.revenue_model} />

          {idea.path_to_100k && (
            <div style={{ background: C.green + "0D", border: `1px solid ${C.green}33`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: "uppercase", marginBottom: 6 }}>📈 Path to $100K MRR</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, opacity: 0.9 }}>{idea.path_to_100k}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section icon="🚀" label="MVP Scope" text={idea.mvp_scope} />
            <div>
              <Section icon="🛡️" label="Competition" text={`${idea.competition_level} — ${idea.competition_notes || ""}`} />
              <div style={{ marginTop: 8 }}>
                <Badge color={COMPETITION_COLORS[idea.competition_level] || C.muted}>{idea.competition_level} Competition</Badge>
              </div>
            </div>
          </div>

          {idea.source_signals?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>📡 Source Signals</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {idea.source_signals.map((s, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "4px 10px", background: C.card, borderRadius: 8, color: C.muted, border: `1px solid ${C.border}` }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>📝 Notes</span>
              <button onClick={() => setShowNotes(!showNotes)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 12px", color: C.muted, cursor: "pointer", fontSize: 12 }}>
                {showNotes ? "Cancel" : (idea.notes ? "Edit" : "Add Notes")}
              </button>
            </div>
            {showNotes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add evaluation notes..."
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, minHeight: 80, resize: "vertical", outline: "none", lineHeight: 1.5 }} />
                <button onClick={saveNotes} disabled={updating}
                  style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13, alignSelf: "flex-end", opacity: updating ? 0.5 : 1 }}>
                  {updating ? "Saving..." : "Save Notes"}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: idea.notes ? C.text : C.muted, lineHeight: 1.5, opacity: idea.notes ? 0.85 : 0.5, fontStyle: idea.notes ? "normal" : "italic" }}>
                {idea.notes || "No notes yet — click Add Notes to start evaluating"}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 28px 20px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const isActive = idea.status === key;
            return (
              <button key={key} onClick={() => !isActive && handleStatusChange(key)} disabled={isActive || updating}
                style={{
                  flex: 1, minWidth: 100, padding: "10px 12px",
                  background: isActive ? cfg.color + "33" : C.card,
                  color: isActive ? cfg.color : C.muted,
                  border: `1px solid ${isActive ? cfg.color + "66" : C.border}`,
                  borderRadius: 10, cursor: isActive ? "default" : "pointer",
                  fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                  opacity: updating ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                <span>{cfg.icon}</span> {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Section = ({ icon, label, text }) => {
  if (!text) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, opacity: 0.85 }}>{text}</div>
    </div>
  );
};

const MiniStat = ({ label, value, color }) => (
  <div style={{ background: C.card, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
    <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
  </div>
);

export default TheForge;
import { useState, useEffect, useCallback } from "react";
import { C } from "../../data/constants";
import { supabase } from "../../lib/supabase";

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

const COMPETITION_COLORS = { Low: C.green, "Low-Medium": C.teal, Medium: C.amber, "Medium-High": "#f97316", High: C.red };

const STATUS_CONFIG = {
  new:        { label: "New",        color: C.amber,  icon: "\u2728", bg: C.amber + "18" },
  evaluating: { label: "Evaluating", color: C.cyan,   icon: "\ud83d\udd0d", bg: C.cyan + "18" },
  building:   { label: "Building",   color: C.purple, icon: "\u2692\ufe0f", bg: C.purple + "18" },
  launched:   { label: "Launched",   color: C.green,  icon: "\ud83d\ude80", bg: C.green + "18" },
  parked:     { label: "Parked",     color: C.muted,  icon: "\u23f8\ufe0f", bg: C.muted + "18" },
};
const STATUS_FLOW = ["new", "evaluating", "building", "launched", "parked"];

const TheForge = () => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("confidence_score");
  const [updating, setUpdating] = useState(false);

  const fetchIdeas = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("forge_ideas")
        .select("*")
        .order("confidence_score", { ascending: false });
      if (err) throw err;
      setIdeas(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchIdeas(); }, [fetchIdeas]);

  const updateIdea = async (id, fields) => {
    setUpdating(true);
    try {
      const { error: err } = await supabase
        .from("forge_ideas")
        .update(fields)
        .eq("id", id);
      if (err) throw err;
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, ...fields } : i));
      if (modal?.id === id) setModal(prev => ({ ...prev, ...fields }));
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  const sorted = ideas
    .filter(i => filterStatus === "all" || i.status === filterStatus)
    .sort((a, b) => {
      if (sortBy === "confidence_score") return (b.confidence_score || 0) - (a.confidence_score || 0);
      if (sortBy === "date_added") return (b.date_added || "").localeCompare(a.date_added || "");
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

  const avgConf = ideas.length ? (ideas.reduce((s, i) => s + (i.confidence_score || 0), 0) / ideas.length).toFixed(1) : 0;
  const highConf = ideas.filter(i => i.confidence_score >= 9).length;
  const today = new Date().toISOString().slice(0, 10);
  const newToday = ideas.filter(i => i.date_added === today).length;
  const statusCounts = ideas.reduce((acc, i) => { acc[i.status] = (acc[i.status] || 0) + 1; return acc; }, {});

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: C.muted }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>\u2692\ufe0f</div>
        <div style={{ fontSize: 14 }}>Forging ideas...</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>\ud83d\udd25 The Forge</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>SaaS idea factory — 100% agentic, $100K+ MRR potential</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setViewMode(viewMode === "grid" ? "pipeline" : "grid")}
            style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", fontSize: 13 }}>
            {viewMode === "grid" ? "\u229e Pipeline View" : "\u229f Grid View"}
          </button>
          <button onClick={fetchIdeas}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            \u21bb Refresh
          </button>
        </div>
      </div>

      {error && <div style={{ padding: 12, background: C.red + "22", borderRadius: 8, color: C.red, fontSize: 13 }}>Error: {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
        <KPI label="Total Ideas" value={ideas.length} sub="In the forge" color={C.accent} />
        <KPI label="Avg Confidence" value={avgConf} sub="Out of 10" color={C.amber} />
        <KPI label="High Confidence" value={highConf} sub="Score >= 9" color={C.green} />
        <KPI label="New Today" value={newToday} sub={new Date().toLocaleDateString()} color={C.cyan} />
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            style={{
              background: filterStatus === key ? cfg.color + "33" : C.surface,
              border: `1px solid ${filterStatus === key ? cfg.color : C.border}`,
              borderRadius: 20, padding: "6px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              transition: "all 0.15s"
            }}>
            <span style={{ fontSize: 12 }}>{cfg.icon}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: filterStatus === key ? cfg.color : C.muted }}>{cfg.label}</span>
            <span style={{ fontSize: 11, color: C.muted, background: C.card, borderRadius: 8, padding: "1px 6px" }}>{statusCounts[key] || 0}</span>
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px", color: C.text, fontSize: 13 }}>
          <option value="confidence_score">Sort: Confidence</option>
          <option value="date_added">Sort: Newest</option>
          <option value="name">Sort: Name</option>
        </select>
        <span style={{ fontSize: 12, color: C.muted }}>Showing {sorted.length} of {ideas.length}</span>
      </div>

      {viewMode === "pipeline" ? (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS_FLOW.length}, 1fr)`, gap: 12, overflowX: "auto" }}>
          {STATUS_FLOW.map(status => {
            const cfg = STATUS_CONFIG[status];
            const columnIdeas = ideas.filter(i => i.status === status).sort((a, b) => (b.confidence_score || 0) - (a.confidence_score || 0));
            return (
              <div key={status} style={{ minWidth: 260 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: cfg.bg, borderRadius: 10, border: `1px solid ${cfg.color}33` }}>
                  <span>{cfg.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: 11, color: C.muted, marginLeft: "auto" }}>{columnIdeas.length}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {columnIdeas.map(idea => (
                    <PipelineCard key={idea.id} idea={idea} onClick={() => setModal(idea)} />
                  ))}
                  {!columnIdeas.length && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 20 }}>Empty</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
          {sorted.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onClick={() => setModal(idea)} />
          ))}
        </div>
      )}

      {!sorted.length && !loading && (
        <div style={{ textAlign: "center", padding: 40, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>\ud83d\udd0d</div>
          <div>No ideas match your filters</div>
        </div>
      )}

      {modal && (
        <IdeaModal idea={modal} onClose={() => setModal(null)} onUpdate={updateIdea} updating={updating} />
      )}
    </div>
  );
};

const IdeaCard = ({ idea, onClick }) => {
  const sCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.new;
  return (
    <div onClick={onClick} style={{
      background: C.surface, borderRadius: 14, padding: 18,
      border: `1px solid ${C.border}`, borderLeft: `3px solid ${sCfg.color}`,
      cursor: "pointer", transition: "all 0.15s", position: "relative",
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = sCfg.color; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.borderLeftColor = sCfg.color; e.currentTarget.style.transform = "none"; }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: sCfg.color, background: sCfg.bg, padding: "3px 8px", borderRadius: 6, letterSpacing: 0.5 }}>
          {sCfg.icon} {sCfg.label}
        </span>
        <span style={{
          background: idea.confidence_score >= 9 ? C.green + "22" : C.amber + "22",
          color: idea.confidence_score >= 9 ? C.green : C.amber,
          padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700
        }}>
          {idea.confidence_score}/10
        </span>
      </div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4, lineHeight: 1.3 }}>{idea.name}</div>
      <div style={{ fontSize: 12, color: C.accentLight, marginBottom: 12, lineHeight: 1.4 }}>{idea.tagline}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        <Badge color={COMPETITION_COLORS[idea.competition_level] || C.muted}>{idea.competition_level}</Badge>
        <Badge color={C.cyan}>{idea.estimated_build_time}</Badge>
        <Badge color={C.green}>{idea.monthly_revenue_potential}</Badge>
      </div>
      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
        {idea.problem?.slice(0, 120)}{idea.problem?.length > 120 ? "..." : ""}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: C.muted, opacity: 0.6 }}>Click to expand \u2192</div>
    </div>
  );
};

const PipelineCard = ({ idea, onClick }) => (
  <div onClick={onClick} style={{
    background: C.surface, borderRadius: 10, padding: 14, border: `1px solid ${C.border}`,
    cursor: "pointer", transition: "all 0.15s",
  }}
  onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; }}
  onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{idea.name}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: idea.confidence_score >= 9 ? C.green : C.amber }}>{idea.confidence_score}/10</span>
    </div>
    <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, marginBottom: 8 }}>{idea.tagline}</div>
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      <Badge color={C.green}>{idea.monthly_revenue_potential}</Badge>
      <Badge color={C.cyan}>{idea.estimated_build_time}</Badge>
    </div>
  </div>
);

const IdeaModal = ({ idea, onClose, onUpdate, updating }) => {
  const [notes, setNotes] = useState(idea.notes || "");
  const [showNotes, setShowNotes] = useState(false);
  const sCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.new;

  const handleStatusChange = (newStatus) => {
    onUpdate(idea.id, { status: newStatus });
  };

  const saveNotes = () => {
    onUpdate(idea.id, { notes });
    setShowNotes(false);
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)",
      zIndex: 9999, display: "flex", justifyContent: "center", alignItems: "flex-start",
      padding: "40px 20px", overflowY: "auto",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.bg, border: `1px solid ${C.border}`, borderRadius: 16,
        maxWidth: 780, width: "100%", padding: 0, position: "relative",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5)", overflow: "hidden",
      }}>
        <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: sCfg.color, background: sCfg.bg, padding: "4px 10px", borderRadius: 6 }}>
                  {sCfg.icon} {sCfg.label}
                </span>
                <span style={{ fontSize: 11, color: C.muted }}>Added {idea.date_added}</span>
              </div>
              <h2 style={{ fontSize: 22, fontWeight: 700, color: C.text, margin: 0, lineHeight: 1.3 }}>{idea.name}</h2>
              <p style={{ fontSize: 14, color: C.accentLight, margin: "6px 0 0", lineHeight: 1.4 }}>{idea.tagline}</p>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, fontSize: 24, cursor: "pointer", padding: 4, lineHeight: 1 }}>\u00d7</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 16 }}>
            <MiniStat label="Confidence" value={`${idea.confidence_score}/10`} color={idea.confidence_score >= 9 ? C.green : C.amber} />
            <MiniStat label="Revenue Potential" value={idea.monthly_revenue_potential} color={C.green} />
            <MiniStat label="Build Time" value={idea.estimated_build_time} color={C.cyan} />
          </div>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20, maxHeight: "55vh", overflowY: "auto" }}>
          <Section icon="\u26a0\ufe0f" label="Problem" text={idea.problem} />
          <Section icon="\ud83c\udfaf" label="Target Audience" text={idea.target_audience} />
          <Section icon="\u2699\ufe0f" label="How It Works" text={idea.how_it_works} />

          {idea.agentic_architecture && (
            <div style={{ background: C.amber + "0D", border: `1px solid ${C.amber}33`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.amber, textTransform: "uppercase", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                \ud83e\udd16 Agentic Architecture <span style={{ fontSize: 10, fontWeight: 500, color: C.muted }}>(Zero Humans)</span>
              </div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, opacity: 0.9 }}>{idea.agentic_architecture}</div>
            </div>
          )}

          <Section icon="\ud83d\udcb0" label="Revenue Model" text={idea.revenue_model} />

          {idea.path_to_100k && (
            <div style={{ background: C.green + "0D", border: `1px solid ${C.green}33`, borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.green, textTransform: "uppercase", marginBottom: 6 }}>\ud83d\udcc8 Path to $100K MRR</div>
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, opacity: 0.9 }}>{idea.path_to_100k}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Section icon="\ud83d\ude80" label="MVP Scope" text={idea.mvp_scope} />
            <div>
              <Section icon="\ud83d\udee1\ufe0f" label="Competition" text={`${idea.competition_level} — ${idea.competition_notes || ""}`} />
              <div style={{ marginTop: 8 }}>
                <Badge color={COMPETITION_COLORS[idea.competition_level] || C.muted}>{idea.competition_level} Competition</Badge>
              </div>
            </div>
          </div>

          {idea.source_signals?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 8 }}>\ud83d\udce1 Source Signals</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {idea.source_signals.map((s, i) => (
                  <span key={i} style={{ fontSize: 11, padding: "4px 10px", background: C.card, borderRadius: 8, color: C.muted, border: `1px solid ${C.border}` }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase" }}>\ud83d\udcdd Notes</span>
              <button onClick={() => setShowNotes(!showNotes)}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "4px 12px", color: C.muted, cursor: "pointer", fontSize: 12 }}>
                {showNotes ? "Cancel" : (idea.notes ? "Edit" : "Add Notes")}
              </button>
            </div>
            {showNotes ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add evaluation notes, next steps, concerns..."
                  style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, color: C.text, fontSize: 13, minHeight: 80, resize: "vertical", outline: "none", lineHeight: 1.5 }} />
                <button onClick={saveNotes} disabled={updating}
                  style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13, alignSelf: "flex-end", opacity: updating ? 0.5 : 1 }}>
                  {updating ? "Saving..." : "Save Notes"}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: idea.notes ? C.text : C.muted, lineHeight: 1.5, opacity: idea.notes ? 0.85 : 0.5, fontStyle: idea.notes ? "normal" : "italic" }}>
                {idea.notes || "No notes yet — click Add Notes to start evaluating"}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: "16px 28px 20px", borderTop: `1px solid ${C.border}`, background: C.surface, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const isActive = idea.status === key;
            return (
              <button key={key} onClick={() => !isActive && handleStatusChange(key)} disabled={isActive || updating}
                style={{
                  flex: 1, minWidth: 100, padding: "10px 12px",
                  background: isActive ? cfg.color + "33" : C.card,
                  color: isActive ? cfg.color : C.muted,
                  border: `1px solid ${isActive ? cfg.color + "66" : C.border}`,
                  borderRadius: 10, cursor: isActive ? "default" : "pointer",
                  fontWeight: 600, fontSize: 13, transition: "all 0.15s",
                  opacity: updating ? 0.5 : 1,
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                <span>{cfg.icon}</span> {cfg.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const Section = ({ icon, label, text }) => {
  if (!text) return null;
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: C.accent, textTransform: "uppercase", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
        <span>{icon}</span> {label}
      </div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, opacity: 0.85 }}>{text}</div>
    </div>
  );
};

const MiniStat = ({ label, value, color }) => (
  <div style={{ background: C.card, borderRadius: 10, padding: "10px 14px", textAlign: "center" }}>
    <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", marginTop: 2 }}>{label}</div>
  </div>
);

export default TheForge;
