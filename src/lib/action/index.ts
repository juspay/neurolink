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
  resolveInstallSpec,
  executeNeurolink,
  runNeurolink,
  transformCliResponse,
} from "./actionExecutor.js";
export {
  DEFAULT_NEUROLINK_CLI_VERSION,
  EXACT_VERSION_PATTERN,
} from "./cliVersion.js";

// GitHub integration
export {
  postResultComment,
  writeJobSummary,
  setActionOutputs,
  getActionOutputs,
} from "./githubIntegration.js";

// Re-export types for convenience
