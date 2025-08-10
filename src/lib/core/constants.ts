/**
 * Central configuration constants for NeuroLink
 * Single source of truth for all default values
 */

// Core AI Generation Defaults
export const DEFAULT_MAX_TOKENS = 8192; // Changed from 10000 to fix Anthropic error
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TIMEOUT = 30000;
export const DEFAULT_MAX_STEPS = 5; // Default multi-turn tool execution steps

// Specialized Use Case Defaults
export const DEFAULT_EVALUATION_MAX_TOKENS = 500; // Keep evaluation fast
export const DEFAULT_ANALYSIS_MAX_TOKENS = 800; // For analysis tools
export const DEFAULT_DOCUMENTATION_MAX_TOKENS = 12000; // For documentation generation

// Provider-specific configurations
export const PROVIDER_CONFIG = {
  evaluation: {
    maxTokens: DEFAULT_EVALUATION_MAX_TOKENS,
    model: "gemini-2.5-flash",
    temperature: 0.3, // Lower temperature for consistent evaluation
  },
  analysis: {
    maxTokens: DEFAULT_ANALYSIS_MAX_TOKENS,
    temperature: 0.5,
  },
  documentation: {
    maxTokens: DEFAULT_DOCUMENTATION_MAX_TOKENS,
    temperature: 0.4,
  },
};

// Provider-specific maxTokens limits (discovered through testing)
export const PROVIDER_MAX_TOKENS = {
  anthropic: {
    "claude-3-haiku-20240307": 4096,
    "claude-3-5-sonnet-20241022": 4096,
    "claude-3-opus-20240229": 4096,
    "claude-3-5-sonnet-20240620": 4096,
    default: 4096, // Conservative default for Anthropic
  },
  openai: {
    "gpt-4o": 16384,
    "gpt-4o-mini": 16384,
    "gpt-3.5-turbo": 4096,
    "gpt-4": 8192,
    "gpt-4-turbo": 4096,
    default: 8192, // OpenAI generally supports higher limits
  },
  "google-ai": {
    "gemini-1.5-pro": 8192,
    "gemini-1.5-flash": 8192,
    "gemini-2.5-pro": 8192,
    "gemini-2.5-flash": 8192,
    "gemini-pro": 4096,
    default: 4096, // Conservative default due to 500 errors at high limits
  },
  vertex: {
    "gemini-1.5-pro": 8192,
    "gemini-1.5-flash": 8192,
    "gemini-2.5-pro": 8192,
    "gemini-2.5-flash": 8192,
    "claude-4.0-sonnet": 4096,
    default: 4096,
  },
  bedrock: {
    "anthropic.claude-3-sonnet-20240229-v1:0": 4096,
    "anthropic.claude-3-haiku-20240307-v1:0": 4096,
    "anthropic.claude-3-5-sonnet-20240620-v1:0": 4096,
    default: 4096,
  },
  ollama: {
    default: 8192, // Ollama typically supports higher limits
  },
  litellm: {
    default: 4096, // Conservative default
  },
  default: 4096, // Safe default across all providers
};

// CLI Validation Limits
export const CLI_LIMITS = {
  maxTokens: {
    min: 1,
    max: 50000,
    default: DEFAULT_MAX_TOKENS,
  },
  temperature: {
    min: 0,
    max: 2,
    default: DEFAULT_TEMPERATURE,
  },
};

// Performance and System Limits
export const SYSTEM_LIMITS = {
  // Prompt size limits (baseProvider.ts magic number fix)
  MAX_PROMPT_LENGTH: 1000000, // 1M characters - prevents memory issues

  // Memory monitoring thresholds (performance.ts)
  HIGH_MEMORY_THRESHOLD: 100, // MB - when to warn about memory usage

  // Timeout warnings (baseProvider.ts)
  LONG_TIMEOUT_WARNING: 300000, // 5 minutes - when to warn about long timeouts

  // Concurrency control (neurolink.ts provider testing)
  DEFAULT_CONCURRENCY_LIMIT: 3, // Max parallel provider tests
  MAX_CONCURRENCY_LIMIT: 5, // Upper bound for concurrency

  // Retry system defaults (retryHandler.ts)
  DEFAULT_RETRY_ATTEMPTS: 3,
  DEFAULT_INITIAL_DELAY: 1000, // 1 second
  DEFAULT_MAX_DELAY: 30000, // 30 seconds
  DEFAULT_BACKOFF_MULTIPLIER: 2,
};

// Environment Variable Support (for future use)
export const ENV_DEFAULTS = {
  maxTokens: process.env.NEUROLINK_DEFAULT_MAX_TOKENS
    ? parseInt(process.env.NEUROLINK_DEFAULT_MAX_TOKENS, 10)
    : DEFAULT_MAX_TOKENS,
  temperature: process.env.NEUROLINK_DEFAULT_TEMPERATURE
    ? parseFloat(process.env.NEUROLINK_DEFAULT_TEMPERATURE)
    : DEFAULT_TEMPERATURE,
};
