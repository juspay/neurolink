// src/lib/action/index.ts
/**
 * GitHub Action module exports
 * @module action
 */

// Input handling
export {
  parseActionInputs,
  validateProviderKey,
  buildEnvironmentVariables,
  validateActionInputs,
  maskSecrets,
} from "./actionInputs.js";

// Execution
export {
  buildCliArgs,
  installNeurolink,
  executeNeurolink,
  runNeurolink,
  transformCliResponse,
} from "./actionExecutor.js";

// GitHub integration
export {
  postResultComment,
  writeJobSummary,
  setActionOutputs,
  getActionOutputs,
} from "./githubIntegration.js";

// Re-export types for convenience
export type {
  ActionInputs,
  ActionExecutionResult,
  ActionCommentResult,
  ActionOutput,
  ActionProviderKeys,
  ActionAWSConfig,
  ActionGoogleCloudConfig,
  ActionThinkingConfig,
  ActionMultimodalInputs,
  ActionTokenUsage,
  ActionEvaluation,
  ActionInputValidation,
  CliResponse,
  CliTokenUsage,
} from "../types/actionTypes.js";
