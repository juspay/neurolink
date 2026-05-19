import { createAzure } from "@ai-sdk/azure";
import { type AIProviderName, APIVersions } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch } from "../proxy/proxyFetch.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import type {
  UnknownRecord,
  StepFinishEvent,
  StreamOptions,
  StreamResult,
  NeurolinkCredentials,
} from "../types/index.js";
import {
  AuthenticationError,
  NetworkError,
  ProviderError,
} from "../types/index.js";

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
import type { LanguageModel, Tool } from "../types/index.js";
import { stepCountIs } from "../utils/tool.js";
import { streamText } from "../utils/generation.js";

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
    // Use URL parsing instead of string-replace so endpoints that already
    // carry a path segment (e.g. "https://<host>/openai" — a valid Azure AI
    // Foundry shape) don't end up duplicating it as "<host>/openai/openai".
    // Tolerate missing scheme by prefixing https:// before parsing.
    let endpointUrl: URL | undefined;
    if (endpoint) {
      try {
        endpointUrl = new URL(
          endpoint.includes("://") ? endpoint : `https://${endpoint}`,
        );
      } catch {
        endpointUrl = undefined;
      }
    }
    const endpointHost = endpointUrl?.hostname ?? "";
    const endpointPath =
      endpointUrl?.pathname && endpointUrl.pathname !== "/"
        ? endpointUrl.pathname.replace(/\/+$/, "")
        : "";

    // Classic Azure OpenAI ("*.openai.azure.com") and Cognitive Services
    // ("*.cognitiveservices.azure.com") endpoints encode the resource name as
    // a subdomain that @ai-sdk/azure expects to receive verbatim. The newer
    // Azure AI Foundry endpoint format ("*.services.ai.azure.com") does not
    // round-trip through that subdomain rewrite, so passing the resource name
    // would yield e.g. "<host>.services.ai.azure.com.openai.azure.com". For
    // those hosts we hand the full URL back via baseURL instead.
    const isClassicAzureHost = /\.(openai|cognitiveservices)\.azure\.com$/.test(
      endpointHost,
    );
    const envResourceName = isClassicAzureHost
      ? endpointHost
          .replace(".openai.azure.com", "")
          .replace(".cognitiveservices.azure.com", "")
      : "";
    this.resourceName = credentials?.resourceName || envResourceName;
    // For Azure AI Foundry the SDK still routes to the OpenAI-compatible API
    // (deployments/{deployment}/chat/completions); the `/openai` path suffix
    // mirrors what the SDK derives in classic mode
    // (`https://${resource}.openai.azure.com/openai`). Reuse the path the
    // operator already supplied if it already terminates in `/openai` *or*
    // a versioned form like `/openai/v1`; otherwise append `/openai`. Never
    // duplicate.
    const hasOpenAIPathSuffix = /\/openai(?:\/v\d+)?$/.test(endpointPath);
    const baseURLForFoundry =
      !this.resourceName && endpointUrl
        ? `${endpointUrl.origin}${
            hasOpenAIPathSuffix ? endpointPath : `${endpointPath}/openai`
          }`
        : undefined;
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
    if (!this.resourceName && !baseURLForFoundry) {
      validateApiKey(createAzureEndpointConfig());
    }

    // Create the Azure provider instance with proxy support.
    // For classic *.openai.azure.com / *.cognitiveservices.azure.com hosts we
    // pass `resourceName`, which @ai-sdk/azure rewrites into the canonical
    // subdomain. For Azure AI Foundry hosts ("*.services.ai.azure.com") we
    // pass the full URL via `baseURL` so no rewrite happens.
    // useDeploymentBasedUrls is required because @ai-sdk/azure v3+ defaults to
    // the /v1/ URL format, but most Azure deployments still require the legacy
    // /deployments/{deployment}/ URL pattern.
    this.azureProvider = baseURLForFoundry
      ? createAzure({
          baseURL: baseURLForFoundry,
          apiKey: this.apiKey,
          apiVersion: this.apiVersion,
          useDeploymentBasedUrls: true,
          fetch: createProxyFetch(),
        })
      : createAzure({
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
      return new NetworkError(`Request timed out: ${error.message}`, "azure");
    }
    const errorObj = error as UnknownRecord;
    if (
      errorObj?.message &&
      typeof errorObj.message === "string" &&
      errorObj.message.includes("401")
    ) {
      return new AuthenticationError(
        "Invalid Azure OpenAI API key or endpoint.",
        "azure",
      );
    }
    const message =
      errorObj?.message && typeof errorObj.message === "string"
        ? errorObj.message
        : "Unknown error";
    return new ProviderError(`Azure OpenAI error: ${message}`, "azure");
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
      // Reviewer follow-up: capture upstream provider errors via onError
      // so the post-stream NoOutput sentinel carries the real cause.
      let capturedProviderError: unknown;
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
        experimental_repairToolCall: this.getToolCallRepairFn(options),
        onError: (event: { error: unknown }) => {
          capturedProviderError = event.error;
          logger.error("AzureOpenAI: Stream error", {
            error:
              event.error instanceof Error
                ? event.error.message
                : String(event.error),
          });
        },
        onStepFinish: (event: StepFinishEvent) => {
          emitToolEndFromStepFinish(
            this.neurolink?.getEventEmitter(),
            event.toolResults as Array<{
              toolName: string;
              output?: unknown;
              result?: unknown;
              error?: string;
            }>,
          );
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
      const transformedStream = this.createTextStream(
        stream,
        () => capturedProviderError,
      );

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
