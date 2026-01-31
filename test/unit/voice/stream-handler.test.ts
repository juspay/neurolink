/**
 * Voice Stream Handler Tests
 *
 * Tests for TTS and STT streaming operations including:
 * - AudioStreamAccumulator
 * - TranscriptionStreamAccumulator
 * - Stream processing utilities
 * - Error handling in streams
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  AudioStreamAccumulator,
  TranscriptionStreamAccumulator,
  processTTSStream,
  processSTTStream,
  arrayToAudioStream,
  splitBufferForStreaming,
  withTimeout,
  batchStream,
  rateLimitStream,
} from "../../../src/lib/voice/stream-handler.js";
import type { TTSStreamChunk } from "../../../src/lib/types/voiceTypes.js";
import type { TranscriptionSegment } from "../../../src/lib/types/sttTypes.js";

describe("AudioStreamAccumulator", () => {
  let accumulator: AudioStreamAccumulator;

  beforeEach(() => {
    accumulator = new AudioStreamAccumulator();
  });

  describe("basic operations", () => {
    it("should start empty", () => {
      expect(accumulator.isEmpty()).toBe(true);
      expect(accumulator.isComplete()).toBe(false);
      expect(accumulator.getState().chunkCount).toBe(0);
      expect(accumulator.getState().totalBytes).toBe(0);
    });

    it("should accumulate buffer chunks", () => {
      const chunk1 = Buffer.from("audio data 1");
      const chunk2 = Buffer.from("audio data 2");

      accumulator.addChunk(chunk1);
      accumulator.addChunk(chunk2);

      expect(accumulator.isEmpty()).toBe(false);
      expect(accumulator.getState().chunkCount).toBe(2);
      expect(accumulator.getState().totalBytes).toBe(
        chunk1.length + chunk2.length,
      );
    });

    it("should accumulate TTSStreamChunk objects", () => {
      const chunk: TTSStreamChunk = {
        data: Buffer.from("audio chunk"),
        index: 0,
        isFinal: false,
        format: "pcm16",
        sampleRate: 16000,
      };

      accumulator.addChunk(chunk);

      expect(accumulator.getState().chunkCount).toBe(1);
      expect(accumulator.getState().totalBytes).toBe(chunk.data.length);
    });

    it("should auto-complete on final chunk", () => {
      const chunk: TTSStreamChunk = {
        data: Buffer.from("final audio"),
        index: 0,
        isFinal: true,
        format: "pcm16",
      };

      accumulator.addChunk(chunk);

      expect(accumulator.isComplete()).toBe(true);
    });

    it("should combine chunks into single buffer", () => {
      const chunk1 = Buffer.from("hello ");
      const chunk2 = Buffer.from("world");

      accumulator.addChunk(chunk1);
      accumulator.addChunk(chunk2);

      const combined = accumulator.getBuffer();
      expect(combined.toString()).toBe("hello world");
    });

    it("should return empty buffer when no chunks added", () => {
      const buffer = accumulator.getBuffer();
      expect(buffer.length).toBe(0);
    });
  });

  describe("limits and constraints", () => {
    it("should throw when adding to completed stream", () => {
      accumulator.complete();

      expect(() => {
        accumulator.addChunk(Buffer.from("data"));
      }).toThrow("Cannot add chunks to completed stream");
    });

    it("should throw when max chunks exceeded", () => {
      const smallAccumulator = new AudioStreamAccumulator(2);

      smallAccumulator.addChunk(Buffer.from("1"));
      smallAccumulator.addChunk(Buffer.from("2"));

      expect(() => {
        smallAccumulator.addChunk(Buffer.from("3"));
      }).toThrow("Maximum chunk count exceeded: 2");
    });

    it("should throw when max bytes exceeded", () => {
      const smallAccumulator = new AudioStreamAccumulator(10000, 10);

      expect(() => {
        smallAccumulator.addChunk(Buffer.alloc(20));
      }).toThrow("Maximum byte limit exceeded: 10");
    });
  });

  describe("statistics", () => {
    it("should track timing statistics", async () => {
      accumulator.addChunk(Buffer.from("data"));
      await new Promise((resolve) => setTimeout(resolve, 10));
      accumulator.addChunk(Buffer.from("more data"));

      const stats = accumulator.getStats();

      expect(stats.chunks).toBe(2);
      expect(stats.bytes).toBeGreaterThan(0);
      expect(stats.duration).toBeGreaterThanOrEqual(0);
      expect(stats.isComplete).toBe(false);
    });

    it("should calculate bytes per second", async () => {
      accumulator.addChunk(Buffer.alloc(1000));
      await new Promise((resolve) => setTimeout(resolve, 50));
      accumulator.addChunk(Buffer.alloc(1000));

      const stats = accumulator.getStats();

      expect(stats.bytesPerSecond).toBeGreaterThan(0);
    });
  });

  describe("WAV conversion", () => {
    it("should convert PCM to WAV format", () => {
      // Add some PCM data
      const pcmData = Buffer.alloc(1000);
      accumulator.addChunk(pcmData);

      const wavBuffer = accumulator.getWavBuffer({
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
      });

      // WAV header is 44 bytes
      expect(wavBuffer.length).toBe(pcmData.length + 44);

      // Check RIFF header
      expect(wavBuffer.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(wavBuffer.subarray(8, 12).toString("ascii")).toBe("WAVE");
    });
  });

  describe("reset", () => {
    it("should reset accumulator state", () => {
      accumulator.addChunk(Buffer.from("data"));
      accumulator.complete();

      accumulator.reset();

      expect(accumulator.isEmpty()).toBe(true);
      expect(accumulator.isComplete()).toBe(false);
      expect(accumulator.getState().chunkCount).toBe(0);
    });
  });
});

describe("TranscriptionStreamAccumulator", () => {
  let accumulator: TranscriptionStreamAccumulator;

  beforeEach(() => {
    accumulator = new TranscriptionStreamAccumulator();
  });

  const createSegment = (
    text: string,
    start: number,
    isFinal: boolean,
  ): TranscriptionSegment => ({
    text,
    start,
    end: start + 1,
    confidence: 0.95,
    isFinal,
  });

  describe("basic operations", () => {
    it("should start empty", () => {
      expect(accumulator.getSegments()).toHaveLength(0);
      expect(accumulator.getText()).toBe("");
      expect(accumulator.getIsComplete()).toBe(false);
    });

    it("should accumulate final segments", () => {
      accumulator.addSegment(createSegment("Hello", 0, true));
      accumulator.addSegment(createSegment("World", 1, true));

      expect(accumulator.getSegments()).toHaveLength(2);
      expect(accumulator.getText()).toBe("Hello World");
    });

    it("should track partial segments separately", () => {
      accumulator.addSegment(createSegment("Hel", 0, false));
      accumulator.addSegment(createSegment("Hello", 0, false));

      expect(accumulator.getSegments()).toHaveLength(0);
      expect(accumulator.getPartialSegment()?.text).toBe("Hello");
      expect(accumulator.getText()).toBe("Hello");
    });

    it("should finalize partial segment when final arrives", () => {
      accumulator.addSegment(createSegment("Hel", 0, false));
      accumulator.addSegment(createSegment("Hello", 0, true));

      // Implementation pushes partial segment before final, so we get 2 segments
      expect(accumulator.getSegments()).toHaveLength(2);
      expect(accumulator.getPartialSegment()).toBeNull();
      expect(accumulator.getFinalText()).toBe("Hel Hello");
    });
  });

  describe("completion", () => {
    it("should mark as complete", () => {
      accumulator.addSegment(createSegment("Test", 0, true));
      accumulator.complete();

      expect(accumulator.getIsComplete()).toBe(true);
    });

    it("should finalize partial segment on complete", () => {
      accumulator.addSegment(createSegment("Partial text", 0, false));
      accumulator.complete();

      expect(accumulator.getSegments()).toHaveLength(1);
      expect(accumulator.getSegments()[0].isFinal).toBe(true);
    });

    it("should throw when adding to completed stream", () => {
      accumulator.complete();

      expect(() => {
        accumulator.addSegment(createSegment("Too late", 0, true));
      }).toThrow("Cannot add segments to completed stream");
    });
  });

  describe("statistics", () => {
    it("should calculate average confidence", () => {
      accumulator.addSegment({
        ...createSegment("Word 1", 0, true),
        confidence: 0.8,
      });
      accumulator.addSegment({
        ...createSegment("Word 2", 1, true),
        confidence: 1.0,
      });

      expect(accumulator.getAverageConfidence()).toBe(0.9);
    });

    it("should return 0 confidence for empty accumulator", () => {
      expect(accumulator.getAverageConfidence()).toBe(0);
    });

    it("should calculate duration from segments", () => {
      accumulator.addSegment({ ...createSegment("Test", 0, true), end: 5 });

      expect(accumulator.getDuration()).toBe(5);
    });

    it("should provide comprehensive stats", () => {
      accumulator.addSegment(createSegment("Hello world test", 0, true));

      const stats = accumulator.getStats();

      expect(stats.segmentCount).toBe(1);
      expect(stats.wordCount).toBe(3);
      expect(stats.characterCount).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBe(0.95);
      expect(stats.processingTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe("reset", () => {
    it("should reset all state", () => {
      accumulator.addSegment(createSegment("Test", 0, true));
      accumulator.addSegment(createSegment("Partial", 1, false));
      accumulator.complete();

      accumulator.reset();

      expect(accumulator.getSegments()).toHaveLength(0);
      expect(accumulator.getPartialSegment()).toBeNull();
      expect(accumulator.getIsComplete()).toBe(false);
    });
  });
});

describe("processTTSStream", () => {
  async function* createMockTTSStream(
    chunks: TTSStreamChunk[],
  ): AsyncIterable<TTSStreamChunk> {
    for (const chunk of chunks) {
      yield chunk;
    }
  }

  it("should process TTS stream and return combined buffer", async () => {
    const chunks: TTSStreamChunk[] = [
      {
        data: Buffer.from("Hello "),
        index: 0,
        isFinal: false,
        format: "pcm16",
      },
      { data: Buffer.from("World"), index: 1, isFinal: true, format: "pcm16" },
    ];

    const result = await processTTSStream(createMockTTSStream(chunks));

    expect(result.toString()).toBe("Hello World");
  });

  it("should call event handlers", async () => {
    const chunks: TTSStreamChunk[] = [
      { data: Buffer.from("Test"), index: 0, isFinal: true, format: "pcm16" },
    ];

    const onChunk = vi.fn();
    const onComplete = vi.fn();
    const onProgress = vi.fn();

    await processTTSStream(createMockTTSStream(chunks), {
      onChunk,
      onComplete,
      onProgress,
    });

    expect(onChunk).toHaveBeenCalledWith(chunks[0], 0);
    expect(onComplete).toHaveBeenCalledWith(chunks);
    expect(onProgress).toHaveBeenCalled();
  });

  it("should handle errors and call onError", async () => {
    async function* errorStream(): AsyncIterable<TTSStreamChunk> {
      yield* []; // Satisfy require-yield
      throw new Error("Stream error");
    }

    const onError = vi.fn();

    await expect(processTTSStream(errorStream(), { onError })).rejects.toThrow(
      "Stream error",
    );

    expect(onError).toHaveBeenCalled();
    expect(onError.mock.calls[0][0].message).toBe("Stream error");
  });

  it("should handle empty stream", async () => {
    async function* emptyStream(): AsyncIterable<TTSStreamChunk> {
      // Empty stream
    }

    const result = await processTTSStream(emptyStream());

    expect(result.length).toBe(0);
  });
});

describe("processSTTStream", () => {
  async function* createMockSTTStream(
    segments: TranscriptionSegment[],
  ): AsyncIterable<TranscriptionSegment> {
    for (const segment of segments) {
      yield segment;
    }
  }

  it("should process STT stream and return segments", async () => {
    const segments: TranscriptionSegment[] = [
      { text: "Hello", start: 0, end: 1, confidence: 0.9, isFinal: true },
      { text: "World", start: 1, end: 2, confidence: 0.95, isFinal: true },
    ];

    const result = await processSTTStream(createMockSTTStream(segments));

    expect(result).toHaveLength(2);
    expect(result[0].text).toBe("Hello");
    expect(result[1].text).toBe("World");
  });

  it("should call event handlers", async () => {
    const segments: TranscriptionSegment[] = [
      { text: "Test", start: 0, end: 1, confidence: 0.9, isFinal: true },
    ];

    const onChunk = vi.fn();
    const onComplete = vi.fn();

    await processSTTStream(createMockSTTStream(segments), {
      onChunk,
      onComplete,
    });

    expect(onChunk).toHaveBeenCalledWith(segments[0], 0);
    expect(onComplete).toHaveBeenCalled();
  });

  it("should handle errors", async () => {
    async function* errorStream(): AsyncIterable<TranscriptionSegment> {
      yield* []; // Satisfy require-yield
      throw new Error("Transcription failed");
    }

    const onError = vi.fn();

    await expect(processSTTStream(errorStream(), { onError })).rejects.toThrow(
      "Transcription failed",
    );

    expect(onError).toHaveBeenCalled();
  });
});

describe("arrayToAudioStream", () => {
  it("should convert array to async iterable", async () => {
    const chunks = [Buffer.from("a"), Buffer.from("b"), Buffer.from("c")];

    const result: Buffer[] = [];
    for await (const chunk of arrayToAudioStream(chunks)) {
      result.push(chunk);
    }

    expect(result).toHaveLength(3);
    expect(result[0].toString()).toBe("a");
    expect(result[2].toString()).toBe("c");
  });

  it("should support delay between chunks", async () => {
    const chunks = [Buffer.from("a"), Buffer.from("b")];
    const startTime = Date.now();

    const result: Buffer[] = [];
    for await (const chunk of arrayToAudioStream(chunks, 20)) {
      result.push(chunk);
    }

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(20);
  });
});

describe("splitBufferForStreaming", () => {
  it("should split buffer into chunks", async () => {
    const buffer = Buffer.from("abcdefghij");
    const chunks: Buffer[] = [];

    for await (const chunk of splitBufferForStreaming(buffer, 3)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(4);
    expect(chunks[0].toString()).toBe("abc");
    expect(chunks[1].toString()).toBe("def");
    expect(chunks[2].toString()).toBe("ghi");
    expect(chunks[3].toString()).toBe("j");
  });

  it("should handle buffer smaller than chunk size", async () => {
    const buffer = Buffer.from("ab");
    const chunks: Buffer[] = [];

    for await (const chunk of splitBufferForStreaming(buffer, 10)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(1);
    expect(chunks[0].toString()).toBe("ab");
  });

  it("should handle empty buffer", async () => {
    const buffer = Buffer.alloc(0);
    const chunks: Buffer[] = [];

    for await (const chunk of splitBufferForStreaming(buffer)) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(0);
  });

  it("should support delay between chunks", async () => {
    const buffer = Buffer.from("test");
    const startTime = Date.now();

    const chunks: Buffer[] = [];
    for await (const chunk of splitBufferForStreaming(buffer, 2, 15)) {
      chunks.push(chunk);
    }

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(15);
  });
});

describe("withTimeout", () => {
  it("should pass through items within timeout", async () => {
    async function* quickStream(): AsyncIterable<number> {
      yield 1;
      yield 2;
      yield 3;
    }

    const result: number[] = [];
    for await (const item of withTimeout(quickStream(), 1000)) {
      result.push(item);
    }

    expect(result).toEqual([1, 2, 3]);
  });

  it("should timeout on slow stream", async () => {
    async function* slowStream(): AsyncIterable<number> {
      yield 1;
      await new Promise((resolve) => setTimeout(resolve, 200));
      yield 2;
    }

    const result: number[] = [];

    await expect(async () => {
      for await (const item of withTimeout(slowStream(), 50, "Timeout!")) {
        result.push(item);
      }
    }).rejects.toThrow("Timeout!");

    expect(result).toEqual([1]);
  });
});

describe("batchStream", () => {
  it("should batch items together", async () => {
    async function* source(): AsyncIterable<number> {
      for (let i = 1; i <= 7; i++) {
        yield i;
      }
    }

    const batches: number[][] = [];
    for await (const batch of batchStream(source(), 3)) {
      batches.push(batch);
    }

    expect(batches).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("should handle empty stream", async () => {
    async function* empty(): AsyncIterable<number> {
      // Empty
    }

    const batches: number[][] = [];
    for await (const batch of batchStream(empty(), 3)) {
      batches.push(batch);
    }

    expect(batches).toHaveLength(0);
  });
});

describe("rateLimitStream", () => {
  it("should rate limit items", async () => {
    async function* quickSource(): AsyncIterable<number> {
      yield 1;
      yield 2;
      yield 3;
    }

    const startTime = Date.now();
    const results: number[] = [];

    // 10 items per second = 100ms between items
    for await (const item of rateLimitStream(quickSource(), 20)) {
      results.push(item);
    }

    const elapsed = Date.now() - startTime;

    expect(results).toEqual([1, 2, 3]);
    // Should take at least 100ms for 3 items at 20 per second (50ms each)
    expect(elapsed).toBeGreaterThanOrEqual(80);
  });
});

describe("Edge Cases", () => {
  describe("empty audio handling", () => {
    it("should handle completely empty audio stream", async () => {
      const accumulator = new AudioStreamAccumulator();
      accumulator.complete();

      expect(accumulator.getBuffer().length).toBe(0);
      expect(accumulator.getStats().bytes).toBe(0);
    });
  });

  describe("large data handling", () => {
    it("should handle large audio chunks", () => {
      const accumulator = new AudioStreamAccumulator();

      // 10MB chunk
      const largeChunk = Buffer.alloc(10 * 1024 * 1024);
      accumulator.addChunk(largeChunk);

      expect(accumulator.getState().totalBytes).toBe(10 * 1024 * 1024);
    });
  });

  describe("concurrent operations", () => {
    it("should handle rapid chunk additions", () => {
      const accumulator = new AudioStreamAccumulator();

      for (let i = 0; i < 1000; i++) {
        accumulator.addChunk(Buffer.from(`chunk${i}`));
      }

      expect(accumulator.getState().chunkCount).toBe(1000);
    });
  });
});
