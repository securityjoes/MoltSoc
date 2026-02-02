import crypto from 'crypto';
import { spawn } from 'child_process';
import { createEvent } from './schema.js';
import { writeEvent } from './writer.js';
import { emitAlert } from './alerts.js';

const POLL_INTERVAL_MS = 10_000;
const RESTART_LOOP_THRESHOLD = 3;
const RESTART_LOOP_WINDOW_MS = 5 * 60 * 1000;

let lastGateway = null;
let lastStatus = null;
let gatewayRestartTimestamps = [];
let lastPort = null;

function runCmd(args) {
  return new Promise((resolve) => {
    const proc = spawn('openclaw', args, { shell: true, windowsHide: true });
    let stdout = '';
    let stderr = '';
    proc.stdout?.on('data', (d) => { stdout += d.toString(); });
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
    proc.on('error', () => resolve({ code: -1, stdout: '', stderr: 'openclaw not in PATH' }));
  });
}

function parseGatewayStatus(stdout, stderr) {
  const text = (stdout + stderr).toLowerCase();
  const state = text.includes('running') ? 'running' : text.includes('stopped') ? 'stopped' : null;
  const portMatch = text.match(/(?:port|:)\s*(\d{2,5})/);
  const port = portMatch ? parseInt(portMatch[1], 10) : null;
  const bindMatch = text.match(/(?:bind|listen|address)[:\s]*([0-9.:]+)/);
  const bind = bindMatch ? bindMatch[1].trim() : null;
  const tokenPresent = text.includes('token') && (text.includes('present') || text.includes('set') || !text.includes('missing'));
  const tokenMissing = text.includes('missing') && text.includes('token');
  const rpcFailed = text.includes('rpc') && (text.includes('fail') || text.includes('error'));
  return { state, port, bind, tokenPresent, tokenMissing, rpcFailed, raw: stdout + stderr };
}

function parseStatusAll(stdout, stderr) {
  const text = stdout + stderr;
  const logPathMatch = text.match(/([A-Za-z]:[\\/][^\s]+\.log)|([/\\][^\s]+\.log)/);
  const logPath = logPathMatch ? logPathMatch[0].trim() : null;
  return { logPath, raw: text };
}

function isPublicBind(addr) {
  if (!addr) return false;
  const a = addr.toLowerCase();
  return a.includes('0.0.0.0') || a === '::' || a.includes(':::0');
}

export function startOpenClawCli(opts) {
  const { redact = true, botId } = opts;

  const tick = async () => {
    const gw = await runCmd(['gateway', 'status']);
    const gwParsed = parseGatewayStatus(gw.stdout, gw.stderr);
    const status = await runCmd(['status', '--all']);
    const statusParsed = parseStatusAll(status.stdout, status.stderr);

    const ts = new Date().toISOString();
    const ev = createEvent({ bot_id: botId || '' });

    if (gw.code !== 0 && gw.stderr) {
      writeEvent(createEvent({
        ...ev,
        type: 'error',
        severity: 'medium',
        summary: 'OpenClaw gateway status failed',
        details: { exitCode: gw.code, stderr_hash: redact ? crypto.createHash('sha256').update(gw.stderr).digest('hex') : undefined }
      }), redact);
    }

    writeEvent(createEvent({
      ...ev,
      ts,
      type: 'gateway_status',
      severity: 'info',
      summary: `Gateway ${gwParsed.state || 'unknown'}`,
      details: {
        state: gwParsed.state,
        port: gwParsed.port,
        bind: gwParsed.bind,
        token_present: gwParsed.tokenMissing ? false : gwParsed.tokenPresent
      }
    }), redact);

    if (gwParsed.tokenMissing) {
      emitAlert(opts, 'MISSING_GATEWAY_TOKEN', 'medium', 'Missing gateway token', { evidence: ['gateway status output'] });
    }
    if (gwParsed.rpcFailed) {
      writeEvent(createEvent({
        ...ev,
        ts,
        type: 'error',
        severity: 'medium',
        summary: 'RPC failed (from gateway status)',
        details: {}
      }), redact);
    }
    if (gwParsed.bind && isPublicBind(gwParsed.bind)) {
      emitAlert(opts, 'PUBLIC_BIND', 'medium', 'Bind to 0.0.0.0 detected', { evidence: [gwParsed.bind] });
    }

    if (lastPort != null && gwParsed.port != null && lastPort !== gwParsed.port) {
      emitAlert(opts, 'PORT_CHANGED', 'low', 'Gateway port changed', {
        rule: 'PORT_CHANGED',
        threshold: 1,
        window: 0,
        evidence: [`${lastPort} -> ${gwParsed.port}`]
      });
    }
    lastPort = gwParsed.port ?? lastPort;

    if (gwParsed.state === 'stopped' || gwParsed.state === 'running') {
      gatewayRestartTimestamps.push(Date.now());
      while (gatewayRestartTimestamps.length && gatewayRestartTimestamps[0] < Date.now() - RESTART_LOOP_WINDOW_MS) {
        gatewayRestartTimestamps.shift();
      }
      if (gatewayRestartTimestamps.length >= RESTART_LOOP_THRESHOLD) {
        emitAlert(opts, 'GATEWAY_RESTART_LOOP', 'high', 'Gateway restart loop (>3 stop/start in 5 min)', {
          rule: 'GATEWAY_RESTART_LOOP',
          threshold: RESTART_LOOP_THRESHOLD,
          window: '5m',
          evidence: gatewayRestartTimestamps.map((t) => new Date(t).toISOString())
        });
      }
    }

    lastGateway = gwParsed;
    lastStatus = statusParsed;
  };

  tick();
  setInterval(tick, POLL_INTERVAL_MS);
}
