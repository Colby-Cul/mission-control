const STORAGE_KEY = "mc-api-url";
const DEFAULT_URL = "http://localhost:7070";

export function getApiUrl() {
  if (typeof window === "undefined") return DEFAULT_URL;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return stored;
  // If served from mc-api (port 7070), use same-origin to avoid CORS
  if (window.location.port === "7070") return "";
  return DEFAULT_URL;
}

export const HOME_DIR = (typeof import.meta !== "undefined" && import.meta.env?.VITE_HOME_DIR) || "/Users/jarvisculbertson";
