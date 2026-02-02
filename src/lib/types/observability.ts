/**
 * Observability Configuration Types
 * These configs are passed from the parent application (e.g., Lighthouse)
 * to enable telemetry and observability features in Neurolink SDK
 */

import type { AttributeValue } from "@opentelemetry/api";

/**
 * Trace name format for Langfuse traces
 *
 * Controls how userId and operationName are combined to form the trace name.
 * Can be a predefined format string or a custom function.
 *
 * @example
 * // Predefined formats:
 * "userId:operationName" → "user@email.com:ai.streamText"
 * "operationName:userId" → "ai.streamText:user@email.com"
 * "operationName" → "ai.streamText"
 * "userId" → "user@email.com" (legacy)
 *
 * @example
 * // Custom function:
 * (ctx) => `[${ctx.operationName}] ${ctx.userId}`
 * // → "[ai.streamText] user@email.com"
 */
export type TraceNameFormat =
  | "userId:operationName"
  | "operationName:userId"
  | "operationName"
  | "userId"
  | ((context: { userId?: string; operationName?: string }) => string);

/**
 * Standard GenAI semantic convention attributes from OpenTelemetry
 * These are the attributes that Vercel AI SDK's experimental_telemetry creates
 * @see https://opentelemetry.io/docs/specs/semconv/gen-ai/
 */
export type LangfuseSpanAttributes = {
  // Core GenAI attributes
  "gen_ai.system"?: string;
  "gen_ai.request.model"?: string;
  "gen_ai.response.model"?: string;
  "gen_ai.request.max_tokens"?: number;
  "gen_ai.request.temperature"?: number;
  "gen_ai.request.top_p"?: number;
  "gen_ai.usage.input_tokens"?: number;
  "gen_ai.usage.output_tokens"?: number;
  "gen_ai.usage.total_tokens"?: number;
  "gen_ai.response.finish_reasons"?: string[];
  "gen_ai.prompt"?: string;
  "gen_ai.completion"?: string;

  // Vercel AI SDK specific attributes
  "ai.model.id"?: string;
  "ai.model.provider"?: string;
  "ai.operationId"?: string;
  "ai.telemetry.functionId"?: string;
  "ai.finishReason"?: string;
  "ai.usage.promptTokens"?: number;
  "ai.usage.completionTokens"?: number;

  // Allow additional custom attributes
  [key: string]: AttributeValue | undefined;
};

/**
 * Langfuse observability configuration
 */
export type LangfuseConfig = {
  /** Whether Langfuse is enabled */
  enabled: boolean;
  /** Langfuse public key */
  publicKey: string;
  /**
   * Langfuse secret key
   * @sensitive
   * WARNING: This is a sensitive credential. Handle securely.
   * Do NOT log, expose, or share this key. Follow best practices for secret management.
   */
  secretKey: string;
  /** Langfuse base URL (default: https://cloud.langfuse.com) */
  baseUrl?: string;
  /** Environment name (e.g., dev, staging, prod) */
  environment?: string;
  /** Release/version identifier */
  release?: string;
  /** Optional default user id to attach to spans */
  userId?: string;
  /** Optional default session id to attach to spans */
  sessionId?: string;

  // NEW FIELDS - External TracerProvider Support
  /**
   * If true, NeuroLink will NOT create or register its own TracerProvider.
   * Instead, it will only create the LangfuseSpanProcessor and ContextEnricher,
   * which the parent application must add to its own TracerProvider.
   *
   * Use this when your application already has OpenTelemetry instrumentation.
   *
   * @default false
   */
  useExternalTracerProvider?: boolean;

  /**
   * If true, NeuroLink will automatically detect if a TracerProvider is already
   * registered globally and skip its own registration to avoid conflicts.
   *
   * This is a convenience option that combines well with useExternalTracerProvider.
   *
   * @default false
   */
  autoDetectExternalProvider?: boolean;

  // Operation Name Support

  /**
   * Enable auto-detection of operation names from span names.
   *
   * When true (default), AI operation spans (ai.streamText, ai.generateText, etc.)
   * will have their operation name automatically extracted and included in the
   * trace name.
   *
   * @default true
   *
   * @example
   * // With auto-detection enabled (default):
   * // Span "ai.streamText" + userId "user@email.com"
   * // → Trace name: "user@email.com:ai.streamText"
   *
   * @example
   * // With auto-detection disabled:
   * // → Trace name: "user@email.com" (legacy behavior)
   */
  autoDetectOperationName?: boolean;

  /**
   * Format for trace names in Langfuse.
   *
   * Controls how userId and operationName are combined to form the trace name.
   * Can be a predefined format string or a custom function for full control.
   *
   * @default "userId:operationName"
   *
   * @example
   * // Predefined formats:
   * traceNameFormat: "userId:operationName" // "user@email.com:ai.streamText"
   * traceNameFormat: "operationName:userId" // "ai.streamText:user@email.com"
   * traceNameFormat: "operationName"        // "ai.streamText"
   * traceNameFormat: "userId"               // "user@email.com" (legacy)
   *
   * @example
   * // Custom function:
   * traceNameFormat: (ctx) => `[${ctx.operationName || 'unknown'}] ${ctx.userId}`
   * // → "[ai.streamText] user@email.com"
   */
  traceNameFormat?: TraceNameFormat;
};

/**
 * OpenTelemetry configuration
 */
export type OpenTelemetryConfig = {
  /** Whether OpenTelemetry is enabled */
  enabled: boolean;
  /** OTLP endpoint URL */
  endpoint?: string;
  /** Service name for traces */
  serviceName?: string;
  /** Service version */
  serviceVersion?: string;
};

/**
 * Complete observability configuration for Neurolink SDK
 */
export type ObservabilityConfig = {
  /** Langfuse configuration */
  langfuse?: LangfuseConfig;
  /** OpenTelemetry configuration */
  openTelemetry?: OpenTelemetryConfig;
};
