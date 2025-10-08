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
  AIModelProviderConfig,
  StreamingOptions,
  ProviderAttempt,
  SupportedModelName,
} from "./types/index.js";

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
} from "./types/index.js";

// Utility exports
export {
  getBestProvider,
  getAvailableProviders,
  isValidProvider,
} from "./utils/providerUtils.js";

// Dynamic Models exports
export { dynamicModelProvider } from "./core/dynamicModels.js";
export type { DynamicModelConfig, ModelRegistry } from "./types/modelTypes.js";

// Main NeuroLink wrapper class and diagnostic types
import { NeuroLink } from "./neurolink.js";
export { NeuroLink };
export type { ProviderStatus, MCPStatus } from "./neurolink.js";
export type { MCPServerInfo } from "./types/mcpTypes.js";

// Observability configuration types
export type {
  ObservabilityConfig,
  LangfuseConfig,
  OpenTelemetryConfig,
} from "./types/observability.js";

import {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
} from "./services/server/ai/observability/instrumentation.js";
import {
  initializeTelemetry as init,
  getTelemetryStatus as getStatus,
} from "./telemetry/index.js";

export {
  initializeOpenTelemetry,
  shutdownOpenTelemetry,
  flushOpenTelemetry,
  getLangfuseHealthStatus,
};

// Middleware exports
export type {
  NeuroLinkMiddleware,
  MiddlewareContext,
  MiddlewareFactoryOptions,
  MiddlewarePreset,
  MiddlewareConfig,
} from "./types/middlewareTypes.js";
export { MiddlewareFactory } from "./middleware/factory.js";

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
// BACKWARD COMPATIBILITY: Legacy generateText Function Exports
// ============================================================================

// Export legacy types for backward compatibility
export type {
  TextGenerationOptions,
  TextGenerationResult,
  AnalyticsData,
  EvaluationData,
} from "./types/index.js";

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
  options: import("./types/index.js").TextGenerationOptions,
): Promise<import("./types/index.js").TextGenerationResult> {
  // Create instance on-demand without auto-instantiation
  const neurolink = new NeuroLink();
  return await neurolink.generateText(options);
}
