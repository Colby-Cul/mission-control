#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$SCRIPT_DIR/live-data.json"

python3 << 'PYEOF' > "$OUTPUT"
import json, os, re
from pathlib import Path
from datetime import datetime, timezone

openclaw = Path.home() / '.openclaw'
data = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

# --- Gateway health ---
try:
    import urllib.request
    resp = urllib.request.urlopen('http://127.0.0.1:18789/health', timeout=5)
    data['gateway'] = json.loads(resp.read())
except Exception as e:
    data['gateway'] = {'ok': False, 'error': str(e)}

# --- Real agents ---
config_path = openclaw / 'openclaw.json'
agents = []
if config_path.exists():
    with open(config_path) as f:
        config = json.load(f)
    for a in config.get('agents', {}).get('list', []):
        aid = a['id']
        sd = openclaw / 'agents' / aid / 'sessions'
        sc = len(list(sd.glob('*.jsonl'))) if sd.exists() else 0
        agents.append({'id': aid, 'name': a.get('name', aid), 'model': a.get('model', '?'), 'sessionCount': sc})
data['agents'] = agents

# --- ACP Sessions (real task data) ---
acp_tasks = []

# Scan main agent sessions for spawn calls and their results
main_sessions = openclaw / 'agents' / 'main' / 'sessions'
if main_sessions.exists():
    session_files = sorted(main_sessions.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True)[:50]
    for sf in session_files:
        try:
            lines = sf.read_text().strip().split('\n')
            task_desc = ''
            session_key = sf.stem
            spawns = []
            total_tokens = 0
            model_used = ''
            is_cron = False

            for line in lines:
                d = json.loads(line)
                if d.get('type') == 'message':
                    msg = d.get('message', {})
                    if msg.get('role') == 'user':
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for c in content:
                                if isinstance(c, dict) and c.get('type') == 'text' and not task_desc:
                                    text = c['text']
                                    # Extract task from cron prefix or user message
                                    if text.startswith('[cron:'):
                                        is_cron = True
                                        m = re.match(r'\[cron:[^\]]+\]\s*(.*)', text)
                                        if m:
                                            task_desc = m.group(1).strip()[:120]
                                    elif not text.startswith('Conversation info') and not text.startswith('Sender') and not text.startswith('A new session'):
                                        task_desc = text[:120]
                                        # Strip timestamp prefix
                                        m2 = re.match(r'\[.*?\]\s*(.*)', task_desc)
                                        if m2:
                                            task_desc = m2.group(1)
                    if msg.get('role') == 'assistant':
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for c in content:
                                if isinstance(c, dict) and c.get('type') == 'toolCall' and c.get('name') == 'sessions_spawn':
                                    args = c.get('arguments', {})
                                    spawns.append({
                                        'task': args.get('task', '')[:120],
                                        'runtime': args.get('runtime', ''),
                                        'cwd': args.get('cwd', ''),
                                    })
                        usage = msg.get('usage', {})
                        total_tokens += usage.get('totalTokens', 0)
                        if not model_used and msg.get('model'):
                            model_used = msg.get('model', '')

            if not task_desc and not spawns:
                continue

            mtime = datetime.fromtimestamp(sf.stat().st_mtime, tz=timezone.utc)
            ctime_ts = sf.stat().st_mtime - (sf.stat().st_size / 500)  # rough start estimate
            
            status = 'done'
            if spawns:
                status = 'delegated'
            
            entry = {
                'id': session_key[:20],
                'sessionId': session_key,
                'agent': 'main',
                'task': task_desc or (spawns[0]['task'] if spawns else 'Unknown task'),
                'status': status,
                'startTime': datetime.fromtimestamp(ctime_ts, tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
                'endTime': mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'tokens': total_tokens,
                'model': model_used,
                'transcriptPath': str(sf),
                'sizeBytes': sf.stat().st_size,
                'isCron': is_cron,
                'spawns': len(spawns),
            }
            acp_tasks.append(entry)
        except Exception:
            continue

# Also scan codex sessions
codex_dir = openclaw / 'agents' / 'codex' / 'sessions'
if codex_dir.exists():
    for sf in sorted(codex_dir.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True)[:30]:
        try:
            lines = sf.read_text().strip().split('\n')
            task_desc = ''
            total_tokens = 0
            model_used = 'codex'
            for line in lines:
                d = json.loads(line)
                if d.get('type') == 'message':
                    msg = d.get('message', {})
                    if msg.get('role') == 'assistant':
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for c in content:
                                if isinstance(c, dict) and c.get('type') == 'text' and not task_desc:
                                    task_desc = c['text'][:120]
                        usage = msg.get('usage', {})
                        total_tokens += usage.get('totalTokens', 0)
            
            mtime = datetime.fromtimestamp(sf.stat().st_mtime, tz=timezone.utc)
            acp_tasks.append({
                'id': sf.stem[:20],
                'sessionId': sf.stem,
                'agent': 'codex',
                'task': task_desc or 'ACP Codex execution',
                'status': 'done',
                'startTime': mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'endTime': mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'tokens': total_tokens,
                'model': model_used,
                'transcriptPath': str(sf),
                'sizeBytes': sf.stat().st_size,
                'isCron': False,
                'spawns': 0,
            })
        except Exception:
            continue

# Sort by endTime descending
acp_tasks.sort(key=lambda t: t.get('endTime', ''), reverse=True)
data['acpSessions'] = acp_tasks[:80]  # Cap at 80 most recent

# --- Projects (derived from real state) ---
projects = []
# Mission Control project
mc_sessions = [t for t in acp_tasks if 'mission' in t.get('task','').lower() or 'mission-control' in t.get('transcriptPath','').lower()]
projects.append({
    'id': 'mission-control',
    'name': 'Mission Control Dashboard',
    'status': 'active',
    'agents': ['main', 'worker'],
    'taskCount': len(mc_sessions),
    'doneCount': len([t for t in mc_sessions if t['status'] == 'done']),
    'activeCount': len([t for t in mc_sessions if t['status'] == 'delegated']),
})

# Monday.com integration project
monday_sessions = [t for t in acp_tasks if 'monday' in t.get('task','').lower()]
if monday_sessions:
    projects.append({
        'id': 'monday-integration',
        'name': 'Monday.com Integration',
        'status': 'active',
        'agents': ['main'],
        'taskCount': len(monday_sessions),
        'doneCount': len([t for t in monday_sessions if t['status'] == 'done']),
        'activeCount': 0,
    })

# System operations (cron jobs)
cron_sessions = [t for t in acp_tasks if t.get('isCron')]
if cron_sessions:
    projects.append({
        'id': 'system-ops',
        'name': 'System Operations (Cron)',
        'status': 'active',
        'agents': ['main'],
        'taskCount': len(cron_sessions),
        'doneCount': len(cron_sessions),
        'activeCount': 0,
    })

# General coding delegations
coding_sessions = [t for t in acp_tasks if t.get('spawns', 0) > 0 and t not in mc_sessions]
if coding_sessions:
    projects.append({
        'id': 'coding-delegations',
        'name': 'ACP Coding Delegations',
        'status': 'active',
        'agents': ['main', 'worker', 'validation'],
        'taskCount': len(coding_sessions),
        'doneCount': len([t for t in coding_sessions if t['status'] == 'done']),
        'activeCount': len([t for t in coding_sessions if t['status'] == 'delegated']),
    })

data['projects'] = projects

# --- Cron jobs ---
cron_path = openclaw / 'cron' / 'jobs.json'
if cron_path.exists():
    with open(cron_path) as f:
        cron = json.load(f)
    data['cronJobs'] = [{'name': j.get('name'), 'enabled': j.get('enabled'),
        'lastStatus': j.get('state',{}).get('lastStatus','never'),
        'schedule': j.get('schedule',{}).get('expr', j.get('schedule',{}).get('kind','?')),
        'consecutiveErrors': j.get('state',{}).get('consecutiveErrors', 0)}
        for j in cron.get('jobs',[])]

# --- Skills ---
skills = []
sd = openclaw / 'skills'
if sd.exists():
    for d in sorted(sd.iterdir()):
        sm = d / 'SKILL.md'
        if sm.exists():
            name = d.name
            try:
                for line in sm.read_text().split('\n'):
                    if line.startswith('name:'):
                        name = line.split(':',1)[1].strip()
                        break
            except: pass
            skills.append({'id': d.name, 'name': name})
data['skills'] = skills

# --- Worker node ---
try:
    import subprocess
    r = subprocess.run(['ssh','-o','ConnectTimeout=3','jarvis-worker@Jarvis-Worker.local','hostname'],
        capture_output=True, text=True, timeout=10)
    data['workerNode'] = {'connected': r.returncode == 0, 'hostname': r.stdout.strip()}
except Exception as e:
    data['workerNode'] = {'connected': False, 'error': str(e)}

# --- Summary metrics ---
data['metrics'] = {
    'totalSessions': len(acp_tasks),
    'totalTokens': sum(t.get('tokens', 0) for t in acp_tasks),
    'activeProjects': len(projects),
    'cronJobsEnabled': len([j for j in data.get('cronJobs',[]) if j.get('enabled')]),
    'cronJobsErroring': len([j for j in data.get('cronJobs',[]) if j.get('consecutiveErrors',0) > 0]),
}

print(json.dumps(data, indent=2))
PYEOF

echo "Generated: $OUTPUT ($(wc -c < "$OUTPUT" | tr -d ' ') bytes)"
