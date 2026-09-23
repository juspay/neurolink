/** Deterministic source-graph IPC fixture; no installed service or provider calls. */
import { createServer } from "node:http";
import { attachSocketWorkerProcess } from "../../src/lib/proxy/socketWorkerRuntime.ts";
const generation = Number(process.env.NEUROLINK_PROXY_WORKER_GENERATION);
const version = process.env.NEUROLINK_PROXY_WORKER_EXPECTED_VERSION;
const originalSend = process.send.bind(process);
process.send = function (message, ...args) {
  if (
    message.type === "proxy-worker:ready" &&
    process.env.NEUROLINK_FIXTURE_LEGACY_OFFERS === "1"
  ) {
    delete message.socketOfferProtocol;
    delete message.socketCommitProtocol;
  }
  if (message.type === "proxy-worker:socket-accepted") {
    const delay = Number(process.env.NEUROLINK_FIXTURE_OFFER_DELAY_MS ?? 0);
    if (delay) {
      const timer = setTimeout(() => originalSend(message, ...args), delay);
      timer.unref();
      return true;
    }
  }
  return originalSend(message, ...args);
};
let served = 0;
const server = createServer((req, res) => {
  let bytes = 0;
  req.on("data", (chunk) => {
    bytes += chunk.length;
  });
  req.on("end", () => {
    res.setHeader("connection", "close");
    res.setHeader("x-worker-served-requests", String(++served));
    res.setHeader("x-request-bytes", String(bytes));
    res.end(`worker-${version}`);
  });
});
attachSocketWorkerProcess(server, {
  generation,
  version,
  onDrained: () => process.exit(0),
});
