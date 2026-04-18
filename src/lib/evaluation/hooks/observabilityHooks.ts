/**
 * @file Observability Hooks
 * OpenTelemetry integration for evaluation tracing
 */

import type {
  EvaluationEvents,
  EvaluationSpanAttributes,
  EvaluationTraceContext,
  EventHandler,
  PipelineResult,
  ScoreResult,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Observability hooks manager
 */
export class ObservabilityHooks {
  private _handlers: Map<string, Set<EventHandler<unknown>>> = new Map();
  private _traceContext?: EvaluationTraceContext;
  private _enabled = true;

  /**
   * Enable/disable observability
   */
  set enabled(value: boolean) {
    this._enabled = value;
  }

  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Set trace context for all events
   */
  setTraceContext(context: EvaluationTraceContext): void {
    this._traceContext = context;
  }

  /**
   * Clear trace context
   */
  clearTraceContext(): void {
    this._traceContext = undefined;
  }

  /**
   * Get current trace context
   */
  getTraceContext(): EvaluationTraceContext | undefined {
    return this._traceContext;
  }

  /**
   * Register an event handler
   */
  on<K extends keyof EvaluationEvents>(
    event: K,
    handler: EventHandler<EvaluationEvents[K]>,
  ): () => void {
    let handlers = this._handlers.get(event);
    if (!handlers) {
      handlers = new Set();
      this._handlers.set(event, handlers);
    }

    handlers.add(handler as EventHandler<unknown>);

    // Return unsubscribe function
    return () => {
      this._handlers.get(event)?.delete(handler as EventHandler<unknown>);
    };
  }

  /**
   * Remove an event handler
   */
  off<K extends keyof EvaluationEvents>(
    event: K,
    handler: EventHandler<EvaluationEvents[K]>,
  ): void {
    this._handlers.get(event)?.delete(handler as EventHandler<unknown>);
  }

  /**
   * Emit an event
   */
  async emit<K extends keyof EvaluationEvents>(
    event: K,
    data: Omit<EvaluationEvents[K], "traceContext">,
  ): Promise<void> {
    if (!this._enabled) {
      return;
    }

    const handlers = this._handlers.get(event);
    if (!handlers || handlers.size === 0) {
      return;
    }

    const eventData = {
      ...data,
      traceContext: this._traceContext,
    } as EvaluationEvents[K];

    const promises: Promise<void>[] = [];

    for (const handler of handlers) {
      try {
        const result = handler(eventData);
        if (result instanceof Promise) {
          promises.push(
            result.catch((err) => {
              logger.error(`Event handler error for ${event}`, { error: err });
            }),
          );
        }
      } catch (error) {
        logger.error(`Event handler error for ${event}`, { error });
      }
    }

    // Wait for async handlers
    await Promise.all(promises);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this._handlers.clear();
  }

  /**
   * Get handler count for an event
   */
  listenerCount(event: keyof EvaluationEvents): number {
    return this._handlers.get(event)?.size ?? 0;
  }
}

/**
 * Global observability hooks instance
 */
export const observabilityHooks = new ObservabilityHooks();

/**
 * Helper: Create a console logger hook
 */
export function createConsoleLoggerHook(): void {
  observabilityHooks.on("scorer:start", (event) => {
    logger.info(
      `[SCORER] ${event.scorerName} started at ${new Date(event.timestamp).toISOString()}`,
    );
  });

  observabilityHooks.on("scorer:end", (event) => {
    logger.info(
      `[SCORER] ${event.scorerName} completed: score=${event.result.score.toFixed(1)}, ` +
        `passed=${event.result.passed}, duration=${event.duration}ms`,
    );
  });

  observabilityHooks.on("scorer:error", (event) => {
    logger.error(`[SCORER] ${event.scorerName} error: ${event.error}`);
  });

  observabilityHooks.on("pipeline:start", (event) => {
    logger.info(
      `[PIPELINE] ${event.pipelineName} started with ${event.scorerCount} scorers ` +
        `(correlationId: ${event.correlationId})`,
    );
  });

  observabilityHooks.on("pipeline:end", (event) => {
    logger.info(
      `[PIPELINE] ${event.pipelineName} completed: overall=${event.result.overallScore.toFixed(1)}, ` +
        `passed=${event.result.passed}, duration=${event.duration}ms`,
    );
  });

  observabilityHooks.on("pipeline:error", (event) => {
    logger.error(`[PIPELINE] ${event.pipelineName} error: ${event.error}`);
  });
}

/**
 * Helper: Create a metrics collector hook
 * Accepts the actual MetricsCollector interface from reporting/metricsCollector
 */
export function createMetricsCollectorHook(collector: {
  recordScorer: (
    scorerId: string,
    scorerName: string,
    result: ScoreResult,
  ) => void;
  recordPipeline: (result: PipelineResult) => void;
}): void {
  observabilityHooks.on("scorer:end", (event) => {
    collector.recordScorer(event.scorerId, event.scorerName, event.result);
  });

  observabilityHooks.on("pipeline:end", (event) => {
    collector.recordPipeline(event.result);
  });
}

/**
 * OpenTelemetry span attributes
 */
/**
 * Create span attributes from scorer result
 */
export function scorerToSpanAttributes(
  result: ScoreResult,
): EvaluationSpanAttributes {
  return {
    "scorer.id": result.scorerId,
    "scorer.name": result.scorerName,
    "scorer.score": result.score,
    "scorer.normalizedScore": result.normalizedScore,
    "scorer.passed": result.passed,
    "scorer.threshold": result.threshold,
    "scorer.computeTime": result.computeTime,
    ...(result.confidence !== undefined && {
      "scorer.confidence": result.confidence,
    }),
    ...(result.error && { "scorer.error": result.error }),
  };
}

/**
 * Create span attributes from pipeline result
 */
export function pipelineToSpanAttributes(
  result: PipelineResult,
): EvaluationSpanAttributes {
  return {
    "pipeline.name": result.pipelineConfig.name ?? "unnamed",
    "pipeline.overallScore": result.overallScore,
    "pipeline.passed": result.passed,
    "pipeline.aggregationMethod": result.aggregationMethod,
    "pipeline.scorerCount": result.scores.length,
    "pipeline.totalComputeTime": result.totalComputeTime,
    "pipeline.errorCount": result.errors.length,
    "pipeline.skippedCount": result.skippedScorers.length,
    ...(result.correlationId && {
      "pipeline.correlationId": result.correlationId,
    }),
  };
}
