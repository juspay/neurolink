/**
 * Utility functions for AI provider management
 */
import { logger } from "./logger.js";

/**
 * Get the best available provider based on preferences and availability
 * @param requestedProvider - Optional preferred provider name
 * @returns The best provider name to use
 */
export function getBestProvider(requestedProvider?: string): string {
  // If a specific provider is requested, return it
  if (requestedProvider) {
    return requestedProvider;
  }

  // Default fallback order - Google AI (Gemini) first as primary provider
  // Ollama last since it requires local setup
  const providers = [
    "google-ai",
    "anthropic",
    "openai",
    "mistral",
    "vertex",
    "azure",
    "huggingface",
    "bedrock",
    "ollama",
  ];

  // Check which providers have their required environment variables
  for (const provider of providers) {
    if (isProviderConfigured(provider)) {
      logger.debug(`[getBestProvider] Selected provider: ${provider}`);
      return provider;
    }
  }

  // Default to bedrock if nothing is configured
  logger.warn(
    "[getBestProvider] No providers configured, defaulting to bedrock",
  );
  return "bedrock";
}

/**
 * Check if a provider has the minimum required configuration
 * @param provider - Provider name to check
 * @returns True if the provider appears to be configured
 */
function isProviderConfigured(provider: string): boolean {
  switch (provider.toLowerCase()) {
    case "bedrock":
    case "amazon":
    case "aws":
      return !!(
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      );

    case "vertex":
    case "google":
    case "gemini":
      return !!(
        process.env.GOOGLE_VERTEX_PROJECT ||
        process.env.GOOGLE_APPLICATION_CREDENTIALS
      );

    case "openai":
    case "gpt":
      return !!process.env.OPENAI_API_KEY;

    case "anthropic":
    case "claude":
      return !!process.env.ANTHROPIC_API_KEY;

    case "azure":
    case "azure-openai":
      return !!process.env.AZURE_OPENAI_API_KEY;

    case "google-ai":
    case "google-studio":
      return !!(
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY
      );

    case "huggingface":
    case "hugging-face":
    case "hf":
      return !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN);

    case "ollama":
    case "local":
    case "local-ollama":
      // For Ollama, we check if the service is potentially available
      // This is a basic check - actual connectivity will be verified during usage
      return true; // Ollama doesn't require environment variables, just local service

    case "mistral":
    case "mistral-ai":
    case "mistralai":
      return !!process.env.MISTRAL_API_KEY;

    default:
      return false;
  }
}

/**
 * Get available provider names
 * @returns Array of available provider names
 */
export function getAvailableProviders(): string[] {
  return [
    "bedrock",
    "vertex",
    "openai",
    "anthropic",
    "azure",
    "google-ai",
    "huggingface",
    "ollama",
    "mistral",
  ];
}

/**
 * Validate provider name
 * @param provider - Provider name to validate
 * @returns True if provider name is valid
 */
export function isValidProvider(provider: string): boolean {
  return getAvailableProviders().includes(provider.toLowerCase());
}
