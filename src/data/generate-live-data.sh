#!/bin/bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT="$SCRIPT_DIR/live-data.json"
PUBLIC_OUTPUT="$(cd "$SCRIPT_DIR/../.." && pwd)/public/live-data.json"

if [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "CI detected — skipping live data generation"
  exit 0
fi
if [ ! -d "$HOME/.openclaw" ]; then
  echo "No OpenClaw runtime — skipping"
  exit 0
fi

python3 << 'PYEOF' > "$OUTPUT"
import json, os, re
from pathlib import Path
from datetime import datetime, timezone

openclaw = Path.home() / '.openclaw'
data = {"generatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}

# Pricing per 1M tokens
PRICING = {
    'gpt-4o': {'input': 2.50, 'output': 10.00},
    'gpt-4o-mini': {'input': 0.15, 'output': 0.60},
    'gpt-5.4': {'input': 2.50, 'output': 10.00},
    'claude-opus-4': {'input': 15.00, 'output': 75.00},
    'claude-opus-4-6': {'input': 15.00, 'output': 75.00},
    'claude-sonnet-4': {'input': 3.00, 'output': 15.00},
    'claude-sonnet-4-6': {'input': 3.00, 'output': 15.00},
    'claude-haiku-4-5': {'input': 0.80, 'output': 4.00},
    'codex': {'input': 2.50, 'output': 10.00},
    'acp-runtime': {'input': 0, 'output': 0},
}

def calc_cost(model, input_tokens, output_tokens):
    model_lower = (model or '').lower().replace(' ', '-')
    for key, price in PRICING.items():
        if key in model_lower:
            return round((input_tokens * price['input'] + output_tokens * price['output']) / 1_000_000, 4)
    return 0.0

# Gateway health
try:
    import urllib.request
    resp = urllib.request.urlopen('http://127.0.0.1:18789/health', timeout=5)
    data['gateway'] = json.loads(resp.read())
except Exception as e:
    data['gateway'] = {'ok': False, 'error': str(e)}

# Real agents
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

# ACP Sessions — scan ALL agent session directories
acp_tasks = []
KNOWN_AGENTS = ['main','coding-agent','validation','executive-assistant','cfo','bookkeeper',
    'fin-researcher','tax-advisor','crypto-analyst','stock-analyst','designer','codex']

def parse_agent_sessions(agent_id, sessions_dir, limit=60):
    results = []
    if not sessions_dir.exists():
        return results
    for sf in sorted(sessions_dir.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True)[:limit]:
        try:
            lines = sf.read_text().strip().split('\n')
            task_desc = ''
            spawns = []
            total_input = 0
            total_output = 0
            total_tokens = 0
            model_used = 'codex' if agent_id == 'codex' else ''
            models_seen = set()
            is_cron = False
            parent_session = None
            first_ts = None
            last_ts = None
            last_user_task = ''

            for line in lines:
                d = json.loads(line)
                if d.get('type') == 'message':
                    msg = d.get('message', {})
                    ts = msg.get('timestamp')
                    if ts and not first_ts:
                        first_ts = ts
                    if ts:
                        last_ts = ts

                    if msg.get('role') == 'user':
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for c in content:
                                if isinstance(c, dict) and c.get('type') == 'text':
                                    text = c['text']
                                    skip = text.startswith('Conversation info') or text.startswith('Sender') or text.startswith('A new session') or text.startswith('Read HEARTBEAT')
                                    if text.startswith('[cron:'):
                                        is_cron = True
                                        m = re.match(r'\[cron:[^\]]+\]\s*(.*)', text)
                                        if m:
                                            task_desc = m.group(1).strip()[:150]
                                            last_user_task = task_desc
                                    elif not skip:
                                        cleaned = text[:150]
                                        m2 = re.match(r'\[.*?\]\s*(.*)', cleaned)
                                        if m2: cleaned = m2.group(1)
                                        if not task_desc:
                                            task_desc = cleaned
                                        last_user_task = cleaned

                    if msg.get('role') == 'assistant':
                        content = msg.get('content', [])
                        if isinstance(content, list):
                            for c in content:
                                if isinstance(c, dict) and c.get('type') == 'toolCall' and c.get('name') == 'sessions_spawn':
                                    args = c.get('arguments', {})
                                    spawns.append({'task': args.get('task', '')[:150], 'cwd': args.get('cwd', '')})
                        usage = msg.get('usage', {})
                        inp = usage.get('input', 0) or usage.get('inputTokens', 0)
                        out = usage.get('output', 0) or usage.get('outputTokens', 0)
                        total_input += inp
                        total_output += out
                        total_tokens += usage.get('totalTokens', 0) or (inp + out)
                        m = msg.get('model', '')
                        if m:
                            models_seen.add(m)
                            if not model_used: model_used = m

            # Prefer the last meaningful user task over heartbeat preamble
            if last_user_task and last_user_task != task_desc:
                task_desc = last_user_task
            if not task_desc and not spawns:
                continue

            mtime = datetime.fromtimestamp(sf.stat().st_mtime, tz=timezone.utc)
            cost = calc_cost(model_used, total_input, total_output)
            status = 'delegated' if spawns else 'done'

            entry = {
                'id': sf.stem[:20],
                'sessionId': sf.stem,
                'agent': agent_id,
                'task': task_desc or (spawns[0]['task'] if spawns else 'Unknown task'),
                'status': status,
                'dateCreated': first_ts if isinstance(first_ts, (int, float)) and first_ts > 1e9 else mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'dateFinished': last_ts if isinstance(last_ts, (int, float)) and last_ts > 1e9 else (mtime.strftime("%Y-%m-%dT%H:%M:%SZ") if status == 'done' else None),
                'startTime': mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'endTime': mtime.strftime("%Y-%m-%dT%H:%M:%SZ"),
                'inputTokens': total_input,
                'outputTokens': total_output,
                'tokens': total_tokens,
                'model': model_used,
                'modelsUsed': sorted(models_seen),
                'totalCost': cost,
                'transcriptPath': str(sf),
                'sizeBytes': sf.stat().st_size,
                'isCron': is_cron,
                'spawns': len(spawns),
                'parentSession': parent_session,
            }
            if status == 'delegated' and total_tokens > 0:
                entry['estCostToCompletion'] = round(cost * 0.3, 4)
                entry['estTimeToCompletion'] = '~15 min'

            results.append(entry)
        except Exception:
            continue
    return results

for agent_id in KNOWN_AGENTS:
    sessions_dir = openclaw / 'agents' / agent_id / 'sessions'
    limit = 60 if agent_id == 'main' else 30
    acp_tasks.extend(parse_agent_sessions(agent_id, sessions_dir, limit))

acp_tasks.sort(key=lambda t: t.get('endTime', ''), reverse=True)
data['acpSessions'] = acp_tasks[:100]

# Projects with cost/model/agent metadata
def make_project(pid, name, sessions, assigned_agents):
    total_cost = sum(t.get('totalCost', 0) for t in sessions)
    all_models = sorted(set(m for t in sessions for m in t.get('modelsUsed', [])))
    all_agents = sorted(set(t.get('agent', '') for t in sessions) | set(assigned_agents))
    done = [t for t in sessions if t['status'] == 'done']
    active = [t for t in sessions if t['status'] != 'done']
    est_cost = sum(t.get('estCostToCompletion', 0) for t in active)
    return {
        'id': pid, 'name': name, 'status': 'active' if active else 'done',
        'agents': all_agents, 'taskCount': len(sessions), 'doneCount': len(done),
        'activeCount': len(active), 'totalCost': round(total_cost, 4),
        'modelsUsed': all_models, 'agentsWorkedOn': all_agents,
        'estCostToCompletion': round(est_cost, 4) if active else None,
        'estTimeToCompletion': f'~{len(active) * 15} min' if active else None,
    }

projects = []
mc_sessions = [t for t in acp_tasks if 'mission' in t.get('task','').lower() or 'mission-control' in t.get('transcriptPath','').lower()]
projects.append(make_project('mission-control', 'Mission Control Dashboard', mc_sessions, ['main', 'worker']))

cron_sessions = [t for t in acp_tasks if t.get('isCron')]
if cron_sessions:
    projects.append(make_project('system-ops', 'System Operations', cron_sessions, ['main']))

str_sessions = [t for t in acp_tasks if any(kw in t.get('task','').lower() for kw in ['str ', 'str-business', 'lodgify', 'pineside', 'graeagle', 'northstar', 'rental', 'airbnb', 'booking.com'])]
if str_sessions:
    projects.append(make_project('str-website', 'STR Website - Pineside Cabins', str_sessions, ['main', 'worker']))

coding_sessions = [t for t in acp_tasks if t.get('spawns', 0) > 0 and t not in mc_sessions and t not in str_sessions]
if coding_sessions:
    projects.append(make_project('coding', 'ACP Coding Delegations', coding_sessions, ['main', 'worker']))

# Also load any manually-added projects from a sidecar file
import os as _os
manual_projects_path = _os.path.join(_os.path.dirname(_os.path.abspath('/dev/null')), str(Path.home() / 'mission-control/src/data/manual-projects.json'))
try:
    manual_path = Path.home() / 'mission-control/src/data/manual-projects.json'
    if manual_path.exists():
        with open(manual_path) as _f:
            for mp in json.load(_f):
                if not any(p['id'] == mp.get('id') for p in projects):
                    projects.append(mp)
except Exception:
    pass

data['projects'] = projects

# Cron jobs
cron_path = openclaw / 'cron' / 'jobs.json'
if cron_path.exists():
    with open(cron_path) as f:
        cron = json.load(f)
    data['cronJobs'] = [{'name': j.get('name'), 'enabled': j.get('enabled'),
        'lastStatus': j.get('state',{}).get('lastStatus','never'),
        'schedule': j.get('schedule',{}).get('expr', j.get('schedule',{}).get('kind','?')),
        'consecutiveErrors': j.get('state',{}).get('consecutiveErrors',0)}
        for j in cron.get('jobs',[])]

# Skills
skills = []
sd = openclaw / 'skills'
if sd.exists():
    seen_names = set()
    for d in sorted(sd.iterdir()):
        sm = d / 'SKILL.md'
        if sm.exists() and sm.is_file():  # skip broken symlinks
            name = d.name
            try:
                for line in sm.read_text().split('\n'):
                    if line.startswith('name:'): name = line.split(':',1)[1].strip(); break
            except: pass
            # Deduplicate by name — keep the first occurrence
            if name not in seen_names:
                seen_names.add(name)
                skills.append({'id': d.name, 'name': name})
data['skills'] = skills

# Worker node
try:
    import subprocess
    r = subprocess.run(['ssh','-o','ConnectTimeout=3','jarvis-worker@Jarvis-Worker.local','hostname'],
        capture_output=True, text=True, timeout=10)
    data['workerNode'] = {'connected': r.returncode == 0, 'hostname': r.stdout.strip()}
except Exception as e:
    data['workerNode'] = {'connected': False, 'error': str(e)}

# API credentials inventory (for API Skills page — last 5 chars only)
apis = []
def mask_key(key):
    if not key or len(key) < 6: return '•••••'
    return '•' * (len(key) - 5) + key[-5:]

# Check auth-profiles.json
auth_path = openclaw / 'agents' / 'main' / 'agent' / 'auth-profiles.json'
if auth_path.exists():
    with open(auth_path) as f:
        ap = json.load(f)
    for pid, profile in ap.get('profiles', {}).items():
        provider = profile.get('provider', pid.split(':')[0])
        key = profile.get('key', profile.get('access', ''))
        apis.append({
            'id': pid, 'provider': provider,
            'maskedKey': mask_key(key) if key else None,
            'status': 'active' if key else 'missing',
            'lastUpdated': datetime.fromtimestamp(auth_path.stat().st_mtime).isoformat(),
        })

# Check channel tokens in openclaw.json
if config_path.exists():
    channels = config.get('channels', {})
    for ch_name, ch_config in channels.items():
        token = ch_config.get('botToken', ch_config.get('appToken', ''))
        if token:
            apis.append({
                'id': f'channel:{ch_name}', 'provider': ch_name,
                'maskedKey': mask_key(token),
                'status': 'active',
                'lastUpdated': datetime.fromtimestamp(config_path.stat().st_mtime).isoformat(),
            })

# Monday.com token
monday_path = Path.home() / '.monday_token'
if monday_path.exists():
    token = monday_path.read_text().strip()
    apis.append({
        'id': 'monday-com', 'provider': 'monday.com',
        'maskedKey': mask_key(token),
        'status': 'active',
        'lastUpdated': datetime.fromtimestamp(monday_path.stat().st_mtime).isoformat(),
    })

# Discord (from channels config)
discord_cfg = config.get('channels', {}).get('discord', {})
discord_accounts = discord_cfg.get('accounts', {})
if discord_cfg.get('enabled'):
    apis.append({
        'id': 'channel:discord', 'provider': 'discord',
        'maskedKey': 'Bot connected via OAuth',
        'status': 'active',
        'lastUpdated': datetime.fromtimestamp(config_path.stat().st_mtime).isoformat(),
    })

# Additional known integrations
extra_integrations = [
    ('supabase', Path.home() / '.supabase' / 'access-token', 'supabase'),
    ('github', Path.home() / '.config' / 'gh' / 'hosts.yml', 'github'),
    ('vercel', Path.home() / '.local' / 'share' / 'com.vercel.cli' / 'auth.json', 'vercel'),
]
for int_id, int_path, provider in extra_integrations:
    if int_path.exists():
        apis.append({
            'id': int_id, 'provider': provider,
            'maskedKey': 'Configured via CLI',
            'status': 'active',
            'lastUpdated': datetime.fromtimestamp(int_path.stat().st_mtime).isoformat(),
        })

# Brave Search (from plugins)
brave_cfg = config.get('plugins', {}).get('entries', {}).get('brave', {})
brave_key = brave_cfg.get('config', {}).get('webSearch', {}).get('apiKey', '')
if brave_key:
    apis.append({
        'id': 'brave-search', 'provider': 'brave',
        'maskedKey': mask_key(brave_key),
        'status': 'active',
        'lastUpdated': datetime.fromtimestamp(config_path.stat().st_mtime).isoformat(),
    })

# Grafana
grafana_token_path = openclaw / 'workspace' / 'anthropic' / '.grafana-token'
if grafana_token_path.exists():
    apis.append({
        'id': 'grafana', 'provider': 'grafana',
        'maskedKey': mask_key(grafana_token_path.read_text().strip()),
        'status': 'active',
        'lastUpdated': datetime.fromtimestamp(grafana_token_path.stat().st_mtime).isoformat(),
    })

# Lodgify
lodgify_path = Path.home() / '.lodgify_token'
if lodgify_path.exists():
    apis.append({
        'id': 'lodgify', 'provider': 'lodgify',
        'maskedKey': mask_key(lodgify_path.read_text().strip()),
        'status': 'active',
        'lastUpdated': datetime.fromtimestamp(lodgify_path.stat().st_mtime).isoformat(),
    })

data['apiCredentials'] = apis

# Metrics
data['metrics'] = {
    'totalSessions': len(acp_tasks),
    'totalTokens': sum(t.get('tokens', 0) for t in acp_tasks),
    'totalCost': round(sum(t.get('totalCost', 0) for t in acp_tasks), 2),
    'activeProjects': len([p for p in projects if p['status'] == 'active']),
    'cronJobsEnabled': len([j for j in data.get('cronJobs',[]) if j.get('enabled')]),
}

print(json.dumps(data, indent=2))
PYEOF

echo "Generated: $OUTPUT ($(wc -c < "$OUTPUT" | tr -d ' ') bytes)"
if [ -d "$(dirname "$PUBLIC_OUTPUT")" ]; then
  cp "$OUTPUT" "$PUBLIC_OUTPUT"
  echo "Copied to: $PUBLIC_OUTPUT"
fi
