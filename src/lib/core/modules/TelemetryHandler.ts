/**
 * Telemetry Handler Module
 *
 * Handles analytics, evaluation and performance metrics.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Analytics creation and tracking
 * - Evaluation generation
 * - Performance metrics recording
 * - Cost calculation
 *
 * @module core/modules/TelemetryHandler
 */

import { nanoid } from "nanoid";
import type { NeuroLink } from "../../neurolink.js";
import type {
  StreamOptions,
  AIProviderName,
  AnalyticsData,
  EnhancedGenerateResult,
  EvaluationData,
  MemoryToolCallRecord,
  MemoryToolResultRecord,
  RawUsageObject,
  TextGenerationOptions,
  TokenUsage,
  TTSMetadata,
} from "../../types/index.js";
import { extractTokenUsage } from "../../utils/tokenUtils.js";
import { logger } from "../../utils/logger.js";
import { recordProviderPerformanceFromMetrics } from "../evaluationProviders.js";
import {
  recordAIRequest,
  recordCustomHistogram,
  recordCustomMetric,
} from "../../telemetry/aiMetrics.js";
import { calculateCost, hasPricing } from "../../utils/pricing.js";

/**
 * TelemetryHandler class - Handles analytics and telemetry for AI providers
 */
export class TelemetryHandler {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
    private readonly neurolink?: NeuroLink,
  ) {}

  /**
   * Create analytics for a generation result
   */
  async createAnalytics(
    result: EnhancedGenerateResult,
    responseTime: number,
    context?: Record<string, unknown>,
  ): Promise<AnalyticsData> {
    const { createAnalytics } = await import("../analytics.js");
    return createAnalytics(
      this.providerName,
      this.modelName,
      result,
      responseTime,
      context,
    );
  }

  /**
   * Create evaluation for a generation result
   */
  async createEvaluation(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ): Promise<EvaluationData> {
    const { evaluateResponse } = await import("../evaluation.js");
    const context = {
      userQuery: options.prompt || options.input?.text || "Generated response",
      aiResponse: result.content,
      context: options.context,
      primaryDomain: options.evaluationDomain,
      assistantRole: "AI assistant",
      conversationHistory: options.conversationHistory?.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      toolUsage: options.toolUsageContext
        ? [
            {
              toolName: options.toolUsageContext,
              input: {},
              output: {},
              executionTime: 0,
            },
          ]
        : undefined,
      expectedOutcome: options.expectedOutcome,
      evaluationCriteria: options.evaluationCriteria,
    };
    const evaluation = await evaluateResponse(context);
    return evaluation as EvaluationData;
  }

  /**
   * Record performance metrics for a generation
   */
  async recordPerformanceMetrics(
    usage: RawUsageObject | undefined,
    responseTime: number,
  ): Promise<void> {
    try {
      // Normalize first: rebases cache-inclusive ai@6 input onto the uncached
      // remainder and surfaces cache tiers so the cost is priced per tier
      // instead of billing cache reads at the full input rate.
      const tokenUsage = extractTokenUsage(usage);
      const totalTokens = tokenUsage.total;
      const actualCost = await this.calculateActualCost(tokenUsage);

      recordProviderPerformanceFromMetrics(this.providerName, {
        responseTime,
        tokensGenerated: totalTokens,
        cost: actualCost,
        success: true,
      });

      recordAIRequest(
        this.providerName,
        this.modelName,
        totalTokens,
        responseTime,
        actualCost !== undefined && actualCost > 0 ? actualCost : undefined,
      );

      logger.debug(`Performance recorded for ${this.providerName}`, {
        responseTime: `${responseTime}ms`,
        tokens: totalTokens,
        estimatedCost:
          actualCost === undefined ? "unknown" : `$${actualCost.toFixed(6)}`,
      });
    } catch (perfError) {
      logger.warn("⚠️ Performance recording failed:", perfError);
    }
  }

  /**
   * Record a TTS synthesis failure without affecting the generation result.
   */
  recordTTSFailure(
    ttsProvider: string,
    error: NonNullable<TTSMetadata["error"]>,
    latency: number,
  ): void {
    const labels = {
      provider: ttsProvider,
      error_code: error.code,
      ...(error.retriable !== undefined
        ? { retriable: error.retriable.toString() }
        : {}),
    };
    recordCustomMetric("tts_failures", 1, labels);
    recordCustomHistogram("tts_failure_latency_ms", latency, labels);
  }

  /**
   * Estimate cost only from known per-model rates. Unknown pricing remains
   * absent from cost metrics instead of using another model's default rate.
   */
  async calculateActualCost(usage: TokenUsage): Promise<number | undefined> {
    try {
      // Try the per-model pricing table first (includes correct rates for
      // Claude on Vertex, cache token rates, etc.)
      if (hasPricing(this.providerName, this.modelName)) {
        return calculateCost(this.providerName, this.modelName, usage);
      }

      return undefined;
    } catch (error) {
      logger.debug(`Cost calculation failed for ${this.providerName}:`, error);
      return undefined;
    }
  }

  /**
   * Handle tool execution storage if available
   */
  async handleToolExecutionStorage(
    toolCalls: MemoryToolCallRecord[],
    toolResults: MemoryToolResultRecord[],
    options: TextGenerationOptions | StreamOptions,
    currentTime: Date,
  ): Promise<void> {
    // Check if tools are not empty
    const hasToolData =
      (toolCalls && toolCalls.length > 0) ||
      (toolResults && toolResults.length > 0);

    // Check if NeuroLink instance is available and has tool execution storage
    const hasStorageAvailable =
      this.neurolink?.isToolExecutionStorageAvailable();

    // Early return if storage is not available or no tool data
    if (!hasStorageAvailable || !hasToolData || !this.neurolink) {
      return;
    }

    const sessionId =
      (options.context?.sessionId as string) ||
      (("sessionId" in options ? options.sessionId : undefined) as
        | string
        | undefined) ||
      `session-${nanoid()}`;
    const userId =
      (options.context?.userId as string) ||
      (("userId" in options ? options.userId : undefined) as
        | string
        | undefined);

    try {
      await this.neurolink.storeToolExecutions(
        sessionId,
        userId,
        toolCalls,
        toolResults,
        currentTime,
      );
    } catch (error) {
      logger.warn("Failed to store tool executions:", error);
    }
  }
}
