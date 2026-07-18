/* global process, Buffer, setInterval, clearInterval */

const http = require("node:http");

const generation = Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION);
const version = process.env.NEUROLINK_PROXY_WORKER_EXPECTED_VERSION;
const sockets = new Set();
const activeBySocket = new Map();
const pendingSockets = new Map();
let draining = false;

// When the rolling handoff benchmark asks for it, flush this worker's exit-time
// CPU and heap so the parent can aggregate the true rolling cost across all
// worker generations rather than sampling only itself.
const benchMetricsFile = process.env.NEUROLINK_PROXY_BENCH_METRICS_FILE;
if (benchMetricsFile) {
  const fs = require("node:fs");
  process.on("exit", () => {
    try {
      const cpu = process.cpuUsage();
      fs.appendFileSync(
        benchMetricsFile,
        `${JSON.stringify({
          pid: process.pid,
          cpuMicros: cpu.user + cpu.system,
          heapUsed: process.memoryUsage().heapUsed,
        })}\n`,
      );
    } catch {
      // Best-effort benchmark metrics; never fail the worker over this.
    }
  });
}

function reportDrained() {
  if (!draining || sockets.size > 0) {
    return;
  }
  process.send?.({
    type: "proxy-worker:drained",
    generation,
    pid: process.pid,
  });
  process.exit(0);
}

const server = http.createServer((request, response) => {
  const socket = request.socket;
  activeBySocket.set(socket, (activeBySocket.get(socket) ?? 0) + 1);
  response.setHeader("x-worker-version", version);
  response.setHeader("connection", "close");
  response.setHeader("content-type", "application/octet-stream");

  let settled = false;
  const settle = () => {
    if (settled) {
      return;
    }
    settled = true;
    const remaining = Math.max(0, (activeBySocket.get(socket) ?? 1) - 1);
    if (remaining === 0) {
      activeBySocket.delete(socket);
      socket.end();
    } else {
      activeBySocket.set(socket, remaining);
    }
  };
  response.once("finish", settle);
  response.once("close", settle);

  if (request.url === "/stream") {
    let chunk = 0;
    const timer = setInterval(() => {
      response.write(Buffer.alloc(256, chunk));
      chunk += 1;
      if (chunk === 20) {
        clearInterval(timer);
        response.end();
      }
    }, 5);
    return;
  }
  if (request.url === "/health") {
    response.end(`worker-${version}`);
    return;
  }
  response.end(Buffer.alloc(1_024, 1));
});

server.on("connection", (socket) => {
  sockets.add(socket);
  socket.once("close", () => {
    sockets.delete(socket);
    activeBySocket.delete(socket);
    reportDrained();
  });
});

process.on("message", (message, socket) => {
  if (message?.generation !== generation) {
    // Close mismatched-generation transfers instead of leaking the descriptor,
    // matching the production runtime's rejection behavior.
    socket?.destroy?.();
    return;
  }
  if (message.type === "proxy-worker:socket" && socket) {
    if (draining) {
      socket.destroy();
      return;
    }
    socket.pause();
    pendingSockets.set(message.socketId, socket);
    process.send?.(
      {
        type: "proxy-worker:socket-accepted",
        generation,
        pid: process.pid,
        socketId: message.socketId,
      },
      (error) => {
        if (error) {
          pendingSockets.delete(message.socketId);
          socket.destroy();
        }
      },
    );
    return;
  }
  if (
    message.type === "proxy-worker:socket-commit" ||
    message.type === "proxy-worker:socket-cancel"
  ) {
    const pending = pendingSockets.get(message.socketId);
    if (!pending) {
      return;
    }
    pendingSockets.delete(message.socketId);
    if (message.type === "proxy-worker:socket-commit") {
      server.emit("connection", pending);
      pending.resume();
    } else {
      pending.destroy();
    }
    return;
  }
  if (message.type === "proxy-worker:activate") {
    process.send?.({
      type: "proxy-worker:activated",
      generation,
      pid: process.pid,
    });
    return;
  }
  if (
    message.type === "proxy-worker:drain" ||
    message.type === "proxy-worker:shutdown"
  ) {
    draining = true;
    for (const pending of pendingSockets.values()) {
      pending.destroy();
    }
    pendingSockets.clear();
    for (const openSocket of sockets) {
      if (!activeBySocket.has(openSocket)) {
        openSocket.end();
      }
    }
    reportDrained();
  }
});

process.send?.({
  type: "proxy-worker:ready",
  generation,
  pid: process.pid,
  version,
});

// Explicit, race-free readiness signal for the buffered-replay test: written
// only after readiness was emitted, so the test can await it before it
// subscribes instead of guessing with a fixed sleep.
if (process.env.NEUROLINK_PROXY_WORKER_READY_SIGNAL) {
  try {
    require("node:fs").writeFileSync(
      process.env.NEUROLINK_PROXY_WORKER_READY_SIGNAL,
      "ready",
    );
  } catch {
    // Best-effort test signal; never fail the worker over this.
  }
}
