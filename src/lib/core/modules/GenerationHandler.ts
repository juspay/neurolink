/**
 * Generation Handler Module
 *
 * Handles text generation execution, result formatting, and tool information extraction.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Generation execution with AI SDK
 * - Tool information extraction
 * - Result formatting and enhancement
 * - Response analysis and logging
 *
 * @module core/modules/GenerationHandler
 */

import type { LanguageModelV1, CoreMessage, Tool } from "ai";
import { generateText, Output } from "ai";
import type {
  TextGenerationOptions,
  EnhancedGenerateResult,
  AIProviderName,
  StandardRecord,
  ExtendedTool,
  AISDKGenerateResult,
} from "../../types/index.js";
import type { ToolCallObject, ToolResult } from "../../types/tools.js";
import type { UnknownRecord } from "../../types/common.js";
import { logger } from "../../utils/logger.js";
import { DEFAULT_MAX_STEPS } from "../constants.js";

/**
 * GenerationHandler class - Handles text generation operations for AI providers
 */
export class GenerationHandler {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
    private readonly supportsToolsFn: () => boolean,
    private readonly getTelemetryConfigFn: (
      options: TextGenerationOptions,
      type: string,
    ) =>
      | {
          isEnabled: boolean;
          functionId?: string;
          metadata?: Record<string, string | number | boolean>;
        }
      | undefined,
    private readonly handleToolStorageFn: (
      toolCalls: unknown[],
      toolResults: unknown[],
      options: TextGenerationOptions,
      timestamp: Date,
    ) => Promise<void>,
  ) {}

  /**
   * Execute the generation with AI SDK
   */
  async executeGeneration(
    model: LanguageModelV1,
    messages: CoreMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    const shouldUseTools = !options.disableTools && this.supportsToolsFn();

    const useStructuredOutput =
      !!options.schema &&
      (options.output?.format === "json" ||
        options.output?.format === "structured");

    return await generateText({
      model,
      messages,
      ...(shouldUseTools && Object.keys(tools).length > 0 && { tools }),
      maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
      ...(shouldUseTools && { toolChoice: "auto" }),
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      ...(useStructuredOutput &&
        options.schema && {
          experimental_output: Output.object({ schema: options.schema }),
        }),
      experimental_telemetry: this.getTelemetryConfigFn(options, "generate"),
      onStepFinish: ({ toolCalls, toolResults }) => {
        logger.info("Tool execution completed", { toolResults, toolCalls });

        // Handle tool execution storage
        this.handleToolStorageFn(
          toolCalls,
          toolResults,
          options,
          new Date(),
        ).catch((error: unknown) => {
          logger.warn("[GenerationHandler] Failed to store tool executions", {
            provider: this.providerName,
            error: error instanceof Error ? error.message : String(error),
          });
        });
      },
    });
  }

  /**
   * Log generation completion information
   */
  logGenerationComplete(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): void {
    logger.debug(`generateText completed`, {
      provider: this.providerName,
      model: this.modelName,
      responseLength: generateResult.text?.length || 0,
      toolResultsCount: generateResult.toolResults?.length || 0,
      finishReason: generateResult.finishReason,
      usage: generateResult.usage,
      timestamp: Date.now(),
    });
  }

  /**
   * Extract tool information from generation result
   */
  extractToolInformation(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): {
    toolsUsed: string[];
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>;
  } {
    const toolsUsed: string[] = [];
    const toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }> = [];

    // Extract tool names from tool calls
    if (generateResult.toolCalls && generateResult.toolCalls.length > 0) {
      toolsUsed.push(
        ...generateResult.toolCalls.map((tc: ToolCallObject) => {
          return tc.toolName || tc.name || "unknown";
        }),
      );
    }

    // Extract from steps
    if (
      (generateResult as unknown as AISDKGenerateResult).steps &&
      Array.isArray((generateResult as unknown as AISDKGenerateResult).steps)
    ) {
      const toolCallArgsMap = new Map<string, StandardRecord>();

      for (const step of (generateResult as unknown as AISDKGenerateResult)
        .steps || []) {
        // Collect tool calls and their arguments
        if (step?.toolCalls && Array.isArray(step.toolCalls)) {
          for (const toolCall of step.toolCalls) {
            const tcRecord = toolCall as UnknownRecord;
            const toolName =
              (tcRecord.toolName as string) ||
              (tcRecord.name as string) ||
              "unknown";
            const toolId =
              (tcRecord.toolCallId as string) ||
              (tcRecord.id as string) ||
              toolName;

            toolsUsed.push(toolName);

            let callArgs: StandardRecord = {};
            if (tcRecord.args) {
              callArgs = tcRecord.args as StandardRecord;
            } else if (tcRecord.arguments) {
              callArgs = tcRecord.arguments as StandardRecord;
            } else if (tcRecord.parameters) {
              callArgs = tcRecord.parameters as StandardRecord;
            }

            toolCallArgsMap.set(toolId, callArgs);
            toolCallArgsMap.set(toolName, callArgs);
          }
        }

        // Process tool results
        if (step?.toolResults && Array.isArray(step.toolResults)) {
          for (const toolResult of step.toolResults) {
            const trRecord = toolResult as UnknownRecord;
            const toolName = (trRecord.toolName as string) || "unknown";
            const toolId =
              (trRecord.toolCallId as string) || (trRecord.id as string);

            let toolArgs: StandardRecord = {};
            if (trRecord.args) {
              toolArgs = trRecord.args as StandardRecord;
            } else if (trRecord.arguments) {
              toolArgs = trRecord.arguments as StandardRecord;
            } else if (trRecord.parameters) {
              toolArgs = trRecord.parameters as StandardRecord;
            } else if (trRecord.input) {
              toolArgs = trRecord.input as StandardRecord;
            } else {
              toolArgs = toolCallArgsMap.get(toolId || toolName) || {};
            }

            toolExecutions.push({
              name: toolName,
              input: toolArgs,
              output: (trRecord.result as unknown) ?? "success",
            });
          }
        }
      }
    }

    return { toolsUsed: [...new Set(toolsUsed)], toolExecutions };
  }

  /**
   * Format the enhanced result
   */
  formatEnhancedResult(
    generateResult: Awaited<ReturnType<typeof generateText>>,
    tools: Record<string, Tool>,
    toolsUsed: string[],
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>,
    options: TextGenerationOptions,
  ): EnhancedGenerateResult {
    // Structured output check
    const useStructuredOutput =
      !!options.schema &&
      (options.output?.format === "json" ||
        options.output?.format === "structured");

    let content: string;
    if (useStructuredOutput) {
      if (generateResult.experimental_output !== undefined) {
        content = JSON.stringify(generateResult.experimental_output);
      } else {
        logger.debug(
          "[GenerationHandler] experimental_output not available, falling back to text parsing",
        );
        const rawText = generateResult.text || "";
        const strippedText = rawText
          .replace(/^```(?:json)?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
        content = strippedText;
      }
    } else {
      content = generateResult.text;
    }

    return {
      content,
      usage: {
        input: generateResult.usage?.promptTokens || 0,
        output: generateResult.usage?.completionTokens || 0,
        total: generateResult.usage?.totalTokens || 0,
      },
      provider: this.providerName,
      model: this.modelName,
      toolCalls: generateResult.toolCalls
        ? generateResult.toolCalls.map((tc: ToolCallObject) => ({
            toolCallId: tc.toolCallId || "unknown",
            toolName: tc.toolName || "unknown",
            args: tc.args || {},
          }))
        : [],
      toolResults: (generateResult.toolResults as ToolResult[]) || [],
      toolsUsed,
      toolExecutions,
      availableTools: Object.keys(tools).map((name) => {
        const tool = tools[name] as ExtendedTool;
        return {
          name,
          description: tool.description || "No description available",
          parameters: tool.parameters || {},
          server: tool.serverId || "direct",
        };
      }),
    };
  }

  /**
   * Analyze AI response structure and log detailed debugging information
   */
  analyzeAIResponse(result: Record<string, unknown>): void {
    logger.debug("NeuroLink Raw AI Response Analysis", {
      provider: this.providerName,
      model: this.modelName,
      responseTextLength: (result.text as string)?.length || 0,
      responsePreview: (result.text as string)?.substring(0, 500) + "...",
      finishReason: result.finishReason,
      usage: result.usage,
    });

    // Tool calls analysis
    const toolCallsAnalysis = {
      hasToolCalls: !!result.toolCalls,
      toolCallsLength: (result.toolCalls as unknown[])?.length || 0,
      toolCalls:
        (result.toolCalls as unknown[])?.map((toolCall, index) => {
          const tcRecord = toolCall as Record<string, unknown>;
          const toolName = tcRecord.toolName || tcRecord.name || "unknown";
          return {
            index: index + 1,
            toolName,
            toolId: tcRecord.toolCallId || tcRecord.id || "none",
            hasArgs: !!tcRecord.args,
            argsKeys:
              tcRecord.args && typeof tcRecord.args === "object"
                ? Object.keys(tcRecord.args as Record<string, unknown>)
                : [],
          };
        }) || [],
    };
    logger.debug("Tool Calls Analysis", toolCallsAnalysis);
  }
}
