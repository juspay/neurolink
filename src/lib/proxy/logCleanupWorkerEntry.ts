import { parentPort, workerData } from "node:worker_threads";
import type { ProxyLogCleanupWorkerData } from "../types/index.js";
import { cleanupLogsAt } from "./requestLogger.js";

const data = workerData as ProxyLogCleanupWorkerData;

try {
  cleanupLogsAt(data.logsDir, data.maxAgeDays, data.maxSizeMb);
  parentPort?.postMessage({ ok: true });
} catch (error) {
  parentPort?.postMessage({
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
}
