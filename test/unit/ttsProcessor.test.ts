/**
 * TTSProcessor Unit Tests
 *
 * Comprehensive tests for the TTS synthesis orchestration logic.
 * Tests cover text validation, handler lookup, error handling, and metadata processing.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TTSProcessor } from "../../src/lib/utils/ttsProcessor.js";
import { TTSError, TTSErrorCode } from "../../src/lib/types/ttsTypes.js";
import type {
  TTSHandler,
  TTSOptions,
  TTSResult,
} from "../../src/lib/types/ttsTypes.js";

describe("TTSProcessor", () => {
  let processor: TTSProcessor;

  beforeEach(() => {
    processor = new TTSProcessor();
  });

  describe("Handler Registration", () => {
    it("should register a handler", () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn(),
      };

      processor.registerHandler("test-provider", mockHandler);

      expect(processor.hasHandler("test-provider")).toBe(true);
      expect(processor.getHandler("test-provider")).toBe(mockHandler);
    });

    it("should handle case-insensitive provider names", () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn(),
      };

      processor.registerHandler("TEST-PROVIDER", mockHandler);

      expect(processor.hasHandler("test-provider")).toBe(true);
      expect(processor.hasHandler("Test-Provider")).toBe(true);
      expect(processor.getHandler("test-provider")).toBe(mockHandler);
    });

    it("should unregister a handler", () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn(),
      };

      processor.registerHandler("test-provider", mockHandler);
      expect(processor.hasHandler("test-provider")).toBe(true);

      processor.unregisterHandler("test-provider");
      expect(processor.hasHandler("test-provider")).toBe(false);
    });

    it("should return list of registered providers", () => {
      const handler1: TTSHandler = {
        providerName: "provider1",
        synthesize: vi.fn(),
      };
      const handler2: TTSHandler = {
        providerName: "provider2",
        synthesize: vi.fn(),
      };

      processor.registerHandler("provider1", handler1);
      processor.registerHandler("provider2", handler2);

      const providers = processor.getRegisteredProviders();
      expect(providers).toContain("provider1");
      expect(providers).toContain("provider2");
      expect(providers.length).toBe(2);
    });
  });

  describe("Text Validation", () => {
    it("should reject empty text", async () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn(),
      };
      processor.registerHandler("test-provider", mockHandler);

      await expect(
        processor.synthesize({
          text: "",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(TTSError);

      await expect(
        processor.synthesize({
          text: "",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(/Text is required/);
    });

    it("should reject whitespace-only text", async () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn(),
      };
      processor.registerHandler("test-provider", mockHandler);

      await expect(
        processor.synthesize({
          text: "   \n\t  ",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should reject text exceeding max length", async () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn(),
      };
      processor.registerHandler("test-provider", mockHandler);

      // Create text longer than 5000 bytes
      const longText = "a".repeat(5001);

      await expect(
        processor.synthesize({
          text: longText,
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(TTSError);

      await expect(
        processor.synthesize({
          text: longText,
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(/exceeds maximum length/);
    });

    it("should accept text at exactly max length", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "mp3",
        size: 10,
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      // Create text exactly 5000 bytes
      const maxText = "a".repeat(5000);

      const result = await processor.synthesize({
        text: maxText,
        provider: "test-provider",
        options: { voice: "en-US-Neural2-C" },
      });

      expect(result).toBeDefined();
      expect(mockHandler.synthesize).toHaveBeenCalledWith(maxText, {
        voice: "en-US-Neural2-C",
      });
    });

    it("should handle multi-byte characters correctly", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "mp3",
        size: 10,
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      // Emoji and other multi-byte characters
      const text = "Hello 👋 World 🌍";

      const result = await processor.synthesize({
        text,
        provider: "test-provider",
        options: { voice: "en-US-Neural2-C" },
      });

      expect(result).toBeDefined();
    });
  });

  describe("Handler Lookup", () => {
    it("should throw error if handler not found", async () => {
      await expect(
        processor.synthesize({
          text: "Hello, world!",
          provider: "nonexistent-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(TTSError);

      await expect(
        processor.synthesize({
          text: "Hello, world!",
          provider: "nonexistent-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(/handler not found/i);
    });

    it("should include provider name in error", async () => {
      try {
        await processor.synthesize({
          text: "Hello, world!",
          provider: "missing-provider",
          options: { voice: "en-US-Neural2-C" },
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(TTSError);
        const ttsError = error as TTSError;
        expect(ttsError.provider).toBe("missing-provider");
        expect(ttsError.code).toBe(TTSErrorCode.HANDLER_NOT_FOUND);
      }
    });
  });

  describe("Handler Synthesis", () => {
    it("should call handler synthesize with correct arguments", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "mp3",
        size: 10,
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      const options: TTSOptions = {
        voice: "en-US-Neural2-C",
        format: "mp3",
        speed: 1.5,
      };

      await processor.synthesize({
        text: "Hello, world!",
        provider: "test-provider",
        options,
      });

      expect(mockHandler.synthesize).toHaveBeenCalledTimes(1);
      expect(mockHandler.synthesize).toHaveBeenCalledWith(
        "Hello, world!",
        options,
      );
    });

    it("should return result from handler", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "mp3",
        size: 10,
        duration: 5.5,
        sampleRate: 44100,
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      const result = await processor.synthesize({
        text: "Test audio",
        provider: "test-provider",
        options: { voice: "en-US-Neural2-C" },
      });

      expect(result.buffer).toEqual(mockResult.buffer);
      expect(result.format).toBe("mp3");
      expect(result.size).toBe(10);
      expect(result.duration).toBe(5.5);
      expect(result.sampleRate).toBe(44100);
    });

    it("should handle handler errors", async () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockRejectedValue(new Error("Provider API error")),
      };
      processor.registerHandler("test-provider", mockHandler);

      await expect(
        processor.synthesize({
          text: "Hello, world!",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(TTSError);

      await expect(
        processor.synthesize({
          text: "Hello, world!",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        }),
      ).rejects.toThrow(/Synthesis failed/);
    });

    it("should preserve TTSError from handler", async () => {
      const handlerError = new TTSError(
        "Invalid voice",
        TTSErrorCode.INVALID_OPTIONS,
        "test-provider",
      );

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockRejectedValue(handlerError),
      };
      processor.registerHandler("test-provider", mockHandler);

      try {
        await processor.synthesize({
          text: "Hello, world!",
          provider: "test-provider",
          options: { voice: "invalid-voice" },
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBe(handlerError);
        expect(error).toBeInstanceOf(TTSError);
        const ttsError = error as TTSError;
        expect(ttsError.code).toBe(TTSErrorCode.INVALID_OPTIONS);
      }
    });
  });

  describe("Post-processing and Metadata", () => {
    it("should add voice metadata if not present in result", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "mp3",
        size: 10,
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      const result = await processor.synthesize({
        text: "Hello, world!",
        provider: "test-provider",
        options: { voice: "en-US-Neural2-C" },
      });

      expect(result.voice).toBe("en-US-Neural2-C");
    });

    it("should preserve voice from result if already present", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "mp3",
        size: 10,
        voice: "result-voice",
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      const result = await processor.synthesize({
        text: "Hello, world!",
        provider: "test-provider",
        options: { voice: "options-voice" },
      });

      // Result voice should take precedence
      expect(result.voice).toBe("result-voice");
    });

    it("should preserve all original result fields", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio data"),
        format: "wav",
        size: 1024,
        duration: 10.5,
        voice: "en-US-Neural2-D",
        sampleRate: 48000,
      };

      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("test-provider", mockHandler);

      const result = await processor.synthesize({
        text: "Preserve all fields",
        provider: "test-provider",
        options: { voice: "en-US-Neural2-C" },
      });

      expect(result).toEqual(mockResult);
    });
  });

  describe("Error Handling", () => {
    it("should wrap non-TTSError exceptions", async () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockRejectedValue(new TypeError("Type error")),
      };
      processor.registerHandler("test-provider", mockHandler);

      try {
        await processor.synthesize({
          text: "Hello, world!",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(TTSError);
        const ttsError = error as TTSError;
        expect(ttsError.code).toBe(TTSErrorCode.SYNTHESIS_FAILED);
        expect(ttsError.message).toContain("Type error");
      }
    });

    it("should handle non-Error exceptions", async () => {
      const mockHandler: TTSHandler = {
        providerName: "test-provider",
        synthesize: vi.fn().mockRejectedValue("String error"),
      };
      processor.registerHandler("test-provider", mockHandler);

      try {
        await processor.synthesize({
          text: "Hello, world!",
          provider: "test-provider",
          options: { voice: "en-US-Neural2-C" },
        });
        expect.fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(TTSError);
        const ttsError = error as TTSError;
        expect(ttsError.code).toBe(TTSErrorCode.SYNTHESIS_FAILED);
        expect(ttsError.message).toContain("String error");
      }
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete synthesis flow", async () => {
      const audioBuffer = Buffer.from("synthesized audio data");
      const mockResult: TTSResult = {
        buffer: audioBuffer,
        format: "opus",
        size: audioBuffer.length,
        duration: 3.5,
        sampleRate: 48000,
      };

      const mockHandler: TTSHandler = {
        providerName: "google-ai",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      processor.registerHandler("google-ai", mockHandler);

      const options: TTSOptions = {
        voice: "en-US-Neural2-C",
        format: "opus",
        speed: 1.0,
        quality: "hd",
      };

      const result = await processor.synthesize({
        text: "This is a complete test.",
        provider: "google-ai",
        options,
      });

      expect(result.buffer).toEqual(audioBuffer);
      expect(result.format).toBe("opus");
      expect(result.size).toBe(audioBuffer.length);
      expect(result.duration).toBe(3.5);
      expect(result.sampleRate).toBe(48000);
      expect(result.voice).toBe("en-US-Neural2-C");
    });

    it("should handle multiple providers", async () => {
      const mockResult: TTSResult = {
        buffer: Buffer.from("audio"),
        format: "mp3",
        size: 5,
      };

      const handler1: TTSHandler = {
        providerName: "provider1",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };
      const handler2: TTSHandler = {
        providerName: "provider2",
        synthesize: vi.fn().mockResolvedValue(mockResult),
      };

      processor.registerHandler("provider1", handler1);
      processor.registerHandler("provider2", handler2);

      await processor.synthesize({
        text: "Test 1",
        provider: "provider1",
        options: { voice: "voice1" },
      });

      await processor.synthesize({
        text: "Test 2",
        provider: "provider2",
        options: { voice: "voice2" },
      });

      expect(handler1.synthesize).toHaveBeenCalledTimes(1);
      expect(handler2.synthesize).toHaveBeenCalledTimes(1);
    });
  });
});
