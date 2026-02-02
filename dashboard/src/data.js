const EVENTS_URL = 'http://127.0.0.1:7777/events';
const STREAM_PATH = '/stream';
const POLL_MS = 2000;

export const DEFAULT_RULES = [
  { id: 'GATEWAY_UNREACHABLE', name: 'Gateway unreachable', severity: 'high', threshold: 1, enabled: true },
  { id: 'MISSING_GATEWAY_TOKEN', name: 'Missing gateway token', severity: 'medium', threshold: 1, enabled: true },
  { id: 'TOOL_LOOP', name: 'Rapid failures (tool loop)', severity: 'high', threshold: 5, enabled: true },
  { id: 'PUBLIC_BIND', name: 'Bind 0.0.0.0', severity: 'medium', threshold: 1, enabled: true },
  { id: 'SUSPICIOUS_COMMAND_PATTERN', name: 'Suspicious command (powershell -enc / IEX)', severity: 'high', threshold: 1, enabled: true },
  { id: 'PORT_CHANGED', name: 'Port changed', severity: 'low', threshold: 1, enabled: true },
  { id: 'GATEWAY_RESTART_LOOP', name: 'Gateway restart loop', severity: 'high', threshold: 3, enabled: true },
  { id: 'AUTH_FAILURE_BURST', name: 'Auth failure burst', severity: 'medium', threshold: 5, enabled: true },
  { id: 'TOOL_FAILURE_RATE', name: 'Tool failure rate', severity: 'high', threshold: 10, enabled: true }
];

export const SAMPLE_EVENTS = [
  { ts: '2025-02-02T12:00:00.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'config_change', severity: 'info', summary: 'MoltSOC collector started', details: { source: 'openclaw-logs', redact: true } },
  { ts: '2025-02-02T12:00:30.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'heartbeat', severity: 'info', summary: 'Collector heartbeat', details: {} },
  { ts: '2025-02-02T12:01:00.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-1', session_id: 'sess-001', channel_id: '', type: 'tool_call', severity: 'info', summary: 'Log line', details: { raw_line_hash: 'a1b2c3d4e5f6' } },
  { ts: '2025-02-02T12:01:30.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-2', session_id: 'sess-002', channel_id: '', type: 'tool_call', severity: 'info', summary: 'Log line', details: { raw_line_hash: 'b2c3d4e5f6a1' } },
  { ts: '2025-02-02T12:02:00.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'alert', severity: 'high', summary: 'Gateway unreachable (ECONNREFUSED)', details: { rule: 'GATEWAY_UNREACHABLE', threshold: 1, window: '', evidence: ['ecconnrefused_127.0.0.1_hash'] } },
  { ts: '2025-02-02T12:02:15.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'alert', severity: 'medium', summary: 'Missing gateway token warning', details: { rule: 'MISSING_GATEWAY_TOKEN', threshold: 1, window: '', evidence: ['missing_token_line_hash'] } },
  { ts: '2025-02-02T12:02:30.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'heartbeat', severity: 'info', summary: 'Collector heartbeat', details: {} },
  { ts: '2025-02-02T12:03:00.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-1', session_id: 'sess-001', channel_id: '', type: 'alert', severity: 'high', summary: 'Rapid repeated failures (tool loop)', details: { rule: 'TOOL_LOOP', threshold: 5, window: '1m', evidence: ['a1b2c3d4e5f6', 'count:6'] } },
  { ts: '2025-02-02T12:03:20.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'alert', severity: 'medium', summary: 'Bind to 0.0.0.0 detected', details: { rule: 'PUBLIC_BIND', threshold: 1, window: '', evidence: ['bind_0.0.0.0_hash'] } },
  { ts: '2025-02-02T12:03:40.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-3', session_id: 'sess-003', channel_id: '', type: 'alert', severity: 'high', summary: 'Suspicious command pattern (powershell -enc / IEX / base64)', details: { rule: 'SUSPICIOUS_COMMAND_PATTERN', threshold: 1, window: '', evidence: ['suspicious_cmd_hash'] } },
  { ts: '2025-02-02T12:04:00.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'alert', severity: 'low', summary: 'Gateway port changed', details: { rule: 'PORT_CHANGED', threshold: 1, window: '', evidence: ['8080 -> 9090'] } },
  { ts: '2025-02-02T12:04:20.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'alert', severity: 'high', summary: 'Gateway restart loop (>3 stop/start in 5 min)', details: { rule: 'GATEWAY_RESTART_LOOP', threshold: 3, window: '5m', evidence: ['2025-02-02T12:00:00.000Z', '2025-02-02T12:01:00.000Z', '2025-02-02T12:02:00.000Z', '2025-02-02T12:03:00.000Z'] } },
  { ts: '2025-02-02T12:04:40.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-2', session_id: 'sess-002', channel_id: '', type: 'alert', severity: 'medium', summary: 'Auth failure burst (>N/min)', details: { rule: 'AUTH_FAILURE_BURST', threshold: 5, window: '1m', evidence: ['2025-02-02T12:04:35.000Z', '2025-02-02T12:04:36.000Z', '2025-02-02T12:04:37.000Z', '2025-02-02T12:04:38.000Z', '2025-02-02T12:04:39.000Z'] } },
  { ts: '2025-02-02T12:05:00.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-1', session_id: 'sess-001', channel_id: '', type: 'alert', severity: 'high', summary: 'Tool error rate (>N/min)', details: { rule: 'TOOL_FAILURE_RATE', threshold: 10, window: '1m', evidence: ['2025-02-02T12:04:50.000Z', '2025-02-02T12:04:52.000Z', '2025-02-02T12:04:54.000Z', '2025-02-02T12:04:56.000Z', '2025-02-02T12:04:58.000Z', '2025-02-02T12:05:00.000Z'] } },
  { ts: '2025-02-02T12:05:30.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'heartbeat', severity: 'info', summary: 'Collector heartbeat', details: {} },
  { ts: '2025-02-02T12:06:00.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-1', session_id: 'sess-001', channel_id: '', type: 'gateway_status', severity: 'info', summary: 'Gateway running', details: { state: 'running', port: 7777, bind: '127.0.0.1', token_present: true } },
  { ts: '2025-02-02T12:06:30.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-2', session_id: 'sess-002', channel_id: '', type: 'network_hint', severity: 'low', summary: 'Outbound request', details: { destination: 'api.github.com', domain: 'api.github.com' } },
  { ts: '2025-02-02T12:07:00.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-1', session_id: 'sess-001', channel_id: '', type: 'network_hint', severity: 'low', summary: 'Outbound request', details: { destination: 'api.openai.com', domain: 'api.openai.com' } },
  { ts: '2025-02-02T12:07:30.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-3', session_id: 'sess-003', channel_id: '', type: 'network_hint', severity: 'low', summary: 'Outbound request', details: { destination: '1.2.3.4', ip: '1.2.3.4' } },
  { ts: '2025-02-02T12:08:00.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-2', session_id: 'sess-002', channel_id: '', type: 'network_hint', severity: 'info', summary: 'Outbound request', details: { destination: 'api.github.com', domain: 'api.github.com', asn: '36459' } },
  { ts: '2025-02-02T12:08:30.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-1', session_id: 'sess-001', channel_id: '', type: 'network_hint', severity: 'info', summary: 'Outbound request', details: { destination: 'api.openai.com', domain: 'api.openai.com', asn: '46562' } },
  { ts: '2025-02-02T12:09:00.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'error', severity: 'critical', summary: 'RPC failed (from gateway status)', details: { exitCode: 1 } },
  { ts: '2025-02-02T12:09:30.000Z', host_id: 'DESKTOP-ABC', bot_id: 'bot-3', session_id: 'sess-003', channel_id: '', type: 'config_change', severity: 'info', summary: 'Gateway config updated', details: { port: 9090 } },
  { ts: '2025-02-02T12:10:00.000Z', host_id: 'DESKTOP-ABC', bot_id: '', session_id: '', channel_id: '', type: 'heartbeat', severity: 'info', summary: 'Collector heartbeat', details: {} }
];

export function loadEventsFromFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const lines = r.result.split(/\r?\n/).filter(Boolean);
      const events = lines.map((line) => {
        try {
          return JSON.parse(line);
        } catch (_) {
          return null;
        }
      }).filter(Boolean);
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
  return Array.isArray(data) ? data : [];
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
