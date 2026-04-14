/**
 * TECH DEBT — Temporary iframe wrapper for public/company.html.
 * See FinanceDashboard.jsx for the conversion plan. Convert to native React
 * before this product goes to GA so it inherits auth, design tokens, and state.
 */
import { useEffect } from "react";

const CompanyDashboard = () => {
  useEffect(() => { document.title = "Company — Mission Control"; }, []);
  return (
    <div style={{ margin: -20, height: "calc(100vh - 52px)", background: "#060610" }}>
      <iframe
        src="/company.html"
        title="Company Dashboard"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
};

export default CompanyDashboard;
