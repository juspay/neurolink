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
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import {
  type ToolExecuteFunction,
  jsonSchema as aiJsonSchema,
  tool as createAISDKTool,
  type Tool,
} from "ai";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_MAX_RETRIES,
} from "../core/constants.js";
import type {
  ZodUnknownSchema,
  ThinkingConfig,
  CollectedChunkResult,
  NativeFunctionCall,
  NativeFunctionDeclaration,
  NativeFunctionResponse,
  NativeToolDeclarationsResult,
  NativeToolsConfig,
  TextChannel,
  ToolWithLegacyParams,
  VertexNativePart,
  GeminiMultimodalInput,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  convertZodToJsonSchema,
  ensureNestedSchemaTypes,
  inlineJsonSchema,
  isZodSchema,
  normalizeJsonSchemaObject,
} from "../utils/schemaConversion.js";

import { createNativeThinkingConfig } from "../utils/thinkingConfig.js";

// ── Functions ──

/**
 * Sanitize a JSON Schema for Gemini's proto-based API.
 *
 * Gemini cannot handle `anyOf`/`oneOf` union types in function declarations
 * because its proto format expects a single `type` field, not a list of types.
 * This function recursively converts unions to `string` type (the most
 * permissive primitive that can represent any value as text).
 *
 * Also removes `$schema`, `additionalProperties`, and `default` keys that
 * Gemini's proto format doesn't support.
 */
export function sanitizeSchemaForGemini(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  // If this node has anyOf/oneOf, collapse to string type
  if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
    const unionKey = schema.anyOf ? "anyOf" : "oneOf";
    const variants = schema[unionKey] as Record<string, unknown>[];

    // Check if it's a nullable union (e.g., anyOf: [{type: "string"}, {type: "null"}])
    const nonNullVariants = variants.filter(
      (v) => v.type !== "null" && v.type !== "undefined",
    );

    if (nonNullVariants.length === 1) {
      // Simple nullable — use the non-null type with nullable flag
      const base = sanitizeSchemaForGemini({ ...nonNullVariants[0] });
      base.nullable = true;
      if (schema.description) {
        base.description = schema.description;
      }
      return base;
    }

    // Multi-type union — collapse to string with description noting the original types
    const types = nonNullVariants.map((v) => v.type || "unknown").join(" | ");
    const result: Record<string, unknown> = { type: "string" };
    const desc = schema.description
      ? `${schema.description} (accepts: ${types})`
      : `Value as string (accepts: ${types})`;
    result.description = desc;
    if (variants.some((v) => v.type === "null")) {
      result.nullable = true;
    }
    return result;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    // Skip keys unsupported by Gemini proto format
    if (
      key === "$schema" ||
      key === "additionalProperties" ||
      key === "default"
    ) {
      continue;
    }

    if (key === "properties" && value && typeof value === "object") {
      const properties: Record<string, unknown> = {};
      for (const [propName, propSchema] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (propSchema && typeof propSchema === "object") {
          properties[propName] = sanitizeSchemaForGemini(
            propSchema as Record<string, unknown>,
          );
        } else {
          properties[propName] = propSchema;
        }
      }
      result[key] = properties;
    } else if (key === "items" && value && typeof value === "object") {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          item && typeof item === "object"
            ? sanitizeSchemaForGemini(item as Record<string, unknown>)
            : item,
        );
      } else {
        result[key] = sanitizeSchemaForGemini(value as Record<string, unknown>);
      }
    } else {
      result[key] = value;
    }
  }

  // Recurse through composed schema branches
  if (Array.isArray(result.allOf)) {
    result.allOf = result.allOf.map((s: Record<string, unknown>) =>
      sanitizeSchemaForGemini(s),
    );
  }
  if (result.not && typeof result.not === "object") {
    result.not = sanitizeSchemaForGemini(result.not as Record<string, unknown>);
  }
  for (const branch of ["if", "then", "else"] as const) {
    if (result[branch] && typeof result[branch] === "object") {
      result[branch] = sanitizeSchemaForGemini(
        result[branch] as Record<string, unknown>,
      );
    }
  }

  return result;
}

/**
 * Sanitize Vercel AI SDK tools for Gemini compatibility.
 *
 * For the Vercel AI SDK path (non-native), tool parameters are Zod schemas that
 * get converted to JSON Schema internally by @ai-sdk/google. This conversion
 * doesn't sanitize union types (anyOf/oneOf), causing Gemini proto errors.
 *
 * This function pre-converts each tool's Zod parameters to sanitized JSON Schema
 * and re-wraps with the Vercel AI SDK's jsonSchema() helper.
 */
export function sanitizeToolsForGemini(tools: Record<string, Tool>): {
  tools: Record<string, Tool>;
  dropped: string[];
} {
  const sanitized: Record<string, Tool> = {};
  const dropped: string[] = [];

  for (const [name, tool] of Object.entries(tools)) {
    try {
      // Access the legacy `parameters` field that may exist on older AI SDK tools.
      // AI SDK v6 uses `inputSchema`, but v3/v4 tools and third-party wrappers use `parameters`.
      const legacyTool = tool as ToolWithLegacyParams;
      const params = legacyTool.parameters;
      if (
        params &&
        typeof params === "object" &&
        "_def" in params &&
        typeof (params as Record<string, unknown>).parse === "function"
      ) {
        const rawJsonSchema = convertZodToJsonSchema(
          params as ZodUnknownSchema,
          "openApi3",
        ) as Record<string, unknown>;
        const inlined = inlineJsonSchema(rawJsonSchema);
        // Gemini sanitization strips Zod-only features not supported by the Gemini API:
        // union types (anyOf/oneOf) are collapsed to string, default values and
        // additionalProperties are removed. The resulting schema is Gemini-compatible
        // but loses some type constraints from the original Zod schema.
        const sanitizedSchema = sanitizeSchemaForGemini(inlined);

        sanitized[name] = createAISDKTool({
          description: tool.description || `Tool: ${name}`,
          inputSchema: aiJsonSchema(sanitizedSchema),
          execute: tool.execute as ToolExecuteFunction<unknown, unknown>,
        });
      } else if (
        params &&
        typeof params === "object" &&
        "jsonSchema" in params
      ) {
        // Non-Zod JSON schema (e.g., from ai SDK jsonSchema() helper) — still needs sanitization
        const rawSchema = (params as Record<string, unknown>)
          .jsonSchema as Record<string, unknown>;
        const sanitizedSchema = sanitizeSchemaForGemini(
          inlineJsonSchema(rawSchema),
        );

        sanitized[name] = createAISDKTool({
          description: tool.description || `Tool: ${name}`,
          inputSchema: aiJsonSchema(sanitizedSchema),
          execute: tool.execute as ToolExecuteFunction<unknown, unknown>,
        });
      } else {
        sanitized[name] = tool;
      }
    } catch (error) {
      logger.warn(
        `[Gemini] Failed to sanitize tool "${name}", skipping: ${error instanceof Error ? error.message : String(error)}`,
      );
      // Don't fall back to the original tool — an incompatible schema would fail the Gemini request
      dropped.push(name);
    }
  }

  return { tools: sanitized, dropped };
}

export function normalizeToolsForJsonSchemaProvider(
  tools: Record<string, Tool>,
): {
  tools: Record<string, Tool>;
  normalized: string[];
} {
  const normalizedTools: Record<string, Tool> = {};
  const normalized: string[] = [];

  for (const [name, tool] of Object.entries(tools)) {
    const legacyTool = tool as ToolWithLegacyParams;
    const toolParams = legacyTool.parameters || tool.inputSchema;
    let rawSchema: Record<string, unknown>;

    if (isZodSchema(toolParams)) {
      rawSchema = convertZodToJsonSchema(
        toolParams as ZodUnknownSchema,
        "openApi3",
      ) as Record<string, unknown>;
    } else if (toolParams && typeof toolParams === "object") {
      rawSchema = toolParams as Record<string, unknown>;
    } else {
      rawSchema = { type: "object", properties: {} };
    }

    if (
      rawSchema.jsonSchema &&
      typeof rawSchema.jsonSchema === "object" &&
      !rawSchema.type
    ) {
      rawSchema = rawSchema.jsonSchema as Record<string, unknown>;
    }

    const schemaBefore = JSON.stringify(rawSchema);
    const normalizedSchema = normalizeJsonSchemaObject(rawSchema);
    if (JSON.stringify(normalizedSchema) !== schemaBefore) {
      normalized.push(name);
    }

    const wrappedSchema = aiJsonSchema(normalizedSchema);
    normalizedTools[name] = {
      ...tool,
      inputSchema: wrappedSchema,
      ...(legacyTool.parameters ? { parameters: wrappedSchema } : {}),
    } as Tool;
  }

  return {
    tools: normalizedTools,
    normalized,
  };
}

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

  const skippedTools: string[] = [];

  for (const [name, tool] of Object.entries(tools)) {
    try {
      const decl: NativeFunctionDeclaration = {
        name,
        description: tool.description || `Tool: ${name}`,
      };

      // Access legacy `parameters` (AI SDK v3/v4) or current `inputSchema` (v6)
      const legacyTool = tool as ToolWithLegacyParams;
      if (legacyTool.parameters || tool.inputSchema) {
        let rawSchema: Record<string, unknown>;
        const toolParams = legacyTool.parameters || tool.inputSchema;

        if (isZodSchema(toolParams)) {
          rawSchema = convertZodToJsonSchema(
            toolParams as ZodUnknownSchema,
            "openApi3",
          ) as Record<string, unknown>;
        } else if (typeof toolParams === "object") {
          rawSchema = toolParams as Record<string, unknown>;
        } else {
          rawSchema = { type: "object", properties: {} };
        }

        // Unwrap Vercel AI SDK's jsonSchema() wrapper: { jsonSchema: { type: "object", ... } }
        if (
          rawSchema.jsonSchema &&
          typeof rawSchema.jsonSchema === "object" &&
          !rawSchema.type
        ) {
          rawSchema = rawSchema.jsonSchema as Record<string, unknown>;
        }

        decl.parametersJsonSchema = sanitizeSchemaForGemini(
          inlineJsonSchema(rawSchema),
        );
      }

      functionDeclarations.push(decl);

      if (tool.execute) {
        executeMap.set(name, tool.execute);
      }
    } catch (err) {
      skippedTools.push(name);
      logger.error(
        `[buildNativeToolDeclarations] Failed to convert tool "${name}":`,
        err,
      );
    }
  }

  if (skippedTools.length > 0) {
    logger.warn(
      `[buildNativeToolDeclarations] ${skippedTools.length} tool(s) skipped due to schema errors: ${skippedTools.join(", ")}`,
    );
  }

  return { toolsConfig: [{ functionDeclarations }], executeMap };
}

/**
 * Build the native @google/genai config object shared by stream and generate.
 *
 * Caller is responsible for the tools-vs-JSON conflict resolution: Gemini's
 * function calling cannot be combined with `responseMimeType:
 * "application/json"`, and `responseSchema` requires that mime type. So
 * when tools are active, callers must NOT pass `wantsJsonOutput`/
 * `responseSchema` here; when JSON/schema output is requested, callers
 * must omit `toolsConfig`. The AI Studio path enforces this by forcing
 * `disableTools: true` whenever JSON/schema output is requested.
 */
export function buildNativeConfig(
  options: {
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    thinkingConfig?: ThinkingConfig;
    /**
     * When true (and `toolsConfig` is undefined), set
     * `responseMimeType: "application/json"` to enforce native JSON output.
     */
    wantsJsonOutput?: boolean;
    /**
     * Pre-converted JSON Schema for native `responseSchema`. Implies
     * `wantsJsonOutput`. Ignored if `toolsConfig` is present.
     */
    responseSchema?: Record<string, unknown>;
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

  // Native JSON / schema enforcement. Only set when tools are NOT being sent
  // (Gemini rejects the combination). responseSchema implies JSON mime type.
  if (!toolsConfig) {
    if (options.responseSchema || options.wantsJsonOutput) {
      config.responseMimeType = "application/json";
    }
    if (options.responseSchema) {
      config.responseSchema = options.responseSchema;
    }
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
 * Create a push-based text channel that bridges a background producer
 * (the agentic tool-calling loop) with an async-iterable consumer.
 *
 * This enables truly incremental streaming: text parts are yielded to the
 * caller as they arrive from the network, rather than being buffered until
 * the model finishes generating.
 */
export function createTextChannel(): TextChannel {
  const queue: Array<{ content: string }> = [];
  let done = false;
  let fatalError: unknown = undefined;
  // Resolve the current "wait for data" promise when new data arrives
  let notify: (() => void) | null = null;

  function wake(): void {
    if (notify) {
      const fn = notify;
      notify = null;
      fn();
    }
  }

  function push(text: string): void {
    if (done) {
      return;
    }
    queue.push({ content: text });
    wake();
  }

  function close(): void {
    done = true;
    wake();
  }

  function error(err: unknown): void {
    done = true;
    fatalError = err;
    wake();
  }

  let readIndex = 0;

  async function* iterable(): AsyncIterable<{ content: string }> {
    try {
      while (true) {
        if (readIndex < queue.length) {
          yield queue[readIndex++];
          // Periodically compact consumed chunks to avoid unbounded retention
          if (readIndex > 1024 && readIndex * 2 >= queue.length) {
            queue.splice(0, readIndex);
            readIndex = 0;
          }
        } else if (done) {
          if (fatalError !== undefined) {
            throw fatalError instanceof Error
              ? fatalError
              : new Error(String(fatalError));
          }
          return;
        } else {
          // Wait until the producer pushes data or signals completion
          await new Promise<void>((resolve) => {
            notify = resolve;
          });
        }
      }
    } finally {
      // Consumer stopped reading (e.g. disconnect/cancel): stop buffering.
      done = true;
      queue.length = 0;
      notify?.();
    }
  }

  return { push, close, error, iterable: iterable() };
}

/**
 * Iterate a single stream step incrementally, pushing text parts to `channel`
 * as they arrive from the network while simultaneously accumulating the full
 * `CollectedChunkResult` needed for history and token accounting.
 *
 * Used for all steps (both intermediate tool-calling steps and the final
 * text-only step).  Text parts are pushed to the channel as they arrive,
 * enabling truly incremental streaming.  The complete `rawResponseParts`
 * (including thoughtSignature) are still returned at the end for use by
 * `pushModelResponseToHistory`.
 */
export async function collectStreamChunksIncremental(
  stream: AsyncIterable<{
    functionCalls?: NativeFunctionCall[];
    [key: string]: unknown;
  }>,
  channel: TextChannel,
): Promise<CollectedChunkResult> {
  const rawResponseParts: unknown[] = [];
  const stepFunctionCalls: NativeFunctionCall[] = [];
  let inputTokens = 0;
  let outputTokens = 0;

  for await (const chunk of stream) {
    const chunkRecord = chunk as Record<string, unknown>;
    const candidates = chunkRecord.candidates as
      | Array<Record<string, unknown>>
      | undefined;
    const firstCandidate = candidates?.[0];
    const chunkContent = firstCandidate?.content as
      | Record<string, unknown>
      | undefined;
    if (chunkContent && Array.isArray(chunkContent.parts)) {
      for (const part of chunkContent.parts as Array<Record<string, unknown>>) {
        rawResponseParts.push(part);
        // Forward text parts to the consumer immediately
        if (typeof part.text === "string" && part.text.length > 0) {
          channel.push(part.text);
        }
      }
    }
    if (chunk.functionCalls) {
      stepFunctionCalls.push(...chunk.functionCalls);
    }

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
 * Extract the thoughtSignature token from raw response parts.
 * Returns the last thoughtSignature found (each step may produce one).
 */
export function extractThoughtSignature(
  rawResponseParts: unknown[],
): string | undefined {
  for (let i = rawResponseParts.length - 1; i >= 0; i--) {
    const part = rawResponseParts[i];
    if (
      part !== null &&
      part !== undefined &&
      typeof part === "object" &&
      "thoughtSignature" in part &&
      typeof (part as { thoughtSignature: unknown }).thoughtSignature ===
        "string"
    ) {
      return (part as { thoughtSignature: string }).thoughtSignature;
    }
  }
  return undefined;
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

/**
 * Convert a Zod schema (or AI SDK `jsonSchema()` wrapper) into the shape
 * `@google/genai` accepts as `responseSchema`. Mirrors the inline pipeline
 * the Vertex Gemini paths already use:
 *
 *   convertZodToJsonSchema → inlineJsonSchema → strip `$schema` → ensure
 *   every nested schema has a `type` (Vertex/Gemini reject schemas missing
 *   that field, even on nested objects).
 *
 * Lives here so the AI Studio and Vertex paths can share the same
 * sanitization without duplicating the schema-conversion churn.
 */
export function buildGeminiResponseSchema(
  schema: unknown,
): Record<string, unknown> {
  const raw = convertZodToJsonSchema(
    schema as Parameters<typeof convertZodToJsonSchema>[0],
    "openApi3",
  ) as Record<string, unknown>;
  const inlined = inlineJsonSchema(raw);
  if (inlined.$schema) {
    delete inlined.$schema;
  }
  return ensureNestedSchemaTypes(inlined);
}

/**
 * Map NeuroLink ChatMessage[] history into the @google/genai content format
 * and push the entries onto a contents array.
 *
 * Used by the native Vertex Gemini and Google AI Studio paths to honor
 * `options.conversationMessages` so multi-turn conversations (memory, loop
 * REPL, agent flows) actually carry prior turns into the request.
 *
 * Behavior notes:
 *  - Only `user` and `assistant` roles are forwarded; system messages are
 *    expected to be wired via `systemInstruction`, and tool-call /
 *    tool-result roles only appear inside intra-call tool loops which build
 *    their own model/function entries.
 *  - String content is wrapped as a single `{ text }` part. Empty strings
 *    are skipped to avoid sending empty parts that some Gemini regions
 *    reject.
 *  - The current user input should be appended AFTER calling this helper
 *    so the prior turns appear first in chronological order.
 */
export function prependConversationMessages(
  contents: Array<{ role: string; parts: unknown[] }>,
  conversationMessages?: Array<{
    role: string;
    content: string;
  }>,
): void {
  if (!conversationMessages || conversationMessages.length === 0) {
    return;
  }
  for (const msg of conversationMessages) {
    if (msg.role !== "user" && msg.role !== "assistant") {
      continue;
    }
    const text = typeof msg.content === "string" ? msg.content : "";
    if (text.length === 0) {
      continue;
    }
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text }],
    });
  }
}

/**
 * Build the `parts` array for the current user turn of a Gemini native
 * `generateContent` request, including inline image + PDF blobs.
 *
 * Both providers that hit the native `@google/genai` SDK — `GoogleVertex`
 * and `GoogleAIStudio` — need this. The previous AI Studio code only
 * pushed a single `{ text }` part, which silently dropped `input.images`
 * and `input.pdfFiles` on the floor: the model received text only and
 * legitimately reported "no image attached". Extracting this from the
 * Vertex copy keeps both providers on one definition.
 *
 * Accepted shapes per element (mirroring the runtime behaviour the Vertex
 * code already supported):
 *   - `Buffer` → used as-is
 *   - local file path → read via `readFileSync`, MIME guessed from extension
 *   - `data:<mime>;base64,...` URL → mime parsed, data base64-decoded
 *   - `http(s)://...` URL → fetched, mime from `content-type`
 *   - any other string → assumed to be a base64-encoded payload
 *
 * Image MIME guessing is conservative — only known extensions override the
 * default `image/jpeg`. Fetch failures are logged and the offending entry
 * is skipped rather than aborting the entire request, matching prior
 * Vertex behaviour.
 */
export async function buildUserPartsWithMultimodal(
  input: GeminiMultimodalInput | undefined,
  textOverride?: string,
  logPrefix: string = "[GeminiNative]",
): Promise<VertexNativePart[]> {
  const text =
    typeof textOverride === "string" ? textOverride : (input?.text ?? "");
  const parts: VertexNativePart[] = [{ text }];

  if (input?.pdfFiles && input.pdfFiles.length > 0) {
    logger.debug(`${logPrefix} Processing ${input.pdfFiles.length} PDF(s)`);
    for (const pdfFile of input.pdfFiles) {
      let pdfBuffer: Buffer;
      if (typeof pdfFile === "string") {
        if (existsSync(pdfFile)) {
          pdfBuffer = readFileSync(pdfFile);
        } else {
          // Treat as already-base64-encoded payload
          pdfBuffer = Buffer.from(pdfFile, "base64");
        }
      } else {
        pdfBuffer = pdfFile;
      }
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBuffer.toString("base64"),
        },
      });
    }
  }

  if (input?.images && input.images.length > 0) {
    logger.debug(`${logPrefix} Processing ${input.images.length} image(s)`);
    for (const rawImage of input.images) {
      // `images` may carry plain Buffer/string values or `{ data, altText? }`
      // objects. Normalise to the inner payload before format detection.
      const image: Buffer | string =
        rawImage && typeof rawImage === "object" && !Buffer.isBuffer(rawImage)
          ? (rawImage as { data: Buffer | string }).data
          : (rawImage as Buffer | string);
      let imageBuffer: Buffer | undefined;
      let mimeType = "image/jpeg";

      if (typeof image === "string") {
        if (existsSync(image)) {
          imageBuffer = readFileSync(image);
          const ext = extname(image).toLowerCase();
          if (ext === ".png") {
            mimeType = "image/png";
          } else if (ext === ".gif") {
            mimeType = "image/gif";
          } else if (ext === ".webp") {
            mimeType = "image/webp";
          }
        } else if (image.startsWith("data:")) {
          const matches = image.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            mimeType = matches[1];
            imageBuffer = Buffer.from(matches[2], "base64");
          } else {
            continue;
          }
        } else if (
          image.startsWith("http://") ||
          image.startsWith("https://")
        ) {
          try {
            const response = await fetch(image);
            if (!response.ok) {
              logger.warn(
                `${logPrefix} Image fetch failed: ${response.status} ${response.statusText}, skipping`,
                { url: image },
              );
              continue;
            }
            const arrayBuffer = await response.arrayBuffer();
            imageBuffer = Buffer.from(arrayBuffer);
            const headerMime = response.headers.get("content-type");
            if (headerMime && headerMime.startsWith("image/")) {
              mimeType = headerMime.split(";")[0];
            }
          } catch (fetchError) {
            logger.warn(
              `${logPrefix} Image URL fetch threw, skipping: ${
                fetchError instanceof Error
                  ? fetchError.message
                  : String(fetchError)
              }`,
              { url: image },
            );
            continue;
          }
        } else {
          imageBuffer = Buffer.from(image, "base64");
        }
      } else {
        imageBuffer = image;
      }

      if (!imageBuffer) {
        continue;
      }
      parts.push({
        inlineData: {
          mimeType,
          data: imageBuffer.toString("base64"),
        },
      });
    }
  }

  return parts;
}
