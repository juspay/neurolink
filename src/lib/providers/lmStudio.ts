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
      // Fall back to "<redacted>" rather than the raw URL on a masking miss —
      // logging the unsanitized form would defeat the redaction.
      const safeUrl = maskProxyUrl(url) ?? "<redacted>";
      // Don't log the raw upstream body or request payload — they can contain
      // user prompts, tool arguments, and other sensitive data. Log size +
      // status + URL only. Set NEUROLINK_DEBUG_HTTP=1 to opt into raw bodies.
      if (process.env.NEUROLINK_DEBUG_HTTP === "1") {
        const clone = response.clone();
        const body = await clone.text().catch(() => "<unreadable>");
        logger.warn(`[${provider}] upstream ${response.status}`, {
          url: safeUrl,
          body: body.slice(0, 400),
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

const LM_STUDIO_DEFAULT_BASE_URL = "http://localhost:1234/v1";
const LM_STUDIO_PLACEHOLDER_KEY = "lm-studio";
const FALLBACK_MODEL = "local-model";

const getLmStudioBaseURL = (): string => {
  return process.env.LM_STUDIO_BASE_URL || LM_STUDIO_DEFAULT_BASE_URL;
};

/**
 * LM Studio Provider
 * Wraps the LM Studio local server (https://lmstudio.ai/) which exposes an
 * OpenAI-compatible API at http://localhost:1234/v1 by default.
 * Auto-discovers the loaded model via /v1/models if no model specified.
 */
export class LMStudioProvider extends BaseProvider {
  private model?: LanguageModel;
  // The model name passed by the caller — never overwritten by auto-discovery,
  // so a discovery-miss FALLBACK_MODEL never poisons the next call's branch
  // through `if (explicit && explicit.trim() !== "")`.
  private readonly requestedModelName?: string;
  private baseURL: string;
  private apiKey: string;
  private discoveredModel?: string;
  private lmstudioClient: ReturnType<typeof createOpenAI>;

  constructor(
    modelName?: string,
    sdk?: unknown,
    _region?: string,
    credentials?: NeurolinkCredentials["lmStudio"],
  ) {
    const validatedNeurolink =
      sdk && typeof sdk === "object" && "getInMemoryServers" in sdk
        ? sdk
        : undefined;

    super(
      modelName,
      "lm-studio" as AIProviderName,
      validatedNeurolink as NeuroLink | undefined,
    );
    this.requestedModelName = modelName;

    this.baseURL = credentials?.baseURL ?? getLmStudioBaseURL();
    // LM Studio's local server doesn't authenticate, but the AI SDK's
    // createOpenAI() requires an apiKey. Allow override via credentials/env
    // for users who run LM Studio behind an auth-proxying reverse-proxy.
    this.apiKey =
      credentials?.apiKey ??
      process.env.LM_STUDIO_API_KEY ??
      LM_STUDIO_PLACEHOLDER_KEY;

    this.lmstudioClient = createOpenAI({
      baseURL: this.baseURL,
      apiKey: this.apiKey,
      fetch: makeLoggingFetch("lm-studio"),
    });

    logger.debug("LM Studio Provider initialized", {
      modelName: this.modelName,
      providerName: this.providerName,
      baseURL: this.baseURL,
    });
  }

  private async getAvailableModels(
    callerSignal?: AbortSignal,
  ): Promise<string[]> {
    const url = `${this.baseURL.replace(/\/$/, "")}/models`;
    // Use the proxy-aware fetch + bearer auth header so users running LM
    // Studio behind an auth-proxying reverse-proxy can still discover models.
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
        this.apiKey && this.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
          ? { Authorization: `Bearer ${this.apiKey}` }
          : undefined,
      signal: composedSignal,
    });
    if (!response.ok) {
      throw new Error(
        `LM Studio /v1/models returned ${response.status}: ${response.statusText}`,
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
    // FALLBACK_MODEL would look like an explicit user choice and we'd never
    // re-attempt /v1/models. The constructor-captured name preserves intent.
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
          logger.info(
            `LM Studio auto-discovered model: ${modelToUse} (${models.length} loaded)`,
          );
        } else {
          modelToUse = FALLBACK_MODEL;
          logger.warn(
            "LM Studio /v1/models returned no models. Load a model in the LM Studio app.",
          );
        }
      } catch (error) {
        logger.warn(
          `LM Studio model auto-discovery failed: ${
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

    // .chat() — LM Studio exposes /v1/chat/completions, not /v1/responses
    const resolvedModel = this.lmstudioClient.chat(modelToUse);
    // Only memoize on actual success. After a discovery miss (server down,
    // empty /v1/models, /models 5xx), starting LM Studio or loading a model
    // should let the next call re-attempt discovery instead of being stuck
    // on FALLBACK_MODEL for the lifetime of this provider instance.
    if (discoverySucceeded) {
      this.model = resolvedModel;
    }
    return resolvedModel;
  }

  protected async executeStream(
    options: StreamOptions,
    _analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    // Resolve the LM Studio model BEFORE opening the span so OTEL
    // attributes, MessageBuilder, and downstream image/tool adapters all see
    // the discovered model id rather than the empty pre-discovery placeholder.
    // Pass the caller's abort signal so user cancellation / per-request
    // timeouts are honored during the discovery probe (not just after it).
    await this.getAISDKModel(options.abortSignal);
    return withClientSpan(
      {
        name: "neurolink.provider.stream",
        tracer: tracers.provider,
        attributes: {
          [ATTR.GEN_AI_SYSTEM]: "lm-studio",
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
      // adapters see the same handlers/model that streamText will use. Without
      // this, a fallback warm-up + late-server-start pattern could build
      // messages under FALLBACK_MODEL handlers and stream under a different
      // discovered model — and pay an extra `/v1/models` probe each time.
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
            logger.warn("[LMStudioProvider] Failed to store tool executions", {
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
          requestId: `lmstudio-stream-${Date.now()}`,
          streamingMode: true,
        },
      );

      return {
        stream: transformedStream,
        provider: this.providerName,
        model: this.modelName || this.discoveredModel || FALLBACK_MODEL,
        analytics: analyticsPromise,
        metadata: { startTime, streamId: `lmstudio-${Date.now()}` },
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
    return process.env.LM_STUDIO_MODEL || "";
  }

  protected formatProviderError(error: unknown): Error {
    if (error instanceof TimeoutError) {
      return new Error(`LM Studio request timed out: ${error.message}`);
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
        `LM Studio server not reachable at ${this.baseURL}. ` +
          `Open the LM Studio app, load a model, and click "Start Server".`,
      );
    }
    if (message.includes("model_not_found") || message.includes("404")) {
      return new Error(
        `LM Studio model '${this.modelName}' is not loaded. Load it in the LM Studio app first.`,
      );
    }
    return new Error(`LM Studio error: ${message}`);
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      const url = `${this.baseURL.replace(/\/$/, "")}/models`;
      const proxyFetch = createProxyFetch();
      const r = await proxyFetch(url, {
        headers:
          this.apiKey && this.apiKey !== LM_STUDIO_PLACEHOLDER_KEY
            ? { Authorization: `Bearer ${this.apiKey}` }
            : undefined,
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) {
        return false;
      }
      // A 200 with an empty data array means LM Studio is up but no model is
      // loaded — `getAISDKModel()` will fall back to FALLBACK_MODEL and the
      // first real request will fail. Require at least one loaded model so
      // health checks honestly reflect whether the provider is usable.
      const data = (await r.json().catch(() => null)) as ModelsResponse | null;
      return Boolean(
        data?.data?.some(
          (m) => typeof m?.id === "string" && m.id.trim().length > 0,
        ),
      );
    } catch {
      return false;
    }
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

export default LMStudioProvider;
