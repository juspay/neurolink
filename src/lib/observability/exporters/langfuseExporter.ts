/**
 * Langfuse Exporter
 * Exports spans to Langfuse observability platform
 */

import type {
  ExporterHealthStatus,
  ExportResult,
  LangfuseExporterConfig,
  SpanData,
} from "../types/index.js";
import { SpanType } from "../types/spanTypes.js";
import { SpanSerializer } from "../utils/spanSerializer.js";
import { BaseExporter } from "./baseExporter.js";

/**
 * Langfuse exporter for LLM observability
 * Supports traces, generations, spans, and scores
 */
export class LangfuseExporter extends BaseExporter {
  private readonly publicKey: string;
  private readonly secretKey: string;
  private readonly baseUrl: string;
  private readonly release?: string;

  constructor(config: LangfuseExporterConfig) {
    super("langfuse", config);
    this.publicKey = config.publicKey;
    this.secretKey = config.secretKey;
    this.baseUrl = config.baseUrl ?? "https://cloud.langfuse.com";
    this.release = config.release;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Verify credentials with a simple check
    if (!this.publicKey || !this.secretKey) {
      throw new Error("Langfuse publicKey and secretKey are required");
    }

    this.initialized = true;
    this.startFlushInterval(this.config.flushIntervalMs ?? 5000);
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    try {
      // Create trace if this is a root span
      if (!span.parentSpanId) {
        await this.createTrace(span);
      }

      // Create span/generation based on type
      if (span.type === SpanType.MODEL_GENERATION) {
        await this.createGeneration(span);
      } else {
        await this.createSpan(span);
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
    const results = await Promise.allSettled(
      spans.map((s) => this.exportSpan(s)),
    );

    const successful = results.filter(
      (r) => r.status === "fulfilled" && r.value.success,
    ).length;
    const failed = spans.length - successful;

    return {
      success: failed === 0,
      exportedCount: successful,
      failedCount: failed,
      errors: results
        .filter(
          (r) =>
            r.status === "rejected" ||
            (r.status === "fulfilled" && !r.value.success),
        )
        .map((r, i) => ({
          spanId: spans[i].spanId,
          error: r.status === "rejected" ? String(r.reason) : "Export failed",
          retryable: true,
        })),
      durationMs: Date.now() - startTime,
    };
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
   * Verify connectivity to Langfuse API
   */
  protected async ping(): Promise<void> {
    const credentials = Buffer.from(
      `${this.publicKey}:${this.secretKey}`,
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}/api/public/health`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      // 404 is acceptable as health endpoint may not exist
      throw new Error(`Langfuse API unreachable: ${response.status}`);
    }
  }

  /**
   * Create a Langfuse trace
   */
  private async createTrace(span: SpanData): Promise<void> {
    const body = {
      id: span.traceId,
      name: span.name,
      userId: span.attributes["user.id"] as string | undefined,
      sessionId: span.attributes["session.id"] as string | undefined,
      // Only pick safe, non-PII attributes for metadata — intentionally excludes
      // input, output, error.stack, and other user content to match Braintrust exporter
      metadata: filterSafeMetadata(span.attributes),
      release: this.release,
      tags: this.extractTags(span),
    };

    await this.apiCall("/api/public/traces", body);
  }

  /**
   * Create a Langfuse span
   */
  private async createSpan(span: SpanData): Promise<void> {
    const langfuseSpan = SpanSerializer.toLangfuseFormat(span);

    const body = {
      ...langfuseSpan,
      traceId: span.traceId,
    };

    await this.apiCall("/api/public/spans", body);
  }

  /**
   * Create a Langfuse generation (for LLM calls)
   */
  private async createGeneration(span: SpanData): Promise<void> {
    const langfuseSpan = SpanSerializer.toLangfuseFormat(span);

    const body = {
      traceId: span.traceId,
      id: langfuseSpan.id,
      parentObservationId: langfuseSpan.parentObservationId,
      name: langfuseSpan.name,
      startTime: langfuseSpan.startTime,
      endTime: langfuseSpan.endTime,
      model: span.attributes["ai.model"],
      modelParameters: {
        temperature: span.attributes["ai.temperature"],
        maxTokens: span.attributes["ai.max_tokens"],
        topP: span.attributes["ai.top_p"],
      },
      input: langfuseSpan.input,
      output: langfuseSpan.output,
      usage: langfuseSpan.usage,
      metadata: langfuseSpan.metadata,
      level: langfuseSpan.level,
      statusMessage: langfuseSpan.statusMessage,
    };

    await this.apiCall("/api/public/generations", body);
  }

  /**
   * Make API call to Langfuse
   */
  private async apiCall(
    path: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const credentials = Buffer.from(
      `${this.publicKey}:${this.secretKey}`,
    ).toString("base64");

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Langfuse API error: ${response.status} - ${text}`);
    }
  }

  /**
   * Extract tags from span attributes
   */
  private extractTags(span: SpanData): string[] {
    const tags: string[] = [];
    if (span.attributes["ai.provider"]) {
      tags.push(`provider:${span.attributes["ai.provider"]}`);
    }
    if (span.attributes["ai.model"]) {
      tags.push(`model:${span.attributes["ai.model"]}`);
    }
    if (span.attributes["deployment.environment"]) {
      tags.push(`env:${span.attributes["deployment.environment"]}`);
    }
    return tags;
  }
}

// Safe metadata filtering imported from shared module to avoid duplication
import { filterSafeMetadata } from "../utils/safeMetadata.js";
