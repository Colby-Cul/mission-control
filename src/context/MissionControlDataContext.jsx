import { createContext, useContext, useEffect, useMemo, useState } from "react";

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

  return {
    id: agent?.id || name,
    name,
    role: agent?.role || agent?.department || agent?.dept || "OpenClaw agent",
    model: agent?.model || agent?.provider || "Unknown model",
    status: normalizeStatus(agent?.status || agent?.state || agent?.health),
    sessions: toNumber(agent?.sessions || agent?.sessionCount || agent?.activeSessions),
    cost: formatMoney(agent?.costDay || agent?.cost || agent?.totalCost),
    raw: agent
  };
}

function pickColumn(item, matcher) {
  return (
    item?.column_values?.find((column) => matcher(column)) || null
  );
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

function buildDerivedData(snapshot, config) {
  const agents = Array.isArray(snapshot.status?.bots)
    ? snapshot.status.bots.map(normalizeAgent)
    : [];
  const metrics = snapshot.status?.metrics || {};
  const mondayItems = Array.isArray(snapshot.monday?.items_page?.items)
    ? snapshot.monday.items_page.items.map((item) => normalizeMondayItem(item, snapshot.monday.name || "Monday board"))
    : [];

  const onlineAgents = agents.filter((agent) => ["online", "running", "active", "busy", "healthy", "ok"].includes(agent.status)).length;
  const busyAgents = agents.filter((agent) => agent.status === "busy").length;
  const totalTasks = mondayItems.length || toNumber(metrics.totalTasks);
  const completedTasks = mondayItems.filter((item) => ["done", "complete", "completed"].includes(item.status)).length || toNumber(metrics.completedTasks);
  const activeTasks = Math.max(totalTasks - completedTasks, 0);
  const activeSessions = toNumber(snapshot.status?.session?.activeSessions);
  const mondayConfigured = Boolean(
    config.mondayBoardId &&
    (config.mondayProxyUrl || config.gatewayUrl || config.mondayToken)
  );
  const healthStatus = snapshot.health?.status || (snapshot.health ? "ok" : "offline");
  const detailStatus =
    snapshot.status ? "connected" : snapshot.statusError?.includes("401") || snapshot.statusError?.includes("403") ? "auth required" : "unavailable";
  const mondayStatus =
    mondayConfigured
      ? snapshot.monday
        ? "connected"
        : snapshot.mondayError
          ? "error"
          : "connecting"
      : "not configured";

  const gatewayActivities = createGatewayActivities(agents, snapshot.health, snapshot.status);
  const mondayActivities = createMondayActivities(mondayItems);
  const activities = [...mondayActivities, ...gatewayActivities]
    .sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime())
    .slice(0, 18);

  return {
    agents,
    mondayItems,
    activities,
    metrics: {
      onlineAgents,
      busyAgents,
      totalTasks,
      completedTasks,
      activeTasks,
      activeSessions,
      healthStatus,
      detailStatus,
      mondayStatus
    }
  };
}

export function MissionControlDataProvider({ children }) {
  const [config, setConfig] = useState({
    gatewayUrl: readStoredValue(STORAGE_KEYS.gatewayUrl, DEFAULT_GATEWAY_URL),
    gatewayToken: readStoredValue(STORAGE_KEYS.gatewayToken, DEFAULT_GATEWAY_TOKEN),
    mondayProxyUrl: readStoredValue(STORAGE_KEYS.mondayProxyUrl, DEFAULT_MONDAY_PROXY_URL),
    mondayToken: readStoredValue(STORAGE_KEYS.mondayToken, DEFAULT_MONDAY_TOKEN),
    mondayBoardId: readStoredValue(STORAGE_KEYS.mondayBoardId, DEFAULT_MONDAY_BOARD_ID)
  });
  const [snapshot, setSnapshot] = useState({
    loading: true,
    health: null,
    status: null,
    monday: null,
    healthError: null,
    statusError: null,
    mondayError: null,
    lastUpdated: null
  });
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

      setSnapshot({
        loading: false,
        health: healthResult.status === "fulfilled" ? healthResult.value : null,
        status: statusResult.status === "fulfilled" ? statusResult.value : null,
        monday: mondayResult.status === "fulfilled" ? mondayResult.value : null,
        healthError: healthResult.status === "rejected" ? healthResult.reason?.message || "Health check failed." : null,
        statusError: statusResult.status === "rejected" ? statusResult.reason?.message || "Status request failed." : null,
        mondayError: mondayResult.status === "rejected" ? mondayResult.reason?.message || "Monday request failed." : null,
        lastUpdated: new Date().toISOString()
      });
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
