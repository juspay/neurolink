/**
 * Agent Evaluator - Evaluates and improves agent performance
 *
 * The Evaluator provides:
 * - Quality assessment of agent outputs
 * - Iterative improvement through feedback
 * - Benchmarking and comparison
 * - Performance optimization
 */

import type { NeuroLink } from "../../neurolink.js";
import type { Agent } from "../agent.js";
import type {
  AgentResult,
  AgentEvaluationCriteria,
  AgentEvaluationScore,
  ImprovementSuggestion,
  OptimizationConfig,
  OptimizationResult,
  OptimizationIteration,
  OptimizationChunk,
  AgentEvaluatorInterface,
  EvaluatorConfig,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";

/**
 * Evaluation prompt template
 */
const EVALUATION_PROMPT = `Evaluate the following agent output based on the given criteria.

Task/Input: {{TASK}}

Agent Output: {{OUTPUT}}

Evaluation Criteria:
{{CRITERIA}}

Rate each criterion from 0.0 to 1.0 and provide overall feedback.

Respond in JSON format:
{
  "overall": <0.0-1.0>,
  "breakdown": {
    "accuracy": <0.0-1.0>,
    "completeness": <0.0-1.0>,
    "relevance": <0.0-1.0>,
    "coherence": <0.0-1.0>
  },
  "feedback": "<detailed feedback>"
}`;

/**
 * Improvement prompt template
 */
const IMPROVEMENT_PROMPT = `Based on the evaluation, suggest improvements for the agent output.

Task/Input: {{TASK}}

Current Output: {{OUTPUT}}

Evaluation Score: {{SCORE}}
Evaluation Feedback: {{FEEDBACK}}

Suggest specific improvements.

Respond in JSON format:
{
  "suggestions": [
    {
      "type": "content" | "format" | "completeness" | "accuracy",
      "description": "<what to improve>",
      "priority": <1-5>,
      "fix": "<specific correction if applicable>"
    }
  ]
}`;

/**
 * Agent Evaluator - Assesses and improves agent outputs
 */
export class AgentEvaluator implements AgentEvaluatorInterface {
  private neurolink: NeuroLink;
  private config: EvaluatorConfig;

  constructor(neurolink: NeuroLink, config?: EvaluatorConfig) {
    this.neurolink = neurolink;
    this.config = {
      model: config?.model,
      provider: config?.provider,
      temperature: config?.temperature ?? 0.2,
      evaluationPrompt: config?.evaluationPrompt,
    };

    logger.debug("[AgentEvaluator] Initialized", {
      model: this.config.model,
      provider: this.config.provider,
    });
  }

  /**
   * Evaluate an agent result
   */
  async evaluate(
    result: AgentResult,
    criteria: AgentEvaluationCriteria,
    task?: string,
  ): Promise<AgentEvaluationScore> {
    // Build criteria description
    const criteriaDesc = this.buildCriteriaDescription(criteria);

    // Build evaluation prompt
    const prompt = (this.config.evaluationPrompt || EVALUATION_PROMPT)
      .replace("{{TASK}}", task || "Not specified")
      .replace("{{OUTPUT}}", result.content || "Empty output")
      .replace("{{CRITERIA}}", criteriaDesc);

    try {
      const evalResult = await this.neurolink.generate({
        input: { text: prompt },
        provider: this.config.provider,
        model: this.config.model,
        temperature: this.config.temperature,
        systemPrompt:
          "You are an expert evaluator. Provide objective, fair assessments.",
      });

      const parsed = this.parseEvaluationResponse(evalResult.content || "");
      if (parsed) {
        return parsed;
      }

      // Fallback if parsing fails
      return this.fallbackEvaluation(result, criteria);
    } catch (error) {
      logger.error("[AgentEvaluator] Evaluation failed", { error });
      return this.fallbackEvaluation(result, criteria);
    }
  }

  /**
   * Check if score meets threshold
   */
  meetsThreshold(score: AgentEvaluationScore, threshold: number): boolean {
    return score.overall >= threshold;
  }

  /**
   * Generate improvement suggestions
   */
  async suggest(
    result: AgentResult,
    score: AgentEvaluationScore,
    task?: string,
  ): Promise<ImprovementSuggestion[]> {
    const prompt = IMPROVEMENT_PROMPT.replace(
      "{{TASK}}",
      task || "Not specified",
    )
      .replace("{{OUTPUT}}", result.content || "Empty output")
      .replace("{{SCORE}}", score.overall.toFixed(2))
      .replace("{{FEEDBACK}}", score.feedback);

    try {
      const suggestionResult = await this.neurolink.generate({
        input: { text: prompt },
        provider: this.config.provider,
        model: this.config.model,
        temperature: this.config.temperature,
        systemPrompt:
          "You are an expert at improving AI outputs. Provide specific, actionable suggestions.",
      });

      const parsed = this.parseSuggestionResponse(
        suggestionResult.content || "",
      );
      if (parsed && parsed.length > 0) {
        return parsed;
      }

      // Fallback suggestions
      return this.fallbackSuggestions(score);
    } catch (error) {
      logger.error("[AgentEvaluator] Suggestion generation failed", { error });
      return this.fallbackSuggestions(score);
    }
  }

  /**
   * Build criteria description for prompt
   */
  private buildCriteriaDescription(criteria: AgentEvaluationCriteria): string {
    const parts: string[] = [];

    if (criteria.accuracy !== false) {
      parts.push("- Accuracy: Is the information correct and factual?");
    }
    if (criteria.completeness !== false) {
      parts.push("- Completeness: Does it fully address the task?");
    }
    if (criteria.relevance !== false) {
      parts.push("- Relevance: Is the content relevant to the task?");
    }
    if (criteria.coherence !== false) {
      parts.push("- Coherence: Is it well-organized and logical?");
    }
    if (criteria.customCriteria) {
      for (const custom of criteria.customCriteria) {
        parts.push(`- ${custom}`);
      }
    }

    return parts.join("\n");
  }

  /**
   * Parse evaluation response
   */
  private parseEvaluationResponse(
    response: string,
  ): AgentEvaluationScore | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        overall: typeof parsed.overall === "number" ? parsed.overall : 0.5,
        breakdown: {
          accuracy: parsed.breakdown?.accuracy,
          completeness: parsed.breakdown?.completeness,
          relevance: parsed.breakdown?.relevance,
          coherence: parsed.breakdown?.coherence,
        },
        feedback: parsed.feedback || "No feedback provided",
      };
    } catch {
      return null;
    }
  }

  /**
   * Parse suggestion response
   */
  private parseSuggestionResponse(
    response: string,
  ): ImprovementSuggestion[] | null {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const parsed = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(parsed.suggestions)) {
        return null;
      }

      return parsed.suggestions.map((s: Record<string, unknown>) => ({
        type: s.type || "content",
        description: s.description || "Improve output",
        priority: typeof s.priority === "number" ? s.priority : 3,
        fix: s.fix as string | undefined,
      }));
    } catch {
      return null;
    }
  }

  /**
   * Fallback evaluation when LLM fails
   */
  private fallbackEvaluation(
    result: AgentResult,
    _criteria: AgentEvaluationCriteria,
  ): AgentEvaluationScore {
    // Simple heuristic-based evaluation
    let overall = 0.5;
    const breakdown: AgentEvaluationScore["breakdown"] = {};

    if (result.status === "error") {
      overall = 0.1;
    } else if (result.content) {
      // Length-based heuristics
      const length = result.content.length;
      if (length > 100) {
        overall += 0.1;
      }
      if (length > 500) {
        overall += 0.1;
      }
      if (length > 1000) {
        overall += 0.1;
      }

      // Check for structured content
      if (result.content.includes("\n")) {
        overall += 0.05;
      }
      if (/\d/.test(result.content)) {
        overall += 0.05;
      }

      breakdown.completeness = Math.min(1, length / 500);
      breakdown.coherence = result.content.includes(".") ? 0.7 : 0.3;
    }

    return {
      overall: Math.min(1, Math.max(0, overall)),
      breakdown,
      feedback: "Fallback evaluation - LLM evaluation unavailable",
    };
  }

  /**
   * Fallback suggestions when LLM fails
   */
  private fallbackSuggestions(
    score: AgentEvaluationScore,
  ): ImprovementSuggestion[] {
    const suggestions: ImprovementSuggestion[] = [];

    if (
      score.breakdown.completeness !== undefined &&
      score.breakdown.completeness < 0.7
    ) {
      suggestions.push({
        type: "completeness",
        description: "Add more detail and cover additional aspects",
        priority: 4,
      });
    }

    if (
      score.breakdown.coherence !== undefined &&
      score.breakdown.coherence < 0.7
    ) {
      suggestions.push({
        type: "format",
        description: "Improve structure and organization",
        priority: 3,
      });
    }

    if (score.overall < 0.5) {
      suggestions.push({
        type: "content",
        description: "Consider rewriting with more focus on the core task",
        priority: 5,
      });
    }

    return suggestions;
  }
}

/**
 * Result Optimizer - Iteratively improves agent outputs
 */
export class ResultOptimizer {
  private evaluator: AgentEvaluator;
  private neurolink: NeuroLink;

  constructor(neurolink: NeuroLink, evaluator?: AgentEvaluator) {
    this.neurolink = neurolink;
    this.evaluator = evaluator ?? new AgentEvaluator(neurolink);
  }

  /**
   * Optimize an agent's result through iterative improvement
   */
  async optimize(
    agent: Agent,
    input: string,
    config: Partial<OptimizationConfig>,
  ): Promise<OptimizationResult> {
    const maxIterations = config.maxIterations ?? 3;
    const qualityThreshold = config.qualityThreshold ?? 0.8;
    const startTime = Date.now();

    const iterations: OptimizationIteration[] = [];
    let currentResult: AgentResult | null = null;
    let currentScore: AgentEvaluationScore | null = null;
    let currentInput = input;

    logger.info("[ResultOptimizer] Starting optimization", {
      agentId: agent.id,
      maxIterations,
      qualityThreshold,
    });

    for (let i = 0; i < maxIterations; i++) {
      // Execute agent
      const result = await agent.execute(currentInput);
      currentResult = result;

      // Evaluate
      const criteria: AgentEvaluationCriteria = {
        accuracy: true,
        completeness: true,
        relevance: true,
        coherence: true,
      };
      const score = await this.evaluator.evaluate(result, criteria, input);
      currentScore = score;

      // Get improvement suggestions
      const improvements = await this.evaluator.suggest(result, score, input);

      // Record iteration
      iterations.push({
        iteration: i + 1,
        result,
        score,
        improvements,
      });

      logger.debug(`[ResultOptimizer] Iteration ${i + 1}`, {
        score: score.overall,
        threshold: qualityThreshold,
      });

      // Check if threshold met
      if (this.evaluator.meetsThreshold(score, qualityThreshold)) {
        break;
      }

      // Build improved input for next iteration
      if (i < maxIterations - 1) {
        currentInput = this.buildImprovedInput(input, result, improvements);
      }
    }

    return {
      finalResult: currentResult!,
      iterations,
      finalScore: currentScore!,
      totalDuration: Date.now() - startTime,
    };
  }

  /**
   * Stream optimization progress
   */
  async *optimizeStream(
    agent: Agent,
    input: string,
    config: Partial<OptimizationConfig>,
  ): AsyncIterable<OptimizationChunk> {
    const maxIterations = config.maxIterations ?? 3;
    const qualityThreshold = config.qualityThreshold ?? 0.8;

    const iterations: OptimizationIteration[] = [];
    let currentResult: AgentResult | null = null;
    let currentScore: AgentEvaluationScore | null = null;
    let currentInput = input;

    for (let i = 0; i < maxIterations; i++) {
      yield {
        type: "iteration-start",
        iteration: i + 1,
      };

      // Execute and evaluate
      const result = await agent.execute(currentInput);
      currentResult = result;

      const criteria: AgentEvaluationCriteria = {
        accuracy: true,
        completeness: true,
        relevance: true,
        coherence: true,
      };
      const score = await this.evaluator.evaluate(result, criteria, input);
      currentScore = score;

      const improvements = await this.evaluator.suggest(result, score, input);

      iterations.push({
        iteration: i + 1,
        result,
        score,
        improvements,
      });

      yield {
        type: "iteration-result",
        iteration: i + 1,
        score,
        result,
      };

      if (this.evaluator.meetsThreshold(score, qualityThreshold)) {
        break;
      }

      if (i < maxIterations - 1) {
        currentInput = this.buildImprovedInput(input, result, improvements);
      }
    }

    yield {
      type: "optimization-complete",
      iteration: iterations.length,
      finalResult: {
        finalResult: currentResult!,
        iterations,
        finalScore: currentScore!,
        totalDuration: 0, // Would need to track
      },
    };
  }

  /**
   * Build improved input based on suggestions
   */
  private buildImprovedInput(
    originalInput: string,
    previousResult: AgentResult,
    suggestions: ImprovementSuggestion[],
  ): string {
    const suggestionText = suggestions
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3)
      .map((s) => `- ${s.description}${s.fix ? `: ${s.fix}` : ""}`)
      .join("\n");

    return `${originalInput}

Previous attempt (needs improvement):
${previousResult.content?.slice(0, 500)}${previousResult.content && previousResult.content.length > 500 ? "..." : ""}

Please improve based on this feedback:
${suggestionText}`;
  }

  /**
   * Compare multiple agent results
   */
  async compareResults(
    results: Array<{ agent: Agent; result: AgentResult }>,
    task: string,
  ): Promise<
    Array<{ agentId: string; score: AgentEvaluationScore; rank: number }>
  > {
    const criteria: AgentEvaluationCriteria = {
      accuracy: true,
      completeness: true,
      relevance: true,
      coherence: true,
    };

    const evaluations = await Promise.all(
      results.map(async ({ agent, result }) => ({
        agentId: agent.id,
        score: await this.evaluator.evaluate(result, criteria, task),
      })),
    );

    // Sort by overall score
    evaluations.sort((a, b) => b.score.overall - a.score.overall);

    // Add ranks
    return evaluations.map((e, index) => ({
      ...e,
      rank: index + 1,
    }));
  }
}

/**
 * Create an evaluator instance
 */
export function createEvaluator(
  neurolink: NeuroLink,
  config?: EvaluatorConfig,
): AgentEvaluator {
  return new AgentEvaluator(neurolink, config);
}

/**
 * Create an optimizer instance
 */
export function createOptimizer(
  neurolink: NeuroLink,
  evaluator?: AgentEvaluator,
): ResultOptimizer {
  return new ResultOptimizer(neurolink, evaluator);
}
