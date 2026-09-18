/** One signal owner per CLI process. Proxy lifecycles own their drain and exit;
 * ordinary commands only need a bounded, best-effort telemetry flush. */
let owner: ((signal: NodeJS.Signals) => Promise<void>) | undefined;
let cleanupTask: (() => Promise<void>) | undefined;
let cleanupPromise: Promise<void> | undefined;
let shutdownPromise: Promise<void> | undefined;
let installed = false;
let cleanupTimeoutMs = 5_000;

/** Install ordinary-command cleanup and its maximum flush duration. */
export function initializeCliLifecycle(
  cleanup: () => Promise<void>,
  timeoutMs = 5_000,
): void {
  cleanupTask = cleanup;
  cleanupTimeoutMs = timeoutMs;
  installSignals();
}

/** Delegate signals to a long-lived command that owns draining and exit. */
export function registerCliShutdownOwner(
  handler: (signal: NodeJS.Signals) => Promise<void>,
): void {
  owner = handler;
  installSignals();
}

/** Flush ordinary commands once; an active shutdown owner manages its own cleanup. */
export function cleanupCliLifecycle(): Promise<void> {
  if (owner) {
    return Promise.resolve();
  }
  cleanupPromise ??= runBoundedCliCleanup(
    () => cleanupTask?.() ?? Promise.resolve(),
    cleanupTimeoutMs,
    () => {
      // A stalled exporter may retain handles after Promise.race settles.
      // A newly registered owner still retains control of draining and exit.
      if (!owner) {
        process.exit(process.exitCode ?? 0);
      }
    },
  );
  return cleanupPromise;
}

/** Bound best-effort cleanup without allowing rejection to escape a signal handler. */
export async function runBoundedCliCleanup(
  cleanup: () => Promise<unknown>,
  timeoutMs = 5_000,
  onTimeout?: () => void,
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  let timedOut = false;
  try {
    await Promise.race([
      Promise.resolve().then(cleanup),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error("telemetry flush deadline exceeded"));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    process.stderr.write(
      `[cli] cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
  } finally {
    clearTimeout(timer);
  }
  if (timedOut) {
    onTimeout?.();
  }
}

/** Install one process-wide signal dispatcher and reuse the first shutdown promise. */
function installSignals(): void {
  if (installed) {
    return;
  }
  installed = true;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => {
      shutdownPromise ??= Promise.resolve()
        .then(async () => {
          if (!owner) {
            await cleanupCliLifecycle();
          }
          // Startup may register the proxy owner while the flush is pending.
          if (owner) {
            await owner(signal);
          } else {
            process.exit(process.exitCode ?? 0);
          }
        })
        .catch((error) => {
          process.stderr.write(
            `[cli] shutdown failed: ${error instanceof Error ? error.message : String(error)}\n`,
          );
          process.exit(1);
        });
    });
  }
  process.once("beforeExit", () => {
    void cleanupCliLifecycle();
  });
}
