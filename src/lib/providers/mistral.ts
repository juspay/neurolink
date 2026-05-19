import { createMistral } from "@ai-sdk/mistral";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import { isNeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
  RateLimitError,
} from "../types/index.js";

import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { logger } from "../utils/logger.js";
import {
  createMistralConfig,
  getProviderModel,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";
import type { LanguageModel, Tool } from "../types/index.js";
import { stepCountIs } from "../utils/tool.js";
import { streamText } from "../utils/generation.js";

// Configuration helpers - now using consolidated utility
const getMistralApiKey = (): string => {
  return validateApiKey(createMistralConfig());
};

const getDefaultMistralModel = (): string => {
  // Default to vision-capable Mistral Small 2506 (June 2025) with multimodal support
  return getProviderModel("MISTRAL_MODEL", "mistral-small-2506");
};

/**
 * Mistral AI Provider v2 - BaseProvider Implementation
 * Supports official AI-SDK integration with all Mistral models
 */
export class MistralProvider extends BaseProvider {
  private model: LanguageModel;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["mistral"],
  ) {
    // Type guard for NeuroLink parameter validation
    const validatedNeurolink = isNeuroLink(sdk) ? sdk : undefined;

    super(modelName, "mistral" as AIProviderName, validatedNeurolink);

    // Initialize Mistral model with API key validation and proxy support
    const apiKey = credentials?.apiKey ?? getMistralApiKey();
    const mistral = createMistral({
      apiKey: apiKey,
      fetch: createProxyFetch(),
    });
    this.model = mistral(this.modelName);

    logger.debug("Mistral Provider v2 initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
    });
  }

  // generate() method is inherited from BaseProvider; this provider uses the base implementation for generation with tools

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
      // Get tools - options.tools is pre-merged by BaseProvider.stream()
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const model = await this.getAISDKModelWithMiddleware(options); // This is where network connection happens!
      // Reviewer follow-up: capture upstream provider errors via onError
      // so the post-stream NoOutput sentinel carries the real cause.
      let capturedProviderError: unknown;
      const result = await streamText({
        model,
        messages: messages,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens, // No default limit - unlimited unless specified
        tools,
        stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
        toolChoice: resolveToolChoice(options, tools, shouldUseTools),
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        experimental_repairToolCall: this.getToolCallRepairFn(options),
        onError: (event: { error: unknown }) => {
          capturedProviderError = event.error;
          logger.error("Mistral: Stream error", {
            error:
              event.error instanceof Error
                ? event.error.message
                : String(event.error),
          });
        },
        onStepFinish: ({ toolCalls, toolResults }) => {
          emitToolEndFromStepFinish(
            this.neurolink?.getEventEmitter(),
            toolResults as Array<{
              toolName: string;
              output?: unknown;
              result?: unknown;
              error?: string;
            }>,
          );
          this.handleToolExecutionStorage(
            toolCalls,
            toolResults,
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn("[MistralProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();

      // Transform string stream to content object stream using BaseProvider method
      const transformedStream = this.createTextStream(
        result,
        () => capturedProviderError,
      );

      // Create analytics promise that resolves after stream completion
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `mistral-stream-${Date.now()}`,
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
          streamId: `mistral-${Date.now()}`,
        },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  // ===================
  // ABSTRACT METHOD IMPLEMENTATIONS
  // ===================

  public getProviderName(): AIProviderName {
    return this.providerName;
  }

  public getDefaultModel(): string {
    return getDefaultMistralModel();
  }

  /**
   * Returns the Vercel AI SDK model instance for Mistral
   */
  public getAISDKModel(): LanguageModel {
    return this.model;
  }

  public formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new NetworkError(`Request timed out: ${error.message}`, "mistral");
    }

    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";

    if (
      message.includes("API_KEY_INVALID") ||
      message.includes("Invalid API key")
    ) {
      return new AuthenticationError(
        "Invalid Mistral API key. Please check your MISTRAL_API_KEY environment variable.",
        "mistral",
      );
    }

    if (message.includes("Rate limit exceeded")) {
      return new RateLimitError("Mistral rate limit exceeded", "mistral");
    }

    return new ProviderError(`Mistral error: ${message}`, "mistral");
  }

  /**
   * Validate provider configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      getMistralApiKey();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get provider-specific configuration
   */
  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName,
      defaultModel: getDefaultMistralModel(),
    };
  }
}

export default MistralProvider;
