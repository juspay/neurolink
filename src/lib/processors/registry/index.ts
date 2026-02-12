/**
 * Processor Registry Module
 *
 * Central registry for file processors with priority-based selection.
 * Provides automatic file type detection and routing to appropriate processors.
 *
 * @module processors/registry
 */

// =============================================================================
// TYPE EXPORTS
// =============================================================================

// All shared types come from the single source of truth: base/types.ts
export type {
  ProcessorMatch,
  ProcessorPriorityKey,
  ProcessorPriorityValue,
  RegistryOptions,
  RegistryProcessResult,
  UnsupportedFileError,
} from "../base/types.js";
// Registry-specific type (only type unique to registry)
export type { ProcessorRegistration } from "./types.js";

// =============================================================================
// CONSTANT EXPORTS
// =============================================================================

export { PROCESSOR_PRIORITIES } from "../base/types.js";

// =============================================================================
// CLASS EXPORTS
// =============================================================================

export {
  getProcessorRegistry,
  getProcessorRegistrySync,
  ProcessorRegistry,
} from "./ProcessorRegistry.js";
