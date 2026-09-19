#!/usr/bin/env tsx
/** Determinism exception: stalled iterators, pre-header disconnects and exact
 * accounting need controlled provider/transport fixtures, never live traffic. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import {
  handleTranslatedStreamRequest,
  handleTranslatedJsonRequest,
} from "../src/lib/proxy/proxyTranslationEngine.js";
import {
  observeProxyFinalLog,
  trackProxyResponse,
  beginProxyRequest,
  getProxyActivitySnapshot,
  consumeInternalProxyRequest,
  getProxyRequestAccounting,
  getProxyBridgeResult,
  releaseProxyRequestAccounting,
} from "../src/lib/proxy/proxyActivity.js";
import {
  createClaudeProxyRoutes,
  __testHooks as claudeProxyTestHooks,
} from "../src/lib/server/routes/claudeProxyRoutes.js";
import { tokenStore } from "../src/lib/auth/tokenStore.js";
import { ModelRouter } from "../src/lib/proxy/modelRouter.js";
import { getProxyUpstreamFailure } from "../src/lib/proxy/proxyFailureDetails.js";
import { ProviderHealthChecker } from "../src/lib/utils/providerHealth.js";
import { createOpenAIProxyRoutes } from "../src/lib/server/routes/openaiProxyRoutes.js";
import { HonoServerAdapter } from "../src/lib/server/adapters/honoAdapter.js";
import {
  initRequestLogger,
  logRequest,
  flushRequestLogs,
  __requestLoggerTestHooks,
} from "../src/lib/proxy/requestLogger.js";
import type {
  ServerContext,
  RequestLogEntry,
  RequestAttemptLogEntry,
  ParsedClaudeRequest,
} from "../src/lib/types/index.js";
initRequestLogger(false);
const parsed: ParsedClaudeRequest = {
  model: "alias",
  prompt: "fixture",
  images: [],
  conversationMessages: [{ role: "user", content: "fixture" }],
  tools: {},
  stream: true,
  maxTokens: 100,
};
const attempts = [{ provider: "openai", model: "actual", label: "fixture" }];
const cases: Array<[string, () => Promise<void>]> = [];
let seq = 0;
function fixture(stream: ServerContext["neurolink"]["stream"]) {
  const abort = new AbortController();
  const ctx = {
    requestId: `lifecycle-fixture-${++seq}`,
    method: "POST",
    path: "/v1/chat/completions",
    headers: { "user-agent": "fixture" },
    query: {},
    params: {},
    metadata: {},
    responseHeaders: {},
    timestamp: Date.now(),
    abortSignal: abort.signal,
    neurolink: { stream },
  } as unknown as ServerContext;
  const finals: RequestLogEntry[] = [];
  const records: RequestAttemptLogEntry[] = [];
  const stop = observeProxyFinalLog(
    ctx.requestId,
    (x) => finals.push({ ...x }),
    (x) => records.push({ ...x }),
  );
  return {
    ctx,
    abort,
    finals,
    records,
    stop,
    args: {
      ctx,
      requestModel: "alias",
      parsed,
      attempts,
      requestStartTime: Date.now(),
    },
  };
}
for (const format of ["claude", "openai", "gemini"] as const) {
  for (const stream of [false, true]) {
    cases.push([
      `${format} ${stream ? "stream" : "json"} serving attribution and usage`,
      async () => {
        const f = fixture(async () => ({
          stream: (async function* () {
            yield { content: "output" };
          })(),
          model: "actual",
          provider: "openai",
          usage: {
            input: 41,
            output: 17,
            total: 77,
            cacheReadTokens: 19,
            reasoning: 9,
          },
        }));
        try {
          const r = stream
            ? await handleTranslatedStreamRequest({ ...f.args, format })
            : await handleTranslatedJsonRequest({ ...f.args, format });
          if (r instanceof Response) {
            await r.text();
          }
          assert.equal(f.finals.length, 1);
          assert.equal(f.records.length, 1);
          const final = f.finals[0];
          assert.equal(final.model, "actual");
          assert.equal(final.requestedModel, "alias");
          assert.equal(final.provider, "openai");
          assert.equal(final.inputTokens, 41);
          assert.equal(final.outputTokens, 17);
          assert.equal(final.cacheReadTokens, 19);
          assert.equal(final.reasoningTokens, 9);
          assert.equal(final.terminalOutcome, "completed");
          assert.ok(final.firstUsefulOutputMs !== undefined);
        } finally {
          f.stop();
        }
      },
    ]);
  }
}
cases.push([
  "cache accounting conserves SDK and AI SDK usage in token budgets",
  async () => {
    const previous = process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
    process.env.NEUROLINK_PROXY_TOKEN_BUDGET = JSON.stringify({
      sessionWindowTokens: 10000,
    });
    try {
      for (const inclusive of [false, true]) {
        const usage = inclusive
          ? {
              inputTokens: 60,
              outputTokens: 17,
              totalTokens: 77,
              cachedInputTokens: 19,
              inputTokenDetails: { noCacheTokens: 41, cacheReadTokens: 19 },
            }
          : { input: 41, output: 17, total: 77, cacheReadTokens: 19 };
        const f = fixture(async () => ({
          stream: (async function* () {
            yield { content: "answer" };
          })(),
          provider: "openai",
          usage: usage as unknown as {
            input: number;
            output: number;
            total: number;
          },
        }));
        f.ctx.headers["x-neurolink-session-id"] = f.ctx.requestId;
        try {
          await handleTranslatedJsonRequest({ ...f.args, format: "openai" });
          assert.equal(
            f.finals[0].tokenBudget?.settlement,
            "provider_reported",
          );
          assert.equal(f.finals[0].tokenBudget?.sessionChargedTokens, 77);
          assert.equal(f.finals[0].inputIncludesCachedTokens, inclusive);
          assert.equal(f.finals[0].inputTokens, inclusive ? 60 : 41);
        } finally {
          f.stop();
        }
      }
    } finally {
      if (previous === undefined) {
        delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
      } else {
        process.env.NEUROLINK_PROXY_TOKEN_BUDGET = previous;
      }
    }
  },
]);
cases.push([
  "stalled iterator cancellation settles independently",
  async () => {
    let received: AbortSignal | undefined;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const f = fixture(async (options) => {
      received = (options as { abortSignal?: AbortSignal }).abortSignal;
      return {
        model: "actual",
        stream: (async function* () {
          await gate;
          yield { content: "late" };
        })(),
      };
    });
    try {
      const response = await handleTranslatedStreamRequest({
        ...f.args,
        format: "openai",
      });
      const read = response.text().catch(() => undefined);
      await delay(20);
      f.abort.abort();
      await delay(30);
      assert.ok(received?.aborted);
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].terminalOutcome, "client_cancelled");
      release();
      await read;
      assert.equal(f.finals.length, 1);
    } finally {
      release();
      f.stop();
    }
  },
]);
cases.push([
  "downstream demand bounds upstream production",
  async () => {
    let produced = 0;
    const f = fixture(async () => ({
      stream: (async function* () {
        for (let i = 0; i < 100; i++) {
          produced++;
          yield { content: "chunk" };
        }
      })(),
    }));
    try {
      const response = await handleTranslatedStreamRequest({
        ...f.args,
        format: "openai",
      });
      await delay(20);
      assert.ok(produced <= 1, `produced ${produced} chunks without demand`);
      await response.text();
      assert.equal(produced, 100);
    } finally {
      f.stop();
    }
  },
]);
for (const afterOutput of [false, true]) {
  cases.push([
    `retry ${afterOutput ? "forbidden after" : "allowed before"} visible output`,
    async () => {
      let calls = 0;
      const f = fixture(async () => {
        calls++;
        return {
          stream: (async function* () {
            if (calls === 1) {
              if (afterOutput) {
                yield { content: "partial" };
              }
              throw Error("fixture fault");
            }
            yield { content: "recovered" };
          })(),
        };
      });
      try {
        const response = await handleTranslatedStreamRequest({
          ...f.args,
          format: "openai",
          attempts: [
            ...attempts,
            { provider: "openai", model: "second", label: "second" },
          ],
        });
        await response.text();
        assert.equal(calls, afterOutput ? 1 : 2);
        assert.equal(
          f.finals[0].terminalOutcome,
          afterOutput ? "stream_error" : "completed",
        );
      } finally {
        f.stop();
      }
    },
  ]);
}
cases.push([
  "source errors settle without another downstream read",
  async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const outcomes: string[] = [];
    const response = trackProxyResponse(
      new Response(
        new ReadableStream({
          start(c) {
            source = c;
            c.enqueue(new Uint8Array([1]));
          },
        }),
      ),
      beginProxyRequest(),
      {
        onTerminal: (d) => {
          outcomes.push(d.outcome);
        },
      },
    );
    await delay(5);
    source.error(Error("upstream closed"));
    await delay(10);
    assert.deepEqual(outcomes, ["stream_error"]);
    assert.equal(getProxyActivitySnapshot().activeRequests, 0);
    await response.body?.cancel().catch(() => undefined);
    assert.equal(outcomes.length, 1);
  },
]);
cases.push([
  "deadline aborts an iterator stalled after headers",
  async () => {
    const original = setTimeout;
    let received: AbortSignal | undefined;
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    globalThis.setTimeout = ((
      fn: (...args: unknown[]) => void,
      ms: number | undefined,
      ...args: unknown[]
    ) => original(fn, ms === 300000 ? 25 : ms, ...args)) as typeof setTimeout;
    const f = fixture(async (options) => {
      received = (options as { abortSignal?: AbortSignal }).abortSignal;
      return {
        stream: (async function* () {
          await gate;
          yield { content: "late" };
        })(),
      };
    });
    try {
      const response = await handleTranslatedStreamRequest({
        ...f.args,
        format: "openai",
      });
      const read = response.text().catch(() => undefined);
      await delay(65);
      assert.ok(received?.aborted);
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].responseStatus, 504);
      assert.equal(f.finals[0].errorType, "upstream_timeout");
      release();
      await read;
    } finally {
      release();
      globalThis.setTimeout = original;
      f.stop();
    }
  },
]);
cases.push([
  "absent usage stays absent and explicit zero stays zero",
  async () => {
    for (const usage of [undefined, { input: 0, output: 0, total: 0 }]) {
      const f = fixture(async () => ({
        stream: (async function* () {
          yield { content: "answer" };
        })(),
        usage,
      }));
      try {
        await handleTranslatedJsonRequest({ ...f.args, format: "openai" });
        assert.equal(f.finals[0].inputTokens, usage?.input);
        assert.equal(f.finals[0].outputTokens, usage?.output);
      } finally {
        f.stop();
      }
    }
  },
]);
cases.push([
  "primed streaming starts after one chunk and keeps caller retry boundary",
  async () => {
    let produced = 0;
    const f = fixture(async () => ({
      stream: (async function* () {
        for (let i = 0; i < 100; i++) {
          produced++;
          yield { content: "chunk" };
        }
      })(),
    }));
    try {
      const response = await handleTranslatedStreamRequest({
        ...f.args,
        format: "claude",
        prefetchFirstOutput: true,
      });
      assert.equal(produced, 1);
      await response.text();
      assert.equal(produced, 100);
      assert.equal(f.finals.length, 1);
    } finally {
      f.stop();
    }
    const failed = fixture(async () => {
      throw Error("pre-output-failure");
    });
    try {
      await assert.rejects(
        handleTranslatedStreamRequest({
          ...failed.args,
          format: "claude",
          prefetchFirstOutput: true,
        }),
        /pre-output-failure/,
      );
      assert.equal(failed.finals.length, 0);
      assert.equal(failed.records.length, 1);
    } finally {
      failed.stop();
    }
  },
]);
cases.push([
  "JSON retry discards undelivered text from a failed provider",
  async () => {
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      return {
        stream: (async function* () {
          if (calls === 1) {
            yield { content: "discard" };
            throw Error("partial buffered failure");
          }
          yield { content: "kept" };
        })(),
      };
    });
    try {
      const response = await handleTranslatedJsonRequest({
        ...f.args,
        format: "openai",
        attempts: [
          ...attempts,
          { provider: "openai", model: "second", label: "second" },
        ],
      });
      assert.equal(calls, 2);
      assert.ok(!JSON.stringify(response).includes("discard"));
      assert.ok(JSON.stringify(response).includes("kept"));
      assert.equal(f.finals.length, 1);
    } finally {
      f.stop();
    }
  },
]);
cases.push([
  "budget denial makes no provider call and does not try another provider",
  async () => {
    const old = process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
    process.env.NEUROLINK_PROXY_TOKEN_BUDGET = JSON.stringify({
      maxInFlightTokens: 1,
    });
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      return {
        stream: (async function* () {
          yield { content: "should not run" };
        })(),
      };
    });
    try {
      const response = await handleTranslatedJsonRequest({
        ...f.args,
        format: "openai",
        attempts: [
          ...attempts,
          { provider: "vertex", model: "second", label: "second" },
        ],
      });
      assert.ok(response instanceof Response);
      assert.equal(response.status, 429);
      assert.equal(calls, 0);
      assert.equal(f.finals[0].responseStatus, 429);
      assert.equal(f.finals[0].retryable, false);
      assert.equal(f.records.length, 1);
      assert.equal(f.records[0].upstreamDispatched, false);
    } finally {
      if (old === undefined) {
        delete process.env.NEUROLINK_PROXY_TOKEN_BUDGET;
      } else {
        process.env.NEUROLINK_PROXY_TOKEN_BUDGET = old;
      }
      f.stop();
    }
  },
]);
cases.push([
  "context refusal retains exact local cause and skips provider",
  async () => {
    const old = process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
    process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
      maxInputTokens: 1,
    });
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      return {
        stream: (async function* () {
          yield { content: "should not run" };
        })(),
      };
    });
    try {
      const response = await handleTranslatedJsonRequest({
        ...f.args,
        format: "gemini",
      });
      assert.ok(response instanceof Response);
      assert.equal(response.status, 400);
      assert.equal(calls, 0);
      assert.equal(f.finals[0].errorCode, "proxy_input_budget_exceeded");
      assert.ok(f.finals[0].contextPreflight);
      assert.equal(f.records[0].upstreamDispatched, false);
    } finally {
      if (old === undefined) {
        delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
      } else {
        process.env.NEUROLINK_PROXY_CONTEXT_POLICY = old;
      }
      f.stop();
    }
  },
]);
for (const format of ["claude", "openai", "gemini"] as const) {
  for (const stream of [false, true]) {
    cases.push([
      `${format} ${stream ? "stream" : "json"} SDK policy denial retains cause and stops fallback`,
      async () => {
        let calls = 0;
        const f = fixture(async () => {
          calls++;
          throw Object.assign(
            new Error("Provider denied request Bearer abcdefghijklmnop"),
            {
              status: 403,
              code: "content_policy_violation",
              retryable: false,
            },
          );
        });
        try {
          const args = {
            ...f.args,
            format,
            attempts: [
              ...attempts,
              { provider: "vertex", model: "second", label: "second" },
            ],
          };
          const response = stream
            ? await handleTranslatedStreamRequest(args)
            : await handleTranslatedJsonRequest(args);
          assert.ok(response instanceof Response);
          const text = await response.text();
          assert.equal(calls, 1);
          assert.equal(f.records.length, 1);
          assert.equal(f.finals.length, 1);
          for (const entry of [f.records[0], f.finals[0]]) {
            assert.equal(entry.responseStatus, 403);
            assert.equal(entry.errorCode, "content_policy_violation");
            assert.equal(entry.retryable, false);
            assert.ok(entry.errorMessage?.includes("Provider denied request"));
            assert.ok(!entry.errorMessage?.includes("abcdefghijklmnop"));
          }
          assert.ok(text.includes("content_policy_violation"));
          assert.ok(text.includes('"retryable":false'));
          assert.ok(!text.includes("abcdefghijklmnop"));
          if (!stream) {
            assert.equal(response.status, 403);
          }
        } finally {
          f.stop();
        }
      },
    ]);
  }
}
cases.push([
  "structured nested SDK errors and explicit transient failover remain distinct",
  async () => {
    assert.deepEqual(
      getProxyUpstreamFailure(
        Object.assign(new Error("SDK call failed"), {
          statusCode: 403,
          isRetryable: true,
          responseBody: JSON.stringify({
            error: { code: "content_filter", message: "refused" },
          }),
        }),
      ),
      {
        status: 403,
        code: "content_filter",
        retryable: false,
        message: "refused",
      },
    );
    let calls = 0;
    const f = fixture(async () => {
      if (++calls === 1) {
        throw Object.assign(new Error("busy"), {
          status: 503,
          code: "provider_busy",
          retryable: true,
        });
      }
      return {
        stream: (async function* () {
          yield { content: "recovered" };
        })(),
      };
    });
    try {
      await handleTranslatedJsonRequest({
        ...f.args,
        format: "openai",
        attempts: [
          ...attempts,
          { provider: "vertex", model: "second", label: "second" },
        ],
      });
      assert.equal(calls, 2);
      assert.equal(f.records[0].responseStatus, 503);
      assert.equal(f.records[0].errorCode, "provider_busy");
      assert.equal(f.records[0].retryable, true);
      assert.equal(f.finals[0].responseStatus, 200);
    } finally {
      f.stop();
    }
  },
]);
cases.push([
  "explicit SDK terminal status and retryability survive unknown provider codes",
  async () => {
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      throw Object.assign(new Error("vendor denied"), {
        status: 422,
        code: "vendor_denied",
        retryable: false,
      });
    });
    try {
      const response = await handleTranslatedJsonRequest({
        ...f.args,
        format: "openai",
        attempts: [
          ...attempts,
          { provider: "vertex", model: "second", label: "second" },
        ],
      });
      assert.ok(response instanceof Response);
      assert.equal(response.status, 422);
      assert.equal(calls, 1);
      assert.equal(f.finals[0].errorCode, "vendor_denied");
      assert.equal(f.finals[0].retryable, false);
      assert.equal(f.records[0].responseStatus, 422);
    } finally {
      f.stop();
    }
  },
]);
for (const stream of [false, true]) {
  cases.push([
    `Claude parent ${stream ? "stream" : "json"} stops configured SDK chain after policy denial`,
    async () => {
      let calls = 0;
      const f = fixture(async () => {
        calls++;
        throw Object.assign(
          new Error("SDK policy denied Bearer abcdefghijklmnop"),
          { status: 403, code: "content_policy_violation", retryable: false },
        );
      });
      f.ctx.path = "/v1/messages";
      f.ctx.body = {
        model: "claude-sonnet-5",
        max_tokens: 32,
        stream,
        messages: [{ role: "user", content: "fixture" }],
      };
      const router = new ModelRouter({
        strategy: "fill-first",
        modelMappings: [],
        fallbackChain: [
          { provider: "openai", model: "actual" },
          { provider: "vertex", model: "second" },
        ],
      });
      const route = createClaudeProxyRoutes(
        router,
        "",
        "fill-first",
        false,
        undefined,
        new Set(),
      ).routes.find((r) => r.path === "/v1/messages");
      assert.ok(route);
      const originalAvailability =
        ProviderHealthChecker.checkFallbackProviderAvailability;
      ProviderHealthChecker.checkFallbackProviderAvailability = async () => ({
        available: true,
      });
      try {
        const result = await route.handler(f.ctx);
        if (result instanceof Response) {
          await result.text();
        }
        assert.equal(calls, 1);
        assert.equal(f.finals.length, 1);
        assert.equal(f.finals[0].responseStatus, 403);
        assert.equal(f.finals[0].errorCode, "content_policy_violation");
        assert.equal(f.finals[0].retryable, false);
        assert.ok(!f.finals[0].errorMessage?.includes("abcdefghijklmnop"));
      } finally {
        ProviderHealthChecker.checkFallbackProviderAvailability =
          originalAvailability;
        f.stop();
      }
    },
  ]);
}
for (const scenario of [
  "pre-aborted",
  "during-fetch",
  "network-error",
] as const) {
  cases.push([
    `bridge ${scenario} preserves cancellation and network classification`,
    async () => {
      const f = fixture(async () => {
        throw Error("SDK should not run for bridge");
      });
      f.ctx.body = {
        model: "alias",
        messages: [{ role: "user", content: "fixture" }],
      };
      const router = {
        resolve: () => ({ provider: "anthropic", model: "claude-sonnet-5" }),
      } as unknown as Parameters<typeof createOpenAIProxyRoutes>[0];
      const route = createOpenAIProxyRoutes(router, "", 61239).routes.find(
        (r) => r.path === "/v1/chat/completions",
      );
      assert.ok(route);
      const original = globalThis.fetch;
      let signal: AbortSignal | undefined;
      let calls = 0;
      globalThis.fetch = async (_input, init) => {
        calls++;
        signal = init?.signal ?? undefined;
        if (scenario === "network-error") {
          throw Error("fixture network closed");
        }
        return new Promise((_resolve, reject) => {
          signal?.addEventListener("abort", () => reject(signal?.reason), {
            once: true,
          });
        });
      };
      try {
        if (scenario === "pre-aborted") {
          f.abort.abort();
        }
        const response = route.handler(f.ctx);
        if (scenario === "during-fetch") {
          await delay(10);
          f.abort.abort();
        }
        const value = await response;
        assert.ok(value instanceof Response);
        assert.equal(value.status, scenario === "network-error" ? 502 : 499);
        assert.equal(f.finals.length, 1);
        assert.equal(calls, scenario === "pre-aborted" ? 0 : 1);
        if (scenario === "during-fetch") {
          assert.equal(signal?.aborted, true);
        }
      } finally {
        globalThis.fetch = original;
        f.stop();
      }
    },
  ]);
}
for (const stream of [false, true]) {
  cases.push([
    `pre-output ${stream ? "stream" : "json"} timeout advances the next attempt without cancelling the client`,
    async () => {
      const received: AbortSignal[] = [];
      let cancelled = false;
      const f = fixture(async (options) => {
        const signal = (options as { abortSignal?: AbortSignal }).abortSignal;
        assert.ok(signal);
        received.push(signal);
        if (received.length === 1) {
          return {
            stream: {
              [Symbol.asyncIterator]: () => ({
                next: () => new Promise<IteratorResult<never>>(() => {}),
                return: async () => {
                  cancelled = true;
                  return { done: true as const, value: undefined };
                },
              }),
            },
          };
        }
        assert.equal(signal.aborted, false);
        return {
          stream: (async function* () {
            yield { content: "recovered" };
          })(),
          model: "second",
          provider: "vertex",
        };
      });
      const keepAlive = setTimeout(() => {}, 1000);
      try {
        const args = {
          ...f.args,
          format: "openai" as const,
          attempts: [
            ...attempts,
            { provider: "vertex", model: "second", label: "second" },
          ],
          attemptTimeoutMs: 15,
        };
        const response = stream
          ? await handleTranslatedStreamRequest(args)
          : await handleTranslatedJsonRequest(args);
        const text =
          response instanceof Response
            ? await response.text()
            : JSON.stringify(response);
        assert.match(text, /recovered/);
        assert.equal(received.length, 2);
        assert.equal(received[0].reason?.name, "TimeoutError");
        assert.equal(cancelled, true);
        assert.equal(f.abort.signal.aborted, false);
        assert.deepEqual(
          f.records.map((entry) => entry.responseStatus),
          [504, 200],
        );
        assert.equal(f.finals.length, 1);
        assert.equal(f.finals[0].responseStatus, 200);
      } finally {
        clearTimeout(keepAlive);
        f.stop();
      }
    },
  ]);
}
cases.push([
  "deadline after visible output finalizes without another client read or fallback",
  async () => {
    let calls = 0;
    let cancelled = false;
    const f = fixture(async () => {
      calls++;
      let yielded = false;
      return {
        stream: {
          [Symbol.asyncIterator]: () => ({
            next: async () => {
              if (!yielded) {
                yielded = true;
                return { done: false as const, value: { content: "visible" } };
              }
              return new Promise<IteratorResult<never>>(() => {});
            },
            return: async () => {
              cancelled = true;
              return { done: true as const, value: undefined };
            },
          }),
        },
      };
    });
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await handleTranslatedStreamRequest({
        ...f.args,
        format: "openai",
        attemptTimeoutMs: 20,
        attempts: [
          ...attempts,
          { provider: "vertex", model: "second", label: "second" },
        ],
      });
      reader = response.body!.getReader();
      let output = "";
      while (!output.includes("visible")) {
        const chunk: ReadableStreamReadResult<Uint8Array> = await reader.read();
        assert.equal(chunk.done, false);
        output += new TextDecoder().decode(chunk.value);
      }
      await delay(40);
      assert.equal(calls, 1);
      assert.equal(cancelled, true);
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].responseStatus, 504);
      assert.equal(f.finals[0].errorType, "upstream_timeout");
    } finally {
      await reader?.cancel().catch(() => {});
      f.stop();
    }
  },
]);
cases.push([
  "exhausted JSON attempt deadline is 504 without aborting the client",
  async () => {
    const f = fixture(async () => ({
      stream: {
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise<IteratorResult<never>>(() => {}),
          return: async () => ({ done: true as const, value: undefined }),
        }),
      },
    }));
    const keepAlive = setTimeout(() => {}, 1000);
    try {
      const response = await handleTranslatedJsonRequest({
        ...f.args,
        format: "claude",
        attemptTimeoutMs: 15,
      });
      assert.ok(response instanceof Response);
      assert.equal(response.status, 504);
      assert.equal(f.abort.signal.aborted, false);
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].errorType, "upstream_timeout");
    } finally {
      clearTimeout(keepAlive);
      f.stop();
    }
  },
]);
cases.push([
  "client cancellation stops all pending configured attempts",
  async () => {
    let calls = 0;
    const f = fixture(async () => {
      calls++;
      return new Promise(() => {});
    });
    try {
      const pending = handleTranslatedJsonRequest({
        ...f.args,
        format: "openai",
        attempts: [
          ...attempts,
          { provider: "vertex", model: "second", label: "second" },
        ],
      });
      await delay(5);
      f.abort.abort();
      const response = await pending;
      assert.ok(response instanceof Response);
      assert.equal(response.status, 499);
      assert.equal(calls, 1);
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].errorType, "client_cancelled");
    } finally {
      f.stop();
    }
  },
]);
for (const provider of [undefined, "openai"] as const) {
  for (const stream of [false, true]) {
    cases.push([
      `Claude ${stream ? "stream" : "json"} fallback preserves ${provider ?? "automatic"} SDK provider selection`,
      async () => {
        let calls = 0;
        const model = provider ? "configured-model" : undefined;
        const f = fixture(async (options) => {
          calls++;
          assert.equal(options.provider, provider);
          assert.equal(options.model, model);
          return {
            stream: (async function* () {
              yield { content: "selected" };
            })(),
            provider: "openai",
            model: "selected-model",
          };
        });
        f.ctx.path = "/v1/messages";
        try {
          const response =
            await claudeProxyTestHooks.executeClaudeFallbackWithRetry({
              ctx: f.ctx,
              body: {
                model: "claude-sonnet-5",
                max_tokens: 32,
                stream,
                messages: [{ role: "user", content: "fixture" }],
              },
              options: { ...(provider ? { provider, model } : {}) } as never,
              providerLabel: provider
                ? `${provider}/selected`
                : "auto-provider",
              requestStartTime: Date.now(),
              logProxyBody: () => {},
              logFinalRequest: () => {},
            });
          const text =
            response instanceof Response
              ? await response.text()
              : JSON.stringify(response);
          assert.match(text, /selected/);
          assert.equal(calls, 1);
        } finally {
          f.stop();
        }
      },
    ]);
  }
}
cases.push([
  "native passthrough parses and prepares each dispatched body only once",
  async () => {
    const f = fixture(async () => {
      throw Error("SDK must not run for passthrough");
    });
    f.ctx.path = "/v1/messages";
    f.ctx.body = {
      model: "claude-sonnet-5",
      max_tokens: 32,
      stream: false,
      messages: [{ role: "user", content: "preparation-count-fixture" }],
      tools: [
        { name: "keep", input_schema: { type: "object" } },
        { name: "discard", input_schema: { type: "object" } },
      ],
    };
    const originalPolicy = process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
    process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
      toolAllowlist: ["keep"],
    });
    const originalParse = JSON.parse;
    const originalFetch = globalThis.fetch;
    let requestParses = 0;
    let calls = 0;
    JSON.parse = ((...args: Parameters<typeof JSON.parse>) => {
      if (args[0].includes("preparation-count-fixture")) {
        requestParses++;
      }
      return originalParse(...args);
    }) as typeof JSON.parse;
    globalThis.fetch = async (input, init) => {
      assert.match(String(input), /^https:\/\/api\.anthropic\.com\//);
      calls++;
      const wire = originalParse(String(init?.body));
      assert.deepEqual(
        wire.tools.map((tool: { name: string }) => tool.name),
        ["keep"],
      );
      return new Response(
        JSON.stringify({
          id: "msg_fixture",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          content: [{ type: "text", text: "native" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 3, output_tokens: 2 },
        }),
        { headers: { "content-type": "application/json" } },
      );
    };
    try {
      const route = createClaudeProxyRoutes(
        undefined,
        "",
        "fill-first",
        true,
      ).routes.find((r) => r.path === "/v1/messages");
      assert.ok(route);
      const response = await route.handler(f.ctx);
      if (response instanceof Response) {
        await response.text();
      }
      assert.equal(calls, 1);
      assert.equal(requestParses, 1);
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].responseStatus, 200);
      assert.equal(f.finals[0].contextPreflight?.originalToolCount, 2);
      assert.equal(f.finals[0].contextPreflight?.retainedToolCount, 1);
    } finally {
      JSON.parse = originalParse;
      globalThis.fetch = originalFetch;
      if (originalPolicy === undefined) {
        delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
      } else {
        process.env.NEUROLINK_PROXY_CONTEXT_POLICY = originalPolicy;
      }
      f.stop();
    }
  },
]);
cases.push([
  "stale Codex fallback metadata cannot retype a later Anthropic account",
  async () => {
    const accountKey = "anthropic:lifecycle-native@example.test";
    await tokenStore.saveTokens(accountKey, {
      accessToken: "isolated-native-fixture",
      tokenType: "Bearer",
      expiresAt: Date.now() + 3600000,
    });
    const f = fixture(async () => {
      throw Error("SDK must not run for native Anthropic fixture");
    });
    f.ctx.path = "/v1/messages";
    f.ctx.body = {
      model: "claude-sonnet-5",
      max_tokens: 32,
      stream: false,
      messages: [{ role: "user", content: "fixture" }],
    };
    f.ctx.metadata.codexFallbackAccount = "previous-codex@example.test";
    f.ctx.metadata.codexFallbackAccountType = "codex-oauth";
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      assert.match(String(input), /^https:\/\/api\.anthropic\.com\//);
      return new Response(
        JSON.stringify({
          id: "msg_fixture",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          content: [{ type: "text", text: "native" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 3, output_tokens: 2 },
        }),
        { headers: { "content-type": "application/json" } },
      );
    };
    try {
      const route = createClaudeProxyRoutes(
        undefined,
        "",
        "fill-first",
        false,
        undefined,
        new Set([accountKey]),
      ).routes.find((r) => r.path === "/v1/messages");
      assert.ok(route);
      const response = await route.handler(f.ctx);
      if (response instanceof Response) {
        await response.text();
      }
      assert.equal(f.finals.length, 1);
      assert.equal(f.finals[0].responseStatus, 200);
      assert.equal(f.finals[0].account, "lifecycle-native@example.test");
      assert.equal(f.finals[0].accountType, "oauth");
      assert.equal(f.finals[0].accountKey, accountKey);
      assert.equal(f.finals[0].provider, "anthropic");
    } finally {
      globalThis.fetch = originalFetch;
      f.stop();
    }
  },
]);
for (const scenario of [
  "clean-reader",
  "error-reader",
  "error-signal",
] as const) {
  const upstreamError = scenario !== "clean-reader";
  cases.push([
    `bridge ${scenario} cancellation ${upstreamError ? "preserves an observed upstream SSE error" : "remains a client cancellation before any error"}`,
    async () => {
      const f = fixture(async () => {
        throw Error("SDK should not run for bridge");
      });
      f.ctx.body = {
        model: "alias",
        stream: true,
        messages: [{ role: "user", content: "fixture" }],
      };
      const router = {
        resolve: () => ({ provider: "anthropic", model: "claude-sonnet-5" }),
      } as unknown as Parameters<typeof createOpenAIProxyRoutes>[0];
      let cancelled = false;
      let upstreamSignal: AbortSignal | undefined;
      const route = createOpenAIProxyRoutes(
        router,
        "",
        61239,
        undefined,
        (request) => {
          upstreamSignal = request.signal;
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                const frame = upstreamError
                  ? 'event: error\ndata: {"type":"error","error":{"type":"api_error","message":"upstream broke"}}\n\n'
                  : 'event: message_start\ndata: {"type":"message_start","message":{"id":"fixture","usage":{"input_tokens":1}}}\n\n';
                controller.enqueue(new TextEncoder().encode(frame));
              },
              cancel() {
                cancelled = true;
              },
            }),
            { headers: { "content-type": "text/event-stream" } },
          );
        },
      ).routes.find((r) => r.path === "/v1/chat/completions");
      assert.ok(route);
      try {
        const response = await route.handler(f.ctx);
        assert.ok(response instanceof Response);
        const reader = response.body!.getReader();
        const first = await reader.read();
        assert.equal(first.done, false);
        if (upstreamError) {
          assert.match(new TextDecoder().decode(first.value), /upstream broke/);
        }
        if (scenario === "error-signal") {
          f.abort.abort(new DOMException("client disconnected", "AbortError"));
          await delay(0);
        } else {
          await reader.cancel("client stopped reading");
        }
        assert.equal(f.finals.length, 1);
        assert.equal(f.finals[0].responseStatus, upstreamError ? 502 : 499);
        assert.equal(
          f.finals[0].errorType,
          upstreamError ? "loopback_stream_error" : "client_cancelled",
        );
        assert.equal(cancelled, true);
        assert.equal(upstreamSignal?.aborted, true);
      } finally {
        f.stop();
      }
    },
  ]);
}
for (const upstreamError of [false, true]) {
  cases.push([
    `bridge cancellation bypasses delayed metadata while preserving ${upstreamError ? "upstream failure" : "client cancellation"}`,
    async () => {
      const f = fixture(async () => {
        throw Error("SDK should not run for bridge");
      });
      f.ctx.body = {
        model: "alias",
        stream: true,
        messages: [{ role: "user", content: "fixture" }],
      };
      const previousSink = process.env.NEUROLINK_PROXY_LOG_SINK;
      const otelEnvironment = Object.entries(process.env).filter(([name]) =>
        name.startsWith("OTEL_"),
      );
      for (const [name] of otelEnvironment) {
        delete process.env[name];
      }
      let releaseMetadata = () => {};
      let markMetadataStarted = () => {};
      const metadataBlocked = new Promise<void>((resolve) => {
        releaseMetadata = resolve;
      });
      const metadataStarted = new Promise<void>((resolve) => {
        markMetadataStarted = resolve;
      });
      let metadataFinished = false;
      let cancelled = false;
      let upstreamSignal: AbortSignal | undefined;
      let cancellation: Promise<void> | undefined;
      const logDir = await mkdtemp(join(tmpdir(), "proxy-lifecycle-log-"));
      process.env.NEUROLINK_PROXY_LOG_SINK = "disk";
      initRequestLogger(true, logDir);
      __requestLoggerTestHooks.setAppendFileForTests(async (_path, data) => {
        const entry = JSON.parse(String(data));
        if (entry.requestId === f.ctx.requestId && entry.errorType) {
          markMetadataStarted();
          await metadataBlocked;
          metadataFinished = true;
        }
      });
      try {
        const router = {
          resolve: () => ({ provider: "anthropic", model: "claude-sonnet-5" }),
        } as unknown as Parameters<typeof createOpenAIProxyRoutes>[0];
        const route = createOpenAIProxyRoutes(
          router,
          "",
          61239,
          undefined,
          (request) => {
            upstreamSignal = request.signal;
            return new Response(
              new ReadableStream<Uint8Array>({
                start(controller) {
                  const frame = upstreamError
                    ? 'event: error\ndata: {"type":"error","error":{"type":"api_error","message":"upstream broke"}}\n\n'
                    : 'event: message_start\ndata: {"type":"message_start","message":{"id":"fixture","usage":{"input_tokens":1}}}\n\n';
                  controller.enqueue(new TextEncoder().encode(frame));
                },
                cancel() {
                  cancelled = true;
                },
              }),
              { headers: { "content-type": "text/event-stream" } },
            );
          },
        ).routes.find((route) => route.path === "/v1/chat/completions");
        assert.ok(route);
        const response = await route.handler(f.ctx);
        assert.ok(response instanceof Response);
        const reader = response.body!.getReader();
        assert.equal((await reader.read()).done, false);
        cancellation = reader.cancel("client stopped reading");
        await Promise.race([
          metadataStarted,
          delay(1000).then(() => {
            throw Error("delayed metadata writer was not reached");
          }),
        ]);
        await delay(0);
        assert.equal(
          metadataFinished,
          false,
          "metadata fixture did not stay blocked",
        );
        assert.equal(
          upstreamSignal?.aborted,
          true,
          "logging delayed upstream abort",
        );
        assert.equal(
          cancelled,
          true,
          "logging delayed upstream reader cancellation",
        );
        assert.equal(f.finals.length, 1);
        assert.equal(f.finals[0].responseStatus, upstreamError ? 502 : 499);
        assert.equal(
          f.finals[0].errorType,
          upstreamError ? "loopback_stream_error" : "client_cancelled",
        );
      } finally {
        releaseMetadata();
        await cancellation?.catch(() => {});
        await flushRequestLogs();
        __requestLoggerTestHooks.restoreAppendFileForTests();
        initRequestLogger(false);
        await rm(logDir, { recursive: true, force: true });
        Object.assign(process.env, Object.fromEntries(otelEnvironment));
        if (previousSink === undefined) {
          delete process.env.NEUROLINK_PROXY_LOG_SINK;
        } else {
          process.env.NEUROLINK_PROXY_LOG_SINK = previousSink;
        }
        f.stop();
      }
    },
  ]);
}
for (const stream of [false, true]) {
  cases.push([
    `automatic ${stream ? "stream" : "json"} failure keeps unknown serving model separate from requested model`,
    async () => {
      const f = fixture(async (options) => {
        assert.equal(options.provider, undefined);
        assert.equal(options.model, undefined);
        throw Error("automatic provider failed before exposing attribution");
      });
      try {
        const args = {
          ...f.args,
          format: "claude" as const,
          attempts: [{ label: "auto-provider" }],
        };
        const response = stream
          ? await handleTranslatedStreamRequest(args)
          : await handleTranslatedJsonRequest(args);
        assert.ok(response instanceof Response);
        await response.text();
        assert.equal(f.finals.length, 1);
        assert.equal(f.records.length, 1);
        assert.equal(f.finals[0].servingModelStatus, "unavailable");
        for (const entry of [...f.finals, ...f.records]) {
          assert.equal(entry.model, "unknown");
          assert.equal(entry.requestedModel, "alias");
          assert.equal(entry.provider, undefined);
          assert.equal(entry.inputTokens, undefined);
          assert.equal(entry.outputTokens, undefined);
        }
      } finally {
        f.stop();
      }
    },
  ]);
}
for (const stream of [false, true]) {
  for (const outcome of [
    "terminal-policy",
    "cancelled",
    "automatic-success",
    "automatic-policy",
  ] as const) {
    cases.push([
      `native Claude ${stream ? "stream" : "json"} fallback honors ${outcome} across automatic routing`,
      async () => {
        const accountKey = `anthropic:auto-${outcome}-${stream}@example.test`;
        await tokenStore.saveTokens(accountKey, {
          accessToken: "isolated-automatic-fallback-fixture",
          tokenType: "Bearer",
          expiresAt: Date.now() + 3600000,
        });
        const calls: Array<
          Pick<
            Parameters<ServerContext["neurolink"]["stream"]>[0],
            "provider" | "model"
          >
        > = [];
        const f = fixture(async (options) => {
          calls.push({ provider: options.provider, model: options.model });
          if (options.provider === "openai") {
            if (outcome === "cancelled") {
              f.abort.abort();
            }
            throw Object.assign(new Error("configured fixture failure"), {
              status: outcome === "terminal-policy" ? 403 : 503,
              code:
                outcome === "terminal-policy"
                  ? "content_policy_violation"
                  : "configured_busy",
              retryable: outcome !== "terminal-policy",
            });
          }
          if (outcome === "automatic-policy") {
            throw Object.assign(new Error("automatic fixture policy denied"), {
              status: 403,
              code: "automatic_policy_denial",
              retryable: false,
            });
          }
          return {
            stream: (async function* () {
              yield { content: "automatic success" };
            })(),
            provider: "vertex",
            model: "automatic-model",
          };
        });
        f.ctx.path = "/v1/messages";
        f.ctx.body = {
          model: "claude-sonnet-5",
          max_tokens: 32,
          stream,
          messages: [{ role: "user", content: "fixture" }],
        };
        const originalFetch = globalThis.fetch;
        const originalAvailability =
          ProviderHealthChecker.checkFallbackProviderAvailability;
        let nativeCalls = 0;
        globalThis.fetch = async (input) => {
          assert.match(String(input), /^https:\/\/api\.anthropic\.com\//);
          nativeCalls++;
          return new Response(
            JSON.stringify({
              type: "error",
              error: {
                type: "authentication_error",
                message: "fixture denied",
              },
            }),
            { status: 403, headers: { "content-type": "application/json" } },
          );
        };
        ProviderHealthChecker.checkFallbackProviderAvailability = async () => ({
          available: true,
        });
        try {
          const router = new ModelRouter({
            strategy: "fill-first",
            modelMappings: [],
            fallbackChain: [{ provider: "openai", model: "configured-model" }],
            autoFallback: true,
          });
          const route = createClaudeProxyRoutes(
            router,
            "",
            "fill-first",
            false,
            undefined,
            new Set([accountKey]),
          ).routes.find((r) => r.path === "/v1/messages");
          assert.ok(route);
          const response = await route.handler(f.ctx);
          const text =
            response instanceof Response
              ? await response.text()
              : JSON.stringify(response);
          const automatic = outcome.startsWith("automatic-");
          assert.equal(nativeCalls, 1);
          assert.deepEqual(calls, [
            { provider: "openai", model: "configured-model" },
            ...(automatic ? [{ provider: undefined, model: undefined }] : []),
          ]);
          assert.equal(f.finals.length, 1);
          const final = f.finals[0];
          assert.equal(
            final.responseStatus,
            outcome === "cancelled"
              ? 499
              : outcome === "automatic-success"
                ? 200
                : 403,
          );
          if (outcome === "automatic-success") {
            assert.match(text, /automatic success/);
            assert.equal(final.model, "automatic-model");
            assert.equal(final.provider, "vertex");
          } else if (outcome === "cancelled") {
            assert.equal(final.errorType, "client_cancelled");
          } else {
            const code =
              outcome === "automatic-policy"
                ? "automatic_policy_denial"
                : "content_policy_violation";
            assert.ok(response instanceof Response);
            assert.equal(response.status, 403);
            assert.equal(JSON.parse(text).error.code, code);
            assert.equal(final.errorCode, code);
            assert.equal(final.retryable, false);
            if (outcome === "automatic-policy") {
              assert.equal(final.model, "unknown");
              assert.equal(final.provider, undefined);
              assert.ok(!final.errorMessage?.includes("configured"));
            }
          }
        } finally {
          globalThis.fetch = originalFetch;
          ProviderHealthChecker.checkFallbackProviderAvailability =
            originalAvailability;
          f.stop();
        }
      },
    ]);
  }
}
for (const stream of [false, true]) {
  for (const timeout of [false, true]) {
    cases.push([
      `exhausted ${stream ? "stream" : "json"} ${timeout ? "attempt deadline" : "generation failure"} preserves final classification`,
      async () => {
        let calls = 0;
        let attemptSignal: AbortSignal | undefined;
        const f = fixture(async (options) => {
          calls++;
          attemptSignal =
            "abortSignal" in options ? options.abortSignal : undefined;
          if (timeout) {
            return new Promise(() => {});
          }
          throw new Error("ordinary generation failure");
        });
        const keepAlive = setTimeout(() => {}, 1000);
        try {
          const args = {
            ...f.args,
            format: "claude" as const,
            attemptTimeoutMs: 15,
          };
          const response = stream
            ? await handleTranslatedStreamRequest(args)
            : await handleTranslatedJsonRequest(args);
          assert.ok(response instanceof Response);
          const text = await response.text();
          const status = timeout ? 504 : 502;
          const errorType = timeout ? "upstream_timeout" : "generation_error";
          assert.equal(response.status, stream ? 200 : status);
          assert.match(text, /error/);
          assert.equal(calls, 1);
          assert.equal(f.abort.signal.aborted, false);
          if (timeout) {
            assert.equal(attemptSignal?.reason?.name, "TimeoutError");
          }
          assert.equal(f.finals.length, 1);
          assert.equal(f.records.length, 1);
          assert.equal(f.finals[0].responseStatus, status);
          assert.equal(f.finals[0].errorType, errorType);
          assert.equal(f.records[0].responseStatus, status);
          assert.equal(f.records[0].errorType, errorType);
        } finally {
          clearTimeout(keepAlive);
          f.stop();
        }
      },
    ]);
  }
}
cases.push([
  "prefetched Claude fallback preserves attempt deadline for parent finalization",
  async () => {
    let cancelled = false;
    const f = fixture(async () => ({
      stream: {
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise<IteratorResult<never>>(() => {}),
          return: async () => {
            cancelled = true;
            return { done: true as const, value: undefined };
          },
        }),
      },
    }));
    const keepAlive = setTimeout(() => {}, 1000);
    try {
      await assert.rejects(
        claudeProxyTestHooks.executeClaudeFallbackWithRetry({
          ctx: f.ctx,
          body: {
            model: "claude-sonnet-5",
            max_tokens: 32,
            stream: true,
            messages: [{ role: "user", content: "fixture" }],
          },
          options: { provider: "openai", model: "actual" } as never,
          providerLabel: "openai",
          requestStartTime: Date.now(),
          logProxyBody: () => {},
          logFinalRequest: () => {},
          idleTimeoutMs: 15,
        }),
        (error: unknown) => {
          assert.ok(error instanceof Error);
          assert.equal(error.name, "TimeoutError");
          assert.equal(getProxyUpstreamFailure(error)?.status, 504);
          return true;
        },
      );
      await delay(30);
      assert.equal(cancelled, true);
      assert.equal(f.abort.signal.aborted, false);
      assert.equal(f.finals.length, 0);
      assert.equal(f.records.length, 1);
      assert.equal(f.records[0].responseStatus, 504);
      assert.equal(f.records[0].errorType, "upstream_timeout");
      assert.ok(f.ctx.metadata.sdkFallbackFailure);
    } finally {
      clearTimeout(keepAlive);
      f.stop();
    }
  },
]);
cases.push([
  "queued native admission is released after context refusal before dispatch",
  async () => {
    const accountKey = "anthropic:queued-refusal@example.test";
    await tokenStore.saveTokens(accountKey, {
      accessToken: "isolated-queued-refusal-fixture",
      tokenType: "Bearer",
      expiresAt: Date.now() + 3600000,
    });
    const fixtures = Array.from({ length: 3 }, () =>
      fixture(async () => {
        throw Error("SDK must not run for native admission fixture");
      }),
    );
    for (const f of fixtures) {
      f.ctx.path = "/v1/messages";
      f.ctx.body = {
        model: "claude-sonnet-5",
        max_tokens: 32,
        stream: false,
        messages: [{ role: "user", content: "fixture" }],
      };
    }
    const originalFetch = globalThis.fetch;
    const originalPolicy = process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
    let releaseFirst = () => {};
    let firstDispatched = () => {};
    const firstStarted = new Promise<void>((resolve) => {
      firstDispatched = resolve;
    });
    const firstBlocked = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let nativeCalls = 0;
    globalThis.fetch = async (input) => {
      assert.match(String(input), /^https:\/\/api\.anthropic\.com\//);
      nativeCalls++;
      if (nativeCalls === 1) {
        firstDispatched();
        await firstBlocked;
      }
      return new Response(
        JSON.stringify({
          id: "msg_fixture",
          type: "message",
          role: "assistant",
          model: "claude-sonnet-5",
          content: [{ type: "text", text: "native" }],
          stop_reason: "end_turn",
          usage: { input_tokens: 3, output_tokens: 2 },
        }),
        { headers: { "content-type": "application/json" } },
      );
    };
    const pending: Array<Promise<unknown>> = [];
    try {
      const router = new ModelRouter({
        strategy: "fill-first",
        modelMappings: [],
        maxInflightPerAccount: 1,
        fallbackChain: [],
      });
      const route = createClaudeProxyRoutes(
        router,
        "",
        "fill-first",
        false,
        undefined,
        new Set([accountKey]),
      ).routes.find((r) => r.path === "/v1/messages");
      assert.ok(route);
      pending.push(Promise.resolve(route.handler(fixtures[0].ctx)));
      await firstStarted;
      process.env.NEUROLINK_PROXY_CONTEXT_POLICY = JSON.stringify({
        maxInputTokens: 1,
      });
      pending.push(Promise.resolve(route.handler(fixtures[1].ctx)));
      for (let i = 0; i < 100; i++) {
        if (
          claudeProxyTestHooks.getAccountAdmissionSnapshot(accountKey)
            .waiting === 1
        ) {
          break;
        }
        await delay(5);
      }
      assert.deepEqual(
        claudeProxyTestHooks.getAccountAdmissionSnapshot(accountKey),
        { active: 1, waiting: 1 },
      );
      releaseFirst();
      const [, rejected] = await Promise.all(pending);
      assert.ok(rejected instanceof Response);
      assert.equal(rejected.status, 400);
      assert.equal(nativeCalls, 1);
      assert.equal(fixtures[1].finals.length, 1);
      assert.equal(
        fixtures[1].finals[0].errorType,
        "proxy_input_budget_exceeded",
      );
      assert.deepEqual(
        claudeProxyTestHooks.getAccountAdmissionSnapshot(accountKey),
        { active: 0, waiting: 0 },
      );
      assert.equal(
        claudeProxyTestHooks.hasAccountAdmissionState(accountKey),
        false,
      );
      delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
      const subsequent = await route.handler(fixtures[2].ctx);
      if (subsequent instanceof Response) {
        await subsequent.text();
      }
      assert.equal(nativeCalls, 2);
      assert.equal(fixtures[2].finals[0].responseStatus, 200);
      assert.deepEqual(
        claudeProxyTestHooks.getAccountAdmissionSnapshot(accountKey),
        { active: 0, waiting: 0 },
      );
    } finally {
      releaseFirst();
      for (const f of fixtures) {
        f.abort.abort();
        f.stop();
      }
      await Promise.allSettled(pending);
      globalThis.fetch = originalFetch;
      if (originalPolicy === undefined) {
        delete process.env.NEUROLINK_PROXY_CONTEXT_POLICY;
      } else {
        process.env.NEUROLINK_PROXY_CONTEXT_POLICY = originalPolicy;
      }
    }
  },
]);
for (const outcome of [
  "generic-json",
  "generic-exception",
  "stream",
  "cancel",
  "dispatch-error",
] as const) {
  cases.push([
    `bridge ${outcome} releases parent correlation outside the CLI tracker`,
    async () => {
      const stream = outcome === "stream" || outcome === "cancel";
      const f = fixture(async () => {
        throw Error("SDK must not run for bridge correlation fixture");
      });
      f.ctx.body = {
        model: "alias",
        stream,
        messages:
          outcome === "generic-exception"
            ? { length: 1 }
            : [{ role: "user", content: "fixture" }],
      };
      let childId: string | undefined;
      let childFinal: RequestLogEntry | undefined;
      let stopChild = () => {};
      let parentAtLog: ReturnType<typeof getProxyRequestAccounting>;
      // Observe the actual generic adapter request without adding CLI cleanup.
      f.stop();
      const stop = observeProxyFinalLog(f.ctx.requestId, (entry) => {
        parentAtLog = getProxyRequestAccounting(f.ctx.requestId);
        f.finals.push({ ...entry });
      });
      const router = {
        resolve: () => ({ provider: "anthropic", model: "claude-sonnet-5" }),
      } as unknown as Parameters<typeof createOpenAIProxyRoutes>[0];
      const group = createOpenAIProxyRoutes(
        router,
        "",
        61239,
        undefined,
        async (request) => {
          const child = consumeInternalProxyRequest(
            request.headers.get("x-neurolink-internal-request"),
          );
          assert.ok(child);
          childId = child.requestId;
          stopChild = observeProxyFinalLog(childId, (entry) => {
            childFinal = { ...entry };
          });
          try {
            if (outcome === "dispatch-error") {
              throw Error("isolated child dispatch failed");
            }
            await logRequest({
              timestamp: new Date().toISOString(),
              requestId: childId,
              method: "POST",
              path: "/v1/messages",
              model: "claude-sonnet-5",
              servingModelStatus: "observed",
              provider: "anthropic",
              account: "bridge-fixture@example.test",
              accountKey: "anthropic:bridge-fixture@example.test",
              accountType: "oauth",
              stream,
              toolCount: 0,
              responseStatus: 200,
              responseTimeMs: 1,
              inputTokens: 40,
              outputTokens: 20,
            });
            assert.ok(getProxyBridgeResult(f.ctx.requestId));
          } finally {
            // The synthetic child owns its cleanup, just as an inner HTTP
            // runtime does; the parent must clean itself independently.
            releaseProxyRequestAccounting(childId);
          }
          if (!stream) {
            return Response.json({
              id: "msg_fixture",
              type: "message",
              role: "assistant",
              model: "claude-sonnet-5",
              content: [{ type: "text", text: "answer" }],
              stop_reason: "end_turn",
              usage: { input_tokens: 40, output_tokens: 20 },
            });
          }
          return new Response(
            new ReadableStream<Uint8Array>({
              start(controller) {
                controller.enqueue(
                  new TextEncoder().encode(
                    'event: message_start\ndata: {"type":"message_start","message":{"id":"msg_fixture","usage":{"input_tokens":40}}}\n\nevent: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\nevent: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"answer"}}\n\n',
                  ),
                );
                if (outcome !== "cancel") {
                  controller.enqueue(
                    new TextEncoder().encode(
                      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
                    ),
                  );
                  controller.close();
                }
              },
            }),
            { headers: { "content-type": "text/event-stream" } },
          );
        },
      );
      try {
        let result: unknown;
        if (outcome.startsWith("generic-")) {
          const adapter = new HonoServerAdapter(
            {
              getToolRegistry: () => ({}),
              getExternalServerManager: () => undefined,
            } as unknown as ConstructorParameters<typeof HonoServerAdapter>[0],
            {
              basePath: "",
              logging: { enabled: false },
              rateLimit: { enabled: false },
              disableBuiltInHealth: true,
            },
          );
          await adapter.initialize();
          adapter.registerRouteGroup(group);
          const app = adapter.getFrameworkInstance() as import("hono").Hono;
          result = await app.request("/v1/chat/completions", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-request-id": f.ctx.requestId,
            },
            body: JSON.stringify(f.ctx.body),
          });
        } else {
          const route = group.routes.find((r) => r.path === f.ctx.path);
          assert.ok(route);
          result = await route.handler(f.ctx);
        }
        assert.ok(result instanceof Response);
        if (outcome === "cancel") {
          const reader = result.body!.getReader();
          assert.equal((await reader.read()).done, false);
          await reader.cancel("client stopped reading");
        } else {
          const text = await result.text();
          if (outcome === "generic-json" || outcome === "stream") {
            assert.match(text, /answer/);
          }
        }
        assert.equal(f.finals.length, 1);
        assert.equal(
          f.finals[0].responseStatus,
          outcome === "cancel"
            ? 499
            : outcome.endsWith("error") || outcome.endsWith("exception")
              ? 502
              : 200,
        );
        assert.equal(parentAtLog?.accountingScope, "client");
        assert.equal(f.finals[0].accountingScope, "client");
        if (childFinal) {
          assert.equal(f.finals[0].model, childFinal.model);
          assert.equal(f.finals[0].accountKey, childFinal.accountKey);
          assert.equal(f.finals[0].usageOwnerRequestId, childId);
          assert.equal(f.finals[0].inputTokens, undefined);
          assert.equal(f.finals[0].outputTokens, undefined);
          assert.equal(childFinal.accountingScope, "internal");
          assert.equal(childFinal.usageOwnerRequestId, childId);
          assert.equal(childFinal.inputTokens, 40);
          assert.equal(childFinal.outputTokens, 20);
        }
        assert.equal(getProxyRequestAccounting(f.ctx.requestId), undefined);
        assert.equal(getProxyBridgeResult(f.ctx.requestId), undefined);
        // A surrounding CLI tracker can repeat cleanup safely.
        releaseProxyRequestAccounting(f.ctx.requestId);
        assert.equal(f.finals.length, 1);
      } finally {
        releaseProxyRequestAccounting(f.ctx.requestId);
        if (childId) {
          releaseProxyRequestAccounting(childId);
        }
        stopChild();
        stop();
      }
    },
  ]);
}
let failures = 0;
for (const [name, run] of cases) {
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures++;
    console.error(`FAIL ${name}`, error);
  }
}
if (failures) {
  process.exitCode = 1;
}
