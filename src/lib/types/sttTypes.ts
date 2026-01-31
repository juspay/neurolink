/**
 * Speech-to-Text (STT) Type Definitions for NeuroLink
 *
 * This module defines types for STT audio transcription and input processing.
 *
 * @module types/sttTypes
 */

/**
 * Supported audio formats for STT input
 */
export type STTAudioFormat =
  | "wav"
  | "mp3"
  | "m4a"
  | "flac"
  | "ogg"
  | "webm"
  | "mp4"
  | "mpeg"
  | "mpga";

/**
 * STT configuration options
 */
export type STTOptions = {
  /** Audio language code (e.g., "en-US") */
  language?: string;
  /** Audio format hint */
  format?: STTAudioFormat;
  /** Enable speaker diarization */
  diarization?: boolean;
  /** Number of speakers (for diarization) */
  speakerCount?: number;
  /** Enable word-level timestamps */
  wordTimestamps?: boolean;
  /** Enable punctuation */
  punctuate?: boolean;
  /** Custom vocabulary/keywords */
  keywords?: string[];
  /** Model variant (provider-specific) */
  model?: string;
  /** Profanity filter */
  profanityFilter?: boolean;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
};

/**
 * Word-level transcription detail
 */
export type TranscriptionWord = {
  /** Transcribed word */
  word: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Speaker ID (if diarization enabled) */
  speaker?: string;
};

/**
 * Transcription segment (sentence/phrase level)
 */
export type TranscriptionSegment = {
  /** Segment text */
  text: string;
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
  /** Confidence score (0-1) */
  confidence: number;
  /** Speaker ID (if diarization enabled) */
  speaker?: string;
  /** Word-level details */
  words?: TranscriptionWord[];
  /** Is this segment final (for streaming) */
  isFinal?: boolean;
};

/**
 * Complete STT result
 */
export type STTResult = {
  /** Full transcribed text */
  text: string;
  /** Detected/specified language */
  language: string;
  /** Transcription segments */
  segments: TranscriptionSegment[];
  /** Audio duration in seconds */
  duration: number;
  /** Overall confidence score */
  confidence: number;
  /** Processing metadata */
  metadata: {
    /** Processing time in ms */
    latency: number;
    /** Provider used */
    provider: string;
    /** Model used */
    model?: string;
    /** Speaker count (if diarization) */
    speakerCount?: number;
    /** Additional provider metadata */
    [key: string]: unknown;
  };
};

/**
 * STT error codes
 */
export const STT_ERROR_CODES = {
  EMPTY_AUDIO: "STT_EMPTY_AUDIO",
  INVALID_FORMAT: "STT_INVALID_FORMAT",
  AUDIO_TOO_LONG: "STT_AUDIO_TOO_LONG",
  PROVIDER_NOT_SUPPORTED: "STT_PROVIDER_NOT_SUPPORTED",
  PROVIDER_NOT_CONFIGURED: "STT_PROVIDER_NOT_CONFIGURED",
  TRANSCRIPTION_FAILED: "STT_TRANSCRIPTION_FAILED",
  UNSUPPORTED_LANGUAGE: "STT_UNSUPPORTED_LANGUAGE",
  STREAMING_NOT_SUPPORTED: "STT_STREAMING_NOT_SUPPORTED",
} as const;

/** Valid STT audio formats as an array for runtime validation */
export const VALID_STT_AUDIO_FORMATS: readonly STTAudioFormat[] = [
  "wav",
  "mp3",
  "m4a",
  "flac",
  "ogg",
  "webm",
  "mp4",
  "mpeg",
  "mpga",
];

/**
 * Type guard to check if an object is a STTResult
 */
export function isSTTResult(value: unknown): value is STTResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.text === "string" &&
    typeof obj.language === "string" &&
    Array.isArray(obj.segments) &&
    typeof obj.duration === "number" &&
    typeof obj.confidence === "number" &&
    typeof obj.metadata === "object"
  );
}

/**
 * Type guard to check if STTOptions are valid
 */
export function isValidSTTOptions(options: unknown): options is STTOptions {
  if (!options || typeof options !== "object") {
    return false;
  }
  const opts = options as STTOptions;
  if (opts.format !== undefined) {
    if (!VALID_STT_AUDIO_FORMATS.includes(opts.format)) {
      return false;
    }
  }
  if (opts.speakerCount !== undefined) {
    if (typeof opts.speakerCount !== "number" || opts.speakerCount < 1) {
      return false;
    }
  }
  return true;
}
