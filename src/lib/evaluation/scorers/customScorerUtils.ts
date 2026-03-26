/**
 * @file Custom Scorer Utilities
 * Helper functions for creating custom scorers
 */

import type { JsonObject } from "../../types/common.js";
import type {
  ScoreResult,
  ScorerCategory,
  ScorerConfig,
  ScorerInput,
  ScorerMetadata,
  ScorerType,
} from "../../types/scorerTypes.js";
import { BaseScorer, DEFAULT_SCORE_SCALE } from "./baseScorer.js";
import { evaluationErrors } from "../errors/EvaluationError.js";

/**
 * Function scorer - a simple function-based scorer
 */
export type ScorerFunction = (input: ScorerInput) => Promise<{
  score: number;
  reasoning: string;
  metadata?: JsonObject;
}>;

/**
 * Create scorer metadata with defaults
 */
export function createScorerMetadata(
  id: string,
  name: string,
  options?: {
    description?: string;
    type?: ScorerType;
    category?: ScorerCategory;
    version?: string;
    requiredInputs?: (keyof ScorerInput)[];
    optionalInputs?: (keyof ScorerInput)[];
    defaultConfig?: ScorerConfig;
  },
): ScorerMetadata {
  return {
    id,
    name,
    description: options?.description ?? `Custom scorer: ${name}`,
    type: options?.type ?? "rule",
    category: options?.category ?? "custom",
    version: options?.version ?? "1.0.0",
    requiredInputs: options?.requiredInputs ?? ["response"],
    optionalInputs: options?.optionalInputs ?? [
      "query",
      "context",
      "groundTruth",
    ],
    defaultConfig: options?.defaultConfig ?? {
      enabled: true,
      threshold: 0.7,
      weight: 1.0,
      timeout: 5000,
      retries: 0,
    },
  };
}

/**
 * Function-based scorer implementation
 */
class FunctionScorer extends BaseScorer {
  private _scorerFn: ScorerFunction;

  constructor(
    metadata: ScorerMetadata,
    scorerFn: ScorerFunction,
    config?: ScorerConfig,
  ) {
    super(metadata, config);
    this._scorerFn = scorerFn;
  }

  async score(input: ScorerInput): Promise<ScoreResult> {
    return this.executeWithTiming(async () => {
      // Validate input
      const validation = this.validateInput(input);
      if (!validation.valid) {
        return this.createErrorResult(
          `Invalid input: ${validation.errors.join(", ")}`,
        );
      }

      try {
        const result = await this._scorerFn(input);

        // Clamp score to valid range
        const clampedScore = Math.max(
          DEFAULT_SCORE_SCALE.min,
          Math.min(DEFAULT_SCORE_SCALE.max, result.score),
        );

        return this.createScoreResult(clampedScore, result.reasoning, {
          metadata: result.metadata,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return this.createErrorResult(errorMessage);
      }
    });
  }
}

/**
 * Create a simple function-based scorer
 */
export function createFunctionScorer(
  id: string,
  name: string,
  scorerFn: ScorerFunction,
  options?: {
    description?: string;
    category?: ScorerCategory;
    type?: ScorerType;
    version?: string;
    requiredInputs?: (keyof ScorerInput)[];
    optionalInputs?: (keyof ScorerInput)[];
    config?: ScorerConfig;
  },
): BaseScorer {
  const metadata = createScorerMetadata(id, name, {
    description: options?.description,
    category: options?.category,
    type: options?.type ?? "rule",
    version: options?.version,
    requiredInputs: options?.requiredInputs,
    optionalInputs: options?.optionalInputs,
  });

  return new FunctionScorer(metadata, scorerFn, options?.config);
}

/**
 * Create a regex-based scorer
 */
export function createRegexScorer(
  id: string,
  name: string,
  options: {
    pattern: string | RegExp;
    flags?: string;
    shouldMatch?: boolean;
    description?: string;
    config?: ScorerConfig;
  },
): BaseScorer {
  const metadata = createScorerMetadata(id, name, {
    description:
      options.description ??
      `Regex scorer checking for pattern: ${options.pattern}`,
    type: "rule",
    category: "quality",
  });

  let pattern: RegExp;
  if (typeof options.pattern === "string") {
    if (options.pattern.length > 200) {
      throw evaluationErrors.create(
        "CONFIGURATION_ERROR",
        "Regex pattern exceeds maximum length of 200 characters",
        {
          retryable: false,
          details: { patternLength: options.pattern.length },
        },
      );
    }
    // Check for nested quantifiers that could cause catastrophic backtracking
    if (/(\+|\*|\{)\S*(\+|\*|\{)/.test(options.pattern)) {
      throw evaluationErrors.create(
        "CONFIGURATION_ERROR",
        "Regex pattern contains nested quantifiers which may cause catastrophic backtracking",
        { retryable: false, details: { pattern: options.pattern } },
      );
    }
    try {
      pattern = new RegExp(options.pattern, options.flags ?? "i");
    } catch (e) {
      throw evaluationErrors.create(
        "CONFIGURATION_ERROR",
        `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`,
        { retryable: false, cause: e instanceof Error ? e : undefined },
      );
    }
  } else {
    // Validate precompiled RegExp with the same safety rules
    const regexSource = options.pattern.source;
    if (regexSource.length > 200) {
      throw evaluationErrors.create(
        "CONFIGURATION_ERROR",
        "Regex pattern exceeds maximum length of 200 characters",
        {
          retryable: false,
          details: { patternLength: regexSource.length },
        },
      );
    }
    if (/(\+|\*|\{)\S*(\+|\*|\{)/.test(regexSource)) {
      throw evaluationErrors.create(
        "CONFIGURATION_ERROR",
        "Regex pattern contains nested quantifiers which may cause catastrophic backtracking",
        { retryable: false, details: { pattern: regexSource } },
      );
    }
    pattern = options.pattern;
  }

  const shouldMatch = options.shouldMatch ?? true;

  return new FunctionScorer(
    metadata,
    async (input: ScorerInput) => {
      if (pattern.global) {
        pattern.lastIndex = 0;
      }
      const matches = pattern.test(input.response);
      const passed = shouldMatch ? matches : !matches;

      return {
        score: passed ? 10 : 0,
        reasoning: passed
          ? `Response ${shouldMatch ? "matches" : "does not match"} expected pattern`
          : `Response ${shouldMatch ? "does not match" : "matches"} expected pattern`,
        metadata: {
          pattern: pattern.source,
          flags: pattern.flags,
          matches,
          shouldMatch,
        },
      };
    },
    options.config,
  );
}

/**
 * Create a keyword presence scorer
 */
export function createKeywordScorer(
  id: string,
  name: string,
  options: {
    requiredKeywords?: string[];
    forbiddenKeywords?: string[];
    caseInsensitive?: boolean;
    description?: string;
    config?: ScorerConfig;
  },
): BaseScorer {
  const metadata = createScorerMetadata(id, name, {
    description: options.description ?? `Keyword presence scorer`,
    type: "rule",
    category: "quality",
  });

  const requiredKeywords = options.requiredKeywords ?? [];
  const forbiddenKeywords = options.forbiddenKeywords ?? [];
  const caseInsensitive = options.caseInsensitive ?? true;

  return new FunctionScorer(
    metadata,
    async (input: ScorerInput) => {
      const text = caseInsensitive
        ? input.response.toLowerCase()
        : input.response;

      // Check required keywords
      const foundRequired: string[] = [];
      const missingRequired: string[] = [];

      for (const keyword of requiredKeywords) {
        const searchKeyword = caseInsensitive ? keyword.toLowerCase() : keyword;
        if (text.includes(searchKeyword)) {
          foundRequired.push(keyword);
        } else {
          missingRequired.push(keyword);
        }
      }

      // Check forbidden keywords
      const foundForbidden: string[] = [];

      for (const keyword of forbiddenKeywords) {
        const searchKeyword = caseInsensitive ? keyword.toLowerCase() : keyword;
        if (text.includes(searchKeyword)) {
          foundForbidden.push(keyword);
        }
      }

      // Calculate score
      let score = 10;
      const totalChecks = requiredKeywords.length + forbiddenKeywords.length;

      if (totalChecks > 0) {
        const passedChecks =
          foundRequired.length +
          (forbiddenKeywords.length - foundForbidden.length);
        score = (passedChecks / totalChecks) * 10;
      }

      // Generate reasoning
      const reasons: string[] = [];
      if (missingRequired.length > 0) {
        reasons.push(
          `Missing required keywords: ${missingRequired.join(", ")}`,
        );
      }
      if (foundForbidden.length > 0) {
        reasons.push(`Found forbidden keywords: ${foundForbidden.join(", ")}`);
      }
      if (reasons.length === 0) {
        reasons.push("All keyword requirements satisfied");
      }

      return {
        score,
        reasoning: reasons.join(". "),
        metadata: {
          foundRequired,
          missingRequired,
          foundForbidden,
          totalRequired: requiredKeywords.length,
          totalForbidden: forbiddenKeywords.length,
        },
      };
    },
    options.config,
  );
}

/**
 * Create a length-based scorer
 */
export function createSimpleLengthScorer(
  id: string,
  name: string,
  options: {
    minWords?: number;
    maxWords?: number;
    minChars?: number;
    maxChars?: number;
    description?: string;
    config?: ScorerConfig;
  },
): BaseScorer {
  const metadata = createScorerMetadata(id, name, {
    description: options.description ?? `Length scorer`,
    type: "rule",
    category: "quality",
  });

  return new FunctionScorer(
    metadata,
    async (input: ScorerInput) => {
      const wordCount = input.response
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 0).length;
      const charCount = input.response.length;

      const issues: string[] = [];
      let passed = true;

      if (options.minWords !== undefined && wordCount < options.minWords) {
        issues.push(`Too few words: ${wordCount} < ${options.minWords}`);
        passed = false;
      }

      if (options.maxWords !== undefined && wordCount > options.maxWords) {
        issues.push(`Too many words: ${wordCount} > ${options.maxWords}`);
        passed = false;
      }

      if (options.minChars !== undefined && charCount < options.minChars) {
        issues.push(`Too few characters: ${charCount} < ${options.minChars}`);
        passed = false;
      }

      if (options.maxChars !== undefined && charCount > options.maxChars) {
        issues.push(`Too many characters: ${charCount} > ${options.maxChars}`);
        passed = false;
      }

      return {
        score: passed ? 10 : 0,
        reasoning: passed
          ? `Length within bounds (${wordCount} words, ${charCount} chars)`
          : issues.join("; "),
        metadata: {
          wordCount,
          charCount,
          minWords: options.minWords ?? null,
          maxWords: options.maxWords ?? null,
          minChars: options.minChars ?? null,
          maxChars: options.maxChars ?? null,
        },
      };
    },
    options.config,
  );
}

/**
 * Compose multiple scorers into a single scorer with aggregation
 */
export function composeScorers(
  id: string,
  name: string,
  scorers: BaseScorer[],
  options?: {
    aggregation?: "average" | "min" | "max" | "weighted";
    weights?: number[];
    description?: string;
    config?: ScorerConfig;
  },
): BaseScorer {
  if (scorers.length === 0) {
    throw new Error(
      "composeScorers requires at least one scorer. An empty array would produce NaN/Infinity during aggregation.",
    );
  }

  const metadata = createScorerMetadata(id, name, {
    description:
      options?.description ??
      `Composed scorer with ${scorers.length} sub-scorers`,
    type: "hybrid",
    category: "custom",
  });

  const aggregation = options?.aggregation ?? "average";
  const weights = options?.weights ?? scorers.map(() => 1.0);

  return new FunctionScorer(
    metadata,
    async (input: ScorerInput) => {
      // Run all scorers
      const results = await Promise.all(
        scorers.map((scorer) => scorer.score(input)),
      );

      // Aggregate scores
      let aggregatedScore: number;

      switch (aggregation) {
        case "min":
          aggregatedScore = Math.min(...results.map((r) => r.score));
          break;

        case "max":
          aggregatedScore = Math.max(...results.map((r) => r.score));
          break;

        case "weighted": {
          let totalWeight = 0;
          let weightedSum = 0;
          for (let i = 0; i < results.length; i++) {
            const weight = weights[i] ?? 1.0;
            totalWeight += weight;
            weightedSum += results[i].score * weight;
          }
          aggregatedScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
          break;
        }

        case "average":
        default:
          aggregatedScore =
            results.reduce((sum, r) => sum + r.score, 0) / results.length;
          break;
      }

      // Generate combined reasoning
      const reasoning = results
        .map(
          (r, i) =>
            `${scorers[i].metadata.name}: ${r.score.toFixed(1)}/10 - ${r.reasoning}`,
        )
        .join("; ");

      return {
        score: aggregatedScore,
        reasoning: `Aggregated (${aggregation}): ${reasoning}`,
        metadata: {
          subScores: results.map((r, i) => ({
            scorerId: scorers[i].metadata.id,
            scorerName: scorers[i].metadata.name,
            score: r.score,
            passed: r.passed,
          })),
          aggregationMethod: aggregation,
        },
      };
    },
    options?.config,
  );
}

/**
 * Create a conditional scorer that only runs if a condition is met
 */
export function createConditionalScorer(
  id: string,
  name: string,
  condition: (input: ScorerInput) => boolean,
  scorer: BaseScorer,
  options?: {
    defaultScore?: number;
    defaultReasoning?: string;
    description?: string;
    config?: ScorerConfig;
  },
): BaseScorer {
  const metadata = createScorerMetadata(id, name, {
    description:
      options?.description ??
      `Conditional scorer wrapping ${scorer.metadata.name}`,
    type: scorer.metadata.type,
    category: scorer.metadata.category,
  });

  const defaultScore = options?.defaultScore ?? 10;
  const defaultReasoning =
    options?.defaultReasoning ?? "Condition not met, using default score";

  return new FunctionScorer(
    metadata,
    async (input: ScorerInput) => {
      if (condition(input)) {
        const result = await scorer.score(input);
        return {
          score: result.score,
          reasoning: result.reasoning,
          metadata: {
            conditionMet: true,
            wrappedScorer: scorer.metadata.id,
            ...((result.metadata ?? {}) as JsonObject),
          },
        };
      }

      return {
        score: defaultScore,
        reasoning: defaultReasoning,
        metadata: {
          conditionMet: false,
          wrappedScorer: scorer.metadata.id,
        },
      };
    },
    options?.config,
  );
}

/**
 * Create a scorer that inverts the score (10 - score)
 */
export function createInvertedScorer(
  id: string,
  name: string,
  scorer: BaseScorer,
  options?: {
    description?: string;
    config?: ScorerConfig;
  },
): BaseScorer {
  const metadata = createScorerMetadata(id, name, {
    description:
      options?.description ??
      `Inverted scorer wrapping ${scorer.metadata.name}`,
    type: scorer.metadata.type,
    category: scorer.metadata.category,
  });

  return new FunctionScorer(
    metadata,
    async (input: ScorerInput) => {
      const result = await scorer.score(input);
      const invertedScore = DEFAULT_SCORE_SCALE.max - result.score;

      return {
        score: invertedScore,
        reasoning: `Inverted: ${result.reasoning}`,
        metadata: {
          originalScore: result.score,
          invertedScore,
          wrappedScorer: scorer.metadata.id,
          ...((result.metadata ?? {}) as JsonObject),
        },
      };
    },
    options?.config,
  );
}
