// With "Transcribe through NeuroLink server" on, push-to-talk and files are one POST to the server's
// OpenAI-compatible /v1/audio/transcriptions (verbose_json), and live captions stream PCM16 over its
// WebSocket: the server runs the engine, the endpointer, the dictionary, the decision guard and the
// rewrite. Off, everything runs in the page — that path is the comparison baseline.
import { asrContextPrompt } from "./corrector";
import {
  cfg,
  INDIC_LANGS,
  nlBase,
  NL_PROVIDERS,
  WHISTLE_LANGS,
} from "./config";
import { getState, setConn, setState, useServer } from "./store";
import type { Decision, EngineId } from "./types";

// Whether the server has an engine (unknown list = assume yes, the request will say otherwise).
/**
 * The server provider an engine uses for this request. Indic-Transcribe has two endpoints: its
 * Latin one romanizes Indian-language speech (Hinglish, Tanglish …) and keeps English as is, so
 * Output script = Latin needs no rewrite; the other writes mixed script (English words in Latin).
 */
export const nlProviderFor = (eng: EngineId): string =>
  eng === "indic" && getState().flags.romanize
    ? `${NL_PROVIDERS.indic}-latin`
    : NL_PROVIDERS[eng];

/**
 * The model field for Indic-Transcribe: its endpoint's model with the expected languages after an
 * "@" ("indic-transcribe-flex-mixed@en,hi"), which the sidecar reads as the identification
 * candidates. Other engines take their endpoint's default model.
 */
export const nlModelFor = (eng: EngineId): string | undefined => {
  if (eng !== "indic") return undefined;
  const langs = getState().expectedLangs;
  if (!langs.length) return undefined;
  const base = getState().flags.romanize
    ? "indic-transcribe-flex-latin"
    : "indic-transcribe-flex-mixed";
  return `${base}@${langs.join(",")}`;
};

/**
 * Indic-Transcribe reads Indian English itself, so Spark is only a fallback for an empty or
 * failed pass, never a language takeover: no probe, no "unsure" hand-off.
 */
export const nlFallbackFor = (eng: EngineId): Record<string, unknown> | null =>
  eng === "indic"
    ? {
        fallback: { provider: NL_PROVIDERS.local, when: ["empty", "error"] },
        routing: { probe: false },
      }
    : null;

export const serverHas = (eng: EngineId) => {
  const list = getState().providers;
  return !list.length || list.includes(NL_PROVIDERS[eng]);
};

export const nlHeaders = (): Record<string, string> =>
  cfg.neurolinkToken ? { Authorization: "Bearer " + cfg.neurolinkToken } : {};

export const nlEngineOf = (provider?: string): EngineId | null =>
  (Object.keys(NL_PROVIDERS) as EngineId[]).find(
    (k) =>
      NL_PROVIDERS[k] ===
      String(provider || "")
        .split("/")[0]
        .replace(/-latin$/, ""),
  ) ?? null;

export const nlDictionary = () =>
  getState().dictionary.map((e) => ({
    term: e.term,
    heardAs: e.heard,
    ...(e.meaning ? { meaning: e.meaning } : {}),
  }));
export const nlContext = () => getState().context.trim();

// A pinned language, when the engine can take it. Unpinned is left out, so the server's language
// probe and prior stay on. Under Auto the pin goes as is: the server routes it.
export function nlLanguage(eng: EngineId) {
  const l = getState().lang;
  if (!l) return null;
  if (eng === "whistle") return WHISTLE_LANGS.includes(l) ? l : null;
  if (eng === "indic") return INDIC_LANGS.includes(l) ? l : null;
  return l;
}
export const nlTransliterate = () =>
  getState().flags.romanize ? "latin" : "native";
// The output languages, as the `output` field of a request; undefined when none are chosen.
export const nlOutput = () =>
  getState().outputLangs.length
    ? { languages: getState().outputLangs }
    : undefined;

export type NlDecision = {
  heard: string;
  term: string;
  choice?: "term" | "literal";
  probability?: number;
  confidence?: number;
  note?: string;
};
// The server's decision record carries the probability of the CHOSEN reading; the panel wants P(term).
export const nlDecisions = (ds?: NlDecision[]): Decision[] =>
  (ds || []).map((d) => ({
    heard: d.heard,
    term: d.term,
    choice: d.choice || "term",
    pTerm:
      d.probability == null
        ? null
        : d.choice === "literal"
          ? 1 - d.probability
          : d.probability,
    confidence: d.confidence ?? null,
    ...(d.note ? { note: d.note } : {}),
  }));

export type NlTimings = {
  transcribeMs?: number;
  secondOpinionMs?: number;
  decideMs?: number;
  rewriteMs?: number;
  correctionMs?: number;
  totalMs?: number;
};
export function nlSteps(d: {
  steps?: string[];
  timings?: NlTimings;
  engine?: { fallbackUsed?: boolean; provider?: string };
}) {
  const t = d.timings || {},
    steps = ["via NeuroLink"];
  if (d.engine?.fallbackUsed) steps.push(`fallback → ${d.engine.provider}`);
  steps.push(...(d.steps || []));
  const ms = (
    [
      ["transcribe", t.transcribeMs],
      ["2nd opinion", t.secondOpinionMs],
      ["decide", t.decideMs],
      ["rewrite", t.rewriteMs],
    ] as [string, number | undefined][]
  )
    .filter(([, v]) => v != null && v > 0)
    .map(([k, v]) => `${k} ${Math.round(v as number)} ms`);
  if (ms.length) steps.push(ms.join(", "));
  return steps;
}

export const nlLangLabel = (lang?: string, detected?: boolean) =>
  lang && lang !== "auto"
    ? lang +
      (detected === true ? " (auto)" : detected === false ? " (unsure)" : "")
    : null;

export type NlResult = {
  text?: string;
  raw?: string;
  corrected?: string;
  language?: string;
  languageDetected?: boolean;
  duration?: number;
  // utterance chunks carry start/end; diarized turns may carry only startTime/endTime
  segments?: {
    start?: number;
    end?: number;
    startTime?: number;
    endTime?: number;
    text: string;
    speaker?: string;
    language?: string;
  }[];
  decisions?: NlDecision[];
  steps?: string[];
  timings?: NlTimings;
  engine?: { provider?: string; fallbackUsed?: boolean };
  outputs?: Record<string, { text: string; status: string }>;
};

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("could not read the audio"));
    r.readAsDataURL(blob);
  });

// One JSON request carries the whole config (fallback, chunking, correction.transliterate), which the
// OpenAI-compatible multipart route cannot express.
export async function nlTranscribe(
  blob: Blob,
  o: {
    eng: EngineId;
    model?: string | null;
    diarize?: boolean;
    correct?: boolean;
    fallback?: string | null;
    chunking?: "utterances";
    signal?: AbortSignal;
  },
): Promise<NlResult> {
  const body: Record<string, unknown> = {
    audio: await toDataUrl(blob),
    provider: nlProviderFor(o.eng),
    ...(o.model
      ? { model: o.model }
      : nlModelFor(o.eng)
        ? { model: nlModelFor(o.eng) }
        : {}),
  };
  const lang = nlLanguage(o.eng);
  if (lang) body.language = lang;
  if (o.correct) {
    const c = nlContext();
    if (c) body.prompt = c;
    if (getState().dictionary.length) body.dictionary = nlDictionary();
    body.correction = {
      enabled: true,
      transliterate: nlTransliterate(),
      ...(getState().flags.clean && getState().serverFileMode
        ? { cleanup: "clean" }
        : {}),
      ...(c ? { context: c } : {}),
    };
  } else {
    const p = asrContextPrompt();
    if (p) body.prompt = p;
  }
  const fb = nlFallbackFor(o.eng);
  if (fb) Object.assign(body, fb);
  else if (o.fallback) body.fallback = { provider: o.fallback };
  if (o.chunking) body.chunking = o.chunking;
  const output = nlOutput();
  if (output) body.output = output;
  if (o.diarize) body.diarization = true;
  const r = await fetch(nlBase + "/api/agent/transcribe", {
    method: "POST",
    headers: { ...nlHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: o.signal,
  });
  const j = (await r.json().catch(() => null)) as {
    data?: NlResult;
    error?: { message?: string } | string;
  } | null;
  if (!r.ok || !j?.data) {
    const m = typeof j?.error === "string" ? j.error : j?.error?.message;
    throw new Error(
      `NeuroLink HTTP ${r.status}${m ? " · " + m.slice(0, 200) : ""}`,
    );
  }
  return j.data;
}

export async function checkNeurolink() {
  if (!nlBase) {
    setConn("neurolink", "idle", "off · direct");
    setState({ nlOk: false });
    return false;
  }
  const mode = useServer() ? "on" : "direct";
  try {
    const r = await fetch(nlBase + "/api/agent/transcribe/providers", {
      headers: nlHeaders(),
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const d = (
        (await r.json()) as { data?: { providers?: { name: string }[] } }
      ).data;
      setConn("neurolink", "ok", `${mode} · ${new URL(nlBase).host}`);
      setState({
        nlOk: true,
        serverFileMode: true,
        providers: (d?.providers ?? []).map((p) => p.name),
      });
      return true;
    }
    // a server without the providers route: plain health check, HTTP routes only
    const h = await fetch(nlBase + "/api/health", {
      headers: nlHeaders(),
      signal: AbortSignal.timeout(4000),
    });
    if (!h.ok) {
      setConn("neurolink", "bad", `${mode} · HTTP ${h.status}`);
      setState({ nlOk: false });
      return false;
    }
    setConn("neurolink", "ok", `${mode} · ${new URL(nlBase).host}`);
    setState({ nlOk: true, serverFileMode: false, providers: [] });
    return true;
  } catch {
    setConn("neurolink", "bad", `${mode} · unreachable`);
    setState({ nlOk: false });
    return false;
  }
}
