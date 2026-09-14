import { useState } from 'react';
import { money } from '../lib/money.js';

const today = () => new Date().toISOString().slice(0, 10);

export default function AddExpenseDialog({ members, currentId, busy, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [total, setTotal] = useState('');
  const [date, setDate] = useState(today());
  const [payerId, setPayerId] = useState(currentId);
  const [splits, setSplits] = useState({});
  const [error, setError] = useState('');

  const patch = (id, value) => { setSplits(s => ({ ...s, [id]: value })); setError(''); };

  const totalNum = parseFloat(total) || 0;
  const allocated = members.reduce((t, m) => t + (parseFloat(splits[m.id]) || 0), 0);
  const remainder = Math.round((totalNum - allocated) * 100) / 100;

  const splitEvenly = () => {
    if (!(totalNum > 0)) { setError('Enter the total paid first.'); return; }
    const each = Math.floor((totalNum / members.length) * 100) / 100;
    const next = {};
    members.forEach(m => { next[m.id] = each.toFixed(2); });
    const drift = Math.round((totalNum - each * members.length) * 100) / 100;
    if (drift) next[members[0].id] = (each + drift).toFixed(2);
    setSplits(next);
  };

  const save = async () => {
    if (!title.trim()) { setError('Give the expense a description.'); return; }
    if (!(totalNum > 0)) { setError('Enter the total paid.'); return; }
    if (Math.abs(remainder) > 0.005) { setError('Shares must add up to the total paid.'); return; }
    try {
      await onSave({
        title: title.trim(),
        payerId,
        date,
        splits: members.map(m => ({ personId: m.id, amount: parseFloat(splits[m.id]) || 0 }))
      });
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div className="dialog-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" style={{ width: 'min(520px, 100%)' }}>
        <span className="dialog-title">Add an expense</span>

        <div className="field">
          <label htmlFor="ex-title">What was it for</label>
          <input
            id="ex-title"
            className="input"
            value={title}
            onChange={e => { setTitle(e.target.value); setError(''); }}
            placeholder="Groceries, dinner, repair…"
          />
        </div>

        <div className="split-grid">
          <div className="field">
            <label htmlFor="ex-total">Total paid</label>
            <input id="ex-total" className="input num" value={total}
              onChange={e => { setTotal(e.target.value); setError(''); }} placeholder="0.00" />
          </div>
          <div className="field">
            <label htmlFor="ex-date">Date</label>
            <input id="ex-date" className="input num" type="date" value={date}
              onChange={e => setDate(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Who paid</label>
          <div className="payer-options">
            {members.map(m => (
              <label className="radio" key={m.id}>
                <input type="radio" name="payer" checked={payerId === m.id}
                  onChange={() => setPayerId(m.id)} />
                <span className="dot" />
                {m.id === currentId ? m.short + ' (you)' : m.short}
              </label>
            ))}
          </div>
        </div>

        <hr className="hr" style={{ margin: 'var(--space-1) 0' }} />

        <div>
          <div className="split-head">
            <label>Each person's share</label>
            <button className="btn btn-ghost" onClick={splitEvenly} style={{ fontSize: 12 }}>Split evenly</button>
          </div>
          {members.map(m => (
            <div className="split-row" key={m.id}>
              <span>{m.id === currentId ? m.name + ' (you)' : m.name}</span>
              <input className="input" value={splits[m.id] ?? ''}
                onChange={e => patch(m.id, e.target.value)} placeholder="0.00" />
            </div>
          ))}
          <div className="split-total">
            <span className="text-muted">
              {remainder > 0 ? 'Left to allocate' : remainder < 0 ? 'Over-allocated by' : 'Fully allocated'}
            </span>
            <strong>{money(remainder)}</strong>
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
