const {
  deleteConnection,
  loadConnection,
  readJsonBody,
  sendJson,
  verifyIntuitWebhookSignature,
} = require("../_lib/quickbooks");

/**
 * Intuit Webhook Receiver
 *
 * Handles disconnect and data-change notifications from Intuit.
 * Register this URL in the Intuit Developer Portal under Webhooks:
 *   https://mc-merge-v7.vercel.app/api/qb/webhook
 *
 * Required env var: INTUIT_WEBHOOK_VERIFIER_TOKEN
 */
module.exports = async function handler(req, res) {
  // Intuit sends a GET to validate the endpoint exists
  if (req.method === "GET") {
    return sendJson(res, 200, { ok: true, endpoint: "quickbooks-webhook" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // Read raw body for signature verification
  let rawBody;
  if (typeof req.body === "string") {
    rawBody = req.body;
  } else if (req.body && typeof req.body === "object") {
    rawBody = JSON.stringify(req.body);
  } else {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    rawBody = Buffer.concat(chunks).toString("utf8");
  }

  // Verify webhook signature
  const signature = req.headers["intuit-signature"] || "";
  const verifierToken = process.env.INTUIT_WEBHOOK_VERIFIER_TOKEN || "";

  if (verifierToken && !verifyIntuitWebhookSignature(rawBody, signature, verifierToken)) {
    console.error("QuickBooks webhook signature verification failed");
    return sendJson(res, 401, { error: "Invalid webhook signature" });
  }

  try {
    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody;
    const notifications = payload?.eventNotifications || [];

    const results = [];

    for (const notification of notifications) {
      const realmId = notification.realmId;
      const events = notification.dataChangeEvent?.entities || [];

      for (const event of events) {
        // Handle disconnect events
        if (event.name === "Disconnect" || event.operation === "Void") {
          console.log(`QuickBooks disconnect notification for realm ${realmId}`);
          const deletion = await deleteConnection(realmId);
          results.push({ realmId, action: "disconnected", deletion });
          continue;
        }

        // Log other data change events for future processing
        results.push({
          realmId,
          entity: event.name,
          operation: event.operation,
          id: event.id,
          action: "logged",
        });
      }
    }

    return sendJson(res, 200, { ok: true, processed: results.length, results });
  } catch (error) {
    console.error("QuickBooks webhook processing error", {
      message: error.message,
    });
    return sendJson(res, 500, { error: error.message });
  }
};
