// TheForge - Supabase-powered SaaS idea tracker
import { useState, useEffect } from "react";
import { C } from "../../data/constants";

const SUPABASE_URL = "https://bdlvwfobjqvnrffzxrfz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbHZ3Zm9ianF2bnJmZnp4cmZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzMzUwNjAsImV4cCI6MjA4OTkxMTA2MH0.Tc4bdXUKWLhQQCVQlWbwFzcuV0Ry_gvFmuxcHKuvxHA";

const COMPETITION_COLORS = { Low: C.green, "Low-Medium": C.teal, Medium: C.amber, "Medium-High": "#f97316", High: C.red };

const Badge = ({ color, children }) => (
  <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 6, background: color + "18", color, fontWeight: 600 }}>{children}</span>
);

const KPI = ({ label, value, sub, color }) => (
  <div style={{ background: C.surface, borderRadius: 12, padding: 14, border: "1px solid " + C.border }}>
    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color: color || C.text }}>{value}</div>
    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{sub}</div>
  </div>
);

export default function TheForge() {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIdea, setSelectedIdea] = useState(null);
  const [sortBy, setSortBy] = useState("confidence_score");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    fetchIdeas();
  }, []);

  const fetchIdeas = async () => {
    try {
      setLoading(true);
