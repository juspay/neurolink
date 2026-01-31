/**
 * Voice Factory Tests
 *
 * Tests for the VoiceFactory class including:
 * - Provider registration and creation
 * - Alias handling
 * - Capability tracking
 * - Error handling for unsupported providers
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { VoiceFactory } from "../../../src/lib/voice/voiceFactory.js";
import type {
  TTSProvider,
  STTProvider,
  RealtimeVoiceProvider,
  VoiceCapability,
  TTSVoice,
} from "../../../src/lib/types/voiceTypes.js";
import type { TTSOptions, TTSResult } from "../../../src/lib/types/ttsTypes.js";
import type { STTOptions, STTResult } from "../../../src/lib/types/sttTypes.js";
import type {
  RealtimeConfig,
  RealtimeSession,
  RealtimeEventType,
  RealtimeEvent,
} from "../../../src/lib/types/realtimeTypes.js";

// Mock TTS Provider
const createMockTTSProvider = (name: string): TTSProvider => ({
  name,
  maxTextLength: 5000,
  getCapabilities: () => ["tts", "streaming"] as VoiceCapability[],
  isConfigured: () => true,
  validateConfig: async () => ({ valid: true, errors: [] }),
  synthesize: async (
    text: string,
    _options: TTSOptions,
  ): Promise<TTSResult> => ({
    buffer: Buffer.from(`synthesized: ${text}`),
    format: "mp3",
    size: 100,
    metadata: { latency: 100, provider: name },
  }),
  getVoices: async (_languageCode?: string): Promise<TTSVoice[]> => [
    { id: "voice1", name: "Voice 1", languageCode: "en-US" },
  ],
});

// Mock STT Provider
const createMockSTTProvider = (name: string): STTProvider => ({
  name,
  getCapabilities: () => ["stt"] as VoiceCapability[],
  isConfigured: () => true,
  validateConfig: async () => ({ valid: true, errors: [] }),
  transcribe: async (
    _audio: Buffer | ArrayBuffer,
    _options: STTOptions,
  ): Promise<STTResult> => ({
    text: "transcribed text",
    language: "en-US",
    segments: [],
    duration: 5.0,
    confidence: 0.95,
    metadata: { latency: 200, provider: name },
  }),
  getSupportedLanguages: async () => ["en-US", "es-ES"],
  getSupportedFormats: () => ["wav", "mp3"],
});

// Mock Realtime Provider
const createMockRealtimeProvider = (name: string): RealtimeVoiceProvider => ({
  name,
  getCapabilities: () => ["realtime"] as VoiceCapability[],
  isConfigured: () => true,
  validateConfig: async () => ({ valid: true, errors: [] }),
  connect: async (_config: RealtimeConfig): Promise<RealtimeSession> => ({
    id: "session-123",
    sendAudio: vi.fn(),
    commitAudio: vi.fn(),
    clearAudio: vi.fn(),
    sendText: vi.fn(),
    createResponse: vi.fn(),
    cancelResponse: vi.fn(),
    updateSession: vi.fn(),
    on: (
      _event: RealtimeEventType,
      _handler: (event: RealtimeEvent) => void,
    ) => {},
    off: (
      _event: RealtimeEventType,
      _handler: (event: RealtimeEvent) => void,
    ) => {},
    close: vi.fn(),
    isOpen: () => true,
  }),
  isConnected: () => false,
  disconnect: async () => {},
  getSessionConfig: () => null,
});

describe("VoiceFactory", () => {
  beforeEach(() => {
    VoiceFactory.clearAll();
  });

  afterEach(() => {
    VoiceFactory.clearAll();
  });

  describe("TTS Provider Registration", () => {
    it("should register TTS provider", () => {
      VoiceFactory.registerTTSProvider("test-tts", () =>
        createMockTTSProvider("test-tts"),
      );

      expect(VoiceFactory.hasTTSProvider("test-tts")).toBe(true);
    });

    it("should register TTS provider with aliases", () => {
      VoiceFactory.registerTTSProvider(
        "elevenlabs",
        () => createMockTTSProvider("elevenlabs"),
        { aliases: ["eleven", "11labs"] },
      );

      expect(VoiceFactory.hasTTSProvider("elevenlabs")).toBe(true);
      expect(VoiceFactory.hasTTSProvider("eleven")).toBe(true);
      expect(VoiceFactory.hasTTSProvider("11labs")).toBe(true);
    });

    it("should normalize provider names to lowercase", () => {
      VoiceFactory.registerTTSProvider("MyTTS", () =>
        createMockTTSProvider("mytts"),
      );

      expect(VoiceFactory.hasTTSProvider("mytts")).toBe(true);
      expect(VoiceFactory.hasTTSProvider("MYTTS")).toBe(true);
      expect(VoiceFactory.hasTTSProvider("MyTTS")).toBe(true);
    });

    it("should create TTS provider instance", async () => {
      VoiceFactory.registerTTSProvider("test-tts", () =>
        createMockTTSProvider("test-tts"),
      );

      const provider = await VoiceFactory.createTTSProvider("test-tts");

      expect(provider).toBeDefined();
      expect(provider.name).toBe("test-tts");
      expect(provider.maxTextLength).toBe(5000);
    });

    it("should create TTS provider with config", async () => {
      const factoryFn = vi.fn(() => createMockTTSProvider("config-tts"));
      VoiceFactory.registerTTSProvider("config-tts", factoryFn);

      await VoiceFactory.createTTSProvider("config-tts", {
        name: "config-tts",
        apiKey: "test-key",
      });

      expect(factoryFn).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: "test-key" }),
      );
    });

    it("should throw for unregistered TTS provider", async () => {
      await expect(
        VoiceFactory.createTTSProvider("nonexistent"),
      ).rejects.toThrow();
    });

    it("should list available TTS providers (excluding aliases)", () => {
      VoiceFactory.registerTTSProvider(
        "provider-a",
        () => createMockTTSProvider("a"),
        { aliases: ["alias-a"] },
      );
      VoiceFactory.registerTTSProvider("provider-b", () =>
        createMockTTSProvider("b"),
      );

      const providers = VoiceFactory.getAvailableTTSProviders();

      expect(providers).toContain("provider-a");
      expect(providers).toContain("provider-b");
      expect(providers).not.toContain("alias-a");
    });

    it("should support async factory functions", async () => {
      VoiceFactory.registerTTSProvider("async-tts", async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return createMockTTSProvider("async-tts");
      });

      const provider = await VoiceFactory.createTTSProvider("async-tts");

      expect(provider.name).toBe("async-tts");
    });

    it("should register with capabilities", () => {
      VoiceFactory.registerTTSProvider(
        "capable-tts",
        () => createMockTTSProvider("capable-tts"),
        { capabilities: ["tts", "streaming"] },
      );

      const caps = VoiceFactory.getProviderCapabilities("capable-tts");

      expect(caps).toContain("tts");
      expect(caps).toContain("streaming");
    });
  });

  describe("STT Provider Registration", () => {
    it("should register STT provider", () => {
      VoiceFactory.registerSTTProvider("test-stt", () =>
        createMockSTTProvider("test-stt"),
      );

      expect(VoiceFactory.hasSTTProvider("test-stt")).toBe(true);
    });

    it("should register STT provider with aliases", () => {
      VoiceFactory.registerSTTProvider(
        "deepgram",
        () => createMockSTTProvider("deepgram"),
        { aliases: ["dg", "deep"] },
      );

      expect(VoiceFactory.hasSTTProvider("deepgram")).toBe(true);
      expect(VoiceFactory.hasSTTProvider("dg")).toBe(true);
      expect(VoiceFactory.hasSTTProvider("deep")).toBe(true);
    });

    it("should create STT provider instance", async () => {
      VoiceFactory.registerSTTProvider("test-stt", () =>
        createMockSTTProvider("test-stt"),
      );

      const provider = await VoiceFactory.createSTTProvider("test-stt");

      expect(provider).toBeDefined();
      expect(provider.name).toBe("test-stt");
    });

    it("should throw for unregistered STT provider", async () => {
      await expect(
        VoiceFactory.createSTTProvider("nonexistent"),
      ).rejects.toThrow();
    });

    it("should list available STT providers", () => {
      VoiceFactory.registerSTTProvider(
        "stt-a",
        () => createMockSTTProvider("a"),
        { aliases: ["stt-alias"] },
      );
      VoiceFactory.registerSTTProvider("stt-b", () =>
        createMockSTTProvider("b"),
      );

      const providers = VoiceFactory.getAvailableSTTProviders();

      expect(providers).toContain("stt-a");
      expect(providers).toContain("stt-b");
      expect(providers).not.toContain("stt-alias");
    });
  });

  describe("Realtime Provider Registration", () => {
    it("should register Realtime provider", () => {
      VoiceFactory.registerRealtimeProvider("test-realtime", () =>
        createMockRealtimeProvider("test-realtime"),
      );

      expect(VoiceFactory.hasRealtimeProvider("test-realtime")).toBe(true);
    });

    it("should register Realtime provider with aliases", () => {
      VoiceFactory.registerRealtimeProvider(
        "openai-realtime",
        () => createMockRealtimeProvider("openai-realtime"),
        { aliases: ["openai-rt", "gpt-realtime"] },
      );

      expect(VoiceFactory.hasRealtimeProvider("openai-realtime")).toBe(true);
      expect(VoiceFactory.hasRealtimeProvider("openai-rt")).toBe(true);
      expect(VoiceFactory.hasRealtimeProvider("gpt-realtime")).toBe(true);
    });

    it("should create Realtime provider instance", async () => {
      VoiceFactory.registerRealtimeProvider("test-realtime", () =>
        createMockRealtimeProvider("test-realtime"),
      );

      const provider =
        await VoiceFactory.createRealtimeProvider("test-realtime");

      expect(provider).toBeDefined();
      expect(provider.name).toBe("test-realtime");
    });

    it("should throw for unregistered Realtime provider", async () => {
      await expect(
        VoiceFactory.createRealtimeProvider("nonexistent"),
      ).rejects.toThrow();
    });

    it("should list available Realtime providers", () => {
      VoiceFactory.registerRealtimeProvider(
        "realtime-a",
        () => createMockRealtimeProvider("a"),
        { aliases: ["rt-alias"] },
      );
      VoiceFactory.registerRealtimeProvider("realtime-b", () =>
        createMockRealtimeProvider("b"),
      );

      const providers = VoiceFactory.getAvailableRealtimeProviders();

      expect(providers).toContain("realtime-a");
      expect(providers).toContain("realtime-b");
      expect(providers).not.toContain("rt-alias");
    });
  });

  describe("Default Configuration", () => {
    it("should merge default config with provided config", async () => {
      const factoryFn = vi.fn(() => createMockTTSProvider("config-tts"));

      VoiceFactory.registerTTSProvider("config-tts", factoryFn, {
        defaultConfig: {
          timeout: 30000,
          maxRetries: 3,
        },
      });

      await VoiceFactory.createTTSProvider("config-tts", {
        name: "config-tts",
        apiKey: "override-key",
      });

      expect(factoryFn).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 30000,
          maxRetries: 3,
          apiKey: "override-key",
        }),
      );
    });

    it("should allow override of default config", async () => {
      const factoryFn = vi.fn(() => createMockTTSProvider("override-tts"));

      VoiceFactory.registerTTSProvider("override-tts", factoryFn, {
        defaultConfig: {
          timeout: 30000,
        },
      });

      await VoiceFactory.createTTSProvider("override-tts", {
        name: "override-tts",
        timeout: 60000,
      });

      expect(factoryFn).toHaveBeenCalledWith(
        expect.objectContaining({
          timeout: 60000,
        }),
      );
    });
  });

  describe("Initialization State", () => {
    it("should track initialization state", () => {
      expect(VoiceFactory.isInitialized()).toBe(false);

      VoiceFactory.markInitialized();

      expect(VoiceFactory.isInitialized()).toBe(true);
    });

    it("should reset initialization state on clear", () => {
      VoiceFactory.markInitialized();
      expect(VoiceFactory.isInitialized()).toBe(true);

      VoiceFactory.clearAll();

      expect(VoiceFactory.isInitialized()).toBe(false);
    });
  });

  describe("clearAll", () => {
    it("should clear all registered providers", async () => {
      VoiceFactory.registerTTSProvider("tts", () =>
        createMockTTSProvider("tts"),
      );
      VoiceFactory.registerSTTProvider("stt", () =>
        createMockSTTProvider("stt"),
      );
      VoiceFactory.registerRealtimeProvider("rt", () =>
        createMockRealtimeProvider("rt"),
      );

      VoiceFactory.clearAll();

      expect(VoiceFactory.hasTTSProvider("tts")).toBe(false);
      expect(VoiceFactory.hasSTTProvider("stt")).toBe(false);
      expect(VoiceFactory.hasRealtimeProvider("rt")).toBe(false);
    });
  });

  describe("getProviderCapabilities", () => {
    it("should return capabilities for TTS provider", () => {
      VoiceFactory.registerTTSProvider("cap-tts", () =>
        createMockTTSProvider("cap-tts"),
      );

      const caps = VoiceFactory.getProviderCapabilities("cap-tts");

      expect(caps).toContain("tts");
    });

    it("should return capabilities for STT provider", () => {
      VoiceFactory.registerSTTProvider(
        "cap-stt",
        () => createMockSTTProvider("cap-stt"),
        { capabilities: ["stt", "streaming"] },
      );

      const caps = VoiceFactory.getProviderCapabilities("cap-stt");

      expect(caps).toContain("stt");
      expect(caps).toContain("streaming");
    });

    it("should return capabilities for Realtime provider", () => {
      VoiceFactory.registerRealtimeProvider(
        "cap-rt",
        () => createMockRealtimeProvider("cap-rt"),
        { capabilities: ["realtime"] },
      );

      const caps = VoiceFactory.getProviderCapabilities("cap-rt");

      expect(caps).toContain("realtime");
    });

    it("should return undefined for unknown provider", () => {
      const caps = VoiceFactory.getProviderCapabilities("unknown");

      expect(caps).toBeUndefined();
    });
  });

  describe("Error Messages", () => {
    it("should include available providers in error message", async () => {
      VoiceFactory.registerTTSProvider("provider-a", () =>
        createMockTTSProvider("a"),
      );
      VoiceFactory.registerTTSProvider("provider-b", () =>
        createMockTTSProvider("b"),
      );

      await expect(
        VoiceFactory.createTTSProvider("nonexistent"),
      ).rejects.toThrow(/provider-a|provider-b/i);
    });
  });
});
