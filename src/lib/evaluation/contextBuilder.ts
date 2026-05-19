import type {
  EnhancedEvaluationContext,
  QueryIntentAnalysis,
  EnhancedConversationTurn,
  EvaluationResult,
  GenerateResult,
  ToolExecution,
  ToolArgs,
  ToolResult,
  JsonValue,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import type {
  LanguageModelV3CallOptions,
  LanguageModelV3Message,
} from "../types/index.js";

/**
 * Builds the enhanced context required for a RAGAS-style evaluation.
 * This class gathers data from the generation options and results to create a
 * rich snapshot of the interaction, which is then used by the evaluator.
 */
export class ContextBuilder {
  private attemptNumber = 1;
  private previousEvaluations: EvaluationResult[] = [];

  private extractTextFromContent(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      return content
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text" && "text" in part,
        )
        .map((part) => part.text)
        .join("");
    }
    return "";
  }

  /**
   * Builds the full evaluation context for a single evaluation attempt.
   *
   * @param options The original `TextGenerationOptions` used for the request.
   * @param result The `GenerateResult` from the provider.
   * @returns An `EnhancedEvaluationContext` object ready for evaluation.
   */
  public buildContext(
    options: LanguageModelV3CallOptions,
    result: GenerateResult,
  ): EnhancedEvaluationContext {
    const userMessages = options.prompt.filter(
      (p: LanguageModelV3Message) => p.role === "user",
    );
    const lastUserMessage = userMessages[userMessages.length - 1];
    const userQuery = this.extractTextFromContent(
      lastUserMessage?.content ?? "",
    );

    const systemPromptMessage = options.prompt.find(
      (p: LanguageModelV3Message) => p.role === "system",
    );
    const systemPrompt = this.extractTextFromContent(
      systemPromptMessage?.content ?? "",
    );

    const queryAnalysis = this.analyzeQuery(userQuery);
    const toolExecutions = this.mapToolExecutions(result);

    const context: EnhancedEvaluationContext = {
      userQuery,
      queryAnalysis,
      aiResponse: result.content,
      provider: result.provider || "unknown",
      model: result.model || "unknown",
      generationParams: {
        temperature: options.temperature,
        maxTokens: options.maxOutputTokens,
        systemPrompt: systemPrompt || undefined,
      },
      toolExecutions,
      conversationHistory: (options.prompt || [])
        .filter((p: LanguageModelV3Message) => p.role !== "system")
        .map((turn: LanguageModelV3Message) => ({
          role: turn.role as "user" | "assistant",
          content: this.extractTextFromContent(turn.content),
          timestamp: new Date().toISOString(),
        })) as EnhancedConversationTurn[],
      responseTime: result.responseTime || 0,
      tokenUsage: result.usage || { input: 0, output: 0, total: 0 },
      previousEvaluations: this.previousEvaluations,
      attemptNumber: this.attemptNumber,
    };

    logger.debug("Built Evaluation Context:", context);

    return context;
  }

  /**
   * Records the result of an evaluation and increments the internal attempt counter.
   * This is used to build up the `previousEvaluations` array for subsequent retries.
   *
   * @param evaluation The `EvaluationResult` from the last attempt.
   */
  public recordEvaluation(evaluation: EvaluationResult) {
    this.previousEvaluations.push(evaluation);
    this.attemptNumber++;
  }

  /**
   * Resets the internal state of the context builder. This should be called
   * before starting a new, independent evaluation sequence.
   */
  public reset() {
    this.attemptNumber = 1;
    this.previousEvaluations = [];
  }

  /**
   * Analyzes the user's query to determine intent and complexity.
   * @param query The user's input query.
   * @returns A QueryIntentAnalysis object.
   */
  private analyzeQuery(query: string): QueryIntentAnalysis {
    const lowerCaseQuery = query.toLowerCase();
    let type: QueryIntentAnalysis["type"];

    if (
      lowerCaseQuery.startsWith("what") ||
      lowerCaseQuery.startsWith("how") ||
      lowerCaseQuery.startsWith("why")
    ) {
      type = "question";
    } else if (lowerCaseQuery.length < 20) {
      type = "greeting";
    } else {
      type = "command";
    }

    const complexity =
      query.length > 100 ? "high" : query.length > 40 ? "medium" : "low";

    return {
      type,
      complexity,
      shouldHaveUsedTools: false, // This would require deeper analysis
    };
  }

  /**
   * Maps the tool execution format from GenerateResult to the canonical ToolExecution type.
   * @param result The result from the generate call.
   * @returns An array of ToolExecution objects.
   */
  private mapToolExecutions(result: GenerateResult): ToolExecution[] {
    if (!result.toolExecutions) {
      return [];
    }
    return result.toolExecutions.map((exec): ToolExecution => {
      const toolResult: ToolResult = {
        success: true,
        data: exec.output as JsonValue,
      };

      return {
        toolName: exec.name,
        params: exec.input as ToolArgs,
        result: toolResult,
        executionTime: 0,
        timestamp: Date.now(),
      };
    });
  }
}
