/**
 * Model Name Normalizer for NeuroLink
 * Provides centralized model name normalization and validation across all providers
 * Solves PC-010: Model Name Normalization Missing
 *
 * Features:
 * - Flexible model name acceptance with aliases
 * - Separator normalization (-, _, .)
 * - Provider-specific validation
 * - Helpful error messages
 */

import { AIProviderName } from "../constants/enums.js";
import { logger } from "./logger.js";

/**
 * Normalization rule definition for a provider
 */
export interface NormalizationRule {
  /** Common aliases for models (e.g., "gpt4" → "gpt-4") */
  aliases?: Record<string, string>;
  /** Separator patterns to normalize (e.g., "_" → "-") */
  separatorMap?: Record<string, string>;
  /** Required prefix for model names (e.g., "provider/" for LiteLLM) */
  requiredPrefix?: string;
  /** Custom normalization function for complex cases */
  customNormalizer?: (modelName: string) => string;
  /** Validation function to check if model name is valid */
  validator?: (modelName: string) => boolean;
}

/**
 * Provider-specific normalization rules
 */
const PROVIDER_RULES: Record<string, NormalizationRule> = {
  [AIProviderName.OPENAI]: {
    aliases: {
      // GPT-4 variants
      gpt4: "gpt-4",
      "gpt-4-omni": "gpt-4o",
      gpt4o: "gpt-4o",
      "gpt-4-turbo": "gpt-4-turbo-preview",
      gpt4turbo: "gpt-4-turbo-preview",

      // GPT-3.5 variants
      gpt35: "gpt-3.5-turbo",
      "gpt-3.5": "gpt-3.5-turbo",
      chatgpt: "gpt-3.5-turbo",

      // GPT-4o mini
      "gpt-4o-mini": "gpt-4o-mini",
      "gpt4o-mini": "gpt-4o-mini",
      "gpt-4-mini": "gpt-4o-mini",

      // O-series models
      o1: "o1",
      "o1-preview": "o1-preview",
      "o1-mini": "o1-mini",
      o3: "o3",
      "o3-mini": "o3-mini",

      // GPT-5 series
      gpt5: "gpt-5",
      "gpt-5-mini": "gpt-5-mini",
      gpt52: "gpt-5.2",
      "gpt-5.2": "gpt-5.2",
    },
    separatorMap: {
      _: "-",
    },
  },

  [AIProviderName.ANTHROPIC]: {
    aliases: {
      // Claude shortcuts
      claude: "claude-3-5-sonnet-20241022",
      "claude-sonnet": "claude-3-5-sonnet-20241022",
      "claude-3.5-sonnet": "claude-3-5-sonnet-20241022",
      "claude-opus": "claude-opus-4-5-20251124",
      "claude-haiku": "claude-3-5-haiku-20241022",

      // Version aliases
      "claude-3-opus": "claude-3-opus-20240229",
      "claude-3-sonnet": "claude-3-sonnet-20240229",
      "claude-3-haiku": "claude-3-haiku-20240307",
    },
    separatorMap: {
      _: "-",
    },
  },

  [AIProviderName.GOOGLE_AI]: {
    aliases: {
      gemini: "gemini-2.5-flash",
      "gemini-pro": "gemini-2.5-pro",
      "gemini-flash": "gemini-2.5-flash",
      "gemini-2.5-pro": "gemini-2.5-pro",
      "gemini-2.5-flash": "gemini-2.5-flash",
    },
    customNormalizer: (modelName: string): string => {
      // Normalize separators: "gemini-1-5-pro" → "gemini-1.5-pro"
      // Pattern: replace -N-M with -N.M for version numbers
      return modelName.replace(/(-\d+)-(\d+)/g, "$1.$2");
    },
  },

  [AIProviderName.VERTEX]: {
    aliases: {
      gemini: "gemini-2.5-flash",
      "gemini-pro": "gemini-2.5-pro",
      "gemini-flash": "gemini-2.5-flash",
      "gemini-2.5-pro": "gemini-2.5-pro",
      "gemini-2.5-flash": "gemini-2.5-flash",
    },
    customNormalizer: (modelName: string): string => {
      // Same as Google AI - normalize version separators
      return modelName.replace(/(-\d+)-(\d+)/g, "$1.$2");
    },
  },

  [AIProviderName.MISTRAL]: {
    aliases: {
      mistral: "mistral-large-latest",
      "mistral-large": "mistral-large-latest",
      "mistral-small": "mistral-small-latest",
      codestral: "codestral-latest",
      pixtral: "pixtral-large-latest",
    },
    separatorMap: {
      _: "-",
    },
  },

  [AIProviderName.BEDROCK]: {
    aliases: {
      // Claude on Bedrock
      claude: "anthropic.claude-3-5-sonnet-20241022-v1:0",
      "claude-sonnet": "anthropic.claude-3-5-sonnet-20241022-v1:0",
      "claude-opus": "anthropic.claude-opus-4-5-20251124-v1:0",

      // Nova models
      nova: "amazon.nova-pro-v1:0",
      "nova-pro": "amazon.nova-pro-v1:0",
      "nova-lite": "amazon.nova-lite-v1:0",

      // Llama on Bedrock
      llama4: "meta.llama4-maverick-17b-instruct-v1:0",
    },
    validator: (modelName: string): boolean => {
      // Bedrock models typically have vendor prefix (e.g., "anthropic.", "amazon.", "meta.")
      return (
        modelName.includes(".") ||
        modelName.includes("anthropic") ||
        modelName.includes("amazon") ||
        modelName.includes("meta") ||
        modelName.includes("mistral")
      );
    },
  },

  [AIProviderName.AZURE]: {
    aliases: {
      "gpt-4": "gpt-4",
      gpt4: "gpt-4",
      "gpt-4o": "gpt-4o",
      gpt4o: "gpt-4o",
      "gpt-35-turbo": "gpt-35-turbo",
      "gpt-3.5-turbo": "gpt-35-turbo", // Azure uses "35" not "3.5"
    },
    customNormalizer: (modelName: string): string => {
      // Azure uses "gpt-35-turbo" instead of "gpt-3.5-turbo"
      return modelName.replace(/gpt-3\.5/g, "gpt-35");
    },
  },

  [AIProviderName.OLLAMA]: {
    aliases: {
      llama: "llama3.2",
      "llama3.2": "llama3.2",
      "llama3.3": "llama3.3",
      llama4: "llama4:latest",
      deepseekr1: "deepseek-r1:70b",
      "deepseek-r1": "deepseek-r1:70b",
      qwen: "qwen3:72b",
    },
    customNormalizer: (modelName: string): string => {
      // Ensure :latest or :size tag if missing
      if (!modelName.includes(":")) {
        return `${modelName}:latest`;
      }
      return modelName;
    },
  },

  [AIProviderName.LITELLM]: {
    requiredPrefix: "/",
    validator: (modelName: string): boolean => {
      // LiteLLM requires "provider/model" format
      return modelName.includes("/");
    },
    customNormalizer: (modelName: string): string => {
      // If no prefix, assume openai
      if (!modelName.includes("/")) {
        logger.warn(
          `LiteLLM model name missing provider prefix. Adding 'openai/' prefix. Input: ${modelName}`,
        );
        return `openai/${modelName}`;
      }
      return modelName;
    },
  },

  [AIProviderName.HUGGINGFACE]: {
    validator: (_modelName: string): boolean => {
      // HuggingFace models typically use org/model format
      return true; // Accept any format, HF is very flexible
    },
  },

  [AIProviderName.SAGEMAKER]: {
    validator: (_modelName: string): boolean => {
      // SageMaker uses endpoint names
      return true; // Accept any format
    },
  },

  [AIProviderName.OPENAI_COMPATIBLE]: {
    // OpenAI-compatible providers can use any model name
    validator: (_modelName: string): boolean => {
      return true;
    },
  },
};

/**
 * Model Name Normalizer
 * Provides centralized model name normalization and validation
 */
export class ModelNameNormalizer {
  /**
   * Normalize a model name for a specific provider
   * @param modelName The model name to normalize
   * @param provider The provider name
   * @returns Normalized model name
   */
  static normalize(modelName: string, provider: string): string {
    if (!modelName) {
      return modelName;
    }

    // Convert to lowercase for comparison
    const lowerModelName = modelName.toLowerCase().trim();
    const rule = PROVIDER_RULES[provider];

    if (!rule) {
      logger.debug(`No normalization rule for provider: ${provider}`);
      return modelName;
    }

    let normalized = lowerModelName;

    // Step 1: Check aliases
    if (rule.aliases && rule.aliases[normalized]) {
      normalized = rule.aliases[normalized];
      logger.debug(
        `Model name alias resolved: ${modelName} → ${normalized} (provider: ${provider})`,
      );
    }

    // Step 2: Apply separator normalization
    if (rule.separatorMap) {
      for (const [from, to] of Object.entries(rule.separatorMap)) {
        normalized = normalized.replace(new RegExp(from, "g"), to);
      }
    }

    // Step 3: Apply custom normalizer
    if (rule.customNormalizer) {
      normalized = rule.customNormalizer(normalized);
    }

    // Log normalization if changed
    if (normalized !== lowerModelName) {
      logger.debug(
        `Model name normalized: ${modelName} → ${normalized} (provider: ${provider})`,
      );
    }

    return normalized;
  }

  /**
   * Validate a model name for a specific provider
   * @param modelName The model name to validate
   * @param provider The provider name
   * @returns true if valid, false otherwise
   */
  static validate(modelName: string, provider: string): boolean {
    if (!modelName) {
      return false;
    }

    const rule = PROVIDER_RULES[provider];

    // No rule means accept any model name
    if (!rule) {
      return true;
    }

    // Use custom validator if provided
    if (rule.validator) {
      return rule.validator(modelName);
    }

    // Check required prefix
    if (rule.requiredPrefix && !modelName.includes(rule.requiredPrefix)) {
      return false;
    }

    // Default: accept all model names
    return true;
  }

  /**
   * Get helpful error message for invalid model name
   * @param modelName The invalid model name
   * @param provider The provider name
   * @returns Error message with suggestions
   */
  static getErrorMessage(modelName: string, provider: string): string {
    const rule = PROVIDER_RULES[provider];

    if (!rule) {
      return `Invalid model name: ${modelName}`;
    }

    let message = `Invalid model name for ${provider}: "${modelName}"\n`;

    // Suggest format based on provider
    switch (provider) {
      case AIProviderName.LITELLM:
        message += `LiteLLM requires "provider/model" format (e.g., "openai/gpt-4o", "anthropic/claude-3-5-sonnet")`;
        break;

      case AIProviderName.BEDROCK:
        message += `Bedrock requires vendor prefix (e.g., "anthropic.claude-3-5-sonnet-20241022-v1:0", "amazon.nova-pro-v1:0")`;
        break;

      case AIProviderName.AZURE:
        message += `Azure OpenAI uses deployment names (e.g., "gpt-4o", "gpt-35-turbo")`;
        break;

      default:
        if (rule.aliases) {
          const aliases = Object.keys(rule.aliases).slice(0, 5).join(", ");
          message += `\nSupported aliases: ${aliases}...`;
        }
    }

    return message;
  }

  /**
   * Get all available aliases for a provider
   * @param provider The provider name
   * @returns Record of aliases to model names
   */
  static getAliases(provider: string): Record<string, string> {
    const rule = PROVIDER_RULES[provider];
    return rule?.aliases || {};
  }

  /**
   * Suggest model names based on partial input
   * @param partialName Partial model name
   * @param provider The provider name
   * @returns Array of suggested model names
   */
  static suggestModels(partialName: string, provider: string): string[] {
    const rule = PROVIDER_RULES[provider];

    if (!rule?.aliases) {
      return [];
    }

    const lowerPartial = partialName.toLowerCase();
    const suggestions: string[] = [];

    // Find aliases that match the partial name
    for (const [alias, modelName] of Object.entries(rule.aliases)) {
      if (
        alias.includes(lowerPartial) ||
        modelName.toLowerCase().includes(lowerPartial)
      ) {
        suggestions.push(modelName);
      }
    }

    return [...new Set(suggestions)]; // Remove duplicates
  }
}
