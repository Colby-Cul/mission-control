import { useMemo, useState } from "react";
import { Badge, Card } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { getApiUrl } from "../utils/api";

const PROVIDER_META = {
  anthropic: { label: "Anthropic", logo: "https://cdn.simpleicons.org/anthropic/191919" },
  openai: { label: "OpenAI", logo: "https://cdn.simpleicons.org/openai/412991" },
  slack: { label: "Slack", logo: "https://cdn.simpleicons.org/slack/4A154B" },
  discord: { label: "Discord", logo: "https://cdn.simpleicons.org/discord/5865F2" },
  "monday.com": { label: "Monday.com", logo: "https://cdn.simpleicons.org/mondaydotcom/FE5000" },
  monday: { label: "Monday.com", logo: "https://cdn.simpleicons.org/mondaydotcom/FE5000" },
  github: { label: "GitHub", logo: "https://cdn.simpleicons.org/github/181717" },
  telegram: { label: "Telegram", logo: "https://cdn.simpleicons.org/telegram/26A5E4" },
  gitlab: { label: "GitLab", logo: "https://cdn.simpleicons.org/gitlab/FC6D26" },
  fastio: { label: "Fast.io", logo: "https://cdn.simpleicons.org/cloudflare/F38020" },
  "fast.io": { label: "Fast.io", logo: "https://cdn.simpleicons.org/cloudflare/F38020" },
};

const REQUIRED_PROVIDERS = ["anthropic", "openai", "slack", "discord", "monday.com", "github", "telegram"];

function normalizeProvider(value) {
  const provider = String(value || "").trim().toLowerCase();
  if (provider === "monday") return "monday.com";
  return provider;
}

function statusBadge(status) {
  const value = String(status || "").toLowerCase();
  if (value === "active") return { label: "Active", color: C.green };
  if (value === "missing") return { label: "Missing", color: C.red };
  return { label: "Unverified", color: C.amber };
}

function formatDate(value) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function maskDisplay(maskedKey) {
  if (!maskedKey) return "Not configured";
  return maskedKey;
}

function providerMeta(provider) {
  return PROVIDER_META[provider] || {
    label: provider.replace(/\b\w/g, (char) => char.toUpperCase()),
    logo: `https://cdn.simpleicons.org/${encodeURIComponent(provider)}/6B7280`
  };
}

const ApiSkills = () => {
  const { snapshot, refresh } = useMissionControlData();
  const [expandedId, setExpandedId] = useState(null);
  const [draftKeys, setDraftKeys] = useState({});
  const [saving, setSaving] = useState({});
  const [results, setResults] = useState({});
  const [overrides, setOverrides] = useState({});

  const cards = useMemo(() => {
    const credentials = Array.isArray(snapshot?.apiCredentials) ? snapshot.apiCredentials : [];
    const discovered = new Map();

    credentials.forEach((record) => {
      const provider = normalizeProvider(record.provider || record.id);
      if (!provider || discovered.has(provider)) return;
      discovered.set(provider, {
        provider,
        maskedKey: record.maskedKey || null,
        status: record.status || "unverified",
        lastUpdated: record.lastUpdated || null,
        lastVerified: record.lastVerified || null,
        sourcePath: record.sourcePath || "",
      });
    });

    REQUIRED_PROVIDERS.forEach((provider) => {
      if (!discovered.has(provider)) {
        discovered.set(provider, {
          provider,
          maskedKey: null,
          status: "missing",
          lastUpdated: null,
          lastVerified: null,
          sourcePath: "~/.openclaw/credentials/api-keys.json",
        });
      }
    });

    Object.entries(overrides).forEach(([provider, override]) => {
      discovered.set(provider, { ...(discovered.get(provider) || { provider }), ...override });
    });

    return Array.from(discovered.values())
      .sort((left, right) => providerMeta(left.provider).label.localeCompare(providerMeta(right.provider).label))
      .map((record) => ({
        ...record,
        ...providerMeta(record.provider),
        badge: statusBadge(record.status),
      }));
  }, [snapshot, overrides]);

  const handleSave = async (provider) => {
    const key = String(draftKeys[provider] || "").trim();
    if (!key) return;

    setSaving((current) => ({ ...current, [provider]: true }));
    setResults((current) => ({ ...current, [provider]: null }));

    try {
      const response = await fetch(`${getApiUrl()}/api-skills/${encodeURIComponent(provider)}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const payload = await response.json();

      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Save failed");
      }

      setOverrides((current) => ({
        ...current,
        [provider]: {
          provider,
          maskedKey: payload.credential?.maskedKey || null,
          status: payload.credential?.status || "active",
          lastUpdated: payload.credential?.lastUpdated || new Date().toISOString(),
          lastVerified: payload.credential?.lastVerified || new Date().toISOString(),
          sourcePath: payload.credential?.sourcePath || "~/.openclaw/credentials/api-keys.json",
        }
      }));
      setDraftKeys((current) => ({ ...current, [provider]: "" }));
      setResults((current) => ({ ...current, [provider]: { ok: true, message: "Key saved to local OpenClaw credential store." } }));
      refresh();
    } catch (error) {
      setResults((current) => ({
        ...current,
        [provider]: { ok: false, message: error.message || "Save failed" }
      }));
    } finally {
      setSaving((current) => ({ ...current, [provider]: false }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>API Skills</h1>
        <p style={{ margin: "8px 0 0", color: C.muted, fontSize: 13 }}>
          Local credential inventory scanned from OpenClaw. Updates are written only to `~/.openclaw/credentials/api-keys.json`
          through the localhost Mission Control API at `127.0.0.1:7070`.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
        {cards.map((card) => {
          const expanded = expandedId === card.provider;
          const result = results[card.provider];

          return (
            <Card
              key={card.provider}
              onClick={() => setExpandedId(expanded ? null : card.provider)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                borderColor: expanded ? C.accent : C.border,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img
                    src={card.logo}
                    alt={`${card.label} logo`}
                    style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", padding: 4, objectFit: "contain" }}
                  />
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{card.label}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{maskDisplay(card.maskedKey)}</div>
                  </div>
                </div>
                <Badge color={card.badge.color}>{card.badge.label}</Badge>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: C.muted }}>Last Updated</div>
                  <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{formatDate(card.lastUpdated)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: C.muted }}>Last Verified</div>
                  <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{formatDate(card.lastVerified)}</div>
                </div>
              </div>

              {expanded ? (
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    borderTop: `1px solid ${C.border}`,
                    paddingTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div style={{ fontSize: 12, color: C.muted }}>Source: {card.sourcePath || "~/.openclaw/credentials/api-keys.json"}</div>
                  <label htmlFor={`api-key-${card.provider}`} style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                    Update Key
                  </label>
                  <input
                    id={`api-key-${card.provider}`}
                    type="password"
                    value={draftKeys[card.provider] || ""}
                    onChange={(event) => setDraftKeys((current) => ({ ...current, [card.provider]: event.target.value }))}
                    placeholder={`Enter new ${card.label} key`}
                    style={{
                      width: "100%",
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      color: C.text,
                      padding: "10px 12px",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => handleSave(card.provider)}
                      disabled={saving[card.provider]}
                      style={{
                        background: C.accent,
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                        opacity: saving[card.provider] ? 0.6 : 1,
                      }}
                    >
                      {saving[card.provider] ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setDraftKeys((current) => ({ ...current, [card.provider]: "" }))}
                      style={{
                        background: "transparent",
                        color: C.muted,
                        border: `1px solid ${C.border}`,
                        borderRadius: 10,
                        padding: "10px 14px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  {result ? (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: result.ok ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                        border: `1px solid ${result.ok ? C.green : C.amber}`,
                        color: C.text,
                        fontSize: 12,
                      }}
                    >
                      {result.message}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ApiSkills;
