/**
 * Composite Voice for NeuroLink
 *
 * Combines TTS and STT providers for bidirectional voice conversations.
 *
 * @module voice/compositeVoice
 */

import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";
import type {
  STTOptions as LibSTTOptions,
  STTResult as LibSTTResult,
} from "../types/sttTypes.js";
import type { TTSOptions, TTSResult } from "../types/ttsTypes.js";
import { logger } from "../utils/logger.js";
import type { TTSHandler } from "../utils/ttsProcessor.js";
import { VOICE_ERROR_CODES, VoiceError } from "./errors.js";
import type { STTHandler } from "./STTProvider.js";
import type {
  CompositeVoiceConfig,
  VoiceCapability,
  STTOptions as VoiceSTTOptions,
  VoiceTurn,
} from "./types/voiceTypes.js";
import { VoiceFactory } from "./VoiceFactory.js";

/**
 * Composite Voice
 *
 * Provides a unified interface for TTS + STT voice conversations.
 * Supports tracking conversation history and chaining operations.
 *
 * @example
 * ```typescript
 * const voice = new CompositeVoice({
 *   ttsProvider: "elevenlabs",
 *   sttProvider: "deepgram",
 *   trackHistory: true,
 * });
 *
 * // Transcribe user audio
 * const userText = await voice.transcribe(userAudioBuffer);
 *
 * // Process and respond
 * const responseText = "Hello! How can I help?";
 * const responseAudio = await voice.synthesize(responseText);
 *
 * // Get conversation history
 * const history = voice.getHistory();
 * ```
 */
export class CompositeVoice {
  private ttsProvider: TTSHandler | null = null;
  private sttProvider: STTHandler | null = null;
  private readonly config: CompositeVoiceConfig;
  private history: VoiceTurn[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;
  private ttsProviderName: string | null = null;
  private sttProviderName: string | null = null;

  constructor(config: CompositeVoiceConfig = {}) {
    this.config = {
      trackHistory: true,
      maxHistoryTurns: 100,
      ...config,
    };
  }

  /**
   * Initialize providers lazily with mutex to prevent race conditions
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Use mutex pattern to prevent concurrent initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    await this.initPromise;
  }

  /**
   * Perform the actual initialization
   */
  private async doInitialize(): Promise<void> {
    // Initialize TTS provider
    if (this.config.ttsProvider) {
      if (typeof this.config.ttsProvider === "string") {
        this.ttsProvider = await VoiceFactory.createTTSProvider(
          this.config.ttsProvider,
        );
        this.ttsProviderName = this.config.ttsProvider;
      } else {
        this.ttsProvider = await VoiceFactory.createTTSProvider(
          this.config.ttsProvider.name,
          this.config.ttsProvider,
        );
        this.ttsProviderName = this.config.ttsProvider.name;
      }
    }

    // Initialize STT provider
    if (this.config.sttProvider) {
      if (typeof this.config.sttProvider === "string") {
        this.sttProvider = await VoiceFactory.createSTTProvider(
          this.config.sttProvider,
        );
        this.sttProviderName = this.config.sttProvider;
      } else {
        this.sttProvider = await VoiceFactory.createSTTProvider(
          this.config.sttProvider.name,
          this.config.sttProvider,
        );
        this.sttProviderName = this.config.sttProvider.name;
      }
    }

    this.initialized = true;
    logger.debug("[CompositeVoice] Initialized", {
      tts: this.ttsProviderName,
      stt: this.sttProviderName,
    });
  }

  /**
   * Get combined capabilities from both providers
   */
  getCapabilities(): VoiceCapability[] {
    const capabilities: VoiceCapability[] = [];

    if (this.ttsProvider) {
      capabilities.push("tts");
    }

    if (this.sttProvider) {
      capabilities.push("stt");
    }

    return capabilities;
  }

  /**
   * Synthesize text to speech
   *
   * @param text - Text to synthesize
   * @param options - TTS options (merged with defaults)
   * @returns TTS result with audio buffer
   */
  async synthesize(
    text: string,
    options: Partial<TTSOptions> = {},
  ): Promise<TTSResult> {
    await this.ensureInitialized();

    if (!this.ttsProvider) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.PROVIDER_NOT_FOUND,
        message: "TTS provider not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { feature: "tts" },
      });
    }

    const mergedOptions: TTSOptions = {
      ...this.config.defaultTTSOptions,
      ...options,
    };

    const result = await this.ttsProvider.synthesize(text, mergedOptions);

    // Track in history
    if (this.config.trackHistory) {
      this.addToHistory({
        role: "assistant",
        text,
        audio: result.buffer,
        timestamp: new Date(),
        metadata: {
          provider: this.ttsProviderName ?? "unknown",
          ...result.metadata,
        },
      });
    }

    return result;
  }

  /**
   * Transcribe audio to text
   *
   * @param audio - Audio buffer to transcribe
   * @param options - STT options (merged with defaults)
   * @returns STT result with transcription
   */
  async transcribe(
    audio: Buffer | ArrayBuffer,
    options: Partial<LibSTTOptions> = {},
  ): Promise<LibSTTResult> {
    await this.ensureInitialized();

    if (!this.sttProvider) {
      throw new VoiceError({
        code: VOICE_ERROR_CODES.PROVIDER_NOT_FOUND,
        message: "STT provider not configured",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        context: { feature: "stt" },
      });
    }

    // Convert to voice module STT options format
    const voiceSTTOptions: VoiceSTTOptions = {
      language: options.language,
      format: options.format as VoiceSTTOptions["format"],
      diarization: options.diarization,
      punctuate: options.punctuate,
      wordTimestamps: options.wordTimestamps,
      confidenceThreshold: (options as { confidenceThreshold?: number })
        .confidenceThreshold,
    };

    const mergedOptions: VoiceSTTOptions = {
      ...this.config.defaultSTTOptions,
      ...voiceSTTOptions,
    };

    const result = await this.sttProvider.transcribe(audio, mergedOptions);

    // Track in history
    if (this.config.trackHistory) {
      const audioBuffer =
        audio instanceof ArrayBuffer ? Buffer.from(audio) : audio;
      this.addToHistory({
        role: "user",
        text: result.text,
        audio: audioBuffer,
        timestamp: new Date(),
        metadata: {
          duration: result.duration,
          confidence: result.confidence,
          language: result.language,
          provider: this.sttProviderName ?? "unknown",
        },
      });
    }

    // Convert result to LibSTTResult format
    return {
      text: result.text,
      confidence: result.confidence ?? 0,
      duration: result.duration ?? 0,
      language: result.language ?? "en",
      segments:
        result.segments?.map((s) => ({
          text: s.text,
          start: s.start ?? s.startTime ?? 0,
          end: s.end ?? s.endTime ?? 0,
          confidence: s.confidence ?? 0,
          speaker: s.speaker,
          words: s.words?.map((w) => ({
            word: w.word,
            start: w.startTime ?? 0,
            end: w.endTime ?? 0,
            confidence: w.confidence ?? 0,
            speaker: w.speaker,
          })),
        })) ?? [],
      metadata: {
        ...result.metadata,
        latency: result.metadata?.latency ?? 0,
        provider:
          result.metadata?.provider ?? this.sttProviderName ?? "unknown",
      },
    };
  }

  /**
   * Full conversation turn: transcribe -> (process) -> synthesize
   *
   * @param userAudio - User's audio input
   * @param processText - Async function to process transcribed text and return response
   * @param options - Combined options for both STT and TTS
   * @returns Object with user text, response text, and response audio
   */
  async conversationTurn(
    userAudio: Buffer | ArrayBuffer,
    processText: (text: string, history: VoiceTurn[]) => Promise<string>,
    options: {
      stt?: Partial<LibSTTOptions>;
      tts?: Partial<TTSOptions>;
    } = {},
  ): Promise<{
    userText: string;
    responseText: string;
    responseAudio: Buffer;
    transcription: LibSTTResult;
    synthesis: TTSResult;
  }> {
    // Transcribe user audio
    const transcription = await this.transcribe(userAudio, options.stt);

    // Process with callback (e.g., send to LLM)
    const responseText = await processText(transcription.text, this.history);

    // Synthesize response
    const synthesis = await this.synthesize(responseText, options.tts);

    return {
      userText: transcription.text,
      responseText,
      responseAudio: synthesis.buffer,
      transcription,
      synthesis,
    };
  }

  /**
   * Add a turn to history
   */
  private addToHistory(turn: VoiceTurn): void {
    this.history.push(turn);

    // Trim history if needed
    const maxTurns = this.config.maxHistoryTurns ?? 100;
    if (this.history.length > maxTurns) {
      this.history = this.history.slice(-maxTurns);
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): VoiceTurn[] {
    return [...this.history];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.history = [];
    logger.debug("[CompositeVoice] History cleared");
  }

  /**
   * Set TTS provider dynamically
   */
  async setTTSProvider(provider: string | TTSHandler): Promise<void> {
    if (typeof provider === "string") {
      this.ttsProvider = await VoiceFactory.createTTSProvider(provider);
      this.ttsProviderName = provider;
    } else {
      this.ttsProvider = provider;
      this.ttsProviderName = "custom";
    }
    logger.debug("[CompositeVoice] TTS provider set", {
      provider: this.ttsProviderName,
    });
  }

  /**
   * Set STT provider dynamically
   */
  async setSTTProvider(provider: string | STTHandler): Promise<void> {
    if (typeof provider === "string") {
      this.sttProvider = await VoiceFactory.createSTTProvider(provider);
      this.sttProviderName = provider;
    } else {
      this.sttProvider = provider;
      this.sttProviderName = "custom";
    }
    logger.debug("[CompositeVoice] STT provider set", {
      provider: this.sttProviderName,
    });
  }

  /**
   * Get current TTS provider
   */
  getTTSProvider(): TTSHandler | null {
    return this.ttsProvider;
  }

  /**
   * Get current STT provider
   */
  getSTTProvider(): STTHandler | null {
    return this.sttProvider;
  }

  /**
   * Get available TTS voices
   */
  async getAvailableVoices(languageCode?: string): Promise<string[]> {
    await this.ensureInitialized();

    if (!this.ttsProvider || !this.ttsProvider.getVoices) {
      return [];
    }

    const voices = await this.ttsProvider.getVoices(languageCode);
    return voices.map((v) => v.id);
  }

  /**
   * Get supported STT languages
   */
  async getSupportedLanguages(): Promise<string[]> {
    await this.ensureInitialized();

    if (!this.sttProvider || !this.sttProvider.getSupportedLanguages) {
      return [];
    }

    const languages = await this.sttProvider.getSupportedLanguages();
    return languages.map((lang) =>
      typeof lang === "string" ? lang : lang.code,
    );
  }

  /**
   * Check if composite voice is fully configured (has both TTS and STT)
   */
  async isFullyConfigured(): Promise<boolean> {
    await this.ensureInitialized();
    return this.ttsProvider !== null && this.sttProvider !== null;
  }

  /**
   * Validate both providers
   */
  async validate(): Promise<{ valid: boolean; errors: string[] }> {
    await this.ensureInitialized();

    const errors: string[] = [];

    if (this.ttsProvider && !this.ttsProvider.isConfigured()) {
      errors.push("TTS: Provider is not configured");
    }

    if (this.sttProvider && !this.sttProvider.isConfigured()) {
      errors.push("STT: Provider is not configured");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
