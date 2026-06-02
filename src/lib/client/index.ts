/**
 * NeuroLink Client SDK
 *
 * Comprehensive client SDK for accessing the NeuroLink API from JavaScript/TypeScript
 * applications. Provides HTTP clients, React hooks, Vercel AI SDK compatibility,
 * and real-time streaming support.
 *
 * @packageDocumentation
 * @module @neurolink/client
 *
 * @example Basic HTTP Client Usage
 * ```typescript
 * import { createClient } from '@neurolink/client';
 *
 * const client = createClient({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: process.env.NEUROLINK_API_KEY,
 * });
 *
 * // Generate text
 * const result = await client.generate({
 *   input: { text: 'Hello, world!' },
 *   provider: 'openai',
 *   model: 'gpt-4o',
 * });
 *
 * console.log(result.data.content);
 * ```
 *
 * @example React Hooks Usage
 * ```tsx
 * import { NeuroLinkProvider, useChat } from '@neurolink/react';
 *
 * function App() {
 *   return (
 *     <NeuroLinkProvider config={{ baseUrl: '/api', apiKey: '...' }}>
 *       <ChatComponent />
 *     </NeuroLinkProvider>
 *   );
 * }
 *
 * function ChatComponent() {
 *   const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
 *     agentId: 'my-agent',
 *   });
 *
 *   return (
 *     <div>
 *       {messages.map(m => <div key={m.id}>{m.content}</div>)}
 *       <form onSubmit={handleSubmit}>
 *         <input value={input} onChange={handleInputChange} />
 *         <button disabled={isLoading}>Send</button>
 *       </form>
 *     </div>
 *   );
 * }
 * ```
 *
 * @example Vercel AI SDK Compatibility
 * ```typescript
 * import { createNeuroLinkProvider } from '@neurolink/ai-sdk';
 * import { generateText } from "ai-sdk";
 * // Replace "ai-sdk" with the Vercel AI SDK package name in your project.
 *
 * const neurolink = createNeuroLinkProvider({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: process.env.NEUROLINK_API_KEY,
 * });
 *
 * const result = await generateText({
 *   model: neurolink('gpt-4o'),
 *   prompt: 'Hello!',
 * });
 * ```
 *
 * @example Streaming with SSE
 * ```typescript
 * import { createStreamingClient } from '@neurolink/client/streaming';
 *
 * const client = createStreamingClient({
 *   baseUrl: 'https://api.neurolink.example.com',
 *   apiKey: process.env.NEUROLINK_API_KEY,
 *   transport: 'sse',
 * });
 *
 * const result = await client.stream({
 *   input: { text: 'Tell me a story' },
 *   callbacks: {
 *     onText: (text) => process.stdout.write(text),
 *     onDone: () => console.log('\nDone!'),
 *   },
 * });
 * ```
 */

// =============================================================================
// HTTP Client Exports
// =============================================================================

export {
  NeuroLinkClient,
  createClient,
  NeuroLinkApiError,
} from "./httpClient.js";

// =============================================================================
// React Hooks Exports
// Note: These exports require React 18+ as a peer dependency
// =============================================================================

export {
  NeuroLinkProvider,
  useNeuroLinkClient,
  useChat,
  useAgent,
  useWorkflow,
  useVoice,
  useStream,
  useTools,
} from "./reactHooks.js";

// =============================================================================
// AI SDK Adapter Exports
// =============================================================================

export {
  NeuroLinkLanguageModel,
  NeuroLinkProvider as NeuroLinkAIProvider,
  createNeuroLinkProvider,
  createNeuroLinkModel,
  createStreamingResponse,
  neurolink,
} from "./aiSdkAdapter.js";

// =============================================================================
// Interceptor Exports
// =============================================================================

export {
  // Authentication
  createApiKeyAuthInterceptor,
  createBearerAuthInterceptor,
  createDynamicAuthInterceptor,
  // Logging
  createLoggingInterceptor,
  // Retry
  createRetryInterceptor,
  // Rate Limiting
  createRateLimitInterceptor,
  // Request/Response Transformation
  createRequestTransformInterceptor,
  createResponseTransformInterceptor,
  // Caching
  createCacheInterceptor,
  // Timeout
  createTimeoutInterceptor,
  // Error Handling
  createErrorHandlerInterceptor,
  // Composition
  composeMiddleware,
  conditionalMiddleware,
} from "./interceptors.js";

// =============================================================================
// Streaming Client Exports
// =============================================================================

export {
  SSEClient,
  WebSocketStreamingClient,
  createStreamingClient,
  createAsyncStream,
  collectStream,
} from "./streamingClient.js";

// =============================================================================
// Dedicated WebSocket Client Exports
// =============================================================================

export { NeuroLinkWebSocket, createWebSocketClient } from "./wsClient.js";

// =============================================================================
// Dedicated SSE Client Exports
// =============================================================================

export { NeuroLinkSSE, createSSEClient } from "./sseClient.js";

// =============================================================================
// Authentication Exports
// =============================================================================

export {
  // Token Managers
  OAuth2TokenManager,
  JWTTokenManager,
  // Auth ClientMiddleware
  createApiKeyMiddleware,
  createBearerTokenMiddleware,
  createTokenManagerMiddleware,
  createAuthWithRetryMiddleware,
  createMultiAuthMiddleware,
  // Error Classes
  OAuth2Error,
  OAuth2AuthenticationError as OAuth2AuthError,
  TokenRefreshError,
  // Utilities
  decodeJWTPayload,
  isJWTExpired,
  getJWTExpiry,
  getApiKeyFromEnv,
} from "./auth.js";

// =============================================================================
// Error Exports
// =============================================================================

export {
  // Error Codes
  ErrorCode,
  // Base Error
  NeuroLinkError,
  // HTTP Errors
  HttpError,
  ClientRateLimitError,
  ClientValidationError,
  ClientAuthenticationError,
  ClientAuthorizationError,
  NotFoundError,
  // Network Errors
  ClientNetworkError,
  ClientTimeoutError,
  ClientConnectionError,
  // Client Errors
  AbortError,
  ClientConfigurationError,
  StreamError,
  // Provider Errors
  ClientProviderError,
  ContextLengthError,
  ContentFilterError,
  // Factory Functions
  createErrorFromResponse,
  createErrorFromNative,
  // Utilities
  mapStatusToErrorCode,
  isRetryableStatus,
  isRetryableError,
  isNeuroLinkError,
  isApiError,
} from "./errors.js";
