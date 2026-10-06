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
    | {
        provider?: string;
        model?: string;
        /** On expiry the un-rewritten text is kept. Default 12000. */
        timeoutMs?: number;
      };
  /**
   * How Indic-script text is written: `"latin"` the way people type on phones
   * (Hinglish / Tanglish — the default), `"native"` keeps the script. Never a translation.
   */
  transliterate?: "latin" | "native";
  /** Add punctuation and capitalization in the rewrite. Default true. */
  punctuate?: boolean;
  /**
   * A second engine run on the same audio; the rewrite reconciles both
   * transcripts (Indian-language words from an Indic engine, English words
   * from an English-oriented one).
   */
  secondOpinion?: { provider: string; model?: string };
  /** One sentence about who is talking and about what; sent to the engines and the guard. */
  context?: string;
  /** A rewrite that drops more than this share of the words is discarded. Default 0.25. */
  maxDropRatio?: number;
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
  streaming?: STTStreamingOptions;
  /** Whole-call timeout. */
  timeoutMs?: number;
  /** Per-call credentials; the `stt` slice reaches the handlers. */
  credentials?: STTCredentialsCarrier;
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
      /** An utterance no engine could read; its audio length is reported so nothing disappears silently. */
      type: "silence";
      utterance: number;
      seconds: number;
    }
  | {
      type: "error";
      utterance?: number;
      message: string;
      /** `true` when the stream continues with the next utterance. */
      recoverable: boolean;
    };

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
  status: "ok" | "timeout" | "error" | "empty" | "dropped";
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
