/**
 * @file Metrics Collector
 * Collect and aggregate evaluation metrics
 */

import type { ScoreResult } from "../../types/scorerTypes.js";
import type { PipelineResult } from "../pipeline/evaluationPipeline.js";

/**
 * Scorer metrics
 */
export type ScorerMetrics = {
  scorerId: string;
  scorerName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  passedCount: number;
  failedCount: number;
  totalScore: number;
  minScore: number;
  maxScore: number;
  totalDuration: number;
  averageDuration: number;
  averageScore: number;
  passRate: number;
  lastExecutionTime: number;
};

/**
 * Pipeline metrics
 */
export type PipelineMetrics = {
  pipelineName: string;
  totalExecutions: number;
  passedCount: number;
  failedCount: number;
  totalScore: number;
  minScore: number;
  maxScore: number;
  totalDuration: number;
  averageDuration: number;
  averageScore: number;
  passRate: number;
  lastExecutionTime: number;
  scorerMetrics: Map<string, ScorerMetrics>;
};

/**
 * Aggregated metrics
 */
export type AggregatedMetrics = {
  totalEvaluations: number;
  overallPassRate: number;
  averageScore: number;
  averageDuration: number;
  scoreDistribution: {
    excellent: number; // 9-10
    good: number; // 7-8.9
    fair: number; // 5-6.9
    poor: number; // 3-4.9
    failing: number; // 0-2.9
  };
  pipelineMetrics: Map<string, PipelineMetrics>;
  scorerMetrics: Map<string, ScorerMetrics>;
  collectionStartTime: number;
  lastUpdateTime: number;
};

/**
 * Metrics collector for evaluation data
 */
export class MetricsCollector {
  private _pipelineMetrics = new Map<string, PipelineMetrics>();
  private _scorerMetrics = new Map<string, ScorerMetrics>();
  private _collectionStartTime = Date.now();
  private _lastUpdateTime = Date.now();
  private _totalEvaluations = 0;
  private _scoreDistribution = {
    excellent: 0,
    good: 0,
    fair: 0,
    poor: 0,
    failing: 0,
  };

  /**
   * Record a scorer execution
   */
  recordScorer(
    scorerId: string,
    scorerName: string,
    result: ScoreResult,
  ): void {
    let metrics = this._scorerMetrics.get(scorerId);

    if (!metrics) {
      metrics = this._createEmptyScorerMetrics(scorerId, scorerName);
      this._scorerMetrics.set(scorerId, metrics);
    }

    this._updateScorerMetrics(metrics, result);
    this._lastUpdateTime = Date.now();
  }

  /**
   * Record a pipeline execution
   */
  recordPipeline(result: PipelineResult): void {
    const pipelineName = result.pipelineConfig.name ?? "unnamed";
    let metrics = this._pipelineMetrics.get(pipelineName);

    if (!metrics) {
      metrics = this._createEmptyPipelineMetrics(pipelineName);
      this._pipelineMetrics.set(pipelineName, metrics);
    }

    this._updatePipelineMetrics(metrics, result);
    this._updateScoreDistribution(result.overallScore);

    this._totalEvaluations++;
    this._lastUpdateTime = Date.now();
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): AggregatedMetrics {
    let totalScore = 0;
    let totalDuration = 0;
    let totalPassed = 0;

    for (const metrics of this._pipelineMetrics.values()) {
      totalScore += metrics.totalScore;
      totalDuration += metrics.totalDuration;
      totalPassed += metrics.passedCount;
    }

    return {
      totalEvaluations: this._totalEvaluations,
      overallPassRate:
        this._totalEvaluations > 0 ? totalPassed / this._totalEvaluations : 0,
      averageScore:
        this._totalEvaluations > 0 ? totalScore / this._totalEvaluations : 0,
      averageDuration:
        this._totalEvaluations > 0 ? totalDuration / this._totalEvaluations : 0,
      scoreDistribution: { ...this._scoreDistribution },
      pipelineMetrics: new Map(this._pipelineMetrics),
      scorerMetrics: new Map(this._scorerMetrics),
      collectionStartTime: this._collectionStartTime,
      lastUpdateTime: this._lastUpdateTime,
    };
  }

  /**
   * Get metrics for a specific scorer
   */
  getScorerMetrics(scorerId: string): ScorerMetrics | undefined {
    return this._scorerMetrics.get(scorerId);
  }

  /**
   * Get metrics for a specific pipeline
   */
  getPipelineMetrics(pipelineName: string): PipelineMetrics | undefined {
    return this._pipelineMetrics.get(pipelineName);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalEvaluations: number;
    passRate: number;
    averageScore: number;
    topScorers: Array<{ id: string; passRate: number }>;
    bottomScorers: Array<{ id: string; passRate: number }>;
  } {
    const scorersList = Array.from(this._scorerMetrics.values())
      .filter((m) => m.totalExecutions > 0)
      .sort((a, b) => b.passRate - a.passRate);

    const metrics = this.getMetrics();

    return {
      totalEvaluations: metrics.totalEvaluations,
      passRate: metrics.overallPassRate,
      averageScore: metrics.averageScore,
      topScorers: scorersList.slice(0, 5).map((m) => ({
        id: m.scorerId,
        passRate: m.passRate,
      })),
      bottomScorers: scorersList
        .slice(-5)
        .reverse()
        .map((m) => ({
          id: m.scorerId,
          passRate: m.passRate,
        })),
    };
  }

  /**
   * Export metrics as JSON
   */
  exportJson(): string {
    const metrics = this.getMetrics();

    return JSON.stringify(
      {
        totalEvaluations: metrics.totalEvaluations,
        overallPassRate: metrics.overallPassRate,
        averageScore: metrics.averageScore,
        averageDuration: metrics.averageDuration,
        scoreDistribution: metrics.scoreDistribution,
        collectionStartTime: metrics.collectionStartTime,
        lastUpdateTime: metrics.lastUpdateTime,
        pipelines: Array.from(metrics.pipelineMetrics.entries()).map(
          ([name, pm]) => ({
            name,
            totalExecutions: pm.totalExecutions,
            passRate: pm.passRate,
            averageScore: pm.averageScore,
            averageDuration: pm.averageDuration,
          }),
        ),
        scorers: Array.from(metrics.scorerMetrics.entries()).map(
          ([id, sm]) => ({
            id,
            name: sm.scorerName,
            totalExecutions: sm.totalExecutions,
            passRate: sm.passRate,
            averageScore: sm.averageScore,
            averageDuration: sm.averageDuration,
            minScore: Number.isFinite(sm.minScore) ? sm.minScore : null,
            maxScore: Number.isFinite(sm.maxScore) ? sm.maxScore : null,
          }),
        ),
      },
      null,
      2,
    );
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this._pipelineMetrics.clear();
    this._scorerMetrics.clear();
    this._collectionStartTime = Date.now();
    this._lastUpdateTime = Date.now();
    this._totalEvaluations = 0;
    this._scoreDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      failing: 0,
    };
  }

  /**
   * Create empty scorer metrics
   */
  private _createEmptyScorerMetrics(
    scorerId: string,
    scorerName: string,
  ): ScorerMetrics {
    return {
      scorerId,
      scorerName,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      passedCount: 0,
      failedCount: 0,
      totalScore: 0,
      minScore: Infinity,
      maxScore: -Infinity,
      totalDuration: 0,
      averageDuration: 0,
      averageScore: 0,
      passRate: 0,
      lastExecutionTime: 0,
    };
  }

  /**
   * Create empty pipeline metrics
   */
  private _createEmptyPipelineMetrics(pipelineName: string): PipelineMetrics {
    return {
      pipelineName,
      totalExecutions: 0,
      passedCount: 0,
      failedCount: 0,
      totalScore: 0,
      minScore: Infinity,
      maxScore: -Infinity,
      totalDuration: 0,
      averageDuration: 0,
      averageScore: 0,
      passRate: 0,
      lastExecutionTime: 0,
      scorerMetrics: new Map(),
    };
  }

  /**
   * Update scorer metrics with new result
   */
  private _updateScorerMetrics(
    metrics: ScorerMetrics,
    result: ScoreResult,
  ): void {
    metrics.totalExecutions++;

    if (result.error) {
      metrics.failedExecutions++;
    } else {
      metrics.successfulExecutions++;
    }

    if (result.passed) {
      metrics.passedCount++;
    } else {
      metrics.failedCount++;
    }

    metrics.totalScore += result.score;
    metrics.minScore = Math.min(metrics.minScore, result.score);
    metrics.maxScore = Math.max(metrics.maxScore, result.score);
    metrics.totalDuration += result.computeTime;

    metrics.averageScore = metrics.totalScore / metrics.totalExecutions;
    metrics.averageDuration = metrics.totalDuration / metrics.totalExecutions;
    metrics.passRate = metrics.passedCount / metrics.totalExecutions;
    metrics.lastExecutionTime = Date.now();
  }

  /**
   * Update pipeline metrics with new result
   */
  private _updatePipelineMetrics(
    metrics: PipelineMetrics,
    result: PipelineResult,
  ): void {
    metrics.totalExecutions++;

    if (result.passed) {
      metrics.passedCount++;
    } else {
      metrics.failedCount++;
    }

    metrics.totalScore += result.overallScore;
    metrics.minScore = Math.min(metrics.minScore, result.overallScore);
    metrics.maxScore = Math.max(metrics.maxScore, result.overallScore);
    metrics.totalDuration += result.totalComputeTime;

    metrics.averageScore = metrics.totalScore / metrics.totalExecutions;
    metrics.averageDuration = metrics.totalDuration / metrics.totalExecutions;
    metrics.passRate = metrics.passedCount / metrics.totalExecutions;
    metrics.lastExecutionTime = Date.now();

    // Update individual scorer metrics within pipeline
    for (const scoreResult of result.scores) {
      let scorerMetrics = metrics.scorerMetrics.get(scoreResult.scorerId);

      if (!scorerMetrics) {
        scorerMetrics = this._createEmptyScorerMetrics(
          scoreResult.scorerId,
          scoreResult.scorerName,
        );
        metrics.scorerMetrics.set(scoreResult.scorerId, scorerMetrics);
      }

      this._updateScorerMetrics(scorerMetrics, scoreResult);
    }
  }

  /**
   * Update score distribution
   */
  private _updateScoreDistribution(score: number): void {
    if (score >= 9) {
      this._scoreDistribution.excellent++;
    } else if (score >= 7) {
      this._scoreDistribution.good++;
    } else if (score >= 5) {
      this._scoreDistribution.fair++;
    } else if (score >= 3) {
      this._scoreDistribution.poor++;
    } else {
      this._scoreDistribution.failing++;
    }
  }
}

/**
 * Create a metrics collector
 */
export function createMetricsCollector(): MetricsCollector {
  return new MetricsCollector();
}

/**
 * Global metrics collector instance
 */
export const globalMetricsCollector = new MetricsCollector();
