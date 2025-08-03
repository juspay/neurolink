/**
 * Utility functions for AI provider management
 * Consolidated from providerUtils-fixed.ts
 */
import { AIProviderFactory } from "../core/factory.js";
import { logger } from "./logger.js";
import type { UnknownRecord } from "../types/common.js";

/**
 * Get the best available provider based on real-time availability checks
 * Enhanced version consolidated from providerUtils-fixed.ts
 * @param requestedProvider - Optional preferred provider name
 * @returns The best provider name to use
 */
export async function getBestProvider(
  requestedProvider?: string,
): Promise<string> {
  // 🔧 FIX: Check for explicit default provider in env
  if (
    process.env.DEFAULT_PROVIDER &&
    (await isProviderAvailable(process.env.DEFAULT_PROVIDER))
  ) {
    return process.env.DEFAULT_PROVIDER;
  }

  // 🔧 FIX: Special case for Ollama - prioritize local when available
  if (process.env.OLLAMA_BASE_URL && process.env.OLLAMA_MODEL) {
    try {
      if (await isProviderAvailable("ollama")) {
        logger.debug(`[getBestProvider] Prioritizing working local Ollama`);
        return "ollama"; // Prioritize working local AI
      }
    } catch {
      // Fall through to cloud providers
    }
  }

  const providers = [
    "google-ai",
    "anthropic",
    "openai",
    "mistral",
    "vertex",
    "azure",
    "huggingface",
    "bedrock",
    "ollama", // Keep as fallback
  ];

  if (requestedProvider && requestedProvider !== "auto") {
    if (await isProviderAvailable(requestedProvider)) {
      logger.debug(
        `[getBestProvider] Using requested provider: ${requestedProvider}`,
      );
      return requestedProvider;
    } else {
      logger.warn(
        `[getBestProvider] Requested provider '${requestedProvider}' is not available. Falling back to auto-selection.`,
      );
    }
  }

  for (const provider of providers) {
    if (await isProviderAvailable(provider)) {
      logger.debug(`[getBestProvider] Selected provider: ${provider}`);
      return provider;
    }
  }

  throw new Error(
    "No available AI providers. Please check your configurations.",
  );
}

/**
 * Check if a provider is truly available by performing a quick authentication test.
 * Enhanced function consolidated from providerUtils-fixed.ts
 * @param providerName - The name of the provider to check.
 * @returns True if the provider is available and authenticated.
 */
async function isProviderAvailable(providerName: string): Promise<boolean> {
  if (!hasProviderEnvVars(providerName) && providerName !== "ollama") {
    return false;
  }

  if (providerName === "ollama") {
    try {
      const response = await fetch("http://localhost:11434/api/tags", {
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      if (response.ok) {
        const { models } = await response.json();
        const defaultOllamaModel = "llama3.2:latest";
        return models.some((m: UnknownRecord) => m.name === defaultOllamaModel);
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  try {
    const provider = await AIProviderFactory.createProvider(providerName);
    await provider.generate({ prompt: "test", maxTokens: 1 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a provider has the minimum required environment variables
 * NOTE: This only checks if variables exist, not if they're valid
 * @param provider - Provider name to check
 * @returns True if the provider has required environment variables
 */
export function hasProviderEnvVars(provider: string): boolean {
  switch (provider.toLowerCase()) {
    case "bedrock":
    case "amazon":
    case "aws":
      return !!(
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      );

    case "vertex":
    case "googlevertex":
    case "google":
    case "gemini":
      return !!(
        (process.env.GOOGLE_CLOUD_PROJECT_ID ||
          process.env.VERTEX_PROJECT_ID ||
          process.env.GOOGLE_VERTEX_PROJECT ||
          process.env.GOOGLE_CLOUD_PROJECT) &&
        (process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
          (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
            process.env.GOOGLE_AUTH_PRIVATE_KEY))
      );

    case "openai":
    case "gpt":
      return !!process.env.OPENAI_API_KEY;

    case "anthropic":
    case "claude":
      return !!process.env.ANTHROPIC_API_KEY;

    case "azure":
    case "azureOpenai":
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
