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
   *
   * A pattern is refused, skipped and logged as an error (never thrown at the
   * caller) when it is longer than 1000 characters or has a shape that can
   * backtrack catastrophically: a repeated group with a variable-length part
   * that can also match what follows it, a repetition bound above 500, or
   * overlapping alternatives under a repetition. See
   * `BadWordsConfig.regexPatterns`.
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
  /**
   * Regular expressions to redact, each applied with the `gi` flags. When set
   * they take priority over `list`.
   *
   * Patterns run synchronously on the whole response, so a pattern that can
   * backtrack catastrophically would stall the process. A pattern is refused,
   * skipped and logged as an error (the same handling as an invalid regex,
   * never thrown at the caller) when it:
   *
   * - is longer than 1000 characters;
   * - repeats a group in which a variable-length part (`+`, `*`, `?`, `{n,m}`)
   *   can match the same text as whatever follows it, so the input can be
   *   split many ways: `(a+)+`, `(\w+\s*)*`, `(.*a){10}`, `(a?a?)+`,
   *   `(a{1,30}){1,30}`;
   * - repeats a group whose alternatives may overlap, such as `(a|aa)+`;
   * - chains more than a handful of overlapping optional or open-ended parts,
   *   such as `a?a?a?a?a?a?a?a?a?` or `.*a.*b.*c.*d.*e.*f`;
   * - has a repetition bound above 500, such as `a{1,1000}`.
   *
   * A repeated group is fine when each variable-length part is followed by
   * something it cannot match: `(\d{1,3}\.){3}`, `([a-z0-9-]+\.)+` and
   * `(?:\d[ -]?){13,16}` all run.
   *
   * A skipped pattern filters nothing. Use `list` for plain terms, or flatten
   * the pattern (`[\w-]+` instead of `([\w-]+)+`).
   *
   * Example patterns:
   * - SSN: '\\d{3}-\\d{2}-\\d{4}'
   * - Card number: '\\d{16}'
   * - Words: '\\b(password|secret)\\b'
   */
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
    /** Regex patterns that were compiled and run. */
    regexPatternsApplied: number;
    /**
     * Regex patterns refused before they ran because they were too long or
     * could backtrack catastrophically. Invalid patterns are not counted.
     */
    regexPatternsRejected?: number;
    stringFiltersApplied: number;
    totalMatches: number;
  };
};

/**
 * Outcome of vetting a caller-supplied regular expression before it is
 * compiled and run against model output.
 */
export type RegexPatternVerdict =
  | { safe: true }
  | { safe: false; reason: string };

/**
 * One element of a parsed regular expression, reduced to what the backtracking
 * checks need: single characters, character classes, zero-width assertions,
 * groups with their alternatives (a lookaround is a group that consumes
 * nothing), and repetitions with their bounds.
 *
 * @internal
 */
export type RegexSafetyNode =
  | { kind: "literal"; char: string }
  | { kind: "class"; source: string }
  | { kind: "assertion" }
  | { kind: "group"; alternatives: RegexSafetyNode[][]; lookaround?: boolean }
  | { kind: "repeat"; child: RegexSafetyNode; min: number; max: number };

/**
 * What a regex element can start with and whether it can match nothing: the
 * characters it may begin with as a bitmap over a fixed character sample, and
 * whether it is optional.
 *
 * @internal
 */
export type RegexSafetyShape = { first: Uint32Array; nullable: boolean };

/**
 * Cost of an ambiguous region of a pattern: the number of ways it can match
 * the same text, and the polynomial degree of its open-ended parts.
 *
 * @internal
 */
export type RegexSafetyCost = { ways: number; degree: number };

/**
 * Either the cost of a pattern region or the reason the pattern is refused.
 *
 * @internal
 */
export type RegexSafetyOutcome = RegexSafetyCost | string;

/**
 * Where an element sits while a pattern is analysed.
 *
 * @internal
 */
export type RegexSafetyContext = {
  /** Inside a repeated group: any ambiguity here multiplies per iteration. */
  inLoop: boolean;
  /** Inside a group that may repeat more often than a small fixed count. */
  unbounded: boolean;
};
