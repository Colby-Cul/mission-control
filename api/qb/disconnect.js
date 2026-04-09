const {
  deleteConnection,
  loadConnection,
  readJsonBody,
  revokeToken,
  sendJson,
} = require("../_lib/quickbooks");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJsonBody(req);
    const companyId = String(body.companyId || "").trim();
    const realmId = String(body.realmId || "").trim();
    const connectionKey = companyId || realmId;

    const storedConnection = await loadConnection(connectionKey);
    const token =
      String(body.refreshToken || "").trim() ||
      String(body.accessToken || "").trim() ||
      storedConnection?.refresh_token ||
      storedConnection?.access_token ||
      "";

    if (!token) {
      return sendJson(res, 400, {
        error: "No token available to revoke. Supply refreshToken/accessToken or a stored companyId/realmId.",
      });
    }

    const revocation = await revokeToken(token);
    const deletion = await deleteConnection(connectionKey);

    return sendJson(res, 200, {
      ok: true,
      revocation,
      deletedStoredConnection: deletion,
      companyId: companyId || null,
      realmId: realmId || null,
    });
  } catch (error) {
    console.error("QuickBooks disconnect failed", {
      intuitTid: error.intuitTid || null,
      statusCode: error.statusCode || 500,
      message: error.message,
      details: error.details || null,
    });

    return sendJson(res, error.statusCode || 500, {
      error: error.message,
      details: error.details || null,
      intuitTid: error.intuitTid || null,
    });
  }
};
