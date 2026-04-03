import { Card, KPI, Badge } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const PROPERTIES = [
  { id: "graeagle", name: "Family Cabin in Graeagle", address: "47 Shasta Trail, Graeagle, CA 96103", priceRange: "$259 – $580/night", rating: "5.0★", lodgifyId: 533203, roomId: 599857, img: "🏔️", tier: "Standard" },
  { id: "northstar", name: "Luxury Northstar Getaway", address: "210 Bitter Brush Way, Placer County, CA 96161", priceRange: "$690 – $3,029/night", rating: "New", lodgifyId: 746614, roomId: 813739, img: "⛷️", tier: "Premium" },
];

const Rentals = () => {
  const { projects = [] } = useMissionControlData();
  const strProject = projects.find(p => p.id === "str-website" || p.name?.includes("STR"));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Rentals</h1>
        <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Pineside Cabins — Short-term rental properties managed via Lodgify</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <KPI label="Properties" value={PROPERTIES.length} sub="Active listings" color={C.accent} />
        <KPI label="Website" value={strProject ? "Building" : "Planned"} sub="pinesidecabins.com" color={strProject?.status === "active" ? C.amber : C.muted} />
        <KPI label="PMS" value="Lodgify" sub="Connected" color={C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {PROPERTIES.map(prop => (
          <Card key={prop.id}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ fontSize: 48, lineHeight: 1 }}>{prop.img}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{prop.name}</div>
                  <Badge color={prop.tier === "Premium" ? C.purple : C.accent}>{prop.tier}</Badge>
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>{prop.address}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 16 }}>
              <div><div style={{ fontSize: 11, color: C.muted }}>Price</div><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{prop.priceRange}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Rating</div><div style={{ fontSize: 14, fontWeight: 600, color: C.green }}>{prop.rating}</div></div>
              <div><div style={{ fontSize: 11, color: C.muted }}>Lodgify ID</div><div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{prop.lodgifyId}</div></div>
            </div>

            <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 12, color: C.muted }}>Booking Sources</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <Badge color={C.red}>Airbnb</Badge>
                <Badge color={C.accent}>Booking.com</Badge>
                <Badge color={C.green}>Direct</Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
export default Rentals;
