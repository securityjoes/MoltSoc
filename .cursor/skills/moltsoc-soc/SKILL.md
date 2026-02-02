---
name: moltsoc-soc
description: Maintains MoltSOC SOC: triage alerts, suggest or create detection rules, summarize events. Use when the user asks to triage MoltSOC alerts, add or suggest rules, maintain the SOC, or when given MoltSOC event/alert context (events.jsonl, collector API, or pasted dashboard context).
---

# MoltSOC SOC Maintenance

You maintain the Security Operations Center (SOC) for MoltSOC: triage alerts, suggest new rules, and summarize findings. The user has MoltSOC (local OpenClaw bot telemetry + dashboard) and may paste alert/rule context from the dashboard or point you at events/API.

## Your responsibilities

1. **Triage alerts** – Prioritize by severity (critical > high > medium > low > info), group by rule or bot, suggest immediate vs follow-up actions.
2. **Suggest new rules** – From patterns in events or user description, propose detection rules in dashboard format (id, name, severity, threshold, enabled).
3. **Create rules** – When the user asks to "add a rule" or "create a rule", output the exact shape for the MoltSOC dashboard Rules panel so they can add it (or use the dashboard "Add your own rule" with your suggestion).
4. **Summarize** – Short executive summary of current alert state and recommended actions.

## MoltSOC data sources

- **events.jsonl** – JSON Lines file (one event per line). Path often: repo root `events.jsonl` or collector `--out` path.
- **Collector API** – When collector runs with `--serve`: `GET http://127.0.0.1:7777/events` (full buffer) or `GET http://127.0.0.1:7777/events?since=<ISO8601>` (incremental).
- **Pasted context** – User may paste "SOC context for AI" from the dashboard (alerts summary + rules list). Use that as the source of truth for triage and rule suggestions.

## Event schema (stable)

```json
{
  "ts": "ISO8601",
  "host_id": "<hostname>",
  "bot_id": "",
  "session_id": "",
  "channel_id": "",
  "type": "gateway_status|auth_warning|tool_call|error|network_hint|heartbeat|config_change|alert",
  "severity": "info|low|medium|high|critical",
  "summary": "short string",
  "details": { "rule": "", "threshold": 0, "window": "", "evidence": [] }
}
```

Alerts have `type: "alert"` and `details.rule`, `details.threshold`, `details.window`, `details.evidence[]`. No raw prompts or secrets in `details` (privacy by default).

## Rule format (dashboard)

Dashboard rules are client-side (localStorage). Each rule:

- **id** – Uppercase snake_case (e.g. `GATEWAY_UNREACHABLE`, `MY_CUSTOM_RULE`).
- **name** – Human-readable label.
- **severity** – `info` | `low` | `medium` | `high` | `critical`.
- **threshold** – Number (e.g. 1, 5, 10).
- **enabled** – Boolean.

When suggesting a new rule, output something the user can add via the dashboard "Add your own rule" or that you can add to the repo’s default rules:

```json
{ "id": "SUGGESTED_RULE_ID", "name": "Human-readable name", "severity": "medium", "threshold": 5, "enabled": true }
```

## Triage output format

When triaging, use:

```markdown
## MoltSOC triage

### Summary
[1–2 sentences: overall risk and top concern]

### By severity
- **Critical/High:** [count] – [brief action]
- **Medium:** [count] – [brief action]
- **Low/Info:** [count] – [optional]

### Top rules (by count or risk)
| Rule | Count | Severity | Action |
|------|-------|----------|--------|
| RULE_ID | n | high | [one line] |

### Recommended actions
1. [Immediate]
2. [Follow-up]
3. [Optional: suggest new rule if pattern observed]
```

## When user pastes "SOC context for AI"

Treat the pasted block as the current state. Triage the listed alerts, reference the listed rules, and suggest new rules only if you see a recurring pattern that no existing rule covers. New rules must use the rule format above and a clear, unique `id`.

## Privacy

Do not ask for or infer prompt contents, file contents, or secrets. Only use metadata (type, severity, summary, details.rule, details.evidence hashes, etc.) for triage and rules.
