/**
 * Routing Agent Implementation
 *
 * The RoutingAgent is responsible for analyzing tasks and selecting the most
 * appropriate primitive (agent, workflow, or tool) to handle them. It uses
 * LLM-based analysis with confidence scoring and fallback mechanisms.
 */

import { randomUUID } from "crypto";
import type {
  RoutingDecision,
  RoutingAnalysis,
  Primitive,
  RouterConfig,
} from "./types/agentTypes.js";
import { RoutingError } from "./errors/agentErrors.js";
import { logger } from "../utils/logger.js";

// ============================================================================
// Routing Prompts
// ============================================================================

/**
 * Default routing prompt template
 */
const DEFAULT_ROUTING_PROMPT = `You are a task routing agent responsible for analyzing tasks and selecting the best primitive to handle them.

Available Primitives:
{{PRIMITIVES}}

Task to route: {{TASK}}

Analyze the task and select the most appropriate primitive. Consider:
1. The primitive's description and capabilities
2. The input requirements and expected output
3. Task complexity and required tools
4. Previous context if available

Respond in JSON format only (no markdown):
{
  "selectedPrimitive": {
    "type": "agent" | "workflow" | "tool",
    "id": "<primitive_id>",
    "name": "<primitive_name>"
  },
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief explanation of why this primitive was selected>",
  "formattedInput": "<reformatted input for the selected primitive if needed>",
  "alternatives": [
    {
      "type": "agent" | "workflow" | "tool",
      "id": "<alternative_primitive_id>",
      "confidence": <number between 0 and 1>
    }
  ]
}`;

// ============================================================================
// Routing Agent Class
// ============================================================================

/**
 * RoutingAgent for intelligent task routing in multi-agent networks
 *
 * @example
 * ```typescript
 * const router = new RoutingAgent({
 *   model: 'gpt-4o',
 *   confidenceThreshold: 0.7
 * }, neurolink);
 *
 * const decision = await router.route(task, primitives, { traceId: 'trace-123' });
 * ```
 */
export class RoutingAgent {
  private sdk: unknown;
  private config: RouterConfig;
  private routingHistory: RoutingDecision[] = [];

  constructor(config: RouterConfig, sdk: unknown) {
    this.config = {
      maxAttempts: 3,
      confidenceThreshold: 0.5,
      ...config,
    };
    this.sdk = sdk;

    logger.debug("[RoutingAgent] Initialized", {
      model: this.config.model,
      confidenceThreshold: this.config.confidenceThreshold,
    });
  }

  /**
   * Route a task to the most appropriate primitive
   */
  async route(
    task: string,
    primitives: Primitive[],
    options?: {
      stepIndex?: number;
      traceId?: string;
      context?: Record<string, unknown>;
    },
  ): Promise<RoutingDecision> {
    const traceId = options?.traceId ?? randomUUID();
    const stepIndex = options?.stepIndex ?? 0;

    logger.debug("[RoutingAgent] Routing task", {
      traceId,
      stepIndex,
      task: task.slice(0, 100),
      primitiveCount: primitives.length,
    });

    if (primitives.length === 0) {
      throw new RoutingError("No primitives available for routing", {
        task,
        traceId,
        stepIndex,
      });
    }

    // If only one primitive, route directly with high confidence
    if (primitives.length === 1) {
      const primitive = primitives[0];
      return this.createRoutingDecision(
        stepIndex,
        task,
        {
          selectedPrimitive: {
            type: primitive.type,
            id: primitive.id,
            name: primitive.name,
          },
          confidence: 1.0,
          reasoning: "Only one primitive available",
          formattedInput: task,
        },
        traceId,
      );
    }

    // Try LLM-based routing
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < (this.config.maxAttempts ?? 3); attempt++) {
      try {
        const analysis = await this.analyzeTask(
          task,
          primitives,
          options?.context,
        );

        // Validate the selected primitive exists
        const selectedPrimitive = primitives.find(
          (p) => p.id === analysis.selectedPrimitive.id,
        );

        if (!selectedPrimitive) {
          throw new RoutingError(
            `Selected primitive not found: ${analysis.selectedPrimitive.id}`,
            { task, traceId, stepIndex },
          );
        }

        // Check confidence threshold
        if (analysis.confidence < (this.config.confidenceThreshold ?? 0.5)) {
          logger.warn("[RoutingAgent] Low confidence routing", {
            traceId,
            confidence: analysis.confidence,
            threshold: this.config.confidenceThreshold,
          });

          // Use fallback if configured
          if (this.config.fallbackAgentId) {
            const fallbackPrimitive = primitives.find(
              (p) => p.id === this.config.fallbackAgentId,
            );
            if (fallbackPrimitive) {
              return this.createRoutingDecision(
                stepIndex,
                task,
                {
                  selectedPrimitive: {
                    type: fallbackPrimitive.type,
                    id: fallbackPrimitive.id,
                    name: fallbackPrimitive.name,
                  },
                  confidence: 0.5,
                  reasoning: `Fallback to default agent due to low confidence (${analysis.confidence})`,
                  formattedInput: task,
                },
                traceId,
              );
            }
          }
        }

        const decision = this.createRoutingDecision(
          stepIndex,
          task,
          analysis,
          traceId,
        );

        this.routingHistory.push(decision);

        logger.debug("[RoutingAgent] Routing decision made", {
          traceId,
          stepIndex,
          selectedPrimitive: decision.selectedPrimitive.name,
          confidence: decision.confidence,
        });

        return decision;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn("[RoutingAgent] Routing attempt failed", {
          traceId,
          attempt: attempt + 1,
          error: lastError.message,
        });
      }
    }

    // All attempts failed - use fallback
    return this.createFallbackDecision(
      stepIndex,
      task,
      primitives,
      traceId,
      lastError,
    );
  }

  /**
   * Analyze task using LLM
   */
  private async analyzeTask(
    task: string,
    primitives: Primitive[],
    context?: Record<string, unknown>,
  ): Promise<RoutingAnalysis> {
    const primitivesDescription = primitives
      .map(
        (p) =>
          `- ${p.type}: ${p.id} (${p.name})\n  Description: ${p.description}`,
      )
      .join("\n");

    const prompt = (this.config.instructions ?? DEFAULT_ROUTING_PROMPT)
      .replace("{{PRIMITIVES}}", primitivesDescription)
      .replace("{{TASK}}", task);

    // Get the NeuroLink SDK
    const neurolink = this.sdk as {
      generate: (options: {
        input: { text: string };
        provider?: string;
        model?: string;
        temperature?: number;
        systemPrompt?: string;
        context?: Record<string, unknown>;
      }) => Promise<{
        content: string;
      }>;
    };

    const result = await neurolink.generate({
      input: { text: prompt },
      provider: this.config.provider,
      model: this.config.model,
      temperature: 0.3, // Lower temperature for more deterministic routing
      systemPrompt:
        "You are a precise task routing agent. Always respond with valid JSON only.",
      context: {
        ...context,
        routingContext: true,
      },
    });

    // Parse the JSON response
    try {
      // Clean up the response (remove markdown code blocks if present)
      let content = result.content.trim();
      if (content.startsWith("```json")) {
        content = content.slice(7);
      }
      if (content.startsWith("```")) {
        content = content.slice(3);
      }
      if (content.endsWith("```")) {
        content = content.slice(0, -3);
      }
      content = content.trim();

      const parsed = JSON.parse(content) as RoutingAnalysis;

      // Validate required fields
      if (
        !parsed.selectedPrimitive ||
        !parsed.selectedPrimitive.id ||
        !parsed.selectedPrimitive.type
      ) {
        throw new Error("Invalid routing response: missing selectedPrimitive");
      }

      if (typeof parsed.confidence !== "number") {
        parsed.confidence = 0.7; // Default confidence
      }

      return parsed;
    } catch (error) {
      throw new RoutingError(
        `Failed to parse routing response: ${error instanceof Error ? error.message : String(error)}`,
        { task },
      );
    }
  }

  /**
   * Create a routing decision from analysis
   */
  private createRoutingDecision(
    stepIndex: number,
    task: string,
    analysis: RoutingAnalysis,
    _traceId: string,
  ): RoutingDecision {
    return {
      stepIndex,
      taskDescription: task,
      selectedPrimitive: {
        type: analysis.selectedPrimitive.type,
        id: analysis.selectedPrimitive.id,
        name: analysis.selectedPrimitive.name,
      },
      confidence: Math.max(0, Math.min(1, analysis.confidence)),
      reasoning: analysis.reasoning ?? "No reasoning provided",
      formattedInput: analysis.formattedInput ?? task,
      alternatives: analysis.alternatives,
    };
  }

  /**
   * Create a fallback decision when routing fails
   */
  private createFallbackDecision(
    stepIndex: number,
    task: string,
    primitives: Primitive[],
    traceId: string,
    error?: Error,
  ): RoutingDecision {
    // Find fallback primitive or use first agent
    let fallbackPrimitive: Primitive | undefined;

    if (this.config.fallbackAgentId) {
      fallbackPrimitive = primitives.find(
        (p) => p.id === this.config.fallbackAgentId,
      );
    }

    if (!fallbackPrimitive) {
      // Prefer agents over tools and workflows
      fallbackPrimitive =
        primitives.find((p) => p.type === "agent") ?? primitives[0];
    }

    logger.warn("[RoutingAgent] Using fallback routing", {
      traceId,
      fallbackPrimitive: fallbackPrimitive.name,
      error: error?.message,
    });

    return {
      stepIndex,
      taskDescription: task,
      selectedPrimitive: {
        type: fallbackPrimitive.type,
        id: fallbackPrimitive.id,
        name: fallbackPrimitive.name,
      },
      confidence: 0.5,
      reasoning: error
        ? `Fallback to ${fallbackPrimitive.name} due to routing error: ${error.message}`
        : `Fallback to ${fallbackPrimitive.name}`,
      formattedInput: task,
    };
  }

  /**
   * Get routing history
   */
  getHistory(): RoutingDecision[] {
    return [...this.routingHistory];
  }

  /**
   * Clear routing history
   */
  clearHistory(): void {
    this.routingHistory = [];
  }

  /**
   * Update router configuration
   */
  updateConfig(config: Partial<RouterConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RouterConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Score a primitive against a task for simple keyword matching
 * Used as a fallback when LLM routing is unavailable
 */
export function scorePrimitive(task: string, primitive: Primitive): number {
  const taskLower = task.toLowerCase();
  const descriptionLower = primitive.description.toLowerCase();
  const nameLower = primitive.name.toLowerCase();

  let score = 0;

  // Check for keyword matches in description
  const taskWords = taskLower.split(/\s+/).filter((w) => w.length > 3);
  for (const word of taskWords) {
    if (descriptionLower.includes(word)) {
      score += 0.1;
    }
    if (nameLower.includes(word)) {
      score += 0.15;
    }
  }

  // Boost for specific patterns
  if (primitive.type === "tool" && taskLower.includes("calculate")) {
    score += 0.2;
  }
  if (primitive.type === "agent" && taskLower.includes("analyze")) {
    score += 0.15;
  }
  if (primitive.type === "workflow" && taskLower.includes("process")) {
    score += 0.15;
  }

  return Math.min(1, score);
}

/**
 * Select the best primitive using simple heuristics
 * Fallback for when LLM routing is unavailable
 */
export function selectPrimitiveByHeuristics(
  task: string,
  primitives: Primitive[],
): { primitive: Primitive; confidence: number } {
  if (primitives.length === 0) {
    throw new Error("No primitives available");
  }

  if (primitives.length === 1) {
    return { primitive: primitives[0], confidence: 1.0 };
  }

  const scores = primitives.map((p) => ({
    primitive: p,
    score: scorePrimitive(task, p),
  }));

  scores.sort((a, b) => b.score - a.score);

  return {
    primitive: scores[0].primitive,
    confidence: Math.max(0.5, Math.min(0.9, scores[0].score + 0.5)),
  };
}
