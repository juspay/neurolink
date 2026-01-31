/**
 * Input/Output Processors for NeuroLink
 *
 * Processors provide a clean abstraction layer for validating, transforming,
 * and enriching data flowing into and out of LLM operations.
 *
 * @module processors
 *
 * @example Basic Usage
 * ```typescript
 * import { ProcessorPipeline, createPIIDetectionProcessor, createLengthValidationProcessor } from "@juspay/neurolink";
 *
 * const pipeline = new ProcessorPipeline({
 *   inputProcessors: [
 *     { processor: createPIIDetectionProcessor({ action: "redact" }) },
 *   ],
 *   outputProcessors: [
 *     { processor: createLengthValidationProcessor({ maxLength: 5000 }) },
 *   ],
 * });
 *
 * const inputResult = await pipeline.processInput(inputData);
 * if (inputResult.action === "continue") {
 *   // Proceed with LLM call
 * }
 * ```
 *
 * @example Using Presets
 * ```typescript
 * import { ProcessorRegistry, securityPreset } from "@juspay/neurolink";
 *
 * const registry = new ProcessorRegistry();
 * registry.registerPreset(securityPreset);
 * const processors = registry.buildFromPreset("security");
 * ```
 */

// Re-export types for convenience
export type {
  ContentFilteringConfig,
  ContentModerationConfig,
  InputProcessor,
  InputProcessorData,
  InputProcessorFactory,
  LengthValidationConfig,
  MemoryPersistenceConfig,
  MemoryRetrievalConfig,
  MessageValidationConfig,
  ModerationCategory,
  OutputProcessor,
  OutputProcessorData,
  OutputProcessorFactory,
  PIIDetectionConfig,
  // Config types
  PIIType,
  PipelineResult,
  ProcessorAbortResult,
  ProcessorAction,
  ProcessorConditions,
  ProcessorConfig,
  ProcessorEnhancedResult,
  ProcessorIssue,
  ProcessorMetadata,
  ProcessorPipelineConfig,
  ProcessorPreset,
  ProcessorResult,
  ProcessorSeverity,
  ProcessorTraceEntry,
  ResponseValidationConfig,
  SemanticContextConfig,
  ToxicityCategory,
  ToxicityCheckConfig,
  TripwireConfig,
  TripwireResult,
  ValidationResult,
} from "../types/processorTypes.js";
// Input processors
export * from "./input/index.js";
// Output processors
export * from "./output/index.js";
// Core pipeline
export { ProcessorPipeline } from "./pipeline.js";
// Presets
export {
  builtInPresets,
  defaultPreset,
  getPreset,
  getPresetNames,
  minimalPreset,
  qualityPreset,
  securityPreset,
  strictPreset,
} from "./presets.js";
// Registry
export { defaultRegistry, ProcessorRegistry } from "./registry.js";
// Tripwire system
export {
  commonTripwires,
  createDefaultTripwireEvaluator,
  emptyResponseTripwire,
  highLatencyTripwire,
  inputTooLongTripwire,
  maxTokensTripwire,
  repetitionLoopTripwire,
  responseTooLongTripwire,
  TripwireEvaluator,
  tooManyMessagesTripwire,
} from "./tripwire.js";
// Utilities
export * from "./utils/index.js";

// Error types and utilities (from core infrastructure)
export {
  IOProcessorErrorCodes,
  type IOProcessorErrorCode,
  ioProcessorErrors,
  type IOProcessorErrorContext,
  isRetryableIOProcessorError,
  isIOProcessorError,
  createProcessorFailedError,
  createPipelineError,
  createRegistryError,
  createTripwireError,
  createValidationError,
  createPresetNotFoundError,
  createProcessorNotFoundError,
  createDuplicateProcessorError,
  createTimeoutError,
  createConfigurationError,
  createAbortError,
  createBatchError,
} from "./errors/IOProcessorError.js";

// Re-export NeuroLinkFeatureError for convenience
export { NeuroLinkFeatureError } from "../core/infrastructure/index.js";

// Type utilities from types.ts
export {
  createDefaultMetadata,
  createContinueResult,
  createAbortResult,
  createRetryResult,
} from "./types.js";

// Additional types from types.ts (not in processorTypes.js)
export type {
  ProcessorActionType,
  ProcessorIssueSeverity,
  ProcessorIssueCategory,
  ProcessorResultBase,
  ProcessorContinueResult,
  ProcessorRetryResult,
  BaseProcessorConfig,
  ProcessorCondition,
  ProcessorValidationResult,
  RegisteredProcessor,
  TripwireEvaluationResult,
  PipelineExecutionResult,
  ProcessorRegistryStats,
  ProcessorSummary,
  ProcessorListResult,
  BuiltProcessors,
  RegistrationOptions,
} from "./types.js";

// Import processor factories for registration
import {
  createMessageValidationProcessor,
  createPIIDetectionProcessor,
  createContentModerationProcessor,
  createMemoryRetrievalProcessor,
  createSemanticContextProcessor,
} from "./input/index.js";
import {
  createResponseValidationProcessor,
  createLengthValidationProcessor,
  createContentFilteringProcessor,
  createToxicityCheckProcessor,
  createMemoryPersistenceProcessor,
} from "./output/index.js";
import { defaultRegistry } from "./registry.js";
import { builtInPresets } from "./presets.js";

/**
 * Initialize the default processor registry with all built-in processors.
 * This function should be called once during application startup.
 *
 * @example
 * ```typescript
 * import { initializeDefaultProcessors } from "@juspay/neurolink";
 *
 * // Initialize at app startup
 * initializeDefaultProcessors();
 *
 * // Now use the default registry
 * const processors = defaultRegistry.listProcessors();
 * ```
 */
export function initializeDefaultProcessors(): void {
  // Register input processors
  defaultRegistry.registerInputProcessor(createMessageValidationProcessor(), {
    replace: true,
  });
  defaultRegistry.registerInputProcessor(createPIIDetectionProcessor(), {
    replace: true,
  });
  defaultRegistry.registerInputProcessor(createContentModerationProcessor(), {
    replace: true,
  });
  defaultRegistry.registerInputProcessor(createMemoryRetrievalProcessor(), {
    replace: true,
  });
  defaultRegistry.registerInputProcessor(createSemanticContextProcessor(), {
    replace: true,
  });

  // Register output processors
  defaultRegistry.registerOutputProcessor(createResponseValidationProcessor(), {
    replace: true,
  });
  defaultRegistry.registerOutputProcessor(createLengthValidationProcessor(), {
    replace: true,
  });
  defaultRegistry.registerOutputProcessor(createContentFilteringProcessor(), {
    replace: true,
  });
  defaultRegistry.registerOutputProcessor(createToxicityCheckProcessor(), {
    replace: true,
  });
  defaultRegistry.registerOutputProcessor(createMemoryPersistenceProcessor(), {
    replace: true,
  });

  // Register presets
  for (const preset of builtInPresets) {
    defaultRegistry.registerPreset(preset);
  }
}

// Auto-initialize when module is imported
initializeDefaultProcessors();
