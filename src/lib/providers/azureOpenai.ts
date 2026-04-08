import { createAzure } from "@ai-sdk/azure";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import { type AIProviderName, APIVersions } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import type { UnknownRecord } from "../types/common.js";
import type { StepFinishEvent } from "../types/index.js";
import type { StreamOptions, StreamResult } from "../types/streamTypes.js";
import { logger } from "../utils/logger.js";
import {
  createAzureAPIKeyConfig,
  createAzureEndpointConfig,
  validateApiKey,
} from "../utils/providerConfig.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import type { NeurolinkCredentials } from "../types/providers.js";

export class AzureOpenAIProvider extends BaseProvider {
  private apiKey: string;
  private resourceName: string;
  private deployment: string;
  private apiVersion: string;
  private azureProvider: ReturnType<typeof createAzure>;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["azure"],
  ) {
    super(modelName, "azure" as AIProviderName, sdk as NeuroLink | undefined);

    this.apiKey = credentials?.apiKey || process.env.AZURE_OPENAI_API_KEY || "";
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT || "";
    const envResourceName = endpoint
      .replace("https://", "")
      .replace(/\/+$/, "") // Remove trailing slashes
      .replace(".openai.azure.com", "")
      .replace(".cognitiveservices.azure.com", "");
    this.resourceName = credentials?.resourceName || envResourceName;
    this.deployment =
      credentials?.deploymentName ||
      modelName ||
      process.env.AZURE_OPENAI_MODEL ||
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_ID ||
      "gpt-4o";
    this.apiVersion =
      credentials?.apiVersion ||
      process.env.AZURE_API_VERSION ||
      APIVersions.AZURE_LATEST;

    // Configuration validation - now using consolidated utility
    if (!this.apiKey) {
      validateApiKey(createAzureAPIKeyConfig());
    }
    if (!this.resourceName) {
      validateApiKey(createAzureEndpointConfig());
    }

    // Create the Azure provider instance with proxy support
    // useDeploymentBasedUrls is required because @ai-sdk/azure v3+ defaults to
    // the /v1/ URL format, but most Azure deployments still require the legacy
    // /deployments/{deployment}/ URL pattern.
    this.azureProvider = createAzure({
      resourceName: this.resourceName,
      apiKey: this.apiKey,
      apiVersion: this.apiVersion,
      useDeploymentBasedUrls: true,
      fetch: createProxyFetch(),
    });

    logger.debug("Azure Vercel Provider initialized", {
      deployment: this.deployment,
      resourceName: this.resourceName,
      provider: "azure-vercel",
    });
  }

  public getProviderName(): AIProviderName {
    return "azure" as AIProviderName;
  }

  public getDefaultModel(): string {
    return this.deployment;
  }

  /**
   * Returns the Vercel AI SDK model instance for Azure OpenAI.
   * Uses .chat() explicitly because @ai-sdk/azure v3+ defaults the bare
   * provider() call to the Responses API, which many Azure deployments
   * do not support yet.
   */
  public getAISDKModel(): LanguageModel {
    return this.azureProvider.chat(this.deployment);
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`Azure OpenAI request timed out: ${error.message}`);
    }
    const errorObj = error as UnknownRecord;
    if (
      errorObj?.message &&
      typeof errorObj.message === "string" &&
      errorObj.message.includes("401")
    ) {
      return new Error("Invalid Azure OpenAI API key or endpoint.");
    }
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    return new Error(`Azure OpenAI error: ${message}`);
  }

  // executeGenerate removed - BaseProvider handles all generation with tools

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: unknown,
  ): Promise<StreamResult> {
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

      logger.debug("Azure Stream - Tool Loading Debug", {
        shouldUseTools,
        toolCount: Object.keys(tools).length,
        toolNames: Object.keys(tools).slice(0, 10),
        disableTools: options.disableTools,
        supportsTools: this.supportsTools(),
      });

      // Build message array from options with multimodal support
      // Using protected helper from BaseProvider to eliminate code duplication
      const messages = await this.buildMessagesForStream(options);

      const model = await this.getAISDKModelWithMiddleware(options);
      const stream = await streamText({
        model,
        messages: messages,
        ...(options.maxTokens !== null && options.maxTokens !== undefined
          ? { maxOutputTokens: options.maxTokens }
          : {}),
        ...(options.temperature !== null && options.temperature !== undefined
          ? { temperature: options.temperature }
          : {}),
        tools,
        toolChoice: resolveToolChoice(options, tools, shouldUseTools),
        stopWhen: stepCountIs(options.maxSteps || DEFAULT_MAX_STEPS),
        abortSignal: composeAbortSignals(
          options.abortSignal,
          timeoutController?.controller.signal,
        ),
        experimental_telemetry:
          this.telemetryHandler.getTelemetryConfig(options),
        onStepFinish: (event: StepFinishEvent) => {
          this.handleToolExecutionStorage(
            [...event.toolCalls],
            [...event.toolResults],
            options,
            new Date(),
          ).catch((error: unknown) => {
            logger.warn(
              "[AzureOpenaiProvider] Failed to store tool executions",
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
      const transformedStream = this.createTextStream(stream);

      return {
        stream: transformedStream,
        provider: "azure",
        model: this.deployment,
        metadata: {
          streamId: `azure-${Date.now()}`,
          startTime: Date.now(),
        },
      };
    } catch (error: unknown) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }
}

export default AzureOpenAIProvider;
