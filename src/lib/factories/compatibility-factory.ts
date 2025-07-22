import type {
  GenerateOptions,
  GenerateResult,
} from "../types/generate-types.js";
import type { TextGenerationOptions } from "../core/types.js";

/**
 * Compatibility conversion factory for seamless migration
 * between generateText and generate functions
 */
export class CompatibilityConversionFactory {
  /**
   * Convert TextGenerationOptions to GenerateOptions
   */
  static convertTextToGenerate(
    options: TextGenerationOptions,
  ): GenerateOptions {
    const { prompt, ...rest } = options;

    return {
      input: { text: prompt || "" },
      output: { format: "text" },
      provider: rest.provider as any,
      model: rest.model,
      temperature: rest.temperature,
      maxTokens: rest.maxTokens,
      systemPrompt: rest.systemPrompt,
      schema: rest.schema,
      tools: rest.tools,
      timeout: rest.timeout,
      enableEvaluation: rest.enableEvaluation,
      enableAnalytics: rest.enableAnalytics,
      context: rest.context,
      evaluationDomain: rest.evaluationDomain,
      toolUsageContext: rest.toolUsageContext,
      conversationHistory: rest.conversationHistory,
    };
  }

  /**
   * Convert GenerateResult to legacy TextGenerationResult format
   */
  static convertGenerateToText(result: GenerateResult): any {
    return {
      content: result.content,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
      responseTime: result.responseTime,
      toolsUsed: result.toolsUsed,
      toolExecutions: result.toolExecutions,
      enhancedWithTools: result.enhancedWithTools,
      availableTools: result.availableTools,
      analytics: result.analytics,
      evaluation: result.evaluation,
    };
  }

  /**
   * Convert GenerateOptions to TextGenerationOptions
   */
  static convertGenerateToText_Options(
    options: GenerateOptions,
  ): TextGenerationOptions {
    return {
      prompt: options.input.text,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      systemPrompt: options.systemPrompt,
      schema: options.schema,
      tools: options.tools,
      timeout: options.timeout,
      enableEvaluation: options.enableEvaluation,
      enableAnalytics: options.enableAnalytics,
      context: options.context,
      evaluationDomain: options.evaluationDomain,
      toolUsageContext: options.toolUsageContext,
      conversationHistory: options.conversationHistory,
    };
  }
}
