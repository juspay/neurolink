/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for 13+ providers,
 * automatic fallback, streaming, MCP tool integration, HITL security,
 * Redis persistence, and enterprise-grade middleware.
 *
 * NeuroLink provides comprehensive AI functionality with battle-tested
 * patterns extracted from production systems at Juspay.
 *
 * @packageDocumentation
 * @module @juspay/neurolink
 * @category Core
 *
 * @example
 * ```typescript
 * import { NeuroLink } from '@juspay/neurolink';
 *
 * // Create NeuroLink instance
 * const neurolink = new NeuroLink();
 *
 * // Generate with any provider
 * const result = await neurolink.generate({
 *   input: { text: 'Explain quantum computing' },
 *   provider: 'vertex',
 *   model: 'gemini-3-flash'
 * });
 *
 * console.log(result.content);
 * ```
 *
 * @since 1.0.0
 */

// Core exports
import { AIProviderFactory } from "./core/factory.js";
export { AIProviderFactory };

export {
  AIProviderName,
  BedrockModels,
  OpenAIModels,
  VertexModels,
} from "./constants/enums.js";
// Dynamic Models exports
export { dynamicModelProvider } from "./core/dynamicModels.js";
// Tool Registration utility
export { validateTool } from "./sdk/toolRegistration.js";
// Export ALL types from the centralized type barrel
export * from "./types/index.js";
export type { DynamicModelConfig, ModelRegistry } from "./types/modelTypes.js";
// Utility exports
export {
  getAvailableProviders,
  getBestProvider,
  isValidProvider,
} from "./utils/providerUtils.js";

// Main NeuroLink wrapper class and diagnostic types
import { NeuroLink } from "./neurolink.js";
export { NeuroLink };
export type { MCPServerInfo } from "./types/mcpTypes.js";

// Observability configuration types
export type {
  LangfuseConfig,
  ObservabilityConfig,
  OpenTelemetryConfig,
} from "./types/observability.js";

export { buildObservabilityConfigFromEnv } from "./utils/observabilityHelpers.js";

import {
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  initializeOpenTelemetry,
  setLangfuseContext,
  shutdownOpenTelemetry,
} from "./services/server/ai/observability/instrumentation.js";
import { getTelemetryStatus as getStatus, initializeTelemetry as init } from "./telemetry/index.js";

export {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
  setLangfuseContext,
};

export type {
  AggregatedTools,
  BaseDeployerConfig,
  BuildConfig,
  BuildOutput,
  BuildTarget,
  BundlerMetadata,
  BundlerType,
  BundleSizeInfo,
  CloudflareDeployerConfig,
  DependencyAnalysis,
  // Dependency analysis types
  DependencyInfo,
  // Configuration types
  DeployConfig,
  DeployerFactoryConfig,
  // Registry metadata
  DeployerMetadata,
  DeploymentErrorCode,
  // Event types
  DeploymentEvents,
  // Core types
  DeploymentPlatform,
  DeploymentStatus,
  // Output types
  DeployResult,
  DiscoveredEntries,
  // Tool discovery types
  DiscoveredTool,
  DockerDeployerConfig,
  // Entry discovery types
  EntryFile,
  EnvironmentConfig,
  // Environment types
  EnvironmentVariable,
  ESBuildOptions,
  FlyioDeployerConfig,
  GeneratedServer,
  IBundler,
  // Interface types
  IDeployer,
  LambdaDeployerConfig,
  MiddlewareConfig as DeploymentMiddlewareConfig,
  NetlifyDeployerConfig,
  OpenAPIConfig,
  OutputFile,
  // Platform-specific configs
  PlatformConfig,
  // Factory config types
  PlatformConfigMap,
  ServerConfig,
  ValidationError as DeploymentValidationErrorType,
  // Validation types
  ValidationResult,
  ValidationRule,
  ValidationWarning,
  VercelDeployerConfig,
  ViteOptions,
} from "./deployment/index.js";
// Deployment system exports (new comprehensive system)
// Legacy deployer exports (for backward compatibility)
// These will be deprecated in future versions
export {
  AuthorizationError,
  AWSLambdaDeployer,
  // Deployers
  BaseDeployer,
  BuildError,
  BundlerError,
  // Bundlers
  BundlerFactory,
  BundlerRegistry,
  bundlerRegistry,
  CloudflareDeployer,
  ConfigurationError,
  createBundler,
  createDeployer,
  createPlatformError,
  DeployerRegistry,
  // Errors
  DeploymentError,
  DeploymentErrorCodes,
  DeploymentErrors,
  // Factory and Registry
  DeploymentFactory,
  DeploymentFactory as DeployerFactory,
  DeploymentNetworkError,
  DeploymentTimeoutError,
  DockerDeployer,
  deploy,
  deployerRegistry,
  deploymentFactory,
  detectOptimalBundler,
  EnvironmentError,
  // Environment Manager
  EnvironmentManager,
  ESBuildBundler,
  environmentManager,
  FlyioDeployer,
  getRecommendedBuildConfig,
  isDeploymentError,
  isRetryableDeploymentError,
  NEUROLINK_ENV_REQUIREMENTS,
  NetlifyDeployer,
  PLATFORM_ENV_REQUIREMENTS,
  PlatformDeploymentError,
  RateLimitError,
  // Server Generator
  ServerGenerator,
  ValidationError as DeploymentValidationError,
  VercelDeployer,
  ViteBundler,
} from "./deployment/index.js";
export { MiddlewareFactory } from "./middleware/factory.js";
// Middleware exports
export type {
  MiddlewareConfig,
  MiddlewareContext,
  MiddlewareFactoryOptions,
  MiddlewarePreset,
  NeuroLinkMiddleware,
} from "./types/middlewareTypes.js";

// Version
export const VERSION = "1.0.0";

/**
 * Quick start factory function for creating AI provider instances.
 *
 * Creates a configured AI provider instance ready for immediate use.
 * Supports all 13 providers: OpenAI, Anthropic, Google AI Studio,
 * Google Vertex, AWS Bedrock, AWS SageMaker, Azure OpenAI, Hugging Face,
 * LiteLLM, Mistral, Ollama, OpenAI Compatible, and OpenRouter.
 *
 * @category Factory
 *
 * @param providerName - The AI provider name (e.g., 'bedrock', 'vertex', 'openai')
 * @param modelName - Optional model name to override provider default
 * @returns Promise resolving to configured AI provider instance
 *
 * @example Basic usage
 * ```typescript
 * import { createAIProvider } from '@juspay/neurolink';
 *
 * const provider = await createAIProvider('bedrock');
 * const result = await provider.stream({ input: { text: 'Hello, AI!' } });
 * ```
 *
 * @example With custom model
 * ```typescript
 * const provider = await createAIProvider('vertex', 'gemini-3-flash');
 * ```
 *
 * @see {@link AIProviderFactory.createProvider}
 * @see {@link NeuroLink} for the main SDK class
 * @since 1.0.0
 */
export async function createAIProvider(providerName?: string, modelName?: string) {
  return await AIProviderFactory.createProvider(providerName || "bedrock", modelName);
}

/**
 * Create provider with automatic fallback for production resilience.
 *
 * Creates both primary and fallback provider instances for high-availability
 * deployments. Automatically switches to fallback on primary provider failure.
 *
 * @category Factory
 *
 * @param primaryProvider - Primary AI provider name (default: 'bedrock')
 * @param fallbackProvider - Fallback AI provider name (default: 'vertex')
 * @param modelName - Optional model name for both providers
 * @returns Promise resolving to object with primary and fallback providers
 *
 * @example Production failover setup
 * ```typescript
 * import { createAIProviderWithFallback } from '@juspay/neurolink';
 *
 * const { primary, fallback } = await createAIProviderWithFallback('bedrock', 'vertex');
 *
 * try {
 *   const result = await primary.generate({ input: { text: 'Hello!' } });
 * } catch (error) {
 *   // Automatically use fallback
 *   const result = await fallback.generate({ input: { text: 'Hello!' } });
 * }
 * ```
 *
 * @example Multi-region setup
 * ```typescript
 * const { primary, fallback } = await createAIProviderWithFallback(
 *   'vertex',      // Primary: US region
 *   'bedrock',     // Fallback: Global
 *   'claude-3-sonnet'
 * );
 * ```
 *
 * @see {@link AIProviderFactory.createProviderWithFallback}
 * @since 1.0.0
 */
export async function createAIProviderWithFallback(
  primaryProvider?: string,
  fallbackProvider?: string,
  modelName?: string,
) {
  return await AIProviderFactory.createProviderWithFallback(
    primaryProvider || "bedrock",
    fallbackProvider || "vertex",
    modelName,
  );
}

/**
 * Create the best available provider based on environment configuration.
 *
 * Intelligently selects the best provider based on available API keys
 * in environment variables. Automatically detects and configures the
 * optimal provider without manual configuration.
 *
 * @category Factory
 *
 * @param requestedProvider - Optional preferred provider name
 * @param modelName - Optional model name
 * @returns Promise resolving to the best configured provider
 *
 * @example Automatic provider selection
 * ```typescript
 * import { createBestAIProvider } from '@juspay/neurolink';
 *
 * // Automatically uses provider with configured API key
 * const provider = await createBestAIProvider();
 * const result = await provider.generate({ input: { text: 'Hello!' } });
 * ```
 *
 * @example With provider preference
 * ```typescript
 * // Tries to use OpenAI, falls back to available provider
 * const provider = await createBestAIProvider('openai');
 * ```
 *
 * @remarks
 * Environment variables checked (in order):
 * - OPENAI_API_KEY
 * - ANTHROPIC_API_KEY
 * - GOOGLE_API_KEY
 * - VERTEX_PROJECT_ID + credentials
 * - AWS credentials for Bedrock
 * - And more...
 *
 * @see {@link AIProviderFactory.createBestProvider}
 * @see {@link getBestProvider} for provider detection utility
 * @since 1.0.0
 */
export async function createBestAIProvider(requestedProvider?: string, modelName?: string) {
  return await AIProviderFactory.createBestProvider(requestedProvider, modelName);
}

// ============================================================================
// MCP PLUGIN ECOSYSTEM - Universal AI Development Platform
// ============================================================================

/**
 * MCP (Model Context Protocol) Plugin Ecosystem
 *
 * Extensible plugin architecture based on research blueprint for
 * transforming NeuroLink into a Universal AI Development Platform.
 *
 * @example
 * ```typescript
 * import { mcpEcosystem, readFile, writeFile } from '@juspay/neurolink';
 *
 * // Initialize the ecosystem
 * await mcpEcosystem.initialize();
 *
 * // List available plugins
 * const plugins = await mcpEcosystem.list();
 *
 * // Use filesystem operations
 * const content = await readFile('README.md');
 * await writeFile('output.txt', 'Hello from MCP!');
 * ```
 */
export {
  CircuitBreakerManager,
  calculateExpiresAt,
  createOAuthProviderFromConfig,
  DEFAULT_HTTP_RETRY_CONFIG,
  DEFAULT_RATE_LIMIT_CONFIG,
  executeMCP,
  FileTokenStorage,
  getMCPStats,
  globalCircuitBreakerManager,
  globalRateLimiterManager,
  // HTTP Transport utilities
  HTTPRateLimiter,
  // OAuth Authentication
  InMemoryTokenStorage,
  // Core MCP ecosystem
  // Simplified MCP exports
  initializeMCPEcosystem,
  isRetryableHTTPError,
  isRetryableStatusCode,
  isTokenExpired,
  listMCPs,
  // Circuit Breaker
  MCPCircuitBreaker,
  mcpLogger,
  NeuroLinkOAuthProvider,
  RateLimiterManager,
  withHTTPRetry,
} from "./mcp/index.js";

export type {
  AuthorizationUrlResult,
  DiscoveredMcp,
  HTTPRetryConfig,
  MCPOAuthConfig,
  McpMetadata,
  OAuthClientInformation,
  OAuthTokens,
  // HTTP Transport types
  RateLimitConfig,
  TokenExchangeRequest,
  TokenStorage,
} from "./types/mcpTypes.js";

export type {
  ExecutionContext,
  ToolExecutionResult,
  ToolInfo,
} from "./types/tools.js";

export type { LogLevel } from "./types/utilities.js";

// ============================================================================
// REAL-TIME SERVICES & TELEMETRY - Enterprise Platform Features
// ============================================================================

// Real-time Services (Phase 1) - Basic SSE functionality only
// export { createEnhancedChatService } from './chat/index.js';
// export type * from './services/types.js';

// Optional Telemetry (Phase 2) - Telemetry service initialization
export async function initializeTelemetry(): Promise<boolean> {
  try {
    const result = await init();
    return !!result;
  } catch {
    return false;
  }
}

export async function getTelemetryStatus(): Promise<{
  enabled: boolean;
  initialized: boolean;
  endpoint?: string;
  service?: string;
  version?: string;
}> {
  return getStatus();
}

// ============================================================================
// AUTHENTICATION - Multi-Provider Authentication System
// ============================================================================

export type {
  Auth0Config,
  AuthEventType,
  AuthenticatedContext,
  AuthMiddlewareConfig,
  AuthProviderConfig,
  AuthProviderRegistration,
  // Core types
  AuthProviderType,
  // Middleware types
  AuthRequestContext,
  AuthSession,
  AuthUser,
  // Provider-specific config types
  BaseAuthProviderConfig,
  BetterAuthConfig,
  ClerkConfig,
  CognitoConfig,
  CustomAuthConfig,
  FirebaseConfig,
  KeycloakConfig,
  // Provider interface
  MastraAuthProvider,
  RBACMiddlewareConfig,
  // Session types
  SessionStorage,
  SupabaseConfig,
  TokenValidationResult,
  WorkOSConfig,
} from "./auth/index.js";
/**
 * Authentication System
 *
 * Multi-provider authentication system supporting Better Auth, Auth0,
 * Clerk, Firebase, Supabase, and WorkOS.
 *
 * @example
 * ```typescript
 * import { AuthProviderFactory, SessionManager, createAuthMiddleware } from '@juspay/neurolink';
 *
 * // Create an auth provider
 * const authProvider = await AuthProviderFactory.createProvider('auth0', {
 *   name: 'auth0',
 *   domain: 'your-tenant.auth0.com',
 *   clientId: 'your-client-id'
 * });
 *
 * // Authenticate a user
 * const result = await authProvider.authenticate({
 *   email: 'user@example.com',
 *   password: 'password123'
 * });
 *
 * // Store session
 * const sessionManager = new SessionManager({ storageType: 'file' });
 * await sessionManager.createSession('auth0', result.session);
 *
 * // Create middleware for protecting endpoints
 * const authMiddleware = createAuthMiddleware({ required: true });
 * ```
 */
export {
  Auth0Provider,
  // Errors
  AuthError,
  AuthFactoryError,
  AuthMiddlewareError,
  AuthProviderError,
  // Factory and Registry
  AuthProviderFactory,
  AuthProviderRegistry,
  AuthRegistryError,
  // Provider implementations (for advanced usage)
  BaseAuthProvider,
  BetterAuthProvider,
  ClerkProvider,
  CognitoProvider,
  CustomAuthProvider,
  // Middleware
  createAuthMiddleware,
  createAuthProvider,
  createExpressAuthMiddleware,
  createProtectedMiddleware,
  createRateLimitByUserMiddleware,
  createRBACMiddleware,
  createSessionStorage,
  FirebaseProvider,
  getAuthContext,
  getAuthProviderFactory,
  getAuthProviderRegistry,
  getCurrentUser,
  hasPermission,
  hasRole,
  isAuthenticated,
  KeycloakProvider,
  MemorySessionStorage,
  RedisSessionStorage,
  registerAllAuthProviders,
  requireAuth,
  // Auth Context
  runWithAuthContext,
  // Session Management
  SessionManager,
  SupabaseProvider,
  // Rate Limiting
  UserRateLimiter,
  WorkOSProvider,
} from "./auth/index.js";

// ============================================================================
// STORAGE ABSTRACTION - Multi-Backend Storage System
// ============================================================================

// NOTE: Storage module is not yet implemented in this branch.
// These exports are commented out until the storage module is available.
/*
export type {
  // Config types
  BaseStorageConfig,
  InMemoryStorageConfig,
  LibSQLStorageConfig,
  // Migration types
  Migration,
  MigrationRecord,
  MigrationResult,
  MigrationRunnerOptions,
  MigrationStatus,
  MongoDBStorageConfig,
  PostgresStorageConfig,
  RedisStorageConfig,
  // Core types
  StorageAdapterType,
  StorageConfig,
  StorageConnectionStatus,
  StorageDeleteOptions,
  StorageDeleteResult,
  StorageExistsResult,
  // Export/Import types
  StorageExportOptions,
  StorageGetOptions,
  // Result types
  StorageGetResult,
  StorageHealthResult,
  StorageImportOptions,
  StorageItem,
  // Item types
  StorageItemMetadata,
  StorageListOptions,
  StorageListResult,
  StorageOperationStatus,
  StorageProvider,
  // Option types
  StorageSetOptions,
  StorageSetResult,
  StorageStats,
  StorageTransferResult,
} from "./storage/index.js";
*/
/**
 * Storage Abstraction System
 *
 * Unified storage abstraction layer with multiple backend adapters.
 * Supports in-memory, Redis, PostgreSQL, MongoDB, and LibSQL storage.
 *
 * @example
 * ```typescript
 * import { StorageFactory, MigrationRunner } from '@juspay/neurolink';
 *
 * // Create a storage provider
 * const storage = await StorageFactory.createAndConnect({
 *   adapter: 'redis',
 *   url: 'redis://localhost:6379',
 *   namespace: 'myapp'
 * });
 *
 * // Store and retrieve data
 * await storage.set('user:1', { name: 'John', email: 'john@example.com' });
 * const user = await storage.get('user:1');
 *
 * // Run migrations
 * const runner = new MigrationRunner(storage);
 * runner.registerMigration(myMigration);
 * await runner.runMigrations();
 * ```
 */
// NOTE: Storage module is not yet implemented in this branch.
/*
export {
  createMigrationId,
  createStorageFromEnv,
  defineMigration,
  // Adapters
  InMemoryStorageAdapter,
  LibSQLStorageAdapter,
  // Migrations
  MigrationRunner,
  MongoDBStorageAdapter,
  PostgresStorageAdapter,
  RedisStorageAdapter,
  // Factory
  StorageFactory,
} from "./storage/index.js";
*/

// ============================================================================
// BACKWARD COMPATIBILITY: Legacy generateText Function Exports
// ============================================================================

// Export legacy types for backward compatibility
export type {
  AnalyticsData,
  EvaluationData,
  TextGenerationOptions,
  TextGenerationResult,
} from "./types/index.js";

/**
 * Legacy generateText function for backward compatibility.
 *
 * Provides standalone text generation function for existing code.
 * For new code, use {@link NeuroLink.generate} instead which provides
 * more features including streaming, tools, and structured output.
 *
 * @category Legacy
 * @deprecated Use {@link NeuroLink.generate} for new code
 *
 * @param options - Text generation options
 * @param options.prompt - Input prompt text
 * @param options.provider - AI provider name (e.g., 'bedrock', 'openai')
 * @param options.model - Model name to use
 * @param options.temperature - Sampling temperature (0-2)
 * @param options.maxTokens - Maximum tokens to generate
 * @returns Promise resolving to text generation result with content and metadata
 *
 * @example Basic text generation
 * ```typescript
 * import { generateText } from '@juspay/neurolink';
 *
 * const result = await generateText({
 *   prompt: 'Explain quantum computing in simple terms',
 *   provider: 'bedrock',
 *   model: 'claude-3-sonnet'
 * });
 * console.log(result.content);
 * ```
 *
 * @example With temperature control
 * ```typescript
 * const result = await generateText({
 *   prompt: 'Write a creative story',
 *   provider: 'openai',
 *   temperature: 1.5,
 *   maxTokens: 500
 * });
 * ```
 *
 * @see {@link NeuroLink.generate} for modern API with more features
 * @since 1.0.0
 */
export async function generateText(
  options: import("./types/index.js").TextGenerationOptions,
): Promise<import("./types/index.js").TextGenerationResult> {
  // Create instance on-demand without auto-instantiation
  const neurolink = new NeuroLink();
  return await neurolink.generateText(options);
}
