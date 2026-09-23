import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { Socket } from "node:net";
import type {
  DetachableTransferableProxySocket,
  ProxyWorkerStatusMessage,
  SocketWorkerRuntime,
  SocketWorkerRuntimeOptions,
  TransferableProxySocket,
} from "../types/index.js";
import { isProxyWorkerControlMessage } from "./rollingWorkerProtocol.js";

const DEFAULT_FIRST_REQUEST_GRACE_MS = 30_000;

function isTransferableProxySocket(
  handle: unknown,
): handle is DetachableTransferableProxySocket {
  if (!handle || typeof handle !== "object") {
    return false;
  }
  const candidate = handle as Record<string, unknown>;
  return (
    typeof candidate.pause === "function" &&
    typeof candidate.resume === "function" &&
    typeof candidate.destroy === "function" &&
    typeof candidate.end === "function" &&
    typeof candidate.off === "function" &&
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
  const awaitingFirstRequest = new Set<TransferableProxySocket>();
  const firstRequestTimers = new Map<TransferableProxySocket, NodeJS.Timeout>();
  const firstRequestGraceMs = Math.max(
    1,
    options?.firstRequestGraceMs ?? DEFAULT_FIRST_REQUEST_GRACE_MS,
  );
  let draining = false;
  let drained = false;

  const clearFirstRequestWait = (socket: TransferableProxySocket): void => {
    awaitingFirstRequest.delete(socket);
    const timer = firstRequestTimers.get(socket);
    if (timer) {
      clearTimeout(timer);
      firstRequestTimers.delete(socket);
    }
  };

  const boundFirstRequestWait = (socket: TransferableProxySocket): void => {
    if (firstRequestTimers.has(socket)) {
      return;
    }
    const timer = setTimeout(() => {
      firstRequestTimers.delete(socket);
      awaitingFirstRequest.delete(socket);
      if (draining && sockets.has(socket) && !activeBySocket.has(socket)) {
        socket.end();
      }
    }, firstRequestGraceMs);
    timer.unref?.();
    firstRequestTimers.set(socket, timer);
  };

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
    clearFirstRequestWait(socket);
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
    awaitingFirstRequest.add(socket);
    socket.once("close", () => {
      clearFirstRequestWait(socket);
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
      if (awaitingFirstRequest.has(socket)) {
        // IPC commit confirms descriptor delivery, not HTTP parser admission.
        // Under host pressure a drain can otherwise end the socket before its
        // first buffered request reaches the server. Preserve it for one
        // bounded header-start window; the worker supervisor remains the outer
        // hard shutdown bound.
        boundFirstRequestWait(socket);
      } else if (!activeBySocket.has(socket)) {
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
      for (const timer of firstRequestTimers.values()) {
        clearTimeout(timer);
      }
      firstRequestTimers.clear();
      awaitingFirstRequest.clear();
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

/**
 * Attach the IPC ownership protocol and keep committed sockets addressable
 * by late cancellation.
 */
export function attachSocketWorkerProcess(
  server: Server,
  input: {
    generation: number;
    version: string;
    processInstanceId?: string;
    onActivated?: () => void;
    onDrained?: () => void;
  },
): SocketWorkerRuntime {
  let activated = false;
  let gracefulDrain = false;
  // A commit can reach the worker before its parent's send callback settles.
  // Retain ownership until close so a late cancellation affects only that
  // connection, never the worker's other requests. Never replay this socket.
  const committedSockets = new Map<string, DetachableTransferableProxySocket>();
  const pendingSockets = new Map<
    string,
    {
      socket: DetachableTransferableProxySocket;
      onError: () => void;
      onClose: () => void;
    }
  >();
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
  const takePendingSocket = (
    socketId: string,
  ): DetachableTransferableProxySocket | undefined => {
    const pending = pendingSockets.get(socketId);
    if (!pending) {
      return undefined;
    }
    pendingSockets.delete(socketId);
    pending.socket.off("error", pending.onError);
    pending.socket.off("close", pending.onClose);
    return pending.socket;
  };
  /** Apply supervisor messages while retaining ownership of pending and committed sockets. */
  const onMessage = (message: unknown, handle: unknown): void => {
    if (
      handle !== undefined &&
      isProxyWorkerControlMessage(message) &&
      message.type === "proxy-worker:socket-commit" &&
      message.generation === input.generation
    ) {
      // New supervisors first offer only a socket ID. The descriptor arrives
      // here at commit, so an abandoned offer cannot consume any client bytes.
      if (
        !activated ||
        gracefulDrain ||
        !isTransferableProxySocket(handle) ||
        pendingSockets.has(message.socketId) ||
        committedSockets.has(message.socketId)
      ) {
        destroyTransferredHandle(handle);
        return;
      }
      committedSockets.set(message.socketId, handle);
      handle.once("close", () => committedSockets.delete(message.socketId));
      runtime.acceptSocket(handle);
      send({
        type: "proxy-worker:socket-committed",
        generation: input.generation,
        pid: process.pid,
        socketId: message.socketId,
      });
      return;
    }
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
        const socket = handle;
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
        if (pendingSockets.has(socketId) || committedSockets.has(socketId)) {
          socket.destroy();
          return;
        }
        // A client can reset while the transferred handle is paused between
        // acceptance and commit. The HTTP server has not seen the socket yet,
        // so it cannot install its normal transport-error handler for us.
        const onError = (): void => {
          if (pendingSockets.get(socketId)?.socket !== socket) {
            return;
          }
          takePendingSocket(socketId);
          socket.destroy();
          drainWhenPendingSettled();
        };
        const onClose = (): void => {
          if (pendingSockets.get(socketId)?.socket !== socket) {
            return;
          }
          takePendingSocket(socketId);
          drainWhenPendingSettled();
        };
        pendingSockets.set(socketId, { socket, onError, onClose });
        socket.once("error", onError);
        socket.once("close", onClose);
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
                takePendingSocket(socketId)?.destroy();
                drainWhenPendingSettled();
              }
            },
          );
        } catch {
          takePendingSocket(socketId)?.destroy();
          drainWhenPendingSettled();
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
      if (message.type === "proxy-worker:socket-offer") {
        if (activated && !gracefulDrain && process.connected) {
          send({
            type: "proxy-worker:socket-accepted",
            generation: input.generation,
            pid: process.pid,
            socketId: message.socketId,
          });
        }
      } else if (message.type === "proxy-worker:activate") {
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
        const socket =
          takePendingSocket(message.socketId) ??
          (message.type === "proxy-worker:socket-cancel"
            ? committedSockets.get(message.socketId)
            : undefined);
        if (!socket) {
          return;
        }
        if (message.type === "proxy-worker:socket-commit") {
          committedSockets.set(message.socketId, socket);
          socket.once("close", () => committedSockets.delete(message.socketId));
          runtime.acceptSocket(socket);
          send({
            type: "proxy-worker:socket-committed",
            generation: input.generation,
            pid: process.pid,
            socketId: message.socketId,
          });
        } else {
          committedSockets.delete(message.socketId);
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
  // the bounded runtime drain starts immediately. A committed socket may still
  // use its first-request grace; the supervisor remains the outer hard shutdown
  // bound. The zero-downtime guarantee applies to the rolling handoff
  // (control-message) path, not to process termination.
  const drain = (): void => {
    for (const socketId of [...pendingSockets.keys()]) {
      takePendingSocket(socketId)?.destroy();
    }
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
    processInstanceId: input.processInstanceId,
    socketOfferProtocol: "control-before-handle",
    socketCommitProtocol: "worker-ack",
  });
  return {
    ...runtime,
    close: () => {
      process.off("message", onMessage);
      process.off("disconnect", drain);
      process.off("SIGTERM", onTerminationSignal);
      process.off("SIGINT", onTerminationSignal);
      for (const socketId of [...pendingSockets.keys()]) {
        takePendingSocket(socketId)?.destroy();
      }
      runtime.close();
      committedSockets.clear();
    },
  };
}
