/**
 * Processor Presets
 *
 * Pre-configured processor pipeline configurations for common use cases.
 *
 * @module presets
 */

import type { ProcessorPreset } from "../types/processorTypes.js";

/**
 * Default preset - basic validation
 * Provides essential input validation and output length checks
 */
export const defaultPreset: ProcessorPreset = {
  name: "default",
  description: "Basic input validation and output length checking",
  inputProcessors: [
    {
      id: "message-validation",
      config: {
        enabled: true,
        config: {
          minLength: 1,
          maxLength: 50000,
          maxMessages: 100,
        },
      },
    },
  ],
  outputProcessors: [
    {
      id: "length-validation",
      config: {
        enabled: true,
        config: {
          maxLength: 100000,
        },
      },
    },
  ],
};

/**
 * Security preset - PII detection and content safety
 * Focuses on protecting sensitive data and ensuring content safety
 */
export const securityPreset: ProcessorPreset = {
  name: "security",
  description: "PII detection, content moderation, and response filtering",
  inputProcessors: [
    {
      id: "message-validation",
      config: { enabled: true },
    },
    {
      id: "pii-detection",
      config: {
        enabled: true,
        config: {
          detectTypes: ["email", "phone", "ssn", "credit_card"],
          action: "redact",
        },
      },
    },
    {
      id: "content-moderation",
      config: {
        enabled: true,
        config: {
          blockThreshold: 0.7,
          warnThreshold: 0.4,
        },
      },
    },
  ],
  outputProcessors: [
    {
      id: "content-filtering",
      config: {
        enabled: true,
        config: {
          action: "redact",
        },
      },
    },
    {
      id: "toxicity-check",
      config: {
        enabled: true,
        config: {
          action: "warn",
          blockThreshold: 0.7,
          warnThreshold: 0.4,
        },
      },
    },
  ],
};

/**
 * Strict preset - maximum validation and filtering
 * Applies all validators with strict thresholds
 */
export const strictPreset: ProcessorPreset = {
  name: "strict",
  description: "Maximum validation and filtering with strict enforcement",
  inputProcessors: [
    {
      id: "message-validation",
      config: {
        enabled: true,
        config: {
          minLength: 5,
          maxLength: 20000,
          maxMessages: 50,
          requireSystemPrompt: false,
        },
      },
    },
    {
      id: "pii-detection",
      config: {
        enabled: true,
        config: {
          detectTypes: ["email", "phone", "ssn", "credit_card", "ip_address"],
          action: "abort",
        },
      },
    },
    {
      id: "content-moderation",
      config: {
        enabled: true,
        config: {
          blockThreshold: 0.5,
          warnThreshold: 0.3,
        },
      },
    },
  ],
  outputProcessors: [
    {
      id: "response-validation",
      config: {
        enabled: true,
        config: {
          minLength: 10,
          retryOnFailure: true,
          maxRetries: 2,
        },
      },
    },
    {
      id: "length-validation",
      config: {
        enabled: true,
        config: {
          maxLength: 50000,
          action: "truncate",
        },
      },
    },
    {
      id: "content-filtering",
      config: {
        enabled: true,
        config: {
          action: "abort",
        },
      },
    },
    {
      id: "toxicity-check",
      config: {
        enabled: true,
        config: {
          action: "abort",
          blockThreshold: 0.5,
          warnThreshold: 0.3,
        },
      },
    },
  ],
};

/**
 * Quality preset - focuses on response quality
 * Ensures responses meet quality standards
 */
export const qualityPreset: ProcessorPreset = {
  name: "quality",
  description: "Response quality validation and retry on failure",
  inputProcessors: [
    {
      id: "message-validation",
      config: { enabled: true },
    },
  ],
  outputProcessors: [
    {
      id: "response-validation",
      config: {
        enabled: true,
        config: {
          minLength: 50,
          retryOnFailure: true,
          maxRetries: 3,
        },
      },
    },
    {
      id: "length-validation",
      config: {
        enabled: true,
        config: {
          minLength: 20,
          maxLength: 10000,
          action: "retry",
          maxRetries: 2,
        },
      },
    },
    {
      id: "toxicity-check",
      config: {
        enabled: true,
        config: {
          action: "retry",
          maxRetries: 2,
        },
      },
    },
  ],
};

/**
 * Minimal preset - lightweight validation
 * Only basic checks for maximum performance
 */
export const minimalPreset: ProcessorPreset = {
  name: "minimal",
  description: "Lightweight validation for maximum performance",
  inputProcessors: [
    {
      id: "message-validation",
      config: {
        enabled: true,
        config: {
          maxLength: 100000,
        },
      },
    },
  ],
  outputProcessors: [],
};

/**
 * All available built-in presets
 */
export const builtInPresets: ProcessorPreset[] = [
  defaultPreset,
  securityPreset,
  strictPreset,
  qualityPreset,
  minimalPreset,
];

/**
 * Get a preset by name
 * @param name - Preset name
 * @returns The preset or undefined
 */
export function getPreset(name: string): ProcessorPreset | undefined {
  return builtInPresets.find((p) => p.name === name);
}

/**
 * Get all preset names
 * @returns Array of preset names
 */
export function getPresetNames(): string[] {
  return builtInPresets.map((p) => p.name);
}
