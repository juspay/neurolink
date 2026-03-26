/**
 * @file Langfuse Adapter
 * Integration with Langfuse for LLM observability
 */

import type { ScoreResult } from "../../types/scorerTypes.js";
import { logger } from "../../utils/logger.js";
import type { PipelineResult } from "../pipeline/evaluationPipeline.js";
import { observabilityHooks } from "./observabilityHooks.js";

/**
 * Langfuse client interface (minimal for type safety)
 */
export type LangfuseClient = {
  score: (params: {
    name: string;
    value: number;
    traceId?: string;
    observationId?: string;
    comment?: string;
    metadata?: Record<string, unknown>;
  }) => Promise<unknown>;
  trace?: (params: {
    name: string;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) => { id: string };
  shutdown?: () => Promise<void>;
};

/**
 * Langfuse adapter configuration
 */
export type LangfuseAdapterConfig = {
  /** Langfuse client instance */
  client: LangfuseClient;
  /** Prefix for score names */
  scorePrefix?: string;
  /** Include detailed metadata */
  includeMetadata?: boolean;
  /** Tags to add to all scores */
  tags?: string[];
  /** Whether to send pipeline-level scores */
  sendPipelineScores?: boolean;
  /** Whether to send individual scorer scores */
  sendScorerScores?: boolean;
};

/**
 * Langfuse adapter for evaluation observability
 */
export class LangfuseAdapter {
  private _config: Required<LangfuseAdapterConfig>;
  private _unsubscribers: Array<() => void> = [];
  private _traceIdMap = new Map<string, string>();

  constructor(config: LangfuseAdapterConfig) {
    this._config = {
      scorePrefix: "eval",
      includeMetadata: true,
      tags: [],
      sendPipelineScores: true,
      sendScorerScores: true,
      ...config,
    };
  }

  /**
   * Start listening to evaluation events
   */
  start(): void {
    // Prevent duplicate subscriptions
    if (this._unsubscribers.length > 0) {
      return;
    }

    // Listen for scorer completions
    if (this._config.sendScorerScores) {
      const scorerUnsub = observabilityHooks.on("scorer:end", (event) => {
        this._sendScorerScore(event.result, event.traceContext?.traceId);
      });
      this._unsubscribers.push(scorerUnsub);
    }

    // Listen for pipeline completions
    if (this._config.sendPipelineScores) {
      const pipelineUnsub = observabilityHooks.on("pipeline:end", (event) => {
        this._sendPipelineScores(event.result, event.traceContext?.traceId);
      });
      this._unsubscribers.push(pipelineUnsub);
    }

    logger.debug("Langfuse adapter started");
  }

  /**
   * Stop listening to events
   */
  stop(): void {
    for (const unsub of this._unsubscribers) {
      unsub();
    }
    this._unsubscribers = [];
    this._traceIdMap.clear();

    logger.debug("Langfuse adapter stopped");
  }

  /**
   * Send scorer score to Langfuse
   */
  private async _sendScorerScore(
    result: ScoreResult,
    traceId?: string,
  ): Promise<void> {
    try {
      const scoreName = `${this._config.scorePrefix}.${result.scorerId}`;
      const normalizedValue = result.normalizedScore; // Already 0-1

      await this._config.client.score({
        name: scoreName,
        value: normalizedValue,
        traceId,
        comment: result.reasoning,
        metadata: this._config.includeMetadata
          ? {
              passed: result.passed,
              threshold: result.threshold,
              computeTime: result.computeTime,
              confidence: result.confidence,
              ...(result.metadata ?? {}),
            }
          : undefined,
      });

      logger.debug(`Sent score to Langfuse: ${scoreName}=${normalizedValue}`);
    } catch (error) {
      logger.error("Failed to send score to Langfuse", {
        scorerId: result.scorerId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Send pipeline scores to Langfuse
   */
  private async _sendPipelineScores(
    result: PipelineResult,
    externalTraceId?: string,
  ): Promise<void> {
    const traceId = externalTraceId ?? result.correlationId;
    const pipelineName = result.pipelineConfig.name ?? "unnamed";

    try {
      // Send overall pipeline score
      await this._config.client.score({
        name: `${this._config.scorePrefix}.pipeline.${pipelineName}.overall`,
        value: result.overallScore / 10, // Normalize to 0-1
        traceId,
        comment: `Pipeline evaluation: ${result.passed ? "PASSED" : "FAILED"}`,
        metadata: this._config.includeMetadata
          ? {
              passed: result.passed,
              aggregationMethod: result.aggregationMethod,
              scorerCount: result.scores.length,
              totalComputeTime: result.totalComputeTime,
              errorCount: result.errors.length,
            }
          : undefined,
      });

      logger.debug(
        `Sent pipeline score to Langfuse: ${pipelineName}=${result.overallScore / 10}`,
      );
    } catch (error) {
      logger.error("Failed to send pipeline score to Langfuse", {
        pipelineName,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Manually send a score to Langfuse
   */
  async sendScore(
    name: string,
    value: number,
    options?: {
      traceId?: string;
      comment?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    const scoreName = `${this._config.scorePrefix}.${name}`;

    await this._config.client.score({
      name: scoreName,
      value,
      traceId: options?.traceId,
      comment: options?.comment,
      metadata: options?.metadata,
    });
  }

  /**
   * Shutdown the adapter and flush any pending data
   */
  async shutdown(): Promise<void> {
    this.stop();

    if (this._config.client.shutdown) {
      await this._config.client.shutdown();
    }
  }
}

/**
 * Create a Langfuse adapter
 */
export function createLangfuseAdapter(
  config: LangfuseAdapterConfig,
): LangfuseAdapter {
  return new LangfuseAdapter(config);
}

/**
 * Create and start a Langfuse adapter
 */
export function startLangfuseAdapter(
  config: LangfuseAdapterConfig,
): LangfuseAdapter {
  const adapter = new LangfuseAdapter(config);
  adapter.start();
  return adapter;
}

/**
 * Helper: Create a mock Langfuse client for testing
 */
export function createMockLangfuseClient(): LangfuseClient & {
  scores: Array<{
    name: string;
    value: number;
    traceId?: string;
    comment?: string;
    metadata?: Record<string, unknown>;
  }>;
} {
  const scores: Array<{
    name: string;
    value: number;
    traceId?: string;
    comment?: string;
    metadata?: Record<string, unknown>;
  }> = [];

  return {
    scores,
    score: async (params) => {
      scores.push(params);
      return { id: `score-${scores.length}` };
    },
    shutdown: async () => {},
  };
}
