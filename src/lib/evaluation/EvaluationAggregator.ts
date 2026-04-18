/**
 * @file EvaluationAggregator - Aggregates and analyzes evaluation results.
 * Provides statistical analysis, trend detection, and summary generation.
 */

import type {
  AggregationResult,
  AlertSummary,
  DimensionAnalysis,
  EvaluationData,
  ScoreDistribution,
  ScoreStatistics,
  TrendAnalysis,
} from "../types/index.js";
import { evaluationErrors } from "./errors/EvaluationError.js";

/**
 * EvaluationAggregator - Aggregates evaluation results and provides analytics.
 * Supports statistical analysis, trend detection, and quality monitoring.
 *
 * @example
 * ```typescript
 * const aggregator = new EvaluationAggregator();
 *
 * // Add evaluations
 * aggregator.addEvaluation(evaluation1);
 * aggregator.addEvaluation(evaluation2);
 *
 * // Get aggregation
 * const result = aggregator.aggregate({ threshold: 7 });
 * console.log(`Average score: ${result.statistics.mean}`);
 * console.log(`Passing rate: ${result.passingRate}%`);
 *
 * // Get trend analysis
 * const trend = aggregator.analyzeSequenceTrend();
 * console.log(`Quality is ${trend.direction}`);
 * ```
 */
export class EvaluationAggregator {
  private evaluations: EvaluationData[] = [];

  /**
   * Adds an evaluation to the aggregator.
   *
   * @param evaluation - The evaluation data to add
   */
  public addEvaluation(evaluation: EvaluationData): void {
    this.evaluations.push(evaluation);
  }

  /**
   * Adds multiple evaluations to the aggregator.
   *
   * @param evaluations - Array of evaluation data to add
   */
  public addEvaluations(evaluations: EvaluationData[]): void {
    this.evaluations.push(...evaluations);
  }

  /**
   * Clears all evaluations from the aggregator.
   */
  public clear(): void {
    this.evaluations = [];
  }

  /**
   * Gets the current number of evaluations.
   */
  public getCount(): number {
    return this.evaluations.length;
  }

  /**
   * Gets all evaluations.
   */
  public getEvaluations(): EvaluationData[] {
    return [...this.evaluations];
  }

  /**
   * Aggregates all evaluations and returns comprehensive statistics.
   *
   * @param options - Aggregation options
   * @returns Comprehensive aggregation result
   */
  public aggregate(options: { threshold?: number } = {}): AggregationResult {
    const threshold = options.threshold || 7;

    if (this.evaluations.length === 0) {
      throw evaluationErrors.create(
        "AGGREGATION_ERROR",
        "Cannot aggregate: no evaluations available",
        { retryable: false },
      );
    }

    const overallScores = this.evaluations.map((e) => e.overall);
    const relevanceScores = this.evaluations.map((e) => e.relevance);
    const accuracyScores = this.evaluations.map((e) => e.accuracy);
    const completenessScores = this.evaluations.map((e) => e.completeness);

    const statistics = this.calculateStatistics(overallScores);
    const distribution = this.calculateDistribution(overallScores);
    const dimensions = this.analyzeDimensions(
      relevanceScores,
      accuracyScores,
      completenessScores,
      overallScores,
    );
    const alerts = this.summarizeAlerts();
    const passingCount = this.evaluations.filter(
      (e) => e.overall >= threshold,
    ).length;
    const passingRate = (passingCount / this.evaluations.length) * 100;
    const avgEvaluationTime =
      this.evaluations.reduce((sum, e) => sum + e.evaluationTime, 0) /
      this.evaluations.length;
    const evaluationModels = Array.from(
      new Set(this.evaluations.map((e) => e.evaluationModel)),
    );

    return {
      count: this.evaluations.length,
      statistics,
      distribution,
      dimensions,
      sequenceTrend:
        this.evaluations.length >= 3 ? this.analyzeSequenceTrend() : undefined,
      alerts,
      passingRate,
      avgEvaluationTime,
      metadata: {
        aggregatedAt: new Date().toISOString(),
        threshold,
        evaluationModels,
      },
    };
  }

  /**
   * Calculates statistical summary for a set of scores.
   *
   * @param scores - Array of scores
   * @returns Statistical summary
   */
  public calculateStatistics(scores: number[]): ScoreStatistics {
    if (scores.length === 0) {
      return {
        min: 0,
        max: 0,
        mean: 0,
        median: 0,
        stdDev: 0,
        variance: 0,
        p25: 0,
        p75: 0,
        p90: 0,
        p95: 0,
      };
    }

    const sorted = [...scores].sort((a, b) => a - b);
    const n = sorted.length;

    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = sum / n;

    const squaredDiffs = scores.map((s) => Math.pow(s - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / n;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[n - 1],
      mean,
      median: this.percentile(sorted, 50),
      stdDev,
      variance,
      p25: this.percentile(sorted, 25),
      p75: this.percentile(sorted, 75),
      p90: this.percentile(sorted, 90),
      p95: this.percentile(sorted, 95),
    };
  }

  /**
   * Calculates the distribution of scores across quality ranges.
   *
   * @param scores - Array of scores
   * @returns Score distribution
   */
  public calculateDistribution(scores: number[]): ScoreDistribution {
    return {
      poor: scores.filter((s) => s >= 1 && s <= 3).length,
      belowAverage: scores.filter((s) => s >= 4 && s <= 5).length,
      average: scores.filter((s) => s >= 6 && s <= 7).length,
      good: scores.filter((s) => s >= 8 && s <= 9).length,
      excellent: scores.filter((s) => s >= 10).length,
    };
  }

  /**
   * Analyzes sequence-based trends in evaluation scores (based on insertion order, not time).
   *
   * @param windowSize - Moving average window size (default: 5)
   * @returns Trend analysis
   */
  public analyzeSequenceTrend(windowSize: number = 5): TrendAnalysis {
    const scores = this.evaluations.map((e) => e.overall);

    if (scores.length < 2) {
      return {
        direction: "stable",
        slope: 0,
        rSquared: 0,
        percentChange: 0,
        movingAverage: scores[0] || 0,
      };
    }

    // Calculate linear regression
    const n = scores.length;
    const indices = scores.map((_, i) => i);
    const sumX = indices.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = indices.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumXX = indices.reduce((sum, x) => sum + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = scores.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = scores.reduce((sum, y, i) => {
      const predicted = slope * i + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

    // Calculate moving average
    const window = Math.min(windowSize, scores.length);
    const recentScores = scores.slice(-window);
    const movingAverage =
      recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

    // Calculate percent change
    const percentChange =
      scores[0] !== 0
        ? ((scores[scores.length - 1] - scores[0]) / scores[0]) * 100
        : 0;

    // Determine direction
    let direction: "improving" | "declining" | "stable";
    if (Math.abs(slope) < 0.05) {
      direction = "stable";
    } else if (slope > 0) {
      direction = "improving";
    } else {
      direction = "declining";
    }

    return {
      direction,
      slope,
      rSquared,
      percentChange,
      movingAverage,
    };
  }

  /**
   * Analyzes each evaluation dimension separately.
   *
   * @param relevance - Relevance scores
   * @param accuracy - Accuracy scores
   * @param completeness - Completeness scores
   * @param overall - Overall scores
   * @returns Dimension analysis
   */
  private analyzeDimensions(
    relevance: number[],
    accuracy: number[],
    completeness: number[],
    overall: number[],
  ): DimensionAnalysis {
    return {
      relevance: this.calculateStatistics(relevance),
      accuracy: this.calculateStatistics(accuracy),
      completeness: this.calculateStatistics(completeness),
      overall: this.calculateStatistics(overall),
      correlations: {
        relevanceAccuracy: this.correlation(relevance, accuracy),
        relevanceCompleteness: this.correlation(relevance, completeness),
        accuracyCompleteness: this.correlation(accuracy, completeness),
      },
    };
  }

  /**
   * Summarizes alert information from evaluations.
   *
   * @returns Alert summary
   */
  private summarizeAlerts(): AlertSummary {
    const highAlerts = this.evaluations.filter(
      (e) => e.alertSeverity === "high",
    ).length;
    const mediumAlerts = this.evaluations.filter(
      (e) => e.alertSeverity === "medium",
    ).length;
    const offTopicCount = this.evaluations.filter((e) => e.isOffTopic).length;
    const total = highAlerts + mediumAlerts;

    return {
      total,
      high: highAlerts,
      medium: mediumAlerts,
      offTopic: offTopicCount,
      alertRate: (total / this.evaluations.length) * 100,
    };
  }

  /**
   * Calculates a specific percentile from sorted data.
   *
   * @param sorted - Sorted array of numbers
   * @param p - Percentile (0-100)
   * @returns The value at the percentile
   */
  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
      return 0;
    }
    if (sorted.length === 1) {
      return sorted[0];
    }

    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    const fraction = index - lower;
    return sorted[lower] * (1 - fraction) + sorted[upper] * fraction;
  }

  /**
   * Calculates Pearson correlation between two arrays.
   *
   * @param x - First array
   * @param y - Second array
   * @returns Correlation coefficient (-1 to 1)
   */
  private correlation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length === 0) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt(
      (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
    );

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Gets evaluations that failed to meet the threshold.
   *
   * @param threshold - The passing threshold
   * @returns Array of failing evaluations
   */
  public getFailingEvaluations(threshold: number = 7): EvaluationData[] {
    return this.evaluations.filter((e) => e.overall < threshold);
  }

  /**
   * Gets evaluations with high severity alerts.
   *
   * @returns Array of high-alert evaluations
   */
  public getHighAlertEvaluations(): EvaluationData[] {
    return this.evaluations.filter((e) => e.alertSeverity === "high");
  }

  /**
   * Gets evaluations marked as off-topic.
   *
   * @returns Array of off-topic evaluations
   */
  public getOffTopicEvaluations(): EvaluationData[] {
    return this.evaluations.filter((e) => e.isOffTopic);
  }

  /**
   * Gets the top N performing evaluations.
   *
   * @param n - Number of evaluations to return
   * @returns Array of top evaluations
   */
  public getTopEvaluations(n: number = 5): EvaluationData[] {
    return [...this.evaluations]
      .sort((a, b) => b.overall - a.overall)
      .slice(0, n);
  }

  /**
   * Gets the bottom N performing evaluations.
   *
   * @param n - Number of evaluations to return
   * @returns Array of bottom evaluations
   */
  public getBottomEvaluations(n: number = 5): EvaluationData[] {
    return [...this.evaluations]
      .sort((a, b) => a.overall - b.overall)
      .slice(0, n);
  }

  /**
   * Generates a text summary of the aggregation.
   *
   * @param threshold - The passing threshold
   * @returns Human-readable summary
   */
  public generateSummary(threshold: number = 7): string {
    if (this.evaluations.length === 0) {
      return "No evaluations to summarize.";
    }

    const result = this.aggregate({ threshold });
    const trend = result.sequenceTrend;

    let summary = `Evaluation Summary (${result.count} evaluations):\n`;
    summary += `- Average Score: ${result.statistics.mean.toFixed(2)}/10\n`;
    summary += `- Passing Rate: ${result.passingRate.toFixed(1)}%\n`;
    summary += `- Score Range: ${result.statistics.min} - ${result.statistics.max}\n`;
    summary += `- Alert Rate: ${result.alerts.alertRate.toFixed(1)}%\n`;

    if (trend) {
      summary += `- Quality Trend: ${trend.direction} (slope: ${trend.slope.toFixed(3)})\n`;
    }

    if (result.alerts.high > 0) {
      summary += `\nWarning: ${result.alerts.high} high-severity alerts detected.\n`;
    }

    return summary;
  }
}
