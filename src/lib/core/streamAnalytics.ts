import type {
  AnalyticsData,
  TokenUsage,
  StreamTextResult,
  StreamAnalyticsCollector,
  ResponseMetadata,
} from "../types/index.js";
import { createAnalytics } from "./analytics.js";
import { logger } from "../utils/logger.js";
import {
  extractTokenUsage,
  createEmptyTokenUsage,
} from "../utils/tokenUtils.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";

/**
 * Base implementation for collecting analytics from Vercel AI SDK stream results
 */
export class BaseStreamAnalyticsCollector implements StreamAnalyticsCollector {
  /**
   * Collect token usage from stream result
   * Uses centralized tokenUtils for consistent extraction across providers
   */
  async collectUsage(result: StreamTextResult): Promise<TokenUsage> {
    try {
      const usage = await result.usage;

      if (!usage) {
        logger.debug("No usage data available from stream result");
        return createEmptyTokenUsage();
      }

      // Use centralized token extraction utility
      // Handles multiple provider formats, cache tokens, reasoning tokens,
      // and cache savings calculation
      return extractTokenUsage(usage);
    } catch (error) {
      if (NoOutputGeneratedError.isInstance(error)) {
        logger.debug("No output generated from stream — returning empty usage");
      } else {
        logger.warn("Failed to collect usage from stream result", { error });
      }
      return createEmptyTokenUsage();
    }
  }

  /**
   * Collect response metadata from stream result
   */
  async collectMetadata(result: StreamTextResult): Promise<ResponseMetadata> {
    try {
      const [response, finishReason] = await Promise.all([
        result.response,
        result.finishReason,
      ]);

      return {
        id: response?.id,
        model: response?.model,
        timestamp:
          response?.timestamp instanceof Date
            ? response.timestamp.getTime()
            : response?.timestamp || Date.now(),
        finishReason: finishReason,
      };
    } catch (error) {
      if (NoOutputGeneratedError.isInstance(error)) {
        logger.debug(
          "No output generated from stream — returning default metadata",
        );
      } else {
        logger.warn("Failed to collect metadata from stream result", {
          error,
        });
      }
      return {
        timestamp: Date.now(),
        finishReason: "error" as const,
      };
    }
  }

  /**
   * Create comprehensive analytics from stream result
   */
  async createAnalytics(
    provider: string,
    model: string,
    result: StreamTextResult,
    responseTime: number,
    metadata?: Record<string, unknown>,
  ): Promise<AnalyticsData> {
    try {
      // Collect analytics data in parallel
      const [usage, responseMetadata] = await Promise.all([
        this.collectUsage(result),
        this.collectMetadata(result),
      ]);

      // Get final text content and finish reason.
      // Guard each promise individually: AI SDK v6 rejects all of these with
      // NoOutputGeneratedError when the stream produced no output.
      const [content, finishReason, toolResults, toolCalls] = await Promise.all(
        [
          Promise.resolve(result.text).catch(() => ""),
          Promise.resolve(result.finishReason).catch(() => "error" as const),
          Promise.resolve(result.toolResults || []).catch(() => []),
          Promise.resolve(result.toolCalls || []).catch(() => []),
        ],
      );

      // Create comprehensive analytics
      return createAnalytics(
        provider,
        model,
        {
          usage,
          content,
          response: responseMetadata,
          finishReason: finishReason,
          toolResults: toolResults,
          toolCalls: toolCalls,
        },
        responseTime,
        {
          ...metadata,
          streamingMode: true,
          responseId: responseMetadata.id,
          finishReason: finishReason,
        },
      );
    } catch (error) {
      logger.error("Failed to create analytics from stream result", {
        provider,
        model,
        error: error instanceof Error ? error.message : String(error),
      });

      // Return minimal analytics on error
      return createAnalytics(
        provider,
        model,
        { usage: { input: 0, output: 0, total: 0 } },
        responseTime,
        {
          ...metadata,
          streamingMode: true,
          analyticsError: true,
        },
      );
    }
  }

  /**
   * Clean up resources and force garbage collection if needed
   */
  cleanup(): void {
    // Only force garbage collection if memory usage exceeds 500 MB
    const heapUsed = process.memoryUsage().heapUsed;
    const GC_THRESHOLD = 500 * 1024 * 1024; // 500 MB
    if (typeof global !== "undefined" && global.gc && heapUsed > GC_THRESHOLD) {
      global.gc();
    }
  }
}

/**
 * Global instance of stream analytics collector
 */
export const streamAnalyticsCollector = new BaseStreamAnalyticsCollector();
