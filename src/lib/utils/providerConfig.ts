/**
 * Provider Configuration Utility
 * Consolidated configuration helpers for all AI providers
 * Eliminates duplicate error messages and configuration logic
 * Enhanced with format validation and advanced error classification
 */

import type { APIValidationResult } from "../types/utilities.js";
import type { ProviderConfigOptions } from "../types/providers.js";

/**
 * API key format validation patterns (extracted from advanced validation system)
 * Exported for use across the codebase to replace scattered regex patterns
 */
export const API_KEY_FORMATS: Record<string, RegExp> = {
  openai: /^sk-[A-Za-z0-9]{48,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9\-_]{95,}$/,
  "google-ai": /^AIza[A-Za-z0-9\-_]{35}$/,
  huggingface: /^hf_[A-Za-z0-9]{37}$/,
  mistral: /^[A-Za-z0-9]{32}$/,
  azure: /^[A-Za-z0-9]{32}$/,
  aws: /^[A-Z0-9]{20}$/, // Access Key ID format
  bedrock: /^[A-Z0-9]{20}$/, // AWS access key ID: 20 uppercase alphanumerics
};

/**
 * API key length constants to replace scattered magic numbers
 */
export const API_KEY_LENGTHS = {
  OPENAI_MIN: 48, // OpenAI API keys minimum length
  ANTHROPIC_MIN: 95, // Anthropic API keys minimum length
  HUGGINGFACE_EXACT: 37, // HuggingFace tokens exact length
  AZURE_MIN: 32, // Azure OpenAI API keys minimum length
  MISTRAL_EXACT: 32, // Mistral API keys exact length
  AWS_ACCESS_KEY: 20, // AWS access key ID exact length
  GOOGLE_AI_EXACT: 39, // Google AI Studio keys exact length (with AIza prefix)
} as const;

/**
 * Project ID format validation (for Google Cloud)
 */
export const PROJECT_ID_FORMAT = {
  MIN_LENGTH: 6, // Minimum project ID length
  MAX_LENGTH: 30, // Maximum project ID length
  PATTERN: /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/, // Google Cloud project ID format
} as const;

/**
 * Validates API key format for a specific provider
 * @param providerKey Provider identifier (e.g., 'openai', 'anthropic')
 * @param apiKey The API key to validate
 * @returns True if format is valid
 */
export function validateApiKeyFormat(
  providerKey: string,
  apiKey: string,
): boolean {
  const format = API_KEY_FORMATS[providerKey.toLowerCase()];
  if (!format) {
    // No format validation available, assume valid if not empty
    return apiKey.length > 0;
  }
  return format.test(apiKey);
}

/**
 * Enhanced validation with format checking
 * @param config Provider configuration options
 * @param enableFormatValidation Whether to validate API key format
 * @returns Validation result with detailed information
 */
export function validateApiKeyEnhanced(
  config: ProviderConfigOptions,
  enableFormatValidation: boolean = false,
): APIValidationResult {
  // Check primary environment variable
  let apiKey = process.env[config.envVarName];

  // Check fallback environment variables if provided
  if (!apiKey && config.fallbackEnvVars) {
    for (const fallbackVar of config.fallbackEnvVars) {
      apiKey = process.env[fallbackVar];
      if (apiKey) {
        break;
      }
    }
  }

  if (!apiKey) {
    return {
      isValid: false,
      apiKey: "",
      errorType: "missing",
      error: createConfigErrorMessage(config),
    };
  }

  // Optional format validation
  if (enableFormatValidation) {
    const providerKey = config.providerName.toLowerCase().replace(/\s/g, "-");
    const formatValid = validateApiKeyFormat(providerKey, apiKey);
    if (!formatValid) {
      return {
        isValid: false,
        apiKey,
        formatValid: false,
        errorType: "format",
        error: `Invalid ${config.providerName} API key format. Please check your API key.`,
      };
    }
  }

  return {
    isValid: true,
    apiKey,
    formatValid: enableFormatValidation ? true : undefined,
  };
}

/**
 * Validates an API key for a provider and returns it (BACKWARD COMPATIBLE)
 * Throws detailed error message if validation fails
 * @param config Provider configuration options
 * @returns The validated API key
 */
export function validateApiKey(config: ProviderConfigOptions): string {
  // Check primary environment variable
  let apiKey = process.env[config.envVarName];

  // Check fallback environment variables if provided
  if (!apiKey && config.fallbackEnvVars) {
    for (const fallbackVar of config.fallbackEnvVars) {
      apiKey = process.env[fallbackVar];
      if (apiKey) {
        break;
      }
    }
  }

  if (!apiKey) {
    throw new Error(createConfigErrorMessage(config));
  }

  return apiKey;
}

/**
 * Creates a standardized configuration error message
 * @param config Provider configuration options
 * @returns Formatted error message with setup instructions
 */
function createConfigErrorMessage(config: ProviderConfigOptions): string {
  const envVarsList = config.fallbackEnvVars
    ? [config.envVarName, ...config.fallbackEnvVars].join(" or ")
    : config.envVarName;

  return `❌ ${config.providerName} Provider Configuration Error

Missing required environment variable: ${envVarsList}

🔧 Step 1: Get ${config.description}
${config.instructions.join("\n")}

🔧 Step 2: Set Environment Variable
Add to your .env file:
${config.envVarName}=your_key_here

🔧 Step 3: Restart Application
Restart your application to load the new environment variables.`;
}

/**
 * Gets a provider model with fallback to default
 * @param envVar Environment variable name for the model
 * @param defaultModel Default model to use if env var not set
 * @returns The model name to use
 */
export function getProviderModel(envVar: string, defaultModel: string): string {
  return process.env[envVar] || defaultModel;
}

/**
 * Checks if provider credentials are available
 * @param envVars Array of environment variable names to check
 * @returns True if one of the credentials is available
 */
export function hasProviderCredentials(envVars: string[]): boolean {
  return envVars.some((envVar) => !!process.env[envVar]);
}

// =============================================================================
// PROVIDER-SPECIFIC CONFIGURATION CREATORS
// =============================================================================

/**
 * Creates Anthropic provider configuration
 */
export function createAnthropicConfig(): ProviderConfigOptions {
  return {
    providerName: "Anthropic",
    envVarName: "ANTHROPIC_API_KEY",
    setupUrl: "https://console.anthropic.com/",
    description: "Anthropic API Key",
    instructions: [
      "1. Visit: https://console.anthropic.com/",
      "2. Sign in or create an account",
      "3. Go to API Keys section",
      "4. Create a new API key",
    ],
  };
}

/**
 * Creates OpenAI provider configuration
 */
export function createOpenAIConfig(): ProviderConfigOptions {
  return {
    providerName: "OPENAI",
    envVarName: "OPENAI_API_KEY",
    setupUrl: "https://platform.openai.com/api-keys",
    description: "Credentials",
    instructions: [
      "1. Visit: https://platform.openai.com/api-keys",
      "2. Create new API key",
      "3. Copy the key",
    ],
  };
}

/**
 * Creates HuggingFace provider configuration
 */
export function createHuggingFaceConfig(): ProviderConfigOptions {
  return {
    providerName: "HuggingFace",
    envVarName: "HUGGINGFACE_API_KEY",
    setupUrl: "https://huggingface.co/settings/tokens",
    description: "Credentials",
    instructions: [
      "1. Visit: https://huggingface.co/settings/tokens",
      "2. Create new API token",
      "3. Copy the token",
    ],
    fallbackEnvVars: ["HF_TOKEN"],
  };
}

/**
 * Creates Mistral provider configuration
 */
export function createMistralConfig(): ProviderConfigOptions {
  return {
    providerName: "Mistral",
    envVarName: "MISTRAL_API_KEY",
    setupUrl: "https://console.mistral.ai/",
    description: "API key",
    instructions: [
      "1. Visit: https://console.mistral.ai/",
      "2. Create or sign in to your account",
      "3. Generate a new API key",
    ],
  };
}

/**
 * Creates AWS Access Key configuration for Bedrock
 */
export function createAWSAccessKeyConfig(): ProviderConfigOptions {
  return {
    providerName: "AWS Bedrock",
    envVarName: "AWS_ACCESS_KEY_ID",
    setupUrl: "https://console.aws.amazon.com/iam/",
    description: "AWS Credentials",
    instructions: [
      "1. Visit: https://console.aws.amazon.com/iam/",
      "2. Create IAM user with Bedrock permissions",
      "3. Generate access key",
    ],
  };
}

/**
 * Creates AWS Secret Key configuration for Bedrock
 */
export function createAWSSecretConfig(): ProviderConfigOptions {
  return {
    providerName: "AWS Bedrock",
    envVarName: "AWS_SECRET_ACCESS_KEY",
    setupUrl: "https://console.aws.amazon.com/iam/",
    description: "AWS Credentials",
    instructions: [
      "1. Visit: https://console.aws.amazon.com/iam/",
      "2. Create IAM user with Bedrock permissions",
      "3. Generate access key",
    ],
  };
}

/**
 * Creates Azure OpenAI API Key configuration
 */
export function createAzureAPIKeyConfig(): ProviderConfigOptions {
  return {
    providerName: "Azure OpenAI",
    envVarName: "AZURE_OPENAI_API_KEY",
    setupUrl: "https://portal.azure.com/",
    description: "Azure OpenAI API Key",
    instructions: [
      "1. Visit: https://portal.azure.com/",
      "2. Create or access Azure OpenAI resource",
      "3. Get API key from Keys and Endpoint section",
    ],
  };
}

/**
 * Creates Azure OpenAI Endpoint configuration
 */
export function createAzureEndpointConfig(): ProviderConfigOptions {
  return {
    providerName: "Azure OpenAI",
    envVarName: "AZURE_OPENAI_ENDPOINT",
    setupUrl: "https://portal.azure.com/",
    description: "Azure OpenAI Endpoint",
    instructions: [
      "1. Visit: https://portal.azure.com/",
      "2. Access your Azure OpenAI resource",
      "3. Copy endpoint URL from Keys and Endpoint section",
    ],
  };
}

/**
 * Creates OpenAI Compatible provider configuration
 */
export function createOpenAICompatibleConfig(): ProviderConfigOptions {
  return {
    providerName: "OpenAI Compatible",
    envVarName: "OPENAI_COMPATIBLE_API_KEY",
    setupUrl: "https://openrouter.ai/",
    description: "OpenAI-compatible API credentials",
    instructions: [
      "1. Set OPENAI_COMPATIBLE_BASE_URL to your endpoint (e.g., https://api.openrouter.ai/api/v1)",
      "2. Get API key from your OpenAI-compatible service:",
      "   • OpenRouter: https://openrouter.ai/keys",
      "   • vLLM: Use a random value for local deployments",
      "   • LiteLLM: Check your LiteLLM server configuration",
      "3. Set OPENAI_COMPATIBLE_API_KEY to your API key",
      "4. Optionally set OPENAI_COMPATIBLE_MODEL (will auto-discover if not set)",
    ],
  };
}

/**
 * Creates Google Vertex Project ID configuration
 */
export function createVertexProjectConfig(): ProviderConfigOptions {
  return {
    providerName: "Google Vertex AI",
    envVarName: "GOOGLE_CLOUD_PROJECT_ID",
    setupUrl: "https://console.cloud.google.com/",
    description: "Google Cloud Credentials",
    instructions: [
      "1. Visit: https://console.cloud.google.com/",
      "2. Create or select a project",
      "3. Enable Vertex AI API",
      "4. Set up authentication",
    ],
    fallbackEnvVars: [
      "VERTEX_PROJECT_ID",
      "GOOGLE_VERTEX_PROJECT",
      "GOOGLE_CLOUD_PROJECT",
    ],
  };
}

/**
 * Creates Google Cloud Authentication configuration
 */
export function createGoogleAuthConfig(): ProviderConfigOptions {
  return {
    providerName: "Google Vertex AI",
    envVarName: "GOOGLE_APPLICATION_CREDENTIALS",
    setupUrl: "https://console.cloud.google.com/",
    description: "Google Cloud authentication",
    instructions: [
      "🔧 Option 1: Service Account Key File",
      "GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json",
      "",
      "🔧 Option 2: Service Account Key (Base64)",
      "GOOGLE_SERVICE_ACCOUNT_KEY=base64_encoded_key",
      "",
      "🔧 Option 3: Individual Credentials",
      "GOOGLE_AUTH_CLIENT_EMAIL=your-service-account@project.iam.gserviceaccount.com",
      "GOOGLE_AUTH_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...",
    ],
    fallbackEnvVars: ["GOOGLE_SERVICE_ACCOUNT_KEY"],
  };
}

/**
 * Creates Anthropic Base Provider configuration
 */
export function createAnthropicBaseConfig(): ProviderConfigOptions {
  return {
    providerName: "ANTHROPIC",
    envVarName: "ANTHROPIC_API_KEY",
    setupUrl: "https://console.anthropic.com/",
    description: "Credentials",
    instructions: [
      "Get your API key from https://console.anthropic.com/",
      "",
      "💡 Step 2: Add to your .env file (or export in CLI):",
    ],
  };
}

// =============================================================================
// HELPER FUNCTIONS FOR SPECIFIC PROVIDER NEEDS
// =============================================================================

/**
 * Gets AWS Region with default fallback
 * Supports both AWS_REGION and AWS_DEFAULT_REGION for broader compatibility
 */
export function getAWSRegion(): string {
  return (
    process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1"
  );
}

/**
 * Gets AWS Session Token if available
 */
export function getAWSSessionToken(): string | undefined {
  return process.env.AWS_SESSION_TOKEN;
}

/**
 * Checks if HuggingFace credentials are available
 */
export function hasHuggingFaceCredentials(): boolean {
  return hasProviderCredentials(["HUGGINGFACE_API_KEY", "HF_TOKEN"]);
}
