/**
 * Whistle — the built-in, zero-config, on-device speech-to-text engine.
 *
 * Runs Cactus's Whistle model (17 MB) on the Cactus "needle" engine, an
 * Emscripten WebAssembly build, inside a `worker_threads` Worker. No API key,
 * no network after the first use, no native addon: it is the STT provider
 * NeuroLink falls back to when no other one is configured.
 *
 * **Files.** `needle.js`, `needle.wasm` and `whistle.cact` (~17.9 MB in all)
 * are downloaded from pinned Hugging Face revisions on first use, checked
 * against SHA-256 and kept in the model directory:
 * `credentials.stt.whistle.modelDir` → `NEUROLINK_WHISTLE_DIR` →
 * `$NEUROLINK_MODEL_DIR/whistle` → `~/.neurolink/models/whistle`. Set
 * `NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0` (or `autoDownload: false`) to forbid the
 * download; a missing file then fails with an error naming each file, where it
 * goes and where to get it.
 *
 * **Languages.** English, German, French, Spanish, Italian, Dutch and Polish
 * (`en de fr es it nl pl`). `options.language` accepts a code or a locale
 * (`"de-DE"`); `"auto"`, omitted or any other language lets the engine detect
 * one of the seven.
 *
 * **Limits.** The engine reads 30 s per call; longer audio is cut at the
 * quietest 20 ms frame near every 24 s mark and the word times are offset
 * back onto the whole recording. One hour per request. Roughly 0.5 s of CPU
 * per 10 s of audio on a laptop core; one warm worker per handler instance,
 * requests served in order.
 *
 * **Keyword biasing.** `options.vocabulary` is passed to the engine as
 * keywords only when `options.model` is `"whistle-keywords"` or
 * `NEUROLINK_WHISTLE_KEYWORDS=1` — the engine can loop on long keyword lists,
 * so it is opt-in and capped at {@link MAX_KEYWORDS} entries.
 *
 * **Formats.** WAV (any PCM/float layout, rate and channel count) and raw
 * `pcm16` are decoded in-process; mp3, m4a, ogg/opus, webm, flac and mp4 need
 * ffmpeg (`ffmpeg-static`, `FFMPEG_PATH` or `ffmpeg` on PATH).
 *
 * **Streaming.** Native: `transcribeStream()` feeds the engine's own streaming
 * decoder about a second at a time, on a dedicated worker per stream. Each
 * step yields a final segment for the words two passes agreed on, and an
 * interim segment for the unconfirmed tail. Input frames are PCM16LE mono at
 * `options.sampleRate` (default 16 kHz).
 *
 * **Accuracy.** A 17 MB model: good on clear speech in its seven languages,
 * noticeably behind cloud engines and large Whisper-class models on accents,
 * noise, crosstalk, names and jargon. Use a dictionary/correction pass, or a
 * cloud provider, where that matters.
 *
 * @module voice/providers/WhistleSTT
 */

import type {
  STTCredentials,
  STTHandler,
  STTLanguage,
  STTOptions,
  STTResult,
  TranscriptionSegment,
  TTSAudioFormat,
  WhistleWord,
  WordTiming,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { STTError } from "../errors.js";
import {
  describeWhistleAssets,
  ensureWhistleAssets,
  resolveWhistleDir,
  whistleAssetsPresent,
  whistleAutoDownloadEnabled,
} from "../whistle/assets.js";
import {
  WHISTLE_FFMPEG_FORMATS,
  WHISTLE_NATIVE_FORMATS,
  WHISTLE_SAMPLE_RATE,
  decodePcm16,
  decodeToWhistlePcm,
} from "../whistle/audio.js";
import { WhistleEngine } from "../whistle/engine.js";

const PROVIDER = "whistle";
const MODEL = "whistle";
/** `options.model` value that turns keyword biasing on. */
const KEYWORDS_MODEL = "whistle-keywords";
/** Longer keyword lists make the decoder loop. */
const MAX_KEYWORDS = 32;
/** Confidence reported for non-empty text when the engine gave no word scores. */
const DEFAULT_CONFIDENCE = 0.9;

const LANGUAGES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "en", name: "English" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "es", name: "Spanish" },
  { code: "it", name: "Italian" },
  { code: "nl", name: "Dutch" },
  { code: "pl", name: "Polish" },
];
const LANGUAGE_CODES = new Set(LANGUAGES.map((l) => l.code));

export class WhistleSTT implements STTHandler {
  /** One hour per request (16 kHz float samples: ~230 MB in memory). */
  public readonly maxAudioDuration = 60 * 60;
  /** The engine has its own streaming decoder. */
  public readonly supportsStreaming = true;

  private readonly modelDir: string;
  private readonly autoDownload: boolean;
  private engine: Promise<WhistleEngine> | undefined;

  constructor(slice?: STTCredentials["whistle"]) {
    this.modelDir = resolveWhistleDir(slice);
    this.autoDownload = whistleAutoDownloadEnabled(slice);
  }

  /**
   * True when the engine can run: its files are already in the model dir, or
   * it is allowed to fetch them. With `NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0` (or
   * `autoDownload: false`) and no files, it reports unconfigured, so a caller
   * asserting "no STT backend" is not answered by a 17 MB download.
   */
  isConfigured(): boolean {
    return whistleAssetsPresent(this.modelDir) || this.autoDownload;
  }

  describeConfiguration(): string {
    return describeWhistleAssets(
      this.modelDir,
      "automatic download is off (NEUROLINK_WHISTLE_AUTO_DOWNLOAD=0 or autoDownload: false)",
    );
  }

  /** Directory the engine's files live in. */
  getModelDir(): string {
    return this.modelDir;
  }

  getSupportedFormats(): TTSAudioFormat[] {
    return [...WHISTLE_NATIVE_FORMATS, ...WHISTLE_FFMPEG_FORMATS];
  }

  async getSupportedLanguages(): Promise<STTLanguage[]> {
    return LANGUAGES.map((l) => ({
      code: l.code,
      name: l.name,
      supportsDiarization: false,
      supportsPunctuation: true,
    }));
  }

  /** Download/verify the files and start the worker now rather than on the first request. */
  async warmUp(): Promise<void> {
    await this.getEngine();
  }

  /** Stop the warm worker. The handler stays usable; the next call starts a new one. */
  async dispose(): Promise<void> {
    const engine = this.engine;
    this.engine = undefined;
    if (engine) {
      await (await engine.catch(() => undefined))?.dispose();
    }
  }

  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions = {},
  ): Promise<STTResult> {
    const started = Date.now();
    const buffer = Buffer.isBuffer(audio) ? audio : Buffer.from(audio);
    if (buffer.length === 0) {
      throw STTError.audioEmpty(PROVIDER);
    }
    const pcm = await decodeToWhistlePcm(
      buffer,
      options.format,
      options.sampleRate,
    );
    if (pcm.length === 0) {
      throw STTError.audioEmpty(PROVIDER);
    }
    const duration = pcm.length / WHISTLE_SAMPLE_RATE;
    if (duration > this.maxAudioDuration) {
      throw STTError.audioTooLong(
        Math.round(duration),
        this.maxAudioDuration,
        PROVIDER,
      );
    }
    const language = normalizeLanguage(options.language);
    const keywords = keywordsFor(options);
    const engine = await this.getEngine();

    // Timestamps are always requested: the per-word probabilities are the only confidence signal.
    // Engine failures already arrive as STTErrors.
    const out = await engine.transcribe(pcm, language, keywords, true);

    const text = out.text.trim();
    const confidence = confidenceOf(text, out.words);
    const result: STTResult = {
      text,
      confidence,
      language: out.language ?? language ?? undefined,
      duration: Math.round(duration * 1000) / 1000,
      metadata: {
        latency: Date.now() - started,
        provider: PROVIDER,
        model: MODEL,
        confidenceSource: !text
          ? "none"
          : out.words.length
            ? "word_logprobs"
            : undefined,
        ttftMs: out.ttftMs,
        decodeTps: out.decodeTps,
        chunks: out.chunks,
        keywords: keywords !== null,
      },
    };
    if (options.wordTimestamps) {
      result.words = out.words.map(toWordTiming);
    }
    return result;
  }

  /**
   * Native streaming. `audioStream` yields PCM16LE mono frames at
   * `options.sampleRate` (default 16 kHz), any frame size. Yields a final
   * segment for each run of words the engine commits (times from the start of
   * the stream; join the finals with a space for the transcript) and an
   * interim segment carrying the unconfirmed tail whenever it changes.
   */
  async *transcribeStream(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions = {},
  ): AsyncIterable<TranscriptionSegment> {
    const rate = options.sampleRate ?? WHISTLE_SAMPLE_RATE;
    const language = normalizeLanguage(options.language);
    const keywords = keywordsFor(options);
    const paths = await ensureWhistleAssets(this.modelDir, this.autoDownload);
    // The engine's stream state is global to its instance: a stream gets a worker of its own,
    // so batch calls on this handler are never interleaved with it.
    const engine = new WhistleEngine(paths);
    const blockBytes = rate * 2; // about a second per engine pass
    let pending = Buffer.alloc(0);
    let index = 0;
    let lastInterim = "";
    let finished = false;

    const segmentsOf = function* (step: {
      text: string;
      words: WhistleWord[];
      pending: string;
      language: string | null;
    }): Generator<TranscriptionSegment> {
      if (step.text) {
        const words = step.words.map(toWordTiming);
        yield {
          index: index++,
          text: step.text,
          isFinal: true,
          confidence: confidenceOf(step.text, step.words),
          startTime: step.words[0]?.start,
          endTime: step.words[step.words.length - 1]?.end,
          words,
          language: step.language ?? language ?? undefined,
        };
      }
      if (step.pending !== lastInterim) {
        lastInterim = step.pending;
        yield {
          index,
          text: step.pending,
          isFinal: false,
          language: step.language ?? language ?? undefined,
        };
      }
    };

    try {
      for await (const frame of audioStream) {
        pending = pending.length
          ? Buffer.concat([pending, frame])
          : Buffer.from(frame);
        while (pending.length >= blockBytes) {
          const block = pending.subarray(0, blockBytes);
          pending = pending.subarray(blockBytes);
          const step = await engine.streamProcess(
            decodePcm16(block, rate),
            language,
            keywords,
          );
          yield* segmentsOf(step);
        }
      }
      const tail = pending.subarray(0, pending.length - (pending.length & 1));
      if (tail.length > 0) {
        const step = await engine.streamProcess(
          decodePcm16(tail, rate),
          language,
          keywords,
        );
        yield* segmentsOf(step);
      }
      const last = await engine.streamStop();
      yield* segmentsOf(last);
      finished = true;
    } catch (error) {
      if (error instanceof STTError) {
        throw error;
      }
      throw STTError.streamError(
        error instanceof Error ? error.message : String(error),
        PROVIDER,
      );
    } finally {
      if (!finished) {
        logger.debug("[whistle] stream ended early; discarding its worker");
      }
      await engine.dispose();
    }
  }

  private getEngine(): Promise<WhistleEngine> {
    if (!this.engine) {
      const job = ensureWhistleAssets(this.modelDir, this.autoDownload).then(
        (paths) => new WhistleEngine(paths),
      );
      this.engine = job;
      // A failed preparation (offline, download off) must not stick.
      job.catch(() => {
        if (this.engine === job) {
          this.engine = undefined;
        }
      });
    }
    return this.engine;
  }
}

/** `"de-DE"` → `"de"`; `"auto"`, omitted, or a language Whistle does not know → `null` (detect). */
function normalizeLanguage(language: string | undefined): string | null {
  if (!language) {
    return null;
  }
  const base = language.trim().toLowerCase().split(/[-_]/)[0];
  if (!base || base === "auto") {
    return null;
  }
  if (!LANGUAGE_CODES.has(base)) {
    logger.debug(
      `[whistle] language "${language}" is not one of ${[...LANGUAGE_CODES].join(", ")}; detecting instead`,
    );
    return null;
  }
  return base;
}

/** Newline-separated keywords, only when biasing is switched on. */
function keywordsFor(options: STTOptions): string | null {
  const enabled =
    options.model === KEYWORDS_MODEL ||
    ["1", "true", "on", "yes"].includes(
      (process.env.NEUROLINK_WHISTLE_KEYWORDS ?? "").trim().toLowerCase(),
    );
  if (!enabled || !options.vocabulary?.length) {
    return null;
  }
  const terms = [
    ...new Set(options.vocabulary.map((t) => t.replace(/\s+/g, " ").trim())),
  ].filter(Boolean);
  if (terms.length > MAX_KEYWORDS) {
    logger.debug(
      `[whistle] keyword list cut from ${terms.length} to ${MAX_KEYWORDS}`,
    );
  }
  return terms.length ? terms.slice(0, MAX_KEYWORDS).join("\n") : null;
}

function confidenceOf(text: string, words: WhistleWord[]): number {
  if (!text) {
    return 0;
  }
  if (!words.length) {
    return DEFAULT_CONFIDENCE;
  }
  const mean = words.reduce((sum, w) => sum + w.probability, 0) / words.length;
  return Math.min(1, Math.max(0, Math.round(mean * 1000) / 1000));
}

function toWordTiming(w: WhistleWord): WordTiming {
  return {
    word: w.word,
    start: w.start,
    end: w.end,
    startTime: w.start,
    endTime: w.end,
    confidence: w.probability,
  };
}
