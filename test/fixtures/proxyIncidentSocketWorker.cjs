// Executes the shipped socket runtime and admission journal in a child process.
const { createServer } = require("node:http");
const { pathToFileURL } = require("node:url");
const { join } = require("node:path");

/** Serve isolated streaming fixtures through the shipped socket runtime and admission journal. */
async function main() {
  const root = process.env.NEUROLINK_INCIDENT_BUILT_PROXY_DIR;
  const runtime = await import(
    pathToFileURL(join(root, "socketWorkerRuntime.js"))
  );
  const lifecycle = await import(
    pathToFileURL(join(root, "proxyLifecycle.js"))
  );
  lifecycle.configureProxyLifecycleLogger({
    enabled: true,
    logDir: process.env.NEUROLINK_INCIDENT_LOG_DIR,
  });
  const originalSend = process.send.bind(process);
  process.send = function (message, ...args) {
    const acceptDelay = Number(
      process.env.NEUROLINK_INCIDENT_ACCEPT_DELAY_MS ?? 0,
    );
    if (acceptDelay && message.type === "proxy-worker:socket-accepted") {
      setTimeout(() => originalSend(message, ...args), acceptDelay);
      return true;
    }
    const commitDelay = Number(
      process.env.NEUROLINK_INCIDENT_COMMIT_ACK_DELAY_MS ?? 0,
    );
    const commitSocket = process.env.NEUROLINK_INCIDENT_COMMIT_ACK_SOCKET;
    if (
      commitDelay &&
      message.type === "proxy-worker:socket-committed" &&
      (!commitSocket || message.socketId === commitSocket)
    ) {
      setTimeout(() => originalSend(message, ...args), commitDelay);
      return true;
    }
    return originalSend(message, ...args);
  };
  let requests = 0;
  const server = createServer(async (req, res) => {
    requests += 1;
    await lifecycle.persistProxyLifecycleAcceptance({
      requestId: `${process.pid}:${requests}`,
      method: "POST",
      path: "/v1/messages",
    });
    res.setHeader("connection", "close");
    res.setHeader("x-request-id", `${process.pid}:${requests}`);
    res.setHeader("x-worker-served", String(requests));
    if (req.url === "/stream" || req.url === "/hold") {
      let chunks = 0;
      res.write("start");
      const timer = setInterval(() => {
        res.write("chunk");
        if (++chunks === 200 && req.url !== "/hold") {
          clearInterval(timer);
          res.end("done");
        }
      }, 10);
      res.once("close", () => clearInterval(timer));
    } else res.end("ok");
  });
  runtime.attachSocketWorkerProcess(server, {
    generation: Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION),
    version: process.env.NEUROLINK_PROXY_WORKER_EXPECTED_VERSION,
    processInstanceId:
      lifecycle.getProxyLifecycleLoggerSnapshot().processInstanceId,
    onDrained: () => process.exit(0),
  });
}
main().catch(() => process.exit(1));
