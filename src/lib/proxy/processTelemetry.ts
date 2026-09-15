import { fstatSync } from "node:fs";
import type { ProxyProcessTelemetrySnapshot } from "../types/index.js";
import { getProxyOtelLogSnapshot, isProxyOtelOnly } from "./otelLogSink.js";
import { getProxyLifecycleLoggerSnapshot } from "./proxyLifecycle.js";

/** Inspect this process, not the launcher configuration intended for its successor. */
export function getProxyProcessTelemetry(): ProxyProcessTelemetrySnapshot {
  const descriptor = (
    fd: number,
  ): ProxyProcessTelemetrySnapshot["stdio"]["stdout"] => {
    try {
      return fstatSync(fd).isFile() ? "file" : "non_file";
    } catch {
      return "unavailable";
    }
  };
  const logs = getProxyOtelLogSnapshot();
  return {
    pid: process.pid,
    checkedAt: new Date().toISOString(),
    configuredSink: isProxyOtelOnly() ? "otel" : "file",
    lifecycleSink: getProxyLifecycleLoggerSnapshot().sink ?? "unavailable",
    otelInitialized: logs.initialized,
    stdio: { stdout: descriptor(1), stderr: descriptor(2) },
    exportDropped: logs.queues.reduce((n, q) => n + q.dropped, 0),
    exportUnconfirmed: logs.queues.reduce((n, q) => n + q.exportUnconfirmed, 0),
  };
}
