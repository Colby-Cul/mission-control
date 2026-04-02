import { useEffect, useMemo, useRef, useState } from "react";
import { Badge, Card } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";

const HEATMAP_HOURS = Array.from({ length: 24 }, (_, index) => index);
const HEATMAP_DAYS = 7;

function statusColor(status) {
  switch (String(status || "").toLowerCase()) {
    case "ok":
    case "healthy":
    case "online":
    case "done":
    case "complete":
    case "completed":
    case "success":
      return C.green;
    case "busy":
    case "warning":
    case "working on it":
    case "delegated":
    case "running":
    case "working":
    case "in progress":
    case "in_progress":
      return C.amber;
    case "error":
    case "failed":
    case "offline":
    case "blocked":
      return C.red;
    default:
      return C.cyan;
  }
}

function actionTypeColor(actionType) {
  switch (actionType) {
    case "task completed":
      return C.green;
    case "task delegated":
      return C.amber;
    default:
      return C.cyan;
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatHourLabel(hour) {
  const meridiem = hour >= 12 ? "PM" : "AM";
  const normalizedHour = hour % 12 || 12;
  return `${normalizedHour}${meridiem}`;
}

function getSessionTimestamp(session) {
  return (
    session?.endTime ||
    session?.dateFinished ||
    session?.lastModified ||
    session?.startTime ||
    session?.dateCreated ||
    null
  );
}

function getActionType(session) {
  const status = String(session?.status || "").trim().toLowerCase();

  if (["done", "complete", "completed", "success"].includes(status)) {
    return "task completed";
  }

  if (
    session?.spawns > 0 ||
    ["delegated", "running", "working", "busy", "active", "in progress", "in_progress"].includes(status)
  ) {
    return "task delegated";
  }

  return "task accepted";
}

function getEventDate(session) {
  const timestamp = getSessionTimestamp(session);
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getHeatColor(intensity) {
  if (intensity >= 1) return "rgba(16,185,129,0.95)";
  if (intensity >= 0.7) return "rgba(20,184,166,0.85)";
  if (intensity >= 0.45) return "rgba(14,165,233,0.75)";
  if (intensity > 0) return "rgba(99,102,241,0.55)";
  return "rgba(148,163,184,0.08)";
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 160 }}>
      <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          background: C.surface,
          color: C.text,
          border: `1px solid ${C.border}`,
          borderRadius: 10,
          padding: "10px 12px",
          fontSize: 13,
          outline: "none"
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActivityHeatmap({ sessions }) {
  const days = useMemo(() => {
    const base = new Date();
    base.setMinutes(0, 0, 0);

    return Array.from({ length: HEATMAP_DAYS }, (_, offset) => {
      const day = new Date(base);
      day.setHours(0, 0, 0, 0);
      day.setDate(base.getDate() - (HEATMAP_DAYS - offset - 1));
      return day;
    });
  }, []);

  const counts = useMemo(() => {
    const map = new Map();

    sessions.forEach((session) => {
      const date = getEventDate(session);
      if (!date) return;

      const dayKey = new Date(date);
      dayKey.setHours(0, 0, 0, 0);
      const key = `${dayKey.toISOString()}-${date.getHours()}`;
      map.set(key, (map.get(key) || 0) + 1);
    });

    return map;
  }, [sessions]);

  const maxCount = useMemo(() => {
    let max = 0;
    counts.forEach((count) => {
      if (count > max) max = count;
    });
    return max;
  }, [counts]);

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Activity Heatmap</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
            Hour-by-hour ACP activity over the last 7 days.
          </div>
        </div>
        <Badge color={C.teal}>{sessions.length} events</Badge>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px repeat(7, minmax(30px, 1fr))", gap: 6, minWidth: 360 }}>
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>
              {day.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}
            </div>
          ))}

          {HEATMAP_HOURS.map((hour) => (
            <FragmentRow
              key={hour}
              hour={hour}
              days={days}
              counts={counts}
              maxCount={maxCount}
            />
          ))}
        </div>
      </div>
    </Card>
  );
}

function FragmentRow({ hour, days, counts, maxCount }) {
  return (
    <>
      <div style={{ fontSize: 11, color: hour % 6 === 0 ? C.muted : "transparent", paddingTop: 4 }}>
        {hour % 6 === 0 ? formatHourLabel(hour) : "·"}
      </div>
      {days.map((day) => {
        const key = `${day.toISOString()}-${hour}`;
        const count = counts.get(key) || 0;
        const intensity = maxCount > 0 ? count / maxCount : 0;

        return (
          <div
            key={key}
            title={`${day.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} ${formatHourLabel(hour)}: ${count} events`}
            style={{
              height: 14,
              borderRadius: 4,
              background: getHeatColor(intensity),
              border: count > 0 ? "none" : `1px solid ${C.border}`
            }}
          />
        );
      })}
    </>
  );
}

const ActivityFeed = () => {
  const { acpSessions, snapshot, refresh } = useMissionControlData();
  const [selectedAgent, setSelectedAgent] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const logRef = useRef(null);

  const sortedSessions = useMemo(
    () =>
      [...(acpSessions || [])].sort(
        (left, right) => new Date(getSessionTimestamp(right) || 0).getTime() - new Date(getSessionTimestamp(left) || 0).getTime()
      ),
    [acpSessions]
  );

  const agentOptions = useMemo(() => {
    const uniqueAgents = Array.from(new Set(sortedSessions.map((session) => session.agent).filter(Boolean))).sort();
    return [{ value: "all", label: "All agents" }, ...uniqueAgents.map((agent) => ({ value: agent, label: agent }))];
  }, [sortedSessions]);

  const statusOptions = useMemo(() => {
    const uniqueStatuses = Array.from(new Set(sortedSessions.map((session) => session.status).filter(Boolean))).sort();
    return [{ value: "all", label: "All statuses" }, ...uniqueStatuses.map((status) => ({ value: status, label: status }))];
  }, [sortedSessions]);

  const filteredSessions = useMemo(
    () =>
      sortedSessions.filter((session) => {
        if (selectedAgent !== "all" && session.agent !== selectedAgent) {
          return false;
        }
        if (selectedStatus !== "all" && session.status !== selectedStatus) {
          return false;
        }
        return true;
      }),
    [selectedAgent, selectedStatus, sortedSessions]
  );

  const summary = useMemo(() => {
    return filteredSessions.reduce(
      (accumulator, session) => {
        const actionType = getActionType(session);

        if (actionType === "task completed") accumulator.completed += 1;
        if (actionType === "task delegated") accumulator.delegated += 1;
        if (actionType === "task accepted") accumulator.accepted += 1;

        return accumulator;
      },
      { accepted: 0, completed: 0, delegated: 0 }
    );
  }, [filteredSessions]);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = 0;
  }, [filteredSessions.length]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>Activity Feed</h1>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
            Live ACP session activity with event filters and a rolling 7-day workload map.
          </div>
        </div>
        <button
          onClick={refresh}
          style={{ background: C.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 600, cursor: "pointer" }}
        >
          Refresh Activity
        </button>
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <FilterSelect label="Agent" value={selectedAgent} options={agentOptions} onChange={setSelectedAgent} />
            <FilterSelect label="Status" value={selectedStatus} options={statusOptions} onChange={setSelectedStatus} />
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge color={C.cyan}>{summary.accepted} accepted</Badge>
            <Badge color={C.amber}>{summary.delegated} delegated</Badge>
            <Badge color={C.green}>{summary.completed} completed</Badge>
          </div>
        </div>
      </Card>

      <ActivityHeatmap sessions={filteredSessions} />

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Real-Time Scrolling Log</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
              Timestamp, agent, action type, and task description from live ACP sessions.
            </div>
          </div>
          <Badge color={C.pink}>{filteredSessions.length} visible events</Badge>
        </div>

        {filteredSessions.length ? (
          <div
            ref={logRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 0,
              maxHeight: 520,
              overflowY: "auto",
              paddingRight: 6
            }}
          >
            {filteredSessions.map((session) => {
              const actionType = getActionType(session);

              return (
                <div
                  key={session.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 100px 140px minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "start",
                    padding: "14px 0",
                    borderBottom: `1px solid ${C.border}`
                  }}
                >
                  <div style={{ fontSize: 12, color: C.muted }}>{formatDateTime(getSessionTimestamp(session))}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{session.agent || "unknown"}</div>
                  <Badge color={actionTypeColor(actionType)}>{actionType}</Badge>
                  <div style={{ fontSize: 13, color: C.text, lineHeight: 1.5 }}>{session.task || "ACP Session"}</div>
                  <Badge color={statusColor(session.status)}>{session.status || "unknown"}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            {snapshot.healthError || snapshot.statusError || "No ACP session activity matches the current filters."}
          </div>
        )}
      </Card>
    </div>
  );
};

export default ActivityFeed;
