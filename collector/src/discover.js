import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const WIN = process.platform === 'win32';

function env(name, fallback = '') {
  return process.env[name] || fallback;
}

function searchDirs() {
  const candidates = [];
  const user = env('USERPROFILE') || env('HOME');
  const local = env('LOCALAPPDATA');
  const appData = env('APPDATA');
  if (user) candidates.push(path.join(user, '.openclaw'));
  if (local) candidates.push(path.join(local, 'OpenClaw'));
  if (appData) candidates.push(path.join(appData, 'OpenClaw'));
  return candidates.filter((d) => fs.existsSync(d));
}

function findLogsInDir(dir) {
  const logs = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        const sub = path.join(full, 'logs');
        if (fs.existsSync(sub)) logs.push(...findLogsInDir(sub));
        logs.push(...findLogsInDir(full));
      } else if (e.isFile() && (e.name.endsWith('.log') || e.name.endsWith('.txt'))) {
        logs.push(full);
      }
    }
    const logDir = path.join(dir, 'logs');
    if (fs.existsSync(logDir)) {
      const files = fs.readdirSync(logDir).filter((f) => f.endsWith('.log') || f.endsWith('.txt'));
      files.forEach((f) => logs.push(path.join(logDir, f)));
    }
  } catch (_) {}
  return [...new Set(logs)];
}

function runOpenClaw(cmd) {
  let out = '';
  try {
    out = execSync(`openclaw ${cmd}`, { encoding: 'utf8', timeout: 10000, stdio: ['pipe', 'pipe', 'pipe'], shell: true });
  } catch (e) {
    if (e.stdout) out += e.stdout;
    if (e.stderr) out += e.stderr;
  }
  return out;
}

function extractPathsFromOutput(text) {
  const paths = [];
  const driveLetter = /[A-Za-z]:[\\/][^\s'"]+\.log/g;
  const unixLike = /[/\\](?:\.openclaw|openclaw|logs)[/\\][^\s'"]+\.log/g;
  const matches = text.match(driveLetter) || [];
  matches.forEach((m) => {
    const n = m.trim();
    if (fs.existsSync(n)) paths.push(n);
  });
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const parts = line.split(/\s+/);
    for (const p of parts) {
      const normalized = path.normalize(p.replace(/^["']|["']$/g, ''));
      if ((normalized.endsWith('.log') || normalized.endsWith('.txt')) && fs.existsSync(normalized)) {
        paths.push(normalized);
      }
    }
  }
  return [...new Set(paths)];
}

export function discoverLogPaths() {
  const found = new Set();

  searchDirs().forEach((dir) => {
    found.add(dir);
    findLogsInDir(dir).forEach((f) => found.add(f));
  });

  try {
    const gatewayOut = runOpenClaw('gateway status');
    const statusOut = runOpenClaw('status --all');
    extractPathsFromOutput(gatewayOut).forEach((p) => found.add(p));
    extractPathsFromOutput(statusOut).forEach((p) => found.add(p));
  } catch (_) {}

  const list = [...found];
  const dirs = list.filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());
  const files = list.filter((p) => fs.existsSync(p) && fs.statSync(p).isFile());

  return { dirs, files, all: list };
}

export function resolveLogTarget(logPathOrDir) {
  if (!logPathOrDir) {
    const { dirs, files } = discoverLogPaths();
    if (files.length > 0) {
      const byMtime = files.map((f) => ({ f, m: fs.statSync(f).mtimeMs })).sort((a, b) => b.m - a.m);
      return byMtime[0].f;
    }
    if (dirs.length > 0) {
      const firstDir = dirs[0];
      const logs = findLogsInDir(firstDir);
      if (logs.length > 0) {
        const byMtime = logs.map((f) => ({ f, m: fs.statSync(f).mtimeMs })).sort((a, b) => b.m - a.m);
        return byMtime[0].f;
      }
      return firstDir;
    }
    const user = env('USERPROFILE') || env('HOME');
    return path.join(user || '.', 'openclaw', 'logs', 'openclaw.log');
  }
  const abs = path.isAbsolute(logPathOrDir) ? logPathOrDir : path.resolve(process.cwd(), logPathOrDir);
  if (!fs.existsSync(abs)) return abs;
  const stat = fs.statSync(abs);
  if (stat.isFile()) return abs;
  if (stat.isDirectory()) {
    const logs = findLogsInDir(abs);
    if (logs.length > 0) {
      const byMtime = logs.map((f) => ({ f, m: fs.statSync(f).mtimeMs })).sort((a, b) => b.m - a.m);
      return byMtime[0].f;
    }
    return abs;
  }
  return abs;
}

export function printDiscover() {
  const { dirs, files } = discoverLogPaths();
  console.log('MoltSOC discover (OpenClaw log paths)');
  console.log('Directories:', dirs.length);
  dirs.forEach((d) => console.log('  ', d));
  console.log('Files:', files.length);
  files.forEach((f) => console.log('  ', f));
  const resolved = resolveLogTarget(null);
  console.log('Resolved target (for --logPath):', resolved);
}
