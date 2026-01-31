/**
 * Composite Voice Tests
 *
 * Tests for CompositeVoice class which combines TTS and STT:
 * - Provider initialization
 * - Text-to-speech synthesis
 * - Speech-to-text transcription
 * - Conversation turns
 * - History tracking
 * - Error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { CompositeVoice } from "../../../src/lib/voice/compositeVoice.js";
import { VoiceFactory } from "../../../src/lib/voice/voiceFactory.js";
import type {
  TTSProvider,
  STTProvider,
  VoiceCapability,
  TTSVoice,
} from "../../../src/lib/types/voiceTypes.js";
import type { TTSOptions, TTSResult } from "../../../src/lib/types/ttsTypes.js";
import type { STTOptions, STTResult } from "../../../src/lib/types/sttTypes.js";

// Mock providers
const createMockTTSProvider = (name: string): TTSProvider => ({
  name,
  maxTextLength: 5000,
  getCapabilities: () => ["tts", "streaming"] as VoiceCapability[],
  isConfigured: () => true,
  validateConfig: async () => ({ valid: true, errors: [] }),
  synthesize: vi.fn(
    async (text: string, _options: TTSOptions): Promise<TTSResult> => ({
      buffer: Buffer.from(`synthesized: ${text}`),
      format: "mp3",
      size: text.length * 10,
      voice: "default-voice",
      metadata: { latency: 100, provider: name },
    }),
  ),
  getVoices: vi.fn(
    async (_languageCode?: string): Promise<TTSVoice[]> => [
      { id: "voice1", name: "Voice 1", languageCode: "en-US" },
      { id: "voice2", name: "Voice 2", languageCode: "en-GB" },
    ],
  ),
});

const createMockSTTProvider = (name: string): STTProvider => ({
  name,
  getCapabilities: () => ["stt"] as VoiceCapability[],
  isConfigured: () => true,
  validateConfig: async () => ({ valid: true, errors: [] }),
  transcribe: vi.fn(
    async (
      _audio: Buffer | ArrayBuffer,
      _options: STTOptions,
    ): Promise<STTResult> => ({
      text: "transcribed text from audio",
      language: "en-US",
      segments: [
        {
          text: "transcribed text from audio",
          start: 0,
          end: 2,
          confidence: 0.95,
        },
      ],
      duration: 2.0,
      confidence: 0.95,
      metadata: { latency: 200, provider: name },
    }),
  ),
  getSupportedLanguages: vi.fn(async () => ["en-US", "es-ES", "fr-FR"]),
  getSupportedFormats: () => ["wav", "mp3", "flac"],
});

describe("CompositeVoice", () => {
  beforeEach(() => {
    VoiceFactory.clearAll();

    // Register mock providers
    VoiceFactory.registerTTSProvider("mock-tts", () =>
      createMockTTSProvider("mock-tts"),
    );
    VoiceFactory.registerSTTProvider("mock-stt", () =>
      createMockSTTProvider("mock-stt"),
    );
  });

  afterEach(() => {
    VoiceFactory.clearAll();
  });

  describe("Initialization", () => {
    it("should create with default config", () => {
      const voice = new CompositeVoice();

      expect(voice).toBeDefined();
      expect(voice.getTTSProvider()).toBeNull();
      expect(voice.getSTTProvider()).toBeNull();
    });

    it("should initialize providers lazily", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
      });

      // Providers not initialized yet
      expect(voice.getTTSProvider()).toBeNull();

      // Trigger initialization
      await voice.validate();

      // Now providers should be initialized
      expect(voice.getTTSProvider()).not.toBeNull();
      expect(voice.getSTTProvider()).not.toBeNull();
    });

    it("should initialize with provider config objects", async () => {
      const voice = new CompositeVoice({
        ttsProvider: { name: "mock-tts", apiKey: "test-key" },
        sttProvider: { name: "mock-stt", apiKey: "test-key-2" },
      });

      await voice.validate();

      expect(voice.getTTSProvider()?.name).toBe("mock-tts");
      expect(voice.getSTTProvider()?.name).toBe("mock-stt");
    });
  });

  describe("Text-to-Speech (synthesize)", () => {
    it("should synthesize text to audio", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
      });

      const result = await voice.synthesize("Hello, world!");

      expect(result).toBeDefined();
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.toString()).toContain("Hello, world!");
      expect(result.format).toBe("mp3");
    });

    it("should merge default TTS options with provided options", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        defaultTTSOptions: {
          voice: "default-voice",
          speed: 1.0,
        },
      });

      await voice.synthesize("Test", { speed: 1.5 });

      const ttsProvider = voice.getTTSProvider() as TTSProvider;
      const synthesizeFn = ttsProvider.synthesize as ReturnType<typeof vi.fn>;

      expect(synthesizeFn).toHaveBeenCalledWith(
        "Test",
        expect.objectContaining({
          voice: "default-voice",
          speed: 1.5,
        }),
      );
    });

    it("should throw when TTS provider not configured", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt", // Only STT, no TTS
      });

      await expect(voice.synthesize("Test")).rejects.toThrow();
    });

    it("should track synthesis in history when enabled", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        trackHistory: true,
      });

      await voice.synthesize("Hello there");

      const history = voice.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].role).toBe("assistant");
      expect(history[0].text).toBe("Hello there");
      expect(history[0].audio).toBeInstanceOf(Buffer);
    });
  });

  describe("Speech-to-Text (transcribe)", () => {
    it("should transcribe audio to text", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt",
      });

      const audio = Buffer.from("mock audio data");
      const result = await voice.transcribe(audio);

      expect(result).toBeDefined();
      expect(result.text).toBe("transcribed text from audio");
      expect(result.confidence).toBe(0.95);
      expect(result.duration).toBe(2.0);
    });

    it("should accept ArrayBuffer audio", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt",
      });

      const arrayBuffer = new ArrayBuffer(100);
      const result = await voice.transcribe(arrayBuffer);

      expect(result.text).toBe("transcribed text from audio");
    });

    it("should merge default STT options", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt",
        defaultSTTOptions: {
          language: "en-US",
          punctuate: true,
        },
      });

      await voice.transcribe(Buffer.from("audio"), { wordTimestamps: true });

      const sttProvider = voice.getSTTProvider() as STTProvider;
      const transcribeFn = sttProvider.transcribe as ReturnType<typeof vi.fn>;

      expect(transcribeFn).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.objectContaining({
          language: "en-US",
          punctuate: true,
          wordTimestamps: true,
        }),
      );
    });

    it("should throw when STT provider not configured", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts", // Only TTS, no STT
      });

      await expect(voice.transcribe(Buffer.from("audio"))).rejects.toThrow();
    });

    it("should track transcription in history", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt",
        trackHistory: true,
      });

      await voice.transcribe(Buffer.from("audio"));

      const history = voice.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].role).toBe("user");
      expect(history[0].text).toBe("transcribed text from audio");
      expect(history[0].metadata?.confidence).toBe(0.95);
    });
  });

  describe("Conversation Turn", () => {
    it("should execute full conversation turn", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
      });

      const result = await voice.conversationTurn(
        Buffer.from("user audio"),
        async (text) => `Response to: ${text}`,
      );

      expect(result.userText).toBe("transcribed text from audio");
      expect(result.responseText).toBe(
        "Response to: transcribed text from audio",
      );
      expect(result.responseAudio).toBeInstanceOf(Buffer);
      expect(result.transcription).toBeDefined();
      expect(result.synthesis).toBeDefined();
    });

    it("should pass history to process function", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
        trackHistory: true,
      });

      // Do first turn
      await voice.conversationTurn(
        Buffer.from("audio1"),
        async () => "First response",
      );

      // Do second turn and check history
      let historyInCallback: typeof voice extends { getHistory(): infer H }
        ? H
        : never = [];

      await voice.conversationTurn(
        Buffer.from("audio2"),
        async (_text, history) => {
          historyInCallback = history;
          return "Second response";
        },
      );

      expect(historyInCallback.length).toBeGreaterThan(0);
    });
  });

  describe("History Management", () => {
    it("should track history when enabled", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
        trackHistory: true,
      });

      await voice.transcribe(Buffer.from("audio"));
      await voice.synthesize("Response");

      const history = voice.getHistory();

      expect(history).toHaveLength(2);
      expect(history[0].role).toBe("user");
      expect(history[1].role).toBe("assistant");
    });

    it("should not track history when disabled", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
        trackHistory: false,
      });

      await voice.transcribe(Buffer.from("audio"));
      await voice.synthesize("Response");

      const history = voice.getHistory();

      expect(history).toHaveLength(0);
    });

    it("should trim history when exceeding max turns", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        trackHistory: true,
        maxHistoryTurns: 3,
      });

      await voice.synthesize("One");
      await voice.synthesize("Two");
      await voice.synthesize("Three");
      await voice.synthesize("Four");

      const history = voice.getHistory();

      expect(history).toHaveLength(3);
      expect(history[0].text).toBe("Two");
      expect(history[2].text).toBe("Four");
    });

    it("should clear history", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        trackHistory: true,
      });

      await voice.synthesize("Test");
      expect(voice.getHistory()).toHaveLength(1);

      voice.clearHistory();

      expect(voice.getHistory()).toHaveLength(0);
    });
  });

  describe("Provider Management", () => {
    it("should set TTS provider dynamically", async () => {
      VoiceFactory.registerTTSProvider("another-tts", () =>
        createMockTTSProvider("another-tts"),
      );

      const voice = new CompositeVoice();
      await voice.setTTSProvider("another-tts");

      expect(voice.getTTSProvider()?.name).toBe("another-tts");
    });

    it("should set STT provider dynamically", async () => {
      VoiceFactory.registerSTTProvider("another-stt", () =>
        createMockSTTProvider("another-stt"),
      );

      const voice = new CompositeVoice();
      await voice.setSTTProvider("another-stt");

      expect(voice.getSTTProvider()?.name).toBe("another-stt");
    });

    it("should set provider instance directly", async () => {
      const voice = new CompositeVoice();
      const customProvider = createMockTTSProvider("custom-tts");

      await voice.setTTSProvider(customProvider);

      expect(voice.getTTSProvider()).toBe(customProvider);
    });
  });

  describe("Capabilities", () => {
    it("should aggregate capabilities from all providers", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
      });

      // Initialize providers
      await voice.validate();

      const capabilities = voice.getCapabilities();

      expect(capabilities).toContain("tts");
      expect(capabilities).toContain("stt");
      expect(capabilities).toContain("streaming");
    });

    it("should return empty capabilities when no providers", () => {
      const voice = new CompositeVoice();

      const capabilities = voice.getCapabilities();

      expect(capabilities).toHaveLength(0);
    });
  });

  describe("Voice and Language Information", () => {
    it("should get available voices", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
      });

      const voices = await voice.getAvailableVoices();

      expect(voices).toContain("voice1");
      expect(voices).toContain("voice2");
    });

    it("should get supported languages", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt",
      });

      const languages = await voice.getSupportedLanguages();

      expect(languages).toContain("en-US");
      expect(languages).toContain("es-ES");
    });

    it("should return empty arrays when providers not configured", async () => {
      const voice = new CompositeVoice();

      const voices = await voice.getAvailableVoices();
      const languages = await voice.getSupportedLanguages();

      expect(voices).toHaveLength(0);
      expect(languages).toHaveLength(0);
    });
  });

  describe("Validation", () => {
    it("should validate configured providers", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
      });

      const result = await voice.validate();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should report validation errors", async () => {
      // Register a provider that fails validation
      VoiceFactory.registerTTSProvider("invalid-tts", () => ({
        name: "invalid-tts",
        maxTextLength: 5000,
        getCapabilities: () => ["tts"] as VoiceCapability[],
        isConfigured: () => false,
        validateConfig: async () => ({
          valid: false,
          errors: ["API key missing"],
        }),
        synthesize: vi.fn(),
        getVoices: vi.fn(async () => []),
      }));

      const voice = new CompositeVoice({
        ttsProvider: "invalid-tts",
      });

      const result = await voice.validate();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("TTS: API key missing");
    });

    it("should check if fully configured", async () => {
      const voiceBoth = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
      });

      const voiceTTSOnly = new CompositeVoice({
        ttsProvider: "mock-tts",
      });

      expect(await voiceBoth.isFullyConfigured()).toBe(true);
      expect(await voiceTTSOnly.isFullyConfigured()).toBe(false);
    });
  });

  describe("Concurrent Initialization Protection", () => {
    it("should not initialize multiple times concurrently", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
        sttProvider: "mock-stt",
      });

      // Trigger multiple initializations concurrently
      const promises = [
        voice.synthesize("Test 1"),
        voice.synthesize("Test 2"),
        voice.transcribe(Buffer.from("audio")),
      ];

      // All should succeed without race conditions
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
    });
  });
});

describe("CompositeVoice Edge Cases", () => {
  beforeEach(() => {
    VoiceFactory.clearAll();
    VoiceFactory.registerTTSProvider("mock-tts", () =>
      createMockTTSProvider("mock-tts"),
    );
    VoiceFactory.registerSTTProvider("mock-stt", () =>
      createMockSTTProvider("mock-stt"),
    );
  });

  afterEach(() => {
    VoiceFactory.clearAll();
  });

  describe("Empty/Invalid Input", () => {
    it("should handle empty text synthesis", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
      });

      const result = await voice.synthesize("");

      expect(result.buffer).toBeInstanceOf(Buffer);
    });

    it("should handle small audio input", async () => {
      const voice = new CompositeVoice({
        sttProvider: "mock-stt",
      });

      const result = await voice.transcribe(Buffer.from("x"));

      expect(result.text).toBeDefined();
    });
  });

  describe("Large Input", () => {
    it("should handle large text synthesis", async () => {
      const voice = new CompositeVoice({
        ttsProvider: "mock-tts",
      });

      const largeText = "word ".repeat(1000);
      const result = await voice.synthesize(largeText);

      expect(result.buffer).toBeInstanceOf(Buffer);
    });
  });
});
