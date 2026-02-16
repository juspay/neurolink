import type { CoreMessage, generateText, LanguageModelV1, Tool } from "ai";
import { directAgentTools } from "../agent/directTools.js";
import type { AIProviderName } from "../constants/enums.js";
import { IMAGE_GENERATION_MODELS } from "../core/constants.js";
import type { EvaluationData } from "../index.js";
import { MiddlewareFactory } from "../middleware/factory.js";
import type { NeuroLink } from "../neurolink.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import type {
  AIProvider,
  AnalyticsData,
  EnhancedGenerateResult,
  TextGenerationOptions,
  TextGenerationResult,
} from "../types/index.js";
import type { MiddlewareFactoryOptions } from "../types/middlewareTypes.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type {
  StandardRecord,
  ValidationSchema,
  ZodUnknownSchema,
} from "../types/typeAliases.js";
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
import { GenerationHandler } from "./modules/GenerationHandler.js";
import {
  extractAndParseJSON,
  validateAgainstSchema,
  attemptRepair,
} from "../utils/structuredOutput.js";
// Import modules for composition
import { MessageBuilder } from "./modules/MessageBuilder.js";
import { StreamHandler } from "./modules/StreamHandler.js";
import { TelemetryHandler } from "./modules/TelemetryHandler.js";
import { ToolsManager } from "./modules/ToolsManager.js";
import { addToolContextToMessages, Utilities } from "./modules/Utilities.js";
import { shouldUseStructuredOutput } from "../utils/messageBuilder.js";
import type { GenerationResult } from "$lib/types/generateTypes.js";

/**
 * Abstract base class for all AI providers
 * Tools are integrated as first-class citizens - always available by default
 */
export abstract class BaseProvider implements AIProvider {
  protected readonly modelName: string;
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

  // Composition modules - Single Responsibility Principle
  private readonly messageBuilder: MessageBuilder;
  private readonly streamHandler: StreamHandler;
  private readonly generationHandler: GenerationHandler;
  protected readonly telemetryHandler: TelemetryHandler;
  private readonly utilities: Utilities;
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
    );
    this.telemetryHandler = new TelemetryHandler(
      this.providerName,
      this.modelName,
      this.neurolink,
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

    // 🔧 CRITICAL: Image generation models don't support real streaming
    // Force fake streaming for image models to ensure image output is yielded
    const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
      this.modelName.includes(m),
    );

    if (isImageModel) {
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
      logger.warn(
        `Real streaming failed for ${this.providerName}, falling back to fake streaming:`,
        {
          error:
            realStreamError instanceof Error
              ? realStreamError.message
              : String(realStreamError),
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
        disableTools: false,
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
    model: LanguageModelV1;
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
  ): Promise<CoreMessage[]> {
    return this.messageBuilder.buildMessages(options);
  }

  /**
   * Build messages array for streaming operations - delegated to MessageBuilder
   * This is a protected helper method that providers can use to build messages
   * with automatic multimodal detection, eliminating code duplication
   *
   * @param options - Stream options or text generation options
   * @returns Promise resolving to CoreMessage array ready for AI SDK
   */
  protected async buildMessagesForStream(
    options: StreamOptions | TextGenerationOptions,
  ): Promise<CoreMessage[]> {
    return this.messageBuilder.buildMessagesForStream(options);
  }

  /**
   * Execute the generation with AI SDK
   * Routes to standard or structured output generation based on schema presence
   */
  private async executeGeneration(
    model: LanguageModelV1,
    messages: CoreMessage[],
    tools: Record<string, Tool>,
    options: TextGenerationOptions,
  ): Promise<GenerationResult> {
    // Execute initial generation (Phase 1 for structured output, final for standard)
    const initialGenerationResult =
      await this.generationHandler.executeGeneration(
        model,
        messages,
        tools,
        options,
      );

    // If no valid schema, return standard generation result
    if (
      !shouldUseStructuredOutput({
        schema: options.schema,
        output: options.output,
      })
    ) {
      return { ...initialGenerationResult, structuredOutputAchieved: false };
    }

    // Schema is valid - proceed with structured output orchestration (Phases 1-3)
    return this.executeStructuredOutputGeneration(
      model,
      messages,
      initialGenerationResult,
      options.schema as ZodUnknownSchema,
      options,
    );
  }

  /**
   * Execute 3-phase structured output orchestration
   *
   * Phase 1: Extract & validate JSON from initial generation (85-90% success, 1x cost)
   * Phase 2: Repair if feasible (60-80% success, 1.2x cost)
   * Phase 3: generateObject guaranteed (100% success, 2x cost)
   *
   * Average cost: ~1.15x baseline (vs 2x naive approach)
   *
   * @param model - Language model instance
   * @param messages - Original messages from Phase 1 to preserve conversation context
   * @param initialGenerationResult - Result from Phase 1 generateText call
   * @param schema - Zod schema for validation
   * @returns Validated structured output with success indicator
   */
  private async executeStructuredOutputGeneration(
    model: LanguageModelV1,
    messages: CoreMessage[],
    initialGenerationResult: Awaited<ReturnType<typeof generateText>>,
    schema: ZodUnknownSchema,
    options: TextGenerationOptions,
  ): Promise<GenerationResult> {
    // ===== PHASE 1: Try extracting & validating JSON from initial generation =====
    logger.debug(
      `[BaseProvider] Phase 1: Attempting JSON extraction from initial generation`,
      {
        provider: this.providerName,
        model: this.modelName,
      },
    );

    // Extract JSON (handles markdown fences, brace-balanced, etc.)
    const parsed = extractAndParseJSON(initialGenerationResult.text);

    // Validate against schema
    const validation = validateAgainstSchema(parsed, schema);

    if (validation.success) {
      logger.info(
        `[BaseProvider] Phase 1: Success - JSON extracted and validated`,
        {
          provider: this.providerName,
          model: this.modelName,
        },
      );

      return {
        ...initialGenerationResult,
        text: JSON.stringify(parsed),
        structuredOutputAchieved: true,
      };
    }

    // ===== PHASE 2: Try repair if validation failed =====
    logger.debug(`[BaseProvider] Phase 2: Attempting repair`, {
      provider: this.providerName,
      model: this.modelName,
      errorCount: validation.errors.length,
      errors: validation.errors,
    });

    const enhancedMessages = addToolContextToMessages(
      messages,
      initialGenerationResult.toolCalls || [],
      initialGenerationResult.toolResults || [],
    );

    const repairResult = await attemptRepair(
      model,
      parsed,
      schema,
      options,
      validation.errors,
      enhancedMessages,
    );

    if (repairResult.success && repairResult.json) {
      logger.info(`[BaseProvider] Phase 2: Success - JSON repaired`, {
        provider: this.providerName,
        model: this.modelName,
      });

      return {
        ...initialGenerationResult,
        text: JSON.stringify(repairResult.json),
        structuredOutputAchieved: true,
      };
    }

    logger.debug(`[BaseProvider] Phase 2: Repair failed`, {
      provider: this.providerName,
      model: this.modelName,
    });

    // ===== PHASE 3: With generateObject =====
    logger.info(
      `[BaseProvider] Phase 3: Using generateObject for guaranteed success`,
      {
        provider: this.providerName,
        model: this.modelName,
      },
    );

    // Use original messages to preserve full conversation context
    // Tool calls and results from Phase 1 are passed separately and will be added by executeObjectGeneration
    try {
      const phase3Result = await this.generationHandler.executeObjectGeneration(
        model,
        messages,
        schema,
        options,
        initialGenerationResult.toolCalls,
        initialGenerationResult.toolResults,
      );

      // Convert executeObjectGeneration result to generateText format
      return {
        ...initialGenerationResult,
        text: JSON.stringify(phase3Result.object),
        finishReason: phase3Result.finishReason,
        usage: phase3Result.usage,
        warnings: phase3Result.warnings,
        structuredOutputAchieved: true,
      };
    } catch (error) {
      logger.error(`[BaseProvider] Phase 3: generateObject failed`, { error });
      return repairResult.json
        ? {
            ...initialGenerationResult,
            text: JSON.stringify(repairResult.json),
            structuredOutputAchieved: false,
          }
        : {
            ...initialGenerationResult,
            structuredOutputAchieved: false,
          };
    }
  }

  /**
   * Log generation completion information - delegated to GenerationHandler
   */
  private logGenerationComplete(generateResult: GenerationResult): void {
    this.generationHandler.logGenerationComplete(generateResult);
  }

  /**
   * Record performance metrics - delegated to TelemetryHandler
   */
  private async recordPerformanceMetrics(
    usage:
      | { promptTokens: number; completionTokens: number; totalTokens: number }
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
    generateResult: GenerationResult,
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

    try {
      // ===== VIDEO GENERATION MODE =====
      // Generate video from image + prompt using Veo 3.1
      if (options.output?.mode === "video") {
        return await this.handleVideoGeneration(options, startTime);
      }

      // ===== IMAGE GENERATION MODE =====
      // Route to executeImageGeneration for image generation models
      const isImageModel = IMAGE_GENERATION_MODELS.some((m) =>
        this.modelName.includes(m),
      );

      if (isImageModel) {
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

      // ===== TTS MODE 1: Direct Input Synthesis (useAiResponse=false) =====
      // Synthesize input text directly without AI generation
      // This is optimal for simple read-aloud scenarios
      if (options.tts?.enabled && !options.tts?.useAiResponse) {
        const textToSynthesize = options.prompt ?? options.input?.text ?? "";

        // Build base result structure - common to both paths
        const baseResult: EnhancedGenerateResult = {
          content: textToSynthesize,
          provider: options.provider ?? this.providerName,
          model: this.modelName,
          usage: { input: 0, output: 0, total: 0 },
        };

        try {
          const ttsResult = await TTSProcessor.synthesize(
            textToSynthesize,
            options.provider ?? this.providerName,
            options.tts,
          );
          baseResult.audio = ttsResult;
        } catch (ttsError) {
          logger.error(
            `TTS synthesis failed in Mode 1 (direct input synthesis):`,
            ttsError,
          );
          // baseResult remains without audio - graceful degradation
        }

        // Call enhanceResult for consistency - enables analytics/evaluation for TTS-only requests
        return await this.enhanceResult(baseResult, options, startTime);
      }

      // ===== Normal AI Generation Flow =====
      const { tools, model } = await this.prepareGenerationContext(options);
      const messages = await this.buildMessages(options);

      // Compose timeout signal with user-provided abort signal (mirrors stream path)
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

      let generateResult: Awaited<GenerationResult>;
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

      // ===== TTS MODE 2: AI Response Synthesis (useAiResponse=true) =====
      // Synthesize AI-generated response after generation completes
      if (options.tts?.enabled && options.tts?.useAiResponse) {
        const aiResponse = enhancedResult.content;
        const provider = options.provider ?? this.providerName;

        // Validate AI response and provider before synthesis
        if (aiResponse && provider) {
          try {
            const ttsResult = await TTSProcessor.synthesize(
              aiResponse,
              provider,
              options.tts,
            );

            // Add audio to enhanced result (TTSProcessor already includes latency in metadata)
            enhancedResult = {
              ...enhancedResult,
              audio: ttsResult,
            };
          } catch (ttsError) {
            // Log TTS error but continue with text-only result
            logger.error(
              `TTS synthesis failed in Mode 2 (AI response synthesis):`,
              ttsError,
            );
            // enhancedResult remains unchanged (no audio field added)
          }
        } else {
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
        }
      }

      return await this.enhanceResult(enhancedResult, options, startTime);
    } catch (error) {
      // Abort errors are expected when a generation is cancelled — log at info, not error
      if (isAbortError(error)) {
        logger.info(`Generate aborted for ${this.providerName}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      } else {
        logger.error(`Generate failed for ${this.providerName}:`, error);
      }
      throw this.handleProviderError(error);
    }
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
  protected abstract getAISDKModel():
    | LanguageModelV1
    | Promise<LanguageModelV1>;

  /**
   * Get AI SDK model with middleware applied
   * This method wraps the base model with any configured middleware
   * TODO: Implement global level middlewares that can be used
   */
  protected async getAISDKModelWithMiddleware(
    options: TextGenerationOptions | StreamOptions = {},
  ): Promise<LanguageModelV1> {
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
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
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
   * Provider-specific error handling
   */
  protected abstract handleProviderError(error: unknown): Error;

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
   * Create text stream transformation - delegated to StreamHandler
   */
  protected createTextStream(result: {
    textStream: AsyncIterable<string>;
  }): AsyncGenerator<{ content: string }> {
    return this.streamHandler.createTextStream(result);
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
    this.customTools = sdk.customTools;
    this.toolExecutor = sdk.executeTool;
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
    const { validateVideoGenerationInput, validateImageForVideo } =
      await import("../utils/parameterValidation.js");
    const { ErrorFactory } = await import("../utils/errorHandling.js");

    // Build GenerateOptions for validation
    const generateOptions = {
      input: options.input || { text: options.prompt || "" },
      output: options.output,
      provider: options.provider,
      model: options.model,
    };

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
