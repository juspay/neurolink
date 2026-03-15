/**
 * OpenTelemetry Exporter
 * Exports spans to OTLP-compatible backends
 */

import { gzipSync } from "zlib";
import type {
  ExporterHealthStatus,
  ExportResult,
  OtelExporterConfig,
  OtelProtocol,
  SpanData,
} from "../types/index.js";
import { SpanSerializer } from "../utils/spanSerializer.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * OpenTelemetry exporter for OTLP-compatible backends
 * Supports HTTP, gRPC, and Zipkin protocols
 */
export class OtelExporter extends BaseExporter {
  private readonly endpoint: string;
  private readonly protocol: OtelProtocol;
  private readonly serviceName: string;
  private readonly serviceVersion: string;
  private readonly resourceAttributes: Record<string, string>;
  private readonly compression: "gzip" | "none";

  constructor(config: OtelExporterConfig) {
    super("opentelemetry", config);
    this.endpoint = config.endpoint;
    this.protocol = config.protocol ?? "http";
    this.serviceName = config.serviceName ?? "neurolink-ai";
    this.serviceVersion = config.serviceVersion ?? "1.0.0";
    this.resourceAttributes = config.resourceAttributes ?? {};
    this.compression = config.compression ?? "none";
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    // Intentionally buffer spans rather than exporting immediately.
    // OTLP is designed for batch export (resourceSpans envelope), so we
    // accumulate spans and flush them together via exportBatch() on the
    // configured flushInterval or when the buffer reaches maxBufferSize.
    this.bufferSpan(span);
    return this.createSuccessResult(0, 0);
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const otelSpans = spans.map((s) => SpanSerializer.toOtelFormat(s));

      const payload = {
        resourceSpans: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: this.serviceName },
                },
                {
                  key: "service.version",
                  value: { stringValue: this.serviceVersion },
                },
                ...Object.entries(this.resourceAttributes).map(
                  ([key, value]) => ({
                    key,
                    value: { stringValue: value },
                  }),
                ),
              ],
            },
            scopeSpans: [
              {
                scope: {
                  name: "neurolink-observability",
                  version: "1.0.0",
                },
                spans: otelSpans,
              },
            ],
          },
        ],
      };

      const url = this.getExportUrl();

      await this.sendRequest(url, payload);

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
      return this.createHealthStatus(false, ["Endpoint unreachable"]);
    }
  }

  /**
   * Verify connectivity to OTLP endpoint
   */
  protected async ping(): Promise<void> {
    const response = await fetch(this.endpoint, { method: "HEAD" });
    // 405 (Method Not Allowed) is acceptable for HEAD requests
    if (!response.ok && response.status !== 405) {
      throw new Error(`OTLP endpoint unreachable: ${response.status}`);
    }
  }

  /**
   * Get the export URL based on protocol
   */
  private getExportUrl(): string {
    switch (this.protocol) {
      case "http":
        return `${this.endpoint}/v1/traces`;
      case "zipkin":
        return `${this.endpoint}/api/v2/spans`;
      case "grpc":
        // For gRPC, this would use @grpc/grpc-js
        return this.endpoint;
      default:
        return `${this.endpoint}/v1/traces`;
    }
  }

  /**
   * Send request with optional gzip compression
   * @param endpoint - The URL to send to
   * @param body - The payload to send
   */
  private async sendRequest(endpoint: string, body: unknown): Promise<void> {
    const jsonBody = JSON.stringify(body);
    let bodyData: BodyInit = jsonBody;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Apply gzip compression if configured
    if (this.compression === "gzip") {
      const compressed = gzipSync(Buffer.from(jsonBody));
      // Convert Buffer to Uint8Array for fetch compatibility
      bodyData = new Uint8Array(compressed);
      headers["Content-Encoding"] = "gzip";
    }

    // Add any custom headers from config
    if (this.config.headers) {
      Object.assign(headers, this.config.headers);
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: bodyData,
    });

    if (!response.ok) {
      throw new Error(`OTLP export failed: ${response.statusText}`);
    }
  }
}
