/**
 * Google Gemini Live Voice API Handler
 *
 * Implementation of bidirectional voice communication using Gemini's Live API.
 *
 * @module voice/providers/GeminiLive
 */

import type WebSocket from "ws";
import { logger } from "../../utils/logger.js";
import { RealtimeError } from "../errors.js";
import { BaseRealtimeHandler } from "../RealtimeVoiceAPI.js";
import type {
  AudioFormat,
  GeminiMessage,
  GeminiResponse,
  RealtimeAudioChunk,
  RealtimeConfig,
  RealtimeSession,
} from "../../types/index.js";

/**
 * Google Gemini Live Voice API Handler
 *
 * Implements bidirectional voice communication with Gemini's Live API.
 *
 * @see https://ai.google.dev/gemini-api/docs/live
 */
export class GeminiLive extends BaseRealtimeHandler {
  readonly name = "gemini-live";

  private readonly apiKey: string | null;
  private ws: WebSocket | null = null;
  private audioChunkIndex = 0;
  private pendingFunctionCalls = new Map<string, string>();

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey ?? process.env.GOOGLE_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["opus", "wav"];
  }

  async connect(config: RealtimeConfig): Promise<RealtimeSession> {
    if (!this.apiKey) {
      throw RealtimeError.providerNotConfigured("gemini-live");
    }

    if (this.isConnected()) {
      throw RealtimeError.sessionAlreadyActive("gemini-live");
    }

    this.emitStateChange("connecting");

    try {
      // Import WebSocket
      const { default: WebSocket } = await import("ws");

      // Determine model
      const model =
        config.model ?? "gemini-2.5-flash-native-audio-preview-09-2025";

      // Connect to Gemini Live API
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${this.apiKey}`;

      this.ws = new WebSocket(wsUrl);

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Connection timeout"));
        }, config.timeout ?? 30000);

        this.ws!.on("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        this.ws!.on("error", (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // Set up message handler
      this.ws.on("message", (data: Buffer) => {
        this.handleMessage(data);
      });

      this.ws.on("close", () => {
        this.emitStateChange("disconnected");
        this.session = null;
      });

      this.ws.on("error", (err) => {
        this.emitError(err);
      });

      // Send setup message
      await this.sendSetup(config, model);

      // Wait for setup complete
      await this.waitForSetupComplete();

      // Generate session ID
      const sessionId = `gemini-${Date.now()}`;

      // Create session object
      this.session = this.createSession(sessionId, config);
      this.emitStateChange("connected");

      logger.info(`[GeminiLiveHandler] Connected to session: ${sessionId}`);

      return this.session;
    } catch (err: unknown) {
      this.emitStateChange("error");
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.connectionFailed(
        errorMessage,
        "gemini-live",
        err instanceof Error ? err : undefined,
      );
    }
  }

  async disconnect(): Promise<void> {
    if (!this.ws) {
      return;
    }

    this.emitStateChange("disconnecting");

    try {
      this.ws.close();
      this.ws = null;
      this.session = null;
      this.audioChunkIndex = 0;
      this.pendingFunctionCalls.clear();
      this.emitStateChange("disconnected");
      logger.info("[GeminiLiveHandler] Disconnected");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.protocolError(
        `Disconnect failed: ${errorMessage}`,
        "gemini-live",
        err instanceof Error ? err : undefined,
      );
    }
  }

  async sendAudio(audio: Buffer | RealtimeAudioChunk): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      throw RealtimeError.sessionNotActive("gemini-live");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : audio.data;

    // Send audio as realtime input
    const message: GeminiMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: audioBuffer.toString("base64"),
          },
        ],
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  async sendText(text: string): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      throw RealtimeError.sessionNotActive("gemini-live");
    }

    // Send text as client content
    const message: GeminiMessage = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws.send(JSON.stringify(message));
  }

  async triggerResponse(): Promise<void> {
    // Gemini automatically generates responses based on VAD
    // This is a no-op for Gemini Live
  }

  async cancelResponse(): Promise<void> {
    // Gemini doesn't have explicit cancel, but we can send empty content
    // to interrupt
    if (this.ws && this.isConnected()) {
      const message: GeminiMessage = {
        clientContent: {
          turns: [],
          turnComplete: true,
        },
      };
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send setup message with configuration
   */
  private async sendSetup(
    config: RealtimeConfig,
    model: string,
  ): Promise<void> {
    if (!this.ws) {
      return;
    }

    const setupMessage: GeminiMessage = {
      setup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ["AUDIO", "TEXT"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: config.voice ?? "Puck",
              },
            },
          },
        },
      },
    };

    // Add system instruction
    if (config.systemPrompt) {
      setupMessage.setup!.systemInstruction = {
        parts: [{ text: config.systemPrompt }],
      };
    }

    // Add tools
    if (config.tools && config.tools.length > 0) {
      setupMessage.setup!.tools = [
        {
          functionDeclarations: config.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ];
    }

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Wait for setup complete message
   */
  private waitForSetupComplete(): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for setup complete"));
      }, 10000);

      const handler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString()) as GeminiResponse;
          if (response.setupComplete) {
            clearTimeout(timeout);
            this.ws?.off("message", handler);
            resolve();
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws?.on("message", handler);
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: Buffer): void {
    try {
      const response = JSON.parse(data.toString()) as GeminiResponse;

      if (response.serverContent) {
        const content = response.serverContent;

        // Handle model turn
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            // Handle text
            if (part.text) {
              this.emitText(part.text, content.turnComplete ?? false);
            }

            // Handle audio
            if (part.inlineData) {
              const audioData = Buffer.from(part.inlineData.data, "base64");
              this.emitAudio({
                data: audioData,
                index: this.audioChunkIndex++,
                isFinal: content.turnComplete ?? false,
                format: this.parseAudioFormat(part.inlineData.mimeType),
                sampleRate: 24000,
              });
            }
          }
        }

        // Handle turn complete
        if (content.turnComplete) {
          this.emitTurnEnd();
          this.audioChunkIndex = 0;
        }

        // Handle interruption
        if (content.interrupted) {
          this.emitTurnEnd();
          this.audioChunkIndex = 0;
        }
      }

      // Handle tool calls
      if (response.toolCall?.functionCalls) {
        for (const call of response.toolCall.functionCalls) {
          this.pendingFunctionCalls.set(call.id, call.name);
          this.handleFunctionCall(call.id, call.name, call.args);
        }
      }

      // Handle tool call cancellation
      if (response.toolCallCancellation?.ids) {
        for (const id of response.toolCallCancellation.ids) {
          this.pendingFunctionCalls.delete(id);
        }
      }
    } catch (err: unknown) {
      logger.warn(
        `[GeminiLiveHandler] Failed to parse message: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Parse audio format from MIME type
   */
  private parseAudioFormat(mimeType: string): AudioFormat {
    if (mimeType.includes("opus")) {
      return "opus";
    }
    if (mimeType.includes("wav") || mimeType.includes("pcm")) {
      return "wav";
    }
    if (mimeType.includes("mp3") || mimeType.includes("mpeg")) {
      return "mp3";
    }
    return "opus";
  }

  /**
   * Handle function call from model
   */
  private async handleFunctionCall(
    callId: string,
    name: string,
    args: Record<string, unknown>,
  ): Promise<void> {
    try {
      const result = await this.emitFunctionCall(name, args);

      // Send function response
      if (this.ws && this.isConnected()) {
        const responseMessage = {
          toolResponse: {
            functionResponses: [
              {
                id: callId,
                name,
                response: { result },
              },
            ],
          },
        };

        this.ws.send(JSON.stringify(responseMessage));
        this.pendingFunctionCalls.delete(callId);
      }
    } catch (err: unknown) {
      const error =
        err instanceof Error
          ? err
          : new Error(String(err || "Function call failed"));
      logger.error(
        `[GeminiLiveHandler] Function call failed: ${error.message}`,
      );
      this.emitError(error);
    }
  }
}
