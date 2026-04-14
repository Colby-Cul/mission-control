import { useEffect } from "react";

const XomeDashboard = () => {
  useEffect(() => { document.title = "Xome — Mission Control"; }, []);
  return (
    <div style={{ margin: -20, height: "calc(100vh - 52px)", background: "#060610" }}>
      <iframe
        src="/xome.html"
        title="Xome Home Mortgage Dashboard"
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
      />
    </div>
  );
};

export default XomeDashboard;
