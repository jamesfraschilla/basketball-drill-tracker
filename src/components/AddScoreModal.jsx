import { useEffect, useMemo, useState } from "react";

function buildDefaultFieldLabels(count) {
  if (count === 1) return ["Makes"];
  if (count === 2) return ["Makes", "Attempts"];
  return Array.from({ length: count }, (_, index) => `Field ${index + 1}`);
}

export default function AddScoreModal({
  open,
  onClose,
  drills,
  players,
  onCreateDrill,
  onCreatePlayer,
  onAddDraft,
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [entryDate, setEntryDate] = useState(today);
  const [selectedDrillId, setSelectedDrillId] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [drillName, setDrillName] = useState("");
  const [fieldCount, setFieldCount] = useState(1);
  const [fieldLabels, setFieldLabels] = useState(() => buildDefaultFieldLabels(1));
  const [playerName, setPlayerName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEntryDate(today);
    setSelectedDrillId("");
    setSelectedPlayerId("");
    setDrillName("");
    setFieldCount(1);
    setFieldLabels(buildDefaultFieldLabels(1));
    setPlayerName("");
    setBusy(false);
    setError("");
  }, [open, today]);

  if (!open) return null;

  const creatingDrill = selectedDrillId === "__create__";
  const creatingPlayer = selectedPlayerId === "__create__";
  const selectedDrill = drills.find((drill) => drill.id === selectedDrillId) || null;
  const selectedPlayer = players.find((player) => player.id === selectedPlayerId) || null;

  const handleFieldCountChange = (nextCount) => {
    const nextLabels = buildDefaultFieldLabels(nextCount);
    setFieldCount(nextCount);
    setFieldLabels((current) => nextLabels.map((label, index) => current[index] || label));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      let drill = selectedDrill;
      let player = selectedPlayer;

      if (creatingDrill) {
        const trimmedDrillName = drillName.trim();
        if (!trimmedDrillName) throw new Error("Enter a drill name.");
        const fields = fieldLabels.map((label, index) => ({
          key: `field_${index + 1}`,
          label: String(label || `Field ${index + 1}`).trim() || `Field ${index + 1}`,
        }));
        drill = await onCreateDrill({ name: trimmedDrillName, fields });
      }

      if (creatingPlayer) {
        const trimmedPlayerName = playerName.trim();
        if (!trimmedPlayerName) throw new Error("Enter a player name.");
        player = await onCreatePlayer({ name: trimmedPlayerName });
      }

      if (!drill) throw new Error("Select a drill.");
      if (!player) throw new Error("Select a player.");

      onAddDraft({
        entry_date: entryDate,
        drill_id: drill.id,
        drill_name: drill.name,
        player_id: player.id,
        player_name: player.name,
        fields: drill.fields,
      });
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Could not add this drill.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Add drill score" onClick={(event) => event.stopPropagation()}>
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

          <label className="field-block">
            <span>Drill</span>
            <select value={selectedDrillId} onChange={(event) => setSelectedDrillId(event.target.value)}>
              <option value="">Select a drill</option>
              <option value="__create__">+ Add custom drill</option>
              {drills.map((drill) => (
                <option key={drill.id} value={drill.id}>
                  {drill.name}
                </option>
              ))}
            </select>
          </label>

          {creatingDrill ? (
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

          <label className="field-block">
            <span>Player</span>
            <select value={selectedPlayerId} onChange={(event) => setSelectedPlayerId(event.target.value)}>
              <option value="">Select a player</option>
              <option value="__create__">+ Add custom player</option>
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>

          {creatingPlayer ? (
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
              {busy ? "Adding..." : "Add Drill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
