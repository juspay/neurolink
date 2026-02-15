/**
 * OpenTelemetry Instrumentation for Langfuse v4
 *
 * Configures OpenTelemetry TracerProvider with LangfuseSpanProcessor to capture
 * traces from Vercel AI SDK's experimental_telemetry feature.
 *
 * Flow: Vercel AI SDK → OpenTelemetry Spans → LangfuseSpanProcessor → Langfuse Platform
 */

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { LangfuseSpanProcessor } from "@langfuse/otel";
import type { Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { AsyncLocalStorage } from "async_hooks";
import { trace } from "@opentelemetry/api";
import { logger } from "../../../../utils/logger.js";
import type {
  LangfuseConfig,
  LangfuseSpanAttributes,
} from "../../../../types/observability.js";

const LOG_PREFIX = "[OpenTelemetry]";

/**
 * Extended context for Langfuse spans
 * Supports all Langfuse trace attributes for rich observability
 */
export type LangfuseContext = {
  userId?: string | null;
  sessionId?: string | null;
  /** Conversation/thread identifier for grouping related traces */
  conversationId?: string | null;
  /** Request identifier for correlating with application logs */
  requestId?: string | null;
  /** Custom trace name for better organization in Langfuse UI */
  traceName?: string | null;
  /** Custom metadata to attach to spans */
  metadata?: Record<string, unknown> | null;

  // Operation Name Support

  /**
   * Explicit operation name (e.g., "ai.streamText", "chat", "embeddings")
   *
   * If set, this overrides auto-detection from the span name.
   * Use this when you want a custom operation name that doesn't match
   * the auto-detected Vercel AI SDK operation.
   *
   * @example
   * await setLangfuseContext({
   *   userId: "user@email.com",
   *   operationName: "customer-support-chat"
   * }, async () => {
   *   // Trace name: "user@email.com:customer-support-chat"
   * });
   */
  operationName?: string | null;

  /**
   * Override global autoDetectOperationName setting for this context.
   *
   * When undefined, uses the global setting from LangfuseConfig.
   * Set to false to disable auto-detection for this specific context.
   *
   * @default undefined (uses global setting, which defaults to true)
   */
  autoDetectOperationName?: boolean;

  /**
   * Custom attributes to set on all spans within this context.
   *
   * These attributes are propagated to every span created within the
   * AsyncLocalStorage context, enabling application-level context
   * (e.g., Slack channel name, feature flag, tenant ID) to appear
   * on all SDK-internal spans.
   *
   * @example
   * await setLangfuseContext({
   *   userId: "user@email.com",
   *   customAttributes: {
   *     "app.slack.channel": "engineering",
   *     "app.tenant.id": "tenant-123",
   *     "app.feature.flag": true,
   *   }
   * }, async () => {
   *   // All spans created here will have these attributes
   * });
   */
  customAttributes?: Record<string, string | number | boolean>;
};

const contextStorage = new AsyncLocalStorage<LangfuseContext>();

let tracerProvider: NodeTracerProvider | null = null;
let langfuseProcessor: LangfuseSpanProcessor | null = null;
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

  onStart(span: Span): void {
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

    // Set trace name for Langfuse (using proper Langfuse attribute)
    if (traceName) {
      span.setAttribute("langfuse.trace.name", traceName);
      span.setAttribute("trace.name", traceName); // Keep for compatibility
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
            span.setAttribute(`metadata.${key}`, value);
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
            span.setAttribute(
              `metadata.${key}`,
              value as string[] | number[] | boolean[],
            );
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
        logger.debug(`${LOG_PREFIX} GenAI span detected`, {
          spanName: readableSpan.name,
          model:
            attributes["gen_ai.request.model"] || attributes["ai.model.id"],
          provider:
            attributes["gen_ai.system"] || attributes["ai.model.provider"],
        });

        // Log token usage for observability
        const inputTokens =
          attributes["gen_ai.usage.input_tokens"] ||
          attributes["ai.usage.promptTokens"];
        const outputTokens =
          attributes["gen_ai.usage.output_tokens"] ||
          attributes["ai.usage.completionTokens"];

        if (inputTokens !== undefined || outputTokens !== undefined) {
          logger.debug(`${LOG_PREFIX} Token usage captured`, {
            inputTokens,
            outputTokens,
            totalTokens: attributes["gen_ai.usage.total_tokens"],
          });
        }
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
export function initializeOpenTelemetry(config: LangfuseConfig): void {
  // Guard against multiple initializations
  if (isInitialized) {
    logger.debug(`${LOG_PREFIX} Already initialized`, {
      usingExternalProvider,
      hasLangfuseProcessor: !!langfuseProcessor,
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

  if (shouldUseExternal) {
    // Validate credentials even in external mode
    if (!config?.publicKey || !config?.secretKey) {
      logger.warn(
        `${LOG_PREFIX} External provider mode but missing credentials, skipping initialization`,
        {
          hasPublicKey: !!config?.publicKey,
          hasSecretKey: !!config?.secretKey,
        },
      );
      isInitialized = true;
      isCredentialsValid = false;
      return;
    }

    try {
      currentConfig = config;
      isCredentialsValid = true;

      // Create span processor for external provider mode
      langfuseProcessor = new LangfuseSpanProcessor({
        publicKey: config.publicKey,
        secretKey: config.secretKey,
        baseUrl: config.baseUrl || "https://cloud.langfuse.com",
        environment: config.environment || "dev",
        release: config.release || "v1.0.0",
      });

      usingExternalProvider = true;
      isInitialized = true;

      // Auto-register ContextEnricher with the global TracerProvider
      // This ensures trace names are set even when host doesn't call getSpanProcessors()
      try {
        const globalProvider = trace.getTracerProvider();

        // Check if it's a real provider with addSpanProcessor method (not the no-op default)
        if (
          globalProvider &&
          typeof (globalProvider as unknown as { addSpanProcessor?: unknown })
            .addSpanProcessor === "function"
        ) {
          const provider = globalProvider as unknown as {
            addSpanProcessor: (processor: SpanProcessor) => void;
          };

          // Add ContextEnricher for trace name enrichment
          provider.addSpanProcessor(new ContextEnricher());

          // Also add LangfuseSpanProcessor so traces are sent to Langfuse
          provider.addSpanProcessor(langfuseProcessor);

          logger.info(
            `${LOG_PREFIX} Auto-registered processors with global TracerProvider`,
            {
              processors: ["ContextEnricher", "LangfuseSpanProcessor"],
              reason: "External provider mode with auto-registration",
            },
          );
        } else {
          // No real provider found - host will need to add processors manually
          logger.info(`${LOG_PREFIX} Using external TracerProvider mode`, {
            reason: config.useExternalTracerProvider
              ? "useExternalTracerProvider=true"
              : "autoDetectExternalProvider=true (trusting host signal)",
            instructions:
              "Add span processors to your TracerProvider using getSpanProcessors()",
          });

          logger.info(`${LOG_PREFIX} Span processors ready for external use`, {
            processors: ["ContextEnricher", "LangfuseSpanProcessor"],
            usage: "import { getSpanProcessors } from '@juspay/neurolink'",
          });
        }
      } catch (autoRegisterError) {
        // Auto-registration failed - fall back to manual registration
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

      return;
    } catch (error) {
      logger.error(
        `${LOG_PREFIX} Failed to create span processor for external mode`,
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        },
      );
      isInitialized = true;
      return;
    }
  }

  // THEN: Check enabled for standalone mode
  if (!config?.enabled) {
    logger.debug(
      `${LOG_PREFIX} Langfuse disabled and no external provider, skipping initialization`,
    );
    isInitialized = true;
    return;
  }

  // Validate credentials for standalone mode
  if (!config.publicKey || !config.secretKey) {
    logger.warn(
      `${LOG_PREFIX} Langfuse enabled but missing credentials, skipping initialization`,
      {
        hasPublicKey: !!config.publicKey,
        hasSecretKey: !!config.secretKey,
      },
    );
    isInitialized = true;
    isCredentialsValid = false;
    return;
  }

  try {
    currentConfig = config;
    isCredentialsValid = true;

    // Step 1: Create LangfuseSpanProcessor for standalone mode
    langfuseProcessor = new LangfuseSpanProcessor({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
      release: config.release || "v1.0.0",
    });

    logger.debug(`${LOG_PREFIX} Created LangfuseSpanProcessor`, {
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
    });

    // Step 2: Create our own TracerProvider (standalone behavior)
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "neurolink",
      [ATTR_SERVICE_VERSION]: config.release || "v1.0.0",
      "deployment.environment": config.environment || "dev",
    });

    tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [new ContextEnricher(), langfuseProcessor],
    });

    // Step 4: Register globally
    tracerProvider.register();
    usingExternalProvider = false;
    isInitialized = true;

    logger.info(`${LOG_PREFIX} Initialized with Langfuse span processor`, {
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
      release: config.release || "v1.0.0",
      mode: "standalone",
    });
  } catch (error) {
    // Check if this is a duplicate registration error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isDuplicateError =
      errorMessage.includes("duplicate registration") ||
      errorMessage.includes("already registered") ||
      errorMessage.includes("already set");

    if (isDuplicateError) {
      // Graceful handling: switch to external mode
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

      // Don't throw - processors are still usable
      return;
    }

    // Other errors: log and re-throw
    logger.error(`${LOG_PREFIX} Initialization failed`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Flush all pending spans to Langfuse
 */
export async function flushOpenTelemetry(): Promise<void> {
  if (!isInitialized) {
    logger.debug(`${LOG_PREFIX} Not initialized, skipping flush`);
    return;
  }

  if (!langfuseProcessor) {
    logger.debug(`${LOG_PREFIX} No processor to flush (Langfuse disabled)`);
    return;
  }

  try {
    logger.info(`${LOG_PREFIX} Flushing pending spans to Langfuse...`);
    await langfuseProcessor.forceFlush();
    logger.info(`${LOG_PREFIX} Successfully flushed spans to Langfuse`);
  } catch (error) {
    logger.error(`${LOG_PREFIX} Flush failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
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

    tracerProvider = null;
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
export function getLangfuseSpanProcessor(): LangfuseSpanProcessor | null {
  return langfuseProcessor;
}

/**
 * Get the tracer provider
 */
export function getTracerProvider(): NodeTracerProvider | null {
  return tracerProvider;
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
