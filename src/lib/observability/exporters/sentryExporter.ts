/**
 * Sentry Exporter
 * Exports spans to Sentry error tracking and performance platform
 */

import { logger } from "../../utils/logger.js";
import type {
  ExporterHealthStatus,
  ExportResult,
  SentryExporterConfig,
  SentryModule,
  SentryScope,
  SpanData,
} from "../../types/index.js";
import { SpanStatus } from "../../types/index.js";
import { BaseExporter } from "./baseExporter.js";

// Sentry types - optional dependency

/**
 * Sentry exporter for error tracking and performance monitoring
 * Captures AI errors as exceptions and traces as transactions
 */
export class SentryExporter extends BaseExporter {
  private readonly dsn: string;
  private readonly tracesSampleRate: number;
  private readonly release?: string;
  private sentryHub: SentryModule | null = null;

  constructor(config: SentryExporterConfig) {
    super("sentry", config);
    this.dsn = config.dsn;
    this.tracesSampleRate = config.tracesSampleRate ?? 1.0;
    this.release = config.release;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Dynamically import Sentry to avoid bundling issues
    // @sentry/node is an optional peer dependency
    const sentry = await this.loadSentry();
    if (sentry) {
      sentry.init({
        dsn: this.dsn,
        tracesSampleRate: this.tracesSampleRate,
        release: this.release,
        environment: this.config.environment ?? "production",
      });
      this.sentryHub = sentry as unknown as SentryModule;
    }

    this.initialized = true;
  }

  /**
   * Load Sentry SDK dynamically as an optional dependency
   * @returns Sentry module or null if not installed
   */
  private async loadSentry(): Promise<SentryModule | null> {
    try {
      // Use standard dynamic import for optional peer dependency
      // @ts-expect-error - @sentry/node is an optional peer dependency
      const sentry = await import("@sentry/node");
      return sentry as unknown as SentryModule;
    } catch {
      logger.warn(
        "[Sentry] Sentry SDK not installed. Install @sentry/node to use SentryExporter.",
      );
      return null;
    }
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    const startTime = Date.now();

    if (!this.sentryHub) {
      // Sentry not available, just succeed silently
      return this.createSuccessResult(0, Date.now() - startTime);
    }

    try {
      const Sentry = this.sentryHub;

      // For errors, capture as Sentry exception
      if (span.status === SpanStatus.ERROR) {
        Sentry.withScope((scope: SentryScope) => {
          scope.setTags({
            "ai.provider": (span.attributes["ai.provider"] as string) ?? "",
            "ai.model": (span.attributes["ai.model"] as string) ?? "",
            "span.type": span.type,
          });
          scope.setContext("ai", {
            tokens: {
              input: span.attributes["ai.tokens.input"],
              output: span.attributes["ai.tokens.output"],
              total: span.attributes["ai.tokens.total"],
            },
            cost: span.attributes["ai.cost.total"],
            duration_ms: span.durationMs,
          });
          if (span.attributes["user.id"]) {
            scope.setUser({
              id: span.attributes["user.id"] as string,
            });
          }

          Sentry.captureException(
            new Error(span.statusMessage ?? "AI operation failed"),
          );
        });
      }

      // Create Sentry transaction for performance tracking
      const transaction = Sentry.startInactiveSpan({
        name: span.name,
        op: span.type,
        startTime: new Date(span.startTime).getTime() / 1000,
        attributes: {
          "ai.provider": span.attributes["ai.provider"] as string,
          "ai.model": span.attributes["ai.model"] as string,
          "ai.tokens.total": span.attributes["ai.tokens.total"] as number,
          "ai.cost.total": span.attributes["ai.cost.total"] as number,
        },
      });

      // End the transaction
      if (span.endTime) {
        transaction.end(new Date(span.endTime).getTime() / 1000);
      } else {
        transaction.end();
      }

      return this.createSuccessResult(1, Date.now() - startTime);
    } catch (error) {
      return this.createFailureResult(
        [span.spanId],
        error instanceof Error ? error.message : String(error),
        Date.now() - startTime,
        false,
      );
    }
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
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
    if (this.buffer.length > 0) {
      const spans = [...this.buffer];
      this.buffer = [];
      await this.exportBatch(spans);
    }

    // Flush Sentry's internal buffer
    if (this.sentryHub) {
      await this.sentryHub.flush(2000);
    }
  }

  async shutdown(): Promise<void> {
    await this.flush();

    // Close Sentry SDK
    if (this.sentryHub) {
      await this.sentryHub.close(2000);
    }

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
   * Verify Sentry SDK is functional
   */
  protected async ping(): Promise<void> {
    if (!this.sentryHub) {
      throw new Error("Sentry SDK not initialized");
    }
    // Sentry SDK is available, consider it healthy
    // Note: Sentry doesn't have a simple ping endpoint, but the SDK initialization verifies DSN
  }
}
