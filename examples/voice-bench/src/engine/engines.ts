import { asrContextPrompt } from "./corrector";
import { base, cfg, indicBase, INDIC_LANGS, WHISTLE_LANGS } from "./config";
import { getState, setConn } from "./store";
import type { Lid } from "./types";

// Shared with live captions: the last confident language seeds IndicConformer's `prior`.
export const lidMemory: { last: Lid | null } = { last: null };

const lang = () => getState().lang;

// ------------------------------------------------------------------ health
export async function checkBackend() {
  if (!base || !cfg.apiKey) {
    setConn("spark", "bad", "config.js missing");
    return false;
  }
  try {
    const r = await fetch(base + "/v1/models", {
      headers: { Authorization: "Bearer " + cfg.apiKey },
    });
    if (!r.ok) {
      setConn("spark", "bad", `HTTP ${r.status}`);
      return false;
    }
    const ids = ((await r.json()) as { data: { id: string }[] }).data.map(
      (m) => m.id,
    );
    if (!ids.includes(cfg.model ?? "")) {
      setConn("spark", "bad", `no ${cfg.model}`);
      return false;
    }
    setConn("spark", "ok", new URL(base).host);
    return true;
  } catch {
    setConn("spark", "bad", "unreachable");
    return false;
  }
}

export async function checkIndic() {
  try {
    const d = (await (await fetch(indicBase + "/health")).json()) as {
      ready?: boolean;
      languages: string[];
    };
    setConn(
      "indic",
      d.ready ? "ok" : "bad",
      d.ready ? `${d.languages.length} langs · auto` : "loading",
    );
  } catch {
    setConn("indic", "bad", "not running");
  }
}

export async function checkGateway() {
  if (!cfg.decisionBaseUrl || !cfg.decisionKey) {
    setConn("gateway", "bad", "no decision config");
    return;
  }
  try {
    const r = await fetch(cfg.decisionBaseUrl + "/v1/models", {
      headers: { Authorization: "Bearer " + cfg.decisionKey },
    });
    setConn(
      "gateway",
      r.ok ? "ok" : "bad",
      r.ok
        ? `${cfg.correctorModel || "?"} · ${cfg.decisionModel || "?"}`
        : `HTTP ${r.status}`,
    );
  } catch {
    setConn("gateway", "bad", "unreachable");
  }
}

// ------------------------------------------------------------------ Spark (Qwen3-ASR via LiteLLM)
export async function sparkRequest(wav: Blob, filename: string) {
  const form = new FormData();
  form.append("file", wav, filename);
  form.append("model", cfg.model ?? "");
  form.append("response_format", "json");
  if (lang()) form.append("language", lang());
  const c = asrContextPrompt();
  if (c) form.append("prompt", c);
  const r = await fetch(base + "/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: "Bearer " + cfg.apiKey },
    body: form,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      msg +=
        " · " +
        (
          ((await r.json()) as { error?: { message?: string } }).error
            ?.message || ""
        ).slice(0, 200);
    } catch {
      /* no JSON body */
    }
    throw new Error(msg);
  }
  return (((await r.json()) as { text?: string }).text || "").trim();
}

// ------------------------------------------------------------------ IndicConformer
export function indicLang() {
  return INDIC_LANGS.includes(lang()) ? lang() : "auto";
}

export type IndicResult = {
  text?: string;
  language?: string;
  language_detected?: boolean;
  language_scores?: { language: string; score: number }[];
  segments?: { start: number; end: number; text: string }[];
  timings?: { total_s?: number };
};

export async function indicRequest(
  blob: Blob,
  filename: string,
  signal?: AbortSignal,
): Promise<IndicResult> {
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", "indic-conformer");
  form.append("language", indicLang());
  if (indicLang() === "auto" && lidMemory.last?.detected)
    form.append("prior", lidMemory.last.language);
  form.append("decoder", cfg.indicDecoder || "rnnt");
  form.append("response_format", "verbose_json");
  const r = await fetch(indicBase + "/v1/audio/transcriptions", {
    method: "POST",
    body: form,
    signal,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      msg +=
        " · " +
        String(((await r.json()) as { detail?: unknown }).detail || "").slice(
          0,
          160,
        );
    } catch {
      /* no JSON body */
    }
    throw new Error(msg);
  }
  return (await r.json()) as IndicResult;
}

export const lidOf = (res: IndicResult): Lid | null =>
  res.language
    ? {
        language: res.language,
        detected: res.language_detected,
        scores: res.language_scores,
      }
    : null;
export const lidLabel = (res: IndicResult) =>
  (res.language ?? "") +
  (res.language_detected === true
    ? " (auto)"
    : res.language_detected === false
      ? " (unsure)"
      : "");

// ------------------------------------------------------------------ Whistle (WASM worker, in the tab)
export type WhistleResult = {
  ok: boolean;
  text?: string;
  language?: string;
  ttft_ms?: number;
  ms: number;
  chunks: number;
  words?: { word: string; start: number; end: number }[];
  error?: string;
};

const whistle = {
  worker: null as Worker | null,
  ready: false,
  pending: new Map<
    number,
    { resolve: (r: WhistleResult) => void; reject: (e: Error) => void }
  >(),
  seq: 0,
};
export const whistleReady = () => whistle.ready;

function whistleLang() {
  return WHISTLE_LANGS.includes(lang()) ? lang() : null;
}

export function whistleStart() {
  if (whistle.worker) return;
  setConn("whistle", "idle", "loading…");
  const w = new Worker("whistle/whistle-worker.js");
  whistle.worker = w;
  w.onmessage = (
    e: MessageEvent<
      WhistleResult & { id: number; ready?: boolean; loadMs?: number }
    >,
  ) => {
    const m = e.data;
    if ("ready" in m) {
      whistle.ready = !!m.ready;
      setConn(
        "whistle",
        m.ready ? "ok" : "bad",
        m.ready ? `ready · ${m.loadMs} ms` : "failed",
      );
      return;
    }
    const p = whistle.pending.get(m.id);
    if (!p) return;
    whistle.pending.delete(m.id);
    if (m.ok) p.resolve(m);
    else p.reject(new Error(m.error));
  };
  // The worker script itself failing (needle.js missing or not evaluating) throws before onmessage
  // exists: fail every waiting request and drop the worker so the next start retries.
  w.onerror = (e) => {
    const message = e.message || "worker failed";
    setConn("whistle", "bad", message);
    const err = new Error("whistle worker failed: " + message);
    for (const p of whistle.pending.values()) p.reject(err);
    whistle.pending.clear();
    w.terminate();
    whistle.worker = null;
    whistle.ready = false;
  };
}

export function whistleTranscribe(pcm: Float32Array): Promise<WhistleResult> {
  whistleStart();
  const id = ++whistle.seq;
  const keywords = cfg.whistleKeywords
    ? getState()
        .dictionary.map((e) => e.term)
        .join("\n")
    : "";
  return new Promise((resolve, reject) => {
    whistle.pending.set(id, { resolve, reject });
    whistle.worker?.postMessage(
      { id, pcm, language: whistleLang(), keywords, timestamps: true },
      [pcm.buffer],
    );
  });
}

// ------------------------------------------------------------------ ElevenLabs Scribe (cloud reference)
export type ScribeTurn = {
  speaker: string;
  start: number;
  end: number;
  text: string;
  raw?: string;
};

export async function scribeRequest(
  blob: Blob,
  filename: string,
  opts: { diarize?: boolean; signal?: AbortSignal } = {},
) {
  const { diarize = true, signal } = opts;
  if (!cfg.elevenlabsKey) throw new Error("no elevenlabsKey in config.js");
  const form = new FormData();
  form.append("model_id", cfg.scribeModel || "scribe_v2");
  form.append("file", blob, filename);
  form.append("diarize", String(diarize));
  form.append("tag_audio_events", "false");
  if (lang()) form.append("language_code", lang());
  const r = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": cfg.elevenlabsKey },
    body: form,
    signal,
  });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      msg +=
        " · " +
        (
          (((await r.json()) as { detail?: { message?: string } }).detail || {})
            .message || ""
        ).slice(0, 160);
    } catch {
      /* no JSON body */
    }
    throw new Error(msg);
  }
  type W = {
    type: string;
    text: string;
    start?: number;
    end?: number;
    speaker_id?: string;
  };
  const d = (await r.json()) as {
    text?: string;
    language_code?: string;
    words?: W[];
  };
  const words = (d.words || []).filter(
    (w) => w.type === "word" || w.type === "spacing",
  );
  const turns: ScribeTurn[] = [];
  for (const w of words) {
    const spk = w.speaker_id || "speaker_0";
    const last = turns[turns.length - 1];
    if (last && last.speaker === spk) {
      last.text += w.text;
      last.end = w.end ?? last.end;
    } else if (w.type === "word")
      turns.push({
        speaker: spk,
        start: w.start ?? 0,
        end: w.end ?? 0,
        text: w.text,
      });
  }
  return {
    text: (d.text || "").trim(),
    lang: d.language_code,
    turns: turns.map((t) => ({ ...t, text: t.text.trim() })),
    speakers: [...new Set(turns.map((t) => t.speaker))],
  };
}
