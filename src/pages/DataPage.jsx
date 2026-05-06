import { useEffect, useMemo, useState } from "react";
import { deleteDrillEntry, listDrillEntries } from "../lib/dataStore.js";

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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const nextEntries = await listDrillEntries();
        if (!cancelled) setEntries(nextEntries);
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

  return (
    <section className="page-stack">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Saved Scores</p>
          <h2>Data</h2>
        </div>
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
            <div className="group-card-header">
              <h3>{groupLabel}</h3>
              <span>{groupEntries.length} entries</span>
            </div>
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
          </section>
        ))}
      </div>
    </section>
  );
}
