/**
 * NeuroLink - Unified AI Interface
 *
 * Simple wrapper around the AI provider system to provide a clean API
 * for CLI and other consumers.
 */
import type { AIProviderName } from "./core/types.js";
export interface TextGenerationOptions {
  prompt: string;
  provider?: "openai" | "bedrock" | "vertex" | "auto";
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  schema?: any;
}
export interface StreamTextOptions {
  prompt: string;
  provider?: "openai" | "bedrock" | "vertex" | "auto";
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
export declare class NeuroLink {
  /**
   * Generate text using the best available AI provider
   */
  generateText(options: TextGenerationOptions): Promise<TextGenerationResult>;
  /**
   * Generate streaming text using the best available AI provider
   */
  generateTextStream(options: StreamTextOptions): Promise<
    AsyncIterable<{
      content: string;
    }>
  >;
  /**
   * Get the best available AI provider
   */
  getBestProvider(): Promise<string>;
  /**
   * Test a specific provider
   */
  testProvider(
    providerName: AIProviderName,
    testPrompt?: string,
  ): Promise<boolean>;
}
