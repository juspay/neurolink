/**
 * Real-time Streaming Support
 *
 * Provides dedicated streaming capabilities including Server-Sent Events (SSE),
 * WebSocket connections, and async iterators for real-time data streaming.
 *
 * @module @neurolink/client/streaming
 */

import type {
  // ClientConfig - not currently used but may be needed for future implementations
  StreamEvent,
  StreamCallbacks,
  StreamResult,
  ApiError,
  WebSocketOptions,
  WebSocketState,
  WebSocketMessageHandler,
} from "../types/clientTypes.js";
import type { JsonObject, UnknownRecord } from "../types/common.js";
import type { ToolCall, ToolResult } from "../types/streamTypes.js";
import { logger } from "../utils/logger.js";
import { combineSignals, sleep } from "./httpClient.js";

// =============================================================================
// Types
// =============================================================================

/**
 * SSE connection options
 */
export type SSEConnectionOptions = {
  /** Request headers */
  headers?: Record<string, string>;
  /** Request credentials */
  credentials?: RequestCredentials;
  /** Reconnect on disconnect */
  autoReconnect?: boolean;
  /** Reconnect delay in milliseconds */
  reconnectDelay?: number;
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number;
  /** Signal for request cancellation */
  signal?: AbortSignal;
};

/**
 * SSE connection state
 */
export type SSEConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";

/**
 * Streaming request options
 */
export type StreamingRequestOptions = {
  /** Input text or data */
  input: { text: string } & UnknownRecord;
  /** Provider to use */
  provider?: string;
  /** Model to use */
  model?: string;
  /** Temperature */
  temperature?: number;
  /** Maximum tokens */
  maxTokens?: number;
  /** System prompt */
  systemPrompt?: string;
  /** Enable tools */
  enableTools?: boolean;
  /** Context data */
  context?: UnknownRecord;
};

/**
 * Streaming event emitter interface
 */
export type StreamingEventEmitter = {
  on(event: "text", callback: (text: string) => void): void;
  on(event: "tool-call", callback: (toolCall: ToolCall) => void): void;
  on(event: "tool-result", callback: (toolResult: ToolResult) => void): void;
  on(event: "error", callback: (error: ApiError) => void): void;
  on(event: "done", callback: (result: StreamResult) => void): void;
  on(event: "metadata", callback: (metadata: JsonObject) => void): void;
  off(event: string, callback: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
};

// =============================================================================
// SSE Client
// =============================================================================

/**
 * Server-Sent Events (SSE) Client
 *
 * Provides a robust SSE connection with automatic reconnection,
 * event parsing, and async iterator support.
 *
 * @example Basic usage
 * ```typescript
 * const sse = new SSEClient('https://api.example.com/stream');
 *
 * sse.on('message', (data) => console.log(data));
 * sse.on('error', (error) => console.error(error));
 *
 * await sse.connect({ body: { prompt: 'Hello' } });
 * ```
 *
 * @example Async iterator usage
 * ```typescript
 * const sse = new SSEClient('https://api.example.com/stream');
 *
 * for await (const event of sse.events({ body: { prompt: 'Hello' } })) {
 *   if (event.type === 'text') {
 *     console.log(event.content);
 *   }
 * }
 * ```
 */
export class SSEClient {
  private url: string;
  private options: SSEConnectionOptions;
  private state: SSEConnectionState = "disconnected";
  private abortController: AbortController | null = null;
  private reconnectAttempts = 0;
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> =
    new Map();

  constructor(url: string, options: SSEConnectionOptions = {}) {
    this.url = url;
    this.options = {
      autoReconnect: options.autoReconnect ?? false,
      reconnectDelay: options.reconnectDelay ?? 1000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      ...options,
    };
  }

  /**
   * Connect to SSE endpoint
   */
  async connect(
    requestOptions: {
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): Promise<void> {
    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    this.state = "connecting";
    this.abortController = new AbortController();
    logger.debug(`[SSEClient] Connecting to ${this.url}`);

    // Combine signals if external signal provided
    const signal = this.options.signal
      ? combineSignals(this.options.signal, this.abortController.signal)
      : this.abortController.signal;

    try {
      const response = await fetch(this.url, {
        method: requestOptions.body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...this.options.headers,
          ...requestOptions.headers,
        },
        credentials: this.options.credentials,
        body: requestOptions.body
          ? JSON.stringify(requestOptions.body)
          : undefined,
        signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          code: "SSE_ERROR",
          message: `HTTP ${response.status}`,
          status: response.status,
        }));
        logger.debug(`[SSEClient] Connection failed: HTTP ${response.status}`);
        throw error;
      }

      this.state = "connected";
      this.reconnectAttempts = 0;
      this.emit("connected");
      logger.debug(`[SSEClient] Connected to ${this.url}`);

      await this.processStream(response);
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        this.state = "disconnected";
        logger.debug("[SSEClient] Connection aborted");
        return;
      }

      this.state = "error";
      this.emit("error", error);
      logger.debug("[SSEClient] Connection error", {
        message: (error as Error).message,
      });

      if (this.options.autoReconnect && this.shouldReconnect()) {
        await this.reconnect(requestOptions);
      }
    }
  }

  /**
   * Disconnect from SSE endpoint
   */
  disconnect(): void {
    logger.debug(`[SSEClient] Disconnecting from ${this.url}`);
    this.abortController?.abort();
    this.state = "disconnected";
    this.emit("disconnected");
  }

  /**
   * Process the SSE stream
   */
  private async processStream(response: Response): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          this.state = "disconnected";
          this.emit("disconnected");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              this.emit("done", { content: "" });
              continue;
            }

            try {
              const event = JSON.parse(data) as StreamEvent;
              this.handleEvent(event);
            } catch {
              // Ignore parse errors
            }
          } else if (line.startsWith("event: ")) {
            // Handle named events
            const eventName = line.slice(7);
            this.emit("event-type", eventName);
          } else if (line.startsWith("id: ")) {
            // Handle event IDs
            const eventId = line.slice(4);
            this.emit("event-id", eventId);
          } else if (line.startsWith("retry: ")) {
            // Handle retry directive
            const retryMs = parseInt(line.slice(7), 10);
            if (!isNaN(retryMs)) {
              this.options.reconnectDelay = retryMs;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Handle a stream event
   */
  private handleEvent(event: StreamEvent): void {
    this.emit("message", event);

    switch (event.type) {
      case "text":
        if (event.content) {
          this.emit("text", event.content);
        }
        break;
      case "tool-call":
        if (event.toolCall) {
          this.emit("tool-call", event.toolCall);
        }
        break;
      case "tool-result":
        if (event.toolResult) {
          this.emit("tool-result", event.toolResult);
        }
        break;
      case "error":
        if (event.error) {
          this.emit("error", event.error);
        }
        break;
      case "metadata":
        if (event.metadata) {
          this.emit("metadata", event.metadata);
        }
        break;
      case "audio":
        if (event.audio) {
          this.emit("audio", event.audio);
        }
        break;
      case "thinking":
        if (event.thinking) {
          this.emit("thinking", event.thinking);
        }
        break;
      case "done":
        this.emit("done", { content: "" });
        break;
    }
  }

  /**
   * Check if should attempt reconnection
   */
  private shouldReconnect(): boolean {
    return this.reconnectAttempts < (this.options.maxReconnectAttempts ?? 5);
  }

  /**
   * Attempt reconnection
   */
  private async reconnect(requestOptions: {
    body?: unknown;
    headers?: Record<string, string>;
  }): Promise<void> {
    this.state = "reconnecting";
    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts);

    const delayMs =
      (this.options.reconnectDelay ?? 1000) * this.reconnectAttempts;
    logger.debug(
      `[SSEClient] Reconnecting to ${this.url} (attempt ${this.reconnectAttempts}, delay ${delayMs}ms)`,
    );
    await sleep(delayMs);

    await this.connect(requestOptions);
  }

  /**
   * Register event handler
   */
  on(event: string, callback: (...args: unknown[]) => void): void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(callback);
  }

  /**
   * Remove event handler
   */
  off(event: string, callback: (...args: unknown[]) => void): void {
    this.eventHandlers.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) => handler(...args));
    }
  }

  /**
   * Get current connection state
   */
  getState(): SSEConnectionState {
    return this.state;
  }

  /**
   * Create async iterator for events
   *
   * @example
   * ```typescript
   * for await (const event of sse.events({ body: { prompt: 'Hello' } })) {
   *   console.log(event);
   * }
   * ```
   */
  async *events(
    requestOptions: {
      body?: unknown;
      headers?: Record<string, string>;
    } = {},
  ): AsyncGenerator<StreamEvent, void, unknown> {
    const events: StreamEvent[] = [];
    let done = false;
    let error: Error | null = null;
    let resolver: (() => void) | null = null;

    const onMessage = (event: StreamEvent) => {
      events.push(event);
      resolver?.();
    };

    const onDone = () => {
      done = true;
      resolver?.();
    };

    const onError = (err: Error) => {
      error = err;
      resolver?.();
    };

    this.on("message", onMessage as (...args: unknown[]) => void);
    this.on("done", onDone as (...args: unknown[]) => void);
    this.on("error", onError as (...args: unknown[]) => void);

    try {
      // Start connection in background
      this.connect(requestOptions).catch((err) => {
        error = err as Error;
        resolver?.();
      });

      while (!done && !error) {
        if (events.length > 0) {
          const nextEvent = events.shift();
          if (!nextEvent) {
            continue;
          }
          yield nextEvent;
        } else {
          await new Promise<void>((resolve) => {
            resolver = resolve;
          });
        }
      }

      // Yield remaining events
      while (events.length > 0) {
        const nextEvent = events.shift();
        if (!nextEvent) {
          continue;
        }
        yield nextEvent;
      }

      if (error) {
        throw error;
      }
    } finally {
      this.off("message", onMessage as (...args: unknown[]) => void);
      this.off("done", onDone as (...args: unknown[]) => void);
      this.off("error", onError as (...args: unknown[]) => void);
    }
  }
}

// =============================================================================
// WebSocket Streaming Client
// =============================================================================

/**
 * WebSocket Streaming Client
 *
 * Provides WebSocket-based streaming with automatic reconnection,
 * heartbeat, and message handling.
 *
 * @example
 * ```typescript
 * const ws = new WebSocketStreamingClient({
 *   url: 'wss://api.example.com/ws',
 *   autoReconnect: true,
 * });
 *
 * ws.on('message', (data) => console.log(data));
 *
 * await ws.connect();
 * ws.send({ type: 'chat', content: 'Hello' });
 * ```
 */
export class WebSocketStreamingClient {
  private options: WebSocketOptions;
  private ws: WebSocket | null = null;
  private state: WebSocketState = "disconnected";
  private reconnectAttempts = 0;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private eventHandlers: Map<string, Set<WebSocketMessageHandler>> = new Map();

  constructor(options: WebSocketOptions) {
    this.options = {
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 5000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 10,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
      ...options,
    };
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (typeof WebSocket === "undefined") {
      throw new Error(
        "WebSocket is not available. Please use a polyfill for non-browser environments.",
      );
    }

    if (this.state === "connected" || this.state === "connecting") {
      return;
    }

    logger.debug(`[WebSocketClient] Connecting to ${this.options.url}`);

    return new Promise((resolve, reject) => {
      this.state = "connecting";

      try {
        this.ws = new WebSocket(this.options.url, this.options.protocols);

        this.ws.onopen = () => {
          this.state = "connected";
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emit("connected");
          logger.debug(`[WebSocketClient] Connected to ${this.options.url}`);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch {
            this.emit("raw-message", event.data);
          }
        };

        this.ws.onclose = (event) => {
          this.state = "disconnected";
          this.stopHeartbeat();
          this.emit("disconnected", { code: event.code, reason: event.reason });
          logger.debug("[WebSocketClient] Disconnected", {
            code: event.code,
            reason: event.reason,
          });

          if (this.options.autoReconnect && !event.wasClean) {
            this.attemptReconnect();
          }
        };

        this.ws.onerror = (event) => {
          this.emit("error", event);
          logger.debug("[WebSocketClient] Connection error");
          if (this.state === "connecting") {
            reject(new Error("WebSocket connection failed"));
          }
        };
      } catch (error) {
        this.state = "disconnected";
        logger.debug("[WebSocketClient] Connection error", {
          message: (error as Error).message,
        });
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    logger.debug(`[WebSocketClient] Disconnecting from ${this.options.url}`);
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
    this.state = "disconnected";
  }

  /**
   * Send message to server
   */
  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      throw new Error("WebSocket is not connected");
    }
  }

  /**
   * Send message and wait for response
   */
  async request<T>(data: unknown, timeout: number = 30000): Promise<T> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timeoutId = setTimeout(() => {
        this.off("response", responseHandler);
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);

      const responseHandler: WebSocketMessageHandler = (data: unknown) => {
        const response = data as { requestId?: string; data?: T };
        if (response.requestId === requestId) {
          clearTimeout(timeoutId);
          this.off("response", responseHandler);
          resolve(response.data as T);
        }
      };

      this.on("response", responseHandler);
      this.send({ ...(data as object), requestId });
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(data: unknown): void {
    this.emit("message", data);

    // Handle typed messages
    if (typeof data === "object" && data !== null && "type" in data) {
      const typedData = data as { type: string; [key: string]: unknown };
      this.emit(typedData.type, typedData);
    }
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    if (!this.options.heartbeatInterval) {
      return;
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: "ping", timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Attempt reconnection
   */
  private async attemptReconnect(): Promise<void> {
    if (
      this.reconnectAttempts >= (this.options.maxReconnectAttempts ?? 10) ||
      this.state === "reconnecting"
    ) {
      this.emit("reconnect-failed", this.reconnectAttempts);
      logger.debug("[WebSocketClient] Max reconnect attempts reached", {
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.state = "reconnecting";
    this.reconnectAttempts++;
    this.emit("reconnecting", this.reconnectAttempts);

    const delayMs =
      (this.options.reconnectInterval ?? 5000) *
      Math.min(this.reconnectAttempts, 5);
    logger.debug(
      `[WebSocketClient] Reconnecting (attempt ${this.reconnectAttempts}, delay ${delayMs}ms)`,
    );
    await sleep(delayMs);

    try {
      await this.connect();
    } catch {
      // Reconnection failed, will be retried on next disconnect
    }
  }

  /**
   * Register event handler
   */
  on(event: string, callback: WebSocketMessageHandler): void {
    let handlers = this.eventHandlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this.eventHandlers.set(event, handlers);
    }
    handlers.add(callback);
  }

  /**
   * Remove event handler
   */
  off(event: string, callback: WebSocketMessageHandler): void {
    this.eventHandlers.get(event)?.delete(callback);
  }

  /**
   * Emit event
   */
  private emit(event: string, ...args: unknown[]): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach((handler) =>
        handler(args.length === 1 ? args[0] : args),
      );
    }
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Create async iterator for messages
   */
  async *messages(): AsyncGenerator<unknown, void, unknown> {
    const messageQueue: unknown[] = [];
    let resolver: (() => void) | null = null;
    let disconnected = false;

    const onMessage = (data: unknown) => {
      messageQueue.push(data);
      resolver?.();
    };

    const onDisconnect = () => {
      disconnected = true;
      resolver?.();
    };

    this.on("message", onMessage);
    this.on("disconnected", onDisconnect);

    try {
      while (!disconnected) {
        if (messageQueue.length > 0) {
          const nextMessage = messageQueue.shift();
          if (nextMessage === undefined) {
            continue;
          }
          yield nextMessage;
        } else {
          await new Promise<void>((resolve) => {
            resolver = resolve;
          });
        }
      }

      // Yield remaining messages
      while (messageQueue.length > 0) {
        const nextMessage = messageQueue.shift();
        if (nextMessage === undefined) {
          continue;
        }
        yield nextMessage;
      }
    } finally {
      this.off("message", onMessage);
      this.off("disconnected", onDisconnect);
    }
  }
}

// =============================================================================
// Streaming Client Factory
// =============================================================================

/**
 * Streaming client configuration
 */
export type StreamingClientConfig = {
  /** Base URL for the API */
  baseUrl: string;
  /** API key */
  apiKey?: string;
  /** Bearer token */
  token?: string;
  /** Default headers */
  headers?: Record<string, string>;
  /** Preferred transport: 'sse' or 'websocket' */
  transport?: "sse" | "websocket";
};

/**
 * Streaming Client Factory
 *
 * Creates streaming clients for real-time communication with NeuroLink API.
 *
 * @example SSE streaming
 * ```typescript
 * const client = createStreamingClient({
 *   baseUrl: 'https://api.example.com',
 *   apiKey: 'your-key',
 *   transport: 'sse',
 * });
 *
 * const result = await client.stream({
 *   input: { text: 'Hello' },
 *   callbacks: {
 *     onText: (text) => console.log(text),
 *   },
 * });
 * ```
 *
 * @example WebSocket streaming
 * ```typescript
 * const client = createStreamingClient({
 *   baseUrl: 'https://api.example.com',
 *   apiKey: 'your-key',
 *   transport: 'websocket',
 * });
 *
 * await client.connect();
 * const result = await client.stream({
 *   input: { text: 'Hello' },
 * });
 * ```
 */
export function createStreamingClient(config: StreamingClientConfig) {
  const { baseUrl, apiKey, token, headers = {}, transport = "sse" } = config;

  const authHeaders: Record<string, string> = {
    ...headers,
  };
  if (apiKey) {
    authHeaders["X-API-Key"] = apiKey;
  }
  if (token) {
    authHeaders["Authorization"] = `Bearer ${token}`;
  }

  if (transport === "websocket") {
    const wsUrl = baseUrl.replace(/^http/, "ws") + "/ws";
    const wsClient = new WebSocketStreamingClient({
      url: wsUrl,
      autoReconnect: true,
    });

    return {
      connect: () => wsClient.connect(),
      disconnect: () => wsClient.disconnect(),
      stream: async (
        options: StreamingRequestOptions & { callbacks?: StreamCallbacks },
      ) => {
        const { callbacks, ...requestOptions } = options;

        return new Promise<StreamResult>((resolve, reject) => {
          let fullContent = "";
          const toolCalls: ToolCall[] = [];
          const toolResults: ToolResult[] = [];

          const messageHandler = (data: unknown) => {
            const event = data as StreamEvent;

            switch (event.type) {
              case "text":
                if (event.content) {
                  fullContent += event.content;
                  callbacks?.onText?.(event.content);
                }
                break;
              case "tool-call":
                if (event.toolCall) {
                  toolCalls.push(event.toolCall);
                  callbacks?.onToolCall?.(event.toolCall);
                }
                break;
              case "tool-result":
                if (event.toolResult) {
                  toolResults.push(event.toolResult);
                  callbacks?.onToolResult?.(event.toolResult);
                }
                break;
              case "error":
                if (event.error) {
                  callbacks?.onError?.(event.error);
                  reject(event.error);
                }
                break;
              case "done": {
                wsClient.off("message", messageHandler);
                const result: StreamResult = {
                  content: fullContent,
                  toolCalls,
                  toolResults,
                };
                callbacks?.onDone?.(result);
                resolve(result);
                break;
              }
            }
          };

          wsClient.on("message", messageHandler);
          wsClient.send({
            type: "stream",
            ...requestOptions,
          });
        });
      },
      send: (data: unknown) => wsClient.send(data),
      on: (event: string, callback: WebSocketMessageHandler) =>
        wsClient.on(event, callback),
      off: (event: string, callback: WebSocketMessageHandler) =>
        wsClient.off(event, callback),
      getState: () => wsClient.getState(),
    };
  }

  // SSE transport — track connection state across stream calls
  let sseState: WebSocketState = "disconnected";

  return {
    connect: () => {
      sseState = "connected";
      return Promise.resolve();
    },
    disconnect: () => {
      sseState = "disconnected";
    },
    stream: async (
      options: StreamingRequestOptions & { callbacks?: StreamCallbacks },
    ) => {
      const { callbacks, ...requestOptions } = options;
      const sseUrl = `${baseUrl}/api/stream`;

      const sse = new SSEClient(sseUrl, {
        headers: authHeaders,
      });

      sseState = "connecting";

      return new Promise<StreamResult>((resolve, reject) => {
        let fullContent = "";
        const toolCalls: ToolCall[] = [];
        const toolResults: ToolResult[] = [];

        sse.on("connected", () => {
          sseState = "connected";
        });

        sse.on("text", (text) => {
          fullContent += text as string;
          callbacks?.onText?.(text as string);
        });

        sse.on("tool-call", (toolCall) => {
          toolCalls.push(toolCall as ToolCall);
          callbacks?.onToolCall?.(toolCall as ToolCall);
        });

        sse.on("tool-result", (toolResult) => {
          toolResults.push(toolResult as ToolResult);
          callbacks?.onToolResult?.(toolResult as ToolResult);
        });

        sse.on("metadata", (metadata) => {
          callbacks?.onMetadata?.(metadata as JsonObject);
        });

        sse.on("audio", (audio) => {
          callbacks?.onAudio?.(audio as { data: string; format: string });
        });

        sse.on("thinking", (thinking) => {
          callbacks?.onThinking?.(thinking as string);
        });

        sse.on("error", (error) => {
          sseState = "disconnected";
          callbacks?.onError?.(error as ApiError);
          reject(error);
        });

        sse.on("done", () => {
          sseState = "disconnected";
          const result: StreamResult = {
            content: fullContent,
            toolCalls,
            toolResults,
          };
          callbacks?.onDone?.(result);
          resolve(result);
        });

        sse.on("disconnected", () => {
          sseState = "disconnected";
        });

        sse.connect({ body: requestOptions });
      });
    },
    send: () => {
      throw new Error("SSE transport does not support sending messages");
    },
    on: () => {},
    off: () => {},
    getState: () => sseState,
  };
}

// =============================================================================
// Async Stream Utilities
// =============================================================================

/**
 * Create an async iterable from streaming response
 *
 * @example
 * ```typescript
 * const stream = createAsyncStream(fetch('/api/stream', { method: 'POST' }));
 *
 * for await (const event of stream) {
 *   console.log(event);
 * }
 * ```
 */
export async function* createAsyncStream(
  responsePromise: Promise<Response>,
): AsyncGenerator<StreamEvent, void, unknown> {
  const response = await responsePromise;

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      code: "STREAM_ERROR",
      message: `HTTP ${response.status}`,
      status: response.status,
    }));
    throw error;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            return;
          }

          try {
            const event = JSON.parse(data) as StreamEvent;
            yield event;
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Collect streaming events into a single result
 *
 * @example
 * ```typescript
 * const result = await collectStream(
 *   createAsyncStream(fetch('/api/stream', { method: 'POST' }))
 * );
 * console.log(result.content);
 * ```
 */
export async function collectStream(
  stream: AsyncIterable<StreamEvent>,
): Promise<StreamResult> {
  let content = "";
  const toolCalls: ToolCall[] = [];
  const toolResults: ToolResult[] = [];
  let finishReason: string | undefined;
  let usage: StreamResult["usage"];
  let metadata: JsonObject | undefined;

  for await (const event of stream) {
    switch (event.type) {
      case "text":
        if (event.content) {
          content += event.content;
        }
        break;
      case "tool-call":
        if (event.toolCall) {
          toolCalls.push(event.toolCall);
        }
        break;
      case "tool-result":
        if (event.toolResult) {
          toolResults.push(event.toolResult);
        }
        break;
      case "metadata":
        metadata = { ...metadata, ...event.metadata };
        if (event.metadata?.finishReason) {
          finishReason = event.metadata.finishReason as string;
        }
        if (event.metadata?.usage) {
          usage = event.metadata.usage as StreamResult["usage"];
        }
        break;
    }
  }

  return {
    content,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    finishReason,
    usage,
    metadata,
  };
}

// Types are exported at their definition sites above and via imports
