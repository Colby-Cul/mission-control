#!/bin/bash
#!/bin/bash
set -euo pipefail
OUTPUT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/live-data.json"

python3 << 'PYEOF' > "$OUTPUT"
import json, os, subprocess
from pathlib import Path
from datetime import datetime, UTC

openclaw = Path.home() / '.openclaw'
data = {"generatedAt": datetime.now(UTC).isoformat().replace("+00:00", "Z")}

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

# Cron jobs
cron_path = openclaw / 'cron' / 'jobs.json'
if cron_path.exists():
    with open(cron_path) as f:
        cron = json.load(f)
    data['cronJobs'] = [{'name': j.get('name'), 'enabled': j.get('enabled'),
        'lastStatus': j.get('state',{}).get('lastStatus','never')} for j in cron.get('jobs',[])]

# Skills
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

# ACP sessions
cd = openclaw / 'agents' / 'codex' / 'sessions'
sessions = []
if cd.exists():
    for f in sorted(cd.glob('*.jsonl'), key=lambda p: p.stat().st_mtime, reverse=True)[:10]:
        sessions.append({'id': f.stem, 'sizeBytes': f.stat().st_size,
            'lastModified': datetime.fromtimestamp(f.stat().st_mtime).isoformat(),
            'transcriptPath': str(f)})
data['acpSessions'] = sessions

# Worker node
try:
    r = subprocess.run(['ssh','-o','ConnectTimeout=3','jarvis-worker@Jarvis-Worker.local','hostname'],
        capture_output=True, text=True, timeout=10)
    data['workerNode'] = {'connected': r.returncode == 0, 'hostname': r.stdout.strip()}
except Exception as e:
    data['workerNode'] = {'connected': False, 'error': str(e)}

# Monday.com boards (real data)
try:
    import sys
    sys.path.insert(0, str(Path.home() / 'Library/Python/3.14/lib/python/site-packages'))
    from monday_api import MondayClient
    c = MondayClient()
    boards = c.query('query { boards(limit: 10, workspace_ids: [14720402]) { id name } }')
    data['mondayBoards'] = boards.get('data',{}).get('boards',[])
except Exception as e:
    data['mondayBoards'] = []

print(json.dumps(data, indent=2))
PYEOF

echo "Generated: $OUTPUT ($(wc -c < "$OUTPUT" | tr -d ' ') bytes)"
