import React, { useState, useEffect } from 'react';

function slug(id) {
  return String(id).toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

export function RulesPanel({ rules, onSave }) {
  const [local, setLocal] = useState(rules);
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newRule, setNewRule] = useState({
    id: '',
    name: '',
    severity: 'medium',
    threshold: 1,
    enabled: true,
    description: '',
    examplePayload: ''
  });

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
    if (editingId === id) setEditingId(null);
  };

  const save = () => {
    onSave(local);
    setEditingId(null);
  };

  const startEdit = (r) => {
    setEditingId(r.id);
  };

  const addRule = () => {
    const name = (newRule.name || '').trim();
    if (!name) return;
    const id = (newRule.id || slug(name) || 'CUSTOM_' + Date.now()).trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '') || 'CUSTOM_' + Date.now();
    const existing = local.some((r) => r.id === id);
    const finalId = existing ? id + '_' + Date.now() : id;
    setLocal((prev) => [
      ...prev,
      {
        id: finalId,
        name: name,
        severity: newRule.severity,
        threshold: newRule.threshold || 1,
        enabled: newRule.enabled,
        description: (newRule.description || '').trim(),
        examplePayload: (newRule.examplePayload || '').trim()
      }
    ]);
    setNewRule({ id: '', name: '', severity: 'medium', threshold: 1, enabled: true, description: '', examplePayload: '' });
    setShowAdd(false);
  };

  return (
    <div className="rules-panel">
      <p style={{ color: 'var(--muted)', marginBottom: 12 }}>
        Built-in and custom rules. Each rule has a description and example of what it catches. Edits stored in this browser (localStorage).
      </p>
      <ul>
        {local.map((r) => (
          <li key={r.id} className="rule-item">
            {editingId === r.id ? (
              <div className="rule-edit-form">
                <div className="rule-edit-row">
                  <label>ID</label>
                  <input
                    type="text"
                    value={r.id}
                    onChange={(e) => update(r.id, 'id', e.target.value)}
                    placeholder="RULE_ID"
                  />
                </div>
                <div className="rule-edit-row">
                  <label>Name</label>
                  <input
                    type="text"
                    value={r.name}
                    onChange={(e) => update(r.id, 'name', e.target.value)}
                    placeholder="Rule display name"
                  />
                </div>
                <div className="rule-edit-row">
                  <label>Severity</label>
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
                </div>
                <div className="rule-edit-row">
                  <label>Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={r.threshold}
                    onChange={(e) => update(r.id, 'threshold', Number(e.target.value) || 1)}
                  />
                </div>
                <div className="rule-edit-row">
                  <label>Description (what the rule checks)</label>
                  <textarea
                    value={r.description ?? ''}
                    onChange={(e) => update(r.id, 'description', e.target.value)}
                    placeholder="e.g. Fires when logs show ECONNREFUSED to 127.0.0.1"
                    rows={2}
                  />
                </div>
                <div className="rule-edit-row">
                  <label>Example payload (what it can catch)</label>
                  <textarea
                    value={r.examplePayload ?? ''}
                    onChange={(e) => update(r.id, 'examplePayload', e.target.value)}
                    placeholder="e.g. Error: connect ECONNREFUSED 127.0.0.1:7777"
                    rows={2}
                  />
                </div>
                <div className="rule-edit-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={r.enabled}
                      onChange={(e) => update(r.id, 'enabled', e.target.checked)}
                    />
                    Enabled
                  </label>
                </div>
                <div className="rule-edit-actions">
                  <button type="button" className="btn-add" onClick={() => setEditingId(null)}>Done</button>
                  <button type="button" className="btn-cancel" onClick={() => remove(r.id)}>Remove rule</button>
                </div>
              </div>
            ) : (
              <>
                <div className="rule-item-header">
                  <h4>{r.name}</h4>
                  <div>
                    <button type="button" className="rule-edit-btn" onClick={() => startEdit(r)} title="Edit rule">Edit</button>
                    <button type="button" className="rule-delete" onClick={() => remove(r.id)} title="Remove rule">×</button>
                  </div>
                </div>
                {(r.description || r.examplePayload) && (
                  <div className="rule-detail">
                    {r.description && <p className="rule-description">{r.description}</p>}
                    {r.examplePayload && (
                      <p className="rule-example">
                        <span className="rule-example-label">Example:</span>{' '}
                        <code>{r.examplePayload}</code>
                      </p>
                    )}
                  </div>
                )}
                <p className="rule-meta">
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
              </>
            )}
          </li>
        ))}
      </ul>

      {showAdd ? (
        <div className="rule-add-form">
          <h4>Add your own rule</h4>
          <div className="rule-add-row">
            <input
              type="text"
              placeholder="Rule ID (e.g. MY_CUSTOM_RULE)"
              value={newRule.id}
              onChange={(e) => setNewRule((p) => ({ ...p, id: e.target.value }))}
            />
            <input
              type="text"
              placeholder="Rule name"
              value={newRule.name}
              onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addRule()}
            />
          </div>
          <div className="rule-add-row">
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
          <div className="rule-add-field">
            <label>Description (what the rule checks)</label>
            <textarea
              placeholder="e.g. Fires when logs contain X"
              value={newRule.description}
              onChange={(e) => setNewRule((p) => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>
          <div className="rule-add-field">
            <label>Example payload (what it can catch)</label>
            <textarea
              placeholder="e.g. A sample log line or pattern"
              value={newRule.examplePayload}
              onChange={(e) => setNewRule((p) => ({ ...p, examplePayload: e.target.value }))}
              rows={2}
            />
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
