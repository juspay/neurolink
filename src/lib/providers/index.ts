/**
 * Provider exports for Vercel AI SDK integration
 * This file centralizes all AI provider classes for easy import and usage
 */

export { GoogleVertexProvider as GoogleVertexAI } from "./google-vertex.js";
export { AmazonBedrockProvider as AmazonBedrock } from "./amazon-bedrock.js";
export { OpenAIProvider as OpenAI } from "./openAI.js";
export { AnthropicProvider as AnthropicProvider } from "./anthropic.js";
export { AzureOpenAIProvider } from "./azure-openai.js";
export { GoogleAIStudioProvider as GoogleAIStudio } from "./google-ai-studio.js";
export { HuggingFaceProvider as HuggingFace } from "./huggingFace.js";
export { OllamaProvider as Ollama } from "./ollama.js";
export { MistralProvider as MistralAI } from "./mistral.js";

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
