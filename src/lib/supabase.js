import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bdlvwfobjqvnrffzxrfz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbHZ3Zm9ianF2bnJmZnp4cmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzUwNjAsImV4cCI6MjA4OTkxMTA2MH0.Tc4bdXUKWLhQQCVQlWbwFzcuV0Ry_gvFmuxcHKuvxHA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
