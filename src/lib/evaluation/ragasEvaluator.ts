import type {
  EnhancedEvaluationContext,
  EvaluationResult,
  GetPromptFunction,
} from "../types/evaluationTypes.js";
import { AIProviderFactory } from "../core/factory.js";
import { PromptBuilder } from "./prompts.js";
import { logger } from "../utils/logger.js";
import {
  SpanSerializer,
  SpanType,
  SpanStatus,
} from "../observability/index.js";
import { getMetricsAggregator } from "../observability/index.js";

/**
 * Implements a RAGAS-style evaluator that uses a "judge" LLM to score the
 * quality of an AI response based on rich, contextual information.
 */
export class RAGASEvaluator {
  private evaluationModel: string;
  private providerName: string;
  private threshold: number;
  private promptBuilder: PromptBuilder;
  private promptGenerator?: GetPromptFunction;

  constructor(
    evaluationModel?: string,
    providerName?: string,
    threshold?: number,
    promptGenerator?: GetPromptFunction,
  ) {
    this.evaluationModel =
      evaluationModel ||
      process.env.NEUROLINK_RAGAS_EVALUATION_MODEL ||
      "gemini-1.5-flash";
    this.providerName =
      providerName ||
      process.env.NEUROLINK_RAGAS_EVALUATION_PROVIDER ||
      "vertex";
    this.threshold =
      threshold || Number(process.env.NEUROLINK_EVALUATION_THRESHOLD) || 7;
    this.promptBuilder = new PromptBuilder();
    this.promptGenerator = promptGenerator;
  }

  /**
   * Evaluates an AI-generated response using a model-based approach.
   *
   * @param context The rich, contextual information for the evaluation.
   * @returns A promise that resolves to a detailed `EvaluationResult`.
   */
  public async evaluate(
    context: EnhancedEvaluationContext,
  ): Promise<EvaluationResult> {
    const span = SpanSerializer.createSpan(
      SpanType.EVALUATION,
      "evaluation.ragas",
      {
        "evaluation.dimension": "relevance|accuracy|completeness",
        "ai.provider": this.providerName,
        "ai.model": this.evaluationModel,
      },
    );
    const startTime = Date.now();
    try {
      const prompt = this.promptBuilder.buildEvaluationPrompt(
        context,
        this.promptGenerator,
      );

      const provider = await AIProviderFactory.createProvider(
        this.providerName,
        this.evaluationModel,
      );

      const result = await provider.generate({
        input: { text: prompt },
      });

      if (!result) {
        throw new Error("Evaluation generation failed to return a result.");
      }

      const rawEvaluationResponse = result.content;
      const parsedResult = this.parseEvaluationResponse(rawEvaluationResponse);
      const evaluationTime = Date.now() - startTime;

      const finalResult: EvaluationResult = {
        ...parsedResult,
        isPassing: parsedResult.finalScore >= this.threshold, // This will be recalculated, but is needed for the type
        evaluationModel: this.evaluationModel,
        evaluationTime,
        attemptNumber: context.attemptNumber,
        rawEvaluationResponse,
      };

      span.durationMs = Date.now() - startTime;
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.OK);
      getMetricsAggregator().recordSpan(endedSpan);

      return finalResult;
    } catch (error) {
      span.durationMs = Date.now() - startTime;
      const endedSpan = SpanSerializer.endSpan(span, SpanStatus.ERROR);
      endedSpan.statusMessage =
        error instanceof Error ? error.message : String(error);
      getMetricsAggregator().recordSpan(endedSpan);
      throw error;
    }
  }

  /**
   * Parses the raw JSON string from the judge LLM into a structured `EvaluationResult` object.
   * It includes error handling to gracefully manage malformed JSON.
   *
   * @param rawResponse The raw string response from the evaluation model.
   * @returns A structured object containing the evaluation scores and feedback.
   */
  private parseEvaluationResponse(
    rawResponse: string,
  ): Omit<
    EvaluationResult,
    | "isPassing"
    | "evaluationModel"
    | "evaluationTime"
    | "attemptNumber"
    | "rawEvaluationResponse"
  > {
    try {
      const cleanedResponse = rawResponse.replace(/```json\n|```/g, "").trim();
      const parsed = JSON.parse(cleanedResponse);
      logger.debug("Parsed evaluation response for RAGAS Evaluator:", parsed);
      return {
        relevanceScore: Number(parsed.relevanceScore) || 0,
        accuracyScore: Number(parsed.accuracyScore) || 0,
        completenessScore: Number(parsed.completenessScore) || 0,
        finalScore: Number(parsed.finalScore) || 0,
        suggestedImprovements:
          parsed.suggestedImprovements || "No suggestions provided.",
        reasoning: parsed.reasoning || "No reasoning provided.",
      };
    } catch (error) {
      logger.error("Failed to parse evaluation response:", error);
      return {
        relevanceScore: 0,
        accuracyScore: 0,
        completenessScore: 0,
        finalScore: 0,
        reasoning: "Error parsing evaluation response.",
        suggestedImprovements: "Error parsing evaluation response.",
      };
    }
  }
}
