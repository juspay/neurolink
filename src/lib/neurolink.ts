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
  provider?: 'openai' | 'bedrock' | 'vertex' | 'auto';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
}

export interface StreamTextOptions {
  prompt: string;
  provider?: 'openai' | 'bedrock' | 'vertex' | 'auto';
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
   * Generate text using the best available AI provider
   */
  async generateText(options: TextGenerationOptions): Promise<TextGenerationResult> {
    const startTime = Date.now();

    try {
      let provider: AIProvider;
      let providerName: string;

      if (options.provider && options.provider !== 'auto') {
        provider = AIProviderFactory.createProvider(options.provider);
        providerName = options.provider;
      } else {
        provider = createBestAIProvider();
        providerName = await getBestProvider();
      }

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

      return {
        content: result.text,
        provider: providerName,
        usage: result.usage,
        responseTime
      };
    } catch (error) {
      throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate streaming text using the best available AI provider
   */
  async generateTextStream(options: StreamTextOptions): Promise<AsyncIterable<{ content: string }>> {
    try {
      let provider: AIProvider;

      if (options.provider && options.provider !== 'auto') {
        provider = AIProviderFactory.createProvider(options.provider);
      } else {
        provider = createBestAIProvider();
      }

      const result = await provider.streamText({
        prompt: options.prompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        systemPrompt: options.systemPrompt
      });

      if (!result) {
        throw new Error('No stream response received from AI provider');
      }

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
      throw new Error(`Failed to stream text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
