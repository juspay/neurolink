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
  SpanSerializer,
  SpanStatus,
  SpanType,
  getMetricsAggregator,
} from "../observability/index.js";
import { createWavFile } from "./audio-utils.js";
import { correctTranscript, isCorrectionEnabled } from "./correction/index.js";
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
  STTChunkedRun,
  STTHandler,
  STTOptions,
  STTResult,
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
  const secondSpec = correcting ? options.correction?.secondOpinion : undefined;
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

  // Per-utterance bookkeeping shared by the adapter hooks and the correction tasks.
  const finalPassMs = new Map<number, number>();
  const endedAt = new Map<number, number>();
  const secondOpinions = new Map<
    number,
    Promise<{ text: string | null; ms: number }>
  >();

  const run: STTChunkedRun = async (pcm, pass) => {
    const wav = encodeWav16k(pcm);
    const t0 = Date.now();
    const res: STTResult =
      pass.engine === "fallback" && fallbackProvider
        ? await deps.transcribe(wav, fallbackProvider, fallbackOpts)
        : await deps.transcribe(wav, provider, primaryOpts);
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
            runSecondOpinion(deps, pcm, secondProvider, secondOpts, utterance),
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
    const secondOpinion =
      !final.fallbackUsed && alt?.text ? alt.text : undefined;
    if (secondSpec && !final.fallbackUsed && !useNative && !alt?.text) {
      steps.push("second opinion returned nothing");
    }
    // Nothing after the consumer has gone: no second opinion is reconciled
    // and no rewrite is paid for that nobody will read.
    if (aborted) {
      return;
    }
    try {
      const res = await correctTranscript(
        {
          text: final.text,
          ...(secondOpinion ? { secondOpinion } : {}),
          ...(options.dictionary ? { dictionary: options.dictionary } : {}),
          ...(options.correction ? { options: options.correction } : {}),
          ...(final.languageDetected !== undefined
            ? { languageDetected: final.languageDetected }
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
        const { value: ev, done } = await iterator.next();
        if (done || aborted) {
          break;
        }
        if (ev.type === "final") {
          utterances++;
          out.push(ev);
          const preSteps = ev.fallbackUsed
            ? [`${provider} unsure → ${ev.engine} took over`]
            : [];
          if (correcting && !aborted) {
            track(
              takeSecondOpinion(ev.utterance).then((alt) =>
                aborted ? undefined : correct(ev, preSteps, alt),
              ),
            );
          } else {
            secondOpinions.delete(ev.utterance);
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
