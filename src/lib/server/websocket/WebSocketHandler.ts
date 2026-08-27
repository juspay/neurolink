/**
 * WebSocketHandler - Unified WebSocket Support
 *
 * Provides cross-framework WebSocket handling for real-time AI interactions.
 * Supports connection management, message routing, and graceful shutdown.
 */

import type {
  WebSocketConfig,
  WebSocketHandler as IWebSocketHandler,
  WebSocketConnection,
  WebSocketMessage,
  AuthenticatedUser,
  ServerAuthConfig as _AuthConfig,
} from "../../types/index.js";
import { WebSocketError, WebSocketConnectionError } from "../errors.js";
import { logger } from "../../utils/logger.js";

/**
 * Default WebSocket configuration
 */
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  path: "/ws",
  maxConnections: 1000,
  pingInterval: 30000,
  pongTimeout: 10000,
  maxMessageSize: 1024 * 1024, // 1MB
  auth: {
    strategy: "none",
    required: false,
  },
};

/**
 * Generate unique connection ID
 */
function generateConnectionId(): string {
  return `ws_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * WebSocket connection manager
 */
export class WebSocketConnectionManager {
  private connections = new Map<string, WebSocketConnection>();
  private config: Required<WebSocketConfig>;
  private pingIntervals = new Map<string, ReturnType<typeof setInterval>>();
  private handlers = new Map<string, IWebSocketHandler>();

  constructor(config: WebSocketConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a handler for a path
   */
  registerHandler(path: string, handler: IWebSocketHandler): void {
    this.handlers.set(path, handler);
    logger.debug(`[WebSocket] Registered handler for ${path}`);
  }

  /**
   * Get handler for a path
   */
  getHandler(path: string): IWebSocketHandler | undefined {
    return this.handlers.get(path);
  }

  /**
   * Handle new connection
   */
  async handleConnection(
    socket: unknown,
    path: string,
    user?: AuthenticatedUser,
  ): Promise<WebSocketConnection> {
    // Check max connections
    if (this.connections.size >= this.config.maxConnections) {
      throw new WebSocketConnectionError(
        `Maximum connections (${this.config.maxConnections}) reached`,
      );
    }

    const connection: WebSocketConnection = {
      id: generateConnectionId(),
      socket,
      user,
      metadata: { path },
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    this.connections.set(connection.id, connection);

    // Start ping interval
    this.startPingInterval(connection);

    // Call handler
    const handler = this.handlers.get(path);
    if (handler?.onOpen) {
      try {
        await handler.onOpen(connection);
      } catch (error) {
        logger.error(
          `[WebSocket] Error in onOpen handler: ${(error as Error).message}`,
        );
      }
    }

    logger.debug(`[WebSocket] Connection opened: ${connection.id}`);
    return connection;
  }

  /**
   * Handle incoming message
   */
  async handleMessage(
    connectionId: string,
    data: string | ArrayBuffer,
    isBinary: boolean,
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new WebSocketError("Connection not found", undefined, connectionId);
    }

    // Update activity
    connection.lastActivity = Date.now();

    // Check message size
    const size = typeof data === "string" ? data.length : data.byteLength;
    if (size > this.config.maxMessageSize) {
      throw new WebSocketError(
        `Message exceeds max size (${this.config.maxMessageSize} bytes)`,
        undefined,
        connectionId,
      );
    }

    const message: WebSocketMessage = {
      type: isBinary ? "binary" : "text",
      data,
      timestamp: Date.now(),
    };

    // Call handler
    const path = connection.metadata.path as string;
    const handler = this.handlers.get(path);
    if (handler?.onMessage) {
      try {
        await handler.onMessage(connection, message);
      } catch (error) {
        logger.error(
          `[WebSocket] Error in onMessage handler: ${(error as Error).message}`,
        );
        throw error;
      }
    }
  }

  /**
   * Handle connection close
   */
  async handleClose(
    connectionId: string,
    code: number,
    reason: string,
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Stop ping interval
    this.stopPingInterval(connectionId);

    // Remove connection
    this.connections.delete(connectionId);

    // Call handler
    const path = connection.metadata.path as string;
    const handler = this.handlers.get(path);
    if (handler?.onClose) {
      try {
        await handler.onClose(connection, code, reason);
      } catch (error) {
        logger.error(
          `[WebSocket] Error in onClose handler: ${(error as Error).message}`,
        );
      }
    }

    logger.debug(
      `[WebSocket] Connection closed: ${connectionId} (${code}: ${reason})`,
    );
  }

  /**
   * Handle connection error
   */
  async handleError(connectionId: string, error: Error): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // Call handler
    const path = connection.metadata.path as string;
    const handler = this.handlers.get(path);
    if (handler?.onError) {
      try {
        await handler.onError(connection, error);
      } catch (handlerError) {
        logger.error(
          `[WebSocket] Error in onError handler: ${(handlerError as Error).message}`,
        );
      }
    }

    logger.error(
      `[WebSocket] Connection error: ${connectionId} - ${error.message}`,
    );
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): WebSocketConnection | undefined {
    return this.connections.get(connectionId);
  }

  /**
   * Get all connections
   */
  getAllConnections(): WebSocketConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get connections for a user
   */
  getConnectionsByUser(userId: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.user?.id === userId,
    );
  }

  /**
   * Get connections for a path
   */
  getConnectionsByPath(path: string): WebSocketConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.metadata.path === path,
    );
  }

  /**
   * Send message to a connection
   */
  send(connectionId: string, data: string | ArrayBuffer): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new WebSocketError("Connection not found", undefined, connectionId);
    }

    const socket = connection.socket as {
      send: (data: string | ArrayBuffer) => void;
    };

    try {
      socket.send(data);
    } catch (error) {
      throw new WebSocketError(
        `Failed to send message: ${(error as Error).message}`,
        error as Error,
        connectionId,
      );
    }
  }

  /**
   * Broadcast message to all connections
   */
  broadcast(
    data: string | ArrayBuffer,
    filter?: (conn: WebSocketConnection) => boolean,
  ): void {
    for (const connection of this.connections.values()) {
      if (filter && !filter(connection)) {
        continue;
      }

      try {
        this.send(connection.id, data);
      } catch (error) {
        logger.error(
          `[WebSocket] Broadcast error for ${connection.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Close a connection
   */
  async close(
    connectionId: string,
    code = 1000,
    reason = "Normal closure",
  ): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    const socket = connection.socket as {
      close: (code?: number, reason?: string) => void;
    };

    try {
      socket.close(code, reason);
    } catch (error) {
      logger.error(
        `[WebSocket] Error closing connection: ${(error as Error).message}`,
      );
    }

    await this.handleClose(connectionId, code, reason);
  }

  /**
   * Close all connections
   */
  async closeAll(code = 1001, reason = "Server shutdown"): Promise<void> {
    const closePromises = Array.from(this.connections.keys()).map((id) =>
      this.close(id, code, reason),
    );
    await Promise.all(closePromises);
  }

  /**
   * Get connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Start ping interval for a connection
   */
  private startPingInterval(connection: WebSocketConnection): void {
    if (this.config.pingInterval <= 0) {
      return;
    }

    const interval = setInterval(() => {
      const socket = connection.socket as {
        ping?: () => void;
        send: (data: string) => void;
      };

      try {
        // Try native ping if available
        if (typeof socket.ping === "function") {
          socket.ping();
        } else {
          // Send ping as message
          socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
        }
      } catch (error) {
        logger.error(
          `[WebSocket] Ping error for ${connection.id}: ${(error as Error).message}`,
        );
        this.close(connection.id, 1001, "Ping failed");
      }
    }, this.config.pingInterval);

    this.pingIntervals.set(connection.id, interval);
  }

  /**
   * Stop ping interval for a connection
   */
  private stopPingInterval(connectionId: string): void {
    const interval = this.pingIntervals.get(connectionId);
    if (interval) {
      clearInterval(interval);
      this.pingIntervals.delete(connectionId);
    }
  }
}

/**
 * WebSocket message router for handling different message types
 */
export class WebSocketMessageRouter {
  private routes = new Map<
    string,
    (connection: WebSocketConnection, payload: unknown) => Promise<unknown>
  >();

  /**
   * Register a message route
   */
  route(
    type: string,
    handler: (
      connection: WebSocketConnection,
      payload: unknown,
    ) => Promise<unknown>,
  ): void {
    this.routes.set(type, handler);
  }

  /**
   * Handle incoming message
   */
  async handle(
    connection: WebSocketConnection,
    message: WebSocketMessage,
  ): Promise<unknown> {
    if (message.type !== "text") {
      throw new WebSocketError("Only text messages are supported for routing");
    }

    let parsed: { type: string; payload?: unknown };
    try {
      parsed = JSON.parse(message.data as string);
    } catch {
      throw new WebSocketError("Invalid JSON message");
    }

    const { type, payload } = parsed;

    if (!type) {
      throw new WebSocketError("Message type is required");
    }

    const handler = this.routes.get(type);
    if (!handler) {
      throw new WebSocketError(`Unknown message type: ${type}`);
    }

    return handler(connection, payload);
  }

  /**
   * Get registered routes
   */
  getRoutes(): string[] {
    return Array.from(this.routes.keys());
  }
}

/**
 * Create a WebSocket handler for AI agent interactions
 */
export function createAgentWebSocketHandler(
  _neurolink: unknown,
): IWebSocketHandler {
  const router = new WebSocketMessageRouter();

  // Register message routes
  router.route("generate", async (connection, payload) => {
    const { prompt, options: _options } = payload as {
      prompt: string;
      options?: unknown;
    };
    // TODO(#1576): Implement generate using neurolink
    return { type: "response", data: `Received: ${prompt}` };
  });

  router.route("stream", async (connection, payload) => {
    const { prompt, options: _options } = payload as {
      prompt: string;
      options?: unknown;
    };
    // TODO(#1576): Implement streaming using neurolink
    return { type: "stream_start", data: { prompt } };
  });

  router.route("tool_call", async (connection, payload) => {
    const { toolName, args: _args } = payload as {
      toolName: string;
      args: unknown;
    };
    // TODO(#1576): Implement tool call using neurolink
    return { type: "tool_result", data: { toolName, result: null } };
  });

  return {
    onOpen: async (connection) => {
      logger.info(`[AgentWebSocket] Client connected: ${connection.id}`);
      const socket = connection.socket as { send: (data: string) => void };
      socket.send(
        JSON.stringify({
          type: "connected",
          connectionId: connection.id,
          timestamp: Date.now(),
        }),
      );
    },

    onMessage: async (connection, message) => {
      try {
        const result = await router.handle(connection, message);
        if (result) {
          const socket = connection.socket as { send: (data: string) => void };
          socket.send(JSON.stringify(result));
        }
      } catch (error) {
        const socket = connection.socket as { send: (data: string) => void };
        socket.send(
          JSON.stringify({
            type: "error",
            error: (error as Error).message,
          }),
        );
      }
    },

    onClose: async (connection, code, reason) => {
      logger.info(
        `[AgentWebSocket] Client disconnected: ${connection.id} (${code}: ${reason})`,
      );
    },

    onError: async (connection, error) => {
      logger.error(
        `[AgentWebSocket] Error for ${connection.id}: ${error.message}`,
      );
    },
  };
}
