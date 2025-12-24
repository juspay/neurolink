import type {
  ZodUnknownSchema,
  ValidationSchema,
  StandardRecord,
} from "../types/typeAliases.js";
import type { Tool, LanguageModelV1, CoreMessage } from "ai";
import { generateText } from "ai";
import type {
  AIProvider,
  TextGenerationOptions,
  TextGenerationResult,
  EnhancedGenerateResult,
  AnalyticsData,
} from "../types/index.js";
import { AIProviderName } from "../constants/enums.js";
import type { EvaluationData } from "../index.js";
import { MiddlewareFactory } from "../middleware/factory.js";
import type { MiddlewareFactoryOptions } from "../types/middlewareTypes.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { JsonValue, UnknownRecord } from "../types/common.js";
import { logger } from "../utils/logger.js";
import { directAgentTools } from "../agent/directTools.js";
import { createTimeoutController, TimeoutError } from "../utils/timeout.js";
import { shouldDisableBuiltinTools } from "../utils/toolUtils.js";
import type { NeuroLink } from "../neurolink.js";
import { getKeysAsString, getKeyCount } from "../utils/transformationUtils.js";

// Import modules for composition
import { MessageBuilder } from "./modules/MessageBuilder.js";
import { StreamHandler } from "./modules/StreamHandler.js";
import { GenerationHandler } from "./modules/GenerationHandler.js";
import { TelemetryHandler } from "./modules/TelemetryHandler.js";
import { Utilities } from "./modules/Utilities.js";
import { ToolsManager } from "./modules/ToolsManager.js";
import { TTSProcessor } from "../utils/ttsProcessor.js";

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
    const options = this.normalizeStreamOptions(optionsOrPrompt);

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
            disableTools: false,
            maxSteps: options.maxSteps || 5,
            provider: options.provider as AIProviderName | undefined,
            model: options.model,
            // 🔧 FIX: Include analytics and evaluation options from stream options
            enableAnalytics: options.enableAnalytics,
            enableEvaluation: options.enableEvaluation,
            evaluationDomain: options.evaluationDomain,
            toolUsageContext: options.toolUsageContext,
            context: options.context as Record<string, JsonValue> | undefined,
            csvOptions: options.csvOptions,
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
                    await new Promise((resolve, reject) => {
                      const timeoutId = setTimeout(
                        resolve,
                        Math.random() * 9 + 1,
                      );
                      // Handle potential timeout issues
                      if (!timeoutId) {
                        reject(new Error("Failed to create timeout"));
                      }
                    }).catch((err) => {
                      logger.error("Error in streaming delay:", err);
                    });
                  }
                }

                // Yield all remaining content
                if (buffer.trim()) {
                  yield { content: buffer };
                }
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
                  toolName:
                    ((tr as UnknownRecord).toolName as string) || "unknown",
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
    const tools = shouldUseTools
      ? {
          ...baseTools,
          ...(options.tools || {}),
        }
      : {};

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
   * Execute the generation with AI SDK - delegated to GenerationHandler
   */
  private async executeGeneration(
    model: LanguageModelV1,
    messages: CoreMessage[],
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

    try {
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
      const generateResult = await this.executeGeneration(
        model,
        messages,
        tools,
        options,
      );

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
      logger.error(`Generate failed for ${this.providerName}:`, error);
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
    let enhancedResult = { ...result };

    if (options.enableAnalytics) {
      try {
        logger.debug(`Creating analytics for ${this.providerName}...`);
        const analytics = await this.createAnalytics(
          result,
          responseTime,
          options,
        );
        logger.debug(`Analytics created:`, analytics);
        enhancedResult = { ...enhancedResult, analytics };
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
        enhancedResult = { ...enhancedResult, evaluation };
      } catch (error) {
        logger.warn(
          `Evaluation creation failed for ${this.providerName}:`,
          error,
        );
      }
    }

    return enhancedResult;
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
