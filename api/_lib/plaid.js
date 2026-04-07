const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");

const PLAID_ENV = process.env.PLAID_ENV || "sandbox";

function getPlaidConfig() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;

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
  const { clientId, secret, env } = getPlaidConfig();

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

function getWebhookUrl() {
  return (
    process.env.PLAID_WEBHOOK_URL ||
    "https://mission-control-peach-omega.vercel.app/api/plaid/webhook"
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
  sendJson,
  readJsonBody,
  PLAID_ENV,
};
