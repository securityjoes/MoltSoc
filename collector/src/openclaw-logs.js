import fs from 'fs';
import path from 'path';
import { createEvent } from './schema.js';
import { parseLogLine } from './parser.js';
import { checkLine, emitAlert } from './alerts.js';
import { writeEvent } from './writer.js';

function watchFile(logPath, redact, processLine) {
  let position = 0;
  try {
    const st = fs.statSync(logPath);
    position = st.size;
  } catch (_) {}

  const tick = () => {
    try {
      const st = fs.statSync(logPath);
      if (st.size > position) {
        const fd = fs.openSync(logPath, 'r');
        const buf = Buffer.alloc(st.size - position);
        fs.readSync(fd, buf, 0, buf.length, position);
        fs.closeSync(fd);
        position = st.size;
        const acc = buf.toString('utf8');
        acc.split(/\r?\n/).filter(Boolean).forEach((line) => processLine(line, redact));
      }
    } catch (_) {}
  };

  fs.watch(logPath, { persistent: true }, () => tick());
  setInterval(tick, 3000);
}

export function startOpenClawLogs(logPath, opts) {
  const { redact = true, hostId, botId } = opts;
  const absolutePath = path.isAbsolute(logPath) ? logPath : path.resolve(process.cwd(), logPath);
  const alertOpts = { redact, botId };

  const processLine = (line, doRedact) => {
    const { ts, details } = parseLogLine(line);
    const alerts = checkLine(line, ts, alertOpts);
    const base = createEvent({
      ts,
      host_id: hostId || createEvent().host_id,
      bot_id: botId || '',
      type: 'tool_call',
      severity: 'info',
      summary: 'Log line',
      details
    });
    writeEvent(base, doRedact);
    alerts.forEach((a) => {
      emitAlert(alertOpts, a.rule, a.severity, a.summary, {
        threshold: a.threshold,
        window: a.window,
        evidence: a.evidence || []
      }, ts);
    });
  };

  if (!fs.existsSync(absolutePath)) {
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(absolutePath, '', 'utf8');
  }

  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    lines.forEach((l) => processLine(l, redact));
    watchFile(absolutePath, redact, processLine);
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(absolutePath).filter((f) => f.endsWith('.log') || f.endsWith('.txt'));
    files.forEach((f) => {
      const full = path.join(absolutePath, f);
      const c = fs.readFileSync(full, 'utf8').split(/\r?\n/).filter(Boolean);
      c.forEach((l) => processLine(l, redact));
      watchFile(full, redact, processLine);
    });
  }
}
