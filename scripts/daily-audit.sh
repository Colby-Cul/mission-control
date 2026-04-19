#!/usr/bin/env bash
# Mission Control Daily Audit Script
# Generates ~/mission-control/src/data/audit-report.json
# Run daily at 6:00 AM Pacific via launchd

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MC_DIR="$(dirname "$SCRIPT_DIR")"
DATA_DIR="$MC_DIR/src/data"
PUBLIC_DIR="$MC_DIR/public"
PROJECTS_FILE="$DATA_DIR/projects.json"
REPORT_FILE="$DATA_DIR/audit-report.json"
LOG_FILE="$MC_DIR/scripts/audit.log"

# Known live assets (websites, deployed apps) to cross-reference against blocker descriptions
KNOWN_LIVE_ASSETS=(
  "colby-cul.github.io/mission-control"
  "mission-control"
  "github.com"
  "fast.io"
)

NOW_ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
NOW_EPOCH=$(date +%s)
SEVEN_DAYS_SECONDS=$((7 * 24 * 3600))

echo "[$(date)] Starting Mission Control daily audit..." >> "$LOG_FILE"

python3 - <<PYEOF
import json
import os
import sys
from datetime import datetime, timezone, timedelta

PROJECTS_FILE = "$PROJECTS_FILE"
REPORT_FILE = "$REPORT_FILE"
NOW_ISO = "$NOW_ISO"
SEVEN_DAYS_SECONDS = $SEVEN_DAYS_SECONDS

KNOWN_LIVE_ASSETS = [
    "colby-cul.github.io/mission-control",
    "mission-control",
    "github.com",
    "fast.io",
]

def parse_iso(s):
    if not s:
        return None
    try:
        s = s.replace("Z", "+00:00")
        return datetime.fromisoformat(s)
    except Exception:
        return None

now = datetime.fromisoformat(NOW_ISO.replace("Z", "+00:00"))
stale_threshold = now - timedelta(seconds=SEVEN_DAYS_SECONDS)

# Load projects
with open(PROJECTS_FILE) as f:
    projects = json.load(f)

stale_projects = []
invalid_blocker_tasks = []
unassigned_tasks = []
task_count_mismatches = []

total_tasks = 0
valid_tasks = 0
issues = []

for project in projects:
    proj_id = project.get("id", "unknown")
    proj_name = project.get("name", proj_id)
    proj_status = project.get("status", "unknown")
    sessions = project.get("sessions", [])
    task_count_declared = project.get("taskCount", 0)
    task_count_actual = len(sessions)

    # ── Task count mismatch ──
    if task_count_declared != task_count_actual:
        task_count_mismatches.append({
            "projectId": proj_id,
            "projectName": proj_name,
            "declaredCount": task_count_declared,
            "actualCount": task_count_actual,
        })
        issues.append(f"task_count_mismatch:{proj_id}")

    # ── Stale project check (active projects with no activity > 7 days) ──
    if proj_status in ("active", "in-progress", "in_progress"):
        all_dates = []
        for s in sessions:
            for field in ["dateFinished", "endTime", "dateCreated", "startTime"]:
                d = parse_iso(s.get(field))
                if d:
                    all_dates.append(d)
        latest_activity = max(all_dates) if all_dates else None
        if latest_activity is None or latest_activity < stale_threshold:
            days_since = None
            if latest_activity:
                delta = now - latest_activity
                days_since = round(delta.total_seconds() / 86400, 1)
            stale_projects.append({
                "projectId": proj_id,
                "projectName": proj_name,
                "status": proj_status,
                "latestActivity": latest_activity.isoformat() if latest_activity else None,
                "daysSinceActivity": days_since,
                "taskCount": task_count_actual,
            })
            issues.append(f"stale_project:{proj_id}")

    # ── Per-task checks ──
    for session in sessions:
        sess_id = session.get("id", session.get("sessionId", "unknown"))
        sess_status = session.get("status", session.get("lane", "unknown"))
        agent = session.get("agent", None)
        task_desc = session.get("task", "")
        blocker = session.get("blocker", session.get("blockerReason", None))

        total_tasks += 1
        task_valid = True

        # ── Unassigned task ──
        if not agent or str(agent).strip() == "":
            unassigned_tasks.append({
                "projectId": proj_id,
                "projectName": proj_name,
                "taskId": sess_id,
                "status": sess_status,
                "task": task_desc[:120] if task_desc else "(no task description)",
            })
            task_valid = False
            issues.append(f"unassigned:{proj_id}:{sess_id}")

        # ── Blocked task missing blocker reason ──
        if sess_status in ("blocked",) and (not blocker or str(blocker).strip() == ""):
            invalid_blocker_tasks.append({
                "projectId": proj_id,
                "projectName": proj_name,
                "taskId": sess_id,
                "agent": agent,
                "status": sess_status,
                "task": task_desc[:120] if task_desc else "(no task description)",
                "issue": "blocked_no_reason",
                "blocker": None,
            })
            task_valid = False
            issues.append(f"blocked_no_reason:{proj_id}:{sess_id}")

        # ── Blocker references something that now exists (potentially outdated) ──
        if blocker and str(blocker).strip():
            blocker_str = str(blocker).lower()
            for asset in KNOWN_LIVE_ASSETS:
                if asset.lower() in blocker_str:
                    invalid_blocker_tasks.append({
                        "projectId": proj_id,
                        "projectName": proj_name,
                        "taskId": sess_id,
                        "agent": agent,
                        "status": sess_status,
                        "task": task_desc[:120] if task_desc else "(no task description)",
                        "issue": "blocker_references_live_asset",
                        "blocker": blocker,
                        "liveAsset": asset,
                    })
                    task_valid = False
                    issues.append(f"blocker_stale:{proj_id}:{sess_id}")
                    break  # only flag once per task

        if task_valid:
            valid_tasks += 1

# Health score
health_score = round((valid_tasks / total_tasks * 100), 1) if total_tasks > 0 else 100.0
has_issues = len(issues) > 0

report = {
    "timestamp": NOW_ISO,
    "healthScore": health_score,
    "hasIssues": has_issues,
    "summary": {
        "totalProjects": len(projects),
        "totalTasks": total_tasks,
        "validTasks": valid_tasks,
        "issueCount": len(set(issues)),
    },
    "staleProjects": stale_projects,
    "invalidBlockerTasks": invalid_blocker_tasks,
    "unassignedTasks": unassigned_tasks,
    "taskCountMismatches": task_count_mismatches,
}

with open(REPORT_FILE, "w") as f:
    json.dump(report, f, indent=2)

print(f"Audit complete: healthScore={health_score}%, issues={len(set(issues))}, stale={len(stale_projects)}, unassigned={len(unassigned_tasks)}, badBlockers={len(invalid_blocker_tasks)}, countMismatches={len(task_count_mismatches)}")
sys.exit(0)
PYEOF

# Also copy to public/ so it's served from the deployed site
cp "$REPORT_FILE" "$PUBLIC_DIR/audit-report.json" 2>/dev/null || true

echo "[$(date)] Audit complete. Report written to $REPORT_FILE" >> "$LOG_FILE"
