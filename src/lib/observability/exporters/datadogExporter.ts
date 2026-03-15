/**
 * Datadog Exporter
 * Exports spans to Datadog APM platform
 */

import { logger } from "../../utils/logger.js";
import type {
  DatadogExporterConfig,
  ExporterHealthStatus,
  ExportResult,
  SpanData,
} from "../types/index.js";
import { SpanStatus } from "../types/spanTypes.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * Datadog exporter for enterprise APM integration
 * Supports trace correlation and AI-specific custom metrics
 */
export class DatadogExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly appKey?: string;
  private readonly site: string;
  private readonly service: string;
  private readonly source: string;
  private readonly logsEndpoint: string;

  constructor(config: DatadogExporterConfig) {
    super("datadog", config);
    this.apiKey = config.apiKey;
    this.appKey = config.appKey;
    this.site = config.site ?? "us1";
    this.service = config.service ?? "neurolink";
    this.source = config.source ?? "neurolink-ai";

    const baseDomain =
      this.site === "us1" ? "datadoghq.com" : `${this.site}.datadoghq.com`;
    this.logsEndpoint = `https://http-intake.logs.${baseDomain}/api/v2/logs`;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Validate API key
    try {
      const validateUrl =
        this.site === "us1"
          ? "https://api.datadoghq.com/api/v1/validate"
          : `https://api.${this.site}.datadoghq.com/api/v1/validate`;

      const response = await fetch(validateUrl, {
        headers: {
          "DD-API-KEY": this.apiKey,
          ...(this.appKey && { "DD-APPLICATION-KEY": this.appKey }),
        },
      });

      if (!response.ok) {
        throw new Error(
          `Datadog API key validation failed: ${response.statusText}`,
        );
      }
    } catch (error) {
      // Allow initialization to proceed even if API is unreachable
      logger.warn(
        "[Datadog] Could not verify API connection:",
        error instanceof Error ? error.message : error,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 10000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const log = this.convertToDatadogLog(span);

      const response = await fetch(this.logsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.apiKey,
        },
        body: JSON.stringify([log]),
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
      const logs = spans.map((s) => this.convertToDatadogLog(s));

      const response = await fetch(this.logsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "DD-API-KEY": this.apiKey,
        },
        body: JSON.stringify(logs),
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
   * Verify connectivity to Datadog API
   */
  protected async ping(): Promise<void> {
    const validateUrl =
      this.site === "us1"
        ? "https://api.datadoghq.com/api/v1/validate"
        : `https://api.${this.site}.datadoghq.com/api/v1/validate`;

    const response = await fetch(validateUrl, {
      headers: { "DD-API-KEY": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`Datadog API validation failed: ${response.status}`);
    }
  }

  /**
   * Convert span to Datadog log format with trace correlation
   */
  private convertToDatadogLog(span: SpanData): Record<string, unknown> {
    return {
      ddsource: this.source,
      ddtags: this.buildTags(span),
      hostname: process.env.HOSTNAME || "unknown",
      message: `${span.type}: ${span.name}`,
      service: this.service,
      status: span.status === SpanStatus.ERROR ? "error" : "info",
      timestamp: new Date(span.startTime).getTime(),
      // Trace correlation
      dd: {
        trace_id: span.traceId,
        span_id: span.spanId,
      },
      // AI-specific attributes
      ai: {
        provider: span.attributes["ai.provider"],
        model: span.attributes["ai.model"],
        tokens: {
          input: span.attributes["ai.tokens.input"],
          output: span.attributes["ai.tokens.output"],
          total: span.attributes["ai.tokens.total"],
        },
        cost: span.attributes["ai.cost.total"],
        duration_ms: span.durationMs,
      },
      // User context
      usr: {
        id: span.attributes["user.id"],
        session_id: span.attributes["session.id"],
      },
      // Error details
      ...(span.status === SpanStatus.ERROR && {
        error: {
          message: span.statusMessage,
          type: span.attributes["error.type"],
          stack: span.attributes["error.stack"],
        },
      }),
    };
  }

  /**
   * Build Datadog tags from span attributes
   */
  private buildTags(span: SpanData): string {
    const tags: string[] = [
      `env:${this.config.environment ?? "production"}`,
      `version:${this.config.version ?? "unknown"}`,
      `span_type:${span.type}`,
    ];

    if (span.attributes["ai.provider"]) {
      tags.push(`ai_provider:${span.attributes["ai.provider"]}`);
    }
    if (span.attributes["ai.model"]) {
      tags.push(`ai_model:${span.attributes["ai.model"]}`);
    }
    if (span.attributes["tool.name"]) {
      tags.push(`tool:${span.attributes["tool.name"]}`);
    }

    return tags.join(",");
  }
}
