/**
 * workflow/utils/workflowMetrics.ts
 * Metrics tracking and collection for workflow execution
 */

import type { JsonValue } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import type { EnsembleResponse, WorkflowResult } from "../types.js";
import type {
  SummaryStats,
  WorkflowComparison,
  WorkflowExecutionMetrics,
} from "./types/index.js";

const functionTag = "WorkflowMetrics";

/**
 * In-memory metrics storage (can be replaced with persistent storage)
 */
const metricsStore = new Map<string, WorkflowExecutionMetrics>();

// ============================================================================
// METRICS COLLECTION
// ============================================================================

/**
 * Workflow metrics tracker
 */
export class WorkflowMetrics {
  /**
   * Record a workflow execution
   */
  recordExecution(workflowId: string, result: WorkflowResult): void {
    const existing = metricsStore.get(workflowId);

    if (!existing) {
      // Initialize new metrics
      metricsStore.set(workflowId, {
        workflowId,
        executionCount: 1,
        successCount: 1,
        failureCount: 0,
        averageExecutionTime: result.totalTime,
        averageScore: result.score,
        averageConfidence: result.confidence,
        totalCost: result.cost || 0,
        lastExecutionTime: result.timestamp,
      });
    } else {
      // Update existing metrics
      const newCount = existing.executionCount + 1;
      metricsStore.set(workflowId, {
        ...existing,
        executionCount: newCount,
        successCount: existing.successCount + 1,
        averageExecutionTime:
          (existing.averageExecutionTime * existing.executionCount +
            result.totalTime) /
          newCount,
        averageScore:
          (existing.averageScore * existing.executionCount + result.score) /
          newCount,
        averageConfidence:
          (existing.averageConfidence * existing.executionCount +
            result.confidence) /
          newCount,
        totalCost: existing.totalCost + (result.cost || 0),
        lastExecutionTime: result.timestamp,
      });
    }

    logger.debug(`[${functionTag}] Recorded workflow execution`, {
      workflowId,
      totalExecutions: metricsStore.get(workflowId)?.executionCount,
    });
  }

  /**
   * Record a workflow failure
   */
  recordFailure(workflowId: string, error: Error): void {
    const existing = metricsStore.get(workflowId);

    if (!existing) {
      // Initialize with failure
      metricsStore.set(workflowId, {
        workflowId,
        executionCount: 1,
        successCount: 0,
        failureCount: 1,
        averageExecutionTime: 0,
        averageScore: 0,
        averageConfidence: 0,
        totalCost: 0,
        lastExecutionTime: new Date().toISOString(),
      });
    } else {
      // Update with failure
      metricsStore.set(workflowId, {
        ...existing,
        executionCount: existing.executionCount + 1,
        failureCount: existing.failureCount + 1,
        lastExecutionTime: new Date().toISOString(),
      });
    }

    logger.warn(`[${functionTag}] Recorded workflow failure`, {
      workflowId,
      error: error.message,
      totalFailures: metricsStore.get(workflowId)?.failureCount,
    });
  }

  /**
   * Get metrics for a specific workflow
   */
  getMetrics(workflowId: string): WorkflowExecutionMetrics | undefined {
    return metricsStore.get(workflowId);
  }

  /**
   * Get all workflow metrics
   */
  getAllMetrics(): WorkflowExecutionMetrics[] {
    return Array.from(metricsStore.values());
  }

  /**
   * Clear metrics for a workflow
   */
  clearMetrics(workflowId: string): void {
    metricsStore.delete(workflowId);
    logger.debug(`[${functionTag}] Cleared metrics`, { workflowId });
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    metricsStore.clear();
    logger.debug(`[${functionTag}] Cleared all metrics`);
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    const metrics = this.getAllMetrics();
    return JSON.stringify(metrics, null, 2);
  }
}

// ============================================================================
// ANALYTICS HELPERS
// ============================================================================

/**
 * Calculate model-specific metrics from ensemble responses
 */
export function calculateModelMetrics(
  responses: EnsembleResponse[],
): Record<string, { successRate: number; avgResponseTime: number }> {
  const modelStats = new Map<
    string,
    { total: number; successful: number; totalTime: number }
  >();

  responses.forEach((response) => {
    const key = `${response.provider}/${response.model}`;
    const existing = modelStats.get(key) || {
      total: 0,
      successful: 0,
      totalTime: 0,
    };

    modelStats.set(key, {
      total: existing.total + 1,
      successful: existing.successful + (response.status === "success" ? 1 : 0),
      totalTime: existing.totalTime + response.responseTime,
    });
  });

  const result: Record<
    string,
    { successRate: number; avgResponseTime: number }
  > = {};

  modelStats.forEach((stats, key) => {
    result[key] = {
      successRate: stats.successful / stats.total,
      avgResponseTime: stats.totalTime / stats.total,
    };
  });

  return result;
}

/**
 * Calculate consensus level between responses
 * NOTE: Placeholder implementation - uses response length similarity
 * TODO: Implement semantic similarity in Phase 2
 */
export function calculateConsensus(responses: EnsembleResponse[]): number {
  const successful = responses.filter((r) => r.status === "success");

  if (successful.length < 2) {
    return 1.0; // Perfect consensus with single response
  }

  // Simple length-based similarity (placeholder)
  const lengths = successful.map((r) => r.content.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  if (avgLength === 0) {
    logger.warn(
      "[WorkflowMetrics] All responses have zero length - semantic similarity needed for accurate consensus",
    );
    return 0;
  }

  const variance =
    lengths.reduce((sum, len) => sum + (len - avgLength) ** 2, 0) /
    lengths.length;
  const stdDev = Math.sqrt(variance);

  // Normalize to 0-1 (lower std dev = higher consensus)
  const normalized = Math.max(0, 1 - stdDev / avgLength);

  return Math.min(1, Math.max(0, normalized));
}

/**
 * Calculate confidence score from judge results and ensemble data
 */
export function calculateConfidence(
  ensembleResponses: EnsembleResponse[],
  judgeConfidence?: number,
  scores?: Record<string, number>,
): number {
  // If judge provided confidence, use it
  if (judgeConfidence !== undefined) {
    return Math.min(1, Math.max(0, judgeConfidence));
  }

  // Calculate from judge scores
  if (scores && Object.keys(scores).length > 0) {
    const scoreValues = Object.keys(scores).map((k) => scores[k]);
    const maxScore = Math.max(...scoreValues);
    const avgScore =
      scoreValues.reduce((a: number, b: number) => a + b, 0) /
      scoreValues.length;

    // Normalize 0-100 scores to 0-1
    const maxNormalized = maxScore / 100;
    const avgNormalized = avgScore / 100;

    // Combine max and average (weighted 60/40)
    return maxNormalized * 0.6 + avgNormalized * 0.4;
  }

  // Fallback: based on success rate
  if (ensembleResponses.length === 0) {
    return 0;
  }
  const successCount = ensembleResponses.filter(
    (r) => r.status === "success",
  ).length;
  return successCount / ensembleResponses.length;
}

/**
 * Format metrics for logging
 * @param result - Workflow result to format
 * @returns Formatted metrics as JSON-compatible record
 */
export function formatMetricsForLogging(
  result: WorkflowResult,
): Record<string, JsonValue> {
  return {
    workflowId: result.workflow,
    workflowType: result.analytics?.workflowType ?? null,
    totalTime: result.totalTime,
    ensembleTime: result.ensembleTime,
    judgeTime: result.judgeTime ?? null,
    score: result.score,
    reasoning: result.reasoning,
    confidence: result.confidence,
    consensus: result.consensus ?? null,
    modelsExecuted: result.ensembleResponses.length,
    modelsSuccessful: result.ensembleResponses.filter(
      (r) => r.status === "success",
    ).length,
    selectedModel: result.selectedResponse
      ? `${result.selectedResponse.provider}/${result.selectedResponse.model}`
      : null,
    totalTokens: result.usage?.totalTokens ?? null,
    estimatedCost: result.cost ?? null,
    timestamp: result.timestamp,
  };
}

/**
 * Generate summary statistics for multiple executions
 * @param results - Array of workflow results to analyze
 * @returns Summary statistics including averages and success rate
 */
export function generateSummaryStats(results: WorkflowResult[]): SummaryStats {
  if (results.length === 0) {
    return {
      totalExecutions: 0,
      averageScore: 0,
      averageConfidence: 0,
      averageExecutionTime: 0,
      successRate: 0,
      totalCost: 0,
    };
  }

  const totalScore = results.reduce((sum, r) => sum + r.score, 0);
  const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
  const totalTime = results.reduce((sum, r) => sum + r.totalTime, 0);
  const totalCost = results.reduce((sum, r) => sum + (r.cost || 0), 0);
  const successCount = results.filter((r) => r.score > 0).length;

  return {
    totalExecutions: results.length,
    averageScore: totalScore / results.length,
    averageConfidence: totalConfidence / results.length,
    averageExecutionTime: totalTime / results.length,
    successRate: successCount / results.length,
    totalCost,
  };
}

/**
 * Compare two workflows based on metrics
 * @param workflow1Results - Results from first workflow
 * @param workflow2Results - Results from second workflow
 * @returns Comparison with stats for both workflows and winner determination
 */
export function compareWorkflows(
  workflow1Results: WorkflowResult[],
  workflow2Results: WorkflowResult[],
): WorkflowComparison {
  const stats1 = generateSummaryStats(workflow1Results);
  const stats2 = generateSummaryStats(workflow2Results);

  // Simple scoring: 40% quality (score), 30% confidence, 20% speed, 10% cost
  const speedScore1 =
    stats1.averageExecutionTime > 0
      ? (1 / stats1.averageExecutionTime) * 10000 * 0.2
      : 0;
  const speedScore2 =
    stats2.averageExecutionTime > 0
      ? (1 / stats2.averageExecutionTime) * 10000 * 0.2
      : 0;

  const score1 =
    stats1.averageScore * 0.4 +
    stats1.averageConfidence * 100 * 0.3 +
    speedScore1 +
    (1 / (stats1.totalCost + 1)) * 100 * 0.1;

  const score2 =
    stats2.averageScore * 0.4 +
    stats2.averageConfidence * 100 * 0.3 +
    speedScore2 +
    (1 / (stats2.totalCost + 1)) * 100 * 0.1;

  const diff = Math.abs(score1 - score2);
  let winner: "workflow1" | "workflow2" | "tie";
  let reasoning: string;

  if (diff < 5) {
    winner = "tie";
    reasoning = "Workflows perform similarly overall";
  } else if (score1 > score2) {
    winner = "workflow1";
    reasoning = `Workflow 1 scores higher (${score1.toFixed(2)} vs ${score2.toFixed(2)})`;
  } else {
    winner = "workflow2";
    reasoning = `Workflow 2 scores higher (${score2.toFixed(2)} vs ${score1.toFixed(2)})`;
  }

  return {
    workflow1: stats1,
    workflow2: stats2,
    winner,
    reasoning,
  };
}
