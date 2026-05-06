import { useEffect, useMemo, useState } from "react";

function CheckboxList({ title, items, selectedIds, onToggle, onSelectAll, onClear }) {
  return (
    <div className="export-list-card">
      <div className="export-list-header">
        <h3>{title}</h3>
        <span>{selectedIds.length} selected</span>
      </div>
      <div className="export-checkbox-list">
        {items.map((item) => (
          <label key={item.id} className="checkbox-row">
            <input
              type="checkbox"
              checked={selectedIds.includes(item.id)}
              onChange={() => onToggle(item.id)}
            />
            <span>{item.name}</span>
          </label>
        ))}
      </div>
      <div className="export-list-actions">
        <button type="button" className="secondary-button" onClick={onSelectAll}>
          Select All
        </button>
        <button type="button" className="secondary-button" onClick={onClear}>
          Clear
        </button>
      </div>
    </div>
  );
}

export default function ExportGraphicModal({
  open,
  onClose,
  players,
  drills,
  onExport,
  initialDateFrom,
  initialDateTo,
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [title, setTitle] = useState("");
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [selectedDrillIds, setSelectedDrillIds] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setDateFrom(initialDateFrom || "");
    setDateTo(initialDateTo || "");
    setTitle("");
    setSelectedPlayerIds(players.map((player) => player.id));
    setSelectedDrillIds(drills.map((drill) => drill.id));
    setBusy(false);
    setError("");
  }, [open, initialDateFrom, initialDateTo, players, drills]);

  const sortedPlayers = useMemo(
    () => [...players].sort((a, b) => a.name.localeCompare(b.name)),
    [players]
  );
  const sortedDrills = useMemo(
    () => [...drills].sort((a, b) => a.name.localeCompare(b.name)),
    [drills]
  );

  if (!open) return null;

  const toggle = (current, setter, id) => {
    setter(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedPlayerIds.length) {
      setError("Select at least one player.");
      return;
    }
    if (!selectedDrillIds.length) {
      setError("Select at least one drill.");
      return;
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("The start date must be before the end date.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await onExport({
        title,
        dateFrom,
        dateTo,
        selectedPlayerIds,
        selectedDrillIds,
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Could not export the graphic.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card export-modal-card" role="dialog" aria-modal="true" aria-label="Export drill graphic" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Graphic Export</p>
            <h2>Export Drill Graphic</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field-block">
            <span>Graphic Title</span>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter a custom title"
            />
          </label>

          <div className="filter-row">
            <label className="field-block">
              <span>From</span>
              <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="field-block">
              <span>To</span>
              <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
          </div>

          <div className="export-grid">
            <CheckboxList
              title="Players"
              items={sortedPlayers}
              selectedIds={selectedPlayerIds}
              onToggle={(id) => toggle(selectedPlayerIds, setSelectedPlayerIds, id)}
              onSelectAll={() => setSelectedPlayerIds(sortedPlayers.map((player) => player.id))}
              onClear={() => setSelectedPlayerIds([])}
            />
            <CheckboxList
              title="Drills"
              items={sortedDrills}
              selectedIds={selectedDrillIds}
              onToggle={(id) => toggle(selectedDrillIds, setSelectedDrillIds, id)}
              onSelectAll={() => setSelectedDrillIds(sortedDrills.map((drill) => drill.id))}
              onClear={() => setSelectedDrillIds([])}
            />
          </div>

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Exporting..." : "Export PNG"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
