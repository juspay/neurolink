/**
 * Model Router for NeuroLink Orchestration
 * Routes tasks to optimal models based on classification and requirements
 */

import { logger } from "./logger.js";
import { BinaryTaskClassifier } from "./taskClassifier.js";
import type {
  TaskType,
  TaskClassification,
} from "../types/taskClassificationTypes.js";
import { redactForRouting } from "./promptRedaction.js";
import type { ModelRoute, ModelRoutingOptions } from "../types/modelTypes.js";

/**
 * Routing configuration constants
 */
const ROUTING_CONFIG = {
  minRouteConfidence: 0.3,
  maxRouteConfidence: 0.95,
  confidenceBoost: 0.1,
} as const;

/**
 * Model configurations for different task types and providers
 */
const MODEL_CONFIGS = {
  fast: {
    primary: {
      provider: "vertex",
      model: "gemini-2.5-flash",
      capabilities: ["speed", "general", "code", "basic-reasoning"],
      avgResponseTime: 800, // ms
      costPerToken: 0.0001,
      reasoning: "Optimized for speed and efficiency via Vertex AI",
    },
    fallback: {
      provider: "vertex",
      model: "gemini-2.5-pro",
      capabilities: ["speed", "general", "basic-reasoning"],
      avgResponseTime: 1200,
      costPerToken: 0.0002,
      reasoning: "Vertex AI Gemini Pro fallback",
    },
  },
  reasoning: {
    primary: {
      provider: "vertex",
      model: "claude-sonnet-4@20250514",
      capabilities: [
        "reasoning",
        "analysis",
        "complex-logic",
        "code",
        "creativity",
      ],
      avgResponseTime: 3000, // ms
      costPerToken: 0.003,
      reasoning:
        "Advanced reasoning and analysis via Claude Sonnet 4 on Vertex AI",
    },
    fallback: {
      provider: "vertex",
      model: "claude-opus-4@20250514",
      capabilities: [
        "reasoning",
        "analysis",
        "complex-logic",
        "code",
        "creativity",
        "agentic",
      ],
      avgResponseTime: 4000,
      costPerToken: 0.005,
      reasoning: "Claude Opus 4 fallback on Vertex AI for most complex tasks",
    },
  },
} as const;

/**
 * Model Router
 * Intelligently routes tasks to optimal models based on classification
 */
export class ModelRouter {
  /**
   * Route a prompt to the optimal model configuration
   */
  static route(prompt: string, options: ModelRoutingOptions = {}): ModelRoute {
    const startTime = Date.now();

    // 1. Classify the task if not overridden
    let classification: TaskClassification;
    if (options.forceTaskType) {
      classification = {
        type: options.forceTaskType,
        confidence: ROUTING_CONFIG.maxRouteConfidence, // Use maxRouteConfidence instead of 1.0
        reasoning: "forced task type",
      };
    } else {
      classification = BinaryTaskClassifier.classify(prompt);
    }

    // 2. Apply special requirements
    let taskType = classification.type;
    const reasons: string[] = [classification.reasoning];

    if (options.requireFast) {
      taskType = "fast";
      reasons.push("speed required");
    }

    if (options.requireCapability) {
      // Check if the capability suggests a specific task type
      const capability = options.requireCapability.toLowerCase();
      if (
        ["analysis", "reasoning", "complex", "research"].some((c) =>
          capability.includes(c),
        )
      ) {
        taskType = "reasoning";
        reasons.push(`capability: ${capability}`);
      } else if (
        ["speed", "quick", "fast", "simple"].some((c) => capability.includes(c))
      ) {
        taskType = "fast";
        reasons.push(`capability: ${capability}`);
      }
    }

    // 3. Select model configuration
    const config = MODEL_CONFIGS[taskType];
    const selectedConfig = config.primary;

    // 4. Calculate confidence based on multiple factors
    let confidence = classification.confidence;

    // Adjust confidence based on prompt characteristics
    if (taskType === "fast" && prompt.length < 30) {
      confidence = Math.min(
        ROUTING_CONFIG.maxRouteConfidence,
        confidence + ROUTING_CONFIG.confidenceBoost,
      );
      reasons.push("very short prompt");
    }

    if (taskType === "reasoning" && prompt.length > 150) {
      confidence = Math.min(
        ROUTING_CONFIG.maxRouteConfidence,
        confidence + ROUTING_CONFIG.confidenceBoost,
      );
      reasons.push("detailed prompt");
    }

    // Ensure final confidence is within configured bounds
    confidence = Math.max(
      ROUTING_CONFIG.minRouteConfidence,
      Math.min(ROUTING_CONFIG.maxRouteConfidence, confidence),
    );

    // 5. Create route result
    const route: ModelRoute = {
      provider: selectedConfig.provider,
      model: selectedConfig.model,
      reasoning: reasons.join(", "),
      confidence,
    };

    const routingTime = Date.now() - startTime;

    logger.debug("Model routing decision", {
      prompt: redactForRouting(prompt),
      taskType,
      route: {
        provider: route.provider,
        model: route.model,
        confidence: route.confidence.toFixed(2),
      },
      reasoning: route.reasoning,
      routingTime: `${routingTime}ms`,
      options: Object.keys(options).length > 0 ? options : undefined,
    });

    return route;
  }

  /**
   * Get fallback route if primary route fails
   */
  static getFallbackRoute(
    prompt: string,
    primaryRoute: ModelRoute,
    options: ModelRoutingOptions = {},
  ): ModelRoute {
    // Determine fallback strategy
    let fallbackType: TaskType;

    if (options.fallbackStrategy) {
      if (options.fallbackStrategy === "auto") {
        // Use opposite of primary for fallback
        const primaryType = this.getTaskTypeFromRoute(primaryRoute);
        fallbackType = primaryType === "fast" ? "reasoning" : "fast";
      } else {
        fallbackType = options.fallbackStrategy;
      }
    } else {
      // Default: use fallback model of same type
      fallbackType = this.getTaskTypeFromRoute(primaryRoute);
    }

    const config = MODEL_CONFIGS[fallbackType];
    const fallbackConfig = config.fallback;

    const route: ModelRoute = {
      provider: fallbackConfig.provider,
      model: fallbackConfig.model,
      reasoning: `fallback from ${primaryRoute.provider}/${primaryRoute.model}`,
      confidence: Math.max(
        ROUTING_CONFIG.minRouteConfidence,
        Math.min(
          ROUTING_CONFIG.maxRouteConfidence,
          primaryRoute.confidence - 0.2,
        ),
      ),
    };

    logger.debug("Fallback route selected", {
      originalRoute: `${primaryRoute.provider}/${primaryRoute.model}`,
      fallbackRoute: `${route.provider}/${route.model}`,
      fallbackType,
      strategy: options.fallbackStrategy || "default",
    });

    return route;
  }

  /**
   * Determine task type from a model route
   */
  private static getTaskTypeFromRoute(route: ModelRoute): TaskType {
    // Check which config matches this route
    for (const [taskType, config] of Object.entries(MODEL_CONFIGS)) {
      if (
        config.primary.provider === route.provider &&
        config.primary.model === route.model
      ) {
        return taskType as TaskType;
      }
      if (
        config.fallback.provider === route.provider &&
        config.fallback.model === route.model
      ) {
        return taskType as TaskType;
      }
    }

    // Default fallback based on model name patterns
    if (route.model.includes("flash") || route.model.includes("mini")) {
      return "fast";
    }
    return "reasoning";
  }

  /**
   * Get all available model configurations
   */
  static getAvailableModels(): typeof MODEL_CONFIGS {
    return MODEL_CONFIGS;
  }

  /**
   * Validate model availability for a given route
   */
  static async validateRoute(route: ModelRoute): Promise<boolean> {
    try {
      // This would typically check provider availability
      // For now, just validate the configuration exists
      const configs = Object.values(MODEL_CONFIGS).flatMap((config) => [
        config.primary,
        config.fallback,
      ]);

      return configs.some(
        (config) =>
          config.provider === route.provider && config.model === route.model,
      );
    } catch (error) {
      logger.error("Route validation failed", {
        route,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get routing statistics for multiple prompts
   */
  static getRoutingStats(prompts: string[]): {
    total: number;
    fastRoutes: number;
    reasoningRoutes: number;
    averageConfidence: number;
    providerDistribution: Record<string, number>;
  } {
    const routes = prompts.map((prompt) => this.route(prompt));

    // Handle empty prompts array to avoid divide-by-zero
    if (routes.length === 0) {
      const stats = {
        total: 0,
        fastRoutes: 0,
        reasoningRoutes: 0,
        averageConfidence: 0,
        providerDistribution: {} as Record<string, number>,
      };

      logger.debug("Routing statistics", stats);
      return stats;
    }

    const stats = {
      total: routes.length,
      fastRoutes: routes.filter((r) => {
        const taskType = this.getTaskTypeFromRoute(r);
        return taskType === "fast";
      }).length,
      reasoningRoutes: routes.filter((r) => {
        const taskType = this.getTaskTypeFromRoute(r);
        return taskType === "reasoning";
      }).length,
      averageConfidence:
        routes.reduce((sum, r) => sum + r.confidence, 0) / routes.length,
      providerDistribution: routes.reduce(
        (dist, r) => {
          dist[r.provider] = (dist[r.provider] || 0) + 1;
          return dist;
        },
        {} as Record<string, number>,
      ),
    };

    logger.debug("Routing statistics", stats);
    return stats;
  }

  /**
   * Estimate cost and performance for a route
   */
  static getRouteEstimates(
    route: ModelRoute,
    estimatedTokens: number = 500,
  ): {
    estimatedCost: number;
    estimatedResponseTime: number;
    capabilities: string[];
  } {
    // Find the config for this route
    const allConfigs = Object.values(MODEL_CONFIGS).flatMap((config) => [
      config.primary,
      config.fallback,
    ]);

    const config = allConfigs.find(
      (c) => c.provider === route.provider && c.model === route.model,
    );

    if (!config) {
      return {
        estimatedCost: 0,
        estimatedResponseTime: 2000,
        capabilities: [],
      };
    }

    return {
      estimatedCost: config.costPerToken * estimatedTokens,
      estimatedResponseTime: config.avgResponseTime,
      capabilities: [...config.capabilities],
    };
  }
}
