import React, { useMemo, useState } from 'react';

export function Alerts({ events, rules, severityFilter, ruleFilter, onClearFilter }) {
  const [drawer, setDrawer] = useState(null);
  const byRule = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const key = e.details?.rule || e.summary || e.type;
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  let rows = Object.entries(byRule);
  if (severityFilter) {
    rows = rows.filter(([, list]) => list.some((e) => (e.severity || 'info') === severityFilter));
    const filtered = [];
    rows.forEach(([rule, list]) => {
      filtered.push([rule, list.filter((e) => (e.severity || 'info') === severityFilter)]);
    });
    rows = filtered;
  }
  if (ruleFilter) {
    rows = rows.filter(([rule]) => rule === ruleFilter);
  }

  const hasFilter = severityFilter || ruleFilter;

  return (
    <>
      {hasFilter && (
        <div className="alerts-filter-banner">
          <span className="alerts-filter-label">
            Filter: {severityFilter ? `severity = ${severityFilter}` : ''} {ruleFilter ? `rule = ${ruleFilter}` : ''}
          </span>
          <button type="button" className="alerts-filter-clear" onClick={onClearFilter}>
            Clear filter
          </button>
        </div>
      )}
      {rows.length === 0 && (
        <p className="alerts-empty">
          {hasFilter ? 'No alerts match the current filter.' : 'No alerts in this dataset. Enable Live when the collector is running, or load events.'}
          {hasFilter && ' '}
          {hasFilter && onClearFilter && (
            <button type="button" className="link-button" onClick={onClearFilter}>Clear filter</button>
          )}
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rule / Summary</th>
              <th>Count</th>
              <th>Severity</th>
              <th>Latest</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([rule, list]) => {
              const latest = list[0];
              const sev = latest?.severity || 'info';
              return (
                <tr key={rule}>
                  <td>{rule}</td>
                  <td>{list.length}</td>
                  <td className={`severity-${sev}`}>{sev}</td>
                  <td>{latest?.ts}</td>
                  <td>
                    <button
                      type="button"
                      className="drawer-btn"
                      onClick={() => setDrawer(latest)}
                    >
                      Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {drawer && (
        <div className="alert-drawer-overlay" onClick={() => setDrawer(null)}>
          <div className="alert-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="alert-drawer-header">
              <h3>Alert details</h3>
              <button type="button" className="drawer-close" onClick={() => setDrawer(null)}>×</button>
            </div>
            <div className="alert-drawer-body">
              <p><strong>Rule:</strong> {drawer.details?.rule ?? drawer.summary}</p>
              <p><strong>Severity:</strong> {drawer.severity}</p>
              <p><strong>Time:</strong> {drawer.ts}</p>
              {drawer.details?.threshold != null && <p><strong>Threshold:</strong> {drawer.details.threshold}</p>}
              {drawer.details?.window && <p><strong>Window:</strong> {drawer.details.window}</p>}
              {drawer.details?.evidence?.length ? (
                <div>
                  <strong>Evidence:</strong>
                  <ul className="evidence-list">
                    {drawer.details.evidence.map((item, i) => (
                      <li key={i} className="evidence-item"><code>{String(item)}</code></li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
