const { getPlaidClient, getWebhookUrl, withCredentials, sendJson, readJsonBody } = require("../_lib/plaid");
const { CountryCode, Products } = require("plaid");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const client = getPlaidClient();
    const body = await readJsonBody(req);

    const products = body.products || [Products.Transactions];
    const includeInvestments = products.includes(Products.Investments) ||
      products.includes("investments");

    const redirectUri = process.env.PLAID_REDIRECT_URI || "https://mission-control-peach-omega.vercel.app/";

    const request = {
      user: {
        client_user_id: "mission-control-user",
        // Required for Assets product
        email_address: body.email || "colby@culbertsonandgray.com",
        phone_number: body.phone || "+18589676502",
      },
      client_name: "Mission Control",
      products: products.map((p) => (typeof p === "string" ? p : p)),
      country_codes: [CountryCode.Us],
      language: "en",
      webhook: getWebhookUrl(),
      redirect_uri: redirectUri,
    };

    // For update mode (re-authentication)
    if (body.access_token) {
      request.access_token = body.access_token;
      delete request.products;
    }

    const response = await client.linkTokenCreate(withCredentials(request));

    return sendJson(res, 200, {
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    });
  } catch (error) {
    console.error("Plaid create-link-token error:", error.response?.data || error.message);
    return sendJson(res, error.statusCode || 500, {
      error: error.response?.data?.error_message || error.message,
    });
  }
};
