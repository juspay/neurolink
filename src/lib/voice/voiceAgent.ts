/**
 * Voice Agent for NeuroLink
 *
 * Integrates voice capabilities with NeuroLink AI for voice-enabled conversations.
 *
 * @module voice/voiceAgent
 */

import type { GenerateResult } from "../types/generateTypes.js";
import type {
  RealtimeConfig,
  RealtimeSession,
} from "../types/realtimeTypes.js";
import type { STTOptions, STTResult } from "../types/sttTypes.js";
import type { TTSOptions, TTSResult } from "../types/ttsTypes.js";
import type {
  RealtimeVoiceProvider,
  VoiceAgentConfig,
  VoiceProcessingResult,
  VoiceTurn,
} from "../types/voiceTypes.js";
import { logger } from "../utils/logger.js";
import { CompositeVoice } from "./compositeVoice.js";
import { VoiceErrorFactory } from "./errors.js";
import { VoiceFactory } from "./voiceFactory.js";

/**
 * Voice Agent Events
 */
export type VoiceAgentEvent =
  | "transcription.started"
  | "transcription.completed"
  | "generation.started"
  | "generation.completed"
  | "synthesis.started"
  | "synthesis.completed"
  | "error";

/**
 * Voice Agent Event Data
 */
export type VoiceAgentEventData = {
  "transcription.started": { audio: Buffer };
  "transcription.completed": { result: STTResult };
  "generation.started": { prompt: string };
  "generation.completed": { result: GenerateResult };
  "synthesis.started": { text: string };
  "synthesis.completed": { result: TTSResult };
  error: { error: Error; stage: string };
};

/**
 * Voice Agent
 *
 * High-level voice-enabled AI agent that combines:
 * - Speech-to-Text (STT) for user input
 * - NeuroLink AI for processing
 * - Text-to-Speech (TTS) for responses
 * - Optional Realtime mode for low-latency bidirectional audio
 *
 * @example
 * ```typescript
 * import { NeuroLink } from "neurolink";
 *
 * const neurolink = new NeuroLink();
 * const agent = new VoiceAgent({
 *   neurolink,
 *   sttProvider: "deepgram",
 *   ttsProvider: "elevenlabs",
 *   systemPrompt: "You are a helpful voice assistant.",
 *   voiceSettings: {
 *     voiceId: "rachel",
 *     language: "en-US",
 *   },
 * });
 *
 * // Process voice input
 * const result = await agent.processVoice(userAudioBuffer);
 * // Play result.audio to user
 *
 * // Or use realtime mode
 * const session = await agent.startRealtimeSession({
 *   provider: "openai-realtime",
 * });
 * session.on("response.audio.delta", handleAudioChunk);
 * session.sendAudio(microphoneBuffer);
 * ```
 */
/** NeuroLink type for voice agent integration */
interface NeuroLinkInstance {
  generate(
    optionsOrPrompt:
      | string
      | {
          input?: { text?: string };
          messages?: Array<{ role: string; content: string }>;
          prompt?: string;
          systemPrompt?: string;
        },
  ): Promise<GenerateResult>;
}

export class VoiceAgent {
  private readonly config: VoiceAgentConfig;
  private readonly neurolink: NeuroLinkInstance | null;
  private compositeVoice: CompositeVoice | null = null;
  private realtimeProvider: RealtimeVoiceProvider | null = null;
  private realtimeSession: RealtimeSession | null = null;
  private eventHandlers = new Map<
    VoiceAgentEvent,
    Set<(data: unknown) => void>
  >();
  private conversationHistory: VoiceTurn[] = [];

  /**
   * Create a new VoiceAgent
   *
   * @param config - Voice agent configuration
   * @param neurolink - NeuroLink instance for AI processing
   */
  constructor(
    config: VoiceAgentConfig & {
      neurolink?: NeuroLinkInstance;
      sttProvider?: string;
      ttsProvider?: string;
      realtimeProvider?: string;
    },
  ) {
    this.config = config;
    this.neurolink = config.neurolink ?? null;
  }

  /**
   * Initialize the voice agent
   */
  async initialize(): Promise<void> {
    const config = this.config as VoiceAgentConfig & {
      sttProvider?: string;
      ttsProvider?: string;
      realtimeProvider?: string;
    };

    // Initialize composite voice for batch mode
    if (config.mode !== "realtime" || !config.realtimeProvider) {
      this.compositeVoice = new CompositeVoice({
        sttProvider: config.sttProvider,
        ttsProvider: config.ttsProvider,
        defaultTTSOptions: {
          voice: config.voiceSettings?.voiceId,
          speed: config.voiceSettings?.speed,
          pitch: config.voiceSettings?.pitch,
        },
        defaultSTTOptions: {
          ...config.sttSettings,
          language: config.voiceSettings?.language,
        },
        trackHistory: true,
      });
    }

    // Initialize realtime provider if configured
    if (config.realtimeProvider) {
      this.realtimeProvider = await VoiceFactory.createRealtimeProvider(
        config.realtimeProvider,
      );
    }

    logger.debug("[VoiceAgent] Initialized", {
      mode: config.mode ?? "batch",
      hasCompositeVoice: !!this.compositeVoice,
      hasRealtimeProvider: !!this.realtimeProvider,
    });
  }

  /**
   * Process voice input in batch mode
   *
   * Pipeline: Audio -> STT -> AI -> TTS -> Audio
   *
   * @param audio - User's audio input
   * @param options - Processing options
   * @returns Complete processing result with timings
   */
  async processVoice(
    audio: Buffer | ArrayBuffer,
    options: {
      stt?: Partial<STTOptions>;
      tts?: Partial<TTSOptions>;
      generateOptions?: Record<string, unknown>;
    } = {},
  ): Promise<VoiceProcessingResult> {
    if (!this.compositeVoice) {
      throw VoiceErrorFactory.featureNotSupported(
        "batch processing",
        "voice-agent",
      );
    }

    const totalStartTime = Date.now();
    let transcriptionTime = 0;
    let generationTime = 0;
    let synthesisTime = 0;

    try {
      // Step 1: Transcribe audio to text
      this.emit("transcription.started", {
        audio: audio instanceof ArrayBuffer ? Buffer.from(audio) : audio,
      });
      const sttStartTime = Date.now();

      const transcription = await this.compositeVoice.transcribe(
        audio,
        options.stt,
      );
      transcriptionTime = Date.now() - sttStartTime;

      this.emit("transcription.completed", { result: transcription });
      logger.debug("[VoiceAgent] Transcription completed", {
        text: transcription.text.substring(0, 100),
        duration: transcriptionTime,
      });

      // Step 2: Generate AI response
      this.emit("generation.started", { prompt: transcription.text });
      const genStartTime = Date.now();

      const assistantText = await this.generateResponse(
        transcription.text,
        options.generateOptions,
      );
      generationTime = Date.now() - genStartTime;

      this.emit("generation.completed", {
        result: {
          text: assistantText,
          content: assistantText,
        } as unknown as GenerateResult,
      });
      logger.debug("[VoiceAgent] Generation completed", {
        text: assistantText.substring(0, 100),
        duration: generationTime,
      });

      // Step 3: Synthesize response to audio
      this.emit("synthesis.started", { text: assistantText });
      const ttsStartTime = Date.now();

      const synthesis = await this.compositeVoice.synthesize(
        assistantText,
        options.tts,
      );
      synthesisTime = Date.now() - ttsStartTime;

      this.emit("synthesis.completed", { result: synthesis });
      logger.debug("[VoiceAgent] Synthesis completed", {
        size: synthesis.buffer.length,
        duration: synthesisTime,
      });

      // Track in conversation history
      this.conversationHistory.push(
        {
          role: "user",
          text: transcription.text,
          timestamp: new Date(totalStartTime),
          metadata: {
            duration: transcription.duration,
            confidence: transcription.confidence,
            language: transcription.language,
          },
        },
        {
          role: "assistant",
          text: assistantText,
          audio: synthesis.buffer,
          timestamp: new Date(),
          metadata: {
            voice: synthesis.voice,
          },
        },
      );

      return {
        userText: transcription.text,
        assistantText,
        audio: synthesis.buffer,
        metadata: {
          transcriptionTime,
          generationTime,
          synthesisTime,
          totalTime: Date.now() - totalStartTime,
          inputDuration: transcription.duration,
        },
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.emit("error", { error, stage: "processVoice" });
      throw error;
    }
  }

  /**
   * Generate AI response using NeuroLink
   */
  private async generateResponse(
    userText: string,
    options?: Record<string, unknown>,
  ): Promise<string> {
    // Build messages from history for context
    const messages = this.buildMessagesFromHistory();
    messages.push({ role: "user", content: userText });

    // If neurolink instance is provided, use it
    if (this.neurolink) {
      const result = await this.neurolink.generate({
        messages,
        systemPrompt: this.config.systemPrompt,
        ...options,
      });
      return result.content;
    }

    // Fallback: return a placeholder if no NeuroLink instance
    // In real usage, NeuroLink would be provided
    logger.warn(
      "[VoiceAgent] No NeuroLink instance provided, returning placeholder response",
    );
    return `I received your message: "${userText}". Please configure a NeuroLink instance for AI responses.`;
  }

  /**
   * Build messages array from conversation history
   */
  private buildMessagesFromHistory(): Array<{
    role: "user" | "assistant";
    content: string;
  }> {
    return this.conversationHistory.map((turn) => ({
      role: turn.role,
      content: turn.text,
    }));
  }

  /**
   * Start a realtime voice session
   *
   * @param config - Realtime session configuration
   * @returns Realtime session for bidirectional communication
   */
  async startRealtimeSession(
    config?: Partial<RealtimeConfig>,
  ): Promise<RealtimeSession> {
    if (!this.realtimeProvider) {
      throw VoiceErrorFactory.featureNotSupported("realtime", "voice-agent");
    }

    if (this.realtimeSession?.isOpen()) {
      await this.stopRealtimeSession();
    }

    const sessionConfig: RealtimeConfig = {
      voice: this.config.voiceSettings?.voiceId,
      instructions: this.config.systemPrompt,
      temperature: 0.7,
      turnDetection: "server_vad",
      transcribeInput: true,
      ...this.config.realtimeConfig,
      ...config,
    };

    this.realtimeSession = await this.realtimeProvider.connect(sessionConfig);

    logger.debug("[VoiceAgent] Realtime session started", {
      sessionId: this.realtimeSession.id,
      provider: this.realtimeProvider.name,
    });

    return this.realtimeSession;
  }

  /**
   * Stop the current realtime session
   */
  async stopRealtimeSession(): Promise<void> {
    if (this.realtimeSession) {
      this.realtimeSession.close();
      this.realtimeSession = null;
      logger.debug("[VoiceAgent] Realtime session stopped");
    }
  }

  /**
   * Check if a realtime session is active
   */
  isRealtimeActive(): boolean {
    return this.realtimeSession?.isOpen() ?? false;
  }

  /**
   * Get the current realtime session
   */
  getRealtimeSession(): RealtimeSession | null {
    return this.realtimeSession;
  }

  /**
   * Add event listener
   */
  on<E extends VoiceAgentEvent>(
    event: E,
    handler: (data: VoiceAgentEventData[E]) => void,
  ): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler as (data: unknown) => void);
    }
  }

  /**
   * Remove event listener
   */
  off<E extends VoiceAgentEvent>(
    event: E,
    handler: (data: VoiceAgentEventData[E]) => void,
  ): void {
    this.eventHandlers.get(event)?.delete(handler as (data: unknown) => void);
  }

  /**
   * Emit event
   */
  private emit<E extends VoiceAgentEvent>(
    event: E,
    data: VoiceAgentEventData[E],
  ): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch {
          // Ignore handler errors
        }
      });
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): VoiceTurn[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
    if (this.compositeVoice) {
      this.compositeVoice.clearHistory();
    }
    logger.debug("[VoiceAgent] History cleared");
  }

  /**
   * Get the composite voice instance
   */
  getCompositeVoice(): CompositeVoice | null {
    return this.compositeVoice;
  }

  /**
   * Get the realtime provider
   */
  getRealtimeProvider(): RealtimeVoiceProvider | null {
    return this.realtimeProvider;
  }

  /**
   * Update voice settings
   */
  updateVoiceSettings(
    settings: Partial<VoiceAgentConfig["voiceSettings"]>,
  ): void {
    if (settings) {
      this.config.voiceSettings = {
        ...this.config.voiceSettings,
        ...settings,
      };
    }
    logger.debug("[VoiceAgent] Voice settings updated", { settings });
  }

  /**
   * Update system prompt
   */
  updateSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt;
    logger.debug("[VoiceAgent] System prompt updated");
  }

  /**
   * Dispose of all resources
   */
  async dispose(): Promise<void> {
    await this.stopRealtimeSession();
    this.eventHandlers.clear();
    this.conversationHistory = [];
    logger.debug("[VoiceAgent] Disposed");
  }
}
