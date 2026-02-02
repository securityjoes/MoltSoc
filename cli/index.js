#!/usr/bin/env node
/**
 * MoltSOC CLI - single entry point: install | start | stop | status | dashboard | update | help
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const COLLECTOR_DIR = path.join(ROOT, 'collector');
const DASHBOARD_DIR = path.join(ROOT, 'dashboard');
const PID_FILE = path.join(ROOT, '.moltsoc', 'collector.pid');
const DEFAULT_COLLECTOR_URL = 'http://127.0.0.1:7777';
const DEFAULT_DASHBOARD_URL = 'http://localhost:5173';

const VERSION = '0.2.0';

function help() {
  console.log(`
MoltSOC - local security monitoring for OpenClaw

Usage: moltsoc <command> [options]

Commands:
  install     Install dependencies (collector + dashboard). Run once after clone.
  start       Start the collector (scans OpenClaw logs/configs). Use --background to run in background.
  stop        Stop the collector if running in background.
  status      Check if collector is running and show health.
  dashboard   Open the MoltSOC dashboard in browser (start dashboard dev server if needed).
  update      Pull latest from git, reinstall deps, and restart collector.
  uninstall   Stop collector, remove runtime data (.moltsoc). Use --full to also remove node_modules for clean reinstall.
  help        Show this help.

Examples:
  moltsoc install
  moltsoc start
  moltsoc start --background
  moltsoc dashboard
  moltsoc update
  moltsoc uninstall
  moltsoc uninstall --full

Version: ${VERSION}
`);
}

function run(cmd, args, cwd, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: cwd || ROOT,
      stdio: opts.silent ? 'pipe' : 'inherit',
      shell: opts.shell ?? true,
      ...opts
    });
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readPid() {
  try {
    const s = fs.readFileSync(PID_FILE, 'utf8').trim();
    const pid = parseInt(s, 10);
    if (pid > 0) return pid;
  } catch (_) {}
  return null;
}

function writePid(pid) {
  ensureDir(path.dirname(PID_FILE));
  fs.writeFileSync(PID_FILE, String(pid), 'utf8');
}

function isPidRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (_) {
    return false;
  }
}

function fetchHealth(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: '/health', method: 'GET', timeout: 3000 },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (_) {
            resolve(null);
          }
        });
      }
    );
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
    req.end();
  });
}

function openUrl(url) {
  const cmd =
    process.platform === 'win32'
      ? `start "${url}"`
      : process.platform === 'darwin'
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  spawn(cmd, [], { shell: true, stdio: 'ignore' });
}

async function cmdInstall() {
  console.log('MoltSOC install – installing dependencies for collector and dashboard...\n');
  if (!fs.existsSync(COLLECTOR_DIR) || !fs.existsSync(DASHBOARD_DIR)) {
    console.error('Error: collector/ or dashboard/ not found. Run this from the MoltSOC repo root.');
    process.exit(1);
  }
  try {
    console.log('Installing collector dependencies...');
    await run('npm', ['install'], COLLECTOR_DIR);
    console.log('Installing dashboard dependencies...');
    await run('npm', ['install'], DASHBOARD_DIR);
  } catch (e) {
    console.error('Install failed:', e.message);
    process.exit(1);
  }
  console.log('\n✓ Install complete.\n');
  console.log('Next steps:');
  console.log('  1. moltsoc start          – start the collector (scans OpenClaw logs/configs)');
  console.log('  2. moltsoc dashboard      – open the dashboard in your browser');
  console.log('  3. Optional: openclaw plugins install ./plugin/moltsoc  – add OpenClaw plugin\n');
}

async function cmdStart() {
  const background = process.argv.includes('--background');
  if (!fs.existsSync(path.join(COLLECTOR_DIR, 'package.json'))) {
    console.error('Run moltsoc install first.');
    process.exit(1);
  }
  const existingPid = readPid();
  if (existingPid && isPidRunning(existingPid)) {
    console.log('Collector already running (PID ' + existingPid + '). Use moltsoc stop first.');
    process.exit(0);
  }
  const args = ['run', 'collector', '--', '--serve', '--source=openclaw-cli'];
  if (background) {
    const child = spawn('npm', args, {
      cwd: COLLECTOR_DIR,
      stdio: 'ignore',
      detached: true,
      shell: true
    });
    child.unref();
    writePid(child.pid);
    console.log('Collector started in background (PID ' + child.pid + '). Use moltsoc stop to stop it.');
    console.log('API: ' + DEFAULT_COLLECTOR_URL);
    return;
  }
  console.log('Starting collector (Ctrl+C to stop)...');
  console.log('API: ' + DEFAULT_COLLECTOR_URL + '\n');
  await run('npm', args, COLLECTOR_DIR);
}

async function cmdStop() {
  const pid = readPid();
  if (!pid) {
    console.log('No background collector PID found.');
    process.exit(0);
  }
  if (!isPidRunning(pid)) {
    fs.unlinkSync(PID_FILE);
    console.log('Collector was not running.');
    process.exit(0);
  }
  try {
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(PID_FILE);
    console.log('Collector stopped (PID ' + pid + ').');
  } catch (_) {
    console.error('Could not stop process ' + pid);
    process.exit(1);
  }
}

async function cmdStatus() {
  const health = await fetchHealth(DEFAULT_COLLECTOR_URL);
  if (health?.status === 'ok') {
    console.log('Collector: running');
    console.log('  Health: ' + (health.status || 'ok'));
    console.log('  API: ' + DEFAULT_COLLECTOR_URL);
    if (health.ts) console.log('  Last check: ' + health.ts);
  } else {
    console.log('Collector: not reachable at ' + DEFAULT_COLLECTOR_URL);
    console.log('  Run moltsoc start to start it.');
  }
}

async function cmdDashboard() {
  console.log('Starting dashboard dev server in background (if not already running)...');
  spawn('npm', ['run', 'dev'], {
    cwd: DASHBOARD_DIR,
    stdio: 'ignore',
    detached: true,
    shell: true
  }).unref();
  await new Promise((r) => setTimeout(r, 3500));
  console.log('Opening MoltSOC dashboard at ' + DEFAULT_DASHBOARD_URL);
  openUrl(DEFAULT_DASHBOARD_URL);
}

async function cmdUpdate() {
  console.log('MoltSOC update – pulling latest and reinstalling...\n');
  try {
    await run('git', ['pull'], ROOT);
    await run('npm', ['install'], COLLECTOR_DIR);
    await run('npm', ['install'], DASHBOARD_DIR);
  } catch (e) {
    console.error('Update failed:', e.message);
    process.exit(1);
  }
  const pid = readPid();
  if (pid && isPidRunning(pid)) {
    console.log('Restarting collector...');
    try {
      process.kill(pid, 'SIGTERM');
      fs.unlinkSync(PID_FILE);
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 1000));
    const child = spawn('npm', ['run', 'collector', '--', '--serve', '--source=openclaw-cli'], {
      cwd: COLLECTOR_DIR,
      stdio: 'ignore',
      detached: true,
      shell: true
    });
    child.unref();
    writePid(child.pid);
    console.log('Collector restarted (PID ' + child.pid + ').');
  }
  console.log('\n✓ Update complete.');
}

function rmDirIfExists(dir) {
  try {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
      return true;
    }
  } catch (_) {}
  return false;
}

async function cmdUninstall() {
  const full = process.argv.includes('--full');
  console.log('MoltSOC uninstall – stopping collector and removing runtime data...\n');

  const pid = readPid();
  if (pid && isPidRunning(pid)) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log('Collector stopped (PID ' + pid + ').');
    } catch (_) {
      console.log('Could not stop collector process ' + pid + '.');
    }
  }

  const moltsocDir = path.join(ROOT, '.moltsoc');
  if (rmDirIfExists(moltsocDir)) {
    console.log('Removed .moltsoc (runtime data).');
  }

  if (full) {
    const collectorNodeModules = path.join(COLLECTOR_DIR, 'node_modules');
    const dashboardNodeModules = path.join(DASHBOARD_DIR, 'node_modules');
    if (rmDirIfExists(collectorNodeModules)) console.log('Removed collector/node_modules.');
    if (rmDirIfExists(dashboardNodeModules)) console.log('Removed dashboard/node_modules.');
    console.log('\nFull clean done. Run moltsoc install to reinstall dependencies.');
  }

  console.log('\n✓ Uninstall complete.');
  console.log('To remove MoltSOC entirely: delete this folder.');
}

const commands = {
  install: cmdInstall,
  start: cmdStart,
  stop: cmdStop,
  status: cmdStatus,
  dashboard: cmdDashboard,
  update: cmdUpdate,
  uninstall: cmdUninstall,
  help: () => { help(); process.exit(0); }
};

const arg = process.argv[2]?.toLowerCase();
const fn = commands[arg];
if (fn) {
  fn().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
} else {
  help();
  process.exit(arg ? 1 : 0);
}
