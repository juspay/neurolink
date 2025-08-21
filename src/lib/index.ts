/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for multiple providers,
 * automatic fallback, streaming, and tool integration.
 *
 * Provides comprehensive AI functionality with proven patterns.
 */

// Core exports
import { AIProviderFactory } from "./core/factory.js";
export { AIProviderFactory };
export type {
  AIProvider,
  AIProviderName,
  ProviderConfig,
  StreamingOptions,
  ProviderAttempt,
  SupportedModelName,
} from "./core/types.js";

// NEW: Generate function exports
export type {
  GenerateOptions,
  GenerateResult,
  EnhancedProvider,
} from "./types/generateTypes.js";

// Tool Registration exports - use MCPServerInfo.tools format
export type { ToolContext } from "./sdk/toolRegistration.js";
export { validateTool } from "./sdk/toolRegistration.js";

export type { ToolResult, ToolDefinition } from "./types/tools.js";

// Model enums
export {
  BedrockModels,
  OpenAIModels,
  VertexModels,
  DEFAULT_PROVIDER_CONFIGS,
} from "./core/types.js";

// Utility exports
export {
  getBestProvider,
  getAvailableProviders,
  isValidProvider,
} from "./utils/providerUtils.js";

// Main NeuroLink wrapper class and diagnostic types
export { NeuroLink } from "./neurolink.js";
export type { ProviderStatus, MCPStatus } from "./neurolink.js";
export type { MCPServerInfo } from "./types/mcpTypes.js";

// Middleware exports
export type {
  NeuroLinkMiddleware,
  MiddlewareContext,
  MiddlewareFactoryOptions,
} from "./middleware/types.js";
export { MiddlewareRegistry, MiddlewareFactory } from "./middleware/index.js";
export { createAnalyticsMiddleware } from "./middleware/builtin/analytics.js";

// Version
export const VERSION = "1.0.0";

/**
 * Quick start factory function
 *
 * @example
 * ```typescript
 * import { createAIProvider } from '@juspay/neurolink';
 *
 * const provider = await createAIProvider('bedrock');
 * const result = await provider.stream({ input: { text: 'Hello, AI!' } });
 * ```
 */
export async function createAIProvider(
  providerName?: string,
  modelName?: string,
) {
  return await AIProviderFactory.createProvider(
    providerName || "bedrock",
    modelName,
  );
}

/**
 * Create provider with automatic fallback
 *
 * @example
 * ```typescript
 * import { createAIProviderWithFallback } from '@juspay/neurolink';
 *
 * const { primary, fallback } = await createAIProviderWithFallback('bedrock', 'vertex');
 * ```
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
 * Create the best available provider based on configuration
 *
 * @example
 * ```typescript
 * import { createBestAIProvider } from '@juspay/neurolink';
 *
 * const provider = await createBestAIProvider();
 * ```
 */
export async function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
) {
  return await AIProviderFactory.createBestProvider(
    requestedProvider,
    modelName,
  );
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
  // Core MCP ecosystem
  // Simplified MCP exports
  initializeMCPEcosystem,
  listMCPs,
  executeMCP,
  getMCPStats,
  mcpLogger,
} from "./mcp/index.js";

export type {
  McpMetadata,
  ExecutionContext,
  DiscoveredMcp,
  ToolInfo,
  ToolExecutionResult,
  LogLevel,
} from "./mcp/index.js";

// ============================================================================
// REAL-TIME SERVICES & TELEMETRY - Enterprise Platform Features
// ============================================================================

// Real-time Services (Phase 1) - Basic SSE functionality only
// export { createEnhancedChatService } from './chat/index.js';
// export type * from './services/types.js';

// Optional Telemetry (Phase 2) - Conditional export based on feature flag
export async function initializeTelemetry(): Promise<boolean> {
  if (process.env.NEUROLINK_TELEMETRY_ENABLED === "true") {
    const { initializeTelemetry: init } = await import("./telemetry/index.js");
    const result = await init();
    return !!result; // Convert TelemetryService to boolean
  }
  return Promise.resolve(false);
}

export function getTelemetryStatus(): {
  enabled: boolean;
  initialized: boolean;
} {
  if (process.env.NEUROLINK_TELEMETRY_ENABLED === "true") {
    return { enabled: true, initialized: false };
  }
  return { enabled: false, initialized: false };
}

// ============================================================================
// BACKWARD COMPATIBILITY: Legacy generateText Function Exports
// ============================================================================

// Export legacy types for backward compatibility
export type {
  TextGenerationOptions,
  TextGenerationResult,
  AnalyticsData,
  EvaluationData,
} from "./core/types.js";

/**
 * BACKWARD COMPATIBILITY: Legacy generateText function
 * Provides standalone generateText function for existing code that uses it
 *
 * @example
 * ```typescript
 * import { generateText } from '@juspay/neurolink';
 *
 * const result = await generateText({
 *   prompt: 'Hello, AI!',
 *   provider: 'bedrock',
 *   model: 'claude-3-sonnet'
 * });
 * console.log(result.content);
 * ```
 */
export async function generateText(
  options: import("./core/types.js").TextGenerationOptions,
): Promise<import("./core/types.js").TextGenerationResult> {
  // Import neurolink instance to avoid circular dependencies
  const { neurolink } = await import("./neurolink.js");
  return await neurolink.generateText(options);
}
