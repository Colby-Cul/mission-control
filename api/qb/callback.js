const {
  clearCookie,
  exchangeCodeForTokens,
  getCookies,
  parseState,
  redirect,
  sendJson,
  storeConnectionInKeychain,
} = require("../_lib/quickbooks");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const code = String(req.query.code || "").trim();
  const realmId = String(req.query.realmId || "").trim();
  const error = String(req.query.error || "").trim();
  const errorDescription = String(req.query.error_description || "").trim();
  const stateParam = String(req.query.state || "").trim();
  const state = parseState(stateParam);
  const cookies = getCookies(req);

  clearCookie(res, "qb_oauth_state", "/api/qb/callback");

  if (error) {
    const returnTo = state?.returnTo || cookies.qb_post_auth_return || "/integrations";
    const failureUrl = new URL(returnTo, "https://mission-control-peach-omega.vercel.app");
    failureUrl.searchParams.set("qb_status", "error");
    failureUrl.searchParams.set("qb_error", error);
    if (errorDescription) {
      failureUrl.searchParams.set("qb_error_description", errorDescription);
    }
    return redirect(res, failureUrl.toString());
  }

  if (!code) {
    return sendJson(res, 400, { error: "Missing QuickBooks authorization code" });
  }

  if (!state?.nonce || state.nonce !== cookies.qb_oauth_state) {
    return sendJson(res, 400, { error: "Invalid or expired OAuth state" });
  }

  try {
    const tokenSet = await exchangeCodeForTokens(code);
    const companyKey = state.companyId || realmId || "default";
    const connectionRecord = {
      companyId: state.companyId || null,
      realmId: realmId || null,
      tokenType: tokenSet.token_type,
      scope: tokenSet.scope,
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresIn: tokenSet.expires_in,
      refreshTokenExpiresIn: tokenSet.x_refresh_token_expires_in,
      connectedAt: new Date().toISOString(),
    };
    const storage = storeConnectionInKeychain(companyKey, connectionRecord);

    clearCookie(res, "qb_post_auth_return", "/");

    const returnTo = state.returnTo || cookies.qb_post_auth_return || "/integrations";
    const successUrl = new URL(returnTo, "https://mission-control-peach-omega.vercel.app");
    successUrl.searchParams.set("qb_status", "connected");
    if (realmId) successUrl.searchParams.set("realmId", realmId);
    if (state.companyId) successUrl.searchParams.set("companyId", state.companyId);

    if (storage.stored) {
      successUrl.searchParams.set("qb_store", storage.store);
      return redirect(res, successUrl.toString());
    }

    return sendJson(res, 200, {
      ok: true,
      message:
        "QuickBooks authorization code exchanged successfully. Runtime token persistence is only available via macOS Keychain in local execution.",
      realmId: realmId || null,
      companyId: state.companyId || null,
      storage,
      tokens: connectionRecord,
    });
  } catch (exchangeError) {
    console.error("QuickBooks token exchange failed", {
      intuitTid: exchangeError.intuitTid || null,
      statusCode: exchangeError.statusCode || 500,
      message: exchangeError.message,
      details: exchangeError.details || null,
      realmId: realmId || null,
      companyId: state?.companyId || null,
    });

    return sendJson(res, exchangeError.statusCode || 500, {
      error: exchangeError.message,
      details: exchangeError.details || null,
      intuitTid: exchangeError.intuitTid || null,
    });
  }
};
