/**
 * SageMaker Streaming Response Parsers
 *
 * This module provides protocol-specific parsers for different streaming
 * formats used by SageMaker endpoints (HuggingFace, LLaMA, custom models).
 */

import type {
  SageMakerStreamChunk,
  SageMakerUsage,
  SageMakerStreamingToolCall,
  SageMakerStructuredOutput,
} from "../../types/providers.js";
import { isNonNullObject } from "../../utils/typeUtils.js";
import {
  createStructuredOutputParser,
  isStructuredContent,
  type StructuredOutputParser,
} from "./structured-parser.js";
import { SageMakerError } from "./errors.js";
import { logger } from "../../utils/logger.js";
import { randomUUID } from "crypto";

/**
 * Constants for JSON parsing and validation
 */
const MIN_JSON_OBJECT_LENGTH = 2; // Minimum length for JSON object "{}"

/**
 * Shared bracket counting state and utilities
 * Used by both validateJSONCompleteness and StructuredOutputParser
 */
export type BracketCountingState = {
  braceCount: number;
  bracketCount: number;
  inString: boolean;
  escapeNext: boolean;
};

/**
 * Process a single character for bracket counting logic
 * Shared utility to avoid code duplication between parsers
 */
export function processBracketCharacter(
  char: string,
  state: BracketCountingState,
): { isValid: boolean; reason?: string } {
  if (state.escapeNext) {
    state.escapeNext = false;
    return { isValid: true };
  }

  if (char === "\\") {
    state.escapeNext = true;
    return { isValid: true };
  }

  if (char === '"' && !state.escapeNext) {
    state.inString = !state.inString;
    return { isValid: true };
  }

  // Only count brackets outside of strings
  if (!state.inString) {
    switch (char) {
      case "{":
        state.braceCount++;
        break;
      case "}":
        state.braceCount--;
        if (state.braceCount < 0) {
          return { isValid: false, reason: "Unmatched closing brace" };
        }
        break;
      case "[":
        state.bracketCount++;
        break;
      case "]":
        state.bracketCount--;
        if (state.bracketCount < 0) {
          return { isValid: false, reason: "Unmatched closing bracket" };
        }
        break;
    }
  }

  return { isValid: true };
}

/**
 * Utility function to validate JSON completeness using efficient bracket counting
 * Extracted from parseArgumentsForToolCall for reusability
 */
export function validateJSONCompleteness(jsonString: string): {
  isComplete: boolean;
  reason?: string;
} {
  // Basic length check - minimum for empty object "{}"
  if (jsonString.length < MIN_JSON_OBJECT_LENGTH) {
    return { isComplete: false, reason: "Too short" };
  }

  // Must start and end with braces for object
  if (!jsonString.startsWith("{") || !jsonString.endsWith("}")) {
    return { isComplete: false, reason: "Missing object braces" };
  }

  // Use shared bracket counting logic
  const state: BracketCountingState = {
    braceCount: 0,
    bracketCount: 0,
    inString: false,
    escapeNext: false,
  };

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const result = processBracketCharacter(char, state);

    if (!result.isValid) {
      return { isComplete: false, reason: result.reason };
    }
  }

  // Check for unterminated string
  if (state.inString) {
    return { isComplete: false, reason: "Unterminated string" };
  }

  // Check if all brackets are balanced
  if (state.braceCount !== 0) {
    return {
      isComplete: false,
      reason: `Unbalanced braces: ${state.braceCount}`,
    };
  }

  if (state.bracketCount !== 0) {
    return {
      isComplete: false,
      reason: `Unbalanced brackets: ${state.bracketCount}`,
    };
  }

  return { isComplete: true };
}

/**
 * Utility function to parse tool call arguments with robust validation
 * Extracted from parseArgumentsForToolCall for reusability
 */
export function parseToolCallArguments(args: string): {
  arguments?: string;
  complete?: boolean;
  argumentsDelta?: string;
} {
  const trimmedArgs = args.trim();

  // Handle empty arguments
  if (trimmedArgs.length === 0) {
    return { arguments: "{}", complete: true };
  }

  // Use robust bracket counting for JSON validation
  const validationResult = validateJSONCompleteness(trimmedArgs);

  if (validationResult.isComplete) {
    try {
      const parsed = JSON.parse(trimmedArgs);
      // Additional validation: ensure it's actually an object
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        !Array.isArray(parsed)
      ) {
        return { arguments: trimmedArgs, complete: true };
      } else {
        // Not a valid object, treat as delta
        return { argumentsDelta: trimmedArgs };
      }
    } catch (parseError) {
      // Log parsing error for debugging
      logger.debug("JSON parsing failed for tool arguments", {
        args: trimmedArgs.substring(0, 100),
        error: formatErrorMessage(parseError),
      });
      // Not valid JSON despite looking complete, treat as delta
      return { argumentsDelta: trimmedArgs };
    }
  } else {
    // String doesn't look like complete JSON, treat as delta
    return { argumentsDelta: trimmedArgs };
  }
}

/**
 * Base interface for streaming response parsers
 */
export type StreamingParser = {
  /** Parse a chunk of streaming data */
  parse(chunk: Uint8Array): SageMakerStreamChunk[];

  /** Check if a chunk indicates completion */
  isComplete(chunk: SageMakerStreamChunk): boolean;

  /** Extract final usage information */
  extractUsage(finalChunk: SageMakerStreamChunk): SageMakerUsage | undefined;

  /** Get parser name for debugging */
  getName(): string;

  /** Reset parser state for new stream */
  reset(): void;
};

/**
 * Abstract base parser with common functionality
 */
abstract class BaseStreamingParser implements StreamingParser {
  protected buffer = "";
  protected isCompleted = false;
  protected totalUsage?: SageMakerUsage;
  protected structuredParser?: StructuredOutputParser;
  protected responseSchema?: Record<string, unknown>;

  abstract parse(chunk: Uint8Array): SageMakerStreamChunk[];
  abstract getName(): string;

  isComplete(chunk: SageMakerStreamChunk): boolean {
    return chunk.done === true || chunk.finishReason !== undefined;
  }

  extractUsage(finalChunk: SageMakerStreamChunk): SageMakerUsage | undefined {
    return finalChunk.usage || this.totalUsage;
  }

  reset(): void {
    this.buffer = "";
    this.isCompleted = false;
    this.totalUsage = undefined;
    this.structuredParser?.reset();
  }

  /**
   * Enable structured output parsing with optional schema
   */
  enableStructuredOutput(schema?: Record<string, unknown>): void {
    this.responseSchema = schema;
    this.structuredParser = createStructuredOutputParser(schema);
  }

  /**
   * Parse structured content if enabled
   */
  protected parseStructuredContent(
    content: string,
  ): SageMakerStructuredOutput | undefined {
    if (!this.structuredParser || !isStructuredContent(content)) {
      return undefined;
    }

    return this.structuredParser.parseChunk(content);
  }

  protected decodeChunk(chunk: Uint8Array): string {
    return new TextDecoder().decode(chunk);
  }

  protected parseJSON(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch (error) {
      logger.warn("Failed to parse JSON in streaming response", {
        text,
        error,
      });
      return null;
    }
  }
}

/**
 * HuggingFace Transformers streaming parser (Server-Sent Events)
 */
export class HuggingFaceStreamParser extends BaseStreamingParser {
  getName(): string {
    return "HuggingFace SSE Parser";
  }

  parse(chunk: Uint8Array): SageMakerStreamChunk[] {
    const text = this.decodeChunk(chunk);
    this.buffer += text;

    const chunks: SageMakerStreamChunk[] = [];
    const lines = this.buffer.split("\n");

    // Keep the last potentially incomplete line in buffer
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith(":")) {
        continue;
      }

      // Parse Server-Sent Events format
      if (trimmed.startsWith("data: ")) {
        const data = trimmed.substring(6);

        // Check for stream end
        if (data === "[DONE]") {
          chunks.push({
            content: "",
            done: true,
            finishReason: "stop",
          });
          this.isCompleted = true;
          continue;
        }

        // Parse JSON data
        const parsed = this.parseJSON(data);
        if (parsed && isNonNullObject(parsed)) {
          const chunk = this.parseHuggingFaceChunk(
            parsed as Record<string, unknown>,
          );
          if (chunk) {
            chunks.push(chunk);
          }
        }
      }
    }

    return chunks;
  }

  private parseHuggingFaceChunk(
    data: Record<string, unknown>,
  ): SageMakerStreamChunk | null {
    // HuggingFace streaming format
    if (data.token) {
      const token = data.token as Record<string, unknown>;
      return {
        content: typeof token.text === "string" ? token.text : String(token),
        done: false,
      };
    }

    // Alternative format with generated_text
    if (data.generated_text !== undefined) {
      const details = data.details as Record<string, unknown> | undefined;
      return {
        content: String(data.generated_text),
        done: details?.finish_reason !== undefined,
        finishReason: this.mapFinishReason(
          details?.finish_reason as string | undefined,
        ),
        usage: details ? this.parseHuggingFaceUsage(details) : undefined,
      };
    }

    // Error format
    if (data.error) {
      const errorMessage = extractApiErrorMessage(
        data.error as Record<string, unknown> | string,
      );
      throw new SageMakerError(`HuggingFace streaming error: ${errorMessage}`, {
        code: "MODEL_ERROR",
        statusCode: 500,
        retryable: false,
      });
    }

    return null;
  }

  private parseHuggingFaceUsage(
    details: Record<string, unknown>,
  ): SageMakerUsage | undefined {
    if (!details.tokens) {
      return undefined;
    }

    const tokens = details.tokens as Record<string, unknown>;
    return {
      promptTokens: Number(tokens.input) || 0,
      completionTokens: Number(tokens.generated) || 0,
      total: Number(tokens.total) || 0,
    };
  }

  private mapFinishReason(
    reason: string | undefined,
  ): SageMakerStreamChunk["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "eos_token":
        return "stop";
      default:
        return "unknown";
    }
  }
}

/**
 * LLaMA/OpenAI-compatible streaming parser (JSON Lines)
 */
export class LlamaStreamParser extends BaseStreamingParser {
  getName(): string {
    return "LLaMA JSONL Parser";
  }

  parse(chunk: Uint8Array): SageMakerStreamChunk[] {
    const text = this.decodeChunk(chunk);
    this.buffer += text;

    const chunks: SageMakerStreamChunk[] = [];
    const lines = this.buffer.split("\n");

    // Keep the last potentially incomplete line in buffer
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Parse each line as JSON
      const parsed = this.parseJSON(trimmed);
      if (parsed && isNonNullObject(parsed)) {
        const chunk = this.parseLlamaChunk(parsed as Record<string, unknown>);
        if (chunk) {
          chunks.push(chunk);
        }
      }
    }

    return chunks;
  }

  private parseLlamaChunk(
    data: Record<string, unknown>,
  ): SageMakerStreamChunk | null {
    // OpenAI-compatible format
    if (Array.isArray(data.choices) && data.choices[0]) {
      const choice = data.choices[0] as Record<string, unknown>;

      // Delta format (streaming)
      if (choice.delta) {
        const delta = choice.delta as Record<string, unknown>;
        const content = String(delta.content || "");
        const finishReason = choice.finish_reason as string | null | undefined;

        const chunk: SageMakerStreamChunk = {
          content,
          done: finishReason !== null && finishReason !== undefined,
          finishReason: this.mapFinishReason(finishReason || null),
          usage: data.usage
            ? this.parseLlamaUsage(data.usage as Record<string, unknown>)
            : undefined,
        };

        // Phase 2.3: Handle structured output if enabled
        if (content && this.structuredParser) {
          chunk.structuredOutput = this.parseStructuredContent(content);
        }

        // Phase 2.3: Handle streaming tool calls
        if (Array.isArray(delta.tool_calls) && delta.tool_calls[0]) {
          const toolCall = delta.tool_calls[0] as Record<string, unknown>;
          chunk.toolCall = this.parseStreamingToolCall(toolCall);

          // If tool call is complete and we have finish_reason, mark chunk complete
          if (finishReason === "function_call" && chunk.toolCall.arguments) {
            chunk.toolCall.complete = true;
          }
        }

        return chunk;
      }

      // Text format (non-streaming fallback)
      if (choice.text !== undefined) {
        return {
          content: String(choice.text),
          done: choice.finish_reason !== null,
          finishReason: this.mapFinishReason(
            choice.finish_reason as string | null,
          ),
          usage: data.usage
            ? this.parseLlamaUsage(data.usage as Record<string, unknown>)
            : undefined,
        };
      }
    }

    // Direct content format
    if (data.content !== undefined) {
      return {
        content: String(data.content),
        done: Boolean(data.done),
        finishReason: this.mapFinishReason(data.finish_reason as string | null),
        usage: data.usage
          ? this.parseLlamaUsage(data.usage as Record<string, unknown>)
          : undefined,
      };
    }

    // Error format
    if (data.error) {
      const errorData = data.error as Record<string, unknown> | string;
      const errorMessage = extractApiErrorMessage(errorData);
      throw new SageMakerError(`LLaMA streaming error: ${errorMessage}`, {
        code: "MODEL_ERROR",
        statusCode: 500,
        retryable: false,
      });
    }

    return null;
  }

  /**
   * Parse tool call arguments with robust validation and error handling
   */
  private parseToolCallArguments(
    functionData: { arguments?: unknown },
    toolCall: SageMakerStreamingToolCall,
  ): void {
    if (typeof functionData.arguments === "string") {
      const result = parseToolCallArguments(functionData.arguments);

      if (result.complete) {
        toolCall.arguments = result.arguments;
        toolCall.complete = true;
      } else if (result.argumentsDelta !== undefined) {
        toolCall.argumentsDelta = result.argumentsDelta;
      }
    } else if (functionData.arguments !== undefined) {
      // Handle non-string arguments (objects, numbers, etc.)
      try {
        toolCall.arguments = JSON.stringify(functionData.arguments);
        toolCall.complete = true;
      } catch (stringifyError) {
        logger.warn("Failed to stringify tool arguments", {
          args: functionData.arguments,
          error: formatErrorMessage(stringifyError),
        });
        toolCall.arguments = "{}";
        toolCall.complete = true;
      }
    } else {
      // No arguments provided, default to empty object
      toolCall.arguments = "{}";
      toolCall.complete = true;
    }
  }

  /**
   * Parse streaming tool call from OpenAI-compatible format (Phase 2.3)
   */
  private parseStreamingToolCall(
    toolCallData: Record<string, unknown>,
  ): SageMakerStreamingToolCall {
    const toolCall: SageMakerStreamingToolCall = {
      id: String(toolCallData.id || `call_${randomUUID()}`),
      type: "function",
    };

    // Handle function name (usually sent in first chunk)
    const functionData = toolCallData.function as
      | Record<string, unknown>
      | undefined;
    if (functionData?.name) {
      toolCall.name = String(functionData.name);
    }

    // Handle streaming arguments
    if (functionData?.arguments) {
      this.parseToolCallArguments(functionData, toolCall);
    }

    return toolCall;
  }

  private parseLlamaUsage(usage: Record<string, unknown>): SageMakerUsage {
    return {
      promptTokens: Number(usage.prompt_tokens) || 0,
      completionTokens: Number(usage.completion_tokens) || 0,
      total: Number(usage.total_tokens) || 0,
    };
  }

  private mapFinishReason(
    reason: string | null,
  ): SageMakerStreamChunk["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "length":
        return "length";
      case "function_call":
        return "tool-calls";
      case "content_filter":
        return "content-filter";
      default:
        return reason ? "unknown" : undefined;
    }
  }
}

/**
 * Custom/Generic streaming parser (Chunked Transfer)
 */
export class CustomStreamParser extends BaseStreamingParser {
  private expectedFormat: "json" | "text" = "json";

  constructor(format: "json" | "text" = "json") {
    super();
    this.expectedFormat = format;
  }

  getName(): string {
    return `Custom ${this.expectedFormat.toUpperCase()} Parser`;
  }

  parse(chunk: Uint8Array): SageMakerStreamChunk[] {
    const text = this.decodeChunk(chunk);
    this.buffer += text;

    if (this.expectedFormat === "json") {
      return this.parseJSONFormat();
    } else {
      return this.parseTextFormat();
    }
  }

  private parseJSONFormat(): SageMakerStreamChunk[] {
    const chunks: SageMakerStreamChunk[] = [];

    // Try to parse complete JSON objects
    let startIndex = 0;
    while (startIndex < this.buffer.length) {
      try {
        const remaining = this.buffer.substring(startIndex);
        const parsed = JSON.parse(remaining);

        // Successfully parsed - this is probably the complete response
        const chunk: SageMakerStreamChunk = {
          content:
            parsed.text ||
            parsed.generated_text ||
            parsed.output ||
            String(parsed),
          done: true,
          finishReason: "stop",
        };

        chunks.push(chunk);
        this.buffer = "";
        this.isCompleted = true;
        break;
      } catch {
        // JSON parsing failed - look for newline-separated JSON
        const newlineIndex = this.buffer.indexOf("\n", startIndex);
        if (newlineIndex === -1) {
          // No complete line found, wait for more data
          break;
        }

        const line = this.buffer.substring(startIndex, newlineIndex);
        if (line.trim()) {
          const parsed = this.parseJSON(line.trim());
          if (parsed && isNonNullObject(parsed)) {
            const chunk = this.parseCustomChunk(
              parsed as Record<string, unknown>,
            );
            if (chunk) {
              chunks.push(chunk);
            }
          }
        }

        startIndex = newlineIndex + 1;
      }
    }

    // Clean processed content from buffer
    if (startIndex > 0) {
      this.buffer = this.buffer.substring(startIndex);
    }

    return chunks;
  }

  private parseTextFormat(): SageMakerStreamChunk[] {
    // Simple text streaming - treat each chunk as content
    if (this.buffer) {
      const content = this.buffer;
      this.buffer = "";

      return [
        {
          content,
          done: false,
        },
      ];
    }

    return [];
  }

  private parseCustomChunk(
    data: Record<string, unknown>,
  ): SageMakerStreamChunk | null {
    // Generic parsing for various custom formats
    const content =
      data.text ||
      data.generated_text ||
      data.output ||
      data.response ||
      data.content ||
      (typeof data === "string" ? data : JSON.stringify(data));

    return {
      content: String(content),
      done: Boolean(data.done || data.finished || data.complete),
      finishReason:
        data.finish_reason || data.status === "complete" ? "stop" : undefined,
      usage:
        data.usage || data.tokens ? this.parseCustomUsage(data) : undefined,
    };
  }

  private parseCustomUsage(
    data: Record<string, unknown>,
  ): SageMakerUsage | undefined {
    const usage = (data.usage || data.tokens || {}) as Record<string, unknown>;

    return {
      promptTokens: Number(usage.prompt_tokens || usage.input_tokens) || 0,
      completionTokens:
        Number(usage.completion_tokens || usage.output_tokens) || 0,
      total: Number(usage.total_tokens) || 0,
    };
  }
}

/**
 * Parser factory to create appropriate parser for detected protocol
 */
export class StreamingParserFactory {
  static createParser(
    protocol: string,
    options?: Record<string, unknown>,
  ): StreamingParser {
    switch (protocol) {
      case "sse":
        return new HuggingFaceStreamParser();

      case "jsonl":
        return new LlamaStreamParser();

      case "chunked": {
        const format = options?.format as "json" | "text" | undefined;
        return new CustomStreamParser(format || "json");
      }

      case "none":
      default:
        // Return a no-op parser that just converts complete responses
        return new CustomStreamParser("text");
    }
  }

  static getSupportedProtocols(): string[] {
    return ["sse", "jsonl", "chunked", "text"];
  }
}

/**
 * Helper function to safely format error messages for logging and error handling
 * Consolidates the duplicated error formatting pattern used throughout the parsers
 */
function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * Helper function to extract error messages from API response error data
 * Handles both string and object error formats consistently
 */
function extractApiErrorMessage(
  errorData: Record<string, unknown> | string,
): string {
  if (isNonNullObject(errorData)) {
    return (errorData.message as string) || String(errorData);
  }
  return String(errorData);
}

/**
 * Utility function to estimate token usage when not provided
 */
export function estimateTokenUsage(
  prompt: string,
  completion: string,
): SageMakerUsage {
  // Rough estimation: ~4 characters per token for English text
  const promptTokens = Math.ceil(prompt.length / 4);
  const completionTokens = Math.ceil(completion.length / 4);

  return {
    promptTokens,
    completionTokens,
    total: promptTokens + completionTokens,
  };
}
