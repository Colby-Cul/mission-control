const {
  QUICKBOOKS_AUTH_URL,
  getCookies,
  makeState,
  redirect,
  requireClientConfig,
  sendJson,
  setCookie,
} = require("../_lib/quickbooks");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { clientId, redirectUri, scopes } = requireClientConfig();
    const companyId = String(req.query.companyId || "").trim();
    const returnTo = String(req.query.returnTo || "/integrations").trim();
    const reconnect = String(req.query.reconnect || "false") === "true";
    const cookies = getCookies(req);
    const { nonce, encoded } = makeState({ companyId, returnTo, reconnect });

    setCookie(res, "qb_oauth_state", nonce, {
      maxAge: 60 * 10,
      path: "/api/qb/callback",
      sameSite: "Lax",
    });

    if (cookies.qb_post_auth_return !== returnTo) {
      setCookie(res, "qb_post_auth_return", returnTo, {
        maxAge: 60 * 10,
        path: "/",
        sameSite: "Lax",
      });
    }

    const authUrl = new URL(QUICKBOOKS_AUTH_URL);
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("state", encoded);

    return redirect(res, authUrl.toString());
  } catch (error) {
    return sendJson(res, error.statusCode || 500, {
      error: error.message,
    });
  }
};
