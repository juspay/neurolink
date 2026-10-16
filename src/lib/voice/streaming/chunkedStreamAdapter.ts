/**
 * Client-side streaming for batch STT engines.
 *
 * PCM16LE frames → utterances found by a speech detector (Silero VAD by
 * default) or the energy gate (see `endpointer.ts`) → the
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
  STTSpeechDetector,
  STTStreamEngineRole,
  TranscribeStreamEvent,
  WordTiming,
} from "../../types/index.js";
import { SpeechFrameScorer } from "../vad/frameScorer.js";
import {
  loadSileroDetector,
  resolveVadEngine,
  resolveVadThresholds,
} from "../vad/sileroVad.js";
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
/**
 * With a speech detector, audio after the last speech block beyond this
 * margin is not sent to the engine: the closing pause (750 ms of it on every
 * utterance that ends in silence) is where a batch model invents endings.
 */
const TRIM_TAIL_MS = 300;
/**
 * Digital silence appended to every chunk an engine gets, so it always ends
 * in a clean pause: a chunk cut off right after speech sent Qwen3-ASR into a
 * decoding loop until its timeout (180 s on a file, the utterance lost);
 * 200 ms of zeros was enough to stop it, this is the margin.
 */
export const ENGINE_TAIL_PAD_MS = 400;
/**
 * A short utterance whose text would mean more words per second of detected
 * speech than anyone can say (fast speech is 5–6) is an engine filling a
 * pause, not a sentence. Only judged while the detector counted under 1.5 s
 * of speech, where the rate is meaningful and the loss, if ever wrong, is a
 * word or two.
 */
const MAX_WORDS_PER_SPEECH_SECOND = 12;
const WORD_RATE_GUARD_MAX_SPEECH_MS = 1500;
/** Logged once per process: streams fall back quietly after that. */
let detectorUnavailableLogged = false;
let autoDetectorRetryAt = 0;
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
/**
 * Probe thresholds. The first pass of an utterance runs the primary and the
 * fallback in parallel once there is this much audio and speech, and the
 * utterance's engine is chosen from that pass: the fallback leads when the
 * primary is unsure or empty and the fallback produced Latin-script words.
 * Under these amounts even a parallel pass tells nothing (a language score
 * is noise below ~1 s), so the probe waits for the next pass instead.
 */
const PROBE_MIN_AUDIO_S = 0.8;
const PROBE_MIN_SPEECH_MS = 500;
/**
 * Two verdicts on less audio than this only pick who leads for now: the
 * Indic engine is unsure of nearly everything under ~2.5 s (a Hinglish
 * sentence it later scores −0.10 reads as unsure at 1 s), so an early
 * "English heard, primary unsure" must not lock or pin the utterance.
 */
const AGREE_MIN_AUDIO_S = 2.5;
/**
 * A primary that is "sure" while the fallback heard English shows its own
 * text only on a strong score. Measured on the IndicConformer wrapper: Indian
 * languages −0.01…−0.10, Hinglish −0.09…−0.14, Indian-accented English over
 * the −0.18 cutoff on a short stream pass at −0.156 (and −0.35…−0.58 once
 * the utterance is whole). Between the two, the fallback's text is shown and
 * the final decides on the whole utterance.
 */
const MIXED_PRIMARY_MIN_SCORE = -0.12;
/**
 * "Unsure" is only evidence against an Indian language well below the
 * cutoff: Telugu read −0.181 on a 2.3 s stream pass (the cutoff is −0.18)
 * while English sits at −0.35 and lower. Between the two, the fallback's
 * "English" (which Qwen3-ASR also says of Telugu, a language it does not
 * know) neither settles nor pins the utterance.
 */
const CLEAR_UNSURE_MAX_SCORE = -0.25;
/**
 * Probes shorter than this do not count toward the utterance's score: a
 * second of audio reads −0.3 for Hinglish and −0.9 for English alike.
 * Longer ones are averaged, weighted by length, so one pass that dips (−0.153
 * among Hinglish passes at −0.06…−0.11) cannot flip the utterance.
 */
const SCORE_MIN_AUDIO_S = 1.5;
/** Indian languages: what an Indic primary engine is for; any other language belongs to the fallback. */
const INDIC_LANGUAGES = new Set([
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
]);
/** The ISO 639 part of an engine's language report, lower case; `undefined` for none or "und". */
function langCode(value: string | undefined): string | undefined {
  const code = value?.trim().toLowerCase().split(/[-_]/u)[0];
  return code && code !== "und" && code !== "auto" ? code : undefined;
}
/** Share of the text's letters in an Indic script. */
function indicShare(text: string): number {
  return 1 - latinShare(text);
}
/** Letters outside the Latin blocks (Indic, Arabic, Thai, Burmese, CJK, Hangul). */
const NON_LATIN_LETTER =
  /[\u0900-\u0DFF\u0600-\u06FF\u0E00-\u0E7F\u1000-\u109F\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/gu;
const LATIN_LETTER = /[A-Za-z\u00C0-\u024F]/gu;

/** Share of the text's letters that are Latin; 1 for text with no letters at all. */
function latinShare(text: string): number {
  const latin = text.match(LATIN_LETTER)?.length ?? 0;
  const other = text.match(NON_LATIN_LETTER)?.length ?? 0;
  return latin + other === 0 ? 1 : latin / (latin + other);
}
/** Probe passes before an utterance's engine locks when the caller sets none. */
const DEFAULT_LOCK_AFTER_PASSES = 2;
/** How long auto mode uses the energy gate after the speech detector failed to load. */
const AUTO_DETECTOR_RETRY_MS = 10 * 60_000;
/** Below this share of speech blocks an utterance is mostly pause. */
const NEAR_SILENT_SPEECH_SHARE = 0.25;
/** An output this short on a mostly-pause utterance is a filler, not speech. */
const NEAR_SILENT_MAX_WORDS = 3;
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
  /** Passes on which the primary was confident; two veto the takeover for good, one only delays it. */
  confidentPasses = 0;
  unsureN = 0;
  languageDetected: boolean | undefined;
  language: string | undefined;
  lastLanguageKey = "";
  /** Probe passes run so far; the engine locks after `routing.lockAfterPasses`. */
  probePasses = 0;
  /** Probe passes on which the primary was confident / unsure, for the lock rule. */
  confidentProbes = 0;
  unsureProbes = 0;
  locked = false;
  /** The engines disagreed on the language: the final runs both on the whole utterance. */
  lookAgain = false;
  /** Consecutive probes (with enough audio) on which both verdicts agreed. */
  agreedProbes = 0;
  /** The fallback transcribes in this language from now on (the utterance was settled as it). */
  fallbackPin: string | undefined;
  /** The reading the probe did not show, from the latest probe: kept for the final when the engines disagreed. */
  alternative: { engine: STTStreamEngineRole; text: string } | undefined;
  /** The primary's language score on each probe of at least `SCORE_MIN_AUDIO_S`, with its audio length. */
  readonly primaryScores: Array<{ score: number; seconds: number }> = [];

  /** The primary's score over the utterance so far, weighted by audio; `undefined` before a long enough probe. */
  get primaryScore(): number | undefined {
    let sum = 0;
    let weight = 0;
    for (const { score, seconds } of this.primaryScores) {
      sum += score * seconds;
      weight += seconds;
    }
    return weight > 0 ? sum / weight : undefined;
  }

  constructor(u: STTEndpointerUtterance) {
    this.u = u;
  }
}

/** Lifts what an engine said about the language from an `STTResult`. */
function liftLanguage(res: STTResult | undefined): {
  language: string;
  detected: boolean;
  /** The engine itself reported `languageDetected`; false when `detected` is only assumed. */
  flagged: boolean;
  scores?: STTLanguageScore[];
} | null {
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
    flagged: flag !== undefined,
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
  private readonly probe: boolean;
  /** Set once the primary has failed and the fallback took over, so the warning is logged once per stream. */
  private primaryFailureWarned = false;
  private readonly lockAfterPasses: number;
  private readonly carryPrior: boolean;
  /** The last language an engine was confident about, carried into later utterances. */
  private sessionPrior: string | undefined;
  /** Latin share of the last final with more than three words; the script the session speaks. */
  private sessionLatinShare: number | undefined;
  private engineTail: Promise<void> = Promise.resolve();
  private busy = 0;
  private inFlight = 0;
  private readonly slotWaiters: Array<() => void> = [];
  /** Passes queued or running, settled ones removed; the end-of-input wait drains it. */
  private readonly pendingPasses = new Set<Promise<void>>();
  private readonly concurrency: number;
  private readonly finalRetries: number;
  private aborted = false;
  /** Scores the stream for the endpointer when a speech detector is in use. */
  private scorer: SpeechFrameScorer | null = null;
  /** What found the utterances, as reported on events. */
  private vadName = "energy";

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
    this.probe = !!options.fallback && options.routing?.probe !== false;
    this.lockAfterPasses = Math.max(
      1,
      Math.floor(options.routing?.lockAfterPasses ?? DEFAULT_LOCK_AFTER_PASSES),
    );
    this.carryPrior = options.routing?.prior !== "none";
    this.concurrency = Math.max(1, Math.floor(options.concurrency ?? 1));
    this.finalRetries = Math.max(0, Math.floor(options.finalRetries ?? 0));
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

  /**
   * A mostly-pause utterance whose output is a word or two in a script the
   * session has not spoken (a lone "不。" or "हाँ" on an English meeting):
   * discarded as noise. Text in the session's own script is always kept.
   */
  private nearSilentNoise(
    r: UtteranceRun,
    text: string,
    seconds: number,
  ): boolean {
    if (
      seconds <= 0 ||
      r.u.speechMs / (seconds * 1000) >= NEAR_SILENT_SPEECH_SHARE
    ) {
      return false;
    }
    if (text.split(/\s+/u).filter(Boolean).length > NEAR_SILENT_MAX_WORDS) {
      return false;
    }
    const share = latinShare(text);
    const sessionLatin = this.sessionLatinShare;
    // Unknown session script: only non-Latin fillers are suspect.
    if (sessionLatin === undefined) {
      return share < 0.5;
    }
    return Math.abs(share - sessionLatin) >= 0.5;
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
    const fatal = await this.initDetector();
    if (fatal !== undefined) {
      this.queue.push({ type: "error", message: fatal, recoverable: false });
      this.queue.close();
      void Promise.resolve(iterator.return?.()).catch(() => undefined);
      return;
    }
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
        if (this.scorer) {
          await this.scoreFrames(samples);
        }
        this.handle(this.endpointer.push(samples));
        this.maybeInterim();
      }
    } catch (err) {
      sourceError = err;
    }
    // Whatever was being said when the source ended (or failed) is still finalized.
    this.handle(this.endpointer.flush());
    try {
      // Every final is on the engine queue; wait until nothing is queued or
      // in flight. With several slots the passes are not a chain, so the
      // set of pending passes is what is waited on, not the last one started.
      while (this.pendingPasses.size > 0) {
        await Promise.allSettled([...this.pendingPasses]);
      }
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

  /**
   * Chooses the speech detector for this stream: the caller's own, or Silero
   * per `vad` / `NEUROLINK_STT_VAD`, or none (the energy gate). Returns the
   * message of a fatal problem — a detector asked for by name that cannot
   * load — or `undefined`.
   */
  private async initDetector(): Promise<string | undefined> {
    const injected = this.options.speechDetector;
    let detector: STTSpeechDetector | null = null;
    if (injected) {
      detector = injected;
    } else if (injected === undefined) {
      const engine = resolveVadEngine(this.options.vad);
      // In auto mode a failed load is not retried by every new stream (a
      // model download can take minutes to time out); it is tried again
      // after AUTO_DETECTOR_RETRY_MS.
      const skipAuto = engine !== "silero" && Date.now() < autoDetectorRetryAt;
      if (engine !== "energy" && !skipAuto) {
        try {
          detector = await loadSileroDetector(this.options.vad);
          autoDetectorRetryAt = 0;
        } catch (err) {
          if (engine === "silero") {
            return errorMessage(err);
          }
          autoDetectorRetryAt = Date.now() + AUTO_DETECTOR_RETRY_MS;
          if (!detectorUnavailableLogged) {
            detectorUnavailableLogged = true;
            logger.warn(
              `[transcribeStream] speech detector unavailable, streams use the energy gate: ${errorMessage(err)}`,
            );
          }
        }
      }
    }
    if (!detector) {
      return undefined;
    }
    const scorer = new SpeechFrameScorer(detector, this.inputRate);
    this.scorer = scorer;
    this.vadName = detector.name;
    this.endpointer.attachSpeech({
      ...resolveVadThresholds(this.options.vad),
      probabilityAt: (seconds) => scorer.probabilityAt(seconds),
    });
    return undefined;
  }

  /** Scores the frames these samples complete; a detector that breaks hands the stream to the energy gate. */
  private async scoreFrames(samples: Float32Array): Promise<void> {
    const scorer = this.scorer;
    if (!scorer) {
      return;
    }
    try {
      await scorer.push(samples);
    } catch (err) {
      logger.warn(
        `[transcribeStream] speech detector failed (${errorMessage(err)}); the energy gate takes over`,
      );
      this.scorer = null;
      this.vadName = "energy";
      this.endpointer.attachSpeech(null);
    }
  }

  /** How an utterance's audio is cut for the engine: the closing pause trimmed when a detector marks the speech, a silence pad always. */
  private engineCut(): { trimTailMs?: number; padMs: number } {
    return this.scorer
      ? { trimTailMs: TRIM_TAIL_MS, padMs: ENGINE_TAIL_PAD_MS }
      : { padMs: ENGINE_TAIL_PAD_MS };
  }

  /**
   * More words per second of detected speech than anyone can say, on a short
   * utterance: the engine filled a pause with a stock phrase.
   */
  private impossibleWordRate(r: UtteranceRun, text: string): boolean {
    if (!this.scorer || !r.u.speech) {
      return false;
    }
    const speechMs = r.u.speechMs;
    if (speechMs <= 0 || speechMs > WORD_RATE_GUARD_MAX_SPEECH_MS) {
      return false;
    }
    const n = text.split(/\s+/u).filter(Boolean).length;
    return n / (speechMs / 1000) > MAX_WORDS_PER_SPEECH_SECOND;
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

  /**
   * Runs `fn` once a slot is free. Live streaming has one slot, so passes
   * run in order and a caption never shows a stale pass; the file path sets
   * `concurrency` higher and finals of different utterances overlap.
   */
  private withEngine(fn: () => Promise<void>): Promise<void> {
    this.busy++;
    const slots = this.concurrency;
    const run = async (): Promise<void> => {
      while (this.inFlight >= slots) {
        await new Promise<void>((resolve) => this.slotWaiters.push(resolve));
      }
      this.inFlight++;
      try {
        await fn();
      } finally {
        this.inFlight--;
        this.busy--;
        this.slotWaiters.shift()?.();
      }
    };
    const next = slots > 1 ? run() : this.engineTail.then(run);
    this.engineTail = next.catch(() => undefined);
    const tracked = next.catch(() => undefined);
    this.pendingPasses.add(tracked);
    void tracked.finally(() => this.pendingPasses.delete(tracked));
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
    // per second of audio, limited only by the one-in-flight rule. An
    // infinite cadence means no interim passes at all (the file path).
    if (
      !Number.isFinite(this.intervalS) ||
      this.endpointer.audioSeconds - r.lastReqAt < this.intervalS
    ) {
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
    /** Whether this verdict may become the stream's language (only settled ones may, in the fused path). */
    carry = true,
  ): void {
    if (!lang) {
      return;
    }
    r.language = lang.language;
    r.languageDetected = lang.detected;
    if (lang.detected) {
      r.confidentOnce = true;
      r.confidentPasses++;
      if (carry && lang.language && lang.language !== "und") {
        this.sessionPrior = lang.language;
      }
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
    engine: STTStreamEngineRole = r.engine,
    pin: string | undefined = r.fallbackPin,
  ): Promise<{ res?: STTResult; err?: unknown }> {
    try {
      const res = await this.run(pcm, {
        utterance: r.u.id,
        final,
        engine,
        seconds: r.u.length / this.inputRate,
        ...(this.carryPrior && engine === "primary" && this.sessionPrior
          ? { languagePrior: this.sessionPrior }
          : {}),
        ...(engine === "fallback" && pin ? { languageHint: pin } : {}),
      });
      return { res };
    } catch (err) {
      return { err };
    }
  }

  /**
   * The utterance's engine and language from both engines' verdicts:
   *
   * - the fallback heard English (or any language outside India) and the
   *   primary is unsure: the fallback leads, its language is the label, and
   *   it is pinned to that language for the rest of the utterance;
   * - the fallback heard English and the primary is confident: code-mixed
   *   speech (or an accent the primary over-reads); the primary leads, and
   *   the final looks again with both engines on the whole utterance;
   * - the fallback heard an Indian language and the primary is confident:
   *   the primary leads, both agreed;
   * - the primary is unsure, the stream has been speaking a language outside
   *   India, and the fallback names another one: the fallback is asked again
   *   in the stream's language (a short pass of accented English is where it
   *   drifts into Devanagari); still another script means a real switch;
   * - the fallback heard an Indian language and the primary is unsure: the
   *   primary leads when it has words.
   */
  private fuse(
    r: UtteranceRun,
    s: {
      primary: ReturnType<typeof liftLanguage>;
      primaryText: string;
      fallbackText: string;
      heard: string;
    },
  ): {
    engine: STTStreamEngineRole;
    language: string | undefined;
    agreed: boolean;
    pin?: string;
    repin?: string;
    why: string;
  } {
    // IndicConformer's Hindi and Punjabi (or Marathi, Nepali) scores are
    // near-ties on Hindi speech: Hindi within 0.05 of the top score is Hindi,
    // which keeps Hinglish labelled Hindi and open to the fallback's verdict.
    const topScore = s.primary?.scores?.[0]?.score;
    const hindiScore = s.primary?.scores?.find(
      (x) => langCode(x.language) === "hi",
    )?.score;
    const primaryLang =
      topScore !== undefined &&
      hindiScore !== undefined &&
      topScore - hindiScore <= 0.05
        ? "hi"
        : langCode(s.primary?.language);
    // Sure means the engine said so: a result that carries no verdict at all
    // (a gateway dropped the field) is not a confident one.
    const primarySure =
      s.primary?.detected === true && s.primary.flagged && !!s.primaryText;
    const passScore = s.primary?.scores?.[0]?.score;
    if (
      passScore !== undefined &&
      r.u.length / this.inputRate >= SCORE_MIN_AUDIO_S
    ) {
      r.primaryScores.push({
        score: passScore,
        seconds: r.u.length / this.inputRate,
      });
    }
    const primaryScore = r.primaryScore ?? passScore;
    // Clearly not an Indian language: no words at all, or a score far below
    // the cutoff (an engine without scores keeps its own unsure verdict).
    const clearlyUnsure =
      !s.primaryText ||
      (!primarySure &&
        (primaryScore === undefined || primaryScore <= CLEAR_UNSURE_MAX_SCORE));
    const heardIndic = INDIC_LANGUAGES.has(s.heard);
    // Before any confident verdict, a provisional pass treats the stream as
    // English: a one-second answer in an Indic script from the fallback on
    // audio the primary cannot place is a guess, and showing it is worse
    // than romanized text the primary replaces once it is sure.
    const provisional = r.u.length / this.inputRate < AGREE_MIN_AUDIO_S;
    // Only for an Indian-language primary (the accent case this exists for):
    // a Spanish utterance on Whisper must never be re-asked in English.
    const indicPrimary =
      primaryLang !== undefined && INDIC_LANGUAGES.has(primaryLang);
    const stream =
      this.sessionPrior ?? (provisional && indicPrimary ? "en" : undefined);
    // A stream that has been speaking a language outside India, a primary
    // that cannot place this audio, and a fallback naming another language:
    // a short pass of accented speech is exactly where the fallback guesses
    // (Hindi, even Chinese, for one second of Indian English). Ask it again
    // in the stream's language; an answer still in another script means the
    // speaker really switched.
    // Only English: the accent drift this exists for. Re-asking in any other
    // stream language would turn one wrong guess into a whole session's.
    if (
      clearlyUnsure &&
      stream === "en" &&
      s.heard !== stream &&
      s.fallbackText
    ) {
      return {
        engine: "fallback",
        language: stream,
        agreed: false,
        repin: stream,
        why: `fallback heard ${s.heard} in a ${stream} stream, primary unsure: asked again in ${stream}`,
      };
    }
    // Qwen3-ASR knows Hindi (and Urdu) among the Indian languages, nothing
    // else: on Tamil it says English or even Malay. Its verdict is no
    // evidence against a primary strongly sure of a language it cannot
    // hear; the second opinion still reconciles any English in it.
    const fallbackBlind =
      primarySure &&
      primaryLang !== undefined &&
      INDIC_LANGUAGES.has(primaryLang) &&
      primaryLang !== "hi" &&
      primaryLang !== "ur" &&
      (primaryScore === undefined || primaryScore >= MIXED_PRIMARY_MIN_SCORE);
    if (fallbackBlind) {
      return {
        engine: "primary",
        language: primaryLang,
        agreed: true,
        why: `primary strongly sure of ${primaryLang}, a language the fallback cannot name (it said ${s.heard})`,
      };
    }
    if (!heardIndic) {
      if (!primarySure) {
        return {
          engine: s.fallbackText ? "fallback" : "primary",
          language: s.heard,
          agreed: clearlyUnsure && !!s.fallbackText,
          ...(clearlyUnsure ? { pin: s.heard } : {}),
          why: `fallback heard ${s.heard}, primary ${clearlyUnsure ? "clearly unsure" : "marginal"}`,
        };
      }
      const strong =
        primaryScore === undefined || primaryScore >= MIXED_PRIMARY_MIN_SCORE;
      return {
        engine: strong ? "primary" : "fallback",
        language: strong ? primaryLang : s.heard,
        agreed: false,
        why: `primary sure of ${primaryLang}, fallback heard ${s.heard}: mixed, ${strong ? "primary strong" : "primary marginal"} (utterance ${primaryScore?.toFixed(3)})`,
      };
    }
    if (primarySure) {
      return {
        engine: "primary",
        language: primaryLang,
        agreed: true,
        why: `both heard an Indian language (${primaryLang}/${s.heard})`,
      };
    }
    return {
      engine: s.primaryText ? "primary" : "fallback",
      language: s.heard,
      agreed: false,
      why: `fallback heard ${s.heard}, primary unsure`,
    };
  }

  /**
   * The probe: both engines on the same audio, the utterance's engine chosen
   * from what came back. Returns the result the caption should use.
   */
  private async probePass(
    r: UtteranceRun,
    pcm: Float32Array,
    isFinal: boolean,
  ): Promise<{ res?: STTResult; err?: unknown }> {
    const [p, f] = await Promise.all([
      this.callEngine(r, pcm, isFinal, "primary"),
      this.callEngine(r, pcm, isFinal, "fallback"),
    ]);
    r.probePasses++;
    const lang = liftLanguage(p.res);
    const primaryText = p.res?.text?.trim() ?? "";
    const fallbackText = f.res?.text?.trim() ?? "";
    const when = this.fallbackWhen;
    const primaryFailed =
      p.err !== undefined || (when.includes("empty") && !primaryText);
    const unsure = when.includes("unsure") && lang?.detected === false;
    const confident = lang?.detected === true;
    if (confident) {
      r.confidentProbes++;
    } else if (unsure) {
      r.unsureProbes++;
    }
    // Verdicts that disagreed buy one more probe, so a single call on two or
    // three seconds of audio never settles an utterance by itself.
    const disagreed = r.confidentProbes > 0 && r.unsureProbes > 0;
    const lastProbe =
      r.probePasses >= this.lockAfterPasses + (disagreed ? 1 : 0);
    // The fallback's words count when there are any; whether they are mostly
    // Latin decides an "unsure" call (an English sentence with one Hindi
    // word is still English), never an "empty" one: words always beat none.
    const fallbackHasWords = fallbackText.length > 0;
    const fallbackMostlyLatin =
      fallbackHasWords && latinShare(fallbackText) >= 0.7;

    const lead = (engine: STTStreamEngineRole, why: string): void => {
      if (r.engine !== engine) {
        r.engine = engine;
        r.switched = engine === "fallback";
        resetLocalAgreement(r.la);
      }
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribeStream] utterance ${r.u.id}: probe ${r.probePasses} → ${engine} leads (${why})`,
        );
      }
    };

    // Two verdicts. A fallback that names the language it heard (Qwen3-ASR
    // through stt-aux does; a pinned pass does not count) settles what the
    // primary's own score cannot: an Indian accent pulls an Indic engine's
    // score toward "confident", never the other engine's language call.
    const pinnedPass = r.fallbackPin !== undefined;
    const heard = pinnedPass ? undefined : langCode(f.res?.language);
    // Only an engine that states its own confidence can be weighed against the
    // fallback's verdict; one that reports none (Deepgram, Whisper) keeps the
    // rules below, where the fallback takes over only when the primary is
    // empty or flags itself unsure.
    if (heard && !p.err && f.res && lang?.flagged) {
      const verdict = this.fuse(r, {
        primary: lang,
        primaryText,
        fallbackText,
        heard,
      });
      if (verdict.engine === "fallback" && verdict.repin && fallbackText) {
        // The fallback named an Indic language in a stream that speaks
        // English, on audio the primary cannot place: ask it again in the
        // stream's language rather than show the wrong script. If it still
        // answers in an Indic script, the speech really is Indic.
        const again = await this.callEngine(
          r,
          pcm,
          isFinal,
          "fallback",
          verdict.repin,
        );
        const againText = again.res?.text?.trim() ?? "";
        if (againText && indicShare(againText) <= 0.5) {
          f.res = again.res;
        } else {
          verdict.engine =
            primaryText && INDIC_LANGUAGES.has(heard) ? "primary" : "fallback";
          verdict.language = heard;
          verdict.why += `; it insisted, so the speaker switched to ${heard}`;
        }
      }
      const enough = r.u.length / this.inputRate >= AGREE_MIN_AUDIO_S;
      r.agreedProbes = verdict.agreed && enough ? r.agreedProbes + 1 : 0;
      // Two agreeing probes, not one: under load the first probe can land
      // late on a single weak reading, and one call never settles an utterance.
      const settled = r.agreedProbes >= 2;
      const score = lang?.scores?.[0]?.score;
      lead(
        verdict.engine,
        `${verdict.why}${score !== undefined ? ` [primary ${lang?.language} ${score}${lang?.flagged ? "" : ", no flag"}]` : ""}${enough ? "" : " (provisional)"}`,
      );
      const otherText =
        verdict.engine === "fallback"
          ? primaryText
          : (f.res?.text?.trim() ?? "");
      r.alternative = otherText
        ? {
            engine: verdict.engine === "fallback" ? "primary" : "fallback",
            text: otherText,
          }
        : undefined;
      // Only agreement locks: a mixed or unsure utterance keeps both engines
      // running, and its final decides on the whole utterance.
      r.locked = settled;
      r.lookAgain = !settled;
      if (verdict.pin && settled) {
        r.fallbackPin = verdict.pin;
      }
      // A weak guess (Qwen3-ASR called a Tamil utterance Malay) must not
      // become the stream's language: only a settled verdict carries over.
      this.emitLanguage(
        r,
        {
          language: verdict.language ?? "und",
          detected: verdict.language !== undefined,
          flagged: true,
          ...(lang?.scores ? { scores: lang.scores } : {}),
        },
        settled,
      );
      return verdict.engine === "fallback" ? f : p;
    }

    if (primaryFailed && fallbackHasWords) {
      lead(
        "fallback",
        p.err !== undefined ? "primary failed" : "primary empty",
      );
      // A failed call (a timeout on a busy gateway) says nothing about the
      // language: try the primary again on the next pass. An empty answer does.
      r.locked = p.err === undefined;
      r.lookAgain = p.err !== undefined;
      this.emitLanguage(r, lang);
      this.emitLanguage(r, liftLanguage(f.res));
      return f;
    }
    if (confident) {
      // The primary knows this language. One verdict does not settle it,
      // though: a language score on a few seconds of audio jitters (an
      // English clip scored −0.46, −0.16 and −0.44 on three consecutive
      // passes against a −0.18 threshold), so the lock waits for a second
      // confident probe — unless the fallback has nothing to offer anyway,
      // or this was the last probe.
      const settled = r.confidentProbes >= 2 || !fallbackHasWords || lastProbe;
      lead(
        "primary",
        settled ? "primary confident" : "primary confident, one more probe",
      );
      r.locked = settled;
      this.emitLanguage(r, lang);
      return p;
    }
    if (unsure && fallbackMostlyLatin) {
      // Lead with the fallback now; a later probe pass may still hand the
      // utterance back if the primary turns confident with more audio.
      lead("fallback", "primary unsure");
      r.locked = lastProbe;
      this.emitLanguage(r, lang);
      this.emitLanguage(r, liftLanguage(f.res));
      return f;
    }
    // No verdict either way: whoever has words leads, the primary on a tie.
    if (!primaryText && fallbackHasWords) {
      lead("fallback", "only the fallback had words");
      r.locked = lastProbe;
      this.emitLanguage(r, liftLanguage(f.res));
      return f;
    }
    lead("primary", lang ? "primary not unsure" : "no language verdict");
    r.locked = lastProbe;
    this.emitLanguage(r, lang);
    return p;
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
    const pcm = pcmIn ?? this.endpointer.pcm16k(r.u, this.engineCut());
    const seconds = r.u.length / this.inputRate;

    // The final looks again with both engines unless they already agreed:
    // the whole utterance is the best evidence there will be.
    const probing =
      this.probe &&
      (!r.locked || (isFinal && r.lookAgain)) &&
      seconds >= PROBE_MIN_AUDIO_S &&
      r.u.speechMs >= PROBE_MIN_SPEECH_MS;
    // Outside the probe, a fallback leading an utterance already labelled
    // with a confident language outside India transcribes in it: an unpinned
    // pass of accented English can still drift into Devanagari.
    const pin =
      r.fallbackPin ??
      (r.engine === "fallback" &&
      r.languageDetected === true &&
      r.language &&
      !INDIC_LANGUAGES.has(langCode(r.language) ?? "")
        ? langCode(r.language)
        : undefined);
    let { res, err } = probing
      ? await this.probePass(r, pcm, isFinal)
      : await this.callEngine(r, pcm, isFinal, r.engine, pin);
    // A file is not live: a final that failed (a timeout on a busy gateway)
    // is tried again rather than reported as silence.
    for (
      let retry = 0;
      err !== undefined && isFinal && retry < this.finalRetries;
      retry++
    ) {
      if (logger.shouldLog("debug")) {
        logger.debug(
          `[transcribeStream] utterance ${r.u.id}: final pass failed (${errorMessage(err)}), retry ${retry + 1}`,
        );
      }
      ({ res, err } = await this.callEngine(r, pcm, isFinal, r.engine, pin));
    }
    let text = res?.text?.trim() ?? "";
    let lang = liftLanguage(res);
    if (!probing) {
      this.emitLanguage(r, lang);
    }

    if (
      this.options.fallback &&
      r.engine === "primary" &&
      !r.switched &&
      !probing
    ) {
      const when = this.fallbackWhen;
      const unsure =
        (when.includes("unsure") && lang?.detected === false) ||
        (when.includes("empty") && !err && !text) ||
        (when.includes("error") && err !== undefined);
      r.unsureN = unsure ? r.unsureN + 1 : 0;
      if (
        r.confidentPasses < 2 &&
        seconds >= TAKEOVER_MIN_AUDIO_S &&
        r.u.speechMs >= TAKEOVER_MIN_SPEECH_MS &&
        r.unsureN >= TAKEOVER_UNSURE_PASSES
      ) {
        // Hand the rest of this utterance to the fallback right now, so the
        // caption never goes blank; the primary's words are noise from here.
        r.engine = "fallback";
        r.switched = true;
        resetLocalAgreement(r.la);
        // A primary that errors (a wrong model name, a refused key) would
        // otherwise be hidden by the fallback's captions. Logged as an error
        // because the logger drops warnings unless debugging.
        if (err !== undefined && !this.primaryFailureWarned) {
          this.primaryFailureWarned = true;
          logger.error(
            `[transcribeStream] primary engine ${this.label("primary")} failed (${errorMessage(err)}); fallback ${this.label("fallback")} is transcribing instead`,
          );
        }
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
    const pcm = this.endpointer.pcm16k(r.u, this.engineCut());
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
      // Engines that disagreed on the language get the final look on the
      // whole utterance even when the last interim covered all of it.
      const needFinal =
        r.u.length - r.sentLen >= MIN_NEW_AUDIO_FINAL_S * this.inputRate ||
        r.passes === 0 ||
        r.lookAgain;
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
      if (text && this.nearSilentNoise(r, text, seconds)) {
        // Little speech energy and a word or two in a script the session
        // does not speak: the engine filled a pause, not a sentence.
        if (logger.shouldLog("debug")) {
          logger.debug(
            `[transcribeStream] utterance ${r.u.id}: near-silent utterance, output discarded`,
          );
        }
        text = "";
      }
      if (text && this.impossibleWordRate(r, text)) {
        if (logger.shouldLog("debug")) {
          logger.debug(
            `[transcribeStream] utterance ${r.u.id}: ${r.u.speechMs} ms of speech cannot hold the engine's words, output discarded`,
          );
        }
        text = "";
      }
      const speechSeconds = Math.round(r.u.speechMs) / 1000;
      if (!text) {
        this.queue.push({
          type: "silence",
          utterance: r.u.id,
          seconds,
          vad: this.vadName,
          speechSeconds,
        });
        return;
      }
      if (text.split(/\s+/u).filter(Boolean).length > NEAR_SILENT_MAX_WORDS) {
        this.sessionLatinShare = latinShare(text);
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
        // An utterance the two engines never agreed on (code-mixed speech,
        // most often) has no confident language, whatever its last label.
        ...(r.lookAgain && r.alternative
          ? { languageDetected: false }
          : r.languageDetected !== undefined
            ? { languageDetected: r.languageDetected }
            : {}),
        engine:
          res &&
          !keptInterim &&
          typeof res.metadata?.routedProvider === "string"
            ? res.metadata.routedProvider
            : this.label(r.engine),
        ...(r.switched ? { fallbackUsed: true } : {}),
        ...(r.lookAgain && r.alternative && r.alternative.text !== text
          ? {
              alternative: {
                engine: this.label(r.alternative.engine),
                text: r.alternative.text,
              },
            }
          : {}),
        seconds,
        vad: this.vadName,
        speechSeconds,
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
