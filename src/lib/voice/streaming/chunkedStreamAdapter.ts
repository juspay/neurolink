/**
 * Client-side streaming for batch STT engines.
 *
 * PCM16LE frames → energy-gated utterances (see `endpointer.ts`) → the
 * current utterance is re-transcribed every `intervalMs` → LocalAgreement
 * commits the prefix two passes agree on → a final pass when the utterance
 * ends. The adapter knows nothing about providers or correction: it calls
 * `run` with 16 kHz audio and a role ("primary" / "fallback"), and the
 * orchestration maps roles to engines.
 *
 * Nothing is ever dropped:
 * - a final pass that returns nothing, or fewer than half the words already
 *   shown, keeps the shown text (the final covers the same audio as the
 *   interims plus the tail, so it can only be richer — anything else is an
 *   engine glitch);
 * - an utterance that no engine read yields a `silence` event with its audio
 *   length instead of disappearing;
 * - an utterance that already produced words is always finalized, however
 *   little speech the gate counted in it.
 *
 * Passes are serialized: one engine call in flight at a time. Interim passes
 * are skipped while the engine is busy, final passes queue in utterance
 * order, so finals are emitted in order.
 *
 * @module voice/streaming/chunkedStreamAdapter
 */
import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import type {
  STTChunkedRun,
  STTChunkedStreamOptions,
  STTEndpointerEvent,
  STTEndpointerUtterance,
  STTLanguageScore,
  STTLocalAgreementState,
  STTResult,
  STTStreamEngineRole,
  TranscribeStreamEvent,
  WordTiming,
} from "../../types/index.js";
import {
  Endpointer,
  ENGINE_SAMPLE_RATE,
  resolveEndpointerConfig,
} from "./endpointer.js";
import {
  createLocalAgreement,
  resetLocalAgreement,
  splitWords,
  updateLocalAgreement,
} from "./localAgreement.js";

/** Default cadence of interim passes. */
const DEFAULT_INTERVAL_MS = 900;
/** An interim pass needs at least this much audio the previous pass did not see. */
const MIN_NEW_AUDIO_INTERIM_S = 0.8;
/** Below this much new audio since the last pass, the final reuses the interim text. */
const MIN_NEW_AUDIO_FINAL_S = 0.4;
/**
 * Language takeover thresholds. A language score is unreliable under ~2.5 s
 * of audio even for clean speech (measured −0.32 at 1 s, −0.05 at 2 s on the
 * same Tamil clip), and code-mixed speech hovers around the threshold as
 * English words come and go, so one unsure pass means nothing: it takes two
 * in a row, after 3 s of audio and 1.5 s of speech, and a single confident
 * pass on the utterance rules the takeover out.
 */
const TAKEOVER_MIN_AUDIO_S = 3;
const TAKEOVER_MIN_SPEECH_MS = 1500;
const TAKEOVER_UNSURE_PASSES = 2;
const DEFAULT_FALLBACK_WHEN: Array<"unsure" | "empty" | "error"> = [
  "unsure",
  "empty",
];

/** Minimal unbounded async queue: the producer never waits for the consumer. */
export class StreamEventQueue<T> {
  private readonly items: T[] = [];
  private waiter: (() => void) | null = null;
  private closed = false;

  push(item: T): void {
    if (this.closed) {
      return;
    }
    this.items.push(item);
    this.wake();
  }

  close(): void {
    this.closed = true;
    this.wake();
  }

  async *drain(): AsyncGenerator<T> {
    while (true) {
      const next = this.items.shift();
      if (next !== undefined) {
        yield next;
        continue;
      }
      if (this.closed) {
        return;
      }
      await new Promise<void>((resolve) => {
        this.waiter = resolve;
      });
    }
  }

  private wake(): void {
    const w = this.waiter;
    this.waiter = null;
    w?.();
  }
}

/** Per-utterance pass state. */
class UtteranceRun {
  readonly u: STTEndpointerUtterance;
  readonly la: STTLocalAgreementState = createLocalAgreement();
  engine: STTStreamEngineRole = "primary";
  /** Input samples the last pass covered. */
  sentLen = 0;
  /** Audio clock (s) when the last pass started; -Infinity before the first. */
  lastReqAt = Number.NEGATIVE_INFINITY;
  passes = 0;
  final = false;
  /** Full text of the latest interim pass (committed + tail). */
  shown = "";
  switched = false;
  confidentOnce = false;
  unsureN = 0;
  languageDetected: boolean | undefined;
  language: string | undefined;
  lastLanguageKey = "";

  constructor(u: STTEndpointerUtterance) {
    this.u = u;
  }
}

/** Lifts what an engine said about the language from an `STTResult`. */
function liftLanguage(
  res: STTResult | undefined,
): { language: string; detected: boolean; scores?: STTLanguageScore[] } | null {
  if (!res) {
    return null;
  }
  const meta: Record<string, unknown> = res.metadata ?? {};
  const flag =
    typeof meta.languageDetected === "boolean"
      ? meta.languageDetected
      : undefined;
  const rawScores = Array.isArray(meta.languageScores)
    ? meta.languageScores
    : [];
  const scores: STTLanguageScore[] = [];
  for (const s of rawScores) {
    if (
      s &&
      typeof s === "object" &&
      typeof (s as { language?: unknown }).language === "string" &&
      typeof (s as { score?: unknown }).score === "number"
    ) {
      scores.push(s as STTLanguageScore);
    }
  }
  const language =
    (typeof res.language === "string" && res.language) ||
    scores[0]?.language ||
    undefined;
  if (!language && flag === undefined) {
    return null;
  }
  return {
    language: language ?? "und",
    detected: flag ?? true,
    ...(scores.length ? { scores } : {}),
  };
}

/** Shifts utterance-relative word times onto the stream clock. */
function shiftWords(
  words: WordTiming[] | undefined,
  offset: number,
): WordTiming[] | undefined {
  if (!words?.length) {
    return undefined;
  }
  const add = (v: number | undefined) =>
    typeof v === "number" ? v + offset : undefined;
  return words.map((w) => ({
    ...w,
    startTime: add(w.startTime ?? w.start),
    endTime: add(w.endTime ?? w.end),
    start: add(w.start ?? w.startTime),
    end: add(w.end ?? w.endTime),
  }));
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

class ChunkedStreamSession {
  private readonly endpointer: Endpointer;
  private readonly inputRate: number;
  private readonly intervalS: number;
  private readonly queue = new StreamEventQueue<TranscribeStreamEvent>();
  private readonly runs = new Map<number, UtteranceRun>();
  private readonly fallbackWhen: Array<"unsure" | "empty" | "error">;
  private engineTail: Promise<void> = Promise.resolve();
  private busy = 0;
  private aborted = false;

  constructor(
    private readonly run: STTChunkedRun,
    private readonly options: STTChunkedStreamOptions,
  ) {
    this.inputRate =
      options.sampleRate && options.sampleRate > 0
        ? options.sampleRate
        : ENGINE_SAMPLE_RATE;
    this.endpointer = new Endpointer(
      resolveEndpointerConfig(options, this.inputRate),
    );
    this.intervalS =
      (options.intervalMs && options.intervalMs > 0
        ? options.intervalMs
        : DEFAULT_INTERVAL_MS) / 1000;
    this.fallbackWhen = options.fallback?.when?.length
      ? options.fallback.when
      : DEFAULT_FALLBACK_WHEN;
  }

  async *events(
    frames: AsyncIterable<Buffer | Uint8Array>,
  ): AsyncGenerator<TranscribeStreamEvent> {
    const iterator = frames[Symbol.asyncIterator]();
    void this.pump(iterator);
    try {
      yield* this.queue.drain();
    } finally {
      // The consumer stopped early: stop pulling frames and let pending passes finish unseen.
      if (!this.aborted) {
        this.aborted = true;
        void Promise.resolve(iterator.return?.()).catch(() => undefined);
      }
    }
  }

  private label(role: STTStreamEngineRole): string {
    return role === "fallback"
      ? (this.options.fallback?.label ?? "fallback")
      : (this.options.engineLabel ?? "primary");
  }

  /** Reads frames until the source ends, then finalizes and closes the queue. */
  private async pump(
    iterator: AsyncIterator<Buffer | Uint8Array>,
  ): Promise<void> {
    let carry: number | null = null;
    let sourceError: unknown;
    try {
      while (!this.aborted) {
        const next = await iterator.next();
        if (next.done || this.aborted) {
          break;
        }
        const bytes = next.value;
        if (!bytes || bytes.length === 0) {
          continue;
        }
        // PCM16LE; a frame may split a sample, so an odd byte is carried over.
        const total: number = bytes.length + (carry === null ? 0 : 1);
        const n = Math.floor(total / 2);
        const samples = new Float32Array(n);
        let idx = 0;
        let s = 0;
        const byteAt = (k: number): number =>
          carry === null ? bytes[k] : k === 0 ? carry : bytes[k - 1];
        for (; s < n; s++, idx += 2) {
          const lo = byteAt(idx);
          const hi = byteAt(idx + 1);
          const v = (hi << 8) | lo;
          samples[s] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000;
        }
        carry = total % 2 === 1 ? byteAt(total - 1) : null;
        this.handle(this.endpointer.push(samples));
        this.maybeInterim();
      }
    } catch (err) {
      sourceError = err;
    }
    // Whatever was being said when the source ended (or failed) is still finalized.
    this.handle(this.endpointer.flush());
    try {
      // Every final is chained on the engine queue; wait until the chain is empty.
      let tail: Promise<void>;
      do {
        tail = this.engineTail;
        await tail;
      } while (tail !== this.engineTail);
    } catch {
      // Individual passes report their own errors; nothing to add here.
    }
    if (sourceError !== undefined && !this.aborted) {
      this.queue.push({
        type: "error",
        message: STTError.streamError(errorMessage(sourceError)).message,
        recoverable: false,
      });
    }
    this.queue.close();
  }

  private handle(events: STTEndpointerEvent[]): void {
    for (const ev of events) {
      if (ev.type === "start") {
        this.runs.set(ev.utterance.id, new UtteranceRun(ev.utterance));
      } else if (ev.type === "drop") {
        this.runs.delete(ev.utterance.id);
        if (logger.shouldLog("debug")) {
          logger.debug(
            `[transcribeStream] utterance ${ev.utterance.id} dropped (${ev.utterance.speechMs} ms of speech, nothing heard)`,
          );
        }
      } else {
        const r = this.runs.get(ev.utterance.id);
        if (r) {
          this.finalize(r, ev.reason);
        }
      }
    }
  }

  /** Runs `fn` after every queued engine call; at most one is in flight. */
  private withEngine(fn: () => Promise<void>): Promise<void> {
    this.busy++;
    const next = this.engineTail.then(fn).finally(() => {
      this.busy--;
    });
    this.engineTail = next.catch(() => undefined);
    return next;
  }

  private maybeInterim(): void {
    const u = this.endpointer.current;
    if (!u || this.busy > 0 || this.aborted) {
      return;
    }
    const r = this.runs.get(u.id);
    if (!r || r.final) {
      return;
    }
    // The cadence runs on the audio clock: a live source advances it in real
    // time, and a file replayed faster than real time gets the same passes
    // per second of audio, limited only by the one-in-flight rule.
    if (this.endpointer.audioSeconds - r.lastReqAt < this.intervalS) {
      return;
    }
    if (u.length - r.sentLen < MIN_NEW_AUDIO_INTERIM_S * this.inputRate) {
      return;
    }
    void this.withEngine(async () => {
      if (!r.final) {
        await this.runPass(r, false);
      }
    });
  }

  private emitLanguage(
    r: UtteranceRun,
    lang: ReturnType<typeof liftLanguage>,
  ): void {
    if (!lang) {
      return;
    }
    r.language = lang.language;
    r.languageDetected = lang.detected;
    if (lang.detected) {
      r.confidentOnce = true;
    }
    const key = `${lang.language}|${lang.detected}`;
    if (key === r.lastLanguageKey) {
      return;
    }
    r.lastLanguageKey = key;
    this.queue.push({
      type: "language",
      utterance: r.u.id,
      language: lang.language,
      detected: lang.detected,
      ...(lang.scores ? { scores: lang.scores } : {}),
    });
  }

  private async callEngine(
    r: UtteranceRun,
    pcm: Float32Array,
    final: boolean,
  ): Promise<{ res?: STTResult; err?: unknown }> {
    try {
      const res = await this.run(pcm, {
        utterance: r.u.id,
        final,
        engine: r.engine,
        seconds: r.u.length / this.inputRate,
      });
      return { res };
    } catch (err) {
      return { err };
    }
  }

  /**
   * One pass over the whole utterance so far. Returns the text to show, the
   * result it came from (when the engine answered), and whether the pass failed.
   */
  private async runPass(
    r: UtteranceRun,
    isFinal: boolean,
    pcmIn?: Float32Array,
  ): Promise<{ text: string; res?: STTResult }> {
    r.sentLen = r.u.length;
    r.lastReqAt = this.endpointer.audioSeconds;
    r.passes++;
    const t0 = Date.now();
    const pcm = pcmIn ?? this.endpointer.pcm16k(r.u);
    const seconds = r.u.length / this.inputRate;

    let { res, err } = await this.callEngine(r, pcm, isFinal);
    let text = res?.text?.trim() ?? "";
    let lang = liftLanguage(res);
    this.emitLanguage(r, lang);

    if (this.options.fallback && r.engine === "primary" && !r.switched) {
      const when = this.fallbackWhen;
      const unsure =
        (when.includes("unsure") && lang?.detected === false) ||
        (when.includes("empty") && !err && !text) ||
        (when.includes("error") && err !== undefined);
      r.unsureN = unsure ? r.unsureN + 1 : 0;
      if (
        !r.confidentOnce &&
        seconds >= TAKEOVER_MIN_AUDIO_S &&
        r.u.speechMs >= TAKEOVER_MIN_SPEECH_MS &&
        r.unsureN >= TAKEOVER_UNSURE_PASSES
      ) {
        // Hand the rest of this utterance to the fallback right now, so the
        // caption never goes blank; the primary's words are noise from here.
        r.engine = "fallback";
        r.switched = true;
        resetLocalAgreement(r.la);
        if (logger.shouldLog("debug")) {
          logger.debug(
            `[transcribeStream] utterance ${r.u.id}: primary unsure on ${r.unsureN} passes, fallback takes over`,
          );
        }
        const second = await this.callEngine(r, pcm, isFinal);
        if (second.res) {
          res = second.res;
          err = undefined;
          text = second.res.text?.trim() ?? "";
          lang = liftLanguage(second.res);
          this.emitLanguage(r, lang);
        } else if (logger.shouldLog("debug")) {
          logger.debug(
            `[transcribeStream] utterance ${r.u.id}: fallback pass failed: ${errorMessage(second.err)}`,
          );
        }
      }
    }

    if (err !== undefined) {
      this.queue.push({
        type: "error",
        utterance: r.u.id,
        message: errorMessage(err),
        recoverable: true,
      });
      // The live text stands in for a failed pass.
      return { text: r.shown };
    }
    if (text) {
      r.u.heard = true;
    }
    if (!isFinal) {
      const split = updateLocalAgreement(r.la, text);
      r.shown = split.words.join(" ");
      if (r.shown) {
        this.queue.push({
          type: "interim",
          utterance: r.u.id,
          text: r.shown,
          committed: split.committed,
          tail: split.tail,
          seconds,
          latencyMs: Date.now() - t0,
          engine: this.label(r.engine),
        });
      }
    }
    if (logger.shouldLog("debug")) {
      logger.debug(
        `[transcribeStream] utterance ${r.u.id} ${isFinal ? "final" : "interim"} pass: ${seconds.toFixed(1)} s, ${text.length} chars, ${Date.now() - t0} ms`,
      );
    }
    return { text, res };
  }

  private finalize(r: UtteranceRun, reason: string): void {
    r.final = true;
    const pcm = this.endpointer.pcm16k(r.u);
    try {
      this.options.onUtteranceEnd?.(pcm, r.u.id, r.engine);
    } catch (err) {
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribeStream] onUtteranceEnd threw: ${errorMessage(err)}`,
        );
      }
    }
    void this.withEngine(async () => {
      if (this.aborted) {
        return;
      }
      const seconds = r.u.length / this.inputRate;
      const needFinal =
        r.u.length - r.sentLen >= MIN_NEW_AUDIO_FINAL_S * this.inputRate ||
        r.passes === 0;
      let text = r.shown;
      let res: STTResult | undefined;
      let keptInterim = false;
      if (needFinal) {
        const out = await this.runPass(r, true, pcm);
        res = out.res;
        text = out.text;
        // Never shrink: an empty final, or one with fewer than half the words
        // already shown, is an engine glitch on audio that can only be richer.
        const shown = r.shown;
        const nShown = splitWords(shown).length;
        const nFinal = splitWords(text).length;
        if (!text || (nShown >= 2 && nFinal < nShown * 0.5)) {
          keptInterim = Boolean(shown) && text !== shown;
          text = shown;
        }
      }
      this.runs.delete(r.u.id);
      if (!text) {
        this.queue.push({ type: "silence", utterance: r.u.id, seconds });
        return;
      }
      const start = r.u.startSeconds;
      const end = start + seconds;
      const words =
        res && !keptInterim ? shiftWords(res.words, start) : undefined;
      this.queue.push({
        type: "final",
        utterance: r.u.id,
        text,
        segment: {
          index: r.u.id,
          text,
          isFinal: true,
          startTime: start,
          endTime: end,
          start,
          end,
          ...(res && !keptInterim && typeof res.confidence === "number"
            ? { confidence: res.confidence }
            : {}),
          ...(words ? { words } : {}),
          ...(r.language ? { language: r.language } : {}),
        },
        ...(words ? { words } : {}),
        ...(r.language ? { language: r.language } : {}),
        ...(r.languageDetected !== undefined
          ? { languageDetected: r.languageDetected }
          : {}),
        engine: this.label(r.engine),
        ...(r.switched ? { fallbackUsed: true } : {}),
        seconds,
      });
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribeStream] utterance ${r.u.id} final (${reason}${keptInterim ? ", kept live text" : ""}${needFinal ? "" : ", reused interim"})`,
        );
      }
    });
  }
}

/**
 * Streams a batch STT engine: `frames` are PCM16LE mono at
 * `options.sampleRate` (default 16000); `run` transcribes one utterance at
 * 16 kHz. Yields `interim`, `language`, `final`, `silence` and `error`
 * events; utterance numbers are in order but may skip (a dropped cough
 * consumes one). Ends after the source ends and every final is emitted.
 */
export function chunkedTranscribeStream(
  frames: AsyncIterable<Buffer | Uint8Array>,
  run: STTChunkedRun,
  options: STTChunkedStreamOptions = {},
): AsyncIterable<TranscribeStreamEvent> {
  return new ChunkedStreamSession(run, options).events(frames);
}
