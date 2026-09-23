import { spawn } from "node:child_process";
import type { Socket } from "node:net";
import type {
  ProxyWorkerControlMessage,
  ProxyWorkerStatusMessage,
  RollingWorkerHandle,
  SpawnProxySocketWorkerOptions,
  TransferableProxySocket,
} from "../types/index.js";
import {
  handleProxyTokenBudgetMessage,
  releaseProxyTokenBudgetOwner,
} from "./proxyTokenBudget.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import {
  isProxyWorkerStatusMessage,
  PROXY_SOCKET_WORKER_ENV,
  PROXY_SOCKET_OFFER_TIMEOUT,
  PROXY_SOCKET_COMMIT_TIMEOUT,
} from "./rollingWorkerProtocol.js";

/**
 * Spawn a generation-specific IPC worker with separate offer and commit
 * ownership deadlines.
 */
export function spawnProxySocketWorker(
  options: SpawnProxySocketWorkerOptions,
): RollingWorkerHandle {
  const socketAckTimeoutMs = Math.max(1, options.socketAckTimeoutMs ?? 30_000);
  let nextSocketId = 0;
  let controlBeforeHandle = false;
  let workerCommitAcknowledgement = false;
  const pendingSockets = new Map<
    string,
    {
      socket: TransferableProxySocket;
      callback: (error?: Error | null) => void;
      timeout: NodeJS.Timeout;
      accepted: boolean;
      deadlineAt: number;
      descriptorSent: boolean;
    }
  >();
  const statusListeners = new Set<
    Parameters<RollingWorkerHandle["onMessage"]>[0]
  >();
  const pendingStatusMessages: ProxyWorkerStatusMessage[] = [];
  let spawnError: Error | undefined;
  let budgetResponseFailure: Error | undefined;
  let budgetTerminationTimeout: NodeJS.Timeout | undefined;
  const child = (options.spawn ?? spawn)(options.command, options.args, {
    env: {
      ...process.env,
      ...options.env,
      [PROXY_SOCKET_WORKER_ENV]: "1",
      NEUROLINK_PROXY_WORKER_GENERATION: String(options.generation),
      NEUROLINK_PROXY_WORKER_EXPECTED_VERSION: options.expectedVersion,
    },
    stdio: [
      "ignore",
      options.stdout ?? "inherit",
      options.stderr ?? "inherit",
      "ipc",
    ],
  });
  const childPid = child.pid;
  const publishStatus = (message: ProxyWorkerStatusMessage): void => {
    if (statusListeners.size === 0) {
      if (pendingStatusMessages.length >= 32) {
        pendingStatusMessages.shift();
      }
      pendingStatusMessages.push(message);
      return;
    }
    for (const listener of statusListeners) {
      listener(message);
    }
  };
  child.once("error", (error) => {
    spawnError = error;
    if (!childPid) {
      return;
    }
    publishStatus({
      type: "proxy-worker:fatal",
      generation: options.generation,
      pid: childPid,
      message: error.message,
    });
  });
  if (!childPid) {
    child.kill("SIGTERM");
    throw ErrorFactory.proxyWorkerLifecycle(
      "proxy worker spawn did not return a pid",
    );
  }

  /**
   * Finish a handoff once and cancel its worker-side copy on uncertain
   * delivery.
   */
  const settleSocket = (socketId: string, error?: Error): void => {
    const pending = pendingSockets.get(socketId);
    if (!pending) {
      return;
    }
    pendingSockets.delete(socketId);
    clearTimeout(pending.timeout);
    if (error && child.connected) {
      try {
        child.send(
          {
            type: "proxy-worker:socket-cancel",
            generation: options.generation,
            socketId,
          },
          () => undefined,
        );
      } catch {
        // The supervisor will quarantine the worker after the failed transfer.
      }
    }
    if (!error) {
      pending.socket.destroy();
    }
    pending.callback(error);
  };
  /** Lost budget replies leave unknown leases; release them only after exit. */
  const quarantineBudgetDeliveryFailure = (): void => {
    if (budgetResponseFailure) {
      return;
    }
    const error = ErrorFactory.proxyWorkerLifecycle(
      `proxy worker ${childPid} token budget response delivery failed`,
    );
    budgetResponseFailure = error;
    // An IPC-disconnected worker may ignore graceful shutdown. Retain its
    // reservation occupancy until exit, but bound how long it can survive.
    budgetTerminationTimeout = setTimeout(() => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGKILL");
      }
    }, 1_000);
    budgetTerminationTimeout.unref?.();
    try {
      publishStatus({
        type: "proxy-worker:fatal",
        generation: options.generation,
        pid: childPid,
        message: error.message,
      });
      for (const socketId of [...pendingSockets.keys()]) {
        settleSocket(socketId, error);
      }
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
    }
  };
  /**
   * Accept messages only from this worker and start a fresh deadline for
   * the commit phase.
   */
  const onInternalMessage = (message: unknown): void => {
    if (
      isProxyWorkerStatusMessage(message) &&
      message.type === "proxy-worker:ready" &&
      message.generation === options.generation &&
      message.pid === childPid
    ) {
      controlBeforeHandle =
        message.socketOfferProtocol === "control-before-handle";
      workerCommitAcknowledgement =
        message.socketCommitProtocol === "worker-ack";
    }
    if (
      isProxyWorkerStatusMessage(message) &&
      message.type === "proxy-worker:socket-committed" &&
      message.generation === options.generation &&
      message.pid === childPid
    ) {
      const pending = pendingSockets.get(message.socketId);
      if (!pending || !pending.accepted || !pending.descriptorSent) {
        return;
      }
      settleSocket(message.socketId);
      return;
    }
    if (
      isProxyWorkerStatusMessage(message) &&
      message.type === "proxy-worker:socket-accepted" &&
      message.generation === options.generation &&
      message.pid === childPid
    ) {
      const pending = pendingSockets.get(message.socketId);
      if (!pending || pending.accepted) {
        return;
      }
      if (Date.now() >= pending.deadlineAt) {
        const error = Object.assign(
          new Error("Socket admission deadline expired before commit"),
          {
            code: PROXY_SOCKET_OFFER_TIMEOUT,
            socketNeverTransferred: !pending.descriptorSent,
          },
        );
        settleSocket(message.socketId, error);
        return;
      }
      const commitBudgetMs = Math.min(
        socketAckTimeoutMs,
        pending.deadlineAt - Date.now(),
      );
      const minimumCommitWindowMs = Math.min(socketAckTimeoutMs, 1_000);
      if (commitBudgetMs < minimumCommitWindowMs) {
        settleSocket(
          message.socketId,
          Object.assign(
            new Error("Socket admission deadline too close for commit"),
            {
              code: PROXY_SOCKET_OFFER_TIMEOUT,
              socketNeverTransferred: !pending.descriptorSent,
            },
          ),
        );
        return;
      }
      pending.accepted = true;
      // Acceptance and commit are distinct phases. A late acceptance must not
      // inherit an almost-expired offer timer and kill established streams.
      clearTimeout(pending.timeout);
      pending.timeout = setTimeout(() => {
        const error: NodeJS.ErrnoException = new Error(
          `proxy worker ${childPid} socket commit remained pending for ${commitBudgetMs}ms`,
        );
        error.code = PROXY_SOCKET_COMMIT_TIMEOUT;
        settleSocket(message.socketId, error);
      }, commitBudgetMs);
      pending.timeout.unref?.();
      try {
        const commit: ProxyWorkerControlMessage = {
          type: "proxy-worker:socket-commit",
          generation: options.generation,
          socketId: message.socketId,
        };
        if (!pending.descriptorSent) {
          // Mark ambiguous before calling IPC: even a thrown/send callback error
          // cannot prove the descriptor was not delivered and consumed.
          pending.descriptorSent = true;
          child.send(
            commit,
            pending.socket as Socket,
            { keepOpen: true },
            (error) => {
              if (error || !workerCommitAcknowledgement) {
                settleSocket(message.socketId, error ?? undefined);
              }
            },
          );
        } else {
          child.send(commit, (error) => {
            if (error || !workerCommitAcknowledgement) {
              settleSocket(message.socketId, error ?? undefined);
            }
          });
        }
      } catch (error) {
        settleSocket(
          message.socketId,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  };
  child.on("message", (message: unknown) => {
    if (budgetResponseFailure) {
      return;
    }
    if (
      handleProxyTokenBudgetMessage(
        message,
        { pid: childPid, generation: options.generation },
        (response) => {
          if (!child.connected) {
            quarantineBudgetDeliveryFailure();
            return;
          }
          try {
            child.send(response, (error) => {
              if (error) {
                quarantineBudgetDeliveryFailure();
              }
            });
          } catch {
            quarantineBudgetDeliveryFailure();
          }
        },
      )
    ) {
      return;
    }
    onInternalMessage(message);
    if (isProxyWorkerStatusMessage(message)) {
      publishStatus(message);
    }
  });
  child.once("exit", (code, signal) => {
    clearTimeout(budgetTerminationTimeout);
    releaseProxyTokenBudgetOwner(childPid, options.generation);
    for (const socketId of [...pendingSockets.keys()]) {
      settleSocket(
        socketId,
        ErrorFactory.proxyWorkerLifecycle(
          `proxy worker ${childPid} exited before socket transfer committed (code=${code ?? "none"}, signal=${signal ?? "none"})`,
          {
            workerPid: childPid,
            generation: options.generation,
            exitCode: code,
            signal,
          },
        ),
      );
    }
  });

  const sendControl = (message: ProxyWorkerControlMessage): void => {
    if (budgetResponseFailure) {
      throw budgetResponseFailure;
    }
    if (!child.connected) {
      throw new Error(`proxy worker ${childPid} IPC channel is closed`);
    }
    child.send(message, (error) => {
      if (error && child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
      }
    });
  };

  return {
    pid: childPid,
    socketTransferTimeoutMs: 2 * socketAckTimeoutMs,
    sendControl,
    sendSocket: (
      generation,
      socket,
      callback,
      deadlineAt = Date.now() + 2 * socketAckTimeoutMs,
    ) => {
      if (Date.now() >= deadlineAt) {
        const error = Object.assign(
          new Error("Socket admission deadline expired before offer"),
          {
            code: PROXY_SOCKET_OFFER_TIMEOUT,
            socketNeverTransferred: true,
          },
        );
        callback(error);
        return;
      }
      if (budgetResponseFailure) {
        callback(budgetResponseFailure);
        return;
      }
      if (!child.connected) {
        callback(new Error(`proxy worker ${childPid} IPC channel is closed`));
        return;
      }
      const socketId = `${generation}:${++nextSocketId}`;
      const timeout = setTimeout(
        () => {
          const error = Object.assign(
            new Error(
              `proxy worker ${childPid} did not accept socket within ${socketAckTimeoutMs}ms`,
            ),
            {
              code: PROXY_SOCKET_OFFER_TIMEOUT,
              socketNeverTransferred:
                pendingSockets.get(socketId)?.descriptorSent === false,
            },
          );
          settleSocket(socketId, error);
        },
        Math.max(0, Math.min(socketAckTimeoutMs, deadlineAt - Date.now())),
      );
      timeout.unref?.();
      pendingSockets.set(socketId, {
        socket,
        callback,
        timeout,
        accepted: false,
        deadlineAt,
        descriptorSent: !controlBeforeHandle,
      });
      try {
        const onSent = (error: Error | null): void => {
          if (error) {
            settleSocket(socketId, error);
          }
        };
        if (controlBeforeHandle) {
          child.send(
            { type: "proxy-worker:socket-offer", generation, socketId },
            onSent,
          );
        } else {
          // Old workers require descriptor-first offers. They may buffer input
          // before commit, so their timed-out offers are never safe to retry.
          child.send(
            { type: "proxy-worker:socket", generation, socketId },
            socket as Socket,
            { keepOpen: true },
            onSent,
          );
        }
      } catch (error) {
        settleSocket(
          socketId,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    },
    terminate: (signal = "SIGTERM") => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal);
      }
    },
    onMessage: (listener) => {
      statusListeners.add(listener);
      if (pendingStatusMessages.length > 0) {
        const buffered = pendingStatusMessages.splice(0);
        queueMicrotask(() => {
          if (statusListeners.has(listener)) {
            for (const message of buffered) {
              listener(message);
            }
          }
        });
      } else if (spawnError) {
        const error = spawnError;
        queueMicrotask(() => {
          if (statusListeners.has(listener)) {
            listener({
              type: "proxy-worker:fatal",
              generation: options.generation,
              pid: childPid,
              message: error.message,
            });
          }
        });
      }
      return () => statusListeners.delete(listener);
    },
    onExit: (listener) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        queueMicrotask(() => listener(child.exitCode, child.signalCode));
        return () => undefined;
      }
      child.on("exit", listener);
      return () => child.off("exit", listener);
    },
  };
}
