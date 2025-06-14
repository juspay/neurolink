/**
 * Provider exports for Vercel AI SDK integration
 * This file centralizes all AI provider classes for easy import and usage
 */

export { GoogleVertexAI } from "./googleVertexAI.js";
export { AmazonBedrock } from "./amazonBedrock.js";
export { OpenAI } from "./openAI.js";
export { AnthropicProvider } from "./anthropic.js";
export { AzureOpenAIProvider } from "./azureOpenAI.js";
export { GoogleAIStudio } from "./googleAIStudio.js";
export { HuggingFace } from "./huggingFace.js";
export { Ollama } from "./ollama.js";
export { MistralAI } from "./mistralAI.js";

// Re-export the AIProvider interface for convenience
export type { AIProvider } from "../core/types.js";

/**
 * Provider registry for dynamic provider instantiation
 */
export const PROVIDERS = {
  vertex: "GoogleVertexAI",
  bedrock: "AmazonBedrock",
  openai: "OpenAI",
  anthropic: "AnthropicProvider",
  azure: "AzureOpenAIProvider",
  "google-ai": "GoogleAIStudio",
  huggingface: "HuggingFace",
  ollama: "Ollama",
  mistral: "MistralAI",
} as const;

/**
 * Type for valid provider names
 */
export type ProviderName = keyof typeof PROVIDERS;

/**
 * List of all available provider names
 */
export const AVAILABLE_PROVIDERS: ProviderName[] = Object.keys(
  PROVIDERS,
) as ProviderName[];
