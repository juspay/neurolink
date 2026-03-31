/**
 * @file Evaluation Pipeline
 * Multi-scorer orchestration with configurable execution
 */

import type { JsonObject } from "../../types/common.js";
import type {
  AggregatedScores,
  PipelineConfig,
  ScoreResult,
  Scorer,
  ScorerInput,
} from "../../types/scorerTypes.js";
import { logger } from "../../utils/logger.js";
import { withTimeout } from "../../utils/errorHandling.js";
import { DEFAULT_SCORE_SCALE } from "../scorers/baseScorer.js";
import { ScorerRegistry } from "../scorers/scorerRegistry.js";

/**
 * Pipeline execution options
 */
export type PipelineExecutionOptions = {
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Custom timeout override */
  timeout?: number;
  /** Skip specific scorers. Mutually exclusive with onlyScorers. */
  skipScorers?: string[];
  /** Only run specific scorers. Mutually exclusive with skipScorers. */
  onlyScorers?: string[];
  /** Additional metadata to attach */
  metadata?: JsonObject;
};

/**
 * Pipeline execution result
 */
export type PipelineResult = AggregatedScores & {
  /** Pipeline configuration used */
  pipelineConfig: PipelineConfig;
  /** Execution options used */
  executionOptions?: PipelineExecutionOptions;
  /** Errors that occurred during execution */
  errors: Array<{ scorerId: string; error: string }>;
  /** Scorers that were skipped */
  skippedScorers: string[];
};

/**
 * Evaluation Pipeline for running multiple scorers
 */
export class EvaluationPipeline {
  private _config: PipelineConfig;
  private _scorers: Map<string, Scorer> = new Map();
  private _initialized = false;

  constructor(config: PipelineConfig) {
    this._config = {
      executionMode: "parallel",
      stopOnFailure: false,
      passThreshold: 0.7,
      ...config,
    };
  }

  /**
   * Get pipeline configuration
   */
  get config(): PipelineConfig {
    return this._config;
  }

  /**
   * Check if pipeline is initialized
   */
  get initialized(): boolean {
    return this._initialized;
  }

  /**
   * Initialize the pipeline by loading all scorers
   */
  async initialize(): Promise<void> {
    if (this._initialized) {
      return;
    }

    logger.debug(
      `Initializing evaluation pipeline: ${this._config.name ?? "unnamed"}`,
    );

    // Initialize registry
    await ScorerRegistry.registerBuiltInScorers();

    // Load all configured scorers using canonical IDs as map keys
    for (const scorerDef of this._config.scorers) {
      try {
        const scorer = await ScorerRegistry.getScorer(
          scorerDef.id,
          scorerDef.config,
        );
        if (scorer) {
          const canonicalId = scorer.metadata.id;
          this._scorers.set(canonicalId, scorer);
          logger.debug(
            `Loaded scorer: ${scorerDef.id} (canonical: ${canonicalId})`,
          );
        } else {
          logger.warn(`Scorer not found: ${scorerDef.id}`);
        }
      } catch (error) {
        logger.error(`Failed to load scorer: ${scorerDef.id}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Normalize requiredScorers to canonical IDs
    if (this._config.requiredScorers) {
      this._config.requiredScorers = this._config.requiredScorers.map((id) => {
        // Look up by alias first, then try canonical
        for (const [canonicalId, scorer] of this._scorers) {
          if (scorer.metadata.id === id || canonicalId === id) {
            return canonicalId;
          }
        }
        return id;
      });
    }

    // Validate required scorers are actually loaded
    if (this._config.requiredScorers) {
      const missing = this._config.requiredScorers.filter(
        (id) => !this._scorers.has(id),
      );
      if (missing.length > 0) {
        throw new Error(
          `Required scorers could not be loaded: ${missing.join(", ")}`,
        );
      }
    }

    this._initialized = true;
    logger.debug(`Pipeline initialized with ${this._scorers.size} scorers`);
  }

  /**
   * Execute the pipeline on input
   */
  async execute(
    input: ScorerInput,
    options?: PipelineExecutionOptions,
  ): Promise<PipelineResult> {
    if (!this._initialized) {
      await this.initialize();
    }
    this._validateExecutionOptions(options);

    const startTime = Date.now();
    const correlationId = options?.correlationId ?? `pipeline-${Date.now()}`;

    logger.debug(`Executing pipeline: ${this._config.name ?? "unnamed"}`, {
      correlationId,
      scorerCount: this._scorers.size,
    });

    // Determine which scorers to run
    const scorersToRun = this._getScorersToRun(options);
    const skippedScorers = this._getSkippedScorers(options);

    // Execute scorers
    const results: ScoreResult[] = [];
    const errors: Array<{ scorerId: string; error: string }> = [];

    if (this._config.executionMode === "parallel") {
      // Parallel execution
      const promises = scorersToRun.map(([id, scorer]) =>
        this._executeScorer(id, scorer, input, options?.timeout),
      );
      const settledResults = await Promise.allSettled(promises);

      for (let i = 0; i < settledResults.length; i++) {
        const result = settledResults[i];
        const [id] = scorersToRun[i];

        if (result.status === "fulfilled") {
          results.push(result.value);
          if (result.value.error) {
            errors.push({ scorerId: id, error: result.value.error });
          }
        } else {
          errors.push({
            scorerId: id,
            error: result.reason?.message ?? "Unknown error",
          });
        }
      }
    } else {
      // Sequential execution
      for (const [id, scorer] of scorersToRun) {
        try {
          const result = await this._executeScorer(
            id,
            scorer,
            input,
            options?.timeout,
          );
          results.push(result);

          if (result.error) {
            errors.push({ scorerId: id, error: result.error });
          }

          // Check for stop on failure
          if (this._config.stopOnFailure && !result.passed) {
            logger.debug(`Stopping pipeline execution: scorer ${id} failed`);
            break;
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          errors.push({ scorerId: id, error: errorMessage });

          if (this._config.stopOnFailure) {
            break;
          }
        }
      }
    }

    // Aggregate results
    const aggregated = this._aggregateScores(results);
    const totalComputeTime = Date.now() - startTime;

    // Check required scorers
    const requiredScorers = this._config.requiredScorers ?? [];
    const allRequiredPassed = requiredScorers.every((id) => {
      const result = results.find((r) => r.scorerId === id);
      return result?.passed ?? false;
    });

    const overallPassed =
      aggregated.normalizedScore >= (this._config.passThreshold ?? 0.7) &&
      allRequiredPassed;

    return {
      scores: results,
      overallScore: aggregated.score,
      aggregationMethod: this._config.aggregation?.method ?? "average",
      passed: overallPassed,
      totalComputeTime,
      timestamp: Date.now(),
      correlationId,
      pipelineConfig: this._config,
      executionOptions: options,
      errors,
      skippedScorers,
    };
  }

  private _validateExecutionOptions(options?: PipelineExecutionOptions): void {
    const hasOnlyScorers =
      !!options?.onlyScorers && options.onlyScorers.length > 0;
    const hasSkipScorers =
      !!options?.skipScorers && options.skipScorers.length > 0;

    if (hasOnlyScorers && hasSkipScorers) {
      throw new Error(
        "Cannot specify both 'onlyScorers' and 'skipScorers' options",
      );
    }
  }

  /**
   * Get scorers to run based on options
   */
  private _getScorersToRun(
    options?: PipelineExecutionOptions,
  ): Array<[string, Scorer]> {
    const allScorers = Array.from(this._scorers.entries());
    const onlyScorers = options?.onlyScorers;
    const skipScorers = options?.skipScorers;

    if (onlyScorers && onlyScorers.length > 0) {
      return allScorers.filter(([id]) => onlyScorers.includes(id));
    }

    if (skipScorers && skipScorers.length > 0) {
      return allScorers.filter(([id]) => !skipScorers.includes(id));
    }

    return allScorers;
  }

  /**
   * Get list of skipped scorers
   */
  private _getSkippedScorers(options?: PipelineExecutionOptions): string[] {
    const allIds = Array.from(this._scorers.keys());
    const onlyScorers = options?.onlyScorers;
    const skipScorers = options?.skipScorers;

    if (onlyScorers && onlyScorers.length > 0) {
      return allIds.filter((id) => !onlyScorers.includes(id));
    }

    if (skipScorers && skipScorers.length > 0) {
      return skipScorers.filter((id) => allIds.includes(id));
    }

    return [];
  }

  /**
   * Execute a single scorer with timeout
   */
  private async _executeScorer(
    id: string,
    scorer: Scorer,
    input: ScorerInput,
    timeout?: number,
  ): Promise<ScoreResult> {
    const scorerTimeout =
      timeout ?? scorer.config.timeout ?? this._config.timeout ?? 30000;

    try {
      const result = await withTimeout(
        scorer.score(input),
        scorerTimeout,
        new Error(`Scorer ${id} timed out after ${scorerTimeout}ms`),
      );
      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        scorerId: id,
        scorerName: scorer.metadata.name,
        score: 0,
        normalizedScore: 0,
        scale: DEFAULT_SCORE_SCALE,
        reasoning: `Scorer execution failed: ${errorMessage}`,
        passed: false,
        threshold: scorer.config.threshold ?? 0.7,
        computeTime: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Aggregate scores based on configuration
   */
  /**
   * Rescale a result's score to the default 0-MAX scale using its own scale info
   */
  private _rescaleToDefault(result: ScoreResult): number {
    const scale = result.scale ?? DEFAULT_SCORE_SCALE;
    if (scale.max === scale.min) {
      return 0;
    }
    // Normalize to 0-1 then rescale to default
    const normalized = (result.score - scale.min) / (scale.max - scale.min);
    return normalized * DEFAULT_SCORE_SCALE.max;
  }

  private _aggregateScores(results: ScoreResult[]): {
    score: number;
    normalizedScore: number;
  } {
    if (results.length === 0) {
      return { score: 0, normalizedScore: 0 };
    }

    const aggregation = this._config.aggregation ?? { method: "average" };
    const weights = aggregation.weights ?? {};

    // Rescale all results to the common default scale before aggregation
    const rescaled = results.map((r) => this._rescaleToDefault(r));

    let score: number;

    switch (aggregation.method) {
      case "minimum":
        score = Math.min(...rescaled);
        break;

      case "maximum":
        score = Math.max(...rescaled);
        break;

      case "weighted": {
        let totalWeight = 0;
        let weightedSum = 0;

        // Build a reverse map from canonical scorer ID to configured key
        const configuredKeyMap = new Map<string, string>();
        for (const scorerDef of this._config.scorers) {
          const scorer = this._scorers.get(scorerDef.id);
          if (scorer) {
            configuredKeyMap.set(scorer.metadata.id, scorerDef.id);
          }
        }

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const configuredKey = configuredKeyMap.get(result.scorerId);
          const weight =
            weights[result.scorerId] ??
            (configuredKey ? weights[configuredKey] : undefined) ??
            1.0;
          totalWeight += weight;
          weightedSum += rescaled[i] * weight;
        }

        score = totalWeight > 0 ? weightedSum / totalWeight : 0;
        break;
      }

      case "custom":
        if (aggregation.customFn) {
          score = aggregation.customFn(results);
          // Clamp custom output to valid range
          score = Math.max(0, Math.min(DEFAULT_SCORE_SCALE.max, score));
        } else {
          score = rescaled.reduce((sum, s) => sum + s, 0) / rescaled.length;
        }
        break;

      case "average":
      default:
        score = rescaled.reduce((sum, s) => sum + s, 0) / rescaled.length;
        break;
    }

    const normalizedScore = score / DEFAULT_SCORE_SCALE.max;

    return { score, normalizedScore };
  }

  /**
   * Add a scorer to the pipeline
   */
  addScorer(id: string, scorer: Scorer): void {
    this._scorers.set(id, scorer);

    // Update config
    if (!this._config.scorers.some((s) => s.id === id)) {
      this._config.scorers.push({ id });
    }
  }

  /**
   * Remove a scorer from the pipeline
   */
  removeScorer(id: string): boolean {
    const removed = this._scorers.delete(id);

    if (removed) {
      this._config.scorers = this._config.scorers.filter((s) => s.id !== id);
      this._config.requiredScorers = this._config.requiredScorers?.filter(
        (requiredId) => requiredId !== id,
      );
    }

    return removed;
  }

  /**
   * Get a scorer by ID
   */
  getScorer(id: string): Scorer | undefined {
    return this._scorers.get(id);
  }

  /**
   * Get all scorer IDs
   */
  getScorerIds(): string[] {
    return Array.from(this._scorers.keys());
  }

  /**
   * Update pipeline configuration
   */
  configure(config: Partial<PipelineConfig>): void {
    this._config = { ...this._config, ...config };
  }

  /**
   * Create a clone of this pipeline
   */
  clone(): EvaluationPipeline {
    const clonedConfig: PipelineConfig = {
      ...this._config,
      scorers: this._config.scorers.map((s) => ({
        id: s.id,
        config: s.config ? { ...s.config } : undefined,
      })),
      aggregation: this._config.aggregation
        ? {
            ...this._config.aggregation,
            weights: this._config.aggregation.weights
              ? { ...this._config.aggregation.weights }
              : undefined,
          }
        : undefined,
      requiredScorers: this._config.requiredScorers
        ? [...this._config.requiredScorers]
        : undefined,
    };
    const cloned = new EvaluationPipeline(clonedConfig);

    // Do not copy scorer instances to avoid shared mutable state
    // (e.g., BaseLLMScorer.provider, initializationPromise).
    // The cloned pipeline will create fresh scorers on initialize().
    cloned._initialized = false;

    return cloned;
  }
}

/**
 * Create a new evaluation pipeline
 */
export function createPipeline(config: PipelineConfig): EvaluationPipeline {
  return new EvaluationPipeline(config);
}

/**
 * Create and initialize a pipeline
 */
export async function createAndInitializePipeline(
  config: PipelineConfig,
): Promise<EvaluationPipeline> {
  const pipeline = new EvaluationPipeline(config);
  await pipeline.initialize();
  return pipeline;
}
