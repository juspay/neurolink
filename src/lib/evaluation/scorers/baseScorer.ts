/**
 * @file Abstract base scorer class providing common functionality
 * All scorers extend this class for consistent behavior
 */

import type { JsonObject } from "../../types/common.js";
import type {
  ScoreResult,
  Scorer,
  ScorerConfig,
  ScorerInput,
  ScorerMetadata,
  ScoreScale,
} from "../../types/scorerTypes.js";
import { withTimeout, ErrorFactory } from "../../utils/errorHandling.js";
import { logger } from "../../utils/logger.js";

/**
 * Default score scale (0-10)
 */
export const DEFAULT_SCORE_SCALE: ScoreScale = {
  min: 0,
  max: 10,
  precision: 2,
};

/**
 * Default scorer configuration
 */
export const DEFAULT_SCORER_CONFIG: ScorerConfig = {
  enabled: true,
  threshold: 0.7,
  weight: 1.0,
  timeout: 30000,
  retries: 2,
};

/**
 * Abstract base class for all scorers
 * Provides common functionality and enforces interface compliance
 */
export abstract class BaseScorer implements Scorer {
  protected _config: ScorerConfig;
  protected _metadata: ScorerMetadata;

  constructor(metadata: ScorerMetadata, config?: ScorerConfig) {
    this._metadata = metadata;
    this._config = {
      ...DEFAULT_SCORER_CONFIG,
      ...metadata.defaultConfig,
      ...config,
    };
  }

  /**
   * Get scorer metadata
   */
  get metadata(): ScorerMetadata {
    return this._metadata;
  }

  /**
   * Get current configuration
   */
  get config(): ScorerConfig {
    return this._config;
  }

  /**
   * Main scoring method - must be implemented by subclasses
   */
  abstract score(input: ScorerInput): Promise<ScoreResult>;

  /**
   * Validate input has required fields
   */
  validateInput(input: ScorerInput): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const field of this._metadata.requiredInputs) {
      const value = input[field as keyof ScorerInput];
      if (value === undefined || value === null) {
        errors.push(`Missing required input: ${field}`);
      }
    }

    // Check for empty strings in required text fields
    if (
      this._metadata.requiredInputs.includes("query") &&
      typeof input.query === "string" &&
      !input.query.trim()
    ) {
      errors.push("Query cannot be empty");
    }
    if (
      this._metadata.requiredInputs.includes("response") &&
      typeof input.response === "string" &&
      !input.response.trim()
    ) {
      errors.push("Response cannot be empty");
    }

    // Check context array is not empty if required
    if (
      this._metadata.requiredInputs.includes("context") &&
      input.context !== undefined
    ) {
      if (!Array.isArray(input.context) || input.context.length === 0) {
        errors.push("Context must be a non-empty array");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update configuration
   */
  configure(config: Partial<ScorerConfig>): void {
    this._config = {
      ...this._config,
      ...config,
    };
    logger.debug(`Scorer ${this._metadata.id} reconfigured`, {
      config: this._config,
    });
  }

  /**
   * Normalize a score to 0-1 scale
   */
  protected normalizeScore(
    score: number,
    scale: ScoreScale = DEFAULT_SCORE_SCALE,
  ): number {
    // Validate inputs are finite
    if (
      !Number.isFinite(score) ||
      !Number.isFinite(scale.min) ||
      !Number.isFinite(scale.max)
    ) {
      return 0;
    }
    // Guard against zero denominator
    const denominator = scale.max - scale.min;
    if (denominator === 0) {
      return 0;
    }
    // Clamp score to scale bounds
    const clampedScore = Math.max(scale.min, Math.min(scale.max, score));
    const normalized = (clampedScore - scale.min) / denominator;
    return Math.max(0, Math.min(1, normalized));
  }

  /**
   * Convert normalized score back to scale
   */
  protected denormalizeScore(
    normalizedScore: number,
    scale: ScoreScale = DEFAULT_SCORE_SCALE,
  ): number {
    const clamped = Math.max(0, Math.min(1, normalizedScore));
    return scale.min + clamped * (scale.max - scale.min);
  }

  /**
   * Check if score passes threshold
   */
  protected checkThreshold(normalizedScore: number): boolean {
    const threshold = this._config.threshold ?? 0.7;
    return normalizedScore >= threshold;
  }

  /**
   * Create a standardized score result
   */
  protected createScoreResult(
    score: number,
    reasoning: string,
    options: {
      scale?: ScoreScale;
      confidence?: number;
      metadata?: JsonObject;
      error?: string;
    } = {},
  ): ScoreResult {
    const scale = options.scale ?? DEFAULT_SCORE_SCALE;
    const safeScore = Number.isFinite(score) ? score : scale.min;
    const clampedScore = Math.max(scale.min, Math.min(scale.max, safeScore));
    const normalizedScore = this.normalizeScore(clampedScore, scale);

    // Ensure no NaN leaks into published scores
    const finalScore = Number.isFinite(clampedScore) ? clampedScore : 0;
    const finalNormalized = Number.isFinite(normalizedScore)
      ? normalizedScore
      : 0;

    return {
      scorerId: this._metadata.id,
      scorerName: this._metadata.name,
      score: Number(finalScore.toFixed(scale.precision)),
      normalizedScore: Number(finalNormalized.toFixed(4)),
      scale,
      reasoning,
      passed: this.checkThreshold(finalNormalized),
      threshold: this._config.threshold ?? 0.7,
      confidence:
        options.confidence === undefined
          ? undefined
          : Number.isFinite(options.confidence)
            ? Math.max(0, Math.min(1, options.confidence))
            : 0,
      metadata: options.metadata,
      computeTime: 0, // Set by caller via executeWithTiming
      error: options.error,
    };
  }

  /**
   * Create an error score result
   */
  protected createErrorResult(error: Error | string): ScoreResult {
    const errorMessage = error instanceof Error ? error.message : error;
    return {
      scorerId: this._metadata.id,
      scorerName: this._metadata.name,
      score: 0,
      normalizedScore: 0,
      scale: DEFAULT_SCORE_SCALE,
      reasoning: `Scoring failed: ${errorMessage}`,
      passed: false,
      threshold: this._config.threshold ?? 0.7,
      computeTime: 0,
      error: errorMessage,
    };
  }

  /**
   * Execute scoring with timing and error handling
   */
  protected async executeWithTiming(
    scoringFn: () => Promise<Omit<ScoreResult, "computeTime">>,
  ): Promise<ScoreResult> {
    const startTime = Date.now();

    try {
      const result = await scoringFn();
      return {
        ...result,
        computeTime: Date.now() - startTime,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      logger.error(`Scorer ${this._metadata.id} failed`, {
        error: errorMessage,
      });

      return {
        ...this.createErrorResult(errorMessage),
        computeTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute scoring with timeout
   */
  protected async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    operationName: string,
  ): Promise<T> {
    return withTimeout(
      fn(),
      timeoutMs,
      ErrorFactory.evaluationTimeout(operationName, timeoutMs),
    );
  }

  /**
   * Execute with retry logic
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries?: number,
  ): Promise<T> {
    const maxRetries = retries ?? this._config.retries ?? 2;
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < maxRetries) {
          logger.debug(
            `Scorer ${this._metadata.id} retry ${attempt + 1}/${maxRetries}`,
            { error: lastError.message },
          );
          // Exponential backoff
          await new Promise((resolve) =>
            setTimeout(resolve, 2 ** attempt * 1000),
          );
        }
      }
    }

    throw lastError ?? new Error("Operation failed after retries");
  }
}
