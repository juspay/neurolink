/**
 * Phase 3: SSE Chat Utilities
 * Server-Sent Events handler for real-time chat
 */

import type { AIProvider } from "../core/types.js";
import type {
  ChatRequest,
  SSEOptions,
  SSEEvent,
  StreamingChatResponse,
  ChatMessage,
} from "./types.js";
import { ChatSession } from "./session.js";

export class SSEChatHandler {
  private connections = new Map<string, WritableStreamDefaultWriter>();
  protected provider: AIProvider;
  protected options: Required<SSEOptions>;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(provider: AIProvider, options: SSEOptions = {}) {
    this.provider = provider;
    this.options = {
      maxConnections: options.maxConnections ?? 100,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      connectionTimeout: options.connectionTimeout ?? 300000,
      enableCors: options.enableCors ?? true,
      corsOrigins: options.corsOrigins ?? ["*"],
    };

    this.startHeartbeat();
  }

  /**
   * Handle incoming chat request and return SSE response
   */
  async handleChatRequest(request: ChatRequest): Promise<Response> {
    const { sessionId, message, options = {} } = request;
    const session = new ChatSession(sessionId);

    // Add user message to session
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: message,
      timestamp: Date.now(),
    };

    session.addMessage(userMessage.role, userMessage.content);

    // Create SSE stream
    const stream = this.createEventStream(sessionId, async (writer) => {
      try {
        // Send initial event
        await this.sendEvent(writer, {
          type: "data",
          data: { type: "start", sessionId, messageId: userMessage.id },
        });

        // Generate AI response with streaming
        const aiResponse = await this.provider.stream({
          input: { text: message },
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt,
        });

        if (aiResponse?.stream) {
          // Convert async iterable to readable stream
          const reader = aiResponse.stream as any;
          let fullResponse = "";

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                break;
              }

              fullResponse += value;

              // Send chunk to client
              await this.sendEvent(writer, {
                type: "data",
                data: {
                  type: "chunk",
                  content: value,
                  sessionId,
                },
              });
            }
          } finally {
            reader.releaseLock();
          }

          // Add AI response to session
          const assistantMessage: ChatMessage = {
            id: `msg_${Date.now()}_assistant`,
            role: "assistant",
            content: fullResponse,
            timestamp: Date.now(),
            metadata: {
              provider: this.provider.constructor.name || "unknown",
              model: "default",
            },
          };

          session.addMessage(assistantMessage.role, assistantMessage.content);

          // Send completion event
          await this.sendEvent(writer, {
            type: "complete",
            data: {
              type: "complete",
              sessionId,
              messageId: assistantMessage.id,
              totalTokens: fullResponse.length, // Rough estimate
            },
          });
        }

        // Persist session
        await session.persist();
      } catch (error) {
        await this.sendEvent(writer, {
          type: "error",
          data: {
            type: "error",
            message: error instanceof Error ? error.message : "Unknown error",
            sessionId,
          },
        });
      }
    });

    return new Response(stream, {
      headers: this.getSSEHeaders(),
    });
  }

  /**
   * Create event stream for a session
   */
  createEventStream(
    sessionId: string,
    handler?: (writer: WritableStreamDefaultWriter) => Promise<void>,
  ): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
      start: async (controller) => {
        // Check connection limits
        if (this.connections.size >= this.options.maxConnections) {
          controller.error(new Error("Maximum connections exceeded"));
          return;
        }

        const { writable, readable } = new TransformStream();
        const writer = writable.getWriter();

        // Store connection
        this.connections.set(sessionId, writer);

        // Setup connection timeout
        const timeout = setTimeout(() => {
          this.closeConnection(sessionId);
        }, this.options.connectionTimeout);

        try {
          if (handler) {
            await handler(writer);
          }
        } catch (error) {
          console.error("SSE Handler error:", error);
        } finally {
          clearTimeout(timeout);
          this.closeConnection(sessionId);
        }

        // Pipe the readable side to controller
        const reader = readable.getReader();

        const pump = async (): Promise<void> => {
          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) {
                controller.close();
                break;
              }

              controller.enqueue(value);
            }
          } catch (error) {
            controller.error(error);
          } finally {
            reader.releaseLock();
          }
        };

        pump();
      },

      cancel: () => {
        this.closeConnection(sessionId);
      },
    });
  }

  /**
   * Send SSE event to client
   */
  private async sendEvent(
    writer: WritableStreamDefaultWriter,
    event: SSEEvent,
  ): Promise<void> {
    const encoder = new TextEncoder();

    let eventText = "";

    if (event.id) {
      eventText += `id: ${event.id}\n`;
    }

    if (event.retry) {
      eventText += `retry: ${event.retry}\n`;
    }

    eventText += `event: ${event.type}\n`;
    eventText += `data: ${JSON.stringify(event.data)}\n\n`;

    await writer.write(encoder.encode(eventText));
  }

  /**
   * Get SSE response headers
   */
  private getSSEHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    };

    if (this.options.enableCors) {
      headers["Access-Control-Allow-Origin"] =
        this.options.corsOrigins.join(", ");
      headers["Access-Control-Allow-Headers"] = "Cache-Control";
    }

    return headers;
  }

  /**
   * Close connection and cleanup
   */
  private async closeConnection(sessionId: string): Promise<void> {
    const writer = this.connections.get(sessionId);

    if (writer) {
      try {
        await writer.close();
      } catch (error) {
        // Ignore close errors
      }

      this.connections.delete(sessionId);
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(async () => {
      const heartbeatEvent: SSEEvent = {
        type: "heartbeat",
        data: { timestamp: Date.now() },
      };

      // Send heartbeat to all connections
      for (const [sessionId, writer] of this.connections) {
        try {
          await this.sendEvent(writer, heartbeatEvent);
        } catch (error) {
          // Remove failed connections
          this.closeConnection(sessionId);
        }
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Cleanup and stop handler
   */
  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    for (const sessionId of this.connections.keys()) {
      this.closeConnection(sessionId);
    }

    this.connections.clear();
  }

  /**
   * Get handler statistics
   */
  getStats(): {
    activeConnections: number;
    maxConnections: number;
    uptime: number;
  } {
    return {
      activeConnections: this.connections.size,
      maxConnections: this.options.maxConnections,
      uptime: process.uptime() * 1000,
    };
  }
}
