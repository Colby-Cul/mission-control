#!/usr/bin/env bash
# sync-to-supabase.sh
# Syncs done-status tasks from ~/mission-control/src/data/manual-tasks.json 
# to the Supabase 'tasks' table used by mc-merge-v7.vercel.app
#
# Run this after updating manual-tasks.json to reflect task completions.

set -euo pipefail

SUPA_URL="https://bdlvwfobjqvnrffzxrfz.supabase.co"
SUPA_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkbHZ3Zm9ianF2bnJmZnp4cmZ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDMzNTA2MCwiZXhwIjoyMDg5OTExMDYwfQ.k9Hp5T8X_b836uFDqlCX43mPXViy9lN6_5dmfLn1l8c"
MANUAL_TASKS="$(dirname "$0")/../src/data/manual-tasks.json"

echo "[sync-to-supabase] Starting sync from manual-tasks.json..."

python3 - <<PYEOF
import json, urllib.request, urllib.error, sys, os
from datetime import datetime, timezone

SUPA_URL = "$SUPA_URL"
SUPA_KEY = "$SUPA_KEY"
MANUAL_TASKS = "$MANUAL_TASKS"

STATUS_MAP = {
    "done": "done",
    "completed": "done",
    "in_progress": "in_progress",
    "blocked": "blocked",
    "todo": "backlog",
    "backlog": "backlog",
}

def supabase_request(method, path, data=None):
    url = SUPA_URL + path
    body = json.dumps(data).encode() if data else None
    headers = {
        "apikey": SUPA_KEY,
        "Authorization": f"Bearer {SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
    }
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            text = r.read().decode()
            return json.loads(text) if text else []
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}", file=sys.stderr)
        return None

# Load manual tasks
with open(MANUAL_TASKS) as f:
    manual = json.load(f)

# Load supabase tasks
sb_tasks = supabase_request("GET", "/rest/v1/tasks?select=id,project_id,name,status&limit=1000")
if sb_tasks is None:
    print("Failed to load Supabase tasks.", file=sys.stderr)
    sys.exit(1)

# Build index by name for fuzzy matching
sb_by_name = {}
for t in sb_tasks:
    name = (t.get("name") or "").lower().strip()
    sb_by_name[name] = t

now = datetime.now(timezone.utc).isoformat()
updated = 0

for t in manual:
    status = (t.get("status") or "").lower()
    if status not in ("done", "completed"):
        continue
    
    # Try to find matching Supabase task by name similarity
    task_name = (t.get("task") or "").lower().strip()
    match = None
    
    # Exact match
    if task_name in sb_by_name:
        match = sb_by_name[task_name]
    else:
        # Partial match
        for sbn, sbt in sb_by_name.items():
            if len(task_name) > 10 and (task_name in sbn or sbn in task_name):
                match = sbt
                break
    
    if match and match.get("status") != "done":
        # Update the matching Supabase task
        result = supabase_request(
            "PATCH",
            f"/rest/v1/tasks?id=eq.{match['id']}",
            {"status": "done", "completed_at": now, "updated_at": now}
        )
        print(f"  UPDATED: {match['name']} -> done")
        updated += 1

print(f"[sync-to-supabase] Done. {updated} Supabase tasks updated to 'done'.")
PYEOF
