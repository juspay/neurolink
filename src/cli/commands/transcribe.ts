#!/usr/bin/env node

/**
 * NeuroLink CLI Transcribe Command
 *
 * Calls `NeuroLink.transcribe()` — audio in, text out — or, with `--stream`,
 * `NeuroLink.transcribeStream()` over the file decoded to 16 kHz mono PCM16.
 * See src/lib/types/transcribe.ts for the full vocabulary (dictionary,
 * correction, second opinion, fallback).
 *
 * Credentials are env-only here, exactly as every other CLI command: each STT
 * handler reads its own settings, and `NEUROLINK_STT_PROVIDER`,
 * `NEUROLINK_STT_MODEL` and `NEUROLINK_STT_LANGUAGE` pick the defaults. With
 * nothing configured the built-in local engine (Whistle) is used.
 */

import chalk from "chalk";
import ora from "ora";
import fs from "node:fs";
import type { ArgumentsCamelCase, Argv, CommandModule } from "yargs";
import { NeuroLink } from "../../lib/neurolink.js";
import type {
  CliSubtitleCue,
  CliTranscribeArgs,
  CliTranscribeStreamSink,
  STTCorrectionOptions,
  STTDictionaryEntry,
  TranscribeOptions,
  TranscribeResult,
  TranscriptionSegment,
  TTSAudioFormat,
  WordTiming,
} from "../../lib/types/index.js";
import { logger } from "../../lib/utils/logger.js";

const TARGET_SAMPLE_RATE = 16000;
/** 100 ms of 16 kHz mono PCM16. */
const STREAM_FRAME_BYTES = (TARGET_SAMPLE_RATE / 10) * 2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function fail(message: string): never {
  logger.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

async function readStdin(): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function readAudio(
  file: string,
): Promise<{ audio: Buffer; format?: TTSAudioFormat; label: string }> {
  const { audioFormatFromBytes, audioFormatFromName } =
    await import("../../lib/voice/transcribe.js");
  if (file === "-") {
    if (process.stdin.isTTY) {
      throw new Error(
        "`-` reads audio from stdin, but stdin is a terminal — pipe a file in.",
      );
    }
    const audio = await readStdin();
    return { audio, format: audioFormatFromBytes(audio), label: "stdin" };
  }
  const audio = await fs.promises.readFile(file);
  const format = audioFormatFromName(file) ?? audioFormatFromBytes(audio);
  return { audio, format, label: file };
}

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------

function toDictionaryEntry(value: unknown, where: string): STTDictionaryEntry {
  if (
    !isRecord(value) ||
    typeof value.term !== "string" ||
    !value.term.trim()
  ) {
    throw new Error(`${where}: every entry needs a non-empty "term" string.`);
  }
  const entry: STTDictionaryEntry = { term: value.term.trim() };
  if (value.heardAs !== undefined) {
    if (
      !Array.isArray(value.heardAs) ||
      !value.heardAs.every((h) => typeof h === "string")
    ) {
      throw new Error(`${where}: "heardAs" must be an array of strings.`);
    }
    const heardAs = value.heardAs.map((h) => h.trim()).filter(Boolean);
    if (heardAs.length > 0) {
      entry.heardAs = heardAs;
    }
  }
  if (value.meaning !== undefined) {
    if (typeof value.meaning !== "string") {
      throw new Error(`${where}: "meaning" must be a string.`);
    }
    if (value.meaning.trim()) {
      entry.meaning = value.meaning.trim();
    }
  }
  return entry;
}

/** `"Term|heard,as|meaning"` — only the term is required. */
function parseTermFlag(raw: string): STTDictionaryEntry {
  const [term = "", heard = "", ...meaningParts] = raw.split("|");
  const meaning = meaningParts.join("|").trim();
  if (!term.trim()) {
    throw new Error(
      `--term "${raw}" has no term; use "Term|heard,as|meaning".`,
    );
  }
  const heardAs = heard
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return {
    term: term.trim(),
    ...(heardAs.length > 0 ? { heardAs } : {}),
    ...(meaning ? { meaning } : {}),
  };
}

function buildDictionary(
  argv: CliTranscribeArgs,
): STTDictionaryEntry[] | undefined {
  const entries: STTDictionaryEntry[] = [];
  if (argv.dictionary) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(argv.dictionary, "utf-8"));
    } catch (error) {
      throw new Error(
        `could not read --dictionary ${argv.dictionary} — ${errorMessage(error)}`,
        { cause: error },
      );
    }
    if (!Array.isArray(parsed)) {
      throw new Error(
        "--dictionary must hold a JSON array of { term, heardAs, meaning }.",
      );
    }
    parsed.forEach((value, i) =>
      entries.push(toDictionaryEntry(value, `--dictionary entry ${i}`)),
    );
  }
  for (const raw of ([] as string[]).concat(argv.term ?? [])) {
    entries.push(parseTermFlag(raw));
  }
  return entries.length > 0 ? entries : undefined;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

function buildCorrection(
  argv: CliTranscribeArgs,
  hasDictionary: boolean,
): STTCorrectionOptions | undefined {
  const correction: STTCorrectionOptions = {};
  // A rewrite model, a transliteration choice or a second opinion only means
  // something inside the correction layer, so each one turns it on.
  const implied = Boolean(
    argv.rewriteProvider ||
    argv.rewriteModel ||
    argv.transliterate ||
    argv.secondOpinion,
  );
  if (argv.correct || implied) {
    correction.enabled = true;
  }
  if (argv.rewrite === false) {
    correction.rewrite = false;
  } else if (argv.rewriteProvider || argv.rewriteModel) {
    correction.rewrite = {
      ...(argv.rewriteProvider ? { provider: argv.rewriteProvider } : {}),
      ...(argv.rewriteModel ? { model: argv.rewriteModel } : {}),
    };
  }
  if (argv.transliterate) {
    correction.transliterate = argv.transliterate;
  }
  if (argv.secondOpinion) {
    correction.secondOpinion = { provider: argv.secondOpinion };
  }
  if (argv.context) {
    correction.context = argv.context;
  }
  if (Object.keys(correction).length === 0) {
    return undefined;
  }
  // The SDK reads any correction object as a request for correction. Here
  // only --correct, the flags above or a dictionary ask for it; --context or
  // --no-rewrite alone must not start an LLM rewrite.
  if (correction.enabled === undefined && !hasDictionary) {
    correction.enabled = false;
  }
  return correction;
}

function buildCommonOptions(
  argv: CliTranscribeArgs,
  dictionary: STTDictionaryEntry[] | undefined,
): Omit<TranscribeOptions, "audio"> {
  const correction = buildCorrection(argv, Boolean(dictionary));
  return {
    ...(argv.provider ? { provider: argv.provider } : {}),
    ...(argv.model ? { model: argv.model } : {}),
    // Omitted → NEUROLINK_STT_LANGUAGE, else the engine detects it.
    ...(argv.language ? { language: argv.language } : {}),
    ...(argv.diarize ? { diarization: true } : {}),
    ...(argv.wordTimestamps ? { wordTimestamps: true } : {}),
    ...(argv.prompt ? { prompt: argv.prompt } : {}),
    ...(dictionary ? { dictionary } : {}),
    ...(correction ? { correction } : {}),
    ...(argv.fallback ? { fallback: { provider: argv.fallback } } : {}),
    ...(argv.timeout !== undefined ? { timeoutMs: argv.timeout } : {}),
  };
}

// ---------------------------------------------------------------------------
// Decoding for --stream
// ---------------------------------------------------------------------------

/**
 * The file as 16 kHz mono PCM16LE, decoded exactly as the local engine decodes
 * its input: WAV of any layout in-process, raw `pcm16` taken as 16 kHz, every
 * other container through ffmpeg (`FFMPEG_PATH`, `ffmpeg-static`, or `ffmpeg`
 * on PATH) — and a clear error when there is none.
 */
async function decodeToPcm16(
  audio: Buffer,
  format: TTSAudioFormat | undefined,
  label: string,
): Promise<Buffer> {
  const { decodeToWhistlePcm } =
    await import("../../lib/voice/whistle/audio.js");
  let samples: Float32Array;
  try {
    samples = await decodeToWhistlePcm(audio, format, TARGET_SAMPLE_RATE);
  } catch (error) {
    throw new Error(
      `--stream needs 16 kHz PCM and ${label} could not be decoded — ${errorMessage(error)}`,
      { cause: error },
    );
  }
  const pcm = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    pcm.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767),
      i * 2,
    );
  }
  return pcm;
}

async function* pcmFrames(pcm: Buffer): AsyncGenerator<Buffer> {
  for (let at = 0; at < pcm.length; at += STREAM_FRAME_BYTES) {
    yield pcm.subarray(at, Math.min(pcm.length, at + STREAM_FRAME_BYTES));
    // Let the consumer's timers and I/O run between frames.
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
}

// ---------------------------------------------------------------------------
// Subtitles
// ---------------------------------------------------------------------------

function startOf(item: {
  start?: number;
  startTime?: number;
}): number | undefined {
  return item.start ?? item.startTime;
}

function endOf(item: { end?: number; endTime?: number }): number | undefined {
  return item.end ?? item.endTime;
}

/** Words grouped into readable cues: at most ~7 words or 4 s, broken at sentence ends. */
function cuesFromWords(words: WordTiming[]): CliSubtitleCue[] {
  const cues: CliSubtitleCue[] = [];
  let current: CliSubtitleCue | undefined;
  let count = 0;
  for (const word of words) {
    const start = startOf(word);
    const end = endOf(word) ?? start;
    if (start === undefined || end === undefined) {
      continue;
    }
    if (!current) {
      current = { start, end, text: word.word.trim() };
      count = 1;
    } else {
      current.text += ` ${word.word.trim()}`;
      current.end = end;
      count++;
    }
    if (
      count >= 7 ||
      current.end - current.start >= 4 ||
      /[.!?]$/.test(word.word.trim())
    ) {
      cues.push(current);
      current = undefined;
    }
  }
  if (current) {
    cues.push(current);
  }
  return cues;
}

function buildCues(
  text: string,
  segments: TranscriptionSegment[] | undefined,
  words: WordTiming[] | undefined,
  duration: number | undefined,
): CliSubtitleCue[] {
  const timed = (segments ?? []).filter(
    (s) => startOf(s) !== undefined && endOf(s) !== undefined && s.text.trim(),
  );
  if (timed.length === 1) {
    // One segment: it can carry the corrected text without losing alignment.
    return [{ start: startOf(timed[0]) ?? 0, end: endOf(timed[0]) ?? 0, text }];
  }
  if (timed.length > 1) {
    return timed.map((s) => ({
      start: startOf(s) ?? 0,
      end: endOf(s) ?? 0,
      text: s.text.trim(),
    }));
  }
  const fromWords = words ? cuesFromWords(words) : [];
  if (fromWords.length > 0) {
    return fromWords;
  }
  return text.trim()
    ? [{ start: 0, end: duration ?? 0, text: text.trim() }]
    : [];
}

function timestamp(seconds: number, separator: "," | "."): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}${separator}${pad(ms % 1000, 3)}`;
}

function renderSubtitles(
  cues: CliSubtitleCue[],
  format: "srt" | "vtt",
): string {
  const sep = format === "srt" ? "," : ".";
  const body = cues
    .map((cue, i) => {
      const end = Math.max(cue.end, cue.start + 0.5);
      const range = `${timestamp(cue.start, sep)} --> ${timestamp(end, sep)}`;
      return format === "srt"
        ? `${i + 1}\n${range}\n${cue.text}`
        : `${range}\n${cue.text}`;
    })
    .join("\n\n");
  return format === "srt" ? `${body}\n` : `WEBVTT\n\n${body}\n`;
}

// ---------------------------------------------------------------------------
// Human output
// ---------------------------------------------------------------------------

function ms(value: number | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value >= 1000
    ? `${(value / 1000).toFixed(1)}s`
    : `${Math.round(value)}ms`;
}

function trailLine(result: TranscribeResult): string {
  const parts: string[] = [];
  const engine = result.engine.model
    ? `${result.engine.provider}/${result.engine.model}`
    : result.engine.provider;
  parts.push(
    result.engine.fallbackUsed
      ? `engine ${engine} (fallback)`
      : `engine ${engine}`,
  );
  if (result.engine.secondOpinion) {
    parts.push(`second opinion ${result.engine.secondOpinion}`);
  }
  if (result.language) {
    const how =
      result.languageDetected === false
        ? " (unsure)"
        : result.languageDetected === true
          ? " (detected)"
          : "";
    parts.push(`language ${result.language}${how}`);
  }
  if (result.duration !== undefined) {
    parts.push(`audio ${result.duration.toFixed(1)}s`);
  }
  const t = result.timings;
  const timings = [
    ["transcribe", t.transcribeMs],
    ["second opinion", t.secondOpinionMs],
    ["decide", t.decideMs],
    ["rewrite", t.rewriteMs],
    ["total", t.totalMs],
  ]
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([name, value]) => `${name} ${ms(value)}`);
  parts.push(...timings);
  if (result.steps.length > 0) {
    parts.push(result.steps.join("; "));
  }
  return parts.join(" · ");
}

/** Which STT providers are usable right now, for an error message. */
async function describeConfiguredProviders(): Promise<string> {
  try {
    const { registerDefaultSTTHandlers } =
      await import("../../lib/voice/index.js");
    const { STTProcessor } = await import("../../lib/utils/sttProcessor.js");
    registerDefaultSTTHandlers();
    // Aliases register the same handler under several names; list each once.
    const seen = new Set<unknown>();
    const configured = STTProcessor.listProviders().filter((name) => {
      try {
        const handler = STTProcessor.getHandler(name);
        if (!handler || seen.has(handler) || !handler.isConfigured()) {
          return false;
        }
        seen.add(handler);
        return true;
      } catch {
        return false;
      }
    });
    return configured.length > 0
      ? `Configured STT providers: ${configured.join(", ")}.`
      : "No STT provider is configured; set NEUROLINK_STT_PROVIDER and that provider's key (see docs/features/transcribe.md).";
  } catch {
    return "";
  }
}

async function failWithProviders(error: unknown): Promise<never> {
  const message = errorMessage(error);
  // The SDK's provider errors already name what is configured.
  const providers = /configured/i.test(message)
    ? ""
    : await describeConfiguredProviders();
  logger.error(chalk.red(`Error: ${message}`));
  if (providers) {
    logger.error(chalk.gray(providers));
  }
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Stream mode
// ---------------------------------------------------------------------------

function createCliTranscribeStreamSink(
  argv: CliTranscribeArgs,
): CliTranscribeStreamSink {
  const format = argv.format ?? "text";
  const tty = process.stdout.isTTY === true;
  let liveLine = false;
  const clearLive = () => {
    if (liveLine) {
      process.stdout.write("\r\x1b[2K");
      liveLine = false;
    }
  };
  const live = (text: string) => {
    process.stdout.write(`\r\x1b[2K${text}`);
    liveLine = true;
  };

  // Subtitles need the whole run: finals keep their timing, a later
  // `corrected` event replaces the text of the same utterance.
  const finals = new Map<
    number,
    TranscriptionSegment & { words?: WordTiming[] }
  >();
  const corrected = new Map<number, string>();

  return {
    event(event) {
      if (format === "json") {
        process.stdout.write(`${JSON.stringify(event)}\n`);
        return;
      }
      if (format === "srt" || format === "vtt") {
        if (event.type === "final") {
          finals.set(event.utterance, {
            ...event.segment,
            text: event.text,
            words: event.words,
          });
        } else if (event.type === "corrected") {
          corrected.set(event.utterance, event.text);
        } else if (event.type === "error") {
          logger.error(chalk.red(`Error: ${event.message}`));
        }
        return;
      }
      switch (event.type) {
        case "interim":
          if (tty) {
            live(
              chalk.gray(event.committed) +
                (event.committed && event.tail ? " " : "") +
                event.tail,
            );
          } else if (!argv.quiet) {
            process.stdout.write(
              `[interim ${event.utterance}] ${event.text}\n`,
            );
          }
          break;
        case "correcting":
          if (tty) {
            live(chalk.cyan(event.text));
          }
          break;
        case "final":
          clearLive();
          process.stdout.write(`${event.text}\n`);
          if (!argv.quiet && event.fallbackUsed) {
            process.stdout.write(
              chalk.gray(`  (fallback engine ${event.engine})\n`),
            );
          }
          break;
        case "corrected":
          clearLive();
          if (event.text !== event.raw) {
            process.stdout.write(
              `${chalk.cyan("  corrected:")} ${event.text}\n`,
            );
          }
          if (!argv.quiet && event.steps.length > 0) {
            process.stdout.write(chalk.gray(`  ${event.steps.join("; ")}\n`));
          }
          break;
        case "language":
          if (!argv.quiet) {
            clearLive();
            process.stdout.write(
              chalk.gray(
                `[language ${event.language}${event.detected ? " detected" : " unsure"}]\n`,
              ),
            );
          }
          break;
        case "silence":
          if (!argv.quiet) {
            clearLive();
            process.stdout.write(
              chalk.gray(
                `[utterance ${event.utterance}: ${event.seconds.toFixed(1)}s no engine could read]\n`,
              ),
            );
          }
          break;
        case "error":
          clearLive();
          logger.error(
            chalk.red(
              `Error${event.utterance !== undefined ? ` (utterance ${event.utterance})` : ""}: ${event.message}`,
            ),
          );
          break;
      }
    },
    finish() {
      clearLive();
      if (format === "srt" || format === "vtt") {
        const segments = [...finals.entries()]
          .sort(([a], [b]) => a - b)
          .map(([utterance, segment]) => ({
            ...segment,
            text: corrected.get(utterance) ?? segment.text,
          }));
        const cues = segments.flatMap((segment) =>
          buildCues(segment.text, [segment], segment.words, undefined),
        );
        process.stdout.write(renderSubtitles(cues, format));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export const transcribeCommand: CommandModule<object, CliTranscribeArgs> = {
  command: "transcribe <file>",
  describe:
    "Transcribe audio to text (local engine by default; dictionary, correction, fallback)",
  builder: (yargs: Argv) =>
    yargs
      .positional("file", {
        type: "string",
        describe: "Audio file to transcribe, or - to read it from stdin",
      })
      .option("provider", {
        type: "string",
        describe:
          "STT provider (default: NEUROLINK_STT_PROVIDER, then the first configured, then the local engine)",
      })
      .option("model", {
        type: "string",
        describe: "Model of the STT provider (default: NEUROLINK_STT_MODEL)",
      })
      .option("language", {
        type: "string",
        describe:
          "Language code, or auto to let the engine detect it (default: NEUROLINK_STT_LANGUAGE, else auto)",
      })
      .option("diarize", {
        type: "boolean",
        describe: "Label speakers (providers that support diarization)",
      })
      .option("word-timestamps", {
        type: "boolean",
        describe: "Request word-level timings",
      })
      .option("prompt", {
        type: "string",
        describe: "Context prompt for engines that bias on one",
      })
      .option("dictionary", {
        type: "string",
        describe:
          "JSON file holding an array of { term, heardAs, meaning } entries",
      })
      .option("term", {
        type: "string",
        array: true,
        nargs: 1,
        describe:
          'Inline dictionary entry "Term|heard,as|meaning" (repeatable)',
      })
      .option("correct", {
        type: "boolean",
        describe:
          "Run the correction layer (dictionary guard + LLM rewrite) on the transcript",
      })
      .option("rewrite-provider", {
        type: "string",
        describe: "Text provider for the correction rewrite",
      })
      .option("rewrite-model", {
        type: "string",
        describe: "Model for the correction rewrite",
      })
      .option("rewrite", {
        type: "boolean",
        describe:
          "LLM rewrite inside the correction layer (--no-rewrite keeps dictionary-only correction)",
      })
      .option("transliterate", {
        type: "string",
        choices: ["latin", "native"] as const,
        describe:
          "How Indic-script words are written: latin (as typed on phones) or native script",
      })
      .option("second-opinion", {
        type: "string",
        describe:
          "Second STT provider run on the same audio; the rewrite reconciles both",
      })
      .option("fallback", {
        type: "string",
        describe:
          "STT provider for audio the primary engine cannot read (unsure language or empty)",
      })
      .option("context", {
        type: "string",
        describe:
          "One sentence about who is talking and about what, for the engines and the guard",
      })
      .option("stream", {
        type: "boolean",
        describe:
          "Stream the file through transcribeStream (decoded to 16 kHz PCM16) and print live text",
      })
      .option("format", {
        type: "string",
        alias: ["f", "output-format"],
        describe: "Output format",
        choices: ["text", "json", "srt", "vtt"] as const,
        default: "text" as const,
      })
      .option("timeout", {
        type: "number",
        describe: "Whole-call timeout in milliseconds",
      })
      .option("quiet", {
        type: "boolean",
        alias: "q",
        default: false,
        describe: "Print only the text (no trail line, spinner or notes)",
      })
      .option("debug", {
        type: "boolean",
        alias: ["v", "verbose"],
        default: false,
        describe:
          "Enable debug logging (written to stderr when --format json is used)",
      })
      .example(
        "$0 transcribe meeting.wav",
        "Transcribe with the default engine",
      )
      .example(
        '$0 transcribe call.mp3 --term "Acme|akmee,ack me|the company name" --correct',
        "Repair a name the engine mis-hears",
      )
      .example(
        "$0 transcribe talk.wav --word-timestamps --format srt > talk.srt",
        "Write subtitles",
      )
      .example(
        "cat clip.wav | $0 transcribe - --stream",
        "Stream stdin and print live text",
      ) as Argv<CliTranscribeArgs>,

  handler: async (
    argv: ArgumentsCamelCase<CliTranscribeArgs>,
  ): Promise<void> => {
    const format = argv.format ?? "text";

    // --- Validate before any provider work ---------------------------------
    // yargs turns a lone `-` positional into "", so recover it from argv.
    const file =
      argv.file === "" && process.argv.includes("-") ? "-" : argv.file;
    if (!file) {
      fail("pass an audio file, or - to read from stdin.");
    }
    if (
      argv.timeout !== undefined &&
      !(Number.isFinite(argv.timeout) && argv.timeout > 0)
    ) {
      fail("--timeout must be a positive number of milliseconds.");
    }
    if (argv.rewrite === false && (argv.rewriteProvider || argv.rewriteModel)) {
      fail(
        "--no-rewrite cannot be combined with --rewrite-provider or --rewrite-model.",
      );
    }

    let dictionary: STTDictionaryEntry[] | undefined;
    try {
      dictionary = buildDictionary(argv);
    } catch (error) {
      fail(errorMessage(error));
    }

    let input: Awaited<ReturnType<typeof readAudio>>;
    try {
      input = await readAudio(file);
    } catch (error) {
      fail(`could not read audio — ${errorMessage(error)}`);
    }
    if (input.audio.length === 0) {
      fail(`${input.label} is empty.`);
    }

    const options = buildCommonOptions(argv, dictionary);
    const neurolink = new NeuroLink();

    // --- Stream mode -----------------------------------------------------
    if (argv.stream) {
      let pcm: Buffer;
      try {
        pcm = await decodeToPcm16(input.audio, input.format, input.label);
      } catch (error) {
        fail(errorMessage(error));
      }
      const sink = createCliTranscribeStreamSink(argv);
      let fatal: string | undefined;
      try {
        const events = neurolink.transcribeStream({
          ...options,
          audio: pcmFrames(pcm),
          streaming: { sampleRate: TARGET_SAMPLE_RATE },
        });
        for await (const event of events) {
          sink.event(event);
          if (event.type === "error" && !event.recoverable) {
            fatal = event.message;
          }
        }
      } catch (error) {
        sink.finish();
        await failWithProviders(error);
        return;
      }
      sink.finish();
      if (fatal !== undefined) {
        process.exit(1);
      }
      return;
    }

    // --- Batch mode ------------------------------------------------------
    const spinner =
      format === "text" && !argv.quiet && process.stderr.isTTY
        ? ora({ text: "Transcribing...", stream: process.stderr }).start()
        : null;

    let result: TranscribeResult;
    try {
      result = await neurolink.transcribe({
        ...options,
        audio: input.audio,
        ...(input.format ? { format: input.format } : {}),
      });
      spinner?.stop();
    } catch (error) {
      spinner?.fail("Transcription failed");
      await failWithProviders(error);
      return;
    }

    if (format === "json") {
      logger.always(JSON.stringify(result, null, 2));
      return;
    }
    if (format === "srt" || format === "vtt") {
      process.stdout.write(
        renderSubtitles(
          buildCues(
            result.text,
            result.segments,
            result.words,
            result.duration,
          ),
          format,
        ),
      );
      if (
        !argv.quiet &&
        result.corrected !== undefined &&
        (result.segments?.length ?? 0) > 1
      ) {
        logger.error(
          chalk.gray(
            "Note: subtitle cues carry the engine's timed text; the corrected text is in --format text or json.",
          ),
        );
      }
      return;
    }
    logger.always(result.text);
    if (!argv.quiet) {
      logger.always(chalk.gray(trailLine(result)));
    }
  },
};

/**
 * Create transcribe command factory for CLICommandFactory-style registration,
 * matching the DecideCommandFactory pattern.
 */
export class TranscribeCommandFactory {
  static createTranscribeCommand(): CommandModule {
    return transcribeCommand;
  }
}
