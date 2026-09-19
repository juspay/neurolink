#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — createAgentWebSocketHandler real routes
 *
 * `createAgentWebSocketHandler` is exported from the public entry, documented
 * in docs/guides/server-adapters/websocket.md's Quick Start, and ships in the
 * published tarball — but its three routes (`generate`, `stream`, `tool_call`)
 * were literal stubs that never touched the injected NeuroLink instance:
 * `generate` echoed the caller's own prompt back as if it were a model
 * response. This suite drives the handler exactly as a real client would
 * (JSON frames through `onMessage`, inspecting the frames written back to a
 * mock socket) and asserts the responses are the model's / tool's real
 * output, not a stub echo.
 *
 * ALL-DIST module graph (rule 15): `NeuroLink`, `ProviderRegistry`, and
 * `createAgentWebSocketHandler` all come from `../dist/index.js`. No
 * src/lib import anywhere in this file.
 *
 * No external API keys — points the "openai-compatible" provider at a local
 * HTTP fixture via OPENAI_COMPATIBLE_BASE_URL, modeled on the real OpenAI
 * chat/completions wire format (plain JSON for generate(), SSE for
 * stream()). The tool_call route needs no network fixture at all — it
 * executes a tool registered directly on the NeuroLink instance.
 *
 * Run: npx tsx test/continuous-test-suite-websocket-agent-handler.ts
 *      pnpm run test:websocket-agent-handler
 */

import { createServer } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite("WebSocket Agent Handler", {
  offline: true,
});

/** Env vars this suite mutates — saved/restored around every test so ambient
 * dev-machine values can't leak in or out. */
const TOUCHED_ENV_VARS = [
  "OPENAI_COMPATIBLE_BASE_URL",
  "OPENAI_COMPATIBLE_API_KEY",
] as const;

function snapshotEnv(): Record<string, string | undefined> {
  const snapshot: Record<string, string | undefined> = {};
  for (const key of TOUCHED_ENV_VARS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
}

function restoreEnv(snapshot: Record<string, string | undefined>): void {
  for (const key of TOUCHED_ENV_VARS) {
    const prior = snapshot[key];
    if (prior === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prior;
    }
  }
}

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

/** A mock socket that records every outbound frame as parsed JSON. */
function mockSocket(): {
  socket: { send: (data: string) => void };
  sent: Array<Record<string, unknown>>;
} {
  const sent: Array<Record<string, unknown>> = [];
  return {
    socket: {
      send: (data: string) => {
        sent.push(JSON.parse(data) as Record<string, unknown>);
      },
    },
    sent,
  };
}

function listen(server: ReturnType<typeof createServer>): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

void runSuite(async () => {
  const { NeuroLink, ProviderRegistry, createAgentWebSocketHandler } =
    await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  function nl() {
    return new NeuroLink({ conversationMemory: { enabled: false } });
  }

  section("generate route calls the model instead of echoing the prompt");

  await test("generate returns the fixture model output, not the request prompt", async () => {
    const envSnapshot = snapshotEnv();
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "FIXTURE_REPLY_7f3a" },
              finish_reason: "stop",
            },
          ],
        }),
      );
    });
    const port = await listen(server);

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const handler = createAgentWebSocketHandler(nl());
      const { socket, sent } = mockSocket();
      const connection = {
        id: "test-generate",
        socket,
        metadata: {},
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      const prompt = "Describe the mission briefing for team Aurora";
      await handler.onMessage?.(connection, {
        type: "text",
        data: JSON.stringify({
          type: "generate",
          payload: {
            prompt,
            options: {
              provider: "openai-compatible",
              model: "gpt-4o-mini",
              maxSteps: 1,
            },
          },
        }),
        timestamp: Date.now(),
      });

      assert(
        sent.length === 1,
        "expected exactly one outbound frame for generate",
      );
      const response = sent[0];
      assert(
        response?.type === "response",
        "generate frame had the wrong message type",
      );
      const content = response?.content;
      assert(
        typeof content === "string" && content.includes("FIXTURE_REPLY"),
        "generate response did not carry the fixture model output",
      );
      assert(
        typeof content === "string" && !content.includes(prompt),
        "generate response echoed the request prompt instead of the model output",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section(
    "generate route surfaces provider failures as errors, not fake success",
  );

  await test("generate propagates a failed model call as an error frame", async () => {
    const envSnapshot = snapshotEnv();
    // 400 (not 429/500/503) so withProviderRetry does not retry — one fast,
    // deterministic attempt.
    const server = createServer((_req, res) => {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ error: { message: "synthetic failure fixture" } }),
      );
    });
    const port = await listen(server);

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const handler = createAgentWebSocketHandler(nl());
      const { socket, sent } = mockSocket();
      const connection = {
        id: "test-generate-error",
        socket,
        metadata: {},
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      await handler.onMessage?.(connection, {
        type: "text",
        data: JSON.stringify({
          type: "generate",
          payload: {
            prompt: "This call should fail",
            options: {
              provider: "openai-compatible",
              model: "gpt-4o-mini",
              maxSteps: 1,
            },
          },
        }),
        timestamp: Date.now(),
      });

      assert(
        sent.length === 1,
        "expected exactly one outbound frame for a failed generate",
      );
      const response = sent[0];
      assert(
        response?.type === "error",
        "a failed generate call did not surface as an error frame",
      );
      assert(
        typeof response?.error === "string" && response.error.length > 0,
        "error frame carried no error message",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section("stream route emits real chunks instead of a single stub frame");

  await test("stream forwards fixture chunks and a completion frame", async () => {
    const envSnapshot = snapshotEnv();
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("STREAM_"));
      res.write(sseChunk("FIXTURE_"));
      res.write(sseChunk("9c2d"));
      res.write("data: [DONE]\n\n");
      res.end();
    });
    const port = await listen(server);

    try {
      process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}`;
      process.env.OPENAI_COMPATIBLE_API_KEY = "test-key";

      const handler = createAgentWebSocketHandler(nl());
      const { socket, sent } = mockSocket();
      const connection = {
        id: "test-stream",
        socket,
        metadata: {},
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      const prompt = "Summarize the reconnaissance log";
      await handler.onMessage?.(connection, {
        type: "text",
        data: JSON.stringify({
          type: "stream",
          payload: {
            prompt,
            options: {
              provider: "openai-compatible",
              model: "gpt-4o-mini",
              maxSteps: 1,
            },
          },
        }),
        timestamp: Date.now(),
      });

      const chunkFrames = sent.filter((frame) => frame.type === "chunk");
      assert(
        chunkFrames.length > 0,
        "no chunk frames were emitted during the stream route",
      );
      const assembled = chunkFrames
        .map((frame) =>
          typeof frame.content === "string" ? frame.content : "",
        )
        .join("");
      assert(
        assembled.includes("STREAM_FIXTURE_9c2d"),
        "assembled stream content did not match the fixture output",
      );
      assert(
        !assembled.includes(prompt),
        "streamed content echoed the request prompt instead of the model output",
      );
      const lastFrame = sent[sent.length - 1];
      assert(
        lastFrame?.type === "stream_complete",
        "stream route did not end with a completion frame",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section("tool_call route executes the real tool instead of returning null");

  await test("tool_call returns the tool's actual result", async () => {
    const instance = nl();
    instance.registerTool("get_secret_code", {
      name: "get_secret_code",
      description: "Returns a fixed test code",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({ code: "ALPHA-99" }),
    });

    const handler = createAgentWebSocketHandler(instance);
    const { socket, sent } = mockSocket();
    const connection = {
      id: "test-tool-call",
      socket,
      metadata: {},
      createdAt: Date.now(),
      lastActivity: Date.now(),
    };

    await handler.onMessage?.(connection, {
      type: "text",
      data: JSON.stringify({
        type: "tool_call",
        payload: { toolName: "get_secret_code", args: {} },
      }),
      timestamp: Date.now(),
    });

    assert(
      sent.length === 1,
      "expected exactly one outbound frame for tool_call",
    );
    const response = sent[0];
    assert(
      response?.type === "tool_result",
      "tool_call frame had the wrong message type",
    );
    // executeTool()'s public contract wraps the tool's return value in an
    // envelope ({ success, data, usage, metadata }) — see
    // NeuroLink.executeTool in src/lib/neurolink.ts. The route forwards that
    // envelope verbatim (matching docs/guides/server-adapters/websocket.md),
    // so the real payload lives at `result.data`.
    const result = response?.result as
      | { success?: unknown; data?: { code?: unknown } }
      | undefined;
    assert(
      result?.success === true,
      "tool_call result envelope did not report success",
    );
    assert(
      result?.data?.code === "ALPHA-99",
      "tool_call did not surface the tool's real return value",
    );
  });

  section("an endpoint that requires auth refuses an unauthenticated socket");

  // Raised in review on this PR. WebSocketConfig has always declared
  // `auth: { strategy, required }`, and handleConnection has always accepted
  // and stored an AuthenticatedUser — but nothing consulted either, so
  // `required: true` produced exactly the same open socket as `required:
  // false`. That was inert while the agent routes returned canned values; it
  // stops being inert once tool_call reaches executeTool, because then any
  // client that can open the socket can run any registered tool with
  // arbitrary arguments.
  await test("a connection with auth.required and no authenticated user is refused", async () => {
    const { WebSocketConnectionManager } = await import("../dist/index.js");
    const manager = new WebSocketConnectionManager({
      auth: { strategy: "bearer", required: true },
    } as ConstructorParameters<typeof WebSocketConnectionManager>[0]);

    let refused = false;
    try {
      await manager.handleConnection({ send: () => {} }, "/ws/agent");
    } catch {
      refused = true;
    }
    assert(
      refused,
      "an endpoint requiring auth accepted a socket carrying no user",
    );
  });

  await test("a connection with auth.required and an authenticated user is accepted", async () => {
    const { WebSocketConnectionManager } = await import("../dist/index.js");
    const manager = new WebSocketConnectionManager({
      auth: { strategy: "bearer", required: true },
    } as ConstructorParameters<typeof WebSocketConnectionManager>[0]);

    // The negative case alone would also pass if the gate refused
    // everything, so pin that a real user still gets through.
    const connection = await manager.handleConnection(
      { send: () => {} },
      "/ws/agent",
      { id: "user-1" } as Parameters<typeof manager.handleConnection>[2],
    );
    assert(
      typeof connection?.id === "string" && connection.id.length > 0,
      "an authenticated socket was not accepted",
    );
    await manager.handleClose(connection.id, 1000, "test cleanup");
  });

  await test("an endpoint with auth unset still accepts a socket", async () => {
    const { WebSocketConnectionManager } = await import("../dist/index.js");
    // Default config is `required: false`; the gate must not change the
    // behaviour every existing deployment relies on.
    const manager = new WebSocketConnectionManager();
    const connection = await manager.handleConnection(
      { send: () => {} },
      "/ws/agent",
    );
    assert(
      typeof connection?.id === "string" && connection.id.length > 0,
      "an endpoint that does not require auth refused an anonymous socket",
    );
    await manager.handleClose(connection.id, 1000, "test cleanup");
  });
});
