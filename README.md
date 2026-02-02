# MoltSOC

Lightweight local monitoring for [OpenClaw](https://docs.clawd.bot) bots and agents: a collector that produces security-relevant telemetry and a dashboard to visualize it and raise alerts.

- **No cloud** — No AWS, no accounts, no registration. Runs locally.
- **Privacy by default** — No prompt or file contents; metadata only.
- **OpenClaw plugin** — Security summary (RPC + optional agent tool) and one command to open the full dashboard.

## What's in this repo

| Path | Description |
|------|-------------|
| `collector/` | Node.js collector: tails OpenClaw logs or polls CLI status, emits events and alerts, serves HTTP API on `127.0.0.1:7777`. |
| `dashboard/` | Vite + React dashboard: timeline, alerts, session view, map, rules, AI context. |
| `plugin/moltsoc/` | OpenClaw plugin: `moltsoc.summary` RPC, `openclaw moltsoc dashboard` CLI, optional `moltsoc_get_summary` tool. |

## Quick start

1. **Clone and install**
   ```powershell
   git clone https://github.com/securityjoes/MoltSoc.git
   cd MoltSoc/collector && npm install
   cd ../dashboard && npm install
   ```

2. **Start the collector** (leave running)
   ```powershell
   cd collector
   npm run collector -- --serve --source=openclaw-cli
   ```

3. **Start the dashboard**
   ```powershell
   cd dashboard
   npm run dev
   ```
   Open http://localhost:5173 and use **Live** with `http://127.0.0.1:7777/events`.

4. **Optional: OpenClaw plugin**
   ```powershell
   openclaw plugins install ./plugin/moltsoc
   ```
   Then: `openclaw moltsoc dashboard` to open the dashboard, or call `moltsoc.summary` for a short security summary.

## License

[MIT](LICENSE)

---

Made by Security Joes with ❤️ to the OpenClaw community.
