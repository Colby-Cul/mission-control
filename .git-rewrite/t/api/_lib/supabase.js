const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const error = new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel."
    );
    error.statusCode = 500;
    throw error;
  }
  return { url: SUPABASE_URL, key: SUPABASE_SERVICE_ROLE_KEY };
}

async function supabaseQuery(query, params = []) {
  const { url, key } = requireSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, params }),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase query failed: ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  return response.json();
}

async function supabaseRest(table, { method = "GET", body, query = "" } = {}) {
  const { url, key } = requireSupabaseConfig();

  const options = {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: method === "POST" ? "return=representation" : "return=representation",
    },
  };

  if (body) options.body = JSON.stringify(body);

  const response = await fetch(`${url}/rest/v1/${table}${query ? `?${query}` : ""}`, options);

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase REST error on ${table}: ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function supabaseUpsert(table, rows, onConflict) {
  const { url, key } = requireSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase upsert error on ${table}: ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function supabaseDelete(table, query) {
  const { url, key } = requireSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/${table}?${query}`, {
    method: "DELETE",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`Supabase delete error on ${table}: ${text}`);
    error.statusCode = response.status;
    throw error;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

module.exports = {
  requireSupabaseConfig,
  supabaseQuery,
  supabaseRest,
  supabaseUpsert,
  supabaseDelete,
};
