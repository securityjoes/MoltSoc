import http from 'http';
import { getEvents, getEventsSince, subscribeStream } from './writer.js';

export function createServer(port = 7777) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Cache-Control'
  };

  return http.createServer((req, res) => {
    const url = req.url || '/';
    const path = url.split('?')[0];
    const params = new URLSearchParams(url.includes('?') ? url.slice(url.indexOf('?')) : '');

    if (req.method === 'OPTIONS') {
      res.writeHead(204, { ...cors, 'Access-Control-Max-Age': '86400' });
      res.end();
      return;
    }

    const jsonHeaders = { ...cors, 'Content-Type': 'application/json' };

    if (req.method === 'GET' && path === '/health') {
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify({ status: 'ok', ts: new Date().toISOString() }));
      return;
    }

    if (req.method === 'GET' && path === '/events') {
      const since = params.get('since');
      const events = since ? getEventsSince(since) : getEvents();
      res.writeHead(200, jsonHeaders);
      res.end(JSON.stringify(events));
      return;
    }

    if (req.method === 'GET' && path === '/stream') {
      res.writeHead(200, {
        ...cors,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive'
      });
      res.flushHeaders?.();
      const unsub = subscribeStream((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
        res.flushHeaders?.();
      });
      req.on('close', () => unsub());
      return;
    }

    if (req.method === 'GET' && path === '/') {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>MoltSOC collector</title></head><body style="font-family:sans-serif;padding:2rem;max-width:40rem;">
<h1>MoltSOC collector (API only)</h1>
<p>This is the <strong>collector API</strong>. It does not serve the dashboard.</p>
<p><strong>To see the dashboard:</strong> run <code>npm run dev</code> in the <code>dashboard/</code> folder, then open <a href="http://localhost:5173">http://localhost:5173</a> in your browser.</p>
<p>API endpoints: <a href="/health">/health</a>, <a href="/events">/events</a>, <a href="/stream">/stream</a></p>
</body></html>`;
      res.writeHead(200, { ...cors, 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }

    res.writeHead(404, { ...cors, 'Content-Type': 'text/plain' });
    res.end('Not found. Use /health, /events, or /stream.');
  }).listen(port, '127.0.0.1', () => {
    console.error(`MoltSOC collector on http://127.0.0.1:${port} (GET /events?since=, GET /stream, GET /health)`);
  });
}
