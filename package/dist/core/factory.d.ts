import type {
  AIProvider,
  AIProviderName,
  SupportedModelName,
} from "./types.js";
declare const componentIdentifier = "aiProviderFactory";
/**
 * Factory for creating AI provider instances with centralized configuration
 */
export declare class AIProviderFactory {
  /**
   * Create a provider instance for the specified provider type
   * @param providerName - Name of the provider ('vertex', 'bedrock', 'openai')
   * @param modelName - Optional model name override
   * @returns AIProvider instance
   */
  static createProvider(
    providerName: string,
    modelName?: string | null,
  ): AIProvider;
  /**
   * Create a provider instance with specific provider enum and model
   * @param provider - Provider enum value
   * @param model - Specific model enum value
   * @returns AIProvider instance
   */
  static createProviderWithModel(
    provider: AIProviderName,
    model: SupportedModelName,
  ): AIProvider;
  /**
   * Create the best available provider automatically
   * @param requestedProvider - Optional preferred provider
   * @param modelName - Optional model name override
   * @returns AIProvider instance
   */
  static createBestProvider(
    requestedProvider?: string,
    modelName?: string | null,
  ): AIProvider;
  /**
   * Create primary and fallback provider instances
   * @param primaryProvider - Primary provider name
   * @param fallbackProvider - Fallback provider name
   * @param modelName - Optional model name override
   * @returns Object with primary and fallback providers
   */
  static createProviderWithFallback(
    primaryProvider: string,
    fallbackProvider: string,
    modelName?: string | null,
  ): {
    primary: AIProvider;
    fallback: AIProvider;
  };
}
export { componentIdentifier };
