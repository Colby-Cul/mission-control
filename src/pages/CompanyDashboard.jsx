import { useEffect } from "react";

const BASE = import.meta.env.BASE_URL || "/";

const CompanyDashboard = () => {
  useEffect(() => { document.title = "Company — Mission Control"; }, []);
  return (
    <div style={{ margin: -20, height: "calc(100vh - 52px)", background: "#060610" }}>
      <iframe
        src={`${BASE}company.html`}
        title="Company Dashboard"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
};

export default CompanyDashboard;
