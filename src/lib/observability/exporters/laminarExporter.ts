/**
 * Laminar Exporter
 * Exports spans to Laminar LLM tracing platform
 * @see https://docs.laminar.run/
 */

import { logger } from "../../utils/logger.js";
import type {
  ExporterHealthStatus,
  ExportResult,
  LaminarExporterConfig,
  SpanData,
} from "../../types/index.js";
import { SpanStatus, SpanType } from "../../types/index.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * Laminar exporter for LLM pipeline tracing and monitoring
 * Supports detailed traces with input/output tracking
 */
export class LaminarExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly projectApiKey?: string;
  private readonly baseUrl: string;

  constructor(config: LaminarExporterConfig) {
    super("laminar", config);
    this.apiKey = config.apiKey;
    this.projectApiKey = config.projectApiKey;
    this.baseUrl = config.baseUrl ?? "https://api.laminar.run";
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify API key by making a test call
    try {
      const response = await fetch(`${this.baseUrl}/v1/health`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        logger.warn(
          "[Laminar] Could not verify API connection:",
          response.statusText,
        );
      }
    } catch (error) {
      logger.warn(
        "[Laminar] Could not verify API connection:",
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
      Authorization: `Bearer ${this.apiKey}`,
    };

    // Add project API key if provided
    if (this.projectApiKey) {
      headers["X-Project-Api-Key"] = this.projectApiKey;
    }

    return headers;
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const trace = this.convertToLaminarTrace(span);

      const response = await fetch(`${this.baseUrl}/v1/traces`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify(trace),
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
      const traces = spans.map((s) => this.convertToLaminarTrace(s));

      const response = await fetch(`${this.baseUrl}/v1/traces/batch`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({ traces }),
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
   * Verify connectivity to Laminar API
   */
  protected async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/v1/health`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Laminar API unreachable: ${response.status}`);
    }
  }

  /**
   * Convert span to Laminar trace format
   */
  private convertToLaminarTrace(span: SpanData): Record<string, unknown> {
    return {
      // Core identifiers
      trace_id: span.traceId,
      span_id: span.spanId,
      parent_span_id: span.parentSpanId,

      // Trace metadata
      name: span.name,
      type: this.mapSpanTypeToLaminarType(span.type),
      start_time: span.startTime,
      end_time: span.endTime,
      duration_ms: span.durationMs,

      // Status
      status: this.mapSpanStatus(span.status),
      status_message: span.statusMessage,

      // Model information
      model: {
        provider: span.attributes["ai.provider"],
        name: span.attributes["ai.model"],
        version: span.attributes["ai.model.version"],
      },

      // Token usage
      usage: {
        input_tokens: span.attributes["ai.tokens.input"],
        output_tokens: span.attributes["ai.tokens.output"],
        total_tokens: span.attributes["ai.tokens.total"],
        cache_read_tokens: span.attributes["ai.tokens.cache_read"],
        cache_creation_tokens: span.attributes["ai.tokens.cache_creation"],
        reasoning_tokens: span.attributes["ai.tokens.reasoning"],
      },

      // Cost tracking
      cost: {
        input: span.attributes["ai.cost.input"],
        output: span.attributes["ai.cost.output"],
        total: span.attributes["ai.cost.total"],
        currency: span.attributes["ai.cost.currency"] || "USD",
      },

      // Generation parameters
      parameters: {
        temperature: span.attributes["ai.temperature"],
        max_tokens: span.attributes["ai.max_tokens"],
        top_p: span.attributes["ai.top_p"],
        stop_sequences: span.attributes["ai.stop_sequences"],
      },

      // Input/Output
      input: span.attributes["input"],
      output: span.attributes["output"],

      // Tool information
      tool: span.attributes["tool.name"]
        ? {
            name: span.attributes["tool.name"],
            server: span.attributes["tool.server"],
            success: span.attributes["tool.success"],
          }
        : undefined,

      // Error information
      error:
        span.status === SpanStatus.ERROR
          ? {
              type: span.attributes["error.type"],
              message: span.attributes["error.message"],
              stack: span.attributes["error.stack"],
            }
          : undefined,

      // User and session context
      context: {
        user_id: span.attributes["user.id"],
        session_id: span.attributes["session.id"],
        environment:
          span.attributes["deployment.environment"] || this.config.environment,
        service: {
          name: span.attributes["service.name"],
          version: span.attributes["service.version"] || this.config.version,
        },
      },

      // Events
      events: span.events.map((event) => ({
        name: event.name,
        timestamp: event.timestamp,
        attributes: event.attributes,
      })),

      // Links to related spans
      links: span.links.map((link) => ({
        trace_id: link.traceId,
        span_id: link.spanId,
        attributes: link.attributes,
      })),

      // Additional metadata
      metadata: this.extractMetadata(span.attributes),
    };
  }

  /**
   * Map NeuroLink span type to Laminar type
   */
  private mapSpanTypeToLaminarType(type: SpanType): string {
    const typeMap: Record<SpanType, string> = {
      [SpanType.AGENT_RUN]: "agent",
      [SpanType.WORKFLOW_STEP]: "workflow",
      [SpanType.TOOL_CALL]: "tool",
      [SpanType.MODEL_GENERATION]: "llm",
      [SpanType.EMBEDDING]: "embedding",
      [SpanType.RETRIEVAL]: "retrieval",
      [SpanType.MEMORY]: "memory",
      [SpanType.CONTEXT_COMPACTION]: "custom",
      [SpanType.RAG]: "retrieval",
      [SpanType.EVALUATION]: "custom",
      [SpanType.MCP_TRANSPORT]: "tool",
      [SpanType.MEDIA_GENERATION]: "llm",
      [SpanType.PPT_GENERATION]: "custom",
      [SpanType.WORKFLOW]: "workflow",
      [SpanType.TTS]: "custom",
      [SpanType.STT]: "custom",
      [SpanType.SERVER_REQUEST]: "custom",
      [SpanType.CUSTOM]: "custom",
    };

    return typeMap[type] || "custom";
  }

  /**
   * Map span status to Laminar status format
   */
  private mapSpanStatus(status: SpanStatus): string {
    switch (status) {
      case SpanStatus.OK:
        return "success";
      case SpanStatus.ERROR:
        return "error";
      default:
        return "unset";
    }
  }

  /**
   * Extract additional metadata from span attributes
   * Filters out standard attributes that are already handled
   */
  private extractMetadata(
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

    const metadata: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (!standardKeys.has(key) && value !== undefined) {
        metadata[key] = value;
      }
    }

    return metadata;
  }
}
