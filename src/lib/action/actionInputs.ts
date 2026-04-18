// src/lib/action/actionInputs.ts
/**
 * GitHub Action input parsing and validation
 * @module action/actionInputs
 */

import * as core from "@actions/core";
import type {
  ActionAWSConfig,
  ActionGoogleCloudConfig,
  ActionInputValidation,
  ActionInputs,
  ActionProviderKeys,
  ProviderKeyMap,
} from "../types/index.js";
import { AIProviderName } from "../constants/enums.js";
import { ErrorFactory } from "../utils/errorHandling.js";

const PROVIDER_KEY_MAP: ProviderKeyMap = {
  [AIProviderName.OPENAI]: ["openaiApiKey"],
  [AIProviderName.ANTHROPIC]: ["anthropicApiKey"],
  [AIProviderName.GOOGLE_AI]: ["googleAiApiKey"],
  [AIProviderName.VERTEX]: ["googleVertexProject"],
  [AIProviderName.BEDROCK]: ["awsAccessKeyId", "awsSecretAccessKey"],
  [AIProviderName.AZURE]: ["azureOpenaiApiKey", "azureOpenaiEndpoint"],
  [AIProviderName.MISTRAL]: ["mistralApiKey"],
  [AIProviderName.HUGGINGFACE]: ["huggingfaceApiKey"],
  [AIProviderName.OPENROUTER]: ["openrouterApiKey"],
  [AIProviderName.LITELLM]: ["litellmApiKey", "litellmBaseUrl"],
  [AIProviderName.SAGEMAKER]: ["awsAccessKeyId", "awsSecretAccessKey"],
  [AIProviderName.OPENAI_COMPATIBLE]: [
    "openaiCompatibleApiKey",
    "openaiCompatibleBaseUrl",
  ],
};

/**
 * Parse comma-separated paths into array
 */
function parsePathList(input: string): string[] | undefined {
  if (!input) {
    return undefined;
  }
  return input
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Parse and validate a numeric input, throwing if NaN
 */
function parseNumericInput(
  inputName: string,
  rawValue: string,
  defaultValue: number,
  parseFunction: (value: string, radix?: number) => number,
  radix?: number,
): number {
  if (!rawValue) {
    return defaultValue;
  }
  const parsed =
    radix !== undefined
      ? parseFunction(rawValue, radix)
      : parseFunction(rawValue);
  if (isNaN(parsed)) {
    throw ErrorFactory.invalidConfiguration(
      inputName,
      `expected a valid number but received "${rawValue}"`,
    );
  }
  return parsed;
}

/**
 * Mask all secrets in logs
 */
export function maskSecrets(inputs: ActionInputs): void {
  const secrets = [
    inputs.providerKeys.openaiApiKey,
    inputs.providerKeys.anthropicApiKey,
    inputs.providerKeys.googleAiApiKey,
    inputs.providerKeys.azureOpenaiApiKey,
    inputs.providerKeys.mistralApiKey,
    inputs.providerKeys.huggingfaceApiKey,
    inputs.providerKeys.openrouterApiKey,
    inputs.providerKeys.litellmApiKey,
    inputs.providerKeys.openaiCompatibleApiKey,
    inputs.awsConfig.awsAccessKeyId,
    inputs.awsConfig.awsSecretAccessKey,
    inputs.awsConfig.awsSessionToken,
    inputs.googleCloudConfig.googleApplicationCredentials,
    inputs.githubToken,
  ];

  secrets
    .filter((s): s is string => Boolean(s))
    .forEach((secret) => core.setSecret(secret));
}

/**
 * Validate that provider has required API key
 */
export function validateProviderKey(
  provider: string,
  keys: Partial<ActionProviderKeys>,
  awsConfig?: Partial<ActionAWSConfig>,
  googleConfig?: Partial<ActionGoogleCloudConfig>,
): boolean {
  // These providers don't require API keys
  if (provider === "auto" || provider === "ollama") {
    return true;
  }

  const requiredKeys = PROVIDER_KEY_MAP[provider];
  if (!requiredKeys) {
    // Log warning for unknown provider, but don't fail (allows new providers)
    core.warning(`Unknown provider "${provider}" - skipping key validation`);
    return true;
  }

  // Check keys across all config objects
  return requiredKeys.every((key) => {
    const keyValue =
      (keys as Record<string, unknown>)[key] ||
      (awsConfig as Record<string, unknown> | undefined)?.[key] ||
      (googleConfig as Record<string, unknown> | undefined)?.[key];
    return !!keyValue;
  });
}

/**
 * Parse all action inputs from GitHub Action context
 */
export function parseActionInputs(): ActionInputs {
  const prompt = core.getInput("prompt", { required: true });
  const provider = core.getInput("provider") || "auto";

  // Parse provider keys (verified providers only)
  const providerKeys: ActionProviderKeys = {
    openaiApiKey: core.getInput("openai_api_key") || undefined,
    anthropicApiKey: core.getInput("anthropic_api_key") || undefined,
    googleAiApiKey: core.getInput("google_ai_api_key") || undefined,
    azureOpenaiApiKey: core.getInput("azure_openai_api_key") || undefined,
    azureOpenaiEndpoint: core.getInput("azure_openai_endpoint") || undefined,
    azureOpenaiDeployment:
      core.getInput("azure_openai_deployment") || undefined,
    mistralApiKey: core.getInput("mistral_api_key") || undefined,
    huggingfaceApiKey: core.getInput("huggingface_api_key") || undefined,
    openrouterApiKey: core.getInput("openrouter_api_key") || undefined,
    litellmApiKey: core.getInput("litellm_api_key") || undefined,
    litellmBaseUrl: core.getInput("litellm_base_url") || undefined,
    openaiCompatibleApiKey:
      core.getInput("openai_compatible_api_key") || undefined,
    openaiCompatibleBaseUrl:
      core.getInput("openai_compatible_base_url") || undefined,
  };

  // AWS config
  const awsConfig: ActionAWSConfig = {
    awsAccessKeyId: core.getInput("aws_access_key_id") || undefined,
    awsSecretAccessKey: core.getInput("aws_secret_access_key") || undefined,
    awsRegion: core.getInput("aws_region") || "us-east-1",
    awsSessionToken: core.getInput("aws_session_token") || undefined,
    bedrockModelId: core.getInput("bedrock_model_id") || undefined,
    sagemakerEndpoint: core.getInput("sagemaker_endpoint") || undefined,
  };

  // Google Cloud config
  const googleCloudConfig: ActionGoogleCloudConfig = {
    googleVertexProject: core.getInput("google_vertex_project") || undefined,
    googleVertexLocation:
      core.getInput("google_vertex_location") || "us-central1",
    googleApplicationCredentials:
      core.getInput("google_application_credentials") || undefined,
  };

  // Validate provider has key
  if (
    !validateProviderKey(provider, providerKeys, awsConfig, googleCloudConfig)
  ) {
    throw ErrorFactory.missingConfiguration(
      `API key for provider: ${provider}`,
    );
  }

  return {
    prompt,
    provider: provider as AIProviderName | "auto",
    model: core.getInput("model") || undefined,

    // Generation parameters
    temperature: parseNumericInput(
      "temperature",
      core.getInput("temperature"),
      0.7,
      parseFloat,
    ),
    maxTokens: parseNumericInput(
      "max_tokens",
      core.getInput("max_tokens"),
      4096,
      parseInt,
      10,
    ),
    systemPrompt: core.getInput("system_prompt") || undefined,

    // Command
    command: (core.getInput("command") || "generate") as
      | "generate"
      | "stream"
      | "batch",

    // Provider keys
    providerKeys,

    // AWS config
    awsConfig,

    // Google Cloud config
    googleCloudConfig,

    // Multimodal inputs
    multimodal: {
      imagePaths: parsePathList(core.getInput("image_paths")),
      pdfPaths: parsePathList(core.getInput("pdf_paths")),
      csvPaths: parsePathList(core.getInput("csv_paths")),
      videoPaths: parsePathList(core.getInput("video_paths")),
    },

    // Extended thinking
    thinking: {
      enabled: core.getBooleanInput("thinking_enabled"),
      level: (core.getInput("thinking_level") || "medium") as
        | "minimal"
        | "low"
        | "medium"
        | "high",
      budget: parseNumericInput(
        "thinking_budget",
        core.getInput("thinking_budget"),
        10000,
        parseInt,
        10,
      ),
    },

    // Features (verified to exist in CLI)
    enableAnalytics: core.getBooleanInput("enable_analytics"),
    enableEvaluation: core.getBooleanInput("enable_evaluation"),

    // Output
    outputFormat: (core.getInput("output_format") || "text") as "text" | "json",
    outputFile: core.getInput("output_file") || undefined,

    // MCP Tools
    enableTools: core.getBooleanInput("enable_tools"),
    mcpConfigPath: core.getInput("mcp_config_path") || undefined,

    // GitHub Integration
    postComment: core.getBooleanInput("post_comment"),
    updateExistingComment: core.getBooleanInput("update_existing_comment"),
    commentTag: core.getInput("comment_tag") || "neurolink-action",
    githubToken: core.getInput("github_token") || process.env.GITHUB_TOKEN,

    // Advanced
    timeout: parseNumericInput(
      "timeout",
      core.getInput("timeout"),
      300,
      parseInt,
      10,
    ),
    debug: core.getBooleanInput("debug"),
    neurolinkVersion: core.getInput("neurolink_version") || "latest",
    workingDirectory: core.getInput("working_directory") || ".",
  };
}

/**
 * Build environment variables from action inputs
 */
export function buildEnvironmentVariables(
  inputs: ActionInputs,
): Record<string, string> {
  const env: Record<string, string> = {
    CI: "true",
    NEUROLINK_NON_INTERACTIVE: "true",
  };

  // Provider keys
  const { providerKeys } = inputs;
  if (providerKeys.openaiApiKey) {
    env.OPENAI_API_KEY = providerKeys.openaiApiKey;
  }
  if (providerKeys.anthropicApiKey) {
    env.ANTHROPIC_API_KEY = providerKeys.anthropicApiKey;
  }
  if (providerKeys.googleAiApiKey) {
    env.GOOGLE_AI_API_KEY = providerKeys.googleAiApiKey;
  }
  if (providerKeys.azureOpenaiApiKey) {
    env.AZURE_OPENAI_API_KEY = providerKeys.azureOpenaiApiKey;
  }
  if (providerKeys.azureOpenaiEndpoint) {
    env.AZURE_OPENAI_ENDPOINT = providerKeys.azureOpenaiEndpoint;
  }
  if (providerKeys.azureOpenaiDeployment) {
    env.AZURE_OPENAI_DEPLOYMENT = providerKeys.azureOpenaiDeployment;
  }
  if (providerKeys.mistralApiKey) {
    env.MISTRAL_API_KEY = providerKeys.mistralApiKey;
  }
  if (providerKeys.huggingfaceApiKey) {
    env.HUGGINGFACE_API_KEY = providerKeys.huggingfaceApiKey;
  }
  if (providerKeys.openrouterApiKey) {
    env.OPENROUTER_API_KEY = providerKeys.openrouterApiKey;
  }
  if (providerKeys.litellmApiKey) {
    env.LITELLM_API_KEY = providerKeys.litellmApiKey;
  }
  if (providerKeys.litellmBaseUrl) {
    env.LITELLM_BASE_URL = providerKeys.litellmBaseUrl;
  }
  if (providerKeys.openaiCompatibleApiKey) {
    env.OPENAI_COMPATIBLE_API_KEY = providerKeys.openaiCompatibleApiKey;
  }
  if (providerKeys.openaiCompatibleBaseUrl) {
    env.OPENAI_COMPATIBLE_BASE_URL = providerKeys.openaiCompatibleBaseUrl;
  }

  // AWS
  const { awsConfig } = inputs;
  if (awsConfig.awsAccessKeyId) {
    env.AWS_ACCESS_KEY_ID = awsConfig.awsAccessKeyId;
  }
  if (awsConfig.awsSecretAccessKey) {
    env.AWS_SECRET_ACCESS_KEY = awsConfig.awsSecretAccessKey;
  }
  env.AWS_REGION = awsConfig.awsRegion;
  if (awsConfig.awsSessionToken) {
    env.AWS_SESSION_TOKEN = awsConfig.awsSessionToken;
  }
  if (awsConfig.bedrockModelId) {
    env.BEDROCK_MODEL_ID = awsConfig.bedrockModelId;
  }
  if (awsConfig.sagemakerEndpoint) {
    env.SAGEMAKER_DEFAULT_ENDPOINT = awsConfig.sagemakerEndpoint;
  }

  // Google Cloud
  const { googleCloudConfig } = inputs;
  if (googleCloudConfig.googleVertexProject) {
    env.GOOGLE_VERTEX_PROJECT = googleCloudConfig.googleVertexProject;
  }
  env.GOOGLE_VERTEX_LOCATION = googleCloudConfig.googleVertexLocation;

  // GitHub
  if (inputs.githubToken) {
    env.GITHUB_TOKEN = inputs.githubToken;
  }

  return env;
}

/**
 * Validate all action inputs
 */
export function validateActionInputs(
  inputs: ActionInputs,
): ActionInputValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!inputs.prompt) {
    errors.push("prompt is required");
  }

  // Temperature range
  if (inputs.temperature < 0 || inputs.temperature > 2) {
    warnings.push("temperature should be between 0 and 2");
  }

  // Thinking budget range
  if (
    inputs.thinking.enabled &&
    (inputs.thinking.budget < 5000 || inputs.thinking.budget > 100000)
  ) {
    warnings.push("thinking_budget should be between 5000 and 100000");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
