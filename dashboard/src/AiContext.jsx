import React, { useMemo, useState, useRef, useEffect } from 'react';

const OPENCLAW_CHAT_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENCLAW_WEBCHAT_URL
  ? import.meta.env.VITE_OPENCLAW_WEBCHAT_URL
  : (typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENCLAW_DASHBOARD_URL ? import.meta.env.VITE_OPENCLAW_DASHBOARD_URL : '');

function buildPageContext(events, rules) {
  const alertEvents = events.filter((e) => {
    if (e.type === 'heartbeat') return false;
    if (e.type === 'alert') return true;
    return ['high', 'critical', 'medium'].includes(e.severity);
  });

  const bySeverity = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  alertEvents.forEach((e) => {
    const s = e.severity || 'info';
    if (bySeverity[s] !== undefined) bySeverity[s]++;
  });

  const byRule = {};
  alertEvents.forEach((e) => {
    const key = e.details?.rule || e.summary || e.type;
    if (!byRule[key]) byRule[key] = [];
    byRule[key].push({ ts: e.ts, severity: e.severity, summary: e.summary, evidenceCount: (e.details?.evidence || []).length });
  });

  return {
    source: 'moltsoc_dashboard',
    view: 'ai',
    timestamp: new Date().toISOString(),
    summary: {
      totalEvents: events.length,
      totalAlerts: alertEvents.length,
      bySeverity,
    },
    alerts: alertEvents.slice(0, 50).map((e) => ({
      ts: e.ts,
      rule: e.details?.rule,
      severity: e.severity,
      summary: e.summary,
      evidenceCount: (e.details?.evidence || []).length,
    })),
    byRule: Object.entries(byRule).map(([rule, list]) => ({ rule, count: list.length, latest: list[0] })),
    rules: rules.map((r) => ({ id: r.id, name: r.name, severity: r.severity, threshold: r.threshold, enabled: r.enabled })),
  };
}

export function AiContext({ events, rules }) {
  const [copied, setCopied] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const iframeRef = useRef(null);
  const pageContextRef = useRef(null);

  const pageContext = useMemo(() => buildPageContext(events, rules), [events, rules]);
  pageContextRef.current = pageContext;
  const contextJson = useMemo(() => JSON.stringify(pageContext, null, 2), [pageContext]);

  const copyTimeoutRef = useRef(null);
  const copy = () => {
    navigator.clipboard.writeText(contextJson).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  };
  useEffect(() => () => { if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current); }, []);

  const sendContextToOpenClaw = () => {
    if (!iframeRef.current?.contentWindow) return;
    try {
      iframeRef.current.contentWindow.postMessage(
        { type: 'moltsoc_context', payload: pageContext },
        '*'
      );
    } catch (_) {}
  };

  useEffect(() => {
    if (!OPENCLAW_CHAT_URL || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const onLoad = () => {
      try {
        const ctx = pageContextRef.current;
        if (ctx) iframe.contentWindow.postMessage({ type: 'moltsoc_context', payload: ctx }, '*');
      } catch (_) {}
    };
    iframe.addEventListener('load', onLoad);
    return () => iframe.removeEventListener('load', onLoad);
  }, [OPENCLAW_CHAT_URL]);

  return (
    <div className="ai-context">
      <p className="ai-context-intro">
        OpenClaw is embedded below with <strong>page context</strong> (alerts, rules, summary) so it can see what you see — like Rovo seeing Confluence pages. Ask it to triage alerts, suggest actions, or maintain rules. Enable the <strong>moltsoc-soc</strong> skill for best results.
      </p>

      {OPENCLAW_CHAT_URL ? (
        <>
          <div className="ai-context-actions">
            <button type="button" className="btn-send-context" onClick={sendContextToOpenClaw}>
              Send page context to OpenClaw
            </button>
            <button type="button" className="btn-copy-context" onClick={copy}>
              {copied ? 'Copied!' : 'Copy context JSON'}
            </button>
            <button type="button" className="btn-toggle-json" onClick={() => setShowJson((s) => !s)}>
              {showJson ? 'Hide' : 'Show'} context JSON
            </button>
          </div>

          <div className="ai-chat-embed">
            <iframe
              ref={iframeRef}
              src={OPENCLAW_CHAT_URL}
              title="OpenClaw chat"
              className="ai-chat-iframe"
            />
          </div>

          {showJson && (
            <details open className="ai-context-json-wrap">
              <summary>Page context (sent to OpenClaw)</summary>
              <pre className="ai-context-text">{contextJson}</pre>
            </details>
          )}
        </>
      ) : (
        <div className="ai-context-no-embed">
          <p>To embed OpenClaw chat here, set one of these in your <code>.env</code> (in the <code>dashboard/</code> folder) and restart the dev server:</p>
          <pre className="ai-context-env">
{`VITE_OPENCLAW_WEBCHAT_URL=http://localhost:3000
# or
VITE_OPENCLAW_DASHBOARD_URL=http://localhost:3000`}
          </pre>
          <p>Replace the URL with your OpenClaw WebChat or dashboard URL. Then this tab will show the embedded chat and send page context (alerts, rules) so OpenClaw can suggest actions.</p>
          <div className="ai-context-actions">
            <button type="button" className="btn-copy-context" onClick={copy}>
              {copied ? 'Copied!' : 'Copy context JSON'}
            </button>
            <button type="button" className="btn-toggle-json" onClick={() => setShowJson((s) => !s)}>
              {showJson ? 'Hide' : 'Show'} context JSON
            </button>
          </div>
          {showJson && <pre className="ai-context-text">{contextJson}</pre>}
        </div>
      )}
    </div>
  );
}
