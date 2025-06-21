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

// Model enums
export {
  BedrockModels,
  OpenAIModels,
  VertexModels,
  DEFAULT_PROVIDER_CONFIGS,
} from "./core/types.js";

// Provider exports
export {
  GoogleVertexAI,
  AmazonBedrock,
  OpenAI,
  AnthropicProvider,
  AzureOpenAIProvider,
} from "./providers/index.js";
export type { ProviderName } from "./providers/index.js";
export { PROVIDERS, AVAILABLE_PROVIDERS } from "./providers/index.js";

// Utility exports
export {
  getBestProviderSync as getBestProvider,
  getAvailableProviders,
  isValidProvider,
} from "./utils/providerUtils.js";

// Main NeuroLink wrapper class
export { NeuroLink } from "./neurolink.js";
export type {
  TextGenerationOptions,
  StreamTextOptions,
  TextGenerationResult,
} from "./neurolink.js";

// Version
export const VERSION = "1.0.0";

/**
 * Quick start factory function
 *
 * @example
 * ```typescript
 * import { createAIProvider } from 'neurolink';
 *
 * const provider = await createAIProvider('bedrock');
 * const result = await provider.streamText('Hello, AI!');
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
 * import { createAIProviderWithFallback } from 'neurolink';
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
 * import { createBestAIProvider } from 'neurolink';
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
 * import { mcpEcosystem, readFile, writeFile } from 'neurolink';
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
