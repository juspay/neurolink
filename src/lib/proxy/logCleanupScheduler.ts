import { Worker } from "node:worker_threads";
import type { ProxyLogCleanupScheduler } from "../types/index.js";
import { withTimeout } from "../utils/async/withTimeout.js";
import { logger } from "../utils/logger.js";

const DEFAULT_INITIAL_DELAY_MS = 30_000;
const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const WORKER_TERMINATION_TIMEOUT_MS = 5_000;

/**
 * Runs retention in a worker so large log trees cannot delay readiness or
 * block active streams. Concurrent runs are coalesced into the active scan.
 */
export function startProxyLogCleanupScheduler(params: {
  logsDir: string;
  maxAgeDays?: number;
  maxSizeMb?: number;
  initialDelayMs?: number;
  intervalMs?: number;
  /** @internal Test-only worker entry override. */
  workerUrl?: URL;
}): ProxyLogCleanupScheduler {
  const maxAgeDays = params.maxAgeDays ?? 7;
  const maxSizeMb = params.maxSizeMb ?? 500;
  let activeWorker: Worker | undefined;
  let stopped = false;

  const trigger = (): boolean => {
    if (stopped || activeWorker) {
      return false;
    }

    let worker: Worker;
    try {
      worker = new Worker(
        params.workerUrl ??
          new URL("./logCleanupWorkerEntry.js", import.meta.url),
        {
          execArgv: process.execArgv.filter(
            (argument) => !argument.startsWith("--input-type"),
          ),
          workerData: {
            logsDir: params.logsDir,
            maxAgeDays,
            maxSizeMb,
          },
        },
      );
    } catch (error) {
      logger.debug(
        `[proxy] could not start background log cleanup: ${error instanceof Error ? error.message : String(error)}`,
      );
      return false;
    }
    activeWorker = worker;
    worker.unref();
    worker.once("error", (error) => {
      logger.debug(
        `[proxy] background log cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
    worker.once("exit", (code) => {
      if (activeWorker === worker) {
        activeWorker = undefined;
      }
      if (code !== 0 && !stopped) {
        logger.debug(`[proxy] background log cleanup exited with code ${code}`);
      }
    });
    return true;
  };

  const initialTimer = setTimeout(
    trigger,
    params.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS,
  );
  initialTimer.unref();
  const interval = setInterval(
    trigger,
    params.intervalMs ?? DEFAULT_INTERVAL_MS,
  );
  interval.unref();

  return {
    trigger,
    stop: async () => {
      stopped = true;
      clearTimeout(initialTimer);
      clearInterval(interval);
      const worker = activeWorker;
      activeWorker = undefined;
      if (worker) {
        try {
          await withTimeout(
            worker.terminate(),
            WORKER_TERMINATION_TIMEOUT_MS,
            "Timed out terminating the proxy log cleanup worker",
          );
        } catch (error) {
          logger.debug(
            `[proxy] background log cleanup termination failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    },
  };
}
