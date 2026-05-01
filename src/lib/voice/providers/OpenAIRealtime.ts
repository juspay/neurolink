/**
 * OpenAI Realtime Voice API Handler
 *
 * Implementation of bidirectional voice communication using OpenAI's Realtime API.
 *
 * @module voice/providers/OpenAIRealtime
 */

import type WebSocket from "ws";
import { logger } from "../../utils/logger.js";
import { RealtimeError } from "../errors.js";
import { BaseRealtimeHandler } from "../RealtimeVoiceAPI.js";
import type {
  AudioFormat,
  OpenAIAudioDelta,
  OpenAIRealtimeEvent,
  OpenAISessionCreated,
  OpenAITranscriptDelta,
  RealtimeAudioChunk,
  RealtimeConfig,
  RealtimeSession,
} from "../../types/index.js";

/**
 * OpenAI Realtime API Handler
 *
 * Implements bidirectional voice communication with OpenAI's Realtime API.
 *
 * @see https://platform.openai.com/docs/api-reference/realtime
 */
export class OpenAIRealtime extends BaseRealtimeHandler {
  readonly name = "openai-realtime";

  private readonly apiKey: string | null;
  private ws: WebSocket | null = null;
  private audioChunkIndex = 0;

  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey ?? process.env.OPENAI_API_KEY ?? null;
  }

  isConfigured(): boolean {
    return this.apiKey !== null;
  }

  getSupportedFormats(): AudioFormat[] {
    return ["wav", "opus"];
  }

  async connect(config: RealtimeConfig): Promise<RealtimeSession> {
    if (!this.apiKey) {
      throw RealtimeError.providerNotConfigured("openai-realtime");
    }

    if (this.isConnected()) {
      throw RealtimeError.sessionAlreadyActive("openai-realtime");
    }

    this.emitStateChange("connecting");

    try {
      // Import WebSocket
      const { default: WebSocket } = await import("ws");

      // Determine model
      const model = config.model ?? "gpt-4o-realtime-preview-2024-12-17";

      // Connect to OpenAI Realtime API
      const wsUrl = `wss://api.openai.com/v1/realtime?model=${model}`;

      this.ws = new WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "OpenAI-Beta": "realtime=v1",
        },
      });

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

      // Send session update with configuration
      await this.sendSessionUpdate(config);

      // Wait for session.created event
      const sessionId = await this.waitForSessionCreated();

      // Create session object
      this.session = this.createSession(sessionId, config);
      this.emitStateChange("connected");

      logger.info(`[OpenAIRealtimeHandler] Connected to session: ${sessionId}`);

      return this.session;
    } catch (err: unknown) {
      this.emitStateChange("error");
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.connectionFailed(
        errorMessage,
        "openai-realtime",
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
      this.emitStateChange("disconnected");
      logger.info("[OpenAIRealtimeHandler] Disconnected");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : String(err || "Unknown error");
      throw RealtimeError.protocolError(
        `Disconnect failed: ${errorMessage}`,
        "openai-realtime",
        err instanceof Error ? err : undefined,
      );
    }
  }

  async sendAudio(audio: Buffer | RealtimeAudioChunk): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      throw RealtimeError.sessionNotActive("openai-realtime");
    }

    const audioBuffer = Buffer.isBuffer(audio) ? audio : audio.data;

    // Send audio append event
    const event = {
      type: "input_audio_buffer.append",
      audio: audioBuffer.toString("base64"),
    };

    this.ws.send(JSON.stringify(event));
  }

  async sendText(text: string): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      throw RealtimeError.sessionNotActive("openai-realtime");
    }

    // Send conversation item create event
    const event = {
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
    };

    this.ws.send(JSON.stringify(event));

    // Trigger response
    await this.triggerResponse();
  }

  async triggerResponse(): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      throw RealtimeError.sessionNotActive("openai-realtime");
    }

    // Commit audio buffer
    this.ws.send(
      JSON.stringify({
        type: "input_audio_buffer.commit",
      }),
    );

    // Create response
    this.ws.send(
      JSON.stringify({
        type: "response.create",
      }),
    );
  }

  async cancelResponse(): Promise<void> {
    if (!this.ws || !this.isConnected()) {
      return;
    }

    this.ws.send(
      JSON.stringify({
        type: "response.cancel",
      }),
    );
  }

  /**
   * Send session update with configuration
   */
  private async sendSessionUpdate(config: RealtimeConfig): Promise<void> {
    if (!this.ws) {
      return;
    }

    const sessionConfig: Record<string, unknown> = {
      modalities: ["text", "audio"],
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      input_audio_transcription: {
        model: "whisper-1",
      },
    };

    // Add voice if specified
    if (config.voice) {
      sessionConfig.voice = config.voice;
    }

    // Add turn detection
    if (config.turnDetection) {
      sessionConfig.turn_detection = {
        type: config.turnDetection,
        threshold: config.vadThreshold ?? 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500,
      };
    }

    // Add system prompt
    if (config.systemPrompt) {
      sessionConfig.instructions = config.systemPrompt;
    }

    // Add tools
    if (config.tools && config.tools.length > 0) {
      sessionConfig.tools = config.tools.map((tool) => ({
        type: "function",
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      }));
    }

    const event = {
      type: "session.update",
      session: sessionConfig,
    };

    this.ws.send(JSON.stringify(event));
  }

  /**
   * Wait for session.created event
   */
  private waitForSessionCreated(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Timeout waiting for session.created"));
      }, 10000);

      const handler = (data: Buffer) => {
        try {
          const event = JSON.parse(data.toString()) as OpenAIRealtimeEvent;
          if (event.type === "session.created") {
            clearTimeout(timeout);
            this.ws?.off("message", handler);
            const sessionEvent = event as OpenAISessionCreated;
            resolve(sessionEvent.session.id);
          } else if (event.type === "error") {
            clearTimeout(timeout);
            this.ws?.off("message", handler);
            reject(
              new Error(
                (event as { error?: { message?: string } }).error?.message ??
                  "Unknown error",
              ),
            );
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
      const event = JSON.parse(data.toString()) as OpenAIRealtimeEvent;

      switch (event.type) {
        case "response.audio.delta": {
          const audioEvent = event as OpenAIAudioDelta;
          const audioData = Buffer.from(audioEvent.delta, "base64");
          this.emitAudio({
            data: audioData,
            index: this.audioChunkIndex++,
            isFinal: false,
            format: "wav",
            sampleRate: 24000,
          });
          break;
        }

        case "response.audio.done": {
          // Audio stream complete
          this.emitAudio({
            data: Buffer.alloc(0),
            index: this.audioChunkIndex++,
            isFinal: true,
            format: "wav",
            sampleRate: 24000,
          });
          break;
        }

        case "response.audio_transcript.delta": {
          const transcriptEvent = event as OpenAITranscriptDelta;
          if (transcriptEvent.delta) {
            this.emitText(transcriptEvent.delta, false);
          }
          break;
        }

        case "response.audio_transcript.done": {
          // Final transcript
          const finalEvent = event as { transcript?: string };
          if (finalEvent.transcript) {
            this.emitText(finalEvent.transcript, true);
          }
          break;
        }

        case "conversation.item.input_audio_transcription.completed": {
          const transcriptEvent = event as OpenAITranscriptDelta;
          if (transcriptEvent.transcript) {
            this.emitTranscript(transcriptEvent.transcript, true);
          }
          break;
        }

        case "response.function_call_arguments.done": {
          const funcEvent = event as {
            name?: string;
            call_id?: string;
            arguments?: string;
          };
          if (funcEvent.name && funcEvent.call_id && funcEvent.arguments) {
            try {
              const args = JSON.parse(funcEvent.arguments) as Record<
                string,
                unknown
              >;
              this.handleFunctionCall(funcEvent.name, args, funcEvent.call_id);
            } catch {
              logger.warn(
                "[OpenAIRealtimeHandler] Failed to parse function arguments",
              );
            }
          }
          break;
        }

        case "response.done": {
          this.emitTurnEnd();
          this.audioChunkIndex = 0;
          break;
        }

        case "input_audio_buffer.speech_started": {
          this.emitTurnStart();
          break;
        }

        case "error": {
          const errorEvent = event as {
            error?: { type?: string; message?: string };
          };
          const errorMessage = errorEvent.error?.message ?? "Unknown error";
          this.emitError(new Error(errorMessage));
          break;
        }

        default:
          // Log unhandled events at debug level
          logger.debug(
            `[OpenAIRealtimeHandler] Unhandled event: ${event.type}`,
          );
      }
    } catch (err: unknown) {
      logger.warn(
        `[OpenAIRealtimeHandler] Failed to parse message: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Handle function call from model
   */
  private async handleFunctionCall(
    name: string,
    args: Record<string, unknown>,
    callId: string,
  ): Promise<void> {
    try {
      const result = await this.emitFunctionCall(name, args);

      // Send function result back
      if (this.ws && this.isConnected()) {
        this.ws.send(
          JSON.stringify({
            type: "conversation.item.create",
            item: {
              type: "function_call_output",
              call_id: callId,
              output: JSON.stringify(result),
            },
          }),
        );

        // Trigger response with function result
        await this.triggerResponse();
      }
    } catch (err: unknown) {
      logger.error(
        `[OpenAIRealtimeHandler] Function call failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
