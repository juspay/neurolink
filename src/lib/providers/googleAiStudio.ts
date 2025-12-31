import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, type Schema, type LanguageModelV1, type Tool } from "ai";
import type { ZodUnknownSchema } from "../types/typeAliases.js";
import {
  AIProviderName,
  GoogleAIModels,
  ErrorCategory,
  ErrorSeverity,
} from "../constants/enums.js";
import { NeuroLinkError, ERROR_CODES } from "../utils/errorHandling.js";
import type {
  StreamOptions,
  StreamResult,
  AudioChunk,
} from "../types/streamTypes.js";
import type {
  TextGenerationOptions,
  EnhancedGenerateResult,
} from "../types/generateTypes.js";
import type { UnknownRecord } from "../types/common.js";
import type {
  LiveServerMessage,
  GenAIClient,
  GoogleGenAIClass,
} from "../types/providers.js";
import type { NeuroLink } from "../neurolink.js";
import { BaseProvider } from "../core/baseProvider.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/errors.js";
import {
  DEFAULT_MAX_STEPS,
  DEFAULT_TOOL_MAX_RETRIES,
} from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { isGemini3Model } from "../utils/modelDetection.js";
import {
  convertZodToJsonSchema,
  inlineJsonSchema,
  isZodSchema,
} from "../utils/schemaConversion.js";
import { createNativeThinkingConfig } from "../utils/thinkingConfig.js";

// Google AI Live API types now imported from ../types/providerSpecific.js

// Import proper types for multimodal message handling

// Create Google GenAI client
async function createGoogleGenAIClient(apiKey: string): Promise<GenAIClient> {
  const mod: unknown = await import("@google/genai");
  const ctor = (mod as Record<string, unknown>).GoogleGenAI as unknown;
  if (!ctor) {
    throw new NeuroLinkError({
      code: ERROR_CODES.INVALID_CONFIGURATION,
      message: "@google/genai does not export GoogleGenAI",
      category: ErrorCategory.CONFIGURATION,
      severity: ErrorSeverity.CRITICAL,
      retriable: false,
      context: { module: "@google/genai", expectedExport: "GoogleGenAI" },
    });
  }
  const Ctor = ctor as GoogleGenAIClass;
  return new Ctor({ apiKey });
}

// Environment variable setup
if (
  !process.env.GOOGLE_GENERATIVE_AI_API_KEY &&
  process.env.GOOGLE_AI_API_KEY
) {
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
}

/**
 * Google AI Studio provider implementation using BaseProvider
 * Migrated from original GoogleAIStudio class to new factory pattern
 *
 * @important Structured Output Limitation
 * Google Gemini models cannot combine function calling (tools) with structured
 * output (JSON schema). When using schemas with output.format: "json", you MUST
 * set disableTools: true.
 *
 * Error without disableTools:
 * "Function calling with a response mime type: 'application/json' is unsupported"
 *
 * This is a Google API limitation documented at:
 * https://ai.google.dev/gemini-api/docs/function-calling
 *
 * @example
 * ```typescript
 * // ✅ Correct usage with schemas
 * const provider = new GoogleAIStudioProvider("gemini-2.5-flash");
 * const result = await provider.generate({
 *   input: { text: "Analyze data" },
 *   schema: MySchema,
 *   output: { format: "json" },
 *   disableTools: true  // Required
 * });
 * ```
 *
 * @note Gemini 3 Pro Preview (November 2025) will support combining tools + schemas
 * @note "Too many states for serving" errors can occur with complex schemas + tools.
 *       Solution: Simplify schema or use disableTools: true
 */
export class GoogleAIStudioProvider extends BaseProvider {
  constructor(modelName?: string, sdk?: unknown) {
    super(
      modelName,
      "google-ai" as AIProviderName,
      sdk as NeuroLink | undefined,
    );
    logger.debug("GoogleAIStudioProvider initialized", {
      model: this.modelName,
      provider: this.providerName,
      sdkProvided: !!sdk,
    });
  }
  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  public getProviderName(): AIProviderName {
    return "google-ai" as AIProviderName;
  }

  public getDefaultModel(): string {
    return process.env.GOOGLE_AI_MODEL || GoogleAIModels.GEMINI_2_5_FLASH;
  }

  /**
   * 🔧 PHASE 2: Return AI SDK model instance for tool calling
   */
  public getAISDKModel(): LanguageModelV1 {
    const apiKey = this.getApiKey();
    const google = createGoogleGenerativeAI({ apiKey });
    return google(this.modelName);
  }

  public handleProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      throw new NetworkError(error.message, this.providerName);
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (message.includes("API_KEY_INVALID")) {
      throw new AuthenticationError(
        "Invalid Google AI API key. Please check your GOOGLE_AI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (message.includes("RATE_LIMIT_EXCEEDED")) {
      throw new RateLimitError(
        "Google AI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    throw new ProviderError(`Google AI error: ${message}`, this.providerName);
  }
  // executeGenerate removed - BaseProvider handles all generation with tools
  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ZodUnknownSchema | Schema<unknown>,
  ): Promise<StreamResult> {
    // Check if this is a Gemini 3 model with tools - use native SDK for thought_signature
    const gemini3CheckModelName = options.model || this.modelName;

    // Check for tools from options AND from SDK (MCP tools)
    // Need to check early if we should route to native SDK
    const gemini3CheckShouldUseTools =
      !options.disableTools && this.supportsTools();
    const optionTools = options.tools || {};
    const sdkTools = gemini3CheckShouldUseTools ? await this.getAllTools() : {};
    const combinedToolCount =
      Object.keys(optionTools).length + Object.keys(sdkTools).length;
    const hasTools = gemini3CheckShouldUseTools && combinedToolCount > 0;

    if (isGemini3Model(gemini3CheckModelName) && hasTools) {
      // Merge SDK tools into options for native SDK path
      const mergedOptions = {
        ...options,
        tools: { ...sdkTools, ...optionTools },
      };
      logger.info(
        "[GoogleAIStudio] Routing Gemini 3 to native SDK for tool calling",
        {
          model: gemini3CheckModelName,
          optionToolCount: Object.keys(optionTools).length,
          sdkToolCount: Object.keys(sdkTools).length,
          totalToolCount: combinedToolCount,
        },
      );
      return this.executeNativeGemini3Stream(mergedOptions);
    }

    // Phase 1: if audio input present, bridge to Gemini Live (Studio) using @google/genai
    if (options.input?.audio) {
      return await this.executeAudioStreamViaGeminiLive(options);
    }
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const apiKey = this.getApiKey();

    // Ensure environment variable is set for @ai-sdk/google
    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
    }

    const model = await this.getAISDKModelWithMiddleware(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools consistently with generate method
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const result = await streamText({
        model,
        messages: messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        // Gemini 3: use thinkingLevel via providerOptions
        // Gemini 2.5: use thinkingBudget via providerOptions
        ...(options.thinkingConfig?.enabled && {
          providerOptions: {
            google: {
              thinkingConfig: {
                ...(options.thinkingConfig.thinkingLevel && {
                  thinkingLevel: options.thinkingConfig.thinkingLevel,
                }),
                ...(options.thinkingConfig.budgetTokens &&
                  !options.thinkingConfig.thinkingLevel && {
                    thinkingBudget: options.thinkingConfig.budgetTokens,
                  }),
                includeThoughts: true,
              },
            },
          },
        }),
        onStepFinish: ({ toolCalls, toolResults }) => {
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn(
              "[GoogleAiStudioProvider] Failed to store tool executions",
              {
                provider: this.providerName,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          });
        },
      });

      timeoutController?.cleanup();

      // Transform string stream to content object stream using BaseProvider method
      const transformedStream = this.createTextStream(result);

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result,
        Date.now() - startTime,
        {
          requestId: `google-ai-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName,
        analytics: analyticsPromise,
        metadata: {
          startTime,
          streamId: `google-ai-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  /**
   * Execute stream using native @google/genai SDK for Gemini 3 models
   * This bypasses @ai-sdk/google to properly handle thought_signature
   */
  private async executeNativeGemini3Stream(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    const apiKey = this.getApiKey();
    const client = await createGoogleGenAIClient(apiKey);
    const modelName = options.model || this.modelName;

    logger.debug("[GoogleAIStudio] Using native @google/genai for Gemini 3", {
      model: modelName,
      hasTools: !!options.tools && Object.keys(options.tools).length > 0,
    });

    // Build contents from input
    const contents: Array<{
      role: string;
      parts: Array<{ text: string }>;
    }> = [];

    contents.push({
      role: "user",
      parts: [{ text: options.input.text }],
    });

    // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
    type FunctionDeclaration = {
      name: string;
      description: string;
      parametersJsonSchema?: Record<string, unknown>;
    };

    let tools:
      | Array<{ functionDeclarations: FunctionDeclaration[] }>
      | undefined;
    const executeMap = new Map<string, Tool["execute"]>();

    if (
      options.tools &&
      Object.keys(options.tools).length > 0 &&
      !options.disableTools
    ) {
      const functionDeclarations: FunctionDeclaration[] = [];

      for (const [name, tool] of Object.entries(options.tools)) {
        const decl: FunctionDeclaration = {
          name,
          description: tool.description || `Tool: ${name}`,
        };

        if (tool.parameters) {
          let rawSchema: Record<string, unknown>;

          if (isZodSchema(tool.parameters)) {
            // It's a Zod schema - convert it
            rawSchema = convertZodToJsonSchema(
              tool.parameters as ZodUnknownSchema,
            ) as Record<string, unknown>;
          } else if (typeof tool.parameters === "object") {
            // Already JSON schema (jsonSchema() wrapper) - use directly
            rawSchema = tool.parameters as Record<string, unknown>;
          } else {
            rawSchema = { type: "object", properties: {} };
          }

          decl.parametersJsonSchema = inlineJsonSchema(rawSchema);
          // Remove $schema if present - @google/genai doesn't need it
          if (decl.parametersJsonSchema.$schema) {
            delete decl.parametersJsonSchema.$schema;
          }
        }

        functionDeclarations.push(decl);

        if (tool.execute) {
          executeMap.set(name, tool.execute);
        }
      }

      tools = [{ functionDeclarations }];

      logger.debug("[GoogleAIStudio] Converted tools for native SDK", {
        toolCount: functionDeclarations.length,
        toolNames: functionDeclarations.map((t) => t.name),
      });
    }

    // Build config
    const config: Record<string, unknown> = {
      temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
      maxOutputTokens: options.maxTokens,
    };

    if (tools) {
      config.tools = tools;
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

    // Ensure maxSteps is a valid positive integer to prevent infinite loops
    const rawMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const maxSteps =
      Number.isFinite(rawMaxSteps) && rawMaxSteps > 0
        ? Math.min(Math.floor(rawMaxSteps), 100) // Cap at 100 for safety
        : Math.min(DEFAULT_MAX_STEPS, 100);
    const currentContents = [...contents];
    let finalText = "";
    let lastStepText = ""; // Track text from last step for maxSteps termination
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    let step = 0;

    // Track failed tools to prevent infinite retry loops
    // Key: tool name, Value: { count: retry attempts, lastError: error message }
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Agentic loop for tool calling
    while (step < maxSteps) {
      step++;
      logger.debug(`[GoogleAIStudio] Native SDK step ${step}/${maxSteps}`);

      try {
        const stream = await client.models.generateContentStream({
          model: modelName,
          contents: currentContents,
          config,
        });

        const stepFunctionCalls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        // Capture all raw parts including thoughtSignature for history
        const rawResponseParts: unknown[] = [];

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
            totalInputTokens = Math.max(
              totalInputTokens,
              usage.promptTokenCount || 0,
            );
            totalOutputTokens = Math.max(
              totalOutputTokens,
              usage.candidatesTokenCount || 0,
            );
          }
        }

        // Extract text from raw parts after stream completes
        // This avoids SDK warning about non-text parts (thoughtSignature, functionCall)
        const stepText = rawResponseParts
          .filter(
            (part): part is { text: string } =>
              typeof (part as Record<string, unknown>).text === "string",
          )
          .map((part) => part.text)
          .join("");

        // If no function calls, we're done
        if (stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        // Track the last step text for maxSteps termination
        lastStepText = stepText;

        // Execute function calls
        logger.debug(
          `[GoogleAIStudio] Executing ${stepFunctionCalls.length} function calls`,
        );

        // Add model response with ALL parts (including thoughtSignature) to history
        currentContents.push({
          role: "model",
          parts:
            rawResponseParts.length > 0
              ? (rawResponseParts as Array<{ text: string }>)
              : (stepFunctionCalls.map((fc) => ({
                  functionCall: fc,
                })) as unknown as Array<{ text: string }>),
        });

        // Execute each function and collect responses
        const functionResponses: Array<{
          functionResponse: { name: string; response: unknown };
        }> = [];

        for (const call of stepFunctionCalls) {
          allToolCalls.push({ toolName: call.name, args: call.args });

          // Check if this tool has already exceeded retry limit
          const failedInfo = failedTools.get(call.name);
          if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
            logger.warn(
              `[GoogleAIStudio] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
            );
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: {
                  error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
                  status: "permanently_failed",
                  do_not_retry: true,
                },
              },
            });
            continue;
          }

          const execute = executeMap.get(call.name);
          if (execute) {
            try {
              // AI SDK Tool execute requires (args, options) - provide minimal options
              const toolOptions = {
                toolCallId: `${call.name}-${Date.now()}`,
                messages: [],
                abortSignal: undefined as AbortSignal | undefined,
              };
              const result = await execute(call.args, toolOptions);
              functionResponses.push({
                functionResponse: { name: call.name, response: { result } },
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
                `[GoogleAIStudio] Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
              );

              // Determine if this is a permanent failure
              const isPermanentFailure =
                currentFailInfo.count >= DEFAULT_TOOL_MAX_RETRIES;

              functionResponses.push({
                functionResponse: {
                  name: call.name,
                  response: {
                    error: isPermanentFailure
                      ? `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${currentFailInfo.count} times with error: ${errorMessage}. This tool will not be retried. Please proceed without using this tool or inform the user that this functionality is unavailable.`
                      : `TOOL_EXECUTION_ERROR: ${errorMessage}. Retry attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}.`,
                    status: isPermanentFailure
                      ? "permanently_failed"
                      : "failed",
                    do_not_retry: isPermanentFailure,
                    retry_count: currentFailInfo.count,
                    max_retries: DEFAULT_TOOL_MAX_RETRIES,
                  },
                },
              });
            }
          } else {
            // Tool not found is a permanent error
            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: {
                  error: `TOOL_NOT_FOUND: The tool "${call.name}" does not exist. Do not attempt to call this tool again.`,
                  status: "permanently_failed",
                  do_not_retry: true,
                },
              },
            });
          }
        }

        // Add function responses to history
        currentContents.push({
          role: "function",
          parts: functionResponses as unknown as Array<{ text: string }>,
        });
      } catch (error) {
        logger.error("[GoogleAIStudio] Native SDK error", error);
        throw this.handleProviderError(error);
      }
    }

    timeoutController?.cleanup();

    // Handle maxSteps termination - if we exited the loop due to maxSteps being reached
    if (step >= maxSteps && !finalText) {
      logger.warn(
        `[GoogleAIStudio] Tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
          `Model was still calling tools. Using accumulated text from last step.`,
      );
      finalText =
        lastStepText ||
        `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`;
    }

    const responseTime = Date.now() - startTime;

    // Create async iterable for streaming result
    async function* createTextStream(): AsyncIterable<{ content: string }> {
      yield { content: finalText };
    }

    return {
      stream: createTextStream(),
      provider: this.providerName,
      model: modelName,
      toolCalls: allToolCalls.map((tc) => ({
        toolName: tc.toolName,
        args: tc.args,
      })),
      analytics: Promise.resolve({
        provider: this.providerName,
        model: modelName,
        tokenUsage: {
          input: totalInputTokens,
          output: totalOutputTokens,
          total: totalInputTokens + totalOutputTokens,
        },
        requestDuration: responseTime,
        timestamp: new Date().toISOString(),
      }),
      metadata: {
        streamId: `native-${Date.now()}`,
        startTime,
        responseTime,
        totalToolExecutions: allToolCalls.length,
      },
    };
  }

  /**
   * Execute generate using native @google/genai SDK for Gemini 3 models
   * This bypasses @ai-sdk/google to properly handle thought_signature
   */
  private async executeNativeGemini3Generate(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const apiKey = this.getApiKey();
    const client = await createGoogleGenAIClient(apiKey);
    const modelName = options.model || this.modelName;

    logger.debug(
      "[GoogleAIStudio] Using native @google/genai for Gemini 3 generate",
      {
        model: modelName,
        hasTools: !!options.tools && Object.keys(options.tools).length > 0,
      },
    );

    // Build contents from input
    const contents: Array<{
      role: string;
      parts: unknown[];
    }> = [];

    const promptText = options.prompt || options.input?.text || "";
    contents.push({
      role: "user",
      parts: [{ text: promptText }],
    });

    // Convert Vercel AI SDK tools to @google/genai FunctionDeclarations
    type FunctionDeclaration = {
      name: string;
      description: string;
      parametersJsonSchema?: Record<string, unknown>;
    };

    let tools:
      | Array<{ functionDeclarations: FunctionDeclaration[] }>
      | undefined;
    const executeMap = new Map<string, Tool["execute"]>();
    const allToolsForResult: Record<string, Tool> = {};

    // Merge SDK tools with options.tools
    const shouldUseTools = !options.disableTools;
    if (shouldUseTools) {
      const sdkTools = await this.getAllTools();
      const mergedTools = { ...sdkTools, ...(options.tools || {}) };

      if (Object.keys(mergedTools).length > 0) {
        const functionDeclarations: FunctionDeclaration[] = [];

        for (const [name, tool] of Object.entries(mergedTools)) {
          allToolsForResult[name] = tool;
          const decl: FunctionDeclaration = {
            name,
            description: tool.description || `Tool: ${name}`,
          };

          if (tool.parameters) {
            let rawSchema: Record<string, unknown>;

            if (isZodSchema(tool.parameters)) {
              // It's a Zod schema - convert it
              rawSchema = convertZodToJsonSchema(
                tool.parameters as ZodUnknownSchema,
              ) as Record<string, unknown>;
            } else if (typeof tool.parameters === "object") {
              // Already JSON schema (jsonSchema() wrapper) - use directly
              rawSchema = tool.parameters as Record<string, unknown>;
            } else {
              rawSchema = { type: "object", properties: {} };
            }

            decl.parametersJsonSchema = inlineJsonSchema(rawSchema);
            // Remove $schema if present - @google/genai doesn't need it
            if (decl.parametersJsonSchema.$schema) {
              delete decl.parametersJsonSchema.$schema;
            }
          }

          functionDeclarations.push(decl);

          if (tool.execute) {
            executeMap.set(name, tool.execute);
          }
        }

        tools = [{ functionDeclarations }];

        logger.debug(
          "[GoogleAIStudio] Converted tools for native SDK generate",
          {
            toolCount: functionDeclarations.length,
            toolNames: functionDeclarations.map((t) => t.name),
          },
        );
      }
    }

    // Build config
    const config: Record<string, unknown> = {
      temperature: options.temperature ?? 1.0, // Gemini 3 requires 1.0 for tool calling
      maxOutputTokens: options.maxTokens,
    };

    if (tools) {
      config.tools = tools;
    }

    if (options.systemPrompt) {
      config.systemInstruction = options.systemPrompt;
    }

    const startTime = Date.now();
    // Ensure maxSteps is a valid positive integer to prevent infinite loops
    const rawMaxSteps = options.maxSteps || DEFAULT_MAX_STEPS;
    const maxSteps =
      Number.isFinite(rawMaxSteps) && rawMaxSteps > 0
        ? Math.min(Math.floor(rawMaxSteps), 100) // Cap at 100 for safety
        : Math.min(DEFAULT_MAX_STEPS, 100);
    const currentContents = [...contents];
    let finalText = "";
    let lastStepText = ""; // Track text from last step for maxSteps termination
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: Array<{
      toolName: string;
      args: Record<string, unknown>;
    }> = [];
    const toolExecutions: Array<{
      name: string;
      input: Record<string, unknown>;
      output: unknown;
    }> = [];
    let step = 0;

    // Track failed tools to prevent infinite retry loops
    // Key: tool name, Value: { count: retry attempts, lastError: error message }
    const failedTools = new Map<string, { count: number; lastError: string }>();

    // Agentic loop for tool calling
    while (step < maxSteps) {
      step++;
      logger.debug(
        `[GoogleAIStudio] Native SDK generate step ${step}/${maxSteps}`,
      );

      try {
        const stream = await client.models.generateContentStream({
          model: modelName,
          contents: currentContents,
          config,
        });

        const stepFunctionCalls: Array<{
          name: string;
          args: Record<string, unknown>;
        }> = [];
        // Capture all raw parts including thoughtSignature for history
        const rawResponseParts: unknown[] = [];

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
            totalInputTokens = Math.max(
              totalInputTokens,
              usage.promptTokenCount || 0,
            );
            totalOutputTokens = Math.max(
              totalOutputTokens,
              usage.candidatesTokenCount || 0,
            );
          }
        }

        // Extract text from raw parts after stream completes
        // This avoids SDK warning about non-text parts (thoughtSignature, functionCall)
        const stepText = rawResponseParts
          .filter(
            (part): part is { text: string } =>
              typeof (part as Record<string, unknown>).text === "string",
          )
          .map((part) => part.text)
          .join("");

        // If no function calls, we're done
        if (stepFunctionCalls.length === 0) {
          finalText = stepText;
          break;
        }

        // Track the last step text for maxSteps termination
        lastStepText = stepText;

        // Execute function calls
        logger.debug(
          `[GoogleAIStudio] Executing ${stepFunctionCalls.length} function calls in generate`,
        );

        // Add model response with ALL parts (including thoughtSignature) to history
        // This is critical for Gemini 3 - it requires thought signatures in subsequent turns
        currentContents.push({
          role: "model",
          parts:
            rawResponseParts.length > 0
              ? (rawResponseParts as Array<{ text: string }>)
              : (stepFunctionCalls.map((fc) => ({
                  functionCall: fc,
                })) as unknown as Array<{ text: string }>),
        });

        // Execute each function and collect responses
        const functionResponses: Array<{
          functionResponse: { name: string; response: unknown };
        }> = [];

        for (const call of stepFunctionCalls) {
          allToolCalls.push({ toolName: call.name, args: call.args });

          // Check if this tool has already exceeded retry limit
          const failedInfo = failedTools.get(call.name);
          if (failedInfo && failedInfo.count >= DEFAULT_TOOL_MAX_RETRIES) {
            logger.warn(
              `[GoogleAIStudio] Tool "${call.name}" has exceeded retry limit (${DEFAULT_TOOL_MAX_RETRIES}), skipping execution`,
            );

            const errorOutput = {
              error: `TOOL_PERMANENTLY_FAILED: The tool "${call.name}" has failed ${failedInfo.count} times and will not be retried. Last error: ${failedInfo.lastError}. Please proceed without using this tool or inform the user that this functionality is unavailable.`,
              status: "permanently_failed",
              do_not_retry: true,
            };

            functionResponses.push({
              functionResponse: {
                name: call.name,
                response: errorOutput,
              },
            });
            toolExecutions.push({
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
              const toolOptions = {
                toolCallId: `${call.name}-${Date.now()}`,
                messages: [],
                abortSignal: undefined as AbortSignal | undefined,
              };
              const result = await execute(call.args, toolOptions);
              functionResponses.push({
                functionResponse: { name: call.name, response: { result } },
              });
              toolExecutions.push({
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
                `[GoogleAIStudio] Tool "${call.name}" failed (attempt ${currentFailInfo.count}/${DEFAULT_TOOL_MAX_RETRIES}): ${errorMessage}`,
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
                functionResponse: {
                  name: call.name,
                  response: errorOutput,
                },
              });
              toolExecutions.push({
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
              functionResponse: {
                name: call.name,
                response: errorOutput,
              },
            });
            toolExecutions.push({
              name: call.name,
              input: call.args,
              output: errorOutput,
            });
          }
        }

        // Add function responses to history
        currentContents.push({
          role: "function",
          parts: functionResponses,
        });
      } catch (error) {
        logger.error("[GoogleAIStudio] Native SDK generate error", error);
        throw this.handleProviderError(error);
      }
    }

    // Handle maxSteps termination - if we exited the loop due to maxSteps being reached
    if (step >= maxSteps && !finalText) {
      logger.warn(
        `[GoogleAIStudio] Generate tool call loop terminated after reaching maxSteps (${maxSteps}). ` +
          `Model was still calling tools. Using accumulated text from last step.`,
      );
      finalText =
        lastStepText ||
        `[Tool execution limit reached after ${maxSteps} steps. The model continued requesting tool calls beyond the limit.]`;
    }

    const responseTime = Date.now() - startTime;

    // Build EnhancedGenerateResult
    return {
      content: finalText,
      provider: this.providerName,
      model: modelName,
      usage: {
        input: totalInputTokens,
        output: totalOutputTokens,
        total: totalInputTokens + totalOutputTokens,
      },
      responseTime,
      toolsUsed: allToolCalls.map((tc) => tc.toolName),
      toolExecutions: toolExecutions,
      enhancedWithTools: allToolCalls.length > 0,
    };
  }

  /**
   * Override generate to route Gemini 3 models with tools to native SDK
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
  ): Promise<EnhancedGenerateResult | null> {
    // Normalize options
    const options =
      typeof optionsOrPrompt === "string"
        ? { prompt: optionsOrPrompt }
        : optionsOrPrompt;

    const modelName = options.model || this.modelName;

    // Check if we should use native SDK for Gemini 3 with tools
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const sdkTools = shouldUseTools ? await this.getAllTools() : {};
    const hasTools =
      shouldUseTools &&
      (Object.keys(sdkTools).length > 0 ||
        (options.tools && Object.keys(options.tools).length > 0));

    if (isGemini3Model(modelName) && hasTools) {
      // Merge SDK tools into options for native SDK path
      const mergedOptions = {
        ...options,
        tools: { ...sdkTools, ...(options.tools || {}) },
      };
      logger.info(
        "[GoogleAIStudio] Routing Gemini 3 generate to native SDK for tool calling",
        {
          model: modelName,
          sdkToolCount: Object.keys(sdkTools).length,
          optionToolCount: Object.keys(options.tools || {}).length,
          totalToolCount:
            Object.keys(sdkTools).length +
            Object.keys(options.tools || {}).length,
        },
      );
      return this.executeNativeGemini3Generate(mergedOptions);
    }

    // Fall back to BaseProvider implementation
    return super.generate(optionsOrPrompt);
  }

  // ===================
  // HELPER METHODS
  // ===================
  private async executeAudioStreamViaGeminiLive(
    options: StreamOptions,
  ): Promise<StreamResult> {
    const startTime = Date.now();
    const apiKey = this.getApiKey();

    // Dynamic import to avoid hard dependency unless audio streaming is used
    let client: GenAIClient;
    try {
      client = await createGoogleGenAIClient(apiKey);
    } catch {
      throw new AuthenticationError(
        "Missing '@google/genai'. Install with: pnpm add @google/genai",
        this.providerName,
      );
    }

    const model =
      this.modelName ||
      process.env.GOOGLE_VOICE_AI_MODEL ||
      "gemini-2.5-flash-preview-native-audio-dialog";

    // Simple async queue for yielding audio events to the outer AsyncIterable
    type QueueItem =
      | { type: "audio"; audio: AudioChunk }
      | { type: "end" }
      | { type: "error"; error: unknown };
    const queue: QueueItem[] = [];
    let resolveNext:
      | ((value: IteratorResult<{ type: "audio"; audio: AudioChunk }>) => void)
      | null = null;
    let done = false;

    const push = (item: QueueItem) => {
      if (done) {
        return;
      }
      if (item.type === "audio") {
        if (resolveNext) {
          const fn = resolveNext;
          resolveNext = null;
          fn({ value: { type: "audio", audio: item.audio }, done: false });
          return;
        }
      }
      queue.push(item);
    };

    const session = await client.live.connect({
      model,
      callbacks: {
        onopen: () => {
          // no-op
        },
        onmessage: async (message: LiveServerMessage) => {
          try {
            const audio =
              message?.serverContent?.modelTurn?.parts?.[0]?.inlineData;
            if (audio?.data) {
              const buf = Buffer.from(String(audio.data), "base64");
              const chunk: AudioChunk = {
                data: buf,
                sampleRateHz: 24000,
                channels: 1,
                encoding: "PCM16LE",
              };
              push({ type: "audio", audio: chunk });
            }
            if (message?.serverContent?.interrupted) {
              // allow consumer to handle; no special action required here
            }
          } catch (e) {
            push({ type: "error", error: e });
          }
        },
        onerror: (e: { message?: string }) => {
          push({ type: "error", error: e });
        },
        onclose: (_e: { code?: number; reason?: string }) => {
          push({ type: "end" });
        },
      },
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Orus" } },
        },
      },
    });

    // Feed upstream audio frames concurrently
    (async () => {
      try {
        const spec = options.input?.audio;
        if (!spec) {
          logger.debug(
            "[GeminiLive] No audio spec found on input; skipping upstream send",
          );
          return;
        }
        for await (const frame of spec.frames) {
          // Zero-length frame acts as a 'flush' control signal
          if (!frame || (frame as Buffer).byteLength === 0) {
            try {
              if (session.sendInput) {
                await session.sendInput({ event: "flush" });
              } else if (session.sendRealtimeInput) {
                await session.sendRealtimeInput({ event: "flush" });
              }
            } catch (err) {
              logger.debug("[GeminiLive] flush control failed (non-fatal)", {
                error: err instanceof Error ? err.message : String(err),
              });
            }
            continue;
          }
          // Convert PCM16LE buffer to base64 and wrap in genai Blob-like object
          const base64 = (frame as Buffer).toString("base64");
          const mimeType = `audio/pcm;rate=${spec.sampleRateHz || 16000}`;
          await session.sendRealtimeInput?.({
            media: { data: base64, mimeType },
          });
        }
        // Best-effort flush signal if supported
        try {
          if (session.sendInput) {
            await session.sendInput({ event: "flush" });
          } else if (session.sendRealtimeInput) {
            await session.sendRealtimeInput({ event: "flush" });
          }
        } catch (err) {
          logger.debug("[GeminiLive] final flush failed (non-fatal)", {
            error: err instanceof Error ? err.message : String(err),
          });
        }
      } catch (e) {
        push({ type: "error", error: e });
      }
    })().catch(() => {
      // ignore
    });

    // AsyncIterable for stream events
    const asyncIterable = {
      [Symbol.asyncIterator]() {
        return {
          async next(): Promise<
            IteratorResult<{ type: "audio"; audio: AudioChunk }>
          > {
            if (queue.length > 0) {
              const item = queue.shift();
              if (!item) {
                return {
                  value: undefined as unknown as {
                    type: "audio";
                    audio: AudioChunk;
                  },
                  done: true,
                };
              }
              if (item.type === "audio") {
                return {
                  value: { type: "audio", audio: item.audio },
                  done: false,
                };
              }
              if (item.type === "end") {
                done = true;
                return {
                  value: undefined as unknown as {
                    type: "audio";
                    audio: AudioChunk;
                  },
                  done: true,
                };
              }
              if (item.type === "error") {
                done = true;
                throw item.error instanceof Error
                  ? item.error
                  : new Error(String(item.error));
              }
            }
            if (done) {
              return {
                value: undefined as unknown as {
                  type: "audio";
                  audio: AudioChunk;
                },
                done: true,
              };
            }
            return await new Promise<
              IteratorResult<{ type: "audio"; audio: AudioChunk }>
            >((resolve) => {
              resolveNext = resolve;
            });
          },
        };
      },
    } as AsyncIterable<{ type: "audio"; audio: AudioChunk }>;

    return {
      stream: asyncIterable,
      provider: this.providerName,
      model: model,
      metadata: {
        startTime,
        streamId: `google-ai-audio-${Date.now()}`,
      },
    };
  }

  private getApiKey(): string {
    const apiKey =
      process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    if (!apiKey) {
      throw new AuthenticationError(
        "GOOGLE_AI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is not set",
        this.providerName,
      );
    }

    return apiKey;
  }
}

export default GoogleAIStudioProvider;
