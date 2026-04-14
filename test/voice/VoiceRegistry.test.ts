/**
 * Voice Registry Tests
 *
 * Unit tests for the Voice Registry pattern implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoiceRegistry } from "../../src/lib/voice/VoiceRegistry.js";
import type { TTSHandler } from "../../src/lib/utils/ttsProcessor.js";
import type { STTHandler } from "../../src/lib/voice/STTProvider.js";
import type { RealtimeHandler } from "../../src/lib/voice/RealtimeVoiceAPI.js";
import type { VoiceProviderMetadata } from "../../src/lib/voice/types/voiceTypes.js";

/**
 * Mock TTS Handler
 */
const createMockTTSHandler = (): TTSHandler => ({
  synthesize: vi.fn().mockResolvedValue({
    buffer: Buffer.from("audio"),
    format: "mp3",
    size: 1024,
    voice: "test-voice",
  }),
  getVoices: vi.fn().mockResolvedValue([]),
  isConfigured: vi.fn().mockReturnValue(true),
  maxTextLength: 5000,
});

/**
 * Mock STT Handler
 */
const createMockSTTHandler = (): STTHandler => ({
  transcribe: vi.fn().mockResolvedValue({
    text: "Test transcription",
    confidence: 0.95,
  }),
  getSupportedFormats: vi.fn().mockReturnValue(["mp3", "wav"]),
  isConfigured: vi.fn().mockReturnValue(true),
  maxAudioDuration: 3600,
});

/**
 * Mock Realtime Handler
 */
const createMockRealtimeHandler = (): RealtimeHandler => ({
  name: "mock-realtime",
  connect: vi.fn().mockResolvedValue({
    id: "session-1",
    state: "connected",
    provider: "mock",
    createdAt: new Date(),
    lastActivityAt: new Date(),
    config: { provider: "openai" },
  }),
  disconnect: vi.fn().mockResolvedValue(undefined),
  isConnected: vi.fn().mockReturnValue(false),
  getSession: vi.fn().mockReturnValue(null),
  sendAudio: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  off: vi.fn(),
  isConfigured: vi.fn().mockReturnValue(true),
  getSupportedFormats: vi.fn().mockReturnValue(["opus"]),
});

describe("VoiceRegistry", () => {
  let registry: VoiceRegistry;

  beforeEach(() => {
    VoiceRegistry.resetInstance();
    registry = VoiceRegistry.getInstance();
  });

  afterEach(() => {
    VoiceRegistry.resetInstance();
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = VoiceRegistry.getInstance();
      const instance2 = VoiceRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = VoiceRegistry.getInstance();
      VoiceRegistry.resetInstance();
      const instance2 = VoiceRegistry.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("registerTTS", () => {
    it("should register a TTS provider", () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      };

      registry.registerTTS("test-tts", async () => mockHandler, metadata, [
        "test",
      ]);

      expect(registry.has("test-tts")).toBe(true);
      expect(registry.has("test")).toBe(true);
    });

    it("should normalize provider IDs to lowercase", () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      registry.registerTTS("TEST-TTS", async () => mockHandler, metadata);

      expect(registry.has("test-tts")).toBe(true);
      expect(registry.has("TEST-TTS")).toBe(true);
    });
  });

  describe("registerSTT", () => {
    it("should register an STT provider", () => {
      const mockHandler = createMockSTTHandler();
      const metadata: VoiceProviderMetadata = {
        type: "stt",
        displayName: "Test STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      };

      registry.registerSTT("test-stt", async () => mockHandler, metadata);

      expect(registry.has("test-stt")).toBe(true);
    });

    it("should register with aliases", () => {
      const mockHandler = createMockSTTHandler();
      const metadata: VoiceProviderMetadata = {
        type: "stt",
        displayName: "Whisper STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      };

      registry.registerSTT("whisper", async () => mockHandler, metadata, [
        "openai-whisper",
        "openai-stt",
      ]);

      expect(registry.has("whisper")).toBe(true);
      expect(registry.has("openai-whisper")).toBe(true);
      expect(registry.has("openai-stt")).toBe(true);
    });
  });

  describe("registerRealtime", () => {
    it("should register a Realtime provider", () => {
      const mockHandler = createMockRealtimeHandler();
      const metadata: VoiceProviderMetadata = {
        type: "realtime",
        displayName: "Test Realtime",
        capabilities: ["realtime", "streaming"],
        supportedFormats: ["opus"],
        supportsStreaming: true,
      };

      registry.registerRealtime(
        "test-realtime",
        async () => mockHandler,
        metadata,
      );

      expect(registry.has("test-realtime")).toBe(true);
    });
  });

  describe("get", () => {
    it("should get a registered provider", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      registry.registerTTS("test-tts", async () => mockHandler, metadata);

      const handler = await registry.get("test-tts");

      expect(handler).toBe(mockHandler);
    });

    it("should get a provider by alias", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Google TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      registry.registerTTS("google-tts", async () => mockHandler, metadata, [
        "google",
      ]);

      const handler = await registry.get("google");

      expect(handler).toBe(mockHandler);
    });

    it("should return undefined for unknown provider", async () => {
      const handler = await registry.get("unknown");

      expect(handler).toBeUndefined();
    });
  });

  describe("has", () => {
    it("should return true for registered provider", () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      registry.registerTTS("test-tts", async () => mockHandler, metadata);

      expect(registry.has("test-tts")).toBe(true);
    });

    it("should return true for alias", () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      registry.registerTTS("test-tts", async () => mockHandler, metadata, [
        "test-alias",
      ]);

      expect(registry.has("test-alias")).toBe(true);
    });

    it("should return false for unknown provider", () => {
      expect(registry.has("unknown")).toBe(false);
    });
  });

  describe("resolveAlias", () => {
    it("should resolve alias to provider ID", () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Google TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      registry.registerTTS("google-tts", async () => mockHandler, metadata, [
        "google",
        "gcp-tts",
      ]);

      expect(registry.resolveAlias("google")).toBe("google-tts");
      expect(registry.resolveAlias("gcp-tts")).toBe("google-tts");
    });

    it("should return ID as-is if not an alias", () => {
      expect(registry.resolveAlias("some-provider")).toBe("some-provider");
    });
  });

  describe("getByType", () => {
    it("should return all providers of a type", () => {
      const ttsHandler = createMockTTSHandler();
      const sttHandler = createMockSTTHandler();

      registry.registerTTS("tts1", async () => ttsHandler, {
        type: "tts",
        displayName: "TTS 1",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      registry.registerTTS("tts2", async () => ttsHandler, {
        type: "tts",
        displayName: "TTS 2",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      registry.registerSTT("stt1", async () => sttHandler, {
        type: "stt",
        displayName: "STT 1",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      const ttsProviders = registry.getByType("tts");
      const sttProviders = registry.getByType("stt");

      expect(ttsProviders).toHaveLength(2);
      expect(sttProviders).toHaveLength(1);
    });

    it("should return empty array for type with no providers", () => {
      const providers = registry.getByType("realtime");

      expect(providers).toEqual([]);
    });
  });

  describe("getTTSProviders", () => {
    it("should return all TTS providers with metadata", () => {
      const mockHandler = createMockTTSHandler();

      registry.registerTTS("google-tts", async () => mockHandler, {
        type: "tts",
        displayName: "Google Cloud TTS",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: true,
      });

      registry.registerTTS("openai-tts", async () => mockHandler, {
        type: "tts",
        displayName: "OpenAI TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      const providers = registry.getTTSProviders();

      expect(providers).toHaveLength(2);
      expect(providers.find((p) => p.id === "google-tts")).toBeDefined();
      expect(providers.find((p) => p.id === "openai-tts")).toBeDefined();
    });
  });

  describe("getSTTProviders", () => {
    it("should return all STT providers", () => {
      const mockHandler = createMockSTTHandler();

      registry.registerSTT("whisper", async () => mockHandler, {
        type: "stt",
        displayName: "Whisper",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      });

      registry.registerSTT("deepgram", async () => mockHandler, {
        type: "stt",
        displayName: "Deepgram",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: true,
      });

      const providers = registry.getSTTProviders();

      expect(providers).toHaveLength(2);
    });
  });

  describe("getRealtimeProviders", () => {
    it("should return all Realtime providers", () => {
      const mockHandler = createMockRealtimeHandler();

      registry.registerRealtime("openai-realtime", async () => mockHandler, {
        type: "realtime",
        displayName: "OpenAI Realtime",
        capabilities: ["realtime"],
        supportedFormats: ["opus"],
        supportsStreaming: true,
      });

      registry.registerRealtime("gemini-live", async () => mockHandler, {
        type: "realtime",
        displayName: "Gemini Live",
        capabilities: ["realtime"],
        supportedFormats: ["opus", "wav"],
        supportsStreaming: true,
      });

      const providers = registry.getRealtimeProviders();

      expect(providers).toHaveLength(2);
    });
  });

  describe("getByCapability", () => {
    it("should return providers with specified capability", () => {
      const ttsHandler = createMockTTSHandler();
      const sttHandler = createMockSTTHandler();

      registry.registerTTS("streaming-tts", async () => ttsHandler, {
        type: "tts",
        displayName: "Streaming TTS",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3"],
        supportsStreaming: true,
      });

      registry.registerTTS("basic-tts", async () => ttsHandler, {
        type: "tts",
        displayName: "Basic TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      registry.registerSTT("streaming-stt", async () => sttHandler, {
        type: "stt",
        displayName: "Streaming STT",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3"],
        supportsStreaming: true,
      });

      const streamingProviders = registry.getByCapability("streaming");

      expect(streamingProviders).toHaveLength(2);
      expect(
        streamingProviders.find((p) => p.id === "streaming-tts"),
      ).toBeDefined();
      expect(
        streamingProviders.find((p) => p.id === "streaming-stt"),
      ).toBeDefined();
    });

    it("should return empty array for capability with no providers", () => {
      const providers = registry.getByCapability("realtime");

      expect(providers).toEqual([]);
    });
  });

  describe("list", () => {
    it("should return all registered providers", () => {
      const ttsHandler = createMockTTSHandler();
      const sttHandler = createMockSTTHandler();

      registry.registerTTS("tts", async () => ttsHandler, {
        type: "tts",
        displayName: "TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      registry.registerSTT("stt", async () => sttHandler, {
        type: "stt",
        displayName: "STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      const all = registry.list();

      expect(all).toHaveLength(2);
    });
  });

  describe("clear", () => {
    it("should clear all registrations", () => {
      const mockHandler = createMockTTSHandler();

      registry.registerTTS(
        "test-tts",
        async () => mockHandler,
        {
          type: "tts",
          displayName: "Test TTS",
          capabilities: ["tts"],
          supportedFormats: ["mp3"],
          supportsStreaming: false,
        },
        ["test"],
      );

      expect(registry.has("test-tts")).toBe(true);
      expect(registry.has("test")).toBe(true);

      registry.clear();

      expect(registry.has("test-tts")).toBe(false);
      expect(registry.has("test")).toBe(false);
      expect(registry.list()).toHaveLength(0);
    });
  });
});
