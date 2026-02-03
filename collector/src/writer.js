import fs from 'fs';
import crypto from 'crypto';

let outStream = null;
let eventsBuffer = [];
let maxEvents = 10000;
const streamListeners = new Set();

export function setMaxEvents(n) {
  maxEvents = Math.max(1000, n);
  while (eventsBuffer.length > maxEvents) eventsBuffer.shift();
}

export function openOutput(filePath, opts = {}) {
  if (outStream) outStream.end();
  outStream = fs.createWriteStream(filePath, { flags: 'a' });
  maxEvents = opts.maxEvents ?? 10000;
  eventsBuffer = [];
  return outStream;
}

export function subscribeStream(cb) {
  streamListeners.add(cb);
  return function unsub() { streamListeners.delete(cb); };
}

function notifyStream(event) {
  streamListeners.forEach((cb) => { try { cb(event); } catch (_) {} });
}

export function writeEvent(event, redact = true) {
  const e = { ...event };
  if (e.details) {
    e.details = { ...e.details };
    if (Array.isArray(e.details.evidence)) e.details.evidence = [...e.details.evidence];
  }
  if (redact && e.details?.raw_line) {
    e.details.raw_line_hash = crypto.createHash('sha256').update(e.details.raw_line).digest('hex');
    delete e.details.raw_line;
  }
  const line = JSON.stringify(e) + '\n';
  if (outStream) outStream.write(line);
  eventsBuffer.push(e);
  while (eventsBuffer.length > maxEvents) eventsBuffer.shift();
  notifyStream(e);
}

export function getEvents() {
  return eventsBuffer.slice();
}

export function getEventsSince(ts) {
  const t = new Date(ts).getTime();
  return eventsBuffer.filter((e) => new Date(e.ts).getTime() > t);
}

export function getRingBuffer() {
  return eventsBuffer;
}
