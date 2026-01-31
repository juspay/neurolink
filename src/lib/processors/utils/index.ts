/**
 * Processor utilities exports
 *
 * @module utils
 */

// Metadata utilities
export {
  addIssuesToMetadata,
  calculateTotalExecutionTime,
  cloneMetadata,
  createExecutionSummary,
  createProcessorMetadata,
  generateRequestId,
  getExecutedProcessors,
  getIssuesBySeverity,
  getLastAction,
  hasCriticalIssues,
  hasErrors,
  mergeProcessorMetadata,
} from "./metadataUtils.js";
// Processor factory utilities
export {
  type CreateInputProcessorOptions,
  type CreateOutputProcessorOptions,
  composeInputProcessors,
  composeOutputProcessors,
  conditionalInputProcessor,
  conditionalOutputProcessor,
  createInputProcessor,
  createOutputProcessor,
  withInputRetry,
  withOutputTimeout,
} from "./processorFactory.js";
// Validation utilities
export {
  type ConfigValidationResult,
  containsAll,
  containsAny,
  createWordBoundaryRegex,
  escapeRegExp,
  isJsonObject,
  isJsonValue,
  isWithinLength,
  isWithinRange,
  matchesPattern,
  validateAllowedValues,
  validateJsonSchema,
  validateRequiredFields,
} from "./validationUtils.js";
