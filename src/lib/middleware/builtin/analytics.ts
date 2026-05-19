import type {
  NeuroLinkMiddleware,
  NeuroLinkMiddlewareMetadata,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import type { LanguageModelMiddleware } from "../../types/index.js";

/**
 * Create analytics middleware for tracking AI model usage
 * Collects metrics on token usage, response times, and model performance
 */
export function createAnalyticsMiddleware(): NeuroLinkMiddleware {
  const requestMetrics = new Map<string, Record<string, unknown>>();

  const metadata: NeuroLinkMiddlewareMetadata = {
    id: "analytics",
    name: "Analytics Tracking",
    description:
      "Tracks token usage, response times, and model performance metrics",
    priority: 100, // High priority to ensure analytics are captured
    defaultEnabled: true,
  };

  const middleware: LanguageModelMiddleware = {
    specificationVersion: "v3" as const,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wrapGenerate: async ({ doGenerate, params }: any) => {
      const requestId = `analytics-${Date.now()}`;
      const startTime = Date.now();

      logger.debug(`[AnalyticsMiddleware] Starting request tracking`, {
        requestId,
        hasPrompt: !!params.prompt,
      });

      try {
        // Execute the generation
        const result = await doGenerate();

        // Calculate metrics
        const responseTime = Date.now() - startTime;
        const analytics = {
          requestId,
          responseTime,
          timestamp: new Date().toISOString(),
          usage: {
            input: result.usage?.promptTokens ?? 0,
            output: result.usage?.completionTokens ?? 0,
            total:
              (result.usage?.promptTokens ?? 0) +
              (result.usage?.completionTokens ?? 0),
          },
        };

        // Store metrics for potential retrieval
        requestMetrics.set(requestId, analytics);

        logger.debug(`[AnalyticsMiddleware] Request completed`, analytics);

        // Add analytics to the result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updatedResult: any = { ...result };
        if (!updatedResult.experimental_providerMetadata) {
          updatedResult.experimental_providerMetadata = {};
        }
        if (!updatedResult.experimental_providerMetadata.neurolink) {
          updatedResult.experimental_providerMetadata.neurolink = {};
        }
        updatedResult.experimental_providerMetadata.neurolink.analytics =
          analytics;

        return updatedResult;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        logger.error(`[AnalyticsMiddleware] Request failed`, {
          requestId,
          responseTime,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    wrapStream: async ({ doStream, params }: any) => {
      const requestId = `analytics-stream-${Date.now()}`;
      const startTime = Date.now();

      logger.debug(`[AnalyticsMiddleware] Starting stream tracking`, {
        requestId,
        hasPrompt: !!params.prompt,
      });

      try {
        const result = await doStream();

        const streamAnalytics = {
          requestId,
          startTime,
          timestamp: new Date().toISOString(),
          streamingMode: true,
        };

        requestMetrics.set(requestId, streamAnalytics);

        // Ensure the result includes all required properties
        const updatedResult = {
          ...result,
          stream: result.stream || new ReadableStream(),
          rawCall: result.rawCall || { rawPrompt: null, rawSettings: {} },
          rawResponse: {
            ...(result.rawResponse || {}),
            neurolink: {
              ...((
                result.rawResponse as { neurolink?: Record<string, unknown> }
              )?.neurolink ?? {}),
              analytics: streamAnalytics,
            },
          },
        };

        return updatedResult;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        logger.error(`[AnalyticsMiddleware] Stream failed`, {
          requestId,
          responseTime,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
  };

  // Return the NeuroLinkMiddleware with metadata
  return {
    ...middleware,
    metadata,
  };
}

/**
 * Get collected metrics from analytics middleware
 * Note: This is a utility function for accessing metrics
 */
export function getAnalyticsMetrics(): Map<string, Record<string, unknown>> {
  // This would need to be implemented with a global registry
  // For now, return empty map
  return new Map();
}

/**
 * Clear collected metrics from analytics middleware
 * Note: This is a utility function for clearing metrics
 */
export function clearAnalyticsMetrics(): void {
  // This would need to be implemented with a global registry
  // For now, do nothing
}
