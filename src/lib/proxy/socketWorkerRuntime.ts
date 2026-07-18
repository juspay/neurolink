import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type {
  ProxyWorkerStatusMessage,
  SocketWorkerRuntime,
  SocketWorkerRuntimeOptions,
  TransferableProxySocket,
} from "../types/index.js";
import { isProxyWorkerControlMessage } from "./rollingWorkerProtocol.js";

function isTransferableProxySocket(
  handle: unknown,
): handle is TransferableProxySocket {
  if (!handle || typeof handle !== "object") {
    return false;
  }
  const candidate = handle as Record<string, unknown>;
  return (
    typeof candidate.pause === "function" &&
    typeof candidate.resume === "function" &&
    typeof candidate.destroy === "function" &&
    typeof candidate.end === "function" &&
    typeof candidate.once === "function"
  );
}

function destroyTransferredHandle(handle: unknown): void {
  if (
    handle &&
    typeof handle === "object" &&
    typeof (handle as { destroy?: unknown }).destroy === "function"
  ) {
    try {
      (handle as { destroy: () => void }).destroy();
    } catch {
      // Invalid IPC handles must not crash the serving worker.
    }
  }
}

/**
 * Adapts transferred TCP sockets to an HTTP server without opening another
 * listener. Active responses finish normally; idle keep-alive sockets close as
 * soon as draining begins.
 */
export function createSocketWorkerRuntime(
  server: Server,
  options?: SocketWorkerRuntimeOptions,
): SocketWorkerRuntime {
  const sockets = new Set<TransferableProxySocket>();
  const activeBySocket = new Map<TransferableProxySocket, number>();
  const activeResponses = new Set<ServerResponse>();
  let draining = false;
  let drained = false;

  const maybeFinishDrain = (): void => {
    if (draining && !drained && sockets.size === 0) {
      drained = true;
      options?.onDrained?.();
    }
  };

  const requestStarted = (
    request: IncomingMessage,
    response: ServerResponse,
  ): void => {
    const socket = request.socket as TransferableProxySocket;
    activeBySocket.set(socket, (activeBySocket.get(socket) ?? 0) + 1);
    activeResponses.add(response);
    if (draining) {
      response.shouldKeepAlive = false;
    }
    let settled = false;
    const settle = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      activeResponses.delete(response);
      const remaining = Math.max(0, (activeBySocket.get(socket) ?? 1) - 1);
      if (remaining === 0) {
        activeBySocket.delete(socket);
        if (draining) {
          socket.end();
        }
      } else {
        activeBySocket.set(socket, remaining);
      }
    };
    response.once("finish", settle);
    response.once("close", settle);
  };
  server.prependListener("request", requestStarted);

  const acceptSocket = (socket: TransferableProxySocket): void => {
    if (draining) {
      socket.destroy();
      return;
    }
    sockets.add(socket);
    socket.once("close", () => {
      sockets.delete(socket);
      activeBySocket.delete(socket);
      maybeFinishDrain();
    });
    server.emit("connection", socket as Socket);
    socket.resume();
  };

  const drain = (): void => {
    if (draining) {
      return;
    }
    draining = true;
    for (const response of activeResponses) {
      response.shouldKeepAlive = false;
    }
    for (const socket of sockets) {
      if (!activeBySocket.has(socket)) {
        socket.end();
      }
    }
    maybeFinishDrain();
  };

  return {
    acceptSocket,
    drain,
    close: () => {
      server.off("request", requestStarted);
      for (const socket of sockets) {
        socket.destroy();
      }
      sockets.clear();
      activeBySocket.clear();
      activeResponses.clear();
      draining = true;
      maybeFinishDrain();
    },
    snapshot: () => ({
      draining,
      sockets: sockets.size,
      activeRequests: [...activeBySocket.values()].reduce(
        (total, count) => total + count,
        0,
      ),
      drained,
    }),
  };
}

export function attachSocketWorkerProcess(
  server: Server,
  input: {
    generation: number;
    version: string;
    onActivated?: () => void;
    onDrained?: () => void;
  },
): SocketWorkerRuntime {
  let activated = false;
  let gracefulDrain = false;
  const pendingSockets = new Map<string, TransferableProxySocket>();
  const send = (message: ProxyWorkerStatusMessage): void => {
    if (!process.connected || !process.send) {
      return;
    }
    try {
      process.send(message);
    } catch {
      // Parent supervision handles the disconnected worker.
    }
  };
  const runtime = createSocketWorkerRuntime(server, {
    onDrained: () => {
      send({
        type: "proxy-worker:drained",
        generation: input.generation,
        pid: process.pid,
      });
      input.onDrained?.();
    },
  });
  const drainWhenPendingSettled = (): void => {
    if (!gracefulDrain || pendingSockets.size > 0) {
      return;
    }
    // Defer to a macrotask so a request buffered on a just-committed socket can
    // reach the HTTP server before drain() ends idle sockets; draining
    // synchronously here would truncate that in-flight request.
    setImmediate(() => runtime.drain());
  };
  const onMessage = (message: unknown, handle: unknown): void => {
    if (
      message &&
      typeof message === "object" &&
      (message as { type?: unknown }).type === "proxy-worker:socket"
    ) {
      const socketMessage = message as { generation?: unknown };
      if (
        socketMessage.generation === input.generation &&
        typeof (message as { socketId?: unknown }).socketId === "string" &&
        (message as { socketId: string }).socketId.length > 0 &&
        isTransferableProxySocket(handle)
      ) {
        const socketId = (message as { socketId: string }).socketId;
        const socket = handle as TransferableProxySocket;
        socket.pause();
        if (
          !activated ||
          !process.connected ||
          !process.send ||
          gracefulDrain
        ) {
          socket.destroy();
          return;
        }
        if (pendingSockets.has(socketId)) {
          socket.destroy();
          return;
        }
        pendingSockets.set(socketId, socket);
        try {
          process.send(
            {
              type: "proxy-worker:socket-accepted",
              generation: input.generation,
              pid: process.pid,
              socketId,
            },
            (error) => {
              if (error) {
                pendingSockets.delete(socketId);
                socket.destroy();
              }
            },
          );
        } catch {
          pendingSockets.delete(socketId);
          socket.destroy();
        }
      } else {
        destroyTransferredHandle(handle);
      }
      return;
    }
    if (handle !== undefined) {
      destroyTransferredHandle(handle);
    }
    if (
      isProxyWorkerControlMessage(message) &&
      message.generation === input.generation
    ) {
      if (message.type === "proxy-worker:activate") {
        if (!activated) {
          try {
            input.onActivated?.();
            activated = true;
            send({
              type: "proxy-worker:activated",
              generation: input.generation,
              pid: process.pid,
            });
          } catch (error) {
            send({
              type: "proxy-worker:fatal",
              generation: input.generation,
              pid: process.pid,
              message: error instanceof Error ? error.message : String(error),
            });
            runtime.drain();
          }
        }
      } else if (
        message.type === "proxy-worker:socket-commit" ||
        message.type === "proxy-worker:socket-cancel"
      ) {
        const socket = pendingSockets.get(message.socketId);
        if (!socket) {
          return;
        }
        pendingSockets.delete(message.socketId);
        if (message.type === "proxy-worker:socket-commit") {
          runtime.acceptSocket(socket);
        } else {
          socket.destroy();
        }
        drainWhenPendingSettled();
      } else {
        // Graceful drain: a socket-commit for an already-accepted socket may
        // still be in flight. Stop admitting new offers and defer the drain
        // until every pending socket is committed or canceled, so an
        // acknowledged connection is served instead of silently dropped.
        gracefulDrain = true;
        drainWhenPendingSettled();
      }
    }
  };
  // Terminal shutdown path: the parent IPC channel is gone (disconnect) or the
  // process is being killed (SIGTERM/SIGINT). Unlike the graceful rolling drain
  // above, pending offers can no longer be committed, so they are destroyed and
  // the drain runs immediately — a best-effort close is correct when the process
  // is exiting. The zero-downtime guarantee applies to the rolling handoff
  // (control-message) path, not to process termination.
  const drain = (): void => {
    for (const socket of pendingSockets.values()) {
      socket.destroy();
    }
    pendingSockets.clear();
    runtime.drain();
  };
  const onTerminationSignal = (): void => drain();
  process.on("message", onMessage);
  process.once("disconnect", drain);
  process.once("SIGTERM", onTerminationSignal);
  process.once("SIGINT", onTerminationSignal);
  send({
    type: "proxy-worker:ready",
    generation: input.generation,
    pid: process.pid,
    version: input.version,
  });
  return {
    ...runtime,
    close: () => {
      process.off("message", onMessage);
      process.off("disconnect", drain);
      process.off("SIGTERM", onTerminationSignal);
      process.off("SIGINT", onTerminationSignal);
      for (const socket of pendingSockets.values()) {
        socket.destroy();
      }
      pendingSockets.clear();
      runtime.close();
    },
  };
}
