// One-time OAuth flow to get a Google Drive refresh token
// Visit /api/drive/auth to start, then /api/drive/auth?code=XXX handles callback

const GOOGLE_CLIENT_ID = (process.env.GOOGLE_DRIVE_CLIENT_ID || "").trim();
const GOOGLE_CLIENT_SECRET = (process.env.GOOGLE_DRIVE_CLIENT_SECRET || "").trim();
const REDIRECT_URI = "https://mission-control-peach-omega.vercel.app/api/drive/auth";
const SCOPES = "https://www.googleapis.com/auth/drive.readonly";

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload, null, 2));
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return sendJson(res, 500, { error: "Set GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET in Vercel" });
  }

  // If no code, redirect to Google OAuth
  if (!code) {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", SCOPES);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    res.statusCode = 302;
    res.setHeader("Location", authUrl.toString());
    return res.end();
  }

  // Exchange code for tokens
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokens = await tokenRes.json();

    if (tokens.error) {
      return sendJson(res, 400, { error: tokens.error, description: tokens.error_description });
    }

    // Show the refresh token — user needs to save this as GOOGLE_DRIVE_REFRESH_TOKEN env var
    return sendJson(res, 200, {
      success: true,
      message: "Save the refresh_token below as GOOGLE_DRIVE_REFRESH_TOKEN in Vercel env vars",
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token,
      expires_in: tokens.expires_in,
    });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
};
