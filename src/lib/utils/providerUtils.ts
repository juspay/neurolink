/**
 * Utility functions for AI provider management
 * Consolidated from providerUtils-fixed.ts
 */
import { AIProviderFactory } from "../core/factory.js";
import { logger } from "./logger.js";
import type { UnknownRecord } from "../types/common.js";
import type { ProviderError } from "../types/providers.js";
import type { EnvVarValidationResult } from "../types/utilities.js";
import { AIProviderName } from "../constants/enums.js";
import { ProviderHealthChecker } from "./providerHealth.js";
import {
  API_KEY_FORMATS,
  API_KEY_LENGTHS,
  PROJECT_ID_FORMAT,
} from "./providerConfig.js";

/**
 * Get the best available provider based on real-time availability checks
 * Enhanced version consolidated from providerUtils-fixed.ts
 * @param requestedProvider - Optional preferred provider name
 * @returns The best provider name to use
 */
export async function getBestProvider(
  requestedProvider?: string,
): Promise<string> {
  // Check requested provider FIRST - explicit user choice overrides defaults
  if (requestedProvider && requestedProvider !== "auto") {
    // For explicit provider requests, ALWAYS honor the request
    // Never override explicit provider selection with health-based fallbacks
    logger.debug(
      `[getBestProvider] Using explicitly requested provider: ${requestedProvider}`,
    );

    // Optional health check for logging purposes only
    try {
      const health = await ProviderHealthChecker.checkProviderHealth(
        requestedProvider as AIProviderName,
        { includeConnectivityTest: false, cacheResults: true },
      );

      if (health.isHealthy) {
        logger.debug(
          `[getBestProvider] Explicitly requested provider ${requestedProvider} is healthy`,
        );
      } else {
        logger.warn(
          `[getBestProvider] Explicitly requested provider ${requestedProvider} may have issues, but using anyway`,
          { error: health.error },
        );
      }
    } catch (error) {
      logger.warn(
        `[getBestProvider] Health check failed for explicitly requested provider ${requestedProvider}, using anyway`,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }

    // ALWAYS return the explicitly requested provider
    return requestedProvider;
  }

  // Use health checker to get best available provider
  const healthyProvider = await ProviderHealthChecker.getBestHealthyProvider();

  if (healthyProvider) {
    logger.debug(
      `[getBestProvider] Selected healthy provider: ${healthyProvider}`,
    );
    return healthyProvider;
  }

  // Fallback to legacy provider checking if health system fails
  logger.warn(
    "[getBestProvider] Health system failed, falling back to legacy checking",
  );

  // Check for explicit default provider in env (only when no provider requested)
  if (
    process.env.DEFAULT_PROVIDER &&
    (await isProviderAvailable(process.env.DEFAULT_PROVIDER))
  ) {
    logger.debug(
      `[getBestProvider] Using default provider from env: ${process.env.DEFAULT_PROVIDER}`,
    );
    return process.env.DEFAULT_PROVIDER;
  }

  // Special case for Ollama - prioritize local when available
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

  /**
   * Provider priority order rationale:
   * - Vertex (Google Cloud AI) is prioritized first for its enterprise-grade reliability and advanced model capabilities.
   * - Google AI follows as second priority for comprehensive Google AI ecosystem support.
   * - OpenAI maintains high priority due to its consistent reliability and broad model support.
   * - Other providers are ordered based on a combination of reliability, feature set, and historical performance in our use cases.
   * - Ollama is kept as a fallback for local deployments when available.
   * Please update this comment if the order is changed in the future, and document the rationale for maintainability.
   */
  const providers = [
    "vertex", // Prioritize Google Cloud AI (Vertex) first
    "google-ai", // Google AI ecosystem support
    "openai", // Reliable with broad model support
    "anthropic",
    "bedrock",
    "azure",
    "mistral",
    "huggingface",
    "ollama", // Keep as fallback
  ];

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
    } catch {
      return false;
    }
  }

  try {
    const provider = await AIProviderFactory.createProvider(providerName);
    await provider.generate({ prompt: "test", maxTokens: 1 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate environment variable values for a provider
 * Addresses GitHub Copilot comment about adding environment variable validation
 * @param provider - Provider name to validate
 * @returns Validation result with detailed information
 */
export function validateProviderEnvVars(
  provider: string,
): EnvVarValidationResult {
  const result: EnvVarValidationResult = {
    isValid: true,
    missingVars: [],
    invalidVars: [],
    warnings: [],
  };

  switch (provider.toLowerCase()) {
    case "bedrock":
    case "amazon":
    case "aws":
      validateAwsCredentials(result);
      break;

    case "vertex":
    case "googlevertex":
    case "google":
    case "gemini":
      validateVertexCredentials(result);
      break;

    case "openai":
    case "gpt":
      validateOpenAICredentials(result);
      break;

    case "anthropic":
    case "claude":
      validateAnthropicCredentials(result);
      break;

    case "azure":
    case "azureopenai":
      validateAzureCredentials(result);
      break;

    case "google-ai":
    case "google-studio":
      validateGoogleAICredentials(result);
      break;

    case "huggingface":
    case "hugging-face":
    case "hf":
      validateHuggingFaceCredentials(result);
      break;

    case "mistral":
    case "mistral-ai":
    case "mistralai":
      validateMistralCredentials(result);
      break;

    case "ollama":
    case "local":
    case "local-ollama":
      // Ollama doesn't require environment variables
      break;

    case "litellm":
      // LiteLLM validation can be added if needed
      break;

    default:
      result.isValid = false;
      result.warnings.push(`Unknown provider: ${provider}`);
  }

  result.isValid =
    result.missingVars.length === 0 && result.invalidVars.length === 0;
  return result;
}

/**
 * Validate AWS credentials with flexible validation
 * Note: AWS credential formats can vary, so validation is kept reasonably flexible
 */
function validateAwsCredentials(result: EnvVarValidationResult): void {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;

  if (!accessKeyId) {
    result.missingVars.push("AWS_ACCESS_KEY_ID");
  } else if (!/^[A-Z0-9]{16,}$/.test(accessKeyId)) {
    // Flexible validation: at least 16 uppercase alphanumeric characters
    result.invalidVars.push(
      "AWS_ACCESS_KEY_ID (should be uppercase alphanumeric characters, typically 20 chars)",
    );
  }

  if (!secretAccessKey) {
    result.missingVars.push("AWS_SECRET_ACCESS_KEY");
  } else if (!/^[A-Za-z0-9+/]{30,}$/.test(secretAccessKey)) {
    // Flexible validation: at least 30 base64 characters (can vary in length)
    result.invalidVars.push(
      "AWS_SECRET_ACCESS_KEY (should be base64 characters, typically 40+ chars)",
    );
  }

  if (!region) {
    result.warnings.push("AWS_REGION not set, will use default region");
  }
}

/**
 * Validate Google Vertex credentials
 */
function validateVertexCredentials(result: EnvVarValidationResult): void {
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.VERTEX_PROJECT_ID ||
    process.env.GOOGLE_VERTEX_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

  const hasCredentials =
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    (process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
      process.env.GOOGLE_AUTH_PRIVATE_KEY);

  if (!projectId) {
    result.missingVars.push("GOOGLE_CLOUD_PROJECT_ID (or variant)");
  } else if (!PROJECT_ID_FORMAT.PATTERN.test(projectId)) {
    result.invalidVars.push(
      "Project ID format invalid (must be 6-30 lowercase letters, digits, hyphens)",
    );
  }

  if (!hasCredentials) {
    result.missingVars.push(
      "Google credentials (GOOGLE_APPLICATION_CREDENTIALS or explicit auth)",
    );
  }

  if (
    process.env.GOOGLE_AUTH_CLIENT_EMAIL &&
    !isValidEmail(process.env.GOOGLE_AUTH_CLIENT_EMAIL)
  ) {
    result.invalidVars.push("GOOGLE_AUTH_CLIENT_EMAIL (invalid email format)");
  }
}

/**
 * Validate OpenAI credentials
 */
function validateOpenAICredentials(result: EnvVarValidationResult): void {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    result.missingVars.push("OPENAI_API_KEY");
  } else if (!API_KEY_FORMATS.openai.test(apiKey)) {
    result.invalidVars.push(
      `OPENAI_API_KEY (should start with 'sk-' followed by ${API_KEY_LENGTHS.OPENAI_MIN}+ characters)`,
    );
  }
}

/**
 * Validate Anthropic credentials
 */
function validateAnthropicCredentials(result: EnvVarValidationResult): void {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    result.missingVars.push("ANTHROPIC_API_KEY");
  } else if (!API_KEY_FORMATS.anthropic.test(apiKey)) {
    result.invalidVars.push(
      `ANTHROPIC_API_KEY (should start with 'sk-ant-' followed by ${API_KEY_LENGTHS.ANTHROPIC_MIN}+ characters)`,
    );
  }
}

/**
 * Validate Azure credentials
 */
function validateAzureCredentials(result: EnvVarValidationResult): void {
  const apiKey = process.env.AZURE_OPENAI_API_KEY;
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

  if (!apiKey) {
    result.missingVars.push("AZURE_OPENAI_API_KEY");
  } else if (!API_KEY_FORMATS.azure.test(apiKey)) {
    result.invalidVars.push(
      `AZURE_OPENAI_API_KEY (should be at least ${API_KEY_LENGTHS.AZURE_MIN} alphanumeric characters)`,
    );
  }

  if (!endpoint) {
    result.missingVars.push("AZURE_OPENAI_ENDPOINT");
  } else if (!isValidUrl(endpoint)) {
    result.invalidVars.push(
      "AZURE_OPENAI_ENDPOINT (should be a valid HTTPS URL)",
    );
  }
}

/**
 * Validate Google AI credentials
 */
function validateGoogleAICredentials(result: EnvVarValidationResult): void {
  const apiKey =
    process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!apiKey) {
    result.missingVars.push(
      "GOOGLE_AI_API_KEY (or GOOGLE_GENERATIVE_AI_API_KEY)",
    );
  } else if (!API_KEY_FORMATS["google-ai"].test(apiKey)) {
    result.invalidVars.push(
      `GOOGLE_AI_API_KEY (should be ${API_KEY_LENGTHS.GOOGLE_AI_EXACT} alphanumeric characters with dashes/underscores)`,
    );
  }
}

/**
 * Validate HuggingFace credentials
 */
function validateHuggingFaceCredentials(result: EnvVarValidationResult): void {
  const apiKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;

  if (!apiKey) {
    result.missingVars.push("HUGGINGFACE_API_KEY (or HF_TOKEN)");
  } else if (!API_KEY_FORMATS.huggingface.test(apiKey)) {
    result.invalidVars.push(
      `HUGGINGFACE_API_KEY (should start with 'hf_' followed by ${API_KEY_LENGTHS.HUGGINGFACE_EXACT} characters)`,
    );
  }
}

/**
 * Validate Mistral credentials
 */
function validateMistralCredentials(result: EnvVarValidationResult): void {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    result.missingVars.push("MISTRAL_API_KEY");
  } else if (!API_KEY_FORMATS.mistral.test(apiKey)) {
    result.invalidVars.push(
      `MISTRAL_API_KEY (should be ${API_KEY_LENGTHS.MISTRAL_EXACT} alphanumeric characters)`,
    );
  }
}

/**
 * Helper function to validate email format
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Check if a provider has the minimum required environment variables
 * NOTE: This only checks if variables exist, not if they're valid
 * For validation, use validateProviderEnvVars instead
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
    case "azureopenai":
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

    case "litellm":
      // LiteLLM requires a proxy server, which can be checked for availability
      // Default base URL is assumed, or can be configured via environment
      return true; // LiteLLM proxy availability will be checked during usage

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

/**
 * Type guard for provider error
 */
export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof Error && "provider" in error;
}
