/**
 * @file Runtime utility functions for the I/O Processor System.
 * All type definitions live in src/lib/types/ioProcessor.ts.
 */

import type {
  ProcessorContinueResult,
  ProcessorMetadata,
  ProcessorResultBase,
  ProcessorRetryResult,
} from "../types/index.js";

/**
 * Internal abort result type (action: "abort" variant of ProcessorResultBase)
 */
type ProcessorAbortResultInternal = ProcessorResultBase & {
  action: "abort";
  feedback: string;
};

/**
 * Create a default processor metadata object
 */
export function createDefaultMetadata(
  overrides?: Partial<ProcessorMetadata>,
): ProcessorMetadata {
  return {
    requestId: "",
    timestamp: Date.now(),
    custom: {},
    issues: [],
    processorTrace: [],
    ...overrides,
  };
}

/**
 * Create a continue result
 */
export function createContinueResult<TData>(
  data: TData,
  metadata: ProcessorMetadata,
): ProcessorContinueResult<TData> {
  return {
    action: "continue",
    data,
    metadata,
  };
}

/**
 * Create an abort result
 */
export function createAbortResult(
  feedback: string,
  metadata: ProcessorMetadata,
): ProcessorAbortResultInternal {
  return {
    action: "abort",
    feedback,
    metadata,
  };
}

/**
 * Create a retry result
 */
export function createRetryResult<TData>(
  feedback: string,
  metadata: ProcessorMetadata,
  data?: TData,
): ProcessorRetryResult<TData> {
  return {
    action: "retry",
    feedback,
    metadata,
    data,
  };
}
