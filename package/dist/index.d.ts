/**
 * NeuroLink AI Toolkit
 *
 * A unified AI provider interface with support for multiple providers,
 * automatic fallback, streaming, and tool integration.
 *
 * Extracted from lighthouse project's proven AI functionality.
 */
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
export {
  BedrockModels,
  OpenAIModels,
  VertexModels,
  DEFAULT_PROVIDER_CONFIGS,
} from "./core/types.js";
export { GoogleVertexAI, AmazonBedrock, OpenAI } from "./providers/index.js";
export type { ProviderName } from "./providers/index.js";
export { PROVIDERS, AVAILABLE_PROVIDERS } from "./providers/index.js";
export {
  getBestProvider,
  getAvailableProviders,
  isValidProvider,
} from "./utils/providerUtils.js";
export { NeuroLink } from "./neurolink.js";
export type {
  TextGenerationOptions,
  StreamTextOptions,
  TextGenerationResult,
} from "./neurolink.js";
export declare const VERSION = "1.0.0";
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
export declare function createAIProvider(
  providerName?: string,
  modelName?: string,
): import("./core/types.js").AIProvider;
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
export declare function createAIProviderWithFallback(
  primaryProvider?: string,
  fallbackProvider?: string,
  modelName?: string,
): {
  primary: import("./core/types.js").AIProvider;
  fallback: import("./core/types.js").AIProvider;
};
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
export declare function createBestAIProvider(
  requestedProvider?: string,
  modelName?: string,
): import("./core/types.js").AIProvider;
