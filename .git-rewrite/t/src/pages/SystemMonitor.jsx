import { useEffect, useMemo, useState } from "react";
import { Badge, Card, KPI } from "../components/shared";
import { C } from "../data/constants";
import { useMissionControlData } from "../context/MissionControlDataContext";
import { getApiUrl } from "../utils/api";
import { statusColor } from "./liveViewUtils";

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMELINE_DAYS = 7;

function normalizeStatusLabel(status) {
  switch (String(status || "").toLowerCase()) {
    case "ok":
    case "success":
    case "live":
    case "online":
    case "healthy":
      return "success";
    case "error":
    case "failed":
    case "fail":
      return "fail";
    default:
      return status || "unknown";
  }
}

function formatDateTime(value) {
  if (!value) {
    return "Never";
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

function toLocalDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, count) {
  const next = new Date(date);
  next.setDate(next.getDate() + count);
  return next;
}

function formatTime(hour, minute) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseCronValue(token, names) {
  const upper = token.toUpperCase();
  if (names && Object.prototype.hasOwnProperty.call(names, upper)) {
    return names[upper];
  }

  const value = Number.parseInt(token, 10);
  return Number.isNaN(value) ? null : value;
}

function expandCronField(token, min, max, names) {
  if (!token || token === "*") {
    return null;
  }

  const values = new Set();
  const segments = token.split(",");

  for (const segment of segments) {
    const [base, stepToken] = segment.split("/");
    const step = stepToken ? Number.parseInt(stepToken, 10) : 1;
    if (stepToken && (!Number.isFinite(step) || step <= 0)) {
      return null;
    }

    let start = min;
    let end = max;

    if (base && base !== "*") {
      if (base.includes("-")) {
        const [startToken, endToken] = base.split("-");
        start = parseCronValue(startToken, names);
        end = parseCronValue(endToken, names);
      } else {
        start = parseCronValue(base, names);
        end = start;
      }
    }

    if (!Number.isFinite(start) || !Number.isFinite(end)) {
      return null;
    }

    if (max === 6) {
      if (start === 7) start = 0;
      if (end === 7) end = 0;
    }

    if (start < min || start > max || end < min || end > max) {
      return null;
    }

    if (start <= end) {
      for (let value = start; value <= end; value += step) {
        values.add(max === 6 && value === 7 ? 0 : value);
      }
    } else if (max === 6) {
      for (let value = start; value <= max; value += step) {
        values.add(value === 7 ? 0 : value);
      }
      for (let value = min; value <= end; value += step) {
        values.add(value === 7 ? 0 : value);
      }
    } else {
      return null;
    }
  }

  return [...values].sort((left, right) => left - right);
}

function matchesCronDay(date, monthValues, dayOfMonthValues, dayOfWeekValues) {
  if (monthValues && !monthValues.includes(date.getMonth() + 1)) {
    return false;
  }

  const matchesDayOfMonth = !dayOfMonthValues || dayOfMonthValues.includes(date.getDate());
  const matchesDayOfWeek = !dayOfWeekValues || dayOfWeekValues.includes(date.getDay());

  if (!dayOfMonthValues && !dayOfWeekValues) {
    return true;
  }

  if (!dayOfMonthValues) {
    return matchesDayOfWeek;
  }

  if (!dayOfWeekValues) {
    return matchesDayOfMonth;
  }

  return matchesDayOfMonth || matchesDayOfWeek;
}

function buildDailyTimeLabels(hourValues, minuteValues) {
  if (!hourValues && !minuteValues) {
    return ["Continuous"];
  }

  if (!hourValues && minuteValues) {
    return minuteValues.slice(0, 4).map((minute) => `:${String(minute).padStart(2, "0")} hourly`);
  }

  if (hourValues && !minuteValues) {
    return hourValues.slice(0, 6).map((hour) => `${String(hour).padStart(2, "0")}:xx`);
  }

  const labels = [];
  for (const hour of hourValues) {
    for (const minute of minuteValues) {
      labels.push(formatTime(hour, minute));
      if (labels.length >= 6) {
        return [...labels, "Recurring"];
      }
    }
  }

  return labels;
}

function buildTimelineEntries(schedule, startDate) {
  const days = Array.from({ length: TIMELINE_DAYS }, (_, index) => {
    const date = addDays(startDate, index);
    return {
      key: date.toISOString(),
      label: WEEKDAY_NAMES[date.getDay()],
      date,
      displayDate: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      times: []
    };
  });

  if (!schedule) {
    return days;
  }

  if (String(schedule).toLowerCase() === "every") {
    return days.map((day) => ({ ...day, times: ["Continuous"] }));
  }

  const fields = String(schedule).trim().split(/\s+/);
  if (fields.length !== 5) {
    return days;
  }

  const [minuteField, hourField, dayOfMonthField, monthField, dayOfWeekField] = fields;
  const dayNames = { SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 };
  const monthNames = { JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12 };

  const minuteValues = expandCronField(minuteField, 0, 59);
  const hourValues = expandCronField(hourField, 0, 23);
  const dayOfMonthValues = expandCronField(dayOfMonthField, 1, 31);
  const monthValues = expandCronField(monthField, 1, 12, monthNames);
  const dayOfWeekValues = expandCronField(dayOfWeekField, 0, 6, dayNames);
  const timeLabels = buildDailyTimeLabels(hourValues, minuteValues);

  return days.map((day) => ({
    ...day,
    times: matchesCronDay(day.date, monthValues, dayOfMonthValues, dayOfWeekValues) ? timeLabels : []
  }));
}

const SystemMonitor = () => {
  const { snapshot } = useMissionControlData();
  const snapshotCronJobs = Array.isArray(snapshot?.cronJobs) ? snapshot.cronJobs : [];
  const [enabledOverrides, setEnabledOverrides] = useState({});
  const [triggerState, setTriggerState] = useState({});

  useEffect(() => {
    setEnabledOverrides(
      snapshotCronJobs.reduce((acc, job) => {
        acc[job.name] = Boolean(job.enabled);
        return acc;
      }, {})
    );
  }, [snapshotCronJobs]);

  const weekStart = useMemo(() => toLocalDate(new Date()), []);

  const jobs = useMemo(
    () =>
      snapshotCronJobs.map((job) => ({
        ...job,
        enabled: Object.prototype.hasOwnProperty.call(enabledOverrides, job.name)
          ? enabledOverrides[job.name]
          : Boolean(job.enabled),
        timeline: buildTimelineEntries(job.schedule, weekStart)
      })),
    [enabledOverrides, snapshotCronJobs, weekStart]
  );

  const handleToggle = async (jobName) => {
    const previous = enabledOverrides[jobName];
    setEnabledOverrides((current) => ({
      ...current,
      [jobName]: !current[jobName]
    }));
    try {
      const resp = await fetch(`/api/cron/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName, enabled: !previous })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    } catch (error) {
      setEnabledOverrides((current) => ({
        ...current,
        [jobName]: previous
      }));
      setTriggerState((current) => ({
        ...current,
        [jobName]: { state: "error", message: error?.message || "Toggle failed" }
      }));
    }
  };

  const handleTrigger = async (jobName) => {
    setTriggerState((current) => ({
      ...current,
      [jobName]: { state: "loading", message: "Triggering sync..." }
    }));

    try {
      const response = await fetch(`/api/cron/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobName })
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      setTriggerState((current) => ({
        ...current,
        [jobName]: { state: "success", message: `Triggered ${formatDateTime(new Date().toISOString())}` }
      }));
    } catch (error) {
      setTriggerState((current) => ({
        ...current,
        [jobName]: { state: "error", message: error?.message || "Trigger failed" }
      }));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>System Monitor</h1>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <KPI label="Gateway" value={snapshot.health?.status || "--"} sub={snapshot.sourceLabel || "runtime"} color={statusColor(snapshot.health?.status)} />
        <KPI label="Cron Jobs" value={jobs.length || "--"} sub="Snapshot scheduler inventory" color={C.accent} />
      </div>

      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Scheduler Jobs</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>
              Live view of cron definitions from <code>useMissionControlData().snapshot.cronJobs</code>.
            </div>
          </div>
          <Badge color={C.cyan}>Next 7 days</Badge>
        </div>

        {jobs.length ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {jobs.map((job) => {
              const trigger = triggerState[job.name];
              const triggerColor = trigger?.state === "error" ? C.red : trigger?.state === "success" ? C.green : C.muted;

              return (
                <div
                  key={job.name}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    padding: "16px 18px",
                    borderRadius: 14,
                    background: C.surface,
                    border: `1px solid ${C.border}`
                  }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(240px, 1fr) auto", gap: 16, alignItems: "start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{job.name}</div>
                        <Badge color={statusColor(job.lastStatus)}>{normalizeStatusLabel(job.lastStatus)}</Badge>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
                        <div>
                          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Schedule</div>
                          <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{job.schedule || "Not set"}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Last run</div>
                          <div style={{ fontSize: 13, color: C.text, marginTop: 4 }}>{formatDateTime(job.lastRunAt || job.updatedAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Enabled</div>
                      <button
                        type="button"
                        onClick={() => handleToggle(job.name)}
                        aria-pressed={job.enabled}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: job.enabled ? "flex-end" : "flex-start",
                          width: 68,
                          padding: 4,
                          borderRadius: 9999,
                          border: "none",
                          cursor: "pointer",
                          background: job.enabled ? C.green : C.border,
                          transition: "all 160ms ease"
                        }}
                      >
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: "#fff",
                            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)"
                          }}
                        />
                      </button>
                      <div style={{ fontSize: 12, color: C.muted }}>{job.enabled ? "Enabled" : "Disabled"}</div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
                      <button
                        type="button"
                        onClick={() => handleTrigger(job.name)}
                        disabled={trigger?.state === "loading"}
                        style={{
                          background: trigger?.state === "loading" ? C.border : C.accent,
                          color: "#fff",
                          border: "none",
                          borderRadius: 10,
                          padding: "10px 14px",
                          fontWeight: 600,
                          cursor: trigger?.state === "loading" ? "progress" : "pointer",
                          minWidth: 132
                        }}
                      >
                        {trigger?.state === "loading" ? "Triggering..." : "Manual Trigger"}
                      </button>
                      <div style={{ fontSize: 12, color: triggerColor, textAlign: "right", minHeight: 16 }}>
                        {trigger?.message || `POST /api/cron/trigger`}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Weekly timeline</div>
                    <div style={{ display: "grid", gridTemplateColumns: `repeat(${TIMELINE_DAYS}, minmax(0, 1fr))`, gap: 10 }}>
                      {job.timeline.map((day) => (
                        <div
                          key={`${job.name}-${day.key}`}
                          style={{
                            minHeight: 90,
                            borderRadius: 12,
                            border: `1px solid ${C.border}`,
                            background: "#0b1220",
                            padding: "12px 10px"
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{day.label}</div>
                          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{day.displayDate}</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                            {day.times.length ? (
                              day.times.map((time) => (
                                <span
                                  key={`${job.name}-${day.key}-${time}`}
                                  style={{
                                    fontSize: 11,
                                    color: C.text,
                                    background: `${job.enabled ? C.accent : C.border}33`,
                                    border: `1px solid ${job.enabled ? C.accent : C.border}`,
                                    borderRadius: 9999,
                                    padding: "4px 8px",
                                    width: "fit-content"
                                  }}
                                >
                                  {time}
                                </span>
                              ))
                            ) : (
                              <span style={{ fontSize: 11, color: C.muted }}>No run</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
            No scheduler data available in the current snapshot.
          </div>
        )}
      </Card>
    </div>
  );
};

export default SystemMonitor;
