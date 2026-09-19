/** Audit-only deterministic HTTP fixtures. Temporary HOME, fake credentials,
 * fake provider responses, and OS-selected local ports. No production traffic.
 */
import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
const repo = process.cwd();
await import(repo + "/test/helpers/proxyTestIsolation.ts");
for (const name of Object.keys(process.env)) {
  if (name.startsWith("OTEL_")) {
    delete process.env[name];
  }
}
process.env.NEUROLINK_PROXY_LOG_SINK = "disk";
const { createProxyStartApp } = await import(
  repo + "/src/cli/commands/proxy.ts"
);
const { tokenStore } = await import(repo + "/src/lib/auth/tokenStore.ts");
const logs = await import(repo + "/src/lib/proxy/requestLogger.ts");
const life = await import(repo + "/src/lib/proxy/proxyLifecycle.ts");
const activity = await import(repo + "/src/lib/proxy/proxyActivity.ts");
const { serve } = await import(
  repo + "/node_modules/@hono/node-server/dist/index.mjs"
);
const results = [];
const encoder = new TextEncoder();
const sse = (type: string, data: Record<string, unknown> = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const start = sse("message_start", {
  message: {
    id: "fixture",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content: [],
    usage: { input_tokens: 10, output_tokens: 0 },
  },
});
const end =
  sse("content_block_start", {
    index: 0,
    content_block: { type: "text", text: "" },
  }) +
  sse("content_block_delta", {
    index: 0,
    delta: { type: "text_delta", text: "fixture output" },
  }) +
  sse("content_block_stop", { index: 0 }) +
  sse("message_delta", {
    delta: { stop_reason: "end_turn" },
    usage: { output_tokens: 3 },
  }) +
  sse("message_stop");
await tokenStore.saveTokens("anthropic:audit@example.test", {
  accessToken: "isolated-fixture",
  tokenType: "Bearer",
  expiresAt: Date.now() + 3600000,
});
const originalFetch = globalThis.fetch;
async function eventually(fn: () => boolean, ms = 2000) {
  const deadline = Date.now() + ms;
  while (!fn() && Date.now() < deadline) {
    await delay(10);
  }
  return fn();
}
for (const scenario of [
  "preheaders-disconnect",
  "stream-disconnect",
  "stream-upstream-error",
  "success",
]) {
  const dir = process.env.HOME + "/" + scenario;
  mkdirSync(dir);
  logs.initRequestLogger(true, dir);
  let upstreamInit: RequestInit | undefined;
  let releaseFetch: (() => void) | undefined;
  let source: ReadableStreamDefaultController<Uint8Array> | undefined;
  let upstreamCancelled = false;
  let calls = 0;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (
      url.hostname !== "api.anthropic.com" ||
      !url.pathname.endsWith("/messages")
    ) {
      return new Response("{}", { status: 404 });
    }
    calls++;
    upstreamInit = init;
    if (scenario === "preheaders-disconnect") {
      return await new Promise((resolve) => {
        releaseFetch = () =>
          resolve(
            new Response(start + end, {
              headers: { "content-type": "text/event-stream" },
            }),
          );
      });
    }
    if (scenario === "success") {
      return new Response(start + end, {
        headers: { "content-type": "text/event-stream" },
      });
    }
    return new Response(
      new ReadableStream({
        start(c) {
          source = c;
          c.enqueue(encoder.encode(start));
        },
        cancel() {
          upstreamCancelled = true;
        },
      }),
      { headers: { "content-type": "text/event-stream" } },
    );
  };
  const { app } = await createProxyStartApp({
    neurolink: { getToolRegistry: () => ({}) },
    modelRouter: undefined,
    strategy: "fill-first",
    passthrough: false,
    port: 0,
    host: "127.0.0.1",
    proxyConfig: null,
    primaryAccountKey: undefined,
    accountAllowlist: new Set(["anthropic:audit@example.test"]),
  });
  const server = serve({ fetch: app.fetch, hostname: "127.0.0.1", port: 0 });
  await eventually(() => !!server.address());
  const port = server.address().port;
  let received = 0,
    clientEnded = false,
    clientError;
  const req = httpRequest(
    {
      hostname: "127.0.0.1",
      port,
      path: "/v1/messages",
      method: "POST",
      headers: { "content-type": "application/json" },
    },
    (res) => {
      res.on("data", (chunk) => {
        received += chunk.length;
        if (scenario === "stream-disconnect") {
          req.destroy();
        }
      });
      res.on("end", () => (clientEnded = true));
      res.on("error", (e) => (clientError = (e as NodeJS.ErrnoException).code));
    },
  );
  req.on("error", (e) => (clientError = (e as NodeJS.ErrnoException).code));
  req.end(
    JSON.stringify({
      model: "claude-sonnet-5",
      stream: true,
      max_tokens: 128,
      messages: [{ role: "user", content: "fixture" }],
    }),
  );
  await eventually(() => calls > 0);
  const row: {
    scenario: string;
    localPort: number;
    upstreamAbortedAfterClientDisconnect?: boolean;
    activeBeforeProviderRelease?: number;
    calls?: number;
    bytesReceived?: number;
    clientEnded?: boolean;
    clientError?: string;
    upstreamCancelled?: boolean;
    activeAfter?: number;
    finalOutcomes?: Array<{
      outcome: string;
      status: number;
      errorType?: string;
    }>;
    terminals?: Array<{
      outcome: string;
      telemetryStatus?: string;
      transportOutcome?: string;
    }>;
  } = { scenario, localPort: port };
  if (scenario === "preheaders-disconnect") {
    req.destroy();
    await delay(100);
    assert.ok(upstreamInit);
    row.upstreamAbortedAfterClientDisconnect = upstreamInit.signal?.aborted;
    assert.equal(
      row.upstreamAbortedAfterClientDisconnect,
      true,
      "pre-header peer close aborts upstream",
    );
    row.activeBeforeProviderRelease =
      activity.getProxyActivitySnapshot().activeRequests;
    assert.equal(
      row.activeBeforeProviderRelease,
      0,
      "pre-header close releases admission before provider settles",
    );
    assert.ok(releaseFetch);
    releaseFetch();
  } else if (scenario === "stream-upstream-error") {
    await eventually(() => received > 0);
    assert.ok(source);
    source.error(new Error("fixture upstream socket closed"));
  }
  await eventually(
    () => activity.getProxyActivitySnapshot().activeRequests === 0,
  );
  await logs.flushRequestLogs();
  await life.flushProxyLifecycleEvents();
  const read = (prefix: string) =>
    readdirSync(dir)
      .filter((n) =>
        prefix === "request_final"
          ? /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(n)
          : n.startsWith(prefix),
      )
      .flatMap((n) =>
        readFileSync(dir + "/" + n, "utf8")
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((x) => JSON.parse(x)),
      );
  const finals = read("request_final");
  const lifecycle = read("proxy-lifecycle-");
  row.calls = calls;
  row.bytesReceived = received;
  row.clientEnded = clientEnded;
  row.clientError = clientError;
  row.upstreamCancelled = upstreamCancelled;
  row.finalOutcomes = finals.map((x) => ({
    outcome: x.terminalOutcome,
    status: x.responseStatus,
    errorType: x.errorType,
  }));
  row.terminals = lifecycle
    .filter((x) => x.event === "request_terminal")
    .map((x) => ({
      outcome: x.terminalOutcome,
      telemetryStatus: x.telemetryStatus,
      transportOutcome: x.transportOutcome,
    }));
  row.activeAfter = activity.getProxyActivitySnapshot().activeRequests;
  results.push(row);
  assert.equal(row.activeAfter, 0);
  assert.equal(row.terminals.length, 1);
  assert.equal(row.finalOutcomes.length, 1);
  assert.equal(
    row.terminals[0].outcome,
    scenario === "success"
      ? "completed"
      : scenario === "stream-upstream-error"
        ? "stream_error"
        : "client_cancelled",
  );
  assert.equal(
    row.finalOutcomes[0].outcome,
    scenario === "success"
      ? "completed"
      : scenario === "stream-upstream-error"
        ? "stream_error"
        : "client_cancelled",
  );
  logs.initRequestLogger(false);
  req.destroy();
  server.closeAllConnections?.();
  await new Promise((r) => server.close(r));
  life.resetProxyLifecycleLoggerForTests();
}
globalThis.fetch = originalFetch;
await tokenStore.clearTokens("anthropic:audit@example.test");
console.log(JSON.stringify(results, null, 2));
