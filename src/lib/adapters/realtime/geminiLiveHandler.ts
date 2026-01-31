/**
 * Google Gemini Live Voice Handler
 *
 * Handler for Google's Gemini Live API for bidirectional voice communication.
 *
 * @module adapters/realtime/geminiLiveHandler
 * @see https://ai.google.dev/api/multimodal-live
 */

import { ErrorCategory, ErrorSeverity } from "../../constants/enums.js";
import type {
  RealtimeConfig,
  RealtimeEvent,
  RealtimeEventType,
  RealtimeSession,
  RealtimeTool,
} from "../../types/realtimeTypes.js";
import { REALTIME_ERROR_CODES } from "../../types/realtimeTypes.js";
import type {
  RealtimeVoiceProvider,
  VoiceCapability,
} from "../../types/voiceTypes.js";
import { RealtimeError } from "../../voice/errors.js";

/**
 * Gemini Live-specific configuration
 */
export type GeminiLiveConfig = RealtimeConfig & {
  /** Model: gemini-2.0-flash-exp or similar */
  model?: string;
  /** Generation config */
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    responseModalities?: Array<"TEXT" | "AUDIO">;
    speechConfig?: {
      voiceConfig?: {
        prebuiltVoiceConfig?: {
          voiceName: string;
        };
      };
    };
  };
  /** Safety settings */
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
};

/**
 * Gemini Live voices
 */
export type GeminiLiveVoice = "Puck" | "Charon" | "Kore" | "Fenrir" | "Aoede";

/**
 * Gemini Live session implementation
 */
class GeminiLiveSession implements RealtimeSession {
  readonly id: string;
  private ws: WebSocket | null = null;
  private eventHandlers = new Map<
    RealtimeEventType,
    Set<(event: RealtimeEvent) => void>
  >();
  private config: GeminiLiveConfig;
  private tools: RealtimeTool[] = [];

  constructor(id: string, ws: WebSocket, config: GeminiLiveConfig) {
    this.id = id;
    this.ws = ws;
    this.config = config;
    this.setupWebSocketHandlers();
  }

  private setupWebSocketHandlers(): void {
    if (!this.ws) {
      return;
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<
          string,
          unknown
        >;
        const realtimeEvent = this.mapGeminiEvent(data);
        if (realtimeEvent) {
          this.emitEvent(realtimeEvent);
        }
      } catch {
        // Ignore parse errors
      }
    };

    this.ws.onerror = (error) => {
      this.emitEvent({
        type: "error",
        timestamp: Date.now(),
        data: {
          code: "websocket_error",
          message: error instanceof Error ? error.message : "WebSocket error",
        },
      });
    };

    this.ws.onclose = (event) => {
      this.emitEvent({
        type: "session.error",
        timestamp: Date.now(),
        data: {
          code: "connection_closed",
          message: event.reason || "Connection closed",
        },
      });
    };
  }

  /**
   * Map Gemini-specific events to standard RealtimeEvent format
   */
  private mapGeminiEvent(data: Record<string, unknown>): RealtimeEvent | null {
    // Gemini Live uses different event structure
    // Map to our standard event types

    if (data.setupComplete) {
      return {
        type: "session.created",
        timestamp: Date.now(),
        data,
      };
    }

    if (data.serverContent) {
      const serverContent = data.serverContent as {
        modelTurn?: {
          parts?: Array<{
            text?: string;
            inlineData?: {
              mimeType: string;
              data: string;
            };
          }>;
        };
        turnComplete?: boolean;
      };

      if (serverContent.modelTurn?.parts) {
        for (const part of serverContent.modelTurn.parts) {
          if (part.text) {
            return {
              type: serverContent.turnComplete
                ? "response.text.done"
                : "response.text.delta",
              timestamp: Date.now(),
              data: {
                text: part.text,
              },
            };
          }
          if (part.inlineData?.mimeType.startsWith("audio/")) {
            return {
              type: serverContent.turnComplete
                ? "response.audio.done"
                : "response.audio.delta",
              timestamp: Date.now(),
              data: {
                audio: part.inlineData.data,
              },
            };
          }
        }
      }

      if (serverContent.turnComplete) {
        return {
          type: "response.done",
          timestamp: Date.now(),
          data,
        };
      }
    }

    if (data.toolCall) {
      const toolCall = data.toolCall as {
        functionCalls?: Array<{
          id: string;
          name: string;
          args: Record<string, unknown>;
        }>;
      };

      if (toolCall.functionCalls?.[0]) {
        const fc = toolCall.functionCalls[0];
        return {
          type: "response.function_call.arguments.done",
          timestamp: Date.now(),
          data: {
            callId: fc.id,
            name: fc.name,
            arguments: JSON.stringify(fc.args),
          },
        };
      }
    }

    return null;
  }

  private emitEvent(event: RealtimeEvent): void {
    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(event);
        } catch {
          // Ignore handler errors
        }
      });
    }
  }

  private send(message: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw RealtimeError.connectionClosed(
        "WebSocket not connected",
        this.id,
        "gemini-live",
      );
    }
    this.ws.send(JSON.stringify(message));
  }

  sendAudio(audio: Buffer | ArrayBuffer): void {
    const base64Audio =
      audio instanceof ArrayBuffer
        ? Buffer.from(audio).toString("base64")
        : audio.toString("base64");

    this.send({
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio,
          },
        ],
      },
    });
  }

  commitAudio(): void {
    // Gemini Live handles audio automatically with VAD
    // Send end of turn signal
    this.send({
      clientContent: {
        turnComplete: true,
      },
    });
  }

  clearAudio(): void {
    // Gemini Live doesn't have explicit clear audio
    // Send interrupt signal instead
    this.send({
      clientContent: {
        turnComplete: true,
      },
    });
  }

  sendText(text: string): void {
    this.send({
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    });
  }

  createResponse(): void {
    // Gemini automatically creates responses
    // This can be used to trigger a response after setup
    this.send({
      clientContent: {
        turnComplete: true,
      },
    });
  }

  cancelResponse(): void {
    // Send interrupt to cancel current response
    this.send({
      clientContent: {
        turnComplete: true,
      },
    });
  }

  updateSession(config: Partial<RealtimeConfig>): void {
    // Gemini Live doesn't support mid-session config updates
    // Store for reference
    this.config = { ...this.config, ...config };
  }

  registerTools(tools: RealtimeTool[]): void {
    this.tools = tools;

    // Gemini uses function declarations format
    const functionDeclarations = tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    // Tools need to be sent during setup in Gemini
    // Store for next session
    this.config.providerOptions = {
      ...this.config.providerOptions,
      tools: [{ functionDeclarations }],
    };
  }

  sendFunctionResult(callId: string, result: string): void {
    this.send({
      toolResponse: {
        functionResponses: [
          {
            id: callId,
            response: JSON.parse(result),
          },
        ],
      },
    });
  }

  on(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.add(handler);
    }
  }

  off(event: RealtimeEventType, handler: (event: RealtimeEvent) => void): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.eventHandlers.clear();
  }

  isOpen(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * Google Gemini Live Voice Handler
 *
 * Provides bidirectional voice communication using Google's Gemini Live API.
 *
 * @example
 * ```typescript
 * const handler = new GeminiLiveHandler();
 *
 * const session = await handler.connect({
 *   model: "gemini-2.0-flash-exp",
 *   voice: "Puck",
 *   instructions: "You are a helpful assistant.",
 * });
 *
 * session.on("response.audio.delta", (event) => {
 *   // Handle audio chunks
 * });
 *
 * session.sendAudio(audioBuffer);
 * ```
 */
export class GeminiLiveHandler implements RealtimeVoiceProvider {
  readonly name = "gemini-live";
  private readonly apiKey: string | null;
  private readonly wsBaseUrl: string;
  private session: GeminiLiveSession | null = null;
  private sessionConfig: RealtimeConfig | null = null;

  /**
   * Available voices for Gemini Live
   */
  static readonly VOICES: GeminiLiveVoice[] = [
    "Puck",
    "Charon",
    "Kore",
    "Fenrir",
    "Aoede",
  ];

  /**
   * Default model for Gemini Live
   */
  static readonly DEFAULT_MODEL = "gemini-2.0-flash-exp";

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ??
      process.env.GOOGLE_AI_STUDIO_API_KEY ??
      process.env.GOOGLE_API_KEY ??
      null;
    this.wsBaseUrl =
      "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent";
  }

  /**
   * Get provider capabilities
   */
  getCapabilities(): VoiceCapability[] {
    return ["realtime", "streaming"];
  }

  /**
   * Check if provider is properly configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Validate provider configuration
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.apiKey) {
      return {
        valid: false,
        errors: ["GOOGLE_AI_STUDIO_API_KEY or GOOGLE_API_KEY not configured"],
      };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Connect to a realtime session
   */
  async connect(config: RealtimeConfig): Promise<RealtimeSession> {
    if (!this.apiKey) {
      throw RealtimeError.notConfigured("gemini-live");
    }

    if (this.session?.isOpen()) {
      await this.disconnect();
    }

    const geminiConfig = config as GeminiLiveConfig;
    const model = geminiConfig.model ?? GeminiLiveHandler.DEFAULT_MODEL;

    try {
      // NOTE: Gemini Live API requires API key in URL query parameter.
      // This is Gemini's documented authentication method, not a security bug.
      // For production, consider using a proxy server to hide the API key from client-side code.
      const wsUrl = `${this.wsBaseUrl}?key=${this.apiKey}`;

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => {
            ws.close();
            reject(
              RealtimeError.timeout(
                "connect",
                (config.providerOptions?.timeout as number) ?? 30000,
                "gemini-live",
              ),
            );
          },
          (config.providerOptions?.timeout as number) ?? 30000,
        );

        ws.onopen = () => {
          clearTimeout(timeout);
          resolve();
        };

        ws.onerror = (error) => {
          clearTimeout(timeout);
          reject(
            RealtimeError.connectionFailed(
              error instanceof Error ? error.message : "Connection failed",
              error instanceof Error ? error : undefined,
              "gemini-live",
            ),
          );
        };
      });

      // Generate session ID
      const sessionId = `gemini_live_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create session
      this.session = new GeminiLiveSession(sessionId, ws, geminiConfig);
      this.sessionConfig = config;

      // Send setup message
      const setupMessage: Record<string, unknown> = {
        setup: {
          model: `models/${model}`,
        },
      };

      // Add generation config
      const generationConfig: Record<string, unknown> = {
        responseModalities: geminiConfig.generationConfig
          ?.responseModalities ?? ["AUDIO"],
      };

      if (config.temperature !== undefined) {
        generationConfig.temperature = config.temperature;
      }
      if (geminiConfig.generationConfig?.topP !== undefined) {
        generationConfig.topP = geminiConfig.generationConfig.topP;
      }
      if (geminiConfig.generationConfig?.topK !== undefined) {
        generationConfig.topK = geminiConfig.generationConfig.topK;
      }
      if (
        config.maxResponseOutputTokens &&
        config.maxResponseOutputTokens !== "inf"
      ) {
        generationConfig.maxOutputTokens = config.maxResponseOutputTokens;
      }

      // Add voice config
      if (config.voice) {
        generationConfig.speechConfig = {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: config.voice,
            },
          },
        };
      }

      setupMessage.setup = {
        ...(setupMessage.setup as Record<string, unknown>),
        generationConfig,
      };

      // Add system instruction
      if (config.instructions) {
        (setupMessage.setup as Record<string, unknown>).systemInstruction = {
          parts: [{ text: config.instructions }],
        };
      }

      // Add safety settings
      if (geminiConfig.safetySettings) {
        (setupMessage.setup as Record<string, unknown>).safetySettings =
          geminiConfig.safetySettings;
      }

      // Add tools if registered
      if (geminiConfig.providerOptions?.tools) {
        (setupMessage.setup as Record<string, unknown>).tools =
          geminiConfig.providerOptions.tools;
      }

      // Send setup
      ws.send(JSON.stringify(setupMessage));

      // Wait for setup complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(RealtimeError.timeout("setup", 10000, "gemini-live"));
        }, 10000);

        const handler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data as string) as {
              setupComplete?: boolean;
            };
            if (data.setupComplete) {
              clearTimeout(timeout);
              ws.removeEventListener("message", handler);
              resolve();
            }
          } catch {
            // Continue waiting
          }
        };

        ws.addEventListener("message", handler);
      });

      return this.session;
    } catch (err) {
      if (err instanceof RealtimeError) {
        throw err;
      }

      throw new RealtimeError({
        code: REALTIME_ERROR_CODES.CONNECTION_FAILED,
        message: `Failed to connect to Gemini Live: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
        provider: "gemini-live",
      });
    }
  }

  /**
   * Check if connected to a session
   */
  isConnected(): boolean {
    return this.session?.isOpen() ?? false;
  }

  /**
   * Disconnect from the current session
   */
  async disconnect(): Promise<void> {
    if (this.session) {
      this.session.close();
      this.session = null;
      this.sessionConfig = null;
    }
  }

  /**
   * Get current session configuration
   */
  getSessionConfig(): RealtimeConfig | null {
    return this.sessionConfig;
  }
}
