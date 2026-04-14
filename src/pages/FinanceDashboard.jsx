/**
 * TECH DEBT — Temporary iframe wrapper.
 *
 * This renders public/finance.html inside an iframe. It ships the dashboard
 * quickly but loses React state sharing, consistent auth, deep linking inside
 * the frame, and the app's design-system tokens.
 *
 * TODO (before GA): Convert finance.html into a native React page
 *   (split CSS into a styled component / CSS module, rewrite scripts as
 *   useEffect hooks, source data from the existing Supabase/QuickBooks hooks).
 * Tracking: https://github.com/Colby-Cul/mission-control/issues — file one.
 */
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
