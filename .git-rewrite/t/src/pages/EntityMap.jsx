import { useState } from "react";
import { Card, Badge } from "../components/shared";
import { C } from "../data/constants";
import entityData from "../data/entity-data.json";

// Color coding by entity type
const TYPE_COLORS = {
  "LP":     { bg: "#6366f122", border: "#6366f1", text: "#818cf8", label: "LP" },
  "S-Corp": { bg: "#10b98122", border: "#10b981", text: "#34d399", label: "S-Corp" },
  "C-Corp": { bg: "#f59e0b22", border: "#f59e0b", text: "#fbbf24", label: "C-Corp" },
  "LLC":    { bg: "#0ea5e922", border: "#0ea5e9", text: "#38bdf8", label: "LLC" },
  "Trust":  { bg: "#8b5cf622", border: "#8b5cf6", text: "#a78bfa", label: "Trust" },
};

const STATUS_COLORS = {
  active:  C.green,
  startup: C.amber,
};

function fmtRevenue(v) {
  if (!v) return null;
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

// ── Entity Card ──
const EntityCard = ({ entity, depth = 0, expanded, onToggle }) => {
  const tc = TYPE_COLORS[entity.type] || TYPE_COLORS["LLC"];
  const hasChildren = entity.children && entity.children.length > 0;
  const childEntities = hasChildren
    ? entity.children.map(cid => entityData.entities.find(e => e.id === cid)).filter(Boolean)
    : [];
  const isExpanded = expanded[entity.id] !== false; // default expanded

  return (
    <div style={{ marginLeft: depth > 0 ? 32 : 0 }}>
      {/* Connector line */}
      {depth > 0 && (
        <div style={{
          position: "relative",
          marginBottom: -12,
          marginLeft: -16,
          height: 12,
        }}>
          <div style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 16,
            height: 12,
            borderLeft: `2px solid ${C.border}`,
            borderBottom: `2px solid ${C.border}`,
            borderBottomLeftRadius: 8,
          }} />
        </div>
      )}

      <div
        onClick={() => hasChildren && onToggle(entity.id)}
        style={{
          background: tc.bg,
          border: `1px solid ${tc.border}44`,
          borderRadius: 12,
          padding: 16,
          marginBottom: 8,
          cursor: hasChildren ? "pointer" : "default",
          transition: "all 0.15s",
        }}
      >
        {/* Header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          {hasChildren && (
            <span style={{
              color: C.muted,
              fontSize: 12,
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              display: "inline-block",
            }}>
              ▶
            </span>
          )}
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text, flex: 1 }}>
            {entity.shortName || entity.name}
          </span>
          <Badge color={tc.border}>{tc.label}</Badge>
          <Badge color={STATUS_COLORS[entity.status] || C.muted}>
            {entity.status}
          </Badge>
        </div>

        {/* Full name if short name differs */}
        {entity.shortName && entity.shortName !== entity.name && (
          <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>
            {entity.name}
          </div>
        )}

        {/* Details grid */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12 }}>
          {entity.ownership != null && (
            <div>
              <span style={{ color: C.muted }}>Ownership: </span>
              <span style={{ color: tc.text, fontWeight: 600 }}>{entity.ownership}%</span>
            </div>
          )}
          <div>
            <span style={{ color: C.muted }}>State: </span>
            <span style={{ color: C.text }}>{entity.state}</span>
          </div>
          <div>
            <span style={{ color: C.muted }}>Role: </span>
            <span style={{ color: C.text }}>{entity.role}</span>
          </div>
          {entity.revenue && (
            <div>
              <span style={{ color: C.muted }}>Revenue: </span>
              <span style={{ color: C.green, fontWeight: 600 }}>
                {entity.revenueLabel || fmtRevenue(entity.revenue)}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          {entity.description}
        </div>

        {/* Properties */}
        {entity.properties && entity.properties.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}33` }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginBottom: 4 }}>
              PROPERTIES
            </div>
            {entity.properties.map((p, i) => (
              <div key={i} style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                background: C.surface,
                borderRadius: 8,
                marginTop: 4,
                fontSize: 12,
              }}>
                <span style={{ fontSize: 14 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.amber} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                    <path d="M9 22V12h6v10"/>
                  </svg>
                </span>
                <span style={{ color: C.text, fontWeight: 500 }}>{p.address}</span>
                <span style={{ color: C.muted }}>{p.city}, {p.state}</span>
                <Badge color={C.amber}>{p.type}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div style={{ borderLeft: `2px solid ${C.border}33`, marginLeft: 16, paddingLeft: 0 }}>
          {childEntities.map(child => (
            <EntityCard
              key={child.id}
              entity={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Summary Stats ──
const StatBox = ({ label, value, color }) => (
  <div style={{
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: "14px 16px",
    textAlign: "center",
    flex: 1,
    minWidth: 120,
  }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text }}>{value}</div>
    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{label}</div>
  </div>
);

// ── Main Page ──
const EntityMap = () => {
  const [expanded, setExpanded] = useState({});

  const onToggle = (id) => {
    setExpanded(prev => ({ ...prev, [id]: prev[id] === false ? true : false }));
  };

  const entities = entityData.entities;
  const root = entities.find(e => e.id === entityData.owner.holdingEntity);
  const topLevel = entities.filter(e => e.parent === root.id);

  // Stats
  const totalEntities = entities.length;
  const totalProperties = entities.reduce((s, e) => s + (e.properties?.length || 0), 0);
  const totalRevenue = entities.reduce((s, e) => s + (e.revenue || 0), 0);
  const entityTypes = [...new Set(entities.map(e => e.type))];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Entity Map</h1>
      <div style={{ fontSize: 13, color: C.muted }}>
        Business structure &middot; Entity hierarchy &middot; Property holdings
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 10 }}>
        <StatBox label="Total Entities" value={totalEntities} color={C.accent} />
        <StatBox label="Entity Types" value={entityTypes.length} color={C.purple} />
        <StatBox label="Properties Held" value={totalProperties} color={C.amber} />
        <StatBox label="Combined Revenue" value={fmtRevenue(totalRevenue)} color={C.green} />
        <StatBox label="Owner" value={entityData.owner.name.split(" ")[0]} color={C.cyan} />
      </div>

      {/* Type Legend */}
      <Card style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>ENTITY TYPES:</span>
          {Object.entries(TYPE_COLORS).map(([type, tc]) => (
            <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: tc.border,
              }} />
              <span style={{ fontSize: 12, color: tc.text }}>{type}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Org Chart */}
      <Card style={{ padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 16 }}>
          Ownership Hierarchy
        </div>

        {/* Owner badge */}
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 16px",
          background: `linear-gradient(135deg, ${C.accent}22, ${C.purple}22)`,
          border: `1px solid ${C.accent}44`,
          borderRadius: 10,
          marginBottom: 16,
        }}>
          <div style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: C.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 11,
            fontWeight: 700,
          }}>
            CC
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
              {entityData.owner.name}
            </div>
            <div style={{ fontSize: 10, color: C.muted }}>Principal Owner</div>
          </div>
        </div>

        {/* Connector to root */}
        <div style={{
          width: 2,
          height: 16,
          background: C.border,
          marginLeft: 24,
          marginBottom: 0,
        }} />

        {/* Root entity */}
        <EntityCard entity={root} depth={0} expanded={expanded} onToggle={onToggle} />

        {/* Relationships note */}
        <div style={{
          marginTop: 16,
          padding: 12,
          background: C.surface,
          borderRadius: 8,
          border: `1px solid ${C.border}33`,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, marginBottom: 6 }}>
            KEY RELATIONSHIPS
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12, color: C.muted }}>
            <div>
              <span style={{ color: TYPE_COLORS["LP"].text }}>Cabo Tropic</span>
              {" holds Colby's shares in all entities"}
            </div>
            <div>
              <span style={{ color: TYPE_COLORS["LLC"].text }}>Black Lab Capital</span>
              {" is the parent of "}
              <span style={{ color: TYPE_COLORS["LLC"].text }}>BLC CA Properties</span>
            </div>
            <div>
              <span style={{ color: TYPE_COLORS["LLC"].text }}>Lincoln Hodl</span>
              {" is the investment arm of "}
              <span style={{ color: TYPE_COLORS["S-Corp"].text }}>C&C</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Flat Entity Table */}
      <Card>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12 }}>
          All Entities
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                {["Entity", "Type", "State", "Ownership", "Role", "Revenue", "Status"].map(h => (
                  <th key={h} style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    color: C.muted,
                    fontWeight: 600,
                    fontSize: 11,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entities.map(e => {
                const tc = TYPE_COLORS[e.type] || TYPE_COLORS["LLC"];
                return (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}22` }}>
                    <td style={{ padding: "10px 10px", color: C.text, fontWeight: 500 }}>
                      {e.shortName || e.name}
                      {e.properties?.length > 0 && (
                        <span style={{ color: C.amber, fontSize: 10, marginLeft: 6 }}>
                          {e.properties.length} prop
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <Badge color={tc.border}>{e.type}</Badge>
                    </td>
                    <td style={{ padding: "10px 10px", color: C.muted }}>{e.state}</td>
                    <td style={{ padding: "10px 10px", color: tc.text, fontWeight: 600 }}>
                      {e.ownership != null ? `${e.ownership}%` : "--"}
                    </td>
                    <td style={{ padding: "10px 10px", color: C.muted }}>{e.role}</td>
                    <td style={{ padding: "10px 10px", color: e.revenue ? C.green : C.muted, fontWeight: e.revenue ? 600 : 400 }}>
                      {e.revenueLabel || fmtRevenue(e.revenue) || "--"}
                    </td>
                    <td style={{ padding: "10px 10px" }}>
                      <Badge color={STATUS_COLORS[e.status] || C.muted}>{e.status}</Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default EntityMap;
