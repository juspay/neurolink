import { join } from "node:path";
import { mkdir, chmod, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { sanitizeForLog } from "../utils/logSanitize.js";
import { gzip as gzipCallback } from "node:zlib";
import type {
  ProxyBodyCaptureEntry,
  StoredBodyArtifact,
  ProcessedProxyBodyCapture,
} from "../types/index.js";
const REQUEST_LOG_IO_TIMEOUT_MS = 5_000;
/** Maximum redacted body bytes persisted per capture entry. */
const MAX_CAPTURED_BODY_BYTES = 1024 * 1024;
const MAX_OTEL_CAPTURED_BODY_BYTES = 8 * 1024 * 1024;
const BODY_TRUNCATION_MARKER = "\n...[TRUNCATED]";

const gzip = promisify(gzipCallback);

/** Headers whose values must always be redacted. */
const SENSITIVE_HEADER_NAMES = new Set([
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
]);

/** Pattern that matches header names likely to contain secrets. */
const SENSITIVE_HEADER_PATTERN = /token|secret|key|password|credential/i;

/** JSON keys whose values should be redacted in request/response bodies. */
const SENSITIVE_BODY_KEYS =
  /("(?:password|access_token|refresh_token|api_key|apiKey|secret|authorization|token|credential|x-api-key)"\s*:\s*)"(?:[^"\\]|\\.)*"/gi;

/**
 * Copy headers while removing credential values, including custom
 * secret-bearing header names.
 */
function redactHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!headers) {
    return headers;
  }
  const redacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (
      SENSITIVE_HEADER_NAMES.has(lower) ||
      SENSITIVE_HEADER_PATTERN.test(lower)
    ) {
      redacted[key] = "[REDACTED]";
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

const SENSITIVE_BODY_KEY =
  /^(?:password|access_token|refresh_token|api_key|apiKey|secret|authorization|token|credential|x-api-key)$/i;

/** Error messages may contain nested JSON encoded as a string. */
function redactNestedValue(key: string, value: unknown): unknown {
  if (SENSITIVE_BODY_KEY.test(key)) {
    return "[REDACTED]";
  }
  return typeof value === "string"
    ? sanitizeForLog(
        value.replace(SENSITIVE_BODY_KEYS, '$1"[REDACTED]"'),
        value.length,
      )
    : value;
}

/** Redact every value under a sensitive key, including objects and arrays. */
function redactBody(body: unknown): string | undefined {
  if (body === undefined || body === null) {
    return undefined;
  }
  let value = body;
  if (typeof body === "string") {
    try {
      value = JSON.parse(body);
    } catch {
      if (/^(?:event|data):/m.test(body)) {
        // Redact whole SSE data values, including nested credentials. Never
        // retain a truncated/invalid JSON tail whose secret cannot be parsed.
        return body
          .split(/\r\n\r\n|\n\n|\r\r/)
          .map((frame) => {
            const lines = frame.split(/\r\n|\n|\r/);
            const data = lines
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trimStart())
              .join("\n");
            if (!data || data === "[DONE]") {
              return frame;
            }
            let redacted: string;
            try {
              redacted = JSON.stringify(JSON.parse(data), redactNestedValue);
            } catch {
              redacted = "[UNPARSEABLE DATA REDACTED]";
            }
            return [
              ...lines.filter((line) => !line.startsWith("data:")),
              `data: ${redacted}`,
            ].join("\n");
          })
          .join("\n\n");
      }
      // Invalid or truncated structured JSON must not expose an unterminated
      // credential value that a quoted-string regex cannot safely redact.
      if (/^\s*[[{]/.test(body)) {
        return "[UNPARSEABLE DATA REDACTED]";
      }
      // Plain-text bodies retain the existing credential-field redaction.
      return sanitizeForLog(
        body.replace(SENSITIVE_BODY_KEYS, '$1"[REDACTED]"'),
        body.length,
      );
    }
  }
  return JSON.stringify(value, redactNestedValue);
}

/**
 * Restrict request and phase identifiers to characters safe for artifact
 * path components.
 */
function sanitizePhase(phase: string): string {
  return phase.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

/**
 * Hash the redacted artifact body so offline reconstruction can verify its
 * contents.
 */
function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Measure persisted UTF-8 bytes rather than JavaScript UTF-16 character
 * counts.
 */
function utf8ByteLength(value: string): number {
  return Buffer.byteLength(value, "utf8");
}

/**
 * Reserve space for the truncation marker and cut only at a UTF-8 code
 * point boundary.
 */
function truncateUtf8String(
  input: string,
  maxBytes: number,
  marker: string = BODY_TRUNCATION_MARKER,
): { value: string; bytes: number; truncated: boolean } {
  const inputBytes = utf8ByteLength(input);
  if (inputBytes <= maxBytes) {
    return { value: input, bytes: inputBytes, truncated: false };
  }

  const markerBytes = utf8ByteLength(marker);
  if (maxBytes <= markerBytes) {
    return { value: marker, bytes: markerBytes, truncated: true };
  }

  const buffer = Buffer.from(input, "utf8");
  let end = maxBytes - markerBytes;
  while (end > 0 && (buffer[end] & 0xc0) === 0x80) {
    end -= 1;
  }
  const value = buffer.subarray(0, end).toString("utf8");
  const truncatedValue = `${value}${marker}`;
  return {
    value: truncatedValue,
    bytes: utf8ByteLength(truncatedValue),
    truncated: true,
  };
}

/**
 * Split redacted text into byte-bounded OTLP chunks without splitting
 * encoded characters.
 */
export function splitUtf8StringByBytes(
  input: string,
  maxBytes: number,
): string[] {
  if (!input) {
    return [""];
  }

  const chunks: string[] = [];
  const buffer = Buffer.from(input, "utf8");
  for (let start = 0; start < buffer.length; ) {
    let end = Math.min(start + Math.max(4, maxBytes), buffer.length);
    while (end < buffer.length && (buffer[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    chunks.push(buffer.subarray(start, end).toString("utf8"));
    start = end;
  }

  return chunks;
}

/**
 * Apply structural redaction before enforcing the per-artifact byte
 * ceiling.
 */
function prepareRedactedBody(
  body: unknown,
  maxBytes = MAX_CAPTURED_BODY_BYTES,
): {
  value?: string;
  bytes?: number;
  truncated: boolean;
  originalBytes?: number;
} {
  const redacted = redactBody(body);
  if (redacted === undefined) {
    return { truncated: false };
  }

  return {
    ...truncateUtf8String(redacted, maxBytes),
    originalBytes: utf8ByteLength(redacted),
  };
}

/**
 * Write a private gzip artifact with a unique name and return its
 * redacted-body digest.
 */
async function writeBodyArtifact(
  logDir: string,
  entry: ProxyBodyCaptureEntry,
  redactedHeaders: Record<string, string> | undefined,
  redactedBody: string | undefined,
  bodyTruncated: boolean,
): Promise<StoredBodyArtifact> {
  if (redactedBody === undefined) {
    return {};
  }

  const dateStr = new Date(entry.timestamp).toISOString().split("T")[0];
  const bodyDir = join(
    logDir,
    "bodies",
    dateStr,
    sanitizePhase(entry.requestId),
  );
  await mkdir(bodyDir, { recursive: true, mode: 0o700 });
  await chmod(bodyDir, 0o700);

  const fileName =
    `${randomUUID()}-${sanitizePhase(entry.phase)}` +
    (entry.attempt !== undefined ? `-attempt-${entry.attempt}` : "") +
    `.json.gz`;
  const bodyPath = join(bodyDir, fileName);
  const payload = JSON.stringify({
    timestamp: entry.timestamp,
    requestId: entry.requestId,
    phase: entry.phase,
    model: entry.model,
    stream: entry.stream,
    account: entry.account,
    accountType: entry.accountType,
    attempt: entry.attempt,
    responseStatus: entry.responseStatus,
    durationMs: entry.durationMs,
    contentType: entry.contentType,
    headers: redactedHeaders,
    body: redactedBody,
    traceId: entry.traceId,
    spanId: entry.spanId,
    metadata: entry.metadata,
  });
  const compressed = await gzip(payload);
  await writeFile(bodyPath, compressed, {
    mode: 0o600,
    signal: AbortSignal.timeout(REQUEST_LOG_IO_TIMEOUT_MS),
  });

  return {
    bodyPath,
    bodySha256: sha256(redactedBody),
    redactedBodyBytes: utf8ByteLength(redactedBody),
    storedFileBytes: compressed.byteLength,
    redactedBody,
    bodyTruncated,
  };
}

/** Shared pure redaction for replay; serving paths invoke it in the worker. */
export function prepareProxyBodyForLogging(body: unknown) {
  return prepareRedactedBody(body);
}
/**
 * Expose the same header-redaction policy to replay and metadata
 * consumers.
 */
export function redactProxyHeadersForLogging(
  headers: Record<string, string> | undefined,
) {
  return redactHeaders(headers);
}

/**
 * Process a capture in the worker and retain redacted output when artifact
 * persistence fails.
 */
export async function processProxyBodyCapture(
  entry: ProxyBodyCaptureEntry,
  logDir: string | null,
): Promise<ProcessedProxyBodyCapture> {
  const headers = redactHeaders(entry.headers);
  const limit =
    logDir === null ? MAX_OTEL_CAPTURED_BODY_BYTES : MAX_CAPTURED_BODY_BYTES;
  const prepared = prepareRedactedBody(entry.body, limit);
  prepared.truncated ||= entry.sourceTruncated === true;
  if (logDir === null) {
    return {
      headers,
      stored: {
        redactedBody: prepared.value,
        redactedBodyBytes: prepared.bytes,
        bodyTruncated: prepared.truncated,
        bodyCaptureLimitBytes: limit,
        originalRedactedBodyBytes: prepared.originalBytes,
        bodySha256:
          prepared.value === undefined ? undefined : sha256(prepared.value),
      },
    };
  }
  let stored: StoredBodyArtifact;
  try {
    stored = await writeBodyArtifact(
      logDir,
      entry,
      headers,
      prepared.value,
      prepared.truncated,
    );
  } catch {
    stored = {
      redactedBody: prepared.value,
      redactedBodyBytes: prepared.bytes,
      bodyTruncated: prepared.truncated,
      bodyWriteFailed: true,
    };
  }
  return {
    headers,
    stored: {
      ...stored,
      bodyCaptureLimitBytes: limit,
      originalRedactedBodyBytes: prepared.originalBytes,
    },
  };
}
