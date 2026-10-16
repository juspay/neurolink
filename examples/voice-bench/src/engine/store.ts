import { useSyncExternalStore } from "react";
import { nlBase } from "./config";
import type {
  CaptureMode,
  ConnId,
  ConnState,
  DictEntry,
  DocStatus,
  EngineId,
  Entry,
  Route,
  FileJob,
  RawRow,
  Tune,
  View,
} from "./types";

// localStorage keys are the ones the vanilla page used, so a browser keeps its dictionary, tuning and history.
export const storage = {
  get<T>(k: string, d: T): T {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : (JSON.parse(v) as T);
    } catch {
      return d;
    }
  },
  set(k: string, v: unknown) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode / quota: settings just do not persist */
    }
  },
  raw(k: string): string | null {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setRaw(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* ignore */
    }
  },
};

export const TUNE_DEFAULTS: Tune = {
  silence: 750,
  intervalLocal: 1100,
  intervalIndic: 600,
  intervalWhistle: 700,
  softCut: 16,
  onset: 0.006,
};

export const SAMPLE_DICT: DictEntry[] = [
  {
    term: "NeuroLink",
    heard: ["nurellink", "neural link", "न्यूरोलिंक"],
    meaning: "the AI SDK this demo ships with",
  },
  {
    term: "kal",
    heard: ["call", "khaal", "खाल"],
    meaning: "Hindi: tomorrow / yesterday",
  },
  {
    term: "deployment",
    heard: ["deployement", "डिप्लॉयमेंट"],
    meaning: "releasing software to production",
  },
  {
    term: "DGX Spark",
    heard: ["DGX park", "DJ's park"],
    meaning: "NVIDIA desktop GPU box",
  },
  { term: "Jira", heard: ["jeera"], meaning: "the ticketing tool" },
  {
    term: "self-hosted",
    heard: ["self posted"],
    meaning: "running on our own servers",
  },
];
export const sampleDictionary = () =>
  SAMPLE_DICT.map((e) => ({ ...e, heard: [...e.heard] }));

// Older builds kept the glossary as text lines; read those once so nothing typed there is lost.
function migrateLegacyDictionary(): DictEntry[] | null {
  const text = storage.raw("asr-bench-glossary");
  if (!text) return null;
  const out: DictEntry[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.includes("|")) {
      const [term, heard = "", meaning = ""] = line
        .split("|")
        .map((x) => x.trim());
      if (term)
        out.push({
          term,
          heard: heard
            .replace(/^(also )?heard as:?/i, "")
            .split(/[,;]/)
            .map((x) => x.trim())
            .filter(Boolean),
          meaning,
        });
    } else if (line.includes("->")) {
      const [wrong, right] = line.split("->").map((x) => x.trim());
      if (right) out.push({ term: right, heard: [wrong], meaning: "" });
    } else out.push({ term: line, heard: [], meaning: "" });
  }
  return out;
}

export type Conn = { state: ConnState; detail: string };
export type CaptureStatus = "idle" | "listening" | "live" | "transcribing";
export type Flags = {
  correct: boolean;
  romanize: boolean;
  clean: boolean;
  // IndicConformer leads and Spark reads the same utterance; the rewrite reconciles both
  reconcile: boolean;
};

export type BenchState = {
  view: View;
  route: Route;
  engine: EngineId;
  liveEngine: EngineId;
  mode: CaptureMode;
  lang: string;
  flags: Flags;
  // BCP-47 tags every utterance is also rendered in (es, fr, hi-Latn, …); empty: transcript only
  outputLangs: string[];
  // Languages the speakers use: Indic-Transcribe identifies only among these (empty: any of its 27)
  expectedLangs: string[];
  fengines: EngineId[];
  maxSpeakers: string;
  viaServer: boolean;
  tune: Tune;
  dictionary: DictEntry[];
  context: string;
  health: Record<ConnId, Conn>;
  backendOk: boolean;
  nlOk: boolean;
  // engines the NeuroLink server has (GET /api/agent/transcribe/providers); empty until known
  providers: string[];
  // the server answers the providers route, so it also takes file mode over the WebSocket and
  // correction.cleanup; an older server is reached through /api/health and the HTTP routes only
  serverFileMode: boolean;
  capture: CaptureStatus;
  recordStartedAt: number | null;
  docStatus: DocStatus;
  entries: Entry[];
  decisionIds: number[];
  rawRows: RawRow[];
  ttsOk: boolean;
  voices: string[];
  voice: string;
  speaking: boolean;
  job: FileJob | null;
  panelOpen: boolean;
};

const views: View[] = ["live", "files", "dictionary", "speak", "settings"];
const savedRoute = storage.get<Route>("voice-bench-route", "auto");
const ENGINE_IDS: EngineId[] = ["local", "indic", "whistle", "scribe"];
/** A persisted list of language tags: only strings, deduplicated, at most `max`; anything else falls back. */
function savedLangs(key: string, fallback: string[], max: number): string[] {
  const v = storage.get<unknown>(key, null);
  if (!Array.isArray(v)) return fallback;
  const list = v.filter(
    (l): l is string => typeof l === "string" && l.trim() !== "",
  );
  return [...new Set(list)].slice(0, max);
}
function savedFileEngines(): EngineId[] {
  const v = storage.get<unknown>("voice-bench-fengines", null);
  const list = Array.isArray(v)
    ? v.filter((e): e is EngineId => ENGINE_IDS.includes(e as EngineId))
    : [];
  return list.length ? [...new Set(list)] : ["local", "scribe"];
}
const route: Route = ["auto", "whistle", "scribe"].includes(savedRoute)
  ? savedRoute
  : "auto";
// Through the server, Auto is Indic-Transcribe (the "indic" engine id, provider `bodhan`) with Spark as
// fallback; without one (local dev) it is Spark.
export const engineForRoute = (r: Route): EngineId =>
  r === "auto" ? (nlBase ? "indic" : "local") : r;
const savedView = storage.get<View>("voice-bench-view", "live");

function restoreHistory(): Entry[] {
  type Saved = Omit<Entry, "id" | "at"> & { at: string };
  return storage.get<Saved[]>("voice-bench-history", []).map((s, i) => ({
    ...s,
    id: -(i + 1),
    at: new Date(s.at).getTime(),
  }));
}

const initial: BenchState = {
  view: views.includes(savedView) ? savedView : "live",
  route,
  engine: engineForRoute(route),
  liveEngine: "local",
  mode:
    storage.get<CaptureMode>("voice-bench-mode", "live") === "ptt"
      ? "ptt"
      : "live",
  lang: storage.get("voice-bench-lang", ""),
  flags: {
    correct: storage.get("voice-bench-correct", true),
    romanize: storage.get("voice-bench-romanize", true),
    clean: storage.get("voice-bench-clean", false),
    reconcile: storage.get("voice-bench-reconcile", true),
  },
  outputLangs: savedLangs("voice-bench-outputs", [], 8),
  expectedLangs: savedLangs("voice-bench-expected", ["en", "hi"], 12),
  fengines: savedFileEngines(),
  maxSpeakers: "",
  // Everything goes through the NeuroLink server whenever one is configured; there is no direct mode then.
  viaServer: !!nlBase,
  tune: {
    ...TUNE_DEFAULTS,
    ...storage.get<Partial<Tune>>("voice-bench-tuning", {}),
  },
  dictionary:
    storage.get<DictEntry[] | null>("voice-bench-dictionary", null) ??
    migrateLegacyDictionary() ??
    sampleDictionary(),
  context: storage.raw("asr-bench-context") ?? "",
  health: {
    neurolink: { state: "idle", detail: "checking…" },
    spark: { state: "idle", detail: "checking…" },
    indic: { state: "idle", detail: "checking…" },
    whistle: { state: "idle", detail: "on demand" },
    scribe: { state: "idle", detail: "" },
    gateway: { state: "idle", detail: "checking…" },
  },
  backendOk: false,
  nlOk: false,
  providers: [],
  serverFileMode: false,
  capture: "idle",
  recordStartedAt: null,
  docStatus: { plain: "press the mic to start" },
  entries: restoreHistory(),
  decisionIds: [],
  rawRows: [],
  ttsOk: false,
  voices: ["default"],
  voice: "default",
  speaking: false,
  job: null,
  panelOpen: false,
};

let state = initial;
const listeners = new Set<() => void>();

export const getState = () => state;
export function setState(
  patch: Partial<BenchState> | ((s: BenchState) => Partial<BenchState>),
) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  listeners.forEach((l) => l());
}
export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
export function useBench<T>(select: (s: BenchState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => select(state),
    () => select(state),
  );
}

export const useServer = () => state.viaServer && !!nlBase;

export function setConn(id: ConnId, s: ConnState, detail?: string) {
  setState((st) => ({
    health: {
      ...st.health,
      [id]: { state: s, detail: detail ?? st.health[id].detail },
    },
  }));
}
