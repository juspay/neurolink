import type {
  GenerateOptions,
  GenerateResult,
  EnhancedProvider,
} from "../types/generate-types.js";
import type { AIProvider, TextGenerationOptions } from "../core/types.js";
import { CompatibilityConversionFactory } from "./compatibility-factory.js";

/**
 * Factory for enhancing providers with generate() capability using Proxy pattern
 * Maintains 100% backward compatibility while adding new generate method
 */
export class ProviderGenerateFactory {
  /**
   * Enhance any provider with generate() method using TypeScript Proxy
   */
  static enhanceProvider<T extends AIProvider>(
    provider: T,
  ): T & EnhancedProvider {
    return new Proxy(provider, {
      get(target, prop, receiver) {
        if (prop === "generate") {
          return ProviderGenerateFactory.createGenerateMethod(target);
        }
        return Reflect.get(target, prop, receiver);
      },

      has(target, prop) {
        if (prop === "generate") {
          return true;
        }
        return Reflect.has(target, prop);
      },
    }) as T & EnhancedProvider;
  }

  /**
   * Create the generate() method that internally uses generateText for performance parity
   */
  private static createGenerateMethod(provider: AIProvider) {
    return async (options: GenerateOptions): Promise<GenerateResult> => {
      // Validate input
      if (!options.input?.text) {
        throw new Error("Generate options must include input.text");
      }

      // Convert GenerateOptions to TextGenerationOptions
      const textOptions: TextGenerationOptions =
        CompatibilityConversionFactory.convertGenerateToText_Options(options);

      try {
        // Use existing generate method for identical performance
        const textResult = await provider.generate(textOptions);

        // Convert back to GenerateResult format with type safety
        const generateResult: GenerateResult = {
          content: (textResult as any)?.content || "",
          outputs: { text: (textResult as any)?.content || "" },
          provider: (textResult as any)?.provider,
          model: (textResult as any)?.model,
          usage: (textResult as any)?.usage
            ? {
                inputTokens: (textResult as any).usage?.promptTokens || 0,
                outputTokens: (textResult as any).usage?.completionTokens || 0,
                totalTokens: (textResult as any).usage?.totalTokens || 0,
              }
            : undefined,
          responseTime: (textResult as any)?.responseTime,
          toolsUsed: (textResult as any)?.toolsUsed,
          toolExecutions: (textResult as any)?.toolExecutions?.map(
            (te: any) => ({
              name: te.toolName || te.name || "",
              input: te.input || {},
              output: te.output || te.result,
              duration: te.executionTime || te.duration || 0,
            }),
          ),
          enhancedWithTools: (textResult as any)?.enhancedWithTools,
          availableTools: (textResult as any)?.availableTools?.map(
            (at: any) => ({
              name: at.name || "",
              description: at.description || "",
              parameters: at.parameters || {},
            }),
          ),
          analytics: (textResult as any)?.analytics,
          evaluation: (textResult as any)?.evaluation,
        };

        return generateResult;
      } catch (error) {
        throw new Error(`Generate method failed: ${error}`);
      }
    };
  }

  /**
   * Enhance all providers from a registry
   */
  static enhanceAllProviders(
    providers: Map<string, AIProvider>,
  ): Map<string, AIProvider & EnhancedProvider> {
    const enhancedProviders = new Map<string, AIProvider & EnhancedProvider>();

    for (const [name, provider] of providers) {
      enhancedProviders.set(name, this.enhanceProvider(provider));
    }

    return enhancedProviders;
  }
}
