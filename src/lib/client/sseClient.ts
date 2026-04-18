/**
 * Server-Sent Events (SSE) Client for NeuroLink SDK
 *
 * Provides a dedicated SSE client for server-push streaming connections
 * to NeuroLink servers. Supports automatic reconnection, event parsing,
 * and typed event handlers.
 *
 * @module @neurolink/client/sseClient
 */

import type {
  ClientStreamCallbacks,
  ClientStreamEvent as StreamEvent,
  ClientStreamResult as StreamResult,
  ClientApiError,
  ClientInternalConfig,
  SSEConfig,
  SSEEventHandlers,
  SSERequestOptions,
  SSEState,
} from "../types/index.js";
import { SpanStatusCode } from "@opentelemetry/api";
import { logger } from "../utils/logger.js";
import { withClientSpan } from "../telemetry/withSpan.js";
import { tracers } from "../telemetry/tracers.js";

// =============================================================================
// SSE Client Implementation
// =============================================================================

/**
 * SSE streaming client for NeuroLink
 *
 * Provides server-push streaming from NeuroLink servers using Server-Sent Events.
 *
 * @example Basic usage
 * ```typescript
 * const sseClient = new NeuroLinkSSE({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-api-key',
 * });
 *
 * // Stream with callbacks
 * await sseClient.stream('/api/generate', {
 *   body: { prompt: 'Hello!' },
 * }, {
 *   onText: (text) => console.log('Text:', text),
 *   onDone: (result) => console.log('Complete:', result),
 *   onError: (error) => console.error('Error:', error),
 * });
 * ```
 */
export class NeuroLinkSSE {
  private config: ClientInternalConfig;
  private state: SSEState = "disconnected";
  private abortController: AbortController | null = null;
  private reconnectAttempts = 0;
  private eventHandlers: SSEEventHandlers = {};

  constructor(config: SSEConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey ?? "",
      token: config.token ?? "",
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 5,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      useNativeEventSource: config.useNativeEventSource ?? false,
    };
  }

  /**
   * Get current connection state
   */
  getState(): SSEState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === "connected";
  }

  /**
   * Stream from an endpoint using SSE
   */
  async stream(
    path: string,
    options: SSERequestOptions = {},
    callbacks: ClientStreamCallbacks = {},
  ): Promise<void> {
    return withClientSpan(
      {
        name: "neurolink.client.sse.stream",
        tracer: tracers.http,
        attributes: {
          "http.method": options.body ? "POST" : "GET",
          "http.route": path,
          "http.url": this.buildUrl(path),
          "sse.auto_reconnect": this.config.autoReconnect,
          "sse.native_event_source": this.config.useNativeEventSource,
        },
      },
      async (span) => {
        // Wrap onError callback so the span is marked failed on stream errors
        const wrappedCallbacks: ClientStreamCallbacks = {
          ...callbacks,
          onError: (error) => {
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: error?.message ?? "SSE stream error",
            });
            callbacks.onError?.(error);
          },
        };
        return this._streamInternal(path, options, wrappedCallbacks);
      },
    );
  }

  private async _streamInternal(
    path: string,
    options: SSERequestOptions = {},
    callbacks: ClientStreamCallbacks = {},
  ): Promise<void> {
    const url = this.buildUrl(path);
    const isGetRequest = !options.body;

    // Use native EventSource for GET requests when configured and available
    if (
      this.config.useNativeEventSource &&
      isGetRequest &&
      typeof EventSource !== "undefined"
    ) {
      return this.streamWithNativeEventSource(url, options, callbacks);
    }

    this.setState("connecting");
    this.abortController = new AbortController();

    // Implement timeout via AbortController timer
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const userSignal = options.signal;
    if (this.config.timeout > 0) {
      timeoutId = setTimeout(() => {
        this.abortController?.abort();
      }, this.config.timeout);
    }

    // If the caller provided their own signal, abort our controller when it fires
    if (userSignal) {
      if (userSignal.aborted) {
        this.abortController.abort();
      } else {
        userSignal.addEventListener(
          "abort",
          () => this.abortController?.abort(),
          { once: true },
        );
      }
    }

    const headers = this.buildHeaders(options.headers);
    logger.debug(`[NeuroLinkSSE] Connecting to ${url}`);

    try {
      const response = await fetch(url, {
        method: isGetRequest ? "GET" : "POST",
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch((_parseError: unknown) => {
            // JSON parsing failed, return empty object as fallback
            return {};
          });
        const apiError: ClientApiError = {
          code: "HTTP_ERROR",
          message: `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          details: errorData,
        };
        logger.debug(
          `[NeuroLinkSSE] Connection failed: HTTP ${response.status}`,
        );
        callbacks.onError?.(apiError);
        this.setState("error");
        return;
      }

      // Connection succeeded -- reset reconnect counter so future
      // disconnections get the full retry budget again.
      this.reconnectAttempts = 0;

      this.setState("connected");
      this.eventHandlers.onOpen?.();
      logger.debug(`[NeuroLinkSSE] Connected to ${url}`);

      // Clear the connection timeout once connected; the stream may run
      // indefinitely and should not be cut short by the initial timeout.
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      await this.processStream(response, callbacks);

      this.setState("disconnected");
      this.eventHandlers.onClose?.();
      logger.debug(`[NeuroLinkSSE] Stream ended for ${url}`);
    } catch (error) {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }

      if ((error as Error).name === "AbortError") {
        this.setState("disconnected");
        logger.debug("[NeuroLinkSSE] Stream aborted");
        return;
      }

      this.setState("error");
      const apiError: ClientApiError = {
        code: "STREAM_ERROR",
        message: (error as Error).message,
        status: 500,
      };
      logger.debug("[NeuroLinkSSE] Stream error", {
        message: (error as Error).message,
      });
      callbacks.onError?.(apiError);
      this.eventHandlers.onError?.(error as Error);

      // Handle reconnection
      if (this.config.autoReconnect) {
        await this.attemptReconnect(path, options, callbacks);
      }
    }
  }

  /**
   * Abort the current stream
   */
  abort(): void {
    logger.debug("[NeuroLinkSSE] Aborting stream");
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setState("disconnected");
  }

  /**
   * Set global event handlers
   */
  setEventHandlers(handlers: SSEEventHandlers): void {
    this.eventHandlers = handlers;
  }

  // =============================================================================
  // Streaming Helpers
  // =============================================================================

  /**
   * Stream a generate request
   */
  async generate(
    prompt: string,
    options: {
      provider?: string;
      model?: string;
      temperature?: number;
      maxTokens?: number;
      systemPrompt?: string;
    } & ClientStreamCallbacks = {},
  ): Promise<string> {
    let fullContent = "";

    await this.stream(
      "/api/generate",
      {
        body: {
          input: { text: prompt },
          provider: options.provider,
          model: options.model,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt,
          stream: true,
        },
      },
      {
        onText: (text: string) => {
          fullContent += text;
          options.onText?.(text);
        },
        onToolCall: options.onToolCall,
        onToolResult: options.onToolResult,
        onDone: options.onDone,
        onError: options.onError,
      },
    );

    return fullContent;
  }

  /**
   * Stream a chat request
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options: {
      agentId?: string;
      sessionId?: string;
    } & ClientStreamCallbacks = {},
  ): Promise<string> {
    let fullContent = "";

    await this.stream(
      "/api/chat",
      {
        body: {
          messages,
          agentId: options.agentId,
          sessionId: options.sessionId,
          stream: true,
        },
      },
      {
        onText: (text: string) => {
          fullContent += text;
          options.onText?.(text);
        },
        onToolCall: options.onToolCall,
        onToolResult: options.onToolResult,
        onDone: options.onDone,
        onError: options.onError,
      },
    );

    return fullContent;
  }

  /**
   * Stream an agent execution
   */
  async executeAgent(
    agentId: string,
    input: string,
    options: ClientStreamCallbacks = {},
  ): Promise<string> {
    let fullContent = "";

    await this.stream(
      `/api/agents/${agentId}/execute`,
      {
        body: {
          input,
          stream: true,
        },
      },
      {
        onText: (text: string) => {
          fullContent += text;
          options.onText?.(text);
        },
        onToolCall: options.onToolCall,
        onToolResult: options.onToolResult,
        onDone: options.onDone,
        onError: options.onError,
      },
    );

    return fullContent;
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Stream using the browser's native EventSource API (GET requests only).
   * Provides automatic reconnection handled by the browser and a simpler
   * implementation, but only supports GET with limited header control.
   */
  private streamWithNativeEventSource(
    url: string,
    options: SSERequestOptions,
    callbacks: ClientStreamCallbacks,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.setState("connecting");

      // EventSource only supports query-param auth; we append apiKey if set.
      const esUrl = this.config.apiKey
        ? `${url}${url.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(this.config.apiKey)}`
        : url;

      const es = new EventSource(esUrl);
      let accumulatedContent = "";

      // Implement timeout for the initial connection
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      if (this.config.timeout > 0) {
        timeoutId = setTimeout(() => {
          es.close();
          this.setState("error");
          const apiError: ClientApiError = {
            code: "TIMEOUT",
            message: `Connection timed out after ${this.config.timeout}ms`,
            status: 408,
          };
          callbacks.onError?.(apiError);
          reject(new Error(apiError.message));
        }, this.config.timeout);
      }

      // Honour caller-provided abort signal
      if (options.signal) {
        if (options.signal.aborted) {
          es.close();
          this.setState("disconnected");
          resolve();
          return;
        }
        options.signal.addEventListener(
          "abort",
          () => {
            es.close();
            if (timeoutId !== undefined) {
              clearTimeout(timeoutId);
            }
            this.setState("disconnected");
            resolve();
          },
          { once: true },
        );
      }

      es.onopen = () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        this.reconnectAttempts = 0;
        this.setState("connected");
        this.eventHandlers.onOpen?.();
        logger.debug(`[NeuroLinkSSE] Native EventSource connected to ${url}`);
      };

      es.onmessage = (messageEvent: MessageEvent) => {
        const data = (messageEvent.data as string).trim();
        if (data === "[DONE]") {
          es.close();
          const result: StreamResult = {
            content: accumulatedContent,
            finishReason: "stop",
          };
          callbacks.onDone?.(result);
          this.setState("disconnected");
          this.eventHandlers.onClose?.();
          resolve();
          return;
        }

        try {
          const event = JSON.parse(data) as StreamEvent;
          this.handleEvent(event, callbacks);
          if (event.type === "text" && event.content) {
            accumulatedContent += event.content;
          }
        } catch {
          callbacks.onText?.(data);
          accumulatedContent += data;
        }
      };

      es.onerror = () => {
        if (timeoutId !== undefined) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        // EventSource fires onerror on both transient and fatal failures.
        // readyState === CLOSED means the browser gave up.
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          this.setState("error");
          const apiError: ClientApiError = {
            code: "STREAM_ERROR",
            message: "EventSource connection closed",
            status: 500,
          };
          callbacks.onError?.(apiError);
          this.eventHandlers.onError?.(new Error(apiError.message));
          resolve();
        }
        // Otherwise the browser is attempting its own reconnect -- let it.
      };
    });
  }

  private buildUrl(path: string): string {
    const baseUrl = this.config.baseUrl.replace(/\/$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }

  private buildHeaders(additionalHeaders?: Record<string, string>): Headers {
    const headers = new Headers({
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
      ...this.config.headers,
      ...additionalHeaders,
    });

    if (this.config.apiKey) {
      headers.set("X-API-Key", this.config.apiKey);
    }

    if (this.config.token) {
      headers.set("Authorization", `Bearer ${this.config.token}`);
    }

    // Add Content-Type for POST requests
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return headers;
  }

  private async processStream(
    response: Response,
    callbacks: ClientStreamCallbacks,
  ): Promise<void> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let accumulatedContent = "";

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
            const data = line.slice(6).trim();
            if (data === "[DONE]") {
              const result: StreamResult = {
                content: accumulatedContent,
                finishReason: "stop",
              };
              callbacks.onDone?.(result);
              return;
            }

            try {
              const event = JSON.parse(data) as StreamEvent;
              this.handleEvent(event, callbacks);
              // Accumulate content for the final result
              if (event.type === "text" && event.content) {
                accumulatedContent += event.content;
              }
            } catch {
              // Non-JSON data, treat as text
              callbacks.onText?.(data);
              accumulatedContent += data;
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        if (buffer.startsWith("data: ")) {
          const data = buffer.slice(6).trim();
          if (data !== "[DONE]") {
            try {
              const event = JSON.parse(data) as StreamEvent;
              this.handleEvent(event, callbacks);
              if (event.type === "text" && event.content) {
                accumulatedContent += event.content;
              }
            } catch {
              callbacks.onText?.(data);
              accumulatedContent += data;
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private handleEvent(
    event: StreamEvent,
    callbacks: ClientStreamCallbacks,
  ): void {
    this.eventHandlers.onEvent?.(event);

    switch (event.type) {
      case "text":
        callbacks.onText?.(event.content ?? "");
        break;
      case "tool-call":
        if (event.toolCall) {
          callbacks.onToolCall?.(event.toolCall);
        }
        break;
      case "tool-result":
        if (event.toolResult) {
          callbacks.onToolResult?.(event.toolResult);
        }
        break;
      case "done": {
        // Create a StreamResult from the event
        const result: StreamResult = {
          content: event.content ?? "",
          finishReason: "stop",
        };
        callbacks.onDone?.(result);
        break;
      }
      case "error":
        if (event.error) {
          callbacks.onError?.(event.error);
        }
        break;
      case "metadata":
        // Metadata events are passed through onEvent handler
        break;
    }
  }

  private setState(state: SSEState): void {
    this.state = state;
    this.eventHandlers.onStateChange?.(state);
  }

  private async attemptReconnect(
    path: string,
    options: SSERequestOptions,
    callbacks: ClientStreamCallbacks,
  ): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      const error = new Error(
        `Max reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`,
      );
      logger.debug("[NeuroLinkSSE] Max reconnect attempts reached", {
        attempts: this.reconnectAttempts,
      });
      this.eventHandlers.onError?.(error);
      callbacks.onError?.({
        code: "RECONNECT_FAILED",
        message: error.message,
        status: 500,
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay,
    );

    logger.debug(
      `[NeuroLinkSSE] Reconnecting (attempt ${this.reconnectAttempts}, delay ${delay}ms)`,
    );
    this.eventHandlers.onReconnect?.(this.reconnectAttempts);

    await new Promise((resolve) => setTimeout(resolve, delay));
    await this.stream(path, options, callbacks);
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an SSE client instance
 *
 * @example
 * ```typescript
 * const client = createSSEClient({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: 'your-api-key',
 *   autoReconnect: true,
 * });
 *
 * // Generate with streaming
 * const content = await client.generate('Hello!', {
 *   onText: (text) => process.stdout.write(text),
 * });
 * ```
 */
export function createSSEClient(config: SSEConfig): NeuroLinkSSE {
  return new NeuroLinkSSE(config);
}
