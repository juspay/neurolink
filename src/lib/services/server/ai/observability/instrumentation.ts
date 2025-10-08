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
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { logger } from "../../../../utils/logger.js";
import type { LangfuseConfig } from "../../../../types/observability.js";

const LOG_PREFIX = "[OpenTelemetry]";

let tracerProvider: NodeTracerProvider | null = null;
let langfuseProcessor: LangfuseSpanProcessor | null = null;
let isInitialized = false;
let isCredentialsValid = false;
let currentConfig: LangfuseConfig | null = null;

/**
 * Initialize OpenTelemetry with Langfuse span processor
 *
 * This connects Vercel AI SDK's experimental_telemetry to Langfuse by:
 * 1. Creating LangfuseSpanProcessor with Langfuse credentials
 * 2. Creating a NodeTracerProvider with service metadata and span processor
 * 3. Registering the provider globally for AI SDK to use
 *
 * @param config - Langfuse configuration passed from parent application
 */
export function initializeOpenTelemetry(config: LangfuseConfig): void {
  if (isInitialized) {
    logger.debug(`${LOG_PREFIX} Already initialized`);
    return;
  }

  if (!config.enabled) {
    logger.debug(`${LOG_PREFIX} Langfuse disabled, skipping initialization`);
    isInitialized = true;
    return;
  }

  if (!config.publicKey || !config.secretKey) {
    logger.warn(
      `${LOG_PREFIX} Langfuse enabled but missing credentials, skipping initialization`,
    );
    isInitialized = true;
    isCredentialsValid = false;
    return;
  }

  try {
    currentConfig = config;
    isCredentialsValid = true;

    // Create Langfuse span processor with configuration
    langfuseProcessor = new LangfuseSpanProcessor({
      publicKey: config.publicKey,
      secretKey: config.secretKey,
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
      release: config.release || "v1.0.0",
    });

    // Create resource with service metadata (v2.x API)
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "neurolink",
      [ATTR_SERVICE_VERSION]: config.release || "v1.0.0",
      "deployment.environment": config.environment || "dev",
    });

    // Initialize tracer provider with span processor and resource
    tracerProvider = new NodeTracerProvider({
      resource,
      spanProcessors: [langfuseProcessor],
    });

    // Register provider globally so Vercel AI SDK can use it
    tracerProvider.register();

    isInitialized = true;

    logger.info(`${LOG_PREFIX} Initialized with Langfuse span processor`, {
      baseUrl: config.baseUrl || "https://cloud.langfuse.com",
      environment: config.environment || "dev",
      release: config.release || "v1.0.0",
    });
  } catch (error) {
    logger.error(`${LOG_PREFIX} Initialization failed`, {
      error: error instanceof Error ? error.message : String(error),
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
  if (!isInitialized || !tracerProvider) {
    return;
  }

  try {
    await tracerProvider.shutdown();
    tracerProvider = null;
    langfuseProcessor = null;
    isInitialized = false;
    isCredentialsValid = false;

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
 */
export function getLangfuseHealthStatus() {
  return {
    isHealthy:
      currentConfig?.enabled &&
      isInitialized &&
      isCredentialsValid &&
      langfuseProcessor !== null,
    initialized: isInitialized,
    credentialsValid: isCredentialsValid,
    enabled: currentConfig?.enabled || false,
    hasProcessor: langfuseProcessor !== null,
    config: currentConfig
      ? {
          baseUrl: currentConfig.baseUrl || "https://cloud.langfuse.com",
          environment: currentConfig.environment || "dev",
          release: currentConfig.release || "v1.0.0",
        }
      : undefined,
  };
}
