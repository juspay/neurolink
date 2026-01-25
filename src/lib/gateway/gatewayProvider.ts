/**
 * Gateway Provider
 *
 * Unified access to 69+ AI providers through a single "provider/model" string format.
 * Extends BaseProvider for full NeuroLink integration.
 */

import type { LanguageModelV1 } from "ai";
import { streamText } from "ai";
import { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { NeuroLink } from "../neurolink.js";
import type { JsonValue } from "../types/common.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import type { ValidationSchema } from "../types/typeAliases.js";
import { logger } from "../utils/logger.js";
import { createTimeoutController } from "../utils/timeout.js";
import { DEFAULT_GATEWAY_MODEL, GATEWAY_ENABLED } from "./constants.js";
import { GatewayDisabledError, GatewayError } from "./errors.js";
import {
  type FallbackManager,
  getGlobalFallbackManager,
} from "./fallbackManager.js";
import { getGlobalRouter, type ModelRouter } from "./modelRouter.js";
import { parseModelString } from "./modelStringParser.js";
import type {
  FallbackConfig,
  GatewayCapabilities,
  GatewayModelInfo,
  GatewayProviderOptions,
  ModelSelector,
  ModelSelectorContext,
} from "./types.js";

/**
 * Gateway Provider - Unified access to 69+ AI providers
 *
 * Features:
 * - Unified "provider/model" string format
 * - Smart routing (direct API or gateway)
 * - Automatic model fallbacks
 * - Dynamic model discovery
 * - Full BaseProvider integration (tools, middleware, telemetry)
 *
 * @example Basic usage
 * ```typescript
 * const provider = new GatewayProvider("anthropic/claude-3-5-sonnet");
 * const result = await provider.generate({ prompt: "Hello" });
 * ```
 *
 * @example With fallbacks
 * ```typescript
 * const provider = new GatewayProvider("openai/gpt-4o", undefined, {
 *   fallback: {
 *     models: ["anthropic/claude-3-5-sonnet"],
 *     retries: 2
 *   }
 * });
 * ```
 *
 * @example Dynamic model selection
 * ```typescript
 * const provider = new GatewayProvider(({ availableModels }) =>
 *   availableModels.includes("openai/gpt-4o") ? "openai/gpt-4o" : "openai/gpt-4o-mini"
 * );
 * ```
 */
export class GatewayProvider extends BaseProvider {
  private modelString: string;
  private modelSelector?: ModelSelector;
  private fallbackConfig?: FallbackConfig;
  private resolvedModel?: LanguageModelV1;
  private resolvedModelString?: string;
  private router: ModelRouter;
  private fallbackManager: FallbackManager;

  constructor(
    modelOrSelector: string | ModelSelector,
    sdk?: NeuroLink,
    options?: GatewayProviderOptions,
  ) {
    // Check if gateway is enabled
    if (!GATEWAY_ENABLED) {
      throw new GatewayDisabledError();
    }

    // Parse initial model string for base provider
    const initialModel =
      typeof modelOrSelector === "string"
        ? modelOrSelector
        : DEFAULT_GATEWAY_MODEL;

    const { provider } = parseModelString(initialModel);

    // Initialize base provider with gateway provider name
    super(initialModel, AIProviderName.GATEWAY as AIProviderName, sdk);

    if (typeof modelOrSelector === "string") {
      this.modelString = modelOrSelector;
    } else {
      this.modelSelector = modelOrSelector;
      this.modelString = DEFAULT_GATEWAY_MODEL;
    }

    this.fallbackConfig = options?.fallback;
    this.router = getGlobalRouter();
    this.fallbackManager = getGlobalFallbackManager();

    logger.debug("GatewayProvider initialized", {
      modelString: this.modelString,
      hasDynamicSelector: !!this.modelSelector,
      hasFallback: !!this.fallbackConfig,
      provider,
    });
  }

  // ==================
  // Abstract Method Implementations
  // ==================

  protected getProviderName(): AIProviderName {
    return AIProviderName.GATEWAY as AIProviderName;
  }

  protected getDefaultModel(): string {
    return this.modelString;
  }

  /**
   * Get the AI SDK model instance
   * Handles dynamic selection and fallbacks
   */
  protected async getAISDKModel(): Promise<LanguageModelV1> {
    // Resolve dynamic model if using selector
    let modelToUse = this.modelString;

    if (this.modelSelector) {
      const availableModels = await this.router.getAvailableModels();
      const context: ModelSelectorContext = {
        availableModels,
        // Note: runtimeContext is optional and can be provided by user if needed
        runtimeContext: undefined,
      };
      modelToUse = this.modelSelector(context);
      logger.debug(`Dynamic model selected: ${modelToUse}`);
    }

    // Check if we need to create a new model
    if (this.resolvedModel && this.resolvedModelString === modelToUse) {
      return this.resolvedModel;
    }

    // Create model with optional fallback
    if (this.fallbackConfig && this.fallbackConfig.models.length > 0) {
      this.resolvedModel = await this.fallbackManager.createModelWithFallback(
        modelToUse,
        this.fallbackConfig.models,
      );
    } else {
      this.resolvedModel = await this.router.createModel(modelToUse);
    }

    this.resolvedModelString = modelToUse;
    return this.resolvedModel;
  }

  /**
   * Handle provider errors with gateway context
   */
  public handleProviderError(error: unknown): Error {
    const err = error as Error;
    const message = err?.message || String(error);

    // Create gateway-specific error with context
    const gatewayError = new GatewayError(
      `[Gateway: ${this.modelString}] ${message}`,
      {
        modelString: this.modelString,
        originalError: err,
      },
    );

    return gatewayError;
  }

  /**
   * Execute streaming with gateway routing
   */
  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const timeout = this.getTimeout(options);
    const timeoutController = createTimeoutController(
      timeout,
      "gateway",
      "stream",
    );

    try {
      const model = await this.getAISDKModel();
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools ? await this.getAllTools() : {};
      const messages = await this.buildMessagesForStream(options);

      const result = await streamText({
        model,
        messages,
        temperature: options.temperature,
        maxTokens: options.maxTokens,
        tools,
        maxSteps: options.maxSteps || DEFAULT_MAX_STEPS,
        toolChoice: shouldUseTools ? "auto" : "none",
        abortSignal: timeoutController?.controller.signal,
      });

      timeoutController?.cleanup();

      // Track tool calls and results from the stream response
      // The streamText result contains toolCalls and toolResults that we need to capture
      const toolCalls: Array<{
        toolCallId: string;
        toolName: string;
        args: Record<string, unknown>;
      }> = [];
      const toolResults: Array<{
        toolName: string;
        status: "success" | "failure";
        output?: JsonValue;
        error?: string;
        id?: string;
        executionTime?: number;
      }> = [];

      // Extract tool data from the result if available
      // streamText returns these as part of the response object
      if ("toolCalls" in result && Array.isArray(result.toolCalls)) {
        for (const call of result.toolCalls) {
          toolCalls.push({
            toolCallId: call.toolCallId || `call_${Date.now()}`,
            toolName: call.toolName || "unknown",
            args: (call.args as Record<string, unknown>) || {},
          });
        }
      }

      if ("toolResults" in result && Array.isArray(result.toolResults)) {
        for (const toolResult of result.toolResults) {
          // Convert AI SDK tool result format to our ToolResult format
          const resultObj = toolResult as {
            toolName?: string;
            result?: JsonValue;
            error?: string;
            toolCallId?: string;
          };
          toolResults.push({
            toolName: resultObj.toolName || "unknown",
            status: resultObj.error ? "failure" : "success",
            output: resultObj.result,
            error: resultObj.error,
            id: resultObj.toolCallId,
          });
        }
      }

      return {
        stream: this.createTextStream(result),
        provider: "gateway",
        model: this.resolvedModelString || this.modelString,
        toolCalls,
        toolResults,
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  // ==================
  // Gateway-specific Methods
  // ==================

  /**
   * Get information about the current model
   */
  async getModelInfo(): Promise<GatewayModelInfo | undefined> {
    return this.router.getModelInfo(this.modelString);
  }

  /**
   * Check if current model supports a capability
   */
  async supportsCapability(
    capability: keyof GatewayCapabilities,
  ): Promise<boolean> {
    const info = await this.getModelInfo();
    if (!info?.capabilities) {
      return false;
    }
    const capabilities = info.capabilities;
    // Access the capability safely using the typed key
    const value = capabilities[capability];
    return typeof value === "boolean" ? value : false;
  }

  /**
   * Get all available models from registry
   */
  async getAvailableModels(): Promise<string[]> {
    return this.router.getAvailableModels();
  }

  /**
   * Search models by query
   */
  async searchModels(query: string): Promise<GatewayModelInfo[]> {
    return this.router.searchModels(query);
  }

  /**
   * Create a new gateway provider with different model
   */
  withModel(modelString: string): GatewayProvider {
    return new GatewayProvider(modelString, this.neurolink, {
      fallback: this.fallbackConfig,
    });
  }

  /**
   * Create with fallback configuration
   */
  withFallback(config: FallbackConfig): GatewayProvider {
    return new GatewayProvider(
      this.modelSelector || this.modelString,
      this.neurolink,
      { fallback: config },
    );
  }

  /**
   * Get the current model string
   */
  getModelString(): string {
    return this.resolvedModelString || this.modelString;
  }

  /**
   * Get the parsed provider name
   */
  getParsedProvider(): string {
    const { provider } = parseModelString(this.modelString);
    return provider;
  }

  /**
   * Get the parsed model name (without provider prefix)
   */
  getParsedModelName(): string {
    const { modelName } = parseModelString(this.modelString);
    return modelName;
  }

  /**
   * Check if this gateway has a dynamic selector
   */
  hasDynamicSelector(): boolean {
    return !!this.modelSelector;
  }

  /**
   * Check if this gateway has fallback configuration
   */
  hasFallback(): boolean {
    return !!(this.fallbackConfig && this.fallbackConfig.models.length > 0);
  }
}

export default GatewayProvider;
