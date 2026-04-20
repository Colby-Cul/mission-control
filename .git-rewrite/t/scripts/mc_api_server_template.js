const http = require("http");
const { execSync, exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const PORT = 7070;
const HOST = "127.0.0.1";
const HOME = process.env.HOME;
const MC_DIR = path.join(HOME, "mission-control");
const SYNC_SCRIPT = path.join(HOME, ".openclaw", "scripts", "mc-sync.sh");
const LOG_FILE = path.join(HOME, ".openclaw", "logs", "mc-api.log");
const CREDENTIAL_STORE = path.join(HOME, ".openclaw", "credentials", "api-keys.json");

function log(message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${message}\n`;
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, line);
  process.stdout.write(line);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
  });
}

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "http://localhost");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function json(res, status, data) {
  cors(res);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readJson(filePath, fallback = {}) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
}

function maskKey(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  if (text.length <= 5) return "•".repeat(text.length);
  return `${"•".repeat(text.length - 5)}${text.slice(-5)}`;
}

function updateCredential(provider, key) {
  const payload = readJson(CREDENTIAL_STORE, { providers: {} });
  payload.providers = payload.providers || {};
  payload.providers[provider] = {
    key,
    updatedAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
  };
  writeJson(CREDENTIAL_STORE, payload);
  return {
    provider,
    maskedKey: maskKey(key),
    status: key ? "active" : "missing",
    lastUpdated: payload.providers[provider].updatedAt,
    lastVerified: payload.providers[provider].lastVerified,
    sourcePath: CREDENTIAL_STORE,
  };
}

const server = http.createServer(async (req, res) => {
  cors(res);
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${HOST}:${PORT}`);

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, {
      ok: true,
      host: HOST,
      port: PORT,
      startupCommand: "node ~/.openclaw/mc-api/server.js",
      fastIoFunctionsChecked: false,
    });
  }

  if (req.method === "GET" && url.pathname === "/data") {
    return json(res, 200, readJson(path.join(MC_DIR, "src", "data", "live-data.json"), {}));
  }

  if (req.method === "GET" && url.pathname === "/projects") {
    return json(res, 200, readJson(path.join(MC_DIR, "src", "data", "projects.json"), []));
  }

  if (req.method === "POST" && url.pathname === "/task") {
    const body = await parseBody(req);
    if (!body.name) return json(res, 400, { error: "name required" });

    const payload = JSON.stringify(body).replace(/'/g, "'\\''");
    execSync(`bash "${SYNC_SCRIPT}" add-task '${payload}'`, { timeout: 15000 });

    const agent = body.agent || "main";
    const msg = body.description ? `${body.name}: ${body.description}` : body.name;
    exec(`/opt/homebrew/bin/openclaw agent --agent ${agent} --message "${String(msg).replace(/"/g, '\\"')}" --timeout 60`, () => {});

    return json(res, 201, { ok: true, task: body.name, agent, synced: true });
  }

  if (req.method === "POST" && url.pathname === "/project") {
    const body = await parseBody(req);
    if (!body.name) return json(res, 400, { error: "name required" });

    const payload = JSON.stringify(body).replace(/'/g, "'\\''");
    execSync(`bash "${SYNC_SCRIPT}" add-project '${payload}'`, { timeout: 15000 });
    return json(res, 201, { ok: true, project: body.name, synced: true });
  }

  if (req.method === "POST" && url.pathname === "/sync") {
    execSync(`bash "${SYNC_SCRIPT}" refresh`, { timeout: 30000 });
    return json(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/task/update-status") {
    const body = await parseBody(req);
    if (!body.sessionId || !body.status) {
      return json(res, 400, { error: "sessionId and status required" });
    }
    const payload = JSON.stringify({
      status: body.status,
      lane: body.lane || body.status,
      projectId: body.projectId || "",
      projectName: body.projectName || "",
    }).replace(/'/g, "'\\''");
    execSync(`bash "${SYNC_SCRIPT}" update-task "${body.sessionId}" '${payload}'`, { timeout: 15000 });
    return json(res, 200, { ok: true, sessionId: body.sessionId, status: body.status });
  }

  if (req.method === "POST" && url.pathname.startsWith("/api-skills/") && url.pathname.endsWith("/update")) {
    const provider = decodeURIComponent(url.pathname.split("/")[2] || "").toLowerCase();
    const body = await parseBody(req);
    const key = String(body.key || "").trim();
    if (!provider) return json(res, 400, { error: "provider required" });
    if (!key) return json(res, 400, { error: "key required" });

    const record = updateCredential(provider, key);
    exec(`bash "${SYNC_SCRIPT}" refresh`, () => {});
    return json(res, 200, { ok: true, credential: record });
  }

  return json(res, 404, { error: "not found" });
});

server.listen(PORT, HOST, () => {
  log(`Mission Control API server running on http://${HOST}:${PORT}`);
});
