import { useState, useEffect } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { useSearchParams } from "react-router-dom";
import { getApiUrl, HOME_DIR } from "../utils/api";

const DOCS = [
  { id: "claude-md", name: "CLAUDE.md (Agent Policy)", path: `${HOME_DIR}/.openclaw/agents/main/agent/CLAUDE.md`, category: "Policy" },
  { id: "memory-anchor", name: "MEMORY_ANCHOR.md", path: `${HOME_DIR}/.openclaw/persistent-memory/MEMORY_ANCHOR.md`, category: "Policy" },
  { id: "memory-md", name: "MEMORY.md", path: `${HOME_DIR}/.openclaw/workspace/anthropic/MEMORY.md`, category: "Memory" },
  { id: "tools-md", name: "TOOLS.md", path: `${HOME_DIR}/.openclaw/workspace/anthropic/TOOLS.md`, category: "Config" },
  { id: "heartbeat", name: "HEARTBEAT.md", path: `${HOME_DIR}/.openclaw/workspace/anthropic/HEARTBEAT.md`, category: "Config" },
  { id: "soul-md", name: "SOUL.md", path: `${HOME_DIR}/.openclaw/workspace/anthropic/SOUL.md`, category: "Identity" },
  { id: "agents-md", name: "AGENTS.md", path: `${HOME_DIR}/.openclaw/workspace/anthropic/AGENTS.md`, category: "Config" },
  { id: "mc-claude", name: "Mission Control CLAUDE.md", path: `${HOME_DIR}/mission-control/CLAUDE.md`, category: "Project" },
  { id: "mc-directive", name: "Build Directive v2", path: `${HOME_DIR}/mission-control/MISSION_CONTROL_DIRECTIVE_v2.md`, category: "Project" },
  { id: "cfo-claude", name: "CFO CLAUDE.md", path: `${HOME_DIR}/.openclaw/agents/cfo/agent/CLAUDE.md`, category: "Policy" },
];

const DocsHub = () => {
  const { skills = [] } = useMissionControlData();
  const [selected, setSelected] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saveResult, setSaveResult] = useState(null);
  const [filter, setFilter] = useState("all");

  const [searchParams] = useSearchParams();
  useEffect(() => {
    const file = searchParams.get("file");
    if (file) {
      const match = DOCS.find(d => d.path === file);
      if (match) loadDoc(match);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = [...new Set(DOCS.map(d => d.category))];
  const filtered = filter === "all" ? DOCS : DOCS.filter(d => d.category === filter);

  const loadDoc = async (doc) => {
    setSelected(doc); setContent(""); setEditing(false); setSaveResult(null); setLoading(true);
    try {
      const resp = await fetch(`/api/memory/read`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ path: doc.path }) });
      const data = await resp.json();
      if (data.ok) { setContent(data.content); setEditContent(data.content); }
      else setContent(`Error: ${data.error}`);
    } catch { setContent(`API unreachable. Read manually: cat ${doc.path}`); }
    setLoading(false);
  };

  const saveDoc = async () => {
    setSaveResult(null);
    try {
      const resp = await fetch(`/api/memory/write`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ path: selected.path, content: editContent }) });
      const data = await resp.json();
      setSaveResult(data.ok ? { ok: true, msg: "Saved successfully" } : { ok: false, msg: data.error });
      if (data.ok) { setContent(editContent); setEditing(false); }
    } catch { setSaveResult({ ok: false, msg: "API unreachable" }); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Docs Hub</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Agent policy files, configuration, and documentation — click to view and edit</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Documents" value={DOCS.length} sub="Policy & config files" color={C.accent} />
        <KPI label="Skills" value={skills.length} sub="With SKILL.md docs" color={C.cyan} />
      </div>

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        <button onClick={() => setFilter("all")} style={{ background: filter === "all" ? C.accent : C.surface, color: filter === "all" ? "#fff" : C.muted, border: `1px solid ${filter === "all" ? C.accent : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilter(cat)} style={{ background: filter === cat ? C.accent : C.surface, color: filter === cat ? "#fff" : C.muted, border: `1px solid ${filter === cat ? C.accent : C.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{cat}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "280px 1fr" : "1fr", gap: 12, minHeight: 450 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map(doc => (
            <button key={doc.id} onClick={() => loadDoc(doc)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "none", textAlign: "left", fontSize: 13, background: selected?.id === doc.id ? C.accent+"22" : C.surface, color: selected?.id === doc.id ? C.accent : C.text, fontWeight: selected?.id === doc.id ? 600 : 400 }}>
              <span>📄</span>
              <div>
                <div>{doc.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{doc.category}</div>
              </div>
            </button>
          ))}
        </div>

        {selected && (
          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{selected.name}</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{selected.path}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {!editing ? (
                  <button onClick={() => setEditing(true)} style={{ background: C.amber, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                ) : (<>
                  <button onClick={saveDoc} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                  <button onClick={() => { setEditing(false); setEditContent(content); }} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                </>)}
              </div>
            </div>
            {saveResult && <div style={{ padding: 8, borderRadius: 6, background: saveResult.ok ? C.green+"22" : C.red+"22", color: saveResult.ok ? C.green : C.red, fontSize: 12, marginBottom: 8 }}>{saveResult.msg}</div>}
            {loading ? <div style={{ padding: 20, color: C.muted }}>Loading...</div> :
              editing ? <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 12, fontFamily: "monospace", minHeight: 400, resize: "vertical", lineHeight: 1.6, width: "100%" }} /> :
              <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 500, overflow: "auto", lineHeight: 1.6, margin: 0 }}>{content || "Click a document to view"}</pre>
            }
          </Card>
        )}

        {!selected && (
          <Card><div style={{ padding: 40, textAlign: "center", color: C.muted }}>Select a document to view and edit</div></Card>
        )}
      </div>
    </div>
  );
};
export default DocsHub;
