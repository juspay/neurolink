#!/usr/bin/env tsx
/**
 * HTTP and SSE egress through the shipped MCP manager. Real local MCP servers
 * require a non-secret fixture header and answer tool calls over TCP. A trusted
 * fetch pins the approved fixture address even after the simulated DNS answer
 * changes. No provider, production endpoint or global dispatcher is used.
 */
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Agent as Dispatcher, fetch as dispatchFetch } from "undici";
import { ExternalServerManager, NeuroLink } from "../dist/index.js";
import { assert, defineSuite } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();
const { test, runSuite } = defineSuite("MCP egress", {
  offline: true,
  perTestTimeoutMs: 30_000,
});

const createFixture = async (redirect = false) => {
  const sseSessions = new Map<string, SSEServerTransport>();
  const httpSessions = new Map<string, StreamableHTTPServerTransport>();
  const transports = new Set<
    SSEServerTransport | StreamableHTTPServerTransport
  >();
  const requests: Array<{
    method: string;
    path: string;
    authenticated: boolean;
  }> = [];
  const buildServer = () => {
    const server = new McpServer({ name: "egress-fixture", version: "1.0.0" });
    server.registerTool(
      "echo",
      { description: "Returns a fixed fixture response", inputSchema: {} },
      async () => ({ content: [{ type: "text", text: "fixture complete" }] }),
    );
    for (const [name, annotations] of [
      ["read_fixture", { readOnlyHint: true }],
      ["write_fixture", { readOnlyHint: false }],
      ["unknown_fixture", undefined],
    ] as const) {
      server.registerTool(
        name,
        {
          description: `Owned ${name}`,
          inputSchema: {},
          ...(annotations ? { annotations } : {}),
        },
        async () => ({
          content: [{ type: "text", text: "owned metadata fixture" }],
        }),
      );
    }
    return server;
  };
  const server = createServer((request, response) => {
    const handle = async () => {
      const url = new URL(request.url ?? "/", "http://mcp.test");
      const authenticated =
        request.headers["x-fixture-access"] === "fixture-only";
      requests.push({
        method: request.method ?? "",
        path: url.pathname,
        authenticated,
      });
      if (!authenticated) {
        response.writeHead(401).end();
        return;
      }
      if (redirect) {
        response.writeHead(302, { Location: "http://127.0.0.2/private" }).end();
        return;
      }
      if (url.pathname === "/sse" && request.method === "GET") {
        const transport = new SSEServerTransport("/messages", response);
        transports.add(transport);
        sseSessions.set(transport.sessionId, transport);
        await buildServer().connect(transport);
        return;
      }
      if (url.pathname === "/messages") {
        const transport = sseSessions.get(
          url.searchParams.get("sessionId") ?? "",
        );
        if (!transport) {
          response.writeHead(404).end();
          return;
        }
        await transport.handlePostMessage(request, response);
        return;
      }
      if (url.pathname === "/http") {
        const sessionId = request.headers["mcp-session-id"];
        let transport =
          typeof sessionId === "string"
            ? httpSessions.get(sessionId)
            : undefined;
        if (!transport && request.method === "POST" && !sessionId) {
          transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: true,
          });
          transports.add(transport);
          await buildServer().connect(transport);
        }
        if (!transport) {
          response.writeHead(404).end();
          return;
        }
        await transport.handleRequest(request, response);
        if (transport.sessionId) {
          httpSessions.set(transport.sessionId, transport);
        }
        return;
      }
      response.writeHead(404).end();
    };
    void handle().catch(() => {
      if (!response.headersSent) {
        response.writeHead(422);
      }
      response.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Fixture did not bind a private port");
  }

  const pins: string[] = [];
  let currentDnsAnswer = "127.0.0.1";
  const approvedAddress = currentDnsAnswer;
  const dispatcher = new Dispatcher({
    connect: {
      lookup: (_hostname, options, callback) => {
        pins.push(approvedAddress);
        if (options?.all) {
          callback(null, [{ address: approvedAddress, family: 4 }]);
        } else {
          callback(null, approvedAddress, 4);
        }
      },
    },
  });
  const calls: string[] = [];
  const guardedFetch: typeof globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname !== "mcp.test") {
      throw new Error("Fixture egress policy refused a foreign host");
    }
    calls.push(url.pathname);
    currentDnsAnswer = "127.0.0.2";
    if (
      init?.body !== null &&
      init?.body !== undefined &&
      typeof init.body !== "string"
    ) {
      throw new Error("Fixture expected a JSON request body");
    }
    // Widen the reconnect readiness window deterministically: "connected"
    // must wait for rediscovery even when the transport itself is ready.
    if (
      typeof init?.body === "string" &&
      JSON.parse(init.body).method === "tools/list"
    ) {
      await delay(75);
    }
    const result = await dispatchFetch(url, {
      dispatcher,
      method: init?.method,
      headers: Object.fromEntries(new Headers(init?.headers)),
      body: init?.body,
      signal: init?.signal,
      redirect: init?.redirect,
    });
    const reader = result.body?.getReader();
    const body = reader
      ? new ReadableStream<Uint8Array>({
          pull: async (controller) => {
            const chunk = await reader.read();
            if (chunk.done) {
              controller.close();
            } else {
              controller.enqueue(chunk.value);
            }
          },
          cancel: (reason) => reader.cancel(reason),
        })
      : null;
    return new Response(body, {
      status: result.status,
      statusText: result.statusText,
      headers: Object.fromEntries(result.headers),
    });
  };
  const close = async () => {
    await Promise.all([...transports].map((transport) => transport.close()));
    await dispatcher.destroy();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  return {
    url: `http://mcp.test:${address.port}`,
    guardedFetch,
    pins,
    calls,
    requests,
    dnsAnswer: () => currentDnsAnswer,
    close,
  };
};

const waitForReconnect = async (
  manager: ExternalServerManager,
  serverId: string,
) => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const instance = manager.getServer(serverId);
    if (
      instance?.status === "connected" &&
      (instance.metrics?.totalConnections ?? 0) >= 2
    ) {
      return;
    }
    await delay(25);
  }
  throw new Error("MCP reconnect was not observed");
};

for (const transport of ["http", "sse"] as const) {
  await test(`${transport}: pinned fetch, headers and tool calls survive reconnect`, async () => {
    const fixture = await createFixture();
    const manager = new ExternalServerManager({
      defaultHealthCheckInterval: 60_000,
      maxRestartAttempts: 1,
      restartBackoffMultiplier: 1,
    });
    const serverId = `egress-${transport}-${randomUUID()}`;
    try {
      const result = await manager.addServer(serverId, {
        id: serverId,
        name: "Egress fixture",
        description: "Private harness server",
        transport,
        status: "initializing",
        tools: [],
        url: `${fixture.url}/${transport}`,
        fetch: fixture.guardedFetch,
        headers: { "X-Fixture-Access": "fixture-only" },
        autoRestart: true,
        timeout: 5_000,
        minTools: 1,
      });
      assert(result.success, "MCP registration did not use the guarded fetch");
      assert(
        manager.getServer(serverId)?.config.fetch === fixture.guardedFetch,
        "Stored egress hook changed",
      );
      const first = await manager.executeTool(serverId, "echo", {});
      assert(
        JSON.stringify(first).includes("fixture complete"),
        "Tool response was not delivered",
      );
      assert(
        fixture.dnsAnswer() === "127.0.0.2",
        "Rebinding control was not armed",
      );
      assert(
        fixture.pins.length > 0 &&
          fixture.pins.every((pin) => pin === "127.0.0.1"),
        "Connection did not retain the validated address",
      );
      const previousCalls = fixture.calls.length;
      await manager.getServer(serverId)?.client?.close();
      await waitForReconnect(manager, serverId);
      await manager.executeTool(serverId, "echo", {});
      assert(
        fixture.calls.length > previousCalls,
        "Reconnect bypassed the egress hook",
      );
      assert(
        fixture.requests.every((request) => request.authenticated),
        "A transport request lost the configured header",
      );
      if (transport === "sse") {
        assert(
          fixture.requests.some(
            (request) => request.method === "GET" && request.path === "/sse",
          ),
          "SSE GET was not measured",
        );
        assert(
          fixture.requests.some(
            (request) =>
              request.method === "POST" && request.path === "/messages",
          ),
          "SSE POST was not measured",
        );
      }
    } finally {
      await manager.shutdown();
      await fixture.close();
    }
  });

  await test(`${transport}: a redirect cannot reach a second destination`, async () => {
    const fixture = await createFixture(true);
    const manager = new ExternalServerManager();
    const serverId = `redirect-${transport}-${randomUUID()}`;
    try {
      const result = await manager.addServer(serverId, {
        id: serverId,
        name: "Redirect fixture",
        description: "Private harness redirect",
        transport,
        status: "initializing",
        tools: [],
        url: `${fixture.url}/${transport}`,
        fetch: fixture.guardedFetch,
        headers: { "X-Fixture-Access": "fixture-only" },
        autoRestart: false,
        timeout: 2_000,
      });
      assert(!result.success, "A redirected transport was accepted");
      assert(
        fixture.calls.length === 1,
        "A redirect caused another outbound request",
      );
      assert(
        fixture.requests.length === 1,
        "Redirect fixture received unexpected requests",
      );
      assert(
        result.error?.includes("redirects are not permitted") === true,
        "Redirect refusal did not reach the caller",
      );
    } finally {
      await manager.shutdown();
      await fixture.close();
    }
  });
}

await test("public SDK discovery preserves true, false and absent read-only annotations", async () => {
  const fixture = await createFixture();
  const sdk = new NeuroLink({
    conversationMemory: { enabled: false },
    hitl: { enabled: false, dangerousActions: [] },
    tools: { disableBuiltinTools: true, discovery: false },
  });
  const id = `annotations-${randomUUID()}`;
  try {
    const added = await sdk.addExternalMCPServer(id, {
      id,
      name: "Annotation fixture",
      description: "Owned public discovery annotation fixture",
      status: "initializing",
      tools: [],
      transport: "http",
      url: `${fixture.url}/http`,
      fetch: fixture.guardedFetch,
      headers: { "X-Fixture-Access": "fixture-only" },
      minTools: 4,
      autoRestart: false,
    });
    assert(added.success, "Actual annotated MCP server did not attach");
    const tools = sdk.getExternalMCPServerTools(id);
    for (const [name, expected] of [
      ["read_fixture", true],
      ["write_fixture", false],
      ["unknown_fixture", undefined],
    ] as const) {
      const tool = tools.find((entry) => entry.name === name);
      const annotations =
        tool && "annotations" in tool ? tool.annotations : undefined;
      const actual =
        annotations &&
        typeof annotations === "object" &&
        "readOnlyHint" in annotations
          ? annotations.readOnlyHint
          : undefined;
      assert(
        actual === expected,
        `Public SDK discovery lost ${name} annotation`,
      );
      if (expected === undefined) {
        assert(
          annotations === undefined,
          "SDK invented hints for an unannotated tool",
        );
      }
    }
  } finally {
    await sdk.removeExternalMCPServer(id);
    await sdk.shutdown();
    await fixture.close();
  }
});

await runSuite();
