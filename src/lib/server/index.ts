/**
 * NeuroLink Server Adapters
 * Expose NeuroLink capabilities through HTTP APIs
 *
 * @example
 * ```typescript
 * import { NeuroLink } from "@juspay/neurolink";
 * import { createServer, createAllRoutes } from "@juspay/neurolink/server";
 *
 * const neurolink = new NeuroLink({
 *   provider: "openai",
 *   apiKey: process.env.OPENAI_API_KEY,
 * });
 *
 * // Create and start server
 * const server = await createServer(neurolink, {
 *   framework: "hono",
 *   config: { port: 3000 },
 * });
 *
 * await server.initialize();
 * await server.start();
 * ```
 */

// ============================================
// Abstract Base Class
// ============================================
export { BaseServerAdapter } from "./abstract/baseServerAdapter.js";
export { ExpressServerAdapter } from "./adapters/expressAdapter.js";
export { FastifyServerAdapter } from "./adapters/fastifyAdapter.js";
// ============================================
// Framework Adapters
// ============================================
export { HonoServerAdapter } from "./adapters/honoAdapter.js";
export { KoaServerAdapter } from "./adapters/koaAdapter.js";
// ============================================
// Errors
// ============================================
export {
  AlreadyRunningError,
  // Authentication/Authorization errors
  // (aliased: the bare names resolve to the provider-error classes of the
  // same name from types/ on the public @juspay/neurolink surface)
  AuthenticationError as ServerAuthenticationError,
  AuthorizationError as ServerAuthorizationError,
  // Configuration errors
  ConfigurationError,
  // Error recovery
  ErrorRecoveryStrategies,
  // Handler errors
  HandlerError,
  InvalidAuthenticationError,
  // Dependency errors
  MissingDependencyError,
  NotRunningError,
  // Rate limit errors
  RateLimitError as ServerRateLimitError,
  RouteConflictError,
  RouteNotFoundError,
  // Base error class
  ServerAdapterError,
  // Server lifecycle errors
  ServerStartError,
  ServerStopError,
  StreamAbortedError,
  // Streaming errors
  StreamingError,
  // Timeout errors
  ServerTimeoutError,
  // Validation errors
  ValidationError as ServerValidationError,
  WebSocketConnectionError,
  // WebSocket errors
  WebSocketError,
  // Utilities
  wrapError,
} from "./errors.js";
// ============================================
// Factory
// ============================================
export {
  createServer,
  ServerAdapterFactory,
} from "./factory/serverAdapterFactory.js";
export {
  createAbortSignalMiddleware,
  createExpressAbortMiddleware,
} from "./middleware/abortSignal.js";
// ============================================
// Middleware
// ============================================
export {
  createAuthMiddleware,
  createRoleMiddleware,
} from "./middleware/auth.js";

export {
  createCacheInvalidator,
  createCacheMiddleware,
  InMemoryCacheStore,
} from "./middleware/cache.js";
export {
  createCompressionMiddleware,
  createErrorHandlingMiddleware,
  createLoggingMiddleware,
  createRequestIdMiddleware,
  createSecurityHeadersMiddleware,
  createTimingMiddleware,
} from "./middleware/common.js";
export { createDeprecationMiddleware } from "./middleware/deprecation.js";
export {
  createMCPBodyAttachmentMiddleware,
  fastifyMCPBodyHook,
} from "./middleware/mcpBodyAttachment.js";
export {
  createRateLimitMiddleware,
  createSlidingWindowRateLimitMiddleware,
  InMemoryRateLimitStore,
} from "./middleware/rateLimit.js";
export {
  CommonSchemas,
  createFieldValidator,
  createRequestValidationMiddleware,
  ValidationError,
} from "./middleware/validation.js";
// ============================================
// OpenAPI
// ============================================
export {
  AgentExecuteRequestSchema as OpenAPIAgentExecuteRequestSchema,
  AgentExecuteResponseSchema,
  AgentInputSchema,
  ApiKeySecurityScheme,
  BasicSecurityScheme,
  BearerSecurityScheme,
  CommonParameters,
  ConversationMessageSchema,
  createApiInfo,
  createDeleteOperation,
  createErrorResponse as createOpenAPIErrorResponse,
  createGetOperation,
  createHeaderParameter,
  createOpenAPIGenerator,
  createPathParameter,
  createPostOperation,
  createQueryParameter,
  createServer as createOpenAPIServer,
  createStreamingPostOperation,
  createStreamingResponse,
  // Templates
  createSuccessResponse,
  DefaultServers,
  // Schemas
  ErrorResponseSchema,
  generateOpenAPIFromConfig,
  generateOpenAPISpec,
  HealthResponseSchema,
  MCPServerStatusSchema,
  MCPServersListResponseSchema,
  MCPServerToolSchema,
  MetricsResponseSchema,
  NeuroLinkApiInfo,
  // Generator
  OpenAPIGenerator,
  OpenAPISchemas,
  ProviderInfoSchema,
  ReadyResponseSchema,
  SessionSchema,
  SessionsListResponseSchema,
  StandardErrorResponses,
  StandardTags,
  TokenUsageSchema,
  ToolCallSchema,
  ToolDefinitionSchema,
  ToolExecuteRequestSchema as OpenAPIToolExecuteRequestSchema,
  ToolExecuteResponseSchema,
  ToolListResponseSchema,
  ToolParameterSchema,
} from "./openapi/index.js";
// ============================================
// Routes
// ============================================
export {
  createAgentRoutes,
  createAllRoutes,
  createHealthRoutes,
  createMCPRoutes,
  createMemoryRoutes,
  createOpenApiRoutes,
  createToolRoutes,
  registerAllRoutes,
  // The proxy doors. All three were reachable only from the deep path
  // ./routes/index.js, which is not a package export — so a consumer of
  // "@juspay/neurolink/server" could reach them only indirectly through
  // createAllRoutes' flags, never to mount one on its own.
  createClaudeProxyRoutes,
  createOpenAIProxyRoutes,
  createCodexProxyRoutes,
} from "./routes/index.js";
// ============================================
// Streaming
// ============================================
export {
  BaseDataStreamWriter,
  createDataStreamResponse,
  createDataStreamWriter,
  createNDJSONHeaders,
  createSSEHeaders,
  // Types
  DataStreamResponse,
  // Response
  // Writer
  formatSSEEvent,
  // Helpers
  pipeAsyncIterableToDataStream,
  WebStreamWriter,
} from "./streaming/index.js";
// ============================================
// Types
// ============================================

// Export error constants
export {
  ErrorCategory,
  ErrorSeverity,
  ServerAdapterErrorCode,
} from "../types/index.js";
export { createStreamRedactor, redactStreamChunk } from "./utils/redaction.js";
// ============================================
// Validation Utilities
// ============================================
export {
  AgentExecuteRequestSchema,
  createErrorResponse,
  ServerNameParamSchema,
  SessionIdParamSchema,
  ToolArgumentsSchema,
  ToolExecuteRequestSchema,
  ToolNameParamSchema,
  ToolSearchQuerySchema,
  validateParams,
  validateQuery,
  validateRequest,
} from "./utils/validation.js";
// ============================================
// WebSocket
// ============================================
export {
  createAgentWebSocketHandler,
  WebSocketConnectionManager,
  WebSocketMessageRouter,
} from "./websocket/index.js";
