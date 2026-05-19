import type { LanguageModel } from "./providers.js";

/**
 * Result from precall evaluation of user input
 */
export type PrecallEvaluationResult = {
  overall: "safe" | "unsafe" | "suspicious" | "inappropriate";
  safetyScore: number;
  appropriatenessScore: number;
  confidenceLevel: number;
  issues?: {
    category:
      | "explicit_content"
      | "hate_speech"
      | "violence"
      | "personal_info"
      | "spam"
      | "other";
    severity: "low" | "medium" | "high" | "critical";
    description: string;
  }[];
  suggestedAction: "allow" | "block" | "sanitize" | "warn";
  reasoning?: string;
};

export type IssueCategory =
  | "explicit_content"
  | "hate_speech"
  | "violence"
  | "personal_info"
  | "spam"
  | "other";

export type IssueSeverity = "low" | "medium" | "high" | "critical";

export type EvaluationAction = "allow" | "block" | "sanitize" | "warn";

export type SafetyStatus = "safe" | "unsafe" | "suspicious" | "inappropriate";

export type EvaluationActions = {
  onUnsafe?: "block" | "sanitize" | "warn" | "log";
  onInappropriate?: "block" | "sanitize" | "warn" | "log";
  onSuspicious?: "warn" | "log" | "allow";
};

export type EvaluationThresholds = {
  safetyScore?: number;
  appropriatenessScore?: number;
  confidenceLevel?: number;
};

/**
 * Configuration for precall evaluation using AI models
 */
export type PrecallEvaluationConfig = {
  enabled?: boolean;
  provider?: string;
  evaluationModel?: string;
  evaluationPrompt?: string;
  actions?: EvaluationActions;
  thresholds?: EvaluationThresholds;
  blockUnsafeRequests?: boolean;
  /**
   * Regex patterns to use for sanitizing input when action is "sanitize".
   * Each pattern will be applied with the 'gi' flags (global, case-insensitive).
   * Matched content will be replaced with the value specified in `replacementText`.
   *
   * Example patterns:
   * - Email: '\\b[\\w.-]+@[\\w.-]+\\.\\w+\\b'
   * - Phone: '\\b\\d{3}[-.]?\\d{3}[-.]?\\d{4}\\b'
   * - SSN: '\\b\\d{3}-\\d{2}-\\d{4}\\b'
   * - Custom words: '\\b(word1|word2|word3)\\b'
   */
  sanitizationPatterns?: string[];
  /**
   * Text to use when replacing sanitized content.
   * @default '[REDACTED]'
   *
   * Examples:
   * - '[REDACTED]' (default)
   * - '***PRIVATE***'
   * - '####'
   * - '[FILTERED]'
   */
  replacementText?: string;
};

export type BadWordsConfig = {
  enabled?: boolean;
  list?: string[];
  regexPatterns?: string[];
  /**
   * Text to use when replacing filtered content.
   * @default '[REDACTED]'
   *
   * Examples:
   * - '[REDACTED]' (default)
   * - '***'
   * - '####'
   * - '[FILTERED]'
   */
  replacementText?: string;
};

export type ModelFilterConfig = {
  enabled?: boolean;
  filterModel?: LanguageModel;
};

/**
 * Configuration for the Guardrails middleware
 */
export type GuardrailsMiddlewareConfig = {
  badWords?: BadWordsConfig;
  modelFilter?: ModelFilterConfig;
  precallEvaluation?: PrecallEvaluationConfig;
};

export type EvaluationActionResult = {
  shouldBlock: boolean;
  sanitizedInput?: string;
};

export type EvaluationIssue = {
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
};

/**
 * Result from content filtering operation
 */
export type ContentFilteringResult = {
  filteredText: string;
  hasChanges: boolean;
  appliedFilters: string[];
  filteringStats: {
    regexPatternsApplied: number;
    stringFiltersApplied: number;
    totalMatches: number;
  };
};
