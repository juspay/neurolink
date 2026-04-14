/**
 * Voice Provider Registry
 *
 * Centralized registry for all voice providers (TTS, STT, Realtime).
 * Extends BaseRegistry pattern with voice-specific functionality.
 *
 * @module voice/VoiceRegistry
 */

import {
  BaseRegistry,
  type RegistryEntry,
} from "../core/infrastructure/index.js";
import { logger } from "../utils/logger.js";
import type { TTSHandler } from "../utils/ttsProcessor.js";
import type { RealtimeHandler } from "./RealtimeVoiceAPI.js";
import type { STTHandler } from "./STTProvider.js";
import type {
  VoiceCapability,
  VoiceProviderMetadata,
  VoiceProviderType,
} from "./types/voiceTypes.js";

/**
 * Union type for all voice handlers
 */
export type VoiceHandler = TTSHandler | STTHandler | RealtimeHandler;

/**
 * Voice provider entry with metadata
 */
export type VoiceProviderEntry = {
  /** Provider ID */
  id: string;
  /** Provider type (tts, stt, realtime) */
  type: VoiceProviderType;
  /** Factory function to create handler */
  factory: () => Promise<VoiceHandler>;
  /** Provider metadata */
  metadata: VoiceProviderMetadata;
  /** Cached handler instance */
  instance?: VoiceHandler;
  /** Aliases for this provider */
  aliases: string[];
};

/**
 * Voice Registry class for managing voice provider registrations
 *
 * @example
 * ```typescript
 * const registry = VoiceRegistry.getInstance();
 *
 * // Register a TTS provider
 * registry.registerTTS('google', async () => new GoogleTTSHandler(), {
 *   displayName: 'Google Cloud TTS',
 *   capabilities: ['tts', 'streaming'],
 *   supportedFormats: ['mp3', 'wav', 'ogg'],
 *   supportsStreaming: true,
 * });
 *
 * // Get a provider
 * const handler = await registry.get('google');
 * ```
 */
export class VoiceRegistry extends BaseRegistry<
  VoiceHandler,
  VoiceProviderMetadata
> {
  private static instance: VoiceRegistry | null = null;
  private readonly aliasMap = new Map<string, string>();
  private readonly typeMap = new Map<VoiceProviderType, Set<string>>();

  private constructor() {
    super();
    this.typeMap.set("tts", new Set());
    this.typeMap.set("stt", new Set());
    this.typeMap.set("realtime", new Set());
    // Eagerly start initialization
    this.ensureInitialized().catch((err) => {
      logger.error(`[VoiceRegistry] Failed to initialize: ${err}`);
    });
  }

  /**
   * Get singleton instance of VoiceRegistry
   */
  static getInstance(): VoiceRegistry {
    if (!VoiceRegistry.instance) {
      VoiceRegistry.instance = new VoiceRegistry();
    }
    return VoiceRegistry.instance;
  }

  /**
   * Reset the singleton instance (for testing)
   */
  static resetInstance(): void {
    if (VoiceRegistry.instance) {
      VoiceRegistry.instance.clear();
      VoiceRegistry.instance = null;
    }
  }

  /**
   * Register all default providers
   * Called during initialization
   */
  protected async registerAll(): Promise<void> {
    // Register TTS providers (synchronous registration)
    this.registerDefaultTTSProviders();

    // Register STT providers (synchronous registration)
    this.registerDefaultSTTProviders();

    // Register Realtime providers (synchronous registration)
    this.registerDefaultRealtimeProviders();

    logger.info("[VoiceRegistry] Registered all default voice providers");
  }

  /**
   * Register default TTS providers
   */
  private registerDefaultTTSProviders(): void {
    // Google TTS
    this.registerTTS(
      "google-tts",
      async () => {
        const { GoogleTTS } = await import("./providers/GoogleTTS.js");
        return new GoogleTTS();
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
    this.registerTTS(
      "openai-tts",
      async () => {
        const { OpenAITTS } = await import("./providers/OpenAITTS.js");
        return new OpenAITTS();
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
    this.registerTTS(
      "elevenlabs-tts",
      async () => {
        const { ElevenLabsTTS } = await import("./providers/ElevenLabsTTS.js");
        return new ElevenLabsTTS();
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
    this.registerTTS(
      "azure-tts",
      async () => {
        const { AzureTTS } = await import("./providers/AzureTTS.js");
        return new AzureTTS();
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
  private registerDefaultSTTProviders(): void {
    // OpenAI Whisper
    this.registerSTT(
      "whisper",
      async () => {
        const { WhisperSTTHandler } = await import("./providers/OpenAISTT.js");
        return new WhisperSTTHandler();
      },
      {
        type: "stt",
        displayName: "OpenAI Whisper",
        capabilities: ["stt"],
        supportedFormats: ["mp3", "wav", "ogg", "opus"],
        maxLength: 25 * 60, // 25 minutes max
        supportsStreaming: false,
        features: ["multilingual", "translation", "timestamps"],
      },
      ["openai-stt", "openai-whisper"],
    );

    // Deepgram STT
    this.registerSTT(
      "deepgram",
      async () => {
        const { DeepgramSTT } = await import("./providers/DeepgramSTT.js");
        return new DeepgramSTT();
      },
      {
        type: "stt",
        displayName: "Deepgram STT",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg", "opus"],
        maxLength: 7200, // 2 hours
        supportsStreaming: true,
        features: [
          "diarization",
          "punctuation",
          "keywords",
          "smart-format",
          "utterances",
        ],
      },
      ["deepgram-stt"],
    );

    // Google Speech-to-Text
    this.registerSTT(
      "google-stt",
      async () => {
        const { GoogleSTT } = await import("./providers/GoogleSTT.js");
        return new GoogleSTT();
      },
      {
        type: "stt",
        displayName: "Google Cloud Speech-to-Text",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg", "opus"],
        maxLength: 480 * 60, // 8 hours with async
        supportsStreaming: true,
        features: ["diarization", "punctuation", "word-timestamps", "enhanced"],
      },
      ["google-speech", "gcp-stt"],
    );

    // Azure Speech-to-Text
    this.registerSTT(
      "azure-stt",
      async () => {
        const { AzureSTT } = await import("./providers/AzureSTT.js");
        return new AzureSTT();
      },
      {
        type: "stt",
        displayName: "Azure Cognitive Services STT",
        capabilities: ["stt", "streaming"],
        supportedFormats: ["mp3", "wav", "ogg"],
        maxLength: 240 * 60, // 4 hours
        supportsStreaming: true,
        features: ["diarization", "punctuation", "custom-models"],
      },
      ["azure-speech-stt", "microsoft-stt"],
    );
  }

  /**
   * Register default Realtime providers
   */
  private registerDefaultRealtimeProviders(): void {
    // OpenAI Realtime
    this.registerRealtime(
      "openai-realtime",
      async () => {
        const { OpenAIRealtime } = await import(
          "./providers/OpenAIRealtime.js"
        );
        return new OpenAIRealtime();
      },
      {
        type: "realtime",
        displayName: "OpenAI Realtime API",
        capabilities: ["realtime", "streaming"],
        supportedFormats: ["opus"],
        supportsStreaming: true,
        features: [
          "voice-activity-detection",
          "function-calling",
          "interruption",
        ],
      },
      ["openai-voice", "gpt-realtime"],
    );

    // Gemini Live
    this.registerRealtime(
      "gemini-live",
      async () => {
        const { GeminiLive } = await import("./providers/GeminiLive.js");
        return new GeminiLive();
      },
      {
        type: "realtime",
        displayName: "Google Gemini Live",
        capabilities: ["realtime", "streaming"],
        supportedFormats: ["opus", "wav"],
        supportsStreaming: true,
        features: ["multimodal", "function-calling", "context-caching"],
      },
      ["google-realtime", "gemini-voice"],
    );
  }

  /**
   * Register a TTS provider
   */
  registerTTS(
    id: string,
    factory: () => Promise<TTSHandler>,
    metadata: VoiceProviderMetadata,
    aliases: string[] = [],
  ): void {
    this.registerProvider(
      id,
      "tts",
      factory as () => Promise<VoiceHandler>,
      metadata,
      aliases,
    );
  }

  /**
   * Register an STT provider
   */
  registerSTT(
    id: string,
    factory: () => Promise<STTHandler>,
    metadata: VoiceProviderMetadata,
    aliases: string[] = [],
  ): void {
    this.registerProvider(
      id,
      "stt",
      factory as () => Promise<VoiceHandler>,
      metadata,
      aliases,
    );
  }

  /**
   * Register a Realtime provider
   */
  registerRealtime(
    id: string,
    factory: () => Promise<RealtimeHandler>,
    metadata: VoiceProviderMetadata,
    aliases: string[] = [],
  ): void {
    this.registerProvider(
      id,
      "realtime",
      factory as () => Promise<VoiceHandler>,
      metadata,
      aliases,
    );
  }

  /**
   * Internal method to register a provider
   */
  private registerProvider(
    id: string,
    type: VoiceProviderType,
    factory: () => Promise<VoiceHandler>,
    metadata: VoiceProviderMetadata,
    aliases: string[],
  ): void {
    const normalizedId = id.toLowerCase();

    // Register in base registry
    this.register(normalizedId, factory, metadata);

    // Add to type map
    const typeSet = this.typeMap.get(type);
    if (typeSet) {
      typeSet.add(normalizedId);
    }

    // Register aliases
    for (const alias of aliases) {
      this.aliasMap.set(alias.toLowerCase(), normalizedId);
    }

    logger.debug(
      `[VoiceRegistry] Registered ${type} provider: ${normalizedId} with aliases: ${aliases.join(", ")}`,
    );
  }

  /**
   * Resolve an alias to provider ID
   */
  resolveAlias(nameOrAlias: string): string {
    const normalized = nameOrAlias.toLowerCase();
    return this.aliasMap.get(normalized) ?? normalized;
  }

  /**
   * Get a provider by ID or alias
   */
  override async get(idOrAlias: string): Promise<VoiceHandler | undefined> {
    const id = this.resolveAlias(idOrAlias);
    return super.get(id);
  }

  /**
   * Check if a provider exists by ID or alias
   */
  override has(idOrAlias: string): boolean {
    const id = this.resolveAlias(idOrAlias);
    return super.has(id);
  }

  /**
   * Get all providers of a specific type
   */
  getByType(
    type: VoiceProviderType,
  ): Array<{ id: string; metadata: VoiceProviderMetadata }> {
    const typeSet = this.typeMap.get(type);
    if (!typeSet) {
      return [];
    }

    return this.list().filter((entry) => typeSet.has(entry.id));
  }

  /**
   * Get all TTS providers
   */
  getTTSProviders(): Array<{ id: string; metadata: VoiceProviderMetadata }> {
    return this.getByType("tts");
  }

  /**
   * Get all STT providers
   */
  getSTTProviders(): Array<{ id: string; metadata: VoiceProviderMetadata }> {
    return this.getByType("stt");
  }

  /**
   * Get all Realtime providers
   */
  getRealtimeProviders(): Array<{
    id: string;
    metadata: VoiceProviderMetadata;
  }> {
    return this.getByType("realtime");
  }

  /**
   * Get providers with a specific capability
   */
  getByCapability(
    capability: VoiceCapability,
  ): Array<{ id: string; metadata: VoiceProviderMetadata }> {
    return this.list().filter((entry) =>
      entry.metadata.capabilities.includes(capability),
    );
  }

  /**
   * Clear all registrations
   */
  override clear(): void {
    super.clear();
    this.aliasMap.clear();
    this.typeMap.forEach((set) => {
      set.clear();
    });
  }

  // ============================================================================
  // STATIC CONVENIENCE METHODS
  // ============================================================================

  /**
   * Check if the registry has been initialized (static convenience method)
   */
  static isRegistered(): boolean {
    const registry = VoiceRegistry.getInstance();
    return registry.list().length > 0;
  }

  /**
   * Register all providers (static convenience method)
   */
  static async registerAllProviders(): Promise<void> {
    await VoiceRegistry.getInstance().ensureInitialized();
  }
}

/**
 * Default singleton instance
 */
export const voiceRegistry = VoiceRegistry.getInstance();
