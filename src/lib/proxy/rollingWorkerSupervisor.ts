import type {
  RollingCandidateWorker,
  RollingManagedWorker,
  RollingQueuedSocket,
  RollingWorkerFailureDetails,
  RollingWorkerHandle,
  RollingWorkerSupervisorOptions,
  RollingWorkerSupervisorSnapshot,
  TransferableProxySocket,
} from "../types/index.js";
import { ErrorFactory } from "../utils/errorHandling.js";

const DEFAULT_READY_TIMEOUT_MS = 30_000;
const DEFAULT_SOCKET_QUEUE_LIMIT = 1_024;
const DEFAULT_SOCKET_QUEUE_TIMEOUT_MS = 30_000;
const DEFAULT_SHUTDOWN_TIMEOUT_MS = 30_000;

/**
 * Owns worker generations while the caller owns the public listening socket.
 * Sockets are transferred once to the active worker, so response bytes never
 * traverse a supervisor-side proxy hop.
 */
export class RollingWorkerSupervisor {
  private readonly options: Required<
    Pick<
      RollingWorkerSupervisorOptions,
      | "readyTimeoutMs"
      | "socketQueueLimit"
      | "socketQueueTimeoutMs"
      | "shutdownTimeoutMs"
    >
  > &
    RollingWorkerSupervisorOptions;
  private generation = 0;
  private active: RollingManagedWorker | null = null;
  private candidate: RollingCandidateWorker | null = null;
  private readonly draining = new Map<number, RollingManagedWorker>();
  private readonly queuedSockets: RollingQueuedSocket[] = [];
  private replacement: Promise<RollingWorkerSupervisorSnapshot> | null = null;
  private rejectedSockets = 0;
  private failedTransfers = 0;
  private lastFailure: RollingWorkerSupervisorSnapshot["lastFailure"] = null;
  private closed = false;
  private shutdownPromise: Promise<void> | null = null;
  private readonly shutdownWaiters = new Set<() => void>();

  constructor(options: RollingWorkerSupervisorOptions) {
    this.options = {
      ...options,
      readyTimeoutMs: options.readyTimeoutMs ?? DEFAULT_READY_TIMEOUT_MS,
      socketQueueLimit: options.socketQueueLimit ?? DEFAULT_SOCKET_QUEUE_LIMIT,
      socketQueueTimeoutMs:
        options.socketQueueTimeoutMs ?? DEFAULT_SOCKET_QUEUE_TIMEOUT_MS,
      shutdownTimeoutMs:
        options.shutdownTimeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    };
  }

  snapshot(): RollingWorkerSupervisorSnapshot {
    return {
      generation: this.generation,
      active: this.active
        ? {
            pid: this.active.handle.pid,
            version: this.active.version,
            generation: this.active.generation,
          }
        : null,
      candidate: this.candidate
        ? {
            pid: this.candidate.handle.pid,
            expectedVersion: this.candidate.expectedVersion,
            generation: this.candidate.generation,
          }
        : null,
      draining: [...this.draining.values()].map((worker) => ({
        pid: worker.handle.pid,
        version: worker.version,
        generation: worker.generation,
      })),
      queuedSockets: this.queuedSockets.length,
      rejectedSockets: this.rejectedSockets,
      failedTransfers: this.failedTransfers,
      lastFailure: this.lastFailure,
    };
  }

  start(expectedVersion: string): Promise<RollingWorkerSupervisorSnapshot> {
    if (this.active) {
      return this.active.version === expectedVersion
        ? Promise.resolve(this.snapshot())
        : this.replace(expectedVersion);
    }
    return this.replace(expectedVersion);
  }

  replace(expectedVersion: string): Promise<RollingWorkerSupervisorSnapshot> {
    if (this.closed) {
      return Promise.reject(
        ErrorFactory.proxyWorkerLifecycle(
          "rolling worker supervisor is closed",
        ),
      );
    }
    if (!/^\d+\.\d+\.\d+$/.test(expectedVersion)) {
      return Promise.reject(
        ErrorFactory.proxyWorkerLifecycle(
          `invalid expected worker version: ${expectedVersion}`,
          { expectedVersion },
        ),
      );
    }
    if (this.replacement) {
      return this.candidate?.expectedVersion === expectedVersion
        ? this.replacement
        : Promise.reject(
            ErrorFactory.proxyWorkerLifecycle(
              `worker replacement for v${this.candidate?.expectedVersion ?? "unknown"} is already in progress`,
              { requestedVersion: expectedVersion },
            ),
          );
    }

    this.replacement = this.spawnCandidate(expectedVersion).finally(() => {
      this.replacement = null;
    });
    return this.replacement;
  }

  acceptSocket(socket: TransferableProxySocket): void {
    socket.pause();
    if (this.closed) {
      this.rejectSocket(socket);
      return;
    }
    if (this.active) {
      this.transferSocket(this.active, socket);
      return;
    }
    this.queueSocket(socket);
  }

  private queueSocket(socket: TransferableProxySocket): void {
    if (this.queuedSockets.length >= this.options.socketQueueLimit) {
      this.rejectSocket(socket);
      return;
    }

    const queued: RollingQueuedSocket = {
      socket,
      timeout: setTimeout(() => {
        const index = this.queuedSockets.indexOf(queued);
        if (index >= 0) {
          this.queuedSockets.splice(index, 1);
          this.rejectSocket(socket);
        }
      }, this.options.socketQueueTimeoutMs),
    };
    queued.timeout.unref?.();
    this.queuedSockets.push(queued);
    this.publishState();
  }

  close(): Promise<void> {
    if (this.shutdownPromise) {
      return this.shutdownPromise;
    }
    this.closed = true;
    this.shutdownPromise = this.closeWorkers();
    return this.shutdownPromise;
  }

  private async closeWorkers(): Promise<void> {
    for (const queued of this.queuedSockets.splice(0)) {
      clearTimeout(queued.timeout);
      this.rejectSocket(queued.socket);
    }
    if (this.candidate) {
      this.candidate.settle(
        new Error("rolling worker supervisor closed during replacement"),
      );
    }
    if (this.active) {
      this.requestWorkerShutdown(this.active);
    }
    for (const worker of this.draining.values()) {
      this.requestWorkerShutdown(worker);
    }
    this.publishState();

    if (!this.active && this.draining.size === 0) {
      return;
    }
    await new Promise<void>((resolve) => {
      const finish = (): void => {
        clearTimeout(timeout);
        this.shutdownWaiters.delete(finish);
        resolve();
      };
      const timeout = setTimeout(() => {
        this.forceTerminateWorkers();
        finish();
      }, this.options.shutdownTimeoutMs);
      timeout.unref?.();
      this.shutdownWaiters.add(finish);
    });
  }

  private requestWorkerShutdown(worker: RollingManagedWorker): void {
    try {
      worker.handle.sendControl({
        type: "proxy-worker:shutdown",
        generation: worker.generation,
      });
    } catch {
      worker.handle.terminate("SIGTERM");
    }
  }

  private forceTerminateWorkers(): void {
    if (this.active) {
      this.active.handle.terminate("SIGTERM");
      this.active.dispose();
      this.active = null;
    }
    for (const worker of this.draining.values()) {
      worker.handle.terminate("SIGTERM");
      worker.dispose();
    }
    this.draining.clear();
    this.publishState();
  }

  private notifyShutdownWaiters(): void {
    if (!this.closed || this.active || this.draining.size > 0) {
      return;
    }
    for (const finish of [...this.shutdownWaiters]) {
      finish();
    }
  }

  private spawnCandidate(
    expectedVersion: string,
  ): Promise<RollingWorkerSupervisorSnapshot> {
    const generation = ++this.generation;
    let handle: RollingWorkerHandle;
    try {
      handle = this.options.spawnWorker(generation, expectedVersion);
    } catch (error) {
      this.recordFailure(
        generation,
        expectedVersion,
        "startup",
        error instanceof Error ? error.message : String(error),
      );
      this.publishState();
      return Promise.reject(
        error instanceof Error ? error : new Error(String(error)),
      );
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (
        error?: Error,
        phase: "startup" | "activation" = "startup",
        details?: RollingWorkerFailureDetails,
      ): void => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(readyTimeout);
        if (error) {
          if (!this.closed) {
            this.recordFailure(
              generation,
              expectedVersion,
              phase,
              error.message,
              details,
            );
          }
          if (this.candidate?.generation === generation) {
            this.candidate = null;
          }
          handle.terminate("SIGTERM");
          dispose();
          this.publishState();
          reject(error);
          return;
        }
        resolve(this.snapshot());
      };
      const offMessage = handle.onMessage((message) => {
        if (message.generation !== generation || message.pid !== handle.pid) {
          return;
        }
        if (message.type === "proxy-worker:fatal") {
          const error = new Error(
            `worker ${handle.pid} failed: ${message.message}`,
          );
          if (this.candidate?.generation === generation) {
            finish(error);
          } else if (this.active?.generation === generation) {
            this.active.dispose();
            this.active = null;
            handle.terminate("SIGTERM");
            this.recordFailure(
              generation,
              expectedVersion,
              "runtime",
              message.message,
            );
            this.options.log?.(
              `[proxy-supervisor] active worker reported fatal generation=${generation} pid=${handle.pid}: ${message.message}`,
            );
            this.publishState();
            this.notifyShutdownWaiters();
          }
          return;
        }
        if (message.type === "proxy-worker:replacement-requested") {
          if (this.active?.generation === generation) {
            this.options.onReplacementRequested?.({
              generation,
              pid: handle.pid,
              reason: message.reason,
            });
          }
          return;
        }
        if (message.type === "proxy-worker:ready") {
          if (message.version !== expectedVersion) {
            finish(
              new Error(
                `worker ${handle.pid} reported v${message.version}; expected v${expectedVersion}`,
              ),
            );
            return;
          }
          const candidate = this.candidate;
          if (!candidate) {
            return;
          }
          if (!candidate.activationRequested) {
            try {
              handle.sendControl({
                type: "proxy-worker:activate",
                generation,
              });
              candidate.activationRequested = true;
            } catch (error) {
              finish(
                error instanceof Error ? error : new Error(String(error)),
                "activation",
              );
            }
          }
          return;
        }
        if (message.type !== "proxy-worker:activated") {
          return;
        }
        if (!this.candidate?.activationRequested) {
          finish(
            new Error(
              `worker ${handle.pid} acknowledged activation before readiness`,
            ),
            "activation",
          );
          return;
        }

        const previous = this.active;
        const activated: RollingManagedWorker = {
          handle,
          generation,
          version: expectedVersion,
          dispose,
          pendingTransfers: 0,
          drainRequested: false,
        };
        this.active = activated;
        this.candidate = null;
        this.flushQueuedSockets();
        if (previous) {
          this.draining.set(previous.generation, previous);
          // A worker can still own socket transfers accepted before this
          // activation. Draining it before their IPC commits makes those
          // clients fail even though the replacement is healthy.
          previous.drainRequested = true;
          this.maybeDrainWorker(previous);
        }
        this.options.log?.(
          `[proxy-supervisor] activated generation=${generation} pid=${handle.pid} version=${expectedVersion}`,
        );
        this.publishState();
        finish();
      });
      const offExit = handle.onExit((code, signal) => {
        if (this.candidate?.generation === generation) {
          finish(
            new Error(
              `worker ${handle.pid} exited before readiness (code=${code ?? "none"}, signal=${signal ?? "none"})`,
            ),
            "startup",
            {
              workerPid: handle.pid,
              workerExitCode: code,
              workerExitSignal: signal,
            },
          );
          return;
        }
        if (this.active?.generation === generation) {
          this.active.dispose();
          this.active = null;
          if (!this.closed) {
            this.recordFailure(
              generation,
              expectedVersion,
              "runtime",
              `worker exited (code=${code ?? "none"}, signal=${signal ?? "none"})`,
              {
                workerPid: handle.pid,
                workerExitCode: code,
                workerExitSignal: signal,
              },
            );
          }
          this.options.log?.(
            `[proxy-supervisor] active worker exited generation=${generation} pid=${handle.pid} code=${code ?? "none"} signal=${signal ?? "none"}`,
          );
        }
        const drained = this.draining.get(generation);
        if (drained) {
          drained.dispose();
          this.draining.delete(generation);
        }
        this.publishState();
        this.notifyShutdownWaiters();
      });
      const dispose = (): void => {
        offMessage();
        offExit();
      };
      const readyTimeout = setTimeout(() => {
        finish(
          new Error(
            `worker ${handle.pid} did not become ready within ${this.options.readyTimeoutMs}ms`,
          ),
        );
      }, this.options.readyTimeoutMs);
      readyTimeout.unref?.();

      this.candidate = {
        handle,
        generation,
        version: expectedVersion,
        pendingTransfers: 0,
        drainRequested: false,
        expectedVersion,
        activationRequested: false,
        dispose,
        settle: finish,
      };
      this.publishState();
    });
  }

  private flushQueuedSockets(): void {
    // Capture the active worker once: a synchronous sendSocket failure inside
    // transferSocket can clear this.active mid-loop, and re-reading it would
    // pass null into transferSocket and strand the queued socket.
    const worker = this.active;
    if (!worker) {
      return;
    }
    for (const queued of this.queuedSockets.splice(0)) {
      clearTimeout(queued.timeout);
      this.transferSocket(worker, queued.socket);
    }
  }

  private transferSocket(
    worker: RollingManagedWorker,
    socket: TransferableProxySocket,
  ): void {
    worker.pendingTransfers += 1;
    let settled = false;
    const complete = (error?: Error | null): void => {
      if (settled) {
        return;
      }
      settled = true;
      worker.pendingTransfers = Math.max(0, worker.pendingTransfers - 1);
      if (error) {
        this.handleTransferFailure(worker, socket, error);
      }
      this.maybeDrainWorker(worker);
    };
    try {
      worker.handle.sendSocket(worker.generation, socket, complete);
    } catch (error) {
      complete(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private maybeDrainWorker(worker: RollingManagedWorker): void {
    if (
      !worker.drainRequested ||
      worker.pendingTransfers > 0 ||
      !this.draining.has(worker.generation)
    ) {
      return;
    }
    worker.drainRequested = false;
    try {
      worker.handle.sendControl({
        type: "proxy-worker:drain",
        generation: worker.generation,
      });
    } catch {
      worker.handle.terminate("SIGTERM");
    }
  }

  private handleTransferFailure(
    worker: RollingManagedWorker,
    socket: TransferableProxySocket,
    error: unknown,
  ): void {
    this.failedTransfers += 1;
    const detail = this.describeTransferError(error);
    const lifecycle = this.extractLifecycleFailureDetails(
      error,
      worker.handle.pid,
    );
    this.recordFailure(
      worker.generation,
      worker.version,
      "transfer",
      `worker ${worker.handle.pid} failed to accept a transferred socket: ${detail}`,
      {
        ...lifecycle.details,
        // If the error already records an exit, the supervisor did not cause
        // that exit. Otherwise this captures the deliberate cleanup following
        // the failed transfer, not a claimed root cause for the failure.
        supervisorAction: lifecycle.observedExit
          ? "none"
          : "sigkill_after_transfer_failure",
      },
    );
    this.options.log?.(
      `[proxy-supervisor] socket transfer failed generation=${worker.generation} pid=${worker.handle.pid}: ${detail}`,
    );
    if (this.active?.generation === worker.generation && !this.closed) {
      this.active = null;
      this.draining.set(worker.generation, worker);
      // The child may own a duplicate of an incompletely transferred socket.
      // SIGKILL closes its descriptor without worker-side shutdown(2), after
      // which the parent rejects its copy rather than attempting unsafe replay.
      worker.handle.terminate("SIGKILL");
      this.publishState();
    }
    this.rejectSocket(socket);
  }

  private rejectSocket(socket: TransferableProxySocket): void {
    this.rejectedSockets += 1;
    socket.destroy();
    this.publishState();
  }

  private describeTransferError(error: unknown): string {
    if (!(error instanceof Error)) {
      return String(error ?? "unknown transfer failure");
    }
    const code = (error as NodeJS.ErrnoException).code;
    return code ? `${code}: ${error.message}` : error.message;
  }

  private extractLifecycleFailureDetails(
    error: unknown,
    fallbackPid: number,
  ): { details: RollingWorkerFailureDetails; observedExit: boolean } {
    const context =
      error &&
      typeof error === "object" &&
      "context" in error &&
      (error as { context?: unknown }).context &&
      typeof (error as { context?: unknown }).context === "object"
        ? ((error as { context: Record<string, unknown> }).context ?? {})
        : {};
    const workerPid =
      typeof context.workerPid === "number" ? context.workerPid : fallbackPid;
    const hasExitCode =
      typeof context.exitCode === "number" || context.exitCode === null;
    const hasExitSignal =
      typeof context.signal === "string" || context.signal === null;
    return {
      details: {
        workerPid,
        ...(hasExitCode
          ? { workerExitCode: context.exitCode as number | null }
          : {}),
        ...(hasExitSignal
          ? { workerExitSignal: context.signal as string | null }
          : {}),
      },
      observedExit: hasExitCode || hasExitSignal,
    };
  }

  private recordFailure(
    generation: number,
    version: string,
    phase: NonNullable<RollingWorkerSupervisorSnapshot["lastFailure"]>["phase"],
    message: string,
    details: RollingWorkerFailureDetails = {},
  ): void {
    this.lastFailure = {
      at: new Date().toISOString(),
      generation,
      version,
      phase,
      message: message.slice(0, 1_000),
      ...details,
    };
  }

  private publishState(): void {
    try {
      this.options.onStateChange?.(this.snapshot());
    } catch (error) {
      this.options.log?.(
        `[proxy-supervisor] failed to persist supervisor state: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
