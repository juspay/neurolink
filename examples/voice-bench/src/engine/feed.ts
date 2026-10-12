import { getState, setState, storage } from "./store";
import type { Entry } from "./types";

// The engine keeps a mutable Entry per card and publishes a snapshot with render(), mirroring the
// vanilla page's "mutate the entry, then render it" flow one to one.
let nextId = 1;

export function render(e: Entry) {
  const snap = { ...e };
  setState((s) => {
    const i = s.entries.findIndex((x) => x.id === e.id);
    if (i < 0) return { entries: [...s.entries, snap] };
    const entries = s.entries.slice();
    entries[i] = snap;
    return { entries };
  });
}

export function addEntry(fields: Omit<Entry, "id" | "at">): Entry {
  const entry: Entry = { id: nextId++, at: Date.now(), ...fields };
  render(entry);
  persist();
  return entry;
}

export function updateEntry(entry: Entry, fields: Partial<Entry>) {
  Object.assign(entry, fields, { pending: false });
  render(entry);
  persist();
}

export function persist() {
  storage.set(
    "voice-bench-history",
    getState()
      .entries.filter((e) => !e.pending && !(e.live && !e.liveFinal))
      .slice(-200)
      .map((e) => ({
        at: new Date(e.at).toISOString(),
        seconds: e.seconds,
        latency: e.latency,
        text: e.text,
        error: e.error,
        kind: e.kind,
        voice: e.voice,
        engine: e.engine,
        lang: e.lang,
        raw: e.raw,
        cleanupMs: e.cleanupMs,
        correctSteps: e.correctSteps,
        live: e.live,
        liveFinal: e.liveFinal,
      })),
  );
}

export function clearCards() {
  setState({ entries: [] });
  persist();
}

// Decisions panel: newest first, at most 40 cards; a card re-renders from its entry.
export function renderDecision(entry: Entry) {
  render(entry);
  setState((s) =>
    s.decisionIds.includes(entry.id)
      ? {}
      : { decisionIds: [entry.id, ...s.decisionIds].slice(0, 40) },
  );
}

export function playBlob(blob: Blob) {
  const a = new Audio(URL.createObjectURL(blob));
  a.onended = () => URL.revokeObjectURL(a.src);
  a.play().catch(() => {});
}

export function download(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
