# MoltSOC

**Security observability and control for AI agents.** MoltSOC is a security tool that gives you a local SOC surface for [OpenClaw](https://docs.clawd.bot) bots and agents: collect security-relevant telemetry from OpenClaw logs and configs, visualize it, raise alerts, and let OpenClaw act as your **Security Analyst** to triage and maintain the SOC.

- **Security-first** — Built for SecOps: alerts, rules, evidence, and AI-augmented triage. Part of the IntelliJOES vision (see below).
- **Local & private** — No cloud, no accounts. Runs on your machine; metadata only, no prompt or file contents.
- **Single CLI** — One flow: `moltsoc install` → `moltsoc start` → `moltsoc dashboard`. Live data from OpenClaw by default.
- **OpenClaw-native** — Plugin for security summary (RPC + optional agent tool) and one command to open the full dashboard.

---

## About Security Joes & IntelliJOES

**Security Joes** is rebuilding SecOps around AI and agents. We’re building **IntelliJOES** — an **Agentic SecOps Augmentation Platform** that augments security teams with AI-driven visibility, triage, and response. Instead of traditional, siloed SOC tooling, IntelliJOES brings agentic workflows: your AI becomes a Security Analyst that can see alerts, prioritize them, suggest actions, and help maintain detection rules.

**MoltSOC** is part of that vision. It’s the security observability layer for OpenClaw: you get a local SOC (timeline, alerts, rules, evidence) and the ability to **wake** the MoltSOC skill so OpenClaw maintains your alerts as your Security Analyst. We’re iterating toward a full Agentic SecOps experience — MoltSOC is where we start with OpenClaw and the OpenClaw community.

---

## What's in this repo

| Path | Description |
|------|-------------|
| `moltsoc.cmd` | Windows launcher: run `moltsoc.cmd <command>` or add repo to PATH and run `moltsoc <command>`. |
| `moltsoc` | macOS/Linux launcher: run `./moltsoc <command>` or add repo to PATH and run `moltsoc <command>`. |
| `cli/` | MoltSOC CLI implementation: `install`, `start`, `stop`, `status`, `dashboard`, `update`, `uninstall`, `help`. |
| `collector/` | Security telemetry collector: tails OpenClaw logs and polls CLI status, emits events and alerts, serves HTTP API on `127.0.0.1:7777`. |
| `dashboard/` | SOC dashboard: side menu, timeline, alerts, session view, map, rules, AI context, and OpenClaw Security Analyst panel. |
| `plugin/moltsoc/` | OpenClaw plugin: `moltsoc.summary` RPC, `openclaw moltsoc dashboard` CLI, optional `moltsoc_get_summary` tool for AI triage. |

---

## Quick start (single flow)

1. **Clone**
   ```powershell
   git clone https://github.com/securityjoes/MoltSoc.git
   cd MoltSoc
   ```

2. **Install** (one command – installs collector + dashboard deps)
   ```powershell
   moltsoc install
   ```
   On **Windows**: run `moltsoc.cmd install` from the repo folder, or add the repo folder to your PATH and run `moltsoc install`. On **macOS/Linux**: run `./moltsoc install`, or add the repo folder to your PATH and run `moltsoc install`.

3. **Start the collector** (scans OpenClaw logs/configs; use `--background` to run in background)
   ```powershell
   moltsoc start
   ```
   Or: `moltsoc start --background`. Stop with `moltsoc stop`.

4. **Open the dashboard**
   ```powershell
   moltsoc dashboard
   ```
   This starts the dashboard dev server (if needed) and opens http://localhost:5173. Live is on by default; data comes from the collector.

5. **Optional: OpenClaw plugin**  
   From the repo folder: `openclaw plugins install ./plugin/moltsoc`. Then use `openclaw moltsoc dashboard` or call `moltsoc.summary`; enable the `moltsoc_get_summary` tool so the AI can triage alerts.

---

## MoltSOC CLI

| Command | Description |
|---------|-------------|
| `moltsoc install` | Install dependencies for collector and dashboard. Run once after clone. |
| `moltsoc start` | Start the collector (foreground). Use `moltsoc start --background` to run in background. |
| `moltsoc stop` | Stop the collector if running in background. |
| `moltsoc status` | Check if collector is running (health at http://127.0.0.1:7777). |
| `moltsoc dashboard` | Start dashboard dev server (if needed) and open http://localhost:5173 in browser. |
| `moltsoc update` | Pull latest from git, reinstall deps, restart collector if it was running. |
| `moltsoc uninstall` | Stop collector, remove runtime data (`.moltsoc`). Use `--full` to also remove `node_modules` in collector and dashboard for a clean reinstall. |
| `moltsoc help` | Show help. |

**Running moltsoc:** All commands are under the `moltsoc` CLI. Use the included launchers so you never need npm for the command itself:

- **Windows:** From the repo folder run `moltsoc.cmd <command>` (e.g. `moltsoc.cmd install`). To use `moltsoc` without `.cmd`, add the repo folder to your PATH so `moltsoc install` runs `moltsoc.cmd`.
- **macOS/Linux:** From the repo folder run `./moltsoc <command>`. To use `moltsoc` from anywhere, add the repo folder to your PATH and ensure `moltsoc` is executable (`chmod +x moltsoc`).

---

## Uninstall

To **uninstall your current MoltSOC** (e.g. before installing the new version):

1. **Stop and remove runtime data**
   ```powershell
   moltsoc uninstall
   ```
   This stops the collector (if running in background) and deletes the `.moltsoc` folder (PID and runtime state).

2. **Optional: full clean** (removes `node_modules` in collector and dashboard so you can reinstall from scratch)
   ```powershell
   moltsoc uninstall --full
   ```
   Then run `moltsoc install` again after cloning or pulling the new version.

3. **Remove MoltSOC entirely**  
   Delete the repo folder.

---

## OpenClaw Security Analyst

The dashboard has an **OpenClaw Security Analyst** panel in the sidebar. It explains how to engage the MoltSOC skill: **ask OpenClaw to triage MoltSOC alerts** or **maintain the SOC**. OpenClaw then acts as your Security Analyst — part of the IntelliJOES vision of agentic SecOps augmentation. The panel shows the last collector heartbeat so you can see when data is live.

---

## Versioning and releases

- **Version:** Root `package.json` and [CHANGELOG.md](CHANGELOG.md). We use [Semantic Versioning](https://semver.org/).
- **Release notes:** See [CHANGELOG.md](CHANGELOG.md).
- **Tags:** For each release, create a tag (e.g. `git tag v0.2.0`) and push (`git push origin v0.2.0`). Optionally create a GitHub Release from the tag with copy from CHANGELOG.

---

## License

[MIT](LICENSE)

---

Made by **Security Joes** with ❤️ to the OpenClaw community — rebuilding SecOps with IntelliJOES.
