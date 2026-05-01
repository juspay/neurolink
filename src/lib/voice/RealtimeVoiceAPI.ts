/**
 * Realtime Voice API Infrastructure
 *
 * Base handler and processor for realtime voice communication.
 * Supports bidirectional audio streaming with providers like OpenAI and Gemini.
 *
 * @module voice/RealtimeVoiceAPI
 */

import { logger } from "../utils/logger.js";
import type {
  AudioFormat,
  RealtimeAudioChunk,
  RealtimeConfig,
  RealtimeEventHandlers,
  RealtimeHandler,
  RealtimeSession,
  RealtimeSessionState,
} from "../types/index.js";
import { RealtimeError } from "./errors.js";
import {
  DEFAULT_REALTIME_CONFIG,
  REALTIME_ERROR_CODES,
} from "../types/index.js";
import { ErrorCategory, ErrorSeverity } from "../constants/enums.js";

/**
 * Realtime Processor class for orchestrating realtime voice operations
 *
 * Provides a unified interface for realtime voice across multiple providers.
 *
 * @example
 * ```typescript
 * // Register a handler
 * RealtimeProcessor.registerHandler('openai', openaiHandler);
 *
 * // Connect to a session
 * const session = await RealtimeProcessor.connect('openai', {
 *   provider: 'openai',
 *   voice: 'alloy',
 *   systemPrompt: 'You are a helpful assistant.'
 * });
 *
 * // Send audio
 * await RealtimeProcessor.sendAudio('openai', audioBuffer);
 *
 * // Disconnect
 * await RealtimeProcessor.disconnect('openai');
 * ```
 */
export class RealtimeProcessor {
  /**
   * Handler registry mapping provider names to Realtime handlers
   */
  private static readonly handlers = new Map<string, RealtimeHandler>();

  /**
   * Active sessions by provider
   */
  private static readonly sessions = new Map<string, RealtimeSession>();

  /**
   * Register a Realtime handler for a specific provider
   *
   * @param providerName - Provider identifier (e.g., 'openai', 'gemini')
   * @param handler - Realtime handler implementation
   */
  static registerHandler(providerName: string, handler: RealtimeHandler): void {
    if (!providerName) {
      throw new Error("Provider name is required");
    }

    if (!handler) {
      throw new Error("Handler is required");
    }

    const normalizedName = providerName.toLowerCase();

    if (this.handlers.has(normalizedName)) {
      logger.warn(
        `[RealtimeProcessor] Overwriting existing handler for provider: ${normalizedName}`,
      );
    }

    this.handlers.set(normalizedName, handler);
    logger.debug(
      `[RealtimeProcessor] Registered Realtime handler for provider: ${normalizedName}`,
    );
  }

  /**
   * Get a registered Realtime handler by provider name
   */
  private static getHandler(providerName: string): RealtimeHandler | undefined {
    const normalizedName = providerName.toLowerCase();
    return this.handlers.get(normalizedName);
  }

  /**
   * Check if a provider is supported
   */
  static supports(providerName: string): boolean {
    if (!providerName) {
      return false;
    }

    const normalizedName = providerName.toLowerCase();
    return this.handlers.has(normalizedName);
  }

  /**
   * Get list of all registered providers
   */
  static getProviders(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Connect to a realtime session
   *
   * @param provider - Provider identifier
   * @param config - Session configuration
   * @param handlers - Event handlers
   * @returns Session information
   */
  static async connect(
    provider: string,
    config: RealtimeConfig,
    handlers?: RealtimeEventHandlers,
  ): Promise<RealtimeSession> {
    const handler = this.getHandler(provider);

    if (!handler) {
      throw RealtimeError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConfigured()) {
      throw RealtimeError.providerNotConfigured(provider);
    }

    // Check for existing session
    if (handler.isConnected()) {
      throw RealtimeError.sessionAlreadyActive(provider);
    }

    // Merge with defaults
    const mergedConfig: RealtimeConfig = {
      ...DEFAULT_REALTIME_CONFIG,
      ...config,
    };

    // Register event handlers if provided
    if (handlers) {
      handler.on(handlers);
    }

    try {
      logger.debug(`[RealtimeProcessor] Connecting to provider: ${provider}`);

      const session = await handler.connect(mergedConfig);
      this.sessions.set(provider.toLowerCase(), session);

      logger.info(
        `[RealtimeProcessor] Connected to ${provider} session: ${session.id}`,
      );

      return session;
    } catch (err: unknown) {
      if (handlers) {
        handler.off();
      }

      if (err instanceof RealtimeError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.connectionFailed(
        errorMessage,
        provider,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Disconnect from a realtime session
   *
   * @param provider - Provider identifier
   */
  static async disconnect(provider: string): Promise<void> {
    const handler = this.getHandler(provider);

    if (!handler) {
      throw RealtimeError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConnected()) {
      logger.warn(
        `[RealtimeProcessor] No active session for provider: ${provider}`,
      );
      return;
    }

    try {
      await handler.disconnect();
      this.sessions.delete(provider.toLowerCase());
      handler.off();

      logger.info(`[RealtimeProcessor] Disconnected from ${provider}`);
    } catch (err: unknown) {
      if (err instanceof RealtimeError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.protocolError(
        `Disconnect failed: ${errorMessage}`,
        provider,
        err instanceof Error ? err : undefined,
      );
    }
  }

  /**
   * Send audio to a realtime session
   *
   * @param provider - Provider identifier
   * @param audio - Audio data
   */
  static async sendAudio(
    provider: string,
    audio: Buffer | RealtimeAudioChunk,
  ): Promise<void> {
    const handler = this.getHandler(provider);

    if (!handler) {
      throw RealtimeError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConnected()) {
      throw RealtimeError.sessionNotActive(provider);
    }

    try {
      await handler.sendAudio(audio);
    } catch (err: unknown) {
      if (err instanceof RealtimeError) {
        throw err;
      }

      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.audioStreamError(errorMessage, provider);
    }
  }

  /**
   * Send text to a realtime session
   *
   * @param provider - Provider identifier
   * @param text - Text to send
   */
  static async sendText(provider: string, text: string): Promise<void> {
    const handler = this.getHandler(provider);

    if (!handler) {
      throw RealtimeError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConnected()) {
      throw RealtimeError.sessionNotActive(provider);
    }

    if (!handler.sendText) {
      throw new RealtimeError({
        code: REALTIME_ERROR_CODES.PROTOCOL_ERROR,
        message: `Provider "${provider}" does not support text input`,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        context: { provider },
      });
    }

    await handler.sendText(text);
  }

  /**
   * Trigger a response from the model (manual turn detection)
   *
   * @param provider - Provider identifier
   */
  static async triggerResponse(provider: string): Promise<void> {
    const handler = this.getHandler(provider);

    if (!handler) {
      throw RealtimeError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConnected()) {
      throw RealtimeError.sessionNotActive(provider);
    }

    if (handler.triggerResponse) {
      await handler.triggerResponse();
    }
  }

  /**
   * Cancel the current response
   *
   * @param provider - Provider identifier
   */
  static async cancelResponse(provider: string): Promise<void> {
    const handler = this.getHandler(provider);

    if (!handler) {
      throw RealtimeError.providerNotSupported(
        provider,
        Array.from(this.handlers.keys()),
      );
    }

    if (!handler.isConnected()) {
      return; // Nothing to cancel
    }

    if (handler.cancelResponse) {
      await handler.cancelResponse();
    }
  }

  /**
   * Get current session for a provider
   *
   * @param provider - Provider identifier
   * @returns Session or null
   */
  static getSession(provider: string): RealtimeSession | null {
    const handler = this.getHandler(provider);
    return handler?.getSession() ?? null;
  }

  /**
   * Check if a provider has an active session
   *
   * @param provider - Provider identifier
   */
  static isConnected(provider: string): boolean {
    const handler = this.getHandler(provider);
    return handler?.isConnected() ?? false;
  }

  /**
   * Get supported formats for a provider
   *
   * @param provider - Provider identifier
   */
  static getSupportedFormats(provider: string): AudioFormat[] {
    const handler = this.getHandler(provider);
    return handler?.getSupportedFormats() ?? [];
  }

  /**
   * Clear all handlers and sessions (for testing)
   */
  static clearHandlers(): void {
    // Disconnect all active sessions
    for (const [provider] of this.sessions) {
      const handler = this.handlers.get(provider);
      if (handler?.isConnected()) {
        handler.disconnect().catch(() => {
          // Ignore errors during cleanup
        });
      }
    }

    this.handlers.clear();
    this.sessions.clear();
    logger.debug("[RealtimeProcessor] Cleared all handlers and sessions");
  }
}

/**
 * Base Realtime Handler with common functionality
 *
 * Providers can extend this class for common behavior.
 */
export abstract class BaseRealtimeHandler implements RealtimeHandler {
  abstract readonly name: string;

  protected session: RealtimeSession | null = null;
  protected eventHandlers: RealtimeEventHandlers | null = null;
  protected state: RealtimeSessionState = "disconnected";

  abstract connect(config: RealtimeConfig): Promise<RealtimeSession>;
  abstract disconnect(): Promise<void>;
  abstract sendAudio(audio: Buffer | RealtimeAudioChunk): Promise<void>;
  abstract isConfigured(): boolean;
  abstract getSupportedFormats(): AudioFormat[];

  isConnected(): boolean {
    return this.state === "connected";
  }

  getSession(): RealtimeSession | null {
    return this.session;
  }

  on(handlers: RealtimeEventHandlers): void {
    this.eventHandlers = handlers;
  }

  off(): void {
    this.eventHandlers = null;
  }

  /**
   * Emit state change event
   */
  protected emitStateChange(newState: RealtimeSessionState): void {
    this.state = newState;
    if (this.session) {
      this.session.state = newState;
      this.session.lastActivityAt = new Date();
    }
    this.eventHandlers?.onStateChange?.(newState);
  }

  /**
   * Emit audio event
   */
  protected emitAudio(chunk: RealtimeAudioChunk): void {
    this.eventHandlers?.onAudio?.(chunk);
  }

  /**
   * Emit transcript event
   */
  protected emitTranscript(text: string, isFinal: boolean): void {
    this.eventHandlers?.onTranscript?.(text, isFinal);
  }

  /**
   * Emit text event
   */
  protected emitText(text: string, isFinal: boolean): void {
    this.eventHandlers?.onText?.(text, isFinal);
  }

  /**
   * Emit function call event
   */
  protected async emitFunctionCall(
    name: string,
    args: Record<string, unknown>,
  ): Promise<unknown> {
    if (this.eventHandlers?.onFunctionCall) {
      return this.eventHandlers.onFunctionCall(name, args);
    }
    return undefined;
  }

  /**
   * Emit error event
   */
  protected emitError(error: Error): void {
    this.eventHandlers?.onError?.(error);
  }

  /**
   * Emit turn start event
   */
  protected emitTurnStart(): void {
    this.eventHandlers?.onTurnStart?.();
  }

  /**
   * Emit turn end event
   */
  protected emitTurnEnd(): void {
    this.eventHandlers?.onTurnEnd?.();
  }

  /**
   * Create a session object
   */
  protected createSession(id: string, config: RealtimeConfig): RealtimeSession {
    return {
      id,
      state: "connected",
      provider: this.name,
      model: config.model,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      config,
    };
  }
}
