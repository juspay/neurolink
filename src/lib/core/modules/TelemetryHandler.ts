/**
 * Telemetry Handler Module
 *
 * Handles analytics, evaluation, performance metrics, and telemetry configuration.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Analytics creation and tracking
 * - Evaluation generation
 * - Performance metrics recording
 * - Cost calculation
 * - Telemetry configuration
 *
 * @module core/modules/TelemetryHandler
 */

import type {
  AIProviderName,
  EnhancedGenerateResult,
  TextGenerationOptions,
  AnalyticsData,
} from "../../types/index.js";
import type { Context } from "../../types/common.js";
import type { EvaluationData } from "../../types/index.js";
import type { StreamOptions } from "../../types/streamTypes.js";
import { logger } from "../../utils/logger.js";
import { nanoid } from "nanoid";
import { modelConfig } from "../modelConfiguration.js";
import {
  recordProviderPerformanceFromMetrics,
  getPerformanceOptimizedProvider,
} from "../evaluationProviders.js";
import type { NeuroLink } from "../../neurolink.js";

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
    usage:
      | { promptTokens: number; completionTokens: number; totalTokens: number }
      | undefined,
    responseTime: number,
  ): Promise<void> {
    try {
      const actualCost = await this.calculateActualCost(
        usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      );

      recordProviderPerformanceFromMetrics(this.providerName, {
        responseTime,
        tokensGenerated: usage?.totalTokens || 0,
        cost: actualCost,
        success: true,
      });

      const optimizedProvider = getPerformanceOptimizedProvider("speed");
      logger.debug(`🚀 Performance recorded for ${this.providerName}:`, {
        responseTime: `${responseTime}ms`,
        tokens: usage?.totalTokens || 0,
        estimatedCost: `$${actualCost.toFixed(6)}`,
        recommendedSpeedProvider: optimizedProvider?.provider || "none",
      });
    } catch (perfError) {
      logger.warn("⚠️ Performance recording failed:", perfError);
    }
  }

  /**
   * Calculate actual cost based on token usage and provider configuration
   */
  async calculateActualCost(usage: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  }): Promise<number> {
    try {
      const costInfo = modelConfig.getCostInfo(
        this.providerName,
        this.modelName,
      );
      if (!costInfo) {
        return 0; // No cost info available
      }

      const promptTokens = usage?.promptTokens || 0;
      const completionTokens = usage?.completionTokens || 0;

      // Calculate cost per 1K tokens
      const inputCost = (promptTokens / 1000) * costInfo.input;
      const outputCost = (completionTokens / 1000) * costInfo.output;

      return inputCost + outputCost;
    } catch (error) {
      logger.debug(`Cost calculation failed for ${this.providerName}:`, error);
      return 0; // Fallback to 0 on any error
    }
  }

  /**
   * Create telemetry configuration for Vercel AI SDK experimental_telemetry
   * This enables automatic OpenTelemetry tracing when telemetry is enabled
   */
  getTelemetryConfig(
    options: StreamOptions | TextGenerationOptions,
    operationType: "stream" | "generate" = "stream",
  ):
    | {
        isEnabled: boolean;
        functionId?: string;
        metadata?: Record<string, string | number | boolean>;
      }
    | undefined {
    // Check if telemetry is enabled via NeuroLink observability config
    if (!this.neurolink?.isTelemetryEnabled()) {
      return undefined;
    }

    const context = options.context as Context;
    const traceName = context?.traceName;
    const userId = context?.userId;
    const functionId = traceName ? traceName : userId ? userId : "guest";

    const metadata: Record<string, string | number | boolean> = {
      ...(context?.metadata || {}),
      provider: this.providerName,
      model: this.modelName,
      toolsEnabled: !options.disableTools,
      neurolink: true,
      operationType,
      originalProvider: this.providerName,
    };

    // Add sessionId if available
    if ("sessionId" in options && options.sessionId) {
      const sessionId = options.sessionId;
      if (
        typeof sessionId === "string" ||
        typeof sessionId === "number" ||
        typeof sessionId === "boolean"
      ) {
        metadata.sessionId = sessionId;
      }
    }

    return {
      isEnabled: true,
      functionId,
      metadata,
    };
  }

  /**
   * Handle tool execution storage if available
   */
  async handleToolExecutionStorage(
    toolCalls: unknown[],
    toolResults: unknown[],
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
      (options as unknown as { sessionId?: string }).sessionId ||
      `session-${nanoid()}`;
    const userId =
      (options.context?.userId as string) ||
      (options as unknown as { userId?: string }).userId;

    try {
      await this.neurolink.storeToolExecutions(
        sessionId,
        userId,
        toolCalls as Array<{
          toolCallId?: string;
          toolName?: string;
          args?: Record<string, unknown>;
          [key: string]: unknown;
        }>,
        toolResults as Array<{
          toolCallId?: string;
          toolName?: string;
          result?: unknown;
          [key: string]: unknown;
        }>,
        currentTime,
      );
    } catch (error) {
      logger.warn("Failed to store tool executions:", error);
    }
  }
}
