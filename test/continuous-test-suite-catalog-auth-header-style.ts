#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — catalog `quirks.authHeaderStyle` ("x-api-key").
 *
 * Reka's catalog entry (src/lib/providers/catalog/reka.json) is onboarded
 * through the generic Tier-2 path (ConfiguredOpenAICompatProvider), whose
 * base class (OpenAIChatCompletionsProvider.getAuthHeaders()) defaults to
 * `Authorization: Bearer <apiKey>`. Reka's own OpenAPI spec
 * (https://docs.reka.ai/openapi/api-reference.yaml) declares exactly one
 * security scheme — an apiKey in header `X-Api-Key` — so a Reka request
 * authenticated the default way would get a real 401. The
 * `authHeaderStyle: "x-api-key"` quirk (read by
 * ConfiguredOpenAICompatProvider.getAuthHeaders()) fixes that.
 *
 * This suite proves the fix on the actual wire, not on an internal getter:
 * it drives the REAL `ConfiguredOpenAICompatProvider` — via `new
 * NeuroLink()`, ALL-DIST module graph (rule 15) — against a local
 * `node:http` server standing in for Reka's API, and asserts the HTTP
 * request the server actually received carries `x-api-key` and no
 * `authorization` header at all. A sibling case drives a catalog provider
 * that does NOT set the quirk (groq) against the same kind of stand-in
 * server and asserts the opposite, so the suite would fail if the override
 * ever became unconditional instead of quirk-gated.
 *
 * No external API keys — points REKA_BASE_URL / GROQ_BASE_URL at a local
 * test server.
 *
 * Run: npx tsx test/continuous-test-suite-catalog-auth-header-style.ts
 *      pnpm run test:catalog-auth-header-style
 */

import { createServer, type IncomingMessage } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";

const { test, runSuite, section } = defineSuite(
  "catalog authHeaderStyle quirk (Reka X-Api-Key)",
  {
    offline: true,
  },
);

function sseChunk(text: string): string {
  return `data: ${JSON.stringify({
    choices: [{ delta: { content: text }, finish_reason: null }],
  })}\n\n`;
}

function okChatCompletion(model: string, content: string): unknown {
  return {
    id: "chatcmpl-test-auth-header",
    object: "chat.completion",
    created: 0,
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

/** Env vars this suite mutates — saved/restored around every test. */
const TOUCHED_ENV_VARS = [
  "REKA_BASE_URL",
  "REKA_API_KEY",
  "GROQ_BASE_URL",
  "GROQ_API_KEY",
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

/** Starts a stand-in HTTP server that captures the first request's headers
 *  and answers with `body` (JSON for non-streaming, raw SSE text when
 *  `sse` is true). Returns the port and a promise that resolves with the
 *  captured headers once a request has landed. */
function startCapturingServer(
  respond: (res: import("node:http").ServerResponse) => void,
): {
  port: Promise<number>;
  headers: Promise<IncomingMessage["headers"]>;
  close: () => void;
} {
  let resolveHeaders: (h: IncomingMessage["headers"]) => void;
  const headers = new Promise<IncomingMessage["headers"]>((resolve) => {
    resolveHeaders = resolve;
  });
  const server = createServer((req, res) => {
    resolveHeaders(req.headers);
    respond(res);
  });
  const port = new Promise<number>((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
  return { port, headers, close: () => server.close() };
}

void runSuite(async () => {
  const { NeuroLink, ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  function nl() {
    return new NeuroLink({ conversationMemory: { enabled: false } });
  }

  section("Reka (authHeaderStyle: x-api-key) sends X-Api-Key, not Bearer");

  await test("generate(): request carries X-Api-Key and no Authorization", async () => {
    const envSnapshot = snapshotEnv();
    const { port, headers, close } = startCapturingServer((res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(okChatCompletion("reka-flash", "pong")));
    });

    try {
      process.env.REKA_BASE_URL = `http://127.0.0.1:${await port}`;
      process.env.REKA_API_KEY = "test-reka-key";

      const result = await nl().generate({
        provider: "reka",
        model: "reka-flash",
        input: { text: "ping" },
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);

      const captured = await headers;
      assert(
        captured["x-api-key"] === "test-reka-key",
        `expected the request to carry Reka's quirk-declared auth header set to test-reka-key — got ${JSON.stringify(captured["x-api-key"])}`,
      );
      assert(
        captured["authorization"] === undefined,
        `expected NO Authorization header on a Reka request — got ${JSON.stringify(captured["authorization"])}`,
      );
      assert(
        (result.content ?? "").includes("pong"),
        "the request should ultimately succeed",
      );
    } finally {
      close();
      restoreEnv(envSnapshot);
    }
  });

  await test("stream(): request carries X-Api-Key and no Authorization", async () => {
    const envSnapshot = snapshotEnv();
    const { port, headers, close } = startCapturingServer((res) => {
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk("pong"));
      res.write("data: [DONE]\n\n");
      res.end();
    });

    try {
      process.env.REKA_BASE_URL = `http://127.0.0.1:${await port}`;
      process.env.REKA_API_KEY = "test-reka-key-stream";

      const result = await nl().stream({
        provider: "reka",
        model: "reka-flash",
        input: { text: "ping" },
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["stream"]>[0]);
      let text = "";
      for await (const chunk of result.stream) {
        text += ("content" in chunk ? chunk.content : undefined) ?? "";
      }

      const captured = await headers;
      assert(
        captured["x-api-key"] === "test-reka-key-stream",
        `expected the streamed request to carry Reka's quirk-declared auth header set to test-reka-key-stream — got ${JSON.stringify(captured["x-api-key"])}`,
      );
      assert(
        captured["authorization"] === undefined,
        `expected NO Authorization header on a streamed Reka request — got ${JSON.stringify(captured["authorization"])}`,
      );
      assert(
        text.includes("pong"),
        "the streamed request should ultimately succeed",
      );
    } finally {
      close();
      restoreEnv(envSnapshot);
    }
  });

  section(
    "control: Groq (no authHeaderStyle quirk) still sends Bearer — the override stays quirk-gated",
  );

  await test("generate(): a catalog entry without the quirk is unaffected", async () => {
    const envSnapshot = snapshotEnv();
    const { port, headers, close } = startCapturingServer((res) => {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify(okChatCompletion("llama-3.3-70b-versatile", "pong")),
      );
    });

    try {
      process.env.GROQ_BASE_URL = `http://127.0.0.1:${await port}`;
      process.env.GROQ_API_KEY = "test-groq-key";

      await nl().generate({
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        input: { text: "ping" },
        maxSteps: 1,
        disableTools: true,
      } as Parameters<InstanceType<typeof NeuroLink>["generate"]>[0]);

      const captured = await headers;
      assert(
        captured["authorization"] === "Bearer test-groq-key",
        `expected Groq to keep the inherited Bearer default — got ${JSON.stringify(captured["authorization"])}`,
      );
      assert(
        captured["x-api-key"] === undefined,
        `expected Groq's request to carry no Reka-style quirk header — got ${JSON.stringify(captured["x-api-key"])}`,
      );
    } finally {
      close();
      restoreEnv(envSnapshot);
    }
  });
});
