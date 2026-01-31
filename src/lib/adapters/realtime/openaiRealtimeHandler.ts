/**
 * OpenAI Realtime Voice Handler
 *
 * Handler for OpenAI's Realtime API for bidirectional voice communication.
 *
 * @module adapters/realtime/openaiRealtimeHandler
 * @see https://platform.openai.com/docs/guides/realtime
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
 * OpenAI Realtime-specific configuration
 */
export type OpenAIRealtimeConfig = RealtimeConfig & {
  /** Model: gpt-4o-realtime-preview */
  model?: "gpt-4o-realtime-preview" | "gpt-4o-realtime-preview-2024-10-01";
  /** Modalities: text, audio, or both */
  modalities?: Array<"text" | "audio">;
  /** Input audio transcription model */
  inputAudioTranscription?: {
    model: "whisper-1";
  };
};

/**
 * OpenAI Realtime voices
 */
export type OpenAIRealtimeVoice =
  | "alloy"
  | "ash"
  | "ballad"
  | "coral"
  | "echo"
  | "sage"
  | "shimmer"
  | "verse";

/**
 * OpenAI Realtime session implementation
 */
class OpenAIRealtimeSession implements RealtimeSession {
  readonly id: string;
  private ws: WebSocket | null = null;
  private eventHandlers = new Map<
    RealtimeEventType,
    Set<(event: RealtimeEvent) => void>
  >();
  private config: OpenAIRealtimeConfig;
  private tools: RealtimeTool[] = [];

  constructor(id: string, ws: WebSocket, config: OpenAIRealtimeConfig) {
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
        const data = JSON.parse(event.data as string) as {
          type: RealtimeEventType;
          event_id?: string;
          [key: string]: unknown;
        };
        const realtimeEvent: RealtimeEvent = {
          type: data.type,
          eventId: data.event_id,
          timestamp: Date.now(),
          data,
        };
        this.emitEvent(realtimeEvent);
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

  private send(event: Record<string, unknown>): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw RealtimeError.connectionClosed(
        "WebSocket not connected",
        this.id,
        "openai-realtime",
      );
    }
    this.ws.send(JSON.stringify(event));
  }

  sendAudio(audio: Buffer | ArrayBuffer): void {
    const base64Audio =
      audio instanceof ArrayBuffer
        ? Buffer.from(audio).toString("base64")
        : audio.toString("base64");

    this.send({
      type: "input_audio_buffer.append",
      audio: base64Audio,
    });
  }

  commitAudio(): void {
    this.send({
      type: "input_audio_buffer.commit",
    });
  }

  clearAudio(): void {
    this.send({
      type: "input_audio_buffer.clear",
    });
  }

  sendText(text: string): void {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    });
  }

  createResponse(): void {
    this.send({
      type: "response.create",
    });
  }

  cancelResponse(): void {
    this.send({
      type: "response.cancel",
    });
  }

  updateSession(config: Partial<RealtimeConfig>): void {
    const sessionConfig: Record<string, unknown> = {};

    if (config.voice) {
      sessionConfig.voice = config.voice;
    }
    if (config.instructions) {
      sessionConfig.instructions = config.instructions;
    }
    if (config.turnDetection) {
      sessionConfig.turn_detection =
        config.turnDetection === "server_vad"
          ? {
              type: "server_vad",
              threshold: config.vadThreshold ?? 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            }
          : null;
    }
    if (config.maxResponseOutputTokens) {
      sessionConfig.max_response_output_tokens = config.maxResponseOutputTokens;
    }
    if (config.temperature !== undefined) {
      sessionConfig.temperature = config.temperature;
    }

    this.send({
      type: "session.update",
      session: sessionConfig,
    });

    // Update local config
    this.config = { ...this.config, ...config } as OpenAIRealtimeConfig;
  }

  registerTools(tools: RealtimeTool[]): void {
    this.tools = tools;

    const openaiTools = tools.map((tool) => ({
      type: "function",
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));

    this.send({
      type: "session.update",
      session: {
        tools: openaiTools,
      },
    });
  }

  sendFunctionResult(callId: string, result: string): void {
    this.send({
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: result,
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
 * OpenAI Realtime Voice Handler
 *
 * Provides bidirectional voice communication using OpenAI's Realtime API.
 *
 * @example
 * ```typescript
 * const handler = new OpenAIRealtimeHandler();
 *
 * const session = await handler.connect({
 *   model: "gpt-4o-realtime-preview",
 *   voice: "alloy",
 *   instructions: "You are a helpful assistant.",
 * });
 *
 * session.on("response.audio.delta", (event) => {
 *   // Handle audio chunks
 * });
 *
 * session.sendAudio(audioBuffer);
 * session.commitAudio();
 * ```
 */
export class OpenAIRealtimeHandler implements RealtimeVoiceProvider {
  readonly name = "openai-realtime";
  private readonly apiKey: string | null;
  private readonly wsUrl: string;
  private session: OpenAIRealtimeSession | null = null;
  private sessionConfig: RealtimeConfig | null = null;

  /**
   * Available voices for OpenAI Realtime
   */
  static readonly VOICES: OpenAIRealtimeVoice[] = [
    "alloy",
    "ash",
    "ballad",
    "coral",
    "echo",
    "sage",
    "shimmer",
    "verse",
  ];

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
    this.wsUrl = "wss://api.openai.com/v1/realtime";
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
      return { valid: false, errors: ["OPENAI_API_KEY not configured"] };
    }
    return { valid: true, errors: [] };
  }

  /**
   * Connect to a realtime session
   */
  async connect(config: RealtimeConfig): Promise<RealtimeSession> {
    if (!this.apiKey) {
      throw RealtimeError.notConfigured("openai-realtime");
    }

    if (this.session?.isOpen()) {
      await this.disconnect();
    }

    const openaiConfig = config as OpenAIRealtimeConfig;
    const model = openaiConfig.model ?? "gpt-4o-realtime-preview";

    try {
      const wsUrlWithModel = `${this.wsUrl}?model=${model}`;

      // Create WebSocket connection with environment-appropriate method
      const ws = await this.createWebSocket(wsUrlWithModel);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => {
            ws.close();
            reject(
              RealtimeError.timeout(
                "connect",
                (config.providerOptions?.timeout as number) ?? 30000,
                "openai-realtime",
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
              "openai-realtime",
            ),
          );
        };
      });

      // Generate session ID
      const sessionId = `oai_rt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Create session
      this.session = new OpenAIRealtimeSession(sessionId, ws, openaiConfig);
      this.sessionConfig = config;

      // Configure session
      const sessionUpdate: Record<string, unknown> = {
        modalities: openaiConfig.modalities ?? ["text", "audio"],
      };

      if (config.voice) {
        sessionUpdate.voice = config.voice;
      }
      if (config.instructions) {
        sessionUpdate.instructions = config.instructions;
      }
      if (config.turnDetection) {
        sessionUpdate.turn_detection =
          config.turnDetection === "server_vad"
            ? {
                type: "server_vad",
                threshold: config.vadThreshold ?? 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              }
            : null;
      }
      if (config.inputFormat) {
        sessionUpdate.input_audio_format = config.inputFormat.encoding;
      }
      if (config.outputFormat) {
        sessionUpdate.output_audio_format = config.outputFormat.encoding;
      }
      if (openaiConfig.inputAudioTranscription) {
        sessionUpdate.input_audio_transcription =
          openaiConfig.inputAudioTranscription;
      }
      if (config.maxResponseOutputTokens) {
        sessionUpdate.max_response_output_tokens =
          config.maxResponseOutputTokens;
      }
      if (config.temperature !== undefined) {
        sessionUpdate.temperature = config.temperature;
      }

      // Send session update
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: sessionUpdate,
        }),
      );

      return this.session;
    } catch (err) {
      if (err instanceof RealtimeError) {
        throw err;
      }

      throw new RealtimeError({
        code: REALTIME_ERROR_CODES.CONNECTION_FAILED,
        message: `Failed to connect to OpenAI Realtime: ${err instanceof Error ? err.message : "Unknown error"}`,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        retriable: true,
        originalError: err instanceof Error ? err : undefined,
        provider: "openai-realtime",
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

  /**
   * Create WebSocket connection with environment-appropriate method
   *
   * Browser WebSocket doesn't support headers parameter, so we need
   * to handle Node.js and browser environments differently.
   */
  private async createWebSocket(url: string): Promise<WebSocket> {
    // Check if we're in Node.js or browser
    const isNode = typeof window === "undefined";

    if (isNode) {
      // Node.js: Use ws package with headers
      const { WebSocket: NodeWebSocket } = await import("ws");
      return new NodeWebSocket(url, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      }) as unknown as WebSocket;
    } else {
      // Browser: Can't set headers, must use query param or different auth
      // OpenAI Realtime doesn't support browser directly - document limitation
      throw new RealtimeError({
        code: REALTIME_ERROR_CODES.INVALID_CONFIGURATION,
        message:
          "OpenAI Realtime API is not supported in browser environments. Use server-side implementation.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        provider: "openai-realtime",
      });
    }
  }
}
