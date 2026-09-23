import { createServer, type Socket } from "node:net";
import type {
  RollingProxyServer,
  RollingProxyServerOptions,
  RollingWorkerSupervisorSnapshot,
  RollingWorkerSupervisorOptions,
} from "../types/index.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import { RollingWorkerSupervisor } from "./rollingWorkerSupervisor.js";

const DEFAULT_RECOVERY_DELAY_MS = 250;
const DEFAULT_MAX_RECOVERY_DELAY_MS = 10_000;

/** Keep one public listener stable while serving workers start and rotate. */
export async function startRollingProxyServer(
  options: RollingProxyServerOptions,
): Promise<RollingProxyServer> {
  let desiredVersion = options.initialVersion;
  let closing = false;
  let listening = false;
  let recoveryFailures = 0;
  let recoveryTimer: NodeJS.Timeout | undefined;
  let requestedReplacementTimer: NodeJS.Timeout | undefined;
  let requestedReplacementSchedule = 0;
  let requestedReplacementPending = false;
  let requestedReplacementReason = "environment";
  let stalledGeneration: number | undefined;
  let stallReplacementFailures = 0;
  let nextStallReplacementAt = 0;
  let replacementQueueTail: Promise<void> | null = null;

  const recoveryDelayMs = Math.max(
    1,
    options.recoveryDelayMs ?? DEFAULT_RECOVERY_DELAY_MS,
  );
  const maxRecoveryDelayMs = Math.max(
    recoveryDelayMs,
    options.maxRecoveryDelayMs ?? DEFAULT_MAX_RECOVERY_DELAY_MS,
  );
  const stallReplacementDelayMs = Math.max(
    1,
    options.stallReplacementDelayMs ?? 60_000,
  );
  const maxStallReplacementDelayMs = Math.max(
    stallReplacementDelayMs,
    options.maxStallReplacementDelayMs ?? 15 * 60_000,
  );

  const queueReplacement = <T>(operation: () => Promise<T>): Promise<T> => {
    const predecessor = replacementQueueTail;
    const result = (predecessor ?? Promise.resolve()).then(operation);
    const completion = result.then(
      () => undefined,
      () => undefined,
    );
    replacementQueueTail = completion;
    void completion.finally(() => {
      if (replacementQueueTail !== completion) {
        return;
      }
      replacementQueueTail = null;
      if (requestedReplacementPending) {
        scheduleRequestedReplacement();
      }
    });
    return result;
  };

  const scheduleRecovery = (): void => {
    if (closing || !listening || recoveryTimer) {
      return;
    }
    const delay = Math.min(
      maxRecoveryDelayMs,
      recoveryDelayMs * 2 ** Math.min(recoveryFailures, 8),
    );
    options.log?.(
      `[proxy-supervisor] scheduling worker recovery version=${desiredVersion} delayMs=${delay}`,
    );
    recoveryTimer = setTimeout(() => {
      recoveryTimer = undefined;
      // An explicit replace() may have started (or completed) a generation
      // while this timer was pending. Re-validate before recovering so we never
      // launch a duplicate generation that conflicts with the requested worker.
      void queueReplacement(async () => {
        const snapshot = supervisor.snapshot();
        if (closing || snapshot.active || snapshot.candidate) {
          return;
        }
        await supervisor.replace(desiredVersion);
      }).then(
        () => {
          recoveryFailures = 0;
        },
        (error) => {
          recoveryFailures += 1;
          options.log?.(
            `[proxy-supervisor] worker recovery failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          scheduleRecovery();
        },
      );
    }, delay);
    recoveryTimer.unref?.();
  };

  const stateChanged = (snapshot: RollingWorkerSupervisorSnapshot): void => {
    if (
      requestedReplacementReason !== "environment" &&
      stalledGeneration !== undefined &&
      snapshot.active?.generation !== stalledGeneration
    ) {
      // A pressure retry belongs only to the generation that stalled. Once it
      // exits or is replaced, ordinary recovery owns the next generation.
      if (requestedReplacementTimer) {
        clearTimeout(requestedReplacementTimer);
        requestedReplacementTimer = undefined;
      }
      requestedReplacementSchedule += 1;
      requestedReplacementPending = false;
      stalledGeneration = undefined;
      stallReplacementFailures = 0;
      nextStallReplacementAt = 0;
    }
    try {
      options.onStateChange?.(snapshot);
    } catch (error) {
      options.log?.(
        `[proxy-supervisor] failed to publish server state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (listening && !closing && !snapshot.active && !snapshot.candidate) {
      scheduleRecovery();
    }
  };

  function scheduleRequestedReplacement(
    request?: Parameters<
      NonNullable<RollingWorkerSupervisorOptions["onReplacementRequested"]>
    >[0],
  ): void {
    if (closing) {
      return;
    }
    requestedReplacementPending = true;
    if (request) {
      requestedReplacementReason = request.reason;
      if (
        request.reason !== "environment" &&
        stalledGeneration !== request.generation
      ) {
        stalledGeneration = request.generation;
        stallReplacementFailures = 0;
        nextStallReplacementAt = 0;
      }
    }
    if (requestedReplacementTimer || replacementQueueTail) {
      return;
    }
    const schedule = ++requestedReplacementSchedule;
    requestedReplacementTimer = setTimeout(
      () => {
        requestedReplacementTimer = undefined;
        if (schedule !== requestedReplacementSchedule) {
          return;
        }
        if (closing || !supervisor.snapshot().active) {
          requestedReplacementPending = false;
          return;
        }
        requestedReplacementPending = false;
        const replacementVersion = desiredVersion;
        const replacementReason = requestedReplacementReason;
        const replacementGeneration = supervisor.snapshot().active?.generation;
        void queueReplacement(async () => {
          if (closing || !supervisor.snapshot().active) {
            return;
          }
          options.log?.(
            `[proxy-supervisor] preparing same-version worker replacement version=${replacementVersion} reason=${replacementReason}`,
          );
          await supervisor.replace(replacementVersion);
          stallReplacementFailures = 0;
          nextStallReplacementAt = 0;
          options.log?.(
            `[proxy-supervisor] same-version worker replacement complete version=${replacementVersion} reason=${replacementReason}`,
          );
        }).catch((error) => {
          options.log?.(
            `[proxy-supervisor] same-version worker replacement failed version=${replacementVersion} reason=${replacementReason}: ${error instanceof Error ? error.message : String(error)}`,
          );
          // A failed candidate does not invalidate the old generation's streams.
          // Retry pressure recovery with a growing, capped delay. New requests
          // cannot reset that delay, and an unrelated successful rotation ends it.
          if (
            replacementReason !== "environment" &&
            !closing &&
            supervisor.snapshot().active?.generation ===
              replacementGeneration &&
            schedule === requestedReplacementSchedule
          ) {
            stallReplacementFailures += 1;
            const delay = Math.min(
              maxStallReplacementDelayMs,
              stallReplacementDelayMs *
                2 ** Math.min(stallReplacementFailures - 1, 16),
            );
            nextStallReplacementAt = Date.now() + delay;
            options.log?.(
              `[proxy-supervisor] stall replacement retry deferred failures=${stallReplacementFailures} delayMs=${delay}`,
            );
            scheduleRequestedReplacement();
          }
        });
      },
      Math.max(50, nextStallReplacementAt - Date.now()),
    );
    requestedReplacementTimer.unref?.();
  }
  const supervisor = new RollingWorkerSupervisor({
    spawnWorker: options.spawnWorker,
    readyTimeoutMs: options.readyTimeoutMs,
    socketQueueLimit: options.socketQueueLimit,
    maxPendingTransfers: options.maxPendingTransfers,
    socketQueueTimeoutMs: options.socketQueueTimeoutMs,
    shutdownTimeoutMs: options.shutdownTimeoutMs,
    onStateChange: stateChanged,
    onEvent: options.onEvent,
    onReplacementRequested: scheduleRequestedReplacement,
    log: options.log,
  });
  const ownedSockets = new Set<Socket>();
  const listener = createServer({ pauseOnConnect: true }, (socket) => {
    ownedSockets.add(socket);
    socket.once("close", () => ownedSockets.delete(socket));
    // The parent keeps its descriptor until the worker commits the IPC
    // transfer. Consume client resets during that interval so they cannot
    // terminate the long-lived supervisor process.
    socket.once("error", () => socket.destroy());
    supervisor.acceptSocket(socket);
  });
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error): void => {
      listener.off("listening", onListening);
      reject(error);
    };
    const onListening = (): void => {
      listener.off("error", onError);
      resolve();
    };
    listener.once("error", onError);
    listener.once("listening", onListening);
    listener.listen(options.port, options.host);
  }).catch(async (error) => {
    await supervisor.close();
    throw error;
  });
  listening = true;
  try {
    await supervisor.start(desiredVersion);
  } catch (error) {
    recoveryFailures = 1;
    options.log?.(
      `[proxy-supervisor] initial worker failed; listener will remain available during recovery: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!supervisor.snapshot().active) {
    scheduleRecovery();
  }
  const address = listener.address();
  if (!address || typeof address === "string") {
    await new Promise<void>((resolve) => listener.close(() => resolve()));
    await supervisor.close().catch(() => undefined);
    throw ErrorFactory.proxyWorkerLifecycle(
      "rolling proxy listener did not expose a TCP address",
    );
  }

  return {
    address: { host: options.host, port: address.port },
    replace: async (expectedVersion) => {
      // Adopt the requested version as the recovery target up front (once it is
      // a valid version string) so the autonomous recovery loop converges on it
      // even if this explicit call collides with an in-flight recovery
      // replacement — otherwise recovery keeps re-targeting a stale version and
      // starves the caller (e.g. an update rollback) for the whole retry window.
      const isValidVersion = /^\d+\.\d+\.\d+$/.test(expectedVersion);
      if (isValidVersion) {
        desiredVersion = expectedVersion;
      }
      // Cancel any pending recovery so it cannot race this explicit
      // replacement and spawn a second, conflicting generation.
      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = undefined;
      }
      if (requestedReplacementTimer) {
        clearTimeout(requestedReplacementTimer);
        requestedReplacementTimer = undefined;
      }
      requestedReplacementSchedule += 1;
      requestedReplacementPending = false;
      try {
        const snapshot = await queueReplacement(() =>
          supervisor.replace(expectedVersion),
        );
        recoveryFailures = 0;
        stallReplacementFailures = 0;
        nextStallReplacementAt = 0;
        return snapshot;
      } catch (error) {
        // The explicit replacement failed (invalid version, closed, or a
        // conflicting replacement is already in progress). Since we cancelled
        // the pending recovery timer above, re-schedule recovery when nothing
        // is serving so a crashed worker is not left unreplaced.
        const snapshot = supervisor.snapshot();
        if (!snapshot.active && !snapshot.candidate) {
          scheduleRecovery();
        }
        throw error;
      }
    },
    snapshot: () => supervisor.snapshot(),
    close: async () => {
      if (closing) {
        return;
      }
      closing = true;
      listening = false;
      if (recoveryTimer) {
        clearTimeout(recoveryTimer);
        recoveryTimer = undefined;
      }
      if (requestedReplacementTimer) {
        clearTimeout(requestedReplacementTimer);
        requestedReplacementTimer = undefined;
      }
      requestedReplacementSchedule += 1;
      requestedReplacementPending = false;
      // Stop accepting immediately, then await the ownership we actually hold.
      // Node's net.Server can retain _usingWorkers=true with an empty worker
      // list after an IPC recipient exits. Its close callback then never fires,
      // even though the listener and every descriptor have closed. Avoid that
      // private bookkeeping path; the supervisor owns remote worker draining.
      listener.close();
      await supervisor.close();
      await Promise.all(
        [...ownedSockets].map(
          (socket) =>
            new Promise<void>((resolve) => {
              socket.once("close", resolve);
              socket.destroy();
            }),
        ),
      );
    },
  };
}
