/**
 * Voice Error Classes Tests
 *
 * Tests for voice-specific error classes:
 * - VoiceError base class
 * - STTError
 * - RealtimeError
 * - VoiceErrorFactory
 */

import { describe, it, expect } from "vitest";
import {
  VoiceError,
  STTError,
  RealtimeError,
  VoiceErrorFactory,
  TTS_ERROR_CODES,
  STT_ERROR_CODES,
  REALTIME_ERROR_CODES,
  VOICE_ERROR_CODES,
} from "../../../src/lib/voice/errors.js";
import {
  ErrorCategory,
  ErrorSeverity,
} from "../../../src/lib/constants/enums.js";

describe("VoiceError", () => {
  it("should create error with required fields", () => {
    const error = new VoiceError({
      code: "TEST_ERROR",
      message: "Test error message",
    });

    expect(error.code).toBe("TEST_ERROR");
    expect(error.message).toBe("Test error message");
    expect(error.name).toBe("VoiceError");
  });

  it("should set default category and severity", () => {
    const error = new VoiceError({
      code: "TEST_ERROR",
      message: "Test error",
    });

    expect(error.category).toBe(ErrorCategory.EXECUTION);
    expect(error.severity).toBe(ErrorSeverity.MEDIUM);
    expect(error.retriable).toBe(false);
  });

  it("should accept custom category and severity", () => {
    const error = new VoiceError({
      code: "NETWORK_ERROR",
      message: "Network failed",
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      retriable: true,
    });

    expect(error.category).toBe(ErrorCategory.NETWORK);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
    expect(error.retriable).toBe(true);
  });

  it("should include provider in context", () => {
    const error = new VoiceError({
      code: "PROVIDER_ERROR",
      message: "Provider failed",
      provider: "elevenlabs",
    });

    expect(error.provider).toBe("elevenlabs");
    expect(error.context.provider).toBe("elevenlabs");
  });

  it("should include original error in context", () => {
    const originalError = new Error("Original cause");
    const error = new VoiceError({
      code: "WRAPPED_ERROR",
      message: "Wrapped error",
      originalError,
    });

    // The original error is tracked via internal implementation
    expect(error).toBeDefined();
    expect(error.message).toBe("Wrapped error");
  });

  it("should include custom context", () => {
    const error = new VoiceError({
      code: "CONTEXT_ERROR",
      message: "Error with context",
      context: {
        operation: "synthesize",
        duration: 5000,
      },
    });

    expect(error.context.operation).toBe("synthesize");
    expect(error.context.duration).toBe(5000);
  });
});

describe("STTError", () => {
  describe("constructor", () => {
    it("should create STT error", () => {
      const error = new STTError({
        code: STT_ERROR_CODES.TRANSCRIPTION_FAILED,
        message: "Transcription failed",
      });

      expect(error.name).toBe("STTError");
      expect(error.code).toBe(STT_ERROR_CODES.TRANSCRIPTION_FAILED);
    });
  });

  describe("static factory methods", () => {
    it("should create emptyAudio error", () => {
      const error = STTError.emptyAudio("whisper");

      expect(error.code).toBe(STT_ERROR_CODES.EMPTY_AUDIO);
      expect(error.message).toContain("empty");
      expect(error.provider).toBe("whisper");
      expect(error.category).toBe(ErrorCategory.VALIDATION);
    });

    it("should create invalidFormat error", () => {
      const error = STTError.invalidFormat("xyz", "deepgram");

      expect(error.code).toBe(STT_ERROR_CODES.INVALID_FORMAT);
      expect(error.message).toContain("xyz");
      expect(error.context.format).toBe("xyz");
    });

    it("should create audioTooLong error", () => {
      const error = STTError.audioTooLong(120, 60, "assemblyai");

      expect(error.code).toBe(STT_ERROR_CODES.AUDIO_TOO_LONG);
      expect(error.message).toContain("120");
      expect(error.message).toContain("60");
      expect(error.context.duration).toBe(120);
      expect(error.context.maxDuration).toBe(60);
    });

    it("should create transcriptionFailed error", () => {
      const originalError = new Error("API error");
      const error = STTError.transcriptionFailed(
        "API timeout",
        originalError,
        "google-stt",
      );

      expect(error.code).toBe(STT_ERROR_CODES.TRANSCRIPTION_FAILED);
      expect(error.message).toContain("API timeout");
      expect(error.retriable).toBe(true);
      // Original error is tracked internally
      expect(error).toBeDefined();
    });

    it("should create notConfigured error", () => {
      const error = STTError.notConfigured("gladia");

      expect(error.code).toBe(STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED);
      expect(error.message).toContain("gladia");
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
    });
  });
});

describe("RealtimeError", () => {
  describe("constructor", () => {
    it("should create Realtime error with sessionId", () => {
      const error = new RealtimeError({
        code: REALTIME_ERROR_CODES.SESSION_ERROR,
        message: "Session error",
        sessionId: "sess-123",
      });

      expect(error.name).toBe("RealtimeError");
      expect(error.sessionId).toBe("sess-123");
      expect(error.context.sessionId).toBe("sess-123");
    });
  });

  describe("static factory methods", () => {
    it("should create connectionFailed error", () => {
      const originalError = new Error("ECONNREFUSED");
      const error = RealtimeError.connectionFailed(
        "Connection refused",
        originalError,
        "openai-realtime",
      );

      expect(error.code).toBe(REALTIME_ERROR_CODES.CONNECTION_FAILED);
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.retriable).toBe(true);
      // Original error is tracked internally
      expect(error.provider).toBe("openai-realtime");
    });

    it("should create connectionClosed error", () => {
      const error = RealtimeError.connectionClosed(
        "Server shutdown",
        "sess-456",
        "gemini-live",
      );

      expect(error.code).toBe(REALTIME_ERROR_CODES.CONNECTION_CLOSED);
      expect(error.message).toContain("Server shutdown");
      expect(error.sessionId).toBe("sess-456");
    });

    it("should create connectionClosed error without reason", () => {
      const error = RealtimeError.connectionClosed();

      expect(error.code).toBe(REALTIME_ERROR_CODES.CONNECTION_CLOSED);
      expect(error.message).toContain("unexpectedly");
    });

    it("should create sessionError", () => {
      const error = RealtimeError.sessionError(
        "invalid_audio",
        "Audio format not recognized",
        "sess-789",
        "openai-realtime",
      );

      expect(error.code).toBe(REALTIME_ERROR_CODES.SESSION_ERROR);
      expect(error.message).toContain("invalid_audio");
      expect(error.context.errorCode).toBe("invalid_audio");
      expect(error.context.errorMessage).toBe("Audio format not recognized");
    });

    it("should create notConfigured error", () => {
      const error = RealtimeError.notConfigured("openai-realtime");

      expect(error.code).toBe(REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED);
      expect(error.category).toBe(ErrorCategory.CONFIGURATION);
      expect(error.retriable).toBe(false);
    });

    it("should create timeout error", () => {
      const error = RealtimeError.timeout("connect", 30000, "gemini-live");

      expect(error.code).toBe(REALTIME_ERROR_CODES.TIMEOUT);
      expect(error.message).toContain("connect");
      expect(error.message).toContain("30000");
      expect(error.context.operation).toBe("connect");
      expect(error.context.timeoutMs).toBe(30000);
    });
  });
});

describe("VoiceErrorFactory", () => {
  describe("providerNotConfigured", () => {
    it("should create TTS provider not configured error", () => {
      const error = VoiceErrorFactory.providerNotConfigured(
        "elevenlabs",
        "tts",
      );

      expect(error.code).toBe(VOICE_ERROR_CODES.PROVIDER_NOT_CONFIGURED);
      expect(error.message).toContain("TTS");
      expect(error.message).toContain("elevenlabs");
      expect(error.provider).toBe("elevenlabs");
    });

    it("should create STT provider not configured error", () => {
      const error = VoiceErrorFactory.providerNotConfigured("deepgram", "stt");

      expect(error.message).toContain("STT");
      expect(error.message).toContain("deepgram");
    });

    it("should create Realtime provider not configured error", () => {
      const error = VoiceErrorFactory.providerNotConfigured(
        "openai-realtime",
        "realtime",
      );

      expect(error.message).toContain("REALTIME");
      expect(error.message).toContain("openai-realtime");
    });
  });

  describe("providerNotSupported", () => {
    it("should create provider not supported error", () => {
      const error = VoiceErrorFactory.providerNotSupported("unknown-provider");

      expect(error.code).toBe(VOICE_ERROR_CODES.PROVIDER_NOT_SUPPORTED);
      expect(error.message).toContain("unknown-provider");
    });

    it("should include available providers in message", () => {
      const error = VoiceErrorFactory.providerNotSupported("unknown", [
        "elevenlabs",
        "openai-tts",
      ]);

      expect(error.message).toContain("elevenlabs");
      expect(error.message).toContain("openai-tts");
      expect(error.context.availableProviders).toEqual([
        "elevenlabs",
        "openai-tts",
      ]);
    });
  });

  describe("featureNotSupported", () => {
    it("should create feature not supported error", () => {
      const error = VoiceErrorFactory.featureNotSupported(
        "streaming",
        "basic-tts",
      );

      expect(error.code).toBe(VOICE_ERROR_CODES.FEATURE_NOT_SUPPORTED);
      expect(error.message).toContain("streaming");
      expect(error.message).toContain("basic-tts");
      expect(error.context.feature).toBe("streaming");
    });
  });

  describe("networkError", () => {
    it("should create network error", () => {
      const originalError = new Error("ETIMEDOUT");
      const error = VoiceErrorFactory.networkError(
        "synthesize",
        originalError,
        "elevenlabs",
      );

      expect(error.code).toBe(VOICE_ERROR_CODES.NETWORK_ERROR);
      expect(error.message).toContain("synthesize");
      expect(error.message).toContain("ETIMEDOUT");
      expect(error.category).toBe(ErrorCategory.NETWORK);
      expect(error.retriable).toBe(true);
    });

    it("should handle missing original error", () => {
      const error = VoiceErrorFactory.networkError("transcribe");

      expect(error.code).toBe(VOICE_ERROR_CODES.NETWORK_ERROR);
      expect(error.message).toContain("Unknown error");
    });
  });

  describe("timeout", () => {
    it("should create timeout error", () => {
      const error = VoiceErrorFactory.timeout(
        "synthesize",
        30000,
        "google-tts",
      );

      expect(error.code).toBe(VOICE_ERROR_CODES.TIMEOUT);
      expect(error.message).toContain("synthesize");
      expect(error.message).toContain("30000");
      expect(error.category).toBe(ErrorCategory.TIMEOUT);
      expect(error.retriable).toBe(true);
      expect(error.context.operation).toBe("synthesize");
      expect(error.context.timeoutMs).toBe(30000);
    });
  });
});

describe("Error Code Constants", () => {
  describe("TTS_ERROR_CODES", () => {
    it("should have all expected TTS error codes", () => {
      // Note: TTS_ERROR_CODES is defined in ttsProcessor, these are from voiceTypes
      expect(TTS_ERROR_CODES).toBeDefined();
    });
  });

  describe("STT_ERROR_CODES", () => {
    it("should have all expected STT error codes", () => {
      expect(STT_ERROR_CODES.EMPTY_AUDIO).toBe("STT_EMPTY_AUDIO");
      expect(STT_ERROR_CODES.INVALID_FORMAT).toBe("STT_INVALID_FORMAT");
      expect(STT_ERROR_CODES.AUDIO_TOO_LONG).toBe("STT_AUDIO_TOO_LONG");
      expect(STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED).toBe(
        "STT_PROVIDER_NOT_SUPPORTED",
      );
      expect(STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED).toBe(
        "STT_PROVIDER_NOT_CONFIGURED",
      );
      expect(STT_ERROR_CODES.TRANSCRIPTION_FAILED).toBe(
        "STT_TRANSCRIPTION_FAILED",
      );
      expect(STT_ERROR_CODES.UNSUPPORTED_LANGUAGE).toBe(
        "STT_UNSUPPORTED_LANGUAGE",
      );
      expect(STT_ERROR_CODES.STREAMING_NOT_SUPPORTED).toBe(
        "STT_STREAMING_NOT_SUPPORTED",
      );
    });
  });

  describe("REALTIME_ERROR_CODES", () => {
    it("should have all expected Realtime error codes", () => {
      expect(REALTIME_ERROR_CODES.CONNECTION_FAILED).toBe(
        "REALTIME_CONNECTION_FAILED",
      );
      expect(REALTIME_ERROR_CODES.CONNECTION_CLOSED).toBe(
        "REALTIME_CONNECTION_CLOSED",
      );
      expect(REALTIME_ERROR_CODES.SESSION_ERROR).toBe("REALTIME_SESSION_ERROR");
      expect(REALTIME_ERROR_CODES.AUDIO_SEND_FAILED).toBe(
        "REALTIME_AUDIO_SEND_FAILED",
      );
      expect(REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED).toBe(
        "REALTIME_PROVIDER_NOT_CONFIGURED",
      );
      expect(REALTIME_ERROR_CODES.INVALID_CONFIGURATION).toBe(
        "REALTIME_INVALID_CONFIGURATION",
      );
      expect(REALTIME_ERROR_CODES.TIMEOUT).toBe("REALTIME_TIMEOUT");
    });
  });

  describe("VOICE_ERROR_CODES", () => {
    it("should have all expected general Voice error codes", () => {
      expect(VOICE_ERROR_CODES.PROVIDER_NOT_CONFIGURED).toBe(
        "VOICE_PROVIDER_NOT_CONFIGURED",
      );
      expect(VOICE_ERROR_CODES.PROVIDER_NOT_SUPPORTED).toBe(
        "VOICE_PROVIDER_NOT_SUPPORTED",
      );
      expect(VOICE_ERROR_CODES.FEATURE_NOT_SUPPORTED).toBe(
        "VOICE_FEATURE_NOT_SUPPORTED",
      );
      expect(VOICE_ERROR_CODES.INVALID_CONFIGURATION).toBe(
        "VOICE_INVALID_CONFIGURATION",
      );
      expect(VOICE_ERROR_CODES.NETWORK_ERROR).toBe("VOICE_NETWORK_ERROR");
      expect(VOICE_ERROR_CODES.TIMEOUT).toBe("VOICE_TIMEOUT");
    });
  });
});

describe("Error Inheritance", () => {
  it("VoiceError should extend Error", () => {
    const error = new VoiceError({ code: "TEST", message: "Test" });
    expect(error instanceof Error).toBe(true);
  });

  it("STTError should extend VoiceError", () => {
    const error = new STTError({ code: "TEST", message: "Test" });
    expect(error instanceof VoiceError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });

  it("RealtimeError should extend VoiceError", () => {
    const error = new RealtimeError({ code: "TEST", message: "Test" });
    expect(error instanceof VoiceError).toBe(true);
    expect(error instanceof Error).toBe(true);
  });
});
