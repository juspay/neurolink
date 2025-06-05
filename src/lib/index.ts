/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for multiple providers,
 * automatic fallback, streaming, and tool integration.
 *
 * Extracted from lighthouse project's proven AI functionality.
 */

// Core exports
import { AIProviderFactory } from './core/factory.js';
export { AIProviderFactory };
export type {
  AIProvider,
  AIProviderName,
  ProviderConfig,
  StreamingOptions,
  ProviderAttempt,
  SupportedModelName
} from './core/types.js';

// Model enums
export {
  BedrockModels,
  OpenAIModels,
  VertexModels,
  DEFAULT_PROVIDER_CONFIGS
} from './core/types.js';

// Provider exports
export { GoogleVertexAI, AmazonBedrock, OpenAI } from './providers/index.js';
export type { ProviderName } from './providers/index.js';
export { PROVIDERS, AVAILABLE_PROVIDERS } from './providers/index.js';

// Utility exports
export {
  getBestProvider,
  getAvailableProviders,
  isValidProvider
} from './utils/providerUtils.js';

// Main NeuroLink wrapper class export
export { NeuroLink } from './neurolink.js';
export type {
  TextGenerationOptions,
  StreamTextOptions,
  TextGenerationResult
} from './neurolink.js';

// Version
export const VERSION = '1.0.0';

/**
 * Quick start factory function
 *
 * @example
 * ```typescript
 * import { createAIProvider } from 'neurolink';
 *
 * const provider = createAIProvider('bedrock');
 * const result = await provider.streamText('Hello, AI!');
 * ```
 */
export function createAIProvider(providerName?: string, modelName?: string) {
  return AIProviderFactory.createProvider(providerName || 'bedrock', modelName);
}

/**
 * Create provider with automatic fallback
 *
 * @example
 * ```typescript
 * import { createAIProviderWithFallback } from 'neurolink';
 *
 * const { primary, fallback } = createAIProviderWithFallback('bedrock', 'vertex');
 * ```
 */
export function createAIProviderWithFallback(
  primaryProvider?: string,
  fallbackProvider?: string,
  modelName?: string
) {
  return AIProviderFactory.createProviderWithFallback(
    primaryProvider || 'bedrock',
    fallbackProvider || 'vertex',
    modelName
  );
}

/**
 * Create the best available provider based on configuration
 *
 * @example
 * ```typescript
 * import { createBestAIProvider } from 'neurolink';
 *
 * const provider = createBestAIProvider();
 * ```
 */
export function createBestAIProvider(requestedProvider?: string, modelName?: string) {
  return AIProviderFactory.createBestProvider(requestedProvider, modelName);
}
