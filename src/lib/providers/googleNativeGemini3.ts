/**
 * Shared utilities for Gemini 3 native SDK support.
 *
 * Both GoogleAIStudioProvider and GoogleVertexProvider route Gemini 3 models
 * with tools to the native @google/genai SDK (bypassing the Vercel AI SDK)
 * in order to properly handle thought_signature in multi-turn tool calling.
 *
 * This module extracts the functions that are duplicated between the two
 * providers so they can share a single implementation.
 */

import { randomUUID } from "node:crypto";
import type { Tool } from "ai";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_MAX_RETRIES,
} from "../core/constants.js";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import { logger } from "../utils/logger.js";
import {
  convertZodToJsonSchema,
  inlineJsonSchema,
  isZodSchema,
} from "../utils/schemaConversion.js";
import { createNativeThinkingConfig } from "../utils/thinkingConfig.js";
import type { ThinkingConfig } from "../utils/thinkingConfig.js";

// ── Types ──

/** A single native @google/genai function declaration. */
export type NativeFunctionDeclaration = {
  name: string;
  description: string;
  parametersJsonSchema?: Record<string, unknown>;
};

/** The tools config array expected by the @google/genai SDK. */
export type NativeToolsConfig = Array<{
  functionDeclarations: NativeFunctionDeclaration[];
}>;

/** Return value of buildNativeToolDeclarations. */
export type NativeToolDeclarationsResult = {
  toolsConfig: NativeToolsConfig;
  executeMap: Map<string, Tool["execute"]>;
};

/** A single function call returned by the Gemini model. */
export type NativeFunctionCall = {
  name: string;
  args: Record<string, unknown>;
};

/** A single function response to feed back into the conversation. */
export type NativeFunctionResponse = {
  functionResponse: { name: string; response: unknown };
};

/** Result from collectStreamChunks. */
export type CollectedChunkResult = {
  rawResponseParts: unknown[];
  stepFunctionCalls: NativeFunctionCall[];
  inputTokens: number;
  outputTokens: number;
};

// ── Functions ──

/**
 * Convert Vercel AI SDK tools to @google/genai FunctionDeclarations and an execute map.
 *
 * This handles both Zod schemas and plain JSON Schema objects for tool parameters.
 */
export function buildNativeToolDeclarations(
  tools: Record<string, Tool>,
): NativeToolDeclarationsResult {
  const functionDeclarations: NativeFunctionDeclaration[] = [];
  const executeMap = new Map<string, Tool["execute"]>();

  for (const [name, tool] of Object.entries(tools)) {
    const decl: NativeFunctionDeclaration = {
      name,
      description: tool.description || `Tool: ${name}`,
    };

    if (tool.parameters) {
      let rawSchema: Record<string, unknown>;

      if (isZodSchema(tool.parameters)) {
        rawSchema = convertZodToJsonSchema(
          tool.parameters as ZodUnknownSchema,
        ) as Record<string, unknown>;
      } else if (typeof tool.parameters === "object") {
        rawSchema = tool.parameters as Record<string, unknown>;
      } else {
        rawSchema = { type: "object", properties: {} };
      }

      decl.parametersJsonSchema = inlineJsonSchema(rawSchema);
      if (decl.parametersJsonSchema.$schema) {
        delete decl.parametersJsonSchema.$schema;
      }
    }

    functionDeclarations.push(decl);

    if (tool.execute) {
      executeMap.set(name, tool.execute);
    }
  }

  return { toolsConfig: [{ functionDeclarations }], executeMap };
}

/**
 * Build the native @google/genai config object shared by stream and generate.
 */
export function buildNativeConfig(
  options: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    thinkingConfig?: ThinkingConfig;
  },
  toolsConfig?: NativeToolsConfig,
): Record<string, unknown> {
  const config: Record<string, unknown> = {
    temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
    maxOutputTokens: options.maxTokens,
  };

  if (toolsConfig) {
    config.tools = toolsConfig;
  }

  if (options.systemPrompt) {
    config.systemInstruction = options.systemPrompt;
  }

  // Add thinking config for Gemini 3
  const nativeThinkingConfig = createNativeThinkingConfig(
    options.thinkingConfig,
  );
  if (nativeThinkingConfig) {
    config.thinkingConfig = nativeThinkingConfig;
  }

  return config;
}

/**
 * Safety cap for native Gemini 3 SDK agentic tool-calling loops.
 * Lower than DEFAULT_MAX_STEPS (200) to prevent runaway iterations
 * in the native SDK path which bypasses Vercel AI SDK step limits.
 */
const GEMINI3_NATIVE_MAX_STEPS = 100;

/**
 * Compute a safe, clamped maxSteps value.
 */
export function computeMaxSteps(rawMaxSteps?: number): number {
  const value = rawMaxSteps || DEFAULT_MAX_STEPS;
  return Number.isFinite(value) && value > 0
    ? Math.min(Math.floor(value), GEMINI3_NATIVE_MAX_STEPS)
    : Math.min(DEFAULT_MAX_STEPS, GEMINI3_NATIVE_MAX_STEPS);
}

/**
 * Process stream chunks to extract raw response parts, function calls, and usage metadata.
 *
 * Consumes the full async iterable and returns all collected data.
 */
export async function collectStreamChunks(
  stream: AsyncIterable<{
    functionCalls?: NativeFunctionCall[];
    [key: string]: unknown;
  }>,
): Promise<CollectedChunkResult> {
  const rawResponseParts: unknown[] = [];
  const stepFunctionCalls: NativeFunctionCall[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of stream) {
    // Extract raw parts from candidates FIRST
    // This avoids using chunk.text which triggers SDK warning when
    // non-text parts (thoughtSignature, functionCall) are present
    const chunkRecord = chunk as Record<string, unknown>;
    const candidates = chunkRecord.candidates as
      | Array<Record<string, unknown>>
      | undefined;
    const firstCandidate = candidates?.[0];
    const chunkContent = firstCandidate?.content as
      | Record<string, unknown>
      | undefined;
    if (chunkContent && Array.isArray(chunkContent.parts)) {
      rawResponseParts.push(...chunkContent.parts);
    }
    if (chunk.functionCalls) {
      stepFunctionCalls.push(...chunk.functionCalls);
    }

    // Accumulate usage metadata from chunks
    const usage = chunkRecord.usageMetadata as
      | { promptTokenCount?: number; candidatesTokenCount?: number }
      | undefined;
    if (usage) {
      inputTokens = Math.max(inputTokens, usage.promptTokenCount || 0);
      outputTokens = Math.max(outputTokens, usage.candidatesTokenCount || 0);
    }
  }

  return { rawResponseParts, stepFunctionCalls, inputTokens, outputTokens };
}

/**
 * Extract text from raw response parts, filtering out non-text parts
 * (thoughtSignature, functionCall) to avoid SDK warnings.
 */
export function extractTextFromParts(rawResponseParts: unknown[]): string {
  return rawResponseParts
    .filter(
      (part): part is { text: string } =>
        typeof (part as Record<string, unknown>).text === "string",
    )
    .map((part) => part.text)
    .join("");
}

/**
 * Execute a batch of native function calls with retry tracking and permanent failure detection.
 *
 * @param logLabel - Label for log messages (e.g. "[GoogleAIStudio]" or "[GoogleVertex]")
 * @param stepFunctionCalls - The function calls from the model
 * @param executeMap - Map of tool name to execute function
 * @param failedTools - Mutable map tracking per-tool failure counts
 * @param allToolCalls - Mutable array accumulating all tool call records
 * @param options - Optional settings for execution tracking and cancellation
 * @returns Array of function responses for conversation history
 */
export async function executeNativeToolCalls(
  logLabel: string,
  stepFunctionCalls: NativeFunctionCall[],
  executeMap: Map<string, Tool["execute"]>,
  failedTools: Map<string, { count: number; lastError: string }>,
  allToolCalls: Array<{ toolName: string; args: Record<string, unknown> }>,
  options?: {
    toolExecutions?: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }>;
    abortSignal?: AbortSignal;
  },
): Promise<NativeFunctionResponse[]> {
  const functionResponses: NativeFunctionResponse[] = [];

  for (const call of stepFunctionCalls) {
    allToolCalls.push({ toolName: call.name, args: call.args });

    // Check if this tool has already exceeded retry limit
    const failedInfo = failedTools.get(call.name);
    if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
      logger.warn(
        `${logLabel} Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
      );

      const errorOutput = {
        error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
        status: "permanently_failed",
        do_not_retry: true,
      };

      functionResponses.push({
        functionResponse: { name: call.name, response: errorOutput },
      });
      options?.toolExecutions?.push({
        name: call.name,
        input: call.args,
        output: errorOutput,
      });
      continue;
    }

    const execute = executeMap.get(call.name);
    if (execute) {
      try {
        // AI SDK Tool execute requires (args, options) - provide minimal options
        // Use randomUUID to avoid toolCallId collisions across concurrent calls
        const toolOptions = {
          toolCallId: `${call.name}-${randomUUID()}`,
          messages: [],
          abortSignal: options?.abortSignal,
        };
        const result = await execute(call.args, toolOptions);
        functionResponses.push({
          functionResponse: { name: call.name, response: { result } },
        });
        options?.toolExecutions?.push({
          name: call.name,
          input: call.args,
          output: result,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        // Track this failure
        const currentFailInfo = failedTools.get(call.name) || {
          count: 0,
          lastError: "",
        };
        currentFailInfo.count++;
        currentFailInfo.lastError = errorMessage;
        failedTools.set(call.name, currentFailInfo);

        logger.warn(
          `${logLabel} Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
        );

        // Determine if this is a permanent failure
        const isPermanentFailure =
          currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

        const errorOutput = {
          error: isPermanentFailure
            ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
            : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
          status: isPermanentFailure ? "permanently_failed" : "failed",
          do_not_retry: isPermanentFailure,
          retry_count: currentFailInfo.count,
          max_retries: DEFAULT_TOOL_MAX_RETRIES,
        };

        functionResponses.push({
          functionResponse: { name: call.name, response: errorOutput },
        });
        options?.toolExecutions?.push({
          name: call.name,
          input: call.args,
          output: errorOutput,
        });
      }
    } else {
      // Tool not found is a permanent error
      const errorOutput = {
        error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
        status: "permanently_failed",
        do_not_retry: true,
      };

      functionResponses.push({
        functionResponse: { name: call.name, response: errorOutput },
      });
      options?.toolExecutions?.push({
        name: call.name,
        input: call.args,
        output: errorOutput,
      });
    }
  }

  return functionResponses;
}

/**
 * Handle maxSteps termination by producing a final text when the model
 * was still calling tools when the step limit was reached.
 *
 * @param logLabel - Label for log messages (e.g. "[GoogleAIStudio]" or "[GoogleVertex]")
 */
export function handleMaxStepsTermination(
  logLabel: string,
  step: number,
  maxSteps: number,
  finalText: string,
  lastStepText: string,
): string {
  if (step >= maxSteps && !finalText) {
    logger.warn(
      `${logLabel} Tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
        `Model was still calling tools. Using accumulated text from last step.`,
    );
    return (
      lastStepText ||
      `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`
    );
  }
  return finalText;
}

/**
 * Push model response parts to conversation history, preserving thoughtSignature
 * for Gemini 3 multi-turn tool calling.
 */
export function pushModelResponseToHistory(
  currentContents: Array<{ role: string; parts: unknown[] }>,
  rawResponseParts: unknown[],
  stepFunctionCalls: NativeFunctionCall[],
): void {
  currentContents.push({
    role: "model",
    parts:
      rawResponseParts.length > 0
        ? rawResponseParts
        : stepFunctionCalls.map((fc) => ({ functionCall: fc })),
  });
}
