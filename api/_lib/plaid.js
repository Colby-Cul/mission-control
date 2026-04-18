const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const PLAID_ENV = (process.env.PLAID_ENV || "sandbox").trim();

function getPlaidConfig() {
  const clientId = (process.env.PLAID_CLIENT_ID || "").trim();
  const secret = (process.env.PLAID_SECRET || "").trim();

  if (!clientId || !secret) {
    const error = new Error(
      "Missing Plaid credentials. Set PLAID_CLIENT_ID and PLAID_SECRET in Vercel."
    );
    error.statusCode = 500;
    throw error;
  }

  return { clientId, secret, env: PLAID_ENV };
}

function getPlaidClient() {
  const { env } = getPlaidConfig();

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "Content-Type": "application/json",
      },
    },
  });

  return new PlaidApi(configuration);
}

// Inject client_id and secret into every Plaid API request body
function withCredentials(params = {}) {
  const { clientId, secret } = getPlaidConfig();
  return { client_id: clientId, secret, ...params };
}

function getWebhookUrl() {
  return (
    process.env.PLAID_WEBHOOK_URL ||
    "https://mc-merge-v7.vercel.app/api/plaid/webhook"
  );
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

async function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
}

module.exports = {
  getPlaidClient,
  getPlaidConfig,
  getWebhookUrl,
  withCredentials,
  sendJson,
  readJsonBody,
  PLAID_ENV,
};
