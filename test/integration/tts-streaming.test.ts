/**
 * Integration tests for streaming TTS synthesis
 *
 * Tests the BaseProvider.stream() method with TTS enabled to ensure:
 * - Text chunks are yielded as they arrive
 * - Audio chunks are synthesized and yielded after text streaming
 * - Errors are handled gracefully with fallback to text-only
 * - Metadata includes TTS information
 *
 * @module test/integration/tts-streaming
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { createAIProvider } from "../../src/lib/index.js";
import type { StreamChunk } from "../../src/lib/types/streamTypes.js";
import { TTSProcessor } from "../../src/lib/utils/ttsProcessor.js";

describe("TTS Streaming Integration", () => {
  beforeAll(() => {
    // Mock TTS handler for testing
    const mockTTSHandler = {
      synthesize: vi.fn(async (text: string, options: unknown) => ({
        buffer: Buffer.from(`audio-for-${text}`),
        format: "mp3" as const,
        size: text.length * 100,
        duration: text.length / 10,
        voice: (options as { voice?: string })?.voice || "test-voice",
        sampleRate: 24000,
        metadata: {
          latency: 100,
          provider: "test-provider",
        },
      })),
      isConfigured: () => true,
      maxTextLength: 5000,
    };

    TTSProcessor.registerHandler("google-ai", mockTTSHandler);
  });

  it("should yield both text and audio chunks when TTS is enabled", async () => {
    const provider = createAIProvider({
      provider: "google-ai",
      model: "gemini-2.0-flash-exp",
    });

    const result = await provider.stream({
      input: { text: "Tell me a short story" },
      provider: "google-ai",
      tts: {
        enabled: true,
        voice: "en-US-Neural2-C",
      },
    });

    const chunks: StreamChunk[] = [];
    let hasTextChunk = false;
    let hasAudioChunk = false;

    for await (const chunk of result.stream) {
      chunks.push(chunk as StreamChunk);

      if (chunk.type === "text") {
        hasTextChunk = true;
        expect(chunk.content).toBeDefined();
        expect(typeof chunk.content).toBe("string");
      } else if (chunk.type === "audio") {
        hasAudioChunk = true;
        expect(chunk.audioChunk).toBeDefined();
        expect(Buffer.isBuffer(chunk.audioChunk.data)).toBe(true);
        expect(chunk.audioChunk.format).toBe("mp3");
        expect(chunk.audioChunk.index).toBeGreaterThanOrEqual(0);
        expect(chunk.audioChunk.isFinal).toBe(true);
      }
    }

    expect(hasTextChunk).toBe(true);
    expect(hasAudioChunk).toBe(true);
    expect(result.metadata?.ttsEnabled).toBe(true);
  });

  it("should handle TTS errors gracefully and continue with text-only", async () => {
    // Register a failing TTS handler
    const failingHandler = {
      synthesize: vi.fn(async () => {
        throw new Error("TTS service unavailable");
      }),
      isConfigured: () => true,
      maxTextLength: 5000,
    };

    TTSProcessor.registerHandler("failing-provider", failingHandler);

    const provider = createAIProvider({
      provider: "failing-provider",
      model: "test-model",
    });

    const result = await provider.stream({
      input: { text: "Test graceful degradation" },
      provider: "failing-provider",
      tts: {
        enabled: true,
      },
    });

    const chunks: StreamChunk[] = [];
    let hasTextChunk = false;
    let hasAudioChunk = false;

    for await (const chunk of result.stream) {
      chunks.push(chunk as StreamChunk);

      if (chunk.type === "text") {
        hasTextChunk = true;
      } else if (chunk.type === "audio") {
        hasAudioChunk = true;
      }
    }

    // Should have text but no audio due to TTS failure
    expect(hasTextChunk).toBe(true);
    expect(hasAudioChunk).toBe(false);
  });

  it("should include TTS metadata in stream result", async () => {
    const provider = createAIProvider({
      provider: "google-ai",
      model: "gemini-2.0-flash-exp",
    });

    const result = await provider.stream({
      input: { text: "Check metadata" },
      provider: "google-ai",
      tts: {
        enabled: true,
        voice: "en-US-Neural2-D",
        speed: 0.9,
      },
    });

    // Consume the stream
    for await (const _chunk of result.stream) {
      // Just consume
    }

    expect(result.metadata).toBeDefined();
    expect(result.metadata?.ttsEnabled).toBe(true);
    expect(result.metadata?.ttsProvider).toBe("google-ai");
    expect(result.metadata?.ttsVoice).toBe("en-US-Neural2-D");
  });

  it("should buffer all text before synthesizing audio", async () => {
    const provider = createAIProvider({
      provider: "google-ai",
      model: "gemini-2.0-flash-exp",
    });

    const result = await provider.stream({
      input: { text: "Generate multiple chunks" },
      provider: "google-ai",
      tts: {
        enabled: true,
      },
    });

    const textChunks: string[] = [];
    let audioChunk: StreamChunk | null = null;

    for await (const chunk of result.stream) {
      if (chunk.type === "text") {
        textChunks.push(chunk.content);
      } else if (chunk.type === "audio") {
        audioChunk = chunk;
      }
    }

    // Audio should be synthesized from all text chunks combined
    expect(textChunks.length).toBeGreaterThan(0);
    expect(audioChunk).toBeDefined();

    const fullText = textChunks.join("");
    expect(fullText.length).toBeGreaterThan(0);
  });

  it("should work with disabled TTS (text-only streaming)", async () => {
    const provider = createAIProvider({
      provider: "google-ai",
      model: "gemini-2.0-flash-exp",
    });

    const result = await provider.stream({
      input: { text: "Text only please" },
      provider: "google-ai",
      tts: {
        enabled: false,
      },
    });

    let hasTextChunk = false;
    let hasAudioChunk = false;

    for await (const chunk of result.stream) {
      if (chunk.type === "text") {
        hasTextChunk = true;
      } else if (chunk.type === "audio") {
        hasAudioChunk = true;
      }
    }

    expect(hasTextChunk).toBe(true);
    expect(hasAudioChunk).toBe(false);
    expect(result.metadata?.ttsEnabled).toBeUndefined();
  });
});
