/**
 * Server Adapter Types
 * Comprehensive type system for NeuroLink server adapters
 */

import type { ExternalServerManager } from "../mcp/externalServerManager.js";
import type { MCPToolRegistry } from "../mcp/toolRegistry.js";
import type { NeuroLink } from "../neurolink.js";
import type { JsonObject, JsonValue } from "../types/common.js";
import type { ExternalMCPServerStatus } from "../types/externalMcp.js";

// ============================================
// Configuration Types
// ============================================

/**
 * Server adapter configuration
 */
export type ServerAdapterConfig = {
  /** Server port (default: 3000) */
  port?: number;

  /** Server host (default: "0.0.0.0") */
  host?: string;

  /** Base path for all routes (default: "/api") */
  basePath?: string;

  /** CORS configuration */
  cors?: CORSConfig;

  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig;

  /** Body parser configuration */
  bodyParser?: BodyParserConfig;

  /** Logging configuration */
  logging?: LoggingConfig;

  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;

  /** Enable metrics endpoint (default: true) */
  enableMetrics?: boolean;

  /** Enable Swagger/OpenAPI documentation (default: false) */
  enableSwagger?: boolean;

  /** Disable built-in health routes (use when registering healthRoutes separately) */
  disableBuiltInHealth?: boolean;

  /** Stream redaction configuration (disabled by default) */
  redaction?: RedactionConfig;

  /** Shutdown configuration for graceful shutdown behavior */
  shutdown?: ShutdownConfig;
};

/**
 * Required server adapter configuration (with defaults applied)
 */
export type RequiredServerAdapterConfig = {
  port: number;
  host: string;
  basePath: string;
  cors: RequiredCORSConfig;
  rateLimit: RequiredRateLimitConfig;
  bodyParser: RequiredBodyParserConfig;
  logging: RequiredLoggingConfig;
  timeout: number;
  enableMetrics: boolean;
  enableSwagger: boolean;
  disableBuiltInHealth: boolean;
  shutdown: RequiredShutdownConfig;
};

/**
 * CORS configuration
 */
export type CORSConfig = {
  /** Enable CORS (default: true) */
  enabled?: boolean;

  /** Allowed origins (default: ["*"]) */
  origins?: string[];

  /** Allowed HTTP methods */
  methods?: string[];

  /** Allowed headers */
  headers?: string[];

  /** Allow credentials */
  credentials?: boolean;

  /** Preflight cache max age in seconds */
  maxAge?: number;
};

/**
 * Required CORS configuration
 */
export type RequiredCORSConfig = {
  enabled: boolean;
  origins: string[];
  methods: string[];
  headers: string[];
  credentials: boolean;
  maxAge: number;
};

/**
 * Rate limiting configuration
 */
export type RateLimitConfig = {
  /** Enable rate limiting (default: true) */
  enabled?: boolean;

  /** Time window in milliseconds (default: 15 minutes) */
  windowMs?: number;

  /** Maximum requests per window (default: 100) */
  maxRequests?: number;

  /** Custom error message */
  message?: string;

  /** Skip rate limiting for certain paths */
  skipPaths?: string[];

  /** Custom key generator function */
  keyGenerator?: (ctx: ServerContext) => string;
};

/**
 * Required rate limit configuration
 */
export type RequiredRateLimitConfig = {
  enabled: boolean;
  windowMs: number;
  maxRequests: number;
  message: string;
  skipPaths?: string[];
  keyGenerator?: (ctx: ServerContext) => string;
};

/**
 * Body parser configuration
 */
export type BodyParserConfig = {
  /** Enable body parsing (default: true) */
  enabled?: boolean;

  /** Maximum body size (default: "10mb") */
  maxSize?: string;

  /** JSON body limit (default: "10mb") */
  jsonLimit?: string;

  /** Enable URL-encoded body parsing */
  urlEncoded?: boolean;
};

/**
 * Required body parser configuration
 */
export type RequiredBodyParserConfig = {
  enabled: boolean;
  maxSize: string;
  jsonLimit: string;
  urlEncoded: boolean;
};

/**
 * Logging configuration
 */
export type LoggingConfig = {
  /** Enable request logging (default: true) */
  enabled?: boolean;

  /** Log level */
  level?: "debug" | "info" | "warn" | "error";

  /** Include request body in logs */
  includeBody?: boolean;

  /** Include response body in logs */
  includeResponse?: boolean;
};

/**
 * Required logging configuration
 */
export type RequiredLoggingConfig = {
  enabled: boolean;
  level: "debug" | "info" | "warn" | "error";
  includeBody: boolean;
  includeResponse: boolean;
};

/**
 * Configuration for stream redaction
 *
 * IMPORTANT: Redaction is DISABLED by default (enabled: false)
 * This is an opt-in security feature to prevent accidental data exposure.
 */
export type RedactionConfig = {
  /**
   * Enable stream redaction (default: false)
   *
   * When false, redactStreamChunk() returns chunks unchanged.
   * Must be explicitly set to true to enable redaction.
   */
  enabled?: boolean;

  /** Additional field names to redact (case-insensitive) */
  additionalFields?: string[];

  /** Field names to preserve (not redact) */
  preserveFields?: string[];

  /** Whether to redact tool arguments when enabled (default: true) */
  redactToolArgs?: boolean;

  /** Whether to redact tool results when enabled (default: true) */
  redactToolResults?: boolean;

  /** Custom redaction placeholder (default: "[REDACTED]") */
  placeholder?: string;
};

// ============================================
// Request/Response Types
// ============================================

/**
 * Server request context
 * Passed to all route handlers and middleware
 */
export type ServerContext = {
  /** Unique request ID */
  requestId: string;

  /** HTTP method */
  method: string;

  /** Request path */
  path: string;

  /** Request headers */
  headers: Record<string, string>;

  /** Query parameters */
  query: Record<string, string>;

  /** Path parameters */
  params: Record<string, string>;

  /** Request body (parsed) */
  body?: unknown;

  /** NeuroLink SDK instance */
  neurolink: NeuroLink;

  /** Tool registry instance */
  toolRegistry: MCPToolRegistry;

  /** External server manager (optional) */
  externalServerManager?: ExternalServerManager;

  /** Request timestamp */
  timestamp: number;

  /** Additional metadata */
  metadata: Record<string, unknown>;

  /** User information (if authenticated) */
  user?: {
    id: string;
    email?: string;
    roles?: string[];
  };

  /** Session information */
  session?: {
    id: string;
    data?: Record<string, JsonValue>;
  };

  /** Abort signal for cancellation (set by abort signal middleware) */
  abortSignal?: AbortSignal;

  /** Abort controller for manual cancellation (set by abort signal middleware) */
  abortController?: AbortController;

  /** Raw framework response object (for framework-specific operations) */
  rawResponse?: unknown;

  /** Raw framework request object (for framework-specific operations) */
  rawRequest?: unknown;

  /** Response headers to be set (used by middleware to add headers) */
  responseHeaders?: Record<string, string>;

  /** Redaction configuration (for stream redaction support) */
  redaction?: RedactionConfig;
};

/**
 * Server response object
 */
export type ServerResponse<T = unknown> = {
  /** Response data */
  data?: T;

  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };

  /** Response metadata */
  metadata?: {
    requestId: string;
    timestamp: string;
    duration?: number;
  };
};

/**
 * Streaming response configuration
 */
export type StreamingConfig = {
  /** Enable streaming response */
  enabled: boolean;

  /** Content type for streaming */
  contentType?: "text/event-stream" | "application/x-ndjson";

  /** Keep-alive interval in milliseconds */
  keepAliveInterval?: number;
};

// ============================================
// Route Types
// ============================================

/**
 * HTTP methods supported by server adapters
 */
export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS";

/**
 * Route deprecation information
 */
export type RouteDeprecation = {
  /** Whether the route is deprecated */
  enabled: boolean;

  /** Version when deprecated */
  since?: string;

  /** Version when route will be removed */
  removeIn?: string;

  /** Alternative route to use */
  alternative?: string;

  /** Deprecation message */
  message?: string;
};

/**
 * Route definition
 */
export type RouteDefinition = {
  /** HTTP method */
  method: HttpMethod;

  /** Route path (supports parameters like :id) */
  path: string;

  /** Route handler function */
  handler: RouteHandler;

  /** Route description (for documentation) */
  description?: string;

  /** Request schema (for validation) */
  requestSchema?: JsonObject;

  /** Response schema (for documentation) */
  responseSchema?: JsonObject;

  /** Authentication required */
  auth?: boolean;

  /** Required roles */
  roles?: string[];

  /** Rate limit override for this route */
  rateLimit?: RateLimitConfig;

  /** Streaming configuration */
  streaming?: StreamingConfig;

  /** Route tags (for documentation) */
  tags?: string[];

  /** Route deprecation information */
  deprecated?: RouteDeprecation;
};

/**
 * Route handler function
 */
export type RouteHandler<T = unknown> = (
  ctx: ServerContext,
) => Promise<T | ServerResponse<T> | AsyncIterable<unknown>>;

/**
 * Route group for organizing related routes
 */
export type RouteGroup = {
  /** Group prefix */
  prefix: string;

  /** Routes in this group */
  routes: RouteDefinition[];

  /** Middleware specific to this group */
  middleware?: MiddlewareDefinition[];

  /** Group-level authentication */
  auth?: boolean;

  /** Group-level roles */
  roles?: string[];
};

// ============================================
// Middleware Types
// ============================================

/**
 * Middleware definition
 */
export type MiddlewareDefinition = {
  /** Middleware name */
  name: string;

  /** Execution order (lower = earlier) */
  order?: number;

  /** Middleware handler */
  handler: MiddlewareHandler;

  /** Paths to apply middleware to (default: all) */
  paths?: string[];

  /** Paths to exclude from middleware */
  excludePaths?: string[];
};

/**
 * Middleware handler function
 */
export type MiddlewareHandler = (
  ctx: ServerContext,
  next: () => Promise<unknown>,
) => Promise<unknown>;

// ============================================
// Event Types
// ============================================

/**
 * Server adapter events
 */
export type ServerAdapterEvents = {
  /** Server initialized */
  initialized: {
    config: ServerAdapterConfig;
    routeCount: number;
    middlewareCount: number;
  };

  /** Server started */
  started: {
    port: number;
    host: string;
    timestamp: Date;
  };

  /** Server stopped */
  stopped: {
    uptime: number;
    timestamp: Date;
  };

  /** Request received */
  request: {
    requestId: string;
    method: string;
    path: string;
    timestamp: Date;
  };

  /** Response sent */
  response: {
    requestId: string;
    statusCode: number;
    duration: number;
    timestamp: Date;
  };

  /** Error occurred */
  error: {
    requestId?: string;
    error: Error;
    timestamp: Date;
  };
};

// ============================================
// API Request/Response Types
// ============================================

/**
 * Agent execution request
 */
export type AgentExecuteRequest = {
  /** Input prompt or message */
  input: string | { text: string; images?: string[]; files?: string[] };

  /** Provider to use (optional) */
  provider?: string;

  /** Model to use (optional) */
  model?: string;

  /** System prompt (optional) */
  systemPrompt?: string;

  /** Temperature (0-1) */
  temperature?: number;

  /** Maximum tokens */
  maxTokens?: number;

  /** Tools to enable */
  tools?: string[];

  /** Enable streaming */
  stream?: boolean;

  /** Session ID for conversation memory */
  sessionId?: string;

  /** User ID for context */
  userId?: string;
};

/**
 * Agent execution response
 */
export type AgentExecuteResponse = {
  /** Generated content */
  content: string;

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Token usage */
  usage?: {
    /** Input tokens (also known as prompt tokens) */
    input: number;
    /** Output tokens (also known as completion tokens) */
    output: number;
    /** Total tokens used */
    total: number;
    /** Cache creation tokens (if applicable) */
    cacheCreationTokens?: number;
    /** Cache read tokens (if applicable) */
    cacheReadTokens?: number;
    /** Reasoning tokens (if applicable) */
    reasoning?: number;
    /** Cache savings percentage */
    cacheSavingsPercent?: number;
  };

  /** Tool calls made */
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, unknown>;
    result?: unknown;
  }>;

  /** Finish reason */
  finishReason?: string;

  /** Response metadata */
  metadata?: Record<string, JsonValue>;
};

/**
 * Embed request (single text)
 */
export type EmbedRequest = {
  /** Text to embed */
  text: string;

  /** Provider to use (optional) */
  provider?: string;

  /** Embedding model to use (optional) */
  model?: string;
};

/**
 * Embed response (single text)
 */
export type EmbedResponse = {
  /** The embedding vector */
  embedding: number[];

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Embedding dimension */
  dimension: number;
};

/**
 * Embed many request (batch texts)
 */
export type EmbedManyRequest = {
  /** Texts to embed */
  texts: string[];

  /** Provider to use (optional) */
  provider?: string;

  /** Embedding model to use (optional) */
  model?: string;
};

/**
 * Embed many response (batch texts)
 */
export type EmbedManyResponse = {
  /** The embedding vectors */
  embeddings: number[][];

  /** Provider used */
  provider: string;

  /** Model used */
  model: string;

  /** Number of embeddings */
  count: number;

  /** Embedding dimension */
  dimension: number;
};

/**
 * Tool execution request
 */
export type ToolExecuteRequest = {
  /** Tool name */
  name: string;

  /** Tool arguments */
  arguments: Record<string, unknown>;

  /** Session context */
  sessionId?: string;

  /** User context */
  userId?: string;
};

/**
 * Tool execution response
 */
export type ToolExecuteResponse = {
  /** Whether execution was successful */
  success: boolean;

  /** Result data */
  data?: unknown;

  /** Error message if failed */
  error?: string;

  /** Execution duration in ms */
  duration: number;

  /** Tool metadata */
  metadata?: Record<string, JsonValue>;
};

/**
 * MCP server status response
 */
export type MCPServerStatusResponse = {
  /** Server ID */
  serverId: string;

  /** Server name */
  name: string;

  /** Connection status */
  status: ExternalMCPServerStatus;

  /** Available tools count */
  toolCount: number;

  /** Last health check time */
  lastHealthCheck?: string;

  /** Error message if failed */
  error?: string;
};

/**
 * Health check response
 */
export type HealthResponse = {
  /** Health status */
  status: "ok" | "degraded" | "unhealthy";

  /** Timestamp */
  timestamp: string;

  /** Server uptime in milliseconds */
  uptime: number;

  /** Version information */
  version: string;
};

/**
 * Ready check response
 */
export type ReadyResponse = {
  /** Ready status */
  ready: boolean;

  /** Timestamp */
  timestamp: string;

  /** Service status */
  services: {
    neurolink: boolean;
    tools: boolean;
    externalServers: boolean;
  };
};

// ============================================
// Factory Types
// ============================================

/**
 * Supported server frameworks
 */
export type ServerFramework = "hono" | "express" | "fastify" | "koa";

/**
 * Server adapter factory options
 */
export type ServerAdapterFactoryOptions = {
  /** Framework to use */
  framework: ServerFramework;

  /** NeuroLink instance */
  neurolink: NeuroLink;

  /** Server configuration */
  config?: ServerAdapterConfig;
};

/**
 * Server status information
 */
export type ServerStatus = {
  /** Whether server is running */
  running: boolean;

  /** Server port */
  port: number;

  /** Server host */
  host: string;

  /** Server uptime in milliseconds */
  uptime: number;

  /** Number of registered routes */
  routes: number;

  /** Number of registered middleware */
  middlewares: number;

  /** Current lifecycle state */
  lifecycleState?: ServerLifecycleState;

  /** Number of active connections */
  activeConnections?: number;
};

// ============================================
// Streaming Types
// ============================================

/**
 * SSE write options
 */
export type SSEWriteOptions = {
  /** Event name */
  event?: string;

  /** Event data (will be JSON stringified if object) */
  data: string | object;

  /** Event ID */
  id?: string;

  /** Retry interval in milliseconds */
  retry?: number;
};

/**
 * Data stream writer interface
 */
export type DataStreamWriter = {
  /** Write text start event */
  writeTextStart(id: string): Promise<void>;

  /** Write text delta event */
  writeTextDelta(id: string, delta: string): Promise<void>;

  /** Write text end event */
  writeTextEnd(id: string): Promise<void>;

  /** Write tool call event */
  writeToolCall(toolCall: {
    id: string;
    name: string;
    arguments: Record<string, unknown>;
  }): Promise<void>;

  /** Write tool result event */
  writeToolResult(toolResult: {
    id: string;
    name: string;
    result: unknown;
  }): Promise<void>;

  /** Write arbitrary data event */
  writeData(data: unknown): Promise<void>;

  /** Write error event */
  writeError(error: { message: string; code?: string }): Promise<void>;

  /** Close the stream */
  close(): Promise<void>;
};

// ============================================
// WebSocket Types
// ============================================

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | "text"
  | "binary"
  | "ping"
  | "pong"
  | "close";

/**
 * WebSocket message
 */
export type WebSocketMessage = {
  type: WebSocketMessageType;
  data: string | ArrayBuffer;
  timestamp: number;
};

/**
 * Authenticated user information
 */
export type AuthenticatedUser = {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  metadata?: Record<string, unknown>;
};

/**
 * WebSocket connection
 */
export type WebSocketConnection = {
  id: string;
  socket: unknown;
  user?: AuthenticatedUser;
  metadata: Record<string, unknown>;
  createdAt: number;
  lastActivity: number;
};

/**
 * Authentication strategy types
 */
export type AuthStrategy = "bearer" | "apiKey" | "basic" | "custom" | "none";

/**
 * Authentication configuration
 */
export type AuthConfig = {
  strategy: AuthStrategy;
  required?: boolean;
  headerName?: string;
  queryParam?: string;
  validate?: (token: string) => Promise<AuthenticatedUser | null>;
  roles?: string[];
  permissions?: string[];
};

/**
 * WebSocket handler interface
 */
export type WebSocketHandler = {
  onOpen?: (connection: WebSocketConnection) => void | Promise<void>;
  onMessage?: (
    connection: WebSocketConnection,
    message: WebSocketMessage,
  ) => void | Promise<void>;
  onClose?: (
    connection: WebSocketConnection,
    code: number,
    reason: string,
  ) => void | Promise<void>;
  onError?: (
    connection: WebSocketConnection,
    error: Error,
  ) => void | Promise<void>;
};

/**
 * WebSocket server configuration
 */
export type WebSocketConfig = {
  path?: string;
  maxConnections?: number;
  pingInterval?: number;
  pongTimeout?: number;
  maxMessageSize?: number;
  auth?: AuthConfig;
};

// ============================================
// Lifecycle Types
// ============================================

/**
 * Server lifecycle states
 * Represents the current state of the server adapter
 */
export type ServerLifecycleState =
  | "uninitialized"
  | "initializing"
  | "initialized"
  | "starting"
  | "running"
  | "draining"
  | "stopping"
  | "stopped"
  | "error";

/**
 * Configuration for graceful shutdown behavior
 */
export type ShutdownConfig = {
  /**
   * Maximum time to wait for graceful shutdown in milliseconds
   * Default: 30000 (30 seconds)
   */
  gracefulShutdownTimeoutMs?: number;

  /**
   * Maximum time to wait for connections to drain in milliseconds
   * Default: 15000 (15 seconds)
   */
  drainTimeoutMs?: number;

  /**
   * Whether to force close connections after timeout
   * Default: true
   */
  forceClose?: boolean;
};

/**
 * Required shutdown configuration (with defaults applied)
 */
export type RequiredShutdownConfig = {
  gracefulShutdownTimeoutMs: number;
  drainTimeoutMs: number;
  forceClose: boolean;
};

/**
 * Tracked connection for graceful shutdown
 */
export type TrackedConnection = {
  /** Unique connection identifier */
  id: string;

  /** Timestamp when connection was created */
  createdAt: number;

  /** Underlying socket or connection object */
  socket?: unknown;

  /** Request ID if associated with a request */
  requestId?: string;

  /** Whether the connection is currently processing a request */
  isActive?: boolean;
};

// ============================================
// Error Types
// ============================================

/**
 * Error categories for server adapter errors
 */
export const ErrorCategory = {
  CONFIG: "CONFIG",
  VALIDATION: "VALIDATION",
  EXECUTION: "EXECUTION",
  EXTERNAL: "EXTERNAL",
  RATE_LIMIT: "RATE_LIMIT",
  AUTHENTICATION: "AUTHENTICATION",
  AUTHORIZATION: "AUTHORIZATION",
  STREAMING: "STREAMING",
  WEBSOCKET: "WEBSOCKET",
} as const;

export type ErrorCategoryType =
  (typeof ErrorCategory)[keyof typeof ErrorCategory];

/**
 * Error severity levels
 */
export const ErrorSeverity = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL",
} as const;

export type ErrorSeverityType =
  (typeof ErrorSeverity)[keyof typeof ErrorSeverity];

/**
 * Server adapter error codes
 */
export const ServerAdapterErrorCode = {
  // Configuration errors
  INVALID_CONFIG: "SERVER_ADAPTER_INVALID_CONFIG",
  MISSING_DEPENDENCY: "SERVER_ADAPTER_MISSING_DEPENDENCY",
  FRAMEWORK_INIT_FAILED: "SERVER_ADAPTER_FRAMEWORK_INIT_FAILED",

  // Route errors
  ROUTE_NOT_FOUND: "SERVER_ADAPTER_ROUTE_NOT_FOUND",
  ROUTE_CONFLICT: "SERVER_ADAPTER_ROUTE_CONFLICT",
  INVALID_ROUTE: "SERVER_ADAPTER_INVALID_ROUTE",

  // Execution errors
  HANDLER_ERROR: "SERVER_ADAPTER_HANDLER_ERROR",
  TIMEOUT: "SERVER_ADAPTER_TIMEOUT",
  MIDDLEWARE_ERROR: "SERVER_ADAPTER_MIDDLEWARE_ERROR",

  // Rate limit errors
  RATE_LIMIT_EXCEEDED: "SERVER_ADAPTER_RATE_LIMIT_EXCEEDED",

  // Authentication/Authorization errors
  AUTH_REQUIRED: "SERVER_ADAPTER_AUTH_REQUIRED",
  AUTH_INVALID: "SERVER_ADAPTER_AUTH_INVALID",
  FORBIDDEN: "SERVER_ADAPTER_FORBIDDEN",

  // Streaming errors
  STREAM_ERROR: "SERVER_ADAPTER_STREAM_ERROR",
  STREAM_ABORTED: "SERVER_ADAPTER_STREAM_ABORTED",

  // WebSocket errors
  WEBSOCKET_ERROR: "SERVER_ADAPTER_WEBSOCKET_ERROR",
  WEBSOCKET_CONNECTION_FAILED: "SERVER_ADAPTER_WEBSOCKET_CONNECTION_FAILED",

  // Validation errors
  VALIDATION_ERROR: "SERVER_ADAPTER_VALIDATION_ERROR",
  SCHEMA_ERROR: "SERVER_ADAPTER_SCHEMA_ERROR",

  // Server lifecycle errors
  START_FAILED: "SERVER_ADAPTER_START_FAILED",
  STOP_FAILED: "SERVER_ADAPTER_STOP_FAILED",
  ALREADY_RUNNING: "SERVER_ADAPTER_ALREADY_RUNNING",
  NOT_RUNNING: "SERVER_ADAPTER_NOT_RUNNING",
} as const;

export type ServerAdapterErrorCodeType =
  (typeof ServerAdapterErrorCode)[keyof typeof ServerAdapterErrorCode];

/**
 * Error context for server adapter errors
 */
export type ServerAdapterErrorContext = {
  category: ErrorCategoryType;
  severity: ErrorSeverityType;
  retryable: boolean;
  retryAfterMs?: number;
  requestId?: string;
  path?: string;
  method?: string;
  details?: Record<string, unknown>;
  cause?: Error;
};
