// Inert stdio JSON-RPC startup fixture. Its state file belongs to the invoking suite.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
const mode = process.env.FIXTURE_STARTUP_MODE;
const statePath = process.env.FIXTURE_STARTUP_STATE;
const attempt = statePath
  ? (existsSync(statePath) ? Number(readFileSync(statePath, "utf8")) : 0) + 1
  : 1;
if (statePath) {
  writeFileSync(statePath, String(attempt));
  writeFileSync(statePath + ".pid", String(process.pid));
}
const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`);
let pending = "";
let toolListCount = 0;
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  pending += chunk;
  while (pending.includes("\n")) {
    const end = pending.indexOf("\n");
    const line = pending.slice(0, end);
    pending = pending.slice(end + 1);
    if (!line.trim()) {
      continue;
    }
    const message = JSON.parse(line);
    if (message.id === undefined) {
      continue;
    }
    if (message.method === "initialize") {
      const initialize = () =>
        send({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities:
              mode === "resources" ? { resources: {} } : { tools: {} },
            serverInfo: { name: "startup-fixture", version: "1.0.0" },
          },
        });
      const releasePath = process.env.FIXTURE_INITIALIZE_RELEASE_PATH;
      if (releasePath) {
        const timer = setInterval(() => {
          if (existsSync(releasePath)) {
            clearInterval(timer);
            initialize();
          }
        }, 10);
      } else {
        initialize();
      }
    } else if (message.method === "tools/list") {
      toolListCount++;
      // The first tools/list belongs to the factory handshake, before the
      // manager stores the client. Hold only the manager's readiness discovery.
      if (mode === "cleanup-race" && toolListCount >= 2) {
        writeFileSync(statePath + ".discovery", "ready");
        const timer = setInterval(() => {
          if (existsSync(statePath + ".release")) {
            clearInterval(timer);
            send({
              jsonrpc: "2.0",
              id: message.id,
              error: { code: -32601, message: "Owned cleanup race" },
            });
          }
        }, 10);
      } else if (mode === "close" || (mode === "reconnect" && attempt === 2)) {
        process.exit(0);
      } else if (mode === "reject" || mode === "resources") {
        send({
          jsonrpc: "2.0",
          id: message.id,
          error: { code: -32601, message: "Owned discovery unavailable" },
        });
      } else {
        send({
          jsonrpc: "2.0",
          id: message.id,
          result: {
            tools:
              mode === "many"
                ? ["owned_first", "owned_late"].map((name) => ({
                    name,
                    description: "Owned cancellation fixture",
                    inputSchema: { type: "object", properties: {} },
                  }))
                : mode === "empty"
                  ? []
                  : [
                      {
                        name:
                          mode === "new"
                            ? "replacement_new"
                            : `owned_attempt_${attempt}`,
                        description: "Owned harmless startup fixture",
                        inputSchema: { type: "object", properties: {} },
                      },
                    ],
          },
        });
      }
    } else {
      send({ jsonrpc: "2.0", id: message.id, result: {} });
    }
  }
});
