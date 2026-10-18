import {
  propagateAttributes,
  setLangfuseTracerProvider,
} from "@langfuse/tracing";
import {
  context,
  createContextKey,
  metrics,
  type Context,
} from "@opentelemetry/api";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import {
  resourceFromAttributes,
  type Resource,
} from "@opentelemetry/resources";
import type { MeterProvider } from "@opentelemetry/sdk-metrics";
import type {
  ReadableSpan,
  SpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { DEFAULT_FLUSH_BUDGET_MS } from "../../../../constants/langfuse.js";
import {
  OTEL_LOG_PREFIX,
  TRACE_METADATA_CONTEXT_KEY,
} from "../../../../constants/telemetry.js";
import { getExporterRegistry } from "../../../../observability/exporterRegistry.js";
import { ExporterSpanProcessor } from "../../../../observability/exporterSpanProcessor.js";
import { LangfuseExporter } from "../../../../observability/exporters/langfuseExporter.js";
import { spanJsonAttribute } from "../../../../telemetry/attributes.js";
import {
  hasHostTracerProvider,
  registerTelemetryStarter,
} from "../../../../telemetry/telemetryStarter.js";
import type {
  NeurolinkTraceContext,
  ObservabilityConfig,
  OtlpConnections,
  SpanContent,
} from "../../../../types/index.js";
import { logger } from "../../../../utils/logger.js";
import {
  createLangfuseExporter,
  isLangfuseEnabled,
  isOff,
  resolveEnvironment,
  resolveRelease,
} from "./langfuseSetup.js";
import {
  createOtlpConnections,
  createOtlpMeterProvider,
  createOtlpSpanProcessor,
} from "./otlpSetup.js";

const MAX_PROPAGATED_CHARS = 200;
const LANGFUSE_EXPORTER_NAME = "langfuse";
const TRACE_METADATA_KEY = createContextKey(TRACE_METADATA_CONTEXT_KEY);
const CONTEXT_PROBE_KEY = createContextKey("neurolink.context-manager-probe");
// `false`, `0`, `off` or `no` skips the flush at process exit; the released build had none.
const EXIT_FLUSH_SWITCH = "NEUROLINK_TELEMETRY_EXIT_FLUSH";

let tracerProvider: NodeTracerProvider | null = null;
let registryProcessor: SpanProcessor | null = null;
let otlpProcessor: SpanProcessor | null = null;
let meterProvider: MeterProvider | null = null;
let otlpConnections: OtlpConnections | null = null;
let flushBudgetMs = DEFAULT_FLUSH_BUDGET_MS;
let langfuseExporter: LangfuseExporter | null = null;
let usingExternalProvider = false;
let started = false;
let startedConfig: ObservabilityConfig | undefined;
let initialized = false;
let ignoredConfigDebugLogged = false;
const ignoredConfigWarnings = new Set<string>();
let exitFlushRegistered = false;
let initializationError: string | null = null;
let terminated = false;
let terminationLogged = false;
let unconfiguredLogged = false;
let missingKeysLogged = false;
let holders = 0;

function differingConfigFields(
  first: ObservabilityConfig | undefined,
  later: ObservabilityConfig,
): string[] {
  const firstLangfuse = first?.langfuse;
  const laterLangfuse = later.langfuse;
  if ((firstLangfuse === false) !== (laterLangfuse === false)) {
    return ["langfuse"];
  }
  const left: Record<string, unknown> =
    typeof firstLangfuse === "object" ? firstLangfuse : {};
  const right: Record<string, unknown> =
    typeof laterLangfuse === "object" ? laterLangfuse : {};
  return [...new Set([...Object.keys(left), ...Object.keys(right)])]
    .filter((key) => left[key] !== right[key])
    .sort();
}

function reportIgnoredConfig(config: ObservabilityConfig): void {
  const differing = differingConfigFields(startedConfig, config);
  if (differing.length === 0) {
    if (!ignoredConfigDebugLogged) {
      ignoredConfigDebugLogged = true;
      logger.debug(
        `${OTEL_LOG_PREFIX} Telemetry already started; ignoring observability config`,
      );
    }
    return;
  }
  const fields = differing.join(", ");
  if (ignoredConfigWarnings.has(fields)) {
    return;
  }
  ignoredConfigWarnings.add(fields);
  logger.warn(
    `${OTEL_LOG_PREFIX} Telemetry already started; ignoring the observability config of a later NeuroLink instance. The first config stays in effect; the ignored one differs in: ${fields}`,
  );
}

function flushBudgetOf(config?: ObservabilityConfig): number {
  const budget =
    typeof config?.langfuse === "object"
      ? config.langfuse.flushBudgetMs
      : undefined;
  return budget !== undefined && budget > 0 ? budget : DEFAULT_FLUSH_BUDGET_MS;
}

function hasLangfuseKeys(config?: ObservabilityConfig): boolean {
  const options = typeof config?.langfuse === "object" ? config.langfuse : {};
  return Boolean(
    (options.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY) &&
    (options.secretKey ?? process.env.LANGFUSE_SECRET_KEY),
  );
}

// An unreachable collector must not hold the caller past the budget. When the
// budget runs out `onExpiry` closes what the work still has open, so the export
// does not carry on to its own timeout and hold the process open.
async function withinBudget(
  work: Promise<void> | undefined,
  budgetMs: number,
  onExpiry?: () => void,
): Promise<void> {
  if (!work) {
    return;
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      onExpiry?.();
      reject(new Error(`did not finish within ${budgetMs}ms`));
    }, budgetMs);
  });
  try {
    await Promise.race([work, expired]);
  } finally {
    clearTimeout(timer);
  }
}

function cutOtlpConnections(): void {
  otlpConnections?.cut();
}

function reportUnsettled(
  action: string,
  results: PromiseSettledResult<unknown>[],
): void {
  const errors = results.flatMap((result) =>
    result.status === "rejected"
      ? [
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
        ]
      : [],
  );
  if (errors.length > 0) {
    logger.warn(
      `${OTEL_LOG_PREFIX} ${action} did not complete; spans or metrics still pending may be lost`,
      { errors },
    );
  }
}

function flushBeforeExit(): void {
  if (isOff(process.env[EXIT_FLUSH_SWITCH])) {
    return;
  }
  flushOpenTelemetry().catch((error: unknown) => {
    logger.debug(`${OTEL_LOG_PREFIX} Flush at process exit failed`, {
      error: error instanceof Error ? error.message : String(error),
    });
  });
}

function registerExitFlush(): void {
  if (exitFlushRegistered) {
    return;
  }
  exitFlushRegistered = true;
  process.once("beforeExit", flushBeforeExit);
}

// Without a registered context manager `context.with` runs the callback but
// `context.active()` stays the root context, so nothing set on a context
// (user, session, the parent span) reaches the spans created inside.
function hasContextManager(): boolean {
  return context.with(
    context.active().setValue(CONTEXT_PROBE_KEY, true),
    () => context.active().getValue(CONTEXT_PROBE_KEY) === true,
  );
}

// The OTLP traces and metrics keep the service name existing dashboards and
// alerts match on. The provider's own resource, which the registry exporters
// (Langfuse) read, is built in `initialize` with its own default.
function otlpResourceOf(config?: ObservabilityConfig): Resource {
  const environment = resolveEnvironment(config);
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "ai-service",
    [ATTR_SERVICE_VERSION]:
      resolveRelease(config) || process.env.npm_package_version || "v1.0.0",
    ...(environment && { "deployment.environment": environment }),
  });
}

// A view over each ended span rather than a copy, so the methods and fields the
// exporter reads stay intact, with the sink's own resource on top.
function withResource(
  processor: SpanProcessor,
  resource: Resource,
): SpanProcessor {
  return {
    onStart: (span, parentContext) => processor.onStart(span, parentContext),
    onEnd: (span) => {
      const view: ReadableSpan = Object.create(span, {
        resource: { value: resource, enumerable: true },
      });
      processor.onEnd(view);
    },
    forceFlush: () => processor.forceFlush(),
    shutdown: () => processor.shutdown(),
  };
}

function registerLangfuseExporter(
  config?: ObservabilityConfig,
): LangfuseExporter | null {
  const registry = getExporterRegistry();
  const existing = registry.get(LANGFUSE_EXPORTER_NAME);
  if (existing) {
    return existing instanceof LangfuseExporter ? existing : null;
  }
  const exporter = createLangfuseExporter(config);
  if (exporter) {
    registry.register(exporter);
  }
  return exporter;
}

function initialize(config?: ObservabilityConfig): boolean {
  const langfuseRequested = isLangfuseEnabled(config);
  // Without both keys there is nothing to export to, so Langfuse counts as not
  // configured and a later config that has them can still start tracing.
  const langfuse = langfuseRequested && hasLangfuseKeys(config);
  if (langfuseRequested && !langfuse && !missingKeysLogged) {
    missingKeysLogged = true;
    logger.warn(
      `${OTEL_LOG_PREFIX} Langfuse is enabled but publicKey and secretKey are not both set in config or LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY; not exporting to Langfuse`,
    );
  }
  const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  // An options object starts the pipeline even without keys, as it always did:
  // exporters registered on the shared registry still receive the spans.
  const optionsObject =
    langfuseRequested && typeof config?.langfuse === "object";
  if (!langfuse && !optionsObject && !otlpEndpoint) {
    if (!unconfiguredLogged) {
      unconfiguredLogged = true;
      logger.debug(
        `${OTEL_LOG_PREFIX} Langfuse and OTLP not configured; skipping`,
      );
    }
    return config?.langfuse === false;
  }

  flushBudgetMs = flushBudgetOf(config);

  if (hasHostTracerProvider()) {
    usingExternalProvider = true;
    initialized = true;
    langfuseExporter = langfuse ? registerLangfuseExporter(config) : null;
    if (langfuseExporter) {
      logger.info(
        `${OTEL_LOG_PREFIX} Host TracerProvider detected; Langfuse exporter registered. Add \`createExporterSpanProcessor()\` to the host provider to export NeuroLink spans to it, and register a context manager (\`NodeTracerProvider.register()\` and \`NodeSDK\` do) so user, session and parent spans reach the spans NeuroLink creates.`,
      );
      if (!hasContextManager()) {
        logger.warn(
          `${OTEL_LOG_PREFIX} The host TracerProvider has no context manager registered: setLangfuseContext() user, session and metadata and parent/child span nesting are lost. Register one, for example with \`NodeTracerProvider.register()\`, or start the host with \`NodeSDK\`.`,
        );
      }
    } else {
      logger.info(
        `${OTEL_LOG_PREFIX} Host TracerProvider detected; NeuroLink registers no provider and no exporter.`,
      );
    }
    if (otlpEndpoint) {
      logger.warn(
        `${OTEL_LOG_PREFIX} OTEL_EXPORTER_OTLP_ENDPOINT is ignored because a host TracerProvider is registered; NeuroLink exports no traces or metrics to it. Add an OTLP exporter to the host's own providers. NeuroLink's ai_* metrics are recorded on the host's MeterProvider.`,
      );
    }
    if (langfuseExporter) {
      registerExitFlush();
    }
    return true;
  }

  const environment = resolveEnvironment(config);
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || "neurolink",
    [ATTR_SERVICE_VERSION]:
      resolveRelease(config) || process.env.npm_package_version || "v1.0.0",
    ...(environment && { "deployment.environment": environment }),
  });

  const exporter = langfuse ? registerLangfuseExporter(config) : null;
  const otlpResource = otlpResourceOf(config);
  const connections = otlpEndpoint ? createOtlpConnections() : null;
  const otlpExporter = otlpEndpoint
    ? createOtlpSpanProcessor(
        otlpEndpoint,
        flushBudgetMs,
        connections ?? undefined,
      )
    : null;
  const otlpSpanProcessor =
    otlpExporter && withResource(otlpExporter, otlpResource);
  const exporterSpanProcessor = new ExporterSpanProcessor(
    getExporterRegistry(),
    true,
  );
  const spanProcessors: SpanProcessor[] = [exporterSpanProcessor];
  if (otlpSpanProcessor) {
    spanProcessors.push(otlpSpanProcessor);
  }

  const provider = new NodeTracerProvider({ resource, spanProcessors });
  provider.register({ propagator: new W3CTraceContextPropagator() });
  setLangfuseTracerProvider(provider);

  tracerProvider = provider;
  registryProcessor = exporterSpanProcessor;
  otlpProcessor = otlpSpanProcessor;
  langfuseExporter = exporter;
  meterProvider = otlpEndpoint
    ? createOtlpMeterProvider(
        otlpEndpoint,
        otlpResource,
        flushBudgetMs,
        connections ?? undefined,
      )
    : null;
  otlpConnections = connections;
  usingExternalProvider = false;
  initialized = true;
  registerExitFlush();

  logger.info(`${OTEL_LOG_PREFIX} Observability initialized`, {
    langfuseEnabled: exporter !== null,
    otlpEnabled: otlpSpanProcessor !== null,
  });
  return true;
}

async function stop(): Promise<void> {
  const provider = tracerProvider;
  const registry = registryProcessor;
  const otlp = otlpProcessor;
  const meters = meterProvider;
  const connections = otlpConnections;
  const hostExporter = usingExternalProvider ? langfuseExporter : null;
  const budgetMs = flushBudgetMs;
  terminated = true;
  tracerProvider = null;
  registryProcessor = null;
  otlpProcessor = null;
  meterProvider = null;
  otlpConnections = null;
  langfuseExporter = null;
  usingExternalProvider = false;
  started = false;
  startedConfig = undefined;
  initialized = false;
  initializationError = null;
  process.off("beforeExit", flushBeforeExit);
  exitFlushRegistered = false;
  if (provider) {
    setLangfuseTracerProvider(null);
  }
  if (meters) {
    metrics.disable();
  }
  if (hostExporter) {
    getExporterRegistry().unregister(hostExporter.getName());
  }
  // The provider's own shutdown only shuts down these processors; each is shut
  // down here so the OTLP one is bounded and Langfuse keeps its own budget.
  const results = await Promise.allSettled([
    registry?.shutdown(),
    withinBudget(otlp?.shutdown(), budgetMs, () => connections?.cut()),
    hostExporter?.shutdown(),
    withinBudget(meters?.shutdown(), budgetMs, () => connections?.cut()),
  ]);
  reportUnsettled("Shutdown", results);
}

/**
 * @description Starts NeuroLink's tracing once per process, synchronously. Every span created through the shared tracers calls it first once this module is loaded, as the main, server and livekit entries do, so direct provider calls without a NeuroLink instance are traced too. Langfuse is enabled unless `config.langfuse` is `false` or has `enabled: false`, when `config.langfuse` is `true` or an options object, or when `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set and `LANGFUSE_ENABLED` is not `false`, `0`, `off` or `no`; an OTLP exporter is added when `OTEL_EXPORTER_OTLP_ENDPOINT` is set. When the host already registered a TracerProvider no provider is created and `OTEL_EXPORTER_OTLP_ENDPOINT` is ignored with a warning; the Langfuse exporter, if configured, is registered on the shared exporter registry and the host adds `createExporterSpanProcessor()` to its provider. The first call that finds tracing configured decides the setup and a later `config` is ignored, with a warning naming the options that differ from the first when it does differ; calls made before anything is configured start nothing, so a later config or environment can still start tracing, unless `langfuse: false` was passed. Langfuse enabled without both keys (in config or the environment) exports nothing to Langfuse, and a warning says so once. With `langfuse: true` or the environment alone that counts as not configured, so only an OTLP endpoint starts tracing; an options object starts tracing anyway, as it always did, so exporters registered on the shared registry receive the spans. Pending spans and metrics are flushed when the process runs out of work (`beforeExit`), within the same budget as `flushOpenTelemetry`, which an explicit `process.exit()` skips; `NEUROLINK_TELEMETRY_EXIT_FLUSH` set to `false`, `0`, `off` or `no` skips that flush too, and the process ends as soon as it has no work. After `shutdownOpenTelemetry` it does nothing.
 * @param config {ObservabilityConfig | undefined} - Observability options, honoured only when this is the first call.
 * @returns {void} Nothing; a failed setup is logged and recorded in `getLangfuseHealthStatus`.
 */
export function ensureTelemetry(config?: ObservabilityConfig): void {
  if (terminated) {
    if (!terminationLogged) {
      terminationLogged = true;
      logger.debug(
        `${OTEL_LOG_PREFIX} Telemetry was shut down for this process; not restarting`,
      );
    }
    return;
  }
  if (started) {
    if (config) {
      reportIgnoredConfig(config);
    }
    return;
  }
  initializationError = null;
  try {
    started = initialize(config);
    startedConfig = started ? config : undefined;
  } catch (error) {
    started = true;
    startedConfig = config;
    initializationError =
      error instanceof Error ? error.message : String(error);
    logger.error(`${OTEL_LOG_PREFIX} Initialization failed`, {
      error: initializationError,
    });
  }
}

registerTelemetryStarter(ensureTelemetry);

/**
 * @description Registers a holder of the process-wide telemetry and starts it if needed. Pair every call with `releaseTelemetry`.
 * @param config {ObservabilityConfig | undefined} - Observability options forwarded to `ensureTelemetry`.
 * @returns {void} Nothing.
 */
export function acquireTelemetry(config?: ObservabilityConfig): void {
  holders++;
  ensureTelemetry(config);
}

/**
 * @description Releases one holder registered by `acquireTelemetry` and flushes pending spans as `flushOpenTelemetry` does. The provider stays registered for the process so cached tracers keep working and later instances reuse it.
 * @returns {Promise<void>} Resolves when pending spans are flushed.
 * @throws {Error} When any provider fails to flush or does not finish within the flush budget.
 */
export async function releaseTelemetry(): Promise<void> {
  holders = Math.max(0, holders - 1);
  await flushOpenTelemetry();
}

/**
 * @description Exports pending spans and metrics from the providers NeuroLink owns and flushes its Langfuse exporter. A host provider is never flushed. The OTLP span and metric exports are waited for at most the flush budget (`observability.langfuse.flushBudgetMs`, default 3000 ms) and the Langfuse exporter within its own budget. A provider that fails to flush, or does not finish within the budget (a collector that cannot be reached, for one), is logged as a warning and makes the call reject once every provider has settled.
 * @returns {Promise<void>} Resolves when every owned provider has flushed.
 * @throws {Error} When any provider fails to flush or does not finish within the flush budget.
 */
export async function flushOpenTelemetry(): Promise<void> {
  const budgetMs = flushBudgetMs;
  const results = await Promise.allSettled([
    registryProcessor?.forceFlush(),
    usingExternalProvider ? langfuseExporter?.flush() : undefined,
    withinBudget(otlpProcessor?.forceFlush(), budgetMs, cutOtlpConnections),
    withinBudget(meterProvider?.forceFlush(), budgetMs, cutOtlpConnections),
  ]);
  reportUnsettled("Flush", results);
  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length > 0) {
    throw new Error(`${OTEL_LOG_PREFIX} Flush failed`, {
      cause: failed.map((result) => result.reason),
    });
  }
}

/**
 * @description Terminally shuts down the providers NeuroLink owns once no `acquireTelemetry` holder remains; while holders remain it only flushes, as `flushOpenTelemetry` does. Telemetry cannot be restarted in this process afterwards. A host provider is never shut down; with one, only NeuroLink's Langfuse exporter is shut down and unregistered. The OTLP exporters get the same budget as `flushOpenTelemetry`, and a failure of the shutdown itself is logged as a warning.
 * @returns {Promise<void>} Resolves when telemetry is flushed or shut down, or the flush budget has run out.
 * @throws {Error} When holders remain and the flush they get fails.
 */
export async function shutdownOpenTelemetry(): Promise<void> {
  if (holders > 0) {
    await flushOpenTelemetry();
    return;
  }
  await stop();
}

/**
 * @description Reports whether NeuroLink's tracing is active, either on its own provider or alongside a host provider.
 * @returns {boolean} `true` once `ensureTelemetry` has set tracing up.
 */
export function isOpenTelemetryInitialized(): boolean {
  return initialized;
}

/**
 * @description Summarizes the Langfuse export state for health checks.
 * @returns {{ isHealthy: boolean; initialized: boolean; hasProcessor: boolean; usingExternalProvider: boolean; error?: string }} `isHealthy` and `hasProcessor` are `true` only while a Langfuse exporter is registered, on NeuroLink's own provider or beside a host provider (where it still needs `createExporterSpanProcessor()` on the host provider to receive spans); `error` carries the message of a failed initialization.
 */
export function getLangfuseHealthStatus(): {
  isHealthy: boolean;
  initialized: boolean;
  hasProcessor: boolean;
  usingExternalProvider: boolean;
  error?: string;
} {
  return {
    isHealthy: initialized && langfuseExporter !== null,
    initialized,
    hasProcessor: langfuseExporter !== null,
    usingExternalProvider,
    ...(initializationError !== null && { error: initializationError }),
  };
}

/**
 * @description Reads the full trace metadata that `setLangfuseContext` stored on a context.
 * @param ctx {Context} - Context to read, normally the active one.
 * @returns {Record<string, SpanContent>} Metadata set by enclosing `setLangfuseContext` calls, inner keys winning; empty when none was set.
 */
export function traceMetadataFromContext(
  ctx: Context,
): Record<string, SpanContent> {
  const stored = ctx.getValue(TRACE_METADATA_KEY);
  return stored && typeof stored === "object"
    ? (stored as Record<string, SpanContent>)
    : {};
}

/**
 * @description Runs `fn` with trace attributes propagated to every span it creates. `conversationId` and `requestId` become metadata; empty values are dropped. Metadata values of up to 200 characters once stringified are on every observation; longer values and arrays are recorded in full on the trace only, written by the trace root.
 * @param params {NeurolinkTraceContext} - User, session, trace name, tags and metadata for the trace.
 * @param fn {() => T} - Work to run inside the propagated context.
 * @returns {T} Whatever `fn` returns.
 * @example
 * await setLangfuseContext({ userId: "u1", sessionId: "s1" }, () => neurolink.generate({ input: { text: "hi" } }));
 */
export function setLangfuseContext<T>(
  params: NeurolinkTraceContext,
  fn: () => T,
): T {
  const full: Record<string, SpanContent> = {};
  const propagated: Record<string, string> = {};
  for (const [key, value] of Object.entries({
    ...params.metadata,
    conversationId: params.conversationId,
    requestId: params.requestId,
  })) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    full[key] = value;
    const text = spanJsonAttribute(value, Number.POSITIVE_INFINITY);
    if (text.length <= MAX_PROPAGATED_CHARS) {
      propagated[key] = text;
    }
  }
  const tags = params.tags?.filter((tag) => tag.length > 0);
  const active = context.active();
  const withMetadata = active.setValue(TRACE_METADATA_KEY, {
    ...traceMetadataFromContext(active),
    ...full,
  });
  return context.with(withMetadata, () =>
    propagateAttributes(
      {
        userId: params.userId || undefined,
        sessionId: params.sessionId || undefined,
        traceName: params.traceName || undefined,
        ...(tags && tags.length > 0 && { tags }),
        ...(Object.keys(propagated).length > 0 && { metadata: propagated }),
      },
      fn,
    ),
  );
}
