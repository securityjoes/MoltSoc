import React, { useMemo, useState } from 'react';

function buildSocContext(events, rules) {
  const alertEvents = events.filter((e) => {
    if (e.type === 'heartbeat') return false;
    if (e.type === 'alert') return true;
    return ['high', 'critical', 'medium'].includes(e.severity);
  });

  const byRule = {};
  alertEvents.forEach((e) => {
    const key = e.details?.rule || e.summary || e.type;
    if (!byRule[key]) byRule[key] = [];
    byRule[key].push(e);
  });

  const lines = [
    '# SOC context for AI (MoltSOC)',
    '',
    'Paste this into your AI chat (OpenClaw/Cursor) and ask to triage alerts, suggest actions, or create new rules. Use the moltsoc-soc skill.',
    '',
    '## Alerts summary',
    ''
  ];

  const bySev = { critical: [], high: [], medium: [], low: [], info: [] };
  alertEvents.forEach((e) => {
    const s = e.severity || 'info';
    if (bySev[s]) bySev[s].push(e);
  });

  lines.push('| Severity | Count |');
  lines.push('|----------|-------|');
  ['critical', 'high', 'medium', 'low', 'info'].forEach((sev) => {
    const n = (bySev[sev] || []).length;
    if (n > 0) lines.push(`| ${sev} | ${n} |`);
  });
  lines.push('');

  lines.push('### By rule');
  lines.push('');
  lines.push('| Rule / Summary | Count | Severity | Latest |');
  lines.push('|----------------|-------|----------|--------|');
  Object.entries(byRule).forEach(([rule, list]) => {
    const latest = list[0];
    const sev = latest?.severity || 'info';
    const ts = latest?.ts || '';
    lines.push(`| ${rule} | ${list.length} | ${sev} | ${ts} |`);
  });
  lines.push('');

  lines.push('### Recent alert evidence (hashes only)');
  lines.push('');
  alertEvents.slice(0, 20).forEach((e) => {
    const ev = e.details?.evidence;
    if (ev?.length) lines.push(`- **${e.details?.rule || e.summary}** (${e.severity}): ${ev.slice(0, 3).join(', ')}`);
  });
  lines.push('');

  lines.push('## Current rules (dashboard)');
  lines.push('');
  lines.push('| id | name | severity | threshold | enabled |');
  lines.push('|----|------|----------|-----------|---------|');
  rules.forEach((r) => {
    lines.push(`| ${r.id} | ${r.name} | ${r.severity} | ${r.threshold} | ${r.enabled} |`);
  });
  lines.push('');
  lines.push('---');
  lines.push('End of SOC context.');
  return lines.join('\n');
}

export function AiContext({ events, rules }) {
  const [copied, setCopied] = useState(false);
  const context = useMemo(() => buildSocContext(events, rules), [events, rules]);

  const copy = () => {
    navigator.clipboard.writeText(context).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="ai-context">
      <p className="ai-context-intro">
        Use this context with your AI (OpenClaw/Cursor). Enable the <strong>moltsoc-soc</strong> skill so the AI can triage alerts, suggest actions, and create new rules.
      </p>
      <div className="ai-context-actions">
        <button type="button" className="btn-copy-context" onClick={copy}>
          {copied ? 'Copied!' : 'Copy context to clipboard'}
        </button>
      </div>
      <pre className="ai-context-text">{context}</pre>
    </div>
  );
}
