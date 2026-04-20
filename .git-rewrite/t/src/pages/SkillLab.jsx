import { useState, useRef } from 'react';
import { Badge, Card, KPI } from '../components/shared';
import { C } from '../data/constants';
import { useMissionControlData } from '../context/MissionControlDataContext';

import { getApiUrl } from "../utils/api";

const SkillLab = () => {
  const { skills = [], refresh } = useMissionControlData();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [search, setSearch] = useState("");
  const fileRef = useRef(null);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshResult(null);
    try {
      const resp = await fetch(`/api/sync`, { method: "POST" });
      const data = await resp.json();
      setRefreshResult(data.ok ? { ok: true, msg: "Synced — rescanning skills directory" } : { ok: false, msg: data.error });
      setTimeout(() => refresh(), 1500);
    } catch (e) {
      setRefreshResult({ ok: false, msg: "Sync failed — is the local API running?" });
    }
    setRefreshing(false);
    setTimeout(() => setRefreshResult(null), 8000);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setUploadResult({ ok: false, msg: "Only .zip files are accepted" });
      setTimeout(() => setUploadResult(null), 5000);
      return;
    }

    setUploading(true);
    setUploadResult(null);
    try {
      const buffer = await file.arrayBuffer();
      const resp = await fetch(`/api/skills/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream" },
        body: buffer,
      });
      const data = await resp.json();
      if (data.ok) {
        setUploadResult({
          ok: true,
          msg: data.message,
          detail: data.isUpgrade ? `Upgrading existing skill: ${data.name}` : `New skill: ${data.name}`,
        });
        // Refresh skill list after a delay (review takes time)
        setTimeout(() => { refresh(); }, 5000);
      } else {
        setUploadResult({ ok: false, msg: data.error });
      }
    } catch (e) {
      setUploadResult({ ok: false, msg: "Upload failed — is the local API running on port 7070?" });
    }
    setUploading(false);
    // Reset file input
    if (fileRef.current) fileRef.current.value = "";
    setTimeout(() => setUploadResult(null), 15000);
  };

  const filtered = search
    ? skills.filter(s => s.name?.toLowerCase().includes(search.toLowerCase()) || s.id?.toLowerCase().includes(search.toLowerCase()))
    : skills;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Skill Lab</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Installed agent skills — upload new skills for automatic security review</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {/* Upload Button */}
          <label style={{
            background: C.green, color: "#fff", border: "none", borderRadius: 10,
            padding: "10px 14px", fontWeight: 600, cursor: uploading ? "wait" : "pointer",
            opacity: uploading ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13,
          }}>
            {uploading ? "Uploading..." : "Upload Skill (.zip)"}
            <input ref={fileRef} type="file" accept=".zip" onChange={handleUpload} style={{ display: "none" }} disabled={uploading} />
          </label>
          <button onClick={handleRefresh} disabled={refreshing} style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer", opacity: refreshing ? 0.5 : 1, fontSize: 13 }}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div style={{ padding: 12, borderRadius: 8, background: uploadResult.ok ? C.green + "15" : C.red + "15", border: `1px solid ${uploadResult.ok ? C.green : C.red}33`, color: C.text, fontSize: 12 }}>
          <div style={{ fontWeight: 600, color: uploadResult.ok ? C.green : C.red }}>{uploadResult.ok ? "Upload Successful" : "Upload Failed"}</div>
          <div style={{ marginTop: 4, color: C.muted }}>{uploadResult.msg}</div>
          {uploadResult.detail && <div style={{ marginTop: 2, color: C.muted }}>{uploadResult.detail}</div>}
          {uploadResult.ok && (
            <div style={{ marginTop: 6, padding: 8, borderRadius: 6, background: C.purple + "11", border: `1px solid ${C.purple}22`, fontSize: 11, color: C.purple }}>
              Validator agent is reviewing this skill for security issues. It will be auto-installed if safe, or rejected with a reason if not.
            </div>
          )}
        </div>
      )}

      {refreshResult && (
        <div style={{ padding: 10, borderRadius: 8, background: refreshResult.ok ? C.green + "22" : C.red + "22", color: refreshResult.ok ? C.green : C.red, fontSize: 12 }}>
          {refreshResult.msg}
        </div>
      )}

      {/* KPIs + Search */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
        <KPI label="Installed" value={skills.length} sub="Active skills" color={C.accent} />
        <KPI label="Showing" value={filtered.length} sub={search ? "Matching filter" : "All skills"} color={C.cyan} />
        <div style={{ flex: 1, minWidth: 200 }}>
          <input
            type="text" placeholder="Search skills..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 14px", color: C.text, fontSize: 13, outline: "none" }}
          />
        </div>
      </div>

      {/* How to upload */}
      <Card>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 8 }}>How Skill Upload Works</div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.8 }}>
          1. Click <strong style={{ color: C.green }}>Upload Skill (.zip)</strong> and select a skill ZIP file containing a SKILL.md<br/>
          2. The file is saved to the inbound queue and sent to the <strong style={{ color: C.cyan }}>Validator</strong> agent for security review<br/>
          3. Validator checks for: command injection, data exfiltration, privilege escalation, suspicious URLs<br/>
          4. If it's an upgrade, Validator compares new vs existing and only applies improvements<br/>
          5. If safe: auto-installed. If unsafe: rejected with a detailed reason
        </div>
      </Card>

      {/* Skill Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
        {filtered.map(s => (
          <Card key={s.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{s.name}</div>
              <Badge color={C.green}>installed</Badge>
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 6, fontFamily: "monospace" }}>~/.openclaw/skills/{s.id}/</div>
          </Card>
        ))}
      </div>

      {!filtered.length && (
        <Card><div style={{ padding: 20, textAlign: "center", color: C.muted }}>{search ? "No skills match your search." : "No skills found. Click Refresh to rescan."}</div></Card>
      )}
    </div>
  );
};
export default SkillLab;
