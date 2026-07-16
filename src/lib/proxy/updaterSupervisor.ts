import type {
  UpdaterWorkerSupervisor,
  UpdaterWorkerSupervisorOptions,
} from "../types/index.js";

/** Keep the launchd updater worker alive while its owning proxy is running. */
export function startUpdaterWorkerSupervisor(
  options: UpdaterWorkerSupervisorOptions,
): UpdaterWorkerSupervisor {
  let stopped = false;
  let pid: number | undefined;

  /** Return the healthy worker PID or replace an unavailable worker. */
  const checkNow = (): number | undefined => {
    if (stopped) {
      return pid;
    }
    if (pid !== undefined && options.isProcessRunning(pid)) {
      return pid;
    }

    const previousPid = pid;
    try {
      pid = options.spawnWorker();
    } catch (error) {
      pid = undefined;
      options.log?.(
        `[proxy] updater worker spawn failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    options.onPidChange?.(pid);
    if (pid !== undefined) {
      options.log?.(
        previousPid === undefined
          ? `[proxy] updater worker started pid=${pid}`
          : `[proxy] updater worker restarted oldPid=${previousPid} newPid=${pid}`,
      );
    } else {
      options.log?.("[proxy] updater worker unavailable; retrying later");
    }
    return pid;
  };

  checkNow();
  const interval = setInterval(checkNow, options.intervalMs ?? 30_000);
  interval.unref?.();

  return {
    currentPid: () => pid,
    checkNow,
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      clearInterval(interval);
      const activePid = pid;
      if (activePid !== undefined && options.isProcessRunning(activePid)) {
        try {
          options.stopWorker(activePid);
        } catch (error) {
          options.log?.(
            `[proxy] updater worker stop failed pid=${activePid}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      pid = undefined;
      options.onPidChange?.(undefined);
    },
  };
}
