/**
 * Data Stream Protocol Implementation
 * Implements a protocol for streaming structured data between server and client
 * Compatible with AI SDK's data stream format
 */

import type {
  CloseHandler,
  DataStreamEvent,
  DataStreamEventType,
  DataStreamResponseConfig,
  DataStreamWriter,
  DataStreamWriterConfig,
  FinishEvent,
  SSEEventOptions,
} from "../../types/index.js";
// ============================================
// Data Stream Writer Implementation
// ============================================

/**
 * Creates a data stream writer
 */
export function createDataStreamWriter(
  config: DataStreamWriterConfig,
): DataStreamWriter {
  const { write, close, format = "sse", includeTimestamps = true } = config;

  const formatEvent = (event: DataStreamEvent): string => {
    if (format === "sse") {
      // Server-Sent Events format
      const eventLine = `event: ${event.type}`;
      const dataLine = `data: ${JSON.stringify(event.data)}`;
      const idLine = event.id ? `id: ${event.id}` : "";

      const lines = [eventLine, dataLine];
      if (idLine) {
        lines.push(idLine);
      }

      return lines.join("\n") + "\n\n";
    } else {
      // NDJSON format
      return JSON.stringify(event) + "\n";
    }
  };

  const createEvent = (
    type: DataStreamEventType,
    data: unknown,
    id?: string,
  ): DataStreamEvent => ({
    type,
    id,
    timestamp: includeTimestamps ? Date.now() : 0,
    data,
  });

  const writeEvent = async (event: DataStreamEvent): Promise<void> => {
    const formatted = formatEvent(event);
    await write(formatted);
  };

  return {
    async writeTextStart(id: string): Promise<void> {
      await writeEvent(createEvent("text-start", { id }, id));
    },

    async writeTextDelta(id: string, delta: string): Promise<void> {
      await writeEvent(createEvent("text-delta", { id, delta }, id));
    },

    async writeTextEnd(id: string): Promise<void> {
      await writeEvent(createEvent("text-end", { id }, id));
    },

    async writeToolCall(toolCall: {
      id: string;
      name: string;
      arguments: Record<string, unknown>;
    }): Promise<void> {
      await writeEvent(createEvent("tool-call", toolCall, toolCall.id));
    },

    async writeToolResult(toolResult: {
      id: string;
      name: string;
      result: unknown;
    }): Promise<void> {
      await writeEvent(createEvent("tool-result", toolResult, toolResult.id));
    },

    async writeData(data: unknown): Promise<void> {
      await writeEvent(createEvent("data", data));
    },

    async writeError(error: { message: string; code?: string }): Promise<void> {
      await writeEvent(createEvent("error", error));
    },

    async close(): Promise<void> {
      if (close) {
        await close();
      }
    },
  };
}

// ============================================
// Data Stream Response
// ============================================

/**
 * Configuration for DataStreamResponse
 */

/**
 * Data stream response class
 * Creates a streaming response with writer interface
 */
export class DataStreamResponse {
  private writer: DataStreamWriter | null = null;
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private closed = false;
  private encoder = new TextEncoder();

  /** The readable stream */
  readonly stream: ReadableStream<Uint8Array>;

  /** Response headers */
  readonly headers: Record<string, string>;

  constructor(config: DataStreamResponseConfig = {}) {
    const {
      contentType = "text/event-stream",
      headers = {},
      keepAliveInterval,
      includeTimestamps = true,
    } = config;

    this.headers = {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...headers,
    };

    const format = contentType === "text/event-stream" ? "sse" : "ndjson";

    // Create the readable stream
    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;

        // Create the writer
        this.writer = createDataStreamWriter({
          write: (chunk: string) => {
            if (!this.closed && this.controller) {
              this.controller.enqueue(this.encoder.encode(chunk));
            }
          },
          close: () => {
            this.closeStream();
          },
          format,
          includeTimestamps,
        });

        // Set up keep-alive if configured
        if (keepAliveInterval && keepAliveInterval > 0) {
          this.keepAliveTimer = setInterval(() => {
            if (!this.closed && this.controller) {
              // Send SSE comment as keep-alive
              const keepAlive =
                format === "sse"
                  ? ": keep-alive\n\n"
                  : '{"type":"keep-alive"}\n';
              this.controller.enqueue(this.encoder.encode(keepAlive));
            }
          }, keepAliveInterval);
        }
      },

      cancel: () => {
        this.closeStream();
      },
    });
  }

  /**
   * Get the data stream writer
   */
  getWriter(): DataStreamWriter {
    if (!this.writer) {
      throw new Error("Stream not initialized");
    }
    return this.writer;
  }

  /**
   * Write text start event
   */
  async writeTextStart(id: string): Promise<void> {
    this.getWriter().writeTextStart(id);
  }

  /**
   * Write text delta event
   */
  async writeTextDelta(id: string, delta: string): Promise<void> {
    this.getWriter().writeTextDelta(id, delta);
  }

  /**
   * Write text end event
   */
  async writeTextEnd(id: string): Promise<void> {
    this.getWriter().writeTextEnd(id);
  }

  /**
   * Write tool call event
   */
  async writeToolCall(toolCall: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }): Promise<void> {
    this.getWriter().writeToolCall(toolCall);
  }

  /**
   * Write tool result event
   */
  async writeToolResult(toolResult: {
    id: string;
    name: string;
    result: unknown;
  }): Promise<void> {
    this.getWriter().writeToolResult(toolResult);
  }

  /**
   * Write arbitrary data event
   */
  async writeData(data: unknown): Promise<void> {
    this.getWriter().writeData(data);
  }

  /**
   * Write error event
   */
  async writeError(error: { message: string; code?: string }): Promise<void> {
    this.getWriter().writeError(error);
  }

  /**
   * Write finish event and close the stream
   */
  async finish(options?: {
    reason?: string;
    usage?: { input: number; output: number; total: number };
  }): Promise<void> {
    if (!this.closed && this.controller) {
      const event: FinishEvent = {
        type: "finish",
        timestamp: Date.now(),
        data: {
          reason: options?.reason,
          usage: options?.usage,
        },
      };

      const formatted =
        this.headers["Content-Type"] === "text/event-stream"
          ? `event: finish\ndata: ${JSON.stringify(event.data)}\n\n`
          : JSON.stringify(event) + "\n";

      this.controller.enqueue(this.encoder.encode(formatted));
    }

    this.closeStream();
  }

  /**
   * Close the stream
   */
  close(): void {
    this.closeStream();
  }

  /**
   * Check if stream is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  private closeStream(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;

    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }

    if (this.controller) {
      try {
        this.controller.close();
      } catch {
        // Ignore errors from already closed controller
      }
      this.controller = null;
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create a data stream response
 */
export function createDataStreamResponse(
  config?: DataStreamResponseConfig,
): DataStreamResponse {
  return new DataStreamResponse(config);
}

/**
 * Pipe an async iterable to a data stream response
 */
export async function pipeAsyncIterableToDataStream(
  iterable: AsyncIterable<unknown>,
  response: DataStreamResponse,
  options?: {
    textId?: string;
    onChunk?: (chunk: unknown) => void;
    onError?: (error: Error) => void;
  },
): Promise<void> {
  const textId = options?.textId ?? `text-${Date.now()}`;

  try {
    await response.writeTextStart(textId);

    for await (const chunk of iterable) {
      if (options?.onChunk) {
        options.onChunk(chunk);
      }

      if (typeof chunk === "string") {
        await response.writeTextDelta(textId, chunk);
      } else if (typeof chunk === "object" && chunk !== null) {
        const chunkObj = chunk as Record<string, unknown>;

        // Handle different chunk types
        if ("textDelta" in chunkObj) {
          await response.writeTextDelta(textId, String(chunkObj.textDelta));
        } else if ("toolCall" in chunkObj) {
          const toolCall = chunkObj.toolCall as {
            id: string;
            name: string;
            arguments: Record<string, unknown>;
          };
          await response.writeToolCall(toolCall);
        } else if ("toolResult" in chunkObj) {
          const toolResult = chunkObj.toolResult as {
            id: string;
            name: string;
            result: unknown;
          };
          await response.writeToolResult(toolResult);
        } else {
          await response.writeData(chunk);
        }
      }
    }

    await response.writeTextEnd(textId);
    await response.finish({ reason: "stop" });
  } catch (error) {
    if (options?.onError) {
      options.onError(error as Error);
    }

    await response.writeError({
      message: error instanceof Error ? error.message : String(error),
      code: "STREAM_ERROR",
    });

    response.close();
    throw error;
  }
}

/**
 * Create SSE headers for streaming responses
 */
export function createSSEHeaders(
  additionalHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    ...additionalHeaders,
  };
}

/**
 * Create NDJSON headers for streaming responses
 */
export function createNDJSONHeaders(
  additionalHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    ...additionalHeaders,
  };
}

// ============================================
// SSE Event Formatting (Legacy Compatibility)
// ============================================

/**
 * SSE Event options for formatSSEEvent
 */

/**
 * Format a Server-Sent Events (SSE) message
 *
 * @param options SSE event options
 * @returns Formatted SSE string
 *
 * @example
 * ```typescript
 * formatSSEEvent({ data: "Hello world" });
 * // => "data: Hello world\n\n"
 *
 * formatSSEEvent({ event: "message", data: "Test" });
 * // => "event: message\ndata: Test\n\n"
 *
 * formatSSEEvent({ data: "Line 1\nLine 2" });
 * // => "data: Line 1\ndata: Line 2\n\n"
 * ```
 */
export function formatSSEEvent(options: SSEEventOptions): string {
  const lines: string[] = [];

  if (options.id) {
    lines.push(`id: ${options.id}`);
  }

  if (options.event) {
    lines.push(`event: ${options.event}`);
  }

  if (options.retry !== undefined) {
    lines.push(`retry: ${options.retry}`);
  }

  // Handle multiline data by splitting and prefixing each line with "data: "
  const dataLines = options.data.split("\n");
  for (const line of dataLines) {
    lines.push(`data: ${line}`);
  }

  return lines.join("\n") + "\n\n";
}

// ============================================
// WebStreamWriter (Legacy Compatibility)
// ============================================

/**
 * Base class for data stream writers
 * Provides common functionality for streaming data
 */
export abstract class BaseDataStreamWriter {
  protected closed = false;
  protected closeHandlers: CloseHandler[] = [];

  /**
   * Check if the stream is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Register a close handler
   */
  onClose(handler: CloseHandler): void {
    this.closeHandlers.push(handler);
  }

  /**
   * Close the stream
   */
  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.doClose();

    for (const handler of this.closeHandlers) {
      try {
        handler();
      } catch {
        // Ignore errors in close handlers
      }
    }
  }

  /**
   * Subclass-specific close implementation
   */
  protected abstract doClose(): void;
}

/**
 * WebStreamWriter - Writes SSE events to a Web Streams API ReadableStream
 *
 * Provides a simple interface for creating streaming responses that can be
 * consumed by browsers and other HTTP clients.
 *
 * @example
 * ```typescript
 * const writer = new WebStreamWriter();
 *
 * // Write data events
 * writer.writeData({ message: "Hello" });
 *
 * // Write error events
 * writer.writeError("Something went wrong");
 *
 * // Write done event and close
 * writer.writeDone();
 * writer.close();
 *
 * // Use the stream
 * return new Response(writer.stream, {
 *   headers: { "Content-Type": "text/event-stream" }
 * });
 * ```
 */
export class WebStreamWriter extends BaseDataStreamWriter {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private encoder = new TextEncoder();

  /** The readable stream */
  readonly stream: ReadableStream<Uint8Array>;

  constructor() {
    super();

    this.stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        this.close();
      },
    });
  }

  /**
   * Write raw text to the stream
   */
  private write(text: string): void {
    if (!this.closed && this.controller) {
      this.controller.enqueue(this.encoder.encode(text));
    }
  }

  /**
   * Write a data event
   */
  writeData(data: unknown): void {
    const event = formatSSEEvent({
      event: "data",
      data: JSON.stringify(data),
    });
    this.write(event);
  }

  /**
   * Write an error event
   */
  writeError(message: string): void {
    const event = formatSSEEvent({
      event: "error",
      data: JSON.stringify({ error: message }),
    });
    this.write(event);
  }

  /**
   * Write a done event
   */
  writeDone(): void {
    const event = formatSSEEvent({
      event: "done",
      data: JSON.stringify({ status: "done" }),
    });
    this.write(event);
  }

  /**
   * Write a custom event
   */
  writeEvent(eventType: string, data: unknown): void {
    const event = formatSSEEvent({
      event: eventType,
      data: JSON.stringify(data),
    });
    this.write(event);
  }

  protected doClose(): void {
    if (this.controller) {
      try {
        this.controller.close();
      } catch {
        // Ignore errors from already closed controller
      }
      this.controller = null;
    }
  }
}
