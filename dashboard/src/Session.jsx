import React, { useMemo, useState } from 'react';

export function Session({ events }) {
  const [filterSession, setFilterSession] = useState('');
  const [filterBot, setFilterBot] = useState('');
  const sessions = useMemo(() => {
    const set = new Set();
    events.forEach((e) => {
      if (e.session_id) set.add(e.session_id);
    });
    return [...set].sort();
  }, [events]);
  const bots = useMemo(() => {
    if (botIds?.length) return botIds;
    const set = new Set();
    events.forEach((e) => {
      if (e.bot_id) set.add(e.bot_id);
    });
    return [...set].sort();
  }, [events, botIds]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (filterSession && e.session_id !== filterSession) return false;
      if (filterBot && e.bot_id !== filterBot) return false;
      return true;
    });
  }, [events, filterSession, filterBot]);

  return (
    <>
      <div className="filter-row">
        <label>Session:</label>
        <select value={filterSession} onChange={(e) => setFilterSession(e.target.value)}>
          <option value="">All</option>
          {sessions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <label>Bot:</label>
        <select value={filterBot} onChange={(e) => setFilterBot(e.target.value)}>
          <option value="">All</option>
          {bots.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Session</th>
              <th>Bot</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Summary</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e, i) => (
              <tr key={i}>
                <td>{e.ts}</td>
                <td>{e.session_id || '-'}</td>
                <td>{e.bot_id || '-'}</td>
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
