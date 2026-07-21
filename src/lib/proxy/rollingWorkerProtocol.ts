import type {
  ProxyWorkerControlMessage,
  ProxyWorkerStatusMessage,
} from "../types/index.js";

export const PROXY_SOCKET_WORKER_ENV = "NEUROLINK_PROXY_SOCKET_WORKER";
export const PROXY_ROLLING_SUPERVISOR_ENV =
  "NEUROLINK_PROXY_ROLLING_SUPERVISOR";

export function isProxyWorkerControlMessage(
  value: unknown,
): value is ProxyWorkerControlMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as {
    type?: unknown;
    generation?: unknown;
    socketId?: unknown;
  };
  if (
    !Number.isSafeInteger(message.generation) ||
    Number(message.generation) <= 0
  ) {
    return false;
  }
  if (
    message.type === "proxy-worker:socket-commit" ||
    message.type === "proxy-worker:socket-cancel"
  ) {
    return typeof message.socketId === "string" && message.socketId.length > 0;
  }
  return (
    message.type === "proxy-worker:drain" ||
    message.type === "proxy-worker:activate" ||
    message.type === "proxy-worker:shutdown"
  );
}

export function isProxyWorkerStatusMessage(
  value: unknown,
): value is ProxyWorkerStatusMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const message = value as {
    type?: unknown;
    generation?: unknown;
    pid?: unknown;
    version?: unknown;
    message?: unknown;
    socketId?: unknown;
    reason?: unknown;
  };
  if (
    !Number.isSafeInteger(message.generation) ||
    Number(message.generation) <= 0 ||
    !Number.isSafeInteger(message.pid) ||
    Number(message.pid) <= 0
  ) {
    return false;
  }
  if (message.type === "proxy-worker:ready") {
    return typeof message.version === "string" && message.version.length > 0;
  }
  if (
    message.type === "proxy-worker:activated" ||
    message.type === "proxy-worker:drained"
  ) {
    return true;
  }
  if (message.type === "proxy-worker:socket-accepted") {
    return typeof message.socketId === "string" && message.socketId.length > 0;
  }
  if (message.type === "proxy-worker:replacement-requested") {
    return message.reason === "environment";
  }
  return (
    message.type === "proxy-worker:fatal" && typeof message.message === "string"
  );
}
