/**
 * Model Configuration System
 *
 * Replaces hardcoded model-specific logic with configurable, runtime-updateable configurations.
 * This addresses GitHub Copilot review comment about making model-specific logic configuration-based.
 */

import type { JsonValue } from "../types/common.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

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
 * Model performance tier definition
 */
export type ModelTier = "fast" | "balanced" | "quality";

/**
 * Model configuration for a specific provider
 */
export interface ModelConfig {
  /** Model identifier */
  id: string;
  /** Display name */
  name: string;
  /** Performance tier */
  tier: ModelTier;
  /** Cost per 1K tokens */
  cost: {
    input: number;
    output: number;
  };
  /** Model capabilities */
  capabilities: string[];
  /** Model-specific options */
  options?: Record<string, JsonValue>;
}

/**
 * Provider configuration with models
 */
export interface ProviderConfig {
  /** Provider name */
  provider: string;
  /** Available models by tier */
  models: Record<ModelTier, string>;
  /** Default cost per token (fallback) */
  defaultCost: {
    input: number;
    output: number;
  };
  /** Required environment variables */
  requiredEnvVars: string[];
  /** Provider-specific performance metrics */
  performance: {
    speed: number; // 1-3 scale
    quality: number; // 1-3 scale
    cost: number; // 1-3 scale
  };
  /** Provider-specific model configurations */
  modelConfigs?: Record<string, ModelConfig>;
  /** Provider-specific model behavior configurations */
  modelBehavior?: {
    /** Models that have issues with maxTokens parameter */
    maxTokensIssues?: string[];
    /** Models that require special handling */
    specialHandling?: Record<string, JsonValue>;
    /** Models that support tool calling (Ollama-specific) */
    toolCapableModels?: string[];
  };
}

/**
 * Configuration source type
 */
export type ConfigSource = "default" | "environment" | "file" | "dynamic";

/**
 * Model configuration manager
 */
export class ModelConfigurationManager {
  private static instance: ModelConfigurationManager;
  private configurations = new Map<string, ProviderConfig>();
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
   * Load default configurations (replaces hardcoded values)
   */
  private loadDefaultConfigurations(): void {
    // Default provider configurations - these can be overridden
    const defaultConfigs: Record<string, ProviderConfig> = {
      "google-ai": {
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
      },

      "google-vertex": {
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
            [
              MODEL_NAMES.GOOGLE_VERTEX.FAST,
              MODEL_NAMES.GOOGLE_VERTEX.BALANCED,
            ],
          ),
        },
      },

      openai: {
        provider: "openai",
        models: {
          fast: this.getConfigValue(
            "OPENAI_FAST_MODEL",
            MODEL_NAMES.OPENAI.FAST,
          ),
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
          input: this.parseFloat(
            process.env.OPENAI_DEFAULT_INPUT_COST,
            0.00015,
          ),
          output: this.parseFloat(
            process.env.OPENAI_DEFAULT_OUTPUT_COST,
            0.0006,
          ),
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
      },

      anthropic: {
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
            0.00025,
          ),
          output: this.parseFloat(
            process.env.ANTHROPIC_DEFAULT_OUTPUT_COST,
            0.00125,
          ),
        },
        requiredEnvVars: ["ANTHROPIC_API_KEY"],
        performance: {
          speed: this.parseInt(process.env.ANTHROPIC_SPEED_RATING, 2),
          quality: this.parseInt(process.env.ANTHROPIC_QUALITY_RATING, 3),
          cost: this.parseInt(process.env.ANTHROPIC_COST_RATING, 2),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray(
            "ANTHROPIC_MAX_TOKENS_ISSUES",
            [],
          ),
          specialHandling: this.getConfigObject(
            "ANTHROPIC_SPECIAL_HANDLING",
            {},
          ),
        },
      },

      vertex: {
        provider: "vertex",
        models: {
          fast: this.getConfigValue(
            "VERTEX_FAST_MODEL",
            MODEL_NAMES.VERTEX.FAST,
          ),
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
          input: this.parseFloat(
            process.env.VERTEX_DEFAULT_INPUT_COST,
            0.000075,
          ),
          output: this.parseFloat(
            process.env.VERTEX_DEFAULT_OUTPUT_COST,
            0.0003,
          ),
        },
        requiredEnvVars: [
          "GOOGLE_VERTEX_PROJECT",
          "GOOGLE_APPLICATION_CREDENTIALS",
        ],
        performance: {
          speed: this.parseInt(process.env.VERTEX_SPEED_RATING, 2),
          quality: this.parseInt(process.env.VERTEX_QUALITY_RATING, 3),
          cost: this.parseInt(process.env.VERTEX_COST_RATING, 3),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray("VERTEX_MAX_TOKENS_ISSUES", [
            MODEL_NAMES.VERTEX.FAST,
            MODEL_NAMES.VERTEX.BALANCED,
          ]),
          specialHandling: this.getConfigObject("VERTEX_SPECIAL_HANDLING", {}),
        },
      },

      bedrock: {
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
          input: this.parseFloat(
            process.env.BEDROCK_DEFAULT_INPUT_COST,
            0.00025,
          ),
          output: this.parseFloat(
            process.env.BEDROCK_DEFAULT_OUTPUT_COST,
            0.00125,
          ),
        },
        requiredEnvVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
        performance: {
          speed: this.parseInt(process.env.BEDROCK_SPEED_RATING, 2),
          quality: this.parseInt(process.env.BEDROCK_QUALITY_RATING, 3),
          cost: this.parseInt(process.env.BEDROCK_COST_RATING, 2),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray("BEDROCK_MAX_TOKENS_ISSUES", []),
          specialHandling: this.getConfigObject("BEDROCK_SPECIAL_HANDLING", {}),
        },
      },

      azure: {
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
          output: this.parseFloat(
            process.env.AZURE_DEFAULT_OUTPUT_COST,
            0.0006,
          ),
        },
        requiredEnvVars: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
        performance: {
          speed: this.parseInt(process.env.AZURE_SPEED_RATING, 2),
          quality: this.parseInt(process.env.AZURE_QUALITY_RATING, 3),
          cost: this.parseInt(process.env.AZURE_COST_RATING, 2),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray("AZURE_MAX_TOKENS_ISSUES", []),
          specialHandling: this.getConfigObject("AZURE_SPECIAL_HANDLING", {}),
        },
      },

      ollama: {
        provider: "ollama",
        models: {
          fast: this.getConfigValue(
            "OLLAMA_FAST_MODEL",
            MODEL_NAMES.OLLAMA.FAST,
          ),
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
          input: 0, // Local models are free
          output: 0,
        },
        requiredEnvVars: [], // No API key needed
        performance: {
          speed: this.parseInt(process.env.OLLAMA_SPEED_RATING, 1),
          quality: this.parseInt(process.env.OLLAMA_QUALITY_RATING, 2),
          cost: this.parseInt(process.env.OLLAMA_COST_RATING, 3),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray("OLLAMA_MAX_TOKENS_ISSUES", []),
          specialHandling: this.getConfigObject("OLLAMA_SPECIAL_HANDLING", {}),
          // Tool-capable models configuration (replaces hardcoded list in ollama.ts)
          toolCapableModels: this.getConfigArray("OLLAMA_TOOL_CAPABLE_MODELS", [
            // Llama 3.1 series (excellent tool calling)
            "llama3.1:8b-instruct",
            "llama3.1:70b-instruct",
            "llama3.1",
            // Mistral series (reliable function calling)
            "mistral:7b-instruct",
            "mistral-nemo:12b",
            "mistral",
            // Hermes series (specialized for tools)
            "hermes3:8b",
            "hermes2-pro",
            // Function-calling specialized models
            "firefunction-v2",
            "firefunction",
            // Code Llama (code-focused tools)
            "codellama:34b-instruct",
            "codellama:13b-instruct",
            // Other capable models
            "qwen2.5:14b-instruct",
            "gemma2:27b-instruct",
          ]),
        },
      },

      huggingface: {
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
            0.0006,
          ),
        },
        requiredEnvVars: ["HUGGINGFACE_API_KEY"],
        performance: {
          speed: this.parseInt(process.env.HUGGINGFACE_SPEED_RATING, 1),
          quality: this.parseInt(process.env.HUGGINGFACE_QUALITY_RATING, 2),
          cost: this.parseInt(process.env.HUGGINGFACE_COST_RATING, 2),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray(
            "HUGGINGFACE_MAX_TOKENS_ISSUES",
            [],
          ),
          specialHandling: this.getConfigObject(
            "HUGGINGFACE_SPECIAL_HANDLING",
            {},
          ),
        },
      },

      mistral: {
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
          input: this.parseFloat(
            process.env.MISTRAL_DEFAULT_INPUT_COST,
            0.0002,
          ),
          output: this.parseFloat(
            process.env.MISTRAL_DEFAULT_OUTPUT_COST,
            0.0006,
          ),
        },
        requiredEnvVars: ["MISTRAL_API_KEY"],
        performance: {
          speed: this.parseInt(process.env.MISTRAL_SPEED_RATING, 2),
          quality: this.parseInt(process.env.MISTRAL_QUALITY_RATING, 2),
          cost: this.parseInt(process.env.MISTRAL_COST_RATING, 2),
        },
        modelBehavior: {
          maxTokensIssues: this.getConfigArray("MISTRAL_MAX_TOKENS_ISSUES", []),
          specialHandling: this.getConfigObject("MISTRAL_SPECIAL_HANDLING", {}),
        },
      },
    };

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
  getProviderConfig(provider: string): ProviderConfig | null {
    return this.configurations.get(provider) || null;
  }

  /**
   * Get all provider configurations
   */
  getAllConfigurations(): Map<string, ProviderConfig> {
    return new Map(this.configurations);
  }

  /**
   * Update provider configuration (runtime updates)
   */
  updateProviderConfig(provider: string, config: ProviderConfig): void {
    this.configurations.set(provider, config);
    this.lastUpdated = Date.now();
    this.configSource = "dynamic";

    logger.debug(`Updated configuration for provider: ${provider}`);
  }

  /**
   * Load configurations from external source
   */
  loadConfigurationsFromFile(configPath: string): void {
    try {
      // Check if file exists
      if (!fs.existsSync(configPath)) {
        throw new Error(`Configuration file not found: ${configPath}`);
      }

      // Read and parse configuration file
      const configContent = fs.readFileSync(configPath, "utf8");
      const fileExtension = path.extname(configPath).toLowerCase();

      let configData: unknown;

      if (fileExtension === ".json") {
        configData = JSON.parse(configContent);
      } else if (fileExtension === ".yaml" || fileExtension === ".yml") {
        // Basic YAML parsing for simple configurations
        // For full YAML support, would need a proper YAML library
        try {
          configData = JSON.parse(configContent);
        } catch {
          // Simple YAML-to-JSON conversion for basic cases
          const yamlLines = configContent.split("\n");
          const jsonObj: Record<string, unknown> = {};

          for (const line of yamlLines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith("#")) {
              const colonIndex = trimmedLine.indexOf(":");
              if (colonIndex > 0) {
                const key = trimmedLine.substring(0, colonIndex).trim();
                const value = trimmedLine.substring(colonIndex + 1).trim();

                // Basic type conversion
                if (value === "true") {
                  jsonObj[key] = true;
                } else if (value === "false") {
                  jsonObj[key] = false;
                } else if (!isNaN(Number(value))) {
                  jsonObj[key] = Number(value);
                } else {
                  jsonObj[key] = value.replace(/['"]/g, "");
                }
              }
            }
          }
          configData = jsonObj;
        }
      } else {
        throw new Error(
          `Unsupported configuration file format: ${fileExtension}. Supported formats: .json, .yaml, .yml`,
        );
      }

      // Validate configuration structure
      if (!configData || typeof configData !== "object") {
        throw new Error("Invalid configuration format: must be an object");
      }

      const config = configData as Record<string, unknown>;

      // Load provider configurations from file
      if (config.providers && typeof config.providers === "object") {
        const providers = config.providers as Record<string, unknown>;

        for (const [providerName, providerConfig] of Object.entries(
          providers,
        )) {
          if (this.isValidProviderConfig(providerConfig)) {
            this.configurations.set(
              providerName,
              providerConfig as ProviderConfig,
            );
            logger.debug(`Loaded configuration for provider: ${providerName}`);
          } else {
            logger.warn(
              `Invalid configuration for provider: ${providerName}, skipping`,
            );
          }
        }
      }

      // Load global model name overrides
      if (config.modelNames && typeof config.modelNames === "object") {
        const modelNames = config.modelNames as Record<string, unknown>;
        this.applyModelNameOverrides(modelNames);
      }

      // Load global defaults
      if (config.defaults && typeof config.defaults === "object") {
        const defaults = config.defaults as Record<string, unknown>;
        this.applyGlobalDefaults(defaults);
      }

      this.configSource = "file";
      this.lastUpdated = Date.now();

      logger.info(
        `Successfully loaded configurations from file: ${configPath}`,
      );
      logger.debug(
        `Loaded ${this.configurations.size} provider configurations`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Failed to load configurations from file: ${errorMessage}`);
      throw new Error(`Configuration loading failed: ${errorMessage}`);
    }
  }

  /**
   * Validate provider configuration structure
   */
  private isValidProviderConfig(config: unknown): boolean {
    if (!config || typeof config !== "object") {
      return false;
    }

    const providerConfig = config as Record<string, unknown>;

    // Check required fields
    const requiredFields = [
      "provider",
      "models",
      "defaultCost",
      "requiredEnvVars",
      "performance",
    ];
    for (const field of requiredFields) {
      if (!(field in providerConfig)) {
        return false;
      }
    }

    // Validate models structure
    if (typeof providerConfig.models !== "object" || !providerConfig.models) {
      return false;
    }

    const models = providerConfig.models as Record<string, unknown>;
    const requiredTiers = ["fast", "balanced", "quality"];
    for (const tier of requiredTiers) {
      if (typeof models[tier] !== "string") {
        return false;
      }
    }

    // Validate defaultCost structure
    if (
      typeof providerConfig.defaultCost !== "object" ||
      !providerConfig.defaultCost
    ) {
      return false;
    }

    const defaultCost = providerConfig.defaultCost as Record<string, unknown>;
    if (
      typeof defaultCost.input !== "number" ||
      typeof defaultCost.output !== "number"
    ) {
      return false;
    }

    // Validate requiredEnvVars
    if (!Array.isArray(providerConfig.requiredEnvVars)) {
      return false;
    }

    // Validate performance structure
    if (
      typeof providerConfig.performance !== "object" ||
      !providerConfig.performance
    ) {
      return false;
    }

    const performance = providerConfig.performance as Record<string, unknown>;
    const perfFields = ["speed", "quality", "cost"];
    for (const field of perfFields) {
      if (typeof performance[field] !== "number") {
        return false;
      }
    }

    return true;
  }

  /**
   * Apply model name overrides from configuration file
   */
  private applyModelNameOverrides(modelNames: Record<string, unknown>): void {
    try {
      // Apply overrides to existing configurations
      for (const [providerKey, providerModels] of Object.entries(modelNames)) {
        if (typeof providerModels === "object" && providerModels) {
          const models = providerModels as Record<string, unknown>;
          const existingConfig = this.configurations.get(providerKey);

          if (existingConfig) {
            // Update existing configuration
            for (const [tier, model] of Object.entries(models)) {
              if (
                typeof model === "string" &&
                ["fast", "balanced", "quality"].includes(tier)
              ) {
                existingConfig.models[tier as ModelTier] = model;
              }
            }
            this.configurations.set(providerKey, existingConfig);
            logger.debug(
              `Applied model name overrides for provider: ${providerKey}`,
            );
          }
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to apply model name overrides: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Apply global default configurations
   */
  private applyGlobalDefaults(defaults: Record<string, unknown>): void {
    try {
      // Apply global defaults to all existing configurations
      for (const [providerName, config] of this.configurations.entries()) {
        let updated = false;

        // Apply default cost overrides
        if (defaults.defaultCost && typeof defaults.defaultCost === "object") {
          const defaultCost = defaults.defaultCost as Record<string, unknown>;
          if (typeof defaultCost.input === "number") {
            config.defaultCost.input = defaultCost.input;
            updated = true;
          }
          if (typeof defaultCost.output === "number") {
            config.defaultCost.output = defaultCost.output;
            updated = true;
          }
        }

        // Apply performance overrides
        if (defaults.performance && typeof defaults.performance === "object") {
          const performance = defaults.performance as Record<string, unknown>;
          ["speed", "quality", "cost"].forEach((field) => {
            if (typeof performance[field] === "number") {
              config.performance[field as keyof typeof config.performance] =
                performance[field] as number;
              updated = true;
            }
          });
        }

        if (updated) {
          this.configurations.set(providerName, config);
          logger.debug(`Applied global defaults to provider: ${providerName}`);
        }
      }
    } catch (error) {
      logger.warn(
        `Failed to apply global defaults: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Get configuration metadata
   */
  getConfigurationMeta(): {
    source: ConfigSource;
    lastUpdated: number;
    providerCount: number;
  } {
    return {
      source: this.configSource,
      lastUpdated: this.lastUpdated,
      providerCount: this.configurations.size,
    };
  }

  /**
   * Get model for specific tier and provider
   */
  getModelForTier(provider: string, tier: ModelTier): string | null {
    const config = this.getProviderConfig(provider);
    return config?.models[tier] || null;
  }

  /**
   * Get cost information for provider and model
   */
  getCostInfo(
    provider: string,
    model?: string,
  ): { input: number; output: number } | null {
    const config = this.getProviderConfig(provider);
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
    const config = this.getProviderConfig(provider);
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
  getAvailableProviders(): ProviderConfig[] {
    return Array.from(this.configurations.values()).filter((config) =>
      this.isProviderAvailable(config.provider),
    );
  }
}

/**
 * Global instance accessor
 */
export const modelConfig = ModelConfigurationManager.getInstance();

/**
 * Convenience functions for common operations
 */

/**
 * Get provider configuration (backwards compatible)
 */
export function getProviderConfig(provider: string): ProviderConfig | null {
  return modelConfig.getProviderConfig(provider);
}

/**
 * Get model for tier (backwards compatible)
 */
export function getModelForTier(
  provider: string,
  tier: ModelTier,
): string | null {
  return modelConfig.getModelForTier(provider, tier);
}

/**
 * Get cost information (backwards compatible)
 */
export function getCostInfo(
  provider: string,
  model?: string,
): { input: number; output: number } | null {
  return modelConfig.getCostInfo(provider, model);
}

/**
 * Check provider availability (backwards compatible)
 */
export function isProviderAvailable(provider: string): boolean {
  return modelConfig.isProviderAvailable(provider);
}
