/**
 * Voice Provider Factory
 *
 * Factory for creating voice provider instances (TTS, STT, Realtime).
 * Extends BaseFactory pattern with voice-specific functionality.
 *
 * @module voice/VoiceFactory
 */

import {
  BaseFactory,
  type FactoryFunction,
} from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import type {
  VoiceProviderConfig,
  VoiceProviderMetadata,
  VoiceProviderType,
} from "./types/voiceTypes.js";
import type { TTSHandler } from "../utils/ttsProcessor.js";
import type { STTHandler } from "./STTProvider.js";
import type { RealtimeHandler } from "./RealtimeVoiceAPI.js";
import { VoiceError, VOICE_ERROR_CODES } from "./errors.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";

/**
 * Union type for all voice handlers
 */
export type VoiceHandler = TTSHandler | STTHandler | RealtimeHandler;

/**
 * Factory registration for voice providers
 */
type VoiceFactoryRegistration = {
  factory: FactoryFunction<VoiceHandler, VoiceProviderConfig>;
  type: VoiceProviderType;
  metadata: VoiceProviderMetadata;
  aliases: string[];
};

/**
 * Voice Factory class for creating voice provider instances
 *
 * @example
 * ```typescript
 * const factory = VoiceFactory.getInstance();
 *
 * // Create a TTS provider
 * const ttsHandler = await factory.createTTS('google');
 *
 * // Create an STT provider with config
 * const sttHandler = await factory.createSTT('deepgram', {
 *   apiKey: 'my-api-key',
 *   timeout: 30000
 * });
 *
 * // Create a Realtime provider
 * const realtimeHandler = await factory.createRealtime('openai');
 * ```
 */
export class VoiceFactory extends BaseFactory<VoiceHandler, VoiceProviderConfig> {
  private static instance: VoiceFactory | null = null;
  private readonly typeMap = new Map<string, VoiceProviderType>();
  private readonly metadataMap = new Map<string, VoiceProviderMetadata>();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance of VoiceFactory
   */
  static getInstance(): VoiceFactory {
    if (!VoiceFactory.instance) {
      VoiceFactory.instance = new VoiceFactory();
    }
    return VoiceFactory.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (VoiceFactory.instance) {
      VoiceFactory.instance.clear();
      VoiceFactory.instance = null;
    }
  }

  /**
   * Register all default providers
   */
  protected async registerAll(): Promise<void> {
    // Register TTS providers
    await this.registerDefaultTTSProviders();

    // Register STT providers
    await this.registerDefaultSTTProviders();

    // Register Realtime providers
    await this.registerDefaultRealtimeProviders();

    logger.info("[VoiceFactory] Registered all default voice providers");
  }

  /**
   * Register default TTS providers
   */
  private async registerDefaultTTSProviders(): Promise<void> {
    // Google TTS
    this.registerTTSProvider(
      "google-tts",
      async (config) => {
        const { GoogleTTSHandler } = await import("./providers/GoogleTTS.js");
        return new GoogleTTSHandler(config?.apiKey);
      },
      {
        type: "tts",
        displayName: "Google Cloud TTS",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg"],
        maxLength: 5000,
        supportsStreaming: true,
        features: ["neural", "wavenet", "standard"],
      },
      ["google", "google-cloud-tts", "gcp-tts"],
    );

    // OpenAI TTS
    this.registerTTSProvider(
      "openai-tts",
      async (config) => {
        const { OpenAITTSHandler } = await import("./providers/OpenAITTS.js");
        return new OpenAITTSHandler(config?.apiKey);
      },
      {
        type: "tts",
        displayName: "OpenAI TTS",
        capabilities: ["tts"],
        supportedFormats: ["mp3", "opus", "wav"],
        maxLength: 4096,
        supportsStreaming: true,
        features: ["alloy", "echo", "fable", "onyx", "nova", "shimmer"],
      },
      ["openai", "openai-speech"],
    );

    // ElevenLabs TTS
    this.registerTTSProvider(
      "elevenlabs-tts",
      async (config) => {
        const { ElevenLabsTTSHandler } = await import("./providers/ElevenLabsTTS.js");
        return new ElevenLabsTTSHandler(config?.apiKey);
      },
      {
        type: "tts",
        displayName: "ElevenLabs TTS",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg"],
        maxLength: 5000,
        supportsStreaming: true,
        features: ["multilingual", "voice-cloning", "turbo"],
      },
      ["elevenlabs", "eleven"],
    );

    // Azure TTS
    this.registerTTSProvider(
      "azure-tts",
      async (config) => {
        const { AzureTTSHandler } = await import("./providers/AzureTTS.js");
        return new AzureTTSHandler(config?.apiKey, config?.options?.region as string);
      },
      {
        type: "tts",
        displayName: "Azure Cognitive Services TTS",
        capabilities: ["tts", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg"],
        maxLength: 10000,
        supportsStreaming: true,
        features: ["neural", "custom-voice", "ssml"],
      },
      ["azure", "azure-speech", "microsoft-tts"],
    );
  }

  /**
   * Register default STT providers
   */
  private async registerDefaultSTTProviders(): Promise<void> {
    // OpenAI Whisper
    this.registerSTTProvider(
      "whisper",
      async (config) => {
        const { WhisperSTTHandler } = await import("./providers/OpenAISTT.js");
        return new WhisperSTTHandler(config?.apiKey);
      },
      {
        type: "stt",
        displayName: "OpenAI Whisper",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav", "ogg", "opus"],
        maxLength: 25 * 60,
        supportsStreaming: false,
        features: ["multilingual", "translation", "timestamps"],
      },
      ["openai-stt", "openai-whisper"],
    );

    // Deepgram STT
    this.registerSTTProvider(
      "deepgram",
      async (config) => {
        const { DeepgramSTTHandler } = await import("./providers/DeepgramSTT.js");
        return new DeepgramSTTHandler(config?.apiKey);
      },
      {
        type: "stt",
        displayName: "Deepgram STT",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg", "opus"],
        maxLength: 7200,
        supportsStreaming: true,
        features: ["diarization", "punctuation", "keywords", "smart-format"],
      },
      ["deepgram-stt"],
    );

    // Google Speech-to-Text
    this.registerSTTProvider(
      "google-stt",
      async (config) => {
        const { GoogleSTTHandler } = await import("./providers/GoogleSTT.js");
        return new GoogleSTTHandler(config?.apiKey);
      },
      {
        type: "stt",
        displayName: "Google Cloud Speech-to-Text",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg", "opus"],
        maxLength: 480 * 60,
        supportsStreaming: true,
        features: ["diarization", "punctuation", "word-timestamps"],
      },
      ["google-speech", "gcp-stt"],
    );

    // Azure Speech-to-Text
    this.registerSTTProvider(
      "azure-stt",
      async (config) => {
        const { AzureSTTHandler } = await import("./providers/AzureSTT.js");
        return new AzureSTTHandler(config?.apiKey, config?.options?.region as string);
      },
      {
        type: "stt",
        displayName: "Azure Cognitive Services STT",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg"],
        maxLength: 240 * 60,
        supportsStreaming: true,
        features: ["diarization", "punctuation", "custom-models"],
      },
      ["azure-speech-stt", "microsoft-stt"],
    );
  }

  /**
   * Register default Realtime providers
   */
  private async registerDefaultRealtimeProviders(): Promise<void> {
    // OpenAI Realtime
    this.registerRealtimeProvider(
      "openai-realtime",
      async (config) => {
        const { OpenAIRealtimeHandler } = await import("./providers/OpenAIRealtime.js");
        return new OpenAIRealtimeHandler(config?.apiKey);
      },
      {
        type: "realtime",
        displayName: "OpenAI Realtime API",
        capabilities: ["realtime", "streaming"],
        supportedFormats: ["opus"],
        supportsStreaming: true,
        features: ["voice-activity-detection", "function-calling"],
      },
      ["openai-voice", "gpt-realtime"],
    );

    // Gemini Live
    this.registerRealtimeProvider(
      "gemini-live",
      async (config) => {
        const { GeminiLiveHandler } = await import("./providers/GeminiLive.js");
        return new GeminiLiveHandler(config?.apiKey);
      },
      {
        type: "realtime",
        displayName: "Google Gemini Live",
        capabilities: ["realtime", "streaming"],
        supportedFormats: ["opus", "wav"],
        supportsStreaming: true,
        features: ["multimodal", "function-calling"],
      },
      ["google-realtime", "gemini-voice"],
    );
  }

  /**
   * Register a TTS provider
   */
  registerTTSProvider(
    name: string,
    factory: FactoryFunction<TTSHandler, VoiceProviderConfig>,
    metadata: VoiceProviderMetadata,
    aliases: string[] = [],
  ): void {
    this.registerVoiceProvider(name, "tts", factory as FactoryFunction<VoiceHandler, VoiceProviderConfig>, metadata, aliases);
  }

  /**
   * Register an STT provider
   */
  registerSTTProvider(
    name: string,
    factory: FactoryFunction<STTHandler, VoiceProviderConfig>,
    metadata: VoiceProviderMetadata,
    aliases: string[] = [],
  ): void {
    this.registerVoiceProvider(name, "stt", factory as FactoryFunction<VoiceHandler, VoiceProviderConfig>, metadata, aliases);
  }

  /**
   * Register a Realtime provider
   */
  registerRealtimeProvider(
    name: string,
    factory: FactoryFunction<RealtimeHandler, VoiceProviderConfig>,
    metadata: VoiceProviderMetadata,
    aliases: string[] = [],
  ): void {
    this.registerVoiceProvider(name, "realtime", factory as FactoryFunction<VoiceHandler, VoiceProviderConfig>, metadata, aliases);
  }

  /**
   * Internal method to register a voice provider
   */
  private registerVoiceProvider(
    name: string,
    type: VoiceProviderType,
    factory: FactoryFunction<VoiceHandler, VoiceProviderConfig>,
    metadata: VoiceProviderMetadata,
    aliases: string[],
  ): void {
    const normalizedName = name.toLowerCase();

    // Register with base factory
    this.register(normalizedName, factory, aliases, { type, metadata });

    // Store type and metadata
    this.typeMap.set(normalizedName, type);
    this.metadataMap.set(normalizedName, metadata);

    // Store type for aliases too
    for (const alias of aliases) {
      this.typeMap.set(alias.toLowerCase(), type);
    }

    logger.debug(
      `[VoiceFactory] Registered ${type} provider: ${normalizedName}`,
    );
  }

  /**
   * Create a TTS provider
   */
  async createTTS(
    nameOrAlias: string,
    config?: VoiceProviderConfig,
  ): Promise<TTSHandler> {
    const provider = await this.createByType(nameOrAlias, "tts", config);
    return provider as TTSHandler;
  }

  /**
   * Create an STT provider
   */
  async createSTT(
    nameOrAlias: string,
    config?: VoiceProviderConfig,
  ): Promise<STTHandler> {
    const provider = await this.createByType(nameOrAlias, "stt", config);
    return provider as STTHandler;
  }

  /**
   * Create a Realtime provider
   */
  async createRealtime(
    nameOrAlias: string,
    config?: VoiceProviderConfig,
  ): Promise<RealtimeHandler> {
    const provider = await this.createByType(nameOrAlias, "realtime", config);
    return provider as RealtimeHandler;
  }

  /**
   * Create a provider with type validation
   */
  private async createByType(
    nameOrAlias: string,
    expectedType: VoiceProviderType,
    config?: VoiceProviderConfig,
  ): Promise<VoiceHandler> {
    await this.ensureInitialized();

    const resolvedName = this.resolveName(nameOrAlias);
    const actualType = this.typeMap.get(resolvedName);

    if (!actualType) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.PROVIDER_NOT_FOUND,
        message: `Voice provider "${nameOrAlias}" not found`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: {
          requestedProvider: nameOrAlias,
          availableProviders: this.getAvailable(),
        },
      });
    }

    if (actualType !== expectedType) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.INVALID_CONFIGURATION,
        message: `Provider "${nameOrAlias}" is a ${actualType} provider, not a ${expectedType} provider`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retriable: false,
        context: { actualType, expectedType },
      });
    }

    return this.create(nameOrAlias, config);
  }

  /**
   * Get provider type
   */
  getType(nameOrAlias: string): VoiceProviderType | undefined {
    const resolvedName = this.resolveName(nameOrAlias);
    return this.typeMap.get(resolvedName);
  }

  /**
   * Get provider metadata
   */
  getMetadata(nameOrAlias: string): VoiceProviderMetadata | undefined {
    const resolvedName = this.resolveName(nameOrAlias);
    return this.metadataMap.get(resolvedName);
  }

  /**
   * Get all providers of a specific type
   */
  getProvidersByType(type: VoiceProviderType): string[] {
    const providers: string[] = [];
    for (const [name, providerType] of this.typeMap.entries()) {
      if (providerType === type && this.items.has(name)) {
        providers.push(name);
      }
    }
    return providers;
  }

  /**
   * Get all TTS providers
   */
  getTTSProviders(): string[] {
    return this.getProvidersByType("tts");
  }

  /**
   * Get all STT providers
   */
  getSTTProviders(): string[] {
    return this.getProvidersByType("stt");
  }

  /**
   * Get all Realtime providers
   */
  getRealtimeProviders(): string[] {
    return this.getProvidersByType("realtime");
  }

  /**
   * Clear all registrations
   */
  override clear(): void {
    super.clear();
    this.typeMap.clear();
    this.metadataMap.clear();
  }
}

/**
 * Default singleton instance
 */
export const voiceFactory = VoiceFactory.getInstance();
