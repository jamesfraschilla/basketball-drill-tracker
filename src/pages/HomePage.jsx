import { useEffect, useMemo, useState } from "react";
import AddScoreModal from "../components/AddScoreModal.jsx";
import DrillEntryCard from "../components/DrillEntryCard.jsx";
import {
  createDrill,
  createPlayer,
  isUsingSupabase,
  listDrills,
  listPlayers,
  saveDrillEntries,
} from "../lib/dataStore.js";

function buildDraftId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function HomePage() {
  const [drills, setDrills] = useState([]);
  const [players, setPlayers] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [nextDrills, nextPlayers] = await Promise.all([listDrills(), listPlayers()]);
        if (cancelled) return;
        setDrills(nextDrills);
        setPlayers(nextPlayers);
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message || "Could not load drills and players.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const backendLabel = useMemo(
    () => (isUsingSupabase() ? "Supabase live sync is active." : "Supabase env vars are missing, so this app is using local browser storage for now."),
    []
  );

  const handleCreateDrill = async (payload) => {
    const drill = await createDrill(payload);
    setDrills((current) => [...current, drill].sort((a, b) => a.name.localeCompare(b.name)));
    return drill;
  };

  const handleCreatePlayer = async (payload) => {
    const player = await createPlayer(payload);
    setPlayers((current) => [...current, player].sort((a, b) => a.name.localeCompare(b.name)));
    return player;
  };

  const handleAddDrafts = (payloads) => {
    setDrafts((current) => [
      ...current,
      ...payloads.map((payload) => ({
        ...payload,
        local_id: buildDraftId(),
        values: Object.fromEntries(payload.fields.map((field) => [field.key, ""])),
      })),
    ]);
    setStatus("");
  };

  const handleChangeValue = (localId, fieldKey, nextValue) => {
    setDrafts((current) => current.map((draft) => (
      draft.local_id === localId
        ? { ...draft, values: { ...draft.values, [fieldKey]: nextValue } }
        : draft
    )));
  };

  const handleRemoveDraft = (localId) => {
    setDrafts((current) => current.filter((draft) => draft.local_id !== localId));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setStatus("");
    setError("");
    try {
      await saveDrillEntries(drafts);
      setDrafts([]);
      setStatus("Drill scores saved.");
    } catch (saveError) {
      setError(saveError.message || "Could not save drill scores.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-stack">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Daily Workflow</p>
          <h2>Enter drill scores as they happen.</h2>
          <p className="hero-copy">
            Use the yellow plus button to pick a date, select or create drills and players,
            and bring every selected combination onto the main page for entry.
          </p>
        </div>
        <div className="backend-pill">{backendLabel}</div>
      </div>

      {loading ? <div className="empty-state">Loading drills and players...</div> : null}
      {error ? <div className="form-error">{error}</div> : null}
      {status ? <div className="status-banner">{status}</div> : null}

      <div className="section-heading">
        <div>
          <p className="eyebrow">Active Drills</p>
          <h2>Main Page</h2>
        </div>
        {drafts.length ? (
          <button type="button" className="primary-button" onClick={handleSaveAll} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        ) : null}
      </div>

      {drafts.length ? (
        <div className="entry-grid">
          {drafts.map((entry) => (
            <DrillEntryCard
              key={entry.local_id}
              entry={entry}
              onChangeValue={handleChangeValue}
              onRemove={handleRemoveDraft}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No active drills yet. Tap the yellow plus button to add your first drill score entry.
        </div>
      )}

      <button type="button" className="fab-button" onClick={() => setModalOpen(true)} aria-label="Add drill score">
        +
      </button>

      <AddScoreModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        drills={drills}
        players={players}
        onCreateDrill={handleCreateDrill}
        onCreatePlayer={handleCreatePlayer}
        onAddDrafts={handleAddDrafts}
      />
    </section>
  );
}
