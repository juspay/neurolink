/**
 * Voice Module Integration Tests
 *
 * Integration tests for the complete voice module functionality.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  VoiceFactory,
  VoiceRegistry,
  STTProcessor,
  RealtimeProcessor,
  ChunkedAudioStream,
  StreamMerger,
  StreamSplitter,
  streamToAsyncIterable,
  VoiceError,
  STTError,
  RealtimeError,
} from "../../src/lib/voice/index.js";
import type { STTHandler, RealtimeHandler } from "../../src/lib/voice/index.js";
import type { TTSHandler } from "../../src/lib/utils/ttsProcessor.js";
import type {
  VoiceProviderMetadata,
  AudioStreamChunk,
  RealtimeAudioChunk,
} from "../../src/lib/voice/types/voiceTypes.js";

describe("Voice Module Integration", () => {
  beforeEach(() => {
    VoiceFactory.resetInstance();
    VoiceRegistry.resetInstance();
    STTProcessor.clearHandlers();
    RealtimeProcessor.clearHandlers();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Module Exports", () => {
    it("should export all core components", () => {
      expect(VoiceFactory).toBeDefined();
      expect(VoiceRegistry).toBeDefined();
      expect(STTProcessor).toBeDefined();
      expect(RealtimeProcessor).toBeDefined();
    });

    it("should export stream handlers", () => {
      expect(ChunkedAudioStream).toBeDefined();
      expect(StreamMerger).toBeDefined();
      expect(StreamSplitter).toBeDefined();
      expect(streamToAsyncIterable).toBeDefined();
    });

    it("should export error classes", () => {
      expect(VoiceError).toBeDefined();
      expect(STTError).toBeDefined();
      expect(RealtimeError).toBeDefined();
    });
  });

  describe("Factory and Registry Integration", () => {
    it("should create handler through factory", async () => {
      const factory = VoiceFactory.getInstance();
      const mockHandler: TTSHandler = {
        synthesize: vi.fn().mockResolvedValue({
          buffer: Buffer.from("audio"),
          format: "mp3",
          size: 100,
          voice: "test",
        }),
        getVoices: vi.fn().mockResolvedValue([]),
        isConfigured: vi.fn().mockReturnValue(true),
        maxTextLength: 5000,
      };

      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Integration Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerTTSProvider(
        "integration-tts",
        async () => mockHandler,
        metadata,
        ["int-tts"],
      );

      // Create through factory
      const handler = await factory.createTTS("integration-tts");

      expect(handler).toBe(mockHandler);
      expect(handler.isConfigured()).toBe(true);

      // Also accessible through alias
      const handlerByAlias = await factory.createTTS("int-tts");
      expect(handlerByAlias).toBe(mockHandler);
    });

    it("should list providers by type", async () => {
      const factory = VoiceFactory.getInstance();
      const mockTTSHandler: TTSHandler = {
        synthesize: vi.fn(),
        getVoices: vi.fn().mockResolvedValue([]),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      const mockSTTHandler: STTHandler = {
        transcribe: vi.fn(),
        getSupportedFormats: vi.fn().mockReturnValue(["mp3"]),
        isConfigured: vi.fn().mockReturnValue(true),
      };

      factory.registerTTSProvider("tts-a", async () => mockTTSHandler, {
        type: "tts",
        displayName: "TTS A",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerTTSProvider("tts-b", async () => mockTTSHandler, {
        type: "tts",
        displayName: "TTS B",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerSTTProvider("stt-a", async () => mockSTTHandler, {
        type: "stt",
        displayName: "STT A",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      const ttsProviders = factory.getTTSProviders();
      const sttProviders = factory.getSTTProviders();

      expect(ttsProviders).toHaveLength(2);
      expect(sttProviders).toHaveLength(1);
    });
  });

  describe("STT Workflow", () => {
    it("should complete full STT workflow", async () => {
      const mockResult = {
        text: "Hello, this is a test.",
        confidence: 0.95,
        language: "en-US",
      };

      const mockHandler: STTHandler = {
        transcribe: vi.fn().mockResolvedValue(mockResult),
        getSupportedFormats: () => ["mp3", "wav"],
        isConfigured: () => true,
      };

      // Register handler
      STTProcessor.registerHandler("test-stt", mockHandler);

      // Verify registration
      expect(STTProcessor.supports("test-stt")).toBe(true);
      expect(STTProcessor.getProviders()).toContain("test-stt");

      // Perform transcription
      const audioBuffer = Buffer.from("fake audio data");
      const result = await STTProcessor.transcribe(audioBuffer, "test-stt", {
        language: "en-US",
        punctuation: true,
      });

      expect(result.text).toBe("Hello, this is a test.");
      expect(result.confidence).toBe(0.95);
      expect(result.metadata?.provider).toBe("test-stt");
      expect(result.metadata?.latency).toBeDefined();
    });

    it("should handle STT errors gracefully", async () => {
      const failingHandler: STTHandler = {
        transcribe: vi.fn().mockRejectedValue(new Error("Network error")),
        getSupportedFormats: () => ["mp3"],
        isConfigured: () => true,
      };

      STTProcessor.registerHandler("failing-stt", failingHandler);

      const audioBuffer = Buffer.from("audio data");

      await expect(
        STTProcessor.transcribe(audioBuffer, "failing-stt"),
      ).rejects.toThrow(STTError);
    });
  });

  describe("Realtime Workflow", () => {
    it("should complete full realtime session workflow", async () => {
      const mockSession = {
        id: "session-123",
        state: "connected" as const,
        provider: "test-realtime",
        createdAt: new Date(),
        lastActivityAt: new Date(),
        config: { provider: "openai" as const },
      };

      const mockHandler: RealtimeHandler = {
        name: "test-realtime",
        connect: vi.fn().mockResolvedValue(mockSession),
        disconnect: vi.fn().mockResolvedValue(undefined),
        isConnected: vi.fn().mockReturnValue(true),
        getSession: vi.fn().mockReturnValue(mockSession),
        sendAudio: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        off: vi.fn(),
        isConfigured: () => true,
        getSupportedFormats: () => ["opus"],
      };

      // Register handler
      RealtimeProcessor.registerHandler("test-realtime", mockHandler);

      // Verify registration
      expect(RealtimeProcessor.supports("test-realtime")).toBe(true);

      // Connect to session
      const session = await RealtimeProcessor.connect("test-realtime", {
        provider: "openai",
      });

      expect(session.id).toBe("session-123");
      expect(RealtimeProcessor.isConnected("test-realtime")).toBe(true);

      // Send audio
      await RealtimeProcessor.sendAudio(
        "test-realtime",
        Buffer.from("audio chunk"),
      );

      expect(mockHandler.sendAudio).toHaveBeenCalled();

      // Disconnect
      await RealtimeProcessor.disconnect("test-realtime");

      expect(mockHandler.disconnect).toHaveBeenCalled();
    });
  });

  describe("Audio Streaming", () => {
    it("should stream audio through ChunkedAudioStream", async () => {
      const stream = new ChunkedAudioStream({
        chunkDurationMs: 100,
        sampleRate: 16000,
        bytesPerSample: 2,
      });

      const chunks: AudioStreamChunk[] = [];

      stream.on("chunk", (chunk: AudioStreamChunk) => {
        chunks.push(chunk);
      });

      // Write audio data
      const audioData = Buffer.alloc(16000 * 2); // 1 second of 16kHz 16-bit audio
      stream.write(audioData);
      stream.end();

      // Should have chunked the audio
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1].isFinal).toBe(true);
    });

    it("should convert stream to async iterable", async () => {
      const stream = new ChunkedAudioStream({
        chunkDurationMs: 50,
        sampleRate: 8000,
        bytesPerSample: 2,
      });

      const asyncIterable = streamToAsyncIterable(stream);

      // Write some data asynchronously
      setTimeout(() => {
        stream.write(Buffer.alloc(800)); // 50ms of audio
        stream.end();
      }, 10);

      const chunks: AudioStreamChunk[] = [];
      for await (const chunk of asyncIterable) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
    });

    it("should merge multiple streams", async () => {
      const merger = new StreamMerger();

      const stream1 = merger.addStream("speaker1");
      const stream2 = merger.addStream("speaker2");

      const receivedChunks: Array<{ id: string; chunk: AudioStreamChunk }> = [];

      merger.on("chunk", (data: { id: string; chunk: AudioStreamChunk }) => {
        receivedChunks.push(data);
      });

      // Write to both streams
      stream1.write(Buffer.alloc(3200)); // 100ms
      stream2.write(Buffer.alloc(3200));

      stream1.end();
      stream2.end();

      expect(receivedChunks.length).toBeGreaterThan(0);
      expect(merger.activeStreams).toBe(0);
    });

    it("should split stream to multiple consumers", async () => {
      const splitter = new StreamSplitter({
        chunkDurationMs: 50,
        sampleRate: 16000,
        bytesPerSample: 2,
      });

      const consumer1Chunks: AudioStreamChunk[] = [];
      const consumer2Chunks: AudioStreamChunk[] = [];

      splitter.addConsumer("consumer1", (chunk) => {
        consumer1Chunks.push(chunk);
      });

      splitter.addConsumer("consumer2", (chunk) => {
        consumer2Chunks.push(chunk);
      });

      splitter.write(Buffer.alloc(3200)); // 100ms
      splitter.end();

      expect(consumer1Chunks.length).toBeGreaterThan(0);
      expect(consumer2Chunks.length).toBeGreaterThan(0);
      expect(consumer1Chunks.length).toBe(consumer2Chunks.length);
    });
  });

  describe("Error Handling", () => {
    it("should throw VoiceError for unknown provider", async () => {
      const factory = VoiceFactory.getInstance();

      await expect(factory.createTTS("unknown-provider")).rejects.toThrow(
        VoiceError,
      );
    });

    it("should throw STTError for empty audio", async () => {
      const mockHandler: STTHandler = {
        transcribe: vi.fn(),
        getSupportedFormats: () => ["mp3"],
        isConfigured: () => true,
      };

      STTProcessor.registerHandler("test", mockHandler);

      await expect(
        STTProcessor.transcribe(Buffer.alloc(0), "test"),
      ).rejects.toThrow(STTError);
    });

    it("should throw RealtimeError for unsupported provider", async () => {
      await expect(
        RealtimeProcessor.connect("unknown", { provider: "openai" }),
      ).rejects.toThrow(RealtimeError);
    });

    it("should include helpful context in errors", async () => {
      try {
        await VoiceFactory.getInstance().createTTS("nonexistent");
      } catch (error) {
        expect(error).toBeInstanceOf(VoiceError);
        const voiceError = error as VoiceError;
        expect(voiceError.context).toBeDefined();
        expect(voiceError.context?.requestedProvider).toBe("nonexistent");
      }
    });
  });

  describe("Stream Handler Events", () => {
    it("should emit all lifecycle events", async () => {
      const stream = new ChunkedAudioStream();

      const events: string[] = [];

      stream.on("chunk", () => events.push("chunk"));
      stream.on("end", () => events.push("end"));
      stream.on("pause", () => events.push("pause"));
      stream.on("resume", () => events.push("resume"));

      // Write data
      stream.write(Buffer.alloc(10000));
      stream.end();

      expect(events).toContain("chunk");
      expect(events).toContain("end");
    });

    it("should provide stream statistics", () => {
      const stream = new ChunkedAudioStream();

      stream.write(Buffer.alloc(5000));

      const stats = stream.getStats();

      expect(stats.chunksEmitted).toBeDefined();
      expect(stats.bufferedBytes).toBeDefined();
      expect(stats.isPaused).toBe(false);
      expect(stats.isEnded).toBe(false);

      stream.end();

      const endStats = stream.getStats();
      expect(endStats.isEnded).toBe(true);
    });
  });

  describe("Cross-Component Integration", () => {
    it("should work with factory-created handlers", async () => {
      const factory = VoiceFactory.getInstance();

      // Register mock STT handler
      const mockSTTHandler: STTHandler = {
        transcribe: vi.fn().mockResolvedValue({
          text: "Factory created handler result",
          confidence: 0.9,
        }),
        getSupportedFormats: () => ["mp3", "wav"],
        isConfigured: () => true,
      };

      factory.registerSTTProvider("factory-stt", async () => mockSTTHandler, {
        type: "stt",
        displayName: "Factory STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      });

      // Create handler through factory
      const handler = await factory.createSTT("factory-stt");

      // Use handler directly
      const result = await handler.transcribe(Buffer.from("audio"), {
        language: "en-US",
      });

      expect(result.text).toBe("Factory created handler result");

      // Register same handler with STTProcessor
      STTProcessor.registerHandler("processor-stt", handler);

      // Use through processor
      const processorResult = await STTProcessor.transcribe(
        Buffer.from("audio"),
        "processor-stt",
      );

      expect(processorResult.text).toBe("Factory created handler result");
    });
  });
});
