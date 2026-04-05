import { AGENTS } from "./constants";

const STATUS_ACTIVE = new Set(["online", "connected", "active", "running", "busy"]);

const EXTRA_METADATA = {
  worker: {
    name: "Worker",
    initials: "WK",
    dept: "Engineering",
    role: "implementation",
    model: "Claude Sonnet",
    color: "#10b981",
    ring: "#34d399"
  },
  codex: {
    name: "Codex",
    initials: "CX",
    dept: "Engineering",
    role: "coding agent",
    model: "GPT-5.4",
    color: "#14b8a6",
    ring: "#2dd4bf"
  }
};

const AGENT_METADATA = [...AGENTS, ...Object.entries(EXTRA_METADATA).map(([id, value]) => ({ id, ...value }))].reduce((map, agent) => {
  map[agent.id] = agent;
  return map;
}, {});

function titleize(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initialsFor(name, fallback = "AG") {
  const value = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return value || fallback;
}

export function isAgentOnline(status) {
  return STATUS_ACTIVE.has(String(status || "").toLowerCase());
}

export function buildAgentRoster(liveAgents = [], acpSessions = []) {
  const sessionCounts = acpSessions.reduce((map, session) => {
    const id = session?.agent;
    if (!id) return map;
    map[id] = (map[id] || 0) + 1;
    return map;
  }, {});

  const liveById = (liveAgents || []).reduce((map, agent) => {
    if (agent?.id) {
      map[agent.id] = agent;
    }
    return map;
  }, {});

  const ids = Array.from(new Set([
    ...Object.keys(liveById),
    ...Object.keys(sessionCounts)
  ]));

  return ids.map((id) => {
    const metadata = AGENT_METADATA[id] || {};
    const live = liveById[id] || {};
    const name = live.name || metadata.name || titleize(id);
    const sessions = Number(live.sessions ?? live.sessionCount ?? sessionCounts[id] ?? 0) || 0;
    const status = live.status || (sessions > 0 ? "active" : "idle");

    return {
      ...metadata,
      ...live,
      id,
      name,
      initials: live.initials || metadata.initials || initialsFor(name),
      dept: live.dept || metadata.dept || "Operations",
      role: live.role || metadata.role || "OpenClaw agent",
      model: live.model || metadata.model || "Unknown model",
      color: live.color || metadata.color || "#0ea5e9",
      ring: live.ring || metadata.ring || "#38bdf8",
      status,
      sessions
    };
  });
}
