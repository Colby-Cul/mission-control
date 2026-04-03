const {
  deleteConnectionFromKeychain,
  loadConnectionFromKeychain,
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
    const storedConnection = loadConnectionFromKeychain(connectionKey);
    const token =
      String(body.refreshToken || "").trim() ||
      String(body.accessToken || "").trim() ||
      storedConnection?.refreshToken ||
      storedConnection?.accessToken ||
      "";

    if (!token) {
      return sendJson(res, 400, {
        error: "No token available to revoke. Supply refreshToken/accessToken or a stored companyId/realmId.",
      });
    }

    const revocation = await revokeToken(token);
    const keychainDelete = deleteConnectionFromKeychain(connectionKey);

    return sendJson(res, 200, {
      ok: true,
      revocation,
      deletedStoredConnection: keychainDelete,
      companyId: companyId || null,
      realmId: realmId || null,
    });
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.message,
      details: error.details || null,
    });
  }
};
