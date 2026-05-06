export default function DrillEntryCard({ entry, onChangeValue, onRemove }) {
  return (
    <article className="entry-card">
      <div className="entry-card-header">
        <div>
          <p className="entry-meta">{entry.entry_date}</p>
          <h3>{entry.drill_name}</h3>
          <p className="entry-subtitle">{entry.player_name}</p>
        </div>
        <button type="button" className="ghost-button" onClick={() => onRemove(entry.local_id)}>
          Remove
        </button>
      </div>

      <div className="score-grid">
        {entry.fields.map((field) => (
          <label key={field.key} className="field-block">
            <span>{field.label}</span>
            <input
              inputMode="numeric"
              value={entry.values[field.key] || ""}
              onChange={(event) => onChangeValue(entry.local_id, field.key, event.target.value)}
              placeholder="0"
            />
          </label>
        ))}
      </div>
    </article>
  );
}
