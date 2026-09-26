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
  WebSocketRequestId,
  AuthenticatedUser,
  ServerAuthConfig as _AuthConfig,
} from "../../types/index.js";
import type { NeuroLink } from "../../neurolink.js";
import { WebSocketError, WebSocketConnectionError } from "../errors.js";
import { logger } from "../../utils/logger.js";
import { WebSocketAgentRequestSchema } from "../utils/validation.js";

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

    // Enforce the auth contract the config already declares. `auth.required`
    // has existed on WebSocketConfig (with a `strategy`) since this manager
    // was written, and `handleConnection` has always accepted and stored an
    // AuthenticatedUser — but nothing ever checked either, so a deployer who
    // set `required: true` got exactly the same open socket as one who did
    // not. That was latent while the agent routes were stubs that returned
    // canned values; it stops being latent the moment `tool_call` actually
    // reaches `executeTool`, because then an unauthenticated client can
    // invoke any registered tool with arbitrary arguments. Refuse the
    // connection rather than letting a route decide, so every handler
    // registered on this manager inherits the gate.
    if (this.config.auth.required && !user) {
      logger.warn(
        `[WebSocket] Rejected unauthenticated connection to ${path} (auth.required)`,
      );
      throw new WebSocketConnectionError(
        "Authentication required for this WebSocket endpoint",
      );
    }

    // Same gap, same fix, one field over. `ServerAuthConfig.roles`/
    // `permissions` and `AuthenticatedUser.roles`/`permissions` have existed
    // since this manager was written — the shipped "Role-Based Access
    // Control" doc example configures them on a `/ws/admin` path — but
    // nothing ever consulted either, so a deployer following that example
    // got an endpoint anyone authenticated could reach, regardless of role.
    // Semantics match the SDK's own `hasAnyRole`/`hasAllPermissions`
    // (src/lib/auth/authContext.ts): roles are an any-of allowlist,
    // permissions must all be present.
    const requiredRoles = this.config.auth.roles;
    if (requiredRoles && requiredRoles.length > 0) {
      const userRoles = user?.roles ?? [];
      if (!requiredRoles.some((role) => userRoles.includes(role))) {
        logger.warn(
          `[WebSocket] Rejected connection to ${path}: missing a required role`,
        );
        throw new WebSocketConnectionError(
          "Insufficient role for this WebSocket endpoint",
        );
      }
    }

    const requiredPermissions = this.config.auth.permissions;
    if (requiredPermissions && requiredPermissions.length > 0) {
      const userPermissions = user?.permissions ?? [];
      if (
        !requiredPermissions.every((permission) =>
          userPermissions.includes(permission),
        )
      ) {
        logger.warn(
          `[WebSocket] Rejected connection to ${path}: missing a required permission`,
        );
        throw new WebSocketConnectionError(
          "Insufficient permissions for this WebSocket endpoint",
        );
      }
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
 * Narrow an incoming message's raw `id` field to the one shape it is safe to
 * echo back (see `WebSocketRequestId`); anything else — including a missing
 * field, since most callers won't opt into correlation at all — is treated
 * as "no id".
 */
function readRequestId(value: unknown): WebSocketRequestId | undefined {
  return typeof value === "string" || typeof value === "number"
    ? value
    : undefined;
}

/**
 * WebSocket message router for handling different message types
 */
export class WebSocketMessageRouter {
  private routes = new Map<
    string,
    (
      connection: WebSocketConnection,
      payload: unknown,
      requestId?: WebSocketRequestId,
    ) => Promise<unknown>
  >();

  /**
   * Register a message route
   */
  route(
    type: string,
    handler: (
      connection: WebSocketConnection,
      payload: unknown,
      requestId?: WebSocketRequestId,
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

    let parsed: { type: string; payload?: unknown; id?: WebSocketRequestId };
    try {
      parsed = JSON.parse(message.data as string);
    } catch {
      throw new WebSocketError("Invalid JSON message");
    }

    const { type, payload, id } = parsed;
    const requestId = readRequestId(id);

    if (!type) {
      throw new WebSocketError("Message type is required");
    }

    const handler = this.routes.get(type);
    if (!handler) {
      throw new WebSocketError(`Unknown message type: ${type}`);
    }

    const result = await handler(connection, payload, requestId);

    // Overlapping in-flight messages on one connection previously produced
    // response frames with nothing tying them back to the request that
    // caused them (silent when the client had more than one call open at
    // once). A route that already tags its own frame — the streaming route
    // does, for the intermediate frames it sends directly — is left alone;
    // this only fills in the id for a plain result object that doesn't
    // carry one, so a route that ignores `requestId` still gets correlated
    // for free, and a client that never sends an `id` sees no change at all.
    if (
      requestId !== undefined &&
      result !== null &&
      typeof result === "object" &&
      !("id" in (result as Record<string, unknown>))
    ) {
      return { ...(result as Record<string, unknown>), id: requestId };
    }

    return result;
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
/**
 * Send one frame, reporting failure instead of throwing.
 *
 * A socket that has already closed throws on `send`. That matters in two
 * places here: mid-stream, where an unguarded throw unwinds into `onMessage`'s
 * catch, which then tries to send an error frame on the same dead socket and
 * throws again — this time with nothing above it to catch, i.e. an unhandled
 * rejection; and in that catch itself, for the same reason. Returning a
 * boolean lets both callers stop cleanly instead.
 */
function trySend(connection: { socket: unknown }, payload: unknown): boolean {
  const socket = connection.socket as { send: (data: string) => void };
  try {
    socket.send(JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Pull a correlation id off a raw incoming frame without depending on
 * `WebSocketMessageRouter.handle` having successfully parsed it — the one
 * case this is for is a message that fails *inside* `handle` (bad JSON,
 * missing type, unknown route), where the router never gets far enough to
 * return the id it would otherwise have tagged the response with. Failure
 * here (not text, not JSON, no `id`) just means "no id", the same as if the
 * client never sent one.
 */
function readIncomingRequestId(
  message: WebSocketMessage,
): WebSocketRequestId | undefined {
  if (message.type !== "text") {
    return undefined;
  }
  try {
    const parsed = JSON.parse(message.data as string) as { id?: unknown };
    return readRequestId(parsed.id);
  } catch {
    return undefined;
  }
}

export function createAgentWebSocketHandler(
  neurolink: NeuroLink,
): IWebSocketHandler {
  const router = new WebSocketMessageRouter();

  // Register message routes
  //
  // `payload` is attacker-controlled JSON (WebSocketMessageRouter.handle does
  // nothing but JSON.parse it), so `generate`/`stream` validate it against
  // `WebSocketAgentRequestSchema` before it reaches the SDK rather than
  // trusting a bare type assertion. The schema's `options` allowlist is
  // deliberately narrower than `GenerateOptions`/`StreamOptions` — most
  // importantly it has no `credentials` field, so a client can no longer
  // point the server's outbound request at an arbitrary `baseURL` (SSRF) or
  // swap in its own provider API key.
  router.route("generate", async (connection, payload) => {
    const parsed = WebSocketAgentRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WebSocketError(
        `Invalid generate payload: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
      );
    }
    const { prompt, options } = parsed.data;
    const result = await neurolink.generate({
      ...options,
      input: { text: prompt },
    });
    return { type: "response", content: result.content };
  });

  router.route("stream", async (connection, payload, requestId) => {
    const parsed = WebSocketAgentRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new WebSocketError(
        `Invalid stream payload: ${parsed.error.issues.map((issue) => issue.message).join(", ")}`,
      );
    }
    const { prompt, options } = parsed.data;

    // stream_start/chunk are sent directly through trySend rather than
    // returned, so — unlike generate/tool_call's single returned frame —
    // they sit outside WebSocketMessageRouter.handle's own id-tagging and
    // must carry the correlation id themselves.
    const withRequestId = (
      frame: Record<string, unknown>,
    ): Record<string, unknown> =>
      requestId !== undefined ? { ...frame, id: requestId } : frame;

    if (
      !trySend(
        connection,
        withRequestId({ type: "stream_start", data: { prompt } }),
      )
    ) {
      return undefined;
    }

    const result = await neurolink.stream({
      ...options,
      input: { text: prompt },
    });
    let clientPresent = true;
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        if (
          !trySend(
            connection,
            withRequestId({ type: "chunk", content: chunk.content }),
          )
        ) {
          // The client is gone. Breaking runs the stream's IteratorClose,
          // which now aborts the upstream request rather than leaving it in
          // flight for a reader that no longer exists.
          clientPresent = false;
          logger.info(
            `[AgentWebSocket] Client went away mid-stream: ${connection.id}`,
          );
          break;
        }
      }
    }

    // Returning nothing keeps onMessage from sending a completion frame on a
    // socket that just refused one.
    return clientPresent ? { type: "stream_complete" } : undefined;
  });

  router.route("tool_call", async (connection, payload) => {
    const { toolName, args } = payload as {
      toolName: string;
      args: unknown;
    };
    const result = await neurolink.executeTool(toolName, args);
    return { type: "tool_result", toolName, result };
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
      // Best-effort only: a malformed frame still fails inside
      // router.handle below (and reports as an id-less error, same as
      // before), this just lets a *valid* frame's error response carry the
      // same correlation id a successful response would have gotten.
      const requestId = readIncomingRequestId(message);
      try {
        const result = await router.handle(connection, message);
        if (result) {
          trySend(connection, result);
        }
      } catch (error) {
        // Guarded: this catch is the last line of defence, so a throw from
        // the send itself — which is exactly what a closed socket does — has
        // nothing above it and would surface as an unhandled rejection.
        const errorFrame: Record<string, unknown> = {
          type: "error",
          error: (error as Error).message,
        };
        if (requestId !== undefined) {
          errorFrame.id = requestId;
        }
        if (!trySend(connection, errorFrame)) {
          logger.warn(
            `[AgentWebSocket] Could not deliver error frame, socket closed: ${connection.id}`,
          );
        }
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
