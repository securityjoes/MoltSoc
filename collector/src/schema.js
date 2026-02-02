import os from 'os';

export const EVENT_TYPES = [
  'gateway_status',
  'auth_warning',
  'tool_call',
  'error',
  'network_hint',
  'heartbeat',
  'config_change',
  'alert'
];

export const SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'];

export function createEvent(overrides = {}) {
  const ts = new Date().toISOString();
  const hostId = process.env.MOLTSOC_HOST_ID || os.hostname();
  return {
    ts,
    host_id: hostId,
    bot_id: overrides.bot_id ?? '',
    session_id: overrides.session_id ?? '',
    channel_id: overrides.channel_id ?? '',
    type: overrides.type ?? 'heartbeat',
    severity: overrides.severity ?? 'info',
    summary: overrides.summary ?? '',
    details: overrides.details ?? {},
    ...overrides
  };
}
