/**
 * Provider Configuration Utility
 * Consolidated configuration helpers for all AI providers
 * Eliminates duplicate error messages and configuration logic
 * Enhanced with format validation and advanced error classification
 * Extended with Claude subscription OAuth support
 */

import type {
  APIValidationResult,
  ProviderConfigOptions,
  AnthropicAuthMethod,
  ClaudeSubscriptionTier,
  AnthropicAuthConfig,
  OAuthToken,
  AnthropicAuthConfigResult,
} from "../types/index.js";

import { logger } from "./logger.js";
// Re-export subscription types for convenience

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
 * OAuth token format validation patterns
 * These patterns are more flexible as OAuth tokens can vary by provider
 */
export const OAUTH_TOKEN_FORMATS: Record<string, RegExp> = {
  // OAuth access tokens are typically JWT or opaque tokens
  // Claude OAuth access tokens: Bearer tokens with typical JWT structure or opaque format
  "anthropic-access":
    /^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$|^[A-Za-z0-9\-_]{32,}$/,
  // Refresh tokens are typically longer opaque strings
  "anthropic-refresh": /^[A-Za-z0-9\-_]{32,}$/,
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
    if (config.optional) {
      // Local providers — base URL defaulted; treat as valid with empty value.
      return { isValid: true, apiKey: "" };
    }
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
    // Local providers (LM Studio, llama.cpp) treat envVarName as a base-URL
    // override, not a credential. Returning "" lets callers fall back to the
    // documented default URL without raising a configuration error.
    if (config.optional) {
      return "";
    }
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
 * Supports both API key and OAuth authentication methods
 */
export function createAnthropicConfig(): ProviderConfigOptions {
  const authMethod = getAnthropicAuthMethod();
  const tier = getAnthropicSubscriptionTier();

  // Base instructions for API key authentication
  const apiKeyInstructions = [
    "🔑 Option 1: API Key Authentication (Recommended for developers)",
    "1. Visit: https://console.anthropic.com/",
    "2. Sign in or create an account",
    "3. Go to API Keys section",
    "4. Create a new API key",
    "5. Set ANTHROPIC_API_KEY in your .env file",
  ];

  // OAuth instructions for Claude subscription users
  const oauthInstructions = [
    "",
    "🔐 Option 2: OAuth Authentication (For Claude Pro/Max subscribers)",
    "1. Set ANTHROPIC_AUTH_METHOD=oauth in your .env file",
    "2. Set ANTHROPIC_SUBSCRIPTION_TIER to your tier (free, pro, max)",
    "3. Run the OAuth flow to obtain tokens, or set pre-configured tokens:",
    "   - ANTHROPIC_OAUTH_TOKEN=your_access_token",
    "   - ANTHROPIC_OAUTH_REFRESH_TOKEN=your_refresh_token (optional)",
    "",
    "📋 Available Subscription Tiers:",
    "   - free: Free tier with limited usage",
    "   - pro: Claude Pro ($20/month) - Extended usage limits",
    "   - max: Claude Max - Highest usage limits",
    "   - api: API-based access (pay-per-use)",
  ];

  // Choose instructions based on current auth method
  const instructions =
    authMethod === "oauth"
      ? [...oauthInstructions.slice(1), "", ...apiKeyInstructions]
      : [...apiKeyInstructions, ...oauthInstructions];

  return {
    providerName: "Anthropic",
    envVarName:
      authMethod === "oauth" ? "ANTHROPIC_OAUTH_TOKEN" : "ANTHROPIC_API_KEY",
    setupUrl:
      authMethod === "oauth"
        ? "https://claude.ai/settings"
        : "https://console.anthropic.com/",
    description:
      authMethod === "oauth"
        ? `Anthropic OAuth Token (${tier} tier)`
        : "Anthropic API Key",
    instructions,
    fallbackEnvVars:
      authMethod === "oauth"
        ? ["ANTHROPIC_API_KEY"] // Fall back to API key if OAuth token not present
        : [
            "ANTHROPIC_OAUTH_TOKEN",
            "CLAUDE_OAUTH_TOKEN",
            "ANTHROPIC_OAUTH_ACCESS_TOKEN",
          ], // Fall back to OAuth if API key not present
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
 * Creates DeepSeek provider configuration
 */
export function createDeepSeekConfig(): ProviderConfigOptions {
  return {
    providerName: "DeepSeek",
    envVarName: "DEEPSEEK_API_KEY",
    setupUrl: "https://platform.deepseek.com/api_keys",
    description: "API key",
    instructions: [
      "1. Visit: https://platform.deepseek.com/api_keys",
      "2. Create or sign in to your DeepSeek account",
      "3. Generate a new API key",
      "4. Set DEEPSEEK_API_KEY in your .env file",
    ],
  };
}

/**
 * Creates NVIDIA NIM provider configuration
 */
export function createNvidiaNimConfig(): ProviderConfigOptions {
  return {
    providerName: "NVIDIA NIM",
    envVarName: "NVIDIA_NIM_API_KEY",
    setupUrl: "https://build.nvidia.com/settings/api-keys",
    description: "API key",
    instructions: [
      "1. Visit: https://build.nvidia.com/",
      "2. Sign in with your NVIDIA developer account",
      "3. Open Settings → API Keys",
      "4. Generate a new API key (Bearer token)",
      "5. Set NVIDIA_NIM_API_KEY in your .env file",
    ],
  };
}

/**
 * Creates LM Studio provider configuration (local server)
 */
export function createLmStudioConfig(): ProviderConfigOptions {
  return {
    providerName: "LM Studio",
    envVarName: "LM_STUDIO_BASE_URL",
    setupUrl: "https://lmstudio.ai/",
    description: "LM Studio server URL",
    instructions: [
      "1. Install LM Studio: https://lmstudio.ai/",
      "2. Open LM Studio and download a model (e.g. Llama 3.2 3B Instruct)",
      '3. Click "Local Server" → Start Server',
      "4. Default URL is http://localhost:1234/v1 (override via LM_STUDIO_BASE_URL)",
    ],
    // Base URL is optional — defaults to http://localhost:1234/v1 if unset.
    optional: true,
  };
}

/**
 * Creates llama.cpp provider configuration (local server)
 */
export function createLlamaCppConfig(): ProviderConfigOptions {
  return {
    providerName: "llama.cpp",
    envVarName: "LLAMACPP_BASE_URL",
    setupUrl: "https://github.com/ggerganov/llama.cpp",
    description: "llama.cpp server URL",
    instructions: [
      "1. Build llama.cpp: https://github.com/ggerganov/llama.cpp#build",
      "2. Run: ./llama-server -m model.gguf --port 8080",
      "3. Default URL is http://localhost:8080/v1 (override via LLAMACPP_BASE_URL)",
    ],
    // Base URL is optional — defaults to http://localhost:8080/v1 if unset.
    optional: true,
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

// =============================================================================
// ANTHROPIC/CLAUDE SUBSCRIPTION AUTH HELPERS
// =============================================================================

/**
 * Gets the configured Anthropic authentication method
 * Defaults to "api_key" for backward compatibility
 * @returns The configured authentication method
 */
export function getAnthropicAuthMethod(): AnthropicAuthMethod {
  const method = process.env.ANTHROPIC_AUTH_METHOD?.toLowerCase();
  if (method === "oauth") {
    return "oauth";
  }
  return "api_key";
}

/**
 * Gets the configured Claude subscription tier
 * Defaults to "api" for backward compatibility (API key users)
 * @returns The configured subscription tier
 */
export function getAnthropicSubscriptionTier(): ClaudeSubscriptionTier {
  const tier = process.env.ANTHROPIC_SUBSCRIPTION_TIER?.toLowerCase();
  switch (tier) {
    case "free":
      return "free";
    case "pro":
      return "pro";
    case "max":
      return "max";
    case "max_5":
      return "max_5";
    case "max_20":
      return "max_20";
    case "api":
    default:
      return "api";
  }
}

/**
 * Validates OAuth access token format
 * @param token The token to validate
 * @returns True if the token format is valid
 */
export function validateOAuthAccessToken(token: string): boolean {
  if (!token || token.length < 32) {
    return false;
  }
  const format = OAUTH_TOKEN_FORMATS["anthropic-access"];
  return format.test(token);
}

/**
 * Validates OAuth refresh token format
 * @param token The token to validate
 * @returns True if the token format is valid
 */
export function validateOAuthRefreshToken(token: string): boolean {
  if (!token || token.length < 32) {
    return false;
  }
  const format = OAUTH_TOKEN_FORMATS["anthropic-refresh"];
  return format.test(token);
}

/**
 * Detects the best available authentication method for Anthropic
 * Checks environment variables and returns the most appropriate auth configuration
 * @returns Complete authentication configuration
 */
export function detectAnthropicAuth(): AnthropicAuthConfigResult {
  const explicitMethod = process.env.ANTHROPIC_AUTH_METHOD?.toLowerCase();
  const tier = getAnthropicSubscriptionTier();

  // Check for OAuth tokens — canonical + fallbacks for backward compatibility
  const accessToken =
    process.env.ANTHROPIC_OAUTH_TOKEN ??
    process.env.CLAUDE_OAUTH_TOKEN ??
    process.env.ANTHROPIC_OAUTH_ACCESS_TOKEN;
  const refreshToken = process.env.ANTHROPIC_OAUTH_REFRESH_TOKEN;

  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // If explicit method is set, use it
  if (explicitMethod === "oauth") {
    if (accessToken) {
      const isValidAccessToken = validateOAuthAccessToken(accessToken);
      const isValidRefreshToken = refreshToken
        ? validateOAuthRefreshToken(refreshToken)
        : true;

      if (!isValidAccessToken) {
        return {
          method: "oauth",
          tier,
          accessToken,
          refreshToken,
          isConfigured: false,
          error:
            "Invalid OAuth access token format. Token should be a valid JWT or opaque token.",
        };
      }

      if (refreshToken && !isValidRefreshToken) {
        return {
          method: "oauth",
          tier,
          accessToken,
          refreshToken,
          isConfigured: false,
          error:
            "Invalid OAuth refresh token format. Token should be at least 32 characters.",
        };
      }

      return {
        method: "oauth",
        tier,
        accessToken,
        refreshToken,
        isConfigured: true,
      };
    }

    // OAuth method specified but no token
    return {
      method: "oauth",
      tier,
      isConfigured: false,
      error:
        "OAuth authentication method specified but ANTHROPIC_OAUTH_TOKEN not set.",
    };
  }

  // If explicit method is api_key or not set
  if (apiKey) {
    const isValidApiKey = validateApiKeyFormat("anthropic", apiKey);
    if (!isValidApiKey) {
      // Still return as configured but note the format issue
      return {
        method: "api_key",
        tier: "api", // API key users are always on "api" tier
        apiKey,
        isConfigured: true,
        error: "API key format may be invalid. Expected format: sk-ant-...",
      };
    }

    return {
      method: "api_key",
      tier: "api",
      apiKey,
      isConfigured: true,
    };
  }

  // Check if OAuth tokens are available without explicit method set
  if (accessToken) {
    const isValidAccessToken = validateOAuthAccessToken(accessToken);
    return {
      method: "oauth",
      tier,
      accessToken,
      refreshToken,
      isConfigured: isValidAccessToken,
      error: isValidAccessToken
        ? undefined
        : "Invalid OAuth access token format.",
    };
  }

  // No authentication configured
  return {
    method: "api_key",
    tier: "api",
    isConfigured: false,
    error:
      "No Anthropic authentication configured. Set ANTHROPIC_API_KEY or configure OAuth.",
  };
}

/**
 * Checks if Anthropic credentials are available (either API key or OAuth)
 * @returns True if any valid authentication is configured
 */
export function hasAnthropicCredentials(): boolean {
  const auth = detectAnthropicAuth();
  return auth.isConfigured;
}

/**
 * Gets the authentication token or key for Anthropic API calls
 * Returns the appropriate credential based on configured auth method
 * @returns The API key or OAuth access token, or undefined if not configured
 */
export function getAnthropicCredential(): string | undefined {
  const auth = detectAnthropicAuth();
  if (!auth.isConfigured) {
    return undefined;
  }
  return auth.method === "oauth" ? auth.accessToken : auth.apiKey;
}

/**
 * Checks if OAuth refresh is needed based on token state
 * This is a placeholder for actual token expiration checking
 * @returns True if refresh is needed
 */
export function needsOAuthRefresh(): boolean {
  const auth = detectAnthropicAuth();
  if (auth.method !== "oauth" || !auth.isConfigured) {
    return false;
  }

  // In a real implementation, you would check token expiration
  // For now, we just check if a refresh token is available
  // The actual refresh logic would be in the OAuth client
  return !!auth.refreshToken;
}

/**
 * Gets subscription tier limits for informational purposes
 * These are approximate limits and may change
 * @param tier The subscription tier
 * @returns Object with tier limit information
 */
export function getSubscriptionTierLimits(tier: ClaudeSubscriptionTier): {
  messagesPerDay: number | "unlimited";
  contextWindow: number;
  priorityAccess: boolean;
  description: string;
} {
  switch (tier) {
    case "free":
      return {
        messagesPerDay: 10,
        contextWindow: 100000,
        priorityAccess: false,
        description: "Free tier with limited daily messages",
      };
    case "pro":
      return {
        messagesPerDay: 100,
        contextWindow: 200000,
        priorityAccess: true,
        description: "Claude Pro subscription with extended limits",
      };
    case "max":
      return {
        messagesPerDay: "unlimited",
        contextWindow: 200000,
        priorityAccess: true,
        description: "Claude Max subscription with highest limits",
      };
    case "max_5":
      return {
        messagesPerDay: "unlimited",
        contextWindow: 200000,
        priorityAccess: true,
        description: "Claude Max 5x usage tier with priority processing",
      };
    case "max_20":
      return {
        messagesPerDay: "unlimited",
        contextWindow: 200000,
        priorityAccess: true,
        description: "Claude Max 20x usage tier with maximum capacity",
      };
    case "api":
    default:
      return {
        messagesPerDay: "unlimited",
        contextWindow: 200000,
        priorityAccess: true,
        description: "API access with pay-per-use billing",
      };
  }
}

// =============================================================================
// ENVIRONMENT VARIABLE CONSTANTS
// =============================================================================

/**
 * Environment variables for Anthropic/Claude subscription configuration
 * These control authentication method, subscription tier, and feature flags
 */
export const ANTHROPIC_ENV_VARS = {
  /** Authentication method: "api_key" or "oauth" */
  AUTH_METHOD: "ANTHROPIC_AUTH_METHOD",
  /** Subscription tier: "free", "pro", "max", "max_5", "max_20", or "api" */
  SUBSCRIPTION_TIER: "ANTHROPIC_SUBSCRIPTION_TIER",
  /** Enable beta features: "true" or "false" */
  ENABLE_BETA_FEATURES: "ANTHROPIC_ENABLE_BETA_FEATURES",
  /** API key for api_key authentication */
  API_KEY: "ANTHROPIC_API_KEY",
  /** OAuth access token for oauth authentication (canonical, with BC fallbacks) */
  OAUTH_ACCESS_TOKEN: "ANTHROPIC_OAUTH_TOKEN",
  /** OAuth refresh token for oauth authentication */
  OAUTH_REFRESH_TOKEN: "ANTHROPIC_OAUTH_REFRESH_TOKEN",
  /** OAuth token expiry timestamp (Unix epoch in seconds) */
  OAUTH_TOKEN_EXPIRY: "ANTHROPIC_OAUTH_TOKEN_EXPIRY",
} as const;

/**
 * Valid subscription tier values for validation
 */
export const VALID_SUBSCRIPTION_TIERS: readonly ClaudeSubscriptionTier[] = [
  "free",
  "pro",
  "max",
  "max_5",
  "max_20",
  "api",
] as const;

/**
 * Valid authentication method values for validation
 */
export const VALID_AUTH_METHODS: readonly AnthropicAuthMethod[] = [
  "api_key",
  "oauth",
] as const;

// =============================================================================
// SUBSCRIPTION TIER VALIDATION
// =============================================================================

/**
 * Validates a subscription tier value
 * @param tier The tier value to validate
 * @returns True if the tier is valid, false otherwise
 */
export function isValidSubscriptionTier(
  tier: string | undefined,
): tier is ClaudeSubscriptionTier {
  if (!tier) {
    return false;
  }
  return VALID_SUBSCRIPTION_TIERS.includes(tier as ClaudeSubscriptionTier);
}

/**
 * Validates an authentication method value
 * @param method The method value to validate
 * @returns True if the method is valid, false otherwise
 */
export function isValidAuthMethod(
  method: string | undefined,
): method is AnthropicAuthMethod {
  if (!method) {
    return false;
  }
  return VALID_AUTH_METHODS.includes(method as AnthropicAuthMethod);
}

/**
 * Validates subscription tier and returns a detailed result
 * @param tier The tier value to validate
 * @returns Validation result with error details if invalid
 */
export function validateSubscriptionTier(tier: string | undefined): {
  isValid: boolean;
  tier?: ClaudeSubscriptionTier;
  error?: string;
} {
  if (!tier) {
    return {
      isValid: false,
      error: "Subscription tier is required but not provided.",
    };
  }

  const normalizedTier = tier.toLowerCase().trim();

  if (isValidSubscriptionTier(normalizedTier)) {
    return {
      isValid: true,
      tier: normalizedTier,
    };
  }

  return {
    isValid: false,
    error: `Invalid subscription tier "${tier}". Valid values are: ${VALID_SUBSCRIPTION_TIERS.join(", ")}`,
  };
}

// =============================================================================
// ANTHROPIC AUTH CONFIG FUNCTIONS
// =============================================================================

/**
 * Gets the complete Anthropic authentication configuration
 * Detects auth method from environment or config and loads appropriate credentials
 *
 * @returns Complete AnthropicAuthConfig with method, credentials, and tier
 */
export function getAnthropicAuthConfig(): AnthropicAuthConfig {
  const method = getAnthropicAuthMethod();
  const tier = detectSubscriptionTier();

  if (method === "oauth") {
    const accessToken = process.env[ANTHROPIC_ENV_VARS.OAUTH_ACCESS_TOKEN];
    const refreshToken = process.env[ANTHROPIC_ENV_VARS.OAUTH_REFRESH_TOKEN];
    const tokenExpiryStr = process.env[ANTHROPIC_ENV_VARS.OAUTH_TOKEN_EXPIRY];

    // Parse token expiry if provided
    let expiresAt: number | undefined;
    if (tokenExpiryStr) {
      const parsed = parseInt(tokenExpiryStr, 10);
      if (!isNaN(parsed)) {
        expiresAt = parsed;
      }
    }

    // Build OAuth token object
    const oauthToken: OAuthToken | undefined = accessToken
      ? {
          accessToken,
          refreshToken,
          expiresAt,
          tokenType: "Bearer",
        }
      : undefined;

    return {
      method: "oauth",
      oauthToken,
      accessToken, // Legacy field for backward compatibility
      refreshToken, // Legacy field for backward compatibility
      tokenExpiry: expiresAt ? expiresAt * 1000 : undefined, // Convert to milliseconds
      subscriptionTier: tier,
      autoRefresh: !!refreshToken,
    };
  }

  // API key authentication
  const apiKey = process.env[ANTHROPIC_ENV_VARS.API_KEY];

  return {
    method: "api_key",
    apiKey,
    subscriptionTier: tier,
    autoRefresh: false,
  };
}

/**
 * Detects the subscription tier from environment variables or config
 * Checks environment variable first, then config, defaults to "api" if using API key
 *
 * @returns The detected subscription tier
 */
export function detectSubscriptionTier(): ClaudeSubscriptionTier {
  // 1. Check environment variable first (highest priority)
  const envTier = process.env[ANTHROPIC_ENV_VARS.SUBSCRIPTION_TIER];
  if (envTier) {
    const validation = validateSubscriptionTier(envTier);
    if (validation.isValid && validation.tier) {
      return validation.tier;
    }
    logger.warn("Invalid ANTHROPIC_SUBSCRIPTION_TIER value", {
      value: envTier,
      validValues: VALID_SUBSCRIPTION_TIERS,
      fallback: "Defaulting based on auth method",
    });
  }

  // 2. Check config file (could be extended to read from config file)
  // For now, we check if there's a tier set via other means
  // This is a placeholder for config file integration
  // const configTier = loadConfigTier(); // Future: implement config file loading

  // 3. Default based on authentication method
  const authMethod = getAnthropicAuthMethod();
  if (authMethod === "oauth") {
    // OAuth users are typically subscription users, default to "pro"
    // unless they've explicitly configured otherwise
    logger.debug(
      "[detectSubscriptionTier] OAuth auth detected, defaulting to pro tier",
    );
    return "pro";
  }

  // 4. API key users default to "api" tier
  logger.debug("[detectSubscriptionTier] API key auth, defaulting to api tier");
  return "api";
}

/**
 * Determines whether beta features should be enabled
 * Checks environment/config and defaults based on authentication method
 *
 * @returns True if beta features should be enabled
 */
export function shouldEnableBetaFeatures(): boolean {
  // 1. Check explicit environment variable first (highest priority)
  const envValue = process.env[ANTHROPIC_ENV_VARS.ENABLE_BETA_FEATURES];
  if (envValue !== undefined) {
    const normalized = envValue.toLowerCase().trim();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
    logger.warn("Invalid ANTHROPIC_ENABLE_BETA_FEATURES value", {
      value: envValue,
      expected: ["true", "false"],
      fallback: "Defaulting based on auth method",
    });
  }

  // 2. Check config file (placeholder for future config integration)
  // const configValue = loadConfigBetaFeatures();

  // 3. Default based on authentication method
  // OAuth users get beta features enabled by default
  // API key users get beta features disabled by default for stability
  const authMethod = getAnthropicAuthMethod();
  return authMethod === "oauth";
}

/**
 * Gets complete subscription configuration including auth, tier, and features
 * Combines all configuration sources into a unified config object
 *
 * @returns Complete subscription configuration
 */
export function getAnthropicSubscriptionConfig(): {
  auth: AnthropicAuthConfig;
  tier: ClaudeSubscriptionTier;
  betaFeaturesEnabled: boolean;
  limits: ReturnType<typeof getSubscriptionTierLimits>;
  isConfigured: boolean;
  error?: string;
} {
  const auth = getAnthropicAuthConfig();
  const tier = detectSubscriptionTier();
  const betaFeaturesEnabled = shouldEnableBetaFeatures();
  const limits = getSubscriptionTierLimits(tier);

  // Determine if properly configured
  let isConfigured = false;
  let error: string | undefined;

  if (auth.method === "oauth") {
    if (auth.oauthToken?.accessToken || auth.accessToken) {
      isConfigured = true;
    } else {
      error =
        "OAuth authentication method specified but no access token configured. " +
        `Set ${ANTHROPIC_ENV_VARS.OAUTH_ACCESS_TOKEN} environment variable.`;
    }
  } else {
    if (auth.apiKey) {
      isConfigured = true;
    } else {
      error =
        "API key authentication method specified but no API key configured. " +
        `Set ${ANTHROPIC_ENV_VARS.API_KEY} environment variable.`;
    }
  }

  return {
    auth,
    tier,
    betaFeaturesEnabled,
    limits,
    isConfigured,
    error,
  };
}

/**
 * Checks if the current subscription tier has access to a specific feature
 * @param feature The feature to check
 * @param currentTier The current subscription tier (optional, auto-detects if not provided)
 * @returns True if the tier has access to the feature
 */
export function hasSubscriptionFeature(
  feature:
    | "extended_thinking"
    | "priority_access"
    | "vision"
    | "file_analysis"
    | "mcp_tools"
    | "computer_use"
    | "web_search",
  currentTier?: ClaudeSubscriptionTier,
): boolean {
  const tier = currentTier ?? detectSubscriptionTier();
  const limits = getSubscriptionTierLimits(tier);

  // Map features to tier capabilities
  switch (feature) {
    case "extended_thinking":
      // Extended thinking requires pro or higher, or API tier
      return tier !== "free";

    case "priority_access":
      return limits.priorityAccess;

    case "vision":
    case "file_analysis":
      // Available on all tiers
      return true;

    case "mcp_tools":
      // MCP tools require pro or higher
      return tier !== "free";

    case "computer_use":
      // Computer use requires max tier or API
      return (
        tier === "max" ||
        tier === "max_5" ||
        tier === "max_20" ||
        tier === "api"
      );

    case "web_search":
      // Web search available on pro or higher
      return tier !== "free";

    default:
      return false;
  }
}

/**
 * Gets a human-readable description of the current authentication configuration
 * Useful for debugging and user feedback
 *
 * @returns Human-readable configuration description
 */
export function describeAnthropicConfig(): string {
  const config = getAnthropicSubscriptionConfig();
  const lines: string[] = [];

  lines.push(`Authentication Method: ${config.auth.method}`);
  lines.push(`Subscription Tier: ${config.tier}`);
  lines.push(
    `Beta Features: ${config.betaFeaturesEnabled ? "Enabled" : "Disabled"}`,
  );
  lines.push(`Configured: ${config.isConfigured ? "Yes" : "No"}`);

  if (config.error) {
    lines.push(`Error: ${config.error}`);
  }

  lines.push(`Daily Messages: ${config.limits.messagesPerDay}`);
  lines.push(
    `Context Window: ${config.limits.contextWindow.toLocaleString()} tokens`,
  );
  lines.push(`Priority Access: ${config.limits.priorityAccess ? "Yes" : "No"}`);

  return lines.join("\n");
}
