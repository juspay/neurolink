#!/usr/bin/env tsx
/**
 * Determinism exception (CLAUDE.md rule 15): delayed and partially successful
 * filesystem writes, recorded upstream stream faults, and terminal-frame close
 * races cannot be produced on demand with a live provider. Fixtures drive the
 * real HTTP application and built analyze CLI in an isolated home. Every
 * provider response is recorded; the installed proxy is never a test target.
 */
import "./helpers/proxyTestIsolation.js";
import { appendFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { assert, assertEqual, defineSuite, runCLI } from "./helpers/harness.js";
import {
  __proxyLifecycleTestHooks,
  configureProxyLifecycleLogger,
  flushProxyLifecycleEvents,
  getProxyLifecycleLoggerSnapshot,
  logProxyLifecycleEvent,
  persistProxyLifecycleAcceptance,
  resetProxyLifecycleLoggerForTests,
} from "../src/lib/proxy/proxyLifecycle.js";
import {
  initRequestLogger,
  cleanupLogsAt,
  logRequest,
  logBodyCapture,
  getRequestLoggerSnapshot,
  flushRequestLogs,
  __requestLoggerTestHooks,
} from "../src/lib/proxy/requestLogger.js";
import { createProxyStartApp } from "../src/cli/commands/proxy.js";
import { getProxyActivitySnapshot } from "../src/lib/proxy/proxyActivity.js";
import { ProxyRuntimeConfigStore } from "../src/lib/proxy/runtimeConfig.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";

import { __bodyCaptureWorkerTestHooks } from "../src/lib/proxy/bodyCaptureWorker.js";
await __bodyCaptureWorkerTestHooks.reset(
  new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
);

const { test, runSuite } = defineSuite("Proxy Telemetry Accuracy", {
  offline: true,
});
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
/**
 * Wait for asynchronous fixture bookkeeping with a bounded, failure-reporting deadline.
 */
async function eventually(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 4_000;
  while (!predicate() && Date.now() < deadline) {
    await pause(5);
  }
  assert(predicate(), "terminal bookkeeping did not settle");
}
async function withWriter(run: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "telemetry-writer-"));
  resetProxyLifecycleLoggerForTests();
  configureProxyLifecycleLogger({
    enabled: true,
    logDir: dir,
    flushIntervalMs: 10_000,
  });
  try {
    await run(dir);
  } finally {
    await flushProxyLifecycleEvents();
    resetProxyLifecycleLoggerForTests();
    await rm(dir, { recursive: true, force: true });
  }
}
function enqueue(id = "one") {
  logProxyLifecycleEvent({
    event: "request_accepted",
    requestId: id,
    method: "POST",
    path: "/v1/messages",
  });
}
/**
 * Read records from one isolated fixture journal using its generated daily filename.
 */
async function lines(
  dir: string,
  prefix: string,
): Promise<Array<Record<string, unknown>>> {
  const file = join(
    dir,
    `${prefix}-${new Date().toISOString().slice(0, 10)}.jsonl`,
  );
  return (await readFile(file, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

await test("a late successful append is never retried while its original write is pending", async () => {
  await withWriter(async (dir) => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    __proxyLifecycleTestHooks.setAppendFileForTests(async (...args) => {
      calls += 1;
      await gate;
      return appendFile(...args);
    });
    enqueue();
    const draining = flushProxyLifecycleEvents();
    await pause(2_100);
    assertEqual(calls, 1, "a pending append was replayed");
    assertEqual(
      getProxyLifecycleLoggerSnapshot().writeTimeouts,
      1,
      "slow write was not visible",
    );
    assertEqual(
      getProxyLifecycleLoggerSnapshot().written,
      0,
      "pending write was reported as confirmed",
    );
    release();
    await draining;
    assertEqual(
      (await lines(dir, "proxy-lifecycle")).length,
      1,
      "late write duplicated a record",
    );
    assertEqual(
      getProxyLifecycleLoggerSnapshot().written,
      1,
      "late completion was not confirmed",
    );
  });
});

await test("an ambiguous append failure retains uncertainty without replaying a committed prefix", async () => {
  await withWriter(async (dir) => {
    let calls = 0;
    __proxyLifecycleTestHooks.setAppendFileForTests(async (...args) => {
      calls += 1;
      await appendFile(...args);
      throw Object.assign(new Error("recorded write fault"), { code: "EIO" });
    });
    enqueue();
    await flushProxyLifecycleEvents();
    assertEqual(calls, 1, "uncertain append was replayed");
    assertEqual(
      (await lines(dir, "proxy-lifecycle")).length,
      1,
      "uncertain write duplicated a record",
    );
    assertEqual(
      getProxyLifecycleLoggerSnapshot().unconfirmedWrites,
      1,
      "uncertain result was hidden",
    );
    assertEqual(
      getProxyLifecycleLoggerSnapshot().written,
      0,
      "uncertain result was claimed as confirmed",
    );
  });
});

await test("a definite open failure can recover without duplicate records", async () => {
  await withWriter(async (dir) => {
    let calls = 0;
    __proxyLifecycleTestHooks.setAppendFileForTests(async (...args) => {
      if (++calls === 1) {
        throw Object.assign(new Error("recorded open fault"), {
          code: "EACCES",
        });
      }
      return appendFile(...args);
    });
    enqueue();
    await flushProxyLifecycleEvents();
    assertEqual(
      (await lines(dir, "proxy-lifecycle")).length,
      1,
      "recovered write was not unique",
    );
    assertEqual(
      getProxyLifecycleLoggerSnapshot().writeRetries,
      1,
      "retry accounting was wrong",
    );
  });
});

await test("a flush deadline preserves ownership and pending counters", async () => {
  await withWriter(async () => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    __proxyLifecycleTestHooks.setAppendFileForTests(async (...args) => {
      await gate;
      return appendFile(...args);
    });
    enqueue();
    let timedOut = false;
    try {
      await flushProxyLifecycleEvents(10);
    } catch {
      timedOut = true;
    }
    assert(timedOut, "flush did not honor its deadline");
    assertEqual(
      getProxyLifecycleLoggerSnapshot().inFlight,
      1,
      "flush discarded a pending write",
    );
    release();
    await flushProxyLifecycleEvents();
  });
  let release = () => {};
  const operation = new Promise<void>((resolve) => {
    release = resolve;
  });
  __requestLoggerTestHooks.trackLogOperation(operation);
  try {
    await flushRequestLogs(10);
  } catch {
    /* expected deadline */
  }
  assertEqual(
    __requestLoggerTestHooks.pendingOperationCount(),
    1,
    "request flush forgot an unsettled operation",
  );
  release();
  await flushRequestLogs();
});

await test("queue pressure is counted without replaying or interleaving metadata", async () => {
  const dir = await mkdtemp(join(tmpdir(), "telemetry-pressure-"));
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  initRequestLogger(true, dir);
  const before = getRequestLoggerSnapshot().requests;
  __requestLoggerTestHooks.setAppendFileForTests(async (...args) => {
    calls += 1;
    await gate;
    if (calls === 1) {
      throw Object.assign(new Error("recorded write fault"), { code: "EIO" });
    }
    return writeFile(...args);
  });
  try {
    const writes = Array.from({ length: 4_100 }, (_, index) =>
      logRequest({
        timestamp: new Date().toISOString(),
        requestId: `pressure-${index}`,
        method: "POST",
        path: "/v1/messages",
        model: "fixture",
        stream: false,
        toolCount: 0,
        account: "fixture",
        accountType: "oauth",
        responseStatus: 200,
        responseTimeMs: 1,
      }),
    );
    await pause(10);
    const pending = getRequestLoggerSnapshot().requests;
    assertEqual(calls, 1, "concurrent metadata writes were not serialized");
    assertEqual(pending.inFlight, 1, "active write count was wrong");
    assertEqual(pending.pending, 4_095, "queued records were not visible");
    assertEqual(
      pending.dropped - before.dropped,
      4,
      "queue overflow was hidden",
    );
    release();
    await Promise.all(writes);
    // This case checks 4,096 real appends and exact queue accounting, not the
    // production shutdown latency budget. Drain them even on a busy CI disk.
    await flushRequestLogs(60_000);
    const after = getRequestLoggerSnapshot().requests;
    assertEqual(
      after.written - before.written,
      4_095,
      "confirmed records were miscounted",
    );
    assertEqual(
      after.unconfirmedWrites - before.unconfirmedWrites,
      1,
      "failed append uncertainty was hidden",
    );
    assertEqual(
      after.inFlight + after.pending,
      0,
      "settled writes remained pending",
    );
    const records = await lines(dir, "proxy");
    assertEqual(
      new Set(records.map((r) => r.requestId)).size,
      4_095,
      "metadata records were duplicated or corrupted",
    );
  } finally {
    release();
    await flushRequestLogs(60_000);
    __requestLoggerTestHooks.restoreAppendFileForTests();
    initRequestLogger(false);
    await rm(dir, { recursive: true, force: true });
  }
});

await test("lifecycle queue overflow preserves its accounting identity", async () => {
  await withWriter(async (dir) => {
    configureProxyLifecycleLogger({
      enabled: true,
      logDir: dir,
      queueCapacity: 2,
      flushIntervalMs: 10_000,
    });
    enqueue("a");
    enqueue("b");
    enqueue("c");
    const snapshot = getProxyLifecycleLoggerSnapshot();
    assertEqual(snapshot.attempted, 3, "admission counter lost events");
    assertEqual(snapshot.queueDrops, 1, "queue loss was hidden");
    await flushProxyLifecycleEvents();
    assertEqual(
      (await lines(dir, "proxy-lifecycle")).length,
      2,
      "admitted records were not retained",
    );
  });
});

/**
 * Drive real proxy HTTP routes with isolated accounts and recorded upstream responses.
 */
async function withHttpFixture(
  provider: "anthropic" | "codex" | "fallback",
  upstream: () => Response,
  run: (response: Response, dir: string) => Promise<void>,
  requestPath?: string,
  additionalCodexAccount = false,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "telemetry-http-"));
  const key = `${provider === "fallback" ? "codex" : provider}:telemetry@example.test`;
  const secondKey = "codex:z-telemetry@example.test";
  const oldFetch = globalThis.fetch;
  initRequestLogger(true, dir);
  if (additionalCodexAccount) {
    await tokenStore.saveTokens(secondKey, {
      accessToken: "isolated-second-fixture",
      tokenType: "Bearer",
      expiresAt: Date.now() + 3_600_000,
    });
  }
  await tokenStore.saveTokens(key, {
    accessToken: "isolated-fixture",
    tokenType: "Bearer",
    expiresAt: Date.now() + 3_600_000,
  });
  globalThis.fetch = async (input) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    if (
      (url.hostname === "api.anthropic.com" &&
        url.pathname.endsWith("/messages")) ||
      (url.hostname === "chatgpt.com" && url.pathname.endsWith("/responses"))
    ) {
      return upstream();
    }
    return new Response("{}", {
      status: 404,
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const configPath = join(dir, "fixture-config.json");
    if (provider === "fallback") {
      await writeFile(
        configPath,
        JSON.stringify({
          routing: {
            fallbackChain: [
              {
                provider: "codex",
                model: "gpt-6-astra",
                reasoningEffort: "xhigh",
              },
            ],
          },
        }),
      );
    }
    const runtimeConfigStore =
      provider === "fallback"
        ? await ProxyRuntimeConfigStore.create({
            configPath,
            configRequired: true,
            baseEnv: {},
            passthrough: false,
          })
        : undefined;
    const { app } = await createProxyStartApp({
      runtimeConfigStore,
      neurolink: { getToolRegistry: () => ({}) } as Parameters<
        typeof createProxyStartApp
      >[0]["neurolink"],
      modelRouter: undefined,
      strategy: "fill-first",
      passthrough: false,
      port: 0,
      host: "127.0.0.1",
      proxyConfig:
        provider === "fallback"
          ? {
              routing: {
                fallbackChain: [
                  {
                    provider: "codex",
                    model: "gpt-6-astra",
                    reasoningEffort: "xhigh",
                  },
                ],
              },
            }
          : null,
      primaryAccountKey: undefined,
      accountAllowlist: new Set(
        additionalCodexAccount ? [key, secondKey] : [key],
      ),
    });
    const path =
      requestPath ??
      (provider !== "codex" ? "/v1/messages" : "/backend-api/codex/responses");
    const body =
      provider !== "codex"
        ? {
            model: "claude-sonnet-5",
            stream: true,
            max_tokens: 128,
            messages: [{ role: "user", content: "fixture" }],
          }
        : {
            model: "gpt-6-astra",
            stream: true,
            reasoning: { effort: "xhigh" },
            input: [],
          };
    const response = await app.request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    await run(response, dir);
  } finally {
    globalThis.fetch = oldFetch;
    await eventually(() => getProxyActivitySnapshot().activeRequests === 0);
    await flushRequestLogs();
    await flushProxyLifecycleEvents();
    initRequestLogger(false);
    await tokenStore.clearTokens(key);
    if (additionalCodexAccount) {
      await tokenStore.clearTokens(secondKey);
    }
    await rm(dir, { recursive: true, force: true });
  }
}
/**
 * Flush fixture bookkeeping and read final and lifecycle records after response consumption.
 */
async function recordsAfterBody(dir: string) {
  await eventually(() => getProxyActivitySnapshot().activeRequests === 0);
  await flushRequestLogs();
  await flushProxyLifecycleEvents();
  return {
    finals: await lines(dir, "proxy"),
    terminals: (await lines(dir, "proxy-lifecycle")).filter(
      (r) => r.event === "request_terminal",
    ),
  };
}
const sse = (type: string, data: Record<string, unknown> = {}) =>
  `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
const encoder = new TextEncoder();

await test("HTTP Anthropic mid-stream read failure has one matching semantic outcome", async () => {
  await withHttpFixture(
    "anthropic",
    () => {
      let read = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (read++ === 0) {
              controller.enqueue(
                encoder.encode(
                  sse("message_start", {
                    message: {
                      id: "fixture",
                      model: "claude-sonnet-5",
                      usage: { input_tokens: 3 },
                    },
                  }),
                ),
              );
            } else {
              controller.error(
                Object.assign(new Error("recorded stream read fault"), {
                  code: "ETIMEDOUT",
                }),
              );
            }
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      );
    },
    async (response, dir) => {
      assertEqual(
        response.status,
        200,
        "fixture did not commit response headers",
      );
      await response.text();
      const { finals, terminals } = await recordsAfterBody(dir);
      assertEqual(finals.length, 1, "final accounting was not unique");
      assertEqual(terminals.length, 1, "lifecycle accounting was not unique");
      assertEqual(
        finals[0].responseStatus,
        502,
        "final accounting lost the stream failure",
      );
      assertEqual(
        terminals[0].terminalOutcome,
        "stream_error",
        "lifecycle claimed successful completion",
      );
      assertEqual(terminals[0].finalStatus, 502, "semantic status was lost");
      assertEqual(
        terminals[0].responseStatus,
        200,
        "committed wire status was rewritten",
      );
    },
  );
});

for (const [name, body] of [
  [
    "in-band failure",
    sse("response.failed", {
      response: { error: { code: "fixture", message: "recorded refusal" } },
    }),
  ],
  [
    "truncated response",
    sse("response.output_text.delta", { delta: "partial" }),
  ],
] as const) {
  await test(`HTTP Codex ${name} is not counted as successful transport EOF`, async () => {
    await withHttpFixture(
      "codex",
      () =>
        new Response(body, {
          headers: { "content-type": "text/event-stream" },
        }),
      async (response, dir) => {
        await response.text();
        const { finals, terminals } = await recordsAfterBody(dir);
        assertEqual(
          finals[0].responseStatus,
          502,
          "protocol failure was counted as success",
        );
        assertEqual(
          terminals[0].terminalOutcome,
          "stream_error",
          "lifecycle lost the protocol failure",
        );
      },
    );
  });
}

await test("HTTP Codex empty body and an unterminated completion frame remain failures", async () => {
  for (const body of [null, 'data: {"type":"response.completed"}\n']) {
    await withHttpFixture(
      "codex",
      () => new Response(body),
      async (response, dir) => {
        await response.text();
        const { finals, terminals } = await recordsAfterBody(dir);
        assertEqual(
          finals[0].responseStatus,
          502,
          "missing protocol completion became success",
        );
        assertEqual(
          terminals[0].terminalOutcome,
          "stream_error",
          "missing completion evidence was lost",
        );
      },
    );
  }
});

await test("HTTP Codex split multiline CRLF frames retain usage and precise provider cause", async () => {
  const body =
    'event:response.failed\r\ndata: {"type":"response.failed",\r\ndata: "response":{"error":{"code":"fixture_cause","message":"recorded refusal"},"usage":{"input_tokens":3,"output_tokens":1}}}\r\n\r\n';
  await withHttpFixture(
    "codex",
    () => {
      let offset = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (offset >= body.length) {
              controller.close();
              return;
            }
            controller.enqueue(encoder.encode(body.slice(offset, offset + 7)));
            offset += 7;
          },
        }),
      );
    },
    async (response, dir) => {
      assertEqual(await response.text(), body, "relay changed recorded bytes");
      const { finals } = await recordsAfterBody(dir);
      assertEqual(
        finals[0].errorCode,
        "fixture_cause",
        "provider cause was replaced by a generic category",
      );
      assertEqual(finals[0].inputTokens, 3, "multiline usage was lost");
      const attempts = await lines(dir, "proxy-attempts");
      assertEqual(
        attempts.length,
        2,
        "attempt completion evidence was missing",
      );
      assertEqual(
        attempts[1].errorCode,
        "fixture_cause",
        "attempt cause was missing",
      );
    },
  );
});

for (const provider of ["codex", "anthropic"] as const) {
  await test(`HTTP ${provider} cancellation before completion stays a cancellation`, async () => {
    await withHttpFixture(
      provider,
      () =>
        new Response(
          new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(
                encoder.encode(
                  provider === "codex"
                    ? sse("response.output_text.delta", { delta: "partial" })
                    : sse("message_start", {
                        message: {
                          id: "fixture",
                          model: "claude-sonnet-5",
                          usage: { input_tokens: 3 },
                        },
                      }),
                ),
              );
            },
          }),
        ),
      async (response, dir) => {
        const reader = response.body!.getReader();
        const first = await reader.read();
        assert(!first.done, "fixture did not deliver any response bytes");
        await reader.cancel();
        const { finals, terminals } = await recordsAfterBody(dir);
        assertEqual(
          finals.length,
          1,
          "cancellation had no unique final record",
        );
        assertEqual(
          finals[0].responseStatus,
          499,
          "early close became successful completion",
        );
        assertEqual(
          terminals[0].terminalOutcome,
          "client_cancelled",
          "lifecycle lost cancellation",
        );
      },
    );
  });
}

await test("HTTP Codex upstream read errors retain their transport code", async () => {
  await withHttpFixture(
    "codex",
    () => {
      let reads = 0;
      return new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            if (reads++ === 0) {
              controller.enqueue(
                encoder.encode(
                  sse("response.output_text.delta", { delta: "partial" }),
                ),
              );
            } else {
              controller.error(
                Object.assign(new Error("recorded read fault"), {
                  code: "ECONNRESET",
                }),
              );
            }
          },
        }),
      );
    },
    async (response, dir) => {
      let rejected = false;
      try {
        await response.text();
      } catch {
        rejected = true;
      }
      assert(rejected, "fixture failed to exercise a read fault");
      const { finals, terminals } = await recordsAfterBody(dir);
      assertEqual(
        finals[0].errorCode,
        "ECONNRESET",
        "transport code was discarded",
      );
      assertEqual(
        terminals[0].errorCode,
        "ECONNRESET",
        "lifecycle discarded transport code",
      );
    },
  );
});

await test("HTTP Codex close after its completion frame records success exactly once", async () => {
  const body =
    sse("response.output_text.delta", { delta: "done" }) +
    sse("response.completed", {
      response: { usage: { input_tokens: 3, output_tokens: 1 } },
    });
  await withHttpFixture(
    "codex",
    () =>
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(encoder.encode(body));
          },
        }),
        { headers: { "content-type": "text/event-stream" } },
      ),
    async (response, dir) => {
      const reader = response.body!.getReader();
      await reader.read();
      await reader.cancel();
      const { finals, terminals } = await recordsAfterBody(dir);
      assertEqual(finals.length, 1, "final accounting was duplicated");
      assertEqual(
        finals[0].responseStatus,
        200,
        "terminal frame close was counted as cancellation",
      );
      assertEqual(
        terminals[0].terminalOutcome,
        "completed",
        "lifecycle disagreed with terminal frame delivery",
      );
      assert(
        typeof finals[0].firstUsefulOutputMs === "number",
        "useful output timing was not retained",
      );
      const attempts = await lines(dir, "proxy-attempts");
      assertEqual(
        attempts[0].reasoningEffort,
        "xhigh",
        "effort required a retained body to reconstruct",
      );
    },
  );
});

await test("HTTP Claude fallback retains Astra effort, parent identity, and child stream failure", async () => {
  const body =
    sse("response.output_text.delta", { delta: "partial" }) +
    sse("response.failed", {
      response: {
        error: { code: "fixture_cause", message: "recorded refusal" },
      },
    });
  await withHttpFixture(
    "fallback",
    () =>
      new Response(body, { headers: { "content-type": "text/event-stream" } }),
    async (response, dir) => {
      await response.text();
      const { finals, terminals } = await recordsAfterBody(dir);
      assertEqual(
        finals.length,
        1,
        "fallback created more than one client final",
      );
      assertEqual(
        finals[0].responseStatus,
        502,
        "fallback stream failure became success",
      );
      assertEqual(
        terminals[0].terminalOutcome,
        "stream_error",
        "fallback lifecycle lost the stream failure",
      );
      const attempts = await lines(dir, "proxy-attempts");
      const child = attempts.find(
        (record) => record.errorCode === "fixture_cause",
      );
      assert(child !== undefined, "child attempt terminal evidence was lost");
      assertEqual(
        child?.parentRequestId,
        finals[0].requestId,
        "child attempt was orphaned",
      );
      assertEqual(
        child?.model,
        "gpt-6-astra",
        "attempt lost the selected model",
      );
      assertEqual(
        child?.reasoningEffort,
        "xhigh",
        "attempt lost the selected effort",
      );
      const plan = finals[0].fallbackPlan as Array<Record<string, unknown>>;
      assert(
        plan.some(
          (entry) =>
            entry.model === "gpt-6-astra" && entry.reasoningEffort === "xhigh",
        ),
        "fallback plan required a retained body",
      );
    },
  );
});

await test("slow final metadata I/O cannot inflate relay latency or change model success", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  __requestLoggerTestHooks.setAppendFileForTests(async (...args) => {
    await gate;
    return writeFile(...args);
  });
  try {
    await withHttpFixture(
      "codex",
      () => new Response(sse("response.completed")),
      async (response, dir) => {
        const start = performance.now();
        await response.text();
        assert(
          performance.now() - start < 1_000,
          "metadata delayed response EOF",
        );
        await eventually(() => getProxyActivitySnapshot().activeRequests === 0);
        release();
        const { finals, terminals } = await recordsAfterBody(dir);
        assertEqual(
          finals[0].responseStatus,
          200,
          "slow logging changed model success",
        );
        assertEqual(
          terminals[0].telemetryStatus,
          "timeout",
          "bookkeeping delay was hidden",
        );
        assertEqual(
          terminals[0].errorType,
          undefined,
          "logging delay became a provider error",
        );
        assert(
          Number(terminals[0].elapsedMs) < 1_000,
          "relay latency included log I/O",
        );
      },
    );
  } finally {
    release();
    __requestLoggerTestHooks.restoreAppendFileForTests();
  }
});

await test("built analyze reconciles failures, deduplicates timings, and joins fallback attempts", async () => {
  const dir = await mkdtemp(join(tmpdir(), "telemetry-analysis-"));
  const timestamp = "2026-01-01T00:00:05.000Z";
  const common = {
    schemaVersion: 1,
    timestamp,
    processInstanceId: "fixture",
    method: "POST",
    path: "/v1/messages",
  };
  const terminal = {
    ...common,
    requestId: "failed",
    sequence: 2,
    event: "request_terminal",
    terminalOutcome: "completed",
    responseStatus: 200,
    elapsedMs: 20,
  };
  const lifecycle = [
    { ...common, requestId: "failed", sequence: 1, event: "request_accepted" },
    terminal,
    terminal,
    { ...terminal, elapsedMs: 999 },
    { ...common, requestId: "missing", sequence: 3, event: "request_accepted" },
    {
      ...common,
      requestId: "missing",
      sequence: 4,
      event: "request_terminal",
      terminalOutcome: "completed",
      elapsedMs: 30,
    },
    {
      ...common,
      requestId: "recovered",
      sequence: 5,
      event: "request_accepted",
    },
    {
      ...common,
      requestId: "recovered",
      timestamp: "2026-01-02T00:00:05.000Z",
      sequence: 6,
      event: "request_terminal",
      terminalOutcome: "completed",
      elapsedMs: 40,
    },
  ];
  const finals = [
    {
      ...common,
      requestId: "failed",
      responseStatus: 502,
      errorType: "stream_error",
      responseTimeMs: 20,
    },
    {
      ...common,
      requestId: "recovered",
      timestamp: "2026-01-02T00:00:05.000Z",
      responseStatus: 200,
      responseTimeMs: 40,
      firstUsefulOutputMs: 25,
    },
  ];
  const child = {
    timestamp: "2026-01-02T00:00:05.000Z",
    requestId: "recovered:codex-fallback",
    parentRequestId: "recovered",
    attempt: 1,
    responseStatus: 200,
    attemptDurationMs: 8,
  };
  try {
    await writeFile(
      join(dir, "proxy-lifecycle-2026-01-01.jsonl"),
      lifecycle.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
    await writeFile(
      join(dir, "proxy-2026-01-01.jsonl"),
      finals.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
    await writeFile(
      join(dir, "proxy-attempts-2026-01-01.jsonl"),
      [
        {
          timestamp,
          requestId: "recovered",
          attempt: 1,
          responseStatus: 502,
          errorType: "network_error",
        },
        child,
        child,
      ]
        .map((r) => JSON.stringify(r))
        .join("\n") + "\n",
    );
    const result = await runCLI([
      "proxy",
      "analyze",
      "--logs-dir",
      dir,
      "--since",
      "2026-01-01T00:00:00Z",
      "--until",
      "2026-01-01T00:01:00Z",
      "--format",
      "json",
    ]);
    assertEqual(result.exitCode, 0, "analysis command failed");
    const report = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
    assertEqual(
      report.lifecycle.terminalOutcomes.stream_error,
      1,
      "semantic failure was hidden",
    );
    assertEqual(
      report.lifecycle.terminalOutcomes.unknown,
      1,
      "missing final evidence became success",
    );
    assertEqual(
      report.latencyMs.terminal.count,
      2,
      "duplicate events biased latency",
    );
    assertEqual(
      report.requests.recoveredAfterRetry,
      1,
      "fallback recovery was not joined to its parent",
    );
    assertEqual(report.attempts.total, 2, "repeated attempt was counted twice");
    assertEqual(
      report.dataQuality.conflictingLifecycleDuplicates,
      1,
      "conflicting duplicate payloads were hidden",
    );
    assertEqual(
      report.dataQuality.finalOutcomeConflicts,
      1,
      "conflicting sources were hidden",
    );
    assertEqual(
      report.latencyMs.firstUsefulOutput.p50,
      25,
      "useful output timing was lost",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("token counting completes HTTP telemetry without requiring a model final", async () => {
  await withHttpFixture(
    "anthropic",
    () => {
      throw new Error("token counting unexpectedly called inference");
    },
    async (response, dir) => {
      assertEqual(response.status, 200);
      await response.text();
      await eventually(() => getProxyActivitySnapshot().activeRequests === 0);
      await flushProxyLifecycleEvents();
      const terminals = (await lines(dir, "proxy-lifecycle")).filter(
        (r) => r.event === "request_terminal",
      );
      assertEqual(terminals.length, 1);
      assertEqual(terminals[0].terminalOutcome, "completed");
      assertEqual(terminals[0].telemetryStatus, "complete");
      assertEqual(terminals[0].outcomeSource, "http_status");
    },
    "/v1/messages/count_tokens",
  );
});

await test("bounded analysis audits intervening sequences without admitting excluded requests", async () => {
  const dir = await mkdtemp(join(tmpdir(), "telemetry-window-"));
  const common = {
    schemaVersion: 1,
    processInstanceId: "window",
    method: "POST",
    path: "/v1/messages",
  };
  /** Build a journal record with independently controlled time, sequence, and request identity. */
  const event = (
    sequence: number,
    seconds: number,
    requestId: string,
    kind: string,
  ) => ({
    ...common,
    sequence,
    timestamp: `2026-01-01T00:00:${String(seconds).padStart(2, "0")}.000Z`,
    requestId,
    event: kind,
  });
  try {
    await writeFile(
      join(dir, "proxy-lifecycle-2026-01-01.jsonl"),
      [
        event(1, 1, "old", "request_accepted"),
        event(100, 5, "selected", "request_accepted"),
        event(101, 20, "excluded", "request_accepted"),
        {
          ...event(102, 21, "excluded", "request_terminal"),
          terminalOutcome: "completed",
          responseStatus: 200,
        },
        event(103, 22, "selected", "response_headers"),
        // 104 is a real absent journal record; 101 and 102 are retained.
        {
          ...event(105, 23, "selected", "request_terminal"),
          terminalOutcome: "completed",
          responseStatus: 200,
        },
        event(200, 24, "later", "request_accepted"),
      ]
        .map((r) => JSON.stringify(r))
        .join("\n") + "\n",
    );
    await writeFile(
      join(dir, "proxy-2026-01-01.jsonl"),
      JSON.stringify({
        timestamp: "2026-01-01T00:00:23.000Z",
        requestId: "selected",
        method: "POST",
        responseStatus: 200,
        responseTimeMs: 18000,
      }) + "\n",
    );
    const result = await runCLI([
      "proxy",
      "analyze",
      "--logs-dir",
      dir,
      "--since",
      "2026-01-01T00:00:04Z",
      "--until",
      "2026-01-01T00:00:10Z",
      "--format",
      "json",
    ]);
    assertEqual(result.exitCode, 0);
    const report = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
    assertEqual(
      report.lifecycle.accepted,
      1,
      "excluded requests entered the cohort",
    );
    assertEqual(report.lifecycle.terminal, 1, "follow-up terminal was lost");
    assertEqual(
      report.requests.success,
      1,
      "follow-up final was not reconciled",
    );
    assertEqual(
      report.dataQuality.lifecycleSequenceGaps,
      1,
      "filtering invented gaps or hid a real gap",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("analysis separates auxiliary HTTP outcomes from missing inference finals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "telemetry-auxiliary-"));
  const common = {
    schemaVersion: 1,
    processInstanceId: "auxiliary",
    timestamp: "2026-01-01T00:00:05.000Z",
  };
  const endpoints = [
    {
      requestId: "tokens",
      method: "POST",
      path: "/v1/messages/count_tokens",
      responseStatus: 200,
    },
    {
      requestId: "models",
      method: "GET",
      path: "/backend-api/codex/models",
      responseStatus: 503,
    },
    {
      requestId: "inference",
      method: "POST",
      path: "/v1/messages",
      responseStatus: 200,
    },
    {
      requestId: "cancelled-models",
      method: "GET",
      path: "/v1/models",
      responseStatus: 200,
    },
  ];
  try {
    const rows = endpoints.flatMap((endpoint, i) => [
      {
        ...common,
        ...endpoint,
        sequence: i * 2 + 1,
        event: "request_accepted",
      },
      {
        ...common,
        ...endpoint,
        sequence: i * 2 + 2,
        event: "request_terminal",
        terminalOutcome: "unknown",
        telemetryStatus: "missing_final",
        transportOutcome:
          endpoint.requestId === "cancelled-models"
            ? "client_cancelled"
            : "completed",
      },
    ]);
    await writeFile(
      join(dir, "proxy-lifecycle-2026-01-01.jsonl"),
      rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    );
    const result = await runCLI([
      "proxy",
      "analyze",
      "--logs-dir",
      dir,
      "--since",
      "2026-01-01T00:00:00Z",
      "--until",
      "2026-01-01T00:01:00Z",
      "--format",
      "json",
    ]);
    assertEqual(result.exitCode, 0);
    const report = JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
    assertEqual(report.lifecycle.auxiliaryRequests, 3);
    assertEqual(report.lifecycle.terminalOutcomes.completed, 1);
    assertEqual(
      report.lifecycle.terminalOutcomes.handler_error,
      1,
      "auxiliary HTTP failure was hidden",
    );
    assertEqual(
      report.lifecycle.terminalOutcomes.client_cancelled,
      1,
      "auxiliary cancellation became success",
    );
    assertEqual(
      report.lifecycle.terminalOutcomes.unknown,
      1,
      "inference without a final became success",
    );
    assertEqual(
      report.requests.success,
      0,
      "metadata requests inflated model successes",
    );
    assertEqual(report.dataQuality.acceptedWithoutFinal, 1);
    assertEqual(report.dataQuality.terminalWithoutFinal, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("HTTP admission waits for its append before dispatching any upstream work", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let upstreamCalls = 0;
  __proxyLifecycleTestHooks.setAppendFileForTests(async (...args) => {
    await gate;
    return appendFile(...args);
  });
  const exercise = withHttpFixture(
    "codex",
    () => {
      upstreamCalls += 1;
      return new Response(
        sse("response.completed", {
          response: { status: "completed", output: [] },
        }),
      );
    },
    async (response, dir) => {
      await response.text();
      assertEqual(upstreamCalls, 1);
      const admitted = (await lines(dir, "proxy-lifecycle")).filter(
        (r) => r.event === "request_accepted",
      );
      assertEqual(admitted.length, 1);
    },
  );
  try {
    await pause(100);
    assertEqual(
      upstreamCalls,
      0,
      "provider dispatch escaped the journal barrier",
    );
    release();
    await exercise;
  } finally {
    release();
    __proxyLifecycleTestHooks.setAppendFileForTests(appendFile);
    await exercise;
  }
});

await test("HTTP admission returns a classified 503 when its enabled journal cannot write", async () => {
  let calls = 0;
  __proxyLifecycleTestHooks.setAppendFileForTests(async () => {
    throw Object.assign(new Error("fixture permission denied"), {
      code: "EACCES",
    });
  });
  try {
    await withHttpFixture(
      "codex",
      () => {
        calls += 1;
        return new Response();
      },
      async (response, dir) => {
        await response.text();
        assertEqual(response.status, 503, "unrecorded work was admitted");
        assertEqual(calls, 0);
        await flushRequestLogs();
        const finals = await lines(dir, "proxy");
        assertEqual(finals.length, 1);
        assertEqual(finals[0].errorCode, "PROXY_TELEMETRY_UNAVAILABLE");
      },
    );
  } finally {
    __proxyLifecycleTestHooks.setAppendFileForTests(appendFile);
  }
});

await test("an admission barrier settles independently of later traffic and never replays an uncertain append", async () => {
  await withWriter(async (dir) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let writes = 0;
    __proxyLifecycleTestHooks.setAppendFileForTests(async (...args) => {
      if (++writes > 1) {
        await gate;
      }
      return appendFile(...args);
    });
    await persistProxyLifecycleAcceptance({
      requestId: "first",
      method: "POST",
      path: "/v1/messages",
    });
    const later = persistProxyLifecycleAcceptance(
      { requestId: "later", method: "POST", path: "/v1/messages" },
      30,
    ).then(
      () => false,
      () => true,
    );
    try {
      assert(await later, "a pending admission did not respect its deadline");
      assertEqual(writes, 2);
    } finally {
      release();
    }
    await flushProxyLifecycleEvents();
    const records = await lines(dir, "proxy-lifecycle");
    assertEqual(records.length, 2, "timed-out append was replayed");
  });
});

await test("bulk captures remain redacted, byte bounded and reconstructable in the shipped worker", async () => {
  const { gunzipSync } = await import("node:zlib");
  const { createHash } = await import("node:crypto");
  const dir = await mkdtemp(join(tmpdir(), "body-worker-"));
  await __bodyCaptureWorkerTestHooks.reset(
    new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
  );
  initRequestLogger(true, dir);
  try {
    await logBodyCapture({
      timestamp: new Date().toISOString(),
      requestId: "large",
      phase: "client_request",
      model: "fixture",
      stream: false,
      headers: { authorization: "secret-header" },
      body: { api_key: "secret-body", text: "🙂".repeat(280_000) },
    });
    await flushRequestLogs();
    const [index] = await lines(dir, "proxy-debug");
    assert(!index.bodyWriteFailed, "worker capture failed");
    assertEqual(index.bodyTruncated, true);
    assertEqual(index.bodyCaptureLimitBytes, 1024 * 1024);
    assertEqual(
      index.originalRedactedBodyBytes,
      Buffer.byteLength(
        JSON.stringify({ api_key: "[REDACTED]", text: "🙂".repeat(280_000) }),
      ),
    );
    const artifact = JSON.parse(
      gunzipSync(await readFile(String(index.bodyPath))).toString(),
    );
    assert(
      !artifact.body.includes("secret-body") &&
        !JSON.stringify(artifact.headers).includes("secret-header"),
      "redaction regressed",
    );
    assert(!artifact.body.includes("�"), "UTF-8 truncation split a code point");
    assert(
      Buffer.byteLength(artifact.body) <= 1024 * 1024,
      "captured artifact exceeded its byte limit",
    );
    assertEqual(
      createHash("sha256").update(artifact.body).digest("hex"),
      index.bodySha256,
    );
    assertEqual(getRequestLoggerSnapshot().bodyCapture?.completed, 1);
    assert(
      typeof index.captureProcessingMs === "number" &&
        typeof index.captureQueueWaitMs === "number",
      "capture timings were not recorded",
    );
  } finally {
    await flushRequestLogs();
    initRequestLogger(false);
    await __bodyCaptureWorkerTestHooks.reset(
      new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
    );
    await rm(dir, { recursive: true, force: true });
  }
});

await test("capture pressure and worker failure preserve exact accounting and visible index failures", async () => {
  const dir = await mkdtemp(join(tmpdir(), "body-pressure-"));
  // A missing worker file provokes a real child-thread failure after admission.
  await __bodyCaptureWorkerTestHooks.reset(
    new URL("./fixtures/missing-body-worker.js", import.meta.url),
  );
  initRequestLogger(true, dir);
  try {
    const tasks = Array.from({ length: 24 }, (_, i) =>
      logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: `pressure-${i}`,
        phase: "client_request",
        model: "fixture",
        stream: false,
        body: "bounded fixture",
      }),
    );
    const queued = getRequestLoggerSnapshot().bodyCapture!;
    assertEqual(queued.pending, 16);
    assertEqual(queued.rejected, 8);
    assert(
      queued.pendingBytes <= queued.maxPendingBytes,
      "capture queue exceeded its byte budget",
    );
    await Promise.all(tasks);
    await flushRequestLogs();
    const state = getRequestLoggerSnapshot().bodyCapture!;
    assertEqual(
      state.attempted,
      state.completed + state.failed + state.rejected + state.pending,
    );
    assertEqual(state.failed, 16);
    const indexes = await lines(dir, "proxy-debug");
    assertEqual(indexes.length, 24);
    assert(
      indexes.every(
        (r) => r.bodyWriteFailed && typeof r.captureError === "string",
      ),
      "capture failure index omitted its error classification",
    );
  } finally {
    initRequestLogger(false);
    await __bodyCaptureWorkerTestHooks.reset(
      new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
    );
    await rm(dir, { recursive: true, force: true });
  }
});

for (const code of ["EPIPE", "UND_ERR_SOCKET", "UND_ERR_CONNECT_TIMEOUT"]) {
  await test(`HTTP Codex terminal transport failure retains ${code} and account attribution`, async () => {
    await withHttpFixture(
      "codex",
      () => {
        throw new TypeError("fixture fetch failed", {
          cause: Object.assign(new Error("fixture socket"), { code }),
        });
      },
      async (response, dir) => {
        const clientBody = await response.text();
        assert(
          !clientBody.includes("fixture fetch failed"),
          "transport internals reached the client",
        );
        const { finals, terminals } = await recordsAfterBody(dir);
        assertEqual(response.status, 502);
        assertEqual(finals.length, 1);
        assertEqual(
          finals[0].errorMessage,
          "fixture fetch failed",
          "final telemetry lost the transport detail",
        );
        assertEqual(finals[0].errorType, "network_error");
        assertEqual(finals[0].errorCode, code);
        assertEqual(terminals[0].errorCode, code);
        const attempts = await lines(dir, "proxy-attempts");
        assertEqual(
          finals[0].accountKey,
          attempts.at(-1)?.accountKey,
          "final error lost the account of the last attempted provider call",
        );
        assertEqual(
          new Set(attempts.map((attempt) => attempt.accountKey)).size,
          code === "UND_ERR_CONNECT_TIMEOUT" ? 2 : 1,
        );
        assertEqual(
          attempts.length,
          code === "UND_ERR_CONNECT_TIMEOUT" ? 2 : 1,
          "unsafe POST rotation or missing safe connect retry",
        );
        assertEqual(
          attempts[0].retryable,
          code === "UND_ERR_CONNECT_TIMEOUT",
          "ambiguous dispatch was retryable",
        );
      },
      undefined,
      true,
    );
  });
}

/**
 * Exercise real child-process handoffs with isolated storage and
 * deterministic IPC delivery faults.
 */
async function withIncidentProxy(
  timings: {
    acceptanceMs?: number;
    commitMs?: number;
    delayedSocket?: string;
    commitErrorCode?: string;
    logs?: string[];
  },
  run: (
    proxy: import("../src/lib/types/index.js").RollingProxyServer,
    dir: string,
  ) => Promise<void>,
): Promise<void> {
  const { startRollingProxyServer } =
    await import("../src/lib/proxy/rollingProxyServer.js");
  const { spawnProxySocketWorker } =
    await import("../src/lib/proxy/rollingWorkerProcess.js");
  const { spawn } = await import("node:child_process");
  const { fileURLToPath } = await import("node:url");
  const dir = await mkdtemp(join(tmpdir(), "incident-worker-"));
  resetProxyLifecycleLoggerForTests();
  configureProxyLifecycleLogger({
    enabled: true,
    logDir: dir,
    filePrefix: "proxy-supervisor",
  });
  const proxy = await startRollingProxyServer({
    host: "127.0.0.1",
    port: 0,
    initialVersion: "1.0.0",
    readyTimeoutMs: 10_000,
    log: (message) => timings.logs?.push(message),
    onEvent: (supervisorEvent) =>
      logProxyLifecycleEvent({
        event: "supervisor_event",
        requestId: "-",
        method: "-",
        path: "-",
        supervisorEvent,
      }),
    spawnWorker: (generation, expectedVersion) =>
      spawnProxySocketWorker({
        generation,
        expectedVersion,
        command: process.execPath,
        args: [
          fileURLToPath(
            new URL(
              "./fixtures/proxyIncidentSocketWorker.cjs",
              import.meta.url,
            ),
          ),
        ],
        socketAckTimeoutMs: 250,
        stdout: "ignore",
        stderr: "ignore",
        env: {
          NEUROLINK_INCIDENT_BUILT_PROXY_DIR: fileURLToPath(
            new URL("../dist/proxy/", import.meta.url),
          ),
          NEUROLINK_INCIDENT_LOG_DIR: dir,
          NEUROLINK_INCIDENT_ACCEPT_DELAY_MS: String(timings.acceptanceMs ?? 0),
        },
        spawn: ((...args: Parameters<typeof spawn>) => {
          const child = spawn(...args);
          const original = child.send;
          child.send = function (
            this: typeof child,
            message: unknown,
            ...sendArgs: unknown[]
          ) {
            const control = message as { type?: string; socketId?: string };
            if (
              control.type === "proxy-worker:socket-commit" &&
              (!timings.delayedSocket ||
                control.socketId === timings.delayedSocket)
            ) {
              const callback = sendArgs.at(-1);
              if (typeof callback === "function") {
                sendArgs[sendArgs.length - 1] = (...values: unknown[]) =>
                  setTimeout(
                    () =>
                      timings.commitErrorCode
                        ? callback(
                            Object.assign(
                              new Error("fixture IPC write failed"),
                              { code: timings.commitErrorCode },
                            ),
                          )
                        : callback(...values),
                    timings.commitMs ?? 0,
                  );
              }
            }
            return Reflect.apply(original, this, [message, ...sendArgs]);
          } as typeof child.send;
          return child;
        }) as typeof spawn,
      }),
  });
  try {
    await run(proxy, dir);
  } finally {
    await proxy.close();
    await flushProxyLifecycleEvents();
    resetProxyLifecycleLoggerForTests();
    await rm(dir, { recursive: true, force: true });
  }
}

/**
 * Observe fixture response headers and completion with a bounded loopback
 * request lifetime.
 */
async function incidentRequest(port: number, path: string) {
  const { get } = await import("node:http");
  let headers!: (id: string) => void;
  const started = new Promise<string>((resolve) => {
    headers = resolve;
  });
  const finished = new Promise<{ failed: boolean; body: string }>((resolve) => {
    const req = get({ host: "127.0.0.1", port, path, agent: false }, (res) => {
      let body = "";
      headers(String(res.headers["x-request-id"]));
      res.on("data", (chunk) => {
        body += chunk.toString();
      });
      res.on("end", () => resolve({ failed: false, body }));
      res.on("error", () => resolve({ failed: true, body }));
    });
    req.on("error", () => {
      headers("");
      resolve({ failed: true, body: "" });
    });
    req.setTimeout(8_000, () => req.destroy());
  });
  return { started, finished };
}

await test("a late accepted socket gets a full commit deadline without killing its worker", async () => {
  await withIncidentProxy(
    { acceptanceMs: 150, commitMs: 150 },
    async (proxy) => {
      const pid = proxy.snapshot().active?.pid;
      const request = await incidentRequest(proxy.address.port, "/ok");
      assertEqual((await request.finished).body, "ok");
      await pause(400);
      assertEqual(
        proxy.snapshot().failedTransfers,
        0,
        "commit inherited the expired offer deadline",
      );
      assertEqual(proxy.snapshot().active?.pid, pid);
    },
  );
});

for (const fault of [
  {
    reason: "socket_commit_timeout",
    commitMs: 700,
    commitErrorCode: undefined,
  },
  { reason: "socket_transfer_failure", commitMs: 50, commitErrorCode: "EPIPE" },
]) {
  await test(`${fault.reason} cancels only that connection while replacement preserves another stream`, async () => {
    const logs: string[] = [];
    await withIncidentProxy(
      { ...fault, delayedSocket: "1:2", logs },
      async (proxy) => {
        const first = await incidentRequest(proxy.address.port, "/stream");
        await first.started;
        const originalPid = proxy.snapshot().active?.pid;
        const second = await incidentRequest(proxy.address.port, "/hold");
        await second.started;
        const cancelled = await second.finished;
        assert(
          cancelled.failed,
          "late cancellation did not close the committed socket",
        );
        await eventually(() => proxy.snapshot().active?.pid !== originalPid);
        const preserved = await first.finished;
        assert(
          !preserved.failed &&
            preserved.body === `start${"chunk".repeat(200)}done`,
          "unrelated stream was cut by a handoff failure",
        );
        assert(
          logs.some((message) => message.includes(`reason=${fault.reason}`)),
          "replacement request reported the wrong failure phase",
        );
        assertEqual(proxy.snapshot().failedTransfers, 1);
        assertEqual(proxy.snapshot().rejectedSockets, 1);
        assertEqual(
          proxy.snapshot().lastFailure?.supervisorAction,
          "cancel_socket_replace_before_drain",
        );
        const healthy = await incidentRequest(proxy.address.port, "/ok");
        assertEqual((await healthy.finished).body, "ok");
      },
    );
  });
}

await test("worker death preserves durable admission and the built analyzer reports unconfirmed outcome without inventing success", async () => {
  await withIncidentProxy({}, async (proxy, dir) => {
    const request = await incidentRequest(proxy.address.port, "/hold");
    const requestId = await request.started;
    const pid = proxy.snapshot().active!.pid;
    // This PID was created by this test; never read or signal the installed proxy.
    process.kill(pid, "SIGKILL");
    assert(
      (await request.finished).failed,
      "killed fixture stream unexpectedly completed",
    );
    await eventually(() =>
      proxy
        .snapshot()
        .recentEvents.some(
          (event) => event.type === "worker_exit" && event.workerPid === pid,
        ),
    );
    await flushProxyLifecycleEvents();
    const result = await runCLI([
      "proxy",
      "analyze",
      "--logs-dir",
      dir,
      "--since",
      new Date(Date.now() - 60_000).toISOString(),
      "--format",
      "json",
    ]);
    assertEqual(result.exitCode, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assertEqual(report.lifecycle.accepted, 1);
    assertEqual(report.lifecycle.terminal, 0);
    assertEqual(report.lifecycle.unconfirmedAtWorkerExit.length, 1);
    assertEqual(
      report.lifecycle.unconfirmedAtWorkerExit[0].requestId,
      requestId,
    );
    assertEqual(
      report.lifecycle.unconfirmedAtWorkerExit[0].workerExitSignal,
      "SIGKILL",
    );
    assertEqual(report.requests.success, 0);
    assertEqual(report.dataQuality.acceptedWithoutFinal, 1);
    assertEqual(report.dataQuality.lifecycleSequenceGaps, 0);
  });
});

await test("a burst of 150 concurrent sockets completes with 150 durable unique admissions and no transfer loss", async () => {
  await withIncidentProxy({}, async (proxy, dir) => {
    const startedAt = performance.now();
    const requests = await Promise.all(
      Array.from({ length: 150 }, () =>
        incidentRequest(proxy.address.port, "/ok"),
      ),
    );
    const results = await Promise.all(
      requests.map((request) => request.finished),
    );
    const durationMs = performance.now() - startedAt;
    assert(
      results.every((result) => !result.failed && result.body === "ok"),
      "burst lost or corrupted a response",
    );
    const admitted = (await lines(dir, "proxy-lifecycle")).filter(
      (record) => record.event === "request_accepted",
    );
    assertEqual(admitted.length, 150);
    assertEqual(new Set(admitted.map((record) => record.requestId)).size, 150);
    assertEqual(proxy.snapshot().failedTransfers, 0);
    assertEqual(proxy.snapshot().rejectedSockets, 0);
    console.log(
      `    Isolated burst: 150/150 completed in ${durationMs.toFixed(1)}ms; zero missing admissions or transfer failures`,
    );
  });
});

await test("runtime load and conflicting supervisor evidence never inflate request counts or invent an exit outcome", async () => {
  const dir = await mkdtemp(join(tmpdir(), "incident-analysis-"));
  const timestamp = new Date().toISOString();
  const day = timestamp.slice(0, 10);
  const base = {
    schemaVersion: 1,
    timestamp,
    method: "POST",
    path: "/v1/messages",
  };
  const runtime = {
    ...base,
    requestId: "-",
    processInstanceId: "worker",
    sequence: 2,
    event: "runtime_sample",
    runtimeSample: {
      hostLoad1m: 139,
      rssBytes: 12345,
      cpuPercentOneCore: 11.5,
      eventLoopDelayMaxMs: 41,
    },
  };
  const exit = {
    ...base,
    requestId: "-",
    processInstanceId: "parent",
    sequence: 1,
    event: "supervisor_event",
    supervisorEvent: {
      type: "worker_exit",
      workerProcessInstanceId: "worker",
      workerExitCode: null,
      workerExitSignal: "SIGKILL",
    },
  };
  try {
    await writeFile(
      join(dir, `proxy-lifecycle-${day}.jsonl`),
      [
        {
          ...base,
          requestId: "one",
          processInstanceId: "worker",
          sequence: 1,
          event: "request_accepted",
        },
        runtime,
        runtime,
      ]
        .map((record) => JSON.stringify(record))
        .join("\n") + "\n",
    );
    await writeFile(
      join(dir, `proxy-supervisor-${day}.jsonl`),
      [
        exit,
        {
          ...exit,
          supervisorEvent: {
            ...exit.supervisorEvent,
            workerExitSignal: "SIGTERM",
          },
        },
      ]
        .map((record) => JSON.stringify(record))
        .join("\n") + "\n",
    );
    const result = await runCLI([
      "proxy",
      "analyze",
      "--logs-dir",
      dir,
      "--since",
      new Date(Date.now() - 60_000).toISOString(),
      "--format",
      "json",
    ]);
    assertEqual(result.exitCode, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assertEqual(report.lifecycle.accepted, 1);
    assertEqual(
      report.lifecycle.unconfirmedAtWorkerExit.length,
      0,
      "contradictory exit evidence was treated as confirmed",
    );
    assertEqual(report.runtime.samples, 1, "runtime samples were duplicated");
    assertEqual(report.runtime.maxHostLoad1m, 139);
    assertEqual(report.runtime.maxEventLoopDelayMs, 41);
    assertEqual(report.dataQuality.lifecycleSequenceDuplicates, 2);
    assertEqual(report.dataQuality.conflictingLifecycleDuplicates, 1);
    assertEqual(report.requests.completed, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("capture slots stay reserved while completed bodies await a slow debug sink", async () => {
  const dir = await mkdtemp(join(tmpdir(), "body-publication-"));
  await __bodyCaptureWorkerTestHooks.reset(
    new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
  );
  initRequestLogger(true, dir);
  const before = getRequestLoggerSnapshot().debug.attempted;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  __requestLoggerTestHooks.setAppendFileForTests(async (...args) => {
    await gate;
    return writeFile(...args);
  });
  const tasks = Array.from({ length: 16 }, (_, index) =>
    logBodyCapture({
      timestamp: new Date().toISOString(),
      requestId: `retained-${index}`,
      phase: "client_request",
      model: "fixture",
      stream: false,
      body: "bounded fixture",
    }),
  );
  try {
    await eventually(
      () => getRequestLoggerSnapshot().debug.attempted - before === 16,
    );
    assertEqual(
      getRequestLoggerSnapshot().bodyCapture?.pending,
      16,
      "completed worker results escaped the memory budget",
    );
    // The metadata caller deadline must not release capture ownership while
    // the actual index write remains blocked behind this gate.
    await pause(5_100);
    assertEqual(
      getRequestLoggerSnapshot().bodyCapture?.pending,
      16,
      "metadata timeout released capture capacity before the index write settled",
    );
    tasks.push(
      logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: "overflow",
        phase: "client_request",
        model: "fixture",
        stream: false,
        body: "bounded fixture",
      }),
    );
    assertEqual(getRequestLoggerSnapshot().bodyCapture?.rejected, 1);
    release();
    await Promise.all(tasks);
    await flushRequestLogs();
    assertEqual(getRequestLoggerSnapshot().bodyCapture?.completed, 16);
    assertEqual(getRequestLoggerSnapshot().bodyCapture?.pending, 0);
    const indexes = await lines(dir, "proxy-debug");
    assertEqual(indexes.length, 17);
    assertEqual(
      indexes.filter(
        (record) => record.captureError === "body_capture_queue_full",
      ).length,
      1,
    );
  } finally {
    release();
    await Promise.all(tasks);
    await flushRequestLogs();
    __requestLoggerTestHooks.restoreAppendFileForTests();
    initRequestLogger(false);
    await __bodyCaptureWorkerTestHooks.reset();
    await rm(dir, { recursive: true, force: true });
  }
});

for (const serialized of [false, true]) {
  await test(`body capture redacts sensitive non-string values from ${serialized ? "JSON text" : "objects"}`, async () => {
    const { gunzipSync } = await import("node:zlib");
    const dir = await mkdtemp(join(tmpdir(), "body-sensitive-values-"));
    await __bodyCaptureWorkerTestHooks.reset(
      new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
    );
    initRequestLogger(true, dir);
    const input = {
      authorization: ["Bearer secret-array"],
      api_key: 1234567,
      credential: { value: "secret-object" },
      nested: [{ Password: false, harmless: "retained" }],
    };
    const original = JSON.stringify(input);
    try {
      await logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: "sensitive",
        phase: "client_request",
        model: "fixture",
        stream: false,
        body: serialized ? original : input,
      });
      await flushRequestLogs();
      const [index] = await lines(dir, "proxy-debug");
      assert(!index.bodyWriteFailed, "capture failed");
      const artifact = JSON.parse(
        gunzipSync(await readFile(String(index.bodyPath))).toString(),
      );
      const body = JSON.parse(artifact.body);
      for (const key of ["authorization", "api_key", "credential"]) {
        assertEqual(body[key], "[REDACTED]", `non-string ${key} leaked`);
      }
      assertEqual(body.nested[0].Password, "[REDACTED]");
      assertEqual(body.nested[0].harmless, "retained");
      assertEqual(
        JSON.stringify(input),
        original,
        "capture mutated the request",
      );
    } finally {
      initRequestLogger(false);
      await __bodyCaptureWorkerTestHooks.reset();
      await rm(dir, { recursive: true, force: true });
    }
  });
}

await test("permission hardening failure keeps the lifecycle sink disabled and refuses HTTP dispatch", async () => {
  const { chmod, stat, readdir } = await import("node:fs/promises");
  const { chmodSync } = await import("node:fs");
  const dir = await mkdtemp(join(tmpdir(), "telemetry-private-dir-"));
  await chmod(dir, 0o755);
  __proxyLifecycleTestHooks.setChmodForTests(() => {
    throw Object.assign(new Error("fixture chmod denied"), { code: "EPERM" });
  });
  let upstreamCalls = 0;
  try {
    configureProxyLifecycleLogger({ enabled: true, logDir: dir });
    assertEqual(getProxyLifecycleLoggerSnapshot().enabled, false);
    assertEqual((await stat(dir)).mode & 0o777, 0o755);
    logProxyLifecycleEvent({
      event: "request_accepted",
      requestId: "unsecured",
      method: "POST",
      path: "/v1/messages",
    });
    await flushProxyLifecycleEvents();
    assert(
      !(await readdir(dir)).some((name) => name.startsWith("proxy-lifecycle-")),
      "unsecured directory received telemetry",
    );
    await withHttpFixture(
      "codex",
      () => {
        upstreamCalls += 1;
        return new Response();
      },
      async (response, logsDir) => {
        await response.text();
        assertEqual(response.status, 503);
        assertEqual(
          upstreamCalls,
          0,
          "permission failure disabled the admission requirement",
        );
        assert(
          !(await readdir(logsDir)).some((name) =>
            name.startsWith("proxy-lifecycle-"),
          ),
          "disabled lifecycle sink created a journal",
        );
      },
    );
    __proxyLifecycleTestHooks.setChmodForTests(chmodSync);
    configureProxyLifecycleLogger({ enabled: true, logDir: dir });
    assertEqual(
      (await stat(dir)).mode & 0o777,
      0o700,
      "existing directory was not hardened",
    );
    assertEqual(getProxyLifecycleLoggerSnapshot().enabled, true);
  } finally {
    resetProxyLifecycleLoggerForTests();
    initRequestLogger(false);
    await rm(dir, { recursive: true, force: true });
  }
});

await test("size retention preserves the current supervisor journal and still removes older journals", async () => {
  const dir = await mkdtemp(join(tmpdir(), "supervisor-retention-"));
  const today = new Date().toISOString().slice(0, 10);
  const current = join(dir, `proxy-supervisor-${today}.jsonl`);
  const older = join(dir, "proxy-supervisor-2000-01-01.jsonl");
  try {
    await writeFile(current, "first\n");
    await writeFile(older, "older\n");
    cleanupLogsAt(dir, 7, 0);
    await appendFile(current, "second\n");
    assertEqual(
      await readFile(current, "utf8"),
      "first\nsecond\n",
      "current journal was unlinked",
    );
    const { readdir } = await import("node:fs/promises");
    assert(
      !(await readdir(dir)).includes("proxy-supervisor-2000-01-01.jsonl"),
      "older journal escaped retention",
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

await test("default shutdown flush waits for a capture beyond the metadata-only five-second budget", async () => {
  const { pathToFileURL } = await import("node:url");
  const dir = await mkdtemp(join(tmpdir(), "capture-shutdown-"));
  const fixture = join(dir, "delayed-worker.mjs");
  // Execute the shipped worker, delaying only its message boundary.
  await writeFile(
    fixture,
    `
    import { parentPort } from "node:worker_threads";
    const original = parentPort.postMessage.bind(parentPort);
    parentPort.postMessage = (message) => setTimeout(() => original(message), 5200);
    await import(${JSON.stringify(new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url).href)});
  `,
  );
  await __bodyCaptureWorkerTestHooks.reset(pathToFileURL(fixture));
  initRequestLogger(true, dir);
  const capture = logBodyCapture({
    timestamp: new Date().toISOString(),
    requestId: "shutdown",
    phase: "client_request",
    model: "fixture",
    stream: false,
    body: "retained capture",
  });
  try {
    await flushRequestLogs();
    await capture;
    assertEqual(getRequestLoggerSnapshot().bodyCapture?.completed, 1);
    assertEqual(getRequestLoggerSnapshot().bodyCapture?.pending, 0);
    assertEqual((await lines(dir, "proxy-debug")).length, 1);
  } finally {
    await capture;
    initRequestLogger(false);
    await __bodyCaptureWorkerTestHooks.reset();
    await rm(dir, { recursive: true, force: true });
  }
});

await __bodyCaptureWorkerTestHooks.reset();
await test("OTel-only exports finals, attempts, lifecycle, redacted bodies and console without creating a log directory", async () => {
  const { createServer } = await import("node:http");
  const { readdir } = await import("node:fs/promises");
  const { logRequestAttempt, logStreamError } =
    await import("../src/lib/proxy/requestLogger.js");
  const { openProxyWorkerLog } = await import("../src/lib/proxy/workerLog.js");
  const { startProxyLogCleanupScheduler } =
    await import("../src/lib/proxy/logCleanupScheduler.js");
  const {
    initializeProxyOtelLogs,
    flushProxyOtelLogs,
    shutdownProxyOtelLogs,
    getProxyOtelLogSnapshot,
    routeProxyConsoleToOtel,
  } = await import("../src/lib/proxy/otelLogSink.js");
  const received: any[] = [];
  const collector = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const payload = JSON.parse(Buffer.concat(chunks).toString());
    for (const resource of payload.resourceLogs ?? []) {
      for (const scope of resource.scopeLogs ?? []) {
        received.push(...scope.logRecords);
      }
    }
    res.writeHead(200, { "content-type": "application/json" }).end("{}");
  });
  await new Promise<void>((resolve) =>
    collector.listen(0, "127.0.0.1", resolve),
  );
  const address = collector.address();
  if (!address || typeof address === "string") {
    throw new Error("collector did not listen");
  }
  const before = {
    mode: process.env.NEUROLINK_PROXY_LOG_SINK,
    endpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  };
  const dir = await mkdtemp(join(tmpdir(), "otel-only-"));
  const destination = join(dir, "must-not-exist");
  process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/v1/logs`;
  resetProxyLifecycleLoggerForTests();
  await __bodyCaptureWorkerTestHooks.reset(
    new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
  );
  let fileWrites = 0;
  __requestLoggerTestHooks.setAppendFileForTests(async () => {
    fileWrites++;
    throw new Error("must not write");
  });
  __proxyLifecycleTestHooks.setAppendFileForTests(async () => {
    fileWrites++;
    throw new Error("must not write");
  });
  try {
    initializeProxyOtelLogs("fixture");
    initRequestLogger(true, destination);
    const base = {
      timestamp: new Date().toISOString(),
      requestId: "otel-fixture",
      method: "POST",
      path: "/v1/messages",
      model: "fixture",
      stream: false,
      toolCount: 0,
      account: "fixture",
      accountType: "oauth",
      responseStatus: 200,
      responseTimeMs: 1,
    };
    await persistProxyLifecycleAcceptance(base);
    await logRequestAttempt({ ...base, attempt: 1, responseStatus: 503 });
    await logRequest(base);
    logProxyLifecycleEvent({
      ...base,
      event: "request_terminal",
      terminalOutcome: "completed",
    });
    await logStreamError({
      ...base,
      errorMessage: "fixture stream error",
      durationMs: 1,
    });
    await logBodyCapture({
      ...base,
      phase: "client_request",
      headers: { authorization: "Bearer fixture-secret" },
      body: {
        api_key: "must-not-export",
        messages: [{ role: "user", content: "redacted fixture" }],
      },
    });
    configureProxyLifecycleLogger({
      enabled: true,
      filePrefix: "proxy-supervisor",
    });
    logProxyLifecycleEvent({
      event: "supervisor_event",
      requestId: "-",
      method: "-",
      path: "-",
    });
    routeProxyConsoleToOtel();
    console.warn("OTel console fixture");
    await flushRequestLogs();
    await flushProxyLifecycleEvents();
    await flushProxyOtelLogs();
    assertEqual(fileWrites, 0, "file writers were called");
    assertEqual(
      (await readdir(dir)).length,
      0,
      "log directory or body files were created",
    );
    assertEqual(
      openProxyWorkerLog("proxy-updater.log", destination).stdio,
      "ignore",
    );
    const cleanup = startProxyLogCleanupScheduler({ logsDir: destination });
    assertEqual(cleanup.trigger(), false, "file retention scanner started");
    await cleanup.stop();
    const kind = (r: any) =>
      r.attributes?.find((a: any) => a.key === "proxy.record_kind")?.value
        ?.stringValue;
    for (const expected of [
      "request_final",
      "attempt",
      "lifecycle",
      "stream_error",
      "supervisor",
      "body_capture_index",
      "body",
      "console",
    ]) {
      assert(
        received.some((r) => kind(r) === expected),
        `missing exported ${expected}`,
      );
    }
    assertEqual(
      received.filter((r) => kind(r) === "request_final").length,
      1,
      "final dashboard count duplicated",
    );
    const attempt = received.find((r) => kind(r) === "attempt");
    assert(
      !attempt.attributes.some((a: any) => a.key === "is_success"),
      "attempt polluted final dashboard fields",
    );
    const body = received
      .filter((r) => kind(r) === "body")
      .map((r) => r.body.stringValue)
      .join("");
    assert(body.includes("redacted fixture"), "body disappeared");
    assert(
      !JSON.stringify(received).includes("must-not-export"),
      "body secret exported",
    );
    assert(
      !JSON.stringify(received).includes("Bearer fixture-secret"),
      "header secret exported",
    );
    const snapshot = getProxyOtelLogSnapshot();
    assertEqual(
      snapshot.queues.reduce((sum, q) => sum + q.outstanding, 0),
      0,
    );
    assertEqual(
      snapshot.queues.reduce((sum, q) => sum + q.transportAcknowledged, 0),
      received.length,
    );
    assertEqual(getRequestLoggerSnapshot().diskEnabled, false);
    assertEqual(
      getProxyLifecycleLoggerSnapshot().admissionPolicy,
      "best-effort",
    );
    const { proxyGuardCommand } = await import("../src/cli/commands/proxy.js");
    const guardHandler = proxyGuardCommand.handler;
    if (typeof guardHandler !== "function") {
      throw new Error("guard handler is missing");
    }
    initializeProxyOtelLogs()
      ?.getLogger("guard-exit-fixture")
      .emit({ body: "guard exit must flush" });
    await guardHandler({ _: [], $0: "fixture", parentPid: -1 });
    assert(
      received.some((r) => r.body?.stringValue === "guard exit must flush"),
      "guard exit lost queued logs",
    );
    assertEqual(
      getProxyOtelLogSnapshot().initialized,
      false,
      "guard exporter was not shut down",
    );
  } finally {
    initRequestLogger(false);
    resetProxyLifecycleLoggerForTests();
    await shutdownProxyOtelLogs();
    __requestLoggerTestHooks.restoreAppendFileForTests();
    await __bodyCaptureWorkerTestHooks.reset();
    if (before.mode === undefined) {
      delete process.env.NEUROLINK_PROXY_LOG_SINK;
    } else {
      process.env.NEUROLINK_PROXY_LOG_SINK = before.mode;
    }
    if (before.endpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = before.endpoint;
    }
    await new Promise<void>((resolve) => collector.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
});

await test("OTel collector rejection exposes loss and queue bounds without rejecting proxy admission", async () => {
  const { createServer } = await import("node:http");
  const {
    initializeProxyOtelLogs,
    emitProxyOtelEvent,
    flushProxyOtelLogs,
    shutdownProxyOtelLogs,
    getProxyOtelLogSnapshot,
  } = await import("../src/lib/proxy/otelLogSink.js");
  const collector = createServer(async (req, res) => {
    for await (const chunk of req) {
      void chunk;
    }
    res
      .writeHead(400, { "content-type": "application/json" })
      .end('{"message":"fixture rejection"}');
  });
  await new Promise<void>((resolve) =>
    collector.listen(0, "127.0.0.1", resolve),
  );
  const address = collector.address();
  if (!address || typeof address === "string") {
    throw new Error("collector did not listen");
  }
  const previous = {
    mode: process.env.NEUROLINK_PROXY_LOG_SINK,
    endpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  };
  process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/v1/logs`;
  try {
    initializeProxyOtelLogs("outage-fixture");
    configureProxyLifecycleLogger({ enabled: true });
    const bodyLogger = initializeProxyOtelLogs()!.getLogger("fixture-bodies");
    for (let i = 0; i < 300; i++) {
      bodyLogger.emit({
        body: "fixture",
        attributes: { "proxy.record_kind": "body" },
      });
    }
    assertEqual(
      getProxyOtelLogSnapshot().queues[1].outstanding,
      256,
      "body queue exceeded capacity",
    );
    assertEqual(
      getProxyOtelLogSnapshot().queues[1].dropped,
      44,
      "body queue loss was hidden",
    );
    for (let i = 0; i < 2200; i++) {
      emitProxyOtelEvent("fixture", { requestId: String(i) });
    }
    const queued = getProxyOtelLogSnapshot().queues[0];
    assertEqual(queued.outstanding, 2048, "queue exceeded capacity");
    assertEqual(queued.dropped, 152, "queue loss was hidden");
    const started = Date.now();
    await persistProxyLifecycleAcceptance({
      requestId: "outage",
      method: "POST",
      path: "/v1/messages",
    });
    assert(Date.now() - started < 500, "request admission waited for exporter");
    await flushProxyOtelLogs().catch(() => undefined);
    const outcome = getProxyOtelLogSnapshot().queues[0];
    assertEqual(
      outcome.transportAcknowledged,
      0,
      "collector rejection counted as success",
    );
    assertEqual(outcome.exportUnconfirmed, 2048, "failed exports missing");
    assertEqual(outcome.outstanding, 0, "failed exports leaked capacity");
    const { OTLPLogExporter } =
      await import("@opentelemetry/exporter-logs-otlp-http");
    const originalExport = OTLPLogExporter.prototype.export;
    try {
      OTLPLogExporter.prototype.export = () => {
        throw new Error("fixture synchronous exporter fault");
      };
      emitProxyOtelEvent("fixture", { requestId: "synchronous-fault" });
      await flushProxyOtelLogs().catch(() => undefined);
      const failed = getProxyOtelLogSnapshot().queues[0];
      assertEqual(
        failed.outstanding,
        0,
        "synchronous export failure leaked capacity",
      );
      assertEqual(
        failed.exportUnconfirmed,
        2049,
        "synchronous failure was hidden",
      );
    } finally {
      OTLPLogExporter.prototype.export = originalExport;
    }
  } finally {
    resetProxyLifecycleLoggerForTests();
    await shutdownProxyOtelLogs();
    if (previous.mode === undefined) {
      delete process.env.NEUROLINK_PROXY_LOG_SINK;
    } else {
      process.env.NEUROLINK_PROXY_LOG_SINK = previous.mode;
    }
    if (previous.endpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = previous.endpoint;
    }
    await new Promise<void>((resolve) => collector.close(() => resolve()));
  }
});

await test("OTel-only launchd environment survives an ambient-only install and unsafe endpoints are rejected", async () => {
  const { buildProxyLaunchdPlist } =
    await import("../src/cli/commands/proxy.js");
  const { initializeProxyOtelLogs, shutdownProxyOtelLogs } =
    await import("../src/lib/proxy/otelLogSink.js");
  const names = [
    "NEUROLINK_PROXY_LOG_SINK",
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "OTEL_EXPORTER_OTLP_LOGS_ENDPOINT",
    "OTEL_EXPORTER_OTLP_LOGS_HEADERS",
  ];
  const previous = names.map((name) => process.env[name]);
  try {
    process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT =
      "https://collector.example.test/v1/logs?x=1&y=2";
    process.env.OTEL_EXPORTER_OTLP_LOGS_HEADERS = "authorization=fixture&token";
    const plist = buildProxyLaunchdPlist(0, "127.0.0.1");
    assert(
      plist.includes("<key>NEUROLINK_PROXY_LOG_SINK</key>"),
      "sink missing from launchd environment",
    );
    assert(
      plist.includes("https://collector.example.test/v1/logs?x=1&amp;y=2"),
      "endpoint missing or not XML escaped",
    );
    assert(
      plist.includes("authorization=fixture&amp;token"),
      "headers missing or not XML escaped",
    );
    assertEqual(
      plist.match(/<string>\/dev\/null<\/string>/g)?.length,
      2,
      "stdio still writes to disk",
    );
    process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT =
      "http://collector.example.test/v1/logs";
    let rejected = false;
    try {
      initializeProxyOtelLogs();
    } catch {
      rejected = true;
    }
    assert(rejected, "remote cleartext collector was accepted");
  } finally {
    await shutdownProxyOtelLogs();
    names.forEach((name, i) => {
      if (previous[i] === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = previous[i];
      }
    });
  }
});

/** A real loopback collector with controlled response timing and no live credentials. */
async function withBodyCollector(
  respond: (
    records: Array<Parameters<typeof otelAttribute>[0]>,
    response: import("node:http").ServerResponse,
  ) => Promise<void> | void,
  run: (received: Parameters<typeof respond>[0]) => Promise<void>,
): Promise<void> {
  const { createServer } = await import("node:http");
  const { readdir } = await import("node:fs/promises");
  const { initializeProxyOtelLogs, flushProxyOtelLogs, shutdownProxyOtelLogs } =
    await import("../src/lib/proxy/otelLogSink.js");
  const received: Parameters<typeof respond>[0] = [];
  const collector = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const payload: {
      resourceLogs?: Array<{
        scopeLogs?: Array<{ logRecords?: typeof received }>;
      }>;
    } = JSON.parse(Buffer.concat(chunks).toString());
    const records = (payload.resourceLogs ?? []).flatMap((r) =>
      (r.scopeLogs ?? []).flatMap((s) => s.logRecords ?? []),
    );
    received.push(...records);
    await respond(records, res);
  });
  await new Promise<void>((resolve) =>
    collector.listen(0, "127.0.0.1", resolve),
  );
  const address = collector.address();
  if (!address || typeof address === "string") {
    throw new Error("collector did not listen");
  }
  const previous = {
    mode: process.env.NEUROLINK_PROXY_LOG_SINK,
    endpoint: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
  };
  process.env.NEUROLINK_PROXY_LOG_SINK = "otel";
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = `http://127.0.0.1:${address.port}/v1/logs`;
  const dir = await mkdtemp(join(tmpdir(), "whole-body-otel-"));
  await __bodyCaptureWorkerTestHooks.reset(
    new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
  );
  initializeProxyOtelLogs("capture-fixture");
  initRequestLogger(true, join(dir, "must-not-exist"));
  try {
    await run(received);
    await flushRequestLogs();
    await flushProxyOtelLogs();
    assertEqual(
      (await readdir(dir)).length,
      0,
      "OTel capture created disk logs",
    );
  } finally {
    initRequestLogger(false);
    await flushRequestLogs();
    await shutdownProxyOtelLogs();
    await __bodyCaptureWorkerTestHooks.reset(
      new URL("../dist/proxy/bodyCaptureWorkerEntry.js", import.meta.url),
    );
    if (previous.mode === undefined) {
      delete process.env.NEUROLINK_PROXY_LOG_SINK;
    } else {
      process.env.NEUROLINK_PROXY_LOG_SINK = previous.mode;
    }
    if (previous.endpoint === undefined) {
      delete process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT;
    } else {
      process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT = previous.endpoint;
    }
    await new Promise<void>((resolve) => collector.close(() => resolve()));
    await rm(dir, { recursive: true, force: true });
  }
}

function otelAttribute(
  record: {
    body: { stringValue: string };
    attributes?: Array<{
      key: string;
      value: {
        stringValue?: string;
        intValue?: string | number;
        boolValue?: boolean;
      };
    }>;
  },
  key: string,
): string | number | boolean | undefined {
  const value = record.attributes?.find(
    (attribute) => attribute.key === key,
  )?.value;
  return value?.stringValue ?? value?.intValue ?? value?.boolValue;
}

await test("a burst exceeding the old body queue reconstructs every capture after delayed collector acknowledgements", async () => {
  await withBodyCollector(
    async (_records, response) => {
      await pause(20);
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    },
    async (received) => {
      const { flushProxyOtelLogs, getProxyOtelLogSnapshot } =
        await import("../src/lib/proxy/otelLogSink.js");
      const { createHash } = await import("node:crypto");
      const bodies = Array.from({ length: 8 }, (_, i) => ({
        message: String(i) + "x".repeat(1_555_211),
        api_key: "must-be-redacted",
        nested: { password: { private: "not-exported" } },
      }));
      await Promise.all(
        bodies.map((body, i) =>
          logBodyCapture({
            timestamp: new Date().toISOString(),
            requestId: `burst-${i}`,
            phase: "client_request",
            model: "fixture",
            stream: false,
            body,
          }),
        ),
      );
      await flushRequestLogs();
      await flushProxyOtelLogs();
      const indexes = received
        .filter(
          (r) => otelAttribute(r, "proxy.record_kind") === "body_capture_index",
        )
        .map((r) => JSON.parse(r.body.stringValue));
      assertEqual(indexes.length, 8);
      for (const index of indexes) {
        assertEqual(index.bodyDelivery.status, "transport_acknowledged");
        assertEqual(
          index.bodyTruncated,
          false,
          "old 1 MiB logging ceiling still truncated this request",
        );
        const chunks = received
          .filter(
            (r) => otelAttribute(r, "body.capture_id") === index.captureId,
          )
          .sort(
            (a, b) =>
              Number(otelAttribute(a, "body.chunk_index")) -
              Number(otelAttribute(b, "body.chunk_index")),
          );
        assertEqual(chunks.length, index.bodyDelivery.expectedChunks);
        assertEqual(
          new Set(chunks.map((r) => otelAttribute(r, "body.chunk_index"))).size,
          chunks.length,
          "duplicate chunks",
        );
        const reconstructed = chunks.map((r) => r.body.stringValue).join("");
        assertEqual(
          createHash("sha256").update(reconstructed).digest("hex"),
          index.bodySha256,
          "capture digest disagrees with reconstruction",
        );
        const body = JSON.parse(reconstructed);
        assertEqual(
          body.message,
          bodies[Number(index.requestId.split("-")[1])].message,
        );
        assertEqual(body.api_key, "[REDACTED]");
        assertEqual(body.nested.password, "[REDACTED]");
      }
      const snapshot = getProxyOtelLogSnapshot();
      assertEqual(snapshot.bodyDelivery.transportAcknowledged, 8);
      assertEqual(snapshot.bodyDelivery.pending, 0);
      assertEqual(
        snapshot.queues[1].dropped,
        0,
        "healthy-collector burst lost body chunks",
      );
      assert(
        snapshot.queues[1].highWaterOutstanding <= 64,
        "capture pacing exceeded one batch",
      );
    },
  );
});

await test("the observed 7.3 MB JSON request is admitted, redacted and delivered without truncation", async () => {
  await withBodyCollector(
    (_records, response) => {
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    },
    async (received) => {
      const { flushProxyOtelLogs } =
        await import("../src/lib/proxy/otelLogSink.js");
      const message = "a".repeat(7_331_395);
      await logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: "large-json",
        phase: "upstream_request",
        model: "fixture",
        stream: false,
        body: { message, secret: ["hidden"] },
      });
      await flushRequestLogs();
      await flushProxyOtelLogs();
      const index = received.find(
        (r) => otelAttribute(r, "proxy.record_kind") === "body_capture_index",
      );
      if (!index) {
        throw new Error("large capture index missing");
      }
      const metadata = JSON.parse(index.body.stringValue);
      assertEqual(metadata.bodyDelivery.status, "transport_acknowledged");
      assertEqual(metadata.bodyTruncated, false);
      assertEqual(metadata.bodyCaptureLimitBytes, 8 * 1024 * 1024);
      const chunks = received.filter(
        (r) => otelAttribute(r, "proxy.record_kind") === "body",
      );
      const body = JSON.parse(chunks.map((r) => r.body.stringValue).join(""));
      assertEqual(body.message, message);
      assertEqual(body.secret, "[REDACTED]");
    },
  );
});

await test("body publication waits for an automatic export while HTTP submission and metadata stay responsive", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let bodiesReceived = false;
  await withBodyCollector(
    async (records, response) => {
      if (
        records.some((r) => otelAttribute(r, "proxy.record_kind") === "body")
      ) {
        bodiesReceived = true;
        await gate;
      }
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    },
    async (received) => {
      const {
        emitProxyOtelEvent,
        flushProxyOtelLogs,
        getProxyOtelLogSnapshot,
      } = await import("../src/lib/proxy/otelLogSink.js");
      try {
        const start = Date.now();
        await logBodyCapture({
          timestamp: new Date().toISOString(),
          requestId: "slow-ack",
          phase: "client_request",
          model: "fixture",
          stream: false,
          body: { message: "x".repeat(1_050_000) },
        });
        assert(
          Date.now() - start < 500,
          "HTTP capture submission waited for collector transport",
        );
        await eventually(() => bodiesReceived);
        assertEqual(
          getProxyOtelLogSnapshot().bodyDelivery.transportAcknowledged,
          0,
          "active automatic batch was falsely acknowledged",
        );
        assertEqual(getProxyOtelLogSnapshot().bodyDelivery.pending, 1);
        emitProxyOtelEvent("lifecycle", {
          requestId: "unrelated-request",
          event: "request_accepted",
        });
        await eventually(() =>
          received.some(
            (r) => otelAttribute(r, "proxy.record_kind") === "lifecycle",
          ),
        );
        assert(
          !received.some(
            (r) =>
              otelAttribute(r, "proxy.record_kind") === "body_capture_index",
          ),
          "capture index claimed delivery before acknowledgement",
        );
        release();
        await flushRequestLogs();
        await flushProxyOtelLogs();
        assertEqual(
          getProxyOtelLogSnapshot().bodyDelivery.transportAcknowledged,
          1,
        );
      } finally {
        release();
      }
    },
  );
});

await test("shutdown waits for an automatic metadata export already in flight", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await withBodyCollector(
    async (_records, response) => {
      await gate;
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    },
    async (received) => {
      const { emitProxyOtelEvent, shutdownProxyOtelLogs } =
        await import("../src/lib/proxy/otelLogSink.js");
      for (let i = 0; i < 64; i++) {
        emitProxyOtelEvent("lifecycle", { requestId: `shutdown-${i}` });
      }
      let settled = false;
      try {
        await eventually(() => received.length === 64);
        const shutdown = shutdownProxyOtelLogs().then(() => {
          settled = true;
        });
        await pause(30);
        assert(!settled, "shutdown abandoned an automatic export");
        release();
        await shutdown;
      } finally {
        release();
      }
    },
  );
});

await test("publication expires without false partial delivery when shared body capacity is occupied", async () => {
  let release = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await withBodyCollector(
    async (_records, response) => {
      await gate;
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    },
    async (received) => {
      const {
        emitProxyOtelEvent,
        publishProxyOtelBody,
        getProxyOtelLogSnapshot,
      } = await import("../src/lib/proxy/otelLogSink.js");
      for (let i = 0; i < 200; i++) {
        emitProxyOtelEvent("body", { requestId: `shared-${i}` });
      }
      const now = Date.now;
      let emitted = 0;
      try {
        const publication = publishProxyOtelBody("expired", "fixture", () => {
          emitted++;
        });
        await eventually(() => received.length === 200);
        const expiredAt = now() + 21_000;
        Date.now = () => expiredAt;
        release();
        const result = await publication;
        assertEqual(result.status, "rejected");
        assertEqual(result.reason, "body_publication_deadline");
        assertEqual(result.notSubmittedChunks, 1);
        assertEqual(emitted, 0);
        assertEqual(getProxyOtelLogSnapshot().bodyDelivery.pendingBytes, 0);
      } finally {
        Date.now = now;
        release();
      }
    },
  );
});

await test("collector rejection produces an unconfirmed capture index instead of false delivery success", async () => {
  await withBodyCollector(
    (records, response) => {
      response
        .writeHead(
          records.some((r) => otelAttribute(r, "proxy.record_kind") === "body")
            ? 400
            : 200,
          { "content-type": "application/json" },
        )
        .end("{}");
    },
    async (received) => {
      const { flushProxyOtelLogs, getProxyOtelLogSnapshot } =
        await import("../src/lib/proxy/otelLogSink.js");
      await logBodyCapture({
        timestamp: new Date().toISOString(),
        requestId: "rejected-export",
        phase: "client_request",
        model: "fixture",
        stream: false,
        body: { message: "fixture" },
      });
      await flushRequestLogs();
      await flushProxyOtelLogs();
      const record = received.find(
        (r) => otelAttribute(r, "proxy.record_kind") === "body_capture_index",
      );
      if (!record) {
        throw new Error("unconfirmed capture index missing");
      }
      const index = JSON.parse(record.body.stringValue);
      assertEqual(index.bodyDelivery.status, "export_unconfirmed");
      assertEqual(index.bodyDelivery.acknowledgedChunks, 0);
      assertEqual(index.bodyDelivery.unconfirmedChunks, 1);
      assertEqual(getProxyOtelLogSnapshot().bodyDelivery.exportUnconfirmed, 1);
      assertEqual(getProxyOtelLogSnapshot().bodyDelivery.pendingBytes, 0);
    },
  );
});

await test("capture rejection indexes distinguish size, unsupported values and traversal limits without invoking getters", async () => {
  await withBodyCollector(
    (_records, response) => {
      response.writeHead(200, { "content-type": "application/json" }).end("{}");
    },
    async (received) => {
      const { flushProxyOtelLogs } =
        await import("../src/lib/proxy/otelLogSink.js");
      let getterCalls = 0;
      const fixtures = [
        {
          body: { message: "x".repeat(9 * 1024 * 1024) },
          reason: "body_capture_entry_too_large",
        },
        {
          body: {
            get message() {
              getterCalls++;
              return "must not run";
            },
          },
          reason: "body_capture_unsupported_value",
        },
        {
          body: Array.from({ length: 100_001 }, () => 0),
          reason: "body_capture_traversal_limit",
        },
      ];
      for (const [i, fixture] of fixtures.entries()) {
        await logBodyCapture({
          timestamp: new Date().toISOString(),
          requestId: `guard-${i}`,
          phase: "client_request",
          model: "fixture",
          stream: false,
          body: fixture.body,
        });
      }
      await flushRequestLogs();
      await flushProxyOtelLogs();
      const indexes = received
        .filter(
          (r) => otelAttribute(r, "proxy.record_kind") === "body_capture_index",
        )
        .map((r) => JSON.parse(r.body.stringValue));
      assertEqual(indexes.length, fixtures.length);
      for (const [i, fixture] of fixtures.entries()) {
        const index = indexes.find((r) => r.requestId === `guard-${i}`);
        assertEqual(index.captureError, fixture.reason);
        assertEqual(index.bodyDelivery.status, "capture_rejected");
      }
      assertEqual(getterCalls, 0);
      assertEqual(
        received.filter((r) => otelAttribute(r, "proxy.record_kind") === "body")
          .length,
        0,
      );
      assertEqual(
        Object.values(
          getRequestLoggerSnapshot().bodyCapture!.rejectionReasons,
        ).reduce((sum, count) => sum + count, 0),
        3,
      );
    },
  );
});

await test("HTTP Anthropic terminal ECONNRESET retains the last attempted account and provider in its final record", async () => {
  await withHttpFixture(
    "anthropic",
    () => {
      throw new TypeError("fetch failed", {
        cause: Object.assign(new Error("recorded reset"), {
          code: "ECONNRESET",
        }),
      });
    },
    async (response, dir) => {
      assertEqual(response.status, 502);
      await response.text();
      const { finals, terminals } = await recordsAfterBody(dir);
      const attempts = await lines(dir, "proxy-attempts");
      assertEqual(finals.length, 1);
      assertEqual(terminals.length, 1);
      assertEqual(finals[0].account, attempts[attempts.length - 1].account);
      assertEqual(finals[0].account, "telemetry@example.test");
      assertEqual(finals[0].accountType, "oauth");
      assertEqual(finals[0].provider, "anthropic");
      assertEqual(finals[0].errorCode, "ECONNRESET");
    },
  );
});

await test("fallback attempt observers receive enriched trace context even with logging disabled, without duplicate callbacks", async () => {
  const { observeProxyFinalLog } =
    await import("../src/lib/proxy/proxyActivity.js");
  const { logRequestAttempt } =
    await import("../src/lib/proxy/requestLogger.js");
  const { OtelBridge } = await import("../src/lib/observability/otelBridge.js");
  const originalTrace = OtelBridge.prototype.getCurrentTraceContext;
  const traceContext = { traceId: "a".repeat(32), spanId: "b".repeat(16) };
  OtelBridge.prototype.getCurrentTraceContext = () => traceContext;
  const observed: Array<Parameters<typeof logRequestAttempt>[0]> = [];
  let childCalls = 0;
  const shared = (entry: Parameters<typeof logRequestAttempt>[0]) => {
    observed.push({ ...entry });
  };
  const releases = [
    observeProxyFinalLog("observer-parent", () => {}, shared),
    observeProxyFinalLog(
      "observer-child",
      () => {},
      () => {
        childCalls++;
      },
    ),
    observeProxyFinalLog("observer-shared", () => {}, shared),
  ];
  initRequestLogger(false);
  const attempt = {
    timestamp: new Date().toISOString(),
    requestId: "observer-child",
    parentRequestId: "observer-parent",
    attempt: 1,
    method: "POST",
    path: "/backend-api/codex/responses",
    model: "fixture",
    stream: true,
    toolCount: 0,
    account: "fallback@example.test",
    accountType: "oauth",
    responseStatus: 502,
    responseTimeMs: 10,
  };
  try {
    await logRequestAttempt({ ...attempt });
    assertEqual(childCalls, 1);
    assertEqual(observed.length, 1);
    assertEqual(observed[0].account, "fallback@example.test");
    assertEqual(observed[0].traceId, traceContext.traceId);
    assertEqual(observed[0].spanId, traceContext.spanId);
    await logRequestAttempt({ ...attempt, requestId: "observer-shared" });
    assertEqual(observed.length, 2, "shared observer was called twice");
    await logRequestAttempt({ ...attempt, requestId: "observer-parent" });
    assertEqual(observed.length, 3, "same-ID parent was called twice");
  } finally {
    for (const release of releases) {
      release();
    }
    OtelBridge.prototype.getCurrentTraceContext = originalTrace;
  }
});

await test("credentialed history queries reject remote HTTP before transport and permit HTTPS or explicit loopback", async () => {
  const { queryProxyHistory } =
    await import("../scripts/observability/query-proxy-history.mjs");
  let fetches = 0;
  const options = {
    startTime: 1_000_000,
    endTime: 2_000_000,
    authorization: "Basic fixture",
    fetchImpl: async (_input: string | URL | Request, init?: RequestInit) => {
      fetches++;
      assertEqual(
        init?.redirect,
        "error",
        "credentialed query followed a redirect",
      );
      return new Response(JSON.stringify({ hits: [] }), { status: 200 });
    },
  };
  let rejected = false;
  try {
    await queryProxyHistory({
      ...options,
      baseUrl: "http://collector.example.test",
    });
  } catch (error) {
    rejected =
      error instanceof Error && error.message.includes("require HTTPS");
  }
  assert(rejected, "credentialed remote HTTP was accepted");
  assertEqual(fetches, 0, "credentials reached transport before validation");
  for (const baseUrl of [
    "https://collector.example.test",
    "http://127.0.0.1",
    "http://[::1]",
    "http://localhost",
  ]) {
    assertEqual(
      (await queryProxyHistory({ ...options, baseUrl })).complete,
      true,
    );
  }
  assertEqual(fetches, 4);
});

await test("history queries bound time and pages, preserve equal-time ordering and reject incomplete results", async () => {
  const { queryProxyHistory } =
    await import("../scripts/observability/query-proxy-history.mjs");
  const { createServer } = await import("node:http");
  const queries: Array<{
    size: number;
    end_time: number;
    start_time: number;
    sql: string;
  }> = [];
  let mode = "pages";
  const backend = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const { query } = JSON.parse(Buffer.concat(chunks).toString());
    queries.push(query);
    const partial =
      mode === "partial" ||
      (mode === "split" && query.end_time - query.start_time >= 300_000_000);
    const hits =
      mode === "pages" && query.from === 0
        ? Array.from({ length: 200 }, (_, i) => ({
            _timestamp: query.start_time,
            body: String(i).padStart(3, "0"),
          }))
        : [];
    res
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify({ hits, is_partial: partial }));
  });
  await new Promise<void>((resolve) => backend.listen(0, "127.0.0.1", resolve));
  const address = backend.address();
  if (!address || typeof address === "string") {
    throw new Error("backend did not listen");
  }
  const options = {
    baseUrl: `http://127.0.0.1:${address.port}`,
    startTime: 1_000_000,
    endTime: 1_201_000_000,
  };
  try {
    const result = await queryProxyHistory(options);
    assertEqual(result.recordCount, 400);
    assert(
      queries.every(
        (q) => q.size === 200 && q.end_time - q.start_time < 600_000_000,
      ),
      "unbounded history query",
    );
    assert(
      queries.every((q) => q.sql.includes("request_id ASC, body ASC")),
      "equal-time pagination has no tie breaker",
    );
    mode = "split";
    assertEqual((await queryProxyHistory(options)).complete, true);
    mode = "partial";
    let rejected = false;
    try {
      await queryProxyHistory(options);
    } catch {
      rejected = true;
    }
    assert(rejected, "persistent partial results were reported complete");
    mode = "pages";
    rejected = false;
    try {
      await queryProxyHistory({ ...options, maxRows: 1 });
    } catch {
      rejected = true;
    }
    assert(rejected, "row bound silently truncated history");
  } finally {
    await new Promise<void>((resolve) => backend.close(() => resolve()));
  }
});

await runSuite();
