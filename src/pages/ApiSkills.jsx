import { useMemo, useState } from "react";
import { Badge, Card } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const API_PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai", label: "OpenAI" },
  { id: "slack", label: "Slack" },
  { id: "discord", label: "Discord" },
  { id: "monday.com", label: "Monday.com" },
  { id: "telegram", label: "Telegram" },
  { id: "ollama", label: "Ollama" }
];

function formatProvider(credential) {
  const provider = String(credential?.provider || "").toLowerCase();

  if (provider.includes("anthropic")) return "anthropic";
  if (provider.includes("openai")) return "openai";
  if (provider.includes("slack")) return "slack";
  if (provider.includes("discord")) return "discord";
  if (provider.includes("monday")) return "monday.com";
  if (provider.includes("telegram")) return "telegram";
  if (provider.includes("ollama")) return "ollama";

  return provider;
}

function maskTail(maskedKey) {
  if (!maskedKey) return "Not configured";
  const tail = maskedKey.slice(-5);
  return `•••••${tail}`;
}

function formatLastUpdated(value) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

const ApiSkills = () => {
  const { snapshot } = useMissionControlData();
  const [expandedId, setExpandedId] = useState(null);
  const [draftKeys, setDraftKeys] = useState({});

  const cards = useMemo(() => {
    const credentials = Array.isArray(snapshot?.apiCredentials) ? snapshot.apiCredentials : [];
    const credentialMap = new Map();

    credentials.forEach((credential) => {
      const normalizedProvider = formatProvider(credential);

      if (!credentialMap.has(normalizedProvider)) {
        credentialMap.set(normalizedProvider, credential);
      }
    });

    return API_PROVIDERS.map((provider) => {
      const credential = credentialMap.get(provider.id);
      const isActive = credential?.status === "active";

      return {
        id: provider.id,
        label: provider.label,
        maskedKey: maskTail(credential?.maskedKey),
        statusLabel: isActive ? "Active" : "Missing",
        statusColor: isActive ? C.green : C.red,
        lastUpdated: formatLastUpdated(credential?.lastUpdated)
      };
    });
  }, [snapshot]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>API Skills</h1>
        <p style={{ margin: "8px 0 0", color: C.muted, fontSize: 13 }}>
          Monitor connected provider credentials and stage key updates per integration.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        {cards.map((card) => {
          const expanded = expandedId === card.id;

          return (
            <Card
              key={card.id}
              onClick={() => setExpandedId(expanded ? null : card.id)}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
                transition: "border-color 0.15s ease, transform 0.15s ease",
                borderColor: expanded ? C.accent : C.border
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{card.label}</div>
                  <div style={{ fontSize: 13, color: C.muted }}>{card.maskedKey}</div>
                </div>
                <Badge color={card.statusColor}>{card.statusLabel}</Badge>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: C.muted }}>
                  Last Updated
                </div>
                <div style={{ fontSize: 13, color: C.text }}>{card.lastUpdated}</div>
              </div>

              {expanded ? (
                <div
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    paddingTop: 12,
                    borderTop: `1px solid ${C.border}`,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}
                >
                  <label htmlFor={`api-key-${card.id}`} style={{ fontSize: 12, fontWeight: 600, color: C.text }}>
                    Update Key
                  </label>
                  <input
                    id={`api-key-${card.id}`}
                    type="password"
                    value={draftKeys[card.id] || ""}
                    onChange={(event) =>
                      setDraftKeys((current) => ({
                        ...current,
                        [card.id]: event.target.value
                      }))
                    }
                    placeholder={`Enter new ${card.label} key`}
                    style={{
                      width: "100%",
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 10,
                      color: C.text,
                      padding: "10px 12px",
                      fontSize: 13,
                      outline: "none"
                    }}
                  />
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
