import { OTEL_LOG_PREFIX } from "../../../../constants/telemetry.js";
import { LangfuseExporter } from "../../../../observability/exporters/langfuseExporter.js";
import type {
  NeurolinkLangfuseConfig,
  ObservabilityConfig,
} from "../../../../types/index.js";
import { logger } from "../../../../utils/logger.js";

async function initializeQuietly(exporter: LangfuseExporter): Promise<void> {
  try {
    await exporter.initialize();
  } catch (error) {
    logger.warn(`${OTEL_LOG_PREFIX} Langfuse exporter failed to initialize`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

const OFF_VALUES = new Set(["false", "0", "off", "no"]);

/**
 * @description Tells whether a setting says "off": `false`, or the text `false`, `0`, `off` or `no` in any case.
 * @param value {unknown} - A config value or an environment variable.
 * @returns {boolean} `true` for an explicit off setting; `false` for anything else, an unset value included.
 */
export function isOff(value: unknown): boolean {
  return (
    value === false ||
    (typeof value === "string" && OFF_VALUES.has(value.trim().toLowerCase()))
  );
}

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function langfuseOptions(
  config?: ObservabilityConfig,
): NeurolinkLangfuseConfig {
  return typeof config?.langfuse === "object" ? config.langfuse : {};
}

/**
 * @description Resolves the environment name the OTLP resource reports as `deployment.environment`: the config value, then `LANGFUSE_TRACING_ENVIRONMENT`, `LANGFUSE_ENVIRONMENT` and `PUBLIC_APP_ENVIRONMENT`. Langfuse traces are labelled from the config value and `LANGFUSE_TRACING_ENVIRONMENT` alone, as before.
 * @param config {ObservabilityConfig | undefined} - Observability options.
 * @returns {string | undefined} The environment name, or `undefined` when none is set.
 */
export function resolveEnvironment(
  config?: ObservabilityConfig,
): string | undefined {
  return (
    langfuseOptions(config).environment ||
    firstEnv(
      "LANGFUSE_TRACING_ENVIRONMENT",
      "LANGFUSE_ENVIRONMENT",
      "PUBLIC_APP_ENVIRONMENT",
    )
  );
}

/**
 * @description Resolves the release the OTLP resource reports as `service.version`: the config value, then `LANGFUSE_RELEASE` and `PUBLIC_APP_VERSION`. Langfuse traces are labelled from the config value and `LANGFUSE_RELEASE` alone, as before.
 * @param config {ObservabilityConfig | undefined} - Observability options.
 * @returns {string | undefined} The release identifier, or `undefined` when none is set.
 */
export function resolveRelease(
  config?: ObservabilityConfig,
): string | undefined {
  return (
    langfuseOptions(config).release ||
    firstEnv("LANGFUSE_RELEASE", "PUBLIC_APP_VERSION")
  );
}

/**
 * @description Decides whether Langfuse export is on. Off when `config.langfuse` is `false` or an options object with `enabled: false`. On for `true` and for an options object with `enabled: true` or with both keys. Any other options object, and no options at all with both keys in the environment, is on unless `LANGFUSE_ENABLED` is `false`, `0`, `off` or `no`: the switch governs the keys wherever they come from the environment, so an options object that leaves them there (only a mask or an environment name) obeys it too, while keys or `enabled: true` given in code are an explicit choice and win over it.
 * @param config {ObservabilityConfig | undefined} - Observability options.
 * @returns {boolean} `true` when a Langfuse exporter should be created.
 */
export function isLangfuseEnabled(config?: ObservabilityConfig): boolean {
  const langfuse = config?.langfuse;
  if (langfuse === false) {
    return false;
  }
  if (typeof langfuse === "object") {
    if (isOff(langfuse.enabled)) {
      return false;
    }
    // Keys or `enabled: true` given in code are an explicit choice and win over the
    // environment switch. An object that leaves the keys to the environment (only a
    // mask or an environment name) is governed by it like the keys themselves.
    return (
      langfuse.enabled === true ||
      Boolean(langfuse.publicKey && langfuse.secretKey) ||
      !isOff(process.env.LANGFUSE_ENABLED)
    );
  }
  if (langfuse === true) {
    return true;
  }
  return (
    Boolean(
      process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
    ) && !isOff(process.env.LANGFUSE_ENABLED)
  );
}

/**
 * @description Builds and starts a Langfuse exporter from config, falling back to the `LANGFUSE_*` environment variables.
 * @param config {ObservabilityConfig | undefined} - Observability options; `langfuse` may carry keys, base URL, environment, release, mask and batching.
 * @returns {LangfuseExporter | null} The exporter, or `null` (after a warning) when the public or secret key is missing.
 */
export function createLangfuseExporter(
  config?: ObservabilityConfig,
): LangfuseExporter | null {
  const options = langfuseOptions(config);
  const publicKey = options.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = options.secretKey ?? process.env.LANGFUSE_SECRET_KEY;
  if (!publicKey || !secretKey) {
    logger.warn(
      `${OTEL_LOG_PREFIX} Langfuse is enabled but publicKey and secretKey are not both set in config or LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY; not exporting to Langfuse`,
    );
    return null;
  }
  const exporter = new LangfuseExporter({
    enabled: true,
    publicKey,
    secretKey,
    baseUrl: options.baseUrl ?? process.env.LANGFUSE_BASE_URL,
    // The released build labelled Langfuse traces from the option and
    // LANGFUSE_TRACING_ENVIRONMENT / LANGFUSE_RELEASE only (the exporter reads
    // those two itself); the longer chain feeds the OTLP resource alone.
    environment: options.environment,
    release: options.release,
    flushBudgetMs: options.flushBudgetMs,
    mask: options.mask,
    redactIO: options.redactIO,
    maxBufferSize: options.exportMode === "immediate" ? 1 : options.flushAt,
    flushIntervalMs:
      options.flushInterval === undefined
        ? undefined
        : options.flushInterval * 1000,
  });
  void initializeQuietly(exporter);
  return exporter;
}
