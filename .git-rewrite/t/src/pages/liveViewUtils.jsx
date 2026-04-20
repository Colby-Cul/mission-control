import { C } from "../data/constants";

export function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "ok":
    case "healthy":
    case "live":
    case "online":
    case "running":
    case "active":
    case "connected":
    case "done":
    case "complete":
    case "completed":
    case "enabled":
    case "success":
      return C.green;
    case "busy":
    case "warning":
    case "working on it":
    case "working":
    case "in progress":
    case "in_progress":
    case "inprogress":
    case "degraded":
    case "stuck":
    case "auth required":
    case "not configured":
    case "delegated":
    case "pending":
    case "learning":
      return C.amber;
    case "error":
    case "failed":
    case "offline":
    case "blocked":
    case "disabled":
    case "unavailable":
    case "disconnected":
    case "missing":
    case "expired":
    case "stalled":
      return C.red;
    default:
      return C.cyan;
  }
}

export function priorityColor(priority) {
  switch (String(priority || "").toLowerCase()) {
    case "critical":
      return C.red;
    case "high":
      return C.amber;
    case "medium":
      return C.cyan;
    case "low":
      return C.green;
    default:
      return C.muted;
  }
}

export function formatDateTime(value, fallback = "Waiting for data") {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

export function parseCostAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalized = String(value || "").replace(/[^0-9.-]+/g, "");
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : 0;
}
