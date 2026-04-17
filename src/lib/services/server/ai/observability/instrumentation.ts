/**
 * OpenTelemetry Instrumentation for Langfuse v4
 *
 * Configures OpenTelemetry TracerProvider with LangfuseSpanProcessor to capture
 * traces from Vercel AI SDK's experimental_telemetry feature.
 *
 * Flow: Vercel AI SDK → OpenTelemetry Spans → LangfuseSpanProcessor → Langfuse Platform
 */

import type { LangfuseSpanProcessor as LangfuseSpanProcessorType } from "@langfuse/otel";
import type { Context } from "@opentelemetry/api";
import { metrics, SpanStatusCode, trace } from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import {
  BatchLogRecordProcessor,
  LoggerProvider,
} from "@opentelemetry/sdk-logs";
import {
  BatchSpanProcessor,
  type Span,
  type SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { AsyncLocalStorage } from "async_hooks";
import type {
  LangfuseConfig,
  LangfuseContext,
  LangfuseSpanAttributes,
} from "../../../../types/index.js";
import { logger } from "../../../../utils/logger.js";

const LOG_PREFIX = "[OpenTelemetry]";

function createOtelResource(config: LangfuseConfig, serviceName: string) {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: config.release || "v1.0.0",
    "deployment.environment": config.environment || "dev",
  });
}

function initializeOtlpMetricsAndLogs(
  resource: ReturnType<typeof resourceFromAttributes>,
  otlpEndpoint: string | undefined,
  serviceName: string,
): void {
  if (!otlpEndpoint) {
    return;
  }

  try {
    const metricExporter = new OTLPMetricExporter({
      url: `${otlpEndpoint}/v1/metrics`,
    });
    const metricReader = new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 15000,
      exportTimeoutMillis: 10000,
    });
    meterProvider = new MeterProvider({
      resource,
      readers: [metricReader],
    });
    metrics.setGlobalMeterProvider(meterProvider);
    logger.info(
      `${LOG_PREFIX} OTLP metric exporter added — MeterProvider registered globally`,
      {
        endpoint: `${otlpEndpoint}/v1/metrics`,
        exportIntervalMs: 15000,
        serviceName,
        meterProviderType: meterProvider.constructor.name,
      },
    );
  } catch (metricsError) {
    logger.warn(
      `${LOG_PREFIX} Failed to create OTLP metric exporter (non-fatal)`,
      {
        error:
          metricsError instanceof Error
            ? metricsError.message
            : String(metricsError),
        endpoint: otlpEndpoint,
      },
    );
  }

  try {
    const logExporter = new OTLPLogExporter({
      url: `${otlpEndpoint}/v1/logs`,
    });
    const logProcessor = new BatchLogRecordProcessor(logExporter, {
      maxQueueSize: 2048,
      maxExportBatchSize: 512,
      scheduledDelayMillis: 2000,
      exportTimeoutMillis: 30000,
    });
    loggerProvider = new LoggerProvider({
      resource,
      processors: [logProcessor],
    });
    logger.info(
      `${LOG_PREFIX} OTLP log exporter added — LoggerProvider created`,
      {
        endpoint: `${otlpEndpoint}/v1/logs`,
        serviceName,
      },
    );
  } catch (logsError) {
    logger.warn(
      `${LOG_PREFIX} Failed to create OTLP log exporter (non-fatal)`,
      {
        error:
          logsError instanceof Error ? logsError.message : String(logsError),
        endpoint: otlpEndpoint,
      },
    );
  }
}

const contextStorage = new AsyncLocalStorage<LangfuseContext>();

let tracerProvider: NodeTracerProvider | null = null;
let meterProvider: MeterProvider | null = null;
let loggerProvider: LoggerProvider | null = null;
let langfuseProcessor: LangfuseSpanProcessorType | null = null;
let isInitialized = false;
let isCredentialsValid = false;
let currentConfig: LangfuseConfig | null = null;
let usingExternalProvider = false;
let cachedContextEnricher: ContextEnricher | null = null;

/**
 * Check if a real TracerProvider (not ProxyTracerProvider) is already registered
 *
 * IMPORTANT: This function checks the @opentelemetry/api global state as seen by THIS
 * module's bundled copy of @opentelemetry/api. If Neurolink is bundled with its own
 * copy of @opentelemetry/api (which is common in bundled libraries), this function
 * will NOT detect TracerProviders registered by the host application on their
 * @opentelemetry/api instance. Use `useExternalTracerProvider: true` or
 * `autoDetectExternalProvider: true` to explicitly signal external provider usage.
 *
 * @returns true if an external TracerProvider is detected in this module's OTEL instance
 */
function _hasExternalTracerProvider(): boolean {
  try {
    const provider = trace.getTracerProvider();

    if (!provider) {
      return false;
    }

    // ProxyTracerProvider is the default "no-op" provider
    // Any other provider means someone else registered one
    const providerName = provider.constructor?.name || "";
    const isProxy =
      providerName === "ProxyTracerProvider" ||
      providerName === "NoopTracerProvider";

    if (!isProxy) {
      logger.debug(
        `${LOG_PREFIX} Detected external TracerProvider: ${providerName}`,
      );
    }

    return !isProxy;
  } catch (error) {
    logger.warn(`${LOG_PREFIX} Error checking for external TracerProvider`, {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Span processor that enriches spans with user and session context from AsyncLocalStorage
 * Also extracts GenAI semantic convention attributes for Langfuse integration
 *
 * Key features:
 * - Enriches spans with userId, sessionId, conversationId, requestId
 * - Auto-detects operation names from Vercel AI SDK span names
 * - Builds formatted trace names for Langfuse (e.g., "user@email.com:ai.streamText")
 * - Supports custom trace name formats via configuration
 * - Handles wrapper spans by detecting operations from child spans and updating trace name in onEnd()
 */
class ContextEnricher implements SpanProcessor {
  /**
   * Maximum number of detected operations to track to prevent memory leaks.
   * Once this limit is reached, oldest entries are evicted (FIFO).
   */
  private static readonly MAX_DETECTED_OPERATIONS = 10000;

  /**
   * Track detected operations per trace for wrapper span support.
   * When a host app creates a wrapper span before AI operations, the wrapper's
   * onStart() runs before the AI SDK child span exists. We store detected
   * operations here so we can update the trace name in onEnd().
   */
  private detectedOperations = new Map<string, string>();

  onStart(span: Span, parentContext: Context): void {
    const context = contextStorage.getStore();
    const userId = context?.userId ?? currentConfig?.userId ?? "guest";
    const sessionId = context?.sessionId ?? currentConfig?.sessionId;

    // Get span name for operation auto-detection
    const spanName = (span as unknown as { name?: string }).name;

    // Determine if auto-detection is enabled for this context
    const autoDetect = this.shouldAutoDetectOperationName(context);

    // Resolve operation name: explicit > auto-detected > undefined
    const operationName = this.resolveOperationName(
      context?.operationName,
      spanName,
      autoDetect,
    );

    // Store detected AI operations for wrapper span support (optional, defensive).
    // When a host app creates a wrapper span before calling AI operations,
    // this allows us to update the trace name in onEnd() with the operation.
    // Only store the first detected operation for each trace (subsequent operations are ignored).
    try {
      if (operationName && spanName?.startsWith("ai.")) {
        const traceId = span.spanContext?.()?.traceId;
        if (traceId && !this.detectedOperations.has(traceId)) {
          // Evict oldest entry if at capacity to prevent memory leak
          if (
            this.detectedOperations.size >=
            ContextEnricher.MAX_DETECTED_OPERATIONS
          ) {
            const firstKey = this.detectedOperations.keys().next().value;
            if (firstKey) {
              this.detectedOperations.delete(firstKey);
            }
          }
          this.detectedOperations.set(traceId, operationName);
        }
      }
    } catch {
      // Wrapper span support is optional - don't fail if spanContext isn't available
    }

    // Build trace name based on priority:
    // 1. Explicit traceName (100% backward compatible)
    // 2. Formatted name with userId + operationName
    // 3. userId only (legacy fallback)
    const traceName = this.buildTraceName(
      context?.traceName,
      userId,
      operationName,
    );

    // Apply custom attributes FIRST so internal attributes always take precedence
    // and cannot be accidentally overwritten by user-provided values
    if (context?.customAttributes) {
      for (const [key, value] of Object.entries(context.customAttributes)) {
        span.setAttribute(key, value);
      }
    }

    // Set user and session attributes (internal - always override custom)
    if (userId && userId !== "guest") {
      span.setAttribute("user.id", userId);
    }
    if (sessionId) {
      span.setAttribute("session.id", sessionId);
    }

    // Add extended context fields
    if (context?.conversationId) {
      span.setAttribute("conversation.id", context.conversationId);
    }
    if (context?.requestId) {
      span.setAttribute("request.id", context.requestId);
    }

    const isRootSpan = !trace.getSpan(parentContext);

    if (traceName && isRootSpan) {
      span.setAttribute("langfuse.trace.name", traceName);
      span.setAttribute("trace.name", traceName);
    }

    // Set operation name as separate attribute for filtering/analytics
    if (operationName) {
      span.setAttribute("gen_ai.operation.name", operationName);
    }

    // Add custom metadata as span attributes
    const metadata = context?.metadata;
    if (metadata && typeof metadata === "object") {
      for (const [key, value] of Object.entries(metadata)) {
        if (value !== undefined && value !== null) {
          // Preserve primitive types that OTEL supports natively
          if (
            typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean"
          ) {
            if (metadata && isRootSpan) {
              span.setAttribute(
                "langfuse.trace.metadata",
                JSON.stringify(metadata),
              );
            }
          } else if (
            Array.isArray(value) &&
            value.every(
              (v) =>
                typeof v === "string" ||
                typeof v === "number" ||
                typeof v === "boolean",
            )
          ) {
            // OTEL supports homogeneous arrays of primitives
            span.setAttribute(`metadata.${key}`, JSON.stringify(value));
          } else {
            // Fall back to JSON string for complex types
            span.setAttribute(`metadata.${key}`, JSON.stringify(value));
          }
        }
      }
    }
  }

  /**
   * Determine if auto-detection should be used for operation names
   */
  private shouldAutoDetectOperationName(context?: LangfuseContext): boolean {
    // Context-level override takes precedence
    if (context?.autoDetectOperationName !== undefined) {
      return context.autoDetectOperationName;
    }
    // Fall back to global config (default: true)
    return currentConfig?.autoDetectOperationName !== false;
  }

  /**
   * Resolve operation name from explicit setting, auto-detection, or undefined
   */
  private resolveOperationName(
    explicit: string | null | undefined,
    spanName: string | undefined,
    autoDetect: boolean,
  ): string | undefined {
    // Explicit operation name takes precedence
    if (explicit) {
      return explicit;
    }

    // Auto-detect from span name if enabled
    if (autoDetect && spanName) {
      // Detect Vercel AI SDK operation spans (ai.streamText, ai.generateText, etc.)
      if (spanName.startsWith("ai.")) {
        return spanName;
      }
      // Detect OpenTelemetry GenAI convention spans (chat, embeddings, text_completion)
      if (
        spanName === "chat" ||
        spanName === "embeddings" ||
        spanName === "text_completion"
      ) {
        return spanName;
      }
    }

    return undefined;
  }

  /**
   * Build trace name based on format configuration and available data
   */
  private buildTraceName(
    explicitTraceName: string | null | undefined,
    userId: string,
    operationName: string | undefined,
  ): string {
    // 1. Explicit traceName always wins (100% backward compatibility)
    if (explicitTraceName) {
      return explicitTraceName;
    }

    // 2. Build formatted trace name based on config
    const format = currentConfig?.traceNameFormat ?? "userId:operationName";

    // Handle custom function format
    if (typeof format === "function") {
      return format({ userId, operationName });
    }

    // Handle predefined string formats
    switch (format) {
      case "userId:operationName":
        return operationName ? `${userId}:${operationName}` : userId;
      case "operationName:userId":
        return operationName ? `${operationName}:${userId}` : userId;
      case "operationName":
        return operationName || userId;
      case "userId":
      default:
        return userId;
    }
  }

  /**
   * Called when span ends - extracts GenAI semantic convention attributes
   * from Vercel AI SDK spans and enriches them for Langfuse.
   *
   * Also handles wrapper span support: when a host app creates a wrapper/trace-root
   * span before AI operations, we update the trace name here with the detected operation.
   */
  onEnd(span: Span): void {
    try {
      // Get span attributes (ReadableSpan interface)
      const readableSpan = span as unknown as {
        attributes?: LangfuseSpanAttributes;
        name?: string;
      };
      const attributes = readableSpan.attributes || {};

      // Handle wrapper/trace-root spans: update trace name with detected operation
      // This supports host apps (like Curator) that create wrapper spans before AI calls
      // This is optional - if spanContext fails, we skip wrapper span support
      try {
        const traceId = span.spanContext?.()?.traceId;
        if (traceId) {
          const isTraceRoot = attributes["langfuse.span.type"] === "trace-root";
          const detectedOp = this.detectedOperations.get(traceId);

          if (isTraceRoot && detectedOp) {
            const context = contextStorage.getStore();
            const userId =
              (attributes["user.id"] as string) ||
              context?.userId ||
              currentConfig?.userId ||
              "guest";

            // Only update if there's no explicit traceName set
            const existingTraceName = attributes[
              "langfuse.trace.name"
            ] as string;
            const hasExplicitTraceName =
              context?.traceName ||
              (existingTraceName && existingTraceName !== userId);

            if (!hasExplicitTraceName) {
              const newTraceName = this.buildTraceName(
                null,
                userId,
                detectedOp,
              );

              // Update the trace name attribute
              span.setAttribute("langfuse.trace.name", newTraceName);
              span.setAttribute("trace.name", newTraceName);
              span.setAttribute("gen_ai.operation.name", detectedOp);

              logger.debug(
                `${LOG_PREFIX} Updated trace-root span with detected operation`,
                {
                  traceId,
                  operation: detectedOp,
                  newTraceName,
                },
              );
            }

            // Cleanup the detected operation
            this.detectedOperations.delete(traceId);
          }
        }
      } catch {
        // Wrapper span support is optional - don't fail if spanContext isn't available
      }

      // Check if this is a GenAI span (from Vercel AI SDK)
      const isGenAISpan =
        attributes["gen_ai.system"] ||
        attributes["ai.model.id"] ||
        attributes["gen_ai.request.model"];

      if (isGenAISpan) {
        const model =
          (attributes["gen_ai.request.model"] as string) ||
          (attributes["ai.model.id"] as string);
        const provider =
          (attributes["gen_ai.system"] as string) ||
          (attributes["ai.model.provider"] as string);

        logger.debug(`${LOG_PREFIX} GenAI span detected`, {
          spanName: readableSpan.name,
          model,
          provider,
        });

        // L4/L6 fix: Set explicit Langfuse observation attributes so
        // cost dashboards and model analytics work correctly.
        try {
          const mAttrs = (
            span as unknown as { attributes: Record<string, unknown> }
          ).attributes;

          // L6: Model identity
          if (model) {
            mAttrs["gen_ai.response.model"] = model;
          }

          // L4: Usage details — aggregate from AI SDK attributes into a
          // structured JSON object that Langfuse can parse for cost analysis.
          const inputTokens =
            (attributes["gen_ai.usage.input_tokens"] as number) ??
            (attributes["ai.usage.promptTokens"] as number);
          const outputTokens =
            (attributes["gen_ai.usage.output_tokens"] as number) ??
            (attributes["ai.usage.completionTokens"] as number);
          const totalTokens =
            (attributes["gen_ai.usage.total_tokens"] as number) ??
            (inputTokens !== undefined && outputTokens !== undefined
              ? inputTokens + outputTokens
              : undefined);
          const reasoningTokens =
            (attributes["gen_ai.usage.reasoning_tokens"] as number) ??
            (attributes["ai.usage.reasoningTokens"] as number);
          const cachedTokens = attributes[
            "gen_ai.usage.input_cached_tokens"
          ] as number;

          if (inputTokens !== undefined || outputTokens !== undefined) {
            const usageDetails: Record<string, number> = {};
            if (inputTokens !== undefined) {
              usageDetails.input = inputTokens;
            }
            if (outputTokens !== undefined) {
              usageDetails.output = outputTokens;
            }
            if (totalTokens !== undefined) {
              usageDetails.total = totalTokens;
            }
            if (reasoningTokens !== undefined) {
              usageDetails.reasoning_tokens = reasoningTokens;
            }
            if (cachedTokens !== undefined) {
              usageDetails.input_cached_tokens = cachedTokens;
            }
            mAttrs["langfuse.usage_details"] = JSON.stringify(usageDetails);

            logger.debug(`${LOG_PREFIX} Token usage captured`, {
              inputTokens,
              outputTokens,
              totalTokens,
            });
          }

          // L7: Model parameters — surface temperature and max_tokens for
          // generation tuning visibility.
          const temperature =
            attributes["gen_ai.request.temperature"] ??
            attributes["ai.settings.temperature"];
          const maxTokens =
            attributes["gen_ai.request.max_tokens"] ??
            attributes["ai.settings.maxTokens"];
          const topP =
            attributes["gen_ai.request.top_p"] ??
            attributes["ai.settings.topP"];
          if (
            temperature !== undefined ||
            maxTokens !== undefined ||
            topP !== undefined
          ) {
            const params: Record<string, unknown> = {};
            if (temperature !== undefined) {
              params.temperature = temperature;
            }
            if (maxTokens !== undefined) {
              params.max_tokens = maxTokens;
            }
            if (topP !== undefined) {
              params.top_p = topP;
            }
            mAttrs["gen_ai.request.model_parameters"] = JSON.stringify(params);
          }
        } catch {
          // Read-only attributes — cannot enrich; Pipeline A will still
          // export the raw GenAI attributes that Langfuse can parse.
        }
      }

      // P8 fix: Propagate error status to Langfuse-consumable attributes.
      // OTel ReadableSpan attributes may be readonly at onEnd() time; the type
      // cast attempts late mutation. LangfuseSpanProcessor runs after
      // ContextEnricher in the spanProcessors array and reads these attributes,
      // so setting them here allows Langfuse to surface the correct level and
      // status message on the trace/generation.
      const readableStatus = (
        span as unknown as { status?: { code?: number; message?: string } }
      ).status;
      try {
        const mutableAttrs = (
          span as unknown as { attributes: Record<string, unknown> }
        ).attributes;

        if (readableStatus?.code === SpanStatusCode.ERROR) {
          mutableAttrs["langfuse.level"] = "ERROR";
          if (readableStatus.message) {
            mutableAttrs["langfuse.status_message"] = readableStatus.message;
          }
        } else {
          // P8 extended: Detect WARNING-level conditions on non-ERROR spans.
          // The AI SDK sets ai.finishReason on its spans; content-filter and
          // length finish reasons indicate partial failures that deserve WARNING.
          const finishReason =
            mutableAttrs["ai.finishReason"] ??
            mutableAttrs["gen_ai.response.finish_reasons"];
          const reasonStr = Array.isArray(finishReason)
            ? finishReason.join(",")
            : String(finishReason ?? "");
          if (reasonStr.includes("content-filter") || reasonStr === "length") {
            mutableAttrs["langfuse.level"] = "WARNING";
            mutableAttrs["langfuse.status_message"] =
              `Generation stopped: finishReason=${reasonStr}`;
          }
        }
      } catch {
        // Readonly enforcement by OTel SDK — mutation not possible; log at debug.
        logger.debug(
          `${LOG_PREFIX} Could not set langfuse.level on span (read-only attributes)`,
        );
      }
    } catch (error) {
      // Don't fail span processing on errors
      logger.debug(`${LOG_PREFIX} Error reading span attributes`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  shutdown(): Promise<void> {
    // Clean up tracked operations to prevent memory leaks
    this.detectedOperations.clear();
    return Promise.resolve();
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }
}

async function createLangfuseProcessor(
  config: LangfuseConfig,
): Promise<LangfuseSpanProcessorType> {
  let mod: typeof import("@langfuse/otel");
  try {
    mod = await import(/* @vite-ignore */ "@langfuse/otel");
  } catch (err) {
    const e = err instanceof Error ? (err as NodeJS.ErrnoException) : null;
    if (e?.code === "ERR_MODULE_NOT_FOUND" && e.message.includes("langfuse")) {
      throw new Error(
        'Langfuse observability requires "@langfuse/otel". Install it with:\n  pnpm add @langfuse/otel',
        { cause: err },
      );
    }
    throw err;
  }
  return new mod.LangfuseSpanProcessor({
    publicKey: config.publicKey,
    secretKey: config.secretKey,
    baseUrl: config.baseUrl || "https://cloud.langfuse.com",
    environment: config.environment || "dev",
    release: config.release || "v1.0.0",
    shouldExportSpan: () => true,
  });
}

async function initializeExternalOpenTelemetryMode(
  config: LangfuseConfig,
  resource: ReturnType<typeof resourceFromAttributes>,
  otlpEndpoint: string | undefined,
  serviceName: string,
  langfuseRequested: boolean,
  hasLangfuseCreds: boolean,
): Promise<void> {
  if (langfuseRequested && !hasLangfuseCreds) {
    if (!otlpEndpoint) {
      logger.warn(
        `${LOG_PREFIX} External provider mode requested Langfuse but credentials are missing, and no OTLP endpoint is configured; skipping initialization`,
        {
          hasPublicKey: !!config?.publicKey,
          hasSecretKey: !!config?.secretKey,
        },
      );
      isInitialized = true;
      isCredentialsValid = false;
      return;
    }

    logger.warn(
      `${LOG_PREFIX} External provider mode missing Langfuse credentials; continuing with OTLP-only metrics/logs`,
      {
        hasPublicKey: !!config?.publicKey,
        hasSecretKey: !!config?.secretKey,
        otlpEnabled: true,
      },
    );
  }

  try {
    currentConfig = config;
    isCredentialsValid = hasLangfuseCreds;
    langfuseProcessor =
      langfuseRequested && hasLangfuseCreds
        ? await createLangfuseProcessor(config)
        : null;

    usingExternalProvider = true;
    isInitialized = true;
    initializeOtlpMetricsAndLogs(resource, otlpEndpoint, serviceName);

    try {
      const globalProvider = trace.getTracerProvider();
      const provider = globalProvider as unknown as {
        addSpanProcessor?: (processor: SpanProcessor) => void;
      };

      if (globalProvider && typeof provider.addSpanProcessor === "function") {
        provider.addSpanProcessor(new ContextEnricher());

        // Auto-detect: skip if consumer already registered a LangfuseSpanProcessor.
        //
        // Detection strategy (ordered by robustness):
        // 1. Duck-type check for Langfuse-specific public member
        //    (`langfuseClient` property) — survives minification.
        // 2. `constructor.name === "LangfuseSpanProcessor"` — last resort,
        //    brittle under minification or bundler renaming.
        //
        // NOTE: `_registeredSpanProcessors` is an internal OpenTelemetry field.
        // If the OTel SDK removes or renames it, the array defaults to [] and
        // `hasExistingLangfuse` is false — NeuroLink registers its own processor
        // (same behavior as before this check). Consumers can always force skip
        // via `skipLangfuseSpanProcessor: true`.
        const existingProcessors =
          (provider as { _registeredSpanProcessors?: unknown[] })
            ._registeredSpanProcessors ?? [];
        const hasExistingLangfuse = existingProcessors.some((p) => {
          if (p === null || p === undefined || typeof p !== "object") {
            return false;
          }
          // Duck-type: Langfuse processor exposes a langfuseClient property
          if ("langfuseClient" in p) {
            return true;
          }
          // Fallback: constructor name (brittle under minification)
          return (
            (p as { constructor?: { name?: string } }).constructor?.name ===
            "LangfuseSpanProcessor"
          );
        });

        const skipLangfuse =
          config.skipLangfuseSpanProcessor === true ||
          !langfuseProcessor ||
          hasExistingLangfuse;

        if (hasExistingLangfuse && !config.skipLangfuseSpanProcessor) {
          logger.info(
            `${LOG_PREFIX} Auto-detected existing LangfuseSpanProcessor — skipping SDK registration to avoid duplicates`,
          );
        }

        if (!skipLangfuse && langfuseProcessor) {
          provider.addSpanProcessor(langfuseProcessor);
        }

        logger.info(
          `${LOG_PREFIX} Auto-registered processors with global TracerProvider`,
          {
            processors: skipLangfuse
              ? ["ContextEnricher"]
              : ["ContextEnricher", "LangfuseSpanProcessor"],
            reason: "External provider mode with auto-registration",
            skippedLangfuseSpanProcessor: skipLangfuse,
          },
        );
        return;
      }

      logger.info(`${LOG_PREFIX} Using external TracerProvider mode`, {
        reason: config.useExternalTracerProvider
          ? "useExternalTracerProvider=true"
          : "autoDetectExternalProvider=true (trusting host signal)",
        instructions:
          "Add span processors to your TracerProvider using getSpanProcessors()",
      });
      logger.info(`${LOG_PREFIX} Span processors ready for external use`, {
        processors: langfuseProcessor
          ? ["ContextEnricher", "LangfuseSpanProcessor"]
          : ["ContextEnricher"],
        usage: "import { getSpanProcessors } from '@juspay/neurolink'",
      });
    } catch (autoRegisterError) {
      logger.warn(
        `${LOG_PREFIX} Auto-registration failed, manual registration required`,
        {
          error:
            autoRegisterError instanceof Error
              ? autoRegisterError.message
              : String(autoRegisterError),
          instructions:
            "Add span processors to your TracerProvider using getSpanProcessors()",
        },
      );
    }
  } catch (error) {
    logger.error(
      `${LOG_PREFIX} Failed to create span processor for external mode`,
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
    );
    isInitialized = true;
  }
}

async function initializeStandaloneOpenTelemetryMode(
  config: LangfuseConfig,
  resource: ReturnType<typeof resourceFromAttributes>,
  otlpEndpoint: string | undefined,
  serviceName: string,
  langfuseRequested: boolean,
  hasLangfuseCreds: boolean,
): Promise<void> {
  if ((!langfuseRequested || !hasLangfuseCreds) && !otlpEndpoint) {
    if (langfuseRequested && !hasLangfuseCreds) {
      logger.warn(
        `${LOG_PREFIX} Langfuse requested but credentials are missing, and no OTLP endpoint is configured; skipping initialization`,
        {
          hasPublicKey: !!config.publicKey,
          hasSecretKey: !!config.secretKey,
        },
      );
    } else {
      logger.debug(
        `${LOG_PREFIX} Langfuse disabled and OTLP endpoint missing, skipping initialization`,
      );
    }
    isInitialized = true;
    return;
  }

  if (langfuseRequested && !hasLangfuseCreds) {
    logger.warn(
      `${LOG_PREFIX} Langfuse requested but credentials are missing; continuing with OTLP-only telemetry`,
      {
        hasPublicKey: !!config.publicKey,
        hasSecretKey: !!config.secretKey,
        otlpEnabled: !!otlpEndpoint,
      },
    );
  }

  try {
    currentConfig = config;
    isCredentialsValid = hasLangfuseCreds;
    langfuseProcessor =
      langfuseRequested && hasLangfuseCreds
        ? await createLangfuseProcessor(config)
        : null;

    logger.debug(`${LOG_PREFIX} Standalone observability mode`, {
      langfuseEnabled: !!langfuseProcessor,
      otlpEnabled: !!otlpEndpoint,
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
    });

    const spanProcessors: SpanProcessor[] = [new ContextEnricher()];
    if (langfuseProcessor) {
      spanProcessors.push(langfuseProcessor);
    }

    if (otlpEndpoint) {
      try {
        const otlpExporter = new OTLPTraceExporter({
          url: `${otlpEndpoint}/v1/traces`,
        });
        spanProcessors.push(
          new BatchSpanProcessor(otlpExporter, {
            maxQueueSize: 2048,
            maxExportBatchSize: 512,
            scheduledDelayMillis: 1000,
            exportTimeoutMillis: 30000,
          }),
        );
        logger.info(`${LOG_PREFIX} OTLP trace exporter added`, {
          endpoint: `${otlpEndpoint}/v1/traces`,
          serviceName,
        });
      } catch (otlpError) {
        logger.warn(
          `${LOG_PREFIX} Failed to create OTLP exporter (non-fatal)`,
          {
            error:
              otlpError instanceof Error
                ? otlpError.message
                : String(otlpError),
            endpoint: otlpEndpoint,
          },
        );
      }
    }

    tracerProvider = new NodeTracerProvider({ resource, spanProcessors });
    tracerProvider.register({
      propagator: new W3CTraceContextPropagator(),
    });
    usingExternalProvider = false;
    isInitialized = true;
    initializeOtlpMetricsAndLogs(resource, otlpEndpoint, serviceName);

    logger.info(`${LOG_PREFIX} Observability initialized`, {
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
      release: config.release || "v1.0.0",
      mode: "standalone",
      langfuseEnabled: !!langfuseProcessor,
      otlpEnabled: !!otlpEndpoint,
      serviceName,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDuplicateError =
      errorMessage.includes("duplicate registration") ||
      errorMessage.includes("already registered") ||
      errorMessage.includes("already set");

    if (isDuplicateError) {
      logger.warn(
        `${LOG_PREFIX} TracerProvider already registered, switching to external mode`,
        {
          error: errorMessage,
          recommendation:
            "Set useExternalTracerProvider=true or autoDetectExternalProvider=true in config",
        },
      );

      usingExternalProvider = true;
      isInitialized = true;
      return;
    }

    logger.error(`${LOG_PREFIX} Initialization failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Initialize OpenTelemetry with Langfuse span processor
 *
 * This connects Vercel AI SDK's experimental_telemetry to Langfuse by:
 * 1. Creating LangfuseSpanProcessor with Langfuse credentials
 * 2. Creating a NodeTracerProvider with service metadata and span processor
 * 3. Registering the provider globally for AI SDK to use
 *
 * NEW: If useExternalTracerProvider is true or autoDetectExternalProvider detects
 * an existing provider, steps 2 and 3 are skipped. The span processors are still
 * created and can be retrieved via getSpanProcessors().
 *
 * @param config - Langfuse configuration passed from parent application
 */
export async function initializeOpenTelemetry(
  config: LangfuseConfig,
): Promise<void> {
  // Guard against multiple initializations — but always update config
  // so that later NeuroLink instances can change traceNameFormat,
  // autoDetectOperationName, and other configuration preferences
  // without re-initializing the OTEL infrastructure.
  if (isInitialized) {
    currentConfig = config;
    logger.debug(`${LOG_PREFIX} Already initialized, config updated`, {
      usingExternalProvider,
      hasLangfuseProcessor: !!langfuseProcessor,
      hasTraceNameFormat: typeof config.traceNameFormat === "function",
    });
    return;
  }

  // FIRST: Check for external provider mode - bypasses enabled check
  // NOTE: When autoDetectExternalProvider is true, we trust the flag directly rather than
  // calling hasExternalTracerProvider(). This is because Neurolink may bundle its own copy
  // of @opentelemetry/api, which has a separate global state from the host application.
  // The hasExternalTracerProvider() check would query Neurolink's bundled @opentelemetry/api
  // global state (which has no provider registered), not the host's global state.
  // By trusting autoDetectExternalProvider=true, we let the host application signal that
  // it has already registered a TracerProvider.
  const shouldUseExternal =
    config?.useExternalTracerProvider === true ||
    config?.autoDetectExternalProvider === true;
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  const langfuseRequested = config?.enabled === true;
  const hasLangfuseCreds = !!config.publicKey && !!config.secretKey;
  const serviceName = process.env.OTEL_SERVICE_NAME || "neurolink";
  const resource = createOtelResource(config, serviceName);

  if (shouldUseExternal) {
    await initializeExternalOpenTelemetryMode(
      config,
      resource,
      otlpEndpoint,
      serviceName,
      langfuseRequested,
      hasLangfuseCreds,
    );
    return;
  }

  await initializeStandaloneOpenTelemetryMode(
    config,
    resource,
    otlpEndpoint,
    serviceName,
    langfuseRequested,
    hasLangfuseCreds,
  );
}

/**
 * Flush all pending spans to Langfuse
 */
export async function flushOpenTelemetry(): Promise<void> {
  if (!isInitialized) {
    logger.debug(`${LOG_PREFIX} Not initialized, skipping flush`);
    return;
  }

  const failures: Array<{ signal: string; error: unknown }> = [];

  if (langfuseProcessor) {
    try {
      logger.info(`${LOG_PREFIX} Flushing Langfuse spans...`);
      await langfuseProcessor.forceFlush();
    } catch (error) {
      failures.push({ signal: "langfuse", error });
      logger.error(`${LOG_PREFIX} Langfuse flush failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    logger.debug(`${LOG_PREFIX} Langfuse disabled, skipping Langfuse flush`);
  }

  if (tracerProvider && !usingExternalProvider) {
    try {
      logger.info(`${LOG_PREFIX} Flushing OTLP traces...`);
      await tracerProvider.forceFlush();
    } catch (error) {
      failures.push({ signal: "traces", error });
      logger.error(`${LOG_PREFIX} Trace flush failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    logger.debug(`${LOG_PREFIX} No TracerProvider to flush`);
  }

  if (meterProvider) {
    try {
      logger.info(`${LOG_PREFIX} Flushing OTLP metrics...`);
      await meterProvider.forceFlush();
    } catch (error) {
      failures.push({ signal: "metrics", error });
      logger.error(`${LOG_PREFIX} Metric flush failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    logger.debug(`${LOG_PREFIX} No MeterProvider to flush`);
  }

  if (loggerProvider) {
    try {
      logger.info(`${LOG_PREFIX} Flushing OTLP logs...`);
      await loggerProvider.forceFlush();
    } catch (error) {
      failures.push({ signal: "logs", error });
      logger.error(`${LOG_PREFIX} Log flush failed`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  } else {
    logger.debug(`${LOG_PREFIX} No LoggerProvider to flush`);
  }

  if (failures.length > 0) {
    throw new Error(
      `${LOG_PREFIX} Flush failed for: ${failures.map((f) => f.signal).join(", ")}`,
    );
  }

  logger.info(`${LOG_PREFIX} Flush complete`);
}

/**
 * Shutdown OpenTelemetry and Langfuse span processor
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (!isInitialized) {
    return;
  }

  try {
    // Only shutdown tracerProvider if we created it
    if (tracerProvider && !usingExternalProvider) {
      await tracerProvider.shutdown();
    }

    // Always shutdown the Langfuse processor
    if (langfuseProcessor) {
      await langfuseProcessor.shutdown();
    }

    // Shutdown cached ContextEnricher
    if (cachedContextEnricher) {
      await cachedContextEnricher.shutdown();
    }

    // Shutdown MeterProvider if we created it
    if (meterProvider) {
      await meterProvider.shutdown();
    }

    // Shutdown LoggerProvider if we created it
    if (loggerProvider) {
      await loggerProvider.shutdown();
    }

    tracerProvider = null;
    meterProvider = null;
    loggerProvider = null;
    langfuseProcessor = null;
    cachedContextEnricher = null;
    isInitialized = false;
    isCredentialsValid = false;
    usingExternalProvider = false;

    logger.debug(`${LOG_PREFIX} Shutdown complete`);
  } catch (error) {
    logger.error(`${LOG_PREFIX} Shutdown failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get the Langfuse span processor
 */
export function getLangfuseSpanProcessor(): SpanProcessor | null {
  return langfuseProcessor;
}

/**
 * Get the tracer provider
 */
export function getTracerProvider(): NodeTracerProvider | null {
  return tracerProvider;
}

/**
 * Get the logger provider for emitting OTLP log records.
 * Returns null if OTLP is not configured or LoggerProvider was not created.
 */
export function getLoggerProvider(): LoggerProvider | null {
  return loggerProvider;
}

/**
 * Check if OpenTelemetry is initialized
 */
export function isOpenTelemetryInitialized(): boolean {
  return isInitialized;
}

/**
 * Get health status for Langfuse observability
 *
 * @returns Health status object with initialization and configuration details
 */
export function getLangfuseHealthStatus(): {
  isHealthy: boolean;
  initialized: boolean;
  credentialsValid: boolean;
  enabled: boolean;
  hasProcessor: boolean;
  usingExternalProvider: boolean;
  config?: {
    baseUrl: string;
    environment: string;
    release: string;
  };
} {
  return {
    isHealthy: !!(
      currentConfig?.enabled &&
      isInitialized &&
      isCredentialsValid &&
      langfuseProcessor !== null
    ),
    initialized: isInitialized,
    credentialsValid: isCredentialsValid,
    enabled: currentConfig?.enabled || false,
    hasProcessor: langfuseProcessor !== null,
    usingExternalProvider,
    config: currentConfig
      ? {
          baseUrl: currentConfig.baseUrl || "https://cloud.langfuse.com",
          environment: currentConfig.environment || "dev",
          release: currentConfig.release || "v1.0.0",
        }
      : undefined,
  };
}

/**
 * Set user and session context for Langfuse spans in the current async context
 *
 * Merges the provided context with existing AsyncLocalStorage context. If a callback is provided,
 * the context is scoped to that callback execution and returns the callback's result.
 * Without a callback, the context applies to the current execution context and its children.
 *
 * Uses AsyncLocalStorage to properly scope context per request, avoiding race conditions
 * in concurrent scenarios.
 *
 * @param context - Object containing context fields to merge with existing context
 * @param callback - Optional callback to run within the context scope. If omitted, context applies to current execution
 * @returns The callback's return value if provided, otherwise void
 *
 * @example
 * // With callback - returns the result
 * const result = await setLangfuseContext({ userId: "user123" }, async () => {
 *   return await generateText({ model: "gpt-4", prompt: "Hello" });
 * });
 *
 * @example
 * // Without callback - sets context for current execution
 * await setLangfuseContext({ sessionId: "session456", traceName: "chat-completion" });
 */
export async function setLangfuseContext<T = void>(
  context: {
    userId?: string | null;
    sessionId?: string | null;
    conversationId?: string | null;
    requestId?: string | null;
    traceName?: string | null;
    metadata?: Record<string, unknown> | null;
    /** Explicit operation name (overrides auto-detection) */
    operationName?: string | null;
    /** Override global autoDetectOperationName for this context */
    autoDetectOperationName?: boolean;
    /** Custom attributes to set on all spans within this context */
    customAttributes?: Record<string, string | number | boolean>;
  },
  callback?: () => T | Promise<T>,
): Promise<T | void> {
  const currentContext = contextStorage.getStore() || {};
  const newContext: LangfuseContext = {
    userId:
      context.userId !== undefined ? context.userId : currentContext.userId,
    sessionId:
      context.sessionId !== undefined
        ? context.sessionId
        : currentContext.sessionId,
    conversationId:
      context.conversationId !== undefined
        ? context.conversationId
        : currentContext.conversationId,
    requestId:
      context.requestId !== undefined
        ? context.requestId
        : currentContext.requestId,
    traceName:
      context.traceName !== undefined
        ? context.traceName
        : currentContext.traceName,
    metadata:
      context.metadata !== undefined
        ? context.metadata
        : currentContext.metadata,
    // Operation name support
    operationName:
      context.operationName !== undefined
        ? context.operationName
        : currentContext.operationName,
    autoDetectOperationName:
      context.autoDetectOperationName !== undefined
        ? context.autoDetectOperationName
        : currentContext.autoDetectOperationName,
    // Custom attributes support
    customAttributes:
      context.customAttributes !== undefined
        ? context.customAttributes
        : currentContext.customAttributes,
  };

  if (callback) {
    return await contextStorage.run(newContext, callback);
  } else {
    contextStorage.enterWith(newContext);
  }
}

/**
 * Get the current Langfuse context from AsyncLocalStorage
 *
 * Returns the current context including userId, sessionId, conversationId,
 * requestId, traceName, and metadata. Returns undefined if no context is set.
 *
 * @returns The current LangfuseContext or undefined
 *
 * @example
 * const context = getLangfuseContext();
 * console.log(context?.userId, context?.sessionId);
 */
export function getLangfuseContext(): LangfuseContext | undefined {
  return contextStorage.getStore();
}

/**
 * Capture the current Langfuse AsyncLocalStorage context and return a wrapper
 * that re-enters that context when executing the provided callback.
 *
 * This is essential for preserving trace context across async boundaries that
 * break the automatic ALS propagation chain, such as `setImmediate()`,
 * `setTimeout()`, or event-emitter callbacks. Without this, spans created
 * inside those callbacks become orphaned traces in Langfuse.
 *
 * **How it works:**
 * 1. Captures the current ALS store at call time (synchronously).
 * 2. Returns an async function that, when invoked, re-enters the captured
 *    context via `contextStorage.run()` before executing the callback.
 * 3. If no context exists at capture time, the callback runs without
 *    ALS wrapping (no-op passthrough).
 *
 * @param fn - The async function to execute within the captured context
 * @returns A new async function that preserves the Langfuse ALS context
 *
 * @example
 * // Before (broken — setImmediate loses ALS context):
 * setImmediate(async () => {
 *   await this.checkAndSummarize(session, threshold);
 * });
 *
 * // After (fixed — context is captured and re-entered):
 * const wrappedFn = runWithCurrentLangfuseContext(async () => {
 *   await this.checkAndSummarize(session, threshold);
 * });
 * setImmediate(wrappedFn);
 */
export function runWithCurrentLangfuseContext<T>(
  fn: () => Promise<T>,
): () => Promise<T> {
  const capturedContext = contextStorage.getStore();
  if (capturedContext) {
    return () => contextStorage.run(capturedContext, fn);
  }
  // No context to preserve — return the function as-is
  return fn;
}

/**
 * Get an OpenTelemetry Tracer for creating custom spans
 *
 * This allows applications to create their own spans that will be
 * processed by the same span processors (ContextEnricher + LangfuseSpanProcessor).
 *
 * @param name - Tracer name, defaults to "neurolink"
 * @param version - Tracer version, optional
 * @returns OpenTelemetry Tracer instance
 *
 * @example
 * const tracer = getTracer("my-app");
 * const span = tracer.startSpan("custom-operation");
 * try {
 *   // ... do work
 * } finally {
 *   span.end();
 * }
 */
export function getTracer(
  name: string = "neurolink",
  version?: string,
): ReturnType<typeof trace.getTracer> {
  return trace.getTracer(name, version);
}

/**
 * Create a new ContextEnricher span processor
 * Use this when useExternalTracerProvider is true to add to your own TracerProvider
 *
 * @returns A new ContextEnricher instance
 */
export function createContextEnricher(): SpanProcessor {
  return new ContextEnricher();
}

/**
 * Get all span processors that NeuroLink would use
 * Convenience function that returns [ContextEnricher, LangfuseSpanProcessor]
 *
 * @returns Array of span processors, or empty array if not initialized
 */
export function getSpanProcessors(): SpanProcessor[] {
  if (!isInitialized || !langfuseProcessor) {
    logger.warn(`${LOG_PREFIX} getSpanProcessors called but not initialized`);
    return [];
  }
  // Reuse cached ContextEnricher to avoid creating multiple instances
  if (!cachedContextEnricher) {
    cachedContextEnricher = new ContextEnricher();
  }
  return [cachedContextEnricher, langfuseProcessor];
}

/**
 * Check if using external TracerProvider mode
 *
 * @returns true if operating in external TracerProvider mode
 */
export function isUsingExternalTracerProvider(): boolean {
  return usingExternalProvider;
}
