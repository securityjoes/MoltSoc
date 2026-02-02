import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Timeline } from './Timeline';
import { Alerts } from './Alerts';
import { Session } from './Session';
import { MapView } from './MapView';
import { RulesPanel } from './RulesPanel';
import { AiContext } from './AiContext';
import { loadEventsFromFile, connectLive, fetchEvents, DEFAULT_RULES, SAMPLE_EVENTS } from './data';

const EVENTS_URL = 'http://127.0.0.1:7777/events';
const MAX_EVENTS = 10000;
const OPENCLAW_DASHBOARD_URL = typeof import.meta !== 'undefined' && import.meta.env?.VITE_OPENCLAW_DASHBOARD_URL ? import.meta.env.VITE_OPENCLAW_DASHBOARD_URL : '';

export default function App() {
  const [events, setEvents] = useState([]);
  const [tab, setTab] = useState('timeline');
  const [useLive, setUseLive] = useState(false);
  const [endpoint, setEndpoint] = useState(EVENTS_URL);
  const [selectedBot, setSelectedBot] = useState('');
  const [liveError, setLiveError] = useState(null);
  const disconnectRef = useRef(null);
  const [rules, setRules] = useState(() => {
    try {
      const s = localStorage.getItem('moltsoc-rules');
      return s ? JSON.parse(s) : DEFAULT_RULES;
    } catch (_) {
      return DEFAULT_RULES;
    }
  });

  const botIds = React.useMemo(() => {
    const set = new Set();
    events.forEach((e) => { if (e.bot_id) set.add(e.bot_id); });
    return [...set].sort();
  }, [events]);

  useEffect(() => {
    if (!useLive) return;
    setLiveError(null);
    const ac = new AbortController();
    fetchEvents(endpoint, ac.signal).then((initial) => {
      setEvents(initial.slice(-MAX_EVENTS));
    }).catch(() => setEvents([]));
    const disconnect = connectLive(endpoint, (newEvents) => {
      setEvents((prev) => {
        const next = [...newEvents, ...prev];
        const seen = new Set();
        return next.filter((e) => {
          const k = e.ts + (e.summary || '');
          if (seen.has(k)) return false;
          seen.add(k);
          return true;
        }).slice(0, MAX_EVENTS);
      });
    }, (err) => setLiveError(err?.message || 'Live connection failed'));
    disconnectRef.current = disconnect;
    return () => {
      ac.abort();
      if (disconnectRef.current) disconnectRef.current();
    };
  }, [useLive, endpoint]);

  const onFileDrop = useCallback((file) => {
    setUseLive(false);
    setLiveError(null);
    if (disconnectRef.current) disconnectRef.current();
    loadEventsFromFile(file).then(setEvents);
  }, []);

  const onLoadSampleData = useCallback(() => {
    setUseLive(false);
    setLiveError(null);
    if (disconnectRef.current) disconnectRef.current();
    setEvents(SAMPLE_EVENTS);
  }, []);

  const persistRules = useCallback((next) => {
    setRules(next);
    try {
      localStorage.setItem('moltsoc-rules', JSON.stringify(next));
    } catch (_) {}
  }, []);

  const displayEvents = selectedBot
    ? events.filter((e) => e.bot_id === selectedBot)
    : events;

  const alertEvents = displayEvents.filter((e) => {
    if (e.type === 'heartbeat') return false;
    if (e.type === 'alert') return true;
    return ['high', 'critical', 'medium'].includes(e.severity);
  });

  return (
    <div className="app">
      <header className="app-header">
        <h1>MoltSOC v0</h1>
        {OPENCLAW_DASHBOARD_URL ? (
          <a href={OPENCLAW_DASHBOARD_URL} target="_blank" rel="noopener noreferrer" className="link-openclaw" title="Open OpenClaw dashboard">
            Open OpenClaw
          </a>
        ) : null}
        <nav className="tabs">
          {['timeline', 'alerts', 'session', 'map', 'rules', 'ai'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <div className="data-source">
          <button type="button" className="btn-sample" onClick={onLoadSampleData} title="Load sample alerts and map data">
            Load sample data
          </button>
          {botIds.length > 1 && (
            <select
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
              title="Bot selector"
              className="bot-selector"
            >
              <option value="">All bots</option>
              {botIds.map((id) => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          )}
          <label>
            <input type="checkbox" checked={useLive} onChange={(e) => setUseLive(e.target.checked)} />
            Live
          </label>
          <input
            type="text"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="http://127.0.0.1:7777/events"
          />
          {liveError && <span className="live-error" title={liveError}>⚠ SSE fallback</span>}
        </div>
      </header>

      {events.length === 0 && !useLive ? (
        <div
          className="drop-zone"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
          onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const f = e.dataTransfer.files?.[0];
            if (f?.name.endsWith('.jsonl')) onFileDrop(f);
          }}
        >
          Drop events.jsonl here or enable Live and point to collector (e.g. http://127.0.0.1:7777/events).
        </div>
      ) : null}

      <main className="panel">
        {tab === 'timeline' && <Timeline events={displayEvents} />}
        {tab === 'alerts' && <Alerts events={alertEvents} rules={rules} />}
        {tab === 'session' && <Session events={displayEvents} selectedBot={selectedBot} botIds={botIds} />}
        {tab === 'map' && <MapView events={displayEvents} />}
        {tab === 'rules' && <RulesPanel rules={rules} onSave={persistRules} />}
        {tab === 'ai' && <AiContext events={displayEvents} rules={rules} />}
      </main>
    </div>
  );
}
