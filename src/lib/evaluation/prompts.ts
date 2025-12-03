import type {
  EnhancedEvaluationContext,
  GetPromptFunction,
} from "../types/evaluationTypes.js";

/**
 * A flexible class for building evaluation prompts. It allows for custom prompt
 * generation logic to be injected while ensuring a consistent output format.
 */
export class PromptBuilder {
  /**
   * Builds the final evaluation prompt.
   *
   * @param context The rich context for the evaluation.
   * @param getPrompt An optional function to generate the main body of the prompt.
   *                  If not provided, a default prompt is used.
   * @returns The complete prompt string to be sent to the judge LLM.
   */
  public buildEvaluationPrompt(
    context: EnhancedEvaluationContext,
    getPrompt?: GetPromptFunction,
  ): string {
    const {
      userQuery,
      aiResponse,
      conversationHistory,
      toolExecutions,
      previousEvaluations,
    } = context;

    const historyStr = conversationHistory
      .map((turn) => `${turn.role}: ${turn.content}`)
      .join("\n");
    const toolsStr =
      toolExecutions.length > 0
        ? `Tools were used: ${toolExecutions.map((t) => t.toolName).join(", ")}`
        : "No tools were used.";
    const retryStr =
      previousEvaluations && previousEvaluations.length > 0
        ? `This is attempt #${context.attemptNumber}. Previous reasoning: ${previousEvaluations
            .map((e) => e.reasoning)
            .join(
              "; ",
            )} Previous suggested Improvements: ${previousEvaluations.map((e) => e.suggestedImprovements).join("; ")}`
        : "This is the first attempt.";

    const promptContext = {
      userQuery,
      history: historyStr,
      tools: toolsStr,
      retryInfo: retryStr,
      aiResponse,
    };

    const mainPrompt = getPrompt
      ? getPrompt(promptContext)
      : this.getDefaultPrompt(promptContext);

    return `
      ${mainPrompt}

      **Output Format (JSON):**
      {
        "relevanceScore": <1-10>,
        "accuracyScore": <1-10>,
        "completenessScore": <1-10>,
        "finalScore": <1-10>,
        "reasoning": "<Your constructive reasoning here>",
        "suggestedImprovements": "<How the response can be improved>"
      }
    `;
  }

  /**
   * The default prompt generation logic.
   * @param context The prepared context strings.
   * @returns The default prompt body.
   */
  private getDefaultPrompt(context: {
    userQuery: string;
    history: string;
    tools: string;
    retryInfo: string;
    aiResponse: string;
  }): string {
    return `
      You are an expert AI quality evaluator. Your task is to evaluate the AI assistant's response based on the provided context.
      Provide a score from 1 to 10 for each of the following criteria: Relevance, Accuracy, and Completeness.
      Finally, provide an overall finalScore and constructive feedback for improvement.

      **Evaluation Context:**
      - User Query: ${context.userQuery}
      - Conversation History:
      ${context.history}
      - Tools Executed: ${context.tools}
      - Retry Information: ${context.retryInfo}

      **AI Assistant's Response to Evaluate:**
      ${context.aiResponse}
    `;
  }
}
