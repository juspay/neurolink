import {
  DEFAULT_BASE_URL,
  DEFAULT_FLUSH_AT,
  DEFAULT_FLUSH_BUDGET_MS,
  DEFAULT_FLUSH_INTERVAL_MS,
  DEFAULT_TIMEOUT_MS,
  HEALTH_PATH,
  MAX_CONCURRENT_DELIVERIES,
  MAX_EXPORT_RETRY_AFTER_MS,
  MAX_QUEUED_SPANS,
  MAX_SPANS_PER_REQUEST,
  QUEUE_DROP_WARN_INTERVAL_MS,
  TRACES_PATH,
} from "../../constants/langfuse.js";
import type {
  ExporterHealthStatus,
  ExporterStatus,
  ExportResult,
  LangfuseAttributePolicy,
  LangfuseDeliveryReport,
  LangfuseExporterConfig,
  LangfusePostOutcome,
  OtlpEncodedSpan,
  SpanData,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { parseRetryAfterMs } from "../../utils/retryAfter.js";
import {
  chunkOtlpSpans,
  toOtlpEncodedSpan,
  toOtlpRequest,
} from "../otlpEncoding.js";
import {
  BaseExporter,
  exponentialRetryDelayMs,
  exporterStatusOf,
  reportDeliveriesWith,
} from "./baseExporter.js";

let credentialsWarned = false;
let malformedRejectionLogged = false;

function isRetryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function retryAfterOf(error: unknown): number | undefined {
  return error instanceof Error &&
    "retryAfterMs" in error &&
    typeof error.retryAfterMs === "number"
    ? error.retryAfterMs
    : undefined;
}

// A flush or shutdown still ends at its budget: the delivery signal cuts the
// wait short.
function retryDelayFor(error: unknown, attempt: number): number {
  const requested = retryAfterOf(error);
  return requested === undefined
    ? exponentialRetryDelayMs(error, attempt)
    : Math.min(requested, MAX_EXPORT_RETRY_AFTER_MS);
}

function partialSuccessOf(body: unknown): object | undefined {
  return typeof body === "object" &&
    body !== null &&
    "partialSuccess" in body &&
    typeof body.partialSuccess === "object" &&
    body.partialSuccess !== null
    ? body.partialSuccess
    : undefined;
}

// A count Langfuse cannot have meant (not a whole number, negative, or more
// than was sent) is read as none, so it neither hides earlier drops nor
// invents new ones.
function rejectedCount(partial: object | undefined, sent: number): number {
  const raw =
    partial && "rejectedSpans" in partial ? partial.rejectedSpans : undefined;
  if (raw === undefined) {
    return 0;
  }
  const count =
    typeof raw === "number" || typeof raw === "string"
      ? Number(raw)
      : Number.NaN;
  if (Number.isInteger(count) && count >= 0 && count <= sent) {
    return count;
  }
  if (!malformedRejectionLogged) {
    malformedRejectionLogged = true;
    logger.debug(
      "[langfuse] Ignoring a partialSuccess.rejectedSpans that is not a count of the spans sent",
      { sent },
    );
  }
  return 0;
}

/**
 * @description Exporter that delivers observation spans to Langfuse's OTLP/HTTP JSON endpoint (`POST /api/public/otel/v1/traces`), which keeps native observation types and identity on every observation. Spans are queued without blocking and sent in batches, with at most `MAX_CONCURRENT_DELIVERIES` requests in flight; spans that end while every one is busy wait, at most `MAX_QUEUED_SPANS` of them, and the oldest beyond that are dropped, counted and warned about once a minute. Failed requests are retried with backoff when the failure is transient (429, 5xx, network), after the `Retry-After` of a 429 or 503 when it names one (at most `MAX_EXPORT_RETRY_AFTER_MS`). `flush()` and `shutdown()` wait at most `flushBudgetMs` and then drop what is still in flight, and a batch that could not be delivered is reported by `exportBatch`, logged at warn level and counted in the health check; when Langfuse took none of the latest batch (refused, failed or every span rejected), `getStatus()` and `healthCheck()` read unhealthy with the dropped count until a batch is accepted again. `exportSpan` reports only the buffer step, so a failed delivery never opens the registry's circuit breaker and spans that end after an outage are still buffered and sent.
 */
export class LangfuseExporter extends BaseExporter {
  private readonly authorization: string;
  private readonly baseUrl: string;
  private readonly policy: LangfuseAttributePolicy;
  private readonly flushBudgetMs: number;
  private readonly inflight = new Set<Promise<void>>();
  private delivery = new AbortController();
  private droppedSpans = 0;
  // Counted when Langfuse accepts a batch; the base counter also counts a span
  // queued by exportSpan, which is not a delivery.
  private acceptedSpans = 0;
  private lastDeliveryError: string | undefined;
  private unwarnedQueueDrops = 0;
  private lastQueueDropWarning = 0;

  /**
   * @description Creates an exporter for one Langfuse project.
   * @param config {LangfuseExporterConfig} - Credentials, endpoint, environment, release, masking, batching and flush-budget options. `environment` and `release` fall back to `LANGFUSE_TRACING_ENVIRONMENT` and `LANGFUSE_RELEASE`, and only fill spans that do not carry them already.
   */
  constructor(private readonly langfuse: LangfuseExporterConfig) {
    super("langfuse", {
      ...langfuse,
      maxBufferSize: langfuse.maxBufferSize ?? DEFAULT_FLUSH_AT,
    });
    this.authorization = `Basic ${Buffer.from(
      `${langfuse.publicKey}:${langfuse.secretKey}`,
    ).toString("base64")}`;
    this.baseUrl = (langfuse.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.flushBudgetMs =
      langfuse.flushBudgetMs !== undefined && langfuse.flushBudgetMs > 0
        ? langfuse.flushBudgetMs
        : DEFAULT_FLUSH_BUDGET_MS;
    this.policy = {
      environment:
        langfuse.environment ?? process.env.LANGFUSE_TRACING_ENVIRONMENT,
      release: langfuse.release ?? process.env.LANGFUSE_RELEASE,
      redactIO: langfuse.redactIO ?? false,
      mask: langfuse.mask,
    };
    reportDeliveriesWith(this, () => ({
      delivered: this.acceptedSpans,
      failed: this.droppedSpans,
      lastError: this.lastDeliveryError,
    }));
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (!this.langfuse.publicKey || !this.langfuse.secretKey) {
      throw new Error("Langfuse publicKey and secretKey are required");
    }
    this.initialized = true;
    // Periodic and size-triggered sends are not subject to the flush budget:
    // only a caller that waits for delivery is.
    this.flushInterval = setInterval(
      () => this.dispatch(),
      this.config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS,
    );
    this.flushInterval.unref();
  }

  async exportSpan(span: SpanData): Promise<ExportResult> {
    this.bufferSpan(span);
    return this.createSuccessResult(1, 0);
  }

  async exportBatch(spans: SpanData[]): Promise<ExportResult> {
    const startTime = Date.now();
    const report = await this.deliver(
      spans.map((span) => toOtlpEncodedSpan(span, this.policy)),
      this.delivery.signal,
    );
    return this.record(spans.length, report, Date.now() - startTime);
  }

  /**
   * @description Sends everything buffered and waits for delivery, but no longer than the flush budget; spans still in flight when it runs out are dropped and counted, and spans still waiting for a delivery slot stay buffered.
   * @returns {Promise<void>} Resolves when delivery finished or the budget ran out.
   */
  async flush(): Promise<void> {
    await this.settle();
  }

  protected bufferSpan(span: SpanData): void {
    this.buffer.push(span);
    if (
      this.buffer.length >= this.maxBufferSize ||
      this.buffer.length > MAX_QUEUED_SPANS
    ) {
      this.dispatch();
    }
    if (this.buffer.length > MAX_QUEUED_SPANS) {
      this.dropOldestWaiting(this.buffer.length - MAX_QUEUED_SPANS);
    }
  }

  private dispatch(): void {
    while (
      this.buffer.length > 0 &&
      this.inflight.size < MAX_CONCURRENT_DELIVERIES
    ) {
      const spans = this.buffer.slice(0, MAX_SPANS_PER_REQUEST);
      this.buffer = this.buffer.slice(spans.length);
      const pending = this.exportQuietly(spans);
      this.inflight.add(pending);
      void pending.finally(() => this.inflight.delete(pending));
    }
  }

  // Langfuse is not taking spans as fast as they end. Spans keep being
  // accepted, so the oldest waiting ones make room; no breaker is involved.
  private dropOldestWaiting(count: number): void {
    this.buffer = this.buffer.slice(count);
    this.droppedSpans += count;
    this.unwarnedQueueDrops += count;
    this.lastDeliveryError = `${MAX_CONCURRENT_DELIVERIES} deliveries in flight and ${MAX_QUEUED_SPANS} spans waiting; dropping the oldest`;
    const now = Date.now();
    if (now - this.lastQueueDropWarning >= QUEUE_DROP_WARN_INTERVAL_MS) {
      logger.warn(
        `[langfuse] Langfuse is not keeping up; dropped the ${this.unwarnedQueueDrops} oldest waiting spans`,
      );
      this.lastQueueDropWarning = now;
      this.unwarnedQueueDrops = 0;
    }
  }

  // Deliveries free their slot for the next waiting spans until nothing is
  // left or the budget runs out, so spans that end meanwhile are sent too.
  private async settle(): Promise<void> {
    const deadline = Date.now() + this.flushBudgetMs;
    for (this.dispatch(); this.inflight.size > 0; this.dispatch()) {
      if ((await this.nextDelivery(deadline)) === "expired") {
        logger.warn(
          `[langfuse] Delivery did not finish within ${this.flushBudgetMs}ms; dropping what is still in flight`,
        );
        const abandoned = this.delivery;
        this.delivery = new AbortController();
        abandoned.abort(new Error("Langfuse flush budget exhausted"));
        await Promise.all(this.inflight);
        return;
      }
    }
  }

  private async nextDelivery(
    deadline: number,
  ): Promise<"delivered" | "expired"> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<"expired">((resolve) => {
      timer = setTimeout(
        () => resolve("expired"),
        Math.max(0, deadline - Date.now()),
      );
    });
    const outcome = await Promise.race([
      Promise.race(this.inflight).then(() => "delivered" as const),
      expired,
    ]);
    clearTimeout(timer);
    return outcome;
  }

  private async exportQuietly(spans: SpanData[]): Promise<void> {
    try {
      await this.exportBatch(spans);
    } catch (error) {
      this.droppedSpans += spans.length;
      this.lastDeliveryError = messageOf(error);
      logger.warn("[langfuse] Export failed", {
        error: this.lastDeliveryError,
      });
    }
  }

  /**
   * @description Delivers what is buffered, including spans that end while it drains, within the flush budget, then stops the exporter. Spans that could not be sent by then are dropped and counted, so none is left pending.
   * @returns {Promise<void>} Resolves when the exporter has stopped.
   */
  async shutdown(): Promise<void> {
    await this.settle();
    this.stopFlushInterval();
    this.initialized = false;
    const stranded = this.buffer.length;
    if (stranded > 0) {
      this.buffer = [];
      this.droppedSpans += stranded;
      this.lastDeliveryError = "Langfuse exporter shut down before delivery";
      logger.warn(
        `[langfuse] Dropped ${stranded} spans still waiting at shutdown`,
      );
    }
  }

  /**
   * @description Snapshot of this exporter for status reporting, without a network call: what is queued, what Langfuse accepted and what was dropped, and unhealthy while the latest delivery failed.
   * @returns {ExporterStatus} The exporter's current state.
   */
  getStatus(): ExporterStatus {
    return exporterStatusOf(this);
  }

  // Reachable is not enough: like getStatus(), the exporter reads unhealthy
  // while its latest delivery failed, until Langfuse accepts a batch again.
  async healthCheck(): Promise<ExporterHealthStatus> {
    const problems = [
      ...(this.lastDeliveryError !== undefined ? [this.lastDeliveryError] : []),
      ...(this.droppedSpans > 0
        ? [
            `${this.droppedSpans} ${this.droppedSpans === 1 ? "span" : "spans"} dropped since start`,
          ]
        : []),
    ];
    try {
      await this.withRetry(() => this.ping(), "health check");
      return this.createHealthStatus(
        this.lastDeliveryError === undefined,
        problems.length > 0 ? problems : undefined,
      );
    } catch {
      return this.createHealthStatus(false, [
        "Health check failed",
        ...problems,
      ]);
    }
  }

  protected async ping(): Promise<void> {
    const response = await fetch(`${this.baseUrl}${HEALTH_PATH}`, {
      headers: { Authorization: this.authorization },
      signal: AbortSignal.timeout(this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`Langfuse API unreachable: ${response.status}`);
    }
  }

  private record(
    total: number,
    report: LangfuseDeliveryReport,
    durationMs: number,
  ): ExportResult {
    if (total === 0) {
      return this.createSuccessResult(0, durationMs);
    }
    const failed = report.droppedIds.length + report.rejected;
    this.droppedSpans += failed;
    // Langfuse took none of the batch, refused or rejected: that is a failed
    // delivery even when the response was a 200 with partialSuccess.
    this.lastDeliveryError =
      report.delivered === 0 && failed > 0
        ? `Dropped ${failed} of ${total} spans: ${report.error ?? "Langfuse rejected every span"}`
        : report.error;
    if (failed > 0) {
      logger.warn(`[langfuse] Dropped ${failed} of ${total} spans`, {
        error: report.error,
      });
    }
    if (report.delivered > 0) {
      this.lastExportTime = Date.now();
      this.acceptedSpans += report.delivered;
    }
    return {
      success: failed === 0,
      exportedCount: report.delivered,
      failedCount: failed,
      ...(report.droppedIds.length > 0 && {
        errors: report.droppedIds.map((spanId) => ({
          spanId,
          error: report.error ?? "Delivery failed",
          retryable: true,
        })),
      }),
      durationMs,
    };
  }

  private async deliver(
    items: OtlpEncodedSpan[],
    signal: AbortSignal,
  ): Promise<LangfuseDeliveryReport> {
    const report: LangfuseDeliveryReport = {
      delivered: 0,
      rejected: 0,
      droppedIds: [],
    };
    for (const chunk of chunkOtlpSpans(items)) {
      try {
        const outcome = await this.withRetry(
          () => this.post(chunk, signal),
          "export",
          signal,
          retryDelayFor,
        );
        if (outcome.accepted) {
          report.delivered += chunk.length - outcome.rejected;
          report.rejected += outcome.rejected;
        } else {
          report.droppedIds.push(...chunk.map(({ span }) => span.spanId));
          report.error = "Langfuse did not accept the batch";
        }
      } catch (error) {
        report.droppedIds.push(...chunk.map(({ span }) => span.spanId));
        report.error = messageOf(error);
      }
    }
    return report;
  }

  private async post(
    chunk: OtlpEncodedSpan[],
    signal: AbortSignal,
  ): Promise<LangfusePostOutcome> {
    const response = await fetch(`${this.baseUrl}${TRACES_PATH}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.authorization,
        "x-langfuse-sdk-name": "javascript",
        "x-langfuse-ingestion-version": "4",
        "x-langfuse-public-key": this.langfuse.publicKey,
      },
      body: JSON.stringify(toOtlpRequest(chunk)),
      signal: AbortSignal.any([
        AbortSignal.timeout(this.config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
        signal,
      ]),
    });
    if (response.status === 401 || response.status === 403) {
      if (!credentialsWarned) {
        credentialsWarned = true;
        logger.warn("[langfuse] Langfuse credentials rejected");
      }
      return { accepted: false };
    }
    if (isRetryable(response.status)) {
      const retryAfterMs =
        response.status === 429 || response.status === 503
          ? parseRetryAfterMs(response.headers)
          : undefined;
      throw Object.assign(
        new Error(`Langfuse API error: ${response.status}`),
        retryAfterMs === undefined ? {} : { retryAfterMs },
      );
    }
    if (!response.ok) {
      logger.warn(`[langfuse] Export rejected with ${response.status}`);
      return { accepted: false };
    }
    // Langfuse took the request; a body that is not an object, or not JSON,
    // reports no rejections.
    const partial = partialSuccessOf(
      await response.json().catch(() => undefined),
    );
    const rejected = rejectedCount(partial, chunk.length);
    if (rejected > 0) {
      logger.warn(`[langfuse] ${rejected} spans rejected`, {
        message:
          partial && "errorMessage" in partial
            ? partial.errorMessage
            : undefined,
      });
    }
    return { accepted: true, rejected };
  }
}
