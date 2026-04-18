import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import settingsData from "../data/settings.json";
import { statusColor } from "./liveViewUtils";
import { getApiUrl } from "../utils/api";

const Settings = () => {
  const navigate = useNavigate();
  const { config, defaults, snapshot, metrics, setConfig, refresh } = useMissionControlData();
  const [draft, setDraft] = useState(config);
  const [theme, setTheme] = useState(() => localStorage.getItem("mc-theme") || "dark");
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("mc-settings-displayName") || settingsData.displayName || ""
  );
  const [timezone, setTimezone] = useState(
    () => localStorage.getItem("mc-settings-timezone") || settingsData.timezone || "America/Los_Angeles"
  );
  const [syncResult, setSyncResult] = useState(null);
  const [notifications, setNotifications] = useState(
    () => JSON.parse(localStorage.getItem("mc-settings-notifications") || "null") || settingsData.notifications || {}
  );
  const [profileSaved, setProfileSaved] = useState(false);

  const saveProfile = () => {
    localStorage.setItem("mc-settings-displayName", displayName);
    localStorage.setItem("mc-settings-timezone", timezone);
    localStorage.setItem("mc-settings-notifications", JSON.stringify(notifications));
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  useEffect(() => { setDraft(config); }, [config]);
  useEffect(() => { localStorage.setItem("mc-theme", theme); }, [theme]);

  const saveGateway = () => {
    setConfig({ ...draft, gatewayUrl: draft.gatewayUrl.trim() || defaults.gatewayUrl, gatewayToken: draft.gatewayToken.trim() });
    refresh();
  };

  const triggerSync = async () => {
    setSyncResult(null);
    try {
      const resp = await fetch(`/api/sync`, { method: "POST" });
      const data = await resp.json();
      setSyncResult(data.ok ? { ok: true, msg: "Sync complete" } : { ok: false, msg: data.error });
    } catch (e) {
      setSyncResult({ ok: false, msg: `Run: bash ~/.openclaw/scripts/mc-sync.sh refresh` });
    }
    setTimeout(() => { setSyncResult(null); refresh(); }, 3000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Settings</h1>
      <div style={{ fontSize: 13, color: C.muted }}>Configuration, integrations, and preferences</div>

      {/* User Profile */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>User Profile</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Display Name</span>
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Timezone</span>
            <select value={timezone} onChange={e => setTimezone(e.target.value)} style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }}>
              <option value="America/Los_Angeles">Pacific (LA)</option>
              <option value="America/Denver">Mountain</option>
              <option value="America/Chicago">Central</option>
              <option value="America/New_York">Eastern</option>
              <option value="UTC">UTC</option>
            </select>
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Theme</span>
            <div style={{ display: "flex", gap: 4 }}>
              {["dark", "light"].map(t => (
                <button key={t} onClick={() => setTheme(t)} style={{ flex: 1, background: theme === t ? C.accent : C.surface, color: theme === t ? "#fff" : C.muted, border: `1px solid ${theme === t ? C.accent : C.border}`, borderRadius: 8, padding: "8px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </label>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
          <button onClick={saveProfile} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Save Profile</button>
          {profileSaved && <Badge color={C.green}>Saved</Badge>}
        </div>
      </Card>

      {/* Gateway Config */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>OpenClaw Gateway</div>
          <Badge color={statusColor(metrics.detailStatus)}>{metrics.detailStatus || "unknown"}</Badge>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Gateway URL</span>
            <input value={draft.gatewayUrl} onChange={e => setDraft(d => ({ ...d, gatewayUrl: e.target.value }))} placeholder={defaults.gatewayUrl} style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>Gateway Token</span>
            <input type="password" value={draft.gatewayToken} onChange={e => setDraft(d => ({ ...d, gatewayToken: e.target.value }))} placeholder="Bearer token" style={{ background: C.surface, color: C.text, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 10px" }} />
          </label>
        </div>
        <button onClick={saveGateway} style={{ marginTop: 12, background: C.accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer" }}>Save & Refresh</button>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Notification Preferences</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {[
            { key: "taskBlocked", label: "Task Blocked" },
            { key: "cronFailed", label: "Cron Job Failed" },
            { key: "apiKeyExpiring", label: "API Key Expiring" },
            { key: "newTaskAssigned", label: "New Task Assigned" },
            { key: "projectStatusChanged", label: "Project Status Changed" },
          ].map(({ key, label }) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer" }}>
              <input type="checkbox" checked={notifications[key] !== false} onChange={e => setNotifications(n => ({ ...n, [key]: e.target.checked }))} />
              <span style={{ fontSize: 13, color: C.text }}>{label}</span>
            </label>
          ))}
        </div>
      </Card>

      {/* Integration Links */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>Integrations</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
          <button onClick={() => navigate("/api-skills")} style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, cursor: "pointer", textAlign: "left" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>API Keys</div>
            <div style={{ fontSize: 11, color: C.muted }}>Manage connected API credentials</div>
          </button>
          <div style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Local API Server</div>
            <div style={{ fontSize: 11, color: C.muted }}>{"/api (Vercel)"}</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Vercel</div>
            <div style={{ fontSize: 11, color: C.muted }}>mc-merge-v7.vercel.app</div>
          </div>
          <div style={{ padding: 12, borderRadius: 8, background: C.surface, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Tailscale</div>
            <div style={{ fontSize: 11, color: C.muted }}>jarviss-mac-mini.tail8f7461.ts.net</div>
          </div>
        </div>
      </Card>

      {/* Danger Zone */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.red, marginBottom: 12 }}>Danger Zone</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={triggerSync} style={{ background: C.amber + "22", color: C.amber, border: `1px solid ${C.amber}33`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
            Force mc-sync
          </button>
          <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ background: C.red + "22", color: C.red, border: `1px solid ${C.red}33`, borderRadius: 8, padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
            Clear Local Cache
          </button>
        </div>
        {syncResult && (
          <div style={{ marginTop: 8, padding: 8, borderRadius: 6, background: syncResult.ok ? C.green + "22" : C.red + "22", color: syncResult.ok ? C.green : C.red, fontSize: 12 }}>
            {syncResult.msg}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Settings;
