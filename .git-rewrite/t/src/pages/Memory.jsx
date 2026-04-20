import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

import { getApiUrl, HOME_DIR } from "../utils/api";

const MEMORY_FILES = [
  { id: "memory-md", label: "MEMORY.md", path: "MEMORY_DIR/workspace/anthropic/MEMORY.md", agent: "main" },
  { id: "anchor", label: "MEMORY_ANCHOR.md", path: "MEMORY_DIR/persistent-memory/MEMORY_ANCHOR.md", agent: "system" },
  { id: "soul", label: "SOUL.md", path: "MEMORY_DIR/workspace/anthropic/SOUL.md", agent: "main" },
  { id: "tools", label: "TOOLS.md", path: "MEMORY_DIR/workspace/anthropic/TOOLS.md", agent: "main" },
  { id: "heartbeat", label: "HEARTBEAT.md", path: "MEMORY_DIR/workspace/anthropic/HEARTBEAT.md", agent: "main" },
  { id: "agents-md", label: "AGENTS.md", path: "MEMORY_DIR/workspace/anthropic/AGENTS.md", agent: "main" },
  { id: "claude-md", label: "CLAUDE.md (Agent)", path: "MEMORY_DIR/agents/main/agent/CLAUDE.md", agent: "main" },
];

function resolvePath(p) { return p.replace("MEMORY_DIR", `${window._homeDir || HOME_DIR}/.openclaw`); }

const Memory = () => {
  const { snapshot } = useMissionControlData();
  const [selectedFile, setSelectedFile] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saveResult, setSaveResult] = useState(null);
  const [search, setSearch] = useState("");

  const loadFile = async (file) => {
    setSelectedFile(file);
    setContent("");
    setEditing(false);
    setSaveResult(null);
    setLoading(true);
    try {
      const resp = await fetch(`/api/memory/read`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: resolvePath(file.path) }),
      });
      const data = await resp.json();
      if (data.ok) { setContent(data.content); setEditContent(data.content); }
      else setContent(`Error: ${data.error}`);
    } catch (e) {
      setContent(`API unreachable. Read manually: cat ${resolvePath(file.path)}`);
    }
    setLoading(false);
  };

  const saveFile = async () => {
    setSaveResult(null);
    try {
      const resp = await fetch(`/api/memory/write`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: resolvePath(selectedFile.path), content: editContent }),
      });
      const data = await resp.json();
      setSaveResult(data.ok ? { ok: true, msg: "Saved" } : { ok: false, msg: data.error });
      if (data.ok) { setContent(editContent); setEditing(false); }
    } catch (e) {
      setSaveResult({ ok: false, msg: "API unreachable" });
    }
  };

  const filtered = search ? MEMORY_FILES.filter(f => f.label.toLowerCase().includes(search.toLowerCase())) : MEMORY_FILES;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Memory & Knowledge</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Agent memory files, knowledge base, and configuration</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <KPI label="Memory Files" value={MEMORY_FILES.length} sub="Browsable" color={C.accent} />
        <KPI label="Source" value={snapshot?.sourceLabel || "snapshot"} sub="Data origin" color={C.cyan} />
      </div>

      {/* Search */}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memory files..."
        style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 13 }} />

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16, minHeight: 400 }}>
        {/* File list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {filtered.map(f => (
            <button key={f.id} onClick={() => loadFile(f)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "none", textAlign: "left", fontSize: 13,
              background: selectedFile?.id === f.id ? C.accent + "22" : C.surface,
              color: selectedFile?.id === f.id ? C.accent : C.text,
              fontWeight: selectedFile?.id === f.id ? 600 : 400,
            }}>
              <span style={{ fontSize: 16 }}>📄</span>
              <div>
                <div>{f.label}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{f.agent}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Content viewer/editor */}
        <Card>
          {selectedFile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{selectedFile.label}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{resolvePath(selectedFile.path)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {!editing ? (
                    <button onClick={() => setEditing(true)} style={{ background: C.amber, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                  ) : (
                    <>
                      <button onClick={saveFile} style={{ background: C.green, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Save</button>
                      <button onClick={() => { setEditing(false); setEditContent(content); }} style={{ background: C.surface, color: C.muted, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
                    </>
                  )}
                </div>
              </div>
              {saveResult && (
                <div style={{ padding: 8, borderRadius: 6, background: saveResult.ok ? C.green + "22" : C.red + "22", color: saveResult.ok ? C.green : C.red, fontSize: 12 }}>
                  {saveResult.msg}
                </div>
              )}
              {loading ? (
                <div style={{ padding: 20, color: C.muted }}>Loading...</div>
              ) : editing ? (
                <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 12, fontFamily: "monospace", minHeight: 400, resize: "vertical", lineHeight: 1.6 }} />
              ) : (
                <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 500, overflow: "auto", lineHeight: 1.6, margin: 0 }}>
                  {content || "Select a file to view"}
                </pre>
              )}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Select a memory file to view or edit</div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Memory;
