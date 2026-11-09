#!/usr/bin/env tsx
/**
 * Continuous Test Suite — message-threads beta through the Claude proxy
 *
 * A client that sends `anthropic-beta: message-threads-2026-08-12` and a
 * `thread` body field through the proxy must reach the upstream with the beta
 * intact, whether the pool account is OAuth or an API key; the proxy used to
 * drop a beta it did not know for a non-Claude-Code OAuth client, and the
 * upstream rejects a `thread` field without it. A beta the proxy does not know
 * is still dropped (negative control).
 *
 * Determinism exception (CLAUDE.md rule 15): the shipped `/v1/messages`
 * handler is driven in process with `globalThis.fetch` stubbed to record what
 * the proxy sends upstream, as the other proxy suites do; `proxyTestIsolation`
 * redirects HOME and blocks every provider host.
 *
 * Run: pnpm run build && pnpm run test:proxy-message-threads-beta
 */

import { assert, defineSuite, logSection } from "./helpers/harness.js";
import "./helpers/proxyTestIsolation.js";
import {
  __testHooks,
  createClaudeProxyRoutes,
} from "../src/lib/server/routes/claudeProxyRoutes.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import { clearAccountCooldown } from "../src/lib/proxy/accountCooldown.js";
import { resetUsageStatsForTests } from "../src/lib/proxy/usageStats.js";
import type { ServerContext } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Proxy message-threads beta", {
  offline: true,
  perTestTimeoutMs: 60_000,
});

const isolatedFetch = globalThis.fetch;
const THREADS_BETA = "message-threads-2026-08-12";
let sequence = 0;

type Seen = { beta: string; body: Record<string, unknown> };

function installUpstream(seen: Seen[]): void {
  globalThis.fetch = (async (input: unknown, init?: RequestInit) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : (input as Request).url;
    if (!url.includes("/v1/messages")) {
      if (url.includes("/api/oauth/usage")) {
        return new Response("{}", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new Error(`unexpected upstream call in test: ${url}`);
    }
    const headers = new Headers(init?.headers);
    seen.push({
      beta: headers.get("anthropic-beta") ?? "",
      body: JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>,
    });
    const wantsStream =
      (JSON.parse(String(init?.body ?? "{}")) as { stream?: boolean })
        .stream === true;
    if (wantsStream) {
      const sse = (event: string, data: unknown) =>
        `event: ${event}\ndata: ${JSON.stringify({ type: event, ...(data as object) })}\n\n`;
      return new Response(
        [
          sse("message_start", {
            message: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              model: "claude-sonnet-4-5",
              content: [],
              usage: { input_tokens: 4, output_tokens: 0 },
            },
          }),
          sse("content_block_start", {
            index: 0,
            content_block: { type: "text", text: "" },
          }),
          sse("content_block_delta", {
            index: 0,
            delta: { type: "text_delta", text: "pong" },
          }),
          sse("content_block_stop", { index: 0 }),
          sse("message_delta", {
            delta: { stop_reason: "end_turn", stop_sequence: null },
            usage: { output_tokens: 1 },
          }),
          sse("message_stop", {}),
        ].join(""),
        { status: 200, headers: { "content-type": "text/event-stream" } },
      );
    }
    return new Response(
      JSON.stringify({
        id: "msg_1",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-5",
        content: [{ type: "text", text: "pong" }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 4, output_tokens: 1 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  }) as typeof globalThis.fetch;
}

function context(
  beta: string | undefined,
  withThread: boolean,
  extraHeaders: Record<string, string> = {},
  stream = false,
): ServerContext {
  return {
    requestId: `req-${Date.now()}-${sequence}`,
    method: "POST",
    path: "/v1/messages",
    headers: {
      "content-type": "application/json",
      ...(beta !== undefined ? { "anthropic-beta": beta } : {}),
      ...extraHeaders,
    },
    query: {},
    params: {},
    body: {
      model: "claude-sonnet-4-5",
      max_tokens: 32,
      stream,
      messages: [{ role: "user", content: "ping" }],
      ...(withThread ? { thread: { type: "create" } } : {}),
    },
    metadata: {},
    responseHeaders: {},
    timestamp: Date.now(),
    neurolink: {},
    toolRegistry: {},
  } as unknown as ServerContext;
}

async function send(
  beta: string | undefined,
  withThread: boolean,
  extraHeaders: Record<string, string> = {},
  stream = false,
): Promise<Seen> {
  const seen: Seen[] = [];
  installUpstream(seen);
  const route = createClaudeProxyRoutes().routes.find(
    (r) => r.path.endsWith("/v1/messages") && r.method === "POST",
  );
  if (!route) {
    throw new Error("POST /v1/messages is not registered");
  }
  const result = await route.handler(
    context(beta, withThread, extraHeaders, stream),
  );
  if (result instanceof Response) {
    await result.text();
  }
  assert(seen.length >= 1, "the proxy never reached the upstream stub");
  return seen[0];
}

async function withOAuthAccount<T>(run: () => Promise<T>): Promise<T> {
  sequence += 1;
  const label = `threads-beta-${process.pid}-${sequence}@example.test`;
  const key = `anthropic:${label}`;
  await tokenStore.saveTokens(key, {
    accessToken: `access-${sequence}`,
    refreshToken: `refresh-${sequence}`,
    expiresAt: Date.now() + 60 * 60 * 1000,
    tokenType: "Bearer",
  });
  try {
    return await run();
  } finally {
    globalThis.fetch = isolatedFetch;
    await clearAccountCooldown(key).catch(() => undefined);
    await tokenStore.clearTokens(key).catch(() => undefined);
    await resetUsageStatsForTests();
    __testHooks.clearProviderTransportCoordinatorForTests();
  }
}

logSection("OAuth pool account");

await test("OAuth: the thread beta and the thread field reach the upstream", async () => {
  await withOAuthAccount(async () => {
    const seen = await send(THREADS_BETA, true);
    assert(
      seen.beta.split(",").includes(THREADS_BETA),
      "the thread beta was dropped for an OAuth account",
    );
    assert(
      JSON.stringify(seen.body.thread) === '{"type":"create"}',
      "the thread field did not reach the upstream",
    );
  });
});

await test("OAuth: a beta the proxy does not know is still dropped", async () => {
  await withOAuthAccount(async () => {
    const seen = await send(`${THREADS_BETA},made-up-beta-2099-01-01`, false);
    assert(
      seen.beta.split(",").includes(THREADS_BETA),
      "the thread beta was dropped alongside the unknown one",
    );
    assert(
      !seen.beta.includes("made-up-beta-2099-01-01"),
      "an unknown beta was forwarded to the upstream",
    );
  });
});

await test("OAuth: a beta captured from a Claude Code request is not replayed to another client", async () => {
  await withOAuthAccount(async () => {
    await send(THREADS_BETA, true, {
      "user-agent": "claude-cli/2.1.0 (external, cli)",
      "x-claude-code-session-id": "11111111-1111-4111-8111-111111111111",
    });
    const later = await send(undefined, false);
    assert(
      !later.beta.split(",").includes(THREADS_BETA),
      "a later client without the beta inherited it from the snapshot",
    );
  });
});

await test("OAuth, stream: true: the thread beta and the thread field reach the upstream", async () => {
  await withOAuthAccount(async () => {
    const seen = await send(THREADS_BETA, true, {}, true);
    assert(
      seen.body.stream === true,
      "the request did not reach the upstream as a stream",
    );
    assert(
      seen.beta.split(",").includes(THREADS_BETA),
      "the thread beta was dropped on a streaming request",
    );
    assert(
      JSON.stringify(seen.body.thread) === '{"type":"create"}',
      "the thread field did not reach the upstream on a streaming request",
    );
  });
});

await test("OAuth, stream: true: an unknown beta is still dropped", async () => {
  await withOAuthAccount(async () => {
    const seen = await send(
      `${THREADS_BETA},made-up-beta-2099-01-01`,
      false,
      {},
      true,
    );
    assert(
      !seen.beta.includes("made-up-beta-2099-01-01"),
      "an unknown beta was forwarded on a streaming request",
    );
  });
});

logSection("API-key pool account");

await test("API key: the thread beta and the thread field reach the upstream", async () => {
  const previous = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = "sk-ant-test-threads-beta";
  try {
    const seen = await send(THREADS_BETA, true);
    assert(
      seen.beta.split(",").includes(THREADS_BETA),
      "the thread beta was dropped for an API-key account",
    );
    assert(
      JSON.stringify(seen.body.thread) === '{"type":"create"}',
      "the thread field did not reach the upstream",
    );
  } finally {
    if (previous === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = previous;
    }
    globalThis.fetch = isolatedFetch;
    __testHooks.clearProviderTransportCoordinatorForTests();
    await resetUsageStatsForTests();
  }
});

await runSuite();
