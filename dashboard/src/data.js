const EVENTS_URL = 'http://127.0.0.1:7777/events';
const STREAM_PATH = '/stream';
const POLL_MS = 5000;
const INITIAL_FETCH_MAX = 2000;

export const DEFAULT_RULES = [
  { id: 'GATEWAY_UNREACHABLE', name: 'Gateway unreachable', severity: 'high', threshold: 1, enabled: true, description: 'Fires when OpenClaw logs show ECONNREFUSED to 127.0.0.1 or localhost (gateway not reachable).', examplePayload: 'Error: connect ECONNREFUSED 127.0.0.1:7777' },
  { id: 'MISSING_GATEWAY_TOKEN', name: 'Missing gateway token', severity: 'medium', threshold: 1, enabled: true, description: 'Fires when logs or CLI status indicate the gateway token is missing.', examplePayload: 'Missing gateway token in config' },
  { id: 'TOOL_LOOP', name: 'Rapid failures (tool loop)', severity: 'high', threshold: 5, enabled: true, description: 'Same error repeated more than N times within 1 minute (suggests a tool loop or stuck agent).', examplePayload: 'Tool X failed (same hash 6 times in 1m)' },
  { id: 'PUBLIC_BIND', name: 'Bind 0.0.0.0', severity: 'medium', threshold: 1, enabled: true, description: 'Gateway or server bound to 0.0.0.0 or :::0 (exposed on all interfaces).', examplePayload: 'Gateway listening on 0.0.0.0:7777' },
  { id: 'SUSPICIOUS_COMMAND_PATTERN', name: 'Suspicious command (powershell -enc / IEX)', severity: 'high', threshold: 1, enabled: true, description: 'Log line contains powershell -enc, -encodedcommand, IEX, or base64 decode patterns often used in obfuscated scripts.', examplePayload: 'powershell -enc JABjAGwAaQBlAG4AdA...' },
  { id: 'PORT_CHANGED', name: 'Port changed', severity: 'low', threshold: 1, enabled: true, description: 'Gateway port changed between CLI status polls.', examplePayload: 'Port 8080 -> 9090' },
  { id: 'GATEWAY_RESTART_LOOP', name: 'Gateway restart loop', severity: 'high', threshold: 3, enabled: true, description: 'More than 3 stop/start transitions within 5 minutes (unstable gateway).', examplePayload: 'Stop/start at T0, T1, T2, T3' },
  { id: 'AUTH_FAILURE_BURST', name: 'Auth failure burst', severity: 'medium', threshold: 5, enabled: true, description: 'Auth failure log lines exceed N per minute.', examplePayload: '5+ "auth failed" lines in 1m' },
  { id: 'TOOL_FAILURE_RATE', name: 'Tool failure rate', severity: 'high', threshold: 10, enabled: true, description: 'Tool error lines exceed N per minute.', examplePayload: '10+ tool error lines in 1m' }
];

const MAX_FILE_EVENTS = 5000;

export function loadEventsFromFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const lines = r.result.split(/\r?\n/).filter(Boolean);
      const parsed = lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      }).filter(Boolean);
      const events = parsed.length > MAX_FILE_EVENTS ? parsed.slice(-MAX_FILE_EVENTS) : parsed;
      resolve(events);
    };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

function baseUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch (_) {
    return 'http://127.0.0.1:7777';
  }
}

export async function fetchEvents(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  const arr = Array.isArray(data) ? data : [];
  return arr.length > INITIAL_FETCH_MAX ? arr.slice(-INITIAL_FETCH_MAX) : arr;
}

export async function fetchEventsSince(url, since, signal) {
  const u = new URL(url);
  u.pathname = u.pathname.replace(/\/stream$/, '') || '/events';
  if (!u.pathname.endsWith('events')) u.pathname = u.pathname.replace(/\/?$/, '/') + 'events';
  u.searchParams.set('since', since);
  const res = await fetch(u.toString(), { signal });
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export function connectLive(baseUrlOrEventsUrl, onEvents, onError) {
  const base = baseUrl(baseUrlOrEventsUrl).replace(/\/$/, '');
  const streamUrl = base + '/stream';
  let fallbackTimer = null;
  let eventSource = null;
  let lastTs = new Date().toISOString();
  let pollUrl = base + '/events';

  function poll() {
    fetchEventsSince(pollUrl, lastTs, null).then((events) => {
      if (events.length > 0) {
        const latest = events[events.length - 1];
        if (latest.ts) lastTs = latest.ts;
        onEvents(events);
      }
    }).catch((err) => onError?.(err));
  }

  try {
    eventSource = new EventSource(streamUrl);
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        if (event.ts) lastTs = event.ts;
        onEvents([event]);
      } catch (_) {}
    };
    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) return;
      eventSource.close();
      eventSource = null;
      onError?.(new Error('SSE failed, falling back to polling'));
      fallbackTimer = setInterval(poll, POLL_MS);
    };
  } catch (err) {
    onError?.(err);
    fallbackTimer = setInterval(poll, POLL_MS);
  }

  return function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (fallbackTimer) clearInterval(fallbackTimer);
  };
}

export async function pollEvents(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(res.statusText);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
