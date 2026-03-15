/**
 * LangSmith Exporter
 * Exports spans to LangSmith observability platform
 */

import { logger } from "../../utils/logger.js";

/**
 * Build a LangSmith dotted_order value: "{datetime}.{id}"
 * Format: YYYYMMDDTHHmmssSSSSSSZ.<id> (datetime in UTC with microseconds)
 */
function buildDottedOrder(isoTime: string, id: string): string {
  const d = new Date(isoTime);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const microseconds = String(d.getUTCMilliseconds() * 1000).padStart(6, "0");
  const dt =
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}T` +
    `${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}` +
    `${microseconds}Z`;
  return `${dt}.${id}`;
}
import type {
  ExporterHealthStatus,
  ExportResult,
  LangSmithExporterConfig,
  SpanData,
} from "../types/index.js";
import { SpanSerializer } from "../utils/spanSerializer.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * LangSmith exporter for LangChain ecosystem observability
 * Supports runs with proper type mapping
 */
export class LangSmithExporter extends BaseExporter {
  private readonly apiKey: string;
  private readonly projectName: string;
  private readonly endpoint: string;

  constructor(config: LangSmithExporterConfig) {
    super("langsmith", config);
    this.apiKey = config.apiKey;
    this.projectName = config.projectName ?? "default";
    this.endpoint = config.endpoint ?? "https://api.smith.langchain.com";
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify API key with a test request
    try {
      const response = await fetch(`${this.endpoint}/api/v1/info`, {
        headers: { "x-api-key": this.apiKey },
      });

      if (!response.ok) {
        throw new Error(
          `LangSmith initialization failed: ${response.statusText}`,
        );
      }
    } catch (error) {
      // Allow initialization to proceed even if API is unreachable
      // This enables offline/test scenarios
      logger.warn(
        "[LangSmith] Could not verify API connection:",
        error instanceof Error ? error.message : error,
      );
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      const langsmithRun = SpanSerializer.toLangSmithFormat(span);

      const response = await fetch(`${this.endpoint}/api/v1/runs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({
          ...langsmithRun,
          session_name: this.projectName,
        }),
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
      const post = spans.map((s) => {
        const run = SpanSerializer.toLangSmithFormat(s);
        // LangSmith /api/v1/runs/batch requires dotted_order and trace_id on each run
        const dotted_order = buildDottedOrder(
          run.start_time ?? s.startTime,
          run.id,
        );
        return {
          ...run,
          trace_id: run.trace_id ?? run.id,
          dotted_order,
          session_name: this.projectName,
        };
      });

      const response = await fetch(`${this.endpoint}/api/v1/runs/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
        },
        body: JSON.stringify({ post }),
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
   * Verify connectivity to LangSmith API
   */
  protected async ping(): Promise<void> {
    const response = await fetch(`${this.endpoint}/api/v1/info`, {
      headers: { "x-api-key": this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`LangSmith API unreachable: ${response.status}`);
    }
  }
}
