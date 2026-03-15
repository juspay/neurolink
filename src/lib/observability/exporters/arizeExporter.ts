/**
 * Arize Exporter
 * Exports spans to Arize ML monitoring platform
 */

import type {
  ArizeExporterConfig,
  ExporterHealthStatus,
  ExportResult,
  SpanData,
} from "../types/index.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * Arize exporter for ML monitoring and prediction logs
 * Supports feature tracking and model performance monitoring
 */
export class ArizeExporter extends BaseExporter {
  private readonly spaceKey: string;
  private readonly apiKey: string;
  private readonly modelId: string;
  private readonly modelVersion: string;
  private readonly endpoint = "https://api.arize.com/v1";

  constructor(config: ArizeExporterConfig) {
    super("arize", config);
    this.spaceKey = config.spaceKey;
    this.apiKey = config.apiKey;
    this.modelId = config.modelId ?? "neurolink-ai";
    this.modelVersion = config.modelVersion ?? "1.0.0";
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 10000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const prediction = this.convertToArizePrediction(span);

      const response = await fetch(`${this.endpoint}/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
          "space-key": this.spaceKey,
        },
        body: JSON.stringify(prediction),
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
    // Arize's /v1/log endpoint does not support batch payloads, so we send
    // individual requests in parallel. This is intentional — not a missed
    // optimization.
    const results = await Promise.all(spans.map((s) => this.exportSpan(s)));

    const successful = results.filter((r) => r.success).length;
    const failed = spans.length - successful;

    return {
      success: failed === 0,
      exportedCount: successful,
      failedCount: failed,
      errors: results.flatMap((r) => r.errors ?? []),
      durationMs: results.reduce((sum, r) => sum + r.durationMs, 0),
    };
  }

  async flush(): Promise<void> {
    if (!this.initialized || this.buffer.length === 0) {
      return;
    }
    const spans = [...this.buffer];
    this.buffer = [];
    await this.exportBatch(spans);
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
   * Verify connectivity to Arize API
   */
  protected async ping(): Promise<void> {
    const response = await fetch(`${this.endpoint}/health`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "space-key": this.spaceKey,
      },
    });

    if (!response.ok && response.status !== 404) {
      // 404 is acceptable as health endpoint may not exist
      throw new Error(`Arize API unreachable: ${response.status}`);
    }
  }

  /**
   * Convert span to Arize prediction log format
   */
  private convertToArizePrediction(span: SpanData): Record<string, unknown> {
    return {
      space_key: this.spaceKey,
      model_id: (span.attributes["ai.model"] as string) ?? this.modelId,
      model_version: this.modelVersion,
      prediction_id: span.spanId,
      prediction_timestamp: new Date(span.startTime).getTime(),
      features: {
        provider: span.attributes["ai.provider"],
        temperature: span.attributes["ai.temperature"],
        max_tokens: span.attributes["ai.max_tokens"],
        user_id: span.attributes["user.id"],
        session_id: span.attributes["session.id"],
      },
      prediction: {
        input: span.attributes["input"],
        output: span.attributes["output"],
      },
      tags: {
        span_type: span.type,
        environment: this.config.environment,
      },
      latency_ms: span.durationMs,
      token_count: {
        prompt: span.attributes["ai.tokens.input"],
        completion: span.attributes["ai.tokens.output"],
        total: span.attributes["ai.tokens.total"],
      },
    };
  }
}
