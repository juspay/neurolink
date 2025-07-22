/**
 * Central configuration constants for NeuroLink
 * Single source of truth for all default values
 */

// Core AI Generation Defaults
export const DEFAULT_MAX_TOKENS = 8192; // Changed from 10000 to fix Anthropic error
export const DEFAULT_TEMPERATURE = 0.7;
export const DEFAULT_TIMEOUT = 30000;

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

// Environment Variable Support (for future use)
export const ENV_DEFAULTS = {
  maxTokens: process.env.NEUROLINK_DEFAULT_MAX_TOKENS
    ? parseInt(process.env.NEUROLINK_DEFAULT_MAX_TOKENS, 10)
    : DEFAULT_MAX_TOKENS,
  temperature: process.env.NEUROLINK_DEFAULT_TEMPERATURE
    ? parseFloat(process.env.NEUROLINK_DEFAULT_TEMPERATURE)
    : DEFAULT_TEMPERATURE,
};
