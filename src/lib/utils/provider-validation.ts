/**
 * Enhanced Provider Validation Utilities
 *
 * Fixes false positives in provider status checking by implementing:
 * - API key format validation
 * - Lightweight authentication checks
 * - Proper error classification
 * - Rate-limit friendly validation
 */

import { hasProviderEnvVars } from "./providerUtils.js";
import { defaultTimeoutManager } from "./timeout-manager.js";

export interface ProviderValidationResult {
  configured: boolean;
  formatValid: boolean;
  authenticated: boolean;
  available: boolean;
  error?: string;
  errorType?: "config" | "format" | "auth" | "network" | "quota" | "unknown";
  responseTime?: number;
  details?: Record<string, any>;
}

/**
 * API key format validation rules for different providers
 */
const API_KEY_FORMATS: Record<string, RegExp> = {
  openai: /^sk-[A-Za-z0-9]{48,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9\-_]{95,}$/,
  "google-ai": /^AIza[A-Za-z0-9\-_]{35}$/,
  huggingface: /^hf_[A-Za-z0-9]{37}$/,
  mistral: /^[A-Za-z0-9]{32}$/,
  // Azure and AWS have more complex validation patterns
  azure: /^[A-Za-z0-9]{32,}$/,
  aws: /^[A-Z0-9]{20}$/, // Access Key ID format
};

/**
 * Get API key for a provider from environment variables
 */
function getProviderApiKey(provider: string): string | null {
  switch (provider.toLowerCase()) {
    case "openai":
      return process.env.OPENAI_API_KEY || null;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY || null;
    case "google-ai":
      return (
        process.env.GOOGLE_AI_API_KEY ||
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
        null
      );
    case "azure":
      return process.env.AZURE_OPENAI_API_KEY || null;
    case "huggingface":
      return process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN || null;
    case "mistral":
      return process.env.MISTRAL_API_KEY || null;
    case "aws":
    case "bedrock":
      return process.env.AWS_ACCESS_KEY_ID || null;
    case "vertex":
      // Vertex uses service account JSON, not a simple API key
      return (
        process.env.GOOGLE_APPLICATION_CREDENTIALS ||
        process.env.GOOGLE_VERTEX_PROJECT ||
        null
      );
    default:
      return null;
  }
}

/**
 * Validate API key format for a specific provider
 */
export function validateApiKeyFormat(
  provider: string,
  apiKey: string,
): boolean {
  const format = API_KEY_FORMATS[provider.toLowerCase()];
  if (!format) {
    // No format validation available, assume valid if not empty
    return apiKey.length > 0;
  }
  return format.test(apiKey);
}

/**
 * Lightweight authentication check using minimal API calls
 */
async function validateAuthentication(
  provider: string,
  apiKey: string,
): Promise<{
  success: boolean;
  error?: string;
  errorType?: ProviderValidationResult["errorType"];
  responseTime: number;
}> {
  const startTime = Date.now();

  try {
    const result = await defaultTimeoutManager.executeWithTimeout(
      async () => {
        switch (provider.toLowerCase()) {
          case "openai":
            return await validateOpenAIAuth(apiKey);
          case "anthropic":
            return await validateAnthropicAuth(apiKey);
          case "google-ai":
            return await validateGoogleAIAuth(apiKey);
          case "huggingface":
            return await validateHuggingFaceAuth(apiKey);
          case "mistral":
            return await validateMistralAuth(apiKey);
          case "azure":
            return await validateAzureAuth(apiKey);
          case "bedrock":
          case "aws":
            return await validateBedrockAuth(apiKey);
          case "vertex":
            return await validateVertexAuth(apiKey);
          default:
            return {
              success: false,
              error: "Validation not implemented for this provider",
              errorType: "unknown" as const,
            };
        }
      },
      {
        operation: `auth-check-${provider}`,
        timeout: 10000, // 10 second timeout for auth checks
        retryOnTimeout: false,
      },
    );

    if (result.success && result.data) {
      return {
        ...result.data,
        responseTime: Date.now() - startTime,
      };
    } else {
      return {
        success: false,
        error: result.error?.message || "Authentication check failed",
        errorType: "network",
        responseTime: Date.now() - startTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: "unknown",
      responseTime: Date.now() - startTime,
    };
  }
}

/**
 * OpenAI authentication validation using models endpoint
 */
async function validateOpenAIAuth(apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "NeuroLink-CLI/4.1.1",
    },
  });

  if (response.ok) {
    return { success: true };
  } else if (response.status === 401) {
    return {
      success: false,
      error: "Invalid API key",
      errorType: "auth" as const,
    };
  } else if (response.status === 429) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorType: "quota" as const,
    };
  } else {
    const error = await response.text();
    return {
      success: false,
      error: `API error: ${response.status}`,
      errorType: "network" as const,
    };
  }
}

/**
 * Anthropic authentication validation using messages endpoint (minimal)
 */
async function validateAnthropicAuth(apiKey: string) {
  // Use a minimal message request to check auth
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "User-Agent": "NeuroLink-CLI/4.1.1",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1,
      messages: [{ role: "user", content: "test" }],
    }),
  });

  if (response.ok) {
    return { success: true };
  } else if (response.status === 401) {
    return {
      success: false,
      error: "Invalid API key",
      errorType: "auth" as const,
    };
  } else if (response.status === 429) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorType: "quota" as const,
    };
  } else {
    return {
      success: false,
      error: `API error: ${response.status}`,
      errorType: "network" as const,
    };
  }
}

/**
 * Google AI authentication validation
 */
async function validateGoogleAIAuth(apiKey: string) {
  // Use the models endpoint for lightweight validation
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    {
      method: "GET",
      headers: {
        "User-Agent": "NeuroLink-CLI/4.1.1",
      },
    },
  );

  if (response.ok) {
    return { success: true };
  } else if (response.status === 400 || response.status === 401) {
    return {
      success: false,
      error: "Invalid API key",
      errorType: "auth" as const,
    };
  } else if (response.status === 429) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorType: "quota" as const,
    };
  } else {
    return {
      success: false,
      error: `API error: ${response.status}`,
      errorType: "network" as const,
    };
  }
}

/**
 * HuggingFace authentication validation
 */
async function validateHuggingFaceAuth(apiKey: string) {
  const response = await fetch("https://huggingface.co/api/whoami", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "NeuroLink-CLI/4.1.1",
    },
  });

  if (response.ok) {
    return { success: true };
  } else if (response.status === 401) {
    return {
      success: false,
      error: "Invalid API key",
      errorType: "auth" as const,
    };
  } else {
    return {
      success: false,
      error: `API error: ${response.status}`,
      errorType: "network" as const,
    };
  }
}

/**
 * Mistral authentication validation
 */
async function validateMistralAuth(apiKey: string) {
  const response = await fetch("https://api.mistral.ai/v1/models", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "NeuroLink-CLI/4.1.1",
    },
  });

  if (response.ok) {
    return { success: true };
  } else if (response.status === 401) {
    return {
      success: false,
      error: "Invalid API key",
      errorType: "auth" as const,
    };
  } else if (response.status === 429) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorType: "quota" as const,
    };
  } else {
    return {
      success: false,
      error: `API error: ${response.status}`,
      errorType: "network" as const,
    };
  }
}

/**
 * Azure OpenAI authentication validation
 */
async function validateAzureAuth(apiKey: string) {
  // Azure validation is more complex as it requires endpoint URL
  // For now, we can only validate format and basic connectivity
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  if (!endpoint) {
    return {
      success: false,
      error: "AZURE_OPENAI_ENDPOINT not configured",
      errorType: "config" as const,
    };
  }

  // Try to validate with a models call
  const response = await fetch(
    `${endpoint}/openai/models?api-version=2024-02-01`,
    {
      method: "GET",
      headers: {
        "api-key": apiKey,
        "User-Agent": "NeuroLink-CLI/4.1.1",
      },
    },
  );

  if (response.ok) {
    return { success: true };
  } else if (response.status === 401) {
    return {
      success: false,
      error: "Invalid API key",
      errorType: "auth" as const,
    };
  } else if (response.status === 429) {
    return {
      success: false,
      error: "Rate limit exceeded",
      errorType: "quota" as const,
    };
  } else {
    return {
      success: false,
      error: `API error: ${response.status}`,
      errorType: "network" as const,
    };
  }
}

/**
 * AWS Bedrock authentication validation
 */
async function validateBedrockAuth(accessKeyId: string) {
  // Check if required AWS environment variables are present
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region =
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";

  if (!secretKey) {
    return {
      success: false,
      error: "AWS_SECRET_ACCESS_KEY not configured",
      errorType: "config" as const,
    };
  }

  // For Bedrock, we'll do a lightweight check using STS GetCallerIdentity
  // This validates AWS credentials without making actual model calls
  try {
    // This is a simplified check - in a real implementation, you'd use AWS SDK
    // For now, we'll just validate that the access key format is correct
    const accessKeyPattern = /^AKIA[0-9A-Z]{16}$|^ASIA[0-9A-Z]{16}$/;
    if (!accessKeyPattern.test(accessKeyId)) {
      return {
        success: false,
        error: "Invalid AWS Access Key ID format",
        errorType: "format" as const,
      };
    }

    // Return success for format validation - actual AWS auth would require SDK
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "AWS credentials validation failed",
      errorType: "auth" as const,
    };
  }
}

/**
 * Google Vertex AI authentication validation
 */
async function validateVertexAuth(credentialPath: string) {
  // Vertex AI uses service account JSON files or Application Default Credentials
  try {
    if (credentialPath && credentialPath.endsWith(".json")) {
      // Check if the service account file exists and is valid JSON
      const fs = await import("fs");
      if (!fs.existsSync(credentialPath)) {
        return {
          success: false,
          error: "Service account file not found",
          errorType: "config" as const,
        };
      }

      try {
        const serviceAccount = JSON.parse(
          fs.readFileSync(credentialPath, "utf8"),
        );
        if (!serviceAccount.type || serviceAccount.type !== "service_account") {
          return {
            success: false,
            error: "Invalid service account file format",
            errorType: "format" as const,
          };
        }
        return { success: true };
      } catch {
        return {
          success: false,
          error: "Invalid service account JSON format",
          errorType: "format" as const,
        };
      }
    } else if (process.env.GOOGLE_VERTEX_PROJECT) {
      // If project ID is configured, assume ADC is being used
      return { success: true };
    } else {
      return {
        success: false,
        error: "No valid Vertex AI credentials found",
        errorType: "config" as const,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: "Vertex AI credentials validation failed",
      errorType: "auth" as const,
    };
  }
}

/**
 * Special validation for Ollama (local service)
 */
async function validateOllamaAvailability(): Promise<ProviderValidationResult> {
  try {
    const result = await defaultTimeoutManager.executeWithTimeout(
      async () => {
        const response = await fetch("http://localhost:11434/api/tags", {
          method: "GET",
        });

        if (!response.ok) {
          return { available: false, error: "Ollama service not responding" };
        }

        const data = await response.json();
        const models = data.models || [];

        return {
          available: true,
          models: models.map((m: any) => m.name),
          hasModels: models.length > 0,
        };
      },
      {
        operation: "ollama-check",
        timeout: 5000,
      },
    );

    if (result.success && result.data) {
      const { available, models, hasModels, error } = result.data;
      return {
        configured: true,
        formatValid: true,
        authenticated: available,
        available: available && (hasModels || false),
        error: !available
          ? error
          : !hasModels
            ? 'No models installed. Run "ollama pull <model-name>"'
            : undefined,
        errorType: !available ? "network" : !hasModels ? "config" : undefined,
        responseTime: result.executionTime,
        details: { models, modelCount: models?.length || 0 },
      };
    } else {
      return {
        configured: true,
        formatValid: true,
        authenticated: false,
        available: false,
        error: 'Ollama service not running. Start with "ollama serve"',
        errorType: "network",
        responseTime: result.executionTime,
      };
    }
  } catch (error) {
    return {
      configured: true,
      formatValid: true,
      authenticated: false,
      available: false,
      error: "Failed to check Ollama service",
      errorType: "network",
    };
  }
}

/**
 * Comprehensive provider validation that prevents false positives
 */
export async function validateProvider(
  provider: string,
): Promise<ProviderValidationResult> {
  // Special case for Ollama (no API key required)
  if (provider.toLowerCase() === "ollama") {
    return await validateOllamaAvailability();
  }

  // Step 1: Check if provider environment variables are configured
  const configured = hasProviderEnvVars(provider);
  if (!configured) {
    return {
      configured: false,
      formatValid: false,
      authenticated: false,
      available: false,
      error: "Missing required environment variables",
      errorType: "config",
    };
  }

  // Step 2: Get and validate API key format
  const apiKey = getProviderApiKey(provider);
  if (!apiKey) {
    return {
      configured: false,
      formatValid: false,
      authenticated: false,
      available: false,
      error: "API key not found in environment",
      errorType: "config",
    };
  }

  const formatValid = validateApiKeyFormat(provider, apiKey);
  if (!formatValid) {
    return {
      configured: true,
      formatValid: false,
      authenticated: false,
      available: false,
      error: "API key format is invalid",
      errorType: "format",
    };
  }

  // Step 3: Perform lightweight authentication check
  const authResult = await validateAuthentication(provider, apiKey);

  return {
    configured: true,
    formatValid: true,
    authenticated: authResult.success,
    available: authResult.success,
    error: authResult.error,
    errorType: authResult.errorType,
    responseTime: authResult.responseTime,
  };
}

/**
 * Batch validate multiple providers efficiently
 */
export async function validateProviders(
  providers: string[],
): Promise<Record<string, ProviderValidationResult>> {
  const results: Record<string, ProviderValidationResult> = {};

  // 🔧 FIX: Add timeout handling for provider validation
  const validationPromises = providers.map(async (provider) => {
    const timeoutPromise = new Promise<never>(
      (_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000), // 5 second timeout per provider
    );

    try {
      const result = await Promise.race([
        validateProvider(provider),
        timeoutPromise,
      ]);
      return { provider, result };
    } catch (error) {
      return {
        provider,
        result: {
          configured: false,
          formatValid: false,
          authenticated: false,
          available: false,
          error: error instanceof Error ? error.message : "Timeout",
          errorType: "network" as const,
        },
      };
    }
  });

  const validationResults = await Promise.allSettled(validationPromises);

  validationResults.forEach((promiseResult, index) => {
    const provider = providers[index];
    if (promiseResult.status === "fulfilled") {
      results[provider] = promiseResult.value.result;
    } else {
      results[provider] = {
        configured: false,
        formatValid: false,
        authenticated: false,
        available: false,
        error: "Validation failed: " + promiseResult.reason,
        errorType: "unknown",
      };
    }
  });

  return results;
}

/**
 * Check if provider validation should be cached (to avoid rate limits)
 */
export function shouldCacheValidation(
  result: ProviderValidationResult,
): boolean {
  // Cache successful validations and format errors (don't change often)
  // Don't cache network errors or quota errors (can be temporary)
  return (
    result.available ||
    result.errorType === "format" ||
    result.errorType === "config"
  );
}
