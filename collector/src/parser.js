const ISO_RE = /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/;

export function extractTimestamp(line) {
  const m = line.match(ISO_RE);
  return m ? m[0] : null;
}

export function parseLogLine(line) {
  const ts = extractTimestamp(line) || new Date().toISOString();
  return { ts, details: { raw_line: line } };
}
