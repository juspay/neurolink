/**
 * WebSocket Client for NeuroLink SDK
 *
 * Provides a dedicated WebSocket client for real-time streaming connections
 * to NeuroLink servers. Supports bidirectional communication, automatic
 * reconnection, and message queuing.
 *
 * @module @neurolink/client/wsClient
 */

import { SpanKind, SpanStatusCode, type Span } from "@opentelemetry/api";
import type {
  ClientStreamCallbacks,
  ClientStreamEvent as StreamEvent,
  ClientStreamResult as StreamResult,
  WebSocketEventHandlers,
  ClientClientWebSocketState,
  ClientInternalConfig,
  ClientWebSocketMessage,
  ClientWebSocketConfig,
} from "../types/index.js";
import { tracers } from "../telemetry/tracers.js";

// =============================================================================
// WebSocket Client
// =============================================================================

/**
 * WebSocket streaming client for NeuroLink
 *
 * Provides real-time bidirectional communication with NeuroLink servers.
 *
 * @example Basic usage
 * ```typescript
 * const wsClient = new NeuroLinkWebSocket({
 *   baseUrl: 'wss://api.neurolink.example.com/ws',
 *   apiKey: 'your-api-key',
 * });
 *
 * wsClient.connect({
 *   onMessage: (event) => console.log('Received:', event),
 *   onError: (error) => console.error('Error:', error),
 * });
 *
 * // Send a message
 * wsClient.send({
 *   type: 'message',
 *   channel: 'chat',
 *   payload: { prompt: 'Hello!' },
 * });
 * ```
 */
export class NeuroLinkWebSocket {
  private ws: WebSocket | null = null;
  private config: ClientInternalConfig;
  private state: ClientClientWebSocketState = "disconnected";
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: ClientWebSocketMessage[] = [];
  private eventHandlers: WebSocketEventHandlers = {};
  private subscriptions = new Map<string, ClientStreamCallbacks>();
  private pendingAuth = false;
  /**
   * Active OTel span for the current WebSocket connection lifecycle.
   * Created at connect() and ended on close/error so we capture connection
   * lifetime, reconnect counts, and error attribution in Langfuse.
   */
  private connectionSpan: Span | null = null;

  /**
   * Local flag to suppress reconnection during an explicit disconnect().
   * Unlike mutating config.autoReconnect, this preserves the user's
   * original configuration so that a subsequent connect() still honours it.
   */
  private disconnectRequested = false;

  constructor(config: ClientWebSocketConfig) {
    this.config = {
      baseUrl: config.baseUrl,
      apiKey: config.apiKey ?? "",
      token: config.token ?? "",
      timeout: config.timeout ?? 30000,
      headers: config.headers ?? {},
      autoReconnect: config.autoReconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 10,
      reconnectDelay: config.reconnectDelay ?? 1000,
      maxReconnectDelay: config.maxReconnectDelay ?? 30000,
      heartbeatInterval: config.heartbeatInterval ?? 30000,
      queueSize: config.queueSize ?? 100,
    };
  }

  /**
   * Get current connection state
   */
  getState(): ClientClientWebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Connect to WebSocket server
   */
  connect(handlers?: WebSocketEventHandlers): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    // Reset the disconnect flag so reconnection logic works again
    this.disconnectRequested = false;

    this.eventHandlers = handlers ?? {};
    this.setState("connecting");

    // End any orphaned span from a prior connect() attempt (e.g., re-entrant call
    // while a previous attempt was still connecting).
    if (this.connectionSpan) {
      this.connectionSpan.setAttribute("ws.superseded", true);
      this.connectionSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: "Connection attempt superseded by new connect() call",
      });
      this.connectionSpan.end();
      this.connectionSpan = null;
    }

    // Start an OTel span that tracks the lifetime of this connection attempt.
    // Ended in onclose/onerror/disconnect so metrics capture connection
    // duration and error attribution.
    this.connectionSpan = tracers.http.startSpan(
      "neurolink.client.ws.connect",
      {
        kind: SpanKind.CLIENT,
        attributes: {
          "http.url": this.config.baseUrl,
          "ws.auto_reconnect": this.config.autoReconnect,
          "ws.reconnect_attempt": this.reconnectAttempts,
        },
      },
    );

    // Build WebSocket URL (credentials are sent via headers, not query params,
    // to avoid leaking secrets in server logs, browser history, and HTTP referers)
    const url = new URL(this.config.baseUrl);

    // Build auth headers matching httpClient.ts conventions
    const authHeaders: Record<string, string> = {
      ...this.config.headers,
    };
    if (this.config.apiKey) {
      authHeaders["X-API-Key"] = this.config.apiKey;
    }
    if (this.config.token) {
      authHeaders["Authorization"] = `Bearer ${this.config.token}`;
    }

    // In Node.js (ws package), pass headers via the options parameter.
    // In browsers, the WebSocket API does not support custom headers, so
    // credentials are sent as the first message after the connection opens.
    const isNode =
      typeof globalThis.process !== "undefined" &&
      typeof globalThis.process.versions?.node === "string";

    try {
      if (isNode && Object.keys(authHeaders).length > 0) {
        this.ws = new (WebSocket as unknown as new (
          url: string,
          opts: { headers: Record<string, string> },
        ) => WebSocket)(url.toString(), { headers: authHeaders });
      } else {
        this.ws = new WebSocket(url.toString());
      }
    } catch (error) {
      if (this.connectionSpan) {
        this.connectionSpan.recordException(
          error instanceof Error ? error : new Error(String(error)),
        );
        this.connectionSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        this.connectionSpan.end();
        this.connectionSpan = null;
      }
      throw error;
    }

    this.pendingAuth = !isNode && (!!this.config.apiKey || !!this.config.token);
    this.setupEventListeners();
  }

  /**
   * Disconnect from WebSocket server
   *
   * Sets a local flag to prevent the onclose handler from triggering
   * reconnection, without mutating the shared config.
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.disconnectRequested = true;

    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }

    this.setState("disconnected");

    // Let onclose finalize the span — it fires from ws.close(1000,...) and
    // has the close code context.  We only end here if ws is already null
    // (e.g. connect was never called) to avoid leaking.
    if (this.connectionSpan && !this.ws) {
      this.connectionSpan.setAttribute("ws.close_reason", "client_disconnect");
      this.connectionSpan.setStatus({ code: SpanStatusCode.OK });
      this.connectionSpan.end();
      this.connectionSpan = null;
    }
  }

  /**
   * Send a message through WebSocket
   */
  send(message: ClientWebSocketMessage): void {
    if (this.isConnected() && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connected
      if (this.messageQueue.length < (this.config.queueSize ?? 100)) {
        this.messageQueue.push(message);
      }
    }
  }

  /**
   * Subscribe to a channel with streaming callbacks
   */
  subscribe(channel: string, callbacks: ClientStreamCallbacks): void {
    this.subscriptions.set(channel, callbacks);
    this.send({
      type: "subscribe",
      channel,
    });
  }

  /**
   * Unsubscribe from a channel
   */
  unsubscribe(channel: string): void {
    this.subscriptions.delete(channel);
    this.send({
      type: "unsubscribe",
      channel,
    });
  }

  /**
   * Stream a prompt with callbacks
   */
  stream(
    prompt: string,
    options?: { channel?: string } & ClientStreamCallbacks,
  ): void {
    const channel = options?.channel ?? `stream_${Date.now()}`;

    if (options) {
      this.subscribe(channel, {
        onText: options.onText,
        onToolCall: options.onToolCall,
        onToolResult: options.onToolResult,
        onDone: options.onDone,
        onError: options.onError,
      });
    }

    this.send({
      type: "message",
      channel,
      payload: { prompt },
    });
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private setupEventListeners(): void {
    if (!this.ws) {
      return;
    }

    this.ws.onopen = () => {
      this.setState("connected");
      this.reconnectAttempts = 0;

      if (this.connectionSpan) {
        this.connectionSpan.setAttribute("ws.connected", true);
      }

      // In browser environments, send credentials as the first message
      // since the browser WebSocket API does not support custom headers.
      if (this.pendingAuth && this.ws) {
        const authPayload: Record<string, string> = { type: "auth" };
        if (this.config.apiKey) {
          authPayload["apiKey"] = this.config.apiKey;
        }
        if (this.config.token) {
          authPayload["token"] = this.config.token;
        }
        this.ws.send(JSON.stringify(authPayload));
        this.pendingAuth = false;
      }

      this.eventHandlers.onOpen?.();
      this.startHeartbeat();
      this.flushMessageQueue();

      // Re-subscribe to all active channels after a reconnect so that
      // channel listeners are restored transparently.
      this.replaySubscriptions();
    };

    this.ws.onclose = (event) => {
      this.setState("disconnected");
      this.stopHeartbeat();
      this.eventHandlers.onClose?.(event.code, event.reason);

      if (this.connectionSpan) {
        this.connectionSpan.setAttribute("ws.close_code", event.code);
        if (event.reason) {
          this.connectionSpan.setAttribute("ws.close_reason", event.reason);
        }
        // 1000 = normal closure; other codes are abnormal.
        if (event.code === 1000) {
          this.connectionSpan.setStatus({ code: SpanStatusCode.OK });
        } else {
          this.connectionSpan.setStatus({
            code: SpanStatusCode.ERROR,
            message: `WebSocket closed with code ${event.code}${event.reason ? `: ${event.reason}` : ""}`,
          });
        }
        this.connectionSpan.end();
        this.connectionSpan = null;
      }

      // Only attempt reconnection when auto-reconnect is enabled AND this
      // was not an intentional disconnect (code 1000 or explicit call).
      if (
        this.config.autoReconnect &&
        !this.disconnectRequested &&
        event.code !== 1000
      ) {
        this.attemptReconnect();
      }
    };

    this.ws.onerror = () => {
      this.setState("error");
      const error = new Error("WebSocket connection error");
      this.eventHandlers.onError?.(error);

      if (this.connectionSpan) {
        this.connectionSpan.recordException(error);
        this.connectionSpan.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        // Do not end here — onclose will fire next and end the span with
        // the precise close code. Keeping the span open until close gives
        // us the full connection lifetime on Langfuse.
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        this.handleMessage(data);
      } catch {
        // Handle non-JSON messages
        this.eventHandlers.onMessage?.({
          type: "text",
          content: event.data as string,
          timestamp: Date.now(),
        });
      }
    };
  }

  private handleMessage(data: StreamEvent & { channel?: string }): void {
    // Notify global handler
    this.eventHandlers.onMessage?.(data);

    // Notify channel-specific subscribers
    if (data.channel) {
      const callbacks = this.subscriptions.get(data.channel);
      if (callbacks) {
        this.dispatchToCallbacks(data, callbacks);
      }
    }
  }

  private dispatchToCallbacks(
    event: StreamEvent,
    callbacks: ClientStreamCallbacks,
  ): void {
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
    }
  }

  private setState(state: ClientClientWebSocketState): void {
    this.state = state;
    this.eventHandlers.onStateChange?.(state);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: "ping" });
      }
    }, this.config.heartbeatInterval ?? 30000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.eventHandlers.onError?.(
        new Error(
          `Max reconnection attempts (${this.config.maxReconnectAttempts}) exceeded`,
        ),
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.config.maxReconnectDelay,
    );

    this.eventHandlers.onReconnect?.(this.reconnectAttempts);

    setTimeout(() => {
      this.connect(this.eventHandlers);
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  /**
   * Re-send subscribe messages for every active subscription.
   * Called after a successful reconnect so that channel listeners
   * resume working without the caller needing to re-subscribe manually.
   */
  private replaySubscriptions(): void {
    for (const channel of this.subscriptions.keys()) {
      this.send({
        type: "subscribe",
        channel,
      });
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a WebSocket client instance
 *
 * @example
 * ```typescript
 * const client = createWebSocketClient({
 *   baseUrl: 'wss://api.neurolink.example.com/ws',
 *   apiKey: 'your-api-key',
 *   autoReconnect: true,
 * });
 *
 * client.connect({
 *   onMessage: (event) => console.log('Received:', event),
 * });
 * ```
 */
export function createWebSocketClient(
  config: ClientWebSocketConfig,
): NeuroLinkWebSocket {
  return new NeuroLinkWebSocket(config);
}
