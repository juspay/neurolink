// src/lib/types/actionTypes.ts
/**
 * Type definitions for NeuroLink GitHub Action
 * @module actionTypes
 */

import type { AIProviderName } from "../constants/enums.js";

// ============================================================================
// Input Types
// ============================================================================

/**
 * Provider API key configuration (verified providers only)
 */
export type ActionProviderKeys = {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  googleAiApiKey?: string;
  azureOpenaiApiKey?: string;
  azureOpenaiEndpoint?: string;
  azureOpenaiDeployment?: string;
  mistralApiKey?: string;
  huggingfaceApiKey?: string;
  openrouterApiKey?: string;
  litellmApiKey?: string;
  litellmBaseUrl?: string;
  openaiCompatibleApiKey?: string;
  openaiCompatibleBaseUrl?: string;
};

/**
 * AWS credentials for Bedrock/SageMaker
 */
export type ActionAWSConfig = {
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsRegion: string;
  awsSessionToken?: string;
  bedrockModelId?: string;
  sagemakerEndpoint?: string;
};

/**
 * Google Cloud configuration for Vertex AI
 */
export type ActionGoogleCloudConfig = {
  googleVertexProject?: string;
  googleVertexLocation: string;
  googleApplicationCredentials?: string;
};

/**
 * Extended thinking configuration
 */
export type ActionThinkingConfig = {
  enabled: boolean;
  level: "minimal" | "low" | "medium" | "high";
  budget: number;
};

/**
 * Multimodal input paths
 */
export type ActionMultimodalInputs = {
  imagePaths?: string[];
  pdfPaths?: string[];
  csvPaths?: string[];
  videoPaths?: string[];
};

/**
 * Complete action inputs parsed from GitHub Action
 */
export type ActionInputs = {
  // Required
  prompt: string;

  // Provider selection
  provider: AIProviderName | "auto";
  model?: string;

  // Generation parameters
  temperature: number;
  maxTokens: number;
  systemPrompt?: string;

  // Command
  command: "generate" | "stream" | "batch";

  // Provider keys
  providerKeys: ActionProviderKeys;

  // Cloud configs
  awsConfig: ActionAWSConfig;
  googleCloudConfig: ActionGoogleCloudConfig;

  // Multimodal
  multimodal: ActionMultimodalInputs;

  // Extended thinking
  thinking: ActionThinkingConfig;

  // Features (verified to exist)
  enableAnalytics: boolean;
  enableEvaluation: boolean;

  // Output
  outputFormat: "text" | "json";
  outputFile?: string;

  // MCP Tools
  enableTools: boolean;
  mcpConfigPath?: string;

  // GitHub Integration
  postComment: boolean;
  updateExistingComment: boolean;
  commentTag: string;
  githubToken?: string;

  // Advanced
  timeout: number;
  debug: boolean;
  neurolinkVersion: string;
  workingDirectory: string;
};

// ============================================================================
// CLI Output Types (actual format from CLI)
// ============================================================================

/**
 * Raw CLI token usage format (actual CLI output)
 */
export type CliTokenUsage = {
  input: number;
  output: number;
  total: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
};

/**
 * Raw CLI analytics format (actual CLI output)
 */
export type CliAnalytics = {
  provider: string;
  model?: string;
  tokenUsage: CliTokenUsage;
  requestDuration: number;
  timestamp: string;
  cost?: number;
};

/**
 * Raw CLI evaluation format (actual CLI output, 1-10 scale)
 */
export type CliEvaluation = {
  relevance: number;
  accuracy: number;
  completeness: number;
  overall: number;
  isOffTopic: boolean;
  reasoning: string;
};

/**
 * Raw CLI response format (actual output structure)
 */
export type CliResponse = {
  content: string;
  provider?: string;
  model?: string;
  usage?: CliTokenUsage;
  responseTime?: number;
  analytics?: CliAnalytics;
  evaluation?: CliEvaluation;
};

// ============================================================================
// Action Output Types (normalized for GitHub Action consumers)
// ============================================================================

/**
 * Normalized token usage for action output
 */
export type ActionTokenUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

/**
 * Normalized evaluation for action output
 */
export type ActionEvaluation = {
  overallScore: number; // Scaled to 0-100
  relevance: number;
  accuracy: number;
  completeness: number;
};

/**
 * CLI execution result (normalized)
 */
export type ActionExecutionResult = {
  success: boolean;
  response: string;
  responseJson?: Record<string, unknown>;
  provider?: string;
  model?: string;
  usage?: ActionTokenUsage;
  cost?: number;
  executionTime?: number;
  evaluation?: ActionEvaluation;
  error?: string;
};

/**
 * GitHub comment posting result
 */
export type ActionCommentResult = {
  success: boolean;
  commentId?: number;
  commentUrl?: string;
  error?: string;
};

/**
 * Complete action output (snake_case to match action.yml outputs)
 */
export type ActionOutput = {
  response: string;
  response_json: string;
  provider?: string;
  model?: string;
  tokens_used?: string;
  prompt_tokens?: string;
  completion_tokens?: string;
  cost?: string;
  execution_time?: string;
  evaluation_score?: string;
  comment_id?: string;
};

// ============================================================================
// Validation Types
// ============================================================================

/**
 * Input validation result
 */
export type ActionInputValidation = {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

/**
 * Provider key validation mapping
 */
export type ProviderKeyMapping = {
  [K in AIProviderName]?: (keyof ActionProviderKeys)[];
};
