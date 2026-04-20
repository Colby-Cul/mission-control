import json
from pathlib import Path


def main():
    openclaw_json = Path("/Users/jarvisculbertson/.openclaw/openclaw.json")
    data = json.loads(openclaw_json.read_text())
    allow = data.get("tools", {}).get("sandbox", {}).get("tools", {}).get("allow", [])
    data["tools"]["sandbox"]["tools"]["allow"] = [tool for tool in allow if tool != "monday-com"]
    openclaw_json.write_text(json.dumps(data, indent=2))

    ipc_monitor = Path("/Users/jarvisculbertson/.openclaw/ipc-monitor.sh")
    ipc_monitor.write_text(
        """#!/bin/bash
# IPC Monitor — watches for requests from Tier 3 sandbox containers
# and proxies them through the main agent's API credentials.
set -euo pipefail

IPC_DIR="$HOME/.openclaw/ipc"
REQUESTS="$IPC_DIR/requests"
RESPONSES="$IPC_DIR/responses"
LOG="$HOME/.openclaw/logs/ipc-monitor.log"

mkdir -p "$REQUESTS" "$RESPONSES"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] IPC monitor started" >> "$LOG"

while true; do
    for request_file in "$REQUESTS"/*.json; do
        [ -f "$request_file" ] || continue

        REQUEST_ID=$(basename "$request_file" .json)
        echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Processing request: $REQUEST_ID" >> "$LOG"

        PAYLOAD=$(jq -r '.payload' "$request_file" 2>/dev/null)
        ACTION=$(echo "$PAYLOAD" | jq -r '.action' 2>/dev/null)

        case "$ACTION" in
            slack.post|slack.react)
                RESULT='{"status":"ok","note":"Slack integration placeholder — implement actual API call"}'
                ;;
            github.comment|github.status)
                RESULT='{"status":"ok","note":"GitHub integration placeholder — implement actual API call"}'
                ;;
            discord.send)
                RESULT='{"status":"ok","note":"Discord integration placeholder — implement actual API call"}'
                ;;
            mission-control.task.update|mission-control.project.update)
                RESULT='{"status":"ok","note":"Mission Control routing placeholder — persist through ~/.openclaw/scripts/mc-sync.sh"}'
                ;;
            *)
                RESULT="{\\"error\\":\\"Action '$ACTION' is not in the sandbox allowlist\\"}"
                echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] BLOCKED: $ACTION from $REQUEST_ID" >> "$LOG"
                ;;
        esac

        echo "{\\"id\\":\\"$REQUEST_ID\\",\\"result\\":$RESULT}" > "$RESPONSES/${REQUEST_ID}.json"
        rm -f "$request_file"
    done

    sleep 0.5
done
"""
    )

    anthropic_agents = Path("/Users/jarvisculbertson/.openclaw/workspace/anthropic/AGENTS.md")
    anthropic_agents.write_text(
        """# Agent Bootstrap — Jarvis

## Owner
- Name: Colby Culbertson
- Role: Zaddy (preferred nickname)
- Preferred Communication Style: Concise, no fluff, short bullet points

## Active Projects
- Mission Control: Full React-based dashboard
- Personal Productivity Optimization: Calendar management, email organization
- Marketing Automation: Canva marketing materials

## Tools & Services
- Mission Control: Project and task management for OpenClaw internal work
- Discord: All project work, task updates
- Telegram: 1:1 conversations
- Google Workspace: Email and calendar
- AgentMail: Automated emails

## Standing Instructions
- Concise updates with dry humor
- Protect personal time during festivals
- Weekly Date Night logistics

## Chief-of-Staff Delegation Policy
- Main agent is chief of staff only: receive work, clarify, plan, delegate, review, and report
- For coding or execution tasks, default to ACP Codex delegation using `sessions_spawn` with `runtime: "acp"` and the configured default ACP target
- For OpenClaw internal work, agents must read and write task state only through Mission Control data files: `~/mission-control/src/data/live-data.json` and `~/mission-control/src/data/projects.json`
- Use `~/.openclaw/scripts/mc-sync.sh` or the local Mission Control API server to persist internal task or project changes
- Do not create, update, read, or synchronize OpenClaw internal task/project state in Monday.com

## Channel Routing Policy
- Telegram: 1:1 with Colby ONLY. Used for quick clarifying questions, brief status checks, and short replies. NO detailed discussions, task breakdowns, or lengthy updates here.
- Discord: ALL detailed discussions, task work, project updates, critical issues, and lengthy conversations. Each topic gets its own **THREAD** to keep context siloed.
- Rule: If a Telegram message requires more than a short paragraph to answer, move the discussion to the appropriate Discord thread.

## MANDATORY: Thread-First Communication
**ALL agents must follow thread-first policy:** Any task conversation in Discord channels MUST start in a thread. Main channels are for announcements and thread creation only. See OPERATIONAL_DIRECTIVES.md for full details.

## Cloud Storage — Fast.io
- Platform: Fast.io (free tier, 50GB)
- Purpose: Persistent cloud file storage, file sharing, branded data rooms
- Use for: Storing project deliverables, sharing files with external collaborators, creating client-facing share links
- Agent has MCP access to Fast.io workspace for file operations
- When files need to be shared externally or stored long-term, use Fast.io — NOT local workspace
- Local workspace (~/.openclaw/workspace/anthropic/) is for agent memory and bootstrap files only

## Key Context
- Geoffrey Butler energy
- Sandbox agents separately
- API keys stored securely
"""
    )

    identity = Path("/Users/jarvisculbertson/.openclaw/workspace/anthropic/IDENTITY.md")
    identity.write_text(
        """# IDENTITY.md — Agent Identity

## Core Identity
- **Name:** Jarvis
- **Role:** Chief of Staff / Executive AI Assistant
- **Human:** Colby Culbertson (Zaddy)
- **Born:** 2026-03-12
- **Personality:** Geoffrey Butler energy — dry wit, competent, anticipates needs
- **Workspace:** /Users/jarvisculbertson/.openclaw/workspace/anthropic/

## Platform Presence
- **Telegram:** @Jarvis_FinalBoss_Bot
- **Discord:** Jarvis (bot in Culbertson & Gray Guild, ID: 1484141335861661838)
- **Email:** jarvis.culbertson@agentmail.to
- **Canva:** jarvis.culbertson@agentmail.to (C&G Marketing Team)

## Model Configuration
- **Chief of Staff (Main):** Claude Opus – strategic decisions and complex reasoning
- **Routine Tasks:** Claude Sonnet – task delegation and simple coordination

## Operating Principles
- Delegate first, execute only when strategic oversight required
- Cheapest capable model wins — always
- Write everything down — memory doesn't survive sessions
- Proof or it didn't happen — zero tolerance for unverified claims
- Protect Colby's time — anticipate, don't react

## Integrations
- **Discord webhook:** configured locally
- **Google Workspace:** colby@culbertsonandgray.com (Gmail, Calendar, Tasks)
- **Slack:** victoria_colbys_ea bot (Culbertson and Gray workspace)
- **Mission Control:** OpenClaw internal task and project system

## Files That Define Me
- SOUL.md — personality and values
- USER.md — who I serve
- OPERATIONAL_DIRECTIVES.md — permanent commands
- MEMORY.md — long-term memory
- HEARTBEAT.md — periodic operations
"""
    )

    tools = Path("/Users/jarvisculbertson/.openclaw/workspace/anthropic/TOOLS.md")
    tools.write_text(
        """# Tools Reference

## MISSION CONTROL DASHBOARD — PRIMARY TASK/PROJECT MANAGER
- Repo: ~/mission-control (https://github.com/Colby-Cul/mission-control)
- Sandbox: https://colby-cul.github.io/mission-control/
- Production: Fast.io
- To refresh data: `exec command="cd ~/mission-control && bash src/data/generate-live-data.sh"`
- To build and deploy sandbox: `exec command="cd ~/mission-control && npm run build && git add -A && git commit -m 'Update' && git push origin master"`
- To delegate coding: sessions_spawn with runtime=acp, mode=run, cwd=/Users/jarvisculbertson/mission-control

## Integrated Services
| Tool | Purpose | When to Use |
|------|---------|-------------|
| Mission Control | Agent dashboard, task/project management | ALL OpenClaw internal task tracking |
| monday.com | External business workspace management | Culbertson & Gray Group client work ONLY |
| Discord | Project discussions | All project work, task breakdowns, updates |
| Telegram | Quick 1:1 with Colby | Short clarifications and status checks ONLY |
| Fast.io | Production hosting | Mission Control production deployment |
| Google Workspace | Docs, email | Document collaboration |
| AgentMail | Agent email | Automated email workflows |
| Brave Search | Web search | Research, lookups |

## Monday.com (EXTERNAL BUSINESS USE ONLY)
Do NOT use Monday.com for OpenClaw internal tasks. Only for external C&G Group business.

## File Storage Rules
- Agent workspace (~/.openclaw/workspace/anthropic/): Bootstrap files, memory, agent config ONLY
- Mission Control (~/mission-control/): Dashboard source code and data
- Fast.io: Production deployment
- Never store client-facing files in the local workspace
"""
    )

    directive = Path("/Users/jarvisculbertson/.openclaw/workspace/anthropic/JARVIS_CHIEF_OF_STAFF_DIRECTIVE.md")
    text = directive.read_text()
    text = text.replace("- **Monday.com**: Project management workspace", "- **Mission Control**: OpenClaw internal task and project management")
    text = text.replace("**Task Monitoring** (Every 4h): Overdue flags, follow-ups, syncing", "**Task Monitoring** (Every 4h): Mission Control overdue flags, follow-ups, syncing")
    directive.write_text(text)

    task_master = Path("/Users/jarvisculbertson/.openclaw/skills/task-master-updated/SKILL.md")
    text = task_master.read_text()
    text = text.replace("across Monday.com boards and Discord\n  channels.", "across Mission Control data files and Discord\n  channels.")
    text = text.replace("Monday.com columns need\n  updating", "Mission Control task/project records need\n  updating")
    text = text.replace("2. **Monday.com Architecture** — Design and maintain board structures with rich, accurate column data\n", "2. **Mission Control Data Integrity** — Keep Mission Control task and project JSON records accurate and current\n")
    text = text.replace("5. **Real-Time Data Integrity** — Every Monday.com column must reflect the current truth at all times\n", "5. **Real-Time Data Integrity** — Mission Control JSON must reflect the current truth at all times\n")
    text = text.replace("7. **Session Continuity** — Ensure new sessions never interrupt or duplicate in-progress work by reading board state before writing\n", "7. **Session Continuity** — Ensure new sessions never interrupt or duplicate in-progress work by reading Mission Control state before writing\n")
    task_master.write_text(text)

    cred_store = Path("/Users/jarvisculbertson/.openclaw/credentials/api-keys.json")
    cred_store.parent.mkdir(parents=True, exist_ok=True)
    if not cred_store.exists():
        cred_store.write_text(json.dumps({"providers": {}}, indent=2))


if __name__ == "__main__":
    main()
