# Changelog

All notable changes to MoltSOC are documented here. The project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - 2025-02-02

### Added

- **Single CLI** – `moltsoc <command>` with: `install`, `start`, `stop`, `status`, `dashboard`, `update`, `help`. One flow after clone: `moltsoc install` → `moltsoc start` → `moltsoc dashboard`.
- **Persistent run** – `moltsoc start --background` runs the collector in the background (PID stored in `.moltsoc/collector.pid`). Use `moltsoc stop` to stop it.
- **Update command** – `moltsoc update` pulls latest from git, reinstalls collector and dashboard deps, and restarts the collector if it was running.
- **Dashboard side menu** – Left sidebar with Timeline, Alerts, Session, Map, Rules, AI context.
- **OpenClaw Security Analyst banner** – Sidebar panel explaining how to engage the MoltSOC skill (“Ask OpenClaw to triage MoltSOC alerts”) and showing last collector heartbeat so you can see when data is live.
- **CHANGELOG** and versioning – Root `package.json` version; release notes here; tags recommended per release (e.g. `git tag v0.2.0`).

### Changed

- **Live by default** – Dashboard defaults to Live with `http://127.0.0.1:7777/events`. No sample data; capture live OpenClaw logs/configs via the collector.
- **Sample data removed** – “Load sample data” button removed. Use Live + collector; sample file no longer shipped in repo.

### Fixed

- N/A

---

## [0.1.0] - 2025-02-02

- Initial release: collector (OpenClaw logs + CLI source), dashboard (timeline, alerts, session, map, rules, AI context), OpenClaw plugin (RPC summary, CLI `openclaw moltsoc dashboard`, optional agent tool), moltsoc-soc Skill.
