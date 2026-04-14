/**
 * Voice and Speech Type Definitions for NeuroLink
 *
 * Comprehensive type definitions for TTS, STT, and Realtime Voice features.
 *
 * @module voice/types/voiceTypes
 */

import type {
  AudioFormat,
  TTSOptions,
  TTSResult,
  TTSVoice,
} from "../../types/ttsTypes.js";

// ============================================================================
// VOICE CAPABILITY TYPES
// ============================================================================

/**
 * Voice capability types supported by providers
 */
export type VoiceCapability = "tts" | "stt" | "realtime" | "streaming";

/**
 * Voice provider types
 */
export type VoiceProviderType = "tts" | "stt" | "realtime";

// ============================================================================
// VOICE PROVIDER CONFIGURATION
// ============================================================================

/**
 * Base voice provider configuration
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
 * Voice provider metadata for registry
 */
export type VoiceProviderMetadata = {
  /** Provider type (tts, stt, realtime) */
  type: VoiceProviderType;
  /** Provider display name */
  displayName: string;
  /** Supported capabilities */
  capabilities: VoiceCapability[];
  /** Supported audio formats */
  supportedFormats: AudioFormat[];
  /** Maximum text length for TTS or audio duration for STT */
  maxLength?: number;
  /** Whether streaming is supported */
  supportsStreaming: boolean;
  /** Provider-specific features */
  features?: string[];
};

// ============================================================================
// STT (SPEECH-TO-TEXT) TYPES
// ============================================================================

/**
 * STT configuration options
 */
export type STTOptions = {
  /** Enable STT processing */
  enabled?: boolean;
  /** Language code for transcription (e.g., "en-US") */
  language?: string;
  /** Audio format of input */
  format?: AudioFormat;
  /** Sample rate in Hz */
  sampleRate?: number;
  /** Enable punctuation in transcription */
  punctuation?: boolean;
  /** Enable punctuation (alias) */
  punctuate?: boolean;
  /** Enable profanity filter */
  profanityFilter?: boolean;
  /** Enable speaker diarization */
  speakerDiarization?: boolean;
  /** Enable speaker diarization (alias) */
  diarization?: boolean;
  /** Number of speakers (for diarization) */
  speakerCount?: number;
  /** Enable word-level timestamps */
  wordTimestamps?: boolean;
  /** Model variant to use */
  model?: string;
  /** Custom vocabulary/phrases */
  vocabulary?: string[];
  /** Minimum confidence threshold */
  confidenceThreshold?: number;
};

/**
 * Word-level timing information
 */
export type WordTiming = {
  /** The word */
  word: string;
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Speaker label (for diarization) */
  speaker?: string;
};

/**
 * Transcription segment for streaming STT
 */
export type TranscriptionSegment = {
  /** Segment index */
  index: number;
  /** Transcribed text */
  text: string;
  /** Whether this is a final result */
  isFinal: boolean;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Start time in audio (seconds) */
  startTime?: number;
  /** Start time (alias for startTime) */
  start?: number;
  /** End time in audio (seconds) */
  endTime?: number;
  /** End time (alias for endTime) */
  end?: number;
  /** Word-level timings */
  words?: WordTiming[];
  /** Speaker label */
  speaker?: string;
  /** Detected language */
  language?: string;
};

/**
 * STT result from transcription
 */
export type STTResult = {
  /** Full transcribed text */
  text: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detected language code */
  language?: string;
  /** Audio duration in seconds */
  duration?: number;
  /** Word-level timings */
  words?: WordTiming[];
  /** Transcription segments */
  segments?: TranscriptionSegment[];
  /** Speaker labels (for diarization) */
  speakers?: string[];
  /** Performance metadata */
  metadata?: {
    /** Processing latency in milliseconds */
    latency: number;
    /** Provider name */
    provider?: string;
    /** Model used */
    model?: string;
    /** Additional provider-specific metadata */
    [key: string]: unknown;
  };
};

/**
 * STT language information
 */
export type STTLanguage = {
  /** Language code (e.g., "en-US") */
  code: string;
  /** Language name */
  name: string;
  /** Whether the language supports speaker diarization */
  supportsDiarization?: boolean;
  /** Whether the language supports punctuation */
  supportsPunctuation?: boolean;
};

// ============================================================================
// REALTIME VOICE TYPES
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
// COMPOSITE VOICE TYPES
// ============================================================================

/**
 * Composite voice configuration for combined TTS + STT
 */
export type CompositeVoiceConfig = {
  /** TTS provider name or config object */
  ttsProvider?: string | VoiceProviderConfig;
  /** STT provider name or config object */
  sttProvider?: string | VoiceProviderConfig;
  /** Default TTS options */
  defaultTTSOptions?: TTSOptions;
  /** Default STT options */
  defaultSTTOptions?: STTOptions;
  /** TTS options (alias for defaultTTSOptions) */
  ttsOptions?: TTSOptions;
  /** STT options (alias for defaultSTTOptions) */
  sttOptions?: STTOptions;
  /** Whether to track conversation history */
  trackHistory?: boolean;
  /** Maximum number of history turns to keep */
  maxHistoryTurns?: number;
  /** Whether to enable streaming */
  streaming?: boolean;
  /** Latency optimization mode */
  latencyMode?: "low" | "balanced" | "quality";
};

/**
 * Composite voice session
 */
export type CompositeVoiceSession = {
  /** Session ID */
  id: string;
  /** TTS provider */
  ttsProvider: string;
  /** STT provider */
  sttProvider: string;
  /** Session start time */
  startedAt: Date;
  /** Whether session is active */
  isActive: boolean;
};

// ============================================================================
// AUDIO UTILITIES TYPES
// ============================================================================

/**
 * Audio format details
 */
export type AudioFormatDetails = {
  /** Format name */
  format: AudioFormat;
  /** MIME type */
  mimeType: string;
  /** File extension */
  extension: string;
  /** Whether format supports streaming */
  supportsStreaming: boolean;
  /** Typical sample rates */
  sampleRates: number[];
  /** Bit depths */
  bitDepths: number[];
};

/**
 * Audio conversion options
 */
export type AudioConversionOptions = {
  /** Target format */
  targetFormat: AudioFormat;
  /** Target sample rate */
  sampleRate?: number;
  /** Target bit depth */
  bitDepth?: number;
  /** Number of channels */
  channels?: number;
  /** Normalize audio level */
  normalize?: boolean;
};

/**
 * Audio stream chunk for streaming operations
 */
export type AudioStreamChunk = {
  /** Audio data */
  data: Buffer;
  /** Chunk index */
  index: number;
  /** Whether this is the final chunk */
  isFinal: boolean;
  /** Audio format */
  format: AudioFormat;
  /** Sample rate */
  sampleRate: number;
  /** Timestamp offset in milliseconds */
  timestampMs: number;
  /** Duration of this chunk in milliseconds */
  durationMs: number;
};

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * STT error codes
 */
export const STT_ERROR_CODES = {
  AUDIO_EMPTY: "STT_AUDIO_EMPTY",
  AUDIO_TOO_LONG: "STT_AUDIO_TOO_LONG",
  INVALID_AUDIO_FORMAT: "STT_INVALID_AUDIO_FORMAT",
  LANGUAGE_NOT_SUPPORTED: "STT_LANGUAGE_NOT_SUPPORTED",
  TRANSCRIPTION_FAILED: "STT_TRANSCRIPTION_FAILED",
  PROVIDER_NOT_CONFIGURED: "STT_PROVIDER_NOT_CONFIGURED",
  PROVIDER_NOT_SUPPORTED: "STT_PROVIDER_NOT_SUPPORTED",
  STREAM_ERROR: "STT_STREAM_ERROR",
} as const;

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

/**
 * Voice error codes (general)
 */
export const VOICE_ERROR_CODES = {
  PROVIDER_NOT_FOUND: "VOICE_PROVIDER_NOT_FOUND",
  INVALID_CONFIGURATION: "VOICE_INVALID_CONFIGURATION",
  INITIALIZATION_FAILED: "VOICE_INITIALIZATION_FAILED",
  OPERATION_CANCELLED: "VOICE_OPERATION_CANCELLED",
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard for STTResult
 */
export function isSTTResult(value: unknown): value is STTResult {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.text === "string" &&
    typeof obj.confidence === "number" &&
    obj.confidence >= 0 &&
    obj.confidence <= 1
  );
}

/**
 * Type guard for valid STTOptions
 */
export function isValidSTTOptions(options: unknown): options is STTOptions {
  if (!options || typeof options !== "object") {
    return false;
  }
  const opts = options as STTOptions;
  if (opts.sampleRate !== undefined) {
    if (typeof opts.sampleRate !== "number" || opts.sampleRate <= 0) {
      return false;
    }
  }
  if (opts.speakerCount !== undefined) {
    if (
      typeof opts.speakerCount !== "number" ||
      opts.speakerCount < 1 ||
      opts.speakerCount > 10
    ) {
      return false;
    }
  }
  return true;
}

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

/**
 * Type guard for TranscriptionSegment
 */
export function isTranscriptionSegment(
  value: unknown,
): value is TranscriptionSegment {
  if (!value || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.index === "number" &&
    typeof obj.text === "string" &&
    typeof obj.isFinal === "boolean"
  );
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Supported audio formats with details
 */
export const AUDIO_FORMAT_DETAILS: Partial<
  Record<AudioFormat, AudioFormatDetails>
> = {
  mp3: {
    format: "mp3",
    mimeType: "audio/mpeg",
    extension: ".mp3",
    supportsStreaming: true,
    sampleRates: [8000, 16000, 22050, 24000, 44100, 48000],
    bitDepths: [16],
  },
  wav: {
    format: "wav",
    mimeType: "audio/wav",
    extension: ".wav",
    supportsStreaming: false,
    sampleRates: [8000, 16000, 22050, 24000, 44100, 48000],
    bitDepths: [8, 16, 24, 32],
  },
  ogg: {
    format: "ogg",
    mimeType: "audio/ogg",
    extension: ".ogg",
    supportsStreaming: true,
    sampleRates: [8000, 16000, 22050, 24000, 44100, 48000],
    bitDepths: [16],
  },
  opus: {
    format: "opus",
    mimeType: "audio/opus",
    extension: ".opus",
    supportsStreaming: true,
    sampleRates: [8000, 12000, 16000, 24000, 48000],
    bitDepths: [16],
  },
  m4a: {
    format: "m4a",
    mimeType: "audio/mp4",
    extension: ".m4a",
    supportsStreaming: false,
    sampleRates: [44100, 48000],
    bitDepths: [16],
  },
  flac: {
    format: "flac",
    mimeType: "audio/flac",
    extension: ".flac",
    supportsStreaming: false,
    sampleRates: [44100, 48000, 96000],
    bitDepths: [16, 24],
  },
  webm: {
    format: "webm",
    mimeType: "audio/webm",
    extension: ".webm",
    supportsStreaming: true,
    sampleRates: [44100, 48000],
    bitDepths: [16],
  },
};

/**
 * Default STT options
 */
export const DEFAULT_STT_OPTIONS: Required<
  Pick<
    STTOptions,
    "language" | "punctuation" | "profanityFilter" | "sampleRate"
  >
> = {
  language: "en-US",
  punctuation: true,
  profanityFilter: false,
  sampleRate: 16000,
};

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

// Re-export TTS types for convenience
export type { AudioFormat, TTSOptions, TTSResult, TTSVoice };

// ============================================================================
// VOICE AGENT TYPES (for CompositeVoice and VoiceAgent integration)
// ============================================================================

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
    provider?: string;
    voice?: string;
    [key: string]: unknown;
  };
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
