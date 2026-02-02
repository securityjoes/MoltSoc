import React, { useState, useEffect } from 'react';

function slug(id) {
  return String(id).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

export function RulesPanel({ rules, onSave }) {
  const [local, setLocal] = useState(rules);
  const [newRule, setNewRule] = useState({ name: '', severity: 'medium', threshold: 1, enabled: true });
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setLocal(rules);
  }, [rules]);

  const update = (id, field, value) => {
    setLocal((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const remove = (id) => {
    setLocal((prev) => prev.filter((r) => r.id !== id));
  };

  const save = () => {
    onSave(local);
  };

  const addRule = () => {
    const name = (newRule.name || '').trim();
    if (!name) return;
    const id = slug(name) || 'CUSTOM_' + Date.now();
    const existing = local.some((r) => r.id === id);
    const finalId = existing ? id + '_' + Date.now() : id;
    setLocal((prev) => [...prev, { id: finalId, name, severity: newRule.severity, threshold: newRule.threshold || 1, enabled: newRule.enabled }]);
    setNewRule({ name: '', severity: 'medium', threshold: 1, enabled: true });
    setShowAdd(false);
  };

  return (
    <div className="rules-panel">
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
        Built-in and custom rules. Edits stored in this browser only (localStorage).
      </p>
      <ul>
        {local.map((r) => (
          <li key={r.id} className="rule-item">
            <div className="rule-item-header">
              <h4>{r.name}</h4>
              <button type="button" className="rule-delete" onClick={() => remove(r.id)} title="Remove rule">×</button>
            </div>
            <p>
              Severity:{' '}
              <select
                value={r.severity}
                onChange={(e) => update(r.id, 'severity', e.target.value)}
              >
                <option value="info">info</option>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
              {' '}Threshold:{' '}
              <input
                type="number"
                min={1}
                value={r.threshold}
                onChange={(e) => update(r.id, 'threshold', Number(e.target.value) || 1)}
              />
              {' '}
              <label>
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => update(r.id, 'enabled', e.target.checked)}
                />
                Enabled
              </label>
            </p>
          </li>
        ))}
      </ul>

      {showAdd ? (
        <div className="rule-add-form">
          <h4>New rule</h4>
          <div className="rule-add-row">
            <input
              type="text"
              placeholder="Rule name"
              value={newRule.name}
              onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
            />
            <select
              value={newRule.severity}
              onChange={(e) => setNewRule((p) => ({ ...p, severity: e.target.value }))}
            >
              <option value="info">info</option>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
              <option value="critical">critical</option>
            </select>
            <input
              type="number"
              min={1}
              placeholder="Threshold"
              value={newRule.threshold}
              onChange={(e) => setNewRule((p) => ({ ...p, threshold: Number(e.target.value) || 1 }))}
            />
            <label>
              <input
                type="checkbox"
                checked={newRule.enabled}
                onChange={(e) => setNewRule((p) => ({ ...p, enabled: e.target.checked }))}
              />
              Enabled
            </label>
          </div>
          <div className="rule-add-actions">
            <button type="button" className="btn-add" onClick={addRule}>Add rule</button>
            <button type="button" className="btn-cancel" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn-new-rule" onClick={() => setShowAdd(true)}>
          + Add your own rule
        </button>
      )}

      <button onClick={save} className="btn-save-rules">
        Save rules (client-side)
      </button>
    </div>
  );
}
