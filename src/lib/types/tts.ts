/**
 * Text-to-Speech (TTS) Type Definitions for NeuroLink
 *
 * This module defines types for TTS audio generation and output.
 *
 * @module types/ttsTypes
 */

/**
 * Supported audio formats for TTS output, STT input, and Realtime PCM streams.
 *
 * `pcm16` is included for the OpenAI Realtime PCM16 output stream — the chunk
 * is raw PCM, not a RIFF/WAV-headered file. Consumers must not pass `pcm16`
 * bytes to a WAV duration parser.
 */
export type TTSAudioFormat =
  | "mp3"
  | "wav"
  | "ogg"
  | "opus"
  | "m4a"
  | "flac"
  | "webm"
  | "mp4"
  | "mpeg"
  | "mpga"
  | "pcm16";

/**
 * TTS quality settings
 */
export type TTSQuality = "standard" | "hd";

/**
 * Known TTS provider identifiers shipped with NeuroLink.
 *
 * The `(string & {})` intersection keeps the union open for custom
 * provider names registered via `TTSProcessor.registerHandler()` while
 * still surfacing the built-in choices in editor autocomplete.
 */
export type TTSProviderName =
  | "google-ai"
  | "vertex"
  | "openai-tts"
  | "elevenlabs"
  | "elevenlabs-tts"
  | "azure-tts"
  | "fish-audio"
  | "cartesia"
  | (string & {});

/**
 * What `generate({ tts })` synthesizes.
 *
 * - `"direct"` — the input text / prompt itself, with no LLM call. This is
 *   the default, and what every documented "speak this text" caller relies
 *   on.
 * - `"response"` — the model's generated reply, after generation completes.
 *
 * `stream()` always synthesizes the streamed response and ignores this.
 */
export type TTSSynthesisMode = "direct" | "response";

/**
 * Options for {@link prepareTextForSpeech} — the optional cleanup pass that
 * turns model output (markdown, URLs, emoji) into text a TTS voice can read
 * aloud. Every default below is what `tts: { sanitize: true }` applies.
 */
export type SpeechSanitizeOptions = {
  /**
   * Strip markdown syntax: headings, emphasis, inline code, list bullets,
   * blockquotes, tables (kept as comma-separated rows), links and images
   * (kept as their text). Fenced code blocks follow `codeBlocks`.
   * @default true
   */
  markdown?: boolean;
  /**
   * How fenced code blocks are spoken. `"drop"` removes them entirely,
   * `"phrase"` replaces each block with `codeBlockPhrase`, `"keep"` strips
   * only the fence lines and reads the contents. Incremental `stream()`
   * synthesis always uses `"keep"`: a segment may hold an unterminated fence,
   * so the block's extent is unknowable per segment.
   * @default "phrase"
   */
  codeBlocks?: "drop" | "phrase" | "keep";
  /**
   * Spoken stand-in for a fenced code block when `codeBlocks` is `"phrase"`.
   * @default "Code block omitted."
   */
  codeBlockPhrase?: string;
  /**
   * How URLs are spoken. `"hostname"` reduces `https://docs.example.com/a/b`
   * to `docs.example.com`; `"remove"` drops the URL altogether.
   * @default "hostname"
   */
  urls?: "hostname" | "remove";
  /**
   * Remove emoji and pictographs (`\p{Extended_Pictographic}`,
   * `\p{Emoji_Presentation}`, plus modifiers and joiners).
   * @default true
   */
  emoji?: boolean;
};

/** {@link SpeechSanitizeOptions} with every default applied. */
export type ResolvedSpeechSanitizeOptions = Required<SpeechSanitizeOptions>;

/**
 * TTS configuration options
 */
export type TTSOptions = {
  /** Enable TTS output */
  enabled?: boolean;
  /**
   * What to synthesize: the input text (`"direct"`, the default) or the
   * model's reply (`"response"`). An explicit `mode` wins over the legacy
   * `useAiResponse` flag. Ignored by `stream()`, which always synthesizes the
   * streamed response.
   *
   * @example Speak the model's reply
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Tell me a joke" },
   *   tts: { enabled: true, mode: "response" },
   * });
   * ```
   */
  mode?: TTSSynthesisMode;
  /**
   * Use the AI-generated response for TTS instead of the input text
   *
   * This switch applies to non-streaming generation. `stream()` always
   * synthesizes the streamed AI response incrementally when TTS is enabled.
   *
   * When false or undefined (default): TTS will synthesize the input text/prompt directly without calling AI generation
   * When true: TTS will synthesize the AI-generated response after generation completes
   *
   * @default false
   * @deprecated Use `mode: "response"` / `mode: "direct"` instead. Still
   * honoured when `mode` is not set.
   *
   * @example Using input text directly (default)
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Hello world" },
   *   provider: "google-ai",
   *   tts: { enabled: true }  // or useAiResponse: false
   * });
   * // TTS synthesizes "Hello world" directly, no AI generation
   * ```
   *
   * @example Using AI response
   * ```typescript
   * const result = await neurolink.generate({
   *   input: { text: "Tell me a joke" },
   *   provider: "google-ai",
   *   tts: { enabled: true, useAiResponse: true }
   * });
   * // AI generates the joke, then TTS synthesizes the AI's response
   * ```
   */
  useAiResponse?: boolean;
  /**
   * Clean the text before it reaches the voice: strip markdown, reduce URLs
   * to their hostname, drop emoji. `true` applies the defaults of
   * {@link SpeechSanitizeOptions}; an object tunes them. Off by default so
   * existing callers get byte-identical synthesis input. In `stream()` the
   * pass runs per segment with fenced code kept (fence lines stripped).
   * @default false
   */
  sanitize?: boolean | SpeechSanitizeOptions;
  /**
   * Cancels synthesis. A handler that supports it (ElevenLabs) aborts the
   * request in flight and makes no further retry attempt once this fires.
   * `generate()` derives one from its own synthesis timeout and the caller's
   * `abortSignal`, so a handler's retry loop cannot outlive the call that
   * started it and issue a billable request nobody is waiting for.
   */
  signal?: AbortSignal;
  /** Voice identifier (e.g., "en-US-Neural2-C") */
  voice?: string;
  /** Audio format (default: mp3) */
  format?: TTSAudioFormat;
  /** Speaking rate 0.25-4.0 (default: 1.0) */
  speed?: number;
  /**
   * BCP-47 language tag (e.g. "en-US", "hi") for providers that accept one.
   * Provider-specific: ElevenLabs reduces it to the ISO 639-1 primary subtag
   * (`en-US` → `en`) and forwards it as `language_code` on every model except
   * `eleven_multilingual_v2`, which rejects the field; Cartesia maps it to
   * `language`.
   */
  language?: string;
  /** Voice pitch adjustment -20.0 to 20.0 semitones (default: 0.0) */
  pitch?: number;
  /** Volume gain in dB -96.0 to 16.0 (default: 0.0) */
  volumeGainDb?: number;
  /** Audio quality (default: standard) */
  quality?: TTSQuality;
  /** Output file path (optional) */
  output?: string;
  /** Auto-play audio after generation (default: false) */
  play?: boolean;
  /** Override TTS provider (e.g., "elevenlabs", "openai-tts", "azure-tts") */
  provider?: TTSProviderName;
  /**
   * Minimum buffered text length before incremental stream synthesis flushes
   * at a sentence boundary. The provider's maximum text length remains a hard
   * upper bound. Defaults to 120 characters.
   */
  streamingBufferSize?: number;
};

/**
 * Handler-level wall-clock knobs a provider option type may carry (today:
 * `ElevenLabsTTSOptions`). `generate()`'s outer synthesis timeout is raised to
 * at least `timeoutMs × (1 + retries)` plus backoff slack — with the handler
 * defaults (30 s, one retry) standing in for a knob the caller left unset —
 * so a handler's own retry loop is never cut short from outside.
 */
export type TTSHandlerTimeBudget = {
  /** Per-attempt request timeout in milliseconds (default 30 000; capped at 2³¹−1). */
  timeoutMs?: number;
  /** Retries after the first attempt (total attempts = 1 + retries). */
  retries?: number;
};

/**
 * TTS audio result returned from generation
 */
export type TTSResult = {
  /** Audio data as Buffer */
  buffer: Buffer;
  /** Audio format */
  format: TTSAudioFormat;
  /** Audio file size in bytes */
  size: number;
  /** Duration in seconds (if available) */
  duration?: number;
  /** Voice used for generation */
  voice?: string;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Performance and request metadata */
  metadata?: {
    /** Request latency in milliseconds */
    latency: number;
    /** Provider name */
    provider?: string;
    /** Additional provider-specific metadata */
    [key: string]: unknown;
  };
};

/**
 * Result of saving audio to file
 */
export type AudioSaveResult = {
  /** Whether the save was successful */
  success: boolean;
  /** Full path to the saved file */
  path: string;
  /** File size in bytes */
  size: number;
  /** Error message if failed */
  error?: string;
};

/** Allowed TTS voice types */
export type TTSVoiceType =
  | "standard"
  | "wavenet"
  | "neural"
  | "chirp"
  | "unknown";

/** Allowed genders for TTS voices */
export type TTSGender = "male" | "female" | "neutral";

// =============================================================================
// BACKWARD-COMPAT ALIASES (for SDK consumers from earlier releases)
// =============================================================================
//
// `release` shipped these types as `AudioFormat` / `VoiceType` / `Gender` —
// the voice PR added the `TTS` prefix per the domain-prefix rule. Re-export
// the old names so existing `import { AudioFormat } from "@juspay/neurolink"`
// keeps compiling. Marked @deprecated — drop in the next major version.

/** @deprecated Use `TTSAudioFormat` instead. */
export type AudioFormat = TTSAudioFormat;

/** @deprecated Use `TTSVoiceType` instead. */
export type VoiceType = TTSVoiceType;

/** @deprecated Use `TTSGender` instead. */
export type Gender = TTSGender;

/**
 * TTS voice information
 */
export type TTSVoice = {
  /** Voice identifier */
  id: string;
  /** Display name */
  name: string;
  /** Primary language code (e.g., "en-US") */
  languageCode: string;
  /** All supported language codes */
  languageCodes: string[];
  /** TTSGender */
  gender: TTSGender;
  /** Voice type */
  type?: TTSVoiceType;
  /** Voice description (optional) */
  description?: string;
  /** Natural sample rate in Hz (optional) */
  naturalSampleRateHertz?: number;
};

/** Valid audio formats as an array for runtime validation */
export const VALID_AUDIO_FORMATS: readonly TTSAudioFormat[] = [
  "mp3",
  "wav",
  "ogg",
  "opus",
  "m4a",
  "flac",
  "webm",
  "mp4",
  "mpeg",
  "mpga",
  "pcm16",
];

/** Valid TTS quality levels as an array for runtime validation */
export const VALID_TTS_QUALITIES: readonly TTSQuality[] = ["standard", "hd"];

/** Valid Google TTS audio formats */
export type GoogleAudioEncoding = "MP3" | "LINEAR16" | "OGG_OPUS";

/**
 * Audio encodings Google's *streaming* synthesis endpoint accepts.
 *
 * Deliberately a separate type from {@link GoogleAudioEncoding}: the
 * batch and streaming endpoints do not accept the same set. `MP3` and
 * `LINEAR16` are valid for batch and rejected by streaming with
 * `INVALID_ARGUMENT: Unsupported audio encoding`, while `PCM` — raw
 * 16-bit signed LE, headerless — exists only on the streaming side.
 */
export type GoogleStreamingAudioEncoding = "PCM" | "OGG_OPUS";

/**
 * Type guard to check if an object is a TTSResult
 */
export function isTTSResult(value: unknown): value is TTSResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    Buffer.isBuffer(obj.buffer) &&
    typeof obj.format === "string" &&
    VALID_AUDIO_FORMATS.includes(obj.format as TTSAudioFormat) &&
    typeof obj.size === "number" &&
    obj.size >= 0
  );
}

/**
 * Type guard to check if TTSOptions are valid
 */
export function isValidTTSOptions(options: unknown): options is TTSOptions {
  if (!options || typeof options !== "object") {
    return false;
  }
  const opts = options as TTSOptions;
  if (opts.speed !== undefined) {
    if (
      typeof opts.speed !== "number" ||
      opts.speed < 0.25 ||
      opts.speed > 4.0
    ) {
      return false;
    }
  }
  if (opts.format !== undefined) {
    if (!VALID_AUDIO_FORMATS.includes(opts.format)) {
      return false;
    }
  }
  if (opts.quality !== undefined) {
    if (!VALID_TTS_QUALITIES.includes(opts.quality)) {
      return false;
    }
  }
  if (opts.streamingBufferSize !== undefined) {
    if (
      !Number.isInteger(opts.streamingBufferSize) ||
      opts.streamingBufferSize < 1
    ) {
      return false;
    }
  }
  return true;
}

/**
 * TTS audio chunk for streaming Text-to-Speech output
 *
 * Represents a chunk of audio data generated during streaming TTS.
 * Used in StreamChunk type to deliver audio alongside text content.
 */
export type TTSChunk = {
  /** Audio data chunk as Buffer */
  data: Buffer;
  /** Audio format of this chunk */
  format: TTSAudioFormat;
  /** Chunk sequence number (0-indexed) */
  index: number;
  /** Whether this is the final audio chunk */
  isFinal: boolean;
  /** Cumulative audio size in bytes so far */
  cumulativeSize?: number;
  /** Estimated total duration in seconds (if available) */
  estimatedDuration?: number;
  /** Voice used for generation */
  voice?: string;
  /** Sample rate in Hz */
  sampleRate?: number;
};

/** Message envelope received from the Cartesia TTS WebSocket. */
export type CartesiaMessage = {
  data?: string;
  done?: boolean;
  error?: string;
};
