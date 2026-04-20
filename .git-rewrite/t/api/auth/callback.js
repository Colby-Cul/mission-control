const { createClient } = require("@supabase/supabase-js");

module.exports = async function handler(req, res) {
  const code = req.query.code;

  if (!code) {
    res.statusCode = 302;
    res.setHeader("Location", "/#/");
    return res.end();
  }

  const supabase = createClient(
    "https://bdlvwfobjqvnrffzxrfz.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbHZ3Zm9ianF2bnJmZnp4cmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzUwNjAsImV4cCI6MjA4OTkxMDYwfQ.Tc4bdXUKWLhQQCVQlWbwFzcuV0Ry_gvFmuxcHKuvxHA",
    { auth: { flowType: "pkce" } }
  );

  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error.message);
    }
  } catch (err) {
    console.error("Auth callback exception:", err.message);
  }

  res.statusCode = 302;
  res.setHeader("Location", "/#/");
  res.end();
};
