export default function IdentityNav({ household, members, currentId, onSwitch }) {
  return (
    <nav className="nav app-nav">
      <span className="nav-brand">Ledger</span>
      <span className="text-muted app-household">{household}</span>
      <span className="text-muted app-viewing">Viewing as</span>
      <span className="seg">
        {members.map(m => (
          <label key={m.id} className="seg-opt" style={{ fontFamily: 'var(--font-body)' }}>
            <input
              type="radio"
              name="identity"
              checked={m.id === currentId}
              onChange={() => onSwitch(m.id)}
            />
            {m.short}
          </label>
        ))}
      </span>
    </nav>
  );
}
