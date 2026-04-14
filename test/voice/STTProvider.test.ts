/**
 * STT Provider Tests
 *
 * Unit tests for Speech-to-Text (STT) processor and handler interface.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  STTProcessor,
  type STTHandler,
} from "../../src/lib/voice/STTProvider.js";
import { STTError, STT_ERROR_CODES } from "../../src/lib/voice/errors.js";
import type {
  STTOptions,
  STTResult,
  STTLanguage,
  AudioFormat,
} from "../../src/lib/voice/types/voiceTypes.js";

/**
 * Mock STT Handler for testing
 */
class MockSTTHandler implements STTHandler {
  private configured = true;
  private mockResult: STTResult = {
    text: "Hello, this is a test transcription.",
    confidence: 0.95,
    language: "en-US",
    duration: 3.5,
    metadata: {
      latency: 150,
      provider: "mock-stt",
    },
  };

  transcribe = vi.fn(
    async (
      _audio: Buffer | ArrayBuffer,
      _options: STTOptions,
    ): Promise<STTResult> => {
      return this.mockResult;
    },
  );

  getSupportedFormats(): AudioFormat[] {
    return ["mp3", "wav", "ogg"];
  }

  isConfigured(): boolean {
    return this.configured;
  }

  setConfigured(configured: boolean): void {
    this.configured = configured;
  }

  setMockResult(result: STTResult): void {
    this.mockResult = result;
  }

  maxAudioDuration = 3600;
  supportsStreaming = false;
}

/**
 * Mock STT Handler with streaming support
 */
class MockStreamingSTTHandler implements STTHandler {
  private configured = true;

  transcribe = vi.fn(
    async (
      _audio: Buffer | ArrayBuffer,
      _options: STTOptions,
    ): Promise<STTResult> => {
      return {
        text: "Test transcription",
        confidence: 0.9,
      };
    },
  );

  async *transcribeStream(
    _audioStream: AsyncIterable<Buffer>,
    _options: STTOptions,
  ): AsyncIterable<{ index: number; text: string; isFinal: boolean }> {
    yield { index: 0, text: "Hello", isFinal: false };
    yield { index: 1, text: "Hello, world", isFinal: false };
    yield { index: 2, text: "Hello, world!", isFinal: true };
  }

  getSupportedFormats(): AudioFormat[] {
    return ["mp3", "wav"];
  }

  getSupportedLanguages = vi.fn(async (): Promise<STTLanguage[]> => {
    return [
      { code: "en-US", name: "English (US)", supportsDiarization: true },
      { code: "es-ES", name: "Spanish (Spain)", supportsDiarization: true },
    ];
  });

  isConfigured(): boolean {
    return this.configured;
  }

  maxAudioDuration = 7200;
  supportsStreaming = true;
}

describe("STTProcessor", () => {
  beforeEach(() => {
    // Clear all handlers before each test
    STTProcessor.clearHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("registerHandler", () => {
    it("should register an STT handler", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      expect(STTProcessor.supports("mock")).toBe(true);
    });

    it("should normalize provider names to lowercase", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("MOCK", handler);

      expect(STTProcessor.supports("mock")).toBe(true);
      expect(STTProcessor.supports("MOCK")).toBe(true);
    });

    it("should throw error when provider name is empty", () => {
      const handler = new MockSTTHandler();

      expect(() => STTProcessor.registerHandler("", handler)).toThrow(
        "Provider name is required",
      );
    });

    it("should throw error when handler is null", () => {
      expect(() =>
        STTProcessor.registerHandler("mock", null as unknown as STTHandler),
      ).toThrow("Handler is required");
    });

    it("should overwrite existing handler with warning", () => {
      const handler1 = new MockSTTHandler();
      const handler2 = new MockSTTHandler();

      STTProcessor.registerHandler("mock", handler1);
      STTProcessor.registerHandler("mock", handler2);

      expect(STTProcessor.supports("mock")).toBe(true);
    });
  });

  describe("supports", () => {
    it("should return true for registered providers", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("deepgram", handler);

      expect(STTProcessor.supports("deepgram")).toBe(true);
    });

    it("should return false for unregistered providers", () => {
      expect(STTProcessor.supports("unknown-provider")).toBe(false);
    });

    it("should return false for empty provider name", () => {
      expect(STTProcessor.supports("")).toBe(false);
    });
  });

  describe("getProviders", () => {
    it("should return list of registered providers", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("provider1", handler);
      STTProcessor.registerHandler("provider2", handler);

      const providers = STTProcessor.getProviders();

      expect(providers).toContain("provider1");
      expect(providers).toContain("provider2");
      expect(providers.length).toBe(2);
    });

    it("should return empty array when no providers registered", () => {
      expect(STTProcessor.getProviders()).toEqual([]);
    });
  });

  describe("transcribe", () => {
    it("should transcribe audio successfully", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const audioBuffer = Buffer.from("fake audio data");
      const result = await STTProcessor.transcribe(audioBuffer, "mock", {
        language: "en-US",
      });

      expect(result.text).toBe("Hello, this is a test transcription.");
      expect(result.confidence).toBe(0.95);
      expect(result.metadata?.provider).toBe("mock");
      expect(handler.transcribe).toHaveBeenCalled();
    });

    it("should throw STTError for empty audio", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const emptyBuffer = Buffer.alloc(0);

      await expect(
        STTProcessor.transcribe(emptyBuffer, "mock"),
      ).rejects.toThrow(STTError);

      await expect(
        STTProcessor.transcribe(emptyBuffer, "mock"),
      ).rejects.toMatchObject({
        code: STT_ERROR_CODES.AUDIO_EMPTY,
      });
    });

    it("should throw STTError for unsupported provider", async () => {
      const audioBuffer = Buffer.from("audio data");

      await expect(
        STTProcessor.transcribe(audioBuffer, "unknown"),
      ).rejects.toThrow(STTError);

      await expect(
        STTProcessor.transcribe(audioBuffer, "unknown"),
      ).rejects.toMatchObject({
        code: STT_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
      });
    });

    it("should throw STTError for unconfigured provider", async () => {
      const handler = new MockSTTHandler();
      handler.setConfigured(false);
      STTProcessor.registerHandler("mock", handler);

      const audioBuffer = Buffer.from("audio data");

      await expect(
        STTProcessor.transcribe(audioBuffer, "mock"),
      ).rejects.toThrow(STTError);

      await expect(
        STTProcessor.transcribe(audioBuffer, "mock"),
      ).rejects.toMatchObject({
        code: STT_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
      });
    });

    it("should throw STTError for unsupported audio format", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const audioBuffer = Buffer.from("audio data");

      await expect(
        STTProcessor.transcribe(audioBuffer, "mock", {
          format: "opus" as AudioFormat,
        }),
      ).rejects.toMatchObject({
        code: STT_ERROR_CODES.INVALID_AUDIO_FORMAT,
      });
    });

    it("should merge options with defaults", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const audioBuffer = Buffer.from("audio data");
      await STTProcessor.transcribe(audioBuffer, "mock", {
        language: "es-ES",
      });

      expect(handler.transcribe).toHaveBeenCalledWith(
        audioBuffer,
        expect.objectContaining({
          language: "es-ES",
          punctuation: true, // default value
        }),
      );
    });

    it("should add latency metadata to result", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const audioBuffer = Buffer.from("audio data");
      const result = await STTProcessor.transcribe(audioBuffer, "mock");

      expect(result.metadata?.latency).toBeDefined();
      expect(typeof result.metadata?.latency).toBe("number");
    });

    it("should handle ArrayBuffer input", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const arrayBuffer = new ArrayBuffer(100);
      const result = await STTProcessor.transcribe(arrayBuffer, "mock");

      expect(result.text).toBeDefined();
    });
  });

  describe("transcribeStream", () => {
    it("should stream transcription segments", async () => {
      const handler = new MockStreamingSTTHandler();
      STTProcessor.registerHandler("streaming-mock", handler);

      async function* audioGenerator(): AsyncIterable<Buffer> {
        yield Buffer.from("chunk1");
        yield Buffer.from("chunk2");
      }

      const segments: Array<{ index: number; text: string; isFinal: boolean }> =
        [];

      for await (const segment of STTProcessor.transcribeStream(
        audioGenerator(),
        "streaming-mock",
      )) {
        segments.push(segment);
      }

      expect(segments.length).toBe(3);
      expect(segments[2].isFinal).toBe(true);
    });

    it("should throw error for non-streaming provider", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      async function* audioGenerator(): AsyncIterable<Buffer> {
        yield Buffer.from("chunk1");
      }

      await expect(async () => {
        for await (const _segment of STTProcessor.transcribeStream(
          audioGenerator(),
          "mock",
        )) {
          // Should not reach here
        }
      }).rejects.toThrow();
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return supported languages", async () => {
      const handler = new MockStreamingSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const languages = await STTProcessor.getSupportedLanguages("mock");

      expect(languages.length).toBe(2);
      expect(languages[0].code).toBe("en-US");
      expect(handler.getSupportedLanguages).toHaveBeenCalled();
    });

    it("should return empty array if provider does not support language listing", async () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const languages = await STTProcessor.getSupportedLanguages("mock");

      expect(languages).toEqual([]);
    });
  });

  describe("getSupportedFormats", () => {
    it("should return supported audio formats", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      const formats = STTProcessor.getSupportedFormats("mock");

      expect(formats).toContain("mp3");
      expect(formats).toContain("wav");
    });

    it("should throw error for unknown provider", () => {
      expect(() => STTProcessor.getSupportedFormats("unknown")).toThrow();
    });
  });

  describe("supportsStreaming", () => {
    it("should return true for streaming providers", () => {
      const handler = new MockStreamingSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      expect(STTProcessor.supportsStreaming("mock")).toBe(true);
    });

    it("should return false for non-streaming providers", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock", handler);

      expect(STTProcessor.supportsStreaming("mock")).toBe(false);
    });

    it("should return false for unknown providers", () => {
      expect(STTProcessor.supportsStreaming("unknown")).toBe(false);
    });
  });

  describe("clearHandlers", () => {
    it("should clear all registered handlers", () => {
      const handler = new MockSTTHandler();
      STTProcessor.registerHandler("mock1", handler);
      STTProcessor.registerHandler("mock2", handler);

      expect(STTProcessor.getProviders().length).toBe(2);

      STTProcessor.clearHandlers();

      expect(STTProcessor.getProviders().length).toBe(0);
    });
  });
});

describe("STTHandler Interface", () => {
  it("should implement all required methods", () => {
    const handler = new MockSTTHandler();

    expect(typeof handler.transcribe).toBe("function");
    expect(typeof handler.getSupportedFormats).toBe("function");
    expect(typeof handler.isConfigured).toBe("function");
  });

  it("should have optional methods", () => {
    const handler = new MockStreamingSTTHandler();

    expect(typeof handler.transcribeStream).toBe("function");
    expect(typeof handler.getSupportedLanguages).toBe("function");
  });
});
