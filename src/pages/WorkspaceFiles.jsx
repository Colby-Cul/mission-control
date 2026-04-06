import { useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { useNavigate } from "react-router-dom";

import { getApiUrl, HOME_DIR } from "../utils/api";

const DIRS = [
  { name: "Agent Configs", path: `${HOME_DIR}/.openclaw/agents/`, icon: "🤖", files: ["main/", "worker/", "validation/", "executive-assistant/", "cfo/", "bookkeeper/", "fin-researcher/", "tax-advisor/", "crypto-analyst/", "stock-analyst/"] },
  { name: "Skills", path: `${HOME_DIR}/.openclaw/skills/`, icon: "⚡", files: ["monday-com/", "slack/", "agent-browser/", "prompt-guard/", "e2e-testing/", "travel-planning/"] },
  { name: "Scripts", path: `${HOME_DIR}/.openclaw/scripts/`, icon: "📜", files: ["mc-sync.sh"] },
  { name: "Logs", path: `${HOME_DIR}/.openclaw/logs/`, icon: "📋", files: ["gateway.log", "gateway.err.log", "mc-api.log", "mc-sync.log"] },
  { name: "Cron", path: `${HOME_DIR}/.openclaw/cron/`, icon: "⏰", files: ["jobs.json"] },
  { name: "MC API Server", path: `${HOME_DIR}/.openclaw/mc-api/`, icon: "🖥️", files: ["server.js"] },
  { name: "Mission Control", path: `${HOME_DIR}/mission-control/`, icon: "🎛️", files: ["src/", "public/", "package.json", "CLAUDE.md"] },
  { name: "Persistent Memory", path: `${HOME_DIR}/.openclaw/persistent-memory/`, icon: "🧠", files: ["MEMORY_ANCHOR.md", "config/"] },
];

const WorkspaceFiles = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loading, setLoading] = useState(false);

  const openFile = async (dirPath, fileName) => {
    setLoading(true); setFileContent(null);
    try {
      const resp = await fetch(`${getApiUrl()}/memory/read`, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ path: dirPath + fileName }) });
      const data = await resp.json();
      setFileContent(data.ok ? { name: fileName, content: data.content, path: dirPath + fileName } : { name: fileName, content: `Error: ${data.error}`, path: dirPath + fileName });
    } catch { setFileContent({ name: fileName, content: "API unreachable", path: dirPath + fileName }); }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Workspace Files</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>OpenClaw directory structure — click files to view, or open in Docs Hub to edit</div>
      </div>
      <KPI label="Directories" value={DIRS.length} sub="Key workspace locations" color={C.accent} />

      <div style={{ display: "grid", gridTemplateColumns: fileContent ? "350px 1fr" : "1fr", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {DIRS.map(dir => (
            <div key={dir.path}>
              <button onClick={() => setExpanded(expanded === dir.path ? null : dir.path)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderRadius: 8, cursor: "pointer", border: "none", textAlign: "left", width: "100%", background: expanded === dir.path ? C.accent+"22" : C.surface, color: C.text, fontSize: 13 }}>
                <span>{dir.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>{dir.name}</div>
                  <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{dir.path}</div>
                </div>
                <span style={{ color: C.muted }}>{expanded === dir.path ? "▼" : "▶"}</span>
              </button>
              {expanded === dir.path && (
                <div style={{ marginLeft: 24, paddingLeft: 12, borderLeft: `2px solid ${C.border}` }}>
                  {dir.files.map(f => (
                    <button key={f} onClick={() => !f.endsWith("/") && openFile(dir.path, f)} style={{ display: "block", padding: "6px 8px", fontSize: 12, color: f.endsWith("/") ? C.muted : C.accent, background: "transparent", border: "none", cursor: f.endsWith("/") ? "default" : "pointer", textAlign: "left" }}>
                      {f.endsWith("/") ? `📁 ${f}` : `📄 ${f}`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {fileContent && (
          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{fileContent.name}</div>
                <div style={{ fontSize: 11, color: C.muted, fontFamily: "monospace" }}>{fileContent.path}</div>
              </div>
              <button onClick={() => navigate("/docs?file=" + encodeURIComponent(fileContent.path))} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer" }}>Open in Docs Hub</button>
            </div>
            {loading ? <div style={{ color: C.muted }}>Loading...</div> :
              <pre style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 12, color: C.text, fontSize: 11, fontFamily: "monospace", whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 450, overflow: "auto", margin: 0 }}>
                {fileContent.content}
              </pre>}
          </Card>
        )}
      </div>
    </div>
  );
};
export default WorkspaceFiles;
