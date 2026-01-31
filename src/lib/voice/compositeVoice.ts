/**
 * Composite Voice for NeuroLink
 *
 * Combines TTS and STT providers for bidirectional voice conversations.
 *
 * @module voice/compositeVoice
 */

import type { STTOptions, STTResult } from "../types/sttTypes.js";
import type { TTSOptions, TTSResult } from "../types/ttsTypes.js";
import type {
  CompositeVoiceConfig,
  STTProvider,
  TTSProvider,
  VoiceCapability,
  VoiceTurn,
} from "../types/voiceTypes.js";
import { logger } from "../utils/logger.js";
import { VoiceErrorFactory } from "./errors.js";
import { VoiceFactory } from "./voiceFactory.js";

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
  private ttsProvider: TTSProvider | null = null;
  private sttProvider: STTProvider | null = null;
  private readonly config: CompositeVoiceConfig;
  private history: VoiceTurn[] = [];
  private initialized = false;
  private initPromise: Promise<void> | null = null;

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
      } else {
        this.ttsProvider = await VoiceFactory.createTTSProvider(
          this.config.ttsProvider.name,
          this.config.ttsProvider,
        );
      }
    }

    // Initialize STT provider
    if (this.config.sttProvider) {
      if (typeof this.config.sttProvider === "string") {
        this.sttProvider = await VoiceFactory.createSTTProvider(
          this.config.sttProvider,
        );
      } else {
        this.sttProvider = await VoiceFactory.createSTTProvider(
          this.config.sttProvider.name,
          this.config.sttProvider,
        );
      }
    }

    this.initialized = true;
    logger.debug("[CompositeVoice] Initialized", {
      tts: this.ttsProvider?.name,
      stt: this.sttProvider?.name,
    });
  }

  /**
   * Get combined capabilities from both providers
   */
  getCapabilities(): VoiceCapability[] {
    const capabilities = new Set<VoiceCapability>();

    if (this.ttsProvider) {
      for (const cap of this.ttsProvider.getCapabilities()) {
        capabilities.add(cap);
      }
    }

    if (this.sttProvider) {
      for (const cap of this.sttProvider.getCapabilities()) {
        capabilities.add(cap);
      }
    }

    return Array.from(capabilities);
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
      throw VoiceErrorFactory.featureNotSupported("tts", "composite");
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
          provider: this.ttsProvider.name,
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
    options: Partial<STTOptions> = {},
  ): Promise<STTResult> {
    await this.ensureInitialized();

    if (!this.sttProvider) {
      throw VoiceErrorFactory.featureNotSupported("stt", "composite");
    }

    const mergedOptions: STTOptions = {
      ...this.config.defaultSTTOptions,
      ...options,
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
          provider: this.sttProvider.name,
        },
      });
    }

    return result;
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
      stt?: Partial<STTOptions>;
      tts?: Partial<TTSOptions>;
    } = {},
  ): Promise<{
    userText: string;
    responseText: string;
    responseAudio: Buffer;
    transcription: STTResult;
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
  async setTTSProvider(provider: string | TTSProvider): Promise<void> {
    if (typeof provider === "string") {
      this.ttsProvider = await VoiceFactory.createTTSProvider(provider);
    } else {
      this.ttsProvider = provider;
    }
    logger.debug("[CompositeVoice] TTS provider set", {
      provider: this.ttsProvider.name,
    });
  }

  /**
   * Set STT provider dynamically
   */
  async setSTTProvider(provider: string | STTProvider): Promise<void> {
    if (typeof provider === "string") {
      this.sttProvider = await VoiceFactory.createSTTProvider(provider);
    } else {
      this.sttProvider = provider;
    }
    logger.debug("[CompositeVoice] STT provider set", {
      provider: this.sttProvider.name,
    });
  }

  /**
   * Get current TTS provider
   */
  getTTSProvider(): TTSProvider | null {
    return this.ttsProvider;
  }

  /**
   * Get current STT provider
   */
  getSTTProvider(): STTProvider | null {
    return this.sttProvider;
  }

  /**
   * Get available TTS voices
   */
  async getAvailableVoices(languageCode?: string): Promise<string[]> {
    await this.ensureInitialized();

    if (!this.ttsProvider) {
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

    if (!this.sttProvider) {
      return [];
    }

    return this.sttProvider.getSupportedLanguages();
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

    if (this.ttsProvider) {
      const ttsValidation = await this.ttsProvider.validateConfig();
      if (!ttsValidation.valid) {
        errors.push(...ttsValidation.errors.map((e) => `TTS: ${e}`));
      }
    }

    if (this.sttProvider) {
      const sttValidation = await this.sttProvider.validateConfig();
      if (!sttValidation.valid) {
        errors.push(...sttValidation.errors.map((e) => `STT: ${e}`));
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
