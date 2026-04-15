/**
 * WebSocket Client for NeuroLink SDK
 *
 * Provides a dedicated WebSocket client for real-time streaming connections
 * to NeuroLink servers. Supports bidirectional communication, automatic
 * reconnection, and message queuing.
 *
 * @module @neurolink/client/wsClient
 */

import type {
  ClientStreamCallbacks,
  ClientStreamEvent as StreamEvent,
  ClientStreamResult as StreamResult,
  WebSocketEventHandlers,
  ClientClientWebSocketState,
  ClientWebSocketMessage,
  ClientWebSocketConfig,
} from "../types/index.js";
// =============================================================================
// Type Aliases (re-export canonical types under the original public names)
// =============================================================================
// =============================================================================
// Internal Types
// =============================================================================

type InternalConfig = {
  baseUrl: string;
  apiKey: string;
  token: string;
  timeout: number;
  headers: Record<string, string>;
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
  heartbeatInterval: number;
  queueSize: number;
};

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
  private config: InternalConfig;
  private state: ClientClientWebSocketState = "disconnected";
  private reconnectAttempts = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: ClientWebSocketMessage[] = [];
  private eventHandlers: WebSocketEventHandlers = {};
  private subscriptions = new Map<string, ClientStreamCallbacks>();
  private pendingAuth = false;

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

    if (isNode && Object.keys(authHeaders).length > 0) {
      // The `ws` npm package accepts a second `options` object with a `headers`
      // property.  The DOM WebSocket type does not model this, so we cast
      // through `unknown` to satisfy TypeScript while remaining correct at
      // runtime under Node.js.
      this.ws = new (WebSocket as unknown as new (
        url: string,
        opts: { headers: Record<string, string> },
      ) => WebSocket)(url.toString(), { headers: authHeaders });
    } else {
      this.ws = new WebSocket(url.toString());
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
  }

  /**
   * Send a message through WebSocket
   */
  send(message: ClientWebSocketMessage): void {
    if (this.isConnected() && this.ws) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for when connected
      if (this.messageQueue.length < this.config.queueSize) {
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
    }, this.config.heartbeatInterval);
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
