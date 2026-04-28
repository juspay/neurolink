import { createOpenAI } from "@ai-sdk/openai";
import { type LanguageModel, stepCountIs, streamText, type Tool } from "ai";
import type { AIProviderName } from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import { DEFAULT_MAX_STEPS } from "../core/constants.js";
import { streamAnalyticsCollector } from "../core/streamAnalytics.js";
import type { NeuroLink } from "../neurolink.js";
import { createProxyFetch, maskProxyUrl } from "../proxy/proxyFetch.js";
import { tracers, ATTR, withClientSpan } from "../telemetry/index.js";
import type {
  UnknownRecord,
  NeurolinkCredentials,
  ModelsResponse,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { logger } from "../utils/logger.js";
import {
  composeAbortSignals,
  createTimeoutController,
  TimeoutError,
} from "../utils/timeout.js";
import { emitToolEndFromStepFinish } from "../utils/toolEndEmitter.js";
import { resolveToolChoice } from "../utils/toolChoice.js";
import { toAnalyticsStreamResult } from "./providerTypeUtils.js";

const makeLoggingFetch = (provider: string): typeof fetch => {
  const base = createProxyFetch();
  return (async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const reqSize =
      init?.body && typeof init.body === "string" ? init.body.length : 0;
    const response = await base(input, init);
    if (!response.ok) {
      // Mask any embedded credentials / signed query params before logging.
      // Fall back to "<redacted>" rather than the raw URL on a masking miss.
      const safeUrl = maskProxyUrl(url) ?? "<redacted>";
      // Don't log the raw upstream body — it can echo prompt fragments or
      // tool payloads. Log size + status + URL only. Opt into bodies via
      // NEUROLINK_DEBUG_HTTP=1 for local debugging.
      if (process.env.NEUROLINK_DEBUG_HTTP === "1") {
        const clone = response.clone();
        const body = await clone.text().catch(() => "<unreadable>");
        logger.warn(`[${provider}] upstream ${response.status}`, {
          url: safeUrl,
          body: body.slice(0, 800),
          reqSize,
        });
      } else {
        logger.warn(
          `[${provider}] upstream ${response.status} url=${safeUrl} reqSize=${reqSize}`,
        );
      }
    }
    return response;
  }) as typeof fetch;
};

const LLAMACPP_DEFAULT_BASE_URL = "http://localhost:8080/v1";
const LLAMACPP_PLACEHOLDER_KEY = "llamacpp";
const FALLBACK_MODEL = "loaded-model";

const getLlamaCppBaseURL = (): string => {
  return process.env.LLAMACPP_BASE_URL || LLAMACPP_DEFAULT_BASE_URL;
};

/**
 * llama.cpp Provider
 * Wraps a llama-server process (https://github.com/ggerganov/llama.cpp) that
 * exposes an OpenAI-compatible API at http://localhost:8080/v1 by default.
 * llama-server hosts ONE model loaded at startup; /v1/models returns just that.
 */
export class LlamaCppProvider extends BaseProvider {
  private model?: LanguageModel;
  // Caller-supplied model name — never overwritten by discovery, so a
  // FALLBACK_MODEL miss can't poison the explicit-vs-discover branch on
  // subsequent calls.
  private readonly requestedModelName?: string;
  private baseURL: string;
  private apiKey: string;
  private discoveredModel?: string;
  private llamaCppClient: ReturnType<typeof createOpenAI>;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["llamacpp"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "llamacpp" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );
    this.requestedModelName = modelName;

    this.baseURL = credentials?.baseURL ?? getLlamaCppBaseURL();
    // llama-server doesn't authenticate, but the AI SDK's createOpenAI() requires
    // an apiKey. Allow override via credentials/env for users who run llama-server
    // behind an auth-proxying reverse-proxy.
    this.apiKey =
      credentials?.apiKey ??
      process.env.LLAMACPP_API_KEY ??
      LLAMACPP_PLACEHOLDER_KEY;

    this.llamaCppClient = createOpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      fetch: makeLoggingFetch("llamacpp"),
    });

    logger.debug("llama.cpp Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  private async getAvailableModels(
    callerSignal?: AbortSignal,
  ): Promise<string[]> {
    const url = `${this.baseURL.replace(/\/$/, "")}/models`;
    // Use the proxy-aware fetch + bearer auth so users running llama-server
    // behind an auth-proxying reverse-proxy can still discover the model.
    // Compose the caller's request signal (per-request timeout / abort) with
    // a fixed 5s discovery cap so cancellation propagates AND a hung server
    // can't stall provider initialization.
    const proxyFetch = createProxyFetch();
    const discoveryTimeout = AbortSignal.timeout(5000);
    const composedSignal = callerSignal
      ? AbortSignal.any([callerSignal, discoveryTimeout])
      : discoveryTimeout;
    const response = await proxyFetch(url, {
      headers:
        this.apiKey && this.apiKey !== LLAMACPP_PLACEHOLDER_KEY
          ? { Authorization: `Bearer ${this.apiKey}` }
          : undefined,
      signal: composedSignal,
    });
    if (!response.ok) {
      throw new Error(
        `llama-server /v1/models returned ${response.status}: ${response.statusText}`,
      );
    }
    const data = (await response.json()) as ModelsResponse;
    return data.data.map((m) => m.id);
  }

  protected async getAISDKModel(signal?: AbortSignal): Promise<LanguageModel> {
    if (this.model) {
      return this.model;
    }

    let modelToUse: string;
    let discoverySucceeded = false;
    // Use requestedModelName, not this.modelName — refreshHandlersForModel()
    // mutates this.modelName, so on a retry after a discovery miss the
    // FALLBACK_MODEL would look like an explicit user choice. See lmStudio.ts.
    const explicit = this.requestedModelName;
    if (explicit && explicit.trim() !== "") {
      modelToUse = explicit;
      discoverySucceeded = true; // explicit user choice — treat as success
    } else {
      try {
        const models = await this.getAvailableModels(signal);
        if (models.length > 0) {
          this.discoveredModel = models[0];
          modelToUse = this.discoveredModel;
          discoverySucceeded = true;
          logger.info(`llama.cpp loaded model: ${modelToUse}`);
        } else {
          modelToUse = FALLBACK_MODEL;
        }
      } catch (error) {
        logger.warn(
          `llama.cpp model discovery failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        modelToUse = FALLBACK_MODEL;
      }
    }

    // Persist resolved model on the instance and rebuild the composed
    // handlers (TelemetryHandler, MessageBuilder, etc.) so pricing /
    // telemetry / span attributes report the discovered model name. Plain
    // assignment to `this.modelName` is not enough — handlers cached the
    // pre-discovery value at construction time.
    this.refreshHandlersForModel(modelToUse);

    // .chat() — llama-server exposes /v1/chat/completions, not /v1/responses
    const resolvedModel = this.llamaCppClient.chat(modelToUse);
    // Only memoize on success — see lmStudio.ts for the same rationale: a
    // discovery miss should let the next call retry instead of being stuck
    // on FALLBACK_MODEL until the provider instance is recreated.
    if (discoverySucceeded) {
      this.model = resolvedModel;
    }
    return resolvedModel;
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    // Resolve the llama.cpp model BEFORE opening the span so OTEL
    // attributes, MessageBuilder, and downstream image/tool adapters all see
    // the discovered model id rather than the empty pre-discovery placeholder.
    // Pass the caller's abort signal so user cancellation / per-request
    // timeouts are honored during the discovery probe.
    await this.getAISDKModel(options.abortSignal);
    return withClientSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "llamacpp",
          [ATTR.GEN_AI_MODEL]:
            this.modelName || this.discoveredModel || FALLBACK_MODEL,
          [ATTR.GEN_AI_OPERATION]: "stream",
          [ATTR.NL_STREAM_MODE]: true,
        },
      },
      async () => this.executeStreamInner(options),
    );
  }

  private async executeStreamInner(
    options: StreamOptions,
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
      const shouldUseTools = !options.disableTools && this.supportsTools();
      const tools = shouldUseTools
        ? (options.tools as Record<string, Tool>) || (await this.getAllTools())
        : {};

      // Resolve the AI SDK model BEFORE building messages so message/image
      // adapters see the same handlers/model that streamText will use. See
      // lmStudio.ts for the same rationale.
      const model = await this.getAISDKModelWithMiddleware(options);
      const messages = await this.buildMessagesForStream(options);

      const result = await streamText({
        model,
        messages,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
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
            logger.warn("[LlamaCppProvider] Failed to store tool executions", {
              provider: this.providerName,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        },
      });

      timeoutController?.cleanup();
      const transformedStream = this.createTextStream(result);
      const analyticsPromise = streamAnalyticsCollector.createAnalytics(
        this.providerName,
        this.modelName || this.discoveredModel || FALLBACK_MODEL,
        toAnalyticsStreamResult(result),
        Date.now() - startTime,
        {
          requestId: `llamacpp-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName || this.discoveredModel || FALLBACK_MODEL,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `llamacpp-${Date.now()}` },
      };
    } catch (error) {
      timeoutController?.cleanup();
      throw this.handleProviderError(error);
    }
  }

  protected getProviderName(): AIProviderName {
    return this.providerName;
  }

  protected getDefaultModel(): string {
    return process.env.LLAMACPP_MODEL || "";
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`llama.cpp request timed out: ${error.message}`);
    }
    const errorRecord = error as UnknownRecord;
    const message =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : "Unknown error";
    const cause = (errorRecord?.cause as UnknownRecord) ?? {};
    const code = (errorRecord?.code ?? cause?.code) as string | undefined;

    if (
      code === "ECONNREFUSED" ||
      message.includes("ECONNREFUSED") ||
      message.includes("Failed to fetch") ||
      message.includes("fetch failed")
    ) {
      return new Error(
        `llama.cpp server not reachable at ${this.baseURL}. ` +
          "Start it with: ./llama-server -m model.gguf --port 8080",
      );
    }
    if (message.includes("400")) {
      return new Error(
        "llama.cpp rejected the request. Common cause: model doesn't support tools (start llama-server with --jinja for tool support).",
      );
    }
    return new Error(`llama.cpp error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    // Retry up to 3x with 500ms backoff. llama-server can be briefly unresponsive
    // under load (CPU inference saturates the event loop). Use the proxy-aware
    // fetch + bearer auth header so reverse-proxied setups still validate.
    const healthURL = this.baseURL.replace(/\/v1\/?$/, "/health");
    const modelsURL = `${this.baseURL.replace(/\/$/, "")}/models`;
    const proxyFetch = createProxyFetch();
    const headers =
      this.apiKey && this.apiKey !== LLAMACPP_PLACEHOLDER_KEY
        ? { Authorization: `Bearer ${this.apiKey}` }
        : undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const r = await proxyFetch(healthURL, {
          headers,
          signal: AbortSignal.timeout(2000),
        });
        if (r.ok) {
          return true;
        }
      } catch {
        /* fall through */
      }
      try {
        const r2 = await proxyFetch(modelsURL, {
          headers,
          signal: AbortSignal.timeout(2000),
        });
        if (r2.ok) {
          return true;
        }
      } catch {
        /* fall through */
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    return false;
  }

  getConfiguration() {
    return {
      provider: this.providerName,
      model: this.modelName || this.discoveredModel || FALLBACK_MODEL,
      defaultModel: this.getDefaultModel(),
      baseURL: this.baseURL,
    };
  }
}

export default LlamaCppProvider;
