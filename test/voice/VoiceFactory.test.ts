/**
 * Voice Factory Tests
 *
 * Unit tests for the Voice Factory pattern implementation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VoiceFactory } from "../../src/lib/voice/VoiceFactory.js";
import { VoiceError, VOICE_ERROR_CODES } from "../../src/lib/voice/errors.js";
import type { TTSHandler } from "../../src/lib/utils/ttsProcessor.js";
import type { STTHandler } from "../../src/lib/voice/STTProvider.js";
import type { RealtimeHandler } from "../../src/lib/voice/RealtimeVoiceAPI.js";
import type {
  VoiceProviderMetadata,
  AudioFormat,
} from "../../src/lib/voice/types/voiceTypes.js";

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

describe("VoiceFactory", () => {
  let factory: VoiceFactory;

  beforeEach(() => {
    VoiceFactory.resetInstance();
    factory = VoiceFactory.getInstance();
  });

  afterEach(() => {
    VoiceFactory.resetInstance();
    vi.clearAllMocks();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = VoiceFactory.getInstance();
      const instance2 = VoiceFactory.getInstance();

      expect(instance1).toBe(instance2);
    });

    it("should create new instance after reset", () => {
      const instance1 = VoiceFactory.getInstance();
      VoiceFactory.resetInstance();
      const instance2 = VoiceFactory.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("registerTTSProvider", () => {
    it("should register a TTS provider", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      };

      factory.registerTTSProvider(
        "test-tts",
        async () => mockHandler,
        metadata,
        ["test"],
      );

      expect(factory.getType("test-tts")).toBe("tts");
      expect(factory.getType("test")).toBe("tts");
    });

    it("should register with aliases", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Google TTS",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg"],
        supportsStreaming: true,
      };

      factory.registerTTSProvider(
        "google-tts",
        async () => mockHandler,
        metadata,
        ["google", "google-cloud-tts"],
      );

      // All should resolve to the same type
      expect(factory.getType("google-tts")).toBe("tts");
      expect(factory.getType("google")).toBe("tts");
      expect(factory.getType("google-cloud-tts")).toBe("tts");
    });
  });

  describe("registerSTTProvider", () => {
    it("should register an STT provider", async () => {
      const mockHandler = createMockSTTHandler();
      const metadata: VoiceProviderMetadata = {
        type: "stt",
        displayName: "Test STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav"],
        supportsStreaming: false,
      };

      factory.registerSTTProvider(
        "test-stt",
        async () => mockHandler,
        metadata,
      );

      expect(factory.getType("test-stt")).toBe("stt");
    });
  });

  describe("registerRealtimeProvider", () => {
    it("should register a Realtime provider", async () => {
      const mockHandler = createMockRealtimeHandler();
      const metadata: VoiceProviderMetadata = {
        type: "realtime",
        displayName: "Test Realtime",
        capabilities: ["realtime", "streaming"],
        supportedFormats: ["opus"],
        supportsStreaming: true,
      };

      factory.registerRealtimeProvider(
        "test-realtime",
        async () => mockHandler,
        metadata,
      );

      expect(factory.getType("test-realtime")).toBe("realtime");
    });
  });

  describe("createTTS", () => {
    it("should create a TTS handler", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerTTSProvider(
        "test-tts",
        async () => mockHandler,
        metadata,
      );

      const handler = await factory.createTTS("test-tts");

      expect(handler).toBe(mockHandler);
      expect(handler.isConfigured()).toBe(true);
    });

    it("should create TTS handler by alias", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerTTSProvider(
        "test-tts",
        async () => mockHandler,
        metadata,
        ["test-alias"],
      );

      const handler = await factory.createTTS("test-alias");

      expect(handler).toBe(mockHandler);
    });

    it("should throw error for non-TTS provider", async () => {
      const mockHandler = createMockSTTHandler();
      const metadata: VoiceProviderMetadata = {
        type: "stt",
        displayName: "Test STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerSTTProvider(
        "test-stt",
        async () => mockHandler,
        metadata,
      );

      await expect(factory.createTTS("test-stt")).rejects.toThrow(VoiceError);
      await expect(factory.createTTS("test-stt")).rejects.toMatchObject({
        code: VOICE_ERROR_CODES.INVALID_CONFIGURATION,
      });
    });

    it("should throw error for unknown provider", async () => {
      await expect(factory.createTTS("unknown")).rejects.toThrow(VoiceError);
      await expect(factory.createTTS("unknown")).rejects.toMatchObject({
        code: VOICE_ERROR_CODES.PROVIDER_NOT_FOUND,
      });
    });

    it("should pass config to factory function", async () => {
      const factoryFn = vi.fn().mockResolvedValue(createMockTTSHandler());
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerTTSProvider("test-tts", factoryFn, metadata);

      await factory.createTTS("test-tts", {
        name: "test-tts",
        apiKey: "test-key",
      });

      expect(factoryFn).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "test-key" }),
      );
    });
  });

  describe("createSTT", () => {
    it("should create an STT handler", async () => {
      const mockHandler = createMockSTTHandler();
      const metadata: VoiceProviderMetadata = {
        type: "stt",
        displayName: "Test STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerSTTProvider(
        "test-stt",
        async () => mockHandler,
        metadata,
      );

      const handler = await factory.createSTT("test-stt");

      expect(handler).toBe(mockHandler);
    });

    it("should throw error for non-STT provider", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      };

      factory.registerTTSProvider(
        "test-tts",
        async () => mockHandler,
        metadata,
      );

      await expect(factory.createSTT("test-tts")).rejects.toMatchObject({
        code: VOICE_ERROR_CODES.INVALID_CONFIGURATION,
      });
    });
  });

  describe("createRealtime", () => {
    it("should create a Realtime handler", async () => {
      const mockHandler = createMockRealtimeHandler();
      const metadata: VoiceProviderMetadata = {
        type: "realtime",
        displayName: "Test Realtime",
        capabilities: ["realtime"],
        supportedFormats: ["opus"],
        supportsStreaming: true,
      };

      factory.registerRealtimeProvider(
        "test-realtime",
        async () => mockHandler,
        metadata,
      );

      const handler = await factory.createRealtime("test-realtime");

      expect(handler).toBe(mockHandler);
    });
  });

  describe("getType", () => {
    it("should return provider type", async () => {
      const ttsHandler = createMockTTSHandler();
      const sttHandler = createMockSTTHandler();

      factory.registerTTSProvider("tts-provider", async () => ttsHandler, {
        type: "tts",
        displayName: "TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerSTTProvider("stt-provider", async () => sttHandler, {
        type: "stt",
        displayName: "STT",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      expect(factory.getType("tts-provider")).toBe("tts");
      expect(factory.getType("stt-provider")).toBe("stt");
    });

    it("should return undefined for unknown provider", () => {
      expect(factory.getType("unknown")).toBeUndefined();
    });
  });

  describe("getMetadata", () => {
    it("should return provider metadata", async () => {
      const mockHandler = createMockTTSHandler();
      const metadata: VoiceProviderMetadata = {
        type: "tts",
        displayName: "Test TTS Provider",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3", "wav"],
        maxLength: 5000,
        supportsStreaming: true,
        features: ["neural", "custom-voice"],
      };

      factory.registerTTSProvider(
        "test-tts",
        async () => mockHandler,
        metadata,
      );

      const retrieved = factory.getMetadata("test-tts");

      expect(retrieved?.displayName).toBe("Test TTS Provider");
      expect(retrieved?.capabilities).toContain("tts");
      expect(retrieved?.features).toContain("neural");
    });
  });

  describe("getProvidersByType", () => {
    it("should return providers of specified type", async () => {
      const ttsHandler = createMockTTSHandler();
      const sttHandler = createMockSTTHandler();

      factory.registerTTSProvider("tts1", async () => ttsHandler, {
        type: "tts",
        displayName: "TTS 1",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerTTSProvider("tts2", async () => ttsHandler, {
        type: "tts",
        displayName: "TTS 2",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerSTTProvider("stt1", async () => sttHandler, {
        type: "stt",
        displayName: "STT 1",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      const ttsProviders = factory.getProvidersByType("tts");
      const sttProviders = factory.getProvidersByType("stt");

      expect(ttsProviders).toHaveLength(2);
      expect(ttsProviders).toContain("tts1");
      expect(ttsProviders).toContain("tts2");
      expect(sttProviders).toHaveLength(1);
      expect(sttProviders).toContain("stt1");
    });
  });

  describe("getTTSProviders", () => {
    it("should return all TTS providers", async () => {
      const mockHandler = createMockTTSHandler();

      factory.registerTTSProvider("google-tts", async () => mockHandler, {
        type: "tts",
        displayName: "Google TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerTTSProvider("openai-tts", async () => mockHandler, {
        type: "tts",
        displayName: "OpenAI TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      const providers = factory.getTTSProviders();

      expect(providers).toContain("google-tts");
      expect(providers).toContain("openai-tts");
    });
  });

  describe("getSTTProviders", () => {
    it("should return all STT providers", async () => {
      const mockHandler = createMockSTTHandler();

      factory.registerSTTProvider("whisper", async () => mockHandler, {
        type: "stt",
        displayName: "Whisper",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      factory.registerSTTProvider("deepgram", async () => mockHandler, {
        type: "stt",
        displayName: "Deepgram",
        capabilities: ["stt"],
        supportedFormats: ["mp3"],
        supportsStreaming: true,
      });

      const providers = factory.getSTTProviders();

      expect(providers).toContain("whisper");
      expect(providers).toContain("deepgram");
    });
  });

  describe("getRealtimeProviders", () => {
    it("should return all Realtime providers", async () => {
      const mockHandler = createMockRealtimeHandler();

      factory.registerRealtimeProvider(
        "openai-realtime",
        async () => mockHandler,
        {
          type: "realtime",
          displayName: "OpenAI Realtime",
          capabilities: ["realtime"],
          supportedFormats: ["opus"],
          supportsStreaming: true,
        },
      );

      const providers = factory.getRealtimeProviders();

      expect(providers).toContain("openai-realtime");
    });
  });

  describe("clear", () => {
    it("should clear all registrations", async () => {
      const mockHandler = createMockTTSHandler();

      factory.registerTTSProvider("test", async () => mockHandler, {
        type: "tts",
        displayName: "Test",
        capabilities: ["tts"],
        supportedFormats: ["mp3"],
        supportsStreaming: false,
      });

      expect(factory.getTTSProviders()).toHaveLength(1);

      factory.clear();

      expect(factory.getTTSProviders()).toHaveLength(0);
      expect(factory.getType("test")).toBeUndefined();
      expect(factory.getMetadata("test")).toBeUndefined();
    });
  });
});
