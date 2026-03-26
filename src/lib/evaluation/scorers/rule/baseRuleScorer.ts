/**
 * @file Base class for all rule-based scorers
 * Provides common functionality for rule evaluation
 */

import type {
  RuleResult,
  RuleScorer,
  RuleScorerConfig,
  ScoreResult,
  ScorerInput,
  ScorerMetadata,
  ScorerRule,
} from "../../../types/scorerTypes.js";
import { logger } from "../../../utils/logger.js";
import { BaseScorer, DEFAULT_SCORE_SCALE } from "../baseScorer.js";

/**
 * Default rule scorer configuration
 */
export const DEFAULT_RULE_SCORER_CONFIG: RuleScorerConfig = {
  enabled: true,
  threshold: 0.7,
  weight: 1.0,
  timeout: 1000,
  retries: 0,
  ruleCombination: "all",
};

/**
 * Abstract base class for rule-based scorers
 */
export abstract class BaseRuleScorer extends BaseScorer implements RuleScorer {
  protected _ruleConfig: RuleScorerConfig;

  constructor(metadata: ScorerMetadata, config?: RuleScorerConfig) {
    super(metadata, config);
    this._ruleConfig = {
      ...DEFAULT_RULE_SCORER_CONFIG,
      ...metadata.defaultConfig,
      ...config,
    };
  }

  /**
   * Get rule-specific configuration
   */
  get ruleConfig(): RuleScorerConfig {
    return this._ruleConfig;
  }

  /**
   * Get all rules for this scorer - must be implemented by subclasses
   */
  abstract getRules(): ScorerRule[];

  /**
   * Evaluate a single rule - must be implemented by subclasses
   */
  abstract evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number };

  /**
   * Main scoring method
   */
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
        const rules = this.getRules();

        if (rules.length === 0) {
          return this.createScoreResult(
            10,
            "No rules configured - passing by default",
          );
        }

        // Evaluate all rules
        const results = rules.map((rule) => ({
          rule,
          result: this.evaluateRule(rule, input),
        }));

        // Combine results based on configuration
        const combinedScore = this.combineRuleResults(
          results.map((r) => ({
            ruleId: r.rule.id,
            passed: r.result.passed,
            score: r.result.score,
          })),
          rules,
        );

        // Generate reasoning
        const reasoning = this.generateReasoning(results);

        return this.createScoreResult(combinedScore, reasoning, {
          metadata: {
            ruleResults: results.map((r) => ({
              ruleId: r.rule.id,
              ruleDescription: r.rule.description,
              passed: r.result.passed,
              score: r.result.score,
            })),
            ruleCount: rules.length,
            passedCount: results.filter((r) => r.result.passed).length,
            combinationMethod: this._ruleConfig.ruleCombination ?? "all",
          },
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(`Rule scorer ${this._metadata.id} failed`, {
          error: errorMessage,
        });
        return this.createErrorResult(errorMessage);
      }
    });
  }

  /**
   * Combine rule results based on configuration
   */
  protected combineRuleResults(
    results: RuleResult[],
    rules: ScorerRule[],
  ): number {
    const combination = this._ruleConfig.ruleCombination ?? "all";

    switch (combination) {
      case "all": {
        // All rules must pass for full score
        const passedCount = results.filter((r) => r.passed).length;
        return (passedCount / results.length) * DEFAULT_SCORE_SCALE.max;
      }

      case "any": {
        // Any rule passing gives partial credit
        const maxScore = Math.max(...results.map((r) => r.score));
        return maxScore * DEFAULT_SCORE_SCALE.max;
      }

      case "weighted": {
        // Weight-based combination
        let totalWeight = 0;
        let weightedScore = 0;

        for (let i = 0; i < results.length; i++) {
          const rule = rules[i];
          const weight = rule.weight ?? 1.0;
          totalWeight += weight;
          weightedScore += results[i].score * weight;
        }

        return totalWeight > 0
          ? (weightedScore / totalWeight) * DEFAULT_SCORE_SCALE.max
          : 0;
      }

      default:
        return (
          (results.filter((r) => r.passed).length / results.length) *
          DEFAULT_SCORE_SCALE.max
        );
    }
  }

  /**
   * Generate reasoning from rule results
   */
  protected generateReasoning(
    results: Array<{
      rule: ScorerRule;
      result: { passed: boolean; score: number };
    }>,
  ): string {
    const passed = results.filter((r) => r.result.passed);
    const failed = results.filter((r) => !r.result.passed);

    const parts: string[] = [];

    if (passed.length > 0) {
      parts.push(
        `${passed.length} rule(s) passed: ${passed.map((r) => r.rule.id).join(", ")}`,
      );
    }

    if (failed.length > 0) {
      parts.push(
        `${failed.length} rule(s) failed: ${failed.map((r) => r.rule.id).join(", ")}`,
      );
    }

    return parts.join(". ");
  }

  /**
   * Helper: Check if text matches a regex pattern
   */
  protected matchesRegex(text: string, pattern: string, flags = "gi"): boolean {
    if (pattern.length > 200) {
      logger.warn(
        `[BaseRuleScorer] Regex pattern too long (${pattern.length} chars), skipping`,
      );
      return false;
    }
    try {
      const regex = new RegExp(pattern, flags);
      return regex.test(text);
    } catch {
      logger.warn(
        `[BaseRuleScorer] Invalid regex pattern: ${pattern.substring(0, 50)}`,
      );
      return false;
    }
  }

  /**
   * Helper: Check if text contains keyword with word boundaries
   */
  protected containsKeyword(
    text: string,
    keyword: string,
    caseInsensitive = true,
  ): boolean {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const flags = caseInsensitive ? "gi" : "g";
    const regex = new RegExp(`\\b${escapedKeyword}\\b`, flags);
    return regex.test(text);
  }

  /**
   * Helper: Count occurrences of a pattern
   */
  protected countOccurrences(
    text: string,
    pattern: string,
    caseInsensitive = true,
  ): number {
    if (pattern.length > 200) {
      logger.warn(
        `[BaseRuleScorer] Regex pattern too long (${pattern.length} chars), skipping`,
      );
      return 0;
    }
    try {
      const flags = caseInsensitive ? "gi" : "g";
      const regex = new RegExp(pattern, flags);
      const matches = text.match(regex);
      return matches ? matches.length : 0;
    } catch {
      logger.warn(
        `[BaseRuleScorer] Invalid regex pattern: ${pattern.substring(0, 50)}`,
      );
      return 0;
    }
  }

  /**
   * Helper: Get word count
   */
  protected getWordCount(text: string): number {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
  }

  /**
   * Helper: Get character count (excluding whitespace)
   */
  protected getCharacterCount(text: string, includeWhitespace = true): number {
    if (includeWhitespace) {
      return text.length;
    }
    return text.replace(/\s/g, "").length;
  }

  /**
   * Helper: Check text length is within bounds
   */
  protected isWithinLengthBounds(
    text: string,
    minWords?: number,
    maxWords?: number,
    minChars?: number,
    maxChars?: number,
  ): { passed: boolean; reason: string } {
    const wordCount = this.getWordCount(text);
    const charCount = text.length;

    if (minWords !== undefined && wordCount < minWords) {
      return {
        passed: false,
        reason: `Word count ${wordCount} is below minimum ${minWords}`,
      };
    }

    if (maxWords !== undefined && wordCount > maxWords) {
      return {
        passed: false,
        reason: `Word count ${wordCount} exceeds maximum ${maxWords}`,
      };
    }

    if (minChars !== undefined && charCount < minChars) {
      return {
        passed: false,
        reason: `Character count ${charCount} is below minimum ${minChars}`,
      };
    }

    if (maxChars !== undefined && charCount > maxChars) {
      return {
        passed: false,
        reason: `Character count ${charCount} exceeds maximum ${maxChars}`,
      };
    }

    return { passed: true, reason: "Length within acceptable bounds" };
  }
}
