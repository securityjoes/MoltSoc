import crypto from 'crypto';
import { createEvent } from './schema.js';
import { writeEvent } from './writer.js';

const RAPID_THRESHOLD = 5;
const RAPID_WINDOW_MS = 60_000;
const AUTH_BURST_THRESHOLD = 5;
const AUTH_BURST_WINDOW_MS = 60_000;
const TOOL_FAILURE_THRESHOLD = 10;
const TOOL_FAILURE_WINDOW_MS = 60_000;

const lastErrors = new Map();
const LAST_ERRORS_MAX_KEYS = 500;
const authFailureTimestamps = [];
const toolFailureTimestamps = [];

export const ALERT_RULES = {
  GATEWAY_UNREACHABLE: { severity: 'high', summary: 'Gateway unreachable (ECONNREFUSED)' },
  MISSING_GATEWAY_TOKEN: { severity: 'medium', summary: 'Missing gateway token warning' },
  TOOL_LOOP: { severity: 'high', summary: 'Rapid repeated failures (tool loop)' },
  PUBLIC_BIND: { severity: 'medium', summary: 'Bind to 0.0.0.0 detected' },
  SUSPICIOUS_COMMAND_PATTERN: { severity: 'high', summary: 'Suspicious command pattern (powershell -enc / IEX / base64)' },
  PORT_CHANGED: { severity: 'low', summary: 'Gateway port changed' },
  GATEWAY_RESTART_LOOP: { severity: 'high', summary: 'Gateway restart loop (>3 stop/start in 5 min)' },
  AUTH_FAILURE_BURST: { severity: 'medium', summary: 'Auth failure burst (>N/min)' },
  TOOL_FAILURE_RATE: { severity: 'high', summary: 'Tool error rate (>N/min)' }
};

export function emitAlert(opts, rule, severity, summary, details = {}, ts) {
  const ev = createEvent({
    ...(ts && { ts }),
    type: 'alert',
    severity,
    summary,
    details: {
      rule,
      threshold: details.threshold,
      window: details.window,
      evidence: Array.isArray(details.evidence) ? details.evidence : (details.evidence ? [details.evidence] : [])
    },
    ...(opts?.botId && { bot_id: opts.botId })
  });
  writeEvent(ev, opts?.redact !== false);
}

function getKey(line) {
  const n = line.length > 200 ? line.slice(0, 200) : line;
  return n.replace(/\d+/g, '0');
}

export function checkLine(line, ts, opts = {}) {
  const alerts = [];
  const upper = line.toUpperCase();
  const now = ts ? new Date(ts).getTime() : Date.now();
  const evidenceHash = (str) => crypto.createHash('sha256').update(str).digest('hex');

  if (upper.includes('ECONNREFUSED') && (upper.includes('127.0.0.1') || upper.includes('LOCALHOST'))) {
    alerts.push({ rule: 'GATEWAY_UNREACHABLE', ...ALERT_RULES.GATEWAY_UNREACHABLE, evidence: [evidenceHash(line)] });
  }
  if (upper.includes('MISSING') && upper.includes('GATEWAY') && upper.includes('TOKEN')) {
    authFailureTimestamps.push(now);
    while (authFailureTimestamps.length && authFailureTimestamps[0] < now - AUTH_BURST_WINDOW_MS) authFailureTimestamps.shift();
    alerts.push({ rule: 'MISSING_GATEWAY_TOKEN', ...ALERT_RULES.MISSING_GATEWAY_TOKEN, evidence: [evidenceHash(line)] });
    if (authFailureTimestamps.length >= AUTH_BURST_THRESHOLD) {
      alerts.push({
        rule: 'AUTH_FAILURE_BURST',
        severity: 'medium',
        summary: ALERT_RULES.AUTH_FAILURE_BURST.summary,
        threshold: AUTH_BURST_THRESHOLD,
        window: '1m',
        evidence: authFailureTimestamps.map((t) => new Date(t).toISOString())
      });
    }
  }
  if (upper.includes('BIND') && (upper.includes('0.0.0.0') || upper.includes(':::0'))) {
    alerts.push({ rule: 'PUBLIC_BIND', ...ALERT_RULES.PUBLIC_BIND, evidence: [evidenceHash(line)] });
  }
  if (
    (upper.includes('POWERSHELL') && (upper.includes('-ENC') || upper.includes('-ENCODEDCOMMAND'))) ||
    upper.includes('IEX ') ||
    (upper.includes('BASE64') && (upper.includes('DECODE') || upper.includes('ENCODED')))
  ) {
    alerts.push({ rule: 'SUSPICIOUS_COMMAND_PATTERN', ...ALERT_RULES.SUSPICIOUS_COMMAND_PATTERN, evidence: [evidenceHash(line)] });
  }

  const key = getKey(line);
  if (lastErrors.size >= LAST_ERRORS_MAX_KEYS && !lastErrors.has(key)) {
    const firstKey = lastErrors.keys().next().value;
    if (firstKey !== undefined) lastErrors.delete(firstKey);
  }
  if (!lastErrors.has(key)) lastErrors.set(key, []);
  const arr = lastErrors.get(key);
  arr.push(now);
  while (arr.length && arr[0] < now - RAPID_WINDOW_MS) arr.shift();
  if (arr.length >= RAPID_THRESHOLD) {
    alerts.push({
      rule: 'TOOL_LOOP',
      ...ALERT_RULES.TOOL_LOOP,
      threshold: RAPID_THRESHOLD,
      window: '1m',
      evidence: [evidenceHash(line), `count:${arr.length}`]
    });
  }

  if (upper.includes('TOOL') && (upper.includes('ERROR') || upper.includes('FAIL'))) {
    toolFailureTimestamps.push(now);
    while (toolFailureTimestamps.length && toolFailureTimestamps[0] < now - TOOL_FAILURE_WINDOW_MS) toolFailureTimestamps.shift();
    if (toolFailureTimestamps.length >= TOOL_FAILURE_THRESHOLD) {
      alerts.push({
        rule: 'TOOL_FAILURE_RATE',
        severity: 'high',
        summary: ALERT_RULES.TOOL_FAILURE_RATE.summary,
        threshold: TOOL_FAILURE_THRESHOLD,
        window: '1m',
        evidence: toolFailureTimestamps.map((t) => new Date(t).toISOString())
      });
    }
  }

  return alerts;
}
