/**
 * @file Pipeline Builder
 * Fluent builder API for creating evaluation pipelines
 */

import type {
  AggregationConfig,
  AggregationMethod,
  PipelineConfig,
  ScoreResult,
  ScorerConfig,
} from "../../types/scorerTypes.js";
import { EvaluationPipeline } from "./evaluationPipeline.js";

/**
 * Fluent builder for creating evaluation pipelines
 */
export class PipelineBuilder {
  private _name?: string;
  private _description?: string;
  private _scorers: Array<{ id: string; config?: ScorerConfig }> = [];
  private _aggregation: AggregationConfig = { method: "average" };
  private _passThreshold = 0.7;
  private _executionMode: "parallel" | "sequential" = "parallel";
  private _stopOnFailure = false;
  private _timeout?: number;
  private _requiredScorers: string[] = [];

  constructor(name?: string) {
    this._name = name;
  }

  /**
   * Create a new pipeline builder
   */
  static create(name?: string): PipelineBuilder {
    return new PipelineBuilder(name);
  }

  /**
   * Set pipeline name
   */
  name(name: string): this {
    this._name = name;
    return this;
  }

  /**
   * Set pipeline description
   */
  description(desc: string): this {
    this._description = desc;
    return this;
  }

  /**
   * Add a scorer by ID
   */
  addScorer(id: string, config?: ScorerConfig): this {
    this._scorers.push({ id, config });
    return this;
  }

  /**
   * Add multiple scorers
   */
  addScorers(...ids: string[]): this {
    for (const id of ids) {
      this._scorers.push({ id });
    }
    return this;
  }

  /**
   * Add a scorer and mark it as required
   */
  requireScorer(id: string, config?: ScorerConfig): this {
    const existing = this._scorers.find((scorer) => scorer.id === id);
    if (existing) {
      existing.config = {
        ...existing.config,
        ...config,
      };
    } else {
      this._scorers.push({ id, config });
    }

    if (!this._requiredScorers.includes(id)) {
      this._requiredScorers.push(id);
    }
    return this;
  }

  /**
   * Set aggregation method
   */
  aggregateWith(method: AggregationMethod): this {
    this._aggregation.method = method;
    return this;
  }

  /**
   * Set weights for weighted aggregation
   */
  withWeights(weights: Record<string, number>): this {
    this._aggregation.method = "weighted";
    this._aggregation.weights = weights;
    return this;
  }

  /**
   * Set custom aggregation function
   */
  customAggregation(fn: (scores: ScoreResult[]) => number): this {
    this._aggregation.method = "custom";
    this._aggregation.customFn = fn;
    return this;
  }

  /**
   * Set pass/fail threshold
   */
  passThreshold(threshold: number): this {
    this._passThreshold = threshold;
    return this;
  }

  /**
   * Run scorers in parallel (default)
   */
  parallel(): this {
    this._executionMode = "parallel";
    return this;
  }

  /**
   * Run scorers sequentially
   */
  sequential(): this {
    this._executionMode = "sequential";
    return this;
  }

  /**
   * Stop pipeline on first failure
   */
  stopOnFailure(): this {
    this._stopOnFailure = true;
    return this;
  }

  /**
   * Continue pipeline on failures (default)
   */
  continueOnFailure(): this {
    this._stopOnFailure = false;
    return this;
  }

  /**
   * Set pipeline timeout
   */
  timeout(ms: number): this {
    this._timeout = ms;
    return this;
  }

  /**
   * Build the pipeline configuration
   */
  buildConfig(): PipelineConfig {
    return {
      name: this._name,
      description: this._description,
      scorers: this._scorers.map((scorer) => ({
        id: scorer.id,
        config: scorer.config ? { ...scorer.config } : undefined,
      })),
      aggregation: {
        ...this._aggregation,
        weights: this._aggregation.weights
          ? { ...this._aggregation.weights }
          : undefined,
      },
      passThreshold: this._passThreshold,
      executionMode: this._executionMode,
      stopOnFailure: this._stopOnFailure,
      timeout: this._timeout,
      requiredScorers:
        this._requiredScorers.length > 0
          ? [...this._requiredScorers]
          : undefined,
    };
  }

  /**
   * Build the pipeline (not initialized)
   */
  build(): EvaluationPipeline {
    return new EvaluationPipeline(this.buildConfig());
  }

  /**
   * Build and initialize the pipeline
   */
  async buildAndInitialize(): Promise<EvaluationPipeline> {
    const pipeline = this.build();
    await pipeline.initialize();
    return pipeline;
  }
}

/**
 * Quick pipeline builder factory
 */
export const Pipelines = {
  /**
   * Create a new pipeline builder
   */
  create: (name?: string) => PipelineBuilder.create(name),

  /**
   * Create a safety-focused pipeline
   */
  safety: () =>
    PipelineBuilder.create("safety")
      .description("Safety evaluation pipeline")
      .addScorers("toxicity", "bias-detection")
      .requireScorer("toxicity")
      .aggregateWith("minimum")
      .passThreshold(0.8),

  /**
   * Create a RAG evaluation pipeline
   */
  rag: () =>
    PipelineBuilder.create("rag")
      .description("RAG evaluation pipeline")
      .addScorers(
        "faithfulness",
        "context-relevancy",
        "answer-relevancy",
        "hallucination",
      )
      .withWeights({
        faithfulness: 1.5,
        "context-relevancy": 1.0,
        "answer-relevancy": 1.0,
        hallucination: 1.5,
      })
      .passThreshold(0.7),

  /**
   * Create a quality-focused pipeline
   */
  quality: () =>
    PipelineBuilder.create("quality")
      .description("Quality evaluation pipeline")
      .addScorers("tone-consistency", "prompt-alignment", "length", "format")
      .aggregateWith("average")
      .passThreshold(0.7),

  /**
   * Create a comprehensive pipeline with all scorers
   */
  comprehensive: () =>
    PipelineBuilder.create("comprehensive")
      .description("Comprehensive evaluation pipeline")
      .addScorers(
        "toxicity",
        "bias-detection",
        "hallucination",
        "faithfulness",
        "context-relevancy",
        "answer-relevancy",
        "tone-consistency",
        "prompt-alignment",
      )
      .requireScorer("toxicity")
      .withWeights({
        toxicity: 2.0,
        "bias-detection": 1.5,
        hallucination: 1.5,
        faithfulness: 1.0,
        "context-relevancy": 1.0,
        "answer-relevancy": 1.0,
        "tone-consistency": 0.8,
        "prompt-alignment": 0.8,
      })
      .passThreshold(0.75),

  /**
   * Create a minimal fast pipeline
   */
  minimal: () =>
    PipelineBuilder.create("minimal")
      .description("Minimal fast evaluation pipeline")
      .addScorers("toxicity", "hallucination")
      .parallel()
      .passThreshold(0.8),

  /**
   * Create a summarization evaluation pipeline
   */
  summarization: () =>
    PipelineBuilder.create("summarization")
      .description("Summarization quality evaluation pipeline")
      .addScorers(
        "summarization",
        "faithfulness",
        "content-similarity",
        "length",
      )
      .withWeights({
        summarization: 1.5,
        faithfulness: 1.2,
        "content-similarity": 1.0,
        length: 0.8,
      })
      .passThreshold(0.7),
};
