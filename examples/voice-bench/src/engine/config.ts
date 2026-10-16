import type { BenchConfig, EngineId } from "./types";

declare global {
  interface Window {
    ASR_CONFIG?: BenchConfig;
  }
}

export const cfg: BenchConfig = window.ASR_CONFIG ?? {};
export const base = (cfg.baseUrl ?? "").replace(/\/$/, "");
export const nlBase = (cfg.neurolinkBaseUrl ?? "").replace(/\/$/, "");
// "indic" is Indic-Transcribe-Flex (Indian languages, Indian English and code-mixed speech in
// one model); IndicConformer is no longer on the default route.
export const NL_PROVIDERS: Record<EngineId, string> = {
  local: "spark",
  indic: "bodhan",
  whistle: "whistle",
  scribe: "elevenlabs-stt",
  ...(cfg.neurolinkProviders ?? {}),
} as Record<EngineId, string>;
export const NL_DIARIZED = cfg.neurolinkDiarizedModel ?? "qwen3-asr-diarized";
export const indicBase = cfg.indicBaseUrl || "http://127.0.0.1:8007";
// Text to speech: an explicit ttsBaseUrl, else the LiteLLM gateway the page already talks to, else the
// key-holding `/tts` pass-through of serve.mjs next to the NeuroLink server.
export const ttsBase = (
  cfg.ttsBaseUrl ??
  (base || (nlBase ? nlBase + "/tts" : ""))
).replace(/\/$/, "");
// A direct gateway needs a key: ttsApiKey, or apiKey when TTS shares the page's gateway. The
// serve.mjs pass-through adds its own and gets none.
export const ttsHeaders = (): Record<string, string> => {
  const key = cfg.ttsApiKey ?? (ttsBase === base ? cfg.apiKey : undefined);
  return key ? { Authorization: "Bearer " + key } : {};
};

export const SAMPLE_RATE = 16000;
export const MIN_SECONDS = 0.3;

export const ENGINE_LABEL: Record<EngineId, string> = {
  local: "qwen3-asr",
  scribe: "scribe v2",
  whistle: "whistle",
  indic: "indic-transcribe",
};
export const LIVE_LABEL: Partial<Record<EngineId, string>> = {
  local: "Spark · Qwen3-ASR",
  indic: "Indic-Transcribe",
  whistle: "Whistle",
};

export const INDIC_LANGS = [
  "as",
  "bn",
  "brx",
  "doi",
  "gu",
  "hi",
  "kn",
  "kok",
  "ks",
  "mai",
  "ml",
  "mni",
  "mr",
  "ne",
  "or",
  "pa",
  "sa",
  "sat",
  "sd",
  "ta",
  "te",
  "ur",
];
export const WHISTLE_LANGS = ["en", "de", "fr", "es", "it", "nl", "pl"];
export const INDIC_RE = /[ऀ-෿]/;

export const LANGUAGES: [string, string][] = [
  ["", "Auto-detect"],
  ["en", "English"],
  ["hi", "Hindi · Hinglish"],
  ["ta", "Tamil"],
  ["te", "Telugu"],
  ["kn", "Kannada"],
  ["ml", "Malayalam"],
  ["bn", "Bengali"],
  ["mr", "Marathi"],
  ["gu", "Gujarati"],
  ["pa", "Punjabi"],
  ["ur", "Urdu"],
  ["or", "Odia"],
  ["as", "Assamese"],
  ["ne", "Nepali"],
  ["zh", "Chinese"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["pt", "Portuguese"],
  ["ar", "Arabic"],
];

const EXTRA_LANG: Record<string, string> = {
  hinglish: "Hinglish",
  brx: "Bodo",
  doi: "Dogri",
  kok: "Konkani",
  ks: "Kashmiri",
  mai: "Maithili",
  mni: "Manipuri",
  sa: "Sanskrit",
  sat: "Santali",
  sd: "Sindhi",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
};
export const langName = (code: string) =>
  LANGUAGES.find(([c]) => c === code)?.[1].split(" ·")[0] ??
  EXTRA_LANG[code] ??
  code;

export const ROUTE_LABEL = {
  auto: "Auto",
  whistle: "Whistle · offline",
  scribe: "Scribe · cloud",
} as const;

export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

export const fmtClock = (sec: number) => {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = Math.floor(sec % 60);
  return (
    (h ? `${h}:` : "") +
    `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`
  );
};

export const errMsg = (e: unknown) =>
  e instanceof Error ? e.message : String(e);
