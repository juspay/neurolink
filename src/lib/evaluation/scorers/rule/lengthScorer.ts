/**
 * @file Length Scorer
 * Evaluates response length against configured constraints
 */

import type {
  RuleScorerConfig,
  ScoreResult,
  ScorerInput,
  ScorerMetadata,
  ScorerRule,
} from "../../../types/scorerTypes.js";
import {
  BaseRuleScorer,
  DEFAULT_RULE_SCORER_CONFIG,
} from "./baseRuleScorer.js";

/**
 * Length measurement unit
 */
export type LengthUnit =
  | "words"
  | "characters"
  | "sentences"
  | "paragraphs"
  | "tokens";

/**
 * Length constraint type
 */
export type LengthConstraintType =
  | "exact"
  | "range"
  | "minimum"
  | "maximum"
  | "ratio";

/**
 * Configuration specific to length scoring
 */
export type LengthScorerConfig = RuleScorerConfig & {
  /** Unit of measurement */
  unit?: LengthUnit;
  /** Constraint type */
  constraintType?: LengthConstraintType;
  /** Minimum length (for range/minimum constraints) */
  minLength?: number;
  /** Maximum length (for range/maximum constraints) */
  maxLength?: number;
  /** Exact length (for exact constraint) */
  exactLength?: number;
  /** Tolerance for exact length (as percentage) */
  tolerance?: number;
  /** Compare ratio with query/context length */
  ratioTarget?: number;
  /** Ratio reference: compare against query or context */
  ratioReference?: "query" | "context";
  /** Scoring mode: binary (pass/fail) or proportional */
  scoringMode?: "binary" | "proportional";
};

/**
 * Length measurement result
 */
type LengthMeasurement = {
  words: number;
  characters: number;
  sentences: number;
  paragraphs: number;
  estimatedTokens: number;
};

/**
 * Scorer metadata for length
 */
const LENGTH_METADATA: ScorerMetadata = {
  id: "length",
  name: "Length Validator",
  description:
    "Evaluates response length against configured constraints (words, characters, sentences)",
  type: "rule",
  category: "quality",
  version: "1.0.0",
  defaultConfig: {
    ...DEFAULT_RULE_SCORER_CONFIG,
    threshold: 0.8,
  },
  requiredInputs: ["response"],
  optionalInputs: ["query", "context"],
};

/**
 * LengthScorer evaluates response length against configurable constraints
 */
export class LengthScorer extends BaseRuleScorer {
  private _lengthConfig: LengthScorerConfig;

  constructor(config?: LengthScorerConfig) {
    super(LENGTH_METADATA, config);
    this._lengthConfig = {
      unit: "words",
      constraintType: "range",
      minLength: 10,
      maxLength: 500,
      tolerance: 0.1, // 10% tolerance for exact match
      scoringMode: "proportional",
      ...config,
    };
  }

  /**
   * Get length-specific configuration
   */
  get lengthConfig(): LengthScorerConfig {
    return this._lengthConfig;
  }

  /**
   * Get rules for this scorer
   */
  getRules(): ScorerRule[] {
    const rules: ScorerRule[] = [];
    const constraintType = this._lengthConfig.constraintType ?? "range";

    switch (constraintType) {
      case "minimum":
        rules.push({
          id: "length-minimum",
          description: `Minimum ${this._lengthConfig.unit} check`,
          type: "length" as const,
          params: {
            check: "minimum",
            value: this._lengthConfig.minLength ?? 10,
            unit: this._lengthConfig.unit ?? "words",
          },
          weight: 1.0,
        });
        break;

      case "maximum":
        rules.push({
          id: "length-maximum",
          description: `Maximum ${this._lengthConfig.unit} check`,
          type: "length" as const,
          params: {
            check: "maximum",
            value: this._lengthConfig.maxLength ?? 500,
            unit: this._lengthConfig.unit ?? "words",
          },
          weight: 1.0,
        });
        break;

      case "exact":
        rules.push({
          id: "length-exact",
          description: `Exact ${this._lengthConfig.unit} check`,
          type: "length" as const,
          params: {
            check: "exact",
            value: this._lengthConfig.exactLength ?? 100,
            tolerance: this._lengthConfig.tolerance ?? 0.1,
            unit: this._lengthConfig.unit ?? "words",
          },
          weight: 1.0,
        });
        break;

      case "ratio":
        rules.push({
          id: "length-ratio",
          description: `Length ratio check against ${this._lengthConfig.ratioReference}`,
          type: "length" as const,
          params: {
            check: "ratio",
            target: this._lengthConfig.ratioTarget ?? 1.0,
            reference: this._lengthConfig.ratioReference ?? "query",
            unit: this._lengthConfig.unit ?? "words",
          },
          weight: 1.0,
        });
        break;

      case "range":
      default:
        rules.push({
          id: "length-minimum",
          description: `Minimum ${this._lengthConfig.unit} check`,
          type: "length" as const,
          params: {
            check: "minimum",
            value: this._lengthConfig.minLength ?? 10,
            unit: this._lengthConfig.unit ?? "words",
          },
          weight: 0.5,
        });
        rules.push({
          id: "length-maximum",
          description: `Maximum ${this._lengthConfig.unit} check`,
          type: "length" as const,
          params: {
            check: "maximum",
            value: this._lengthConfig.maxLength ?? 500,
            unit: this._lengthConfig.unit ?? "words",
          },
          weight: 0.5,
        });
        break;
    }

    return rules;
  }

  /**
   * Measure text length in various units
   */
  private _measureLength(text: string): LengthMeasurement {
    return {
      words: this.getWordCount(text),
      characters: this.getCharacterCount(text),
      sentences: this._countSentences(text),
      paragraphs: this._countParagraphs(text),
      estimatedTokens: this._estimateTokens(text),
    };
  }

  /**
   * Get length in the configured unit
   */
  private _getLengthInUnit(text: string, unit: LengthUnit): number {
    const measurement = this._measureLength(text);

    switch (unit) {
      case "words":
        return measurement.words;
      case "characters":
        return measurement.characters;
      case "sentences":
        return measurement.sentences;
      case "paragraphs":
        return measurement.paragraphs;
      case "tokens":
        return measurement.estimatedTokens;
      default:
        return measurement.words;
    }
  }

  /**
   * Count sentences in text
   */
  private _countSentences(text: string): number {
    // Match sentence-ending punctuation followed by space or end of string
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 0);
    return sentences.length;
  }

  /**
   * Count paragraphs in text
   */
  private _countParagraphs(text: string): number {
    // Split by double newlines or paragraph markers
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    return Math.max(paragraphs.length, 1); // At least 1 paragraph if there's text
  }

  /**
   * Estimate token count (rough approximation)
   * GPT-style: ~4 characters per token on average
   */
  private _estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Evaluate a single length rule
   */
  evaluateRule(
    rule: ScorerRule,
    input: ScorerInput,
  ): { passed: boolean; score: number } {
    const check = rule.params.check as string;
    const unit = (rule.params.unit as LengthUnit) ?? "words";
    const responseLength = this._getLengthInUnit(input.response, unit);

    switch (check) {
      case "minimum": {
        const minValue = rule.params.value as number;
        if (responseLength >= minValue) {
          return { passed: true, score: 1.0 };
        }
        // Proportional scoring
        if (this._lengthConfig.scoringMode === "proportional" && minValue > 0) {
          return {
            passed: false,
            score: Math.min(responseLength / minValue, 1.0),
          };
        }
        return { passed: false, score: 0.0 };
      }

      case "maximum": {
        const maxValue = rule.params.value as number;
        if (responseLength <= maxValue) {
          return { passed: true, score: 1.0 };
        }
        // Proportional scoring (inverse)
        if (
          this._lengthConfig.scoringMode === "proportional" &&
          responseLength > 0
        ) {
          return {
            passed: false,
            score: Math.max(0, maxValue / responseLength),
          };
        }
        return { passed: false, score: 0.0 };
      }

      case "exact": {
        const exactValue = rule.params.value as number;
        const tolerance = (rule.params.tolerance as number) ?? 0.1;
        const lowerBound = exactValue * (1 - tolerance);
        const upperBound = exactValue * (1 + tolerance);

        if (responseLength >= lowerBound && responseLength <= upperBound) {
          return { passed: true, score: 1.0 };
        }

        // Proportional scoring based on distance from target
        if (
          this._lengthConfig.scoringMode === "proportional" &&
          exactValue > 0
        ) {
          const distance = Math.abs(responseLength - exactValue) / exactValue;
          return { passed: false, score: Math.max(0, 1 - distance) };
        }
        return { passed: false, score: 0.0 };
      }

      case "ratio": {
        const target = rule.params.target as number;
        const reference = rule.params.reference as "query" | "context";

        let referenceText = "";
        if (reference === "query") {
          referenceText = input.query;
        } else if (reference === "context" && input.context) {
          referenceText = input.context.join(" ");
        }

        if (!referenceText) {
          return { passed: true, score: 1.0 }; // No reference, pass by default
        }

        const referenceLength = this._getLengthInUnit(referenceText, unit);
        if (referenceLength === 0) {
          return { passed: true, score: 1.0 };
        }

        const actualRatio = responseLength / referenceLength;
        const tolerance = this._lengthConfig.tolerance ?? 0.2;

        if (
          actualRatio >= target * (1 - tolerance) &&
          actualRatio <= target * (1 + tolerance)
        ) {
          return { passed: true, score: 1.0 };
        }

        // Proportional scoring
        if (this._lengthConfig.scoringMode === "proportional" && target > 0) {
          const ratioDistance = Math.abs(actualRatio - target) / target;
          return { passed: false, score: Math.max(0, 1 - ratioDistance) };
        }
        return { passed: false, score: 0.0 };
      }

      default:
        return { passed: true, score: 1.0 };
    }
  }

  /**
   * Override score to add detailed length metrics
   */
  async score(input: ScorerInput): Promise<ScoreResult> {
    const result = await super.score(input);

    // Add detailed measurements
    const measurement = this._measureLength(input.response);
    const unit = this._lengthConfig.unit ?? "words";

    return {
      ...result,
      metadata: {
        ...result.metadata,
        lengthMeasurement:
          measurement as unknown as import("../../../types/common.js").JsonObject,
        configuredUnit: unit,
        configuredConstraint: this._lengthConfig.constraintType ?? "range",
        actualLength: this._getLengthInUnit(input.response, unit),
        minLength: this._lengthConfig.minLength ?? null,
        maxLength: this._lengthConfig.maxLength ?? null,
        exactLength: this._lengthConfig.exactLength ?? null,
      },
    };
  }
}

/**
 * Factory function for creating LengthScorer instances
 */
export async function createLengthScorer(
  config?: LengthScorerConfig,
): Promise<LengthScorer> {
  return new LengthScorer(config);
}

/**
 * Pre-configured length scorer presets
 */
export const LengthScorerPresets = {
  /** Short response (50-150 words) */
  short: (): LengthScorer =>
    new LengthScorer({
      unit: "words",
      constraintType: "range",
      minLength: 50,
      maxLength: 150,
    }),

  /** Medium response (100-300 words) */
  medium: (): LengthScorer =>
    new LengthScorer({
      unit: "words",
      constraintType: "range",
      minLength: 100,
      maxLength: 300,
    }),

  /** Long response (200-500 words) */
  long: (): LengthScorer =>
    new LengthScorer({
      unit: "words",
      constraintType: "range",
      minLength: 200,
      maxLength: 500,
    }),

  /** Concise response (max 100 words) */
  concise: (): LengthScorer =>
    new LengthScorer({
      unit: "words",
      constraintType: "maximum",
      maxLength: 100,
    }),

  /** Detailed response (min 300 words) */
  detailed: (): LengthScorer =>
    new LengthScorer({
      unit: "words",
      constraintType: "minimum",
      minLength: 300,
    }),

  /** Tweet-length (max 280 characters) */
  tweet: (): LengthScorer =>
    new LengthScorer({
      unit: "characters",
      constraintType: "maximum",
      maxLength: 280,
    }),
} as const;
