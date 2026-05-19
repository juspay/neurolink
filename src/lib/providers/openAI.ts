import { createOpenAI } from "@ai-sdk/openai";
import { type Span, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  EnhancedGenerateResult,
  UnknownRecord,
  TextGenerationOptions,
  ToolWithLegacyParams,
  ValidationSchema,
  StreamOptions,
  StreamResult,
  StreamTextResult,
} from "../types/index.js";
import {
  AuthenticationError,
  InvalidModelError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  buildNoOutputSentinel,
  detectPostStreamNoOutput,
  stampNoOutputSpan,
} from "../utils/noOutputSentinel.js";
import { calculateCost } from "../utils/pricing.js";
import {
  createOpenAIConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import { isZodSchema } from "../utils/schemaConversion.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { MAX_IMAGE_BYTES, readBoundedBuffer } from "../utils/sizeGuard.js";
import { assertSafeUrl } from "../utils/ssrfGuard.js";
import { getModelId } from "./providerTypeUtils.js";
import type { LanguageModel, Tool } from "../types/index.js";
import { NoOutputGeneratedError } from "../utils/generationErrors.js";
import { stepCountIs } from "../utils/tool.js";
import { embed, embedMany, streamText } from "../utils/generation.js";

/**
 * Retrieve a tool's schema, handling both AI SDK v6 (`inputSchema`) and
 * legacy v4 (`parameters`) field names.
 */
function getToolSchema(tool: Tool): unknown {
  const t = tool as ToolWithLegacyParams;
  return t.inputSchema ?? t.parameters;
}

// Configuration helpers - now using consolidated utility
const getOpenAIApiKey = (): string => {
  return validateApiKey(createOpenAIConfig());
};

const getOpenAIModel = (): string => {
  return getProviderModel("OPENAI_MODEL", "gpt-4o");
};

const streamTracer = trace.getTracer("neurolink.provider.openai");

/**
 * OpenAI Provider v2 - BaseProvider Implementation
 * Migrated to use factory pattern with exact Google AI provider pattern
 */
export class OpenAIProvider extends BaseProvider {
  private model: LanguageModel;
  private credentials?: { apiKey?: string; baseURL?: string };

  constructor(
    modelName?: string,
    neurolink?: NeuroLink,
    _region?: string,
    credentials?: { apiKey?: string; baseURL?: string },
  ) {
    super(modelName || getOpenAIModel(), AIProviderName.OPENAI, neurolink);

    this.credentials = credentials;

    // Initialize OpenAI provider with proxy support
    const openai = createOpenAI({
      apiKey: credentials?.apiKey ?? getOpenAIApiKey(),
      ...(credentials?.baseURL ? { baseURL: credentials.baseURL } : {}),
      fetch: createProxyFetch(),
    });

    // Initialize model
    this.model = openai(this.modelName);

    logger.debug("OpenAIProvider constructor called", {
      model: this.modelName,
      provider: this.providerName,
      supportsTools: this.supportsTools(),
      className: this.constructor.name,
    });
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  /**
   * Check if this provider supports tool/function calling
   */
  supportsTools(): boolean {
    return true; // Re-enable tools now that we understand the issue
  }

  public getProviderName(): AIProviderName {
    return AIProviderName.OPENAI;
  }

  public getDefaultModel(): string {
    return getOpenAIModel();
  }

  /**
   * Get the default embedding model for OpenAI
   * @returns The default OpenAI embedding model name
   */
  protected getDefaultEmbeddingModel(): string {
    return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  }

  /**
   * Returns the Vercel AI SDK model instance for OpenAI
   */
  public getAISDKModel(): LanguageModel {
    return this.model;
  }

  /**
   * OpenAI-specific tool validation and filtering
   * Filters out tools that might cause streaming issues
   */
  private validateAndFilterToolsForOpenAI(
    tools: Record<string, Tool>,
  ): Record<string, Tool> {
    const validTools: Record<string, Tool> = {};

    for (const [name, tool] of Object.entries(tools)) {
      try {
        // Basic validation - ensure tool has required structure
        if (tool && typeof tool === "object") {
          // Check if tool has description (required by OpenAI)
          if (tool.description && typeof tool.description === "string") {
            // Keep the original tool structure - AI SDK will handle Zod schema conversion internally
            const processedTool = { ...tool };

            // Validate that Zod schemas are properly structured for AI SDK processing
            const toolSchema = getToolSchema(tool);
            if (toolSchema && isZodSchema(toolSchema)) {
              logger.debug(
                `OpenAI: Tool ${name} has Zod schema - AI SDK will handle conversion`,
              );

              // Basic validation that the Zod schema has the required structure
              this.validateZodSchema(name, toolSchema);
            }

            // Include the tool with original Zod schema for AI SDK processing
            if (this.isValidToolStructure(processedTool)) {
              validTools[name] = processedTool;
            } else {
              logger.warn(
                `OpenAI: Filtering out tool with invalid structure: ${name}`,
                {
                  parametersType: typeof getToolSchema(processedTool),
                  hasDescription: !!processedTool.description,
                  hasExecute: !!processedTool.execute,
                },
              );
            }
          } else {
            logger.warn(
              `OpenAI: Filtering out tool without description: ${name}`,
            );
          }
        } else {
          logger.warn(`OpenAI: Filtering out invalid tool: ${name}`);
        }
      } catch (error) {
        logger.warn(`OpenAI: Error validating tool ${name}:`, error);
      }
    }

    return validTools;
  }

  /**
   * Validate Zod schema structure
   */
  private validateZodSchema(toolName: string, schema: unknown): void {
    try {
      const zodSchema = schema as {
        _def?: { typeName?: string };
      };
      if (zodSchema._def && zodSchema._def.typeName) {
        logger.debug(`OpenAI: Zod schema for ${toolName} appears valid`, {
          typeName: zodSchema._def.typeName,
        });
      } else {
        logger.warn(
          `OpenAI: Zod schema for ${toolName} missing typeName - may cause issues`,
        );
      }
    } catch (zodValidationError) {
      logger.warn(
        `OpenAI: Zod schema validation failed for ${toolName}:`,
        zodValidationError,
      );
      // Continue anyway - let AI SDK handle it
    }
  }

  /**
   * Validate tool structure for OpenAI compatibility
   * More lenient validation to avoid filtering out valid tools
   */
  /** Shared helper: mark a stream span as ERROR, record the exception, and end it. */
  private endStreamSpanWithError(span: Span, error: unknown): void {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : String(error),
    });
    if (error instanceof Error) {
      span.recordException(error);
    }
    span.end();
  }

  private isValidToolStructure(tool: unknown): boolean {
    if (!tool || typeof tool !== "object") {
      return false;
    }

    const toolObj = tool as Record<string, unknown>;

    // Ensure tool has description and execute function
    if (!toolObj.description || typeof toolObj.description !== "string") {
      return false;
    }

    if (!toolObj.execute || typeof toolObj.execute !== "function") {
      return false;
    }

    // AI SDK v6 uses inputSchema; v4 used parameters — check both
    const schema =
      "inputSchema" in toolObj
        ? toolObj.inputSchema
        : "parameters" in toolObj
          ? toolObj.parameters
          : undefined;
    return this.isValidToolParameters(schema);
  }

  /**
   * Validate tool parameters for OpenAI compatibility
   * Ensures the tool has either valid Zod schema or valid JSON schema
   */
  private isValidToolParameters(parameters: unknown): boolean {
    if (!parameters) {
      // For OpenAI, tools without parameters need an empty object schema
      return true;
    }

    // Check if it's a Zod schema - these are valid
    if (isZodSchema(parameters)) {
      return true;
    }

    // Check if it's a JSON schema
    if (typeof parameters !== "object" || parameters === null) {
      return false;
    }

    const params = parameters as Record<string, unknown>;

    // If it's a JSON schema, it should have type "object" for OpenAI
    if (params.type && params.type !== "object") {
      return false;
    }

    // OpenAI requires schemas to have properties field, even if empty
    // If there's no properties field, the schema is incomplete
    if (params.type === "object" && !params.properties) {
      logger.warn(`Tool parameter schema missing properties field:`, params);
      return false;
    }

    // If properties exist, they should be an object
    if (params.properties && typeof params.properties !== "object") {
      return false;
    }

    // If required exists, it should be an array
    if (params.required && !Array.isArray(params.required)) {
      return false;
    }

    return true;
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(error.message, this.providerName);
    }

    const errorObj = error as UnknownRecord;
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    const errorType =
      errorObj?.type && typeof errorObj.type === "string"
        ? errorObj.type
        : undefined;
    const statusCode =
      typeof errorObj?.status === "number"
        ? errorObj.status
        : typeof errorObj?.statusCode === "number"
          ? errorObj.statusCode
          : undefined;

    // Curator P1-1 / Reviewer Finding #4: only the explicit auth markers
    // map to AuthenticationError. Earlier we treated every
    // `invalid_request_error` as an auth failure — that's OpenAI's catch-all
    // for any bad request (unsupported parameter, malformed JSON, etc.) and
    // mislabelled them as "invalid API key". Use credential-specific
    // signals only.
    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key") ||
      message.includes("Incorrect API key") ||
      message.includes("invalid_api_key") ||
      errorType === "invalid_api_key" ||
      statusCode === 401
    ) {
      return new AuthenticationError(
        message.includes("Incorrect API key") ||
          message.includes("Invalid API key")
          ? message
          : "Invalid OpenAI API key. Please check your OPENAI_API_KEY environment variable.",
        this.providerName,
      );
    }

    if (message.includes("rate limit") || errorType === "rate_limit_error") {
      return new RateLimitError(
        "OpenAI rate limit exceeded. Please try again later.",
        this.providerName,
      );
    }

    if (message.includes("model_not_found")) {
      return new InvalidModelError(
        `Model not found: ${this.modelName}`,
        this.providerName,
      );
    }

    // Generic provider error
    return new ProviderError(`OpenAI error: ${message}`, this.providerName);
  }

  /**
   * executeGenerate method removed - generation is now handled by BaseProvider.
   * For details on the changes and migration steps, refer to the BaseProvider documentation
   * and the migration guide in the project repository.
   */

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const startTime = Date.now();
    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      "stream",
    );

    try {
      // Get tools - options.tools is pre-merged by BaseProvider.stream() with
      // base tools (MCP/built-in) + user-provided tools (RAG, etc.)
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const allTools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      // OpenAI-specific fix: Validate tools format and filter out problematic ones
      let tools = this.validateAndFilterToolsForOpenAI(allTools);

      // OpenAI max tools limit - configurable via environment variable
      const MAX_TOOLS = parseInt(process.env.OPENAI_MAX_TOOLS || "150", 10);
      if (Object.keys(tools).length > MAX_TOOLS) {
        logger.warn(
          `OpenAI: Too many tools (${Object.keys(tools).length}), limiting to ${MAX_TOOLS} tools`,
        );
        const toolEntries = Object.entries(tools);
        tools = Object.fromEntries(toolEntries.slice(0, MAX_TOOLS));
      }

      // Count tools with Zod schemas for debugging
      const zodToolsCount = Object.values(allTools).filter((tool) => {
        if (!tool || typeof tool !== "object") {
          return false;
        }
        const schema = getToolSchema(tool);
        return schema !== null && schema !== undefined && isZodSchema(schema);
      }).length;

      logger.info("OpenAI streaming tools", {
        shouldUseTools,
        allToolsCount: Object.keys(allTools).length,
        filteredToolsCount: Object.keys(tools).length,
        zodToolsCount,
        toolNames: Object.keys(tools),
        filteredOutTools: Object.keys(allTools).filter((name) => !tools[name]),
      });

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);
      let resolvedToolChoice = resolveToolChoice(
        options,
        tools,
        shouldUseTools,
      );

      // Guard: if toolChoice names a specific tool that was filtered out, fall back to "auto"
      if (
        resolvedToolChoice !== null &&
        typeof resolvedToolChoice === "object" &&
        "toolName" in resolvedToolChoice &&
        typeof resolvedToolChoice.toolName === "string" &&
        !tools[resolvedToolChoice.toolName]
      ) {
        logger.warn(
          `OpenAI: toolChoice references tool "${resolvedToolChoice.toolName}" which was removed during filtering; falling back to "auto"`,
        );
        resolvedToolChoice = "auto";
      }

      // Debug the actual request being sent to OpenAI
      logger.debug(`OpenAI: streamText request parameters:`, {
        modelName: this.modelName,
        messagesCount: messages.length,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        toolsCount: Object.keys(tools).length,
        toolChoice: resolvedToolChoice,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        firstToolExample:
          Object.keys(tools).length > 0
            ? {
                name: Object.keys(tools)[0],
                description: tools[Object.keys(tools)[0]]?.description,
                parametersType: typeof getToolSchema(
                  tools[Object.keys(tools)[0]],
                ),
              }
            : "no-tools",
      });

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!

      // Wrap streamText in an OTel span to capture provider-level latency and token usage
      const streamSpan = streamTracer.startSpan(
        "neurolink.provider.streamText",
        {
          kind: SpanKind.CLIENT,
          attributes: {
            "gen_ai.system": "openai",
            "gen_ai.request.model":
              getModelId(model) || this.modelName || "unknown",
          },
        },
      );

      // Reviewer follow-up: capture upstream provider errors via onError
      // so the post-stream NoOutput detect can propagate the *real* cause
      // into the sentinel's providerError / modelResponseRaw.
      let capturedProviderError: unknown;
      let result: ReturnType<typeof streamText>;
      try {
        result = streamText({
          model,
          messages: messages,
          temperature: options.temperature,
          maxOutputTokens: options.maxTokens, // No default limit - unlimited unless specified
          maxRetries: 0, // NL11: Disable AI SDK's invisible internal retries; we handle retries with OTel instrumentation
          tools,
          stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
          toolChoice: resolvedToolChoice,
          abortSignal: composeAbortSignals(
            options.abortSignal,
            timeoutController?.controller.signal,
          ),
          experimental_repairToolCall: this.getToolCallRepairFn(options),
          experimental_telemetry:
            this.telemetryHandler.getTelemetryConfig(options),
          onError: (event: { error: unknown }) => {
            capturedProviderError = event.error;
            logger.error("OpenAI: Stream error", {
              error:
                event.error instanceof Error
                  ? event.error.message
                  : String(event.error),
            });
          },
          onStepFinish: ({ toolCalls, toolResults }) => {
            logger.info("Tool execution completed", {
              toolResults,
              toolCalls,
            });

            // Emit tool:end for each completed tool result so Pipeline B
            // captures telemetry for AI-SDK-driven tool calls (gap S2).
            emitToolEndFromStepFinish(
              this.neurolink?.getEventEmitter(),
              toolResults as Array<{
                toolName: string;
                output?: unknown;
                result?: unknown;
                error?: string;
              }>,
            );

            // Handle tool execution storage
            this.handleToolExecutionStorage(
              toolCalls,
              toolResults,
              options,
              new Date(),
            ).catch((error: unknown) => {
              logger.warn("[OpenAIProvider] Failed to store tool executions", {
                provider: this.providerName,
                error: error instanceof Error ? error.message : String(error),
              });
            });
          },
        });
      } catch (streamError) {
        this.endStreamSpanWithError(streamSpan, streamError);
        throw streamError;
      }

      // Collect token usage and finish reason asynchronously when the stream completes,
      // then end the span. This avoids blocking the stream consumer.
      Promise.resolve(result.usage)
        .then((usage) => {
          streamSpan.setAttribute(
            "gen_ai.usage.input_tokens",
            usage.inputTokens || 0,
          );
          streamSpan.setAttribute(
            "gen_ai.usage.output_tokens",
            usage.outputTokens || 0,
          );
          const cost = calculateCost(this.providerName, this.modelName, {
            input: usage.inputTokens || 0,
            output: usage.outputTokens || 0,
            total: (usage.inputTokens || 0) + (usage.outputTokens || 0),
          });
          if (cost && cost > 0) {
            streamSpan.setAttribute("neurolink.cost", cost);
          }
        })
        .catch(() => {
          // Usage may not be available if the stream is aborted
        });
      Promise.resolve(result.finishReason)
        .then((reason) => {
          streamSpan.setAttribute(
            "gen_ai.response.finish_reason",
            reason || "unknown",
          );
        })
        .catch(() => {
          // Finish reason may not be available if the stream is aborted
        });
      Promise.resolve(result.text)
        .then(() => {
          streamSpan.end();
        })
        .catch((err: unknown) => {
          this.endStreamSpanWithError(streamSpan, err);
        });

      timeoutController?.cleanup();

      // Debug the actual result structure
      logger.debug(`OpenAI: streamText result structure:`, {
        resultKeys: Object.keys(result),
        hasTextStream: !!result.textStream,
        hasToolCalls: !!result.toolCalls,
        hasToolResults: !!result.toolResults,
        resultType: typeof result,
      });

      const transformedStream = this.createOpenAITransformedStream(
        result,
        shouldUseTools,
        tools,
        () => capturedProviderError,
      );

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        result as StreamTextResult,
        Date.now() - startTime,
        {
          requestId: `openai-stream-${Date.now()}`,
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
          streamId: `openai-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  private async *createOpenAITransformedStream(
    result: ReturnType<typeof streamText>,
    shouldUseTools: boolean,
    tools: Record<string, Tool>,
    getCapturedProviderError?: () => unknown,
  ): AsyncGenerator<{ content: string }> {
    try {
      logger.debug(`OpenAI: Starting stream transformation`, {
        hasTextStream: !!result.textStream,
        hasFullStream: !!result.fullStream,
        resultKeys: Object.keys(result),
        toolsEnabled: shouldUseTools,
        toolsCount: Object.keys(tools).length,
      });

      let chunkCount = 0;
      let contentYielded = 0;
      const streamToUse = result.fullStream || result.textStream;
      if (!streamToUse) {
        logger.error("OpenAI: No stream available in result", {
          resultKeys: Object.keys(result),
        });
        return;
      }

      logger.debug(`OpenAI: Stream source selected:`, {
        usingFullStream: !!result.fullStream,
        usingTextStream: !!result.textStream && !result.fullStream,
        streamSourceType: result.fullStream ? "fullStream" : "textStream",
      });

      for await (const chunk of streamToUse) {
        chunkCount++;
        logger.debug(`OpenAI: Processing chunk ${chunkCount}:`, {
          chunkType: typeof chunk,
          chunkValue:
            typeof chunk === "string"
              ? (chunk as string).substring(0, 50)
              : "not-string",
          chunkKeys:
            chunk && typeof chunk === "object"
              ? Object.keys(chunk)
              : "not-object",
          hasText: chunk && typeof chunk === "object" && "text" in chunk,
          hasTextDelta:
            chunk && typeof chunk === "object" && "textDelta" in chunk,
          hasType: chunk && typeof chunk === "object" && "type" in chunk,
          chunkTypeValue:
            chunk && typeof chunk === "object" && "type" in chunk
              ? (chunk as { type: unknown }).type
              : "no-type",
        });

        const contentToYield = this.extractOpenAIChunkContent(chunk);
        if (contentToYield) {
          contentYielded++;
          logger.debug(`OpenAI: Yielding content ${contentYielded}:`, {
            content: contentToYield.substring(0, 50),
            length: contentToYield.length,
          });
          yield { content: contentToYield };
        }
      }

      logger.debug(`OpenAI: Stream transformation completed`, {
        totalChunks: chunkCount,
        contentYielded,
        success: contentYielded > 0,
      });

      if (contentYielded === 0) {
        logger.warn(
          `OpenAI: No content was yielded from stream despite processing ${chunkCount} chunks`,
        );
        // Curator P3-6 (round-2 fix): when no content was yielded, the
        // production trigger sets NoOutputGeneratedError on
        // result.finishReason rejection (NOT on the textStream itself).
        // Surface that rejection here so the enriched sentinel actually
        // fires for real-world no-output streams.
        const detected = await detectPostStreamNoOutput(
          result,
          getCapturedProviderError?.(),
        );
        if (detected) {
          logger.warn(
            "OpenAI: Stream produced no output (NoOutputGeneratedError) — caught from finishReason rejection",
          );
          stampNoOutputSpan(detected.sentinel);
          yield detected.sentinel as { content: string };
        }
      }
    } catch (streamError) {
      if (NoOutputGeneratedError.isInstance(streamError)) {
        logger.warn(
          "OpenAI: Stream produced no output (NoOutputGeneratedError) — caught from textStream",
        );
        // Defensive: AI SDK *can* throw this from textStream in some
        // failure modes (catastrophic transform errors). Keep this path
        // for completeness; the production trigger goes through the
        // post-loop detect above.
        const sentinel = await buildNoOutputSentinel(
          streamError,
          result,
          getCapturedProviderError?.(),
        );
        stampNoOutputSpan(sentinel);
        yield sentinel as { content: string };
        return;
      }
      logger.error(`OpenAI: Stream transformation error:`, streamError);
      throw streamError;
    }
  }

  private extractOpenAIChunkContent(chunk: unknown): string | null {
    if (chunk && typeof chunk === "object") {
      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(`OpenAI: Full chunk structure:`, {
          chunkKeys: Object.keys(chunk),
          fullChunk: JSON.stringify(chunk).substring(0, 500),
        });
      }

      if ("type" in chunk && chunk.type === "error") {
        const errorChunk = chunk as {
          type: "error";
          error: Record<string, unknown>;
        };
        logger.error(`OpenAI: Error chunk received:`, {
          errorType: errorChunk.type,
          errorDetails: errorChunk.error,
          fullChunk: JSON.stringify(chunk),
        });

        const errorMessage =
          errorChunk.error &&
          typeof errorChunk.error === "object" &&
          "message" in errorChunk.error
            ? String(errorChunk.error.message)
            : "OpenAI API error when tools are enabled";
        throw new Error(
          `OpenAI streaming error with tools: ${errorMessage}. Try disabling tools with --disableTools`,
        );
      }

      if (
        "type" in chunk &&
        chunk.type === "text-delta" &&
        "textDelta" in chunk
      ) {
        const textDelta = chunk.textDelta as string;
        logger.debug(`OpenAI: Found text-delta:`, { textDelta });
        return textDelta;
      }

      if ("text" in chunk) {
        const text = chunk.text as string;
        logger.debug(`OpenAI: Found direct text:`, { text });
        return text;
      }

      if (process.env.NEUROLINK_DEBUG === "true") {
        logger.debug(`OpenAI: Unhandled object chunk:`, {
          chunkKeys: Object.keys(chunk),
          chunkType:
            "type" in chunk
              ? String((chunk as { type?: unknown }).type)
              : "no-type",
          fullChunk: JSON.stringify(chunk).substring(0, 500),
        });
      }
      return null;
    }

    if (typeof chunk === "string") {
      logger.debug(`OpenAI: Found string chunk:`, {
        content: chunk,
      });
      return chunk;
    }

    logger.warn(`OpenAI: Unhandled chunk type:`, {
      type: typeof chunk,
      value: String(chunk).substring(0, 100),
    });
    return null;
  }

  /**
   * Generate embeddings for text using OpenAI text-embedding models
   * @param text - The text to embed
   * @param modelName - The embedding model to use (default: text-embedding-3-small)
   * @returns Promise resolving to the embedding vector
   */
  async embed(text: string, modelName?: string): Promise<number[]> {
    const embeddingModelName = modelName || "text-embedding-3-small";

    logger.debug("Generating embedding", {
      provider: this.providerName,
      model: embeddingModelName,
      textLength: text.length,
    });

    try {
      // Create embedding model using the AI SDK
      // Create the OpenAI provider, preferring per-instance credentials over env vars
      const openai = createOpenAI({
        apiKey: this.credentials?.apiKey ?? getOpenAIApiKey(),
        ...(this.credentials?.baseURL
          ? { baseURL: this.credentials.baseURL }
          : {}),
        fetch: createProxyFetch(),
      });

      // Get the text embedding model
      const embeddingModel = openai.textEmbeddingModel(embeddingModelName);

      // Generate the embedding
      const result = await embed({
        model: embeddingModel,
        value: text,
      });

      logger.debug("Embedding generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        embeddingDimension: result.embedding.length,
      });

      return result.embedding;
    } catch (error) {
      logger.error("Embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        textLength: text.length,
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Generate embeddings for multiple texts in a single batch
   * @param texts - The texts to embed
   * @param modelName - The embedding model to use (default: text-embedding-3-small)
   * @returns Promise resolving to an array of embedding vectors
   */
  async embedMany(texts: string[], modelName?: string): Promise<number[][]> {
    const embeddingModelName = modelName || "text-embedding-3-small";

    logger.debug("Generating batch embeddings", {
      provider: this.providerName,
      model: embeddingModelName,
      count: texts.length,
    });

    try {
      // Prefer per-instance credentials over env vars
      const openai = createOpenAI({
        apiKey: this.credentials?.apiKey ?? getOpenAIApiKey(),
        ...(this.credentials?.baseURL
          ? { baseURL: this.credentials.baseURL }
          : {}),
        fetch: createProxyFetch(),
      });

      const embeddingModel = openai.textEmbeddingModel(embeddingModelName);

      const result = await embedMany({
        model: embeddingModel,
        values: texts,
      });

      logger.debug("Batch embeddings generated successfully", {
        provider: this.providerName,
        model: embeddingModelName,
        count: result.embeddings.length,
        embeddingDimension: result.embeddings[0]?.length,
      });

      return result.embeddings;
    } catch (error) {
      logger.error("Batch embedding generation failed", {
        error: error instanceof Error ? error.message : String(error),
        model: embeddingModelName,
        count: texts.length,
      });

      throw this.handleProviderError(error);
    }
  }

  /**
   * Image generation via the OpenAI Images API (`/v1/images/generations`).
   *
   * Supports `gpt-image-1`, `dall-e-3`, and `dall-e-2`. The three models
   * differ in which body params they accept:
   *
   * - `gpt-image-1` returns base64 by default; does NOT accept `response_format`.
   * - `dall-e-3` / `dall-e-2` accept `response_format: "b64_json"` to get base64.
   * - `dall-e-2` does NOT accept `quality` / `style`.
   *
   * The model is taken from `options.model || this.modelName`.
   *
   * @see https://platform.openai.com/docs/api-reference/images/create
   */
  protected override async executeImageGeneration(
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    const startTime = Date.now();
    const prompt = options.prompt ?? options.input?.text ?? "";
    if (!prompt.trim()) {
      throw new Error(
        "OpenAI image generation requires a prompt (input.text or prompt)",
      );
    }

    const model = options.model ?? this.modelName;
    const apiKey = this.credentials?.apiKey ?? getOpenAIApiKey();
    const baseURL = (
      this.credentials?.baseURL ??
      process.env.OPENAI_BASE_URL ??
      "https://api.openai.com/v1"
    ).replace(/\/$/, "");

    // Image-gen extras live on `options` but are not part of the strict
    // TextGenerationOptions shape — cast to a permissive type to read them.
    const extras = options as TextGenerationOptions & {
      aspectRatio?: string;
      numberOfImages?: number;
      quality?: string;
      style?: string;
      size?: string;
    };

    // Map aspect ratio to OpenAI's `size` parameter. gpt-image-1 supports
    // 1024x1024 / 1024x1536 / 1536x1024 / auto; dall-e-3 supports
    // 1024x1024 / 1792x1024 / 1024x1792; dall-e-2 supports 256x256 /
    // 512x512 / 1024x1024. We pick safe defaults and let users override
    // via `extras.size` directly.
    const size =
      extras.size ?? this.aspectRatioToOpenAISize(extras.aspectRatio, model);

    // Clamp n per-model: gpt-image-1 and dall-e-3 only support n=1;
    // dall-e-2 supports n=1..10; default to 1 for any future models.
    const rawN = extras.numberOfImages ?? 1;
    let clampedN: number;
    if (model === "gpt-image-1" || model.startsWith("dall-e-3")) {
      clampedN = 1;
    } else if (model.startsWith("dall-e-2")) {
      clampedN = Math.min(Math.max(rawN, 1), 10);
    } else {
      clampedN = 1;
    }
    const n = clampedN;

    const body: Record<string, unknown> = {
      model,
      prompt,
      n,
      size,
    };

    if (model === "gpt-image-1") {
      // gpt-image-1 always returns base64; rejects `response_format`.
      if (extras.quality) {
        body.quality = extras.quality;
      }
    } else if (model.startsWith("dall-e-3")) {
      body.response_format = "b64_json";
      if (extras.quality) {
        body.quality = extras.quality;
      }
      if (extras.style) {
        body.style = extras.style;
      }
    } else {
      // dall-e-2 (and forward-compat default).
      body.response_format = "b64_json";
    }

    const REQUEST_TIMEOUT_MS = 120_000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      const proxyFetch = createProxyFetch();
      response = await proxyFetch(`${baseURL}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(
          `OpenAI image generation timed out after ${REQUEST_TIMEOUT_MS / 1000}s`,
          { cause: err },
        );
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        `OpenAI image generation failed: ${response.status} — ${text}`,
      );
    }

    const data = (await response.json()) as {
      created?: number;
      data?: Array<{
        b64_json?: string;
        url?: string;
        revised_prompt?: string;
      }>;
    };

    const first = data.data?.[0];
    if (!first) {
      throw new Error("OpenAI image generation returned no images");
    }

    let base64: string | undefined = first.b64_json;
    // dall-e-2 with `response_format: "b64_json"` should always include
    // b64_json. If a hosted URL came back instead (e.g. older keys, or
    // url-mode), download it inline so callers always get base64.
    if (!base64 && first.url) {
      // Guard the API-returned URL before fetching (provider-returned URLs
      // carry the same SSRF risk as caller-supplied ones).
      await assertSafeUrl(first.url);
      const proxyFetch = createProxyFetch();
      const dlController = new AbortController();
      const dlTimeoutId = setTimeout(() => dlController.abort(), 60_000);
      let imgResp: Response;
      try {
        imgResp = await proxyFetch(first.url, { signal: dlController.signal });
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          throw new Error("OpenAI image URL download timed out after 60s", {
            cause: err,
          });
        }
        throw err;
      } finally {
        clearTimeout(dlTimeoutId);
      }
      if (!imgResp.ok) {
        throw new Error(
          `OpenAI image generation: failed to fetch hosted URL ${first.url} (${imgResp.status})`,
        );
      }
      const buf = await readBoundedBuffer(
        imgResp,
        MAX_IMAGE_BYTES,
        "OpenAI image fallback",
      );
      base64 = buf.toString("base64");
    }

    if (!base64) {
      throw new Error(
        "OpenAI image generation returned neither b64_json nor a URL",
      );
    }

    const generationTimeMs = Date.now() - startTime;
    logger.info(
      `[OpenAIProvider] Generated image (${base64.length} base64 chars) in ${generationTimeMs}ms — model ${model}`,
    );

    return {
      content: first.revised_prompt ?? prompt,
      provider: this.providerName,
      model,
      usage: { input: 0, output: 0, total: 0 },
      imageOutput: { base64 },
    };
  }

  /**
   * Map a NeuroLink-style aspect ratio (e.g. "16:9") to the OpenAI
   * `size` parameter accepted by the active image model. Falls back to
   * the per-model square default when the ratio is unknown.
   */
  private aspectRatioToOpenAISize(
    aspectRatio: string | undefined,
    model: string,
  ): string {
    if (model === "gpt-image-1") {
      if (aspectRatio === "16:9" || aspectRatio === "3:2") {
        return "1536x1024";
      }
      if (aspectRatio === "9:16" || aspectRatio === "2:3") {
        return "1024x1536";
      }
      return "1024x1024";
    }
    if (model.startsWith("dall-e-3")) {
      if (aspectRatio === "16:9" || aspectRatio === "3:2") {
        return "1792x1024";
      }
      if (aspectRatio === "9:16" || aspectRatio === "2:3") {
        return "1024x1792";
      }
      return "1024x1024";
    }
    // dall-e-2 — only square sizes supported.
    return "1024x1024";
  }
}

// Export for factory registration
export default OpenAIProvider;
