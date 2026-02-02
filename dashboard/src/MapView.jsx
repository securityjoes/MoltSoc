import React, { useMemo } from 'react';

function aggregateHints(events) {
  const byDest = new Map();
  const byAsn = new Map();
  const timeCounts = [];
  events.forEach((e) => {
    const d = e.details || {};
    const dest = d.destination || d.domain || d.ip;
    const asn = d.asn;
    if (dest) {
      byDest.set(dest, (byDest.get(dest) || 0) + 1);
    }
    if (asn != null) {
      const k = String(asn);
      byAsn.set(k, (byAsn.get(k) || 0) + 1);
    }
    if (dest || asn != null) {
      const ts = e.ts ? e.ts.slice(0, 13) : '';
      if (ts) {
        const idx = timeCounts.findIndex((x) => x.ts === ts);
        if (idx >= 0) timeCounts[idx].n += 1;
        else timeCounts.push({ ts, n: 1 });
      }
    }
  });
  timeCounts.sort((a, b) => a.ts.localeCompare(b.ts));
  const topDest = [...byDest.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const topAsn = [...byAsn.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { topDest, topAsn, timeCounts, hasAny: topDest.length > 0 || topAsn.length > 0 };
}

export function MapView({ events }) {
  const { topDest, topAsn, timeCounts, hasAny } = useMemo(() => aggregateHints(events), [events]);

  if (!hasAny) {
    return (
      <div className="map-placeholder">
        <p>No network hints yet.</p>
        <p className="map-hint">Events with <code>details.destination</code>, <code>details.domain</code>, <code>details.ip</code>, or <code>details.asn</code> will appear here.</p>
      </div>
    );
  }

  const maxN = Math.max(1, ...timeCounts.map((x) => x.n));

  return (
    <div className="map-view">
      <section className="map-section">
        <h4>Top destinations (domain/IP)</h4>
        <ul className="map-list">
          {topDest.map(([name, count]) => (
            <li key={name}><code>{name}</code> <span className="count">{count}</span></li>
          ))}
        </ul>
      </section>
      <section className="map-section">
        <h4>Top ASNs</h4>
        <ul className="map-list">
          {topAsn.map(([asn, count]) => (
            <li key={asn}>ASN <code>{asn}</code> <span className="count">{count}</span></li>
          ))}
        </ul>
      </section>
      {timeCounts.length > 0 && (
        <section className="map-section">
          <h4>Counts over time (sparkline)</h4>
          <div className="sparkline" title={timeCounts.map((x) => `${x.ts}: ${x.n}`).join(', ')}>
            {timeCounts.map((x, i) => (
              <span
                key={i}
                className="sparkline-bar"
                style={{ height: `${(x.n / maxN) * 100}%` }}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
