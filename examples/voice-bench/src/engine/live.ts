// Capture: push-to-talk turns, and live captions — either streamed on the client (continuous mic →
// energy-gated utterances → re-transcribe every few hundred ms → LocalAgreement commits the stable
// prefix → final pass on a pause → corrector) or through the NeuroLink server's WebSocket.
// Endpointing works on 20 ms blocks; the noise floor is a minimum statistic (quietest block in 1.5 s,
// rising at most ~2x/s) so a louder talker can never push a quieter one below the gate, and speech has
// onset/sustain hysteresis so soft word endings are kept.
import {
  emitLevel,
  ensureAudio,
  getInputRate,
  resampleTo16k,
  rmsOf,
  setSampleSink,
  toWav,
} from "./audio";
import {
  INDIC_LANGS,
  LIVE_LABEL,
  MIN_SECONDS,
  NL_PROVIDERS,
  nlBase,
  SAMPLE_RATE,
  cfg,
  INDIC_RE,
  errMsg,
} from "./config";
import { correctText, warmCorrector } from "./corrector";
import {
  clearTail,
  docRawSilent,
  docSetFinal,
  docSetInterim,
  docSetText,
} from "./doc";
import {
  indicRequest,
  lidLabel,
  lidMemory,
  lidOf,
  scribeRequest,
  sparkRequest,
  whistleStart,
  whistleTranscribe,
} from "./engines";
import { addEntry, persist, render, renderDecision, updateEntry } from "./feed";
import {
  nlDecisions,
  nlDictionary,
  nlContext,
  nlEngineOf,
  nlLangLabel,
  nlLanguage,
  nlSteps,
  nlTranscribe,
  nlFallbackFor,
  nlModelFor,
  nlOutput,
  nlProviderFor,
  nlTransliterate,
  type NlDecision,
  serverHas,
  type NlTimings,
} from "./neurolink";
import { asrContextPrompt } from "./corrector";
import {
  engineForRoute,
  getState,
  setState,
  storage,
  useServer,
} from "./store";
import type { CaptureMode, EngineId, Entry, Lid, Route } from "./types";

// ------------------------------------------------------------------ status line
export function setDocStatus(engine: string, rest: string) {
  setState({ docStatus: { engine, rest: rest.replace(/^[\s·]+/, "").trim() } });
}
const labelFor = (eng: EngineId) =>
  getState().route === "auto"
    ? "Auto"
    : (LIVE_LABEL[eng] ?? "Spark · Qwen3-ASR");
const liveLabel = () => labelFor(live.engine);
const lidHint = () =>
  lidMemory.last
    ? " · " +
      String(lidMemory.last.language) +
      (lidMemory.last.detected ? "" : "?")
    : "";

// ------------------------------------------------------------------ state
type Utterance = {
  id: number;
  chunks: Float32Array[];
  rms: number[];
  len: number;
  speechMs: number;
  silenceMs: number;
  sentLen: number;
  lastReq: number;
  prevWords: string[];
  committedN: number;
  entry: Entry | null;
  final: boolean;
  engine: EngineId;
  lid: Lid | null;
  switched: string | null;
  lidOk?: boolean;
  unsureN?: number;
  keptInterim?: boolean;
};

type NlSession = {
  ws: WebSocket;
  queue: ArrayBuffer[];
  pend: Float32Array[];
  pendLen: number;
  utts: Map<number, { entry: Entry; lid: Lid | null }>;
  sent: Int16Array[];
  sentLen: number;
  sentFrom: number;
  correct: boolean;
  eng: EngineId;
  ended: boolean;
};

const live = {
  on: false,
  engine: "local" as EngineId,
  pre: [] as { block: Float32Array; rms: number }[],
  preLen: 0,
  utt: null as Utterance | null,
  inflight: false,
  timer: 0,
  noise: 0.004,
  noiseWin: [] as number[],
  block: null as Float32Array | null,
  blockFill: 0,
  seq: 0,
  nl: null as NlSession | null,
};
const ptt = { recording: false, chunks: [] as Float32Array[], startedAt: 0 };

const BLOCK_S = 0.02,
  PREROLL_S = 0.35,
  MIN_SPEECH_MS = 250,
  MIN_SEND_S = 0.8,
  SOFT_GAP_MS = 320,
  MAX_UTT_S = 28;
const ABS_SUSTAIN_RATIO = 0.58,
  ONSET_RATIO = 3,
  SUSTAIN_RATIO = 1.8;

const tune = () => getState().tune;
const flags = () => getState().flags;
const liveInterval = () =>
  (
    ({
      local: tune().intervalLocal,
      indic: tune().intervalIndic,
      whistle: tune().intervalWhistle,
    }) as Partial<Record<EngineId, number>>
  )[live.engine] || 1000;

setSampleSink((buf) => {
  if (live.on) {
    if (live.nl) nlFeed(buf);
    else liveFeed(buf);
    return;
  }
  if (!ptt.recording) return;
  ptt.chunks.push(buf);
  emitLevel(rmsOf(buf));
});

// ------------------------------------------------------------------ engine / mode
/**
 * A live session reads its settings once, in the config it sends when it opens. A setting changed
 * while the mic is on (correction, script, clean verbatim, language) restarts the session so it
 * takes effect at once instead of on the next press of the mic.
 */
let restarting: Promise<void> | null = null;
export function liveRestartIfRunning(): Promise<void> {
  // One restart at a time: rapid setting changes share the one in flight.
  if (restarting) return restarting;
  if (!live.on || !live.nl) return Promise.resolve();
  restarting = (async () => {
    try {
      await liveStop();
      await liveStart();
    } finally {
      restarting = null;
    }
  })();
  return restarting;
}

export function setRoute(r: Route) {
  if (live.on) void liveStop();
  storage.set("voice-bench-route", r);
  const e = engineForRoute(r);
  setState({ route: r, engine: e });
  if (e === "whistle" && !useServer()) whistleStart();
  if (e === "scribe" && getState().mode === "live") setMode("ptt");
}

export function setMode(mode: CaptureMode) {
  if (live.on) void liveStop();
  setState({ mode });
  if (mode === "live" && getState().engine === "scribe") setRoute("auto");
  storage.set("voice-bench-mode", mode);
}

export const micEnabled = (s = getState()) =>
  s.capture !== "transcribing" &&
  (s.backendOk || (s.viaServer && !!nlBase && s.nlOk));

// ------------------------------------------------------------------ push to talk
async function startRecording() {
  if (ptt.recording || getState().capture === "transcribing") return;
  try {
    await ensureAudio();
  } catch {
    addEntry({
      error: "Microphone blocked. Allow mic access for this page and reload.",
    });
    return;
  }
  ptt.chunks = [];
  ptt.recording = true;
  ptt.startedAt = performance.now();
  setState({ capture: "listening", recordStartedAt: Date.now() });
}

async function stopRecording() {
  if (!ptt.recording) return;
  ptt.recording = false;
  emitLevel(0);
  setState({ capture: "idle", recordStartedAt: null });
  const total = ptt.chunks.reduce((n, c) => n + c.length, 0),
    all = new Float32Array(total);
  for (let i = 0, o = 0; i < ptt.chunks.length; o += ptt.chunks[i].length, i++)
    all.set(ptt.chunks[i], o);
  const pcm16k = resampleTo16k(all),
    seconds = pcm16k.length / SAMPLE_RATE;
  if (seconds < MIN_SECONDS) return;
  setState({ capture: "transcribing" });
  try {
    await transcribeOne(getState().engine, toWav(pcm16k), seconds, pcm16k);
  } finally {
    setState({ capture: "idle" });
  }
}

// Auto is IndicConformer + Spark. Spark answers alone when the server has no IndicConformer, or when the
// pinned language is not one IndicConformer reads (it refuses anything but its 22 languages or auto).
const routed = (e: EngineId): EngineId => {
  if (e !== "indic") return e;
  const lang = getState().lang;
  // Indic-Transcribe reads Indian English too; only other languages go to Spark.
  if (lang && lang !== "en" && !INDIC_LANGS.includes(lang)) return "local";
  return useServer() && !serverHas("indic") ? "local" : e;
};

async function transcribeOne(
  engine: EngineId,
  wav: Blob,
  seconds: number,
  pcm: Float32Array,
) {
  const eng = routed(engine);
  if (useServer() && eng !== "scribe")
    return transcribeViaServer(eng, wav, seconds); // Scribe stays direct
  const entry = addEntry({ pending: true, seconds, audio: wav, engine: eng });
  const t0 = performance.now();
  try {
    let text = "";
    let extra: Partial<Entry> = {};
    if (eng === "indic") {
      const res = await indicRequest(wav, "turn.wav");
      text = res.text ?? "";
      extra = { lang: lidLabel(res), lid: lidOf(res) };
    } else if (eng === "whistle") {
      const res = await whistleTranscribe(pcm.slice());
      text = res.text ?? "";
      extra = { lang: res.language, ttft: res.ttft_ms };
    } else if (eng === "scribe") {
      const res = await scribeRequest(wav, "turn.wav", { diarize: false });
      text = res.text;
      extra = { lang: res.lang };
    } else text = await sparkRequest(wav, "turn.wav");
    text = (text || "").trim();
    updateEntry(entry, {
      text: text || "(no speech recognized)",
      latency: Math.round(performance.now() - t0),
      ...extra,
    });
    if (text && (flags().correct || (flags().romanize && INDIC_RE.test(text))))
      await correctEntry(entry);
  } catch (e) {
    updateEntry(entry, {
      error: errMsg(e),
      latency: Math.round(performance.now() - t0),
    });
  }
}

async function correctEntry(entry: Entry) {
  entry.correcting = true;
  render(entry);
  const t0 = performance.now();
  try {
    const { text, steps, decisions } = await correctText(
      entry.text ?? "",
      null,
    );
    const ms = Math.round(performance.now() - t0);
    updateEntry(entry, {
      correcting: false,
      raw: entry.text,
      text: text || entry.text,
      cleanupMs: ms,
      correctSteps: steps.join(" · "),
      decisions,
      decisionMs: ms,
    });
    renderDecision(entry);
  } catch (e) {
    updateEntry(entry, { correcting: false, correctError: errMsg(e) });
  }
}

// push to talk through the server: one request, transcription and correction together
async function transcribeViaServer(eng: EngineId, wav: Blob, seconds: number) {
  const entry = addEntry({ pending: true, seconds, audio: wav, engine: eng });
  const t0 = performance.now();
  const correct = flags().correct;
  try {
    const d = await nlTranscribe(wav, {
      eng,
      correct,
      fallback: eng === "indic" ? NL_PROVIDERS.local : null,
    });
    const shown = nlEngineOf(d.engine?.provider) || eng;
    const text = (d.text || "").trim(),
      raw = (d.raw ?? d.text ?? "").trim();
    const lid =
      d.language && d.language !== "auto"
        ? { language: d.language, detected: d.languageDetected }
        : null;
    const fields: Partial<Entry> = {
      engine: shown,
      text: text || "(no speech recognized)",
      latency: Math.round(performance.now() - t0),
      lang: nlLangLabel(d.language, d.languageDetected),
      lid,
    };
    if (correct && text)
      Object.assign(fields, {
        raw,
        cleanupMs: Math.round(
          d.timings?.correctionMs ?? d.timings?.totalMs ?? 0,
        ),
        correctSteps: nlSteps(d).join(" · "),
        decisions: nlDecisions(d.decisions),
        decisionMs:
          d.timings?.decideMs != null ? Math.round(d.timings.decideMs) : null,
      });
    else fields.correctSteps = nlSteps(d).join(" · ");
    if (d.outputs)
      fields.outputs = Object.fromEntries(
        Object.entries(d.outputs).map(([tag, o]) => [
          tag,
          { text: o.text, status: o.status },
        ]),
      );
    updateEntry(entry, fields);
    if (correct && text) renderDecision(entry);
  } catch (e) {
    updateEntry(entry, {
      error: errMsg(e),
      latency: Math.round(performance.now() - t0),
    });
  }
}

// ------------------------------------------------------------------ live captions (client endpointing)
function liveFeed(buf: Float32Array) {
  const blockLen = Math.round(BLOCK_S * getInputRate());
  if (!live.block || live.block.length !== blockLen) {
    live.block = new Float32Array(blockLen);
    live.blockFill = 0;
  }
  let i = 0;
  while (i < buf.length) {
    const n = Math.min(buf.length - i, blockLen - live.blockFill);
    live.block.set(buf.subarray(i, i + n), live.blockFill);
    live.blockFill += n;
    i += n;
    if (live.blockFill === blockLen) {
      liveBlock(live.block);
      live.block = new Float32Array(blockLen);
      live.blockFill = 0;
    }
  }
}

function newUtterance(chunks: Float32Array[], rms: number[]): Utterance {
  return {
    id: ++live.seq,
    chunks,
    rms,
    len: chunks.reduce((a, c) => a + c.length, 0),
    speechMs: 0,
    silenceMs: 0,
    sentLen: 0,
    lastReq: 0,
    prevWords: [],
    committedN: 0,
    entry: null,
    final: false,
    engine: live.engine,
    lid: null,
    switched: null,
  };
}

function liveBlock(block: Float32Array) {
  const rate = getInputRate();
  const rms = rmsOf(block);
  emitLevel(rms);
  live.noiseWin.push(rms);
  if (live.noiseWin.length > 75) live.noiseWin.shift();
  let winMin = Infinity;
  for (const v of live.noiseWin) if (v < winMin) winMin = v;
  live.noise = Math.max(
    0.0005,
    winMin > live.noise ? Math.min(winMin, live.noise * 1.014) : winMin,
  );
  const onset = rms > Math.max(tune().onset, live.noise * ONSET_RATIO);
  const sustain =
    rms >
    Math.max(tune().onset * ABS_SUSTAIN_RATIO, live.noise * SUSTAIN_RATIO);
  const u = live.utt;
  if (!u) {
    live.pre.push({ block, rms });
    live.preLen += block.length;
    while (live.preLen > PREROLL_S * rate && live.pre.length > 1)
      live.preLen -= live.pre.shift()!.block.length;
    if (onset) {
      live.utt = newUtterance(
        live.pre.map((p) => p.block),
        live.pre.map((p) => p.rms),
      );
      live.utt.speechMs = BLOCK_S * 1000;
      live.pre = [];
      live.preLen = 0;
    }
    return;
  }
  u.chunks.push(block);
  u.rms.push(rms);
  u.len += block.length;
  if (sustain) {
    u.speechMs += BLOCK_S * 1000;
    u.silenceMs = 0;
  } else u.silenceMs += BLOCK_S * 1000;
  if (u.silenceMs >= tune().silence) {
    // a cough is dropped — unless a pass already heard words in it, which must never be lost
    if (u.speechMs >= MIN_SPEECH_MS || u.entry) void finalizeUtterance(u);
    else live.utt = null;
  } else if (u.len >= tune().softCut * rate && u.silenceMs >= SOFT_GAP_MS)
    void finalizeUtterance(u); // long turn: end at this pause
  else if (u.len >= MAX_UTT_S * rate) hardCut(u); // no pause at all: split at the quietest recent block
}

function hardCut(u: Utterance) {
  const n = u.chunks.length,
    from = Math.max(1, n - Math.round(3 / BLOCK_S));
  let best = from;
  for (let k = from; k < n; k++) if (u.rms[k] < u.rms[best]) best = k;
  const restChunks = u.chunks.splice(best),
    restRms = u.rms.splice(best);
  u.len = u.chunks.reduce((a, c) => a + c.length, 0);
  const next = newUtterance(restChunks, restRms);
  next.speechMs =
    restRms.filter(
      (r) =>
        r >
        Math.max(tune().onset * ABS_SUSTAIN_RATIO, live.noise * SUSTAIN_RATIO),
    ).length *
    BLOCK_S *
    1000;
  void finalizeUtterance(u); // clears live.utt synchronously before its first await
  live.utt = next;
}

function uttPcm(u: Utterance) {
  const out = new Float32Array(u.len);
  let o = 0;
  for (const c of u.chunks) {
    out.set(c, o);
    o += c.length;
  }
  return resampleTo16k(out);
}

async function engineOnce(
  eng: EngineId,
  pcm: Float32Array,
): Promise<{ text: string; lid: Lid | null }> {
  const wav = toWav(pcm);
  if (eng === "indic") {
    const res = await indicRequest(wav, "live.wav");
    const lid = lidOf(res);
    if (lid?.detected) lidMemory.last = lid;
    return { text: (res.text || "").trim(), lid };
  }
  if (eng === "whistle")
    return {
      text: ((await whistleTranscribe(pcm.slice())).text || "").trim(),
      lid: null,
    };
  return { text: await sparkRequest(wav, "live.wav"), lid: null };
}

const commonPrefix = (a: string[], b: string[]) => {
  let n = 0;
  while (n < a.length && n < b.length && a[n] === b[n]) n++;
  return n;
};

async function liveTick() {
  const u = live.utt;
  if (!u || live.inflight || u.final) return;
  if (performance.now() - u.lastReq < liveInterval()) return;
  if (u.len - u.sentLen < MIN_SEND_S * getInputRate()) return;
  await runPass(u, false);
}

const interimText = (u: Utterance) =>
  [u.entry?.committed, u.entry?.tail].filter(Boolean).join(" ");

async function runPass(u: Utterance, isFinal: boolean) {
  live.inflight = true;
  u.lastReq = performance.now();
  u.sentLen = u.len;
  const t0 = performance.now();
  try {
    const pcm = uttPcm(u);
    let { text, lid } = await engineOnce(u.engine, pcm);
    if (lid) u.lid = lid;
    // IndicConformer cannot read this audio (English, far-field: it answers "unsure" or nothing at all).
    // Hand the rest of this utterance to the Spark right now, so the user never sees it go blank — but not
    // on the first seconds (the language score is unreliable under ~2.5 s), and a pass that was confident
    // once settles the matter for the whole utterance.
    const secs = u.len / getInputRate();
    if (lid?.detected) u.lidOk = true;
    u.unsureN = lid?.detected === false || !text ? (u.unsureN || 0) + 1 : 0;
    if (
      u.engine === "indic" &&
      !u.switched &&
      !u.lidOk &&
      secs >= 3 &&
      u.speechMs >= 1500 &&
      u.unsureN >= 2
    ) {
      u.engine = "local";
      u.switched = "Indic unsure → Spark took over";
      u.prevWords = [];
      u.committedN = 0;
      try {
        text = (await engineOnce("local", pcm)).text;
      } catch {
        /* keep what we have */
      }
    }
    if (!u.entry)
      u.entry = addEntry({
        live: true,
        engine: u.engine,
        pending: false,
        committed: "",
        tail: "",
      });
    u.entry.engine = u.engine;
    const words = text.split(/\s+/).filter(Boolean);
    if (isFinal) {
      // The final pass covers the same audio as the interims plus the tail, so it can only be richer.
      // If an engine glitch returns nothing, or less than half the words already shown, keep what was shown.
      const shown = interimText(u),
        nShown = shown.split(/\s+/).filter(Boolean).length;
      if (!text || (nShown >= 2 && words.length < nShown * 0.5)) {
        text = shown;
        if (shown) u.keptInterim = true;
      }
      u.entry.text = text;
    } else {
      const agreed = Math.max(u.committedN, commonPrefix(u.prevWords, words)); // LocalAgreement: never shrink the stable prefix
      u.committedN = Math.min(agreed, words.length);
      u.prevWords = words;
      u.entry.committed = words.slice(0, u.committedN).join(" ");
      u.entry.tail = words.slice(u.committedN).join(" ");
    }
    u.entry.latency = Math.round(performance.now() - t0);
    u.entry.seconds = u.len / getInputRate();
    render(u.entry);
    if (!isFinal) {
      docSetInterim(u.entry);
      setDocStatus(
        liveLabel(),
        `${lidHint()} · listening · ${u.entry.latency} ms per pass`,
      );
    }
    return text;
  } catch (e) {
    if (u.entry) {
      u.entry.error = errMsg(e);
      render(u.entry);
    }
    return interimText(u);
  } finally {
    live.inflight = false;
  }
}

async function finalizeUtterance(u: Utterance) {
  u.final = true;
  live.utt = null;
  while (live.inflight) await new Promise((r) => setTimeout(r, 30));
  const pcm = uttPcm(u);
  const needFinal = u.len - u.sentLen >= 0.4 * getInputRate() || !u.entry;
  let text = needFinal ? await runPass(u, true) : interimText(u);
  const e = u.entry;
  if (!e) return;
  const steps: string[] = [];
  if (u.switched) steps.push(u.switched);
  if (u.keptInterim) steps.push("final pass returned less; kept the live text");
  e.text = text;
  e.liveFinal = true;
  e.audio = toWav(pcm);
  e.lid = u.lid;
  e.seconds = u.len / getInputRate();
  if (!text) {
    // nothing from any engine: no sentence, but the card and the strip say so
    e.silent = true;
    render(e);
    persist();
    docRawSilent(e);
    return;
  }
  render(e);
  persist();
  if (!flags().correct || e.error) {
    docSetFinal(e, text, "skipped");
    if (e.lid) renderDecision(e);
    return;
  }
  docSetFinal(e, text, "fixing");
  setDocStatus(liveLabel(), "correcting…");
  const t0 = performance.now();
  try {
    const res = await correctText(text, null, {
      onPartial: (partial) => docSetText(e, partial),
    });
    const ms = Math.round(performance.now() - t0);
    updateEntry(e, {
      raw: text,
      text: res.text,
      cleanupMs: ms,
      correctSteps: [...steps, ...res.steps].join(" · "),
      decisions: res.decisions,
      decisionMs: ms,
    });
    docSetFinal(e, res.text, "corrected");
    renderDecision(e);
    setDocStatus(liveLabel(), `listening · last correction ${ms} ms`);
  } catch (err) {
    updateEntry(e, {
      correctSteps: [...steps, "correction failed: " + errMsg(err)].join(" · "),
    });
    docSetFinal(e, text, "failed");
  }
}

export async function liveStart() {
  try {
    await ensureAudio();
  } catch {
    addEntry({
      error: "Microphone blocked. Allow mic access for this page and reload.",
    });
    setDocStatus(
      "Microphone blocked",
      "allow mic access for this page and reload",
    );
    return;
  }
  const eng = routed(getState().engine);
  live.engine = LIVE_LABEL[eng] ? eng : "local";
  live.on = true;
  live.utt = null;
  live.pre = [];
  live.preLen = 0;
  live.block = null;
  live.noiseWin = [];
  live.noise = 0.004;
  lidMemory.last = null;
  setState({
    capture: "live",
    liveEngine: live.engine,
    recordStartedAt: Date.now(),
  });
  setDocStatus(liveLabel(), "listening");
  if (useServer()) {
    // the server endpoints, transcribes and corrects; the page only streams PCM
    setDocStatus(liveLabel(), "connecting…");
    nlLiveStart();
    return;
  }
  warmCorrector();
  live.timer = window.setInterval(() => void liveTick(), 150);
  if (live.engine === "whistle") whistleStart();
}

export async function liveStop() {
  live.on = false;
  clearInterval(live.timer);
  emitLevel(0);
  setState({
    capture: "idle",
    recordStartedAt: null,
    docStatus: { plain: "stopped · press the mic to continue" },
  });
  if (live.nl) {
    nlLiveStop();
    return;
  }
  const u = live.utt;
  if (u && (u.speechMs >= MIN_SPEECH_MS || u.entry)) await finalizeUtterance(u);
  else live.utt = null;
}

// ------------------------------------------------------------------ live captions through NeuroLink
const NL_SEND_SAMPLES = 1600,
  NL_KEEP_SAMPLES = 600 * SAMPLE_RATE; // 100 ms of 16 kHz PCM per frame; 10 min kept for playback

function nlLiveConfig(eng: EngineId) {
  const c: Record<string, unknown> = { provider: nlProviderFor(eng) };
  const model = nlModelFor(eng);
  if (model) c.model = model;
  const lang = nlLanguage(eng);
  if (lang) c.language = lang;
  const ctxS = nlContext();
  if (flags().correct) {
    if (ctxS) c.prompt = ctxS;
    if (getState().dictionary.length) c.dictionary = nlDictionary();
    c.correction = {
      ...(ctxS ? { context: ctxS } : {}),
      transliterate: nlTransliterate(),
      ...(flags().clean && getState().serverFileMode
        ? { cleanup: "clean" }
        : {}),
      // Indic-Transcribe already reads code-mixed speech; reconciling it with Spark (weaker on
      // Indian speech) only applies to the other engines' fallbacks, so it is not sent here.
    };
  } else {
    const p = asrContextPrompt();
    if (p) c.prompt = p;
  } // no dictionary: it would switch correction on
  const fb = nlFallbackFor(eng);
  if (fb) Object.assign(c, fb);
  const output = nlOutput();
  if (output) c.output = output;
  c.streaming = { sampleRate: SAMPLE_RATE };
  return c;
}

/** Tell the live socket the output languages changed; they apply from the next utterance. */
export function nlLiveSetOutputs(languages: string[]) {
  const ws = live.nl?.ws;
  if (ws && ws.readyState === WebSocket.OPEN)
    ws.send(JSON.stringify({ type: "output", languages }));
}

function nlLiveStart() {
  const url = new URL(
    nlBase.replace(/^http/, "ws") + "/v1/audio/transcriptions/stream",
  );
  if (cfg.neurolinkToken) url.searchParams.set("token", cfg.neurolinkToken);
  const s: NlSession = {
    ws: new WebSocket(url),
    queue: [],
    pend: [],
    pendLen: 0,
    utts: new Map(),
    sent: [],
    sentLen: 0,
    sentFrom: 0,
    correct: flags().correct,
    eng: live.engine,
    ended: false,
  };
  s.ws.binaryType = "arraybuffer";
  s.ws.onopen = () => {
    s.ws.send(JSON.stringify(nlLiveConfig(s.eng)));
    for (const b of s.queue) s.ws.send(b);
    s.queue = [];
    if (s.ended) s.ws.send(JSON.stringify({ type: "end" }));
  };
  s.ws.onmessage = (m) => {
    if (typeof m.data !== "string") return;
    let ev: NlEvent;
    try {
      ev = JSON.parse(m.data) as NlEvent;
    } catch {
      return;
    }
    nlEvent(s, ev);
  };
  s.ws.onclose = (ev) => {
    if (live.nl === s && live.on) {
      void liveStop();
      setDocStatus(
        labelFor(s.eng),
        `NeuroLink connection closed (${ev.code}${ev.reason ? " " + String(ev.reason) : ""})`,
      );
    }
  };
  s.ws.onerror = () => {
    if (live.nl === s)
      setDocStatus(labelFor(s.eng), "cannot reach the NeuroLink server");
  };
  live.nl = s;
}

function nlSend(s: NlSession, int16: Int16Array) {
  const buf = int16.buffer as ArrayBuffer;
  if (s.ws.readyState === WebSocket.OPEN) s.ws.send(buf);
  else if (s.ws.readyState === WebSocket.CONNECTING) s.queue.push(buf);
}

function nlFlush(s: NlSession) {
  if (!s.pendLen) return;
  const out = new Int16Array(s.pendLen);
  let o = 0;
  for (const f of s.pend)
    for (let i = 0; i < f.length; i++, o++) {
      const v = Math.max(-1, Math.min(1, f[i]));
      out[o] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
  s.pend = [];
  s.pendLen = 0;
  nlSend(s, out);
  s.sent.push(out);
  s.sentLen += out.length; // kept (last 10 min) so each finished sentence's card can play its audio
  while (s.sentLen - s.sentFrom > NL_KEEP_SAMPLES && s.sent.length > 1)
    s.sentFrom += s.sent.shift()!.length;
}

function nlAudio(s: NlSession, start: number, end: number) {
  const a = Math.max(Math.round(start * SAMPLE_RATE), s.sentFrom),
    b = Math.min(Math.round(end * SAMPLE_RATE), s.sentLen);
  if (!(b > a)) return null;
  const out = new Float32Array(b - a);
  let pos = s.sentFrom;
  for (const c of s.sent) {
    const lo = Math.max(a, pos),
      hi = Math.min(b, pos + c.length);
    for (let i = lo; i < hi; i++) out[i - a] = c[i - pos] / 0x8000;
    pos += c.length;
    if (pos >= b) break;
  }
  return toWav(out);
}

function nlFeed(buf: Float32Array) {
  emitLevel(rmsOf(buf)); // the level meter; the server does the endpointing
  const s = live.nl;
  if (!s) return;
  const pcm = resampleTo16k(buf);
  s.pend.push(pcm);
  s.pendLen += pcm.length;
  if (s.pendLen >= NL_SEND_SAMPLES) nlFlush(s);
}

function nlLiveStop() {
  const s = live.nl;
  live.nl = null;
  if (!s) return;
  nlFlush(s);
  s.ended = true;
  if (s.ws.readyState === WebSocket.OPEN)
    s.ws.send(JSON.stringify({ type: "end" })); // the server finalizes, corrects, then closes with 1000
  else if (s.ws.readyState !== WebSocket.CONNECTING) return;
  setTimeout(() => {
    if (s.ws.readyState < WebSocket.CLOSING) s.ws.close(1000);
  }, 30000);
}

function nlUtt(s: NlSession, id: number) {
  let u = s.utts.get(id);
  if (!u) {
    u = {
      entry: addEntry({
        live: true,
        engine: s.eng,
        pending: false,
        committed: "",
        tail: "",
      }),
      lid: null,
    };
    s.utts.set(id, u);
  }
  return u;
}

function nlStatus(s: NlSession, text: string) {
  setDocStatus(
    labelFor(s.eng),
    `${lidHint().replace(/^ · /, "")}${lidHint() ? " · " : ""}${text}`,
  );
}

type NlEvent = {
  type:
    | "error"
    | "language"
    | "interim"
    | "final"
    | "correcting"
    | "corrected"
    | "output"
    | "silence";
  utterance?: number;
  status?: string;
  message?: string;
  recoverable?: boolean;
  language?: string;
  detected?: boolean;
  languageDetected?: boolean;
  scores?: { language: string; score: number }[];
  engine?: string;
  committed?: string;
  tail?: string;
  text?: string;
  raw?: string;
  latencyMs?: number;
  seconds?: number;
  segment?: { start?: number; end?: number };
  steps?: string[];
  timings?: NlTimings;
  decisions?: NlDecision[];
};

function nlEvent(s: NlSession, ev: NlEvent) {
  const engOf = (p?: string) => nlEngineOf(p) || s.eng;
  if (ev.type === "error") {
    console.warn("NeuroLink stream error:", ev.message);
    if (ev.recoverable)
      nlStatus(s, `error: ${ev.message || "unknown"} · still listening`);
    else {
      if (live.nl === s && live.on) void liveStop();
      setDocStatus(
        labelFor(s.eng),
        `NeuroLink error: ${String(ev.message || "unknown")}`,
      );
    }
    return;
  }
  if (ev.utterance == null) return;
  if (ev.type === "language") {
    const lid: Lid = {
      language: ev.language ?? "",
      detected: ev.detected,
      scores: ev.scores,
    };
    lidMemory.last = lid;
    nlUtt(s, ev.utterance).lid = lid;
    nlStatus(s, live.on ? "listening" : "finishing");
    return;
  }
  const u = nlUtt(s, ev.utterance),
    e = u.entry;
  if (ev.type === "interim") {
    if (e.liveFinal) return;
    e.engine = engOf(ev.engine);
    e.committed = ev.committed || "";
    e.tail = ev.tail || (ev.committed ? "" : ev.text || "");
    e.latency = ev.latencyMs;
    e.seconds = ev.seconds;
    render(e);
    docSetInterim(e);
    nlStatus(s, `listening · ${ev.latencyMs ?? "?"} ms per pass`);
  } else if (ev.type === "final") {
    e.engine = engOf(ev.engine);
    e.text = ev.text || "";
    e.liveFinal = true;
    e.seconds = ev.seconds;
    const seg = ev.segment;
    if (seg && seg.end != null)
      e.audio = nlAudio(s, seg.start ?? 0, seg.end) || e.audio;
    e.lid = ev.language
      ? {
          language: ev.language,
          detected: ev.languageDetected,
          scores: u.lid?.scores,
        }
      : u.lid;
    e.correctSteps = "via NeuroLink";
    if (!e.text) {
      e.silent = true;
      render(e);
      persist();
      docRawSilent(e);
      return;
    }
    render(e);
    persist();
    docSetFinal(e, e.text, s.correct ? "fixing" : "skipped");
    if (s.correct) nlStatus(s, "correcting…");
    else if (e.lid) renderDecision(e);
  } else if (ev.type === "correcting") docSetText(e, ev.text ?? "");
  else if (ev.type === "corrected") {
    const t = ev.timings || {};
    const steps = [
      ...(e.correctSteps ? [e.correctSteps] : []),
      ...nlSteps({ steps: ev.steps, timings: t }).slice(1),
    ];
    updateEntry(e, {
      raw: ev.raw ?? e.text,
      text: ev.text || e.text,
      cleanupMs: Math.round(t.correctionMs ?? t.totalMs ?? 0),
      correctSteps: steps.join(" · "),
      decisions: nlDecisions(ev.decisions),
      decisionMs: t.decideMs != null ? Math.round(t.decideMs) : null,
    });
    docSetFinal(e, e.text ?? "", "corrected");
    renderDecision(e);
    nlStatus(
      s,
      `${live.on && live.nl === s ? "listening" : "stopped"} · last correction ${Math.round(t.correctionMs ?? t.totalMs ?? 0)} ms`,
    );
  } else if (ev.type === "output") {
    if (!ev.language) return;
    updateEntry(e, {
      outputs: {
        ...e.outputs,
        [ev.language]: { text: ev.text ?? "", status: ev.status ?? "ok" },
      },
    });
  } else if (ev.type === "silence") {
    if (e.liveFinal && e.text) return;
    Object.assign(e, {
      liveFinal: true,
      silent: true,
      text: "",
      seconds: ev.seconds,
    });
    clearTail();
    render(e);
    persist();
    docRawSilent(e);
  }
}

// ------------------------------------------------------------------ the mic
// hold = talk while held; a tap shorter than TAP_MS toggles; in live mode a press starts/stops
const TAP_MS = 250;
let pressStart = 0,
  toggled = false;

export function pressDown() {
  if (getState().mode === "live") {
    if (live.on) void liveStop();
    else void liveStart();
    return;
  }
  if (ptt.recording && toggled) {
    toggled = false;
    void stopRecording();
    return;
  }
  pressStart = performance.now();
  void startRecording();
}

export function pressUp() {
  if (getState().mode === "live" || !ptt.recording) return;
  if (performance.now() - pressStart < TAP_MS) {
    toggled = true;
    return;
  }
  toggled = false;
  void stopRecording();
}

export function pressCancel() {
  if (ptt.recording && !toggled) void stopRecording();
}

export const lastRecording = () =>
  [...getState().entries]
    .reverse()
    .find((e) => e.kind !== "tts" && e.audio && e.text && !e.error);
