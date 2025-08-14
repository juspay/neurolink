/**
 * Configuration management for Amazon SageMaker Provider
 *
 * This module handles loading, validation, and management of SageMaker
 * configuration from environment variables, files, and defaults.
 */

import { z } from "zod";
import type { SageMakerConfig, SageMakerModelConfig } from "./types.js";
import { logger } from "../../utils/logger.js";

/**
 * Zod schema for SageMaker configuration validation
 */
const SageMakerConfigSchema = z.object({
  region: z.string().min(1, "AWS region is required"),
  accessKeyId: z.string().min(1, "AWS access key ID is required"),
  secretAccessKey: z.string().min(1, "AWS secret access key is required"),
  sessionToken: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
  maxRetries: z.number().min(0).max(10).optional(),
  endpoint: z.string().url().optional(),
});

/**
 * Zod schema for SageMaker model configuration validation
 */
const SageMakerModelConfigSchema = z.object({
  endpointName: z.string().min(1, "Endpoint name is required"),
  modelType: z
    .enum(["llama", "mistral", "claude", "huggingface", "jumpstart", "custom"])
    .optional(),
  contentType: z.string().optional(),
  accept: z.string().optional(),
  customAttributes: z.string().optional(),
  inputFormat: z.enum(["huggingface", "jumpstart", "custom"]).optional(),
  outputFormat: z.enum(["huggingface", "jumpstart", "custom"]).optional(),
  maxTokens: z.number().min(1).max(100000).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  stopSequences: z.array(z.string()).optional(),
  maxConcurrentDetectionTests: z.number().min(1).max(10).optional(),
});

/**
 * Configuration cache to avoid repeated environment variable reads
 */
let configCache: SageMakerConfig | null = null;
const modelConfigCache: Map<string, SageMakerModelConfig> = new Map();

/**
 * Load and validate SageMaker configuration from environment variables
 *
 * Environment variable priority:
 * 1. SAGEMAKER_* variables (highest priority)
 * 2. AWS_* variables (standard AWS SDK variables)
 * 3. Default values (lowest priority)
 *
 * @returns Validated SageMaker configuration
 * @throws {Error} When required configuration is missing or invalid
 */
export function getSageMakerConfig(): SageMakerConfig {
  // Return cached config if available
  if (configCache) {
    return configCache;
  }

  const config: SageMakerConfig = {
    region:
      process.env.SAGEMAKER_REGION || process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    sessionToken: process.env.AWS_SESSION_TOKEN,
    timeout: parseInt(process.env.SAGEMAKER_TIMEOUT || "30000"),
    maxRetries: parseInt(process.env.SAGEMAKER_MAX_RETRIES || "3"),
    endpoint: process.env.SAGEMAKER_ENDPOINT,
  };

  // Validate configuration using Zod schema
  try {
    const validatedConfig = SageMakerConfigSchema.parse(config);

    // Cache the validated configuration
    configCache = validatedConfig;

    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      );
      throw new Error(
        `SageMaker configuration validation failed:\n${errorMessages.join("\n")}\n\n` +
          `Please set the required environment variables:\n` +
          `- AWS_ACCESS_KEY_ID: Your AWS access key\n` +
          `- AWS_SECRET_ACCESS_KEY: Your AWS secret key\n` +
          `- AWS_REGION: AWS region (default: us-east-1)\n` +
          `- AWS_SESSION_TOKEN: Session token (optional, for temporary credentials)\n` +
          `- SAGEMAKER_TIMEOUT: Request timeout in ms (optional, default: 30000)\n` +
          `- SAGEMAKER_MAX_RETRIES: Max retry attempts (optional, default: 3)`,
      );
    }
    throw error;
  }
}

/**
 * Load and validate SageMaker model configuration
 *
 * @param endpointName - Name of the SageMaker endpoint
 * @returns Validated model configuration
 */
export function getSageMakerModelConfig(
  endpointName?: string,
): SageMakerModelConfig {
  const endpoint = endpointName || getDefaultSageMakerEndpoint();

  // Check cache first
  if (modelConfigCache.has(endpoint)) {
    return modelConfigCache.get(endpoint)!;
  }

  const config: SageMakerModelConfig = {
    endpointName: endpoint,
    modelType:
      (process.env.SAGEMAKER_MODEL_TYPE as
        | "llama"
        | "mistral"
        | "claude"
        | "huggingface"
        | "jumpstart"
        | "custom"
        | undefined) || "custom",
    contentType: process.env.SAGEMAKER_CONTENT_TYPE || "application/json",
    accept: process.env.SAGEMAKER_ACCEPT || "application/json",
    customAttributes: process.env.SAGEMAKER_CUSTOM_ATTRIBUTES,
    inputFormat:
      (process.env.SAGEMAKER_INPUT_FORMAT as
        | "huggingface"
        | "jumpstart"
        | "custom"
        | undefined) || "custom",
    outputFormat:
      (process.env.SAGEMAKER_OUTPUT_FORMAT as
        | "huggingface"
        | "jumpstart"
        | "custom"
        | undefined) || "custom",
    maxTokens: process.env.SAGEMAKER_MAX_TOKENS
      ? parseInt(process.env.SAGEMAKER_MAX_TOKENS)
      : undefined,
    temperature: process.env.SAGEMAKER_TEMPERATURE
      ? parseFloat(process.env.SAGEMAKER_TEMPERATURE)
      : undefined,
    topP: process.env.SAGEMAKER_TOP_P
      ? parseFloat(process.env.SAGEMAKER_TOP_P)
      : undefined,
    stopSequences: process.env.SAGEMAKER_STOP_SEQUENCES
      ? process.env.SAGEMAKER_STOP_SEQUENCES.split(",").map((s) => s.trim())
      : undefined,
  };

  // Validate configuration
  try {
    const validatedConfig = SageMakerModelConfigSchema.parse(config);

    // Cache the validated configuration
    modelConfigCache.set(endpoint, validatedConfig);

    return validatedConfig;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`,
      );
      throw new Error(
        `SageMaker model configuration validation failed for endpoint '${endpoint}':\n${errorMessages.join("\n")}`,
      );
    }
    throw error;
  }
}

/**
 * Get the default SageMaker endpoint name from environment variables
 *
 * @returns Default endpoint name
 */
export function getDefaultSageMakerEndpoint(): string {
  return (
    process.env.SAGEMAKER_DEFAULT_ENDPOINT ||
    process.env.SAGEMAKER_ENDPOINT_NAME ||
    "default-endpoint"
  );
}

/**
 * Get SageMaker model name from environment variables
 *
 * @returns Model name
 */
export function getSageMakerModel(): string {
  return (
    process.env.SAGEMAKER_MODEL ||
    process.env.SAGEMAKER_MODEL_NAME ||
    "sagemaker-model"
  );
}

/**
 * Check AWS access key presence (minimal validation to prevent credential enumeration)
 * @param accessKeyId - AWS access key to check
 * @returns Validation result
 */
function checkAccessKeyPresence(accessKeyId: string): {
  isValid: boolean;
} {
  // Only check for obviously invalid keys (empty/whitespace)
  // Delegate all other validation to AWS SDK to prevent credential enumeration
  if (!accessKeyId || accessKeyId.trim() === "") {
    return { isValid: false };
  }

  // Accept non-empty string - let AWS handle validation
  // This prevents attackers from learning about valid formats
  return { isValid: true };
}

/**
 * Validate AWS credentials are properly configured
 *
 * @param config - SageMaker configuration to validate
 * @returns true if credentials are valid
 * @throws {Error} When credentials are missing or invalid
 */
export function validateAWSCredentials(config: SageMakerConfig): boolean {
  if (!config.accessKeyId || config.accessKeyId.trim() === "") {
    throw new Error(
      "AWS Access Key ID is missing. Please set AWS_ACCESS_KEY_ID environment variable.",
    );
  }

  if (!config.secretAccessKey || config.secretAccessKey.trim() === "") {
    throw new Error(
      "AWS Secret Access Key is missing. Please set AWS_SECRET_ACCESS_KEY environment variable.",
    );
  }

  // Basic AWS access key validation (let AWS SDK handle detailed validation)
  const accessKeyValidation = checkAccessKeyPresence(config.accessKeyId);
  if (!accessKeyValidation.isValid) {
    // Minimal logging for security - let AWS SDK handle detailed validation
    logger.warn(
      "AWS Access Key ID format check failed. " +
        "Please verify your AWS credentials are correct.",
    );
  }

  // Validate region format
  if (!/^[a-z0-9-]+$/.test(config.region)) {
    throw new Error(
      `Invalid AWS region format: ${config.region}. Expected format: us-east-1, eu-west-1, etc.`,
    );
  }

  return true;
}

/**
 * Create a comprehensive configuration summary for debugging
 *
 * @returns Configuration summary (sensitive data masked)
 */
export function getConfigurationSummary(): Record<string, unknown> {
  try {
    const config = getSageMakerConfig();
    const defaultEndpoint = getDefaultSageMakerEndpoint();
    const modelConfig = getSageMakerModelConfig();

    return {
      aws: {
        region: config.region,
        accessKeyId: config.accessKeyId
          ? `${config.accessKeyId.substring(0, 4)}***`
          : "NOT_SET",
        secretAccessKey: config.secretAccessKey ? "***SET***" : "NOT_SET",
        sessionToken: config.sessionToken ? "***SET***" : "NOT_SET",
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        endpoint: config.endpoint || "DEFAULT",
      },
      sagemaker: {
        defaultEndpoint,
        model: getSageMakerModel(),
        modelConfig: {
          endpointName: modelConfig.endpointName,
          modelType: modelConfig.modelType,
          contentType: modelConfig.contentType,
          accept: modelConfig.accept,
          inputFormat: modelConfig.inputFormat,
          outputFormat: modelConfig.outputFormat,
          maxTokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          topP: modelConfig.topP,
        },
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        sagemakerConfigured: !!process.env.SAGEMAKER_DEFAULT_ENDPOINT,
        awsConfigured: !!(
          process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ),
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Unknown configuration error",
      configured: false,
    };
  }
}

/**
 * Clear configuration cache (useful for testing or credential rotation)
 */
export function clearConfigurationCache(): void {
  configCache = null;
  modelConfigCache.clear();
}

/**
 * Load configuration from a JSON file (alternative to environment variables)
 *
 * @param filePath - Path to configuration JSON file
 * @returns Loaded configuration
 */
export async function loadConfigurationFromFile(
  filePath: string,
): Promise<SageMakerConfig> {
  try {
    const fs = await import("fs/promises");
    const configData = await fs.readFile(filePath, "utf-8");
    const parsedConfig = JSON.parse(configData);

    // Validate the loaded configuration
    const validatedConfig = SageMakerConfigSchema.parse(parsedConfig);

    // Update cache with file-based configuration
    configCache = validatedConfig;

    return validatedConfig;
  } catch (error) {
    throw new Error(
      `Failed to load SageMaker configuration from file '${filePath}': ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}

/**
 * Check if SageMaker provider is properly configured
 *
 * @returns Configuration check result
 */
export function checkSageMakerConfiguration(): {
  configured: boolean;
  issues: string[];
  summary: Record<string, unknown>;
} {
  const issues: string[] = [];
  let configured = false;

  try {
    // Try to load configuration
    const config = getSageMakerConfig();
    validateAWSCredentials(config);

    // Check endpoint configuration
    const endpoint = getDefaultSageMakerEndpoint();
    if (endpoint === "default-endpoint") {
      issues.push(
        "Default endpoint name detected. Consider setting SAGEMAKER_DEFAULT_ENDPOINT.",
      );
    }

    configured = true;
  } catch (error) {
    issues.push(
      error instanceof Error ? error.message : "Unknown configuration error",
    );
  }

  return {
    configured,
    issues,
    summary: getConfigurationSummary(),
  };
}
