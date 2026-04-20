import { C } from '../../data/constants';
import Card from './Card';

const KPI = ({ label, value, sub, color = C.accent, icon }) => (
  <Card style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: C.muted, fontSize: 12, fontWeight: 500 }}>{label}</span>
      {icon && <span style={{ color }}>{icon}</span>}
    </div>
    <div style={{ fontSize: 28, fontWeight: 700, color: C.text, letterSpacing: -1 }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>}
    <div style={{ height: 3, borderRadius: 2, background: color + "33", marginTop: 4 }}>
      <div style={{ height: 3, borderRadius: 2, background: color, width: "60%" }} />
    </div>
  </Card>
);

export default KPI;