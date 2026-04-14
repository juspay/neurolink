/**
 * RouterAgent - Specialized agent for task routing and delegation
 *
 * Analyzes incoming tasks and routes them to the most appropriate
 * primitive (agent, workflow, or tool) based on task characteristics.
 */

import type { NeuroLink } from "../neurolink.js";
import type {
  Primitive,
  RouterConfig,
  RoutingContext,
  AgentRoutingDecision,
  TaskAnalysis,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  buildRoutingPrompt,
  parseRoutingResponse,
  ROUTING_PROMPTS,
} from "./prompts/routingPrompts.js";

/**
 * RouterAgent - Analyzes tasks and routes to appropriate primitives
 *
 * Features:
 * - LLM-powered task analysis
 * - Confidence scoring for routing decisions
 * - Fallback handling for routing failures
 * - Context-aware routing with conversation history
 *
 * @example
 * ```typescript
 * const router = new RouterAgent({
 *   model: 'gpt-4o',
 *   confidenceThreshold: 0.7
 * }, neurolink);
 *
 * router.registerPrimitive(researchAgent);
 * router.registerPrimitive(writerAgent);
 *
 * const decision = await router.route('Write a blog post about AI');
 * ```
 */
export class RouterAgent {
  private neurolink: NeuroLink;
  private config: RouterConfig;
  private primitives: Map<string, Primitive> = new Map();

  constructor(config: RouterConfig, neurolink: NeuroLink) {
    this.config = config;
    this.neurolink = neurolink;

    logger.debug("[RouterAgent] Created with config", {
      provider: config.provider,
      model: config.model,
      confidenceThreshold: config.confidenceThreshold,
    });
  }

  /**
   * Route a task to the most appropriate primitive
   *
   * @param task - The task description to route
   * @param context - Optional routing context with history
   * @returns Routing decision with selected primitive and confidence
   */
  async route(
    task: string,
    context?: RoutingContext,
  ): Promise<AgentRoutingDecision> {
    const primitivesArray = Array.from(this.primitives.values());

    if (primitivesArray.length === 0) {
      throw new Error("No primitives registered for routing");
    }

    const routingPrompt = buildRoutingPrompt(task, primitivesArray, {
      includeAlternatives: true,
    });

    // Add conversation history to context if available
    let fullPrompt = routingPrompt;
    if (
      context?.conversationHistory &&
      context.conversationHistory.length > 0
    ) {
      const historyStr = context.conversationHistory
        .map((m) => `${m.role}: ${m.content}`)
        .join("\n");
      fullPrompt = `Previous conversation:\n${historyStr}\n\n${routingPrompt}`;
    }

    try {
      const result = await this.neurolink.generate({
        input: { text: fullPrompt },
        provider: this.config.provider,
        model: this.config.model,
        temperature: 0.3,
        systemPrompt:
          this.config.instructions ?? ROUTING_PROMPTS.SYSTEM_INSTRUCTIONS,
      });

      const parsed = parseRoutingResponse(result.content || "");

      if (parsed && parsed.selectedPrimitive) {
        const decision: AgentRoutingDecision = {
          stepIndex: 0,
          taskDescription: task,
          selectedPrimitive: parsed.selectedPrimitive,
          confidence: parsed.confidence ?? 0.8,
          reasoning: parsed.reasoning ?? "Routed based on task analysis",
          formattedInput: parsed.formattedInput,
          alternatives: parsed.alternatives,
        };

        // Check confidence threshold
        if (
          this.config.confidenceThreshold &&
          decision.confidence < this.config.confidenceThreshold
        ) {
          logger.warn("[RouterAgent] Low confidence routing decision", {
            task: task.slice(0, 50),
            confidence: decision.confidence,
            threshold: this.config.confidenceThreshold,
          });
        }

        return decision;
      }

      throw new Error("Failed to parse routing response");
    } catch (error) {
      logger.error("[RouterAgent] Routing failed", {
        error: error instanceof Error ? error.message : String(error),
        task: task.slice(0, 50),
      });

      // Fallback to first primitive
      return this.createFallbackDecision(task, primitivesArray[0]);
    }
  }

  /**
   * Get routing confidence for a specific primitive
   *
   * @param task - The task to evaluate
   * @param primitiveId - The primitive to check
   * @returns Confidence score (0-1)
   */
  async getConfidence(task: string, primitiveId: string): Promise<number> {
    const primitive = this.primitives.get(primitiveId);
    if (!primitive) {
      return 0;
    }

    try {
      const decision = await this.route(task);
      if (decision.selectedPrimitive.id === primitiveId) {
        return decision.confidence;
      }

      // Check alternatives
      const alternative = decision.alternatives?.find(
        (a) => a.id === primitiveId,
      );
      return alternative?.confidence ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Register a primitive for routing
   *
   * @param primitive - The primitive to register
   */
  registerPrimitive(primitive: Primitive): void {
    this.primitives.set(primitive.id, primitive);
    logger.debug("[RouterAgent] Registered primitive", {
      id: primitive.id,
      type: primitive.type,
      name: primitive.name,
    });
  }

  /**
   * Unregister a primitive
   *
   * @param primitiveId - The ID of the primitive to remove
   */
  unregisterPrimitive(primitiveId: string): void {
    this.primitives.delete(primitiveId);
  }

  /**
   * Get all registered primitives
   *
   * @returns Array of registered primitives
   */
  getPrimitives(): Primitive[] {
    return Array.from(this.primitives.values());
  }

  /**
   * Analyze a task without routing
   *
   * @param task - The task to analyze
   * @returns Task analysis results
   */
  async analyzeTask(task: string): Promise<TaskAnalysis> {
    const analysisPrompt = `Analyze the following task and extract its characteristics:

Task: ${task}

Provide analysis in JSON format:
{
  "intent": "<primary goal of the task>",
  "entities": [{"type": "...", "value": "...", "confidence": 0.0-1.0}],
  "requirements": [{"type": "tool|capability|data", "description": "...", "mandatory": true/false}],
  "complexity": "simple|moderate|complex",
  "suggestedPrimitives": ["<primitive_id_1>", "<primitive_id_2>"]
}`;

    try {
      const result = await this.neurolink.generate({
        input: { text: analysisPrompt },
        provider: this.config.provider,
        model: this.config.model,
        temperature: 0.2,
        systemPrompt:
          "You are a task analysis assistant. Analyze tasks to understand their requirements.",
      });

      const jsonMatch = result.content?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          intent: parsed.intent || "Unknown",
          entities: parsed.entities || [],
          requirements: parsed.requirements || [],
          complexity: parsed.complexity || "moderate",
          suggestedPrimitives: parsed.suggestedPrimitives || [],
        };
      }
    } catch (error) {
      logger.error("[RouterAgent] Task analysis failed", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Return default analysis on failure
    return {
      intent: "Unknown",
      entities: [],
      requirements: [],
      complexity: "moderate",
      suggestedPrimitives: [],
    };
  }

  /**
   * Create a fallback routing decision
   */
  private createFallbackDecision(
    task: string,
    primitive: Primitive,
  ): AgentRoutingDecision {
    return {
      stepIndex: 0,
      taskDescription: task,
      selectedPrimitive: {
        type: primitive.type,
        id: primitive.id,
        name: primitive.name,
      },
      confidence: 0.5,
      reasoning: "Fallback to default primitive due to routing error",
    };
  }

  /**
   * Update router configuration
   *
   * @param config - Partial configuration to update
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
