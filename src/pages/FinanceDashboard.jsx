import { useEffect } from "react";

const IframePage = ({ src, title }) => {
  useEffect(() => { document.title = `${title} — Mission Control`; }, [title]);
  return (
    <div style={{ margin: -20, height: "calc(100vh - 52px)", background: "#060610" }}>
      <iframe
        src={src}
        title={title}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
};

const FinanceDashboard = () => <IframePage src="/finance.html" title="Finance" />;
export default FinanceDashboard;
