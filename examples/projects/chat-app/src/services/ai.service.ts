/**
 * NeuroLink Chat Application - AI Service
 *
 * Wraps the NeuroLink SDK for use in the chat application.
 * Handles provider configuration and message generation.
 */

import { NeuroLink } from "@juspay/neurolink";

export type ChatOptions = {
  provider?: string;
  model?: string;
  systemPrompt?: string;
  temperature?: number;
};

export type ChatResult = {
  text: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
};

export type StreamChunk = {
  text?: string;
  done?: boolean;
  provider?: string;
  model?: string;
  usage?: ChatResult["usage"];
};

/**
 * AI Service class that wraps NeuroLink SDK
 */
export class AIService {
  private neurolink: NeuroLink;
  private availableProviders: string[] = [];

  constructor() {
    this.neurolink = new NeuroLink();
    this.detectAvailableProviders();
  }

  /**
   * Detects which providers have API keys configured
   */
  private detectAvailableProviders(): void {
    const providers: string[] = [];

    if (process.env.OPENAI_API_KEY) {
      providers.push("openai");
    }
    if (process.env.ANTHROPIC_API_KEY) {
      providers.push("anthropic");
    }
    if (process.env.GOOGLE_AI_API_KEY) {
      providers.push("google-ai");
    }
    if (process.env.MISTRAL_API_KEY) {
      providers.push("mistral");
    }
    if (process.env.AZURE_OPENAI_API_KEY) {
      providers.push("azure-openai");
    }

    this.availableProviders = providers;

    if (providers.length === 0) {
      console.warn(
        "Warning: No API keys configured. Please set at least one provider API key.",
      );
    } else {
      console.log(`Available providers: ${providers.join(", ")}`);
    }
  }

  /**
   * Get list of available providers
   */
  getAvailableProviders(): string[] {
    return this.availableProviders;
  }

  /**
   * Get the default provider based on configuration
   */
  private getDefaultProvider(): string | undefined {
    const defaultProvider = process.env.DEFAULT_PROVIDER;
    if (defaultProvider && this.availableProviders.includes(defaultProvider)) {
      return defaultProvider;
    }
    return this.availableProviders[0];
  }

  /**
   * Standard chat completion
   */
  async chat(message: string, options: ChatOptions = {}): Promise<ChatResult> {
    const provider = options.provider || this.getDefaultProvider();

    if (!provider) {
      throw new Error(
        "No provider available. Please configure at least one API key.",
      );
    }

    const result = await this.neurolink.generate({
      prompt: message,
      provider,
      model: options.model,
      system: options.systemPrompt || "You are a helpful AI assistant.",
      temperature: options.temperature,
    });

    return {
      text: result.text || "",
      provider: result.provider || provider,
      model: result.model || "unknown",
      usage: result.usage
        ? {
            promptTokens: result.usage.promptTokens,
            completionTokens: result.usage.completionTokens,
            totalTokens: result.usage.totalTokens,
          }
        : undefined,
    };
  }

  /**
   * Streaming chat completion
   */
  async *streamChat(
    message: string,
    options: ChatOptions = {},
  ): AsyncGenerator<StreamChunk> {
    const provider = options.provider || this.getDefaultProvider();

    if (!provider) {
      throw new Error(
        "No provider available. Please configure at least one API key.",
      );
    }

    const stream = await this.neurolink.stream({
      prompt: message,
      provider,
      model: options.model,
      system: options.systemPrompt || "You are a helpful AI assistant.",
      temperature: options.temperature,
    });

    let fullText = "";

    for await (const chunk of stream) {
      if (chunk.text) {
        fullText += chunk.text;
        yield { text: chunk.text };
      }
    }

    // Yield final chunk with metadata
    yield {
      done: true,
      provider,
      model: options.model || "default",
      usage: {
        // Usage is typically available after stream completion
        // This is a simplified version; actual implementation may vary
      },
    };
  }
}
