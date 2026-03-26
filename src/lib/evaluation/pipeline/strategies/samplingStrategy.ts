/**
 * @file Sampling Strategy
 * Configurable sampling for cost-efficient evaluation
 */

import type {
  SamplingConfig,
  SamplingContext,
  SamplingDecision,
} from "../../../types/scorerTypes.js";

/**
 * Default sampling configuration
 */
export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  rate: 1.0, // 100% sampling by default
  alwaysEvaluate: {
    errors: true,
  },
  adaptive: {
    enabled: false,
    qualityThreshold: 0.7,
    minRate: 0.1,
    maxRate: 1.0,
  },
};

/**
 * Sampling strategy for evaluation
 */
export class SamplingStrategy {
  private _config: SamplingConfig;
  private _recentScores: number[] = [];
  private _currentRate: number;
  private _maxRecentScores = 100;

  constructor(config: Partial<SamplingConfig> = {}) {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const rawRate = config.rate ?? DEFAULT_SAMPLING_CONFIG.rate;
    const rawMinRate =
      config.adaptive?.minRate ?? DEFAULT_SAMPLING_CONFIG.adaptive!.minRate;
    const rawMaxRate =
      config.adaptive?.maxRate ?? DEFAULT_SAMPLING_CONFIG.adaptive!.maxRate;
    const minRate = clamp01(Math.min(rawMinRate, rawMaxRate));
    const maxRate = clamp01(Math.max(rawMinRate, rawMaxRate));

    this._config = {
      ...DEFAULT_SAMPLING_CONFIG,
      ...config,
      rate: clamp01(rawRate),
      alwaysEvaluate: {
        ...DEFAULT_SAMPLING_CONFIG.alwaysEvaluate,
        ...(config.alwaysEvaluate ?? {}),
      },
      adaptive: {
        enabled:
          config.adaptive?.enabled ?? DEFAULT_SAMPLING_CONFIG.adaptive!.enabled,
        qualityThreshold: clamp01(
          config.adaptive?.qualityThreshold ??
            DEFAULT_SAMPLING_CONFIG.adaptive!.qualityThreshold,
        ),
        minRate,
        maxRate,
      },
    };
    this._currentRate = this._config.rate;
  }

  /**
   * Get current sampling configuration
   */
  get config(): SamplingConfig {
    return this._config;
  }

  /**
   * Get current sampling rate
   */
  get currentRate(): number {
    return this._currentRate;
  }

  /**
   * Decide whether to sample a request
   */
  shouldSample(context?: SamplingContext): SamplingDecision {
    // Always evaluate errors
    if (context?.hasError && this._config.alwaysEvaluate?.errors) {
      return {
        shouldSample: true,
        reason: "Always evaluate errors",
        currentRate: this._currentRate,
      };
    }

    // Always evaluate specific users
    if (
      context?.userId &&
      this._config.alwaysEvaluate?.users?.includes(context.userId)
    ) {
      return {
        shouldSample: true,
        reason: `Always evaluate user: ${context.userId}`,
        currentRate: this._currentRate,
      };
    }

    // Always evaluate specific tags
    if (context?.tags && this._config.alwaysEvaluate?.tags) {
      const matchingTags = context.tags.filter((tag) =>
        this._config.alwaysEvaluate?.tags?.includes(tag),
      );
      if (matchingTags.length > 0) {
        return {
          shouldSample: true,
          reason: `Always evaluate tags: ${matchingTags.join(", ")}`,
          currentRate: this._currentRate,
        };
      }
    }

    // Random sampling based on current rate
    const random = Math.random();
    const shouldSample = random < this._currentRate;

    return {
      shouldSample,
      reason: shouldSample
        ? `Sampled at ${(this._currentRate * 100).toFixed(1)}% rate`
        : `Not sampled (rate: ${(this._currentRate * 100).toFixed(1)}%)`,
      currentRate: this._currentRate,
    };
  }

  /**
   * Record a score for adaptive sampling
   */
  recordScore(score: number): void {
    if (!Number.isFinite(score)) {
      return;
    }

    const boundedScore = Math.max(0, Math.min(10, score));
    this._recentScores.push(boundedScore);

    // Keep only recent scores
    if (this._recentScores.length > this._maxRecentScores) {
      this._recentScores.shift();
    }

    // Update adaptive rate if enabled
    if (this._config.adaptive?.enabled) {
      this._updateAdaptiveRate();
    }
  }

  /**
   * Update sampling rate based on recent quality
   */
  private _updateAdaptiveRate(): void {
    if (!this._config.adaptive?.enabled || this._recentScores.length < 10) {
      return;
    }

    const adaptive = this._config.adaptive;
    const avgScore =
      this._recentScores.reduce((sum, s) => sum + s, 0) /
      this._recentScores.length;

    // Normalize to 0-1 scale (assuming 0-10 scores)
    const normalizedAvg = avgScore / 10;

    if (normalizedAvg < adaptive.qualityThreshold) {
      // Low quality - increase sampling rate
      this._currentRate = Math.min(adaptive.maxRate, this._currentRate * 1.2);
    } else {
      // High quality - can decrease sampling rate
      this._currentRate = Math.max(adaptive.minRate, this._currentRate * 0.9);
    }
  }

  /**
   * Reset sampling state
   */
  reset(): void {
    this._recentScores = [];
    this._currentRate = this._config.rate;
  }

  /**
   * Update sampling configuration
   */
  configure(config: Partial<SamplingConfig>): void {
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

    const rawRate = config.rate ?? this._config.rate;
    const rawMinRate =
      config.adaptive?.minRate ?? this._config.adaptive!.minRate;
    const rawMaxRate =
      config.adaptive?.maxRate ?? this._config.adaptive!.maxRate;
    const minRate = clamp01(Math.min(rawMinRate, rawMaxRate));
    const maxRate = clamp01(Math.max(rawMinRate, rawMaxRate));

    this._config = {
      ...this._config,
      ...config,
      rate: clamp01(rawRate),
      alwaysEvaluate: {
        ...this._config.alwaysEvaluate,
        ...(config.alwaysEvaluate ?? {}),
      },
      adaptive: {
        enabled: config.adaptive?.enabled ?? this._config.adaptive!.enabled,
        qualityThreshold: clamp01(
          config.adaptive?.qualityThreshold ??
            this._config.adaptive!.qualityThreshold,
        ),
        minRate,
        maxRate,
      },
    };
    this._currentRate = this._config.rate;
  }

  /**
   * Get sampling statistics
   */
  getStats(): {
    currentRate: number;
    recentScoresCount: number;
    averageScore: number | null;
  } {
    const avgScore =
      this._recentScores.length > 0
        ? this._recentScores.reduce((sum, s) => sum + s, 0) /
          this._recentScores.length
        : null;

    return {
      currentRate: this._currentRate,
      recentScoresCount: this._recentScores.length,
      averageScore: avgScore,
    };
  }
}

/**
 * Create a sampling strategy
 */
export function createSamplingStrategy(
  config?: Partial<SamplingConfig>,
): SamplingStrategy {
  return new SamplingStrategy(config);
}

/**
 * Pre-configured sampling strategies
 */
export const SamplingStrategies = {
  /** Evaluate everything (default) */
  all: () => new SamplingStrategy({ rate: 1.0 }),

  /** Evaluate 50% of requests */
  half: () => new SamplingStrategy({ rate: 0.5 }),

  /** Evaluate 10% of requests */
  light: () => new SamplingStrategy({ rate: 0.1 }),

  /** Adaptive sampling based on quality */
  adaptive: () =>
    new SamplingStrategy({
      rate: 0.5,
      adaptive: {
        enabled: true,
        qualityThreshold: 0.7,
        minRate: 0.1,
        maxRate: 1.0,
      },
    }),

  /** Only evaluate errors and specific conditions */
  errorsOnly: () =>
    new SamplingStrategy({
      rate: 0.0,
      alwaysEvaluate: {
        errors: true,
      },
    }),

  /** VIP users always evaluated */
  vipUsers: (users: string[]) =>
    new SamplingStrategy({
      rate: 0.1,
      alwaysEvaluate: {
        errors: true,
        users,
      },
    }),
} as const;
