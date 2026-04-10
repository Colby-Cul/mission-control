# OpenClaw Cron Job Configuration

## Location
OpenClaw cron jobs are configured in: `/Users/jarvisculbertson/.openclaw/cron/jobs.json`

## Structure
- `jobs.json`: Main configuration file (JSON format)
- `jobs.json.bak`: Backup of previous configuration
- `runs/`: Execution logs for each cron job

## Checking Status
```bash
# List all cron jobs
openclaw cron list --json

# Check cron service status
openclaw cron status

# View specific job
openclaw cron list --json | jq '.jobs[] | select(.name == "job-name")'
```

## Common Jobs
1. **victoria-email-monitor**: Every 10 minutes
2. **discord-monitor**: Every 30 minutes
3. **Mission Control auto-update cycle**: Hourly
4. **Review Mission Control**: Mondays at 9:00 AM

## Troubleshooting
If cron jobs aren't running:
1. Check service status: `openclaw cron status`
2. Verify next wake time in status output
3. Check logs: `/tmp/openclaw/openclaw-*.log`
4. Verify file permissions on `/Users/jarvisculbertson/.openclaw/cron/`
