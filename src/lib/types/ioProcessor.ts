/**
 * Safety Utility Types for NeuroLink
 *
 * Types used by the PII detection, response validation, and tripwire
 * evaluation utilities wired into generate() and stream().
 *
 * @module ioProcessor
 */

// =============================================================================
// PII Detection Types
// =============================================================================

export type PiiType =
  | "email"
  | "phone"
  | "ssn"
  | "creditCard"
  | "ipAddress"
  | "address"
  | "name"
  | "dateOfBirth"
  | "passport"
  | "driversLicense";

export type PiiDetectionConfig = {
  enabled?: boolean;
  action: "redact" | "abort" | "warn";
  detectTypes?: PiiType[];
  customPatterns?: RegExp[];
  allowList?: string[];
  redactionText?: string;
};

export type DetectedPII = {
  type: PiiType | "custom";
  value: string;
  position: { start: number; end: number };
  /** Which field the PII was found in (e.g. "text", "messages[2]") */
  field: string;
};

export type PiiDetectionResult = {
  /** Redacted text when action=redact, otherwise the original text */
  text: string;
  detectedPII: DetectedPII[];
  action: "continue" | "abort";
  /** Human-readable message about what was found */
  feedback?: string;
};

// =============================================================================
// Response Validation Types
// =============================================================================

export type ResponseValidationConfig = {
  /** Minimum required character length for the response */
  minLength?: number;
  /** Maximum allowed character length for the response */
  maxLength?: number;
  /** Phrases that must appear in the response (case-insensitive) */
  requiredPhrases?: string[];
  /** Phrases that must NOT appear in the response (case-insensitive) */
  forbiddenPhrases?: string[];
  /** JSON Schema to validate the response against (response must be valid JSON) */
  jsonSchema?: Record<string, unknown>;
  /** Custom validation function; return a ValidationIssue to signal failure, null to pass */
  customValidator?: (text: string) => ValidationIssue | null;
  /**
   * Action to take when maxLength is exceeded:
   * - "truncate" — slice text to maxLength + suffix (default)
   * - "abort"    — return action:"abort"
   * - "retry"    — return action:"retry" with feedback
   * - "warn"     — log a warning but return the unmodified text
   */
  truncationAction?: "abort" | "retry" | "truncate" | "warn";
  /** Suffix appended when truncating (default: "..."). Never causes the final string to exceed maxLength. */
  truncationSuffix?: string;
  /** Return action:"retry" when any error-severity issue is found */
  retryOnFailure?: boolean;
  /** Maximum allowed retry count (informational — caller enforces the loop) */
  maxRetries?: number;
};

export type ValidationIssue = {
  /** Short machine-readable category (e.g., "length", "json_schema", "phrase") */
  category: string;
  severity: "error" | "warning" | "info";
  message: string;
  /** Optional field path (useful for JSON schema errors) */
  field?: string;
};

export type ResponseValidationResult = {
  /** Possibly-mutated response text (truncation may shorten it) */
  text: string;
  /** What the caller should do next */
  action: "continue" | "abort" | "retry";
  /** All issues found during validation */
  issues: ValidationIssue[];
  /** Human-readable summary suitable for inclusion in a retry prompt */
  feedback?: string;
  /** The retryCount that was passed in (echoed back for convenience) */
  retryCount?: number;
};

// =============================================================================
// Tripwire Types
// =============================================================================

export type TripwireAction = "abort" | "warn" | "log";

export type TripwireData = {
  responseText?: string;
  inputText?: string;
  latencyMs?: number;
  tokenUsage?: { input?: number; output?: number; total?: number };
  messageCount?: number;
  finishReason?: string;
};

export type TripwireConfig = {
  id: string;
  name: string;
  description: string;
  action: TripwireAction;
  condition: (data: TripwireData) => boolean;
  message?: string | ((data: TripwireData) => string);
};

export type TripwireResult = {
  triggered: boolean;
  tripwire?: TripwireConfig;
  message?: string;
  action?: TripwireAction;
};

// =============================================================================
// Legacy Pipeline Types (deprecated — kept for backward compatibility)
// =============================================================================

/** @deprecated Use piiDetection/responseValidation/inputValidation on GenerateOptions instead */
export type ProcessorPipelineConfig = {
  name?: string;
  stopOnAbort?: boolean;
  pipelineTimeoutMs?: number;
  inputProcessors?: unknown[];
  outputProcessors?: unknown[];
  settings?: Record<string, unknown>;
};
