import { GoogleVertexAI, AmazonBedrock, OpenAI, AnthropicProvider, AzureOpenAIProvider, GoogleAIStudio } from '../providers/index.js';
import { getBestProvider } from '../utils/providerUtils.js';
import { logger } from '../utils/logger.js';
import type { AIProvider, AIProviderName, SupportedModelName } from './types.js';

const componentIdentifier = 'aiProviderFactory';

/**
 * Factory for creating AI provider instances with centralized configuration
 */
export class AIProviderFactory {
  /**
   * Create a provider instance for the specified provider type
   * @param providerName - Name of the provider ('vertex', 'bedrock', 'openai')
   * @param modelName - Optional model name override
   * @returns AIProvider instance
   */
  static createProvider(providerName: string, modelName?: string | null): AIProvider {
    const functionTag = 'AIProviderFactory.createProvider';

    logger.debug(`[${functionTag}] Provider creation started`, {
      providerName,
      modelName: modelName || 'default'
    });

    try {
      let provider: AIProvider;

      switch (providerName.toLowerCase()) {
        case 'vertex':
        case 'google':
        case 'gemini':
          provider = new GoogleVertexAI(modelName);
          break;
        case 'bedrock':
        case 'amazon':
        case 'aws':
          provider = new AmazonBedrock(modelName);
          break;
        case 'openai':
        case 'gpt':
          provider = new OpenAI(modelName);
          break;
        case 'anthropic':
        case 'claude':
          provider = new AnthropicProvider();
          break;
        case 'azure':
        case 'azure-openai':
          provider = new AzureOpenAIProvider();
          break;
        case 'google-ai':
        case 'google-studio':
          provider = new GoogleAIStudio(modelName);
          break;
        default:
          throw new Error(
            `Unknown provider: ${providerName}. Supported providers: vertex, bedrock, openai, anthropic, azure, google-ai`
          );
      }

      logger.debug(`[${functionTag}] Provider creation succeeded`, {
        providerName,
        modelName: modelName || 'default',
        providerType: provider.constructor.name
      });

      return provider;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Provider creation failed`, {
        providerName,
        modelName: modelName || 'default',
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Create a provider instance with specific provider enum and model
   * @param provider - Provider enum value
   * @param model - Specific model enum value
   * @returns AIProvider instance
   */
  static createProviderWithModel(provider: AIProviderName, model: SupportedModelName): AIProvider {
    const functionTag = 'AIProviderFactory.createProviderWithModel';

    logger.debug(`[${functionTag}] Provider model creation started`, {
      provider,
      model
    });

    try {
      const providerInstance = this.createProvider(provider, model);

      logger.debug(`[${functionTag}] Provider model creation succeeded`, {
        provider,
        model,
        providerType: providerInstance.constructor.name
      });

      return providerInstance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Provider model creation failed`, {
        provider,
        model,
        error: errorMessage
      });

      throw error;
    }
  }

  /**
   * Create the best available provider automatically
   * @param requestedProvider - Optional preferred provider
   * @param modelName - Optional model name override
   * @returns AIProvider instance
   */
  static createBestProvider(requestedProvider?: string, modelName?: string | null): AIProvider {
    const functionTag = 'AIProviderFactory.createBestProvider';

    try {
      const bestProvider = getBestProvider(requestedProvider);

      logger.debug(`[${functionTag}] Best provider selected`, {
        requestedProvider: requestedProvider || 'auto',
        selectedProvider: bestProvider,
        modelName: modelName || 'default'
      });

      return this.createProvider(bestProvider, modelName);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Best provider selection failed`, {
        requestedProvider: requestedProvider || 'auto',
        error: errorMessage
      });

      throw error;
    }
  }

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
    modelName?: string | null
  ): { primary: AIProvider; fallback: AIProvider } {
    const functionTag = 'AIProviderFactory.createProviderWithFallback';

    logger.debug(`[${functionTag}] Fallback provider setup started`, {
      primaryProvider,
      fallbackProvider,
      modelName: modelName || 'default'
    });

    try {
      const primary = this.createProvider(primaryProvider, modelName);
      const fallback = this.createProvider(fallbackProvider, modelName);

      logger.debug(`[${functionTag}] Fallback provider setup succeeded`, {
        primaryProvider,
        fallbackProvider,
        modelName: modelName || 'default'
      });

      return { primary, fallback };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.debug(`[${functionTag}] Fallback provider setup failed`, {
        primaryProvider,
        fallbackProvider,
        error: errorMessage
      });

      throw error;
    }
  }
}

export { componentIdentifier };
