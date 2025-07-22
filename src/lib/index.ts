/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for multiple providers,
 * automatic fallback, streaming, and tool integration.
 *
 * Extracted from lighthouse project's proven AI functionality.
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
} from "./types/generate-types.js";
export { CompatibilityConversionFactory } from "./factories/compatibility-factory.js";
export { ProviderGenerateFactory } from "./factories/provider-generate-factory.js";

// Tool Registration exports
export type { SimpleTool, ToolContext } from "./sdk/tool-registration.js";
export {
  createTool,
  createTypedTool,
  validateTool,
} from "./sdk/tool-registration.js";

// MCP Types for extensions
export type {
  InMemoryMCPServerConfig,
  InMemoryToolInfo,
  InMemoryToolResult,
} from "./types/mcp-types.js";

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
export type { ProviderStatus, MCPStatus, MCPServerInfo } from "./neurolink.js";

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
  MCPEcosystem,
  mcpEcosystem,
  initializeMCPEcosystem,

  // Plugin management
  PluginManager,
  pluginManager,
  listMCPs,
  executeMCP,
  getMCPStats,

  // Quick filesystem operations
  readFile,
  writeFile,
  listFiles,
  createDirectory,

  // Core contracts and types
  MCP,
  SecurityManager,
  mcpLogger,

  // Core plugins
  FileSystemMCP,
} from "./mcp/index.js";

export type {
  MCPMetadata,
  ExecutionContext,
  MCPConstructor,
  MCPInstance,
  DiscoveredMCP,
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
