/**
 * Utilities Module
 *
 * Handles validation, normalization, schema conversion, and error handling utilities.
 * Extracted from BaseProvider to follow Single Responsibility Principle.
 *
 * Responsibilities:
 * - Options validation (text generation and stream options)
 * - Options normalization (string to object conversion)
 * - Provider information formatting
 * - Timeout parsing and calculation
 * - Schema utilities (Zod detection, permissive schema creation, OpenAI strict mode fixes)
 * - Tool result conversion
 * - Middleware options extraction
 * - Common error pattern handling
 *
 * @module core/modules/Utilities
 */

import { z } from "zod";
import type {
  AIProviderName,
  TextGenerationOptions,
} from "../../types/index.js";
import type { StreamOptions } from "../../types/streamTypes.js";
import type { MiddlewareFactoryOptions } from "../../types/middlewareTypes.js";
import type { ZodUnknownSchema } from "../../types/typeAliases.js";
import { logger } from "../../utils/logger.js";
import { getSafeMaxTokens } from "../../utils/tokenLimits.js";
import { TimeoutError } from "../../utils/timeout.js";
import {
  validateStreamOptions as validateStreamOpts,
  validateTextGenerationOptions,
  ValidationError,
  createValidationSummary,
} from "../../utils/parameterValidation.js";
import { STEP_LIMITS } from "../constants.js";
import type { CoreMessage, ToolCallPart, ToolResultPart } from "ai";

/**
 * Utilities class - Provides validation, normalization, and utility methods
 */
export class Utilities {
  constructor(
    private readonly providerName: AIProviderName,
    private readonly modelName: string,
    private readonly defaultTimeout: number = 30000,
    private readonly middlewareOptions?: MiddlewareFactoryOptions,
  ) {}

  /**
   * Validate text generation options
   */
  validateOptions(options: TextGenerationOptions): void {
    const validation = validateTextGenerationOptions(options);

    if (!validation.isValid) {
      const summary = createValidationSummary(validation);
      throw new ValidationError(
        `Text generation options validation failed: ${summary}`,
        "options",
        "VALIDATION_FAILED",
        validation.suggestions,
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn(
        "Text generation options validation warnings:",
        validation.warnings,
      );
    }

    // Additional BaseProvider-specific validation
    if (options.maxSteps !== undefined) {
      if (
        options.maxSteps < STEP_LIMITS.min ||
        options.maxSteps > STEP_LIMITS.max
      ) {
        throw new ValidationError(
          `maxSteps must be between ${STEP_LIMITS.min} and ${STEP_LIMITS.max}`,
          "maxSteps",
          "OUT_OF_RANGE",
          [
            `Use a value between ${STEP_LIMITS.min} and ${STEP_LIMITS.max} for optimal performance`,
          ],
        );
      }
    }
  }

  /**
   * Validate stream options
   */
  validateStreamOptions(options: StreamOptions): void {
    const validation = validateStreamOpts(options);

    if (!validation.isValid) {
      const summary = createValidationSummary(validation);
      throw new ValidationError(
        `Stream options validation failed: ${summary}`,
        "options",
        "VALIDATION_FAILED",
        validation.suggestions,
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      logger.warn("Stream options validation warnings:", validation.warnings);
    }

    // Additional BaseProvider-specific validation
    if (options.maxSteps !== undefined) {
      if (
        options.maxSteps < STEP_LIMITS.min ||
        options.maxSteps > STEP_LIMITS.max
      ) {
        throw new ValidationError(
          `maxSteps must be between ${STEP_LIMITS.min} and ${STEP_LIMITS.max}`,
          "maxSteps",
          "OUT_OF_RANGE",
          [
            `Use a value between ${STEP_LIMITS.min} and ${STEP_LIMITS.max} for optimal performance`,
          ],
        );
      }
    }
  }

  /**
   * Normalize text generation options from string or object
   */
  normalizeTextOptions(
    optionsOrPrompt: TextGenerationOptions | string,
  ): TextGenerationOptions {
    if (typeof optionsOrPrompt === "string") {
      const safeMaxTokens = getSafeMaxTokens(this.providerName, this.modelName);
      return {
        prompt: optionsOrPrompt,
        provider: this.providerName,
        model: this.modelName,
        maxTokens: safeMaxTokens,
      };
    }

    // Handle both prompt and input.text formats
    const prompt = optionsOrPrompt.prompt || optionsOrPrompt.input?.text || "";
    const modelName = optionsOrPrompt.model || this.modelName;
    const providerName = optionsOrPrompt.provider || this.providerName;

    // Apply safe maxTokens based on provider and model
    const safeMaxTokens = getSafeMaxTokens(
      providerName,
      modelName,
      optionsOrPrompt.maxTokens,
    );

    // CRITICAL FIX: Preserve the entire input object for multimodal support
    // This ensures images and content arrays are not lost during normalization
    const normalizedOptions: TextGenerationOptions = {
      ...optionsOrPrompt,
      prompt,
      provider: providerName,
      model: modelName,
      maxTokens: safeMaxTokens,
    };

    // Ensure input object is preserved if it exists (for multimodal support)
    if (optionsOrPrompt.input) {
      normalizedOptions.input = {
        ...optionsOrPrompt.input,
        text: prompt, // Ensure text is consistent
      };
    }

    return normalizedOptions;
  }

  /**
   * Normalize stream options from string or object
   */
  normalizeStreamOptions(
    optionsOrPrompt: StreamOptions | string,
  ): StreamOptions {
    if (typeof optionsOrPrompt === "string") {
      const safeMaxTokens = getSafeMaxTokens(this.providerName, this.modelName);
      return {
        input: { text: optionsOrPrompt },
        provider: this.providerName,
        model: this.modelName,
        maxTokens: safeMaxTokens,
      };
    }

    const modelName = optionsOrPrompt.model || this.modelName;
    const providerName = optionsOrPrompt.provider || this.providerName;

    // Apply safe maxTokens based on provider and model
    const safeMaxTokens = getSafeMaxTokens(
      providerName,
      modelName,
      optionsOrPrompt.maxTokens,
    );

    return {
      ...optionsOrPrompt,
      provider: providerName,
      model: modelName,
      maxTokens: safeMaxTokens,
    };
  }

  /**
   * Get provider information
   */
  getProviderInfo(): { provider: string; model: string } {
    return {
      provider: this.providerName,
      model: this.modelName,
    };
  }

  /**
   * Get timeout value in milliseconds from options
   * Supports number or string formats (e.g., '30s', '2m', '1h')
   */
  getTimeout(options: TextGenerationOptions | StreamOptions): number {
    if (!options.timeout) {
      return this.defaultTimeout;
    }

    if (typeof options.timeout === "number") {
      return options.timeout;
    }

    // Parse string timeout (e.g., '30s', '2m', '1h')
    const timeoutStr = options.timeout.toLowerCase();
    const value = parseInt(timeoutStr);

    if (timeoutStr.includes("h")) {
      return value * 60 * 60 * 1000;
    } else if (timeoutStr.includes("m")) {
      return value * 60 * 1000;
    } else if (timeoutStr.includes("s")) {
      return value * 1000;
    }

    return this.defaultTimeout;
  }

  /**
   * Check if a schema is a Zod schema
   */
  isZodSchema(schema: unknown): boolean {
    return (
      typeof schema === "object" &&
      schema !== null &&
      // Most Zod schemas have an internal _def and a parse method
      typeof (schema as { parse?: unknown }).parse === "function"
    );
  }

  /**
   * Convert tool execution result from MCP format to standard format
   * Handles tool failures gracefully to prevent stream termination
   */
  async convertToolResult(result: unknown): Promise<unknown> {
    // Handle MCP-style results
    if (result && typeof result === "object" && "success" in result) {
      const mcpResult = result as {
        success: boolean;
        data?: unknown;
        error?: unknown;
      };
      if (mcpResult.success) {
        return mcpResult.data;
      } else {
        // Instead of throwing, return a structured error result
        // This prevents tool failures from terminating streams
        const errorMsg =
          typeof mcpResult.error === "string"
            ? mcpResult.error
            : "Tool execution failed";

        // Log the error for debugging but don't throw
        logger.warn(`Tool execution failed: ${errorMsg}`);

        // Return error as structured data that can be processed by the AI
        return {
          isError: true,
          error: errorMsg,
          content: [
            {
              type: "text",
              text: `Tool execution failed: ${errorMsg}`,
            },
          ],
        };
      }
    }
    return result;
  }

  /**
   * Create a permissive Zod schema that accepts all parameters as-is
   */
  createPermissiveZodSchema(): ZodUnknownSchema {
    // Create a permissive record that accepts any object structure
    // This allows all parameters to pass through without validation issues
    return z.record(z.unknown()).transform((data: Record<string, unknown>) => {
      // Return the data as-is to preserve all parameter information
      return data;
    });
  }

  /**
   * Recursively fix JSON Schema for OpenAI strict mode compatibility
   * OpenAI requires additionalProperties: false at ALL levels and preserves required array
   */
  fixSchemaForOpenAIStrictMode(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    const fixedSchema = JSON.parse(JSON.stringify(schema));

    if (
      fixedSchema.type === "object" &&
      fixedSchema.properties &&
      typeof fixedSchema.properties === "object"
    ) {
      const allPropertyNames = Object.keys(fixedSchema.properties);
      if (!fixedSchema.required || !Array.isArray(fixedSchema.required)) {
        fixedSchema.required = [];
      }
      fixedSchema.additionalProperties = false;

      for (const propName of allPropertyNames) {
        const propValue = fixedSchema.properties[propName];
        if (propValue && typeof propValue === "object") {
          if (propValue.type === "object") {
            fixedSchema.properties[propName] =
              this.fixSchemaForOpenAIStrictMode(
                propValue as Record<string, unknown>,
              );
          } else if (
            propValue.type === "array" &&
            propValue.items &&
            typeof propValue.items === "object"
          ) {
            fixedSchema.properties[propName].items =
              this.fixSchemaForOpenAIStrictMode(
                propValue.items as Record<string, unknown>,
              );
          }
        }
      }
    }

    return fixedSchema;
  }

  /**
   * Extract middleware options from generation/stream options
   * This is the single source of truth for deciding if middleware should be applied
   */
  extractMiddlewareOptions(
    options: TextGenerationOptions | StreamOptions,
  ): MiddlewareFactoryOptions | null {
    // 1. Determine effective middleware config: per-request overrides global.
    const middlewareOpts =
      (options as { middleware?: MiddlewareFactoryOptions }).middleware ??
      this.middlewareOptions;
    if (!middlewareOpts) {
      return null;
    }

    // 2. The middleware property must be an object with configuration.
    if (
      typeof middlewareOpts !== "object" ||
      middlewareOpts === null ||
      middlewareOpts instanceof Date ||
      middlewareOpts instanceof RegExp
    ) {
      return null;
    }

    // 3. Check if the middleware object has any actual configuration keys.
    const fullOpts = middlewareOpts as MiddlewareFactoryOptions;
    const hasArray = (arr?: unknown[]) => Array.isArray(arr) && arr.length > 0;
    const hasConfig =
      !!fullOpts.middlewareConfig ||
      hasArray(fullOpts.enabledMiddleware) ||
      hasArray(fullOpts.disabledMiddleware) ||
      !!fullOpts.preset ||
      hasArray(fullOpts.middleware);

    if (!hasConfig) {
      return null;
    }

    // 4. Return the formatted options if configuration is present.
    return {
      ...fullOpts,
      global: {
        collectStats: true,
        continueOnError: true,
        ...(fullOpts.global || {}),
      },
    };
  }

  /**
   * Handle common error patterns across providers
   * Returns transformed error or null if not a common pattern
   */
  handleCommonErrors(error: unknown): Error | null {
    if (error instanceof TimeoutError) {
      return new Error(
        `${this.providerName} request timed out after ${error.timeout}ms. Consider increasing timeout or using a lighter model.`,
      );
    }

    const message = error instanceof Error ? error.message : String(error);

    // Common API key errors
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      message.includes("authentication") ||
      message.includes("unauthorized")
    ) {
      return new Error(
        `Invalid API key for ${this.providerName}. Please check your API key environment variable.`,
      );
    }

    // Common rate limit errors
    if (
      message.includes("rate limit") ||
      message.includes("quota") ||
      message.includes("429")
    ) {
      return new Error(
        `Rate limit exceeded for ${this.providerName}. Please wait before making more requests.`,
      );
    }

    return null; // Not a common error, let provider handle it
  }
}

/**
 * Add tool context to messages for Phase 3
 * Preserves tool calls and results from Phase 1 using native AI SDK types
 */
export function addToolContextToMessages(
  messages: CoreMessage[],
  toolCalls: ToolCallPart[],
  toolResults: ToolResultPart[],
): CoreMessage[] {
  const toolMessages: CoreMessage[] = [];

  // Add tool calls as assistant message (direct use - already in correct format!)
  if (toolCalls.length > 0) {
    toolMessages.push({
      role: "assistant",
      content: toolCalls, // ✅ Direct assignment - no mapping needed
    });
  }

  // Add tool results as tool messages
  if (toolResults.length > 0) {
    toolResults.forEach((part) => {
      toolMessages.push({
        role: "tool",
        content: [part], // ✅ Direct use - already ToolResultPart
      });
    });
  }

  return [...messages, ...toolMessages];
}
