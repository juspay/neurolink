/**
 * NeuroLink - Unified AI Interface
 *
 * Simple wrapper around the AI provider system to provide a clean API
 * for CLI and other consumers.
 */

import { AIProviderFactory, createBestAIProvider } from './index.js';
import { getBestProvider } from './utils/providerUtils.js';
import type { AIProvider, AIProviderName } from './core/types.js';

export interface TextGenerationOptions {
  prompt: string;
  provider?: 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'auto';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
}

export interface StreamTextOptions {
  prompt: string;
  provider?: 'openai' | 'bedrock' | 'vertex' | 'anthropic' | 'azure' | 'auto';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface TextGenerationResult {
  content: string;
  provider?: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  responseTime?: number;
}

export class NeuroLink {
  /**
   * Generate text using the best available AI provider with automatic fallback
   */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const startTime = Date.now();
    const functionTag = 'NeuroLink.generateText';

    // Define fallback provider priority order
    const providerPriority = ['openai', 'vertex', 'bedrock'];
    const requestedProvider = options.provider === 'auto' ? undefined : options.provider;

    // If specific provider requested, try that first, then fallback to priority order
    const tryProviders = requestedProvider
      ? [requestedProvider, ...providerPriority.filter(p => p !== requestedProvider)]
      : providerPriority;

    console.log(`[${functionTag}] Starting text generation with fallback`, {
      requestedProvider: requestedProvider || 'auto',
      tryProviders,
      promptLength: options.prompt.length
    });

    let lastError: Error | null = null;

    for (const providerName of tryProviders) {
      try {
        console.log(`[${functionTag}] Attempting provider`, { provider: providerName });

        const provider = AIProviderFactory.createProvider(providerName);

        const result = await provider.generateText({
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt
        }, options.schema);

        if (!result) {
          throw new Error('No response received from AI provider');
        }

        const responseTime = Date.now() - startTime;

        console.log(`[${functionTag}] Provider succeeded`, {
          provider: providerName,
          responseTime,
          usage: result.usage
        });

        return {
          content: result.text || '',
          provider: providerName,
          usage: result.usage,
          responseTime
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        console.warn(`[${functionTag}] Provider failed, trying next`, {
          provider: providerName,
          error: errorMessage,
          remainingProviders: tryProviders.slice(tryProviders.indexOf(providerName) + 1)
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    console.error(`[${functionTag}] All providers failed`, {
      triedProviders: tryProviders,
      lastError: lastError?.message
    });

    throw new Error(`Failed to generate text with all providers. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Generate streaming text using the best available AI provider with automatic fallback
   */
  async generateTextStream(options: StreamTextOptions): Promise<AsyncIterable<{ content: string }>> {
    const functionTag = 'NeuroLink.generateTextStream';

    // Define fallback provider priority order
    const providerPriority = ['openai', 'vertex', 'bedrock'];
    const requestedProvider = options.provider === 'auto' ? undefined : options.provider;

    // If specific provider requested, try that first, then fallback to priority order
    const tryProviders = requestedProvider
      ? [requestedProvider, ...providerPriority.filter(p => p !== requestedProvider)]
      : providerPriority;

    console.log(`[${functionTag}] Starting stream generation with fallback`, {
      requestedProvider: requestedProvider || 'auto',
      tryProviders,
      promptLength: options.prompt.length
    });

    let lastError: Error | null = null;

    for (const providerName of tryProviders) {
      try {
        console.log(`[${functionTag}] Attempting provider`, { provider: providerName });

        const provider = AIProviderFactory.createProvider(providerName);

        const result = await provider.streamText({
          prompt: options.prompt,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
          systemPrompt: options.systemPrompt
        });

        if (!result) {
          throw new Error('No stream response received from AI provider');
        }

        console.log(`[${functionTag}] Provider succeeded`, { provider: providerName });

        // Convert the AI SDK stream to our expected format
        async function* convertStream() {
          if (result && result.textStream) {
            for await (const chunk of result.textStream) {
              yield { content: chunk };
            }
          }
        }

        return convertStream();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        console.warn(`[${functionTag}] Provider failed, trying next`, {
          provider: providerName,
          error: errorMessage,
          remainingProviders: tryProviders.slice(tryProviders.indexOf(providerName) + 1)
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    console.error(`[${functionTag}] All providers failed`, {
      triedProviders: tryProviders,
      lastError: lastError?.message
    });

    throw new Error(`Failed to stream text with all providers. Last error: ${lastError?.message || 'Unknown error'}`);
  }

  /**
   * Get the best available AI provider
   */
  async getBestProvider(): Promise<string> {
    return await getBestProvider();
  }

  /**
   * Test a specific provider
   */
  async testProvider(providerName: AIProviderName, testPrompt: string = 'test'): Promise<boolean> {
    try {
      const provider = AIProviderFactory.createProvider(providerName);
      await provider.generateText(testPrompt);
      return true;
    } catch (error) {
      return false;
    }
  }
}
