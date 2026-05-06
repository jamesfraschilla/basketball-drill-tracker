import { supabase } from "./supabase.js";

const DRILLS_STORAGE_KEY = "basketball-drill-tracker:drills";
const PLAYERS_STORAGE_KEY = "basketball-drill-tracker:players";
const ENTRIES_STORAGE_KEY = "basketball-drill-tracker:entries";

function readJson(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function sortByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name));
}

function sortEntries(entries) {
  return [...entries].sort((a, b) => {
    if (a.entry_date !== b.entry_date) return a.entry_date < b.entry_date ? 1 : -1;
    if (a.drill_name !== b.drill_name) return a.drill_name.localeCompare(b.drill_name);
    return a.player_name.localeCompare(b.player_name);
  });
}

function normalizeDrill(drill) {
  return {
    id: drill.id,
    name: String(drill.name || "").trim(),
    fields: Array.isArray(drill.fields)
      ? drill.fields.map((field, index) => ({
        key: String(field?.key || `field_${index + 1}`),
        label: String(field?.label || `Field ${index + 1}`).trim(),
      }))
      : [],
    created_at: drill.created_at || new Date().toISOString(),
  };
}

function normalizePlayer(player) {
  return {
    id: player.id,
    name: String(player.name || "").trim(),
    created_at: player.created_at || new Date().toISOString(),
  };
}

function normalizeEntry(entry) {
  return {
    id: entry.id,
    entry_date: entry.entry_date,
    drill_id: entry.drill_id,
    drill_name: entry.drill_name,
    player_id: entry.player_id,
    player_name: entry.player_name,
    fields: Array.isArray(entry.fields) ? entry.fields : [],
    values: { ...(entry.values || {}) },
    created_at: entry.created_at || new Date().toISOString(),
  };
}

function buildId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function listFromSupabase(table) {
  const { data, error } = await supabase.from(table).select("*").order("name", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function listDrills() {
  if (supabase) {
    const drills = await listFromSupabase("drills");
    return drills.map(normalizeDrill);
  }
  return sortByName(readJson(DRILLS_STORAGE_KEY, []).map(normalizeDrill));
}

export async function listPlayers() {
  if (supabase) {
    const players = await listFromSupabase("players");
    return players.map(normalizePlayer);
  }
  return sortByName(readJson(PLAYERS_STORAGE_KEY, []).map(normalizePlayer));
}

export async function createDrill({ name, fields }) {
  const next = normalizeDrill({
    id: buildId("drill"),
    name,
    fields,
    created_at: new Date().toISOString(),
  });

  if (supabase) {
    const { data, error } = await supabase
      .from("drills")
      .insert({
        name: next.name,
        fields: next.fields,
      })
      .select()
      .single();
    if (error) throw error;
    return normalizeDrill(data);
  }

  const drills = sortByName([...readJson(DRILLS_STORAGE_KEY, []), next]);
  writeJson(DRILLS_STORAGE_KEY, drills);
  return next;
}

export async function createPlayer({ name }) {
  const next = normalizePlayer({
    id: buildId("player"),
    name,
    created_at: new Date().toISOString(),
  });

  if (supabase) {
    const { data, error } = await supabase
      .from("players")
      .insert({ name: next.name })
      .select()
      .single();
    if (error) throw error;
    return normalizePlayer(data);
  }

  const players = sortByName([...readJson(PLAYERS_STORAGE_KEY, []), next]);
  writeJson(PLAYERS_STORAGE_KEY, players);
  return next;
}

export async function saveDrillEntries(entries) {
  const normalizedEntries = entries.map(normalizeEntry);

  if (supabase) {
    const payload = normalizedEntries.map((entry) => ({
      entry_date: entry.entry_date,
      drill_id: entry.drill_id,
      player_id: entry.player_id,
      values: entry.values,
    }));
    const { error } = await supabase.from("drill_entries").insert(payload);
    if (error) throw error;
    return normalizedEntries;
  }

  const stored = sortEntries([...readJson(ENTRIES_STORAGE_KEY, []), ...normalizedEntries]);
  writeJson(ENTRIES_STORAGE_KEY, stored);
  return normalizedEntries;
}

export async function listDrillEntries() {
  if (supabase) {
    const { data, error } = await supabase
      .from("drill_entries")
      .select(`
        id,
        entry_date,
        values,
        created_at,
        drills:drill_id ( id, name, fields ),
        players:player_id ( id, name )
      `)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => normalizeEntry({
      id: row.id,
      entry_date: row.entry_date,
      drill_id: row.drills?.id,
      drill_name: row.drills?.name || "",
      player_id: row.players?.id,
      player_name: row.players?.name || "",
      fields: row.drills?.fields || [],
      values: row.values || {},
      created_at: row.created_at,
    }));
  }

  return sortEntries(readJson(ENTRIES_STORAGE_KEY, []).map(normalizeEntry));
}

export async function deleteDrillEntry(entryId) {
  if (supabase) {
    const { error } = await supabase
      .from("drill_entries")
      .delete()
      .eq("id", entryId);
    if (error) throw error;
    return;
  }

  const stored = readJson(ENTRIES_STORAGE_KEY, []).filter((entry) => entry.id !== entryId);
  writeJson(ENTRIES_STORAGE_KEY, stored);
}

export function isUsingSupabase() {
  return Boolean(supabase);
}
