/**
 * Voice Module Error Classes
 *
 * Comprehensive error handling for TTS, STT, and Realtime Voice operations.
 *
 * @module voice/errors
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import { NeuroLinkError } from "../utils/errorHandling.js";
import type { VoiceErrorOptions } from "../types/index.js";
import {
  REALTIME_ERROR_CODES,
  STT_ERROR_CODES,
  VOICE_ERROR_CODES,
} from "../types/index.js";

// Re-export error codes for convenience
export { STT_ERROR_CODES, REALTIME_ERROR_CODES, VOICE_ERROR_CODES };

/**
 * Base Voice Error class for all voice-related errors
 */
export class VoiceError extends NeuroLinkError {
  constructor(options: VoiceErrorOptions) {
    super({
      code: options.code,
      message: options.message,
      category: options.category ?? ErrorCategory.EXECUTION,
      severity: options.severity ?? ErrorSeverity.MEDIUM,
      retriable: options.retriable ?? false,
      context: options.context,
      originalError: options.originalError,
    });
    this.name = "VoiceError";
  }
}

/**
 * STT Error class for speech-to-text specific errors
 */
export class STTError extends NeuroLinkError {
  constructor(options: VoiceErrorOptions) {
    super({
      code: options.code,
      message: options.message,
      category: options.category ?? ErrorCategory.VALIDATION,
      severity: options.severity ?? ErrorSeverity.MEDIUM,
      retriable: options.retriable ?? false,
      context: options.context,
      originalError: options.originalError,
    });
    this.name = "STTError";
  }

  /**
   * Create an error for empty audio input
   */
  static audioEmpty(provider?: string): STTError {
    return new STTError({
      code: STT_ERROR_CODES.AUDIO_EMPTY,
      message: "Audio input is empty or invalid",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retriable: false,
      context: { provider },
    });
  }

  /**
   * Create an error for audio that exceeds maximum duration
   */
  static audioTooLong(
    durationSeconds: number,
    maxDurationSeconds: number,
    provider?: string,
  ): STTError {
    return new STTError({
      code: STT_ERROR_CODES.AUDIO_TOO_LONG,
      message: `Audio duration (${durationSeconds}s) exceeds maximum allowed (${maxDurationSeconds}s)`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { durationSeconds, maxDurationSeconds, provider },
    });
  }

  /**
   * Create an error for invalid audio format
   */
  static invalidFormat(
    format: string,
    supportedFormatsOrProvider?: string[] | string,
    provider?: string,
  ): STTError {
    // Handle overloaded signature: (format, provider) or (format, supportedFormats[], provider?)
    let supportedFormats: string[] | undefined;
    let actualProvider: string | undefined;

    if (typeof supportedFormatsOrProvider === "string") {
      // Called as (format, provider)
      actualProvider = supportedFormatsOrProvider;
    } else {
      // Called as (format, supportedFormats[], provider?)
      supportedFormats = supportedFormatsOrProvider;
      actualProvider = provider;
    }

    const message = supportedFormats
      ? `Unsupported audio format: ${format}. Supported formats: ${supportedFormats.join(", ")}`
      : `Unsupported audio format: ${format}`;
    return new STTError({
      code: STT_ERROR_CODES.INVALID_AUDIO_FORMAT,
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { format, supportedFormats, provider: actualProvider },
    });
  }

  /**
   * Create an error for unsupported language
   */
  static languageNotSupported(
    language: string,
    supportedLanguages?: string[],
    provider?: string,
  ): STTError {
    const message = supportedLanguages
      ? `Language "${language}" is not supported. Supported languages: ${supportedLanguages.slice(0, 10).join(", ")}${supportedLanguages.length > 10 ? "..." : ""}`
      : `Language "${language}" is not supported by this provider`;
    return new STTError({
      code: STT_ERROR_CODES.LANGUAGE_NOT_SUPPORTED,
      message,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { language, supportedLanguages, provider },
    });
  }

  /**
   * Create an error for transcription failure
   * Supports two signatures:
   * - transcriptionFailed(reason, provider?, originalError?)
   * - transcriptionFailed(reason, originalError, provider)
   */
  static transcriptionFailed(
    reason: string,
    providerOrError?: string | Error,
    originalErrorOrProvider?: Error | string,
  ): STTError {
    let provider: string | undefined;
    let originalError: Error | undefined;

    if (typeof providerOrError === "string") {
      // Called as (reason, provider?, originalError?)
      provider = providerOrError;
      originalError =
        originalErrorOrProvider instanceof Error
          ? originalErrorOrProvider
          : undefined;
    } else if (providerOrError instanceof Error) {
      // Called as (reason, originalError, provider)
      originalError = providerOrError;
      provider =
        typeof originalErrorOrProvider === "string"
          ? originalErrorOrProvider
          : undefined;
    }

    return new STTError({
      code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
      message: `Transcription failed: ${reason}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { provider },
      originalError,
    });
  }

  /**
   * Create an error for unconfigured provider
   */
  static providerNotConfigured(provider: string): STTError {
    return new STTError({
      code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message: `STT provider "${provider}" is not properly configured. Please set the required API keys.`,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider },
    });
  }

  /**
   * Create an error for unsupported provider
   */
  static providerNotSupported(
    provider: string,
    availableProviders?: string[],
  ): STTError {
    return new STTError({
      code: STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      message: `STT provider "${provider}" is not supported`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider, availableProviders },
    });
  }

  /**
   * Create an error for stream processing failure
   */
  static streamError(reason: string, provider?: string): STTError {
    return new STTError({
      code: STT_ERROR_CODES.STREAM_ERROR,
      message: `Stream processing error: ${reason}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { provider },
    });
  }

  /**
   * Alias for providerNotConfigured
   */
  static notConfigured(provider: string): STTError {
    return STTError.providerNotConfigured(provider);
  }

  /**
   * Alias for audioEmpty
   */
  static emptyAudio(provider?: string): STTError {
    return STTError.audioEmpty(provider);
  }
}

/**
 * Realtime Voice Error class for realtime-specific errors
 */
export class RealtimeError extends NeuroLinkError {
  constructor(options: VoiceErrorOptions) {
    super({
      code: options.code,
      message: options.message,
      category: options.category ?? ErrorCategory.EXECUTION,
      severity: options.severity ?? ErrorSeverity.HIGH,
      retriable: options.retriable ?? false,
      context: options.context,
      originalError: options.originalError,
    });
    this.name = "RealtimeError";
  }

  /**
   * Create an error for connection failure
   * Supports two signatures:
   * - connectionFailed(reason, provider?, originalError?)
   * - connectionFailed(reason, originalError?, provider?)
   */
  static connectionFailed(
    reason: string,
    providerOrError?: string | Error,
    originalErrorOrProvider?: Error | string,
  ): RealtimeError {
    let provider: string | undefined;
    let originalError: Error | undefined;

    if (typeof providerOrError === "string") {
      // Called as (reason, provider?, originalError?)
      provider = providerOrError;
      originalError =
        originalErrorOrProvider instanceof Error
          ? originalErrorOrProvider
          : undefined;
    } else if (providerOrError instanceof Error) {
      // Called as (reason, originalError, provider)
      originalError = providerOrError;
      provider =
        typeof originalErrorOrProvider === "string"
          ? originalErrorOrProvider
          : undefined;
    }

    return new RealtimeError({
      code: REALTIME_ERROR_CODES.CONNECTION_FAILED,
      message: `Failed to connect to realtime service: ${reason}`,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { provider },
      originalError,
    });
  }

  /**
   * Create an error for session timeout
   */
  static sessionTimeout(timeoutMs: number, provider?: string): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.SESSION_TIMEOUT,
      message: `Realtime session timed out after ${timeoutMs}ms`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
      context: { timeoutMs, provider },
    });
  }

  /**
   * Create an error for protocol errors
   */
  static protocolError(
    reason: string,
    provider?: string,
    originalError?: Error,
  ): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.PROTOCOL_ERROR,
      message: `Protocol error: ${reason}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider },
      originalError,
    });
  }

  /**
   * Create an error for audio stream failures
   */
  static audioStreamError(reason: string, provider?: string): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.AUDIO_STREAM_ERROR,
      message: `Audio stream error: ${reason}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { provider },
    });
  }

  /**
   * Create an error for unconfigured provider
   */
  static providerNotConfigured(provider: string): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      message: `Realtime provider "${provider}" is not properly configured. Please set the required API keys.`,
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider },
    });
  }

  /**
   * Create an error for unsupported provider
   */
  static providerNotSupported(
    provider: string,
    availableProviders?: string[],
  ): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      message: `Realtime provider "${provider}" is not supported`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.HIGH,
      retriable: false,
      context: { provider, availableProviders },
    });
  }

  /**
   * Create an error for duplicate session
   */
  static sessionAlreadyActive(provider?: string): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.SESSION_ALREADY_ACTIVE,
      message: "A realtime session is already active. Disconnect first.",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { provider },
    });
  }

  /**
   * Create an error for no active session
   */
  static sessionNotActive(provider?: string): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.SESSION_NOT_ACTIVE,
      message: "No active realtime session. Connect first.",
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { provider },
    });
  }

  /**
   * Create an error for invalid messages
   */
  static invalidMessage(reason: string, provider?: string): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.INVALID_MESSAGE,
      message: `Invalid message: ${reason}`,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      retriable: false,
      context: { provider },
    });
  }

  /**
   * Create an error for connection closed unexpectedly
   */
  static connectionClosed(
    reason: string,
    sessionId?: string,
    provider?: string,
  ): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.CONNECTION_FAILED,
      message: `Connection closed: ${reason}`,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      context: { sessionId, provider },
    });
  }

  /**
   * Create an error for unconfigured provider (alias)
   */
  static notConfigured(provider: string): RealtimeError {
    return RealtimeError.providerNotConfigured(provider);
  }

  /**
   * Create an error for operation timeout
   */
  static timeout(
    operation: string,
    timeoutMs: number,
    provider?: string,
  ): RealtimeError {
    return new RealtimeError({
      code: REALTIME_ERROR_CODES.SESSION_TIMEOUT,
      message: `Operation "${operation}" timed out after ${timeoutMs}ms`,
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      retriable: true,
      context: { operation, timeoutMs, provider },
    });
  }
}
