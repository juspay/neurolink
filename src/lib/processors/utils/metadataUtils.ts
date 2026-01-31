/**
 * Metadata utilities for processor pipeline
 *
 * Provides functions for creating, merging, and managing processor metadata
 * that flows through the processing pipeline.
 *
 * @module metadataUtils
 */

import type {
  ProcessorIssue,
  ProcessorMetadata,
} from "../../types/processorTypes.js";

/**
 * Generate a unique request ID
 * @param provider - Optional provider name prefix
 * @returns Unique request ID string
 */
export function generateRequestId(provider?: string): string {
  const prefix = provider || "neurolink";
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Create initial processor metadata
 * @param options - Metadata initialization options
 * @returns Fresh ProcessorMetadata instance
 */
export function createProcessorMetadata(options: {
  provider?: string;
  model?: string;
  sessionId?: string;
  userId?: string;
  requestId?: string;
}): ProcessorMetadata {
  return {
    requestId: options.requestId || generateRequestId(options.provider),
    timestamp: Date.now(),
    provider: options.provider,
    model: options.model,
    sessionId: options.sessionId,
    userId: options.userId,
    custom: {},
    issues: [],
    processorTrace: [],
  };
}

/**
 * Merge custom metadata from processor result into existing metadata
 * @param base - Base metadata to merge into
 * @param additions - Custom metadata to add
 * @returns New metadata with merged custom fields
 */
export function mergeProcessorMetadata(
  base: ProcessorMetadata,
  additions: Record<string, import("../../types/common.js").JsonValue>,
): ProcessorMetadata {
  return {
    ...base,
    custom: {
      ...base.custom,
      ...additions,
    },
  };
}

/**
 * Add issues to processor metadata
 * @param metadata - Metadata to add issues to
 * @param issues - Issues to add
 * @returns New metadata with added issues
 */
export function addIssuesToMetadata(
  metadata: ProcessorMetadata,
  issues: ProcessorIssue[],
): ProcessorMetadata {
  return {
    ...metadata,
    issues: [...metadata.issues, ...issues],
  };
}

/**
 * Clone metadata for safe mutation
 * @param metadata - Metadata to clone
 * @returns Deep copy of metadata
 */
export function cloneMetadata(metadata: ProcessorMetadata): ProcessorMetadata {
  return {
    ...metadata,
    custom: { ...metadata.custom },
    issues: [...metadata.issues],
    processorTrace: [...metadata.processorTrace],
  };
}

/**
 * Calculate total execution time from processor traces
 * @param metadata - Metadata containing processor traces
 * @returns Total execution time in milliseconds
 */
export function calculateTotalExecutionTime(
  metadata: ProcessorMetadata,
): number {
  return metadata.processorTrace.reduce(
    (total, trace) => total + trace.executionTime,
    0,
  );
}

/**
 * Get issues by severity level
 * @param metadata - Metadata containing issues
 * @param severity - Severity level to filter by
 * @returns Array of issues matching the severity
 */
export function getIssuesBySeverity(
  metadata: ProcessorMetadata,
  severity: ProcessorIssue["severity"],
): ProcessorIssue[] {
  return metadata.issues.filter((issue) => issue.severity === severity);
}

/**
 * Check if metadata has any critical issues
 * @param metadata - Metadata to check
 * @returns True if there are critical issues
 */
export function hasCriticalIssues(metadata: ProcessorMetadata): boolean {
  return metadata.issues.some((issue) => issue.severity === "critical");
}

/**
 * Check if metadata has any errors (critical or error severity)
 * @param metadata - Metadata to check
 * @returns True if there are errors
 */
export function hasErrors(metadata: ProcessorMetadata): boolean {
  return metadata.issues.some(
    (issue) => issue.severity === "critical" || issue.severity === "error",
  );
}

/**
 * Get processors that were executed from metadata
 * @param metadata - Metadata containing traces
 * @returns Array of processor IDs that were executed
 */
export function getExecutedProcessors(metadata: ProcessorMetadata): string[] {
  return metadata.processorTrace.map((trace) => trace.processorId);
}

/**
 * Get the last action taken in the pipeline
 * @param metadata - Metadata containing traces
 * @returns Last action or undefined if no processors executed
 */
export function getLastAction(
  metadata: ProcessorMetadata,
): ProcessorMetadata["processorTrace"][0]["action"] | undefined {
  const lastTrace = metadata.processorTrace[metadata.processorTrace.length - 1];
  return lastTrace?.action;
}

/**
 * Create a summary of processor execution
 * @param metadata - Metadata to summarize
 * @returns Summary object with execution statistics
 */
export function createExecutionSummary(metadata: ProcessorMetadata): {
  totalProcessors: number;
  totalExecutionTime: number;
  issueCount: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  aborted: boolean;
  retried: boolean;
} {
  const issuesBySeverity = {
    critical: getIssuesBySeverity(metadata, "critical").length,
    error: getIssuesBySeverity(metadata, "error").length,
    warning: getIssuesBySeverity(metadata, "warning").length,
    info: getIssuesBySeverity(metadata, "info").length,
  };

  return {
    totalProcessors: metadata.processorTrace.length,
    totalExecutionTime: calculateTotalExecutionTime(metadata),
    issueCount: metadata.issues.length,
    criticalCount: issuesBySeverity.critical,
    errorCount: issuesBySeverity.error,
    warningCount: issuesBySeverity.warning,
    infoCount: issuesBySeverity.info,
    aborted: metadata.processorTrace.some((t) => t.action === "abort"),
    retried: metadata.processorTrace.some((t) => t.action === "retry"),
  };
}
