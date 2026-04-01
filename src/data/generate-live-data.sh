#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_FILE="${ROOT_DIR}/live-data.json"
OPENCLAW_HOME="${HOME}/.openclaw"
GATEWAY_BASE_URL="${MISSION_CONTROL_GATEWAY_URL:-${VITE_MISSION_CONTROL_GATEWAY_URL:-http://127.0.0.1:18789}}"
GATEWAY_BASE_URL="${GATEWAY_BASE_URL%/}"
HEALTH_URL="${MISSION_CONTROL_HEALTH_URL:-${GATEWAY_BASE_URL}/health}"
STATUS_URL="${MISSION_CONTROL_STATUS_URL:-${GATEWAY_BASE_URL}/api/status}"
GATEWAY_TOKEN="${MISSION_CONTROL_GATEWAY_TOKEN:-${VITE_MISSION_CONTROL_GATEWAY_TOKEN:-}}"
MONDAY_BOARD_ID="${MISSION_CONTROL_MONDAY_BOARD_ID:-${VITE_MISSION_CONTROL_MONDAY_BOARD_ID:-18404980498}}"
MONDAY_PROXY_URL="${MISSION_CONTROL_MONDAY_PROXY_URL:-${VITE_MISSION_CONTROL_MONDAY_PROXY_URL:-}}"
MONDAY_PROXY_TOKEN="${MISSION_CONTROL_MONDAY_PROXY_TOKEN:-${VITE_MISSION_CONTROL_MONDAY_PROXY_TOKEN:-}}"
MONDAY_TOKEN="${MISSION_CONTROL_MONDAY_TOKEN:-${VITE_MISSION_CONTROL_MONDAY_TOKEN:-}}"

curl_json() {
  if [[ "$#" -eq 0 ]]; then
    return 0
  fi

  curl -fsS --max-time 15 "$@" 2>/dev/null || true
}

gateway_headers=()
if [[ -n "${GATEWAY_TOKEN}" ]]; then
  gateway_headers=(-H "Authorization: Bearer ${GATEWAY_TOKEN}")
fi

monday_proxy_headers=()
if [[ -n "${MONDAY_PROXY_TOKEN}" ]]; then
  monday_proxy_headers=(-H "Authorization: Bearer ${MONDAY_PROXY_TOKEN}")
elif [[ -n "${GATEWAY_TOKEN}" ]]; then
  monday_proxy_headers=(-H "Authorization: Bearer ${GATEWAY_TOKEN}")
fi

if [[ ${#gateway_headers[@]} -gt 0 ]]; then
  health_json="$(curl_json "${gateway_headers[@]}" "${HEALTH_URL}")"
  status_json="$(curl_json "${gateway_headers[@]}" "${STATUS_URL}")"
else
  health_json="$(curl_json "${HEALTH_URL}")"
  status_json="$(curl_json "${STATUS_URL}")"
fi
monday_json=""

if [[ -n "${MONDAY_PROXY_URL}" ]]; then
  monday_url="${MONDAY_PROXY_URL}"
  if [[ "${monday_url}" != *"boardId="* ]]; then
    joiner='?'
    if [[ "${monday_url}" == *'?'* ]]; then
      joiner='&'
    fi
    monday_url="${monday_url}${joiner}boardId=${MONDAY_BOARD_ID}"
  fi
  if [[ ${#monday_proxy_headers[@]} -gt 0 ]]; then
    monday_json="$(curl_json "${monday_proxy_headers[@]}" "${monday_url}")"
  else
    monday_json="$(curl_json "${monday_url}")"
  fi
elif [[ -n "${GATEWAY_BASE_URL}" ]]; then
  if [[ ${#gateway_headers[@]} -gt 0 ]]; then
    monday_json="$(curl_json "${gateway_headers[@]}" "${GATEWAY_BASE_URL}/api/monday/board?boardId=${MONDAY_BOARD_ID}")"
  else
    monday_json="$(curl_json "${GATEWAY_BASE_URL}/api/monday/board?boardId=${MONDAY_BOARD_ID}")"
  fi
fi

if [[ -z "${monday_json}" && -n "${MONDAY_TOKEN}" ]]; then
  monday_query='{"query":"query MissionControlBoard($boardId: ID!) { boards(ids: [$boardId]) { id name state updated_at items_page(limit: 25) { items { id name updated_at state group { id title } column_values { id text type value } } } } }","variables":{"boardId":"'"${MONDAY_BOARD_ID}"'"}}'
  monday_json="$(curl_json \
    -X POST \
    -H "Content-Type: application/json" \
    -H "Authorization: ${MONDAY_TOKEN}" \
    -H "API-Version: 2024-10" \
    --data "${monday_query}" \
    "https://api.monday.com/v2")"
fi

if [[ -z "${health_json}" ]]; then
  health_json="{\"ok\":false,\"error\":\"failed to reach gateway health endpoint\",\"url\":\"${HEALTH_URL}\"}"
fi

if [[ -z "${status_json}" ]]; then
  status_json="{\"error\":\"failed to reach gateway status endpoint\",\"url\":\"${STATUS_URL}\"}"
fi

if [[ -z "${monday_json}" ]]; then
  monday_json="{\"error\":\"failed to reach monday source\",\"boardId\":\"${MONDAY_BOARD_ID}\"}"
fi

export HEALTH_JSON="${health_json}"
export STATUS_JSON="${status_json}"
export MONDAY_JSON="${monday_json}"
export SNAPSHOT_GENERATED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
export SNAPSHOT_GATEWAY_URL="${GATEWAY_BASE_URL}"
export SNAPSHOT_MONDAY_PROXY_URL="${MONDAY_PROXY_URL}"
export SNAPSHOT_MONDAY_BOARD_ID="${MONDAY_BOARD_ID}"

python3 - "${OPENCLAW_HOME}" "${OUTPUT_FILE}" <<'PY'
import glob
import json
import os
import sys
from pathlib import Path


def parse_json(name, fallback):
    try:
        return json.loads(os.environ[name])
    except Exception as exc:
        return {
            "error": f"invalid {name.lower()} payload: {exc}",
            "raw": os.environ.get(name, ""),
            **fallback,
        }


openclaw_home = Path(sys.argv[1]).expanduser()
output_file = Path(sys.argv[2])

health = parse_json("HEALTH_JSON", {"ok": False})
status = parse_json("STATUS_JSON", {})
monday = parse_json("MONDAY_JSON", {})

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
    "generatedAt": os.environ.get("SNAPSHOT_GENERATED_AT"),
    "config": {
        "gatewayUrl": os.environ.get("SNAPSHOT_GATEWAY_URL"),
        "mondayProxyUrl": os.environ.get("SNAPSHOT_MONDAY_PROXY_URL"),
        "mondayBoardId": os.environ.get("SNAPSHOT_MONDAY_BOARD_ID"),
    },
    "health": health,
    "status": status,
    "monday": monday,
    "sessionsByAgent": sessions_by_agent,
    "cronJobs": cron_jobs,
    "skills": skills,
}

output_file.write_text(json.dumps(payload, indent=2) + "\n")
print(json.dumps(payload, indent=2))
PY
