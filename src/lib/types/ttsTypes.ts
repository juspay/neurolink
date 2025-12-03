/**
 * Text-to-Speech (TTS) types for audio generation
 */

/**
 * Audio chunk representing a piece of synthesized speech
 */
export type TTSChunk = {
  /** Audio data in the specified encoding format */
  audio: Buffer;
  /** Whether this is the final chunk */
  complete: boolean;
  /** Optional metadata about the chunk */
  metadata?: {
    /** Size in bytes */
    size: number;
    /** Duration in seconds (if known) */
    duration?: number;
    /** Chunk sequence number */
    sequence?: number;
  };
};

/**
 * TTS audio encoding formats
 */
export type TTSEncoding = "MP3" | "WAV" | "OGG";

/**
 * Options for TTS synthesis
 */
export type TTSOptions = {
  /** Voice name (e.g., "en-US-Neural2-C") */
  voice: string;
  /** Audio encoding format (default: MP3) */
  encoding?: TTSEncoding;
  /** Speaking rate 0.25 to 4.0 (default: 1.0) */
  speakingRate?: number;
  /** Pitch adjustment -20.0 to 20.0 (default: 0.0) */
  pitch?: number;
  /** Language code (auto-detected from voice if not provided) */
  languageCode?: string;
};

/**
 * Result from non-streaming TTS synthesis
 */
export type TTSSynthesizeResult = {
  /** Generated audio buffer */
  audio: Buffer;
  /** Audio encoding format */
  encoding: TTSEncoding;
  /** Size in bytes */
  size: number;
  /** Duration in seconds (if known) */
  duration?: number;
};

/**
 * TTS handler interface for implementing different TTS providers
 */
export interface TTSHandler {
  /**
   * Synthesize text to speech (non-streaming)
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns Synthesized audio result
   */
  synthesize(text: string, options: TTSOptions): Promise<TTSSynthesizeResult>;

  /**
   * Synthesize text to speech with streaming (optional)
   * @param text - Text to synthesize
   * @param options - TTS options
   * @returns Async iterable of audio chunks
   */
  synthesizeStream?(text: string, options: TTSOptions): AsyncIterable<TTSChunk>;

  /**
   * Check if this handler supports streaming synthesis
   */
  supportsStreaming(): boolean;
}

/**
 * Error types for TTS operations
 */
export type TTSErrorType =
  | "INVALID_TEXT"
  | "TEXT_TOO_LONG"
  | "INVALID_VOICE"
  | "INVALID_RATE"
  | "INVALID_PITCH"
  | "INVALID_ENCODING"
  | "SYNTHESIS_FAILED"
  | "STREAMING_FAILED"
  | "HANDLER_ERROR"
  | "UNKNOWN_ERROR";

/**
 * TTS-specific error class
 */
export class TTSError extends Error {
  constructor(
    message: string,
    public readonly errorType: TTSErrorType,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TTSError";
  }
}
