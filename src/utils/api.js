const STORAGE_KEY = "mc-api-url";
const DEFAULT_URL = "http://localhost:7070";

export function getApiUrl() {
  if (typeof window === "undefined") return DEFAULT_URL;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
}

export const HOME_DIR = (typeof import.meta !== "undefined" && import.meta.env?.VITE_HOME_DIR) || "/Users/jarvisculbertson";
