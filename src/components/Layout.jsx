import { useState, useEffect, useCallback } from 'react';
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
  const currentPage = location.pathname.replace(/^\/+/, "").split("/")[0] || 'north-star';
  const showFabs = ["home", "north-star", "", "tasks", "projects", "command"].includes(currentPage);

  // On mobile: close sidebar after navigation
  const handleNavigation = useCallback((pageId) => {
    navigate(`/${pageId}`);
    setSearchOpen(false);
    if (isMobile) setSidebarOpen(false);
  }, [navigate, isMobile]);

  // ── Mobile detection ──
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [auditReport, setAuditReport] = useState(null);
  const [auditOpen, setAuditOpen] = useState(false);

  // Load audit report
  useEffect(() => {
    const loadAudit = async () => {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const res = await fetch(`${base}audit-report.json?t=${Date.now()}`);
        if (res.ok) {
          const data = await res.json();
          setAuditReport(data);
        }
      } catch (e) {
        // audit report not available
      }
    };
    loadAudit();
  }, []);

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

  const currentLabel = NAV_ITEMS.find(n => n.id === currentPage)?.label || "North Star";
  const searchableProjects = projects.map((p) => ({ id: p.id, name: p.name, color: C.accent }));
  const searchableTasks = acpSessions.slice(0, 20).map(s => ({
    id: s.sessionId || s.id,
    name: s.task || "ACP Session",
    status: s.status || "done",
    priority: s.isCron ? "low" : "medium"
  }));

  // (handleNavigation defined above with useCallback)

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", overflow: "hidden", position: "relative" }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 90,
          }}
        />
      )}
      {/* ── SIDEBAR ── */}
      <div style={{
        width: sidebarOpen ? 220 : (isMobile ? 0 : 56),
        minWidth: sidebarOpen ? 220 : (isMobile ? 0 : 56),
        background: C.surface,
        borderRight: sidebarOpen || !isMobile ? `1px solid ${C.border}` : "none",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.25s ease, min-width 0.25s ease",
        overflow: "hidden",
        // On mobile, sidebar floats over content as a drawer
        ...(isMobile ? {
          position: "fixed",
          top: 0,
          left: 0,
          height: "100vh",
          zIndex: 100,
          boxShadow: sidebarOpen ? "4px 0 24px rgba(0,0,0,0.5)" : "none",
        } : {}),
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
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", minWidth: 0 }}>
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
              padding: isMobile ? "7px" : "6px 14px",
              background: C.card, 
              border: `1px solid ${C.border}`, 
              borderRadius: 8,
              color: C.muted, 
              cursor: "pointer", 
              fontSize: 13,
              minWidth: isMobile ? 36 : undefined,
              justifyContent: "center",
            }}
          >
            {icons.search}
            {!isMobile && <span>Search...</span>}
            {!isMobile && (
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
            )}
          </button>
          
          {/* Audit Health Badge — hidden on mobile to save space */}
          {auditReport && !isMobile && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAuditOpen(o => !o)}
                title={`System Health: ${auditReport.healthScore}%`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  background: auditReport.hasIssues ? `${C.red}22` : `${C.green}22`,
                  border: `1px solid ${auditReport.hasIssues ? C.red : C.green}44`,
                  borderRadius: 8,
                  color: auditReport.hasIssues ? C.red : C.green,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                <span style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: auditReport.hasIssues ? C.red : C.green,
                  flexShrink: 0,
                }} />
                {auditReport.healthScore}%
              </button>
              {auditOpen && (
                <div
                  onClick={() => setAuditOpen(false)}
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 99,
                  }}
                />
              )}
              {auditOpen && (
                <div style={{
                  position: "absolute",
                  top: 42,
                  right: 0,
                  width: 360,
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: 16,
                  zIndex: 100,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <span style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: auditReport.hasIssues ? C.red : C.green,
                      flexShrink: 0,
                    }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>System Audit</span>
                    <span style={{
                      marginLeft: "auto",
                      fontSize: 18,
                      fontWeight: 800,
                      color: auditReport.hasIssues ? C.red : C.green,
                    }}>
                      {auditReport.healthScore}%
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                    {[
                      { label: "Projects", value: auditReport.summary.totalProjects },
                      { label: "Tasks", value: auditReport.summary.totalTasks },
                      { label: "Valid Tasks", value: auditReport.summary.validTasks, ok: true },
                      { label: "Issues", value: auditReport.summary.issueCount, warn: auditReport.summary.issueCount > 0 },
                    ].map(item => (
                      <div key={item.label} style={{
                        background: C.surface,
                        borderRadius: 8,
                        padding: "8px 10px",
                      }}>
                        <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{item.label}</div>
                        <div style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: item.warn ? C.red : item.ok ? C.green : C.text,
                        }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  {auditReport.staleProjects.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.amber, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>⚠ Stale Projects</div>
                      {auditReport.staleProjects.map(p => (
                        <div key={p.projectId} style={{ fontSize: 12, color: C.muted, padding: "3px 0" }}>
                          {p.projectName} — {p.daysSinceActivity ? `${p.daysSinceActivity}d inactive` : "no activity"}
                        </div>
                      ))}
                    </div>
                  )}
                  {auditReport.invalidBlockerTasks.length > 0 && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.red, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>✕ Blocker Issues ({auditReport.invalidBlockerTasks.length})</div>
                      {auditReport.invalidBlockerTasks.slice(0, 3).map(t => (
                        <div key={t.taskId} style={{ fontSize: 11, color: C.muted, padding: "2px 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          [{t.agent}] {t.task?.substring(0, 50) || "(no description)"}
                        </div>
                      ))}
                      {auditReport.invalidBlockerTasks.length > 3 && (
                        <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>+{auditReport.invalidBlockerTasks.length - 3} more</div>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: C.muted, marginTop: 8, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    Last run: {new Date(auditReport.timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}

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
        <div style={{ flex: 1, overflow: "auto", padding: isMobile ? "12px" : 20 }}>
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>

        {/* Floating Action Buttons */}
        {showFabs && (
          <div style={{
            position: "fixed",
            bottom: isMobile ? 16 : 24,
            right: isMobile ? 12 : 24,
            display: "flex",
            gap: 8,
            zIndex: 50,
            flexDirection: isMobile ? "column" : "row",
            alignItems: "flex-end",
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
              width: isMobile ? "calc(100vw - 24px)" : 560,
              maxWidth: "100%",
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
