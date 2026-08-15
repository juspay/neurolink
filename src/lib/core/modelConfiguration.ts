/**
 * Model Configuration System
 *
 * Replaces hardcoded model-specific logic with configurable, runtime-updateable configurations.
 * This addresses GitHub Copilot review comment about making model-specific logic configuration-based.
 */

import type {
  JsonValue,
  ModelTier,
  ProviderConfiguration,
  ConfigSource,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
/**
 * Model name constants - extracted from hardcoded values for better maintainability
 * These constants can be overridden by environment variables
 */
export const MODEL_NAMES = {
  // Google AI Models
  GOOGLE_AI: {
    FAST: "gemini-2.5-flash",
    BALANCED: "gemini-2.5-pro",
    QUALITY: "gemini-2.5-pro",
  },

  // Google Vertex Models
  GOOGLE_VERTEX: {
    FAST: "gemini-2.5-flash",
    BALANCED: "gemini-2.5-pro",
    QUALITY: "gemini-2.5-pro",
  },

  // OpenAI Models
  OPENAI: {
    FAST: "gpt-4o-mini",
    BALANCED: "gpt-4o",
    QUALITY: "gpt-4o",
  },

  // Anthropic Models
  ANTHROPIC: {
    FAST: "claude-3-haiku-20240307",
    BALANCED: "claude-3-sonnet-20240229",
    QUALITY: "claude-3-5-sonnet-20241022",
  },

  // Vertex AI Models (legacy alias)
  VERTEX: {
    FAST: "gemini-2.5-flash",
    BALANCED: "gemini-2.5-pro",
    QUALITY: "gemini-2.5-pro",
  },

  // AWS Bedrock Models
  BEDROCK: {
    FAST: "anthropic.claude-3-haiku-20240307-v1:0",
    BALANCED: "anthropic.claude-3-sonnet-20240229-v1:0",
    QUALITY: "anthropic.claude-3-opus-20240229-v1:0",
  },

  // Azure OpenAI Models
  AZURE: {
    FAST: "gpt-4o-mini",
    BALANCED: "gpt-4o",
    QUALITY: "gpt-4o",
  },

  // Ollama Models
  OLLAMA: {
    FAST: "llama3.2:latest",
    BALANCED: "llama3.1:8b",
    QUALITY: "llama3.1:70b",
  },

  // HuggingFace Models
  HUGGINGFACE: {
    FAST: "microsoft/DialoGPT-medium",
    BALANCED: "microsoft/DialoGPT-large",
    QUALITY: "meta-llama/Llama-2-7b-chat-hf",
  },

  // Mistral Models
  MISTRAL: {
    FAST: "mistral-small-latest",
    BALANCED: "mistral-medium-latest",
    QUALITY: "mistral-large-latest",
  },
} as const;

/**
 * Model configuration manager
 */
export class ModelConfigurationManager {
  private static instance: ModelConfigurationManager;
  private configurations = new Map<string, ProviderConfiguration>();
  private configSource: ConfigSource = "default";
  private lastUpdated: number = Date.now();

  private constructor() {
    this.loadDefaultConfigurations();
  }

  static getInstance(): ModelConfigurationManager {
    if (!ModelConfigurationManager.instance) {
      ModelConfigurationManager.instance = new ModelConfigurationManager();
    }
    return ModelConfigurationManager.instance;
  }

  /**
   * Create Google AI provider configuration
   */
  private createGoogleAIConfig(): ProviderConfiguration {
    return {
      provider: "google-ai",
      models: {
        fast: this.getConfigValue(
          "GOOGLE_AI_FAST_MODEL",
          MODEL_NAMES.GOOGLE_AI.FAST,
        ),
        balanced: this.getConfigValue(
          "GOOGLE_AI_BALANCED_MODEL",
          MODEL_NAMES.GOOGLE_AI.BALANCED,
        ),
        quality: this.getConfigValue(
          "GOOGLE_AI_QUALITY_MODEL",
          MODEL_NAMES.GOOGLE_AI.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(
          process.env.GOOGLE_AI_DEFAULT_INPUT_COST,
          0.000075,
        ),
        output: this.parseFloat(
          process.env.GOOGLE_AI_DEFAULT_OUTPUT_COST,
          0.0003,
        ),
      },
      requiredEnvVars: ["GOOGLE_AI_API_KEY"],
      performance: {
        speed: this.parseInt(process.env.GOOGLE_AI_SPEED_RATING, 3),
        quality: this.parseInt(process.env.GOOGLE_AI_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.GOOGLE_AI_COST_RATING, 3),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("GOOGLE_AI_MAX_TOKENS_ISSUES", [
          MODEL_NAMES.GOOGLE_AI.FAST,
          MODEL_NAMES.GOOGLE_AI.BALANCED,
        ]),
      },
    };
  }

  /**
   * Create Google Vertex AI provider configuration
   */
  private createVertexConfig(): ProviderConfiguration {
    return {
      provider: "google-vertex",
      models: {
        fast: this.getConfigValue(
          "GOOGLE_VERTEX_FAST_MODEL",
          MODEL_NAMES.GOOGLE_VERTEX.FAST,
        ),
        balanced: this.getConfigValue(
          "GOOGLE_VERTEX_BALANCED_MODEL",
          MODEL_NAMES.GOOGLE_VERTEX.BALANCED,
        ),
        quality: this.getConfigValue(
          "GOOGLE_VERTEX_QUALITY_MODEL",
          MODEL_NAMES.GOOGLE_VERTEX.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(
          process.env.GOOGLE_VERTEX_DEFAULT_INPUT_COST,
          0.000075,
        ),
        output: this.parseFloat(
          process.env.GOOGLE_VERTEX_DEFAULT_OUTPUT_COST,
          0.0003,
        ),
      },
      requiredEnvVars: ["GOOGLE_VERTEX_PROJECT_ID", "GOOGLE_VERTEX_LOCATION"],
      performance: {
        speed: this.parseInt(process.env.GOOGLE_VERTEX_SPEED_RATING, 3),
        quality: this.parseInt(process.env.GOOGLE_VERTEX_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.GOOGLE_VERTEX_COST_RATING, 3),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray(
          "GOOGLE_VERTEX_MAX_TOKENS_ISSUES",
          [MODEL_NAMES.GOOGLE_VERTEX.FAST, MODEL_NAMES.GOOGLE_VERTEX.BALANCED],
        ),
      },
    };
  }

  /**
   * Create OpenAI provider configuration
   */
  private createOpenAIConfig(): ProviderConfiguration {
    return {
      provider: "openai",
      models: {
        fast: this.getConfigValue("OPENAI_FAST_MODEL", MODEL_NAMES.OPENAI.FAST),
        balanced: this.getConfigValue(
          "OPENAI_BALANCED_MODEL",
          MODEL_NAMES.OPENAI.BALANCED,
        ),
        quality: this.getConfigValue(
          "OPENAI_QUALITY_MODEL",
          MODEL_NAMES.OPENAI.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(process.env.OPENAI_DEFAULT_INPUT_COST, 0.00015),
        output: this.parseFloat(process.env.OPENAI_DEFAULT_OUTPUT_COST, 0.0006),
      },
      requiredEnvVars: ["OPENAI_API_KEY"],
      performance: {
        speed: this.parseInt(process.env.OPENAI_SPEED_RATING, 2),
        quality: this.parseInt(process.env.OPENAI_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.OPENAI_COST_RATING, 2),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("OPENAI_MAX_TOKENS_ISSUES", []),
        specialHandling: this.getConfigObject("OPENAI_SPECIAL_HANDLING", {}),
      },
    };
  }

  /**
   * Create all provider configurations - centralized approach
   */
  private createAllProviderConfigurations(): Record<
    string,
    ProviderConfiguration
  > {
    return {
      "google-ai": this.createGoogleAIConfig(),
      "google-vertex": this.createVertexConfig(),
      openai: this.createOpenAIConfig(),
      anthropic: this.createAnthropicConfig(),
      vertex: this.createVertexAlternativeConfig(),
      bedrock: this.createBedrockConfig(),
      azure: this.createAzureConfig(),
      ollama: this.createOllamaConfig(),
      huggingface: this.createHuggingFaceConfig(),
      mistral: this.createMistralConfig(),
    };
  }

  /**
   * Create Anthropic provider configuration
   */
  private createAnthropicConfig(): ProviderConfiguration {
    return {
      provider: "anthropic",
      models: {
        fast: this.getConfigValue(
          "ANTHROPIC_FAST_MODEL",
          MODEL_NAMES.ANTHROPIC.FAST,
        ),
        balanced: this.getConfigValue(
          "ANTHROPIC_BALANCED_MODEL",
          MODEL_NAMES.ANTHROPIC.BALANCED,
        ),
        quality: this.getConfigValue(
          "ANTHROPIC_QUALITY_MODEL",
          MODEL_NAMES.ANTHROPIC.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(
          process.env.ANTHROPIC_DEFAULT_INPUT_COST,
          0.0015,
        ),
        output: this.parseFloat(
          process.env.ANTHROPIC_DEFAULT_OUTPUT_COST,
          0.0075,
        ),
      },
      requiredEnvVars: ["ANTHROPIC_API_KEY"],
      performance: {
        speed: this.parseInt(process.env.ANTHROPIC_SPEED_RATING, 3),
        quality: this.parseInt(process.env.ANTHROPIC_QUALITY_RATING, 4),
        cost: this.parseInt(process.env.ANTHROPIC_COST_RATING, 2),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("ANTHROPIC_MAX_TOKENS_ISSUES", []),
      },
    };
  }

  /**
   * Create Vertex alternative provider configuration
   */
  private createVertexAlternativeConfig(): ProviderConfiguration {
    return {
      provider: "vertex",
      models: {
        fast: this.getConfigValue("VERTEX_FAST_MODEL", MODEL_NAMES.VERTEX.FAST),
        balanced: this.getConfigValue(
          "VERTEX_BALANCED_MODEL",
          MODEL_NAMES.VERTEX.BALANCED,
        ),
        quality: this.getConfigValue(
          "VERTEX_QUALITY_MODEL",
          MODEL_NAMES.VERTEX.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(process.env.VERTEX_DEFAULT_INPUT_COST, 0.000075),
        output: this.parseFloat(process.env.VERTEX_DEFAULT_OUTPUT_COST, 0.0003),
      },
      requiredEnvVars: ["GOOGLE_VERTEX_PROJECT_ID", "GOOGLE_VERTEX_LOCATION"],
      performance: {
        speed: this.parseInt(process.env.VERTEX_SPEED_RATING, 3),
        quality: this.parseInt(process.env.VERTEX_QUALITY_RATING, 4),
        cost: this.parseInt(process.env.VERTEX_COST_RATING, 3),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("VERTEX_MAX_TOKENS_ISSUES", []),
      },
    };
  }

  /**
   * Create Bedrock provider configuration
   */
  private createBedrockConfig(): ProviderConfiguration {
    return {
      provider: "bedrock",
      models: {
        fast: this.getConfigValue(
          "BEDROCK_FAST_MODEL",
          MODEL_NAMES.BEDROCK.FAST,
        ),
        balanced: this.getConfigValue(
          "BEDROCK_BALANCED_MODEL",
          MODEL_NAMES.BEDROCK.BALANCED,
        ),
        quality: this.getConfigValue(
          "BEDROCK_QUALITY_MODEL",
          MODEL_NAMES.BEDROCK.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(process.env.BEDROCK_DEFAULT_INPUT_COST, 0.0015),
        output: this.parseFloat(
          process.env.BEDROCK_DEFAULT_OUTPUT_COST,
          0.0075,
        ),
      },
      requiredEnvVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
      performance: {
        speed: this.parseInt(process.env.BEDROCK_SPEED_RATING, 3),
        quality: this.parseInt(process.env.BEDROCK_QUALITY_RATING, 4),
        cost: this.parseInt(process.env.BEDROCK_COST_RATING, 3),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("BEDROCK_MAX_TOKENS_ISSUES", []),
      },
    };
  }

  /**
   * Create Azure provider configuration
   */
  private createAzureConfig(): ProviderConfiguration {
    return {
      provider: "azure",
      models: {
        fast: this.getConfigValue("AZURE_FAST_MODEL", MODEL_NAMES.AZURE.FAST),
        balanced: this.getConfigValue(
          "AZURE_BALANCED_MODEL",
          MODEL_NAMES.AZURE.BALANCED,
        ),
        quality: this.getConfigValue(
          "AZURE_QUALITY_MODEL",
          MODEL_NAMES.AZURE.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(process.env.AZURE_DEFAULT_INPUT_COST, 0.00015),
        output: this.parseFloat(process.env.AZURE_DEFAULT_OUTPUT_COST, 0.0006),
      },
      requiredEnvVars: ["AZURE_API_KEY", "AZURE_ENDPOINT"],
      performance: {
        speed: this.parseInt(process.env.AZURE_SPEED_RATING, 2),
        quality: this.parseInt(process.env.AZURE_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.AZURE_COST_RATING, 2),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("AZURE_MAX_TOKENS_ISSUES", []),
      },
    };
  }

  /**
   * Create Ollama provider configuration
   */
  private createOllamaConfig(): ProviderConfiguration {
    return {
      provider: "ollama",
      models: {
        fast: this.getConfigValue("OLLAMA_FAST_MODEL", MODEL_NAMES.OLLAMA.FAST),
        balanced: this.getConfigValue(
          "OLLAMA_BALANCED_MODEL",
          MODEL_NAMES.OLLAMA.BALANCED,
        ),
        quality: this.getConfigValue(
          "OLLAMA_QUALITY_MODEL",
          MODEL_NAMES.OLLAMA.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(process.env.OLLAMA_DEFAULT_INPUT_COST, 0),
        output: this.parseFloat(process.env.OLLAMA_DEFAULT_OUTPUT_COST, 0),
      },
      requiredEnvVars: [],
      performance: {
        speed: this.parseInt(process.env.OLLAMA_SPEED_RATING, 4),
        quality: this.parseInt(process.env.OLLAMA_QUALITY_RATING, 2),
        cost: this.parseInt(process.env.OLLAMA_COST_RATING, 5),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("OLLAMA_MAX_TOKENS_ISSUES", [
          MODEL_NAMES.OLLAMA.FAST,
          MODEL_NAMES.OLLAMA.BALANCED,
          MODEL_NAMES.OLLAMA.QUALITY,
        ]),
        toolCapableModels: this.getConfigArray("OLLAMA_TOOL_CAPABLE_MODELS", [
          "llama3.1",
          "mistral",
          "hermes3",
          "qwen2.5",
          "codellama",
          "dolphin",
          "openchat",
          "solar",
        ]),
        specialHandling: this.getConfigObject("OLLAMA_SPECIAL_HANDLING", {
          baseUrl: this.getConfigValue(
            "OLLAMA_BASE_URL",
            "http://localhost:11434",
          ),
        }),
      },
    };
  }

  /**
   * Create HuggingFace provider configuration
   */
  private createHuggingFaceConfig(): ProviderConfiguration {
    return {
      provider: "huggingface",
      models: {
        fast: this.getConfigValue(
          "HUGGINGFACE_FAST_MODEL",
          MODEL_NAMES.HUGGINGFACE.FAST,
        ),
        balanced: this.getConfigValue(
          "HUGGINGFACE_BALANCED_MODEL",
          MODEL_NAMES.HUGGINGFACE.BALANCED,
        ),
        quality: this.getConfigValue(
          "HUGGINGFACE_QUALITY_MODEL",
          MODEL_NAMES.HUGGINGFACE.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(
          process.env.HUGGINGFACE_DEFAULT_INPUT_COST,
          0.0002,
        ),
        output: this.parseFloat(
          process.env.HUGGINGFACE_DEFAULT_OUTPUT_COST,
          0.0008,
        ),
      },
      requiredEnvVars: ["HUGGINGFACE_API_KEY"],
      performance: {
        speed: this.parseInt(process.env.HUGGINGFACE_SPEED_RATING, 3),
        quality: this.parseInt(process.env.HUGGINGFACE_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.HUGGINGFACE_COST_RATING, 4),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray(
          "HUGGINGFACE_MAX_TOKENS_ISSUES",
          [],
        ),
      },
    };
  }

  /**
   * Create Mistral provider configuration
   */
  private createMistralConfig(): ProviderConfiguration {
    return {
      provider: "mistral",
      models: {
        fast: this.getConfigValue(
          "MISTRAL_FAST_MODEL",
          MODEL_NAMES.MISTRAL.FAST,
        ),
        balanced: this.getConfigValue(
          "MISTRAL_BALANCED_MODEL",
          MODEL_NAMES.MISTRAL.BALANCED,
        ),
        quality: this.getConfigValue(
          "MISTRAL_QUALITY_MODEL",
          MODEL_NAMES.MISTRAL.QUALITY,
        ),
      },
      defaultCost: {
        input: this.parseFloat(process.env.MISTRAL_DEFAULT_INPUT_COST, 0.0001),
        output: this.parseFloat(
          process.env.MISTRAL_DEFAULT_OUTPUT_COST,
          0.0003,
        ),
      },
      requiredEnvVars: ["MISTRAL_API_KEY"],
      performance: {
        speed: this.parseInt(process.env.MISTRAL_SPEED_RATING, 3),
        quality: this.parseInt(process.env.MISTRAL_QUALITY_RATING, 3),
        cost: this.parseInt(process.env.MISTRAL_COST_RATING, 4),
      },
      modelBehavior: {
        maxTokensIssues: this.getConfigArray("MISTRAL_MAX_TOKENS_ISSUES", []),
      },
    };
  }

  /**
   * Load default configurations (replaces hardcoded values)
   */
  private loadDefaultConfigurations(): void {
    // Load all provider configurations using centralized method
    const defaultConfigs = this.createAllProviderConfigurations();

    // Load configurations
    for (const [provider, config] of Object.entries(defaultConfigs)) {
      this.configurations.set(provider, config);
    }

    logger.debug(
      `Loaded ${this.configurations.size} provider configurations from ${this.configSource}`,
    );
  }

  /**
   * Helper method to get configuration value with fallback and validation
   */
  private getConfigValue(envVar: string, defaultValue: string): string {
    const value = process.env[envVar];
    if (value && !this.isValidConfigValue(value)) {
      logger.warn(
        `Environment variable ${envVar} has an invalid value: "${value}". Falling back to default value.`,
      );
      return defaultValue;
    }
    return value || defaultValue;
  }

  /**
   * Validate configuration values for security and correctness
   */
  private isValidConfigValue(value: string): boolean {
    // Basic validation rules for security-sensitive configuration values

    // Check for potentially dangerous characters (script injection prevention)
    const dangerousChars = /[<>;"'`${}]/;
    if (dangerousChars.test(value)) {
      return false;
    }

    // Check for excessively long values (DoS prevention)
    if (value.length > 500) {
      return false;
    }

    // Check for null bytes (security)
    if (value.includes("\0")) {
      return false;
    }

    // Check for control characters except newlines and tabs
    // Using String.fromCharCode to avoid ESLint control character error
    const controlChars = new RegExp(
      `[${String.fromCharCode(0x00)}-${String.fromCharCode(0x08)}${String.fromCharCode(0x0b)}${String.fromCharCode(0x0c)}${String.fromCharCode(0x0e)}-${String.fromCharCode(0x1f)}${String.fromCharCode(0x7f)}]`,
    );
    if (controlChars.test(value)) {
      return false;
    }

    return true;
  }

  /**
   * Helper method to get configuration array with fallback
   * Parses comma-separated environment variable values
   */
  private getConfigArray(envVar: string, defaultValue: string[]): string[] {
    const envValue = process.env[envVar];
    if (!envValue) {
      return defaultValue;
    }
    return envValue
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  /**
   * Helper method to parse float with fallback
   */
  private parseFloat(value: string | undefined, defaultValue: number): number {
    if (!value) {
      return defaultValue;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Helper method to parse int with fallback
   */
  private parseInt(value: string | undefined, defaultValue: number): number {
    if (!value) {
      return defaultValue;
    }
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Helper method to get configuration object with fallback
   * Parses JSON environment variable values
   */
  private getConfigObject(
    envVar: string,
    defaultValue: Record<string, JsonValue>,
  ): Record<string, JsonValue> {
    const envValue = process.env[envVar];
    if (!envValue) {
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(envValue);
      return typeof parsed === "object" && parsed !== null
        ? parsed
        : defaultValue;
    } catch {
      logger.warn(
        `Invalid JSON in environment variable ${envVar}, using default`,
      );
      return defaultValue;
    }
  }

  /**
   * Get provider configuration
   */
  getProviderConfiguration(provider: string): ProviderConfiguration | null {
    return this.configurations.get(provider) || null;
  }

  /**
   * Get all provider configurations
   */
  getAllConfigurations(): Map<string, ProviderConfiguration> {
    return new Map(this.configurations);
  }

  /**
   * Get model for specific tier and provider
   */
  getModelForTier(provider: string, tier: ModelTier): string | null {
    const config = this.getProviderConfiguration(provider);
    return config?.models[tier] || null;
  }

  /**
   * Get cost information for provider and model
   */
  getCostInfo(
    provider: string,
    model?: string,
  ): { input: number; output: number } | null {
    const config = this.getProviderConfiguration(provider);
    if (!config) {
      return null;
    }

    // If specific model config exists, use it; otherwise use default
    if (model && config.modelConfigs?.[model]) {
      return config.modelConfigs[model].cost;
    }

    return config.defaultCost;
  }

  /**
   * Check if provider is available (has required environment variables)
   */
  isProviderAvailable(provider: string): boolean {
    const config = this.getProviderConfiguration(provider);
    if (!config) {
      return false;
    }

    if (config.requiredEnvVars.length === 0) {
      return true; // No requirements (e.g., Ollama)
    }

    return config.requiredEnvVars.some((envVar) =>
      Boolean(process.env[envVar]),
    );
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): ProviderConfiguration[] {
    return Array.from(this.configurations.values()).filter((config) =>
      this.isProviderAvailable(config.provider),
    );
  }
}

/**
 * Global instance accessor
 */
export const modelConfig = ModelConfigurationManager.getInstance();
