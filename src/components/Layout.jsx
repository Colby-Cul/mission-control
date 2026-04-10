import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { C } from '../data/constants';
import { icons, NAV_ITEMS, NAV_GROUPS, SETTINGS_NAV } from './Icons';
import { Avatar, Badge } from './shared';
import PriorityDot from './shared/PriorityDot';
import ErrorBoundary from './ErrorBoundary';
import { useMissionControlData } from '../context/MissionControlDataContext';
import { useAuth } from '../context/AuthContext';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { agents, activities, projects, acpSessions, snapshot } = useMissionControlData();
  const { user, signOut } = useAuth();
  const currentPage = location.pathname.replace(/^\/+/, "").split("/")[0] || 'home';
  const showFabs = ["home", "", "tasks", "projects", "command"].includes(currentPage);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);

  // Grouped sidebar state
  const [expandedGroups, setExpandedGroups] = useState(() => {
    if (typeof window === "undefined") return NAV_GROUPS.map(g => g.id);
    try {
      const stored = JSON.parse(window.localStorage.getItem("mission-control.sidebar.expanded-groups"));
      if (Array.isArray(stored)) return stored;
    } catch {}
    return NAV_GROUPS.map(g => g.id);
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("mission-control.sidebar.expanded-groups", JSON.stringify(expandedGroups));
    }
  }, [expandedGroups]);

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]);
  };

  const activeGroup = NAV_GROUPS.find(g => g.children.some(c => c.id === currentPage));

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(o => !o);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentLabel = NAV_ITEMS.find(n => n.id === currentPage)?.label || "Home";
  const searchableProjects = projects.map((p) => ({ id: p.id, name: p.name, color: C.accent }));
  const searchableTasks = acpSessions.slice(0, 20).map(s => ({
    id: s.sessionId || s.id,
    name: s.task || "ACP Session",
    status: s.status || "done",
    priority: s.isCron ? "low" : "medium"
  }));

  const handleNavigation = (pageId) => {
    if (pageId === 'home') {
      navigate('/');
    } else {
      navigate(`/${pageId}`);
    }
    setSearchOpen(false);
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden" }}>
      {/* ── SIDEBAR ── */}
      <div style={{
        width: sidebarOpen ? 220 : 56, 
        minWidth: sidebarOpen ? 220 : 56,
        background: C.surface, 
        borderRight: `1px solid ${C.border}`,
        display: "flex", 
        flexDirection: "column", 
        transition: "width 0.2s, min-width 0.2s", 
        overflow: "hidden",
      }}>
        {/* Logo */}
        <div style={{ 
          padding: sidebarOpen ? "16px 16px 12px" : "16px 0 12px", 
          display: "flex", 
          alignItems: "center", 
          gap: 10, 
          justifyContent: sidebarOpen ? "flex-start" : "center" 
        }}>
          <div style={{ 
            width: 32, 
            height: 32, 
            borderRadius: 8, 
            background: `linear-gradient(135deg, ${C.accent}, ${C.purple})`, 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            fontSize: 16, 
            fontWeight: 800, 
            flexShrink: 0 
          }}>
            OC
          </div>
          {sidebarOpen && (
            <span style={{ 
              fontSize: 15, 
              fontWeight: 700, 
              color: C.text, 
              whiteSpace: "nowrap" 
            }}>
              Mission Control
            </span>
          )}
        </div>

        {/* Nav Groups */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 2
        }}>
          {NAV_GROUPS.map(group => {
            const isExpanded = expandedGroups.includes(group.id);
            const isActiveGroup = activeGroup?.id === group.id;
            return (
              <div key={group.id}>
                {/* Group header */}
                <button
                  onClick={() => sidebarOpen ? toggleGroup(group.id) : handleNavigation(group.children[0]?.id)}
                  title={group.label}
                  aria-expanded={isExpanded}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: sidebarOpen ? "7px 10px" : "7px 0",
                    justifyContent: sidebarOpen ? "flex-start" : "center",
                    background: isActiveGroup && !isExpanded ? C.accent + "12" : "transparent",
                    color: isActiveGroup ? C.text : C.muted,
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    transition: "all 0.15s",
                    width: "100%",
                    textAlign: "left",
                    marginTop: 6,
                  }}
                >
                  <span style={{ flexShrink: 0, display: "flex", opacity: 0.7 }}>{group.icon}</span>
                  {sidebarOpen && (
                    <>
                      <span style={{ flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {group.label}
                      </span>
                      <svg
                        width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                        style={{ transition: "transform 0.2s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", opacity: 0.5, flexShrink: 0 }}
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </>
                  )}
                </button>
                {/* Child items */}
                {sidebarOpen && isExpanded && (
                  <div role="group" style={{ display: "flex", flexDirection: "column", gap: 1, paddingLeft: 12 }}>
                    {group.children.map(item => {
                      const active = currentPage === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.id)}
                          title={item.label}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 10px",
                            justifyContent: "flex-start",
                            background: active ? C.accent + "22" : "transparent",
                            color: active ? C.accentLight : C.muted,
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: active ? 600 : 500,
                            transition: "all 0.15s",
                            width: "100%",
                            textAlign: "left",
                            borderLeft: active ? `2px solid ${C.accent}` : "2px solid transparent",
                          }}
                        >
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Settings at bottom */}
        <div style={{ padding: 8, borderTop: `1px solid ${C.border}` }}>
          <button 
            onClick={() => handleNavigation("settings")} 
            title="Settings" 
            style={{
              display: "flex", 
              alignItems: "center", 
              gap: 10,
              padding: sidebarOpen ? "8px 10px" : "8px 0",
              justifyContent: sidebarOpen ? "flex-start" : "center",
              background: "transparent", 
              color: C.muted, 
              border: "none", 
              borderRadius: 8,
              cursor: "pointer", 
              fontSize: 13, 
              fontWeight: 500, 
              width: "100%",
            }}
          >
            <span style={{ flexShrink: 0, display: "flex" }}>{icons.settings}</span>
            {sidebarOpen && <span>Settings</span>}
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {snapshot?.loading && (
          <div style={{ height: 2, background: `linear-gradient(90deg, ${C.accent}, ${C.purple})`, animation: "loading 1s infinite", position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }} />
        )}
        {/* Top Bar */}
        <div style={{
          height: 52, 
          minHeight: 52, 
          background: C.surface, 
          borderBottom: `1px solid ${C.border}`,
          display: "flex", 
          alignItems: "center", 
          padding: "0 16px", 
          gap: 12,
        }}>
          <button 
            onClick={() => setSidebarOpen(o => !o)} 
            style={{ 
              background: "none", 
              border: "none", 
              color: C.muted, 
              cursor: "pointer", 
              display: "flex", 
              padding: 4 
            }}
          >
            {icons.menu}
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{currentLabel}</span>
          <div style={{ flex: 1 }} />
          
          {/* Search */}
          <button 
            onClick={() => setSearchOpen(true)} 
            style={{
              display: "flex", 
              alignItems: "center", 
              gap: 8, 
              padding: "6px 14px",
              background: C.card, 
              border: `1px solid ${C.border}`, 
              borderRadius: 8,
              color: C.muted, 
              cursor: "pointer", 
              fontSize: 13,
            }}
          >
            {icons.search}
            <span>Search...</span>
            <kbd style={{ 
              fontSize: 10, 
              background: C.surface, 
              padding: "2px 6px", 
              borderRadius: 4, 
              border: `1px solid ${C.border}`, 
              color: C.muted, 
              marginLeft: 8 
            }}>
              ⌘K
            </kbd>
          </button>
          
          {/* Notifications */}
          <div style={{ position: "relative" }}>
            <button 
              onClick={() => setNotifOpen(o => !o)} 
              style={{ 
                background: "none", 
                border: "none", 
                color: C.muted, 
                cursor: "pointer", 
                display: "flex", 
                padding: 4, 
                position: "relative" 
              }}
            >
              {icons.bell}
              {activities.length > 0 && (
                <span style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: C.red
                }} />
              )}
            </button>
            {notifOpen && (
              <div style={{ 
                position: "absolute", 
                top: 36, 
                right: 0, 
                width: 320, 
                background: C.card, 
                border: `1px solid ${C.border}`, 
                borderRadius: 12, 
                padding: 12, 
                zIndex: 100, 
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)" 
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Notifications</div>
                {activities.length ? activities.slice(0, 5).map(a => {
                  const ag = agents.find(x => x.id === a.agent || x.id === a.id?.replace("gateway-agent-", ""));
                  return (
                    <div key={a.id} style={{ 
                      display: "flex", 
                      gap: 8, 
                      alignItems: "center", 
                      padding: "6px 0", 
                      borderBottom: `1px solid ${C.border}22`, 
                      fontSize: 12 
                    }}>
                      <Avatar agent={ag} size={22} />
                      <div style={{ flex: 1 }}>
                        <span style={{ color: C.text, fontWeight: 500 }}>{ag?.name || a.source}</span>
                        <span style={{ color: C.muted }}> {a.description || a.title}</span>
                      </div>
                      <span style={{ color: C.muted, fontSize: 10 }}>{a.status}</span>
                    </div>
                  );
                }) : (
                  <div style={{ color: C.muted, fontSize: 12, padding: "6px 0" }}>
                    No live notifications yet.
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* User avatar + sign out */}
          <div style={{ position: "relative" }}>
            <div
              onClick={() => { if (confirm("Sign out?")) signOut(); }}
              title={user?.email || "Sign out"}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: user?.user_metadata?.avatar_url ? "none" : C.accent,
                backgroundImage: user?.user_metadata?.avatar_url ? `url(${user.user_metadata.avatar_url})` : "none",
                backgroundSize: "cover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                border: `2px solid ${C.accentLight}`,
                cursor: "pointer",
                color: "#fff",
              }}>
              {!user?.user_metadata?.avatar_url && (user?.email?.substring(0,2).toUpperCase() || "CC")}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>

        {/* Floating Action Buttons */}
        {showFabs && (
          <div style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            display: "flex",
            gap: 8,
            zIndex: 50
          }}>
            <button onClick={() => navigate("/tasks")} style={{
              background: C.accent,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              + Add Task
            </button>
            <button onClick={() => navigate("/projects")} style={{
              background: C.purple,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              display: "flex",
              alignItems: "center",
              gap: 6
            }}>
              + New Project
            </button>
          </div>
        )}
      </div>

      {/* ── CMD+K SEARCH MODAL ── */}
      {searchOpen && (
        <div 
          onClick={() => setSearchOpen(false)} 
          style={{ 
            position: "fixed", 
            inset: 0, 
            background: "rgba(0,0,0,0.6)", 
            zIndex: 200, 
            display: "flex", 
            alignItems: "flex-start", 
            justifyContent: "center", 
            paddingTop: 120 
          }}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              width: 560, 
              background: C.card, 
              border: `1px solid ${C.border}`, 
              borderRadius: 16, 
              overflow: "hidden", 
              boxShadow: "0 16px 48px rgba(0,0,0,0.5)" 
            }}
          >
            <div style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 10, 
              padding: "14px 16px", 
              borderBottom: `1px solid ${C.border}` 
            }}>
              <span style={{ color: C.muted }}>{icons.search}</span>
              <input 
                autoFocus 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Search tasks, agents, projects, docs..." 
                style={{ 
                  flex: 1, 
                  background: "none", 
                  border: "none", 
                  outline: "none", 
                  color: C.text, 
                  fontSize: 15 
                }} 
              />
              <kbd style={{ 
                fontSize: 10, 
                background: C.surface, 
                padding: "2px 8px", 
                borderRadius: 4, 
                border: `1px solid ${C.border}`, 
                color: C.muted 
              }}>
                ESC
              </kbd>
            </div>
            <div style={{ padding: 8, maxHeight: 320, overflowY: "auto" }}>
              {searchQuery.length > 0 ? (
                <>
                  {agents.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => (
                    <button
                      key={a.id}
                      onClick={() => handleNavigation("team")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 10px",
                        width: "100%",
                        background: "none",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        color: C.text,
                        fontSize: 13,
                        textAlign: "left"
                      }}
                    >
                      <Avatar agent={a} size={24} />
                      <span>{a.name}</span>
                      <Badge color={C.cyan}>Agent</Badge>
                    </button>
                  ))}
                  {NAV_ITEMS.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase())).map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleNavigation(n.id)}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", width: "100%", background: "none", border: "none", borderRadius: 8, cursor: "pointer", color: C.text, fontSize: 13, textAlign: "left" }}
                    >
                      <span style={{ flexShrink: 0, display: "flex" }}>{n.icon}</span>
                      <span>{n.label}</span>
                      <Badge color={C.green}>Page</Badge>
                    </button>
                  ))}
                  {searchableProjects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase())).map(p => (
                    <button 
                      key={p.id} 
                      onClick={() => handleNavigation("projects")} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 10, 
                        padding: "8px 10px", 
                        width: "100%", 
                        background: "none", 
                        border: "none", 
                        borderRadius: 8, 
                        cursor: "pointer", 
                        color: C.text, 
                        fontSize: 13, 
                        textAlign: "left" 
                      }}
                    >
                      <span style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: "50%", 
                        background: p.color 
                      }} />
                      <span>{p.name}</span>
                      <Badge color={C.purple}>Project</Badge>
                    </button>
                  ))}
                  {searchableTasks.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5).map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => handleNavigation("tasks")} 
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: 10, 
                        padding: "8px 10px", 
                        width: "100%", 
                        background: "none", 
                        border: "none", 
                        borderRadius: 8, 
                        cursor: "pointer", 
                        color: C.text, 
                        fontSize: 13, 
                        textAlign: "left" 
                      }}
                    >
                      <PriorityDot priority={t.priority} />
                      <span>{t.name}</span>
                      <Badge color={C.amber}>Task</Badge>
                    </button>
                  ))}
                </>
              ) : (
                <div style={{ 
                  padding: 20, 
                  textAlign: "center", 
                  color: C.muted, 
                  fontSize: 13 
                }}>
                  Type to search across tasks, agents, projects, and docs...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
