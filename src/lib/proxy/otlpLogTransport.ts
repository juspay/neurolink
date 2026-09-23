/**
 * OTLP/HTTP JSON transport with response-aware acknowledgement. The SDK's HTTP
 * exporter reports SUCCESS even for partialSuccess or malformed responses, so
 * its callback cannot establish that every record in our batch was accepted.
 * Serialization stays with the official OpenTelemetry implementation.
 */
import { readFileSync } from "node:fs";
import {
  Agent as HttpAgent,
  request as httpRequest,
  validateHeaderName,
  validateHeaderValue,
} from "node:http";
import { Agent as HttpsAgent, request as httpsRequest } from "node:https";
import { setTimeout as delay } from "node:timers/promises";
import { promisify } from "node:util";
import { gzip } from "node:zlib";
import { ExportResultCode, parseKeyPairsIntoRecord } from "@opentelemetry/core";
import { JsonLogsSerializer } from "@opentelemetry/otlp-transformer";
import type { ReadableLogRecord } from "@opentelemetry/sdk-logs";
import type { ProxyOtlpLogTransport } from "../types/index.js";

const gzipAsync = promisify(gzip);
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_EXPORT_ATTEMPTS = 5;
const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);
const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EPIPE",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ENOTFOUND",
  "ENETUNREACH",
  "EHOSTUNREACH",
]);

class ProxyOtlpResponseError extends Error {
  constructor(
    message: string,
    readonly retryable = false,
    readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "ProxyOtlpResponseError";
  }
}

/** Only explicit transient transport failures may be retained and retried. */
export function getProxyOtlpRetryAfter(
  error: Error | undefined,
): number | undefined {
  return error instanceof ProxyOtlpResponseError && error.retryable
    ? (error.retryAfterMs ?? 0)
    : undefined;
}

function signalSetting(suffix: string): string | undefined {
  return (
    process.env[`OTEL_EXPORTER_OTLP_LOGS_${suffix}`]?.trim() ||
    process.env[`OTEL_EXPORTER_OTLP_${suffix}`]?.trim() ||
    undefined
  );
}

function certificate(suffix: string): Buffer | undefined {
  const path = signalSetting(suffix);
  if (!path) {
    return undefined;
  }
  try {
    return readFileSync(path);
  } catch {
    // File paths, headers, backend bodies and native TLS errors can contain
    // credentials. Export diagnostics intentionally expose only fixed reasons.
    throw new Error(`Proxy OTLP ${suffix} file could not be read`);
  }
}

function retryAfter(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  if (/^\d+$/.test(value.trim())) {
    return Number(value) * 1000;
  }
  const at = Date.parse(value);
  return Number.isFinite(at) ? Math.max(0, at - Date.now()) : undefined;
}

function validateAcknowledgement(bytes: Buffer): void {
  let payload: unknown;
  try {
    payload = JSON.parse(bytes.toString("utf8"));
  } catch {
    // Empty JSON is not a serialized ExportLogsServiceResponse. Its valid
    // empty message is {}, unlike the zero-byte protobuf representation.
    throw new ProxyOtlpResponseError(
      "OTLP response JSON is empty or malformed",
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new ProxyOtlpResponseError("OTLP response must be a JSON object");
  }
  if (
    Object.keys(payload).some(
      (key) => key !== "partialSuccess" && key !== "partial_success",
    )
  ) {
    throw new ProxyOtlpResponseError("OTLP response has unexpected fields");
  }
  if ("partialSuccess" in payload && "partial_success" in payload) {
    throw new ProxyOtlpResponseError(
      "OTLP response has ambiguous field aliases",
    );
  }
  const partial =
    "partialSuccess" in payload
      ? payload.partialSuccess
      : "partial_success" in payload
        ? payload.partial_success
        : undefined;
  if (partial === null || partial === undefined) {
    return;
  }
  if (typeof partial !== "object" || Array.isArray(partial)) {
    throw new ProxyOtlpResponseError(
      "OTLP partial success response is malformed",
    );
  }
  const allowedFields = new Set([
    "rejectedLogRecords",
    "rejected_log_records",
    "errorMessage",
    "error_message",
  ]);
  if (Object.keys(partial).some((key) => !allowedFields.has(key))) {
    throw new ProxyOtlpResponseError(
      "OTLP partial success response has unexpected fields",
    );
  }
  if (
    ("rejectedLogRecords" in partial && "rejected_log_records" in partial) ||
    ("errorMessage" in partial && "error_message" in partial)
  ) {
    throw new ProxyOtlpResponseError(
      "OTLP partial success has ambiguous field aliases",
    );
  }
  const message =
    "errorMessage" in partial
      ? partial.errorMessage
      : "error_message" in partial
        ? partial.error_message
        : undefined;
  if (
    message !== null &&
    message !== undefined &&
    typeof message !== "string"
  ) {
    throw new ProxyOtlpResponseError(
      "OTLP partial success response is malformed",
    );
  }
  const rejected =
    "rejectedLogRecords" in partial
      ? partial.rejectedLogRecords
      : "rejected_log_records" in partial
        ? partial.rejected_log_records
        : 0;
  // ProtoJSON accepts integer strings or numbers; null is the absent default.
  if (rejected === null || rejected === 0 || rejected === "0") {
    return;
  }
  const integer =
    typeof rejected === "string" && /^\d+$/.test(rejected)
      ? BigInt(rejected)
      : typeof rejected === "number" &&
          Number.isSafeInteger(rejected) &&
          rejected >= 0
        ? BigInt(rejected)
        : undefined;
  if (integer === undefined || integer > 9223372036854775807n) {
    throw new ProxyOtlpResponseError("OTLP rejected record count is malformed");
  }
  if (integer > 0n) {
    // We cannot identify the rejected subset. Mark the entire batch uncertain;
    // replaying a known partial response would duplicate its accepted subset.
    throw new ProxyOtlpResponseError(
      "OTLP partial success rejected log records",
    );
  }
}

/** Both proxy queues use this transport; success is not backend persistence. */
export function createProxyOtlpLogTransport(
  endpoint: string,
  timeoutMillis: number,
): ProxyOtlpLogTransport {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    throw new Error("Proxy OTLP endpoint is invalid");
  }
  if (!new Set(["http:", "https:"]).has(url.protocol)) {
    throw new Error("Proxy OTLP endpoint must use HTTP or HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("Proxy OTLP endpoint credentials must use OTLP headers");
  }
  const compression = signalSetting("COMPRESSION") ?? "none";
  if (compression !== "none" && compression !== "gzip") {
    throw new Error("Proxy OTLP compression must be none or gzip");
  }
  const headers: Record<string, string> = {};
  try {
    for (const raw of [
      process.env.OTEL_EXPORTER_OTLP_HEADERS,
      process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS,
    ]) {
      for (const [key, value] of Object.entries(parseKeyPairsIntoRecord(raw))) {
        validateHeaderName(key);
        validateHeaderValue(key, value);
        headers[key.toLowerCase()] = value;
      }
    }
  } catch {
    throw new Error("Proxy OTLP headers are invalid");
  }
  // These describe the serialized wire payload, irrespective of user headers.
  headers["content-type"] = "application/json";
  headers["accept"] = "application/json";
  headers["accept-encoding"] = "identity";
  delete headers["content-encoding"];
  if (compression === "gzip") {
    headers["content-encoding"] = "gzip";
  }
  const tls = {
    ca: certificate("CERTIFICATE"),
    cert: certificate("CLIENT_CERTIFICATE"),
    key: certificate("CLIENT_KEY"),
  };
  if (Boolean(tls.cert) !== Boolean(tls.key)) {
    throw new Error(
      "Proxy OTLP client certificate and key must be set together",
    );
  }
  const agent =
    url.protocol === "https:"
      ? new HttpsAgent({ keepAlive: true, maxSockets: 30, ...tls })
      : new HttpAgent({ keepAlive: true, maxSockets: 30 });
  const request = url.protocol === "https:" ? httpsRequest : httpRequest;
  let closed = false;
  const active = new Set<Promise<void>>();
  const controllers = new Set<AbortController>();
  const sendOnce = (data: Uint8Array, signal: AbortSignal): Promise<void> =>
    new Promise<void>((resolve, reject) => {
      let receivedResponse = false;
      const req = request(
        url,
        {
          method: "POST",
          agent,
          signal,
          headers: { ...headers, "content-length": String(data.byteLength) },
        },
        (response) => {
          receivedResponse = true;
          const status = response.statusCode ?? 0;
          const fail = (error: ProxyOtlpResponseError) => {
            reject(error);
            response.destroy();
          };
          // An HTTP status, a partial response or a broken success response must
          // never be mistaken for an acknowledgement of individual log records.
          if (status !== 200) {
            fail(
              new ProxyOtlpResponseError(
                `OTLP HTTP ${status}`,
                RETRYABLE_STATUSES.has(status),
                retryAfter(response.headers["retry-after"]),
              ),
            );
            return;
          }
          const encoding = response.headers["content-encoding"];
          if (encoding && encoding !== "identity") {
            fail(
              new ProxyOtlpResponseError(
                "OTLP response encoding is unsupported",
              ),
            );
            return;
          }
          const contentType = response.headers["content-type"];
          if (
            contentType &&
            contentType.split(";", 1)[0].trim().toLowerCase() !==
              "application/json"
          ) {
            fail(
              new ProxyOtlpResponseError(
                "OTLP response content type is not JSON",
              ),
            );
            return;
          }
          const chunks: Buffer[] = [];
          let size = 0;
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > MAX_RESPONSE_BYTES) {
              fail(
                new ProxyOtlpResponseError(
                  "OTLP response exceeds 64 KiB limit",
                ),
              );
              return;
            }
            chunks.push(chunk);
          });
          response.on("aborted", () =>
            reject(
              new ProxyOtlpResponseError(
                "OTLP success response was interrupted",
              ),
            ),
          );
          response.on("error", () =>
            reject(
              new ProxyOtlpResponseError(
                "OTLP success response could not be read",
              ),
            ),
          );
          response.on("end", () => {
            try {
              validateAcknowledgement(Buffer.concat(chunks));
              resolve();
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      req.on("error", (error: NodeJS.ErrnoException) =>
        reject(
          new ProxyOtlpResponseError(
            signal.aborted
              ? "OTLP export deadline exceeded"
              : "OTLP transport failed",
            !receivedResponse &&
              (signal.aborted || RETRYABLE_NETWORK_CODES.has(error.code ?? "")),
          ),
        ),
      );
      req.end(data);
    });
  const send = async (records: ReadableLogRecord[]): Promise<void> => {
    const controller = new AbortController();
    controllers.add(controller);
    const deadlineAt = Date.now() + timeoutMillis;
    const deadline = setTimeout(() => controller.abort(), timeoutMillis);
    deadline.unref();
    try {
      const serialized = JsonLogsSerializer.serializeRequest(records);
      if (!serialized) {
        throw new ProxyOtlpResponseError(
          "OTLP serialization produced no payload",
        );
      }
      // Serialize and compress once, so ambiguous retries retain byte-for-byte
      // event identities and payloads for query-side deduplication.
      const bytes =
        compression === "gzip" ? await gzipAsync(serialized) : serialized;
      let attempt = 0;
      while (!controller.signal.aborted && Date.now() < deadlineAt) {
        attempt++;
        try {
          await sendOnce(bytes, controller.signal);
          return;
        } catch (error) {
          if (!(error instanceof ProxyOtlpResponseError) || !error.retryable) {
            throw error;
          }
          if (attempt >= MAX_EXPORT_ATTEMPTS) {
            throw new ProxyOtlpResponseError(
              "OTLP retry attempt limit reached",
              true,
              error.retryAfterMs,
            );
          }
          const exponential = Math.min(
            5000,
            1000 * 2 ** Math.min(attempt - 1, 3),
          );
          // Retry-After is a lower bound, never permission to hammer a busy
          // collector. Even Retry-After: 0 retains exponential backoff+jitter.
          const wait = Math.max(
            error.retryAfterMs ?? 0,
            exponential * (0.8 + Math.random() * 0.4),
          );
          if (wait >= deadlineAt - Date.now()) {
            throw new ProxyOtlpResponseError(
              "OTLP retry exceeds export deadline",
              true,
              wait,
            );
          }
          await delay(wait, undefined, { signal: controller.signal });
        }
      }
      throw new ProxyOtlpResponseError("OTLP export deadline exceeded", true);
    } catch (error) {
      if (error instanceof ProxyOtlpResponseError) {
        throw error;
      }
      throw new ProxyOtlpResponseError(
        controller.signal.aborted
          ? "OTLP export deadline exceeded"
          : "OTLP export failed",
        controller.signal.aborted,
      );
    } finally {
      clearTimeout(deadline);
      controllers.delete(controller);
    }
  };
  return {
    abortPending() {
      closed = true;
      for (const controller of controllers) {
        controller.abort();
      }
      agent.destroy();
    },
    export(records, callback) {
      if (closed) {
        callback({
          code: ExportResultCode.FAILED,
          error: new Error("OTLP transport is shut down"),
        });
        return;
      }
      const operation = send(records).then(
        () => callback({ code: ExportResultCode.SUCCESS }),
        (error: Error) => callback({ code: ExportResultCode.FAILED, error }),
      );
      active.add(operation);
      void operation.finally(() => active.delete(operation)).catch(() => {});
    },
    async shutdown() {
      closed = true;
      await Promise.allSettled(active);
      agent.destroy();
    },
  };
}
