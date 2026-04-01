import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { statusColor } from "./liveViewUtils";

const Rentals = () => {
  const { snapshot, metrics, config } = useMissionControlData();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Rentals</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="External Board" value={config.mondayBoardId || "--"} sub="Operations planning source" color={C.accent} />
        <KPI label="Integration Health" value={metrics.mondayStatus} sub={snapshot.monday?.name || "Monday-backed operational planning"} color={statusColor(metrics.mondayStatus)} />
      </div>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
            This area is now wired into the same live Mission Control data plane instead of a dead placeholder.
          </div>
          <div style={{ padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}`, color: C.text, fontSize: 13 }}>
            Configure a dedicated rentals board or proxy in Settings if you want Lodgify or property workflows to surface here next.
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", borderRadius: 10, background: C.surface, border: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 13, color: C.text }}>Current Monday connectivity</span>
            <Badge color={statusColor(metrics.mondayStatus)}>{metrics.mondayStatus}</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Rentals;
