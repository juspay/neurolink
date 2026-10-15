/**
 * Server Adapter Types
 * Comprehensive type system for NeuroLink server adapters
 */

import type { ExternalServerManager } from "../mcp/externalServerManager.js";
import type { MCPToolRegistry } from "../mcp/toolRegistry.js";
import type { NeuroLink } from "../neurolink.js";
import type { JsonObject, JsonValue } from "./common.js";
import type { ExternalMCPServerStatus } from "./externalMcp.js";
import type { ProxyRuntimeConfigProvider } from "./proxy.js";
import type { TTSAudioFormat } from "./tts.js";
import type {
  STTCorrectionOptions,
  STTDecisionRecord,
  STTDictionaryEntry,
  STTEngineInfo,
  STTFallbackOptions,
  STTOutputOptions,
  STTOutputRendering,
  STTRoutingOptions,
  STTStreamingOptions,
  TranscribeTimings,
} from "./transcribe.js";
// ConversationMessage is locally defined further down in this file (line ~1350)
// — used by ServerVoiceSessionState and other server-side types.

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

  /**
   * Carry what middleware sets on its context (`ctx.user`, `ctx.session`,
   * `ctx.metadata`, `ctx.abortSignal` and `ctx.abortController`) to later
   * middleware and to the route handler, on every built-in adapter (default:
   * `false`). It does not apply to a context you build yourself: a custom
   * adapter, or a route handler called directly, can supply a context that
   * already has `ctx.user` set.
   *
   * Off, each adapter propagates context as it always did. Express, Fastify
   * and Koa build a fresh context for every middleware step and for the
   * handler and carry only `responseHeaders`; Hono shares one context between
   * the steps and the handler only when the caller sent its own
   * `X-Request-ID`. So a role guard, a permission guard or a rate-limit
   * `keyGenerator` registered after authentication sees `ctx.user` only on
   * that Hono request shape: on Express, Fastify and Koa, and on Hono without
   * a caller `X-Request-ID`, the user never reaches it and the guard refuses
   * everyone.
   *
   * On, the user and the rest reach later middleware and the handler on every
   * built-in adapter. Set it when guards or key generators depend on `ctx.user`.
   * `registerAllRoutes()` turns it on for the server by itself when called with
   * `perUserAuth`, which needs the user in the handler. A caller that builds
   * the agent routes with `createAgentRoutes(basePath, { perUserAuth: true })`
   * and registers them itself must set this on the server: with it off, such a
   * request has a user only on Hono when the client sent its own
   * `X-Request-ID`, and every other request runs as anonymous (no `userId`, no
   * session).
   *
   * The agent routes' warning about a body naming another user is raised only
   * with this on. With it off, a handler that does receive `ctx.user` (Hono
   * when the caller sent its own `X-Request-ID`) takes the user from it and
   * ignores the body's `userId`, so nothing is named over it; every other
   * request reaches the handler without a `ctx.user` to compare against.
   */
  carryMiddlewareState?: boolean;
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
  redaction?: RequiredRedactionConfig;
  shutdown: RequiredShutdownConfig;
  carryMiddlewareState: boolean;
};

/**
 * CORS configuration
 */
export type CORSConfig = {
  /** Enable CORS (default: true) */
  enabled?: boolean;

  /**
   * Allowed browser origins. Default `[]`: no cross-origin page may call the
   * server until an origin is listed; `["*"]` opts in to any origin.
   */
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

  /** Maximum body size for parsed bodies (default: "10mb") */
  maxSize?: string;

  /** JSON body limit (default: "10mb") */
  jsonLimit?: string;

  /**
   * Maximum size of a raw upload: `multipart/form-data`, `audio/*` and
   * `application/octet-stream` bodies, which reach a route as bytes
   * (the transcription routes). Default: `maxSize` when set, else "64mb";
   * the transcription routes apply their own `maxAudioBytes` (50 MB)
   * beneath it.
   */
  rawMaxSize?: string;

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
  rawMaxSize: string;
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

/**
 * Required redaction configuration (with defaults applied)
 */
export type RequiredRedactionConfig = {
  enabled: boolean;
  additionalFields: string[];
  preserveFields: string[];
  redactToolArgs: boolean;
  redactToolResults: boolean;
  placeholder: string;
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
  user?: AuthenticatedUser;

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
 * What middleware sets on its context that later middleware and the route
 * handler must see. Adapters build a fresh context for every step, so this is
 * what they carry between steps in the framework's per-request storage.
 */
export type ServerCarriedContext = Pick<
  ServerContext,
  "user" | "session" | "metadata" | "abortSignal" | "abortController"
>;

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

/** Options for `createAgentRoutes()`. */
export type ServerAgentRouteOptions = {
  /**
   * Directories a request's `input.images` / `input.files` entries may name as
   * local paths. Empty or omitted (the default) refuses every local path: a
   * server must not read its own disk on a caller's say-so unless the operator
   * names where.
   */
  allowedInputRoots?: string[];
  /**
   * Largest single attachment accepted, in bytes. Default 50 MiB. A `data:` URI
   * is measured by its string length. When `maxInputTotalBytes` is set lower,
   * the smaller of the two is the per-attachment cap.
   */
  maxInputBytes?: number;
  /**
   * Most attachments one request may carry, `input.images` and `input.files`
   * counted together. Default 20. A longer list is refused with 413 before any
   * attachment is read or downloaded.
   */
  maxInputAttachments?: number;
  /**
   * Largest sum of all attachments of one request, in bytes: images and files
   * share this one budget, and a `data:` URI is charged its string length.
   * Default 100 MiB. A request that overflows it is refused with 413, and a
   * file or download that would overflow it stops mid-transfer.
   */
  maxInputTotalBytes?: number;
  /**
   * For a caller of `createAgentRoutes()` itself; with `registerAllRoutes()` /
   * `createAllRoutes()` use `CreateRoutesOptions.perUserAuth` instead. The
   * routes can only take identity from `ctx.user` if the server hands it to
   * the handler, so a caller that registers them itself with this option must
   * create the server with `carryMiddlewareState: true`; `registerAllRoutes()`
   * does that for the server by itself. With `carryMiddlewareState` off, such a request has
   * a user only on Hono when the client sent its own `X-Request-ID` (Hono then
   * hands the handler the middleware's context regardless); every other request
   * runs as anonymous, with no `userId` and no session.
   *
   * Set to `true` when the authentication middleware identifies individual
   * people (one credential per person). The agent routes then take `userId`
   * and the session only from the authenticated user (`ctx.user`,
   * `ctx.session`) and ignore the request body's, on every adapter and for
   * every request, so a caller cannot act as someone else. A request with no
   * authenticated user gets no `userId` and no session, so with optional
   * authentication anonymous callers never share a conversation. Any truthy
   * value turns it on.
   *
   * **A server with per-person authentication must set this.** Left at the
   * default (`false`) identity resolves as it always has: requests choose
   * `userId` and `sessionId` in the body, so any authenticated caller can name
   * another person there and act as them. The one exception is Hono, where a
   * request whose client sent its own `X-Request-ID` header reaches the
   * handler with the middleware's context, and an authenticated `ctx.user`
   * (and `ctx.session`) wins over the body, as before, and so does it on a
   * context the built-in adapters did not build (your own adapter, a handler
   * called directly). Only this flag, with `carryMiddlewareState` on, makes the agent routes take
   * the user from `ctx.user`, and ignore the body's `userId`, on every
   * built-in adapter and every request. When the server carries middleware state
   * the routes log one warning per instance the first time a request served
   * from the body names a different `userId` than a `ctx.user` that is not
   * marked `shared: true`; the body's `userId` is still used. With `carryMiddlewareState`
   * off the handler has no `ctx.user` on such a request, so there is nothing to
   * compare and no warning.
   *
   * Leave it unset for no authentication or one shared API key, such as
   * `neurolink serve` with `NEUROLINK_SERVER_API_KEY`: a shared key names no
   * person, so requests choose `userId` and `sessionId` in the body. Middleware
   * for a shared key should set `shared: true` on the `AuthenticatedUser` it
   * returns, which keeps the warning quiet (the CLI's key middleware does).
   */
  perUserAuth?: boolean;
};

/**
 * The route options plus the one thing that belongs to a single call:
 * `resolveAgentInput` options. A signal is not route configuration, so it is
 * kept off {@link ServerAgentRouteOptions}, where `createAgentRoutes` would
 * apply it to every request.
 */
export type ServerAgentResolveOptions = ServerAgentRouteOptions & {
  /**
   * Cancels the resolution: an `https` download in flight is aborted and no
   * further attachment is started. Omitted, nothing can cancel it.
   */
  signal?: AbortSignal;
};

/**
 * An agent request's `input` once every attachment has been vetted: URLs and
 * allowed local paths are replaced by the bytes the server read itself, `data:`
 * URIs pass through untouched.
 */
export type ServerAgentResolvedInput = {
  text: string;
  images?: Array<Buffer | string>;
  files?: Array<Buffer | string>;
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
 * Client-supplied correlation id on an agent-protocol WebSocket message
 * (`{ type, payload, id }`). Echoed back on the matching response frame so a
 * caller with more than one in-flight message on a connection can tell which
 * frame answers which request; optional and ignored entirely by a client
 * that never sends one.
 */
export type WebSocketRequestId = string | number;

/**
 * Authenticated user information
 */
export type AuthenticatedUser = {
  id: string;
  /**
   * `true` when this identity stands for every holder of one credential, such
   * as a shared API key, rather than for one person. The agent routes then do
   * not warn when a request names a different `userId` in its body: with a
   * shared key every caller is one trust domain and the body is how callers
   * keep separate conversation memory. Middleware that sets one fixed user for
   * everyone holding a key should set this; per-person middleware should not.
   */
  shared?: boolean;
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
export type ServerAuthConfig = {
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
  auth?: ServerAuthConfig;
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

// Voice pipeline frame type
export type Frame =
  | { type: "audio"; data: Int16Array }
  | { type: "vad_start" }
  | { type: "vad_stop" }
  | { type: "transcript"; text: string; final: boolean }
  | { type: "llm_token"; text: string }
  | { type: "tts_audio"; data: Buffer }
  | { type: "interrupt" };

// =============================================================================
// SERVER VALIDATION TYPES (moved from server/utils/validation.ts)
// =============================================================================

/**
 * Standardized error response format
 */
export type ErrorResponse = {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
  httpStatus?: number;
};

/**
 * Generic validation result with type-safe data or error.
 * Named ServerValidationResult to avoid collision with tools.ts ValidationResult.
 */
export type ServerValidationResult<T> =
  | { success: true; data: T; error?: undefined }
  | { success: false; error: ErrorResponse; data?: undefined };

/**
 * Authentication configuration
 */

export type ServerServerAuthConfig = {
  /** Authentication type */
  type: "bearer" | "api-key" | "basic" | "custom";

  /**
   * Token validation function
   * Returns user information if valid, throws or returns null if invalid
   */
  validate: (token: string, ctx: ServerContext) => Promise<AuthResult | null>;

  /** Header name for token (default: "Authorization" for bearer, "X-API-Key" for api-key) */
  headerName?: string;

  /** Skip authentication for certain paths */
  skipPaths?: string[];

  /** Custom error message */
  errorMessage?: string;

  /**
   * Optional token extractor for custom authentication schemes
   * Only used when type is "custom"
   */
  extractToken?: (ctx: ServerContext) => string | null;

  /**
   * Skip authentication for dev playground requests during development.
   * When true (default), a request with an x-neurolink-dev-playground or
   * x-neurolink-playground header set to "true" bypasses authentication and
   * receives a default developer user context (`id: "playground"`,
   * `roles: ["developer"]`).
   *
   * Only applies when `process.env.NODE_ENV` is exactly `"development"`,
   * read on every request. With NODE_ENV unset, `"production"`, `"test"` or
   * any other value the header is ignored and the request must authenticate
   * as usual. Set this to `false` to refuse the header even in development.
   *
   * @default true
   */
  skipDevPlayground?: boolean;
};

/**
 * Cache configuration
 */

export type ServerCacheConfig = {
  /** Default TTL in milliseconds */
  ttlMs: number;

  /** Maximum cache size (number of entries) */
  maxSize?: number;

  /**
   * Custom key generator
   * Default: method + path + sorted query params
   */
  keyGenerator?: (ctx: ServerContext) => string;

  /**
   * Methods to cache (default: GET only)
   */
  methods?: string[];

  /**
   * Paths to cache (default: all paths)
   */
  paths?: string[];

  /**
   * Paths to exclude from caching
   */
  excludePaths?: string[];

  /**
   * Custom cache store
   * Default: in-memory store
   */
  store?: CacheStore;

  /**
   * Whether to include query params in cache key
   * Default: true
   */
  includeQuery?: boolean;

  /**
   * Custom TTL per path pattern
   */
  ttlByPath?: Record<string, number>;
};

/**
 * Base data stream event
 */

export type DataStreamEvent = {
  type: DataStreamEventType;
  id?: string;
  timestamp: number;
  data: unknown;
};

export type AuthResult = {
  /** User ID */
  id: string;

  /** User email (optional) */
  email?: string;

  /** User roles (optional) */
  roles?: string[];

  /**
   * `true` when this identity stands for every holder of one credential, such
   * as a shared API key, rather than one person. Carried to `ctx.user.shared`;
   * see `AuthenticatedUser.shared`.
   */
  shared?: boolean;

  /** Additional user data */
  metadata?: Record<string, unknown>;
};

export type CacheStore = {
  get(key: string): Promise<CacheEntry | undefined>;
  set(key: string, entry: CacheEntry): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
};

export type DataStreamEventType =
  | "text-start"
  | "text-delta"
  | "text-end"
  | "tool-call"
  | "tool-result"
  | "data"
  | "error"
  | "finish";

export type CacheEntry = {
  data: unknown;
  createdAt: number;
  ttlMs: number;
  headers?: Record<string, string>;
};

/** Voice-server conversation turn — superset role set. */
export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Subset of Message that excludes the system role (assistant+user only). */
export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

// =============================================================================
// OPENAPI GENERATOR (from server/openapi/generator.ts)
// =============================================================================

/** Configuration passed to the OpenAPI spec generator. */
export type OpenAPIGeneratorConfig = {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  includeSecurity?: boolean;
  basePath?: string;
  additionalTags?: Array<{
    name: string;
    description: string;
  }>;
  customSchemas?: Record<string, JsonObject>;
  routes?: RouteDefinition[];
};

/** Structured OpenAPI 3.1 specification object. */
export type OpenAPISpec = {
  openapi: "3.1.0";
  info: JsonObject;
  servers: JsonObject[];
  tags: JsonObject[];
  paths: Record<string, JsonObject>;
  components: {
    schemas: Record<string, JsonObject>;
    securitySchemes?: Record<string, JsonObject>;
    parameters?: Record<string, JsonObject>;
  };
  security?: JsonObject[];
};

// =============================================================================
// ROUTE HELPERS (from server/routes/index.ts)
// =============================================================================

/** Options for createAllRoutes / createRoutes. */
export type CreateRoutesOptions = {
  enableSwagger?: boolean;
  getRoutes?: () => RouteDefinition[];
  /** Enable every proxy door: Claude, OpenAI, Codex and Gemini. */
  proxy?: boolean;
  claudeProxy?: boolean;
  openaiProxy?: boolean;
  /**
   * Enable the Codex door on its own.
   *
   * Codex was reachable only from `neurolink proxy start` until this existed —
   * `createAllRoutes` mounted two of the doors, so an SDK consumer could not
   * expose it even deliberately.
   */
  codexProxy?: boolean;
  /** Enable the Gemini door on its own, for the same reason. */
  geminiProxy?: boolean;
  /**
   * Runtime config provider for engines that read it (currently: Codex
   * outbound fallback). NOTE: this option alone cannot make the Codex
   * outbound fallback's `anthropic` target reachable — that leg dispatches
   * through an in-process loopback (`loopbackPort` / `internalDispatch`)
   * that only `createCodexProxyRoutes`' direct, non-`CreateRoutesOptions`
   * parameters carry (the CLI's `neurolink proxy start` wires them; this
   * generic SDK route surface deliberately does not gain a new option for
   * it). Enabling the feature with an `anthropic` target here logs one
   * startup warning and then fails every such request at attempt time. A
   * `vertex`-only configuration is unaffected. See
   * docs/features/codex-proxy-support.md.
   */
  runtimeConfigProvider?: ProxyRuntimeConfigProvider;
  /**
   * Options for the transcription routes (`POST <basePath>/agent/transcribe`
   * and the OpenAI-compatible `POST /v1/audio/transcriptions`), which are
   * always mounted.
   */
  transcribe?: ServerTranscribeRouteOptions;
  /**
   * Options for the agent routes (`POST <basePath>/agent/execute` and
   * `/agent/stream`): where local-path attachments may be read from, and how
   * large an attachment may be. Whose identity the routes trust is decided by
   * the top-level `perUserAuth`, which is why it is not accepted here.
   */
  agent?: Omit<ServerAgentRouteOptions, "perUserAuth">;
  /**
   * Set to `true` when the authentication middleware identifies individual
   * people (one credential per person). The agent routes then take `userId`
   * and the session only from the authenticated user and ignore the request
   * body's, on every adapter and for every request; a request with no
   * authenticated user gets neither. Any truthy value turns it on.
   *
   * **A server with per-person authentication must set this.** Left at the
   * default (`false`) requests choose `userId` and `sessionId` in the body, so
   * any authenticated caller can name another person there and act as them.
   * The one exception is Hono, where a request whose client sent its own
   * `X-Request-ID` header reaches the handler with the middleware's context and
   * an authenticated `ctx.user` wins over the body, as before, and so on a
   * context the built-in adapters did not build (your own adapter, a handler
   * called directly); only this flag, with `carryMiddlewareState` on, makes the agent routes take
   * the user from `ctx.user` everywhere. When the server carries middleware state, the first time a
   * request served from the body names a different `userId` than its
   * `ctx.user`, the routes log a warning (once per instance); with `carryMiddlewareState`
   * off the handler has no `ctx.user` to compare, and there is no warning.
   * Leave it unset for no authentication or one shared
   * API key, such as `neurolink serve` with `NEUROLINK_SERVER_API_KEY`:
   * requests choose `userId` and `sessionId` in the body. Middleware for a
   * shared key should set `shared: true` on the `AuthenticatedUser` it
   * returns, which keeps the warning quiet.
   *
   * This is the one switch for a server built with `registerAllRoutes` /
   * `createAllRoutes`: every route group that scopes by identity reads it from
   * here, so it cannot be set for the agent routes alone. `registerAllRoutes`
   * also turns on the server's `carryMiddlewareState` when this is set, since
   * the routes need the user in the handler; `createAllRoutes` returns route
   * groups only, so a caller that registers them itself must create the server
   * with `carryMiddlewareState: true`; with `carryMiddlewareState` off, a `perUserAuth`
   * request has a user only on Hono when the client sent its own
   * `X-Request-ID`, and every other request runs as anonymous.
   */
  perUserAuth?: boolean;
};

// =============================================================================
// TRANSCRIBE ROUTES (from server/routes/transcribeRoutes.ts)
// =============================================================================

/** Options for `createTranscribeRoutes()`. */
/**
 * What `GET /agent/transcribe/providers` reports: the engines this server
 * can transcribe with, which one a request without a provider gets, and the
 * models behind the correction layer. Never a key or a URL with a secret.
 */
export type ServerTranscribeCapabilities = {
  /** The provider a request without one goes to. */
  default: string;
  providers: Array<{
    name: string;
    /** `builtin` ships with NeuroLink, `endpoint` comes from `NEUROLINK_STT_ENDPOINTS`, `registered` was added at runtime. */
    kind: "builtin" | "endpoint" | "registered";
    model?: string;
    /** The endpoint can answer a language verdict without transcribing (batch probe). */
    languageProbe?: boolean;
    /** The endpoint takes a language prior between utterances. */
    languagePrior?: boolean;
  }>;
  correction: {
    /** The decision model that judges dictionary candidates; `null` when none is configured (the dictionary is then applied as is). */
    decision: { provider: string; model: string } | null;
    /** The text model of the rewrite; `provider` is `null` when the instance default applies. */
    rewrite: { provider: string | null; model: string | null };
  };
};

export type ServerTranscribeRouteOptions = {
  /**
   * Directories a request's `audioPath` may point into. Empty or omitted (the
   * default) refuses every `audioPath`: a server must not read its own disk
   * on a caller's say-so unless the operator names where.
   */
  allowedAudioRoots?: string[];
  /** Largest audio accepted, decoded, in bytes. Default 50 MB. */
  maxAudioBytes?: number;
  /**
   * Prefix of the OpenAI-compatible route. Default `""`, so the route is
   * `/v1/audio/transcriptions` and an OpenAI client pointed at
   * `http://host:port/v1` works unchanged.
   */
  openaiBasePath?: string;
  /**
   * The STT evaluation collector, `POST <openaiBasePath>/v1/evals/stt`.
   * On by default; `false` removes its routes.
   */
  evals?: ServerSTTEvalOptions | false;
};

/** Where and how much the STT evaluation collector keeps. */
export type ServerSTTEvalOptions = {
  /**
   * Directory for one JSON-lines file per call, replayed on start. Default
   * `NEUROLINK_STT_EVAL_DIR`; without either, calls live in memory only.
   */
  dir?: string;
  /** Calls held in memory; the least recently updated are evicted (still on disk). Default 1000. */
  maxCalls?: number;
  /** Segments kept per call; later new ids are counted as `ignored`. Default 50,000. */
  maxSegmentsPerCall?: number;
};

/** One finalized transcript segment, from the STT people saw or the one run alongside it. */
export type ServerSTTEvalSegment = {
  /** Stable per segment: a resend with the same id replaces it. */
  id: string;
  /** `primary` = shown to users, `shadow` = run for evaluation only. */
  source: "primary" | "shadow";
  model: string;
  participant_identity: string;
  participant_name?: string;
  text: string;
  language?: string | null;
  /** Epoch seconds, when the STT reports timings. */
  start_time?: number | null;
  end_time?: number | null;
  /** Epoch seconds the sender received the final. */
  received_at: number;
};

/** Body of `POST /v1/evals/stt`: one batch of a call's segments. */
export type ServerSTTEvalBatchRequest = {
  call_id: string;
  room?: string;
  /** 1, 2, … per call. Numbers may skip when a send failed and was folded into the next. */
  batch: number;
  /** True on the batch sent after the last participant left. */
  final?: boolean;
  models: { primary: string; shadow: string };
  segments: ServerSTTEvalSegment[];
};

/** Answer to `POST /v1/evals/stt`. */
export type ServerSTTEvalBatchResponse = {
  call_id: string;
  batch: number;
  final: boolean;
  /** New segment ids. */
  inserted: number;
  /** Ids already held (a resend), replaced. */
  updated: number;
  /** New ids refused because the call is at `maxSegmentsPerCall`. */
  ignored: number;
  segments: { primary: number; shadow: number };
};

/** One call in `GET /v1/evals/stt`. */
export type ServerSTTEvalCallSummary = {
  call_id: string;
  room: string | null;
  models: { primary: string; shadow: string };
  final: boolean;
  batches: number;
  segments: { primary: number; shadow: number };
  speakers: number;
  first_received_at: number | null;
  last_received_at: number | null;
  /** Epoch ms this server last accepted a batch. */
  updated_at: number;
};

/** One STT's side of a speaker's comparison. */
export type ServerSTTEvalSide = {
  model: string;
  segments: number;
  words: number;
  /** Languages the STT reported, most frequent first. */
  languages: string[];
  /** Mean seconds from the end of speech to the final, when the STT reports timings. */
  mean_latency_s: number | null;
};

/**
 * Agreement between the two STTs for one speaker. Neither side is ground
 * truth: `disagreement` is the word edit distance between them divided by the
 * primary's word count, so 0 means both wrote the same words.
 */
export type ServerSTTEvalComparison = {
  participant_identity: string;
  participant_name: string;
  primary: ServerSTTEvalSide;
  shadow: ServerSTTEvalSide;
  /** Word edit distance / primary words, on normalized text. Null when the primary wrote nothing. */
  disagreement: number | null;
  /** The same on phonetic word keys, so one STT writing Devanagari and the other Latin is not counted as a difference. */
  phonetic_disagreement: number | null;
  /** `full` aligns the whole speaker; `windowed` aligns 5-minute windows of a long speaker. */
  method: "full" | "windowed";
};

/**
 * Where the STT evaluation collector exports to Langfuse. Read only from the
 * server's environment (`NEUROLINK_STT_EVAL_LANGFUSE_*`): neither a request
 * nor a route option can redirect evaluation data.
 */
export type ServerSTTEvalLangfuseConfig = {
  publicKey: string;
  secretKey: string;
  /** Default `https://cloud.langfuse.com`. */
  baseUrl: string;
  environment?: string;
};

/** One event of Langfuse's public ingestion API (`POST /api/public/ingestion`). */
export type ServerSTTEvalLangfuseEvent = {
  id: string;
  timestamp: string;
  type: "trace-create" | "event-create" | "score-create";
  body: Record<string, unknown>;
};

/** A call as the evaluation store holds it in memory. */
export type ServerSTTEvalCallRecord = {
  callId: string;
  room: string | null;
  models: { primary: string; shadow: string };
  final: boolean;
  batches: Set<number>;
  segments: Map<string, ServerSTTEvalSegment>;
  updatedAt: number;
};

/** Word edit distance between two readings, and the reference's word count. */
export type ServerSTTEvalAlignment = { distance: number; refWords: number };

/** `GET /v1/evals/stt/:callId`. */
export type ServerSTTEvalReport = ServerSTTEvalCallSummary & {
  /** Over every speaker: summed edit distances / summed primary words. */
  overall: {
    disagreement: number | null;
    phonetic_disagreement: number | null;
  };
  speakers_compared: ServerSTTEvalComparison[];
  /** Present with `?segments=true`, ordered by time. */
  segment_list?: ServerSTTEvalSegment[];
};

/**
 * Body of `POST <basePath>/agent/transcribe`. Exactly one of `audio`,
 * `audioUrl` or `audioPath`. There is no `credentials` field: a caller cannot
 * swap in its own key or point an engine at another host.
 */
export type ServerTranscribeRequest = {
  /** Base64 audio, or a `data:` URL. */
  audio?: string;
  /** `http(s)` URL the server downloads (SSRF-guarded, size-capped). */
  audioUrl?: string;
  /** Server-local path; refused unless it lies under `allowedAudioRoots`. */
  audioPath?: string;
  format?: TTSAudioFormat;
  provider?: string;
  model?: string;
  language?: string;
  prompt?: string;
  dictionary?: STTDictionaryEntry[];
  correction?: STTCorrectionOptions;
  fallback?: STTFallbackOptions;
  routing?: STTRoutingOptions;
  /** `"utterances"` runs the recording through the live pipeline (see `TranscribeOptions.chunking`). */
  chunking?: "engine" | "utterances";
  /** Renderings in other languages and scripts (see `TranscribeOptions.output`). */
  output?: Omit<STTOutputOptions, "languages"> & { languages: string[] };
  diarization?: boolean;
  wordTimestamps?: boolean;
  timeoutMs?: number;
};

/** The transcribe WebSocket's first text frame: the JSON route's fields without the audio. */
export type ServerTranscribeStreamConfig = Omit<
  ServerTranscribeRequest,
  "audio" | "audioUrl" | "audioPath" | "format"
> & {
  streaming?: STTStreamingOptions;
};

/** One segment of the OpenAI `verbose_json` transcription shape. */
export type ServerOpenAITranscriptionSegment = {
  id: number;
  start: number;
  end: number;
  text: string;
  /** NeuroLink extension: speaker label when diarization ran. */
  speaker?: string;
};

/** One word of the OpenAI `verbose_json` transcription shape. */
export type ServerOpenAITranscriptionWord = {
  word: string;
  start: number;
  end: number;
  /** NeuroLink extension: speaker label when diarization ran. */
  speaker?: string;
};

/**
 * `POST /v1/audio/transcriptions` with `response_format=verbose_json`:
 * OpenAI's shape, plus NeuroLink's extras in snake_case.
 */
export type ServerOpenAITranscriptionResponse = {
  task: "transcribe";
  text: string;
  language?: string;
  duration?: number;
  segments?: ServerOpenAITranscriptionSegment[];
  words?: ServerOpenAITranscriptionWord[];
  /** Engine text before correction. */
  raw: string;
  /** Present when the correction changed the text. */
  corrected?: string;
  decisions?: STTDecisionRecord[];
  engine: STTEngineInfo;
  language_detected?: boolean;
  steps: string[];
  timings: TranscribeTimings;
  /** NeuroLink extension: one rendering per requested output language. */
  outputs?: Record<string, STTOutputRendering>;
};

/** Options for `attachTranscribeWebSocket()`. */
export type ServerTranscribeWebSocketOptions = {
  /** Upgrade path. Default `/v1/audio/transcriptions/stream`. */
  path?: string;
  /**
   * Token(s) required on the upgrade (`Authorization: Bearer` header or
   * `?token=`). `neurolink serve` passes the same keys as its HTTP routes
   * (`NEUROLINK_SERVER_API_KEY`, comma-separated), so one setting guards both.
   */
  authToken?: string | readonly string[];
  /**
   * Browser origins allowed to upgrade. A browser always sends `Origin` on a
   * WebSocket upgrade, and an upgrade whose `Origin` is not listed is refused
   * with 403; a request without the header (a non-browser client) is let
   * through, as CORS does not apply to it. Omitted, or containing `"*"`, means
   * any origin. `neurolink serve` passes its `cors.origins` here so one
   * allow-list covers the HTTP routes and the stream.
   */
  allowedOrigins?: readonly string[];
  /** Largest single frame, in bytes. Default 1 MiB. */
  maxPayload?: number;
  /**
   * Listener path of transcription sessions: a socket here reads one
   * session's speakers in its own languages. Default `<path>/subscribe`;
   * `false` turns sessions off (a `?session=` on the stream path is then
   * ignored).
   */
  subscribePath?: string | false;
  /**
   * OpenAI Realtime transcription path (`?intent=transcription`): the
   * protocol of OpenAI's `/v1/realtime`, so any OpenAI-Realtime client — the
   * LiveKit `openai.STT(use_realtime=True)` plugin, Pipecat, the OpenAI SDK —
   * streams to NeuroLink with no adapter. Default `/v1/realtime`; `false`
   * turns it off.
   */
  realtimePath?: string | false;
  /**
   * Profiles a realtime client selects with its `model` name. Merged over
   * `NEUROLINK_STT_REALTIME_PROFILES` (a JSON object of the same shape);
   * these win on a name in both.
   */
  realtimeProfiles?: Readonly<Record<string, ServerSTTRealtimeProfile>>;
};

/**
 * What an OpenAI-Realtime client gets when it names this profile as its
 * `model`. A realtime client can send only a model, a language, a prompt and
 * turn-detection numbers, so everything NeuroLink-specific (engine, fallback,
 * dictionary, correction, output languages) is the operator's, here.
 *
 * A `model` that is no profile but a configured STT provider uses that
 * provider with the defaults; any other name (OpenAI's own
 * `gpt-4o-mini-transcribe`, say) uses the profile named `default`, or the
 * server's defaults when there is none.
 */
export type ServerSTTRealtimeProfile = Omit<
  ServerTranscribeStreamConfig,
  "mode"
> & {
  /**
   * What `…input_audio_transcription.completed` carries: the corrected text
   * (`"corrected"`, default; it waits up to `correctionWaitMs` for the
   * correction, then sends the raw final) or the raw final at once.
   */
  completed?: "corrected" | "final";
  /** Longest wait for the correction before `completed` goes out with the final. Default 3000. */
  correctionWaitMs?: number;
  /**
   * Whether the client's `language` pins the transcription. Default `true`.
   * Note the LiveKit plugin sends `"en"` unless `detect_language=True`.
   */
  clientLanguage?: boolean;
  /**
   * Whether the client's `turn_detection.silence_duration_ms` sets the
   * utterance's closing pause. Default `false`: NeuroLink's endpointer keeps
   * its own (750 ms), since a client default such as LiveKit's 350 ms cuts
   * conversational speech mid-sentence.
   */
  clientTurnDetection?: boolean;
};

/** The parts of a `ws` socket the realtime handler uses. */
export type ServerRealtimeSocket = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(
    event: "message",
    listener: (
      data: Buffer | ArrayBuffer | Buffer[],
      isBinary: boolean,
    ) => void,
  ): unknown;
  on(event: "close" | "error", listener: () => void): unknown;
};

/** What a realtime client configured, read from either session dialect. */
export type ServerRealtimeSessionConfig = {
  dialect: "ga" | "beta";
  rate: number;
  model?: string;
  language?: string;
  prompt?: string;
  silenceMs?: number;
};

/** One utterance on the realtime wire: a conversation item. */
export type ServerRealtimeItem = {
  utterance: number;
  itemId: string;
  /** `speech_started` went out. */
  started: boolean;
  /** The committed prefix already sent as deltas. */
  sent: string;
  /** Server events held until every earlier item has completed. */
  pending: Array<{ type: string; body: Record<string, unknown> }>;
  finalText?: string;
  engine?: string;
  language?: string;
  languageDetected?: boolean;
  corrected: boolean;
  /** The transcript `completed` will carry, once known. */
  ready?: string;
  done: boolean;
  timer?: ReturnType<typeof setTimeout>;
};

// =============================================================================
// DATA STREAM (from server/streaming/dataStream.ts)
// =============================================================================

/** Data stream finish event. */
export type FinishEvent = DataStreamEvent & {
  type: "finish";
  data: {
    reason?: string;
    usage?: {
      input: number;
      output: number;
      total: number;
    };
  };
};

/** Configuration for DataStreamWriter. */
export type DataStreamWriterConfig = {
  write: (chunk: string) => void | Promise<void>;
  close?: () => void | Promise<void>;
  format?: "sse" | "ndjson";
  includeTimestamps?: boolean;
};

/** Configuration for the DataStreamResponse wrapper. */
export type DataStreamResponseConfig = {
  contentType?: "text/event-stream" | "application/x-ndjson";
  headers?: Record<string, string>;
  keepAliveInterval?: number;
  includeTimestamps?: boolean;
};

/** Options for a single SSE message. */
export type SSEEventOptions = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

// =============================================================================
// VOICE WEBSOCKET (from server/voice/voiceWebSocketHandler.ts)
// =============================================================================

/** Single token emitted by the Soniox STT stream. */
export type SonioxToken = {
  is_final?: boolean;
  text?: string;
};

/** Envelope received from the Soniox STT WebSocket. */
export type SonioxMessage = {
  error?: string;
  status?: string;
  type?: string;
  tokens?: SonioxToken[];
};

/** Control message received from the voice client over WebSocket. */
export type ClientControlMessage = {
  type?: string;
};

/**
 * Structural type for Picovoice Cobra VAD instance.
 * Defined here so the optional `@picovoice/cobra-node` package
 * is not required at typecheck time.
 */
export type CobraInstance = {
  frameLength: number;
  process: (pcm: Int16Array) => number;
  release: () => void;
};

/**
 * Per-WebSocket-connection context object passed to the voice connection
 * handler. Holds shared singletons that all per-connection state derives from.
 *
 * (Server-prefixed per CLAUDE.md Rule 9 — server-tier type.)
 */
export type ServerVoiceConnectionCtx = {
  neurolink: NeuroLink;
  accessKey: string;
};

/**
 * Per-session mutable state for one voice WebSocket connection.
 *
 * Threaded through the voice connection helper functions so each connection
 * has fully isolated turn / TTS / VAD / barge-in state. The class types
 * (`FrameBus`, `TurnManager`, `CartesiaStream`) are imported as types here so
 * that this file remains the single source of truth — consumers import this
 * type via the barrel and do not redefine it locally.
 *
 * (Server-prefixed per CLAUDE.md Rule 9 — server-tier type.)
 */
export type ServerVoiceSessionState = {
  cobra: CobraInstance | null;
  FRAME_LENGTH: number;
  FRAME_BYTES: number;
  bus: import("../server/voice/frameBus.js").FrameBus;
  turnManager: import("../server/voice/turnManager.js").TurnManager;
  sonioxWs: import("ws").WebSocket | null;
  keepAliveTimer: NodeJS.Timeout | null;
  sonioxReconnectTimer: ReturnType<typeof setTimeout> | null;
  sessionClosed: boolean;
  transcriptBuffer: string;
  activeTTS: import("../adapters/tts/cartesiaHandler.js").CartesiaStream | null;
  conversation: ConversationMessage[];
  currentTurnId: number;
  activePipelineTurnId: number | null;
  turnAborters: Set<{ aborted: boolean }>;
  playbackResetTimer: NodeJS.Timeout | null;
  bargeInLockedUntil: number;
  isSpeaking: boolean;
  silenceFrameCount: number;
  voiceFrameCount: number;
  frameRemainder: Buffer;
};

/**
 * Options accepted by `setupWebSocket()` in `server/voice/voiceWebSocketHandler.ts`.
 *
 * (Server-prefixed per CLAUDE.md Rule 9 — server-tier type. Lives in
 * `server.ts` rather than `cli.ts` because it configures a server-side
 * WebSocket upgrade handler, not CLI argument parsing.)
 */
export type ServerVoiceWebSocketOptions = {
  /**
   * Optional shared-secret bearer token. When set, the WebSocket upgrade
   * handshake must include `Authorization: Bearer <token>` or
   * `?token=<token>` in the URL. Without this, anyone reachable on the
   * network can open a session and consume Soniox / Cartesia / LLM credits.
   */
  authToken?: string;
  /**
   * Maximum WebSocket message size in bytes. Defaults to 1 MiB. Caps both
   * inbound audio frames and any client control messages — guards against
   * OOM via oversized uploads.
   */
  maxPayload?: number;
};
