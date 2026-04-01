#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="${ROOT_DIR}/live-data.json"
OPENCLAW_HOME="${HOME}/.openclaw"
HEALTH_URL="http://127.0.0.1:18789/health"

health_json="$(curl -fsS --max-time 5 "${HEALTH_URL}" 2>/dev/null || true)"

if [[ -n "${health_json}" ]]; then
  export HEALTH_JSON="${health_json}"
else
  export HEALTH_JSON='{"ok":false,"error":"failed to reach gateway","url":"http://127.0.0.1:18789/health"}'
fi

python3 - "${OPENCLAW_HOME}" "${OUTPUT_FILE}" <<'PY'
import glob
import json
import os
import sys
from pathlib import Path

openclaw_home = Path(sys.argv[1]).expanduser()
output_file = Path(sys.argv[2])

try:
    health = json.loads(os.environ["HEALTH_JSON"])
except Exception as exc:
    health = {
        "ok": False,
        "error": f"invalid health payload: {exc}",
        "raw": os.environ.get("HEALTH_JSON", ""),
    }

sessions_by_agent = []
agents_dir = openclaw_home / "agents"
if agents_dir.exists():
    for agent_dir in sorted(path for path in agents_dir.iterdir() if path.is_dir()):
        sessions_by_agent.append(
            {
                "agent": agent_dir.name,
                "sessionCount": len(glob.glob(str(agent_dir / "sessions" / "*.jsonl"))),
            }
        )

cron_jobs = []
jobs_path = openclaw_home / "cron" / "jobs.json"
if jobs_path.exists():
    jobs_data = json.loads(jobs_path.read_text())
    jobs = jobs_data.get("jobs", []) if isinstance(jobs_data, dict) else []
    for job in jobs:
        state = job.get("state", {}) if isinstance(job, dict) else {}
        cron_jobs.append(
            {
                "name": job.get("name") if isinstance(job, dict) else None,
                "enabled": job.get("enabled") if isinstance(job, dict) else None,
                "lastStatus": state.get("lastStatus") if isinstance(state, dict) else None,
            }
        )

skills = []
skills_dir = openclaw_home / "skills"
if skills_dir.exists():
    for skill_file in sorted(skills_dir.glob("*/SKILL.md")):
        name = None
        lines = skill_file.read_text(errors="replace").splitlines()
        if lines and lines[0].strip() == "---":
            for line in lines[1:]:
                if line.strip() == "---":
                    break
                if line.startswith("name:"):
                    name = line.split(":", 1)[1].strip()
                    break
        skills.append(
            {
                "name": name or skill_file.parent.name,
                "path": str(skill_file),
            }
        )

payload = {
    "health": health,
    "sessionsByAgent": sessions_by_agent,
    "cronJobs": cron_jobs,
    "skills": skills,
}

output_file.write_text(json.dumps(payload, indent=2) + "\n")
print(json.dumps(payload, indent=2))
PY
