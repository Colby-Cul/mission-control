import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";

// Standalone guest portal — no auth required, no sidebar
// Mobile-first design

const G = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  accent: "#6366f1",
  accentLight: "#818cf8",
  green: "#10b981",
  amber: "#f59e0b",
  red: "#ef4444",
};

function Section({ title, icon, children }) {
  return (
    <div style={{
      background: G.card,
      border: `1px solid ${G.border}`,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
    }}>
      <h2 style={{
        fontSize: 16,
        fontWeight: 700,
        color: G.text,
        margin: "0 0 14px",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "8px 0",
      borderBottom: `1px solid ${G.border}22`,
      gap: 12,
    }}>
      <span style={{ color: G.muted, fontSize: 13, flexShrink: 0 }}>{label}</span>
      <span style={{ color: G.text, fontSize: 13, fontWeight: 500, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function ListItem({ text, icon = "•" }) {
  return (
    <div style={{
      display: "flex",
      gap: 10,
      padding: "6px 0",
      alignItems: "flex-start",
    }}>
      <span style={{ color: G.accent, flexShrink: 0, fontWeight: 600 }}>{icon}</span>
      <span style={{ color: G.text, fontSize: 13, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

const GuestPortal = () => {
  const { propertySlug } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("checkin");

  useEffect(() => {
    const base = import.meta.env.BASE_URL || "/";
    fetch(`${base}guest-portal.json`)
      .then(r => r.ok ? r.json() : Promise.reject("Not found"))
      .then(data => {
        const prop = data.properties?.[propertySlug];
        if (!prop) {
          setError(`Property "${propertySlug}" not found.`);
        } else {
          setProperty(prop);
        }
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load property information.");
        setLoading(false);
      });
  }, [propertySlug]);

  const tabs = [
    { id: "checkin", label: "Check In", icon: "🏠" },
    { id: "rules", label: "House Rules", icon: "📋" },
    { id: "amenities", label: "Amenities", icon: "✨" },
    { id: "guide", label: "Local Guide", icon: "🗺️" },
    { id: "emergency", label: "Help", icon: "🆘" },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: G.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: G.muted,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        Loading your property guide...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        background: G.bg,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: G.muted,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        padding: 24,
        textAlign: "center",
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏠</div>
        <h2 style={{ color: G.text, marginBottom: 8 }}>Property Not Found</h2>
        <p style={{ color: G.muted, maxWidth: 320 }}>{error}</p>
        <p style={{ color: G.muted, fontSize: 12, marginTop: 16 }}>
          Valid URLs: /guest/graeagle or /guest/northstar
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: G.bg,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      color: G.text,
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)`,
        padding: "28px 20px 80px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Decorative blur orb */}
        <div style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${G.accent}44 0%, transparent 70%)`,
          pointerEvents: "none",
        }} />

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
        }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 18,
            fontWeight: 800,
          }}>
            🏡
          </div>
          <span style={{ fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>Guest Portal</span>
        </div>

        <h1 style={{
          fontSize: 26,
          fontWeight: 800,
          color: "#fff",
          margin: "0 0 6px",
          lineHeight: 1.2,
        }}>
          {property.name}
        </h1>
        <p style={{ color: "#c7d2fe", fontSize: 14, margin: "0 0 20px" }}>
          {property.tagline}
        </p>

        {/* Quick stats */}
        <div style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}>
          {[
            { label: "Check In", value: property.checkIn },
            { label: "Check Out", value: property.checkOut },
            { label: "Guests", value: `Up to ${property.maxGuests}` },
            { label: "Bedrooms", value: property.bedrooms },
          ].map(stat => (
            <div key={stat.label} style={{
              background: "rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "8px 14px",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.15)",
              minWidth: 80,
            }}>
              <div style={{ fontSize: 10, color: "#c7d2fe", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tab Navigation — sticky, overlaps hero */}
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: G.bg,
        borderBottom: `1px solid ${G.border}`,
        marginTop: -36,
        borderRadius: "20px 20px 0 0",
        padding: "0 4px",
        overflowX: "auto",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}>
        <div style={{
          display: "flex",
          gap: 2,
          padding: "12px 8px 0",
          minWidth: "max-content",
        }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                background: "none",
                border: "none",
                borderBottom: activeTab === tab.id ? `2px solid ${G.accent}` : "2px solid transparent",
                color: activeTab === tab.id ? G.accentLight : G.muted,
                cursor: "pointer",
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 40px", maxWidth: 640, margin: "0 auto" }}>

        {/* Check In Tab */}
        {activeTab === "checkin" && (
          <>
            {/* WiFi */}
            <div style={{
              background: `linear-gradient(135deg, ${G.accent}22, ${G.accent}11)`,
              border: `1px solid ${G.accent}44`,
              borderRadius: 16,
              padding: 18,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `${G.accent}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}>
                📶
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: G.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>WiFi</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: G.text }}>{property.wifi.network}</div>
                <div style={{
                  fontSize: 13,
                  color: G.accentLight,
                  fontFamily: "monospace",
                  background: `${G.accent}22`,
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 4,
                  marginTop: 4,
                }}>
                  {property.wifi.password}
                </div>
              </div>
            </div>

            {/* Access */}
            <Section title="Access & Keys" icon="🔑">
              <InfoRow label="Entry" value={property.keybox.location} />
              <InfoRow label="Code" value={property.keybox.code} />
              <InfoRow label="Parking" value={property.parking} />
            </Section>

            <Section title="Check-In Instructions" icon="✅">
              {property.checkInInstructions.map((step, i) => (
                <ListItem key={i} icon={`${i + 1}.`} text={step} />
              ))}
            </Section>

            <Section title="Check-Out Instructions" icon="🚪">
              {property.checkOutInstructions.map((step, i) => (
                <ListItem key={i} icon={`${i + 1}.`} text={step} />
              ))}
            </Section>
          </>
        )}

        {/* House Rules Tab */}
        {activeTab === "rules" && (
          <Section title="House Rules" icon="📋">
            <p style={{ color: G.muted, fontSize: 13, margin: "0 0 12px" }}>
              Please review before your stay. Thanks for helping us maintain this property for future guests.
            </p>
            {property.houseRules.map((rule, i) => (
              <ListItem key={i} icon="→" text={rule} />
            ))}
          </Section>
        )}

        {/* Amenities Tab */}
        {activeTab === "amenities" && (
          <Section title="What's Available" icon="✨">
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: 10,
              marginTop: 4,
            }}>
              {property.amenities.map((item, i) => (
                <div key={i} style={{
                  background: G.bg,
                  border: `1px solid ${G.border}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <span style={{ fontSize: 12, color: G.text, fontWeight: 500 }}>{item.label}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Local Guide Tab */}
        {activeTab === "guide" && (
          <Section title="Local Recommendations" icon="🗺️">
            {["Dining", "Activities", "Shopping"].map(category => {
              const items = property.localGuide.filter(i => i.category === category);
              if (!items.length) return null;
              return (
                <div key={category} style={{ marginBottom: 16 }}>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: G.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                  }}>
                    {category}
                  </div>
                  {items.map((item, i) => (
                    <div key={i} style={{
                      background: G.bg,
                      border: `1px solid ${G.border}`,
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginBottom: 8,
                    }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: G.text }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: G.muted, marginTop: 3 }}>{item.note}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </Section>
        )}

        {/* Emergency / Help Tab */}
        {activeTab === "emergency" && (
          <>
            <div style={{
              background: `${G.red}18`,
              border: `1px solid ${G.red}44`,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>🚨</span>
              <div>
                <div style={{ fontWeight: 600, color: G.text, marginBottom: 4 }}>Emergency?</div>
                <div style={{ fontSize: 13, color: G.muted }}>For life-threatening emergencies, call 911 immediately.</div>
              </div>
            </div>

            <Section title="Contact Information" icon="📞">
              {property.emergencyContacts.map((contact, i) => (
                <div key={i} style={{
                  padding: "10px 0",
                  borderBottom: i < property.emergencyContacts.length - 1 ? `1px solid ${G.border}33` : "none",
                }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: G.text }}>{contact.name}</div>
                  <div style={{
                    fontSize: 13,
                    color: G.accentLight,
                    marginTop: 3,
                  }}>
                    {contact.phone}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Address" icon="📍">
              <div style={{ fontSize: 15, fontWeight: 600, color: G.text }}>{property.name}</div>
              <div style={{ fontSize: 13, color: G.muted, marginTop: 4 }}>{property.address}</div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(property.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 12,
                  padding: "8px 14px",
                  background: `${G.accent}22`,
                  border: `1px solid ${G.accent}44`,
                  borderRadius: 8,
                  color: G.accentLight,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Open in Maps →
              </a>
            </Section>
          </>
        )}

        {/* Footer */}
        <div style={{
          textAlign: "center",
          color: G.muted,
          fontSize: 11,
          marginTop: 32,
          paddingTop: 16,
          borderTop: `1px solid ${G.border}`,
        }}>
          Powered by Culbertson & Gray Group
        </div>
      </div>
    </div>
  );
};

export default GuestPortal;
