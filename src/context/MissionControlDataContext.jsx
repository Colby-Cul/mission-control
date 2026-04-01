import { createContext, useContext, useEffect, useMemo, useState } from "react";

import bundledSnapshot from "../data/live-data.json";

const ENV = typeof import.meta !== "undefined" ? import.meta.env || {} : {};
const DEFAULT_GATEWAY_URL = String(
  ENV.VITE_MISSION_CONTROL_GATEWAY_URL ||
  ENV.VITE_API_BASE_URL ||
  ""
).trim();
const DEFAULT_GATEWAY_TOKEN = String(
  ENV.VITE_MISSION_CONTROL_GATEWAY_TOKEN || ""
).trim();
const DEFAULT_MONDAY_BOARD_ID = String(
  ENV.VITE_MISSION_CONTROL_MONDAY_BOARD_ID || "18404980498"
).trim();
const DEFAULT_MONDAY_PROXY_URL = String(
  ENV.VITE_MISSION_CONTROL_MONDAY_PROXY_URL || ""
).trim();
const DEFAULT_MONDAY_PROXY_TOKEN = String(
  ENV.VITE_MISSION_CONTROL_MONDAY_PROXY_TOKEN || ""
).trim();
const DEFAULT_MONDAY_TOKEN = String(
  ENV.VITE_MISSION_CONTROL_MONDAY_TOKEN || ""
).trim();
const POLL_INTERVAL_MS = 15000;

const STORAGE_KEYS = {
  gatewayUrl: "mission-control.gateway-url",
  gatewayToken: "mission-control.gateway-token",
  mondayProxyUrl: "mission-control.monday-proxy-url",
  mondayToken: "mission-control.monday-token",
  mondayBoardId: "mission-control.monday-board-id"
};

const MissionControlDataContext = createContext(null);

const KNOWN_AGENT_METADATA = {
  main: {
    name: "Jarvis",
    role: "chief of staff",
    model: "GPT-4o",
    initials: "JV",
    color: "#6366f1",
    ring: "#818cf8"
  },
  worker: {
    name: "Worker",
    role: "implementation",
    model: "GPT-4o",
    initials: "WK",
    color: "#10b981",
    ring: "#34d399"
  },
  validation: {
    name: "Validator",
    role: "QA",
    model: "GPT-4o",
    initials: "VL",
    color: "#0ea5e9",
    ring: "#38bdf8"
  },
  "executive-assistant": {
    name: "Victoria",
    role: "executive assistant",
    model: "GPT-4o-mini",
    initials: "VA",
    color: "#8b5cf6",
    ring: "#a78bfa"
  },
  codex: {
    name: "Codex",
    role: "Coding Agent",
    model: "GPT-5",
    initials: "CX",
    color: "#14b8a6",
    ring: "#2dd4bf"
  }
};

function readStoredValue(key, fallback = "") {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.localStorage.getItem(key) || fallback;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeStatus(status, fallback = "unknown") {
  const value = String(status || fallback).trim().toLowerCase();
  return value || fallback;
}

function titleize(value) {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getInitials(name) {
  const parts = String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "AG";
}

function formatMoney(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return null;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: amount >= 100 ? 0 : 2
  }).format(amount);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed with ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

function buildProxyUrl(baseUrl, mondayBoardId) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(baseUrl, origin);
  if (mondayBoardId && !url.searchParams.has("boardId")) {
    url.searchParams.set("boardId", mondayBoardId);
  }
  return url.toString();
}

function normalizeMondayBoardPayload(payload, boardId) {
  if (!payload) {
    return null;
  }

  if (payload?.error && !payload?.data && !payload?.boards && !payload?.board && !payload?.items_page && !Array.isArray(payload?.items)) {
    return null;
  }

  if (payload?.data?.boards?.[0]) {
    return payload.data.boards[0];
  }

  if (Array.isArray(payload?.boards)) {
    return payload.boards[0] || null;
  }

  if (payload?.board) {
    return payload.board;
  }

  if (payload?.items_page || Array.isArray(payload?.items)) {
    return {
      id: payload.id || boardId,
      name: payload.name || "Monday board",
      updated_at: payload.updated_at || null,
      items_page: payload.items_page || { items: payload.items || [] }
    };
  }

  return payload;
}

function normalizeGatewayStatusPayload(payload) {
  if (!payload) {
    return null;
  }

  if (payload?.error && !payload?.status && !Array.isArray(payload?.bots) && !payload?.metrics) {
    return null;
  }

  if (payload?.status) {
    return payload.status;
  }

  return payload;
}

async function fetchMondayDirect(mondayToken, mondayBoardId) {
  if (!mondayToken || !mondayBoardId) {
    return null;
  }

  const query = `
    query MissionControlBoard($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
        state
        updated_at
        items_page(limit: 25) {
          items {
            id
            name
            updated_at
            state
            group {
              id
              title
            }
            column_values {
              id
              text
              type
              value
            }
          }
        }
      }
    }
  `;

  const response = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: mondayToken,
      "API-Version": "2024-10"
    },
    body: JSON.stringify({
      query,
      variables: {
        boardId: mondayBoardId
      }
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || payload?.errors?.length) {
    const message =
      payload?.errors?.[0]?.message ||
      payload?.error_message ||
      `Monday request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.data = payload;
    throw error;
  }

  return payload?.data?.boards?.[0] || null;
}

async function fetchMondayBoard(config, gatewayHeaders, mondayProxyHeaders) {
  const boardId = config.mondayBoardId.trim();
  if (!boardId) {
    return null;
  }

  const proxyUrl = config.mondayProxyUrl.trim();
  if (proxyUrl) {
    const payload = await fetchJson(buildProxyUrl(proxyUrl, boardId), {
      headers: mondayProxyHeaders
    });
    return normalizeMondayBoardPayload(payload, boardId);
  }

  const baseUrl = config.gatewayUrl.trim().replace(/\/+$/, "");
  if (baseUrl) {
    const payload = await fetchJson(`${baseUrl}/api/monday/board?boardId=${encodeURIComponent(boardId)}`, {
      headers: gatewayHeaders
    });
    return normalizeMondayBoardPayload(payload, boardId);
  }

  return fetchMondayDirect(config.mondayToken.trim(), boardId);
}

function normalizeAgent(agent, index) {
  const name = agent?.name || agent?.id || `Agent ${index + 1}`;
  const known = KNOWN_AGENT_METADATA[agent?.id] || {};

  return {
    id: agent?.id || name,
    name,
    role: agent?.role || agent?.department || agent?.dept || known.role || "OpenClaw agent",
    model: agent?.model || agent?.provider || known.model || "Unknown model",
    status: normalizeStatus(agent?.status || agent?.state || agent?.health),
    sessions: toNumber(agent?.sessions || agent?.sessionCount || agent?.activeSessions),
    cost: formatMoney(agent?.costDay || agent?.cost || agent?.totalCost),
    initials: agent?.initials || known.initials || getInitials(name),
    color: agent?.color || known.color || "#0ea5e9",
    ring: agent?.ring || known.ring || "#38bdf8",
    raw: agent
  };
}

function normalizeSessionInventoryAgent(entry, index) {
  const id = String(entry?.agent || entry?.id || `agent-${index + 1}`).trim();
  const known = KNOWN_AGENT_METADATA[id] || {};
  const name = known.name || titleize(id);
  const sessionCount = toNumber(entry?.sessionCount || entry?.sessions);

  return {
    id,
    name,
    role: known.role || "OpenClaw agent",
    model: known.model || "Session snapshot",
    status: sessionCount > 0 ? "active" : "idle",
    sessions: sessionCount,
    cost: null,
    initials: known.initials || getInitials(name),
    color: known.color || "#0ea5e9",
    ring: known.ring || "#38bdf8",
    raw: entry
  };
}

function pickColumn(item, matcher) {
  return item?.column_values?.find((column) => matcher(column)) || null;
}

function parseMondayPriority(item) {
  const source = [
    pickColumn(item, (column) => /priority/i.test(column.id)),
    pickColumn(item, (column) => /priority/i.test(column.text))
  ].find(Boolean);
  const text = String(source?.text || "").toLowerCase();

  if (text.includes("critical")) {
    return "critical";
  }
  if (text.includes("high")) {
    return "high";
  }
  if (text.includes("medium")) {
    return "medium";
  }
  if (text.includes("low")) {
    return "low";
  }

  return "unspecified";
}

function parseMondayOwner(item) {
  const ownerColumn = pickColumn(
    item,
    (column) => /person|owner|people|assignee/i.test(`${column.id} ${column.type}`)
  );

  return ownerColumn?.text || "Unassigned";
}

function parseMondayDueDate(item) {
  const dateColumn = pickColumn(
    item,
    (column) => /date|timeline|deadline|due/i.test(`${column.id} ${column.type}`)
  );

  return dateColumn?.text || null;
}

function parseMondayStatus(item) {
  const statusColumn = pickColumn(
    item,
    (column) => /status|state/i.test(`${column.id} ${column.type}`)
  );

  return normalizeStatus(statusColumn?.text || item?.state || "unknown");
}

function normalizeMondayItem(item, boardName) {
  const status = parseMondayStatus(item);

  return {
    id: `monday-${item.id}`,
    source: "monday",
    itemId: item.id,
    boardName,
    name: item.name || "Untitled item",
    status,
    owner: parseMondayOwner(item),
    priority: parseMondayPriority(item),
    dueDate: parseMondayDueDate(item),
    group: item?.group?.title || "Ungrouped",
    updatedAt: item?.updated_at || null,
    raw: item
  };
}

function createGatewayActivities(agents, health, statusPayload) {
  const entries = agents.slice(0, 8).map((agent) => ({
    id: `gateway-agent-${agent.id}`,
    source: "gateway",
    title: `${agent.name} ${agent.status}`,
    description: `${agent.role} on ${agent.model}`,
    status: agent.status,
    at: new Date().toISOString()
  }));

  if (health) {
    entries.unshift({
      id: "gateway-health",
      source: "gateway",
      title: `Gateway ${normalizeStatus(health.status || (health.ok ? "ok" : "offline"))}`,
      description: health.worker?.baseUrl || "OpenClaw health endpoint responding",
      status: normalizeStatus(health.status || (health.ok ? "ok" : "offline")),
      at: new Date().toISOString()
    });
  }

  if (statusPayload?.metrics?.completedTasks) {
    entries.unshift({
      id: "gateway-metrics",
      source: "gateway",
      title: `${statusPayload.metrics.completedTasks} tasks completed`,
      description: `${toNumber(statusPayload.metrics.totalTasks)} total tasks tracked by the gateway`,
      status: "info",
      at: new Date().toISOString()
    });
  }

  return entries;
}

function createMondayActivities(mondayItems) {
  return mondayItems.slice(0, 10).map((item) => ({
    id: `activity-${item.id}`,
    source: "monday",
    title: item.name,
    description: `${item.boardName} / ${item.group} / ${item.owner}`,
    status: item.status,
    at: item.updatedAt
  }));
}

function createCronActivities(cronJobs) {
  return cronJobs.slice(0, 6).map((job) => ({
    id: `cron-${job.name}`,
    source: "cron",
    title: job.name || "Scheduled job",
    description: job.enabled ? "Enabled cron job" : "Disabled cron job",
    status: normalizeStatus(job.lastStatus || (job.enabled ? "enabled" : "disabled"), "unknown"),
    at: job.lastRunAt || job.updatedAt || null
  }));
}

function normalizeSkill(skill, index) {
  return {
    id: skill?.id || `skill-${index + 1}`,
    name: skill?.name || `Skill ${index + 1}`,
    version: skill?.version || "1.0",
    path: skill?.path || "",
    usage: toNumber(skill?.usage),
    score: toNumber(skill?.score),
    grade: skill?.grade || "-"
  };
}

function normalizeAcpSession(session, index) {
  return {
    id: session?.id || `acp-session-${index + 1}`,
    sizeBytes: toNumber(session?.sizeBytes),
    lastModified: session?.lastModified || null,
    transcriptPath: session?.transcriptPath || "",
    status: "completed",
    raw: session
  };
}

function normalizeBundledSnapshot(payload) {
  const statusPayload = normalizeGatewayStatusPayload(payload?.status || payload?.gatewayStatus);
  const mondayPayload = normalizeMondayBoardPayload(payload?.monday || payload?.mondayBoard, payload?.config?.mondayBoardId || DEFAULT_MONDAY_BOARD_ID);

  return {
    loading: false,
    health: payload?.health || null,
    status: statusPayload || null,
    monday: mondayPayload,
    healthError: payload?.healthError || null,
    statusError: payload?.statusError || payload?.status?.error || null,
    mondayError: payload?.mondayError || payload?.monday?.error || null,
    lastUpdated: payload?.generatedAt || payload?.lastUpdated || null,
    sessionInventory: Array.isArray(payload?.agents)
      ? payload.agents
      : Array.isArray(payload?.sessionsByAgent)
        ? payload.sessionsByAgent
        : [],
    cronJobs: Array.isArray(payload?.cronJobs) ? payload.cronJobs : [],
    skills: Array.isArray(payload?.skills) ? payload.skills : [],
    acpSessions: Array.isArray(payload?.acpSessions) ? payload.acpSessions.map(normalizeAcpSession) : [],
    projects: Array.isArray(payload?.projects) ? payload.projects : [],
    liveMetrics: payload?.metrics || {},
    sourceLabel: payload?.generatedAt ? "bundled snapshot" : "runtime"
  };
}

function buildDerivedData(snapshot, config) {
  const agents = Array.isArray(snapshot.status?.bots)
    ? snapshot.status.bots.map(normalizeAgent)
    : Array.isArray(snapshot.sessionInventory) && snapshot.sessionInventory.length
      ? snapshot.sessionInventory.map(normalizeSessionInventoryAgent)
      : [];
  const metrics = snapshot.status?.metrics || {};
  const mondayItems = Array.isArray(snapshot.monday?.items_page?.items)
    ? snapshot.monday.items_page.items.map((item) => normalizeMondayItem(item, snapshot.monday.name || "Monday board"))
    : [];
  const cronJobs = Array.isArray(snapshot.cronJobs) ? snapshot.cronJobs : [];
  const skills = Array.isArray(snapshot.skills) ? snapshot.skills.map(normalizeSkill) : [];
  const acpSessions = Array.isArray(snapshot.acpSessions) ? snapshot.acpSessions : [];

  const onlineAgents = agents.filter((agent) => ["online", "running", "active", "busy", "healthy", "ok"].includes(agent.status)).length;
  const busyAgents = agents.filter((agent) => agent.status === "busy").length;
  const totalTasks = mondayItems.length || toNumber(metrics.totalTasks);
  const completedTasks = mondayItems.filter((item) => ["done", "complete", "completed"].includes(item.status)).length || toNumber(metrics.completedTasks);
  const activeTasks = Math.max(totalTasks - completedTasks, 0);
  const activeSessions = toNumber(snapshot.status?.session?.activeSessions || agents.reduce((sum, agent) => sum + agent.sessions, 0));
  const mondayConfigured = Boolean(
    config.mondayBoardId &&
    (config.mondayProxyUrl || config.gatewayUrl || config.mondayToken || mondayItems.length)
  );
  const healthStatus = snapshot.health?.status || (snapshot.health ? "ok" : "offline");
  const detailStatus = snapshot.status
    ? "connected"
    : snapshot.statusError?.includes("401") || snapshot.statusError?.includes("403")
      ? "auth required"
      : agents.length
        ? "snapshot"
        : "unavailable";
  const mondayStatus = mondayConfigured
    ? snapshot.monday
      ? "connected"
      : snapshot.mondayError
        ? "error"
        : "connecting"
    : "not configured";

  const gatewayActivities = createGatewayActivities(agents, snapshot.health, snapshot.status);
  const mondayActivities = createMondayActivities(mondayItems);
  const cronActivities = createCronActivities(cronJobs);
  const activities = [...mondayActivities, ...gatewayActivities, ...cronActivities]
    .sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime())
    .slice(0, 18);

  return {
    agents,
    mondayItems,
    acpSessions,
    activities,
    cronJobs,
    skills,
    projects: snapshot.projects || [],
    liveMetrics: snapshot.liveMetrics || {},
    metrics: {
      onlineAgents,
      busyAgents,
      totalTasks: totalTasks || acpSessions.length,
      completedTasks: completedTasks || acpSessions.filter(s => s.status === "done").length,
      activeTasks: activeTasks || acpSessions.filter(s => s.status === "delegated").length,
      activeSessions,
      healthStatus,
      detailStatus,
      mondayStatus
    }
  };
}

const INITIAL_BUNDLED_SNAPSHOT = normalizeBundledSnapshot(bundledSnapshot);

export function MissionControlDataProvider({ children }) {
  const [config, setConfig] = useState({
    gatewayUrl: readStoredValue(STORAGE_KEYS.gatewayUrl, DEFAULT_GATEWAY_URL),
    gatewayToken: readStoredValue(STORAGE_KEYS.gatewayToken, DEFAULT_GATEWAY_TOKEN),
    mondayProxyUrl: readStoredValue(STORAGE_KEYS.mondayProxyUrl, DEFAULT_MONDAY_PROXY_URL),
    mondayToken: readStoredValue(STORAGE_KEYS.mondayToken, DEFAULT_MONDAY_TOKEN),
    mondayBoardId: readStoredValue(STORAGE_KEYS.mondayBoardId, DEFAULT_MONDAY_BOARD_ID)
  });
  const [snapshot, setSnapshot] = useState(INITIAL_BUNDLED_SNAPSHOT);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const baseUrl = config.gatewayUrl.trim().replace(/\/+$/, "");
      const gatewayHeaders = config.gatewayToken.trim()
        ? { Authorization: `Bearer ${config.gatewayToken.trim()}` }
        : {};
      const mondayProxyHeaders = config.gatewayToken.trim() || DEFAULT_MONDAY_PROXY_TOKEN
        ? { Authorization: `Bearer ${config.gatewayToken.trim() || DEFAULT_MONDAY_PROXY_TOKEN}` }
        : {};

      if (!cancelled) {
        setSnapshot((current) => ({ ...current, loading: true }));
      }

      const tasks = [
        baseUrl ? fetchJson(`${baseUrl}/health`) : Promise.reject(new Error("Gateway URL is empty.")),
        baseUrl ? fetchJson(`${baseUrl}/api/status`, { headers: gatewayHeaders }) : Promise.reject(new Error("Gateway URL is empty.")),
        fetchMondayBoard(config, gatewayHeaders, mondayProxyHeaders)
      ];

      const [healthResult, statusResult, mondayResult] = await Promise.allSettled(tasks);

      if (cancelled) {
        return;
      }

      setSnapshot((current) => ({
        ...current,
        loading: false,
        health: healthResult.status === "fulfilled" ? healthResult.value : current.health,
        status: statusResult.status === "fulfilled" ? normalizeGatewayStatusPayload(statusResult.value) : current.status,
        monday: mondayResult.status === "fulfilled" ? mondayResult.value : current.monday,
        healthError: healthResult.status === "rejected" ? healthResult.reason?.message || "Health check failed." : null,
        statusError: statusResult.status === "rejected" ? statusResult.reason?.message || "Status request failed." : null,
        mondayError: mondayResult.status === "rejected" ? mondayResult.reason?.message || "Monday request failed." : null,
        lastUpdated: new Date().toISOString(),
        sourceLabel:
          healthResult.status === "fulfilled" ||
          statusResult.status === "fulfilled" ||
          mondayResult.status === "fulfilled"
            ? "live"
            : current.sourceLabel
      }));
    };

    run();
    const intervalId = window.setInterval(run, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [config.gatewayUrl, config.gatewayToken, config.mondayProxyUrl, config.mondayToken, config.mondayBoardId, refreshTick]);

  const value = useMemo(() => {
    const derived = buildDerivedData(snapshot, config);

    return {
      config,
      snapshot,
      ...derived,
      pollIntervalMs: POLL_INTERVAL_MS,
      setConfig: (nextConfig) => {
        setConfig((current) => {
          const resolved = typeof nextConfig === "function" ? nextConfig(current) : nextConfig;

          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEYS.gatewayUrl, resolved.gatewayUrl || "");
            window.localStorage.setItem(STORAGE_KEYS.gatewayToken, resolved.gatewayToken || "");
            window.localStorage.setItem(STORAGE_KEYS.mondayProxyUrl, resolved.mondayProxyUrl || "");
            window.localStorage.setItem(STORAGE_KEYS.mondayToken, resolved.mondayToken || "");
            window.localStorage.setItem(STORAGE_KEYS.mondayBoardId, resolved.mondayBoardId || "");
          }

          return resolved;
        });
      },
      refresh: () => setRefreshTick((value) => value + 1),
      defaults: {
        gatewayUrl: DEFAULT_GATEWAY_URL,
        gatewayToken: DEFAULT_GATEWAY_TOKEN,
        mondayProxyUrl: DEFAULT_MONDAY_PROXY_URL,
        mondayBoardId: DEFAULT_MONDAY_BOARD_ID
      }
    };
  }, [config, snapshot]);

  return <MissionControlDataContext.Provider value={value}>{children}</MissionControlDataContext.Provider>;
}

export function useMissionControlData() {
  const context = useContext(MissionControlDataContext);

  if (!context) {
    throw new Error("useMissionControlData must be used within MissionControlDataProvider");
  }

  return context;
}
