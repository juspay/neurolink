import { spawn } from "node:child_process";
import type { Socket } from "node:net";
import type {
  ProxyWorkerControlMessage,
  ProxyWorkerStatusMessage,
  RollingWorkerHandle,
  SpawnProxySocketWorkerOptions,
  TransferableProxySocket,
} from "../types/index.js";
import { ErrorFactory } from "../utils/errorHandling.js";
import {
  isProxyWorkerStatusMessage,
  PROXY_SOCKET_WORKER_ENV,
} from "./rollingWorkerProtocol.js";

export function spawnProxySocketWorker(
  options: SpawnProxySocketWorkerOptions,
): RollingWorkerHandle {
  const socketAckTimeoutMs = Math.max(1, options.socketAckTimeoutMs ?? 5_000);
  let nextSocketId = 0;
  const pendingSockets = new Map<
    string,
    {
      socket: TransferableProxySocket;
      callback: (error?: Error | null) => void;
      timeout: NodeJS.Timeout;
      accepted: boolean;
    }
  >();
  const statusListeners = new Set<
    Parameters<RollingWorkerHandle["onMessage"]>[0]
  >();
  const pendingStatusMessages: ProxyWorkerStatusMessage[] = [];
  let spawnError: Error | undefined;
  const child = spawn(options.command, options.args, {
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

  const settleSocket = (socketId: string, error?: Error): void => {
    const pending = pendingSockets.get(socketId);
    if (!pending) {
      return;
    }
    pendingSockets.delete(socketId);
    clearTimeout(pending.timeout);
    if (!error) {
      pending.socket.destroy();
    }
    pending.callback(error);
  };
  const onInternalMessage = (message: unknown): void => {
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
      pending.accepted = true;
      try {
        child.send(
          {
            type: "proxy-worker:socket-commit",
            generation: options.generation,
            socketId: message.socketId,
          },
          (error) => settleSocket(message.socketId, error ?? undefined),
        );
      } catch (error) {
        settleSocket(
          message.socketId,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }
  };
  child.on("message", (message: unknown) => {
    onInternalMessage(message);
    if (isProxyWorkerStatusMessage(message)) {
      publishStatus(message);
    }
  });
  child.once("exit", () => {
    for (const socketId of [...pendingSockets.keys()]) {
      settleSocket(
        socketId,
        new Error(`proxy worker ${childPid} exited before accepting socket`),
      );
    }
  });

  const sendControl = (message: ProxyWorkerControlMessage): void => {
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
    sendControl,
    sendSocket: (generation, socket, callback) => {
      if (!child.connected) {
        callback(new Error(`proxy worker ${childPid} IPC channel is closed`));
        return;
      }
      const socketId = `${generation}:${++nextSocketId}`;
      const timeout = setTimeout(() => {
        if (child.connected) {
          try {
            child.send({
              type: "proxy-worker:socket-cancel",
              generation,
              socketId,
            });
          } catch {
            // The worker is terminated after the failed transfer is reported.
          }
        }
        settleSocket(
          socketId,
          new Error(
            `proxy worker ${childPid} did not accept socket within ${socketAckTimeoutMs}ms`,
          ),
        );
      }, socketAckTimeoutMs);
      timeout.unref?.();
      pendingSockets.set(socketId, {
        socket,
        callback,
        timeout,
        accepted: false,
      });
      try {
        child.send(
          { type: "proxy-worker:socket", generation, socketId },
          socket as Socket,
          { keepOpen: true },
          (error) => {
            if (error) {
              settleSocket(socketId, error);
            }
          },
        );
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
