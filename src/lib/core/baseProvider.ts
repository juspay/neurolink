import { context, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";
import type {
  LanguageModel,
  ModelMessage,
  Tool,
  ToolCallRepairFunction,
  ToolSet,
} from "ai";
import { generateText } from "ai";
import { directAgentTools } from "../agent/directTools.js";
import type { AIProviderName } from "../constants/enums.js";
import { IMAGE_GENERATION_MODELS } from "../core/constants.js";
import type { EvaluationData } from "../index.js";
import { MiddlewareFactory } from "../middleware/factory.js";
import type { NeuroLink } from "../neurolink.js";
import { ATTR, tracers } from "../telemetry/index.js";
import type {
  JsonValue,
  UnknownRecord,
  MiddlewareFactoryOptions,
  StreamOptions,
  StreamResult,
  AIProvider,
  AnalyticsData,
  EnhancedGenerateResult,
  TextGenerationOptions,
  TextGenerationResult,
  StandardRecord,
  ValidationSchema,
  ZodUnknownSchema,
} from "../types/index.js";
import { isAbortError } from "../utils/errorHandling.js";
import { logger } from "../utils/logger.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";
import { getKeyCount, getKeysAsString } from "../utils/transformationUtils.js";
import { TTSProcessor } from "../utils/ttsProcessor.js";
import {
  executeVideoAnalysis,
  hasVideoFrames,
} from "../utils/videoAnalysisProcessor.js";
import { GenerationHandler } from "./modules/GenerationHandler.js";
// Import modules for composition
import { MessageBuilder } from "./modules/MessageBuilder.js";
import { StreamHandler } from "./modules/StreamHandler.js";

import { TelemetryHandler } from "./modules/TelemetryHandler.js";
import { ToolsManager } from "./modules/ToolsManager.js";
import { Utilities } from "./modules/Utilities.js";

/**
 * Abstract base class for all AI providers
 * Tools are integrated as first-class citizens - always available by default
 */
export abstract class BaseProvider implements AIProvider {
  // Not `readonly` because providers that auto-discover the model from a
  // /v1/models endpoint (lm-studio, llamacpp) need to update modelName after
  // construction so handlers (TelemetryHandler, MessageBuilder) cache the
  // resolved name. All other providers treat this as effectively readonly.
  protected modelName: string;
  protected readonly providerName: AIProviderName;
  protected readonly defaultTimeout: number = 30000; // 30 seconds
  protected middlewareOptions?: MiddlewareFactoryOptions; // TODO: Implement global level middlewares that can be used

  // Tools are conditionally included based on centralized configuration
  protected readonly directTools = shouldDisableBuiltinTools()
    ? {}
    : directAgentTools;
  protected mcpTools?: Record<string, Tool>; // MCP tools loaded dynamically when available
  protected customTools?: Map<string, unknown>; // Custom tools from registerTool()
  protected toolExecutor?: (
    toolName: string,
    params: unknown,
  ) => Promise<unknown>; // Tool executor from setupToolExecutor
  protected sessionId?: string;
  protected userId?: string;
  protected neurolink?: NeuroLink; // Reference to actual NeuroLink instance for MCP tools

  /** @internal Trace context propagated from NeuroLink SDK for span hierarchy */
  protected _traceContext: { traceId: string; parentSpanId: string } | null =
    null;

  setTraceContext(ctx: { traceId: string; parentSpanId: string } | null): void {
    this._traceContext = ctx;
  }

  // Composition modules - Single Responsibility Principle
  // Handlers below are not `readonly` so that providers which auto-discover
  // their model after construction (lm-studio, llamacpp) can rebuild them
  // via `refreshHandlersForModel(...)` and propagate the resolved name into
  // pricing / telemetry / span attributes. All other providers leave these
  // alone.
  private messageBuilder: MessageBuilder;
  private streamHandler: StreamHandler;
  private generationHandler: GenerationHandler;
  protected telemetryHandler: TelemetryHandler;
  private utilities: Utilities;
  private readonly toolsManager: ToolsManager;

  constructor(
    modelName?: string,
    providerName?: AIProviderName,
    neurolink?: NeuroLink,
    middleware?: MiddlewareFactoryOptions,
  ) {
    this.modelName = modelName || this.getDefaultModel();
    this.providerName = providerName || this.getProviderName();
    this.neurolink = neurolink;
    this.middlewareOptions = middleware;

    // Initialize composition modules
    this.messageBuilder = new MessageBuilder(this.providerName, this.modelName);
    this.streamHandler = new StreamHandler(this.providerName, this.modelName);
    this.telemetryHandler = new TelemetryHandler(
      this.providerName,
      this.modelName,
      this.neurolink,
    );
    this.generationHandler = new GenerationHandler(
      this.providerName,
      this.modelName,
      () => this.supportsTools(),
      (options, type) =>
        this.telemetryHandler.getTelemetryConfig(
          options,
          type as "stream" | "generate",
        ),
      (toolCalls, toolResults, options, timestamp) =>
        this.handleToolExecutionStorage(
          toolCalls,
          toolResults,
          options,
          timestamp,
        ),
      () => this.neurolink?.getEventEmitter(),
    );
    this.utilities = new Utilities(
      this.providerName,
      this.modelName,
      this.defaultTimeout,
      this.middlewareOptions,
    );
    this.toolsManager = new ToolsManager(
      this.providerName,
      this.directTools,
      this.neurolink,
      {
        isZodSchema: (schema) => this.isZodSchema(schema),
        convertToolResult: (result) => this.convertToolResult(result),
        createPermissiveZodSchema: () => this.createPermissiveZodSchema(),
        fixSchemaForOpenAIStrictMode: (schema) =>
          this.fixSchemaForOpenAIStrictMode(schema),
      },
    );
  }

  /**
   * Update modelName and rebuild composition handlers with the new value.
   *
   * Auto-discovery providers (lm-studio, llamacpp) call this once they have
   * resolved the loaded model from `/v1/models`. Without this, handlers
   * (TelemetryHandler, MessageBuilder, ...) keep the pre-discovery name and
   * pricing / span / log metadata reports the stale value.
   */
  protected refreshHandlersForModel(model: string): void {
    this.modelName = model;
    trace
      .getSpan(context.active())
      ?.setAttribute(ATTR.GEN_AI_MODEL, this.modelName);
    this.messageBuilder = new MessageBuilder(this.providerName, this.modelName);
    this.streamHandler = new StreamHandler(this.providerName, this.modelName);
    this.telemetryHandler = new TelemetryHandler(
      this.providerName,
      this.modelName,
      this.neurolink,
    );
    this.generationHandler = new GenerationHandler(
      this.providerName,
      this.modelName,
      () => this.supportsTools(),
      (options, type) =>
        this.telemetryHandler.getTelemetryConfig(
          options,
          type as "stream" | "generate",
        ),
      (toolCalls, toolResults, options, timestamp) =>
        this.handleToolExecutionStorage(
          toolCalls,
          toolResults,
          options,
          timestamp,
        ),
      () => this.neurolink?.getEventEmitter(),
    );
    this.utilities = new Utilities(
      this.providerName,
      this.modelName,
      this.defaultTimeout,
      this.middlewareOptions,
    );
  }

  /**
   * Check if this provider supports tool/function calling
   * Override in subclasses to disable tools for specific providers or models
   * @returns true by default, providers can override to return false
   */
  supportsTools(): boolean {
    return true;
  }

  // ===================
  // PUBLIC API METHODS
  // ===================

  /**
   * Primary streaming method - implements AIProvider interface
   * When tools are involved, falls back to generate() with synthetic streaming
   */
  async stream(
    optionsOrPrompt: StreamOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    let options = this.normalizeStreamOptions(optionsOrPrompt);

    logger.info(`Starting stream`, {
      provider: this.providerName,
      hasTools: !options.disableTools && this.supportsTools(),
      disableTools: !!options.disableTools,
      supportsTools: this.supportsTools(),
      inputLength: options.input?.text?.length || 0,
      maxTokens: options.maxTokens,
      temperature: options.temperature,
      timestamp: Date.now(),
    });

    // ===== EARLY MULTIMODAL DETECTION =====
    const hasFileInput =
      !!options.input?.files?.length || !!options.input?.videoFiles?.length;
    if (hasFileInput) {
      // ===== VIDEO ANALYSIS DETECTION =====
      // Check if video frames are present and handle with fake streaming
      const messages = await this.buildMessagesForStream(options);
      if (hasVideoFrames(messages)) {
        logger.info(
          `Video frames detected in stream, using fake streaming for video analysis`,
          {
            provider: this.providerName,
            model: this.modelName,
          },
        );
        return await this.executeFakeStreaming(options, analysisSchema);
      }
    }

    // CRITICAL: Image generation models don't support real streaming
    // Force fake streaming for image models to ensure image output is yielded.
    // Skip this path when the caller explicitly requests non-image output (e.g.
    // JSON analysis) so dual-mode models like gemini-3.1-flash-image-preview
    // can still perform text/structured generation.
    const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
      this.modelName.includes(m),
    );
    const requestsNonImageOutput =
      options.output?.format === "json" ||
      options.output?.format === "structured" ||
      options.output?.format === "text";

    if (isImageModel && !requestsNonImageOutput) {
      logger.info(`Image model detected, forcing fake streaming`, {
        provider: this.providerName,
        model: this.modelName,
        reason:
          "Image generation requires fake streaming to yield image output",
      });

      // Skip real streaming, go directly to fake streaming
      return await this.executeFakeStreaming(options, analysisSchema);
    }

    // Central tool merge: Pre-merge base tools (MCP/built-in) with user-provided
    // tools (e.g. RAG tools) into options.tools. This way, every provider's
    // executeStream() can simply use options.tools (or getAllTools() + options.tools)
    // and get the complete tool set without needing per-provider merge logic.
    if (!options.disableTools && this.supportsTools()) {
      const mergedTools = await this.getToolsForStream(options);
      options = { ...options, tools: mergedTools };
    } else {
      options = { ...options, tools: {} };
    }

    // CRITICAL FIX: Always prefer real streaming over fake streaming
    // Try real streaming first, use fake streaming only as fallback
    try {
      logger.debug(`Attempting real streaming`, {
        provider: this.providerName,
        timestamp: Date.now(),
      });

      const realStreamResult = await this.executeStream(
        options,
        analysisSchema,
      );

      logger.info(`Real streaming succeeded`, {
        provider: this.providerName,
        timestamp: Date.now(),
      });

      // If real streaming succeeds, return it (with tools support via Vercel AI SDK)
      return realStreamResult;
    } catch (realStreamError) {
      // Don't retry on terminal/abort errors — only fall back for
      // "real streaming with tools is unsupported" style failures.
      const errMsg =
        realStreamError instanceof Error
          ? realStreamError.message
          : String(realStreamError);
      const errName =
        realStreamError instanceof Error ? realStreamError.name : "";
      if (
        errName === "AbortError" ||
        errMsg.includes("abort") ||
        errMsg.includes("timeout") ||
        errMsg.includes("401") ||
        errMsg.includes("403") ||
        errMsg.includes("quota") ||
        errMsg.includes("rate limit") ||
        errMsg.includes("authentication")
      ) {
        throw this.handleProviderError(realStreamError);
      }

      logger.warn(
        `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
        {
          error: errMsg,
          timestamp: Date.now(),
        },
      );

      // Fallback to fake streaming only if real streaming fails AND tools are enabled
      if (!options.disableTools && this.supportsTools()) {
        return await this.executeFakeStreaming(options, analysisSchema);
      } else {
        // If real streaming failed and no tools are enabled, re-throw the original error
        logger.error(
          `Real streaming failed for ${this.providerName}:`,
          realStreamError,
        );
        throw this.handleProviderError(realStreamError);
      }
    }
  }

  /**
   * Execute fake streaming - extracted method for reusability
   */
  private async executeFakeStreaming(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    try {
      logger.info(`Starting fake streaming with tools`, {
        provider: this.providerName,
        supportsTools: this.supportsTools(),
        timestamp: Date.now(),
      });

      // Convert stream options to text generation options
      const textOptions: TextGenerationOptions = {
        prompt: options.input?.text || "",
        input: options.input,
        systemPrompt: options.systemPrompt,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools: options.tools, // 🔧 FIX: Pass user-provided tools (including RAG tools) to generation pipeline
        disableTools: !!options.disableTools,
        maxSteps: options.maxSteps || 5,
        provider: options.provider as AIProviderName | undefined,
        model: options.model,
        region: options.region, // Pass region for Vertex AI
        // 🔧 FIX: Include analytics and evaluation options from stream options
        enableAnalytics: options.enableAnalytics,
        enableEvaluation: options.enableEvaluation,
        evaluationDomain: options.evaluationDomain,
        toolUsageContext: options.toolUsageContext,
        context: options.context as Record<string, JsonValue> | undefined,
        csvOptions: options.csvOptions,
        // Forward abort, tool filtering, and timeout options to prevent
        // silent bypass when falling back from real streaming to fake streaming
        abortSignal: options.abortSignal,
        toolFilter: options.toolFilter,
        excludeTools: options.excludeTools,
        skipToolPromptInjection: options.skipToolPromptInjection,
        timeout: options.timeout,
      };

      logger.debug(`Calling generate for fake streaming`, {
        provider: this.providerName,
        maxSteps: textOptions.maxSteps,
        disableTools: textOptions.disableTools,
        timestamp: Date.now(),
      });

      const result = await this.generate(textOptions, analysisSchema);
      logger.info(`Generate completed for fake streaming`, {
        provider: this.providerName,
        hasContent: !!result?.content,
        contentLength: result?.content?.length || 0,
        toolsUsed: result?.toolsUsed?.length || 0,
        hasImageOutput: !!result?.imageOutput,
        timestamp: Date.now(),
      });

      // Create a synthetic stream from the generate result that simulates progressive delivery
      return {
        stream: (async function* () {
          if (result?.content) {
            // Split content into words for more natural streaming
            const words = result.content.split(/(\s+)/); // Keep whitespace
            let buffer = "";

            for (let i = 0; i < words.length; i++) {
              buffer += words[i];

              // Yield chunks of roughly 5-10 words or at punctuation
              const shouldYield =
                i === words.length - 1 || // Last word
                buffer.length > 50 || // Buffer getting long
                /[.!?;,]\s*$/.test(buffer); // End of sentence/clause

              if (shouldYield && buffer.trim()) {
                yield { content: buffer };
                buffer = "";

                // Small delay to simulate streaming (1-10ms)
                await new Promise((resolve) => {
                  setTimeout(resolve, Math.random() * 9 + 1);
                });
              }
            }

            // Yield all remaining content
            if (buffer.trim()) {
              yield { content: buffer };
            }
          }

          // 🔧 CRITICAL FIX: Yield image output if present
          if (result?.imageOutput) {
            yield {
              type: "image" as const,
              imageOutput: result.imageOutput,
            };
          }
        })(),
        usage: result?.usage,
        provider: result?.provider,
        model: result?.model,
        toolCalls: result?.toolCalls?.map((call) => ({
          toolName: call.toolName,
          parameters: call.args,
          id: call.toolCallId,
        })),
        toolResults: result?.toolResults
          ? result.toolResults.map((tr) => ({
              toolName: ((tr as UnknownRecord).toolName as string) || "unknown",
              status: (((tr as UnknownRecord).status as string) === "error"
                ? "failure"
                : "success") as "success" | "failure",
              result: (tr as UnknownRecord).result,
              error: (tr as UnknownRecord).error as string | undefined,
            }))
          : undefined,
        // 🔧 FIX: Include analytics and evaluation from generate result
        analytics: result?.analytics,
        evaluation: result?.evaluation,
      };
    } catch (error) {
      logger.error(
        `Fake streaming fallback failed for ${this.providerName}:`,
        error,
      );
      throw this.handleProviderError(error);
    }
  }

  /**
   * Apply per-call tool filtering (whitelist/blacklist) to a tools record.
   * If toolFilter is set, only tools whose names are in the list are kept.
   * If excludeTools is set, matching tools are removed. excludeTools is applied after toolFilter.
   */
  private applyToolFiltering(
    tools: Record<string, Tool>,
    options: { toolFilter?: string[]; excludeTools?: string[] },
  ): Record<string, Tool> {
    if (
      (!options.toolFilter || options.toolFilter.length === 0) &&
      (!options.excludeTools || options.excludeTools.length === 0)
    ) {
      return tools;
    }

    const beforeCount = Object.keys(tools).length;
    let filtered = { ...tools };

    if (options.toolFilter && options.toolFilter.length > 0) {
      const allowSet = new Set(options.toolFilter);
      const result: Record<string, Tool> = {};
      for (const [name, tool] of Object.entries(filtered)) {
        if (allowSet.has(name)) {
          result[name] = tool;
        }
      }
      filtered = result;
    }

    if (options.excludeTools && options.excludeTools.length > 0) {
      const denySet = new Set(options.excludeTools);
      for (const name of Object.keys(filtered)) {
        if (denySet.has(name)) {
          delete filtered[name];
        }
      }
    }

    const afterCount = Object.keys(filtered).length;
    if (beforeCount !== afterCount) {
      logger.debug(`Tool filtering applied`, {
        provider: this.providerName,
        beforeCount,
        afterCount,
        toolFilter: options.toolFilter,
        excludeTools: options.excludeTools,
      });
    }

    return filtered;
  }

  /**
   * Prepare generation context including tools and model
   */
  private async prepareGenerationContext(
    options: TextGenerationOptions,
  ): Promise<{
    tools: Record<string, Tool>;
    model: LanguageModel;
  }> {
    const shouldUseTools = !options.disableTools && this.supportsTools();
    const baseTools = shouldUseTools ? await this.getAllTools() : {};
    let tools = shouldUseTools
      ? {
          ...baseTools,
          ...(options.tools || {}),
        }
      : {};

    // Apply per-call tool filtering (whitelist/blacklist)
    tools = this.applyToolFiltering(tools, options);

    logger.debug(`Final tools prepared for AI`, {
      provider: this.providerName,
      directTools: getKeyCount(baseTools),
      directToolNames: getKeysAsString(baseTools),
      externalTools: getKeyCount(options.tools || {}),
      externalToolNames: getKeysAsString(options.tools || {}),
      totalTools: getKeyCount(tools),
      totalToolNames: getKeysAsString(tools),
      shouldUseTools,
      timestamp: Date.now(),
    });

    const model = await this.getAISDKModelWithMiddleware(options);
    return { tools, model };
  }

  /**
   * Get merged tools for streaming: combines base tools (MCP/built-in) with
   * user-provided tools (e.g., RAG tools passed via options.tools).
   *
   * This is the canonical tool-merge pattern for executeStream() implementations.
   * All providers should call this instead of getAllTools() directly.
   */
  protected async getToolsForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<Record<string, Tool>> {
    const shouldUseTools = !options.disableTools && this.supportsTools();
    if (!shouldUseTools) {
      return {};
    }
    const baseTools = await this.getAllTools();
    const externalTools = (options.tools || {}) as Record<string, Tool>;
    let merged = { ...baseTools, ...externalTools };

    // Apply per-call tool filtering (whitelist/blacklist)
    merged = this.applyToolFiltering(merged, options);

    logger.debug(`Tools prepared for streaming`, {
      provider: this.providerName,
      baseToolCount: Object.keys(baseTools).length,
      externalToolCount: Object.keys(externalTools).length,
      totalToolCount: Object.keys(merged).length,
    });

    return merged;
  }

  /**
   * Build messages array for generation - delegated to MessageBuilder
   */
  private async buildMessages(
    options: TextGenerationOptions,
  ): Promise<ModelMessage[]> {
    return this.messageBuilder.buildMessages(options);
  }

  /**
   * Build messages array for streaming operations - delegated to MessageBuilder
   * This is a protected helper method that providers can use to build messages
   * with automatic multimodal detection, eliminating code duplication
   *
   * @param options - Stream options or text generation options
   * @returns Promise resolving to ModelMessage array ready for AI SDK
   */
  protected async buildMessagesForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<ModelMessage[]> {
    return this.messageBuilder.buildMessagesForStream(options);
  }

  /**
   * Execute the generation with AI SDK - delegated to GenerationHandler
   */
  private async executeGeneration(
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<Awaited<ReturnType<typeof generateText>>> {
    return this.generationHandler.executeGeneration(
      model,
      messages,
      tools,
      options,
    );
  }

  /**
   * Log generation completion information - delegated to GenerationHandler
   */
  private logGenerationComplete(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): void {
    this.generationHandler.logGenerationComplete(generateResult);
  }

  /**
   * Record performance metrics - delegated to TelemetryHandler
   */
  private async recordPerformanceMetrics(
    usage:
      | { inputTokens: number | undefined; outputTokens: number | undefined }
      | undefined,
    responseTime: number,
  ): Promise<void> {
    await this.telemetryHandler.recordPerformanceMetrics(usage, responseTime);
  }

  /**
   * Extract tool information from generation result - delegated to GenerationHandler
   */
  private extractToolInformation(
    generateResult: Awaited<ReturnType<typeof generateText>>,
  ): {
    toolsUsed: string[];
    toolExecutions: Array<{
      name: string;
      input: StandardRecord;
      output: unknown;
    }>;
  } {
    return this.generationHandler.extractToolInformation(generateResult);
  }

  /**
   * Format the enhanced result - delegated to GenerationHandler
   */
  private formatEnhancedResult(
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
    return this.generationHandler.formatEnhancedResult(
      generateResult,
      tools,
      toolsUsed,
      toolExecutions,
      options,
    );
  }

  /**
   * Analyze AI response structure and log detailed debugging information - delegated to GenerationHandler
   */
  private analyzeAIResponse(result: Record<string, unknown>): void {
    this.generationHandler.analyzeAIResponse(result);
  }

  /**
   * Text generation method - implements AIProvider interface
   * Tools are always available unless explicitly disabled
   *
   * Supports Text-to-Speech (TTS) audio generation in two modes:
   * 1. Direct synthesis (default): TTS synthesizes the input text without AI generation
   * 2. AI response synthesis: TTS synthesizes the AI-generated response after generation
   *
   * When TTS is enabled with useAiResponse=false (default), the method returns early with
   * only the audio result, skipping AI generation entirely for optimal performance.
   *
   * When TTS is enabled with useAiResponse=true, the method performs full AI generation
   * and then synthesizes the AI response to audio.
   *
   * @param optionsOrPrompt - Generation options or prompt string
   * @param _analysisSchema - Optional analysis schema (not used)
   * @returns Enhanced result with optional audio field containing TTSResult
   *
   * IMPLEMENTATION NOTE: Uses streamText() under the hood and accumulates results
   * for consistency and better performance
   */
  async generate(
    optionsOrPrompt: TextGenerationOptions | string,
    _analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    const options = this.normalizeTextOptions(optionsOrPrompt);
    this.validateOptions(options);
    const startTime = Date.now();

    // OTEL span for provider-level generate tracing
    // Use startActiveSpan pattern via context.with() so child spans become descendants
    const otelSpan = tracers.provider.startSpan("neurolink.provider.generate", {
      kind: SpanKind.CLIENT,
      attributes: {
        [ATTR.GEN_AI_SYSTEM]: this.providerName || "unknown",
        [ATTR.GEN_AI_MODEL]: this.modelName || options.model || "unknown",
        [ATTR.GEN_AI_OPERATION]: "generate",
        [ATTR.NL_PROVIDER]: this.providerName || "unknown",
      },
    });
    // Set this span as the active context so child spans (GenerationHandler, etc.) become descendants
    const activeCtx = trace.setSpan(context.active(), otelSpan);
    const otelSpanState = { ended: false };

    return await context.with(activeCtx, async () =>
      this.runGenerateInActiveContext(
        options,
        startTime,
        otelSpan,
        otelSpanState,
      ),
    );
  }
  /**
   * Alias for generate method - implements AIProvider interface
   */
  async gen(
    optionsOrPrompt: TextGenerationOptions | string,
    analysisSchema?: ValidationSchema,
  ): Promise<EnhancedGenerateResult | null> {
    return this.generate(optionsOrPrompt, analysisSchema);
  }

  private async runGenerateInActiveContext(
    options: TextGenerationOptions,
    startTime: number,
    otelSpan: ReturnType<typeof tracers.provider.startSpan>,
    otelSpanState: { ended: boolean },
  ): Promise<EnhancedGenerateResult | null> {
    try {
      if (options.output?.mode === "video") {
        return await this.handleVideoGeneration(options, startTime);
      }

      const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
        this.modelName.includes(m),
      );
      const requestsNonImageOutput =
        options.output?.format === "json" ||
        options.output?.format === "structured" ||
        options.output?.format === "text";
      if (isImageModel && !requestsNonImageOutput) {
        logger.info(
          `Image generation model detected, routing to executeImageGeneration`,
          {
            provider: this.providerName,
            model: this.modelName,
          },
        );

        const imageResult = await this.executeImageGeneration(options);
        return await this.enhanceResult(imageResult, options, startTime);
      }

      if (options.tts?.enabled && !options.tts?.useAiResponse) {
        return this.handleDirectTTSSynthesis(options, startTime);
      }

      const { tools, model } = await this.prepareGenerationContext(options);
      const messages = await this.buildMessages(options);
      const videoFrameResult = await this.handleVideoFrameGeneration(
        options,
        messages,
        model,
        startTime,
      );
      if (videoFrameResult) {
        return videoFrameResult;
      }

      return await this.executeStandardGenerateFlow(
        options,
        startTime,
        model,
        messages,
        tools,
      );
    } catch (error) {
      otelSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      otelSpan.end();
      otelSpanState.ended = true;

      if (isAbortError(error)) {
        logger.info(`Generate aborted for ${this.providerName}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        logger.error(`Generate failed for ${this.providerName}:`, error);
      }
      throw this.handleProviderError(error);
    } finally {
      if (!otelSpanState.ended) {
        otelSpan.setStatus({ code: SpanStatusCode.OK });
        otelSpan.end();
      }
    }
  }

  private async handleDirectTTSSynthesis(
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    const textToSynthesize = options.prompt ?? options.input?.text ?? "";
    const baseResult: EnhancedGenerateResult = {
      content: textToSynthesize,
      provider: options.provider ?? this.providerName,
      model: this.modelName,
      usage: { input: 0, output: 0, total: 0 },
    };

    try {
      if (!options.tts) {
        return this.enhanceResult(baseResult, options, startTime);
      }
      baseResult.audio = await TTSProcessor.synthesize(
        textToSynthesize,
        options.provider ?? this.providerName,
        options.tts,
      );
    } catch (ttsError) {
      logger.error(
        `TTS synthesis failed in Mode 1 (direct input synthesis):`,
        ttsError,
      );
    }

    return this.enhanceResult(baseResult, options, startTime);
  }

  private async handleVideoFrameGeneration(
    options: TextGenerationOptions,
    messages: ModelMessage[],
    model: LanguageModel,
    startTime: number,
  ): Promise<EnhancedGenerateResult | null> {
    if (!hasVideoFrames(messages)) {
      return null;
    }
    // Bug 2 fix: callers requesting structured output (schema or explicit
    // output.format) must NOT be hijacked into the prose-returning video
    // analysis path. Without this gate, schema/format are silently dropped
    // whenever messages contain >=3 image parts.
    if (options.schema !== undefined || options.output?.format !== undefined) {
      logger.info(
        "[VideoFrameGen] Skipping video-frame analysis route; caller requested structured output",
        {
          provider: this.providerName,
          model: this.modelName,
          hasSchema: options.schema !== undefined,
          outputFormat: options.output?.format,
        },
      );
      return null;
    }

    const videoAnalysisResult = await executeVideoAnalysis(messages, {
      provider: options.provider,
      providerName: this.providerName,
      region: options.region,
    });
    const userText = messages
      .filter((m) => m.role === "user")
      .flatMap((m) =>
        Array.isArray(m.content)
          ? m.content
              .filter(
                (p): p is { type: "text"; text: string } => p.type === "text",
              )
              .map((p) => p.text)
          : [typeof m.content === "string" ? m.content : ""],
      )
      .filter(Boolean)
      .join("\n")
      .trim();

    let formattedContent = videoAnalysisResult;
    let usage = { input: 0, output: 0, total: 0 };

    if (options.systemPrompt) {
      try {
        const formattingPrompt = userText
          ? `The user asked: "${userText}"\n\nHere is the video/image analysis result from the visual analysis system:\n\n${videoAnalysisResult}\n\nBased on this analysis, provide your response.`
          : `Here is a video/image analysis result from the visual analysis system:\n\n${videoAnalysisResult}\n\nBased on this analysis, provide your response.`;

        logger.debug("[VideoAnalysis] Formatting via Claude", {
          userTextLength: userText.length,
          analysisLength: videoAnalysisResult.length,
        });

        const formattedResult = await generateText({
          model,
          system: options.systemPrompt,
          messages: [{ role: "user" as const, content: formattingPrompt }],
          maxOutputTokens: options.maxTokens || 8192,
          temperature: 0.3,
          abortSignal: options.abortSignal,
          experimental_telemetry: this.telemetryHandler?.getTelemetryConfig(
            options,
            "generate",
          ),
        });
        formattedContent = formattedResult.text;
        usage = {
          input: formattedResult.usage?.inputTokens || 0,
          output: formattedResult.usage?.outputTokens || 0,
          total:
            (formattedResult.usage?.inputTokens || 0) +
            (formattedResult.usage?.outputTokens || 0),
        };

        logger.debug("[VideoAnalysis] Claude formatting complete", {
          formattedLength: formattedContent.length,
          usage,
        });
      } catch (error) {
        logger.warn(
          "[VideoAnalysis] Claude formatting failed, using raw Gemini output",
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    return this.enhanceResult(
      {
        content: formattedContent,
        provider: options.provider ?? this.providerName,
        model: this.modelName,
        usage,
      },
      options,
      startTime,
    );
  }

  private async executeStandardGenerateFlow(
    options: TextGenerationOptions,
    startTime: number,
    model: LanguageModel,
    messages: ModelMessage[],
    tools: Record<string, Tool>,
  ): Promise<EnhancedGenerateResult> {
    const timeoutController = createTimeoutController(
      options.timeout,
      this.providerName,
      "generate",
    );
    const composedSignal = composeAbortSignals(
      options.abortSignal,
      timeoutController?.controller.signal,
    );
    const composedOptions = composedSignal
      ? { ...options, abortSignal: composedSignal }
      : options;

    let generateResult: Awaited<ReturnType<typeof generateText>>;
    try {
      generateResult = await this.executeGeneration(
        model,
        messages,
        tools,
        composedOptions,
      );
    } finally {
      timeoutController?.cleanup();
    }

    this.analyzeAIResponse(
      generateResult as unknown as Record<string, unknown>,
    );
    this.logGenerationComplete(generateResult);
    const responseTime = Date.now() - startTime;
    await this.recordPerformanceMetrics(generateResult.usage, responseTime);

    const { toolsUsed, toolExecutions } =
      this.extractToolInformation(generateResult);
    let enhancedResult = this.formatEnhancedResult(
      generateResult,
      tools,
      toolsUsed,
      toolExecutions,
      options,
    );
    enhancedResult = await this.synthesizeAIResponseIfNeeded(
      enhancedResult,
      options,
    );

    return this.enhanceResult(enhancedResult, options, startTime);
  }

  private async synthesizeAIResponseIfNeeded(
    enhancedResult: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    if (!options.tts?.enabled || !options.tts?.useAiResponse) {
      return enhancedResult;
    }

    const aiResponse = enhancedResult.content;
    const provider = options.provider ?? this.providerName;
    if (!aiResponse || !provider) {
      logger.warn(`TTS synthesis skipped despite being enabled`, {
        provider: this.providerName,
        hasAiResponse: !!aiResponse,
        aiResponseLength: aiResponse?.length ?? 0,
        hasProvider: !!provider,
        ttsConfig: {
          enabled: options.tts?.enabled,
          useAiResponse: options.tts?.useAiResponse,
        },
        reason: !aiResponse
          ? "AI response is empty or undefined"
          : "Provider is missing",
      });
      return enhancedResult;
    }

    try {
      const ttsResult = await TTSProcessor.synthesize(
        aiResponse,
        provider,
        options.tts,
      );
      return {
        ...enhancedResult,
        audio: ttsResult,
      };
    } catch (ttsError) {
      logger.error(
        `TTS synthesis failed in Mode 2 (AI response synthesis):`,
        ttsError,
      );
      return enhancedResult;
    }
  }

  /**
   * BACKWARD COMPATIBILITY: Legacy generateText method
   * Converts EnhancedGenerateResult to TextGenerationResult format
   * Ensures existing scripts using createAIProvider().generateText() continue to work
   */
  async generateText(
    options: TextGenerationOptions,
  ): Promise<TextGenerationResult> {
    // Validate required parameters for backward compatibility - support both prompt and input.text
    const promptText = options.prompt || options.input?.text;
    if (
      !promptText ||
      typeof promptText !== "string" ||
      promptText.trim() === ""
    ) {
      throw new Error(
        "GenerateText options must include prompt or input.text as a non-empty string",
      );
    }

    // Call the main generate method
    const result = await this.generate(options);

    if (!result) {
      throw new Error("Generation failed: No result returned");
    }

    // Convert EnhancedGenerateResult to TextGenerationResult format
    return {
      content: result.content || "",
      provider: result.provider || this.providerName,
      model: result.model || this.modelName,
      usage: result.usage || {
        input: 0,
        output: 0,
        total: 0,
      },
      responseTime: 0, // BaseProvider doesn't track response time directly
      toolsUsed: result.toolsUsed || [],
      // Map toolExecutions from EnhancedGenerateResult shape to TextGenerationResult shape
      // Preserve original timing/status fields when present, fall back to safe defaults
      toolExecutions: result.toolExecutions?.map((te) => {
        const t = te as Record<string, unknown>;
        return {
          // Spread original fields first so normalized fields take precedence
          ...te,
          toolName: te.name,
          executionTime:
            typeof t.executionTime === "number"
              ? t.executionTime
              : typeof t.duration === "number"
                ? t.duration
                : 0,
          success:
            typeof t.success === "boolean"
              ? t.success
              : t.status === undefined || t.status === "success",
        };
      }),
      enhancedWithTools: !!(result.toolsUsed && result.toolsUsed.length > 0),
      analytics: result.analytics,
      evaluation: result.evaluation,
      audio: result.audio,
    };
  }

  /**
   * Generate embeddings for text
   *
   * This is a default implementation that throws an error.
   * Providers that support embeddings (OpenAI, Google Vertex, Amazon Bedrock)
   * should override this method with their specific implementation.
   *
   * @param text - The text to embed
   * @param _modelName - Optional embedding model name (provider-specific)
   * @returns Promise resolving to the embedding vector (array of numbers)
   * @throws Error if the provider does not support embeddings
   *
   * @example
   * ```typescript
   * const provider = await ProviderFactory.createProvider('openai', 'text-embedding-3-small');
   * const embedding = await provider.embed('Hello world');
   * console.log(embedding); // [0.123, -0.456, ...]
   * ```
   */
  async embed(text: string, _modelName?: string): Promise<number[]> {
    logger.warn(
      `embed() called on ${this.providerName} which does not have a native implementation`,
      {
        textLength: text.length,
      },
    );
    throw new Error(
      `Embedding generation is not supported by the ${this.providerName} provider. ` +
        `Supported providers: openai, vertex/google, bedrock. ` +
        `Use an embedding model like text-embedding-3-small (OpenAI), text-embedding-004 (Vertex), ` +
        `or amazon.titan-embed-text-v2:0 (Bedrock).`,
    );
  }

  /**
   * Generate embeddings for multiple texts in a single batch
   *
   * This is a default implementation that throws an error.
   * Providers that support embeddings should override this method.
   * The AI SDK's embedMany automatically handles chunking for models with batch limits.
   *
   * @param texts - The texts to embed
   * @param _modelName - Optional embedding model name (provider-specific)
   * @returns Promise resolving to an array of embedding vectors
   * @throws Error if the provider does not support embeddings
   */
  async embedMany(texts: string[], _modelName?: string): Promise<number[][]> {
    logger.warn(
      `embedMany() called on ${this.providerName} which does not have a native implementation`,
      {
        count: texts.length,
      },
    );
    throw new Error(
      `Batch embedding generation is not supported by the ${this.providerName} provider. ` +
        `Supported providers: openai, googleAiStudio, vertex/google, bedrock. ` +
        `Use an embedding model like text-embedding-3-small (OpenAI), gemini-embedding-001 (Google AI), ` +
        `text-embedding-004 (Vertex), or amazon.titan-embed-text-v2:0 (Bedrock).`,
    );
  }

  /**
   * Get the default embedding model for this provider
   *
   * Override in subclasses to provide provider-specific defaults.
   * Returns undefined for providers that don't support embeddings.
   *
   * @returns The default embedding model name, or undefined if not supported
   */
  protected getDefaultEmbeddingModel(): string | undefined {
    // Default implementation returns undefined - providers override this
    return undefined;
  }

  // ===================
  // ===================
  // BZ-665: Schema-driven tool call repair
  // ===================

  /**
   * Create an `experimental_repairToolCall` handler for streamText/generateText.
   * Dynamically reads the tool's JSON schema to repair wrong names and params.
   * Returns undefined when repair is disabled via options.
   */
  protected getToolCallRepairFn(
    options?: StreamOptions | TextGenerationOptions,
  ): ToolCallRepairFunction<ToolSet> | undefined {
    if (
      (options as Record<string, unknown> | undefined)?.disableToolCallRepair
    ) {
      return undefined;
    }
    // Lazy import to avoid circular dependency at module load time
    return (async (...args: Parameters<ToolCallRepairFunction<ToolSet>>) => {
      const { createToolCallRepair } =
        await import("../utils/toolCallRepair.js");
      return createToolCallRepair()(...args);
    }) as ToolCallRepairFunction<ToolSet>;
  }

  // ABSTRACT METHODS - MUST BE IMPLEMENTED BY SUBCLASSES
  // ===================

  /**
   * Provider-specific streaming implementation (only used when tools are disabled)
   */
  protected abstract executeStream(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult>;

  /**
   * Get the provider name
   */
  protected abstract getProviderName(): AIProviderName;

  /**
   * Get the default model for this provider
   */
  protected abstract getDefaultModel(): string;

  /**
   * REQUIRED: Every provider MUST implement this method
   * Returns the Vercel AI SDK model instance for this provider
   */
  protected abstract getAISDKModel(): LanguageModel | Promise<LanguageModel>;

  /**
   * Get AI SDK model with middleware applied
   * This method wraps the base model with any configured middleware
   * TODO: Implement global level middlewares that can be used
   */
  protected async getAISDKModelWithMiddleware(
    options: TextGenerationOptions | StreamOptions = {},
  ): Promise<LanguageModel> {
    // Get the base model
    const baseModel = await this.getAISDKModel();

    logger.debug(`Retrieved base model for ${this.providerName}`, {
      provider: this.providerName,
      model: this.modelName,
      hasMiddlewareConfig: !!this.middlewareOptions,
      timestamp: Date.now(),
    });

    // Check if middleware should be applied
    const middlewareOptions = this.extractMiddlewareOptions(options);

    logger.debug(`Middleware extraction result`, {
      provider: this.providerName,
      model: this.modelName,
      middlewareOptions,
    });

    if (!middlewareOptions) {
      return baseModel;
    }

    try {
      logger.debug(`Applying middleware to ${this.providerName} model`, {
        provider: this.providerName,
        model: this.modelName,
        middlewareOptions,
      });
      // Create a new factory instance with the specified options
      const factory = new MiddlewareFactory(middlewareOptions);

      // Create middleware context
      const context = factory.createContext(
        this.providerName,
        this.modelName,
        options as Record<string, unknown>,
        {
          sessionId: this.sessionId,
          userId: this.userId,
        },
      );

      // Apply middleware to the model
      const wrappedModel = factory.applyMiddleware(
        baseModel,
        context,
        middlewareOptions,
      );

      logger.debug(`Applied middleware to ${this.providerName} model`, {
        provider: this.providerName,
        model: this.modelName,
        hasMiddleware: true,
      });

      return wrappedModel;
    } catch (error) {
      logger.warn(
        `Failed to apply middleware to ${this.providerName}, using base model`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );

      // Return base model on middleware failure to maintain functionality
      return baseModel;
    }
  }

  /**
   * Extract middleware options - delegated to Utilities
   */
  private extractMiddlewareOptions(
    options: TextGenerationOptions | StreamOptions,
  ): MiddlewareFactoryOptions | null {
    return this.utilities.extractMiddlewareOptions(options);
  }

  // ===================
  // TOOL MANAGEMENT
  // ===================

  /**
   * Check if a schema is a Zod schema - delegated to Utilities
   */
  private isZodSchema(schema: unknown): boolean {
    return this.utilities.isZodSchema(schema);
  }

  /**
   * Convert tool execution result - delegated to Utilities
   */
  private async convertToolResult(result: unknown): Promise<unknown> {
    return this.utilities.convertToolResult(result);
  }

  /**
   * Fix JSON Schema for OpenAI strict mode - delegated to Utilities
   */
  private fixSchemaForOpenAIStrictMode(
    schema: Record<string, unknown>,
  ): Record<string, unknown> {
    return this.utilities.fixSchemaForOpenAIStrictMode(schema);
  }

  /**
   * Get all available tools - delegated to ToolsManager
   */
  protected async getAllTools(): Promise<Record<string, Tool>> {
    return this.toolsManager.getAllTools();
  }

  /**
   * Calculate actual cost - delegated to TelemetryHandler
   */
  private async calculateActualCost(usage: {
    inputTokens?: number | undefined;
    outputTokens?: number | undefined;
  }): Promise<number> {
    return this.telemetryHandler.calculateActualCost(usage);
  }

  /**
   * Create a permissive Zod schema - delegated to Utilities
   */
  private createPermissiveZodSchema(): ZodUnknownSchema {
    return this.utilities.createPermissiveZodSchema();
  }

  /**
   * Set session context for MCP tools - delegated to ToolsManager
   */
  public setSessionContext(sessionId?: string, userId?: string): void {
    this.sessionId = sessionId;
    this.userId = userId;
    this.toolsManager.setSessionContext(sessionId, userId);
  }

  /**
   * Provider-specific error formatting.
   * Subclasses implement this to produce human-readable error messages
   * (e.g., "❌ Google Vertex AI Provider Error\n\n...").
   */
  protected abstract formatProviderError(error: unknown): Error;

  /**
   * Handle provider errors with abort passthrough.
   * AbortErrors are never wrapped — they must propagate with their
   * original identity so that isAbortError() can detect them in
   * retry/fallback loops (directProviderGeneration, performMCPGenerationRetries).
   */
  protected handleProviderError(error: unknown): Error {
    if (isAbortError(error)) {
      // Preserve AbortError identity — never wrap in provider-specific formatting
      return error instanceof Error
        ? error
        : new DOMException("The operation was aborted", "AbortError");
    }
    const formatted = this.formatProviderError(error);

    // P3 fix: Classify error and set error.type on the active OTel span
    try {
      const activeSpan = trace.getSpan(context.active());
      if (activeSpan) {
        let errorType = "provider_error";
        const errName = formatted?.constructor?.name ?? "";
        if (errName === "RateLimitError") {
          errorType = "rate_limit";
        } else if (errName === "AuthenticationError") {
          errorType = "auth_failure";
        } else if (errName === "NetworkError") {
          errorType = "network";
        } else if (errName === "InvalidModelError") {
          errorType = "invalid_model";
        } else if (errName === "TimeoutError") {
          errorType = "timeout";
        }
        activeSpan.setAttribute("error.type", errorType);
        if (formatted instanceof Error) {
          activeSpan.setAttribute(
            "error.message",
            formatted.message.substring(0, 500),
          );
        }
      }
    } catch {
      // Non-blocking — telemetry failures shouldn't mask the original error
    }

    return formatted;
  }

  /**
   * Image generation method. Providers that support it should override this.
   * By default, it throws an error indicating that the functionality is not supported.
   * @param _options The generation options.
   * @returns A promise that resolves to the generation result.
   */
  protected async executeImageGeneration(
    _options: TextGenerationOptions,
  ): Promise<EnhancedGenerateResult> {
    throw new Error(
      `Image generation is not supported by the ${this.providerName} provider or the selected model.`,
    );
  }

  // ===================
  // CONSOLIDATED PROVIDER METHODS - MOVED FROM INDIVIDUAL PROVIDERS
  // ===================

  /**
   * Execute operation with timeout and proper cleanup
   * Consolidates identical timeout handling from 8/10 providers
   */
  protected async executeWithTimeout<T>(
    operation: () => Promise<T>,
    options: { timeout?: number | string; operationType?: string },
  ): Promise<T> {
    const timeout = this.getTimeout(
      options as StreamOptions | TextGenerationOptions,
    );
    const timeoutController = createTimeoutController(
      timeout,
      this.providerName,
      (options.operationType as "generate" | "stream") || "generate",
    );

    try {
      if (timeoutController) {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) => {
            timeoutController.controller.signal.addEventListener(
              "abort",
              () => {
                reject(
                  new TimeoutError(
                    `${this.providerName} operation timed out`,
                    timeoutController.timeoutMs,
                    this.providerName,
                    (options.operationType as "generate" | "stream") ||
                      "generate",
                  ),
                );
              },
            );
          }),
        ]);
      } else {
        return await operation();
      }
    } finally {
      timeoutController?.cleanup();
    }
  }

  /**
   * Validate stream options - delegated to StreamHandler
   */
  protected validateStreamOptions(options: StreamOptions): void {
    this.streamHandler.validateStreamOptions(options);
  }

  /**
   * Create text stream transformation - delegated to StreamHandler.
   * Reviewer follow-up: forwards the optional `getUnderlyingError`
   * callback so providers can capture upstream errors via
   * `streamText`'s `onError` and have them flow into the
   * NoOutputGeneratedError sentinel's `providerError` /
   * `modelResponseRaw`.
   */
  protected createTextStream(
    result: {
      textStream: AsyncIterable<string>;
      finishReason?: Promise<unknown> | unknown;
      totalUsage?: Promise<unknown> | unknown;
    },
    getUnderlyingError?: () => unknown,
  ): AsyncGenerator<
    { content: string } | import("../types/index.js").StreamNoOutputSentinel
  > {
    return this.streamHandler.createTextStream(result, getUnderlyingError);
  }

  /**
   * Create standardized stream result - delegated to StreamHandler
   */
  protected createStreamResult(
    stream: AsyncGenerator<{ content: string }>,
    additionalProps: Partial<StreamResult> = {},
  ): StreamResult {
    return this.streamHandler.createStreamResult(stream, additionalProps);
  }

  /**
   * Create stream analytics - delegated to StreamHandler
   */
  protected async createStreamAnalytics(
    result: UnknownRecord,
    startTime: number,
    options: StreamOptions,
  ): Promise<UnknownRecord | undefined> {
    return this.streamHandler.createStreamAnalytics(result, startTime, options);
  }

  /**
   * Handle common error patterns - delegated to Utilities
   */
  protected handleCommonErrors(error: unknown): Error | null {
    return this.utilities.handleCommonErrors(error);
  }

  /**
   * Set up tool executor - delegated to ToolsManager
   * @param sdk - The NeuroLinkSDK instance for tool execution
   * @param functionTag - Function name for logging
   */
  setupToolExecutor(
    sdk: {
      customTools: Map<string, unknown>;
      executeTool: (toolName: string, params: unknown) => Promise<unknown>;
    },
    functionTag: string,
  ): void {
    this.toolsManager.setupToolExecutor(sdk, functionTag);
  }

  // ===================
  // TEMPLATE METHODS - COMMON FUNCTIONALITY
  // ===================

  /**
   * Normalize text generation options - delegated to Utilities
   */
  protected normalizeTextOptions(
    optionsOrPrompt: TextGenerationOptions | string,
  ): TextGenerationOptions {
    return this.utilities.normalizeTextOptions(optionsOrPrompt);
  }

  /**
   * Normalize stream options - delegated to Utilities
   */
  protected normalizeStreamOptions(
    optionsOrPrompt: StreamOptions | string,
  ): StreamOptions {
    return this.utilities.normalizeStreamOptions(optionsOrPrompt);
  }

  protected async enhanceResult(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    const responseTime = Date.now() - startTime;

    // CRITICAL FIX: Store imageOutput separately to ensure it's preserved
    const imageOutput = result.imageOutput;

    let enhancedResult = { ...result };

    if (options.enableAnalytics) {
      try {
        const analytics = await this.createAnalytics(
          result,
          responseTime,
          options,
        );
        // Preserve ALL fields including imageOutput when adding analytics
        enhancedResult = { ...enhancedResult, analytics, imageOutput };
      } catch (error) {
        logger.warn(
          `Analytics creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    if (options.enableEvaluation) {
      try {
        const evaluation = await this.createEvaluation(result, options);
        // Preserve ALL fields including imageOutput when adding evaluation
        enhancedResult = { ...enhancedResult, evaluation, imageOutput };
      } catch (error) {
        logger.warn(
          `Evaluation creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    // CRITICAL FIX: Always restore imageOutput if it existed in the original result
    if (imageOutput) {
      enhancedResult.imageOutput = imageOutput;
    }
    return enhancedResult;
  }

  /**
   * Handle video generation mode
   *
   * Generates video from input image + text prompt using Vertex AI Veo 3.1.
   *
   * @param options - Text generation options with video configuration
   * @param startTime - Generation start timestamp for metrics
   * @returns Enhanced result with video data
   *
   * @example
   * ```typescript
   * const result = await provider.generate({
   *   input: { text: "Product showcase", images: [imageBuffer] },
   *   output: { mode: "video", video: { resolution: "1080p" } }
   * });
   * // result.video contains the generated video
   * ```
   */
  private async handleVideoGeneration(
    options: TextGenerationOptions,
    startTime: number,
  ): Promise<EnhancedGenerateResult> {
    // Dynamic imports to avoid loading video dependencies unless needed
    const { generateVideoWithVertex, VideoError, VIDEO_ERROR_CODES } =
      await import("../adapters/video/vertexVideoHandler.js");
    const {
      validateVideoGenerationInput,
      validateImageForVideo,
      validateDirectorModeInput,
    } = await import("../utils/parameterValidation.js");
    const { ErrorFactory } = await import("../utils/errorHandling.js");

    // Build GenerateOptions for validation
    const generateOptions = {
      input: options.input || { text: options.prompt || "" },
      output: options.output,
      provider: options.provider,
      model: options.model,
    };

    // ===== DIRECTOR MODE =====
    // Route to Director pipeline when segments are provided
    if (
      generateOptions.input?.segments &&
      Array.isArray(generateOptions.input.segments) &&
      generateOptions.input.segments.length > 0
    ) {
      // Type narrowing: segments is guaranteed to exist here
      const segments = generateOptions.input.segments;

      const directorValidation = validateDirectorModeInput(generateOptions);
      if (!directorValidation.isValid) {
        throw ErrorFactory.invalidParameters(
          "director-mode",
          new Error(
            directorValidation.errors
              .map((e: { message: string }) => e.message)
              .join("; "),
          ),
          { errors: directorValidation.errors },
        );
      }

      if (directorValidation.warnings.length > 0) {
        for (const warning of directorValidation.warnings) {
          logger.warn(`Director Mode warning: ${warning}`);
        }
      }

      const { executeDirectorPipeline, DIRECTOR_PIPELINE_TIMEOUT_MS } =
        await import("../adapters/video/directorPipeline.js");

      // Use caller's timeout if provided, otherwise use default Director timeout
      const directorTimeout = options.timeout ?? DIRECTOR_PIPELINE_TIMEOUT_MS;

      const videoResult = await this.executeWithTimeout(
        () =>
          executeDirectorPipeline(
            segments,
            generateOptions.output?.video ?? {},
            generateOptions.output?.director ?? {},
            options.region,
          ),
        { timeout: directorTimeout, operationType: "generate" },
      );

      // Build content summary with metadata
      const joinedPrompts = generateOptions.input.segments
        .map((s: { prompt: string }) => s.prompt)
        .join(" → ");
      const segmentCount =
        videoResult.metadata?.segmentCount ??
        generateOptions.input.segments.length;
      const transitionCount =
        videoResult.metadata?.transitionCount ?? Math.max(0, segmentCount - 1);
      const totalDuration = videoResult.metadata?.duration ?? 0;
      const contentSummary = `${joinedPrompts} — duration: ${totalDuration}s, segments: ${segmentCount}, transitions: ${transitionCount}`;

      const baseResult: EnhancedGenerateResult = {
        content: contentSummary,
        provider: "vertex",
        model: options.model || "veo-3.1-generate-001",
        usage: { input: 0, output: 0, total: 0 },
        video: videoResult,
      };

      return await this.enhanceResult(baseResult, options, startTime);
    }

    // ===== STANDARD SINGLE-CLIP VIDEO GENERATION =====
    // Validate video generation input
    const validation = validateVideoGenerationInput(generateOptions);
    if (!validation.isValid) {
      throw ErrorFactory.invalidParameters(
        "video-generation",
        new Error(validation.errors.map((e) => e.message).join("; ")),
        { errors: validation.errors },
      );
    }

    // Log warnings if any
    if (validation.warnings.length > 0) {
      for (const warning of validation.warnings) {
        logger.warn(`Video generation warning: ${warning}`);
      }
    }

    // Extract image from input
    const imageInput = options.input?.images?.[0];
    if (!imageInput) {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message:
          "Video generation requires an input image. Provide via input.images array.",
        retriable: false,
        context: { field: "input.images" },
      });
    }

    // Timeout for image IO operations (15 seconds)
    const IMAGE_IO_TIMEOUT_MS = 15000;

    // Load image buffer if path/URL
    let imageBuffer: Buffer;
    if (typeof imageInput === "string") {
      if (
        imageInput.startsWith("http://") ||
        imageInput.startsWith("https://")
      ) {
        // URL - fetch the image with timeout
        logger.debug("Fetching image from URL for video generation", {
          url: imageInput.substring(0, 100),
        });
        let response: Response;
        try {
          response = await this.executeWithTimeout(() => fetch(imageInput), {
            timeout: IMAGE_IO_TIMEOUT_MS,
            operationType: "generate", // Part of video generation flow
          });
        } catch (error) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.INVALID_INPUT,
            message: `Failed to fetch image from URL: ${error instanceof Error ? error.message : "Request timed out"}`,
            retriable: true,
            context: { url: imageInput, timeout: IMAGE_IO_TIMEOUT_MS },
            originalError: error instanceof Error ? error : undefined,
          });
        }
        if (!response.ok) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.INVALID_INPUT,
            message: `Failed to fetch image from URL: ${response.status} ${response.statusText}`,
            retriable: response.status >= 500,
            context: { url: imageInput, status: response.status },
          });
        }
        imageBuffer = Buffer.from(await response.arrayBuffer());
      } else {
        // File path - read from disk with timeout
        logger.debug("Reading image from path for video generation", {
          path: imageInput,
        });
        const fs = await import("node:fs/promises");
        try {
          imageBuffer = await this.executeWithTimeout(
            () => fs.readFile(imageInput),
            { timeout: IMAGE_IO_TIMEOUT_MS, operationType: "generate" }, // Part of video generation flow
          );
        } catch (error) {
          throw new VideoError({
            code: VIDEO_ERROR_CODES.INVALID_INPUT,
            message: `Failed to read image file: ${error instanceof Error ? error.message : String(error)}`,
            retriable: false,
            context: { path: imageInput, timeout: IMAGE_IO_TIMEOUT_MS },
            originalError: error instanceof Error ? error : undefined,
          });
        }
      }
    } else if (Buffer.isBuffer(imageInput)) {
      imageBuffer = imageInput;
    } else if (typeof imageInput === "object" && "data" in imageInput) {
      // ImageWithAltText type
      const imgData = imageInput.data;
      if (typeof imgData === "string") {
        imageBuffer = Buffer.from(imgData, "base64");
      } else if (Buffer.isBuffer(imgData)) {
        imageBuffer = imgData;
      } else {
        throw new VideoError({
          code: VIDEO_ERROR_CODES.INVALID_INPUT,
          message: "ImageWithAltText.data must be a base64 string or Buffer.",
          retriable: false,
          context: { field: "input.images[0].data", type: typeof imgData },
        });
      }
    } else {
      throw new VideoError({
        code: VIDEO_ERROR_CODES.INVALID_INPUT,
        message:
          "Invalid image input type. Provide Buffer, path string, URL, or ImageWithAltText.",
        retriable: false,
        context: { field: "input.images[0]", type: typeof imageInput },
      });
    }

    // Validate image format and size (for Buffer inputs)
    const imageValidation = validateImageForVideo(imageBuffer);
    if (imageValidation) {
      throw ErrorFactory.invalidParameters(
        "video-generation",
        new Error(imageValidation.message),
        {
          field: "input.images[0]",
          validation: imageValidation,
        },
      );
    }

    // Get prompt text
    const prompt = options.prompt || options.input?.text || "";

    logger.info("Starting video generation", {
      provider: "vertex",
      model: options.model || "veo-3.1-generate-001",
      promptLength: prompt.length,
      imageSize: imageBuffer.length,
      resolution: options.output?.video?.resolution || "720p",
      duration: options.output?.video?.length || 6,
    });

    // Generate video using Vertex handler (no processor abstraction)
    const videoResult = await generateVideoWithVertex(
      imageBuffer,
      prompt,
      options.output?.video,
      options.region,
    );

    logger.info("Video generation complete", {
      videoSize: videoResult.data.length,
      duration: videoResult.metadata?.duration,
      processingTime: videoResult.metadata?.processingTime,
    });

    // Build result
    const baseResult: EnhancedGenerateResult = {
      content: prompt, // Echo the prompt as content
      provider: "vertex",
      model: options.model || "veo-3.1-generate-001",
      usage: { input: 0, output: 0, total: 0 },
      video: videoResult,
    };

    return await this.enhanceResult(baseResult, options, startTime);
  }

  /**
   * Create analytics - delegated to TelemetryHandler
   */
  protected async createAnalytics(
    result: EnhancedGenerateResult,
    responseTime: number,
    options: TextGenerationOptions,
  ): Promise<AnalyticsData> {
    return this.telemetryHandler.createAnalytics(
      result,
      responseTime,
      options.context,
    );
  }

  /**
   * Create evaluation - delegated to TelemetryHandler
   */
  protected async createEvaluation(
    result: EnhancedGenerateResult,
    options: TextGenerationOptions,
  ): Promise<EvaluationData> {
    return this.telemetryHandler.createEvaluation(result, options);
  }

  /**
   * Validate text generation options - delegated to Utilities
   */
  protected validateOptions(options: TextGenerationOptions): void {
    this.utilities.validateOptions(options);
  }

  /**
   * Get provider information - delegated to Utilities
   */
  protected getProviderInfo(): { provider: string; model: string } {
    return this.utilities.getProviderInfo();
  }

  /**
   * Get timeout value in milliseconds - delegated to Utilities
   */
  public getTimeout(options: TextGenerationOptions | StreamOptions): number {
    return this.utilities.getTimeout(options);
  }

  /**
   * Check if tool executions should be stored and handle storage
   */
  protected async handleToolExecutionStorage(
    toolCalls: unknown[],
    toolResults: unknown[],
    options: TextGenerationOptions | StreamOptions,
    currentTime: Date,
  ): Promise<void> {
    return this.telemetryHandler.handleToolExecutionStorage(
      toolCalls,
      toolResults,
      options,
      currentTime,
    );
  }

  /**
   * Utility method to chunk large prompts into smaller pieces
   * @param prompt The prompt to chunk
   * @param maxChunkSize Maximum size per chunk (default: 900,000 characters)
   * @param overlap Overlap between chunks to maintain context (default: 100 characters)
   * @returns Array of prompt chunks
   */
  static chunkPrompt(
    prompt: string,
    maxChunkSize: number = 900000,
    overlap: number = 100,
  ): string[] {
    if (prompt.length <= maxChunkSize) {
      return [prompt];
    }

    const chunks: string[] = [];
    let start = 0;

    while (start < prompt.length) {
      const end = Math.min(start + maxChunkSize, prompt.length);
      chunks.push(prompt.slice(start, end));

      // Break if we've reached the end
      if (end >= prompt.length) {
        break;
      }

      // Move start forward, accounting for overlap
      const nextStart = end - overlap;

      // Ensure we make progress (avoid infinite loops)
      if (nextStart <= start) {
        start = end;
      } else {
        start = Math.max(nextStart, 0);
      }
    }

    return chunks;
  }
}
