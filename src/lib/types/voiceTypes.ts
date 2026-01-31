/**
 * Unified Voice Type Definitions for NeuroLink
 *
 * This module provides unified types for all voice capabilities including
 * TTS, STT, and Realtime voice communication.
 *
 * @module types/voiceTypes
 */

export * from "./realtimeTypes.js";
export * from "./sttTypes.js";
// Re-export all voice-related types
export * from "./ttsTypes.js";

import type { RealtimeConfig, RealtimeSession } from "./realtimeTypes.js";
import type {
  STTOptions,
  STTResult,
  TranscriptionSegment,
} from "./sttTypes.js";
import type { TTSOptions, TTSResult, TTSVoice } from "./ttsTypes.js";

/**
 * Voice capability types supported by providers
 */
export type VoiceCapability = "tts" | "stt" | "realtime" | "streaming";

/**
 * Voice provider name union type
 */
export type VoiceProviderName =
  // TTS providers
  | "google-tts"
  | "elevenlabs"
  | "openai-tts"
  | "azure-tts"
  | "sarvam"
  | "murf"
  | "playai"
  | "speechify"
  | "cartesia"
  // STT providers
  | "deepgram"
  | "gladia"
  | "whisper"
  | "assemblyai"
  | "google-stt"
  | "azure-stt"
  // Realtime providers
  | "openai-realtime"
  | "gemini-live";

/**
 * Voice provider configuration
 */
export type VoiceProviderConfig = {
  /** Provider identifier */
  name: string;
  /** API key or credentials */
  apiKey?: string;
  /** Custom endpoint URL */
  baseUrl?: string;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Maximum retries for failed requests */
  maxRetries?: number;
  /** Provider-specific options */
  options?: Record<string, unknown>;
};

/**
 * Voice operation result union
 */
export type VoiceResult = TTSResult | STTResult;

/**
 * Voice event types for event-driven architectures
 */
export type VoiceEventType =
  | "synthesis.started"
  | "synthesis.progress"
  | "synthesis.completed"
  | "synthesis.error"
  | "transcription.started"
  | "transcription.partial"
  | "transcription.completed"
  | "transcription.error"
  | "realtime.connected"
  | "realtime.audio.received"
  | "realtime.text.received"
  | "realtime.disconnected"
  | "realtime.error";

/**
 * Voice event type for event-driven operations
 */
export type VoiceEvent<T = unknown> = {
  type: VoiceEventType;
  timestamp: Date;
  provider: VoiceProviderName;
  data: T;
  metadata?: Record<string, unknown>;
};

/**
 * Voice conversation turn
 */
export type VoiceTurn = {
  role: "user" | "assistant";
  text: string;
  audio?: Buffer;
  timestamp: Date;
  metadata?: {
    duration?: number;
    confidence?: number;
    language?: string;
    [key: string]: unknown;
  };
};

/**
 * Composite voice configuration
 */
export type CompositeVoiceConfig = {
  /** TTS provider name or instance */
  ttsProvider?: string | VoiceProviderConfig;
  /** STT provider name or instance */
  sttProvider?: string | VoiceProviderConfig;
  /** Default TTS options */
  defaultTTSOptions?: Partial<TTSOptions>;
  /** Default STT options */
  defaultSTTOptions?: Partial<STTOptions>;
  /** Enable conversation history tracking */
  trackHistory?: boolean;
  /** Maximum history turns to keep */
  maxHistoryTurns?: number;
};

/**
 * Voice agent configuration
 */
export type VoiceAgentConfig = {
  /** System prompt for voice interactions */
  systemPrompt?: string;
  /** Voice settings for responses */
  voiceSettings?: {
    /** Voice ID for TTS responses */
    voiceId?: string;
    /** Language code */
    language?: string;
    /** Speaking rate */
    speed?: number;
    /** Voice pitch adjustment */
    pitch?: number;
  };
  /** STT settings for input */
  sttSettings?: Partial<STTOptions>;
  /** Realtime configuration (if using realtime mode) */
  realtimeConfig?: Partial<RealtimeConfig>;
  /** Mode of operation */
  mode?: "batch" | "realtime";
};

/**
 * Voice processing result from VoiceAgent
 */
export type VoiceProcessingResult = {
  /** Transcribed user input */
  userText: string;
  /** Generated assistant response */
  assistantText: string;
  /** Audio buffer of the response */
  audio: Buffer;
  /** Performance and timing metadata */
  metadata: {
    /** Time spent on transcription */
    transcriptionTime: number;
    /** Time spent on AI generation */
    generationTime: number;
    /** Time spent on synthesis */
    synthesisTime: number;
    /** Total processing time */
    totalTime: number;
    /** Input audio duration */
    inputDuration?: number;
    /** Output audio duration */
    outputDuration?: number;
  };
};

/**
 * TTS stream chunk for streaming synthesis
 */
export type TTSStreamChunk = {
  /** Audio data chunk */
  data: Buffer;
  /** Chunk sequence number */
  index: number;
  /** Whether this is the final chunk */
  isFinal: boolean;
  /** Audio format */
  format: string;
  /** Sample rate */
  sampleRate?: number;
  /** Timestamp offset in audio (milliseconds) */
  timestampMs?: number;
};

/**
 * Abstract voice provider interface
 *
 * All voice providers (TTS, STT, Realtime) implement this interface.
 */
export interface VoiceProvider {
  /**
   * Provider name identifier
   */
  readonly name: string;

  /**
   * Get supported capabilities
   */
  getCapabilities(): VoiceCapability[];

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean;

  /**
   * Validate provider configuration
   */
  validateConfig(): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Get provider-specific options schema
   */
  getOptionsSchema?(): Record<string, unknown>;
}

/**
 * TTS-capable voice provider interface
 */
export interface TTSProvider extends VoiceProvider {
  /**
   * Synthesize text to speech
   */
  synthesize(text: string, options: TTSOptions): Promise<TTSResult>;

  /**
   * Stream synthesized audio chunks
   */
  synthesizeStream?(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSStreamChunk>;

  /**
   * Get available voices
   */
  getVoices(languageCode?: string): Promise<TTSVoice[]>;

  /**
   * Maximum text length supported
   */
  readonly maxTextLength: number;
}

/**
 * STT-capable voice provider interface
 */
export interface STTProvider extends VoiceProvider {
  /**
   * Transcribe audio to text
   */
  transcribe(
    audio: Buffer | ArrayBuffer,
    options: STTOptions,
  ): Promise<STTResult>;

  /**
   * Stream transcription (live audio input)
   */
  transcribeStream?(
    audioStream: AsyncIterable<Buffer>,
    options: STTOptions,
  ): AsyncIterable<TranscriptionSegment>;

  /**
   * Get supported languages
   */
  getSupportedLanguages(): Promise<string[]>;

  /**
   * Get supported audio formats
   */
  getSupportedFormats(): string[];
}

/**
 * Realtime voice provider interface (bidirectional audio)
 */
export interface RealtimeVoiceProvider extends VoiceProvider {
  /**
   * Create a new realtime session
   */
  connect(config: RealtimeConfig): Promise<RealtimeSession>;

  /**
   * Check if connected
   */
  isConnected(): boolean;

  /**
   * Disconnect from realtime session
   */
  disconnect(): Promise<void>;

  /**
   * Get current session configuration
   */
  getSessionConfig(): RealtimeConfig | null;
}

/**
 * Voice error codes combining all error types
 */
export const VOICE_ERROR_CODES = {
  // General
  PROVIDER_NOT_CONFIGURED: "VOICE_PROVIDER_NOT_CONFIGURED",
  PROVIDER_NOT_SUPPORTED: "VOICE_PROVIDER_NOT_SUPPORTED",
  FEATURE_NOT_SUPPORTED: "VOICE_FEATURE_NOT_SUPPORTED",
  INVALID_CONFIGURATION: "VOICE_INVALID_CONFIGURATION",

  // TTS specific
  TTS_EMPTY_TEXT: "VOICE_TTS_EMPTY_TEXT",
  TTS_TEXT_TOO_LONG: "VOICE_TTS_TEXT_TOO_LONG",
  TTS_SYNTHESIS_FAILED: "VOICE_TTS_SYNTHESIS_FAILED",

  // STT specific
  STT_EMPTY_AUDIO: "VOICE_STT_EMPTY_AUDIO",
  STT_INVALID_FORMAT: "VOICE_STT_INVALID_FORMAT",
  STT_TRANSCRIPTION_FAILED: "VOICE_STT_TRANSCRIPTION_FAILED",

  // Realtime specific
  REALTIME_CONNECTION_FAILED: "VOICE_REALTIME_CONNECTION_FAILED",
  REALTIME_SESSION_ERROR: "VOICE_REALTIME_SESSION_ERROR",

  // Network
  NETWORK_ERROR: "VOICE_NETWORK_ERROR",
  TIMEOUT: "VOICE_TIMEOUT",
} as const;
