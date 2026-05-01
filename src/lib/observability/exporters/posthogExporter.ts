/**
 * PostHog Exporter
 * Exports spans to PostHog product analytics platform
 * @see https://posthog.com/docs/api
 */

import { logger } from "../../utils/logger.js";
import type {
  ExporterHealthStatus,
  ExportResult,
  PostHogExporterConfig,
  SpanData,
} from "../../types/index.js";
import { SpanStatus, SpanType } from "../../types/index.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * PostHog exporter for product analytics and LLM event tracking
 * Supports capturing LLM interactions as events with properties
 */
export class PostHogExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly host: string;
  private readonly personalApiKey?: string;

  constructor(config: PostHogExporterConfig) {
    super("posthog", config);
    this.apiKey = config.apiKey;
    this.host = config.host ?? "https://app.posthog.com";
    this.personalApiKey = config.personalApiKey;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify API key by making a test call
    try {
      const response = await fetch(`${this.host}/api/projects/`, {
        headers: this.getHeaders(),
      });

      if (!response.ok && response.status !== 401) {
        // 401 is expected with project API key
        logger.warn(
          "[PostHog] Could not verify API connection:",
          response.statusText,
        );
      }
    } catch (error) {
      logger.warn(
        "[PostHog] Could not verify API connection:",
        error instanceof Error ? error.message : error,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  /**
   * Get authorization headers
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Use personal API key for management endpoints, project API key for events
    if (this.personalApiKey) {
      headers["Authorization"] = `Bearer ${this.personalApiKey}`;
    }

    return headers;
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const event = this.convertToPostHogEvent(span);

      const response = await fetch(`${this.host}/capture/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      return this.createSuccessResult(1, Date.now() - startTime);
    } catch (error) {
      return this.createFailureResult(
        [span.spanId],
        error instanceof Error ? error.message : String(error),
        Date.now() - startTime,
      );
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const events = spans.map((s) => this.convertToPostHogEvent(s));

      const response = await fetch(`${this.host}/batch/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: this.apiKey,
          batch: events.map((e) => ({
            ...e,
            // For batch, we don't include api_key in each event
            api_key: undefined,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Batch export failed: ${response.statusText}`);
      }

      return this.createSuccessResult(spans.length, Date.now() - startTime);
    } catch (error) {
      return this.createFailureResult(
        spans.map((s) => s.spanId),
        error instanceof Error ? error.message : String(error),
        Date.now() - startTime,
      );
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length > 0) {
      const spans = [...this.buffer];
      this.buffer = [];
      await this.exportBatch(spans);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();
    this.stopFlushInterval();
    this.initialized = false;
  }

  async healthCheck(): Promise<ExporterHealthStatus> {
    try {
      await this.withRetry(() => this.ping(), "health check");
      return this.createHealthStatus(true);
    } catch {
      return this.createHealthStatus(false, ["Health check failed"]);
    }
  }

  /**
   * Verify connectivity to PostHog API
   */
  protected async ping(): Promise<void> {
    // PostHog doesn't have a dedicated health endpoint, so we use decide endpoint
    const response = await fetch(`${this.host}/decide/?v=3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: this.apiKey,
        distinct_id: "health_check",
      }),
    });

    if (!response.ok) {
      throw new Error(`PostHog API unreachable: ${response.status}`);
    }
  }

  /**
   * Convert span to PostHog event format
   */
  private convertToPostHogEvent(span: SpanData): Record<string, unknown> {
    // Determine the event name based on span type
    const eventName = this.getEventName(span);

    // Get distinct ID from user.id or session.id, or use trace ID as fallback
    const distinctId =
      (span.attributes["user.id"] as string) ||
      (span.attributes["session.id"] as string) ||
      span.traceId;

    return {
      api_key: this.apiKey,
      event: eventName,
      distinct_id: distinctId,
      timestamp: span.startTime,
      properties: {
        // Core span data
        $span_id: span.spanId,
        $trace_id: span.traceId,
        $parent_span_id: span.parentSpanId,

        // AI-specific properties
        ai_provider: span.attributes["ai.provider"],
        ai_model: span.attributes["ai.model"],
        ai_tokens_input: span.attributes["ai.tokens.input"],
        ai_tokens_output: span.attributes["ai.tokens.output"],
        ai_tokens_total: span.attributes["ai.tokens.total"],
        ai_cost_total: span.attributes["ai.cost.total"],
        ai_cost_currency: span.attributes["ai.cost.currency"] || "USD",

        // Generation parameters
        ai_temperature: span.attributes["ai.temperature"],
        ai_max_tokens: span.attributes["ai.max_tokens"],

        // Performance metrics
        duration_ms: span.durationMs,
        status: this.getStatusString(span.status),
        status_message: span.statusMessage,

        // Error tracking
        is_error: span.status === SpanStatus.ERROR,
        error_type: span.attributes["error.type"],
        error_message: span.attributes["error.message"],

        // Tool attributes
        tool_name: span.attributes["tool.name"],
        tool_server: span.attributes["tool.server"],
        tool_success: span.attributes["tool.success"],

        // Environment
        environment:
          span.attributes["deployment.environment"] || this.config.environment,
        service_name: span.attributes["service.name"],
        service_version:
          span.attributes["service.version"] || this.config.version,

        // Span type for filtering
        span_type: span.type,

        // Session tracking
        $session_id: span.attributes["session.id"],

        // Custom properties from attributes (filtered)
        ...this.extractCustomProperties(span.attributes),
      },
    };
  }

  /**
   * Get event name based on span type
   */
  private getEventName(span: SpanData): string {
    const eventNameMap: Record<SpanType, string> = {
      [SpanType.AGENT_RUN]: "ai_agent_run",
      [SpanType.WORKFLOW_STEP]: "ai_workflow_step",
      [SpanType.TOOL_CALL]: "ai_tool_call",
      [SpanType.MODEL_GENERATION]: "ai_generation",
      [SpanType.EMBEDDING]: "ai_embedding",
      [SpanType.RETRIEVAL]: "ai_retrieval",
      [SpanType.MEMORY]: "ai_memory_operation",
      [SpanType.CONTEXT_COMPACTION]: "ai_context_compaction",
      [SpanType.RAG]: "ai_rag_operation",
      [SpanType.EVALUATION]: "ai_evaluation",
      [SpanType.MCP_TRANSPORT]: "ai_mcp_transport",
      [SpanType.MEDIA_GENERATION]: "ai_media_generation",
      [SpanType.PPT_GENERATION]: "ai_ppt_generation",
      [SpanType.WORKFLOW]: "ai_workflow",
      [SpanType.TTS]: "ai_tts_synthesis",
      [SpanType.STT]: "ai_stt_transcription",
      [SpanType.SERVER_REQUEST]: "ai_server_request",
      [SpanType.CUSTOM]: "ai_custom_span",
    };

    return eventNameMap[span.type] || "ai_span";
  }

  /**
   * Convert span status to string
   */
  private getStatusString(status: SpanStatus): string {
    switch (status) {
      case SpanStatus.OK:
        return "ok";
      case SpanStatus.ERROR:
        return "error";
      default:
        return "unset";
    }
  }

  /**
   * Extract custom properties from span attributes
   * Filters out standard attributes that are already handled
   */
  private extractCustomProperties(
    attributes: SpanData["attributes"],
  ): Record<string, unknown> {
    const standardKeys = new Set([
      "service.name",
      "service.version",
      "deployment.environment",
      "user.id",
      "session.id",
      "ai.provider",
      "ai.model",
      "ai.model.version",
      "ai.tokens.input",
      "ai.tokens.output",
      "ai.tokens.total",
      "ai.tokens.cache_read",
      "ai.tokens.cache_creation",
      "ai.tokens.reasoning",
      "ai.cost.input",
      "ai.cost.output",
      "ai.cost.total",
      "ai.cost.currency",
      "ai.temperature",
      "ai.max_tokens",
      "ai.top_p",
      "ai.stop_sequences",
      "tool.name",
      "tool.server",
      "tool.success",
      "error.type",
      "error.message",
      "error.stack",
      "error",
      "input",
      "output",
      "expected",
      "scores",
    ]);

    const custom: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (!standardKeys.has(key) && value !== undefined) {
        // PostHog recommends snake_case for property names
        const snakeCaseKey = key.replace(/\./g, "_").replace(/-/g, "_");
        custom[snakeCaseKey] = value;
      }
    }

    return custom;
  }
}
