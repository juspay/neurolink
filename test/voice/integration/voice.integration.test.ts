/**
 * Voice/Speech Integration Tests for NeuroLink
 *
 * Comprehensive integration tests for the Voice/Speech Integration feature:
 * - TTS providers (8 providers)
 * - STT providers (6 providers)
 * - Realtime voice providers (2 providers)
 * - VoiceAgent pipeline testing
 * - CompositeVoice with conversation history
 * - Streaming audio handling
 * - Voice provider switching
 * - Error handling and fallback
 * - Audio format conversion
 *
 * Reference pattern: test/continuous-test-suite.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Import voice module components
import { VoiceFactory } from "../../../src/lib/voice/voiceFactory.js";
import { VoiceRegistry } from "../../../src/lib/voice/voiceRegistry.js";
import { CompositeVoice } from "../../../src/lib/voice/compositeVoice.js";
import { VoiceAgent } from "../../../src/lib/voice/voiceAgent.js";
import {
  VoiceError,
  STTError,
  RealtimeError,
  VoiceErrorFactory,
} from "../../../src/lib/voice/errors.js";
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
import {
  detectAudioFormat,
  validateAudioBuffer,
  getAudioMimeType,
  getAudioExtension,
  parseWavMetadata,
  createWavHeader,
  pcmToWav,
  base64ToBuffer,
  bufferToBase64,
  splitAudioIntoChunks,
  estimateDuration,
  normalizeVolume,
  resampleLinear,
  concatenateAudio,
  isSilence,
  DEFAULT_PCM_CONFIG,
} from "../../../src/lib/voice/audio-utils.js";

// Import type definitions
import type {
  TTSProvider,
  STTProvider,
  RealtimeVoiceProvider,
  VoiceCapability,
  TTSVoice,
  VoiceProviderConfig,
  TTSStreamChunk,
  VoiceTurn,
  CompositeVoiceConfig,
  VoiceAgentConfig,
} from "../../../src/lib/types/voiceTypes.js";
import type {
  TTSOptions,
  TTSResult,
  AudioFormat,
} from "../../../src/lib/types/ttsTypes.js";
import type {
  STTOptions,
  STTResult,
  TranscriptionSegment,
  STTAudioFormat,
} from "../../../src/lib/types/sttTypes.js";
import type {
  RealtimeConfig,
  RealtimeSession,
  RealtimeEventType,
  RealtimeEvent,
} from "../../../src/lib/types/realtimeTypes.js";

// =============================================================================
// MOCK PROVIDER FACTORIES
// =============================================================================

/**
 * Create a mock TTS provider for testing
 */
const createMockTTSProvider = (
  name: string,
  options: {
    maxTextLength?: number;
    capabilities?: VoiceCapability[];
    synthesizeDelay?: number;
    shouldFail?: boolean;
    failMessage?: string;
  } = {},
): TTSProvider => {
  const {
    maxTextLength = 5000,
    capabilities = ["tts"],
    synthesizeDelay = 0,
    shouldFail = false,
    failMessage = "Synthesis failed",
  } = options;

  return {
    name,
    maxTextLength,
    getCapabilities: () => capabilities,
    isConfigured: () => !shouldFail,
    validateConfig: async () => ({
      valid: !shouldFail,
      errors: shouldFail ? [failMessage] : [],
    }),
    synthesize: async (text: string, opts: TTSOptions): Promise<TTSResult> => {
      if (synthesizeDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, synthesizeDelay));
      }
      if (shouldFail) {
        throw new VoiceError({
          code: "TTS_SYNTHESIS_FAILED",
          message: failMessage,
          provider: name,
        });
      }
      const audioData = `synthesized:${name}:${text}`;
      return {
        buffer: Buffer.from(audioData),
        format: opts.format ?? "mp3",
        size: audioData.length,
        duration: text.length * 0.05, // ~50ms per character
        voice: opts.voice ?? "default",
        sampleRate: 24000,
        metadata: { latency: synthesizeDelay || 100, provider: name },
      };
    },
    synthesizeStream: capabilities.includes("streaming")
      ? async function* (
          text: string,
          opts: TTSOptions,
        ): AsyncIterable<TTSStreamChunk> {
          const words = text.split(" ");
          for (let i = 0; i < words.length; i++) {
            yield {
              data: Buffer.from(words[i] + " "),
              index: i,
              isFinal: i === words.length - 1,
              format: opts.format ?? "mp3",
              sampleRate: 24000,
              timestampMs: i * 200,
            };
          }
        }
      : undefined,
    getVoices: async (languageCode?: string): Promise<TTSVoice[]> => {
      const voices: TTSVoice[] = [
        {
          id: `${name}-voice-1`,
          name: "Voice 1",
          languageCode: "en-US",
          languageCodes: ["en-US", "en-GB"],
          gender: "female",
        },
        {
          id: `${name}-voice-2`,
          name: "Voice 2",
          languageCode: "en-US",
          languageCodes: ["en-US"],
          gender: "male",
        },
        {
          id: `${name}-voice-3`,
          name: "Spanish Voice",
          languageCode: "es-ES",
          languageCodes: ["es-ES", "es-MX"],
          gender: "neutral",
        },
      ];
      if (languageCode) {
        return voices.filter((v) => v.languageCodes.includes(languageCode));
      }
      return voices;
    },
  };
};

/**
 * Create a mock STT provider for testing
 */
const createMockSTTProvider = (
  name: string,
  options: {
    capabilities?: VoiceCapability[];
    transcribeDelay?: number;
    shouldFail?: boolean;
    failMessage?: string;
    supportedLanguages?: string[];
    supportedFormats?: STTAudioFormat[];
  } = {},
): STTProvider => {
  const {
    capabilities = ["stt"],
    transcribeDelay = 0,
    shouldFail = false,
    failMessage = "Transcription failed",
    supportedLanguages = ["en-US", "es-ES", "fr-FR", "de-DE"],
    supportedFormats = ["wav", "mp3", "m4a", "flac"],
  } = options;

  return {
    name,
    getCapabilities: () => capabilities,
    isConfigured: () => !shouldFail,
    validateConfig: async () => ({
      valid: !shouldFail,
      errors: shouldFail ? [failMessage] : [],
    }),
    transcribe: async (
      audio: Buffer | ArrayBuffer,
      opts: STTOptions,
    ): Promise<STTResult> => {
      if (transcribeDelay > 0) {
        await new Promise((resolve) => setTimeout(resolve, transcribeDelay));
      }
      if (shouldFail) {
        throw STTError.transcriptionFailed(failMessage, undefined, name);
      }
      const audioSize =
        audio instanceof ArrayBuffer ? audio.byteLength : audio.length;
      const duration = audioSize / 32000; // ~32KB per second estimate

      return {
        text: `Transcribed text from ${name}`,
        language: opts.language ?? "en-US",
        segments: [
          {
            text: `Transcribed text from ${name}`,
            start: 0,
            end: duration,
            confidence: 0.95,
            isFinal: true,
          },
        ],
        duration,
        confidence: 0.95,
        metadata: {
          latency: transcribeDelay || 150,
          provider: name,
          model: opts.model ?? "default",
        },
      };
    },
    transcribeStream: capabilities.includes("streaming")
      ? async function* (
          audioStream: AsyncIterable<Buffer>,
          opts: STTOptions,
        ): AsyncIterable<TranscriptionSegment> {
          let segmentIndex = 0;
          for await (const _chunk of audioStream) {
            yield {
              text: `Segment ${segmentIndex}`,
              start: segmentIndex * 2,
              end: (segmentIndex + 1) * 2,
              confidence: 0.9,
              isFinal: false,
            };
            segmentIndex++;
          }
          yield {
            text: `Final segment`,
            start: segmentIndex * 2,
            end: (segmentIndex + 1) * 2,
            confidence: 0.95,
            isFinal: true,
          };
        }
      : undefined,
    getSupportedLanguages: async () => supportedLanguages,
    getSupportedFormats: () => supportedFormats as string[],
  };
};

/**
 * Create a mock Realtime voice provider for testing
 */
const createMockRealtimeProvider = (
  name: string,
  options: {
    capabilities?: VoiceCapability[];
    shouldFail?: boolean;
    failMessage?: string;
  } = {},
): RealtimeVoiceProvider => {
  const {
    capabilities = ["realtime"],
    shouldFail = false,
    failMessage = "Connection failed",
  } = options;

  let isConnected = false;
  let sessionConfig: RealtimeConfig | null = null;

  return {
    name,
    getCapabilities: () => capabilities,
    isConfigured: () => !shouldFail,
    validateConfig: async () => ({
      valid: !shouldFail,
      errors: shouldFail ? [failMessage] : [],
    }),
    connect: async (config: RealtimeConfig): Promise<RealtimeSession> => {
      if (shouldFail) {
        throw RealtimeError.connectionFailed(failMessage, undefined, name);
      }
      isConnected = true;
      sessionConfig = config;

      const eventHandlers = new Map<
        RealtimeEventType,
        Set<(event: RealtimeEvent) => void>
      >();

      return {
        id: `session-${Date.now()}`,
        sendAudio: vi.fn(),
        commitAudio: vi.fn(),
        clearAudio: vi.fn(),
        sendText: vi.fn(),
        createResponse: vi.fn(),
        cancelResponse: vi.fn(),
        updateSession: vi.fn((newConfig: Partial<RealtimeConfig>) => {
          sessionConfig = { ...sessionConfig, ...newConfig };
        }),
        registerTools: vi.fn(),
        sendFunctionResult: vi.fn(),
        on: (event: RealtimeEventType, handler: (e: RealtimeEvent) => void) => {
          if (!eventHandlers.has(event)) {
            eventHandlers.set(event, new Set());
          }
          eventHandlers.get(event)?.add(handler);
        },
        off: (
          event: RealtimeEventType,
          handler: (e: RealtimeEvent) => void,
        ) => {
          eventHandlers.get(event)?.delete(handler);
        },
        close: () => {
          isConnected = false;
        },
        isOpen: () => isConnected,
      };
    },
    isConnected: () => isConnected,
    disconnect: async () => {
      isConnected = false;
      sessionConfig = null;
    },
    getSessionConfig: () => sessionConfig,
  };
};

/**
 * Create sample WAV audio buffer for testing
 */
const createSampleWavBuffer = (durationSecs: number = 1): Buffer => {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSecs;
  const pcmData = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample

  // Generate a simple sine wave
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    const intSample = Math.round(sample * 32767);
    pcmData.writeInt16LE(intSample, i * 2);
  }

  return pcmToWav(pcmData, { sampleRate, channels: 1, bitDepth: 16 });
};

/**
 * Create sample PCM audio buffer for testing
 */
const createSamplePCMBuffer = (durationSecs: number = 1): Buffer => {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSecs;
  const pcmData = Buffer.alloc(numSamples * 2);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    const intSample = Math.round(sample * 32767);
    pcmData.writeInt16LE(intSample, i * 2);
  }

  return pcmData;
};

// =============================================================================
// TEST SUITES
// =============================================================================

describe("Voice/Speech Integration Tests", () => {
  beforeEach(() => {
    VoiceFactory.clearAll();
  });

  afterEach(() => {
    VoiceFactory.clearAll();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // TTS PROVIDERS (8 providers)
  // ===========================================================================
  describe("TTS Providers Integration", () => {
    const ttsProviders = [
      { name: "google-tts", aliases: ["google", "gcloud-tts"] },
      { name: "elevenlabs", aliases: ["eleven", "11labs", "elevenlabs-tts"] },
      { name: "openai-tts", aliases: ["openai", "oai-tts"] },
      { name: "azure-tts", aliases: ["azure", "azure-speech"] },
      { name: "sarvam", aliases: ["sarvam-ai", "sarvam-tts"] },
      { name: "murf", aliases: ["murf-ai", "murf-tts"] },
      { name: "playai", aliases: ["play-ai", "playai-tts", "play"] },
      { name: "speechify", aliases: ["speechify-tts"] },
    ];

    describe("Provider Registration", () => {
      it("should register all 8 TTS providers with VoiceFactory", () => {
        ttsProviders.forEach(({ name, aliases }) => {
          VoiceFactory.registerTTSProvider(
            name,
            () => createMockTTSProvider(name, { capabilities: ["tts"] }),
            { aliases },
          );
        });

        expect(VoiceFactory.getAvailableTTSProviders().length).toBe(8);
        ttsProviders.forEach(({ name }) => {
          expect(VoiceFactory.hasTTSProvider(name)).toBe(true);
        });
      });

      it("should resolve provider aliases correctly", () => {
        ttsProviders.forEach(({ name, aliases }) => {
          VoiceFactory.registerTTSProvider(
            name,
            () => createMockTTSProvider(name),
            { aliases },
          );
        });

        // Test alias resolution
        expect(VoiceFactory.hasTTSProvider("eleven")).toBe(true);
        expect(VoiceFactory.hasTTSProvider("11labs")).toBe(true);
        expect(VoiceFactory.hasTTSProvider("oai-tts")).toBe(true);
        expect(VoiceFactory.hasTTSProvider("azure-speech")).toBe(true);
        expect(VoiceFactory.hasTTSProvider("play")).toBe(true);
      });

      it("should support case-insensitive provider names", async () => {
        VoiceFactory.registerTTSProvider("ElevenLabs", () =>
          createMockTTSProvider("elevenlabs"),
        );

        expect(VoiceFactory.hasTTSProvider("elevenlabs")).toBe(true);
        expect(VoiceFactory.hasTTSProvider("ELEVENLABS")).toBe(true);
        expect(VoiceFactory.hasTTSProvider("ElevenLabs")).toBe(true);

        const provider = await VoiceFactory.createTTSProvider("ELEVENLABS");
        expect(provider).toBeDefined();
      });
    });

    describe("Provider Creation and Configuration", () => {
      it("should create TTS provider with custom config", async () => {
        const factoryFn = vi.fn(() =>
          createMockTTSProvider("test-tts", { maxTextLength: 10000 }),
        );

        VoiceFactory.registerTTSProvider("test-tts", factoryFn, {
          defaultConfig: { timeout: 30000 },
        });

        await VoiceFactory.createTTSProvider("test-tts", {
          name: "test-tts",
          apiKey: "test-api-key",
        });

        expect(factoryFn).toHaveBeenCalledWith(
          expect.objectContaining({
            apiKey: "test-api-key",
            timeout: 30000,
          }),
        );
      });

      it("should merge default config with provided config", async () => {
        const factoryFn = vi.fn(() => createMockTTSProvider("config-tts"));

        VoiceFactory.registerTTSProvider("config-tts", factoryFn, {
          defaultConfig: { timeout: 30000, maxRetries: 3 },
        });

        await VoiceFactory.createTTSProvider("config-tts", {
          name: "config-tts",
          timeout: 60000, // Override
        });

        expect(factoryFn).toHaveBeenCalledWith(
          expect.objectContaining({
            timeout: 60000,
            maxRetries: 3,
          }),
        );
      });
    });

    describe("TTS Synthesis Operations", () => {
      it("should synthesize text to audio buffer", async () => {
        VoiceFactory.registerTTSProvider("synth-tts", () =>
          createMockTTSProvider("synth-tts"),
        );

        const provider = await VoiceFactory.createTTSProvider("synth-tts");
        const result = await provider.synthesize("Hello, world!", {
          format: "mp3",
          voice: "default-voice",
        });

        expect(result.buffer).toBeDefined();
        expect(result.buffer.length).toBeGreaterThan(0);
        expect(result.format).toBe("mp3");
        expect(result.metadata?.provider).toBe("synth-tts");
      });

      it("should synthesize with different audio formats", async () => {
        VoiceFactory.registerTTSProvider("format-tts", () =>
          createMockTTSProvider("format-tts"),
        );

        const provider = await VoiceFactory.createTTSProvider("format-tts");

        const formats: AudioFormat[] = ["mp3", "wav", "ogg", "opus"];
        for (const format of formats) {
          const result = await provider.synthesize("Test", { format });
          expect(result.format).toBe(format);
        }
      });

      it("should get available voices for a provider", async () => {
        VoiceFactory.registerTTSProvider("voices-tts", () =>
          createMockTTSProvider("voices-tts"),
        );

        const provider = await VoiceFactory.createTTSProvider("voices-tts");
        const allVoices = await provider.getVoices();
        const englishVoices = await provider.getVoices("en-US");

        expect(allVoices.length).toBe(3);
        expect(englishVoices.length).toBe(2);
        expect(
          englishVoices.every((v) => v.languageCodes.includes("en-US")),
        ).toBe(true);
      });

      it("should validate provider configuration", async () => {
        VoiceFactory.registerTTSProvider("valid-tts", () =>
          createMockTTSProvider("valid-tts"),
        );
        VoiceFactory.registerTTSProvider("invalid-tts", () =>
          createMockTTSProvider("invalid-tts", {
            shouldFail: true,
            failMessage: "API key required",
          }),
        );

        const validProvider = await VoiceFactory.createTTSProvider("valid-tts");
        const invalidProvider =
          await VoiceFactory.createTTSProvider("invalid-tts");

        const validResult = await validProvider.validateConfig();
        const invalidResult = await invalidProvider.validateConfig();

        expect(validResult.valid).toBe(true);
        expect(invalidResult.valid).toBe(false);
        expect(invalidResult.errors).toContain("API key required");
      });
    });

    describe("TTS Streaming", () => {
      it("should stream synthesized audio chunks", async () => {
        VoiceFactory.registerTTSProvider("stream-tts", () =>
          createMockTTSProvider("stream-tts", {
            capabilities: ["tts", "streaming"],
          }),
        );

        const provider = await VoiceFactory.createTTSProvider("stream-tts");
        expect(provider.synthesizeStream).toBeDefined();

        const chunks: TTSStreamChunk[] = [];
        for await (const chunk of provider.synthesizeStream!(
          "Hello streaming world",
          { format: "mp3" },
        )) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBe(3); // "Hello", "streaming", "world"
        expect(chunks[chunks.length - 1].isFinal).toBe(true);
        expect(chunks.every((c) => c.format === "mp3")).toBe(true);
      });

      it("should process TTS stream with event handlers", async () => {
        const chunks: TTSStreamChunk[] = [];
        for (let i = 0; i < 5; i++) {
          chunks.push({
            data: Buffer.from(`chunk-${i}`),
            index: i,
            isFinal: i === 4,
            format: "mp3",
            sampleRate: 24000,
          });
        }

        const onChunk = vi.fn();
        const onComplete = vi.fn();
        const onProgress = vi.fn();

        const result = await processTTSStream(
          (async function* () {
            for (const chunk of chunks) {
              yield chunk;
            }
          })(),
          { onChunk, onComplete, onProgress },
        );

        expect(result.length).toBeGreaterThan(0);
        expect(onChunk).toHaveBeenCalledTimes(5);
        expect(onComplete).toHaveBeenCalledTimes(1);
        expect(onProgress).toHaveBeenCalledTimes(5);
      });
    });
  });

  // ===========================================================================
  // STT PROVIDERS (6 providers)
  // ===========================================================================
  describe("STT Providers Integration", () => {
    const sttProviders = [
      { name: "deepgram", aliases: ["dg", "deepgram-stt"] },
      {
        name: "whisper",
        aliases: ["openai-whisper", "oai-whisper", "whisper-stt"],
      },
      { name: "gladia", aliases: ["gladia-stt"] },
      {
        name: "assemblyai",
        aliases: ["assembly", "assembly-ai", "assemblyai-stt"],
      },
      { name: "google-stt", aliases: ["google-speech", "gcloud-stt"] },
      {
        name: "azure-stt",
        aliases: ["azure-speech-stt", "azure-speech-to-text"],
      },
    ];

    describe("Provider Registration", () => {
      it("should register all 6 STT providers with VoiceFactory", () => {
        sttProviders.forEach(({ name, aliases }) => {
          VoiceFactory.registerSTTProvider(
            name,
            () => createMockSTTProvider(name),
            { aliases },
          );
        });

        expect(VoiceFactory.getAvailableSTTProviders().length).toBe(6);
        sttProviders.forEach(({ name }) => {
          expect(VoiceFactory.hasSTTProvider(name)).toBe(true);
        });
      });

      it("should resolve STT provider aliases correctly", () => {
        sttProviders.forEach(({ name, aliases }) => {
          VoiceFactory.registerSTTProvider(
            name,
            () => createMockSTTProvider(name),
            { aliases },
          );
        });

        expect(VoiceFactory.hasSTTProvider("dg")).toBe(true);
        expect(VoiceFactory.hasSTTProvider("oai-whisper")).toBe(true);
        expect(VoiceFactory.hasSTTProvider("assembly-ai")).toBe(true);
        expect(VoiceFactory.hasSTTProvider("gcloud-stt")).toBe(true);
      });
    });

    describe("STT Transcription Operations", () => {
      it("should transcribe audio buffer to text", async () => {
        VoiceFactory.registerSTTProvider("trans-stt", () =>
          createMockSTTProvider("trans-stt"),
        );

        const provider = await VoiceFactory.createSTTProvider("trans-stt");
        const audioBuffer = createSampleWavBuffer(2);
        const result = await provider.transcribe(audioBuffer, {
          language: "en-US",
        });

        expect(result.text).toBeDefined();
        expect(result.text.length).toBeGreaterThan(0);
        expect(result.language).toBe("en-US");
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(result.segments.length).toBeGreaterThan(0);
      });

      it("should get supported languages for a provider", async () => {
        VoiceFactory.registerSTTProvider("lang-stt", () =>
          createMockSTTProvider("lang-stt", {
            supportedLanguages: ["en-US", "es-ES", "fr-FR", "de-DE", "ja-JP"],
          }),
        );

        const provider = await VoiceFactory.createSTTProvider("lang-stt");
        const languages = await provider.getSupportedLanguages();

        expect(languages).toContain("en-US");
        expect(languages).toContain("es-ES");
        expect(languages.length).toBe(5);
      });

      it("should get supported audio formats", async () => {
        VoiceFactory.registerSTTProvider("fmt-stt", () =>
          createMockSTTProvider("fmt-stt", {
            supportedFormats: ["wav", "mp3", "m4a", "flac", "webm"],
          }),
        );

        const provider = await VoiceFactory.createSTTProvider("fmt-stt");
        const formats = provider.getSupportedFormats();

        expect(formats).toContain("wav");
        expect(formats).toContain("mp3");
        expect(formats.length).toBe(5);
      });

      it("should include word-level timestamps when requested", async () => {
        VoiceFactory.registerSTTProvider("word-stt", () => {
          const provider = createMockSTTProvider("word-stt");
          // Override transcribe to return word timestamps
          provider.transcribe = async (audio, opts) => ({
            text: "Hello world",
            language: opts.language ?? "en-US",
            segments: [
              {
                text: "Hello world",
                start: 0,
                end: 1.5,
                confidence: 0.95,
                isFinal: true,
                words: [
                  { word: "Hello", start: 0, end: 0.7, confidence: 0.96 },
                  { word: "world", start: 0.8, end: 1.5, confidence: 0.94 },
                ],
              },
            ],
            duration: 1.5,
            confidence: 0.95,
            metadata: { latency: 100, provider: "word-stt" },
          });
          return provider;
        });

        const provider = await VoiceFactory.createSTTProvider("word-stt");
        const result = await provider.transcribe(createSampleWavBuffer(), {
          wordTimestamps: true,
        });

        expect(result.segments[0].words).toBeDefined();
        expect(result.segments[0].words?.length).toBe(2);
        expect(result.segments[0].words?.[0].word).toBe("Hello");
      });
    });

    describe("STT Streaming", () => {
      it("should stream transcription segments", async () => {
        VoiceFactory.registerSTTProvider("stream-stt", () =>
          createMockSTTProvider("stream-stt", {
            capabilities: ["stt", "streaming"],
          }),
        );

        const provider = await VoiceFactory.createSTTProvider("stream-stt");
        expect(provider.transcribeStream).toBeDefined();

        const audioChunks = [
          createSamplePCMBuffer(0.5),
          createSamplePCMBuffer(0.5),
          createSamplePCMBuffer(0.5),
        ];

        const segments: TranscriptionSegment[] = [];
        for await (const segment of provider.transcribeStream!(
          (async function* () {
            for (const chunk of audioChunks) {
              yield chunk;
            }
          })(),
          { language: "en-US" },
        )) {
          segments.push(segment);
        }

        expect(segments.length).toBeGreaterThan(0);
        expect(segments[segments.length - 1].isFinal).toBe(true);
      });

      it("should process STT stream with accumulator", async () => {
        const accumulator = new TranscriptionStreamAccumulator();

        const segments: TranscriptionSegment[] = [
          {
            text: "Hello",
            start: 0,
            end: 0.5,
            confidence: 0.9,
            isFinal: false,
          },
          {
            text: "Hello world",
            start: 0,
            end: 1.0,
            confidence: 0.92,
            isFinal: false,
          },
          {
            text: "Hello world today",
            start: 0,
            end: 1.5,
            confidence: 0.95,
            isFinal: true,
          },
        ];

        for (const segment of segments) {
          accumulator.addSegment(segment);
        }
        accumulator.complete();

        expect(accumulator.getIsComplete()).toBe(true);
        expect(accumulator.getFinalText()).toContain("Hello world today");
        expect(accumulator.getAverageConfidence()).toBeGreaterThan(0.9);
      });
    });
  });

  // ===========================================================================
  // REALTIME VOICE PROVIDERS (2 providers)
  // ===========================================================================
  describe("Realtime Voice Providers Integration", () => {
    const realtimeProviders = [
      { name: "openai-realtime", aliases: ["oai-realtime", "openai-rt"] },
      { name: "gemini-live", aliases: ["gemini-realtime", "google-live"] },
    ];

    describe("Provider Registration", () => {
      it("should register both realtime providers", () => {
        realtimeProviders.forEach(({ name, aliases }) => {
          VoiceFactory.registerRealtimeProvider(
            name,
            () => createMockRealtimeProvider(name),
            { aliases, capabilities: ["realtime", "streaming"] },
          );
        });

        expect(VoiceFactory.getAvailableRealtimeProviders().length).toBe(2);
        expect(VoiceFactory.hasRealtimeProvider("openai-realtime")).toBe(true);
        expect(VoiceFactory.hasRealtimeProvider("gemini-live")).toBe(true);
      });
    });

    describe("Realtime Session Management", () => {
      it("should connect and create a realtime session", async () => {
        VoiceFactory.registerRealtimeProvider("test-rt", () =>
          createMockRealtimeProvider("test-rt"),
        );

        const provider = await VoiceFactory.createRealtimeProvider("test-rt");
        const session = await provider.connect({
          voice: "alloy",
          temperature: 0.7,
          turnDetection: "server_vad",
        });

        expect(session.id).toBeDefined();
        expect(session.isOpen()).toBe(true);
        expect(provider.isConnected()).toBe(true);
      });

      it("should send and receive audio in realtime session", async () => {
        VoiceFactory.registerRealtimeProvider("audio-rt", () =>
          createMockRealtimeProvider("audio-rt"),
        );

        const provider = await VoiceFactory.createRealtimeProvider("audio-rt");
        const session = await provider.connect({ voice: "echo" });

        const audioBuffer = createSamplePCMBuffer(0.5);
        session.sendAudio(audioBuffer);
        session.commitAudio();

        expect(session.sendAudio).toHaveBeenCalledWith(audioBuffer);
        expect(session.commitAudio).toHaveBeenCalled();
      });

      it("should handle text messages in realtime session", async () => {
        VoiceFactory.registerRealtimeProvider("text-rt", () =>
          createMockRealtimeProvider("text-rt"),
        );

        const provider = await VoiceFactory.createRealtimeProvider("text-rt");
        const session = await provider.connect({});

        session.sendText("Hello, assistant!");

        expect(session.sendText).toHaveBeenCalledWith("Hello, assistant!");
      });

      it("should register event handlers for realtime events", async () => {
        VoiceFactory.registerRealtimeProvider("event-rt", () =>
          createMockRealtimeProvider("event-rt"),
        );

        const provider = await VoiceFactory.createRealtimeProvider("event-rt");
        const session = await provider.connect({});

        const audioHandler = vi.fn();
        const textHandler = vi.fn();

        session.on("response.audio.delta", audioHandler);
        session.on("response.text.delta", textHandler);

        // Handlers registered but not called (mock doesn't emit events)
        expect(typeof session.on).toBe("function");
        expect(typeof session.off).toBe("function");
      });

      it("should close realtime session properly", async () => {
        VoiceFactory.registerRealtimeProvider("close-rt", () =>
          createMockRealtimeProvider("close-rt"),
        );

        const provider = await VoiceFactory.createRealtimeProvider("close-rt");
        const session = await provider.connect({});

        expect(session.isOpen()).toBe(true);
        session.close();
        expect(session.isOpen()).toBe(false);
      });

      it("should update session configuration", async () => {
        VoiceFactory.registerRealtimeProvider("update-rt", () =>
          createMockRealtimeProvider("update-rt"),
        );

        const provider = await VoiceFactory.createRealtimeProvider("update-rt");
        const session = await provider.connect({ temperature: 0.5 });

        session.updateSession({ temperature: 0.8 });

        expect(session.updateSession).toHaveBeenCalledWith({
          temperature: 0.8,
        });
      });

      it("should handle connection failure gracefully", async () => {
        VoiceFactory.registerRealtimeProvider("fail-rt", () =>
          createMockRealtimeProvider("fail-rt", {
            shouldFail: true,
            failMessage: "WebSocket connection refused",
          }),
        );

        const provider = await VoiceFactory.createRealtimeProvider("fail-rt");

        await expect(provider.connect({})).rejects.toThrow(RealtimeError);
        await expect(provider.connect({})).rejects.toThrow(
          "WebSocket connection refused",
        );
      });
    });
  });

  // ===========================================================================
  // VOICE AGENT PIPELINE
  // ===========================================================================
  describe("VoiceAgent Pipeline", () => {
    beforeEach(() => {
      // Register mock providers for VoiceAgent tests
      VoiceFactory.registerTTSProvider("agent-tts", () =>
        createMockTTSProvider("agent-tts", {
          capabilities: ["tts", "streaming"],
        }),
      );
      VoiceFactory.registerSTTProvider("agent-stt", () =>
        createMockSTTProvider("agent-stt", {
          capabilities: ["stt", "streaming"],
        }),
      );
      VoiceFactory.registerRealtimeProvider("agent-rt", () =>
        createMockRealtimeProvider("agent-rt"),
      );
    });

    describe("VoiceAgent Initialization", () => {
      it("should initialize VoiceAgent with TTS and STT providers", async () => {
        const agent = new VoiceAgent({
          sttProvider: "agent-stt",
          ttsProvider: "agent-tts",
          systemPrompt: "You are a helpful voice assistant.",
        });

        await agent.initialize();

        const compositeVoice = agent.getCompositeVoice();
        expect(compositeVoice).toBeDefined();
      });

      it("should initialize VoiceAgent with realtime provider", async () => {
        const agent = new VoiceAgent({
          realtimeProvider: "agent-rt",
          mode: "realtime",
          systemPrompt: "You are a helpful voice assistant.",
        });

        await agent.initialize();

        const realtimeProvider = agent.getRealtimeProvider();
        expect(realtimeProvider).toBeDefined();
      });

      it("should configure voice settings", async () => {
        const agent = new VoiceAgent({
          ttsProvider: "agent-tts",
          sttProvider: "agent-stt",
          voiceSettings: {
            voiceId: "rachel",
            language: "en-US",
            speed: 1.2,
            pitch: 0.5,
          },
        });

        await agent.initialize();

        agent.updateVoiceSettings({ speed: 1.5 });
        // Settings updated internally
      });
    });

    describe("Batch Mode Processing", () => {
      it("should process voice through STT -> AI -> TTS pipeline", async () => {
        const mockNeuroLink = {
          generate: vi.fn().mockResolvedValue({
            content: "I received your message and here is my response.",
          }),
        };

        const agent = new VoiceAgent({
          neurolink: mockNeuroLink,
          sttProvider: "agent-stt",
          ttsProvider: "agent-tts",
          systemPrompt: "You are helpful.",
        });

        await agent.initialize();

        const audioInput = createSampleWavBuffer(2);
        const result = await agent.processVoice(audioInput);

        expect(result.userText).toBeDefined();
        expect(result.assistantText).toBeDefined();
        expect(result.audio).toBeDefined();
        expect(result.metadata.transcriptionTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata.generationTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata.synthesisTime).toBeGreaterThanOrEqual(0);
        expect(result.metadata.totalTime).toBeGreaterThanOrEqual(0);
      });

      it("should emit events during voice processing", async () => {
        const mockNeuroLink = {
          generate: vi.fn().mockResolvedValue({
            content: "Response text",
          }),
        };

        const agent = new VoiceAgent({
          neurolink: mockNeuroLink,
          sttProvider: "agent-stt",
          ttsProvider: "agent-tts",
        });

        await agent.initialize();

        const events: string[] = [];
        agent.on("transcription.started", () =>
          events.push("transcription.started"),
        );
        agent.on("transcription.completed", () =>
          events.push("transcription.completed"),
        );
        agent.on("generation.started", () => events.push("generation.started"));
        agent.on("generation.completed", () =>
          events.push("generation.completed"),
        );
        agent.on("synthesis.started", () => events.push("synthesis.started"));
        agent.on("synthesis.completed", () =>
          events.push("synthesis.completed"),
        );

        await agent.processVoice(createSampleWavBuffer());

        expect(events).toContain("transcription.started");
        expect(events).toContain("transcription.completed");
        expect(events).toContain("generation.started");
        expect(events).toContain("generation.completed");
        expect(events).toContain("synthesis.started");
        expect(events).toContain("synthesis.completed");
      });

      it("should track conversation history", async () => {
        const mockNeuroLink = {
          generate: vi.fn().mockResolvedValue({ content: "First response" }),
        };

        const agent = new VoiceAgent({
          neurolink: mockNeuroLink,
          sttProvider: "agent-stt",
          ttsProvider: "agent-tts",
        });

        await agent.initialize();

        await agent.processVoice(createSampleWavBuffer());
        mockNeuroLink.generate.mockResolvedValueOnce({
          content: "Second response",
        });
        await agent.processVoice(createSampleWavBuffer());

        const history = agent.getHistory();
        expect(history.length).toBe(4); // 2 user + 2 assistant turns
        expect(history.filter((t) => t.role === "user").length).toBe(2);
        expect(history.filter((t) => t.role === "assistant").length).toBe(2);
      });

      it("should clear conversation history", async () => {
        const mockNeuroLink = {
          generate: vi.fn().mockResolvedValue({ content: "Response" }),
        };

        const agent = new VoiceAgent({
          neurolink: mockNeuroLink,
          sttProvider: "agent-stt",
          ttsProvider: "agent-tts",
        });

        await agent.initialize();
        await agent.processVoice(createSampleWavBuffer());

        expect(agent.getHistory().length).toBe(2);

        agent.clearHistory();

        expect(agent.getHistory().length).toBe(0);
      });
    });

    describe("Realtime Mode", () => {
      it("should start realtime session", async () => {
        const agent = new VoiceAgent({
          realtimeProvider: "agent-rt",
          mode: "realtime",
        });

        await agent.initialize();

        const session = await agent.startRealtimeSession({
          voice: "alloy",
          temperature: 0.7,
        });

        expect(session).toBeDefined();
        expect(session.isOpen()).toBe(true);
        expect(agent.isRealtimeActive()).toBe(true);
      });

      it("should stop realtime session", async () => {
        const agent = new VoiceAgent({
          realtimeProvider: "agent-rt",
          mode: "realtime",
        });

        await agent.initialize();
        await agent.startRealtimeSession({});

        expect(agent.isRealtimeActive()).toBe(true);

        await agent.stopRealtimeSession();

        expect(agent.isRealtimeActive()).toBe(false);
      });

      it("should replace existing session when starting new one", async () => {
        const agent = new VoiceAgent({
          realtimeProvider: "agent-rt",
          mode: "realtime",
        });

        await agent.initialize();

        const session1 = await agent.startRealtimeSession({});
        const session1Id = session1.id;

        const session2 = await agent.startRealtimeSession({});

        expect(session2.id).not.toBe(session1Id);
        expect(agent.getRealtimeSession()?.id).toBe(session2.id);
      });
    });

    describe("VoiceAgent Cleanup", () => {
      it("should dispose resources properly", async () => {
        const agent = new VoiceAgent({
          realtimeProvider: "agent-rt",
          sttProvider: "agent-stt",
          ttsProvider: "agent-tts",
        });

        await agent.initialize();
        await agent.startRealtimeSession({});

        await agent.dispose();

        expect(agent.isRealtimeActive()).toBe(false);
        expect(agent.getHistory().length).toBe(0);
      });
    });
  });

  // ===========================================================================
  // COMPOSITE VOICE
  // ===========================================================================
  describe("CompositeVoice Integration", () => {
    beforeEach(() => {
      VoiceFactory.registerTTSProvider("comp-tts", () =>
        createMockTTSProvider("comp-tts"),
      );
      VoiceFactory.registerSTTProvider("comp-stt", () =>
        createMockSTTProvider("comp-stt"),
      );
    });

    describe("Bidirectional Voice Conversations", () => {
      it("should synthesize text to speech", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
          trackHistory: true,
        });

        const result = await voice.synthesize("Hello, how can I help?", {
          voice: "alloy",
          format: "mp3",
        });

        expect(result.buffer).toBeDefined();
        expect(result.format).toBe("mp3");

        const history = voice.getHistory();
        expect(history.length).toBe(1);
        expect(history[0].role).toBe("assistant");
        expect(history[0].text).toBe("Hello, how can I help?");
      });

      it("should transcribe audio to text", async () => {
        const voice = new CompositeVoice({
          sttProvider: "comp-stt",
          trackHistory: true,
        });

        const audioBuffer = createSampleWavBuffer(2);
        const result = await voice.transcribe(audioBuffer, {
          language: "en-US",
        });

        expect(result.text).toBeDefined();
        expect(result.language).toBe("en-US");

        const history = voice.getHistory();
        expect(history.length).toBe(1);
        expect(history[0].role).toBe("user");
      });

      it("should handle full conversation turn", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
          sttProvider: "comp-stt",
          trackHistory: true,
        });

        const processText = async (text: string) => {
          return `You said: ${text}. How can I help further?`;
        };

        const result = await voice.conversationTurn(
          createSampleWavBuffer(1),
          processText,
        );

        expect(result.userText).toBeDefined();
        expect(result.responseText).toContain("How can I help further?");
        expect(result.responseAudio).toBeDefined();
        expect(result.transcription).toBeDefined();
        expect(result.synthesis).toBeDefined();
      });
    });

    describe("Conversation History Management", () => {
      it("should track conversation history", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
          sttProvider: "comp-stt",
          trackHistory: true,
          maxHistoryTurns: 100,
        });

        await voice.transcribe(createSampleWavBuffer(), {});
        await voice.synthesize("Response 1", {});
        await voice.transcribe(createSampleWavBuffer(), {});
        await voice.synthesize("Response 2", {});

        const history = voice.getHistory();
        expect(history.length).toBe(4);
      });

      it("should limit history to maxHistoryTurns", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
          trackHistory: true,
          maxHistoryTurns: 3,
        });

        for (let i = 0; i < 5; i++) {
          await voice.synthesize(`Message ${i}`, {});
        }

        const history = voice.getHistory();
        expect(history.length).toBe(3);
      });

      it("should clear history", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
          trackHistory: true,
        });

        await voice.synthesize("Test", {});
        expect(voice.getHistory().length).toBe(1);

        voice.clearHistory();
        expect(voice.getHistory().length).toBe(0);
      });
    });

    describe("Provider Switching", () => {
      it("should switch TTS provider dynamically", async () => {
        VoiceFactory.registerTTSProvider("new-tts", () =>
          createMockTTSProvider("new-tts"),
        );

        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
        });

        await voice.synthesize("First", {});
        expect(voice.getTTSProvider()?.name).toBe("comp-tts");

        await voice.setTTSProvider("new-tts");

        expect(voice.getTTSProvider()?.name).toBe("new-tts");
      });

      it("should switch STT provider dynamically", async () => {
        VoiceFactory.registerSTTProvider("new-stt", () =>
          createMockSTTProvider("new-stt"),
        );

        const voice = new CompositeVoice({
          sttProvider: "comp-stt",
        });

        await voice.transcribe(createSampleWavBuffer(), {});
        expect(voice.getSTTProvider()?.name).toBe("comp-stt");

        await voice.setSTTProvider("new-stt");

        expect(voice.getSTTProvider()?.name).toBe("new-stt");
      });
    });

    describe("Capabilities and Configuration", () => {
      it("should get combined capabilities from both providers", async () => {
        VoiceFactory.registerTTSProvider("cap-tts", () =>
          createMockTTSProvider("cap-tts", {
            capabilities: ["tts", "streaming"],
          }),
        );
        VoiceFactory.registerSTTProvider("cap-stt", () =>
          createMockSTTProvider("cap-stt", {
            capabilities: ["stt", "streaming"],
          }),
        );

        const voice = new CompositeVoice({
          ttsProvider: "cap-tts",
          sttProvider: "cap-stt",
        });

        // Initialize providers
        await voice.synthesize("init", {});
        await voice.transcribe(createSampleWavBuffer(), {});

        const caps = voice.getCapabilities();
        expect(caps).toContain("tts");
        expect(caps).toContain("stt");
        expect(caps).toContain("streaming");
      });

      it("should check if fully configured", async () => {
        const fullVoice = new CompositeVoice({
          ttsProvider: "comp-tts",
          sttProvider: "comp-stt",
        });

        const partialVoice = new CompositeVoice({
          ttsProvider: "comp-tts",
        });

        const fullyConfigured = await fullVoice.isFullyConfigured();
        const partiallyConfigured = await partialVoice.isFullyConfigured();

        expect(fullyConfigured).toBe(true);
        expect(partiallyConfigured).toBe(false);
      });

      it("should validate both providers", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
          sttProvider: "comp-stt",
        });

        const validation = await voice.validate();
        expect(validation.valid).toBe(true);
        expect(validation.errors.length).toBe(0);
      });

      it("should get available voices", async () => {
        const voice = new CompositeVoice({
          ttsProvider: "comp-tts",
        });

        const voices = await voice.getAvailableVoices();
        const englishVoices = await voice.getAvailableVoices("en-US");

        expect(voices.length).toBeGreaterThan(0);
        expect(englishVoices.length).toBeGreaterThan(0);
      });

      it("should get supported languages for STT", async () => {
        const voice = new CompositeVoice({
          sttProvider: "comp-stt",
        });

        const languages = await voice.getSupportedLanguages();
        expect(languages).toContain("en-US");
      });
    });
  });

  // ===========================================================================
  // STREAMING AUDIO HANDLING
  // ===========================================================================
  describe("Streaming Audio Handling", () => {
    describe("AudioStreamAccumulator", () => {
      it("should accumulate audio chunks", () => {
        const accumulator = new AudioStreamAccumulator();

        accumulator.addChunk(Buffer.from("chunk1"));
        accumulator.addChunk(Buffer.from("chunk2"));
        accumulator.addChunk(Buffer.from("chunk3"));

        const state = accumulator.getState();
        expect(state.chunkCount).toBe(3);
        expect(state.totalBytes).toBe(18); // 6 bytes per chunk
      });

      it("should convert accumulated chunks to single buffer", () => {
        const accumulator = new AudioStreamAccumulator();

        accumulator.addChunk(Buffer.from("Hello"));
        accumulator.addChunk(Buffer.from(" "));
        accumulator.addChunk(Buffer.from("World"));
        accumulator.complete();

        const buffer = accumulator.getBuffer();
        expect(buffer.toString()).toBe("Hello World");
      });

      it("should convert to WAV format", () => {
        const accumulator = new AudioStreamAccumulator();
        const pcmData = createSamplePCMBuffer(0.1);

        accumulator.addChunk(pcmData);
        accumulator.complete();

        const wavBuffer = accumulator.getWavBuffer({ sampleRate: 16000 });
        expect(wavBuffer.subarray(0, 4).toString()).toBe("RIFF");
        expect(wavBuffer.subarray(8, 12).toString()).toBe("WAVE");
      });

      it("should track stream statistics", () => {
        const accumulator = new AudioStreamAccumulator();

        accumulator.addChunk(Buffer.alloc(1000));
        accumulator.addChunk(Buffer.alloc(1000));

        const stats = accumulator.getStats();
        expect(stats.chunks).toBe(2);
        expect(stats.bytes).toBe(2000);
        expect(stats.isComplete).toBe(false);

        accumulator.complete();
        expect(accumulator.getStats().isComplete).toBe(true);
      });

      it("should enforce maximum chunk count", () => {
        const accumulator = new AudioStreamAccumulator(3, 1000000);

        accumulator.addChunk(Buffer.from("1"));
        accumulator.addChunk(Buffer.from("2"));
        accumulator.addChunk(Buffer.from("3"));

        expect(() => accumulator.addChunk(Buffer.from("4"))).toThrow(
          /Maximum chunk count exceeded/,
        );
      });

      it("should enforce maximum byte limit", () => {
        const accumulator = new AudioStreamAccumulator(1000, 50);

        accumulator.addChunk(Buffer.alloc(30));

        expect(() => accumulator.addChunk(Buffer.alloc(30))).toThrow(
          /Maximum byte limit exceeded/,
        );
      });

      it("should reset accumulator state", () => {
        const accumulator = new AudioStreamAccumulator();

        accumulator.addChunk(Buffer.from("data"));
        accumulator.complete();

        accumulator.reset();

        expect(accumulator.isEmpty()).toBe(true);
        expect(accumulator.isComplete()).toBe(false);
      });
    });

    describe("TranscriptionStreamAccumulator", () => {
      it("should accumulate transcription segments", () => {
        const accumulator = new TranscriptionStreamAccumulator();

        accumulator.addSegment({
          text: "Hello",
          start: 0,
          end: 0.5,
          confidence: 0.9,
          isFinal: true,
        });
        accumulator.addSegment({
          text: "world",
          start: 0.5,
          end: 1.0,
          confidence: 0.95,
          isFinal: true,
        });

        expect(accumulator.getSegments().length).toBe(2);
        expect(accumulator.getText()).toBe("Hello world");
      });

      it("should handle partial segments", () => {
        const accumulator = new TranscriptionStreamAccumulator();

        accumulator.addSegment({
          text: "Hel",
          start: 0,
          end: 0.3,
          confidence: 0.8,
          isFinal: false,
        });
        accumulator.addSegment({
          text: "Hello",
          start: 0,
          end: 0.5,
          confidence: 0.9,
          isFinal: false,
        });

        expect(accumulator.getPartialSegment()?.text).toBe("Hello");
        expect(accumulator.getText()).toBe("Hello");
      });

      it("should calculate average confidence", () => {
        const accumulator = new TranscriptionStreamAccumulator();

        accumulator.addSegment({
          text: "A",
          start: 0,
          end: 0.5,
          confidence: 0.8,
          isFinal: true,
        });
        accumulator.addSegment({
          text: "B",
          start: 0.5,
          end: 1.0,
          confidence: 1.0,
          isFinal: true,
        });

        expect(accumulator.getAverageConfidence()).toBe(0.9);
      });

      it("should get transcription statistics", () => {
        const accumulator = new TranscriptionStreamAccumulator();

        accumulator.addSegment({
          text: "Hello world",
          start: 0,
          end: 1.5,
          confidence: 0.95,
          isFinal: true,
        });
        accumulator.complete();

        const stats = accumulator.getStats();
        expect(stats.segmentCount).toBe(1);
        expect(stats.wordCount).toBe(2);
        expect(stats.characterCount).toBe(11);
        expect(stats.duration).toBe(1.5);
        expect(stats.isComplete).toBe(true);
      });
    });

    describe("Stream Processing Utilities", () => {
      it("should convert array to async audio stream", async () => {
        const chunks = [
          Buffer.from("chunk1"),
          Buffer.from("chunk2"),
          Buffer.from("chunk3"),
        ];

        const collected: Buffer[] = [];
        for await (const chunk of arrayToAudioStream(chunks)) {
          collected.push(chunk);
        }

        expect(collected.length).toBe(3);
      });

      it("should split buffer for streaming", async () => {
        const buffer = Buffer.alloc(1000);

        const chunks: Buffer[] = [];
        for await (const chunk of splitBufferForStreaming(buffer, 300)) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBe(4); // 300 + 300 + 300 + 100
        expect(chunks[0].length).toBe(300);
        expect(chunks[3].length).toBe(100);
      });

      it("should timeout on slow streams", async () => {
        async function* slowStream(): AsyncIterable<number> {
          yield 1;
          await new Promise((resolve) => setTimeout(resolve, 200));
          yield 2;
        }

        const items: number[] = [];

        await expect(async () => {
          for await (const item of withTimeout(slowStream(), 50, "Timeout!")) {
            items.push(item);
          }
        }).rejects.toThrow("Timeout!");

        expect(items).toContain(1);
      });

      it("should batch stream items", async () => {
        async function* numbers(): AsyncIterable<number> {
          for (let i = 1; i <= 10; i++) {
            yield i;
          }
        }

        const batches: number[][] = [];
        for await (const batch of batchStream(numbers(), 3)) {
          batches.push(batch);
        }

        expect(batches.length).toBe(4); // [1,2,3], [4,5,6], [7,8,9], [10]
        expect(batches[0]).toEqual([1, 2, 3]);
        expect(batches[3]).toEqual([10]);
      });

      it("should rate limit stream items", async () => {
        async function* fastStream(): AsyncIterable<number> {
          yield 1;
          yield 2;
          yield 3;
        }

        const startTime = Date.now();
        const items: number[] = [];

        for await (const item of rateLimitStream(fastStream(), 10)) {
          items.push(item);
        }

        const elapsed = Date.now() - startTime;

        expect(items.length).toBe(3);
        expect(elapsed).toBeGreaterThanOrEqual(150); // At least 200ms for 3 items at 10/sec
      });
    });
  });

  // ===========================================================================
  // AUDIO FORMAT CONVERSION
  // ===========================================================================
  describe("Audio Format Conversion", () => {
    describe("Format Detection", () => {
      it("should detect WAV format from magic bytes", () => {
        const wavBuffer = createSampleWavBuffer(0.1);
        const format = detectAudioFormat(wavBuffer);
        expect(format).toBe("wav");
      });

      it("should detect MP3 format from ID3 header", () => {
        // ID3 magic bytes
        const mp3Buffer = Buffer.from([
          0x49, 0x44, 0x33, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00,
        ]);
        const format = detectAudioFormat(mp3Buffer);
        expect(format).toBe("mp3");
      });

      it("should detect FLAC format", () => {
        const flacBuffer = Buffer.from([
          0x66, 0x4c, 0x61, 0x43, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00,
        ]);
        const format = detectAudioFormat(flacBuffer);
        expect(format).toBe("flac");
      });

      it("should detect OGG format", () => {
        const oggBuffer = Buffer.from([
          0x4f, 0x67, 0x67, 0x53, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00,
        ]);
        const format = detectAudioFormat(oggBuffer);
        expect(format).toBe("ogg");
      });

      it("should return undefined for unknown format", () => {
        const unknownBuffer = Buffer.from([
          0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
          0x00,
        ]);
        const format = detectAudioFormat(unknownBuffer);
        expect(format).toBeUndefined();
      });
    });

    describe("Buffer Validation", () => {
      it("should validate non-empty buffer", () => {
        const buffer = Buffer.alloc(1000);
        const result = validateAudioBuffer(buffer);
        expect(result.valid).toBe(true);
      });

      it("should reject null buffer", () => {
        const result = validateAudioBuffer(null);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("null or undefined");
      });

      it("should reject empty buffer", () => {
        const result = validateAudioBuffer(Buffer.alloc(0));
        expect(result.valid).toBe(false);
        expect(result.error).toContain("empty");
      });

      it("should reject buffer below minimum size", () => {
        const result = validateAudioBuffer(Buffer.alloc(50), 100);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("too small");
      });
    });

    describe("MIME Types and Extensions", () => {
      it("should get correct MIME types for audio formats", () => {
        expect(getAudioMimeType("wav")).toBe("audio/wav");
        expect(getAudioMimeType("mp3")).toBe("audio/mpeg");
        expect(getAudioMimeType("ogg")).toBe("audio/ogg");
        expect(getAudioMimeType("flac")).toBe("audio/flac");
        expect(getAudioMimeType("opus")).toBe("audio/opus");
        expect(getAudioMimeType("m4a")).toBe("audio/mp4");
      });

      it("should get correct file extensions", () => {
        expect(getAudioExtension("wav")).toBe("wav");
        expect(getAudioExtension("mp3")).toBe("mp3");
        expect(getAudioExtension("mpeg")).toBe("mp3");
        expect(getAudioExtension("mpga")).toBe("mp3");
      });
    });

    describe("WAV Processing", () => {
      it("should parse WAV metadata", () => {
        const wavBuffer = createSampleWavBuffer(1);
        const metadata = parseWavMetadata(wavBuffer);

        expect(metadata).not.toBeNull();
        expect(metadata?.format).toBe("wav");
        expect(metadata?.sampleRate).toBe(16000);
        expect(metadata?.channels).toBe(1);
        expect(metadata?.bitDepth).toBe(16);
      });

      it("should create valid WAV header", () => {
        const header = createWavHeader(1000, {
          sampleRate: 44100,
          channels: 2,
          bitDepth: 16,
        });

        expect(header.length).toBe(44);
        expect(header.subarray(0, 4).toString()).toBe("RIFF");
        expect(header.subarray(8, 12).toString()).toBe("WAVE");
      });

      it("should convert PCM to WAV", () => {
        const pcmBuffer = createSamplePCMBuffer(0.5);
        const wavBuffer = pcmToWav(pcmBuffer, { sampleRate: 16000 });

        expect(wavBuffer.length).toBe(pcmBuffer.length + 44);
        expect(wavBuffer.subarray(0, 4).toString()).toBe("RIFF");
      });
    });

    describe("Base64 Conversion", () => {
      it("should convert buffer to base64 and back", () => {
        const original = Buffer.from("Hello, Audio World!");
        const base64 = bufferToBase64(original);
        const recovered = base64ToBuffer(base64);

        expect(recovered.toString()).toBe(original.toString());
      });

      it("should handle ArrayBuffer in base64 conversion", () => {
        const arrayBuffer = new ArrayBuffer(10);
        const view = new Uint8Array(arrayBuffer);
        for (let i = 0; i < 10; i++) {view[i] = i;}

        const base64 = bufferToBase64(arrayBuffer);
        expect(typeof base64).toBe("string");
      });
    });

    describe("Audio Manipulation", () => {
      it("should split audio into chunks", () => {
        const buffer = Buffer.alloc(1000);
        const chunks = [...splitAudioIntoChunks(buffer, 300)];

        expect(chunks.length).toBe(4);
        expect(chunks[0].length).toBe(300);
        expect(chunks[3].length).toBe(100);
      });

      it("should estimate duration from buffer size", () => {
        const duration = estimateDuration(32000, {
          sampleRate: 16000,
          channels: 1,
          bitDepth: 16,
        });

        expect(duration).toBe(1); // 32000 bytes / (16000 * 1 * 2) = 1 second
      });

      it("should normalize audio volume", () => {
        const pcmBuffer = createSamplePCMBuffer(0.1);
        const normalized = normalizeVolume(pcmBuffer, 0.9);

        expect(normalized.length).toBe(pcmBuffer.length);
      });

      it("should resample audio linearly", () => {
        const buffer = createSamplePCMBuffer(0.5);
        const resampled = resampleLinear(buffer, 16000, 8000);

        // Downsampling by half should roughly halve the size
        expect(resampled.length).toBeLessThan(buffer.length);
        expect(resampled.length).toBeGreaterThan(buffer.length * 0.4);
      });

      it("should concatenate multiple audio buffers", () => {
        const buffers = [
          Buffer.from("part1"),
          Buffer.from("part2"),
          Buffer.from("part3"),
        ];

        const combined = concatenateAudio(buffers);
        expect(combined.toString()).toBe("part1part2part3");
      });

      it("should detect silence in audio", () => {
        const silentBuffer = Buffer.alloc(1000); // All zeros = silence
        const loudBuffer = createSamplePCMBuffer(0.1);

        expect(isSilence(silentBuffer)).toBe(true);
        expect(isSilence(loudBuffer)).toBe(false);
      });
    });
  });

  // ===========================================================================
  // ERROR HANDLING AND FALLBACK
  // ===========================================================================
  describe("Error Handling and Fallback", () => {
    describe("Voice Error Types", () => {
      it("should create VoiceError with proper structure", () => {
        const error = new VoiceError({
          code: "VOICE_ERROR",
          message: "Test error",
          provider: "test-provider",
        });

        expect(error.code).toBe("VOICE_ERROR");
        expect(error.message).toBe("Test error");
        expect(error.provider).toBe("test-provider");
        expect(error.name).toBe("VoiceError");
      });

      it("should create STT-specific errors", () => {
        const emptyAudio = STTError.emptyAudio("test-stt");
        expect(emptyAudio.code).toBe("STT_EMPTY_AUDIO");

        const invalidFormat = STTError.invalidFormat("xyz", "test-stt");
        expect(invalidFormat.message).toContain("xyz");

        const tooLong = STTError.audioTooLong(120, 60, "test-stt");
        expect(tooLong.message).toContain("120");
        expect(tooLong.message).toContain("60");
      });

      it("should create Realtime-specific errors", () => {
        const connFailed = RealtimeError.connectionFailed(
          "refused",
          undefined,
          "rt",
        );
        expect(connFailed.code).toBe("REALTIME_CONNECTION_FAILED");

        const timeout = RealtimeError.timeout("connect", 5000, "rt");
        expect(timeout.code).toBe("REALTIME_TIMEOUT");
        expect(timeout.message).toContain("5000");
      });

      it("should create errors via VoiceErrorFactory", () => {
        const notConfigured = VoiceErrorFactory.providerNotConfigured(
          "elevenlabs",
          "tts",
        );
        expect(notConfigured.code).toBe("VOICE_PROVIDER_NOT_CONFIGURED");

        const notSupported = VoiceErrorFactory.providerNotSupported("unknown", [
          "a",
          "b",
        ]);
        expect(notSupported.message).toContain("a");
        expect(notSupported.message).toContain("b");

        const featureNotSupported = VoiceErrorFactory.featureNotSupported(
          "streaming",
          "basic-provider",
        );
        expect(featureNotSupported.code).toBe("VOICE_FEATURE_NOT_SUPPORTED");

        const networkError = VoiceErrorFactory.networkError(
          "synthesis",
          new Error("connection reset"),
        );
        expect(networkError.code).toBe("VOICE_NETWORK_ERROR");
      });
    });

    describe("Provider Failure Handling", () => {
      it("should handle TTS synthesis failure", async () => {
        VoiceFactory.registerTTSProvider("fail-tts", () =>
          createMockTTSProvider("fail-tts", {
            shouldFail: true,
            failMessage: "API rate limit exceeded",
          }),
        );

        const provider = await VoiceFactory.createTTSProvider("fail-tts");

        await expect(provider.synthesize("test", {})).rejects.toThrow(
          "API rate limit exceeded",
        );
      });

      it("should handle STT transcription failure", async () => {
        VoiceFactory.registerSTTProvider("fail-stt", () =>
          createMockSTTProvider("fail-stt", {
            shouldFail: true,
            failMessage: "Invalid audio format",
          }),
        );

        const provider = await VoiceFactory.createSTTProvider("fail-stt");

        await expect(
          provider.transcribe(createSampleWavBuffer(), {}),
        ).rejects.toThrow("Invalid audio format");
      });

      it("should handle realtime connection failure", async () => {
        VoiceFactory.registerRealtimeProvider("fail-rt", () =>
          createMockRealtimeProvider("fail-rt", {
            shouldFail: true,
            failMessage: "Service unavailable",
          }),
        );

        const provider = await VoiceFactory.createRealtimeProvider("fail-rt");

        await expect(provider.connect({})).rejects.toThrow(
          "Service unavailable",
        );
      });
    });

    describe("Graceful Degradation", () => {
      it("should work with only TTS provider configured", async () => {
        VoiceFactory.registerTTSProvider("only-tts", () =>
          createMockTTSProvider("only-tts"),
        );

        const voice = new CompositeVoice({
          ttsProvider: "only-tts",
        });

        const result = await voice.synthesize("Hello", {});
        expect(result.buffer).toBeDefined();

        // STT should throw when not configured
        await expect(
          voice.transcribe(createSampleWavBuffer(), {}),
        ).rejects.toThrow();
      });

      it("should work with only STT provider configured", async () => {
        VoiceFactory.registerSTTProvider("only-stt", () =>
          createMockSTTProvider("only-stt"),
        );

        const voice = new CompositeVoice({
          sttProvider: "only-stt",
        });

        const result = await voice.transcribe(createSampleWavBuffer(), {});
        expect(result.text).toBeDefined();

        // TTS should throw when not configured
        await expect(voice.synthesize("Hello", {})).rejects.toThrow();
      });

      it("should handle VoiceAgent without NeuroLink instance", async () => {
        VoiceFactory.registerTTSProvider("simple-tts", () =>
          createMockTTSProvider("simple-tts"),
        );
        VoiceFactory.registerSTTProvider("simple-stt", () =>
          createMockSTTProvider("simple-stt"),
        );

        const agent = new VoiceAgent({
          // No neurolink instance provided
          sttProvider: "simple-stt",
          ttsProvider: "simple-tts",
        });

        await agent.initialize();

        // Should still process but with placeholder response
        const result = await agent.processVoice(createSampleWavBuffer());
        expect(result.assistantText).toContain(
          "configure a NeuroLink instance",
        );
      });
    });
  });

  // ===========================================================================
  // VOICE REGISTRY
  // ===========================================================================
  describe("VoiceRegistry Integration", () => {
    it("should prevent duplicate registration", async () => {
      await VoiceRegistry.registerAllProviders();
      const firstState = VoiceRegistry.isRegistered();

      await VoiceRegistry.registerAllProviders(); // Should be no-op
      const secondState = VoiceRegistry.isRegistered();

      expect(firstState).toBe(true);
      expect(secondState).toBe(true);
    });

    it("should reset registry state", () => {
      VoiceRegistry.reset();

      expect(VoiceRegistry.isRegistered()).toBe(false);
      expect(VoiceFactory.isInitialized()).toBe(false);
    });
  });
});
