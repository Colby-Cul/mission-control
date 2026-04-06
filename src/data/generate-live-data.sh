#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$SCRIPT_DIR/live-data.json"
PROJECTS_OUTPUT="$SCRIPT_DIR/projects.json"
PUBLIC_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)/public"
PUBLIC_OUTPUT="$PUBLIC_DIR/live-data.json"
PUBLIC_PROJECTS_OUTPUT="$PUBLIC_DIR/projects.json"

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "CI detected — skipping live data generation"
  exit 0
fi

if [ ! -d "$HOME/.openclaw" ]; then
  echo "No OpenClaw runtime — skipping"
  exit 0
fi

python3 - "$OUTPUT" "$PROJECTS_OUTPUT" <<'PYEOF'
import json
import os
import re
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

output_path = Path(sys.argv[1])
projects_output_path = Path(sys.argv[2])
openclaw = Path.home() / ".openclaw"
repo_root = output_path.parents[2]

generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def iso_now():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def iso_from_any(value):
    if value in (None, "", 0):
        return None
    if isinstance(value, (int, float)):
        ts = value / 1000 if value > 10_000_000_000 else value
        return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    text = str(value).strip()
    if not text:
        return None
    if text.isdigit():
        return iso_from_any(int(text))
    if text.endswith("Z"):
        return text
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
        return parsed.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        return text


def parse_json_file(path):
    try:
        return json.loads(path.read_text())
    except Exception:
        return None


def normalize_model_name(model):
    text = str(model or "").strip().lower()
    text = text.replace(" ", "-").replace("_", "-")
    aliases = {
        "claude-sonnet-4.5": "claude-sonnet-4-5",
        "claude-sonnet-4.6": "claude-sonnet-4-6",
        "claude-opus-4.5": "claude-opus-4-5",
        "claude-opus-4.6": "claude-opus-4-6",
        "gpt-5.4-mini": "gpt-5.4-mini",
        "gpt-5.4": "gpt-5.4",
        "gpt-4o-mini": "gpt-4o-mini",
        "gpt-4o": "gpt-4o",
    }
    return aliases.get(text, text)


PRICING = {
    # Anthropic API pricing, April 2 2026, from anthropic.com pricing pages.
    "claude-sonnet-4-5": {"input": 3.00, "output": 15.00, "cached_input": 0.30},
    "claude-sonnet-4-6": {"input": 3.00, "output": 15.00, "cached_input": 0.30},
    "claude-sonnet-4": {"input": 3.00, "output": 15.00, "cached_input": 0.30},
    "claude-opus-4-5": {"input": 15.00, "output": 75.00, "cached_input": 1.50},
    "claude-opus-4-6": {"input": 15.00, "output": 75.00, "cached_input": 1.50},
    "claude-opus-4": {"input": 15.00, "output": 75.00, "cached_input": 1.50},
    "claude-haiku-4-5": {"input": 0.80, "output": 4.00, "cached_input": 0.08},
    "claude-haiku-4": {"input": 0.80, "output": 4.00, "cached_input": 0.08},
    # OpenAI API pricing, April 2 2026, from openai.com/api/pricing.
    "gpt-4o": {"input": 2.50, "output": 10.00, "cached_input": 1.25},
    "gpt-4o-mini": {"input": 0.15, "output": 0.60, "cached_input": 0.075},
    "gpt-5.4": {"input": 2.50, "output": 15.00, "cached_input": 0.25},
    "gpt-5.4-mini": {"input": 0.75, "output": 4.50, "cached_input": 0.075},
    "codex-mini-latest": {"input": 1.50, "output": 6.00, "cached_input": 0.15},
    # Local/free runtimes.
    "acp-runtime": {"input": 0.0, "output": 0.0, "cached_input": 0.0},
    "ollama": {"input": 0.0, "output": 0.0, "cached_input": 0.0},
    "local": {"input": 0.0, "output": 0.0, "cached_input": 0.0},
}


def resolve_pricing(model):
    normalized = normalize_model_name(model)
    for key, price in PRICING.items():
        if key in normalized:
            return price
    if "claude" in normalized:
        return PRICING["claude-sonnet-4-5"]
    if "gpt-4o" in normalized:
        return PRICING["gpt-4o"]
    if "gpt-5" in normalized:
        return PRICING["gpt-5.4"]
    if "ollama" in normalized or "local" in normalized or "acp" in normalized:
        return PRICING["local"]
    return PRICING["local"]


def calc_cost(model, input_tokens=0, output_tokens=0, cached_input_tokens=0):
    price = resolve_pricing(model)
    return round(
        ((input_tokens or 0) * price["input"] +
         (output_tokens or 0) * price["output"] +
         (cached_input_tokens or 0) * price.get("cached_input", 0.0)) / 1_000_000,
        4,
    )


def estimate_remaining(session):
    if session["lane"] not in {"todo", "inprogress", "blocked"}:
        return None, None
    started_at = session.get("dateCreated")
    if not started_at:
        return None, None
    try:
        created = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        elapsed_seconds = max((datetime.now(timezone.utc) - created).total_seconds(), 60)
    except Exception:
        return None, None

    tokens = session.get("tokens", 0)
    if tokens <= 0:
        return 0.0, "Unknown"

    burn_rate = tokens / elapsed_seconds
    projected_remaining_tokens = max(tokens * 0.35, 1000)
    remaining_seconds = int(projected_remaining_tokens / max(burn_rate, 1))
    price = resolve_pricing(session.get("primaryModel") or "")
    remaining_cost = round(
        ((projected_remaining_tokens * price["output"]) / 1_000_000),
        4,
    )

    if remaining_seconds < 3600:
        eta = f"~{max(1, round(remaining_seconds / 60))} min"
    else:
        eta = f"~{round(remaining_seconds / 3600, 1)} hr"
    return remaining_cost, eta


def lane_from_status(status):
    value = str(status or "").strip().lower()
    if value in {"done", "complete", "completed", "success"}:
        return "done"
    if value in {"blocked", "failed", "error", "stalled"}:
        return "blocked"
    if value in {"delegated", "working", "running", "busy", "active", "pending", "in progress", "in_progress"}:
        return "inprogress"
    return "todo"


def guess_status(task_text, has_spawn=False, has_error=False, is_open=False, file_age_hours=0):
    lowered = str(task_text or "").lower()
    if "blocked" in lowered or has_error:
        return "blocked"
    # Sessions older than 1 hour are done, regardless of inventory
    if file_age_hours > 1:
        return "done"
    if is_open and file_age_hours < 1:
        return "in_progress"
    if has_spawn and file_age_hours < 1:
        return "in_progress"
    return "done"


def guess_project_id(session):
    haystack = f"{session.get('task', '')} {session.get('transcriptPath', '')}".lower()
    if "mission control" in haystack or "mission-control" in haystack:
        return "mission-control"
    if session.get("isCron"):
        return "system-ops"
    if any(token in haystack for token in ["str ", "lodgify", "pineside", "graeagle", "northstar", "airbnb", "booking.com", "rental"]):
        return "str-website"
    if session.get("spawns", 0) > 0:
        return "coding"
    return ""


def extract_task_text(text):
    cleaned = str(text or "").strip()
    if not cleaned:
        return ""
    for marker in ("\n\nConversation info", "\nConversation info", "\n\nSender (untrusted metadata)", "\nSender (untrusted metadata)", "\n\nSystem:"):
        if marker in cleaned:
            cleaned = cleaned.split(marker, 1)[0].strip()
    if cleaned.startswith("[cron:"):
        match = re.match(r"\[cron:[^\]]+\]\s*(.*)", cleaned)
        return (match.group(1) if match else cleaned).strip()
    if cleaned.startswith("[") and "]" in cleaned:
        cleaned = cleaned.split("]", 1)[1].strip()
    skip_prefixes = (
        "conversation info",
        "sender",
        "a new session",
        "read heartbeat",
        "system:",
        "[subagent context]",
        "[media attached",
        "this context is runtime",
        "(media/path/",
    )
    if cleaned.lower().startswith(skip_prefixes):
        return ""
    return cleaned


def clean_task_name(raw_text, agent_id, session_id=""):
    """Convert raw task text into a readable, human-friendly name."""
    text = str(raw_text or "").strip()

    # Filter out non-task content
    junk_patterns = [
        r'^[0-9a-f]{8}[-\s][0-9a-f]{4}',  # UUIDs
        r'^\(media/path/',                   # media tool hints
        r'^This context is runtime',          # runtime context
        r'^[A-Za-z]+ Session$',              # bare "Main Session" etc (will be regenerated below)
    ]
    for pat in junk_patterns:
        if re.match(pat, text, re.I):
            text = ""
            break

    # If it's just a UUID or session ID, generate a name from context
    uuid_pattern = re.compile(r'^[0-9a-f]{8}[-\s][0-9a-f]{4}[-\s][0-9a-f]{4}[-\s][0-9a-f]{4}[-\s][0-9a-f]{12}$', re.I)
    if uuid_pattern.match(text) or not text or len(text) < 5:
        agent_label = agent_id.replace("-", " ").title() if agent_id else "Agent"
        return f"{agent_label} Session"

    # Truncate very long texts to first meaningful sentence
    if len(text) > 120:
        # Try to cut at a sentence boundary
        for sep in (". ", "! ", "? ", "\n"):
            idx = text.find(sep, 40)
            if 40 < idx < 150:
                text = text[:idx + 1]
                break
        else:
            text = text[:117] + "..."

    # Clean up common noise patterns
    noise_replacements = {
        "Mission Control auto-update cycle:": "Mission Control Data Refresh",
        "Mission Control auto-update cycle": "Mission Control Data Refresh",
        "You are the Mission Control autonomous coding coordinator.": "Mission Control Build Coordination",
        "Check Discord Jarvis Mission Control server status": "Discord Health Check",
        "Check Discord Jarvis Mission Control server status.": "Discord Health Check",
        "To send an image back, prefer the message tool": "Media Processing Task",
        "CWD: /Users/jarvisculbertson/mission-control": "Mission Control Build Task",
        "CWD: /Users/jarvisculbertson/.openclaw": "OpenClaw Workspace Task",
        "Agent health check. Run these checks sil": "System Health Check",
        "OpenClaw runtime context (internal):": "Runtime Context Update",
    }
    for prefix, replacement in noise_replacements.items():
        if text.strip().startswith(prefix):
            remainder = text[len(prefix):].strip()
            if remainder and len(remainder) > 20 and not remainder.startswith("Verify") and not remainder.startswith("Run "):
                text = remainder
            else:
                return replacement

    # Remove leading directive markers
    text = re.sub(r'^(DELEGATION:\s*|TASK:\s*|TODO:\s*|URGENT:\s*)', '', text, flags=re.I).strip()

    # Clean up "Delegate this test task to..." pattern
    delegate_match = re.match(r"(?:Delegate|Send|Forward)\s+(?:this\s+)?(?:test\s+)?(?:task\s+)?to\s+(?:the\s+)?(\w[\w\s]*?)(?:\s*(?:NOW|ASAP|immediately))?[:]\s*['\"]?(.*?)['\"]?\s*$", text, re.I | re.S)
    if delegate_match:
        target = delegate_match.group(1).strip()
        task = delegate_match.group(2).strip()
        if task and len(task) > 10:
            text = task[:120]
        else:
            text = f"Delegated to {target}"

    # Capitalize first letter
    if text and text[0].islower():
        text = text[0].upper() + text[1:]

    return text or f"{agent_id.replace('-', ' ').title()} Session"


child_parent_map = {}
for stream_path in sorted(openclaw.glob("agents/*/sessions/*.acp-stream.jsonl")):
    try:
        with stream_path.open() as handle:
            for line in handle:
                row = json.loads(line)
                child = row.get("childSessionKey")
                parent = row.get("parentSessionKey")
                if child and parent and child not in child_parent_map:
                    child_parent_map[child] = parent
    except Exception:
        continue


tasks = []
session_index = {}
agent_rows = []

for agent_dir in sorted((openclaw / "agents").glob("*")):
    sessions_dir = agent_dir / "sessions"
    if not sessions_dir.exists():
        continue

    jsonl_files = sorted(sessions_dir.glob("*.jsonl"), key=lambda path: path.stat().st_mtime, reverse=True)
    session_inventory_path = sessions_dir / "sessions.json"
    inventory = parse_json_file(session_inventory_path) if session_inventory_path.exists() else {}
    # Load knowledge level data if available
    knowledge_path = agent_dir / "knowledge.json"
    knowledge = parse_json_file(knowledge_path) if knowledge_path.exists() else None

    agent_row = {
        "id": agent_dir.name,
        "name": agent_dir.name,
        "sessionCount": len(jsonl_files),
    }
    if knowledge:
        agent_row["knowledge"] = {
            "domain": knowledge.get("domain", ""),
            "xp": knowledge.get("xp", 0),
            "level": knowledge.get("level", 0),
            "level_name": knowledge.get("level_name", "Pre-School"),
            "level_progress_pct": knowledge.get("level_progress_pct", 0),
            "sessions_completed": knowledge.get("sessions_completed", 0),
            "learning_sessions_completed": knowledge.get("learning_sessions_completed", 0),
            "tasks_completed": knowledge.get("tasks_completed", 0),
            "last_learning_session": knowledge.get("last_learning_session"),
        }
    agent_rows.append(agent_row)

    for path in jsonl_files[:80]:
        if path.name.endswith(".acp-stream.jsonl"):
            continue
        try:
            first_ts = None
            last_ts = None
            task_text = ""
            input_tokens = 0
            output_tokens = 0
            cache_read_tokens = 0
            total_tokens = 0
            models = []
            spawn_count = 0
            has_error = False

            with path.open() as handle:
                for raw_line in handle:
                    row = json.loads(raw_line)
                    row_type = row.get("type")

                    timestamp = row.get("timestamp") or row.get("ts") or row.get("epochMs")
                    if timestamp and not first_ts:
                        first_ts = timestamp
                    if timestamp:
                        last_ts = timestamp

                    if row_type == "model_change":
                        model_id = row.get("modelId")
                        if model_id:
                            models.append(model_id)

                    if row_type != "message":
                        continue

                    message = row.get("message", {})
                    timestamp = message.get("timestamp") or timestamp
                    if timestamp and not first_ts:
                        first_ts = timestamp
                    if timestamp:
                        last_ts = timestamp

                    role = message.get("role")
                    content = message.get("content", [])

                    if role == "user":
                        for block in content if isinstance(content, list) else []:
                            if isinstance(block, dict) and block.get("type") == "text":
                                maybe_task = extract_task_text(block.get("text"))
                                if maybe_task:
                                    task_text = maybe_task

                    if role == "assistant":
                        model_name = message.get("model")
                        if model_name:
                            models.append(model_name)

                        usage = message.get("usage", {})
                        input_tokens += int(usage.get("input") or usage.get("inputTokens") or 0)
                        output_tokens += int(usage.get("output") or usage.get("outputTokens") or 0)
                        cache_read_tokens += int(usage.get("cacheRead") or usage.get("cacheReadTokens") or 0)
                        total_tokens += int(usage.get("totalTokens") or 0)

                        if not usage.get("totalTokens"):
                            total_tokens = input_tokens + output_tokens + cache_read_tokens

                        if usage.get("cost", {}).get("total"):
                            pass

                        for block in content if isinstance(content, list) else []:
                            if isinstance(block, dict) and block.get("type") == "toolCall" and block.get("name") == "sessions_spawn":
                                spawn_count += 1

                    if role == "toolResult" and message.get("isError"):
                        has_error = True

            primary_model = normalize_model_name(models[-1] if models else "local")
            date_created = iso_from_any(first_ts) or iso_from_any(path.stat().st_mtime)
            inventory_match = None
            if isinstance(inventory, dict):
                for entry in inventory.values():
                    if isinstance(entry, dict) and entry.get("sessionId") == path.stem:
                        inventory_match = entry
                        break
            file_age_hours = (datetime.now(timezone.utc) - datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc)).total_seconds() / 3600
            status = guess_status(
                task_text or path.stem,
                has_spawn=spawn_count > 0,
                has_error=has_error,
                is_open=bool(inventory_match),
                file_age_hours=file_age_hours,
            )
            lane = lane_from_status(status)
            date_finished = None if lane in {"todo", "inprogress", "blocked"} else (iso_from_any(last_ts) or iso_from_any(path.stat().st_mtime))
            total_cost = calc_cost(primary_model, input_tokens, output_tokens, cache_read_tokens)
            models_used = sorted({normalize_model_name(model) for model in models if model})
            session_id = path.stem
            child_key = f"agent:{agent_dir.name}:acp:{session_id}"
            parent_session = inventory_match.get("origin", {}).get("from") if inventory_match else None
            if not parent_session:
                parent_session = child_parent_map.get(child_key)

            # Clean up the task name
            readable_name = clean_task_name(task_text, agent_dir.name, session_id)

            # For main agent: if it only spawned tasks (delegation), mark accordingly
            is_delegation = agent_dir.name == "main" and spawn_count > 0
            if is_delegation and readable_name == "Mission Control Data Refresh":
                readable_name = "Heartbeat: Data Refresh & Delegation"

            task = {
                "id": session_id[:20],
                "sessionId": session_id,
                "agent": agent_dir.name,
                "task": readable_name,
                "status": status,
                "lane": lane,
                "dateCreated": date_created,
                "dateFinished": date_finished,
                "startTime": date_created,
                "endTime": date_finished,
                "inputTokens": input_tokens,
                "outputTokens": output_tokens,
                "cachedInputTokens": cache_read_tokens,
                "tokens": total_tokens or (input_tokens + output_tokens + cache_read_tokens),
                "model": primary_model,
                "apiModelUsed": ", ".join(models_used) if models_used else primary_model,
                "modelsUsed": models_used,
                "totalCost": total_cost,
                "transcriptPath": str(path),
                "sizeBytes": path.stat().st_size,
                "isCron": "[cron:" in str(task_text or "").lower(),
                "spawns": spawn_count,
                "parentSession": parent_session or "",
                "projectId": "",
            }
            est_cost, est_eta = estimate_remaining(task)
            if est_cost is not None:
                task["estimatedCostToCompletion"] = est_cost
                task["estimatedTimeToCompletion"] = est_eta

            session_index[session_id] = task
            tasks.append(task)
        except Exception:
            continue

    if isinstance(inventory, dict):
        for entry in inventory.values():
            if not isinstance(entry, dict):
                continue
            session_id = entry.get("sessionId")
            if not session_id or session_id in session_index:
                continue

            primary_model = normalize_model_name(entry.get("model") or entry.get("modelId") or "local")
            date_created = iso_from_any(entry.get("createdAt") or entry.get("updatedAt")) or iso_now()
            status = "in_progress"
            lane = lane_from_status(status)
            task = {
                "id": session_id[:20],
                "sessionId": session_id,
                "agent": agent_dir.name,
                "task": extract_task_text(entry.get("lastPrompt") or entry.get("title") or session_id) or session_id,
                "status": status,
                "lane": lane,
                "dateCreated": date_created,
                "dateFinished": None,
                "startTime": date_created,
                "endTime": None,
                "inputTokens": 0,
                "outputTokens": 0,
                "cachedInputTokens": 0,
                "tokens": 0,
                "model": primary_model,
                "apiModelUsed": primary_model,
                "modelsUsed": [primary_model] if primary_model else [],
                "totalCost": 0.0,
                "transcriptPath": str(session_inventory_path),
                "sizeBytes": session_inventory_path.stat().st_size,
                "isCron": entry.get("origin", {}).get("label") == "cron",
                "spawns": 0,
                "parentSession": entry.get("origin", {}).get("from") or "",
                "projectId": "",
            }
            est_cost, est_eta = estimate_remaining(task)
            if est_cost is not None:
                task["estimatedCostToCompletion"] = est_cost
                task["estimatedTimeToCompletion"] = est_eta
            session_index[session_id] = task
            tasks.append(task)

# Post-processing: fix attribution and clean names
AGENT_LABELS = {
    "main": "Jarvis", "codex": "Coding Agent", "codex-default": "Coding Agent",
    "coding-agent": "Coding Agent", "validation": "Validator",
    "executive-assistant": "Victoria", "cfo": "CFO", "bookkeeper": "Bookkeeper",
    "fin-researcher": "Financial Researcher", "tax-advisor": "Tax Advisor",
    "crypto-analyst": "Crypto Analyst", "stock-analyst": "Stock Analyst",
    "designer": "Designer", "maven": "Maven (CMO)",
    "quill": "Quill", "echo": "Echo", "spark": "Spark", "beacon": "Beacon",
    "lens": "Lens", "pulse": "Pulse", "sentinel": "Sentinel", "herald": "Herald", "scribe": "Scribe",
}

for task in tasks:
    # Relabel codex sessions as coding-agent work (they're delegated from main)
    if task["agent"] in ("codex", "codex-default"):
        task["agent"] = "coding-agent"

    # Skip junk agents
    if task["agent"] in ("acp-codex", "acp-defaultagent", "assistant", "default",
                          "execassistant", "monday-com", "monday-com-agent",
                          "openai-gpt-4o-mini", "task-master", "taskmaster",
                          "your_discord_monitor_agent_id", "discord-chat", "mtp"):
        task["_skip"] = True
        continue

    # Ensure task name is clean
    task["task"] = clean_task_name(task["task"], task["agent"], task.get("sessionId", ""))
    task["projectId"] = guess_project_id(task)

# Filter out junk agents and deduplicate repeated tasks
seen_patterns = {}
cleaned_tasks = []
# Patterns that are heartbeat/system noise — keep max 1 per agent
noise_patterns = ["data refresh", "heartbeat", "discord health check", "health check",
                  "session$", "runtime context"]

for task in tasks:
    if task.get("_skip"):
        continue
    name_lower = task["task"].lower()
    # Check if it's a noise pattern
    is_noise = any(p in name_lower for p in noise_patterns)
    if is_noise or name_lower.endswith("session"):
        key = f"{task['agent']}_{task['task']}"
        if key not in seen_patterns:
            seen_patterns[key] = 0
        seen_patterns[key] += 1
        if seen_patterns[key] <= 2:  # Keep max 2 of each noise type per agent
            cleaned_tasks.append(task)
        continue
    cleaned_tasks.append(task)

tasks = cleaned_tasks

tasks.sort(
    key=lambda task: (
        task.get("dateCreated") or "",
        task.get("dateFinished") or "",
    ),
    reverse=True,
)

manual_projects_path = repo_root / "src" / "data" / "manual-projects.json"
manual_projects = parse_json_file(manual_projects_path) if manual_projects_path.exists() else []

manual_tasks_path = repo_root / "src" / "data" / "manual-tasks.json"
manual_tasks = parse_json_file(manual_tasks_path) if manual_tasks_path.exists() else []
if isinstance(manual_tasks, list):
    manual_task_ids = {t.get("id") for t in manual_tasks}
    # Remove any auto-generated tasks that share an id with a manual task
    tasks = [t for t in tasks if t.get("id") not in manual_task_ids]
    tasks.extend(manual_tasks)

project_groups = defaultdict(list)
for task in tasks:
    if task.get("projectId"):
        project_groups[task["projectId"]].append(task)

project_names = {
    "mission-control": "Mission Control Dashboard",
    "system-ops": "System Operations",
    "str-website": "STR Website - Pineside Cabins",
    "coding": "ACP Coding Delegations",
    "mc-expansion": "Mission Control Expansion Directive",
}

projects = []
for project_id, sessions in sorted(project_groups.items()):
    done_count = sum(1 for session in sessions if session["lane"] == "done")
    active_sessions = [session for session in sessions if session["lane"] != "done"]
    total_cost = round(sum(float(session.get("totalCost") or 0.0) for session in sessions), 4)
    estimated_cost = round(sum(float(session.get("estimatedCostToCompletion") or 0.0) for session in active_sessions), 4)
    models = sorted({model for session in sessions for model in session.get("modelsUsed", []) if model})
    agents_worked = sorted({session.get("agent") for session in sessions if session.get("agent")})
    project = {
        "id": project_id,
        "name": project_names.get(project_id, project_id.replace("-", " ").title()),
        "status": "done" if done_count == len(sessions) else "active",
        "taskCount": len(sessions),
        "doneCount": done_count,
        "activeCount": len(active_sessions),
        "totalCost": total_cost,
        "apiModelsUsed": models,
        "modelsUsed": models,
        "agentsWorkedOn": agents_worked,
        "agents": agents_worked,
        "estimatedCostToCompletion": estimated_cost if active_sessions else None,
        "estimatedTimeToCompletion": f"~{max(1, len(active_sessions) * 15)} min" if active_sessions else None,
        "sessions": sessions,
    }
    projects.append(project)

existing_project_ids = {project["id"] for project in projects}
manual_by_id = {m["id"]: m for m in (manual_projects if isinstance(manual_projects, list) else []) if m.get("id")}
for project in projects:
    manual = manual_by_id.pop(project["id"], None)
    if manual:
        # Merge manual metadata (description, priority, tags) into auto-generated project
        for key in ("description", "priority", "tags", "dependency", "createdAt"):
            if manual.get(key) and not project.get(key):
                project[key] = manual[key]
for manual in manual_by_id.values():
    projects.append(manual)

cron_jobs = []
cron_path = openclaw / "cron" / "jobs.json"
cron_payload = parse_json_file(cron_path) if cron_path.exists() else {}
for job in cron_payload.get("jobs", []) if isinstance(cron_payload, dict) else []:
    cron_jobs.append({
        "id": job.get("id"),
        "name": job.get("name"),
        "enabled": job.get("enabled"),
        "lastStatus": job.get("state", {}).get("lastStatus", "never"),
        "schedule": job.get("schedule", {}).get("expr", job.get("schedule", {}).get("kind", "?")),
        "consecutiveErrors": job.get("state", {}).get("consecutiveErrors", 0),
    })

skills = []
skills_dir = openclaw / "skills"
if skills_dir.exists():
    for skill_dir in sorted(skills_dir.iterdir()):
        skill_file = skill_dir / "SKILL.md"
        if skill_file.exists():
            skills.append({"id": skill_dir.name, "name": skill_dir.name})


def mask_key(value):
    if not value:
        return None
    text = str(value).strip()
    if len(text) <= 5:
        return "•" * len(text)
    return "•" * (len(text) - 5) + text[-5:]


credential_records = []
credential_store = openclaw / "credentials" / "api-keys.json"
store_payload = parse_json_file(credential_store) if credential_store.exists() else {}
for provider, record in (store_payload.get("providers", {}) if isinstance(store_payload, dict) else {}).items():
    key = record.get("key")
    credential_records.append({
        "id": provider,
        "provider": provider,
        "maskedKey": mask_key(key),
        "status": "active" if key else "missing",
        "lastUpdated": record.get("updatedAt") or iso_from_any(record.get("updatedAt")) or iso_now(),
        "lastVerified": record.get("lastVerified") or None,
        "sourcePath": str(credential_store),
        "sourceType": "credential-store",
    })

auth_profiles = openclaw / "agents" / "main" / "agent" / "auth-profiles.json"
auth_payload = parse_json_file(auth_profiles) if auth_profiles.exists() else {}
for provider, record in (auth_payload.get("providers", {}) if isinstance(auth_payload, dict) else {}).items():
    auth = record.get("auth", {}) if isinstance(record, dict) else {}
    key = auth.get("api_key") or auth.get("token") or record.get("key")
    credential_records.append({
        "id": provider,
        "provider": provider,
        "maskedKey": mask_key(key),
        "status": "active" if key else "missing",
        "lastUpdated": iso_from_any(auth_profiles.stat().st_mtime),
        "lastVerified": None,
        "sourcePath": str(auth_profiles),
        "sourceType": "auth-profile",
    })

config_auth = openclaw / "workspace" / "anthropic" / "config" / "auth.json"
config_auth_payload = parse_json_file(config_auth) if config_auth.exists() else {}
for provider, record in config_auth_payload.items() if isinstance(config_auth_payload, dict) else []:
    if provider.startswith("_"):
        continue
    key = None
    if isinstance(record, dict):
        for candidate in ("api_token", "api_key", "bot_token", "access_token", "token", "client_secret"):
            if record.get(candidate):
                key = record.get(candidate)
                break
    credential_records.append({
        "id": provider,
        "provider": provider,
        "maskedKey": mask_key(key),
        "status": "active" if key else "unverified",
        "lastUpdated": iso_from_any(config_auth.stat().st_mtime),
        "lastVerified": None,
        "sourcePath": str(config_auth),
        "sourceType": "workspace-config",
    })

gh_hosts = Path.home() / ".config" / "gh" / "hosts.yml"
if gh_hosts.exists():
    credential_records.append({
        "id": "github",
        "provider": "github",
        "maskedKey": "•••••hosts",
        "status": "active",
        "lastUpdated": iso_from_any(gh_hosts.stat().st_mtime),
        "lastVerified": None,
        "sourcePath": str(gh_hosts),
        "sourceType": "cli-auth",
    })

deduped_credentials = {}
for record in credential_records:
    provider = str(record.get("provider") or "").lower()
    if not provider:
        continue
    current = deduped_credentials.get(provider)
    if current is None or current.get("status") != "active":
        deduped_credentials[provider] = record

data = {
    "generatedAt": generated_at,
    "agents": agent_rows,
    "acpSessions": tasks[:200],
    "projects": projects,
    "cronJobs": cron_jobs,
    "skills": skills,
    "apiCredentials": list(deduped_credentials.values()),
    "metrics": {
        "totalSessions": len(tasks),
        "totalTokens": sum(int(task.get("tokens") or 0) for task in tasks),
        "totalCost": round(sum(float(task.get("totalCost") or 0.0) for task in tasks), 2),
        "activeProjects": sum(1 for project in projects if project.get("status") == "active"),
        "cronJobsEnabled": sum(1 for job in cron_jobs if job.get("enabled")),
    },
}

output_path.write_text(json.dumps(data, indent=2))
projects_output_path.write_text(json.dumps(projects, indent=2))
PYEOF

echo "Generated: $OUTPUT ($(wc -c < "$OUTPUT" | tr -d ' ') bytes)"
echo "Generated: $PROJECTS_OUTPUT ($(wc -c < "$PROJECTS_OUTPUT" | tr -d ' ') bytes)"

if [ -d "$PUBLIC_DIR" ]; then
  cp "$OUTPUT" "$PUBLIC_OUTPUT"
  cp "$PROJECTS_OUTPUT" "$PUBLIC_PROJECTS_OUTPUT"
  echo "Copied to: $PUBLIC_OUTPUT"
  echo "Copied to: $PUBLIC_PROJECTS_OUTPUT"
fi
