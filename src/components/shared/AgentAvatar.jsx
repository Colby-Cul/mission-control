import { AGENTS, C } from '../../data/constants';

// Unique SVG icon paths for each agent role
const AGENT_ICONS = {
  // Operations / Leadership
  "main": (
    <g>
      <circle cx="16" cy="10" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 22v-1a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v1" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 3l2 3h-4l2-3z" fill="currentColor" opacity="0.7"/>
    </g>
  ),
  "executive-assistant": (
    <g>
      <rect x="8" y="6" width="16" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 10h8M12 14h8M12 18h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M22 10l3-3v6l-3-3z" fill="currentColor" opacity="0.6"/>
    </g>
  ),
  "ops-runner": (
    <g>
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 12v4l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="1.5" fill="currentColor"/>
    </g>
  ),

  // Engineering
  "coding-agent": (
    <g>
      <polyline points="10,9 6,16 10,23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="22,9 26,16 22,23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="18" y1="7" x2="14" y2="25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </g>
  ),
  "validation": (
    <g>
      <rect x="8" y="8" width="16" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <polyline points="12,16 15,19 20,13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  ),
  "designer": (
    <g>
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="20" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
      <circle cx="16" cy="19" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
    </g>
  ),

  // Finance
  "cfo": (
    <g>
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M16 10v12M13 12.5h5a2 2 0 0 1 0 4h-4a2 2 0 0 0 0 4h5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </g>
  ),
  "bookkeeper": (
    <g>
      <rect x="7" y="7" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="7" y1="13" x2="25" y2="13" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="7" y1="19" x2="25" y2="19" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="16" y1="7" x2="16" y2="25" stroke="currentColor" strokeWidth="1.2"/>
    </g>
  ),
  "fin-researcher": (
    <g>
      <circle cx="14" cy="14" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="18.5" y1="18.5" x2="24" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M11 14h6M14 11v6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </g>
  ),
  "tax-advisor": (
    <g>
      <path d="M9 25V9a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 25h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 11h6M13 15h6M13 19h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </g>
  ),
  "crypto-analyst": (
    <g>
      <path d="M16 6v2M16 24v2M6 16h2M24 16h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="16" cy="16" r="8" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <text x="16" y="20" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">B</text>
    </g>
  ),
  "stock-analyst": (
    <g>
      <polyline points="6,22 11,15 15,18 20,10 26,13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="20,10 26,10 26,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  ),

  // Marketing
  "maven": (
    <g>
      <path d="M6 16l6-10v8h8v-8l6 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 20h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 24h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </g>
  ),
  "quill": (
    <g>
      <path d="M24 7l-14 14-3 5 5-3 14-14a2 2 0 0 0-2-2z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M19 9l4 4" stroke="currentColor" strokeWidth="1.2"/>
    </g>
  ),
  "echo": (
    <g>
      <path d="M10 16a6 6 0 0 1 6-6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 16a9 9 0 0 1 9-9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M4 16a12 12 0 0 1 12-12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3"/>
      <circle cx="16" cy="16" r="3" fill="currentColor"/>
    </g>
  ),
  "spark": (
    <g>
      <polygon points="16,4 19,13 28,13 21,19 23,28 16,22 9,28 11,19 4,13 13,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </g>
  ),
  "beacon": (
    <g>
      <circle cx="16" cy="20" r="4" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10 14a8 8 0 0 1 12 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7 11a12 12 0 0 1 18 0" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <circle cx="16" cy="20" r="1.5" fill="currentColor"/>
    </g>
  ),
  "lens": (
    <g>
      <circle cx="14" cy="14" r="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="19" y1="19" x2="26" y2="26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
    </g>
  ),
  "pulse": (
    <g>
      <polyline points="4,16 9,16 12,8 16,24 20,12 23,16 28,16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  ),
  "sentinel": (
    <g>
      <path d="M16 5l9 4v7c0 5-4 9-9 12-5-3-9-7-9-12V9l9-4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <polyline points="12,16 15,19 20,13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  ),
  "herald": (
    <g>
      <path d="M7 14h4v8H7z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 12l12-4v18l-12-4V12z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M23 13c2 1 3 3 3 5s-1 4-3 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </g>
  ),
  "scribe": (
    <g>
      <path d="M8 7h10a4 4 0 0 1 0 8H10v10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="11" r="1" fill="currentColor"/>
    </g>
  ),
};

const AgentAvatar = ({ agent, size = 44 }) => {
  const a = typeof agent === "string" ? AGENTS.find(x => x.id === agent) : agent;
  if (!a) return null;

  const status = String(a.status || "").toLowerCase();
  const statusClr =
    status === "online" || status === "connected" || status === "active" || status === "running"
      ? C.green
      : status === "busy" || status === "warning"
        ? C.amber
        : "#64748b";

  const primary = a.color || C.accent;
  const secondary = a.ring || C.accentLight;
  const icon = AGENT_ICONS[a.id];
  const initials = a.initials || String(a.name || "").slice(0, 2).toUpperCase();

  return (
    <div style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg, ${primary}, ${secondary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 0 0 2px ${statusClr}, 0 2px 8px ${primary}44`,
      }}>
        {icon ? (
          <svg
            width={size * 0.55}
            height={size * 0.55}
            viewBox="0 0 32 32"
            fill="none"
            style={{ color: "white" }}
          >
            {icon}
          </svg>
        ) : (
          <span style={{ fontSize: size / 2.5, fontWeight: 700, color: "white" }}>
            {initials}
          </span>
        )}
      </div>
      <div style={{
        position: "absolute",
        bottom: 0,
        right: 0,
        width: size / 4,
        height: size / 4,
        background: statusClr,
        border: `2px solid ${C.card}`,
        borderRadius: "50%",
        boxShadow: `0 0 4px ${statusClr}88`,
      }} />
    </div>
  );
};

export default AgentAvatar;
