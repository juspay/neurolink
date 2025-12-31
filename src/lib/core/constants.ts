/**
 * Central configuration constants for NeuroLink
 * Single source of truth for all default values
 */

// Core AI Generation Defaults
export const DEFAULT_MAX_TOKENS = undefined; // Unlimited by default - let providers decide their own limits
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TIMEOUT = 60000;
export const DEFAULT_MAX_STEPS = 200;
export const DEFAULT_TOOL_MAX_RETRIES = 2; // Maximum retries per tool before permanently failing

// Step execution limits
export const STEP_LIMITS = {
  min: 1,
  max: 500,
  default: DEFAULT_MAX_STEPS,
};

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

// Provider-specific maxTokens limits
export const PROVIDER_MAX_TOKENS = {
  anthropic: {
    default: 64000,
  },
  openai: {
    default: 128000,
  },
  "google-ai": {
    default: 64000,
  },
  vertex: {
    default: 64000,
  },
  bedrock: {
    default: 64000,
  },
  azure: {
    default: 128000,
  },
  mistral: {
    default: 128000,
  },
  ollama: {
    default: 64000,
  },
  litellm: {
    default: 128000,
  },
  default: 64000,
};

// CLI Validation Limits
export const CLI_LIMITS = {
  maxTokens: {
    min: 1,
    max: 64000,
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
  maxTokens: (() => {
    if (!process.env.NEUROLINK_DEFAULT_MAX_TOKENS) {
      return undefined;
    }
    const n = parseInt(process.env.NEUROLINK_DEFAULT_MAX_TOKENS, 10);
    return Number.isFinite(n) ? n : undefined;
  })(),
  temperature: process.env.NEUROLINK_DEFAULT_TEMPERATURE
    ? (() => {
        const t = parseFloat(
          process.env.NEUROLINK_DEFAULT_TEMPERATURE as string,
        );
        return Number.isFinite(t) ? t : DEFAULT_TEMPERATURE;
      })()
    : DEFAULT_TEMPERATURE,
};
