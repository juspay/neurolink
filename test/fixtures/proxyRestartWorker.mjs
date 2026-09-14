/**
 * Determinism exception: the shipped socket-worker runtime is driven with
 * delayed, crashed and wrong-version candidates, plus a reproducible stream.
 * No provider or installed proxy is contacted.
 */
import { createServer } from "node:http";
import { attachSocketWorkerProcess } from "../../dist/proxy/socketWorkerRuntime.js";

const generation = Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION);
const version = process.env.NEUROLINK_PROXY_WORKER_EXPECTED_VERSION;
const mode = process.env.NEUROLINK_RESTART_FIXTURE_MODE;
const server = createServer((req, res) => {
  res.setHeader("connection", "close");
  if (req.url === "/status") {
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        pid: process.pid,
        version,
        health: {
          ready: true,
          acceptingConnections: mode !== "draining",
          drainingForUpdate: mode === "draining",
        },
        observability: {
          requestLogs: {
            diskEnabled:
              (generation > 1 && mode === "logging-regression") ||
              (generation === 1 && mode === "disk-logging-lost"),
            otel: {
              initialized: !(generation > 1 && mode === "otel-uninitialized"),
            },
          },
        },
      }),
    );
  } else if (req.url === "/stream") {
    let chunk = 0;
    const timer = setInterval(() => {
      res.write(Buffer.alloc(256, chunk % 256));
      if (++chunk === 1_000) {
        clearInterval(timer);
        res.end();
      }
    }, 10);
    res.once("close", () => clearInterval(timer));
  } else {
    res.end(`worker-${generation}`);
  }
});

if (generation > 1 && mode === "crash") {
  process.exit(7);
}
if (generation > 1 && (mode === "never-ready" || mode === "ignores-term")) {
  if (mode === "ignores-term") {
    process.on("SIGTERM", () => {});
  }
  // Keep the child alive until the supervisor enforces its deadline.
  setInterval(() => {}, 1_000);
} else {
  setTimeout(
    () => {
      attachSocketWorkerProcess(server, {
        generation,
        version: generation > 1 && mode === "wrong-version" ? "0.0.0" : version,
        onDrained: () => process.exit(0),
      });
    },
    generation > 1 ? 300 : 0,
  );
}
