/**
 * Tests for TTSProcessor
 */

import { describe, it, expect, beforeEach } from "vitest";
import { TTSProcessor } from "../../src/lib/utils/ttsProcessor.js";
import type {
  TTSHandler,
  TTSOptions,
  TTSSynthesizeResult,
  TTSChunk,
} from "../../src/lib/types/ttsTypes.js";
import { TTSError } from "../../src/lib/types/ttsTypes.js";

/**
 * Mock TTS handler with streaming support
 */
class MockStreamingHandler implements TTSHandler {
  supportsStreaming(): boolean {
    return true;
  }

  async synthesize(
    text: string,
    options: TTSOptions,
  ): Promise<TTSSynthesizeResult> {
    return {
      audio: Buffer.from(`Audio for: ${text}`),
      encoding: options.encoding || "MP3",
      size: Buffer.from(`Audio for: ${text}`).length,
      duration: 1.5,
    };
  }

  async *synthesizeStream(
    text: string,
    options: TTSOptions,
  ): AsyncIterable<TTSChunk> {
    // Simulate streaming by breaking into chunks
    const words = text.split(" ");
    for (let i = 0; i < words.length; i++) {
      const chunk: TTSChunk = {
        audio: Buffer.from(`Audio chunk ${i + 1}: ${words[i]}`),
        complete: i === words.length - 1,
        metadata: {
          size: Buffer.from(`Audio chunk ${i + 1}: ${words[i]}`).length,
          sequence: i + 1,
        },
      };
      yield chunk;
    }
  }
}

/**
 * Mock TTS handler without streaming support (fallback)
 */
class MockNonStreamingHandler implements TTSHandler {
  supportsStreaming(): boolean {
    return false;
  }

  async synthesize(
    text: string,
    options: TTSOptions,
  ): Promise<TTSSynthesizeResult> {
    return {
      audio: Buffer.from(`Audio for: ${text}`),
      encoding: options.encoding || "MP3",
      size: Buffer.from(`Audio for: ${text}`).length,
      duration: 2.0,
    };
  }
}

/**
 * Mock TTS handler that throws errors
 */
class MockErrorHandler implements TTSHandler {
  supportsStreaming(): boolean {
    return false;
  }

  async synthesize(
    _text: string,
    _options: TTSOptions,
  ): Promise<TTSSynthesizeResult> {
    throw new Error("Synthesis failed");
  }
}

describe("TTSProcessor", () => {
  describe("constructor", () => {
    it("should create processor with handler", () => {
      const handler = new MockStreamingHandler();
      const processor = new TTSProcessor(handler);
      expect(processor).toBeDefined();
    });
  });

  describe("synthesize()", () => {
    let processor: TTSProcessor;

    beforeEach(() => {
      const handler = new MockStreamingHandler();
      processor = new TTSProcessor(handler);
    });

    it("should synthesize text successfully", async () => {
      const result = await processor.synthesize("Hello, world!", {
        voice: "en-US-Neural2-C",
        encoding: "MP3",
      });

      expect(result).toBeDefined();
      expect(result.audio).toBeInstanceOf(Buffer);
      expect(result.encoding).toBe("MP3");
      expect(result.size).toBeGreaterThan(0);
    });

    it("should throw error for empty text", async () => {
      await expect(
        processor.synthesize("", {
          voice: "en-US-Neural2-C",
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for whitespace-only text", async () => {
      await expect(
        processor.synthesize("   ", {
          voice: "en-US-Neural2-C",
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for text exceeding 5000 bytes", async () => {
      const longText = "a".repeat(5001);
      await expect(
        processor.synthesize(longText, {
          voice: "en-US-Neural2-C",
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for missing voice", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "",
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid voice format", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "invalid-voice",
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid speaking rate (too low)", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "en-US-Neural2-C",
          speakingRate: 0.1,
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid speaking rate (too high)", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "en-US-Neural2-C",
          speakingRate: 5.0,
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid pitch (too low)", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "en-US-Neural2-C",
          pitch: -25.0,
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid pitch (too high)", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "en-US-Neural2-C",
          pitch: 25.0,
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid encoding", async () => {
      await expect(
        processor.synthesize("Hello", {
          voice: "en-US-Neural2-C",
          // @ts-expect-error Testing invalid encoding
          encoding: "INVALID",
        }),
      ).rejects.toThrow(TTSError);
    });

    it("should accept valid speaking rate", async () => {
      const result = await processor.synthesize("Hello", {
        voice: "en-US-Neural2-C",
        speakingRate: 1.5,
      });
      expect(result).toBeDefined();
    });

    it("should accept valid pitch", async () => {
      const result = await processor.synthesize("Hello", {
        voice: "en-US-Neural2-C",
        pitch: 5.0,
      });
      expect(result).toBeDefined();
    });

    it("should wrap handler errors", async () => {
      const errorHandler = new MockErrorHandler();
      const errorProcessor = new TTSProcessor(errorHandler);

      await expect(
        errorProcessor.synthesize("Hello", {
          voice: "en-US-Neural2-C",
        }),
      ).rejects.toThrow(TTSError);
    });
  });

  describe("synthesizeStream() with streaming handler", () => {
    let processor: TTSProcessor;

    beforeEach(() => {
      const handler = new MockStreamingHandler();
      processor = new TTSProcessor(handler);
    });

    it("should stream audio chunks", async () => {
      const chunks: TTSChunk[] = [];

      for await (const chunk of processor.synthesizeStream("Hello world test", {
        voice: "en-US-Neural2-C",
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(3); // "Hello", "world", "test"
      expect(chunks[0].complete).toBe(false);
      expect(chunks[1].complete).toBe(false);
      expect(chunks[2].complete).toBe(true); // Last chunk
    });

    it("should include metadata in chunks", async () => {
      const chunks: TTSChunk[] = [];

      for await (const chunk of processor.synthesizeStream("Hello world", {
        voice: "en-US-Neural2-C",
      })) {
        chunks.push(chunk);
      }

      expect(chunks[0].metadata?.sequence).toBe(1);
      expect(chunks[1].metadata?.sequence).toBe(2);
      expect(chunks[0].metadata?.size).toBeGreaterThan(0);
    });

    it("should handle single word", async () => {
      const chunks: TTSChunk[] = [];

      for await (const chunk of processor.synthesizeStream("Hello", {
        voice: "en-US-Neural2-C",
      })) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBe(1);
      expect(chunks[0].complete).toBe(true);
    });
  });

  describe("synthesizeStream() with non-streaming handler (fallback)", () => {
    let processor: TTSProcessor;

    beforeEach(() => {
      const handler = new MockNonStreamingHandler();
      processor = new TTSProcessor(handler);
    });

    it("should use fallback buffering strategy", async () => {
      const chunks: TTSChunk[] = [];

      for await (const chunk of processor.synthesizeStream("Hello world test", {
        voice: "en-US-Neural2-C",
      })) {
        chunks.push(chunk);
      }

      // Fallback yields single chunk
      expect(chunks.length).toBe(1);
      expect(chunks[0].complete).toBe(true);
      expect(chunks[0].audio).toBeInstanceOf(Buffer);
      expect(chunks[0].metadata?.sequence).toBe(1);
    });

    it("should include complete audio in single chunk", async () => {
      const chunks: TTSChunk[] = [];

      for await (const chunk of processor.synthesizeStream("Hello", {
        voice: "en-US-Neural2-C",
      })) {
        chunks.push(chunk);
      }

      expect(chunks[0].audio.toString()).toContain("Audio for: Hello");
      expect(chunks[0].metadata?.size).toBeGreaterThan(0);
    });
  });

  describe("synthesizeStream() validation", () => {
    let processor: TTSProcessor;

    beforeEach(() => {
      const handler = new MockStreamingHandler();
      processor = new TTSProcessor(handler);
    });

    it("should throw error for empty text", async () => {
      const stream = processor.synthesizeStream("", {
        voice: "en-US-Neural2-C",
      });

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should not reach here
        }
      }).rejects.toThrow(TTSError);
    });

    it("should throw error for invalid voice", async () => {
      const stream = processor.synthesizeStream("Hello", {
        voice: "invalid",
      });

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should not reach here
        }
      }).rejects.toThrow(TTSError);
    });

    it("should throw error for text exceeding limit", async () => {
      const longText = "a".repeat(5001);
      const stream = processor.synthesizeStream(longText, {
        voice: "en-US-Neural2-C",
      });

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should not reach here
        }
      }).rejects.toThrow(TTSError);
    });
  });

  describe("synthesizeStream() error handling", () => {
    it("should handle errors in streaming handler", async () => {
      class ErrorStreamingHandler implements TTSHandler {
        supportsStreaming(): boolean {
          return true;
        }

        async synthesize(): Promise<TTSSynthesizeResult> {
          throw new Error("Should not be called");
        }

        async *synthesizeStream(): AsyncIterable<TTSChunk> {
          yield {
            audio: Buffer.from("chunk1"),
            complete: false,
            metadata: { size: 6, sequence: 1 },
          };
          throw new Error("Streaming error");
        }
      }

      const handler = new ErrorStreamingHandler();
      const processor = new TTSProcessor(handler);

      const stream = processor.synthesizeStream("Hello", {
        voice: "en-US-Neural2-C",
      });

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should throw after first chunk
        }
      }).rejects.toThrow(TTSError);
    });

    it("should handle errors in fallback synthesis", async () => {
      const errorHandler = new MockErrorHandler();
      const processor = new TTSProcessor(errorHandler);

      const stream = processor.synthesizeStream("Hello", {
        voice: "en-US-Neural2-C",
      });

      await expect(async () => {
        for await (const _chunk of stream) {
          // Should not reach here
        }
      }).rejects.toThrow(TTSError);
    });
  });
});
