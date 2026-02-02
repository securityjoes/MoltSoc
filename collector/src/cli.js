#!/usr/bin/env node
import path from 'path';
import { createEvent } from './schema.js';
import { openOutput, writeEvent, setMaxEvents } from './writer.js';
import { createServer } from './server.js';
import { startOpenClawLogs } from './openclaw-logs.js';
import { startOpenClawCli } from './openclaw-cli.js';
import { getOrCreateBotId } from './state.js';
import { discoverLogPaths, resolveLogTarget, printDiscover } from './discover.js';

const source = process.env.MOLTSOC_SOURCE || 'openclaw-logs';
const logPath = process.env.MOLTSOC_LOG_PATH || '';
const out = process.env.MOLTSOC_OUT || './events.jsonl';
const serve = process.env.MOLTSOC_SERVE === '1' || process.env.MOLTSOC_SERVE === 'true';
const redact = process.env.MOLTSOC_REDACT !== '0' && process.env.MOLTSOC_REDACT !== 'false';
const maxEvents = parseInt(process.env.MOLTSOC_MAX_EVENTS || '10000', 10) || 10000;

function parseArgs() {
  const args = process.argv.slice(2);
  let src = source;
  let lp = logPath;
  let outPath = out;
  let doServe = serve;
  let doRedact = redact;
  let doDiscover = false;
  let maxEv = maxEvents;
  let botIdArg = process.env.MOLTSOC_BOT_ID || '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--discover') { doDiscover = true; continue; }
    if (args[i] === '--source' && args[i + 1]) { src = args[++i]; continue; }
    if (args[i].startsWith('--source=')) { src = args[i].slice(9); continue; }
    if (args[i] === '--logPath' && args[i + 1]) { lp = args[++i]; continue; }
    if (args[i].startsWith('--logPath=')) { lp = args[i].slice(10); continue; }
    if (args[i] === '--out' && args[i + 1]) { outPath = args[++i]; continue; }
    if (args[i].startsWith('--out=')) { outPath = args[i].slice(6); continue; }
    if (args[i] === '--serve') { doServe = true; continue; }
    if (args[i] === '--redact') { doRedact = true; continue; }
    if (args[i] === '--no-redact') { doRedact = false; continue; }
    if (args[i] === '--maxEvents' && args[i + 1]) { maxEv = parseInt(args[++i], 10) || 10000; continue; }
    if (args[i].startsWith('--maxEvents=')) { maxEv = parseInt(args[i].slice(12), 10) || 10000; continue; }
    if (args[i] === '--botId' && args[i + 1]) { botIdArg = args[++i]; continue; }
    if (args[i].startsWith('--botId=')) { botIdArg = args[i].slice(7); continue; }
  }
  return { source: src, logPath: lp, out: outPath, serve: doServe, redact: doRedact, discover: doDiscover, maxEvents: maxEv, botId: botIdArg };
}

const parsed = parseArgs();
const { source: src, logPath: lp, out: outPath, serve: doServe, redact: doRedact, discover: doDiscover, maxEvents: maxEv, botId: botIdArg } = parsed;

if (doDiscover) {
  printDiscover();
  process.exit(0);
}

const botId = getOrCreateBotId(botIdArg);
openOutput(outPath, { maxEvents: maxEv });
setMaxEvents(maxEv);

if (doServe) {
  createServer(7777);
}

setInterval(() => {
  writeEvent(createEvent({ type: 'heartbeat', severity: 'info', summary: 'Collector heartbeat', bot_id: botId }), doRedact);
}, 30_000);

writeEvent(createEvent({
  type: 'config_change',
  severity: 'info',
  summary: 'MoltSOC collector started',
  details: { source: src, redact: doRedact, bot_id: botId },
  bot_id: botId
}), doRedact);

if (src === 'openclaw-logs') {
  const resolvedPath = resolveLogTarget(lp || null);
  startOpenClawLogs(resolvedPath, { redact: doRedact, out: outPath, botId });
} else if (src === 'openclaw-cli') {
  startOpenClawCli({ redact: doRedact, botId });
} else {
  writeEvent(createEvent({ type: 'error', severity: 'medium', summary: `Unknown source: ${src}`, bot_id: botId }), doRedact);
}

process.on('SIGINT', () => process.exit(0));
