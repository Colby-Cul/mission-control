const {
  QUICKBOOKS_AUTH_URL,
  getCookies,
  makeState,
  redirect,
  requireClientConfig,
  sendJson,
  setCookie,
} = require("../_lib/quickbooks");

const RECAPTCHA_SITE_KEY = (process.env.RECAPTCHA_SITE_KEY || "").trim();
const RECAPTCHA_SECRET_KEY = (process.env.RECAPTCHA_SECRET_KEY || "").trim();

/**
 * Verify a reCAPTCHA v3 token with Google.
 * Returns the score (0.0–1.0) on success, throws on failure.
 */
async function verifyRecaptcha(token) {
  if (!RECAPTCHA_SECRET_KEY) {
    throw new Error("RECAPTCHA_SECRET_KEY not configured");
  }

  const body = new URLSearchParams({
    secret: RECAPTCHA_SECRET_KEY,
    response: token,
  });

  const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();

  if (!data.success) {
    const error = new Error("reCAPTCHA verification failed");
    error.statusCode = 403;
    error.details = data["error-codes"];
    throw error;
  }

  return data.score;
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const captchaToken = String(req.query.captcha || "").trim();

  // ── Step 1: No captcha token → serve the reCAPTCHA interstitial ──────────
  if (!captchaToken && RECAPTCHA_SITE_KEY) {
    // Preserve all original query params so they carry through
    const qs = new URLSearchParams(req.query || {});
    qs.delete("captcha");
    const forwardParams = qs.toString();

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Connecting to QuickBooks...</title>
  <script src="https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}" async defer></script>
  <style>
    body { margin:0; background:#030712; color:#f9fafb; font-family:system-ui,sans-serif;
           display:flex; justify-content:center; align-items:center; height:100vh; }
    .card { text-align:center; max-width:400px; }
    h1 { color:#10b981; font-size:20px; }
    p { color:#9ca3af; font-size:14px; }
    .spinner { width:32px; height:32px; border:3px solid #374151; border-top-color:#10b981;
               border-radius:50%; animation:spin .8s linear infinite; margin:16px auto; }
    @keyframes spin { to { transform:rotate(360deg); } }
    .error { color:#ef4444; display:none; margin-top:12px; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Connecting to QuickBooks</h1>
    <div class="spinner" id="spinner"></div>
    <p id="status">Verifying your session...</p>
    <p class="error" id="error"></p>
  </div>
  <script>
    var done = false;
    var params = '${forwardParams}';
    var sep = params ? '&' : '';

    function proceed(token) {
      if (done) return;
      done = true;
      document.getElementById('status').textContent = 'Redirecting to QuickBooks...';
      var url = '/api/qb/connect?captcha=' + encodeURIComponent(token || 'timeout') + sep + params;
      window.location.href = url;
    }

    // Timeout: if reCAPTCHA doesn't resolve in 5s, proceed without it
    setTimeout(function() {
      if (!done) {
        console.warn('reCAPTCHA timed out — proceeding without token');
        proceed('timeout');
      }
    }, 5000);

    if (typeof grecaptcha !== 'undefined' && grecaptcha.ready) {
      grecaptcha.ready(function() {
        grecaptcha.execute('${RECAPTCHA_SITE_KEY}', { action: 'qb_connect' })
          .then(function(token) { proceed(token); })
          .catch(function(err) {
            console.error('reCAPTCHA error:', err);
            proceed('error');
          });
      });
    } else {
      // Script failed to load entirely
      setTimeout(function() { proceed('unavailable'); }, 1000);
    }
  </script>
</body>
</html>`);
  }

  // ── Step 2: Captcha token present → verify, then redirect to Intuit ──────
  try {
    const isFallbackToken = ["timeout", "error", "unavailable"].includes(captchaToken);
    if (RECAPTCHA_SITE_KEY && RECAPTCHA_SECRET_KEY && !isFallbackToken) {
      const score = await verifyRecaptcha(captchaToken);
      // reCAPTCHA v3 scores: 1.0 = very likely human, 0.0 = very likely bot
      if (score < 0.3) {
        return sendJson(res, 403, {
          error: "reCAPTCHA score too low — suspected bot activity",
          score,
        });
      }
    }
    // If reCAPTCHA timed out or errored client-side, we still proceed.
    // The interstitial page itself is the fraud gate — bots don't run JS.

    const { clientId, redirectUri, scopes } = requireClientConfig();
    const companyId = String(req.query.companyId || "").trim();
    const returnTo = String(req.query.returnTo || "/#/integrations").trim();
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
      details: error.details || null,
    });
  }
};
