/** Backend query adapter for OTLP telemetry. OTLP itself has no history/query API. */
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import yaml from "js-yaml";

/** Discover the existing native collector destination without exposing its credentials. */
export async function resolveProxyTelemetryBackend(env = process.env) {
  /** @type {import("../../src/lib/types/index.js").ProxyTelemetryNativeConfig | undefined} */
  let native;
  if (!env.NEUROLINK_OPENOBSERVE_URL) {
    try {
      native =
        /** @type {import("../../src/lib/types/index.js").ProxyTelemetryNativeConfig} */ (
          yaml.load(
            await readFile(
              env.NEUROLINK_OTEL_COLLECTOR_CONFIG ??
                join(
                  homedir(),
                  ".neurolink",
                  "telemetry-native",
                  "config",
                  "collector.yaml",
                ),
              "utf8",
            ),
          )
        );
    } catch (error) {
      if (
        !(error instanceof Error && "code" in error && error.code === "ENOENT")
      ) {
        throw new Error(
          "Could not read the configured telemetry collector destination",
          { cause: error },
        );
      }
    }
  }
  const exporter = native?.exporters?.["otlphttp/openobserve"];
  const destination = exporter?.endpoint
    ? new URL(exporter.endpoint)
    : undefined;
  const nativeOrg = destination?.pathname.match(
    /^\/api\/([a-zA-Z0-9_-]+)\/?$/,
  )?.[1];
  const authorization =
    env.NEUROLINK_OPENOBSERVE_BASIC_AUTH ??
    (env.NEUROLINK_OPENOBSERVE_USER && env.NEUROLINK_OPENOBSERVE_PASSWORD
      ? `Basic ${Buffer.from(`${env.NEUROLINK_OPENOBSERVE_USER}:${env.NEUROLINK_OPENOBSERVE_PASSWORD}`).toString("base64")}`
      : (exporter?.headers?.Authorization ?? exporter?.headers?.authorization));
  return {
    baseUrl:
      env.NEUROLINK_OPENOBSERVE_URL ??
      destination?.origin ??
      "http://127.0.0.1:5080",
    organization: env.NEUROLINK_OPENOBSERVE_ORG ?? nativeOrg ?? "default",
    stream:
      env.NEUROLINK_PROXY_STREAM_HEADER ??
      exporter?.headers?.["stream-name"] ??
      "neurolink_proxy",
    authorization,
    collectorMetricsUrl:
      env.NEUROLINK_OTEL_COLLECTOR_METRICS_URL ??
      (native ? "http://127.0.0.1:14388/metrics" : undefined),
  };
}

/** Validate before issuing any diagnostics request.
 * @param {import("../../src/lib/types/index.js").ProxyTelemetryBackend} backend
 */
export function validateProxyTelemetryBackend(backend) {
  if (
    !/^[a-zA-Z0-9_-]+$/.test(backend.organization) ||
    !/^[a-zA-Z0-9_]+$/.test(backend.stream)
  ) {
    throw new Error("Invalid telemetry organization or stream");
  }
  const endpoint = new URL(backend.baseUrl);
  if (
    endpoint.username ||
    endpoint.password ||
    !["https:", "http:"].includes(endpoint.protocol)
  ) {
    throw new Error("Invalid telemetry endpoint");
  }
  if (
    backend.authorization &&
    endpoint.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname)
  ) {
    throw new Error(
      "Credentialed telemetry queries require HTTPS outside loopback",
    );
  }
  if (backend.collectorMetricsUrl) {
    const url = new URL(backend.collectorMetricsUrl);
    if (
      url.username ||
      url.password ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !["http:", "https:"].includes(url.protocol)
    ) {
      throw new Error("Collector diagnostics must use loopback HTTP(S)");
    }
  }
}

/** A bounded, complete search; no backend response body or authorization enters errors.
 * @param {import("../../src/lib/types/index.js").ProxyTelemetryBackend} backend
 * @param {import("../../src/lib/types/index.js").ProxyTelemetryQueryOptions} options
 * @param {typeof fetch} fetchImpl
 */
export async function queryProxyTelemetry(
  backend,
  { sql, signal = "logs", startTime, endTime, size = 200, offset = 0 },
  fetchImpl = fetch,
) {
  validateProxyTelemetryBackend(backend);
  if (
    !/^[a-zA-Z0-9_-]+$/.test(backend.organization) ||
    !/^[a-zA-Z0-9_]+$/.test(backend.stream) ||
    !["logs", "traces", "metrics"].includes(signal) ||
    !Number.isSafeInteger(startTime) ||
    !Number.isSafeInteger(endTime) ||
    startTime >= endTime ||
    !Number.isSafeInteger(size) ||
    size < 1 ||
    size > 1000 ||
    !Number.isSafeInteger(offset) ||
    offset < 0
  ) {
    throw new Error("Invalid bounded telemetry query");
  }
  const endpoint = new URL(
    `/api/${backend.organization}/_search?type=${signal}`,
    backend.baseUrl,
  );
  if (
    endpoint.username ||
    endpoint.password ||
    !["https:", "http:"].includes(endpoint.protocol)
  ) {
    throw new Error("Invalid telemetry endpoint");
  }
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(
    endpoint.hostname,
  );
  if (backend.authorization && endpoint.protocol !== "https:" && !loopback) {
    throw new Error(
      "Credentialed telemetry queries require HTTPS outside loopback",
    );
  }
  const started = globalThis.performance.now();
  const response = await fetchImpl(endpoint, {
    method: "POST",
    redirect: "error",
    signal: globalThis.AbortSignal.timeout(15_000),
    headers: {
      "Content-Type": "application/json",
      ...(backend.authorization
        ? { Authorization: backend.authorization }
        : {}),
    },
    body: JSON.stringify({
      query: {
        sql,
        start_time: startTime,
        end_time: endTime - 1,
        size,
        from: offset,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`Telemetry query failed: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (
    data.is_partial === true ||
    (Array.isArray(data.function_error)
      ? data.function_error.length
      : data.function_error) ||
    !Array.isArray(data.hits)
  ) {
    throw new Error("Telemetry query returned incomplete data");
  }
  return {
    rows: /** @type {Array<Record<string, unknown>>} */ (data.hits),
    query: {
      sql,
      signal,
      startTime,
      endTimeExclusive: endTime,
      size,
      offset,
      rows: data.hits.length,
      complete: true,
      durationMs: Math.round(globalThis.performance.now() - started),
    },
  };
}
