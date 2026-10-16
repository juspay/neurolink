export type EngineId = "local" | "indic" | "whistle" | "scribe";
// "auto": IndicConformer first, Spark as the fallback; the server picks per utterance.
export type Route = "auto" | "whistle" | "scribe";
export type FileColumn = "local" | "cloud" | "whistle" | "indic";
export type CaptureMode = "live" | "ptt";
export type View = "live" | "files" | "dictionary" | "speak" | "settings";
export type ConnId =
  | "neurolink"
  | "spark"
  | "indic"
  | "whistle"
  | "scribe"
  | "gateway";
export type ConnState = "ok" | "bad" | "idle";

export type BenchConfig = {
  neurolinkBaseUrl?: string;
  neurolinkToken?: string;
  neurolinkProviders?: Partial<Record<EngineId, string>>;
  neurolinkDiarizedModel?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  diarizedModel?: string;
  ttsModel?: string;
  // where Speak goes: a gateway URL, or (default with a NeuroLink server) serve.mjs's `/tts` pass-through
  ttsBaseUrl?: string;
  // key for a TTS gateway reached directly at ttsBaseUrl; never needed for serve.mjs's pass-through
  ttsApiKey?: string;
  indicBaseUrl?: string;
  indicDecoder?: string;
  whistleKeywords?: boolean;
  elevenlabsKey?: string;
  scribeModel?: string;
  correctorBaseUrl?: string;
  correctorKey?: string;
  correctorModel?: string;
  romanizeModel?: string;
  decisionBaseUrl?: string;
  decisionKey?: string;
  decisionModel?: string;
};

export type Tune = {
  silence: number;
  intervalLocal: number;
  intervalIndic: number;
  intervalWhistle: number;
  softCut: number;
  onset: number;
};

export type DictEntry = { term: string; heard: string[]; meaning: string };

export type Lid = {
  language: string;
  detected?: boolean;
  scores?: { language: string; score: number }[];
};

export type Decision = {
  heard: string;
  term: string;
  choice: "term" | "literal";
  pTerm: number | null;
  confidence: number | null;
  note?: string;
};

export type Entry = {
  id: number;
  at: number;
  kind?: "tts";
  voice?: string;
  engine?: EngineId;
  pending?: boolean;
  text?: string;
  error?: string;
  seconds?: number | null;
  latency?: number;
  ttft?: number;
  lang?: string | null;
  lid?: Lid | null;
  audio?: Blob;
  raw?: string;
  correcting?: boolean;
  cleanupMs?: number;
  correctSteps?: string;
  correctError?: string;
  decisions?: Decision[];
  decisionMs?: number | null;
  live?: boolean;
  liveFinal?: boolean;
  committed?: string;
  tail?: string;
  silent?: boolean;
  // renderings in the chosen output languages, by tag (NeuroLink `output` events)
  outputs?: Record<string, { text: string; status: string }>;
};

export type BadgeTone = "ok" | "warn" | "busy" | "";
export type RawRow = {
  key: string;
  raw: string;
  badges: [BadgeTone, string][];
};

export type SentenceStage = "fixing" | "corrected" | "skipped" | "failed";

export type Segment = {
  start: number;
  end: number;
  // set on the placeholder row of a failed part, which offers a retry
  part?: number;
  // a part's heading row: its number and what the server did (collapsed repeats, discarded echoes, …)
  divider?: string;
  // what the server did to this utterance (repetition collapsed, prompt echo discarded, …)
  note?: string;
  // final text shown, correction still on its way
  pending?: boolean;
  language?: string;
  text?: string | null;
  speaker?: string | null;
  error?: string;
  raw?: string;
  original?: string;
};

export type PartState = {
  start: number;
  end: number;
  state: "queued" | "working" | "done" | "failed";
  error?: string;
};

export type ColumnState = {
  // a large file goes in parts, transcribed in parallel; rows appear as each part lands
  parts?: PartState[];
  phase: string;
  done: boolean;
  t1: number | null;
  progress: number;
  rows: Segment[];
  lang?: string | null;
  showSpeakers: boolean;
  statsOverride?: string;
};

export type FileJob = {
  id: number;
  fileName: string;
  sizeMb: number;
  t0: number;
  duration: number;
  columns: Partial<Record<FileColumn, ColumnState>>;
};

export type DocStatus = { engine: string; rest: string } | { plain: string };
