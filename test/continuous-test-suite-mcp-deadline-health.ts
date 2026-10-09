#!/usr/bin/env tsx
/**
 * All shipped MCP transports against real loopback/stdio JSON-RPC fixtures.
 * Connection and whole-request bounds, public per-server health and reconnect
 * deadlines are observed through the built SDK. No provider or production MCP.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { WebSocketServer } from "ws";
import { ExternalServerManager, NeuroLink } from "../dist/index.js";
import type { MCPServerInfo } from "../src/lib/types/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("MCP deadlines and health", {
  offline: true,
  perTestTimeoutMs: 15_000,
});
const stdioFixture = fileURLToPath(
  new URL("./fixtures/mcp-deadline-server.mjs", import.meta.url),
);

const createNetworkFixture = async (initializeDelay = 0, callDelay = 2000) => {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let sseResponse: import("node:http").ServerResponse | undefined;
  const dispatch = (raw: unknown, send: (message: unknown) => void) => {
    if (
      !raw ||
      typeof raw !== "object" ||
      !("id" in raw) ||
      !("method" in raw)
    ) {
      return;
    }
    const id = raw.id;
    const method = raw.method;
    const result =
      method === "initialize"
        ? {
            protocolVersion: "2024-11-05",
            capabilities: { tools: {} },
            serverInfo: { name: "deadline-fixture", version: "1.0.0" },
          }
        : method === "tools/list"
          ? {
              tools: [
                {
                  name: "slow",
                  description: "Delays a harmless response",
                  inputSchema: { type: "object", properties: {} },
                },
              ],
            }
          : method === "tools/call"
            ? { content: [{ type: "text", text: "delayed fixture" }] }
            : {};
    const timer = setTimeout(
      () => {
        timers.delete(timer);
        send({ jsonrpc: "2.0", id, result });
      },
      method === "initialize"
        ? initializeDelay
        : method === "tools/call"
          ? callDelay
          : 0,
    );
    timers.add(timer);
  };
  const server = createServer((request, response) => {
    if (request.method === "GET" && request.url === "/sse") {
      sseResponse = response;
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
      });
      response.write("event: endpoint\ndata: /messages\n\n");
      return;
    }
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const message: unknown = JSON.parse(
        Buffer.concat(chunks).toString("utf8"),
      );
      if (!message || typeof message !== "object" || !("id" in message)) {
        response.writeHead(202).end();
        return;
      }
      if (request.url?.startsWith("/messages")) {
        response.writeHead(202).end();
        dispatch(message, (reply) =>
          sseResponse?.write(
            `event: message\ndata: ${JSON.stringify(reply)}\n\n`,
          ),
        );
      } else {
        dispatch(message, (reply) => {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.end(JSON.stringify(reply));
        });
      }
    });
  });
  const sockets = new WebSocketServer({ server, path: "/ws" });
  sockets.on("connection", (socket) =>
    socket.on("message", (data) =>
      dispatch(JSON.parse(data.toString()), (reply) => {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(reply));
        }
      }),
    ),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Deadline fixture did not bind a private port");
  }
  const close = async () => {
    timers.forEach((timer) => clearTimeout(timer));
    sockets.clients.forEach((socket) => socket.terminate());
    sockets.close();
    sseResponse?.end();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return {
    http: `http://127.0.0.1:${address.port}/http`,
    sse: `http://127.0.0.1:${address.port}/sse`,
    websocket: `ws://127.0.0.1:${address.port}/ws`,
    close,
  };
};

for (const transport of ["stdio", "http", "sse", "websocket"] as const) {
  await test(`${transport}: configured request bound defeats a longer caller timeout`, async () => {
    const fixture = await createNetworkFixture();
    const manager = new ExternalServerManager({
      defaultHealthCheckInterval: 60_000,
    });
    const id = `deadline-${randomUUID()}`;
    const config: MCPServerInfo = {
      id,
      name: "Deadline fixture",
      description: "Private deadline harness",
      transport,
      status: "initializing",
      tools: [],
      autoRestart: false,
      timeout: 2000,
      httpOptions: { connectionTimeout: 2000, requestTimeout: 500 },
      ...(transport === "stdio"
        ? {
            command: process.execPath,
            args: [stdioFixture],
            env: { FIXTURE_CALL_DELAY_MS: "2000" },
          }
        : { url: fixture[transport] }),
    };
    try {
      const registered = await manager.addServer(id, config);
      assert(
        registered.success,
        registered.error
          ? `Fixture connection failed: ${registered.error}`
          : "Fixture connection did not complete",
      );
      const client = manager.getServer(id)?.client;
      assert(
        client !== null && client !== undefined,
        "Fixture client is absent",
      );
      const started = Date.now();
      let refused = false;
      try {
        await client?.callTool({ name: "slow", arguments: {} }, undefined, {
          timeout: 5000,
          resetTimeoutOnProgress: true,
          maxTotalTimeout: 5000,
        });
      } catch {
        refused = true;
      }
      assert(refused, "Slow request escaped its configured bound");
      assert(
        Date.now() - started < 1500,
        "Caller extended the configured request deadline",
      );
    } finally {
      await manager.shutdown();
      await fixture.close();
    }
  });

  await test(`${transport}: initialization cannot escape the connection bound`, async () => {
    const fixture = await createNetworkFixture(2000);
    const manager = new ExternalServerManager();
    const id = `connection-${randomUUID()}`;
    try {
      const started = Date.now();
      const result = await manager.addServer(id, {
        id,
        name: "Slow initialization",
        description: "Private deadline harness",
        transport,
        status: "initializing",
        tools: [],
        autoRestart: false,
        timeout: 5000,
        httpOptions: { connectionTimeout: 200, requestTimeout: 5000 },
        ...(transport === "stdio"
          ? {
              command: process.execPath,
              args: [stdioFixture],
              env: { FIXTURE_INITIALIZE_DELAY_MS: "2000" },
            }
          : { url: fixture[transport] }),
      });
      assert(
        !result.success,
        "Slow initialization escaped the connection bound",
      );
      assert(
        Date.now() - started < 1500,
        "Connection bound was applied too late",
      );
    } finally {
      await manager.shutdown();
      await fixture.close();
    }
  });
}

await test("public health exposes retry deadline and resets after recovery", async () => {
  const fixture = await createNetworkFixture(0, 0);
  const sdk = new NeuroLink();
  const id = `health-${randomUUID()}`;
  try {
    const added = await sdk.addExternalMCPServer(id, {
      id,
      name: "Health fixture",
      description: "Private health harness",
      transport: "http",
      status: "initializing",
      tools: [],
      url: fixture.http,
      autoRestart: true,
      healthCheckInterval: 60_000,
    });
    assert(added.success, "Public SDK health fixture did not connect");
    let healthEvent = false;
    sdk.getEventEmitter().on("externalMCP:serverHealth", () => {
      healthEvent = true;
    });
    await sdk.getExternalMCPServer(id)?.client?.close();
    const observationDeadline = Date.now() + 750;
    while (
      Date.now() < observationDeadline &&
      sdk.getExternalMCPServerHealth().find((row) => row.serverId === id)
        ?.status === "connected"
    ) {
      await delay(10);
    }
    const failed = sdk
      .getExternalMCPServerHealth()
      .find((row) => row.serverId === id);
    assert(
      failed?.status === "restarting",
      "Health did not report the reconnect state",
    );
    assert(
      failed?.consecutiveFailures === 1,
      "Connection loss was not counted once",
    );
    assert(
      typeof failed?.lastError === "string",
      "Health lost the most recent failure",
    );
    assert(
      failed?.nextRetryAt instanceof Date,
      "Health omitted its scheduled retry deadline",
    );
    assert(healthEvent, "Public SDK did not forward its health event");
    const deadline = Date.now() + 5000;
    while (
      Date.now() < deadline &&
      sdk.getExternalMCPServerHealth().find((row) => row.serverId === id)
        ?.status !== "connected"
    ) {
      await delay(25);
    }
    const recovered = sdk
      .getExternalMCPServerHealth()
      .find((row) => row.serverId === id);
    assert(
      recovered?.status === "connected" && recovered.consecutiveFailures === 0,
      "Recovered connection retained the failure streak",
    );
    assert(
      recovered?.nextRetryAt === undefined &&
        recovered?.lastError === undefined,
      "Recovered health retained a stale deadline or error",
    );
  } finally {
    await sdk.removeExternalMCPServer(id);
    await fixture.close();
  }
});

await runSuite();
