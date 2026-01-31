/**
 * Realtime Voice Type Definitions for NeuroLink
 *
 * This module defines types for bidirectional realtime voice communication
 * including WebSocket-based voice APIs like OpenAI Realtime and Gemini Live.
 *
 * @module types/realtimeTypes
 */

/**
 * Audio encoding formats for realtime voice
 */
export type RealtimeAudioEncoding = "pcm16" | "g711_ulaw" | "g711_alaw";

/**
 * Realtime session configuration
 */
export type RealtimeConfig = {
  /** Model to use */
  model?: string;
  /** Voice for responses */
  voice?: string;
  /** Input audio format */
  inputFormat?: {
    encoding: RealtimeAudioEncoding;
    sampleRate: number;
    channels: 1 | 2;
  };
  /** Output audio format */
  outputFormat?: {
    encoding: RealtimeAudioEncoding;
    sampleRate: number;
  };
  /** System instructions */
  instructions?: string;
  /** Turn detection mode */
  turnDetection?: "server_vad" | "none";
  /** VAD threshold (0-1) */
  vadThreshold?: number;
  /** Enable input audio transcription */
  transcribeInput?: boolean;
  /** Maximum response output tokens */
  maxResponseOutputTokens?: number | "inf";
  /** Temperature for responses */
  temperature?: number;
  /** Provider-specific options */
  providerOptions?: Record<string, unknown>;
};

/**
 * Realtime session event types
 */
export type RealtimeEventType =
  | "session.created"
  | "session.updated"
  | "session.error"
  | "input_audio_buffer.append"
  | "input_audio_buffer.commit"
  | "input_audio_buffer.clear"
  | "input_audio_buffer.speech_started"
  | "input_audio_buffer.speech_stopped"
  | "response.create"
  | "response.created"
  | "response.audio.delta"
  | "response.audio.done"
  | "response.text.delta"
  | "response.text.done"
  | "response.function_call.arguments.delta"
  | "response.function_call.arguments.done"
  | "response.done"
  | "response.cancelled"
  | "conversation.item.created"
  | "conversation.item.deleted"
  | "conversation.item.truncated"
  | "rate_limits.updated"
  | "error";

/**
 * Base realtime session event
 */
export type RealtimeEvent = {
  /** Event type identifier */
  type: RealtimeEventType;
  /** Unique event ID */
  eventId?: string;
  /** Event timestamp */
  timestamp?: number;
  /** Event-specific data */
  data?: unknown;
};

/**
 * Audio event from realtime session
 */
export type RealtimeAudioEvent = RealtimeEvent & {
  type: "response.audio.delta" | "response.audio.done";
  data: {
    /** Base64 encoded audio chunk */
    audio?: string;
    /** Audio item ID */
    itemId?: string;
    /** Content index */
    contentIndex?: number;
  };
};

/**
 * Text event from realtime session
 */
export type RealtimeTextEvent = RealtimeEvent & {
  type: "response.text.delta" | "response.text.done";
  data: {
    /** Text content */
    text: string;
    /** Item ID */
    itemId?: string;
    /** Content index */
    contentIndex?: number;
  };
};

/**
 * Function call event from realtime session
 */
export type RealtimeFunctionCallEvent = RealtimeEvent & {
  type:
    | "response.function_call.arguments.delta"
    | "response.function_call.arguments.done";
  data: {
    /** Call ID */
    callId: string;
    /** Function name */
    name: string;
    /** JSON arguments (may be partial for delta) */
    arguments: string;
    /** Item ID */
    itemId?: string;
  };
};

/**
 * Error event from realtime session
 */
export type RealtimeErrorEvent = RealtimeEvent & {
  type: "error" | "session.error";
  data: {
    /** Error code */
    code: string;
    /** Error message */
    message: string;
    /** Error type */
    type?: string;
    /** Additional context */
    param?: string;
  };
};

/**
 * Realtime tool definition for function calling
 */
export type RealtimeTool = {
  /** Tool type (currently only "function" supported) */
  type: "function";
  /** Function name */
  name: string;
  /** Function description */
  description: string;
  /** JSON Schema for parameters */
  parameters: Record<string, unknown>;
};

/**
 * Realtime session interface
 *
 * Represents an active bidirectional voice session with a realtime API.
 */
export type RealtimeSession = {
  /** Session ID */
  id: string;

  /**
   * Send audio input to the session
   * @param audio - Audio data (raw PCM16 or other configured format)
   */
  sendAudio(audio: Buffer | ArrayBuffer): void;

  /**
   * Commit input audio buffer (signal end of speech)
   */
  commitAudio(): void;

  /**
   * Clear input audio buffer
   */
  clearAudio(): void;

  /**
   * Send text input to the session
   * @param text - Text message to send
   */
  sendText(text: string): void;

  /**
   * Request the model to generate a response
   */
  createResponse(): void;

  /**
   * Cancel the current response generation
   */
  cancelResponse(): void;

  /**
   * Update session configuration
   * @param config - Partial configuration to update
   */
  updateSession(config: Partial<RealtimeConfig>): void;

  /**
   * Register tools for function calling
   * @param tools - Array of tool definitions
   */
  registerTools?(tools: RealtimeTool[]): void;

  /**
   * Send function call result
   * @param callId - The function call ID
   * @param result - The result to send back
   */
  sendFunctionResult?(callId: string, result: string): void;

  /**
   * Add event listener
   * @param event - Event type to listen for
   * @param handler - Event handler function
   */
  on(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void;

  /**
   * Remove event listener
   * @param event - Event type
   * @param handler - Handler to remove
   */
  off(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void;

  /**
   * Close the session
   */
  close(): void;

  /**
   * Check if session is open
   */
  isOpen(): boolean;
};

/**
 * Realtime error codes
 */
export const REALTIME_ERROR_CODES = {
  CONNECTION_FAILED: "REALTIME_CONNECTION_FAILED",
  CONNECTION_CLOSED: "REALTIME_CONNECTION_CLOSED",
  SESSION_ERROR: "REALTIME_SESSION_ERROR",
  AUDIO_SEND_FAILED: "REALTIME_AUDIO_SEND_FAILED",
  PROVIDER_NOT_CONFIGURED: "REALTIME_PROVIDER_NOT_CONFIGURED",
  INVALID_CONFIGURATION: "REALTIME_INVALID_CONFIGURATION",
  TIMEOUT: "REALTIME_TIMEOUT",
} as const;

/**
 * Type guard to check if an event is an audio event
 */
export function isRealtimeAudioEvent(
  event: RealtimeEvent,
): event is RealtimeAudioEvent {
  return (
    event.type === "response.audio.delta" ||
    event.type === "response.audio.done"
  );
}

/**
 * Type guard to check if an event is a text event
 */
export function isRealtimeTextEvent(
  event: RealtimeEvent,
): event is RealtimeTextEvent {
  return (
    event.type === "response.text.delta" || event.type === "response.text.done"
  );
}

/**
 * Type guard to check if an event is an error event
 */
export function isRealtimeErrorEvent(
  event: RealtimeEvent,
): event is RealtimeErrorEvent {
  return event.type === "error" || event.type === "session.error";
}

/**
 * Type guard to check if an event is a function call event
 */
export function isRealtimeFunctionCallEvent(
  event: RealtimeEvent,
): event is RealtimeFunctionCallEvent {
  return (
    event.type === "response.function_call.arguments.delta" ||
    event.type === "response.function_call.arguments.done"
  );
}
