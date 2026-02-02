# MoltSOC v0 (local-first)

Lightweight local monitoring for OpenClaw bots/agents: a collector that produces security-relevant telemetry and a static dashboard to visualize it and raise alerts.

- **No cloud.** No AWS, no accounts, no registration.
- **Runs locally on Windows** (PowerShell). No admin required.
- **Privacy by default:** no prompt or file contents; metadata only.
- **Output:** JSON Lines file (`events.jsonl`) and optional HTTP at `http://127.0.0.1:7777` (GET /events?since=, GET /stream SSE, GET /health).

---

## Dashboard: separate vs OpenClaw integration

**Current setup:** MoltSOC has its **own dashboard** (Vite + React on port 5173). OpenClaw (if it has a dashboard) runs separately. You open two URLs when using both.

**Could we inject MoltSOC into the existing OpenClaw dashboard?**

- **If OpenClaw has a plugin/extension API** – Best UX would be to add MoltSOC as a tab or panel inside the OpenClaw dashboard. One place, one URL. That requires OpenClaw to support plugins and to load our bundle. We would not fork the main project; we would ship a MoltSOC “plugin” that the OpenClaw dashboard loads.
- **If OpenClaw has no plugin API and we’re not part of the main project** – Injecting would mean forking or patching OpenClaw’s dashboard and maintaining that fork. That’s fragile (their updates break our patch) and unclear from an ownership/collaboration perspective. **Not recommended.**

**Recommended route (UX + usability):**

1. **Keep the separate MoltSOC dashboard** for now. It’s maintainable, independent, and doesn’t depend on OpenClaw’s internals. You get a clear “SOC” surface (alerts, rules, map, AI context) without touching the main OpenClaw repo.
2. **Improve the “single experience”** without merging codebases:
   - **One-command startup:** Run collector + MoltSOC dashboard (and optionally open the browser). We already document `npm run collector -- --serve` and `npm run dev`; you can add a small launcher script that starts both and opens `http://localhost:5173`.
   - **Cross-links:** In the MoltSOC dashboard, add an optional “Open OpenClaw” link (configurable URL) so you can jump to the OpenClaw dashboard from one place. If OpenClaw’s dashboard later adds a “MoltSOC” or “SOC” link that points to `http://localhost:5173`, you effectively have two entry points that reference each other.
3. **If OpenClaw later adds a plugin API** – We can add an official “MoltSOC tab” plugin that the OpenClaw dashboard loads, giving a single-dashboard UX without forking.

**Summary:** Staying separate is the best route for usability and maintainability when we’re not part of the main project. Improve discovery and flow with a launcher and cross-links; consider a plugin only if OpenClaw supports it.

## Does OpenClaw have a plugin API? (checked 2025)

**Yes.** OpenClaw (docs at [docs.clawd.bot](https://docs.clawd.bot)) has a full **plugin (extensions) system**:

- **Docs:** [Plugins](https://docs.clawd.bot/plugins), [Plugin Manifest](https://docs.clawd.bot/plugins/manifest)
- **What plugins can register:** Gateway RPC methods, **Gateway HTTP handlers**, agent tools, CLI commands, messaging channels, provider auth, auto-reply commands, background services, Skills (SKILL.md dirs). Control UI gets **config schema + labels** for each plugin's config (no custom UI markup).
- **Discovery:** `~/.openclaw/extensions/`, `plugins.load.paths`, npm `@openclaw/*` via `openclaw plugins install @openclaw/voice-call`.
- **Dashboard UI extension:** The plugin API does **not** document a way to add a **dashboard tab** or **custom React view** inside the OpenClaw Control UI. Plugins can influence the Control UI only via `configSchema` and `uiHints` (so plugin config forms get nice labels). There is no public "register a dashboard tab" or "inject a panel" API.

**Implications for MoltSOC:**

- **Injecting MoltSOC as a tab in the OpenClaw dashboard:** Not supported by the current public plugin API (no dashboard-tab extension point). Would require either a future OpenClaw feature or a fork/patch of the Control UI.
- **MoltSOC as an OpenClaw plugin (backend only):** Possible. A plugin could register a **Gateway HTTP handler** (e.g. `/moltsoc` that proxies to the MoltSOC collector or redirects to `http://localhost:5173`), or an **agent tool** so the AI can query MoltSOC events. That would not put our React dashboard inside the OpenClaw UI but would tie MoltSOC into the same Gateway and CLI.
- **Recommendation:** Keep the separate MoltSOC dashboard for now. If you want tighter integration, consider a small OpenClaw plugin that adds a Gateway route or tool pointing at MoltSOC; ask OpenClaw maintainers if/when they add a dashboard-tab extension for plugins.
- **No approval needed:** OpenClaw plugins do not go through an approval process. You create the plugin (local dir or npm package), users install it via `openclaw plugins install <path>` or `openclaw plugins install @yourname/moltsoc-plugin`, enable it in config, and restart. It just appears for them. Publish under your own npm scope (e.g. `@moltsoc/plugin`); the `@openclaw` scope is the org's namespace if you want to list there later.

---

## OpenClaw plugin (MoltSOC)

A **MoltSOC plugin** is included so OpenClaw users get two ways to use MoltSOC:

1. **Short security summary** – All incidents at a glance: event counts by severity, last N alerts (rule, severity, summary), and a link to the full dashboard. Available via Gateway RPC (`moltsoc.summary`) and an optional agent tool (`moltsoc_get_summary`) so the AI can triage when you ask.
2. **Full MoltSOC dashboard** – One command opens the full dashboard in your browser: timeline, alerts table, session view, map, rules, and AI context for SOC maintenance.

### Install the plugin

From the repo (local path):

```powershell
openclaw plugins install c:\Users\secjo\dev\Clawdbot\plugin\moltsoc
```

Or from the project root with a relative path:

```powershell
openclaw plugins install ./plugin/moltsoc
```

Restart the Gateway after installing. The plugin is enabled by default. Configure optional URLs under `plugins.entries.moltsoc.config` (see below).

### Config (optional)

| Field | Default | Description |
|-------|---------|-------------|
| `collectorUrl` | `http://127.0.0.1:7777` | MoltSOC collector API (GET /events, GET /health). |
| `dashboardUrl` | `http://localhost:5173` | MoltSOC dashboard URL (full UI). |

Example (in your OpenClaw config):

```json
{
  "plugins": {
    "entries": {
      "moltsoc": {
        "enabled": true,
        "config": {
          "collectorUrl": "http://127.0.0.1:7777",
          "dashboardUrl": "http://localhost:5173"
        }
      }
    }
  }
}
```

### Usage

- **RPC (summary):** Call Gateway method `moltsoc.summary`. Returns `{ totalEvents, bySeverity, alerts[], dashboardUrl }` (or `{ error, ... }` if the collector is unreachable).
- **CLI (open dashboard):** Run `openclaw moltsoc dashboard` to open the MoltSOC dashboard in your default browser.
- **Agent tool (optional):** The plugin registers an optional tool `moltsoc_get_summary`. Enable it in your agent’s tool allowlist (e.g. `tools.allow: ["moltsoc_get_summary"]` or `tools.allow: ["moltsoc"]`) so the AI can query the security summary when you ask about incidents or SOC status.

**Prerequisites:** The MoltSOC collector should be running (`npm run collector -- --serve` in `collector/`) and the dashboard dev server if you use the dashboard (`npm run dev` in `dashboard/`). The plugin only fetches from the collector URL and opens the dashboard URL; it does not start those processes.

---

**Optional cross-link:** To show an “Open OpenClaw” link in the MoltSOC dashboard header (so you can jump to the OpenClaw dashboard from one place), set the OpenClaw dashboard URL when starting the dev server:

```powershell
# In dashboard folder
$env:VITE_OPENCLAW_DASHBOARD_URL="http://localhost:3000"; npm run dev
```

Or add to a `.env` file in `dashboard/`: `VITE_OPENCLAW_DASHBOARD_URL=http://localhost:3000` (replace with your OpenClaw dashboard URL). If unset, the link is hidden.

---

## Quickstart (one command + dashboard)

**Goal:** Run one command and the dashboard lights up with real OpenClaw telemetry.

**Important:** The collector must be **running in its own terminal** and left open. Port 7777 is only available while that process is running.

1. **Install dependencies** (once) in both folders:

```powershell
cd c:\Users\secjo\dev\Clawdbot\collector
npm install

cd c:\Users\secjo\dev\Clawdbot\dashboard
npm install
```

2. **Start the collector** (leave this terminal open):

```powershell
cd c:\Users\secjo\dev\Clawdbot\collector
npm run collector -- --serve --source=openclaw-cli
```

You should see: `MoltSOC collector on http://127.0.0.1:7777 (...)` on stderr. If you don’t, the server didn’t start.

**Verify collector is up (in another terminal):**

```powershell
Invoke-RestMethod -Uri http://127.0.0.1:7777/health
# Expected: status = ok, ts = ...
```

3. **Start the dashboard** (second terminal):

```powershell
cd c:\Users\secjo\dev\Clawdbot\dashboard
npm run dev
```

4. **In your browser, open the dashboard URL:** [http://localhost:5173](http://localhost:5173)  
   Do **not** open `http://127.0.0.1:7777` in the browser for the UI — that is the API only. The dashboard (the page you see) runs on port **5173**.  
   Then check **Live**, leave URL as `http://127.0.0.1:7777/events`. You should see heartbeats and gateway status events.

---

## Repo structure

```
/collector   – Node 22+ collector (moltsoc-collector)
/dashboard   – Vite + React static dashboard (GitHub Pages–ready)
/plugin/moltsoc – OpenClaw plugin (summary RPC, CLI openclaw moltsoc dashboard, optional agent tool)
sample-events.jsonl – Demo events for the dashboard
```

---

## Windows setup

### 1. Install Node 22+

- Download from [nodejs.org](https://nodejs.org/) (LTS 22.x or current 22+).
- Or: `winget install OpenJS.NodeJS.LTS`
- Confirm: `node -v` → v22.x.x or higher.

### 2. Collector

From repo root. Use `;` in PowerShell (not `&&`).

```powershell
cd collector
npm install
npm run collector -- --serve --source=openclaw-cli
```

Or with log tailing (auto-discover log path if `--logPath` omitted):

```powershell
npm run collector -- --serve --source=openclaw-logs
npm run collector -- --serve --source=openclaw-logs --logPath=C:\path\to\openclaw.log
```

**Useful flags:**

- `--discover` – Print discovered OpenClaw log paths and exit.
- `--serve` – Start HTTP server on 127.0.0.1:7777 (GET /events?since=, GET /stream, GET /health).
- `--source=openclaw-logs` (default) or `--source=openclaw-cli`.
- `--logPath=<path>` – Log file or directory (if dir, newest `*.log` is used). Omit to auto-discover.
- `--out=./events.jsonl` – Output JSONL file.
- `--maxEvents=10000` – In-memory ring buffer size.
- `--botId=<id>` – Override bot id (default: hostname + persisted UUID in state file).
- `--redact` / `--no-redact` – Redact raw log lines (default: true).

**State file:** `%APPDATA%\MoltSOC\state.json` (Windows) or `collector/.moltsoc/state.json` – stores `bot_id` and UUID.

### 3. Dashboard

```powershell
cd dashboard
npm install
npm run dev
```

Open http://localhost:5173. Use **Live** with `http://127.0.0.1:7777/events` (SSE /stream with polling fallback). Or drop `events.jsonl` / `sample-events.jsonl`.

Build for GitHub Pages: `npm run build` then upload `dist/`.

---

## Collector CLI

- **Name:** `moltsoc-collector` (run via `npm run collector` or `node src/cli.js` from `collector/`).
- **Sources:**
  - **openclaw-logs** (default): Tail OpenClaw log file(s); auto-discover paths if `--logPath` omitted; parse lines and emit events/alerts.
  - **openclaw-cli:** Every 10s run `openclaw gateway status` and `openclaw status --all`; parse state, port, bind, token, errors; emit `gateway_status`, `config_change`, `error`, and alerts (e.g. PUBLIC_BIND, PORT_CHANGED, GATEWAY_RESTART_LOOP).
- **HTTP (when `--serve`):**
  - `GET /events?since=<ISO8601>` – Events after `since` (incremental).
  - `GET /events` – Full in-memory buffer (last `--maxEvents`).
  - `GET /stream` – Server-Sent Events (real-time).
  - `GET /health` – Health check.

Heartbeat: every 30s.

---

## Event schema (stable)

```json
{
  "ts": "ISO8601",
  "host_id": "<hostname>",
  "bot_id": "<hostname-uuid or --botId>",
  "session_id": "",
  "channel_id": "",
  "type": "gateway_status|auth_warning|tool_call|error|network_hint|heartbeat|config_change|alert",
  "severity": "info|low|medium|high|critical",
  "summary": "short string",
  "details": { "rule": "", "threshold": 0, "window": "", "evidence": [] }
}
```

Alerts use `type: "alert"` and `details.rule`, `details.threshold`, `details.window`, `details.evidence[]`.

---

## Built-in detections

1. **GATEWAY_UNREACHABLE** – ECONNREFUSED to 127.0.0.1/localhost (logs).
2. **MISSING_GATEWAY_TOKEN** – Missing gateway token (logs or CLI).
3. **TOOL_LOOP** – Same error repeated >N times/min (logs).
4. **PUBLIC_BIND** – Bind to 0.0.0.0 (logs or CLI status).
5. **SUSPICIOUS_COMMAND_PATTERN** – powershell -enc / IEX / base64 in logs.
6. **PORT_CHANGED** – Gateway port changed (CLI).
7. **GATEWAY_RESTART_LOOP** – >3 stop/start transitions in 5 min (CLI).
8. **AUTH_FAILURE_BURST** – Auth failure lines >N/min (logs).
9. **TOOL_FAILURE_RATE** – Tool error lines >N/min (logs).

---

## Dashboard

- **Input:** Drag-and-drop `events.jsonl` or **Live** (SSE /stream with polling fallback).
- **Views:** Timeline (sort by time/severity), Alerts (by rule; Details drawer with evidence), Session (filter by session/bot), Map (top-N destinations/ASNs + sparkline if present; else “No network hints yet”), Rules (client-side only), **AI** (SOC context for your AI).
- **Bot selector:** Dropdown when multiple `bot_id` values appear.
- No external analytics.

---

## AI reporting (SOC maintenance)

You already have AI (OpenClaw with live API key). Use it to maintain the SOC: triage alerts, suggest actions, and create new rules.

### Skill: moltsoc-soc

A **Cursor/OpenClaw Skill** is provided so the AI knows how to maintain MoltSOC:

- **Location:** `.cursor/skills/moltsoc-soc/SKILL.md` (project skill).
- **When to use:** When the user asks to triage MoltSOC alerts, suggest or create rules, or maintain the SOC; or when the user pastes “SOC context for AI” from the dashboard.
- **What the AI does:** Triage alerts (prioritize by severity, group by rule/bot), suggest immediate vs follow-up actions, suggest or create new detection rules in dashboard format (id, name, severity, threshold, enabled), and summarize findings. Uses only metadata (no prompts or secrets).

Enable this skill in your AI (Cursor/OpenClaw) so that when you paste SOC context, the AI can triage and suggest rules.

### Dashboard → AI tab

1. Open the dashboard **AI** tab.
2. Click **Copy context to clipboard**. That copies a markdown summary of current alerts (by severity and rule) and current rules.
3. Paste into your AI chat (OpenClaw or Cursor) and ask, for example: “Triage these MoltSOC alerts and suggest any new rules” or “Create a rule for …”.
4. The AI (with the moltsoc-soc skill) will triage, recommend actions, and output new rules in the format you can add via the dashboard **Rules** tab (“Add your own rule”).

---

## Troubleshooting

### "Page cannot be found" in the browser

- **You must open the dashboard URL:** [http://localhost:5173](http://localhost:5173) — that is where the UI runs.
- **Do not open** `http://127.0.0.1:7777` expecting a page; that is the collector API (JSON/SSE). If you open it, you’ll now see a short note and a link to the dashboard.
- **If localhost:5173 says "page cannot be found":** the dashboard dev server is not running. In a terminal run:
  ```powershell
  cd c:\Users\secjo\dev\Clawdbot\dashboard
  npm install
  npm run dev
  ```
  Leave that terminal open, then open http://localhost:5173 again.

### Verify OpenClaw commands

In PowerShell:

```powershell
openclaw gateway status
openclaw status --all
```

If these fail (e.g. “openclaw is not recognized”), install or fix OpenClaw and ensure it’s on PATH. The collector will still run and emit heartbeats; CLI source will log errors.

### Collector logs

The collector writes to stderr only for startup and server URL. All telemetry goes to:

- The file passed to `--out` (e.g. `events.jsonl`).
- The in-memory buffer (and SSE) when `--serve` is used.

To see collector output:

```powershell
npm run collector -- --serve --source=openclaw-cli 2>&1
```

You should see: `MoltSOC collector on http://127.0.0.1:7777 (...)`.

### Confirm gateway port listening

If OpenClaw gateway runs locally, check that the port (e.g. 7777 or the one in `openclaw gateway status`) is listening:

```powershell
netstat -an | findstr "LISTENING"
```

Or use the dashboard Live mode: if you see gateway_status events with `state: running` and a port, the collector is getting status correctly.

### Discover log paths

To see where the collector would look for OpenClaw logs (and what it would use when `--logPath` is omitted):

```powershell
cd collector
node src/cli.js --discover
```

---

## Sample events

Use `sample-events.jsonl` in the repo root to try the dashboard without the collector: drag it onto the drop zone. The file includes test data for:

- **All 9 alert rules** (GATEWAY_UNREACHABLE, MISSING_GATEWAY_TOKEN, TOOL_LOOP, PUBLIC_BIND, SUSPICIOUS_COMMAND_PATTERN, PORT_CHANGED, GATEWAY_RESTART_LOOP, AUTH_FAILURE_BURST, TOOL_FAILURE_RATE) with `type: "alert"` and `details.rule`, `details.evidence` so the Alerts view and Details drawer work.
- **Multiple bots** (bot-1, bot-2, bot-3) so the Bot selector appears.
- **Multiple sessions** (sess-001, sess-002, sess-003) for Session view filtering.
- **Network hints** (`details.destination`, `details.domain`, `details.ip`, `details.asn`) so the Map view shows top-N destinations/ASNs and a sparkline.
- **Severities** from info to critical and event types: gateway_status, config_change, error, network_hint, heartbeat.

---

## How to verify (checklist)

1. **Collector starts and serves**
   - `cd collector; npm run collector -- --serve --source=openclaw-cli`
   - Expected: stderr shows `MoltSOC collector on http://127.0.0.1:7777 (...)` and process stays running.

2. **Health endpoint**
   - In browser or: `Invoke-RestMethod -Uri http://127.0.0.1:7777/health`
   - Expected: `{ "status": "ok", "ts": "..." }`.

3. **Events endpoint**
   - `Invoke-RestMethod -Uri http://127.0.0.1:7777/events`
   - Expected: JSON array of events (at least config_change and heartbeats after ~30s).

4. **Discover**
   - `node src/cli.js --discover`
   - Expected: Lines listing dirs/files and “Resolved target”.

5. **Dashboard Live**
   - Start collector with `--serve`, start dashboard with `npm run dev`, open http://localhost:5173, check Live.
   - Expected: Events appear (heartbeats, gateway_status if OpenClaw CLI works).

6. **Dashboard file**
   - Uncheck Live, drag `sample-events.jsonl` onto the drop zone.
   - Expected: Timeline and Alerts show sample data.

---

## License

Same as the parent repo.
