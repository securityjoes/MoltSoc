import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const SEV_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const SEV_COLORS = {
  critical: '#b91c1c',
  high: '#dc2626',
  medium: '#d97706',
  low: '#059669',
  info: '#64748b'
};

function bucketByHour(events, hours = 24) {
  const now = Date.now();
  const buckets = Array.from({ length: hours }, (_, i) => {
    const t = new Date(now - (hours - 1 - i) * 60 * 60 * 1000);
    return { hour: t.toISOString().slice(0, 13), count: 0, label: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
  });
  const cutoff = now - hours * 60 * 60 * 1000;
  events.forEach((e) => {
    const t = new Date(e.ts).getTime();
    if (t < cutoff) return;
    const idx = Math.min(Math.floor((t - cutoff) / (60 * 60 * 1000)), hours - 1);
    if (idx >= 0 && buckets[idx]) buckets[idx].count++;
  });
  return buckets;
}

export function Overview({ events, onNavigateToAlerts, onNavigateToRule }) {
  const alertEvents = useMemo(
    () =>
      events.filter((e) => {
        if (e.type === 'heartbeat') return false;
        if (e.type === 'alert') return true;
        return ['high', 'critical', 'medium'].includes(e.severity);
      }),
    [events]
  );

  const bySeverity = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    alertEvents.forEach((e) => {
      const s = e.severity || 'info';
      if (counts[s] !== undefined) counts[s]++;
    });
    return SEV_ORDER.map((sev) => ({ name: sev, value: counts[sev] || 0, fill: SEV_COLORS[sev] })).filter((d) => d.value > 0);
  }, [alertEvents]);

  const byRule = useMemo(() => {
    const map = {};
    alertEvents.forEach((e) => {
      const key = e.details?.rule || e.summary || 'Other';
      if (!map[key]) map[key] = 0;
      map[key]++;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, fullName: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [alertEvents]);

  const timeSeries = useMemo(() => bucketByHour(events, 24), [events]);

  const kpis = useMemo(() => {
    const bySev = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
    alertEvents.forEach((e) => {
      const s = e.severity || 'info';
      if (bySev[s] !== undefined) bySev[s]++;
    });
    return {
      totalEvents: events.length,
      totalAlerts: alertEvents.length,
      critical: bySev.critical,
      high: bySev.high,
      medium: bySev.medium,
      low: bySev.low,
      info: bySev.info
    };
  }, [events.length, alertEvents]);

  const handlePieClick = (data) => {
    if (data?.name && onNavigateToAlerts) onNavigateToAlerts({ severity: data.name });
  };

  const handleRuleBarClick = (data) => {
    const payload = data?.payload ?? data;
    if (payload?.fullName && onNavigateToRule) onNavigateToRule(payload.fullName);
  };

  return (
    <div className="overview">
      <section className="overview-kpis">
        <button
          type="button"
          className="kpi-card"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({})}
          title="View all events in Timeline"
        >
          <span className="kpi-value">{kpis.totalEvents.toLocaleString()}</span>
          <span className="kpi-label">Total events</span>
        </button>
        <button
          type="button"
          className="kpi-card kpi-alerts"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({})}
          title="View alerts"
        >
          <span className="kpi-value">{kpis.totalAlerts.toLocaleString()}</span>
          <span className="kpi-label">Alerts</span>
        </button>
        <button
          type="button"
          className="kpi-card kpi-critical"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({ severity: 'critical' })}
          title="View critical alerts"
        >
          <span className="kpi-value">{kpis.critical}</span>
          <span className="kpi-label">Critical</span>
        </button>
        <button
          type="button"
          className="kpi-card kpi-high"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({ severity: 'high' })}
          title="View high severity alerts"
        >
          <span className="kpi-value">{kpis.high}</span>
          <span className="kpi-label">High</span>
        </button>
        <button
          type="button"
          className="kpi-card kpi-medium"
          onClick={() => onNavigateToAlerts && onNavigateToAlerts({ severity: 'medium' })}
          title="View medium severity alerts"
        >
          <span className="kpi-value">{kpis.medium}</span>
          <span className="kpi-label">Medium</span>
        </button>
      </section>

      <div className="overview-charts">
        <section className="overview-chart-card">
          <h3>Severity distribution</h3>
          <p className="chart-hint">Click a segment to view alerts for that severity.</p>
          {bySeverity.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={bySeverity}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  onClick={handlePieClick}
                >
                  {bySeverity.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} stroke="var(--border)" strokeWidth={1} className="chart-clickable" />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [v, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No alert data. Enable Live or load events.</div>
          )}
        </section>

        <section className="overview-chart-card">
          <h3>Events per hour (last 24h)</h3>
          <p className="chart-hint">Data ingestion rate over time.</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={timeSeries} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="var(--muted)" />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted)" />
              <Tooltip />
              <Bar dataKey="count" fill="var(--info)" radius={[2, 2, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="overview-chart-card overview-chart-full">
        <h3>Alerts by rule (top 10)</h3>
        <p className="chart-hint">Click a bar to view alerts for that rule.</p>
        {byRule.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byRule} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted)" />
              <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} stroke="var(--muted)" />
              <Tooltip formatter={(v, name, props) => [v, props.payload?.fullName || name]} />
              <Bar dataKey="count" fill="var(--info)" radius={[0, 2, 2, 0]} name="Count" onClick={handleRuleBarClick} cursor="pointer" className="chart-bar-clickable" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="chart-empty">No alerts by rule yet.</div>
        )}
      </section>
    </div>
  );
}
