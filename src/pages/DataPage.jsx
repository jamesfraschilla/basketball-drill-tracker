import { useEffect, useMemo, useState } from "react";
import ExportGraphicModal from "../components/ExportGraphicModal.jsx";
import { deleteDrillEntry, listDrillEntries, listDrills, listPlayers } from "../lib/dataStore.js";
import { exportDrillGraphic } from "../lib/exportGraphic.js";

function formatValues(values, fields) {
  const labelsByKey = new Map((fields || []).map((field) => [field.key, field.label]));
  return Object.entries(values || {})
    .map(([key, value]) => `${labelsByKey.get(key) || key.replace(/_/g, " ")}: ${value}`)
    .join(" | ");
}

export default function DataPage() {
  const [entries, setEntries] = useState([]);
  const [tab, setTab] = useState("player");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [players, setPlayers] = useState([]);
  const [drills, setDrills] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nextEntries, nextPlayers, nextDrills] = await Promise.all([
          listDrillEntries(),
          listPlayers(),
          listDrills(),
        ]);
        if (!cancelled) {
          setEntries(nextEntries);
          setPlayers(nextPlayers);
          setDrills(nextDrills);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Could not load saved drill scores.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEntries = useMemo(() => entries.filter((entry) => {
    if (dateFrom && entry.entry_date < dateFrom) return false;
    if (dateTo && entry.entry_date > dateTo) return false;
    return true;
  }), [dateFrom, dateTo, entries]);

  const grouped = useMemo(() => {
    const map = new Map();
    const groupKey = tab === "player" ? "player_name" : "drill_name";
    for (const entry of filteredEntries) {
      const key = entry[groupKey] || "Unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredEntries, tab]);

  const isGroupCollapsed = (groupLabel) => collapsedGroups[`${tab}:${groupLabel}`] ?? true;

  const toggleGroup = (groupLabel) => {
    const key = `${tab}:${groupLabel}`;
    setCollapsedGroups((current) => ({
      ...current,
      [key]: !(current[key] ?? true),
    }));
  };

  const handleDelete = async (entry) => {
    const confirmed = window.confirm(
      `Delete this score for ${entry.player_name} in ${entry.drill_name} on ${entry.entry_date}?`
    );
    if (!confirmed) return;

    setDeletingId(entry.id);
    setError("");
    setStatus("");
    try {
      await deleteDrillEntry(entry.id);
      setEntries((current) => current.filter((currentEntry) => currentEntry.id !== entry.id));
      setStatus("Score deleted.");
    } catch (deleteError) {
      setError(deleteError.message || "Could not delete this score.");
    } finally {
      setDeletingId("");
    }
  };

  const handleExport = async ({
    title,
    dateFrom: exportFrom,
    dateTo: exportTo,
    selectedPlayerIds,
    selectedDrillIds,
  }) => {
    const selectedPlayers = players.filter((player) => selectedPlayerIds.includes(player.id));
    const selectedDrills = drills.filter((drill) => selectedDrillIds.includes(drill.id));
    const exportEntries = entries.filter((entry) => {
      if (!selectedPlayerIds.includes(entry.player_id)) return false;
      if (!selectedDrillIds.includes(entry.drill_id)) return false;
      if (exportFrom && entry.entry_date < exportFrom) return false;
      if (exportTo && entry.entry_date > exportTo) return false;
      return true;
    });

    await exportDrillGraphic({
      title,
      entries: exportEntries,
      players: selectedPlayers,
      drills: selectedDrills,
      dateFrom: exportFrom,
      dateTo: exportTo,
    });
  };

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Saved Scores</p>
          <h2>Data</h2>
        </div>
        <button
          type="button"
          className="primary-button export-button"
          onClick={() => setExportOpen(true)}
          disabled={!entries.length}
        >
          Export
        </button>
      </div>

      <div className="tab-row">
        <button type="button" className={tab === "player" ? "tab-button tab-button-active" : "tab-button"} onClick={() => setTab("player")}>
          By Player
        </button>
        <button type="button" className={tab === "drill" ? "tab-button tab-button-active" : "tab-button"} onClick={() => setTab("drill")}>
          By Drill
        </button>
      </div>

      <div className="filter-row">
        <label className="field-block">
          <span>From</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="field-block">
          <span>To</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button type="button" className="secondary-button filter-clear-button" onClick={() => {
          setDateFrom("");
          setDateTo("");
        }}>
          Clear Dates
        </button>
      </div>

      {loading ? <div className="empty-state">Loading data...</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {status ? <div className="status-banner">{status}</div> : null}

      {!loading && !entries.length ? (
        <div className="empty-state">No saved drill scores yet.</div>
      ) : null}
      {!loading && entries.length > 0 && !filteredEntries.length ? (
        <div className="empty-state">No saved scores match that date range.</div>
      ) : null}

      <div className="group-stack">
        {grouped.map(([groupLabel, groupEntries]) => (
          <section key={groupLabel} className="group-card">
            <button
              type="button"
              className="group-toggle"
              onClick={() => toggleGroup(groupLabel)}
              aria-expanded={!isGroupCollapsed(groupLabel)}
            >
              <div className="group-card-header">
                <h3>{groupLabel}</h3>
                <div className="group-card-meta">
                  <span>{groupEntries.length} entries</span>
                  <span className="group-toggle-icon">{isGroupCollapsed(groupLabel) ? "+" : "−"}</span>
                </div>
              </div>
            </button>
            {!isGroupCollapsed(groupLabel) ? (
              <div className="data-table">
                {groupEntries.map((entry) => (
                  <div key={entry.id} className="data-row">
                    <div>
                      <strong>{tab === "player" ? entry.drill_name : entry.player_name}</strong>
                      <p>{entry.entry_date}</p>
                    </div>
                    <div className="data-values">{formatValues(entry.values, entry.fields)}</div>
                    <div className="data-row-actions">
                      <button
                        type="button"
                        className="delete-chip"
                        aria-label={`Delete score for ${entry.player_name} in ${entry.drill_name}`}
                        disabled={deletingId === entry.id}
                        onClick={() => handleDelete(entry)}
                      >
                        {deletingId === entry.id ? "..." : "×"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ))}
      </div>

      <ExportGraphicModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        players={players}
        drills={drills}
        onExport={handleExport}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
      />
    </section>
  );
}
