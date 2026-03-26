/**
 * @file Scorer Builder
 * Fluent builder API for creating custom scorers
 */

import type {
  ScorerCategory,
  ScorerConfig,
  ScorerInput,
  ScorerRule,
  ScorerType,
} from "../../types/scorerTypes.js";
import type { BaseScorer } from "./baseScorer.js";
import {
  composeScorers,
  createFunctionScorer,
  type ScorerFunction,
} from "./customScorerUtils.js";

/**
 * Fluent builder for creating custom scorers
 */
export class ScorerBuilder {
  private _id: string;
  private _name: string;
  private _description?: string;
  private _type: ScorerType = "rule";
  private _category: ScorerCategory = "custom";
  private _version = "1.0.0";
  private _requiredInputs: (keyof ScorerInput)[] = ["response"];
  private _optionalInputs: (keyof ScorerInput)[] = [
    "query",
    "context",
    "groundTruth",
  ];
  private _threshold = 0.7;
  private _weight = 1.0;
  private _timeout = 5000;
  private _retries = 0;
  private _scorerFn?: ScorerFunction;
  private _rules: ScorerRule[] = [];
  private _subScorers: BaseScorer[] = [];
  private _aggregation: "average" | "min" | "max" | "weighted" = "average";
  private _subScorerWeights: number[] = [];

  constructor(id: string, name: string) {
    this._id = id;
    this._name = name;
  }

  /**
   * Create a new scorer builder
   */
  static create(id: string, name: string): ScorerBuilder {
    return new ScorerBuilder(id, name);
  }

  /**
   * Set scorer description
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Set scorer type
   */
  type(type: ScorerType): this {
    this._type = type;
    return this;
  }

  /**
   * Set scorer category
   */
  category(category: ScorerCategory): this {
    this._category = category;
    return this;
  }

  /**
   * Set scorer version
   */
  version(version: string): this {
    this._version = version;
    return this;
  }

  /**
   * Set required inputs
   */
  requireInputs(...inputs: (keyof ScorerInput)[]): this {
    this._requiredInputs = inputs;
    return this;
  }

  /**
   * Set optional inputs
   */
  optionalInputs(...inputs: (keyof ScorerInput)[]): this {
    this._optionalInputs = inputs;
    return this;
  }

  /**
   * Set pass/fail threshold
   */
  threshold(threshold: number): this {
    this._threshold = threshold;
    return this;
  }

  /**
   * Set weight for aggregation
   */
  weight(weight: number): this {
    this._weight = weight;
    return this;
  }

  /**
   * Set execution timeout
   */
  timeout(ms: number): this {
    this._timeout = ms;
    return this;
  }

  /**
   * Set retry count
   */
  retries(count: number): this {
    this._retries = count;
    return this;
  }

  /**
   * Set the scoring function
   */
  scoringFunction(fn: ScorerFunction): this {
    this._scorerFn = fn;
    return this;
  }

  /**
   * Add a sub-scorer for composition
   */
  addScorer(scorer: BaseScorer, weight?: number): this {
    this._subScorers.push(scorer);
    this._subScorerWeights.push(weight ?? 1.0);
    return this;
  }

  /**
   * Set aggregation method for composed scorers
   */
  aggregateWith(method: "average" | "min" | "max" | "weighted"): this {
    this._aggregation = method;
    return this;
  }

  /**
   * Add a regex check rule
   */
  matchesPattern(
    pattern: string | RegExp,
    options?: { id?: string; weight?: number },
  ): this {
    const patternStr = typeof pattern === "string" ? pattern : pattern.source;
    const flags = typeof pattern === "string" ? "gi" : pattern.flags;

    // Validate pattern safety (same guards as regex scorer utilities)
    if (patternStr.length > 200) {
      throw new Error("Regex pattern exceeds maximum length of 200 characters");
    }
    if (/(\+|\*|\{)\S*(\+|\*|\{)/.test(patternStr)) {
      throw new Error(
        "Regex pattern contains nested quantifiers which may cause catastrophic backtracking",
      );
    }
    // Pre-compile to validate the pattern at build time
    try {
      new RegExp(patternStr, flags);
    } catch (e) {
      throw new Error(
        `Invalid regex pattern: ${e instanceof Error ? e.message : String(e)}`,
        { cause: e },
      );
    }

    this._rules.push({
      id: options?.id ?? `regex-${this._rules.length}`,
      description: `Match pattern: ${patternStr}`,
      type: "regex",
      params: {
        pattern: patternStr,
        flags,
      },
      weight: options?.weight ?? 1.0,
    });
    return this;
  }

  /**
   * Add a keyword check rule
   */
  containsKeyword(
    keyword: string,
    options?: { id?: string; weight?: number },
  ): this {
    this._rules.push({
      id: options?.id ?? `keyword-${this._rules.length}`,
      description: `Contains keyword: ${keyword}`,
      type: "keyword",
      params: {
        keyword,
        caseInsensitive: true,
      },
      weight: options?.weight ?? 1.0,
    });
    return this;
  }

  /**
   * Add a length check rule
   */
  hasLength(options: {
    minWords?: number;
    maxWords?: number;
    minChars?: number;
    maxChars?: number;
    id?: string;
    weight?: number;
  }): this {
    this._rules.push({
      id: options.id ?? `length-${this._rules.length}`,
      description: "Length check",
      type: "length",
      params: {
        minWords: options.minWords ?? null,
        maxWords: options.maxWords ?? null,
        minChars: options.minChars ?? null,
        maxChars: options.maxChars ?? null,
      },
      weight: options.weight ?? 1.0,
    });
    return this;
  }

  /**
   * Add a custom rule
   */
  customRule(rule: ScorerRule): this {
    this._rules.push(rule);
    return this;
  }

  /**
   * Build the scorer
   */
  build(): BaseScorer {
    // If we have sub-scorers, create a composed scorer
    if (this._subScorers.length > 0) {
      return composeScorers(this._id, this._name, this._subScorers, {
        aggregation: this._aggregation,
        weights: this._subScorerWeights,
        description: this._description,
        config: this._buildConfig(),
      });
    }

    // If we have a scoring function, use it
    if (this._scorerFn) {
      return createFunctionScorer(this._id, this._name, this._scorerFn, {
        type: this._type,
        version: this._version,
        requiredInputs: this._requiredInputs,
        optionalInputs: this._optionalInputs,
        description: this._description,
        category: this._category,
        config: this._buildConfig(),
      });
    }

    // If we have rules, create a rule-based scorer
    if (this._rules.length > 0) {
      return this._buildRuleScorer();
    }

    // Default: return a pass-through scorer
    return createFunctionScorer(
      this._id,
      this._name,
      async () => ({
        score: 10,
        reasoning: "No scoring logic defined - passing by default",
      }),
      {
        type: this._type,
        version: this._version,
        requiredInputs: this._requiredInputs,
        optionalInputs: this._optionalInputs,
        description: this._description,
        category: this._category,
        config: this._buildConfig(),
      },
    );
  }

  /**
   * Build configuration object
   */
  private _buildConfig(): ScorerConfig {
    return {
      enabled: true,
      threshold: this._threshold,
      weight: this._weight,
      timeout: this._timeout,
      retries: this._retries,
    };
  }

  /**
   * Build a rule-based scorer from accumulated rules
   */
  private _buildRuleScorer(): BaseScorer {
    const rules = this._rules;
    const config = this._buildConfig();

    return createFunctionScorer(
      this._id,
      this._name,
      async (input: ScorerInput) => {
        const results: Array<{
          rule: ScorerRule;
          passed: boolean;
          score: number;
        }> = [];

        for (const rule of rules) {
          const result = this._evaluateRule(rule, input);
          results.push({ rule, ...result });
        }

        // Calculate weighted score
        let totalWeight = 0;
        let weightedScore = 0;

        for (const result of results) {
          const weight = result.rule.weight ?? 1.0;
          totalWeight += weight;
          weightedScore += result.score * weight;
        }

        const finalScore =
          totalWeight > 0 ? (weightedScore / totalWeight) * 10 : 10;
        const passedCount = results.filter((r) => r.passed).length;

        return {
          score: finalScore,
          reasoning: `${passedCount}/${rules.length} rules passed`,
          metadata: {
            ruleResults: results.map((r) => ({
              ruleId: r.rule.id,
              passed: r.passed,
              score: r.score,
            })),
          },
        };
      },
      {
        type: this._type,
        version: this._version,
        requiredInputs: this._requiredInputs,
        optionalInputs: this._optionalInputs,
        description: this._description,
        category: this._category,
        config,
      },
    );
  }

  /**
   * Evaluate a single rule
   */
  private _evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number } {
    switch (rule.type) {
      case "regex": {
        let regex: RegExp;
        try {
          regex = new RegExp(
            rule.params.pattern as string,
            (rule.params.flags as string) ?? "i",
          );
        } catch {
          return { passed: false, score: 0.0 };
        }
        if (regex.global) {
          regex.lastIndex = 0;
        }
        const matches = regex.test(input.response);
        return { passed: matches, score: matches ? 1.0 : 0.0 };
      }

      case "keyword": {
        const keyword = rule.params.keyword as string;
        const caseInsensitive = rule.params.caseInsensitive as boolean;
        const text = caseInsensitive
          ? input.response.toLowerCase()
          : input.response;
        const search = caseInsensitive ? keyword.toLowerCase() : keyword;
        const found = text.includes(search);
        return { passed: found, score: found ? 1.0 : 0.0 };
      }

      case "length": {
        const wordCount = input.response
          .trim()
          .split(/\s+/)
          .filter((w) => w.length > 0).length;
        const charCount = input.response.length;

        const minWords = rule.params.minWords as number | null;
        const maxWords = rule.params.maxWords as number | null;
        const minChars = rule.params.minChars as number | null;
        const maxChars = rule.params.maxChars as number | null;

        let passed = true;
        if (minWords !== null && wordCount < minWords) {
          passed = false;
        }
        if (maxWords !== null && wordCount > maxWords) {
          passed = false;
        }
        if (minChars !== null && charCount < minChars) {
          passed = false;
        }
        if (maxChars !== null && charCount > maxChars) {
          passed = false;
        }

        return { passed, score: passed ? 1.0 : 0.0 };
      }

      case "custom": {
        // Execute custom evaluator if provided
        if (
          rule.params?.evaluate &&
          typeof rule.params.evaluate === "function"
        ) {
          try {
            const customResult = (
              rule.params.evaluate as (input: ScorerInput) => {
                passed: boolean;
                score: number;
              }
            )(input);
            if (
              typeof customResult?.passed === "boolean" &&
              typeof customResult?.score === "number"
            ) {
              return customResult;
            }
          } catch {
            return { passed: false, score: 0.0 };
          }
        }
        // No evaluator provided - pass by default with warning
        return { passed: true, score: 1.0 };
      }

      default:
        return { passed: true, score: 1.0 };
    }
  }
}

/**
 * Quick builder factory functions
 */
export const Scorers = {
  /**
   * Create a new scorer builder
   */
  create: (id: string, name: string) => ScorerBuilder.create(id, name),

  /**
   * Create a simple pass/fail scorer based on a condition
   */
  passIf: (
    id: string,
    name: string,
    condition: (input: ScorerInput) => boolean,
  ) =>
    ScorerBuilder.create(id, name).scoringFunction(async (input) => ({
      score: condition(input) ? 10 : 0,
      reasoning: condition(input) ? "Condition passed" : "Condition failed",
    })),

  /**
   * Create a scorer that checks for required content
   */
  requiresContent: (id: string, name: string, keywords: string[]) => {
    const builder = ScorerBuilder.create(id, name).category("quality");
    for (const keyword of keywords) {
      builder.containsKeyword(keyword);
    }
    return builder;
  },

  /**
   * Create a scorer with length constraints
   */
  withLength: (
    id: string,
    name: string,
    options: {
      minWords?: number;
      maxWords?: number;
      minChars?: number;
      maxChars?: number;
    },
  ) => ScorerBuilder.create(id, name).category("quality").hasLength(options),

  /**
   * Create a scorer that combines multiple scorers
   */
  combine: (id: string, name: string, scorers: BaseScorer[]) => {
    const builder = ScorerBuilder.create(id, name).category("custom");
    for (const scorer of scorers) {
      builder.addScorer(scorer);
    }
    return builder;
  },
};
