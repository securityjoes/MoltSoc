import React, { useMemo, useState } from 'react';

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

export function Timeline({ events }) {
  const [sortBy, setSortBy] = useState('ts');
  const sorted = useMemo(() => {
    const list = [...events];
    if (sortBy === 'ts') list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
    if (sortBy === 'severity') list.sort((a, b) => (SEV_ORDER[a.severity] ?? 5) - (SEV_ORDER[b.severity] ?? 5));
    return list;
  }, [events, sortBy]);

  return (
    <>
      <div className="filter-row">
        <label>Sort:</label>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="ts">Time (newest first)</option>
          <option value="severity">Severity</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Host</th>
              <th>Bot / Session</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={i}>
                <td>{e.ts}</td>
                <td>{e.host_id}</td>
                <td>{e.bot_id || '-'} / {e.session_id || '-'}</td>
                <td>{e.type}</td>
                <td className={`severity-${e.severity}`}>{e.severity}</td>
                <td>{e.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
