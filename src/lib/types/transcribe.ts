/**
 * `transcribe` — the fourth inference type, next to `generate`, `stream` and
 * `decide`. Turns audio into text through any registered STT handler, with the
 * optional layers that make self-hosted engines usable in production:
 *
 * - a dictionary of names and jargon, sent to the engine as context and used
 *   to repair mis-hearings after the fact;
 * - a decision-model guard (`tryDecide`) that asks, per dictionary candidate,
 *   whether the speaker meant the term or the literal word, so a name never
 *   rewrites the ordinary word it sounds like; fails open like every other
 *   `decide` consumer;
 * - an LLM rewrite (`generate`/`stream`) that fixes spelling and punctuation
 *   and writes Indic-script words in Latin letters the way people type
 *   (Hinglish, Tanglish …) without ever translating them;
 * - a second-opinion engine whose text the rewrite reconciles with the
 *   primary one, and a fallback engine for utterances the primary cannot read
 *   (an Indic model on English speech reports a low language score, or
 *   nothing at all);
 * - client-side streaming for batch engines: a chunked adapter with an energy
 *   gate, rolling re-transcription and LocalAgreement commits.
 *
 * Nothing in these layers may lose words: a rewrite that drops more than
 * `maxDropRatio` of them is discarded, a timed-out guard applies the dictionary
 * as is, and a final pass that returns less than the live text keeps the live
 * text.
 *
 * @module types/transcribe
 */

import type { ZodUnknownSchema } from "./aliases.js";
import type { TTSAudioFormat } from "./tts.js";
import type {
  STTHandler,
  STTOptions,
  STTResult,
  TranscriptionSegment,
  WordTiming,
} from "./stt.js";

// ============================================================================
// INPUT
// ============================================================================

/**
 * Audio for `transcribe()`: bytes, a path or `file://` / `http(s)://` URL, or
 * an async stream of PCM16LE frames (see `STTStreamingOptions.sampleRate`).
 */
export type TranscribeAudioInput =
  | Buffer
  | ArrayBuffer
  | Uint8Array
  | string
  | AsyncIterable<Buffer | Uint8Array>;

/** One dictionary entry: the correct spelling, how engines mis-hear it, and what it means. */
export type STTDictionaryEntry = {
  /** Correct spelling, written exactly like this in the output. */
  term: string;
  /** Mis-hearings, in any script ("jasper", "जसपे"). Each one found in a transcript becomes a candidate. */
  heardAs?: string[];
  /** Meaning or usage, given to the decision model and the rewrite model. */
  meaning?: string;
};

/** The correction layer that runs on a finished transcript (or each final utterance when streaming). */
export type STTCorrectionOptions = {
  /**
   * Default: on when a dictionary is given, or when this object is given at
   * all with `rewrite` not `false`; off otherwise.
   */
  enabled?: boolean;
  /**
   * Guard for dictionary substitutions. `"decide"` asks the decision provider
   * per candidate (term or literal?) and applies the dictionary as is when no
   * decision provider is configured or the call fails; `"none"` always applies it.
   */
  guard?: "decide" | "none";
  /** Timeout for the guard call; on expiry the dictionary is applied as is. Default 4000. */
  decideTimeoutMs?: number;
  /**
   * LLM rewrite: spelling, punctuation, dictionary terms, transliteration.
   * `false` disables it (dictionary-only correction). `provider`/`model` name
   * any text provider; the instance default is used when omitted.
   */
  rewrite?:
    | false
    | "auto"
    | {
        provider?: string;
        model?: string;
        /** On expiry the un-rewritten text is kept. Default 12000. */
        timeoutMs?: number;
        /** `"auto"` (the default) runs the rewrite only when there is something for it to do; `"always"` runs it on every text. */
        mode?: "auto" | "always";
      };
  /**
   * Correct a final utterance sentence by sentence (split on terminal
   * punctuation and the danda): each sentence decides its own script and
   * whether it needs the rewrite, and sentences are corrected in parallel.
   * Default true. A second opinion is whole-utterance and keeps one pass.
   */
  perSentence?: boolean;
  /**
   * How Indic-script text is written: `"latin"` the way people type on phones
   * (Hinglish / Tanglish), `"native"` keeps the script. Never a translation.
   * Unset, Indian languages default to `"latin"` and every other language
   * keeps its own script (Arabic, CJK, Cyrillic … are never romanized unless
   * asked for). For any other rendering of the text, see `output.languages`.
   */
  transliterate?: "latin" | "native";
  /** Add punctuation and capitalization in the rewrite. Default true. */
  punctuate?: boolean;
  /**
   * `"verbatim"` (the default) keeps every word, fillers and stutters
   * included. `"clean"` lets the rewrite remove fillers ("um", "like" as a
   * filler) and stutters ("they they they"), never content, and allows the
   * rewrite to drop up to half the words to do so.
   */
  cleanup?: "verbatim" | "clean";
  /**
   * A second engine run on the same audio; the rewrite reconciles both
   * transcripts (Indian-language words from an Indic engine, English words
   * from an English-oriented one). `"auto"` uses the `fallback` engine as the
   * second opinion on every utterance the primary leads, so code-mixed speech
   * gets both readings without naming a provider twice.
   */
  secondOpinion?: { provider: string; model?: string } | "auto";
  /** One sentence about who is talking and about what; sent to the engines and the guard. */
  context?: string;
  /** A rewrite that drops more than this share of the words is discarded. Default 0.25. */
  maxDropRatio?: number;
  /**
   * Corrected utterances before this one that the rewrite sees as read-only
   * context, so names, spellings and script stay consistent across a
   * conversation. Streaming and `chunking: "utterances"` only. Default 0
   * (off): a rewrite may copy context into its answer, which the added-words
   * guard rejects, so it is opt-in until measured.
   */
  contextUtterances?: number;
};

/**
 * Where an utterance goes when the primary engine cannot read it. `when`
 * defaults to `["unsure", "empty"]`: a low language-detection score, or no
 * text at all.
 */
export type STTFallbackOptions = {
  provider: string;
  model?: string;
  when?: Array<"unsure" | "empty" | "error">;
};

/**
 * How the engines share an utterance. With a `fallback` set, the default is
 * to probe: the first pass of every utterance runs the primary and the
 * fallback in parallel, and whichever reads the language leads from then on,
 * so a sentence in the "wrong" language never waits for the slow takeover.
 */
export type STTRoutingOptions = {
  /**
   * Streaming: run the fallback engine beside the primary on the first pass
   * of each utterance and lead with the one that reads the language.
   * Batch: ask the primary for a language verdict first (its
   * `languageProbeModel`, when it has one) and transcribe with the engine
   * that fits. Default: on whenever a fallback is set.
   */
  probe?: boolean;
  /** Streaming: passes both engines keep running before the utterance's engine locks. Default 2. */
  lockAfterPasses?: number;
  /** Carry the last confidently detected language into the next utterance's detection (`"carry"`, default) or start each utterance cold (`"none"`). */
  prior?: "carry" | "none";
  /**
   * Which engine transcribes which language: `{ hi: "indic", ta: "indic",
   * en: "spark", "*": "spark" }`. A final whose detected language belongs to
   * another engine than the one that produced it is transcribed again by
   * that engine, and its text is used when it reads the language. `"*"` is
   * the engine for every language not listed. Values are provider names.
   */
  engines?: Record<string, string>;
};

/** Client-side streaming for engines without a native stream (and tuning for the adapter). */
export type STTStreamingOptions = {
  /** `"auto"` uses the handler's native stream when it has one, else the chunked adapter. */
  mode?: "auto" | "native" | "chunked";
  /** Sample rate of the incoming PCM16LE frames. Default 16000. */
  sampleRate?: number;
  /** Silence that ends an utterance. Default 750. */
  endSilenceMs?: number;
  /** Cadence of interim passes on the current utterance. Default 900. */
  intervalMs?: number;
  /** After this many seconds a turn ends at the next short pause. Default 16. */
  softCutSeconds?: number;
  /** Hard cut at the quietest recent block, remainder carried over. Default 28. */
  maxUtteranceSeconds?: number;
  /** Absolute RMS floor for speech onset. Default 0.006. */
  onsetRms?: number;
  /** Audio kept before the detected onset. Default 350. */
  prerollMs?: number;
  /** Shortest utterance worth a pass. Default 250. */
  minSpeechMs?: number;
  /**
   * Engine passes allowed in flight at once. Live streaming keeps 1 (the
   * default), so a caption never shows a stale pass; the file path
   * (`chunking: "utterances"`) raises it so utterances are transcribed and
   * corrected in parallel.
   */
  concurrency?: number;
  /**
   * Times a failed final pass is tried again before the utterance is
   * reported as silence. Live streaming keeps 0 (a stale retry would delay
   * the next utterance); the file path uses 1.
   */
  finalRetries?: number;
  /** Which speech detector finds utterances, and its thresholds. Default: Silero when it loads, else the energy gate. */
  vad?: STTVadOptions;
  /**
   * Raise quiet utterances to a speech level before an engine hears them
   * (gain only goes up, capped at 8×, peaks limited). Far-field and
   * low-gain microphones are the usual case. Default true.
   */
  normalize?: boolean;
};

/**
 * The detector that decides where utterances start and end in a chunked
 * stream. `"silero"` is the Silero VAD model (a 2.3 MB ONNX file shipped
 * with the package, run through the optional `onnxruntime-node`); `"energy"`
 * is the RMS gate with a noise-floor estimate; `"auto"` (the default) is
 * Silero when its model and runtime load and the energy gate otherwise.
 * `NEUROLINK_STT_VAD` sets the default.
 */
export type STTVadEngine = "auto" | "silero" | "energy";

/** Speech-detector choice and tuning (`streaming.vad`). */
export type STTVadOptions = {
  engine?: STTVadEngine;
  /** Speech probability at or above which an utterance may open. Default 0.6. */
  onset?: number;
  /** Probability at or above which an open utterance counts a block as speech. Default 0.35. */
  sustain?: number;
  /**
   * Consecutive milliseconds at or above `onset` before an utterance opens,
   * so a click or a cough does not. Default 120; the pre-roll keeps the
   * confirmation audio, so nothing is clipped.
   */
  startMs?: number;
  /** Directory holding `silero_vad.onnx`. Default: `NEUROLINK_VAD_DIR`, `NEUROLINK_MODEL_DIR/silero-vad`, the package's own copy, then `~/.neurolink/models/silero-vad`. */
  modelDir?: string;
  /** Whether a missing model file may be downloaded (`NEUROLINK_VAD_AUTO_DOWNLOAD`). Default true. */
  autoDownload?: boolean;
};

/**
 * A frame-level speech detector: `frameSamples` of 16 kHz mono float audio
 * in, the probability that the frame is speech out. It keeps state across
 * calls (`reset()` starts a new stream), and one instance serves one stream.
 */
export type STTSpeechDetector = {
  /** Name reported on events (`vad`): `"silero"`, or whatever a caller's own detector calls itself. */
  readonly name: string;
  /** Samples per `score()` call at 16 kHz (Silero: 512, 32 ms). */
  readonly frameSamples: number;
  score(frame16k: Float32Array): Promise<number> | number;
  reset(): void;
};

/**
 * The slice of onnxruntime-node's API the Silero detector uses, typed here
 * so a typecheck does not need the optional dependency installed.
 */
export type STTOnnxTensor = {
  readonly data: Float32Array | BigInt64Array;
  readonly dims: readonly number[];
};
export type STTOnnxSession = {
  run(
    feeds: Record<string, STTOnnxTensor>,
  ): Promise<Record<string, STTOnnxTensor>>;
};
export type STTOnnxRuntime = {
  InferenceSession: {
    create(
      path: string,
      options?: Record<string, unknown>,
    ): Promise<STTOnnxSession>;
  };
  Tensor: new (
    type: "float32" | "int64",
    data: Float32Array | BigInt64Array,
    dims: readonly number[],
  ) => STTOnnxTensor;
};

/**
 * Options for `neurolink.transcribe()`. `provider` defaults to
 * `NEUROLINK_STT_PROVIDER`, then the first configured STT provider in
 * descriptor order, then the built-in local engine (Whistle), which needs no
 * credentials. `language` omitted or `"auto"` lets the engine detect it.
 */
export type TranscribeOptions = Omit<
  STTOptions,
  "enabled" | "provider" | "language" | "model" | "format"
> & {
  audio: TranscribeAudioInput;
  provider?: string;
  model?: string;
  /** ISO / BCP-47 code, or `"auto"` (the default) to let the engine detect. */
  language?: string;
  /** Audio container of a buffer input; inferred from a path or URL. */
  format?: TTSAudioFormat;
  /** Context prompt for engines that bias on one (Whisper, Qwen3-ASR …). Dictionary terms are appended. */
  prompt?: string;
  dictionary?: STTDictionaryEntry[];
  correction?: STTCorrectionOptions;
  fallback?: STTFallbackOptions;
  routing?: STTRoutingOptions;
  streaming?: STTStreamingOptions;
  /**
   * How a recording is cut. `"engine"` (the default) hands the whole file to
   * the engine in one request. `"utterances"` runs the recording through the
   * same pipeline as live captions: the endpointer cuts it into utterances,
   * each utterance gets the language probe, its own engine choice, the
   * dictionary and the per-sentence correction, several utterances at a
   * time, and the result carries one segment per utterance with its
   * language and engine. Needs WAV, or ffmpeg for other containers.
   */
  chunking?: "engine" | "utterances";
  /** Whole-call timeout. */
  timeoutMs?: number;
  /** Per-call credentials; the `stt` slice reaches the handlers. */
  credentials?: STTCredentialsCarrier;
  /** Renderings of the transcript in other languages or scripts (see `STTOutputOptions`). */
  output?: STTOutputOptions;
};

// ============================================================================
// OUTPUT LANGUAGES
// ============================================================================

/** A live list of output languages, read once per utterance (a session's subscribers, a socket's control frames). */
export type STTOutputLanguageSource = { current(): readonly string[] };

/**
 * Renderings of every utterance in other languages and scripts. Each entry
 * of `languages` is a BCP-47 tag: `"es"`, `"fr-CA"`, `"ta"` translate;
 * `"hi-Latn"` is Hindi written in Latin letters (romanized when Hindi was
 * spoken, translated into Hinglish when something else was); `"source"` is
 * the transcript itself. One model call renders all of them, from the
 * native-script transcript and its corrected form, with earlier utterances
 * as context. A rendering never touches `text`: a failed one is reported with
 * its status and the transcript is unchanged.
 */
export type STTOutputOptions = {
  languages: readonly string[] | STTOutputLanguageSource;
  /** Text provider for the rendering; default `NEUROLINK_STT_OUTPUT_PROVIDER`, then the rewrite's. */
  provider?: string;
  /** Default `NEUROLINK_STT_OUTPUT_MODEL`, then the rewrite's. */
  model?: string;
  /** Per call; on expiry the rendering is reported as `"timeout"`. Default 15000. */
  timeoutMs?: number;
  /** Earlier utterances (and their renderings) given as context. Default 3; 0 turns it off. */
  contextUtterances?: number;
  /** Keep dictionary terms exactly as written in every language. Default true. */
  glossary?: boolean;
};

export type STTOutputStatus =
  /** Rendered by the model and accepted by the guards. */
  | "ok"
  /** The target is the transcript's own language and script: the corrected text, no model call. */
  | "same-language"
  | "timeout"
  | "error"
  /** The model answered, and the guards refused it (empty, wrong script, untranslated). */
  | "rejected"
  /** A long transcript where some batches rendered and others did not. */
  | "partial";

/** The transcript in one output language. `text` is empty unless the status is `ok`, `same-language` or `partial`. */
export type STTOutputRendering = {
  language: string;
  text: string;
  status: STTOutputStatus;
  ms: number;
  /** Per segment (or utterance), in order, when the transcript has more than one. */
  segments?: Array<{ index: number; text: string }>;
  /** Why a rendering was refused or failed. */
  reason?: string;
};

/** One rendering request: lines of one transcript and the targets they go to. */
export type STTOutputRenderInput = {
  /** The text as the engine wrote it (native script, dictionary applied), one entry per line. */
  source: readonly string[];
  /** The corrected text of the same lines, when correction changed it. */
  corrected?: readonly string[];
  /** Detected language of the speech, when known. */
  language?: string;
  languages: readonly string[];
  /** Earlier lines, oldest first, with their renderings per target. */
  previous?: ReadonlyArray<{ text: string; outputs: Record<string, string> }>;
  dictionary?: readonly STTDictionaryEntry[];
  options?: Omit<STTOutputOptions, "languages">;
};

/** What one rendering request produced for one target. */
export type STTOutputBatchOutcome = {
  lines?: string[];
  status: STTOutputStatus;
  reason?: string;
};

/** One aligned position of two readings: a word from either side, or both when they line up. */
export type STTWordPair = {
  /** The Indic engine's word (native script). */
  indic?: string;
  /** The English-oriented engine's word. */
  latin?: string;
  /** Both present and phonetically alike: the speaker said the same thing in both readings. */
  alike: boolean;
};

/** How two readings of one utterance relate (see `analyzeCodeMix`). */
export type STTCodeMixAnalysis = {
  /** Share of the Indic reading's words with a phonetic partner in the English reading (0–1). */
  englishShare: number;
  /** Words in the Indic reading. */
  words: number;
  pairs: STTWordPair[];
};

/** ISO 15924 scripts the output guards recognise. */
export type ScriptCode =
  | "Latn"
  | "Deva"
  | "Beng"
  | "Guru"
  | "Gujr"
  | "Orya"
  | "Taml"
  | "Telu"
  | "Knda"
  | "Mlym"
  | "Sinh"
  | "Arab"
  | "Cyrl"
  | "Grek"
  | "Hebr"
  | "Thai"
  | "Hang"
  | "Jpan"
  | "Hani"
  | "Geor"
  | "Armn"
  | "Ethi";

/** One output target, parsed: `"hi-Latn"` → `{ language: "hi", script: "Latn" }`. */
export type ParsedOutputTag = {
  tag: string;
  language: string;
  /** The script the text must be written in: the subtag, else the language's own. */
  script: ScriptCode;
  /** True when the tag names a script (`hi-Latn`), not just a language. */
  explicitScript: boolean;
};

// ============================================================================
// SESSIONS (one call, several speakers, listeners in their own languages)
// ============================================================================

export type TranscriptionSessionOptions = {
  id?: string;
  /** Utterances kept for listeners who join late. Default 50. */
  backlog?: number;
  /** Distinct output languages a session renders at once. Default 8. */
  maxLanguages?: number;
  /** Rendering settings shared by every speaker; the languages come from the listeners. */
  output?: Omit<STTOutputOptions, "languages">;
};

/** A stream event from one speaker of a session. */
export type TranscriptionSessionEvent = TranscribeStreamEvent & {
  speaker: string;
};

export type TranscriptionSubscriberOptions = {
  /** Output languages this listener reads. Empty: the transcript only. */
  languages?: readonly string[];
  /** Speakers to follow; omitted, every speaker. */
  speakers?: readonly string[];
  /** Replay the backlog on subscribe. Default true. */
  backlog?: boolean;
  /** Also deliver `interim` captions. Default true. */
  interim?: boolean;
};

export type TranscriptionSubscription = {
  readonly languages: readonly string[];
  update(
    options: Pick<TranscriptionSubscriberOptions, "languages" | "speakers">,
  ): void;
  close(): void;
};

/** `transcribeStream()` takes frames instead of a whole buffer. */
export type TranscribeStreamOptions = Omit<TranscribeOptions, "audio"> & {
  audio: AsyncIterable<Buffer | Uint8Array>;
};

/**
 * Only the `stt` slice is read here; it is typed loosely so this file does
 * not have to import `NeurolinkCredentials` (which imports this file).
 */
export type STTCredentialsCarrier = { stt?: STTCredentials };

// ============================================================================
// RESULTS
// ============================================================================

/** What the decision model answered for one dictionary candidate. */
export type STTDecisionRecord = {
  /** The mis-hearing found in the transcript. */
  heard: string;
  /** The dictionary term it may stand for. */
  term: string;
  choice: "term" | "literal";
  /** Probability of the chosen reading, when the guard ran. */
  probability?: number;
  confidence?: number;
  /** Why no decision was made ("decision model unavailable", "guard off", …). */
  note?: string;
};

/** One candidate language and its engine-specific score (higher is better; scale is the engine's). */
export type STTLanguageScore = { language: string; score: number };

/** Which engines produced the result. */
export type STTEngineInfo = {
  provider: string;
  model?: string;
  /** The fallback engine took the whole request (or an utterance, when streaming). */
  fallbackUsed?: boolean;
  /** The second-opinion engine that was reconciled into the text. */
  secondOpinion?: string;
};

export type TranscribeTimings = {
  transcribeMs: number;
  secondOpinionMs?: number;
  decideMs?: number;
  rewriteMs?: number;
  correctionMs?: number;
  /** Rendering into the output languages. */
  outputMs?: number;
  totalMs: number;
};

/** The result of `transcribe()`: an `STTResult` plus what the layers did to it. */
export type TranscribeResult = STTResult & {
  /** Engine text before any correction. */
  raw: string;
  /** Present when the correction changed the text; `text` then holds the corrected version. */
  corrected?: string;
  /** `false` when the engine reported a low language-detection score. */
  languageDetected?: boolean;
  languageScores?: STTLanguageScore[];
  decisions?: STTDecisionRecord[];
  engine: STTEngineInfo;
  timings: TranscribeTimings;
  /** Human-readable trail of what happened ("dictionary 2/2", "rewrite timed out · kept text"). */
  steps: string[];
  /** One rendering per `output.languages` entry, keyed by the tag as given. */
  outputs?: Record<string, STTOutputRendering>;
};

// ============================================================================
// STREAM EVENTS
// ============================================================================

export type TranscribeStreamEvent =
  | {
      type: "interim";
      utterance: number;
      /** Full current text of the utterance. */
      text: string;
      /** Prefix two consecutive passes agreed on (LocalAgreement). */
      committed: string;
      /** The rest, still subject to change. */
      tail: string;
      seconds: number;
      latencyMs: number;
      engine: string;
    }
  | {
      type: "language";
      utterance: number;
      language: string;
      detected: boolean;
      scores?: STTLanguageScore[];
    }
  | {
      type: "final";
      utterance: number;
      text: string;
      segment: TranscriptionSegment;
      words?: WordTiming[];
      language?: string;
      languageDetected?: boolean;
      engine: string;
      fallbackUsed?: boolean;
      seconds: number;
      /** The detector that found this utterance: `"silero"`, `"energy"`, or a caller's own. */
      vad?: string;
      /** Seconds the detector counted as speech inside the utterance. */
      speechSeconds?: number;
      /**
       * The other engine's reading of the same utterance, when the two
       * disagreed on its language and the final ran both: code-mixed speech
       * is reconciled from both readings (`secondOpinion: "auto"`).
       */
      alternative?: { engine: string; text: string };
    }
  | {
      /** Partial text of the streamed rewrite, in order. */
      type: "correcting";
      utterance: number;
      text: string;
    }
  | {
      type: "corrected";
      utterance: number;
      raw: string;
      text: string;
      decisions: STTDecisionRecord[];
      steps: string[];
      timings: TranscribeTimings;
    }
  | {
      /**
       * The utterance in one output language. Follows `corrected` when
       * correction runs (`basedOn: "corrected"`), else the `final`.
       */
      type: "output";
      utterance: number;
      language: string;
      text: string;
      status: STTOutputStatus;
      basedOn: "final" | "corrected";
      ms: number;
      reason?: string;
    }
  | {
      /** An utterance no engine could read; its audio length is reported so nothing disappears silently. */
      type: "silence";
      utterance: number;
      seconds: number;
      vad?: string;
      speechSeconds?: number;
    }
  | {
      type: "error";
      utterance?: number;
      message: string;
      /** `true` when the stream continues with the next utterance. */
      recoverable: boolean;
    };

/** The `final` event of a stream, as a named type for code that collects them. */
export type TranscribeStreamFinalEvent = Extract<
  TranscribeStreamEvent,
  { type: "final" }
>;
/** The `corrected` event of a stream. */
export type TranscribeStreamCorrectedEvent = Extract<
  TranscribeStreamEvent,
  { type: "corrected" }
>;
/** The `output` event of a stream. */
export type TranscribeStreamOutputEvent = Extract<
  TranscribeStreamEvent,
  { type: "output" }
>;

// ============================================================================
// PROVIDERS, CREDENTIALS, DESCRIPTORS
// ============================================================================

/**
 * One OpenAI-compatible `/audio/transcriptions` endpoint registered under a
 * name of its own, so several self-hosted engines can be told apart — and
 * used as each other's `fallback` or `secondOpinion`. `model` is the default
 * `model` field sent to it.
 */
export type STTEndpointConfig = {
  baseURL: string;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  /**
   * How this server takes a language prior in its `language` field, as a
   * template with `{lang}` (the IndicConformer wrapper: `"auto-{lang}"`).
   * Unset, no prior is ever sent: a server that does not understand one
   * would refuse the request.
   */
  priorLanguageForm?: string;
  /** A model name this server runs in language-identification-only mode (see `STTHandler.languageProbeModel`). */
  lidModel?: string;
  /**
   * Whether the dictionary terms travel to this server as a "Names and
   * terms used: …" prompt. Whisper biases on it; Qwen3-ASR and most others
   * ignore it and some echo it back on a pause. Default `true`; set `false`
   * for a server that echoes it.
   */
  vocabularyPrompt?: boolean;
};

/** Credential slices for STT handlers; `credentials.stt.<key>` beats the env var. */
export type STTCredentials = {
  /** Any OpenAI-compatible `/audio/transcriptions` endpoint (OpenAI, vLLM, LiteLLM, self-hosted wrappers). */
  whisper?: {
    apiKey?: string;
    baseURL?: string;
    timeoutMs?: number;
    /** Default model name sent to the endpoint (`whisper-1` when omitted). */
    model?: string;
    /** See `STTEndpointConfig.priorLanguageForm`. Env: `OPENAI_STT_PRIOR_LANGUAGE_FORM`. */
    priorLanguageForm?: string;
    /** See `STTEndpointConfig.lidModel`. Env: `OPENAI_STT_LID_MODEL`. */
    lidModel?: string;
    /** See `STTEndpointConfig.vocabularyPrompt`. Env: `OPENAI_STT_VOCABULARY_PROMPT`. */
    vocabularyPrompt?: boolean;
  };
  /**
   * Extra OpenAI-compatible endpoints, each registered as a provider under
   * its key (`stt.endpoints.indic` → `provider: "indic"`). The env form is
   * `NEUROLINK_STT_ENDPOINTS`, a JSON object of the same shape. A key that
   * collides with a shipped provider name or alias is ignored with a warning.
   */
  endpoints?: Record<string, STTEndpointConfig>;
  deepgram?: { apiKey?: string; baseURL?: string };
  elevenlabs?: { apiKey?: string; baseURL?: string; timeoutMs?: number };
  google?: { apiKey?: string; credentialsPath?: string };
  azure?: { apiKey?: string; region?: string };
  /** The built-in local engine: where its files live and whether they may be fetched. */
  whistle?: { modelDir?: string; autoDownload?: boolean };
};

export type STTProviderCapabilities = {
  /** `"native"`: the handler streams itself; `"chunked"`: the adapter streams a batch handler. */
  streaming: "native" | "chunked";
  diarization: boolean;
  /** The engine reports a detected language (and, where it can, a confidence). */
  languageDetect: boolean;
  /** Accepts a context prompt for biasing. */
  prompt: boolean;
  wordTimestamps: boolean;
  /** Runs on this machine; needs no key. */
  local: boolean;
  /** Languages the engine supports when it is not open-ended. */
  languages?: readonly string[];
};

/**
 * Metadata for one STT provider — the single source of truth for its name,
 * aliases, credentials, env vars and capabilities. Order in the list is
 * precedence for the default provider, exactly as with decision providers.
 */
export type STTProviderDescriptor = {
  name: string;
  aliases?: readonly string[];
  label: string;
  credentialsKey: keyof STTCredentials;
  /** Env vars that configure it; the first present one makes it "configured". */
  envVars: readonly string[];
  baseUrlEnv?: string;
  defaultModel?: string;
  capabilities: STTProviderCapabilities;
};

/**
 * What the correction layer needs from the SDK, injected by `NeuroLink` so the
 * layer itself stays free of provider plumbing and can be exercised with
 * stand-ins. `decide` is `tryDecide` (returns `null` on any failure);
 * `rewrite` streams the text so far (cumulative, not deltas) through `onPartial`
 * when the caller wants it.
 */
export type STTCorrectionDeps = {
  decide: (opts: {
    state: Record<string, unknown>;
    questions: Record<string, unknown>;
    timeoutMs?: number;
  }) => Promise<{ answers: Record<string, unknown> } | null>;
  rewrite: (opts: {
    system: string;
    user: string;
    provider?: string;
    model?: string;
    maxTokens: number;
    timeoutMs: number;
    onPartial?: (text: string) => void;
  }) => Promise<string>;
  /**
   * A structured text call for output rendering: the parsed object the
   * schema describes. Absent, renderings report `"error"`.
   */
  render?: (opts: {
    system: string;
    user: string;
    schema: ZodUnknownSchema;
    provider?: string;
    model?: string;
    maxTokens: number;
    timeoutMs: number;
  }) => Promise<unknown>;
};

/** Input to the correction layer, independent of where the text came from. */
export type STTCorrectionInput = {
  text: string;
  /** Second-opinion transcript of the same audio, when one exists. */
  secondOpinion?: string;
  dictionary?: STTDictionaryEntry[];
  options?: STTCorrectionOptions;
  /** `false` when the primary engine reported a low language score: the second opinion then leads. */
  languageDetected?: boolean;
  /** Detected language of the speech; picks the rewrite's rules and script default. */
  language?: string;
  /** Corrected utterances before this one, oldest first: read-only context for the rewrite. */
  previous?: readonly string[];
  onPartial?: (text: string) => void;
};

/** A dictionary alias found in a transcript: a candidate substitution for the guard to judge. */
export type STTDictionaryCandidate = {
  entry: STTDictionaryEntry;
  /** The alias as written in the dictionary (its match in the text may differ in case). */
  heard: string;
};

/** What one rewrite call did; `text` is always usable (the input when the rewrite was not kept). */
export type STTRewriteOutcome = {
  text: string;
  status: "ok" | "timeout" | "error" | "empty" | "dropped" | "added";
  ms: number;
  /** Share of words the rewrite dropped, when `status` is `"dropped"`. */
  dropRatio?: number;
  /** Message of the error, when `status` is `"error"`. */
  error?: string;
};

/** What a batched line rewrite did; `lines` has exactly as many entries as the input. */
export type STTRewriteLinesOutcome = {
  lines: string[];
  /** Batches whose output was used, of all batches sent. */
  batchesOk: number;
  batches: number;
  /** Lines whose rewrite was discarded for dropping words. */
  linesKept: number;
  ms: number;
};

export type STTCorrectionOutput = {
  text: string;
  decisions: STTDecisionRecord[];
  steps: string[];
  timings: Pick<TranscribeTimings, "decideMs" | "rewriteMs" | "correctionMs">;
};

/**
 * Everything the transcribe orchestration (batch and stream) needs from the
 * SDK, bound by `NeuroLink` so the orchestration modules stay testable.
 */
export type TranscribeDeps = STTCorrectionDeps & {
  /** `STTProcessor.transcribe` with the request's credentials already applied. */
  transcribe: (
    audio: Buffer,
    provider: string,
    options: STTOptions,
  ) => Promise<STTResult>;
  /** Resolves `undefined`, `""` or an alias to a registered provider name, or throws a typed error. */
  resolveProvider: (name?: string) => string;
  getHandler: (name: string) => STTHandler | undefined;
};

// ============================================================================
// CHUNKED STREAMING ADAPTER (internal building blocks of transcribeStream)
// ============================================================================

/** Resolved endpointer tuning: `STTStreamingOptions` with every default applied, plus the input rate. */
export type STTEndpointerConfig = {
  /** Sample rate of the samples given to `push()`. */
  inputRate: number;
  endSilenceMs: number;
  softCutSeconds: number;
  maxUtteranceSeconds: number;
  onsetRms: number;
  prerollMs: number;
  minSpeechMs: number;
};

/**
 * A speech detector's verdicts as the endpointer reads them: the thresholds
 * and a lookup of the probability at a point on the stream clock. Attached,
 * it replaces the RMS rules; the energy gate stays as the fallback.
 */
export type STTEndpointerSpeechConfig = {
  onset: number;
  sustain: number;
  startMs: number;
  /** Speech probability of the frame covering `seconds`; `undefined` before the first scored frame. */
  probabilityAt(seconds: number): number | undefined;
};

/** One block waiting in the endpointer's pre-roll: its samples, RMS and speech probability. */
export type STTEndpointerPreBlock = {
  block: Float32Array;
  rms: number;
  speech: number;
};

/** One utterance as the energy gate builds it, at the input rate. */
export type STTEndpointerUtterance = {
  /** 1-based, in order of onset. A dropped cough consumes an id, so ids can skip. */
  id: number;
  /** Offset of the first sample (pre-roll included) from the start of the stream. */
  startSeconds: number;
  /** 20 ms blocks, pre-roll included. */
  blocks: Float32Array[];
  /** RMS of each block, parallel to `blocks`. */
  rms: number[];
  /** Speech probability of each block, parallel to `blocks`, when a detector is attached. */
  speech?: number[];
  /** Total samples in `blocks`. */
  length: number;
  speechMs: number;
  silenceMs: number;
  /** Set by the caller once a pass produced words: such an utterance is never dropped as a cough. */
  heard: boolean;
};

export type STTEndpointerEvent =
  | { type: "start"; utterance: STTEndpointerUtterance }
  | {
      type: "end";
      utterance: STTEndpointerUtterance;
      reason: "silence" | "softCut" | "hardCut" | "flush";
    }
  /** Too little speech and nothing heard: a cough or a click. */
  | { type: "drop"; utterance: STTEndpointerUtterance };

/** LocalAgreement bookkeeping for one utterance. */
export type STTLocalAgreementState = {
  /** Words of the previous pass. */
  prevWords: string[];
  /** The committed words themselves; a later pass never rewrites them. */
  committedWords: string[];
  /** `committedWords.length`; never shrinks while the state lives. */
  committedN: number;
};

export type STTLocalAgreementUpdate = {
  words: string[];
  committed: string;
  tail: string;
};

/** Which engine of the adapter a pass runs on; the orchestration maps roles to providers. */
export type STTStreamEngineRole = "primary" | "fallback";

/** What the adapter tells `run` about a pass. */
export type STTChunkedPassOptions = {
  utterance: number;
  final: boolean;
  engine: STTStreamEngineRole;
  /** Audio length of the utterance so far. */
  seconds: number;
  /** The last confidently detected language of this stream, for engines that take a prior. */
  languagePrior?: string;
  /**
   * Transcribe in this language rather than detecting one: set on the
   * fallback role once the utterance (or the stream) is settled as that
   * language, so a short pass cannot drift into another script.
   */
  languageHint?: string;
};

/** One engine pass over a whole utterance, 16 kHz mono float samples in. */
export type STTChunkedRun = (
  pcm16k: Float32Array,
  options: STTChunkedPassOptions,
) => Promise<STTResult>;

/** Options of `chunkedTranscribeStream`: the streaming tuning plus engine labels and hooks. */
export type STTChunkedStreamOptions = STTStreamingOptions & {
  /** Label of the primary engine in events. Default "primary". */
  engineLabel?: string;
  /** Language takeover: hand an utterance the primary cannot read to the `fallback` role. */
  fallback?: { label: string; when?: STTFallbackOptions["when"] };
  /** Probe, lock and prior behaviour (see `STTRoutingOptions`); the defaults apply when omitted. */
  routing?: STTRoutingOptions;
  /**
   * A speech detector of the caller's own, used instead of what `vad`
   * would load; `null` keeps the energy gate. Omitted, `vad` decides.
   */
  speechDetector?: STTSpeechDetector | null;
  /**
   * Called once per utterance, synchronously, when it ends and before its
   * final pass is queued, with the utterance audio at 16 kHz and the role
   * that will run the final — so a second opinion can run in parallel.
   */
  onUtteranceEnd?: (
    pcm16k: Float32Array,
    utterance: number,
    engine: STTStreamEngineRole,
  ) => void;
};
