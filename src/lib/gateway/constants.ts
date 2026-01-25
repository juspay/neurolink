/**
 * Gateway Provider System Constants
 *
 * Configuration defaults and provider mappings for the unified gateway system.
 */

import { AIProviderName } from "../constants/enums.js";
import type {
  FallbackConfig,
  GatewayProviderConfig,
  RegistrySource,
} from "./types.js";

/**
 * Default cache TTL in milliseconds (1 hour)
 */
export const CACHE_TTL_MS =
  parseInt(process.env.NEUROLINK_REGISTRY_CACHE_TTL || "", 10) ||
  60 * 60 * 1000;

/**
 * Registry refresh interval in milliseconds (1 hour)
 */
export const REGISTRY_REFRESH_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Default API timeout in milliseconds (30 seconds)
 */
export const API_TIMEOUT_MS = 30000;

/**
 * Registry fetch timeout in milliseconds (10 seconds)
 */
export const REGISTRY_FETCH_TIMEOUT_MS = 10000;

/**
 * Feature flag for gateway provider
 */
export const GATEWAY_ENABLED =
  process.env.NEUROLINK_GATEWAY_ENABLED !== "false";

/**
 * Default fallback configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  models: [],
  retries: 2,
  retryDelayMs: 1000,
  timeout: 30000,
};

/**
 * Default registry sources
 * Priority: lower number = higher priority
 * models.dev is preferred as it's a comprehensive, community-maintained registry
 */
export const DEFAULT_REGISTRY_SOURCES: RegistrySource[] = [
  {
    name: "models.dev",
    url: "https://models.dev/api/models",
    priority: 0,
    parser: "models.dev",
  },
  {
    name: "openrouter",
    url: "https://openrouter.ai/api/v1/models",
    priority: 1,
    parser: "openrouter",
  },
];

/**
 * Providers with direct SDK support in NeuroLink
 * These can be routed directly without going through a gateway
 */
export const DIRECT_PROVIDER_CONFIGS: Record<string, GatewayProviderConfig> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    sdkPackage: "@ai-sdk/openai",
    authEnvVar: "OPENAI_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.OPENAI,
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic",
    sdkPackage: "@ai-sdk/anthropic",
    authEnvVar: "ANTHROPIC_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.ANTHROPIC,
  },
  google: {
    id: "google",
    name: "Google AI Studio",
    sdkPackage: "@ai-sdk/google",
    authEnvVar: "GOOGLE_AI_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.GOOGLE_AI,
  },
  "google-ai": {
    id: "google-ai",
    name: "Google AI Studio",
    sdkPackage: "@ai-sdk/google",
    authEnvVar: "GOOGLE_AI_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.GOOGLE_AI,
  },
  mistral: {
    id: "mistral",
    name: "Mistral AI",
    sdkPackage: "@ai-sdk/mistral",
    authEnvVar: "MISTRAL_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.MISTRAL,
  },
  mistralai: {
    id: "mistralai",
    name: "Mistral AI",
    sdkPackage: "@ai-sdk/mistral",
    authEnvVar: "MISTRAL_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.MISTRAL,
  },
  vertex: {
    id: "vertex",
    name: "Google Vertex AI",
    sdkPackage: "@ai-sdk/google-vertex",
    authEnvVar: "GOOGLE_APPLICATION_CREDENTIALS",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.VERTEX,
  },
  bedrock: {
    id: "bedrock",
    name: "Amazon Bedrock",
    sdkPackage: "@ai-sdk/amazon-bedrock",
    authEnvVar: "AWS_ACCESS_KEY_ID",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.BEDROCK,
  },
  azure: {
    id: "azure",
    name: "Azure OpenAI",
    sdkPackage: "@ai-sdk/azure",
    authEnvVar: "AZURE_OPENAI_API_KEY",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.AZURE,
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    authEnvVar: "OLLAMA_HOST",
    routing: "direct",
    supportsDirectRouting: true,
    neuroLinkProviderName: AIProviderName.OLLAMA,
  },
};

/**
 * Providers that should be routed via OpenRouter gateway
 * These don't have direct SDK support in NeuroLink
 */
export const GATEWAY_PROVIDER_CONFIGS: Record<string, GatewayProviderConfig> = {
  groq: {
    id: "groq",
    name: "Groq",
    authEnvVar: "GROQ_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek",
    authEnvVar: "DEEPSEEK_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  together: {
    id: "together",
    name: "Together AI",
    authEnvVar: "TOGETHER_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  perplexity: {
    id: "perplexity",
    name: "Perplexity",
    authEnvVar: "PERPLEXITY_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  cohere: {
    id: "cohere",
    name: "Cohere",
    authEnvVar: "COHERE_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  ai21: {
    id: "ai21",
    name: "AI21 Labs",
    authEnvVar: "AI21_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  "meta-llama": {
    id: "meta-llama",
    name: "Meta Llama",
    authEnvVar: "",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  qwen: {
    id: "qwen",
    name: "Qwen (Alibaba)",
    authEnvVar: "",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  nvidia: {
    id: "nvidia",
    name: "NVIDIA",
    authEnvVar: "NVIDIA_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  x: {
    id: "x",
    name: "xAI (Grok)",
    authEnvVar: "XAI_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
  xai: {
    id: "xai",
    name: "xAI (Grok)",
    authEnvVar: "XAI_API_KEY",
    routing: "openrouter",
    supportsDirectRouting: false,
  },
};

/**
 * Combined provider configurations
 */
export const ALL_PROVIDER_CONFIGS: Record<string, GatewayProviderConfig> = {
  ...DIRECT_PROVIDER_CONFIGS,
  ...GATEWAY_PROVIDER_CONFIGS,
};

/**
 * Model name patterns for provider inference
 * Used when model string doesn't include provider prefix
 */
export const MODEL_INFERENCE_PATTERNS: Array<{
  pattern: RegExp;
  provider: string;
}> = [
  // OpenAI patterns
  { pattern: /^gpt-/i, provider: "openai" },
  { pattern: /^o1/i, provider: "openai" },
  { pattern: /^o3/i, provider: "openai" },
  { pattern: /^o4/i, provider: "openai" },
  { pattern: /^chatgpt/i, provider: "openai" },

  // Anthropic patterns
  { pattern: /^claude/i, provider: "anthropic" },

  // Google patterns
  { pattern: /^gemini/i, provider: "google" },
  { pattern: /^gemma/i, provider: "google" },

  // Mistral patterns
  { pattern: /^mistral/i, provider: "mistral" },
  { pattern: /^mixtral/i, provider: "mistral" },
  { pattern: /^codestral/i, provider: "mistral" },
  { pattern: /^pixtral/i, provider: "mistral" },

  // Meta patterns
  { pattern: /^llama/i, provider: "meta-llama" },

  // DeepSeek patterns
  { pattern: /^deepseek/i, provider: "deepseek" },

  // Qwen patterns
  { pattern: /^qwen/i, provider: "qwen" },

  // Cohere patterns
  { pattern: /^command/i, provider: "cohere" },

  // Perplexity patterns
  { pattern: /^sonar/i, provider: "perplexity" },
];

/**
 * Default model to use when none specified
 */
export const DEFAULT_GATEWAY_MODEL = "openai/gpt-4o";

/**
 * OpenRouter API configuration
 */
export const OPENROUTER_CONFIG = {
  baseUrl: "https://openrouter.ai/api/v1",
  modelsEndpoint: "https://openrouter.ai/api/v1/models",
  referer: process.env.OPENROUTER_REFERER || "https://neurolink.dev",
  appName: process.env.OPENROUTER_APP_NAME || "NeuroLink",
};

/**
 * LiteLLM default configuration
 */
export const LITELLM_CONFIG = {
  baseUrl: process.env.LITELLM_BASE_URL || "http://localhost:4000",
  defaultApiKey: process.env.LITELLM_API_KEY || "sk-anything",
};
