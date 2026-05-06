import { useEffect, useMemo, useState } from "react";

function buildDefaultFieldLabels(count) {
  if (count === 1) return ["Makes"];
  if (count === 2) return ["Makes", "Attempts"];
  return Array.from({ length: count }, (_, index) => `Field ${index + 1}`);
}

function SelectionList({
  title,
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onClear,
  addLabel,
  onAddNew,
}) {
  return (
    <div className="export-list-card">
      <div className="export-list-header">
        <h3>{title}</h3>
        <span>{selectedIds.length} selected</span>
      </div>
      <div className="export-checkbox-list">
        <button type="button" className="checkbox-row checkbox-row-action" onClick={onAddNew}>
          <span className="checkbox-row-plus">+</span>
          <span>{addLabel}</span>
        </button>
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

export default function AddScoreModal({
  open,
  onClose,
  drills,
  players,
  onCreateDrill,
  onCreatePlayer,
  onAddDrafts,
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [entryDate, setEntryDate] = useState(today);
  const [selectedDrillIds, setSelectedDrillIds] = useState([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState([]);
  const [showCreateDrill, setShowCreateDrill] = useState(false);
  const [showCreatePlayer, setShowCreatePlayer] = useState(false);
  const [drillName, setDrillName] = useState("");
  const [fieldCount, setFieldCount] = useState(1);
  const [fieldLabels, setFieldLabels] = useState(() => buildDefaultFieldLabels(1));
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEntryDate(today);
    setSelectedDrillIds([]);
    setSelectedPlayerIds([]);
    setShowCreateDrill(false);
    setShowCreatePlayer(false);
    setDrillName("");
    setFieldCount(1);
    setFieldLabels(buildDefaultFieldLabels(1));
    setPlayerName("");
    setBusy(false);
    setError("");
  }, [open, today]);

  if (!open) return null;

  const handleFieldCountChange = (nextCount) => {
    const nextLabels = buildDefaultFieldLabels(nextCount);
    setFieldCount(nextCount);
    setFieldLabels((current) => nextLabels.map((label, index) => current[index] || label));
  };

  const toggleDrill = (id) => {
    setSelectedDrillIds((current) => (
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    ));
  };

  const togglePlayer = (id) => {
    setSelectedPlayerIds((current) => (
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      let nextSelectedDrillIds = [...selectedDrillIds];
      let nextSelectedPlayerIds = [...selectedPlayerIds];
      let nextDrills = [...drills];
      let nextPlayers = [...players];

      if (showCreateDrill) {
        const trimmedDrillName = drillName.trim();
        if (!trimmedDrillName) throw new Error("Enter a drill name.");
        const fields = fieldLabels.map((label, index) => ({
          key: `field_${index + 1}`,
          label: String(label || `Field ${index + 1}`).trim() || `Field ${index + 1}`,
        }));
        const createdDrill = await onCreateDrill({ name: trimmedDrillName, fields });
        nextDrills = [...nextDrills, createdDrill];
        nextSelectedDrillIds = [...new Set([...nextSelectedDrillIds, createdDrill.id])];
      }

      if (showCreatePlayer) {
        const trimmedPlayerName = playerName.trim();
        if (!trimmedPlayerName) throw new Error("Enter a player name.");
        const createdPlayer = await onCreatePlayer({ name: trimmedPlayerName });
        nextPlayers = [...nextPlayers, createdPlayer];
        nextSelectedPlayerIds = [...new Set([...nextSelectedPlayerIds, createdPlayer.id])];
      }

      const selectedDrills = nextDrills.filter((drill) => nextSelectedDrillIds.includes(drill.id));
      const selectedPlayers = nextPlayers.filter((player) => nextSelectedPlayerIds.includes(player.id));

      if (!selectedDrills.length) throw new Error("Select at least one drill.");
      if (!selectedPlayers.length) throw new Error("Select at least one player.");

      const drafts = [];
      for (const drill of selectedDrills) {
        for (const player of selectedPlayers) {
          drafts.push({
            entry_date: entryDate,
            drill_id: drill.id,
            drill_name: drill.name,
            player_id: player.id,
            player_name: player.name,
            fields: drill.fields,
          });
        }
      }

      onAddDrafts(drafts);
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Could not add these drills.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card export-modal-card" role="dialog" aria-modal="true" aria-label="Add drill scores" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">New Entry</p>
            <h2>Add Drill Score</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field-block">
            <span>Date</span>
            <input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} />
          </label>

          <div className="export-grid">
            <SelectionList
              title="Drills"
              items={[...drills].sort((a, b) => a.name.localeCompare(b.name))}
              selectedIds={selectedDrillIds}
              onToggle={toggleDrill}
              onSelectAll={() => setSelectedDrillIds(drills.map((drill) => drill.id))}
              onClear={() => setSelectedDrillIds([])}
              addLabel="Add custom drill"
              onAddNew={() => setShowCreateDrill((current) => !current)}
            />

            <SelectionList
              title="Players"
              items={[...players].sort((a, b) => a.name.localeCompare(b.name))}
              selectedIds={selectedPlayerIds}
              onToggle={togglePlayer}
              onSelectAll={() => setSelectedPlayerIds(players.map((player) => player.id))}
              onClear={() => setSelectedPlayerIds([])}
              addLabel="Add custom player"
              onAddNew={() => setShowCreatePlayer((current) => !current)}
            />
          </div>

          {showCreateDrill ? (
            <div className="nested-panel">
              <label className="field-block">
                <span>Drill Name</span>
                <input value={drillName} onChange={(event) => setDrillName(event.target.value)} placeholder="Star Passing" />
              </label>
              <label className="field-block">
                <span>Number of Text Cells</span>
                <select value={fieldCount} onChange={(event) => handleFieldCountChange(Number(event.target.value))}>
                  {[1, 2, 3, 4].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <div className="field-grid">
                {fieldLabels.map((label, index) => (
                  <label key={`field-label-${index + 1}`} className="field-block">
                    <span>Cell {index + 1} Label</span>
                    <input
                      value={label}
                      onChange={(event) => {
                        const next = [...fieldLabels];
                        next[index] = event.target.value;
                        setFieldLabels(next);
                      }}
                      placeholder={`Field ${index + 1}`}
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          {showCreatePlayer ? (
            <div className="nested-panel">
              <label className="field-block">
                <span>Player Name</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Player name" />
              </label>
            </div>
          ) : null}

          {error ? <div className="form-error">{error}</div> : null}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Adding..." : "Add Entries"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
