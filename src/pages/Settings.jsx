import { useEffect, useState } from "react";

import { Badge, Card } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "connected":
    case "ok":
    case "healthy":
      return C.green;
    case "auth required":
    case "warning":
    case "not configured":
      return C.amber;
    case "error":
    case "offline":
      return C.red;
    default:
      return C.cyan;
  }
}

const Settings = () => {
  const { config, defaults, snapshot, metrics, setConfig, refresh } = useMissionControlData();
  const [draft, setDraft] = useState(config);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const saveSettings = () => {
    setConfig({
      gatewayUrl: draft.gatewayUrl.trim() || defaults.gatewayUrl,
      gatewayToken: draft.gatewayToken.trim(),
      mondayProxyUrl: draft.mondayProxyUrl.trim() || defaults.mondayProxyUrl,
      mondayToken: draft.mondayToken.trim(),
      mondayBoardId: draft.mondayBoardId.trim() || defaults.mondayBoardId
    });
    refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Settings</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
          Configure the live sources that drive Mission Control.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 1fr) minmax(320px, 1fr)", gap: 16 }}>
        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>OpenClaw Gateway</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Used for `/health` and `/api/status` polling.
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Gateway URL</span>
            <input
              value={draft.gatewayUrl}
              onChange={(event) => setDraft((current) => ({ ...current, gatewayUrl: event.target.value }))}
              placeholder={defaults.gatewayUrl}
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", outline: "none" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Gateway Token</span>
            <input
              type="password"
              value={draft.gatewayToken}
              onChange={(event) => setDraft((current) => ({ ...current, gatewayToken: event.target.value }))}
              placeholder="Optional bearer token for /api/status"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", outline: "none" }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Gateway status</span>
            <Badge color={statusColor(metrics.detailStatus)}>{metrics.detailStatus}</Badge>
          </div>
        </Card>

        <Card style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Monday.com</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Prefer a public proxy or gateway endpoint for GitHub Pages. Direct API token use is a browser-local fallback.
            </div>
          </div>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Proxy URL</span>
            <input
              value={draft.mondayProxyUrl || ""}
              onChange={(event) => setDraft((current) => ({ ...current, mondayProxyUrl: event.target.value }))}
              placeholder={defaults.mondayProxyUrl || "https://your-gateway.example.com/api/monday/board"}
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", outline: "none" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.muted }}>API Token</span>
            <input
              type="password"
              value={draft.mondayToken}
              onChange={(event) => setDraft((current) => ({ ...current, mondayToken: event.target.value }))}
              placeholder="Monday API token"
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", outline: "none" }}
            />
          </label>

          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Board ID</span>
            <input
              value={draft.mondayBoardId}
              onChange={(event) => setDraft((current) => ({ ...current, mondayBoardId: event.target.value }))}
              placeholder={defaults.mondayBoardId}
              style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", outline: "none" }}
            />
          </label>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Monday status</span>
            <Badge color={statusColor(metrics.mondayStatus)}>{metrics.mondayStatus}</Badge>
          </div>
        </Card>
      </div>

      <Card style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Save configuration</div>
          <div style={{ fontSize: 12, color: C.muted }}>
            Values are persisted in browser local storage and reused across dashboard pages.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => setDraft({
              gatewayUrl: defaults.gatewayUrl,
              gatewayToken: "",
              mondayProxyUrl: defaults.mondayProxyUrl,
              mondayToken: "",
              mondayBoardId: defaults.mondayBoardId
            })}
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            Reset Draft
          </button>
          <button
            onClick={saveSettings}
            style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
          >
            Save and Refresh
          </button>
        </div>
      </Card>

      <Card style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Connection Notes</div>
        <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12, color: C.text }}>
          Gateway: {snapshot.healthError || config.gatewayUrl}
        </div>
        <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, fontSize: 12, color: C.text }}>
          Monday: {snapshot.monday?.name || snapshot.mondayError || config.mondayProxyUrl || `Board ${config.mondayBoardId || defaults.mondayBoardId}`}
        </div>
      </Card>
    </div>
  );
};

export default Settings;
