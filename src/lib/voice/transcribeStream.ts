/**
 * Streaming transcription orchestration: `neurolink.transcribeStream()`.
 *
 * Two ways to stream, chosen per request:
 *
 * - **native** — the handler streams itself (`transcribeStream` +
 *   `supportsStreaming`); its segments are mapped to `interim` / `final`
 *   events, with LocalAgreement applied to consecutive interim segments.
 * - **chunked** — any batch handler, streamed on the client by the chunked
 *   adapter (energy gate, rolling re-transcription, LocalAgreement, language
 *   takeover to the fallback engine).
 *
 * `streaming.mode` `"auto"` (the default) and `"native"` use the native
 * stream when the handler has one, else the adapter; `"chunked"` always uses
 * the adapter.
 *
 * Every final is followed, when correction is configured, by `correcting`
 * events (the streamed rewrite) and one `corrected` event. Correction runs
 * beside the stream: utterance N being corrected never holds back the
 * interim passes of utterance N+1. The second-opinion engine runs on the
 * utterance audio in parallel with the final pass, not after it.
 *
 * @module voice/transcribeStream
 */
import { logger } from "../utils/logger.js";
import {
  collapseRepetitions,
  isPromptEcho,
  loopShare,
} from "./correction/guards.js";
import {
  SpanSerializer,
  SpanStatus,
  SpanType,
  getMetricsAggregator,
} from "../observability/index.js";
import { createWavFile } from "./audio-utils.js";
import { normalizeSpeechLevel } from "./audioLevel.js";
import { normalizeLanguageCode } from "./languages.js";
import { outputLanguagesOf, renderOutputs } from "./output/render.js";
import {
  correctTranscript,
  correctTranscriptSentences,
  isCorrectionEnabled,
} from "./correction/index.js";
import {
  StreamEventQueue,
  chunkedTranscribeStream,
} from "./streaming/chunkedStreamAdapter.js";
import {
  ENDPOINTER_DEFAULTS,
  ENGINE_SAMPLE_RATE,
} from "./streaming/endpointer.js";
import {
  createLocalAgreement,
  resetLocalAgreement,
  splitWords,
  updateLocalAgreement,
} from "./streaming/localAgreement.js";
import type {
  STTChunkedPassOptions,
  STTChunkedRun,
  STTDictionaryEntry,
  STTHandler,
  STTOptions,
  STTResult,
  STTStreamEngineRole,
  TranscribeDeps,
  TranscribeStreamEvent,
  TranscribeStreamOptions,
  TranscriptionSegment,
  WordTiming,
} from "../types/index.js";

/** Keys of `TranscribeOptions` that are not `STTOptions` and must not reach a handler. */
const NON_STT_KEYS = new Set([
  "audio",
  "provider",
  "model",
  "language",
  "format",
  "prompt",
  "dictionary",
  "correction",
  "fallback",
  "routing",
  "chunking",
  "output",
  "streaming",
  "credentials",
]);
// `timeoutMs` is deliberately NOT in the set: it is an engine option as well
// (handlers that honour one apply it per request), so it rides through.

/** Float samples in [-1, 1] → 16 kHz mono PCM16 WAV. */
export function encodeWav16k(pcm: Float32Array): Buffer {
  const data = Buffer.alloc(pcm.length * 2);
  for (let i = 0; i < pcm.length; i++) {
    const s = Math.max(-1, Math.min(1, pcm[i]));
    data.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), i * 2);
  }
  return createWavFile(data, ENGINE_SAMPLE_RATE, 1, 16);
}

/**
 * Engine options for one provider: the caller's pass-through `STTOptions`,
 * dictionary terms as vocabulary and appended to the prompt, `"auto"`
 * language left to the engine.
 */
/** The words an engine is prompted with (dictionary terms, the caller's vocabulary, the fixed phrasing). */
export function promptTermsOf(options: {
  dictionary?: STTDictionaryEntry[];
  vocabulary?: string[];
}): string[] {
  return [
    ...(options.vocabulary ?? []),
    ...(options.dictionary ?? []).flatMap((d) => [
      d.term,
      ...(d.heardAs ?? []),
    ]),
    "Names and terms used",
  ].filter((t) => typeof t === "string" && t.trim().length > 0);
}

function wordCount(text: string): number {
  return text.split(/\s+/u).filter(Boolean).length;
}

/**
 * Engine output through the guards: a looping phrase is collapsed and the
 * share of words it took is recorded on `metadata.loopShare`; an output
 * that is only the prompt echoed back becomes empty. `note` receives a
 * human-readable line for each guard that fired.
 */
export function guardEngineResult(
  res: STTResult,
  promptTerms: readonly string[],
  note: (line: string) => void,
): STTResult {
  const original = res.text ?? "";
  if (!original.trim()) {
    return res;
  }
  if (isPromptEcho(original, promptTerms)) {
    note("prompt echo discarded");
    return {
      ...res,
      text: "",
      words: undefined,
      segments: undefined,
      metadata: {
        ...(res.metadata ?? { latency: 0 }),
        hallucination: "prompt-echo",
      },
    };
  }
  const collapsed = collapseRepetitions(original);
  if (collapsed.removed === 0) {
    return res;
  }
  const share = loopShare(collapsed.removed, wordCount(original));
  note(`repetition collapsed (${collapsed.removed} words)`);
  const metadata = {
    ...(res.metadata ?? { latency: 0 }),
    loopShare: share,
  };
  if (!res.segments || res.segments.length <= 1) {
    return {
      ...res,
      text: collapsed.text,
      // Word timings no longer line up with the collapsed text.
      words: undefined,
      segments: res.segments?.length
        ? [{ ...res.segments[0], text: collapsed.text }]
        : undefined,
      metadata,
    };
  }
  // Many segments (a long, diarized file): collapse each segment on its own,
  // so speaker turns and timings survive, and drop word timings only inside
  // the segments whose text changed.
  const changed: Array<{ start: number; end: number }> = [];
  const segments = res.segments.map((segment) => {
    const own = collapseRepetitions(segment.text);
    if (own.removed === 0) {
      return segment;
    }
    changed.push({
      start: segment.start ?? Number.NEGATIVE_INFINITY,
      end: segment.end ?? Number.POSITIVE_INFINITY,
    });
    return { ...segment, text: own.text };
  });
  if (changed.length === 0) {
    // The loop ran across segment boundaries: keep the segments as the
    // engine wrote them, and only the joined text collapsed.
    return { ...res, text: collapsed.text, metadata };
  }
  const words = res.words?.filter((w) => {
    const { start, end } = w;
    return (
      start === undefined ||
      end === undefined ||
      !changed.some((c) => start >= c.start && end <= c.end)
    );
  });

  return {
    ...res,
    text: segments.map((s) => s.text).join(" "),
    segments,
    words,
    metadata,
  };
}

function buildEngineOptions(
  options: TranscribeStreamOptions,
  model: string | undefined,
  audio: { format: STTOptions["format"]; sampleRate: number },
): STTOptions & { prompt?: string } {
  const passthrough: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(options)) {
    if (!NON_STT_KEYS.has(key) && value !== undefined) {
      passthrough[key] = value;
    }
  }
  const terms = (options.dictionary ?? [])
    .map((d) => d.term.trim())
    .filter(Boolean);
  const vocabulary = [...(options.vocabulary ?? []), ...terms];
  const promptParts = [options.prompt, options.correction?.context].filter(
    (p): p is string => typeof p === "string" && p.trim().length > 0,
  );
  if (terms.length) {
    promptParts.push(terms.join(", "));
  }
  const language =
    options.language && options.language.toLowerCase() !== "auto"
      ? options.language
      : undefined;
  return {
    ...(passthrough as STTOptions),
    ...(model ? { model } : {}),
    ...(language ? { language } : {}),
    ...(vocabulary.length ? { vocabulary } : {}),
    ...(promptParts.length ? { prompt: promptParts.join(" ") } : {}),
    format: audio.format,
    sampleRate: audio.sampleRate,
  };
}

/**
 * A final's language when it can be trusted: an unsure verdict ("hi?", the
 * Indic engine's fallback label on speech it could not place) must never
 * decide a rewrite's rules or make a rendering look like the same language.
 */
function confidentLanguage(final: {
  language?: string;
  languageDetected?: boolean;
}): string | undefined {
  return final.languageDetected === false ? undefined : final.language;
}

/** Uint8Array frames → Buffers (no copy), reporting each frame as it is handed over. */
async function* asBuffers(
  frames: AsyncIterable<Buffer | Uint8Array>,
  onFrame: (bytes: number) => void,
): AsyncGenerator<Buffer> {
  for await (const f of frames) {
    onFrame(f.byteLength);
    yield Buffer.isBuffer(f)
      ? f
      : Buffer.from(f.buffer, f.byteOffset, f.byteLength);
  }
}

/** The second engine on one utterance; never rejects (`text: null` when it heard nothing or failed). */
async function runSecondOpinion(
  deps: TranscribeDeps,
  pcm: Float32Array,
  provider: string,
  engineOptions: STTOptions,
  utterance: number,
): Promise<{ text: string | null; ms: number }> {
  const t0 = Date.now();
  try {
    const r = await deps.transcribe(encodeWav16k(pcm), provider, engineOptions);
    return { text: r.text?.trim() || null, ms: Date.now() - t0 };
  } catch (err) {
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[transcribeStream] second opinion failed for utterance ${utterance}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    return { text: null, ms: Date.now() - t0 };
  }
}

/** Text ending a sentence: Latin, Devanagari danda, CJK and ellipsis, before closing quotes or brackets. */
const SENTENCE_END = /[.?!\u0964\u3002\uFF1F\uFF01\u2026]["'\u201D\u2019)\]]*$/;

function segStart(s: TranscriptionSegment): number | undefined {
  return s.startTime ?? s.start;
}
function segEnd(s: TranscriptionSegment): number | undefined {
  return s.endTime ?? s.end;
}

/**
 * One utterance of a native stream, assembled from the engine's segments.
 *
 * Native engines (Whistle, Deepgram live) report a final segment for each run
 * of words they commit and an interim for the still-unconfirmed tail, which
 * does not repeat what was already committed. A commit therefore is not the
 * end of an utterance: Whistle shows "Hello there." as its tail and then
 * commits just "Hello", with "there" still pending. The utterance stays open
 * until a commit covers everything the engine had shown as pending (or the
 * engine reports an empty tail, or the stream ends), so a final is never cut
 * below what the caller already saw as one utterance, and the boundaries are
 * the engine's own.
 */
class NativeUtterance {
  /** Text of the commits so far, in order. */
  readonly commits: string[] = [];
  readonly words: WordTiming[] = [];
  /** The engine's current unconfirmed tail. */
  tail = "";
  /** LocalAgreement over successive tails; shifted when a commit moves the base. */
  readonly la = createLocalAgreement();
  startTime: number | undefined;
  endTime: number | undefined;
  language: string | undefined;
  confidence: number | undefined;

  constructor(
    readonly id: number,
    /** Where the previous utterance ended, the fallback start when the engine gives no times. */
    readonly floor: number,
  ) {}

  get committedText(): string {
    return this.commits.join(" ");
  }

  get empty(): boolean {
    return this.commits.length === 0 && !this.tail;
  }

  /** Start on the stream clock: the first commit's time, else where the previous one ended. */
  get start(): number {
    return this.startTime ?? this.floor;
  }
}

/** Maps a native handler's segments to stream events. */
async function* nativeEvents(
  handler: STTHandler & {
    transcribeStream: NonNullable<STTHandler["transcribeStream"]>;
  },
  frames: AsyncIterable<Buffer | Uint8Array>,
  engineOptions: STTOptions,
  engine: string,
  inputRate: number,
  maxUtteranceSeconds: number,
): AsyncGenerator<TranscribeStreamEvent> {
  let lastFrameAt = Date.now();
  let bytesIn = 0;
  let lastLanguage = "";
  // Seconds of audio handed to the engine: interim segments carry no times,
  // so this is what an interim's length is measured against.
  const clock = () => bytesIn / 2 / inputRate;
  let u = new NativeUtterance(1, 0);

  /**
   * The current utterance as an interim. `fromEngine` is true for a new tail
   * from the engine, which is one LocalAgreement pass; a tail trimmed after a
   * partial commit is the same pass seen again and must not count as agreement.
   */
  const interim = (fromEngine: boolean): TranscribeStreamEvent => {
    let tailCommitted: string;
    let tailRest: string;
    if (fromEngine) {
      const split = updateLocalAgreement(u.la, u.tail);
      tailCommitted = split.committed;
      tailRest = split.tail;
    } else {
      const words = splitWords(u.tail);
      tailCommitted = u.la.committedWords.join(" ");
      tailRest = words.slice(u.la.committedN).join(" ");
    }
    return {
      type: "interim",
      utterance: u.id,
      text: [u.committedText, u.tail].filter(Boolean).join(" "),
      committed: [u.committedText, tailCommitted].filter(Boolean).join(" "),
      tail: tailRest,
      seconds: Math.max(0, Math.max(clock(), u.endTime ?? 0) - u.start),
      // A native stream has no passes; this is how far the text trails the newest audio.
      latencyMs: Date.now() - lastFrameAt,
      engine,
    };
  };

  /** Ends the current utterance; words still pending are kept, never dropped. */
  const close = (): TranscribeStreamEvent | null => {
    const done = u;
    const text = [done.committedText, done.tail].filter(Boolean).join(" ");
    const start = done.start;
    const end = Math.max(
      start,
      done.tail ? clock() : (done.endTime ?? clock()),
    );
    u = new NativeUtterance(done.id + 1, end);
    if (!text) {
      return null;
    }
    const seconds = end - start;
    return {
      type: "final",
      utterance: done.id,
      text,
      segment: {
        index: done.id,
        text,
        isFinal: true,
        startTime: start,
        endTime: end,
        start,
        end,
        ...(done.confidence !== undefined
          ? { confidence: done.confidence }
          : {}),
        ...(done.words.length ? { words: done.words } : {}),
        ...(done.language ? { language: done.language } : {}),
      },
      ...(done.words.length ? { words: done.words } : {}),
      ...(done.language ? { language: done.language } : {}),
      engine,
      seconds,
    };
  };

  const stream = handler.transcribeStream(
    asBuffers(frames, (bytes) => {
      bytesIn += bytes;
      lastFrameAt = Date.now();
    }),
    engineOptions,
  );
  for await (const seg of stream) {
    if (seg.language && seg.language !== lastLanguage) {
      lastLanguage = seg.language;
      yield {
        type: "language",
        utterance: u.id,
        language: seg.language,
        detected: true,
      };
    }
    if (seg.language) {
      u.language = seg.language;
    }
    const text = seg.text.trim();
    if (!seg.isFinal) {
      if (text) {
        u.tail = text;
        yield interim(true);
      } else if (!u.empty) {
        // The engine has nothing pending any more: what it committed is the utterance.
        u.tail = "";
        const ev = close();
        if (ev) {
          yield ev;
        }
      }
      continue;
    }
    if (!text) {
      continue;
    }
    const pending = splitWords(u.tail);
    const committedWords = splitWords(text);
    u.commits.push(text);
    u.startTime ??= segStart(seg);
    u.endTime = segEnd(seg) ?? u.endTime;
    if (seg.words?.length) {
      u.words.push(...seg.words);
    }
    if (typeof seg.confidence === "number") {
      u.confidence = seg.confidence;
    }
    if (committedWords.length >= pending.length) {
      // The commit covers everything shown as pending. That ends the
      // utterance when the engine ended a sentence, or the turn has run past
      // `maxUtteranceSeconds`; a commit like "Let us review the" (measured on
      // Whistle mid-sentence, the rest arriving a second later) leaves it open.
      // An empty tail from the engine, or the end of the stream, closes it too.
      u.tail = "";
      if (
        SENTENCE_END.test(text) ||
        (u.endTime ?? clock()) - u.start >= maxUtteranceSeconds
      ) {
        const ev = close();
        if (ev) {
          yield ev;
        }
      } else {
        resetLocalAgreement(u.la);
      }
    } else {
      // A partial commit: the rest of the shown tail is still pending in this utterance.
      u.tail = pending.slice(committedWords.length).join(" ");
      // Shift LocalAgreement past the committed words rather than resetting
      // it, so the committed text an interim reports never shrinks.
      u.la.prevWords = u.la.prevWords.slice(committedWords.length);
      u.la.committedWords = u.la.committedWords.slice(committedWords.length);
      u.la.committedN = u.la.committedWords.length;
      yield interim(false);
    }
  }
  // Stream over: anything committed or still shown is finalized.
  const last = close();
  if (last) {
    yield last;
  }
}

/**
 * `"auto"` and `"native"` take the handler's own stream when it has one;
 * `"native"` on a handler without one falls back to the adapter.
 */
function chooseNative(
  mode: "auto" | "native" | "chunked",
  handler: STTHandler | undefined,
  provider: string,
): boolean {
  const useNative =
    mode !== "chunked" &&
    handler?.supportsStreaming === true &&
    typeof handler.transcribeStream === "function";
  if (mode === "native" && !useNative && logger.shouldLog("debug")) {
    logger.debug(
      `[transcribeStream] "${provider}" has no native stream; using the chunked adapter`,
    );
  }
  return useNative;
}

export async function* runTranscribeStream(
  options: TranscribeStreamOptions,
  deps: TranscribeDeps,
): AsyncIterable<TranscribeStreamEvent> {
  const provider = deps.resolveProvider(options.provider);
  const handler = deps.getHandler(provider);
  const mode = options.streaming?.mode ?? "auto";
  const inputRate =
    options.streaming?.sampleRate && options.streaming.sampleRate > 0
      ? options.streaming.sampleRate
      : ENGINE_SAMPLE_RATE;
  const useNative = chooseNative(mode, handler, provider);

  const out = new StreamEventQueue<TranscribeStreamEvent>();
  const span = SpanSerializer.createSpan(SpanType.STT, "stt.transcribeStream", {
    "stt.operation": "transcribeStream",
    "stt.provider": provider,
    "stt.language": options.language,
    "stt.streaming_mode": useNative ? "native" : "chunked",
  });

  // Optional engines resolve up front; a misconfigured one is reported and
  // left out rather than ending a stream the primary engine can serve.
  const resolveOptional = (name: string, role: string): string | undefined => {
    try {
      return deps.resolveProvider(name);
    } catch (err) {
      out.push({
        type: "error",
        message: `${role} provider "${name}" unavailable: ${err instanceof Error ? err.message : String(err)}`,
        recoverable: true,
      });
      return undefined;
    }
  };
  const fallbackProvider =
    !useNative && options.fallback
      ? resolveOptional(options.fallback.provider, "fallback")
      : undefined;
  const correcting = isCorrectionEnabled(
    options.dictionary,
    options.correction,
  );
  const secondSetting = correcting
    ? options.correction?.secondOpinion
    : undefined;
  // "auto": the fallback engine reads every utterance the primary leads, so
  // the rewrite can reconcile both readings of code-mixed speech.
  const secondSpec =
    secondSetting === "auto"
      ? options.fallback
        ? { provider: options.fallback.provider, model: options.fallback.model }
        : undefined
      : secondSetting;
  const secondProvider =
    !useNative && secondSpec
      ? resolveOptional(secondSpec.provider, "second-opinion")
      : undefined;

  const wavAudio = { format: "wav" as const, sampleRate: ENGINE_SAMPLE_RATE };
  const primaryOpts = buildEngineOptions(options, options.model, wavAudio);
  const fallbackOpts = buildEngineOptions(
    options,
    options.fallback?.model,
    wavAudio,
  );
  const secondOpts = buildEngineOptions(options, secondSpec?.model, wavAudio);
  const otherOpts = buildEngineOptions(options, undefined, wavAudio);

  // Language routing: which provider transcribes which language.
  const routes = new Map<string, string>();
  const pinnedLanguage = normalizeLanguageCode(options.language) !== undefined;
  if (!useNative && !pinnedLanguage) {
    for (const [lang, name] of Object.entries(options.routing?.engines ?? {})) {
      const key = lang.trim() === "*" ? "*" : normalizeLanguageCode(lang);
      const resolved =
        key && typeof name === "string" && name.trim()
          ? resolveOptional(name, `routing (${lang})`)
          : undefined;
      if (key && resolved) {
        routes.set(key, resolved);
      }
    }
  }
  const optionsFor = (name: string): STTOptions =>
    name === provider
      ? primaryOpts
      : name === fallbackProvider
        ? fallbackOpts
        : otherOpts;
  const normalize = options.streaming?.normalize !== false;
  const levelled = (pcm: Float32Array): Float32Array =>
    normalize ? normalizeSpeechLevel(pcm) : pcm;

  // Per-utterance bookkeeping shared by the adapter hooks and the correction tasks.
  const finalPassMs = new Map<number, number>();
  const endedAt = new Map<number, number>();
  const secondOpinions = new Map<
    number,
    Promise<{ text: string | null; ms: number }>
  >();

  // Words the engines were prompted with: an output made only of these is
  // the prompt echoed back on a pause, not speech.
  const promptTerms = promptTermsOf(options);
  const guardNotes = new Map<number, string[]>();
  const noteGuard = (utterance: number, note: string): void => {
    const notes = guardNotes.get(utterance) ?? [];
    if (!notes.includes(note)) {
      notes.push(note);
    }
    guardNotes.set(utterance, notes);
  };
  // `fileModeStreamOptions` turns interim passes off with an infinite cadence;
  // a live caller cannot send one (JSON has no Infinity).
  const fileMode = options.streaming?.intervalMs === Number.POSITIVE_INFINITY;

  const callEngine = (
    wav: Buffer,
    engine: STTStreamEngineRole,
    prior: string | undefined,
    hint?: string,
  ): Promise<STTResult> =>
    engine === "fallback" && fallbackProvider
      ? deps.transcribe(
          wav,
          fallbackProvider,
          hint ? { ...fallbackOpts, language: hint } : fallbackOpts,
        )
      : deps.transcribe(
          wav,
          provider,
          prior ? { ...primaryOpts, languagePrior: prior } : primaryOpts,
        );

  /** The utterance as two halves, joined: what an engine that choked on the whole gets instead. */
  const runHalves = async (
    pcm: Float32Array,
    pass: STTChunkedPassOptions,
  ): Promise<STTResult> => {
    const mid = Math.floor(pcm.length / 2);
    const halves = await Promise.all([
      callEngine(
        encodeWav16k(pcm.subarray(0, mid)),
        pass.engine,
        pass.languagePrior,
        pass.languageHint,
      ),
      callEngine(
        encodeWav16k(pcm.subarray(mid)),
        pass.engine,
        pass.languagePrior,
        pass.languageHint,
      ),
    ]);
    return guardEngineResult(
      {
        ...halves[0],
        text: [halves[0].text, halves[1].text]
          .filter((t) => t.trim())
          .join(" "),
        words: undefined,
        segments: undefined,
      },
      promptTerms,
      () => undefined,
    );
  };

  /** Utterances handed to another engine by routing: later passes go straight to it. */
  const routedUtterances = new Map<number, { target: string; lang: string }>();

  /** One pass on a routed engine, tagged with it; `undefined` when it heard nothing or failed. */
  const runRouted = async (
    pcm: Float32Array,
    pass: STTChunkedPassOptions,
    target: string,
    lang: string,
    fallbackLanguage: string | undefined,
  ): Promise<STTResult | undefined> => {
    try {
      const alt = guardEngineResult(
        await deps.transcribe(encodeWav16k(pcm), target, {
          ...optionsFor(target),
          languagePrior: lang,
        }),
        promptTerms,
        (note) => noteGuard(pass.utterance, note),
      );
      if (alt.text.trim() && alt.metadata?.languageDetected !== false) {
        return {
          ...alt,
          language: alt.language ?? fallbackLanguage,
          metadata: {
            ...(alt.metadata ?? { latency: 0 }),
            routedProvider: target,
          },
        };
      }
      noteGuard(pass.utterance, `routing ${lang} → ${target} heard nothing`);
    } catch (error) {
      noteGuard(
        pass.utterance,
        `routing ${lang} → ${target} failed (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    return undefined;
  };

  /**
   * A pass whose detected language belongs to another engine is read again
   * by that engine, and the rest of the utterance goes to it; its text is
   * used when it heard words and reads the language. Any failure keeps the
   * text already in hand.
   */
  const routeFinal = async (
    res: STTResult,
    pcm: Float32Array,
    pass: STTChunkedPassOptions,
  ): Promise<STTResult> => {
    if (routes.size === 0) {
      return res;
    }
    const lang = normalizeLanguageCode(res.language);
    if (!lang) {
      return res;
    }
    const target = routes.get(lang) ?? routes.get("*");
    const used =
      pass.engine === "fallback" && fallbackProvider
        ? fallbackProvider
        : provider;
    if (!target || target === used) {
      return res;
    }
    const alt = await runRouted(pcm, pass, target, lang, res.language);
    if (!alt) {
      return res;
    }
    noteGuard(pass.utterance, `routed ${lang} → ${target}`);
    routedUtterances.set(pass.utterance, { target, lang });
    return alt;
  };

  const run: STTChunkedRun = async (rawPcm, pass) => {
    const t0 = Date.now();
    const pcm = levelled(rawPcm);
    const routed = routedUtterances.get(pass.utterance);
    if (routed) {
      const direct = await runRouted(
        pcm,
        pass,
        routed.target,
        routed.lang,
        routed.lang,
      );
      if (direct) {
        if (pass.final) {
          finalPassMs.set(pass.utterance, Date.now() - t0);
        }
        return direct;
      }
    }
    let res: STTResult;
    try {
      res = await callEngine(
        encodeWav16k(pcm),
        pass.engine,
        pass.languagePrior,
        pass.languageHint,
      );
    } catch (error) {
      // A final the engine could not finish (a decoding loop that ran into
      // the timeout, most often) is tried as two halves before it is given
      // up: a loop is a property of the chunk, not of the speech, and a
      // retry of the same audio would only stall as long again.
      if (!pass.final || pcm.length < ENGINE_SAMPLE_RATE * 4) {
        throw error;
      }
      let halves: STTResult;
      try {
        halves = await runHalves(pcm, pass);
      } catch {
        throw error;
      }
      noteGuard(
        pass.utterance,
        `engine failed on the whole utterance (${error instanceof Error ? error.message : String(error)}) · re-run as two halves`,
      );
      if (pass.final) {
        finalPassMs.set(pass.utterance, Date.now() - t0);
      }
      return halves;
    }
    res = guardEngineResult(res, promptTerms, (note) =>
      noteGuard(pass.utterance, note),
    );
    // A final that was mostly a loop is, on a file, worth a second attempt
    // as two halves: the loop is a property of the chunk, not the speech.
    const loop = res.metadata?.loopShare;
    if (
      fileMode &&
      pass.final &&
      typeof loop === "number" &&
      loop >= 0.5 &&
      pcm.length >= ENGINE_SAMPLE_RATE * 4
    ) {
      const joined = await runHalves(pcm, pass).catch(() => undefined);
      if (joined && wordCount(joined.text) > wordCount(res.text)) {
        noteGuard(pass.utterance, "loop: utterance re-run as two halves");
        res = joined;
      }
    }
    res = await routeFinal(res, pcm, pass);
    if (pass.final) {
      finalPassMs.set(pass.utterance, Date.now() - t0);
    }
    return res;
  };

  const source: AsyncIterable<TranscribeStreamEvent> = useNative
    ? nativeEvents(
        handler as STTHandler & {
          transcribeStream: NonNullable<STTHandler["transcribeStream"]>;
        },
        options.audio,
        buildEngineOptions(options, options.model, {
          format: "pcm16",
          sampleRate: inputRate,
        }),
        provider,
        inputRate,
        options.streaming?.maxUtteranceSeconds ??
          ENDPOINTER_DEFAULTS.maxUtteranceSeconds,
      )
    : chunkedTranscribeStream(options.audio, run, {
        ...options.streaming,
        sampleRate: inputRate,
        engineLabel: provider,
        ...(options.routing ? { routing: options.routing } : {}),
        ...(fallbackProvider
          ? {
              fallback: {
                label: fallbackProvider,
                ...(options.fallback?.when
                  ? { when: options.fallback.when }
                  : {}),
              },
            }
          : {}),
        onUtteranceEnd: (pcm, utterance, engine) => {
          endedAt.set(utterance, Date.now());
          // After a takeover the fallback's text is the transcript; a second
          // opinion of it would only reconcile against the primary's noise.
          if (!secondProvider || engine !== "primary") {
            return;
          }
          secondOpinions.set(
            utterance,
            runSecondOpinion(
              deps,
              levelled(pcm),
              secondProvider,
              secondOpts,
              utterance,
            ),
          );
        },
      });

  const takeSecondOpinion = async (
    utterance: number,
  ): Promise<{ text: string | null; ms: number } | undefined> => {
    const p = secondOpinions.get(utterance);
    secondOpinions.delete(utterance);
    return p ? await p : undefined;
  };

  // Corrected utterances, oldest first: the rewrite's read-only context.
  const contextUtterances = Math.max(
    0,
    Math.floor(options.correction?.contextUtterances ?? 0),
  );
  const recentCorrected: Array<{ utterance: number; text: string }> = [];
  const previousFor = (utterance: number): string[] | undefined =>
    contextUtterances > 0
      ? recentCorrected
          .filter((r) => r.utterance < utterance)
          .slice(-contextUtterances)
          .map((r) => r.text)
      : undefined;

  // Output languages: every utterance rendered once into the languages in
  // effect when it settles, with earlier utterances as context.
  const outputContext = Math.max(
    0,
    Math.floor(options.output?.contextUtterances ?? 3),
  );
  const outputHistory: Array<{
    utterance: number;
    text: string;
    outputs: Record<string, string>;
  }> = [];
  const emitOutputs = async (
    utterance: number,
    source: string,
    corrected: string | undefined,
    language: string | undefined,
    basedOn: "final" | "corrected",
  ): Promise<void> => {
    const languages = outputLanguagesOf(options.output);
    if (languages.length === 0 || aborted || !source.trim()) {
      return;
    }
    const rendered = await renderOutputs(
      {
        source: [source],
        ...(corrected && corrected !== source
          ? { corrected: [corrected] }
          : {}),
        ...(language ? { language } : {}),
        languages,
        previous:
          outputContext > 0
            ? outputHistory
                .filter((h) => h.utterance < utterance)
                .slice(-outputContext)
                .map((h) => ({ text: h.text, outputs: h.outputs }))
            : [],
        ...(options.dictionary ? { dictionary: options.dictionary } : {}),
        ...(options.output ? { options: options.output } : {}),
      },
      deps,
    );
    if (aborted) {
      return;
    }
    const texts: Record<string, string> = {};
    for (const tag of languages) {
      const r = rendered[tag];
      if (!r) {
        continue;
      }
      if (r.text) {
        texts[tag] = r.text;
      }
      out.push({
        type: "output",
        utterance,
        language: tag,
        text: r.text,
        status: r.status,
        basedOn,
        ms: r.ms,
        ...(r.reason ? { reason: r.reason } : {}),
      });
    }
    outputHistory.push({
      utterance,
      text: corrected ?? source,
      outputs: texts,
    });
    if (outputHistory.length > 20) {
      outputHistory.shift();
    }
  };

  /** Correction of one final; pushes `correcting` partials and one `corrected`. */
  const correct = async (
    final: Extract<TranscribeStreamEvent, { type: "final" }>,
    preSteps: string[],
    alt: { text: string | null; ms: number } | undefined,
  ): Promise<void> => {
    const utterance = final.utterance;
    const started = endedAt.get(utterance) ?? Date.now();
    const transcribeMs = finalPassMs.get(utterance) ?? 0;
    finalPassMs.delete(utterance);
    endedAt.delete(utterance);
    const steps = [...preSteps];
    // The final's own alternative (both engines ran on an utterance whose
    // language they disagreed on) is the better second reading: it is the
    // engine that lost, whichever one led.
    const alternative =
      secondSetting === "auto" && final.alternative?.text.trim()
        ? final.alternative
        : undefined;
    const secondOpinion = alternative
      ? alternative.text
      : !final.fallbackUsed && alt?.text
        ? alt.text
        : undefined;
    if (alternative) {
      steps.push(`reconciled with ${alternative.engine}'s reading`);
    }
    if (alternative) {
      // The step above already says which reading was reconciled.
    } else if (secondSpec && !final.fallbackUsed && !useNative && !alt?.text) {
      steps.push("second opinion returned nothing");
    } else if (secondOpinion && secondProvider) {
      steps.push(`second opinion ${secondProvider}`);
    }
    // Nothing after the consumer has gone: no second opinion is reconciled
    // and no rewrite is paid for that nobody will read.
    if (aborted) {
      return;
    }
    try {
      const correctFn =
        options.correction?.perSentence === false
          ? correctTranscript
          : correctTranscriptSentences;
      const res = await correctFn(
        {
          text: final.text,
          ...(secondOpinion ? { secondOpinion } : {}),
          ...(options.dictionary ? { dictionary: options.dictionary } : {}),
          ...(options.correction ? { options: options.correction } : {}),
          ...(final.languageDetected !== undefined
            ? { languageDetected: final.languageDetected }
            : {}),
          ...(confidentLanguage(final)
            ? { language: confidentLanguage(final) }
            : {}),
          ...(previousFor(utterance)?.length
            ? { previous: previousFor(utterance) }
            : {}),
          onPartial: (text) => {
            if (text) {
              out.push({ type: "correcting", utterance, text });
            }
          },
        },
        deps,
      );
      out.push({
        type: "corrected",
        utterance,
        raw: final.text,
        text: res.text || final.text,
        decisions: res.decisions,
        steps: [...steps, ...res.steps],
        timings: {
          transcribeMs,
          ...(alt ? { secondOpinionMs: alt.ms } : {}),
          ...res.timings,
          totalMs: Date.now() - started,
        },
      });
      const settled = res.text || final.text;
      recentCorrected.push({ utterance, text: settled });
      if (recentCorrected.length > 20) {
        recentCorrected.shift();
      }
      await emitOutputs(
        utterance,
        final.text,
        settled,
        confidentLanguage(final),
        "corrected",
      );
    } catch (err) {
      // correctTranscript keeps its own timeouts and fails open; this is the
      // last guard so a bug there costs the correction, never the transcript.
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(
        `[transcribeStream] correction failed for utterance ${utterance}: ${message}`,
      );
      out.push({
        type: "corrected",
        utterance,
        raw: final.text,
        text: final.text,
        decisions: [],
        steps: [...steps, `correction failed: ${message} · raw text kept`],
        timings: { transcribeMs, totalMs: Date.now() - started },
      });
      await emitOutputs(
        utterance,
        final.text,
        undefined,
        confidentLanguage(final),
        "final",
      );
    }
  };

  const pending = new Set<Promise<void>>();
  const track = (p: Promise<void>): void => {
    pending.add(p);
    void p.finally(() => pending.delete(p));
  };

  let aborted = false;
  let utterances = 0;
  let failure: unknown;

  // An explicit iterator so the consumer's exit can close the source (the
  // native handler stream or the chunked adapter) instead of leaving it
  // running on a live audio feed that never ends by itself.
  const iterator = source[Symbol.asyncIterator]();
  const producer = (async () => {
    try {
      for (;;) {
        const next = await iterator.next();
        if (next.done || aborted) {
          break;
        }
        const raw: TranscribeStreamEvent = next.value;
        if (raw.type === "silence") {
          routedUtterances.delete(raw.utterance);
        }
        // A final reused from a routed interim names the engine that wrote it.
        const routedTo =
          raw.type === "final"
            ? routedUtterances.get(raw.utterance)
            : undefined;
        const ev: TranscribeStreamEvent =
          raw.type === "final" && routedTo && !raw.fallbackUsed
            ? { ...raw, engine: routedTo.target }
            : raw;
        if (ev.type === "final") {
          utterances++;
          routedUtterances.delete(ev.utterance);
          out.push(ev);
          const preSteps = [
            ...(ev.fallbackUsed
              ? [`${provider} unsure → ${ev.engine} took over`]
              : []),
            ...(guardNotes.get(ev.utterance) ?? []),
          ];
          guardNotes.delete(ev.utterance);
          if (correcting && !aborted) {
            track(
              takeSecondOpinion(ev.utterance).then((alt) =>
                aborted ? undefined : correct(ev, preSteps, alt),
              ),
            );
          } else {
            secondOpinions.delete(ev.utterance);
            if (!aborted) {
              track(
                emitOutputs(
                  ev.utterance,
                  ev.text,
                  undefined,
                  confidentLanguage(ev),
                  "final",
                ),
              );
            }
          }
        } else if (ev.type === "silence" && secondOpinions.has(ev.utterance)) {
          // The primary heard nothing; the second engine may have. Its text
          // becomes the final rather than letting the utterance go silent.
          track(
            takeSecondOpinion(ev.utterance).then(async (alt) => {
              if (!alt?.text || !secondProvider) {
                out.push(ev);
                return;
              }
              utterances++;
              const final: Extract<TranscribeStreamEvent, { type: "final" }> = {
                type: "final",
                utterance: ev.utterance,
                text: alt.text,
                segment: {
                  index: ev.utterance,
                  text: alt.text,
                  isFinal: true,
                },
                engine: secondProvider,
                seconds: ev.seconds,
              };
              out.push(final);
              await correct(
                final,
                [`${secondProvider} text used (${provider} returned nothing)`],
                undefined,
              );
            }),
          );
        } else {
          out.push(ev);
        }
      }
    } catch (err) {
      failure = err;
      out.push({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
        recoverable: false,
      });
    } finally {
      while (pending.size > 0) {
        await Promise.allSettled([...pending]);
      }
      out.close();
    }
  })();

  try {
    yield* out.drain();
    await producer;
  } finally {
    aborted = true;
    // Close the source; a generator parked on an `await` (waiting for the
    // next frame) only honours this once that await settles, so it is not
    // awaited here — the flag above already stops every later step.
    void iterator.return?.().catch(() => undefined);
    const ended = SpanSerializer.endSpan(
      span,
      failure === undefined ? SpanStatus.OK : SpanStatus.ERROR,
      failure === undefined
        ? undefined
        : failure instanceof Error
          ? failure.message
          : String(failure),
    );
    ended.attributes = { ...ended.attributes, "stt.utterances": utterances };
    getMetricsAggregator().recordSpan(ended);
  }
}
