import { createContext, useContext, useEffect, useMemo, useState } from "react";

import bundledSnapshot from "../data/live-data.json";
import bundledProjects from "../data/projects.json";

const ENV = typeof import.meta !== "undefined" ? import.meta.env || {} : {};
const DEFAULT_GATEWAY_URL = String(
  ENV.VITE_MISSION_CONTROL_GATEWAY_URL ||
  ENV.VITE_API_BASE_URL ||
  ""
).trim();
const DEFAULT_GATEWAY_TOKEN = String(
  ENV.VITE_MISSION_CONTROL_GATEWAY_TOKEN || ""
).trim();
const POLL_INTERVAL_MS = 15000;

const STORAGE_KEYS = {
  gatewayUrl: "mission-control.gateway-url",
  gatewayToken: "mission-control.gateway-token"
};

const MissionControlDataContext = createContext(null);

const KNOWN_AGENT_METADATA = {
  main: { name: "Jarvis", role: "chief of staff", model: "Claude Opus", initials: "JV", color: "#6366f1", ring: "#818cf8" },
  worker: { name: "Worker", role: "implementation", model: "Claude Sonnet", initials: "WK", color: "#10b981", ring: "#34d399" },
  "coding-agent": { name: "Soren", role: "software engineer", model: "Claude Sonnet", initials: "SR", color: "#10b981", ring: "#34d399" },
  validation: { name: "Quinn", role: "QA engineer", model: "Claude Sonnet", initials: "QN", color: "#0ea5e9", ring: "#38bdf8" },
  "executive-assistant": { name: "Victoria", role: "executive assistant", model: "Claude Haiku", initials: "VA", color: "#8b5cf6", ring: "#a78bfa" },
  codex: { name: "Codex", role: "coding agent", model: "GPT-5.4", initials: "CX", color: "#14b8a6", ring: "#2dd4bf" },
  cfo: { name: "Colton", role: "Chief Financial Officer", model: "Claude Sonnet", initials: "CF", color: "#D4AF37", ring: "#F5D060" },
  bookkeeper: { name: "Beatrice", role: "Bookkeeper", model: "Claude Haiku", initials: "BT", color: "#a855f7", ring: "#c084fc" },
};

function readStoredValue(key, fallback = "") {
  if (typeof window === "undefined") return fallback;
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
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "AG";
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

function normalizeAgent(agent, index) {
  const id = agent?.id || `agent-${index + 1}`;
  const known = KNOWN_AGENT_METADATA[id] || {};
  const name = agent?.name || known.name || titleize(id);
  const sessions = toNumber(agent?.sessionCount || agent?.sessions);

  return {
    id,
    name,
    role: agent?.role || known.role || "OpenClaw agent",
    model: agent?.model || known.model || "Unknown model",
    status: sessions > 0 ? "active" : "idle",
    sessions,
    cost: null,
    initials: known.initials || getInitials(name),
    color: known.color || "#0ea5e9",
    ring: known.ring || "#38bdf8",
    knowledge: agent?.knowledge || null,
    raw: agent
  };
}

function normalizeAcpSession(session, index) {
  const totalCost = Number(session?.totalCost);
  const estimatedCost = Number(session?.estimatedCostToCompletion);

  return {
    id: session?.id || session?.sessionId || `session-${index + 1}`,
    sessionId: session?.sessionId || session?.id || "",
    agent: session?.agent || "unknown",
    task: session?.task || "ACP Session",
    status: session?.status || "todo",
    lane: session?.lane || normalizeStatus(session?.status),
    startTime: session?.startTime || session?.dateCreated || null,
    endTime: session?.endTime || session?.dateFinished || null,
    dateCreated: session?.dateCreated || session?.startTime || null,
    dateFinished: session?.dateFinished || session?.endTime || null,
    tokens: toNumber(session?.tokens),
    model: session?.model || "",
    apiModelUsed: session?.apiModelUsed || session?.model || "",
    modelsUsed: Array.isArray(session?.modelsUsed) ? session.modelsUsed : session?.model ? [session.model] : [],
    inputTokens: toNumber(session?.inputTokens),
    outputTokens: toNumber(session?.outputTokens),
    cachedInputTokens: toNumber(session?.cachedInputTokens),
    totalCost: Number.isFinite(totalCost) ? totalCost : 0,
    estimatedCostToCompletion: Number.isFinite(estimatedCost) ? estimatedCost : null,
    estimatedTimeToCompletion: session?.estimatedTimeToCompletion || null,
    sizeBytes: toNumber(session?.sizeBytes),
    transcriptPath: session?.transcriptPath || "",
    isCron: Boolean(session?.isCron),
    spawns: toNumber(session?.spawns),
    parentSession: session?.parentSession || "",
    projectId: session?.projectId || "",
    projectName: session?.projectName || "",
    durationMinutes: (() => {
      const start = session?.startTime || session?.dateCreated;
      const end = session?.endTime || session?.dateFinished;
      if (start && end) {
        const ms = new Date(end).getTime() - new Date(start).getTime();
        return ms > 0 ? Math.round(ms / 60000) : 0;
      }
      return 0;
    })(),
  };
}

function normalizeProject(project, sessions) {
  // Match from global acpSessions first; fall back to sessions embedded in the project object
  const globalMatches = sessions.filter((session) => session.projectId === project.id);
  const embeddedSessions = Array.isArray(project?.sessions) ? project.sessions.map(normalizeAcpSession) : [];
  const matchedSessions = globalMatches.length > 0 ? globalMatches : embeddedSessions;
  const derivedModels = Array.from(new Set(matchedSessions.flatMap((session) => session.modelsUsed || []))).filter(Boolean);
  const derivedAgents = Array.from(new Set(matchedSessions.map((session) => session.agent))).filter(Boolean);
  const totalCost = Number(project?.totalCost);
  const estimatedCost = Number(project?.estimatedCostToCompletion);

  return {
    ...project,
    taskCount: project?.taskCount ?? matchedSessions.length,
    doneCount: project?.doneCount ?? matchedSessions.filter((session) => normalizeStatus(session.status) === "done").length,
    activeCount: project?.activeCount ?? matchedSessions.filter((session) => normalizeStatus(session.status) !== "done").length,
    totalCost: Number.isFinite(totalCost) ? totalCost : matchedSessions.reduce((sum, session) => sum + session.totalCost, 0),
    estimatedCostToCompletion: Number.isFinite(estimatedCost) ? estimatedCost : matchedSessions.reduce((sum, session) => sum + (session.estimatedCostToCompletion || 0), 0),
    estimatedTimeToCompletion: project?.estimatedTimeToCompletion || null,
    apiModelsUsed: Array.isArray(project?.apiModelsUsed) && project.apiModelsUsed.length ? project.apiModelsUsed : derivedModels,
    modelsUsed: Array.isArray(project?.modelsUsed) && project.modelsUsed.length ? project.modelsUsed : derivedModels,
    agentsWorkedOn: Array.isArray(project?.agentsWorkedOn) && project.agentsWorkedOn.length ? project.agentsWorkedOn : derivedAgents,
    agents: Array.isArray(project?.agents) && project.agents.length ? project.agents : derivedAgents,
    sessions: matchedSessions
  };
}

function createActivities(acpSessions, cronJobs) {
  const sessionActivities = acpSessions.slice(0, 12).map((session) => ({
    id: `session-${session.sessionId || session.id}`,
    source: "session",
    title: session.task,
    description: `${session.agent} · ${session.status}`,
    status: normalizeStatus(session.status),
    at: session.dateFinished || session.dateCreated || null
  }));

  const cronActivities = (cronJobs || []).slice(0, 6).map((job) => ({
    id: `cron-${job.id || job.name}`,
    source: "cron",
    title: job.name || "Scheduled job",
    description: job.enabled ? "Enabled cron job" : "Disabled cron job",
    status: normalizeStatus(job.lastStatus || (job.enabled ? "enabled" : "disabled")),
    at: job.lastRunAt || null
  }));

  return [...sessionActivities, ...cronActivities]
    .sort((left, right) => new Date(right.at || 0).getTime() - new Date(left.at || 0).getTime())
    .slice(0, 18);
}

const INITIAL_SNAPSHOT = {
  loading: false,
  generatedAt: bundledSnapshot?.generatedAt || null,
  agents: Array.isArray(bundledSnapshot?.agents) ? bundledSnapshot.agents : [],
  acpSessions: Array.isArray(bundledSnapshot?.acpSessions) ? bundledSnapshot.acpSessions.map(normalizeAcpSession) : [],
  projects: Array.isArray(bundledProjects) && bundledProjects.length ? bundledProjects : Array.isArray(bundledSnapshot?.projects) ? bundledSnapshot.projects : [],
  cronJobs: Array.isArray(bundledSnapshot?.cronJobs) ? bundledSnapshot.cronJobs : [],
  skills: Array.isArray(bundledSnapshot?.skills) ? bundledSnapshot.skills : [],
  apiCredentials: Array.isArray(bundledSnapshot?.apiCredentials) ? bundledSnapshot.apiCredentials : [],
  metrics: bundledSnapshot?.metrics || {},
  health: null,
  healthError: null,
  sourceLabel: "bundled snapshot"
};

export function MissionControlDataProvider({ children }) {
  const [config, setConfig] = useState({
    gatewayUrl: readStoredValue(STORAGE_KEYS.gatewayUrl, DEFAULT_GATEWAY_URL),
    gatewayToken: readStoredValue(STORAGE_KEYS.gatewayToken, DEFAULT_GATEWAY_TOKEN)
  });
  const [snapshot, setSnapshot] = useState(INITIAL_SNAPSHOT);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const baseUrl = config.gatewayUrl.trim().replace(/\/+$/, "");
      const gatewayHeaders = config.gatewayToken.trim()
        ? { Authorization: `Bearer ${config.gatewayToken.trim()}` }
        : {};

      if (!cancelled) {
        setSnapshot((current) => ({ ...current, loading: true }));
      }

      const basePath = import.meta.env.BASE_URL || "/";
      const liveDataUrl = `${window.location.origin}${basePath}live-data.json`;
      const projectsUrl = `${window.location.origin}${basePath}projects.json`;
      const fallbackLiveDataUrl = `${window.location.origin}/live-data.json`;
      const fallbackProjectsUrl = `${window.location.origin}/projects.json`;

      const tasks = [
        baseUrl ? fetchJson(`${baseUrl}/health`, { headers: gatewayHeaders }) : Promise.resolve(null),
        fetchJson(liveDataUrl).catch(() => fetchJson(fallbackLiveDataUrl)).catch(() => null),
        fetchJson(projectsUrl).catch(() => fetchJson(fallbackProjectsUrl)).catch(() => null)
      ];

      const [healthResult, liveDataResult, projectsResult] = await Promise.allSettled(tasks);
      if (cancelled) return;

      const liveData = liveDataResult.status === "fulfilled" ? liveDataResult.value : null;
      const projects = projectsResult.status === "fulfilled" && Array.isArray(projectsResult.value)
        ? projectsResult.value
        : null;

      setSnapshot((current) => ({
        ...current,
        loading: false,
        generatedAt: liveData?.generatedAt || current.generatedAt,
        agents: Array.isArray(liveData?.agents) ? liveData.agents : current.agents,
        acpSessions: Array.isArray(liveData?.acpSessions) ? liveData.acpSessions.map(normalizeAcpSession) : current.acpSessions,
        projects: projects || (Array.isArray(liveData?.projects) ? liveData.projects : current.projects),
        cronJobs: Array.isArray(liveData?.cronJobs) ? liveData.cronJobs : current.cronJobs,
        skills: Array.isArray(liveData?.skills) ? liveData.skills : current.skills,
        apiCredentials: Array.isArray(liveData?.apiCredentials) ? liveData.apiCredentials : current.apiCredentials,
        metrics: liveData?.metrics || current.metrics,
        health: healthResult.status === "fulfilled" ? healthResult.value : current.health,
        healthError: healthResult.status === "rejected" ? healthResult.reason?.message || "Health request failed." : null,
        sourceLabel: liveData ? "live snapshot" : current.sourceLabel
      }));
    };

    run();
    const intervalId = window.setInterval(run, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [config.gatewayUrl, config.gatewayToken, refreshTick]);

  const value = useMemo(() => {
    const agents = (snapshot.agents || []).map(normalizeAgent);
    const acpSessions = (snapshot.acpSessions || []).map((session) => normalizeAcpSession(session));
    const projects = (snapshot.projects || []).map((project) => normalizeProject(project, acpSessions));
    const activities = createActivities(acpSessions, snapshot.cronJobs || []);
    const metrics = {
      onlineAgents: agents.filter((agent) => agent.status === "active").length,
      busyAgents: agents.filter((agent) => agent.sessions > 0).length,
      totalTasks: snapshot.metrics?.totalSessions || acpSessions.length,
      completedTasks: acpSessions.filter((session) => normalizeStatus(session.status) === "done").length,
      activeTasks: acpSessions.filter((session) => normalizeStatus(session.status) !== "done").length,
      activeSessions: acpSessions.filter((session) => normalizeStatus(session.status) !== "done").length,
      healthStatus: snapshot.health?.ok ? "ok" : snapshot.healthError ? "error" : "unknown",
      detailStatus: snapshot.sourceLabel,
      mondayStatus: "disabled"
    };

    return {
      config,
      snapshot,
      agents,
      acpSessions,
      projects,
      cronJobs: snapshot.cronJobs || [],
      skills: snapshot.skills || [],
      activities,
      mondayItems: [],
      liveMetrics: snapshot.metrics || {},
      metrics,
      pollIntervalMs: POLL_INTERVAL_MS,
      setConfig: (nextConfig) => {
        setConfig((current) => {
          const resolved = typeof nextConfig === "function" ? nextConfig(current) : nextConfig;
          if (typeof window !== "undefined") {
            window.localStorage.setItem(STORAGE_KEYS.gatewayUrl, resolved.gatewayUrl || "");
            window.localStorage.setItem(STORAGE_KEYS.gatewayToken, resolved.gatewayToken || "");
          }
          return resolved;
        });
      },
      refresh: () => setRefreshTick((value) => value + 1),
      defaults: {
        gatewayUrl: DEFAULT_GATEWAY_URL,
        gatewayToken: DEFAULT_GATEWAY_TOKEN
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
