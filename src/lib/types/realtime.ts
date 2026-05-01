/**
 * Realtime Voice Type Definitions for NeuroLink
 *
 * All realtime/bidirectional voice types: session, config, messages,
 * event handlers, provider types, handler types, error codes, defaults,
 * and type guards.
 *
 * @module types/realtime
 */

import type { AudioFormat } from "./tts.js";
import type { VoiceCapability } from "./voice.js";

// ============================================================================
// REALTIME SESSION TYPES
// ============================================================================

/**
 * Realtime session state
 */
export type RealtimeSessionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting"
  | "error";

/**
 * Realtime voice configuration
 */
export type RealtimeConfig = {
  /** Provider to use (openai, gemini) */
  provider: "openai" | "gemini";
  /** API key */
  apiKey?: string;
  /** Model to use */
  model?: string;
  /** Voice for TTS output */
  voice?: string;
  /** Input language */
  inputLanguage?: string;
  /** Output language */
  outputLanguage?: string;
  /** System prompt for the AI */
  systemPrompt?: string;
  /** Session timeout in milliseconds */
  timeout?: number;
  /** Audio input format */
  inputFormat?: AudioFormat;
  /** Audio output format */
  outputFormat?: AudioFormat;
  /** Input sample rate */
  inputSampleRate?: number;
  /** Output sample rate */
  outputSampleRate?: number;
  /** Enable voice activity detection */
  vadEnabled?: boolean;
  /** VAD threshold (0-1) */
  vadThreshold?: number;
  /** Turn detection mode */
  turnDetection?: "server_vad" | "manual";
  /** Instructions/system prompt for the session */
  instructions?: string;
  /** Temperature for AI responses */
  temperature?: number;
  /** Tools/functions available to the model */
  tools?: RealtimeTool[];
};

/**
 * Realtime tool definition
 */
export type RealtimeTool = {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** JSON schema for parameters */
  parameters: Record<string, unknown>;
};

/**
 * Realtime session information
 */
export type RealtimeSession = {
  /** Session ID */
  id: string;
  /** Current state */
  state: RealtimeSessionState;
  /** Provider name */
  provider: string;
  /** Model being used */
  model?: string;
  /** Session creation time */
  createdAt: Date;
  /** Last activity time */
  lastActivityAt: Date;
  /** Session configuration */
  config: RealtimeConfig;
  /** Check if session is open */
  isOpen?: () => boolean;
  /** Close the session */
  close?: () => Promise<void>;
};

/**
 * Realtime audio chunk
 */
export type RealtimeAudioChunk = {
  /** Audio data */
  data: Buffer;
  /** Chunk sequence number */
  index: number;
  /** Whether this is the final chunk */
  isFinal: boolean;
  /** Audio format */
  format: AudioFormat;
  /** Sample rate */
  sampleRate?: number;
  /** Duration of this chunk in milliseconds */
  durationMs?: number;
};

/**
 * Realtime message types
 */
export type RealtimeMessageType =
  | "audio"
  | "text"
  | "transcript"
  | "function_call"
  | "function_result"
  | "error"
  | "session_update"
  | "turn_start"
  | "turn_end";

/**
 * Realtime message
 */
export type RealtimeMessage = {
  /** Message type */
  type: RealtimeMessageType;
  /** Message ID */
  id?: string;
  /** Audio data (for audio messages) */
  audio?: RealtimeAudioChunk;
  /** Text content (for text/transcript messages) */
  text?: string;
  /** Whether this is a partial result */
  isPartial?: boolean;
  /** Function call data */
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  /** Function result data */
  functionResult?: {
    name: string;
    result: unknown;
  };
  /** Error information */
  error?: {
    code: string;
    message: string;
  };
  /** Timestamp */
  timestamp: Date;
};

/**
 * Realtime event handler callbacks
 */
export type RealtimeEventHandlers = {
  /** Called when audio is received */
  onAudio?: (chunk: RealtimeAudioChunk) => void;
  /** Called when text/transcript is received */
  onTranscript?: (text: string, isFinal: boolean) => void;
  /** Called when the model generates text */
  onText?: (text: string, isFinal: boolean) => void;
  /** Called when a function call is requested */
  onFunctionCall?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<unknown>;
  /** Called when session state changes */
  onStateChange?: (state: RealtimeSessionState) => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
  /** Called when a turn starts */
  onTurnStart?: () => void;
  /** Called when a turn ends */
  onTurnEnd?: () => void;
};

// ============================================================================
// REALTIME PROVIDER TYPE
// ============================================================================

/**
 * Realtime voice provider type (bidirectional audio)
 */
export type RealtimeVoiceProvider = {
  /** Provider name identifier */
  readonly name: string;
  /** Get supported capabilities */
  getCapabilities(): VoiceCapability[];
  /** Check if provider is properly configured */
  isConfigured(): boolean;
  /** Validate provider configuration */
  validateConfig(): Promise<{ valid: boolean; errors: string[] }>;
  /** Get provider-specific options schema */
  getOptionsSchema?(): Record<string, unknown>;
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
};

// ============================================================================
// REALTIME HANDLER TYPE
// ============================================================================

export type RealtimeHandler = {
  readonly name: string;
  connect(config: RealtimeConfig): Promise<RealtimeSession>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getSession(): RealtimeSession | null;
  sendAudio(audio: Buffer | RealtimeAudioChunk): Promise<void>;
  sendText?(text: string): Promise<void>;
  triggerResponse?(): Promise<void>;
  cancelResponse?(): Promise<void>;
  on(handlers: RealtimeEventHandlers): void;
  off(): void;
  isConfigured(): boolean;
  getSupportedFormats(): AudioFormat[];
};

// ============================================================================
// REALTIME ERROR CODES
// ============================================================================

/**
 * Realtime error codes
 */
export const REALTIME_ERROR_CODES = {
  CONNECTION_FAILED: "REALTIME_CONNECTION_FAILED",
  SESSION_TIMEOUT: "REALTIME_SESSION_TIMEOUT",
  PROTOCOL_ERROR: "REALTIME_PROTOCOL_ERROR",
  AUDIO_STREAM_ERROR: "REALTIME_AUDIO_STREAM_ERROR",
  PROVIDER_NOT_CONFIGURED: "REALTIME_PROVIDER_NOT_CONFIGURED",
  PROVIDER_NOT_SUPPORTED: "REALTIME_PROVIDER_NOT_SUPPORTED",
  SESSION_ALREADY_ACTIVE: "REALTIME_SESSION_ALREADY_ACTIVE",
  SESSION_NOT_ACTIVE: "REALTIME_SESSION_NOT_ACTIVE",
  INVALID_MESSAGE: "REALTIME_INVALID_MESSAGE",
} as const;

// ============================================================================
// REALTIME DEFAULTS
// ============================================================================

/**
 * Default realtime configuration
 */
export const DEFAULT_REALTIME_CONFIG: Partial<RealtimeConfig> = {
  timeout: 30000,
  inputSampleRate: 24000,
  outputSampleRate: 24000,
  vadEnabled: true,
  vadThreshold: 0.5,
  turnDetection: "server_vad",
};

// ============================================================================
// REALTIME TYPE GUARDS
// ============================================================================

/**
 * Type guard for valid RealtimeConfig
 */
export function isValidRealtimeConfig(
  config: unknown,
): config is RealtimeConfig {
  if (!config || typeof config !== "object") {
    return false;
  }
  const conf = config as RealtimeConfig;
  if (!conf.provider || !["openai", "gemini"].includes(conf.provider)) {
    return false;
  }
  if (conf.timeout !== undefined) {
    if (typeof conf.timeout !== "number" || conf.timeout <= 0) {
      return false;
    }
  }
  if (conf.vadThreshold !== undefined) {
    if (
      typeof conf.vadThreshold !== "number" ||
      conf.vadThreshold < 0 ||
      conf.vadThreshold > 1
    ) {
      return false;
    }
  }
  return true;
}
