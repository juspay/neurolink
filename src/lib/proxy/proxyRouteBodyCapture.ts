import type { ProxyBodyCaptureInput, ServerContext } from "../types/index.js";
import { isProxyBodyCaptureEnabled, logBodyCapture } from "./requestLogger.js";

const MAX_PREFIX_BYTES = 1024 * 1024;
const MAX_ACTIVE_PREFIX_BYTES = 16 * 1024 * 1024;
let activePrefixBytes = 0;

/** Capture serialized client output and explicitly labelled SDK observations.
 * This observer never reads a stream or creates a second consumer. */
export function createProxyRouteBodyCapture(
  ctx: ServerContext,
  model: string,
  stream: boolean,
  startedAt: number,
) {
  const log = (capture: ProxyBodyCaptureInput) => {
    void logBodyCapture({
      timestamp: new Date().toISOString(),
      requestId: ctx.requestId,
      model,
      stream,
      durationMs: Date.now() - startedAt,
      ...capture,
    });
  };
  return {
    log,
    request() {
      log({
        phase: "client_request",
        headers: ctx.headers,
        body: ctx.body,
        contentType: "application/json",
      });
    },
    json(body: unknown, responseStatus: number) {
      log({
        phase: "client_response",
        headers: { "content-type": "application/json" },
        body,
        contentType: "application/json",
        responseStatus,
      });
    },
    accumulator(phase: string, contentType: string, attempt?: number) {
      const enabled = isProxyBodyCaptureEnabled();
      const chunks: Uint8Array[] = [];
      let totalBytes = 0;
      let retainedBytes = 0;
      let truncated = false;
      let finished = false;
      const append = (value: Uint8Array) => {
        if (finished || !enabled) {
          return;
        }
        totalBytes += value.byteLength;
        const remaining = Math.min(
          MAX_PREFIX_BYTES - retainedBytes,
          MAX_ACTIVE_PREFIX_BYTES - activePrefixBytes,
        );
        if (!truncated && remaining > 0) {
          const prefix = Uint8Array.from(value.subarray(0, remaining));
          chunks.push(prefix);
          retainedBytes += prefix.byteLength;
          activePrefixBytes += prefix.byteLength;
          truncated = prefix.byteLength !== value.byteLength;
        } else {
          truncated ||= value.byteLength > 0;
        }
      };
      return {
        append,
        appendEvent(value: unknown) {
          if (finished || !enabled) {
            return;
          }
          try {
            append(
              new TextEncoder().encode(
                `data: ${JSON.stringify(value) ?? "null"}\n\n`,
              ),
            );
          } catch {
            // Diagnostic serialization cannot fail a provider request. Mark
            // unavailable bytes as an explicitly incomplete capture instead.
            truncated = true;
          }
        },
        finish(responseStatus: number) {
          if (finished) {
            return;
          }
          finished = true;
          if (!enabled) {
            return;
          }
          const decoder = new TextDecoder();
          const body =
            chunks
              .map((chunk) => decoder.decode(chunk, { stream: true }))
              .join("") + (truncated ? "" : decoder.decode());
          activePrefixBytes -= retainedBytes;
          chunks.length = 0;
          log({
            phase,
            headers: { "content-type": contentType },
            body,
            bodySize: totalBytes,
            sourceTruncated: truncated,
            contentType,
            responseStatus,
            attempt,
            ...(phase.startsWith("sdk_")
              ? {
                  metadata: {
                    representation: "neurolink_sdk_events",
                    wireCapture: false,
                  },
                }
              : {}),
          });
        },
      };
    },
  };
}
