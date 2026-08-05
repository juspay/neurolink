#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Proxy Terminal-Error Accounting
 *
 * Every request that ends badly must be finalized exactly once: counted in
 * usage stats, journalled in getTerminalErrors(), and written to the request
 * log with the right status. Covers pre-routing validation failures, upstream
 * interruption after partial output, empty translated output, route-level
 * exhaustion (which must not double-finalize), and client cancellation.
 *
 * Migrated from test/proxyTerminalErrorAccounting.test.ts — see CLAUDE.md:
 * suites run via tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-proxy-terminal-errors.ts
 */

import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  handleTranslatedJsonRequest,
  handleTranslatedStreamRequest,
} from "../src/lib/proxy/proxyTranslationEngine.js";
import {
  flushRequestLogs,
  initRequestLogger,
} from "../src/lib/proxy/requestLogger.js";
import { createClaudeProxyRoutes } from "../src/lib/server/routes/claudeProxyRoutes.js";
import {
  getStats,
  getTerminalErrors,
  resetUsageStatsForTests,
} from "../src/lib/proxy/usageStats.js";
import type {
  ParsedClaudeRequest,
  ServerContext,
} from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("Proxy Terminal-Error Accounting");

// ---------------------------------------------------------------------------
// Assertion helpers (replacing toMatchObject / toContainEqual)
// ---------------------------------------------------------------------------

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Subset match, recursive — the semantics of Vitest's toMatchObject.
 *
 * Recursion matters here: `getTerminalErrors().counts` carries every category,
 * so a strict per-key compare against `{ stream_error: 1 }` would never match
 * even when the count is right.
 *
 * Returns the first mismatching key path, or null when everything matched.
 */
function firstMismatch(
  actual: unknown,
  subset: Record<string, unknown>,
  path = "",
): string | null {
  if (!isPlainObject(actual)) {
    return path || "<root>";
  }
  for (const [key, expected] of Object.entries(subset)) {
    const here = path ? `${path}.${key}` : key;
    const got = actual[key];
    if (isPlainObject(expected)) {
      const deeper = firstMismatch(got, expected, here);
      if (deeper) {
        return deeper;
      }
    } else if (JSON.stringify(got) !== JSON.stringify(expected)) {
      // The path only — deliberately no values. Including the actual would
      // reintroduce exactly the payload text (error types, status codes) that
      // makes the harness downgrade a failure to a skip.
      return here;
    }
  }
  return null;
}

const matches = (actual: unknown, subset: Record<string, unknown>): boolean =>
  firstMismatch(actual, subset) === null;

/**
 * NOTE on failure messages: the harness routes any assertion text that looks
 * like a provider error (via isExpectedProviderError) to SKIP rather than FAIL.
 * Dumping a raw payload in here — which for these tests contains "stream_error",
 * "502" and the like — would therefore turn a genuine failure into a silent
 * skip. Report only the mismatching key path.
 */
function assertMatches(
  actual: unknown,
  subset: Record<string, unknown>,
  msg: string,
): void {
  const mismatch = firstMismatch(actual, subset);
  assert(mismatch === null, `${msg} — mismatch at ${mismatch}`);
}

function assertContainsMatching(
  items: readonly unknown[],
  subset: Record<string, unknown>,
  msg: string,
): void {
  assert(
    items.some((item) => matches(item, subset)),
    `${msg} — no entry among ${items.length} matched keys [${Object.keys(subset).join(", ")}]`,
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const parsedRequest = {
  prompt: "hello",
  systemPrompt: "",
  conversationMessages: [],
  tools: {},
  images: [],
  stopSequences: [],
} as unknown as ParsedClaudeRequest;

function createContext(
  requestId: string,
  stream: () => Promise<unknown>,
): ServerContext {
  return {
    requestId,
    method: "POST",
    path: "/v1/messages",
    headers: {},
    query: {},
    params: {},
    timestamp: Date.now(),
    metadata: {},
    neurolink: { stream },
    toolRegistry: {},
  } as unknown as ServerContext;
}

async function waitUntil(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for translated stream settlement");
    }
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
}

async function readRequestRecords(
  logDir: string,
): Promise<Array<Record<string, unknown>>> {
  await flushRequestLogs();
  const requestLog = (await readdir(logDir)).find((file) =>
    /^proxy-\d{4}-\d{2}-\d{2}\.jsonl$/.test(file),
  );
  if (!requestLog) {
    return [];
  }
  return (await readFile(join(logDir, requestLog), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/**
 * Run `body` with a fresh request log and clean usage stats, tearing both down
 * afterwards. The stats are module-global, so a leaked one would make the next
 * test's counts wrong rather than failing honestly here.
 */
async function withCapture(
  body: (logDir: string) => Promise<void>,
): Promise<void> {
  const logDir = await mkdtemp(join(tmpdir(), "neurolink-terminal-logs-"));
  initRequestLogger(true, logDir);
  await resetUsageStatsForTests();
  try {
    await body(logDir);
  } finally {
    await flushRequestLogs().catch(() => {
      // The test's own assertion stays the primary failure.
    });
    initRequestLogger(false);
    await resetUsageStatsForTests();
    await rm(logDir, { recursive: true, force: true });
  }
}

const findMessagesRoute = (modelRouter?: unknown) => {
  const route = createClaudeProxyRoutes(modelRouter as never).routes.find(
    (r) => r.method === "POST" && r.path === "/v1/messages",
  );
  if (!route) {
    throw new Error("messages route not found");
  }
  return route;
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

await test("attributes pre-routing validation failures to the proxy itself", async () => {
  await withCapture(async (logDir) => {
    const ctx = createContext(
      "proxy-validation-error",
      async () => undefined,
    ) as ServerContext & { body: Record<string, unknown> };
    ctx.body = { model: "claude-test" };

    const result = await findMessagesRoute().handler(ctx);
    assertMatches(result, { type: "error" }, "the route must return an error");

    assertMatches(
      getStats().accounts["proxy/internal"],
      { label: "proxy/internal", type: "internal", errorCount: 1 },
      "a request that never reached an upstream belongs to the proxy",
    );
    assertContainsMatching(
      getTerminalErrors().recent,
      {
        requestId: "proxy-validation-error",
        account: "proxy/internal",
        accountType: "internal",
        errorType: "invalid_request_error",
      },
      "the terminal journal must carry the validation failure",
    );
    assertContainsMatching(
      await readRequestRecords(logDir),
      {
        requestId: "proxy-validation-error",
        account: "proxy/internal",
        accountType: "internal",
        responseStatus: 400,
      },
      "the request log must record it as a 400",
    );
  });
});

await test("records an upstream interruption after output as ONE terminal error", async () => {
  await withCapture(async (logDir) => {
    const ctx = createContext("translated-stream-error", async () => ({
      stream: (async function* () {
        yield { text: "partial output" };
        throw new Error("upstream socket reset");
      })(),
      toolCalls: [],
      usage: { inputTokens: 4, outputTokens: 2 },
      model: "translated-model",
    }));

    const response = await handleTranslatedStreamRequest({
      ctx,
      format: "claude",
      requestModel: "claude-test",
      parsed: parsedRequest,
      attempts: [
        { label: "translated-account", provider: "openai", model: "test" },
      ],
      requestStartTime: Date.now(),
    });
    const body = await response.text();

    assert(
      body.includes("partial output"),
      "output already sent to the client must not be discarded",
    );
    assert(
      body.includes("Upstream stream interrupted"),
      "the client must be told the stream broke",
    );
    assertMatches(
      getStats(),
      {
        totalAttempts: 1,
        totalAttemptErrors: 1,
        totalRequests: 1,
        totalSuccess: 0,
        totalErrors: 1,
      },
      "a mid-stream break is one failed attempt and one failed request",
    );
    assertMatches(
      getTerminalErrors(),
      { totalErrors: 1, counts: { stream_error: 1 } },
      "exactly one terminal error must be journalled",
    );
    assertContainsMatching(
      getTerminalErrors().recent,
      {
        requestId: "translated-stream-error",
        status: 502,
        errorType: "stream_error",
        terminalOutcome: "stream_error",
      },
      "the journal entry must describe the stream error",
    );
    assertContainsMatching(
      await readRequestRecords(logDir),
      {
        requestId: "translated-stream-error",
        responseStatus: 502,
        errorType: "stream_error",
      },
      "the request log must agree with the journal",
    );
  });
});

await test("records empty translated output as a failed attempt and a failed request", async () => {
  await withCapture(async (logDir) => {
    const ctx = createContext("translated-empty-output", async () => ({
      stream: (async function* () {
        yield* [];
      })(),
      toolCalls: [],
      usage: {},
      model: "translated-model",
    }));

    let caught: unknown;
    try {
      await handleTranslatedJsonRequest({
        ctx,
        format: "claude",
        requestModel: "claude-test",
        parsed: parsedRequest,
        attempts: [
          { label: "translated-account", provider: "openai", model: "test" },
        ],
        requestStartTime: Date.now(),
      });
    } catch (error) {
      caught = error;
    }
    assert(
      caught instanceof Error &&
        caught.message.includes("returned no content or tool calls"),
      `empty output must reject, got: ${String(caught)}`,
    );

    assertMatches(
      getStats(),
      {
        totalAttempts: 1,
        totalAttemptErrors: 1,
        totalRequests: 1,
        totalSuccess: 0,
        totalErrors: 1,
      },
      "an empty response is a failure, not a success",
    );
    assertMatches(
      getTerminalErrors(),
      { totalErrors: 1, counts: { upstream_error: 1 } },
      "exactly one terminal error must be journalled",
    );
    assertContainsMatching(
      getTerminalErrors().recent,
      {
        requestId: "translated-empty-output",
        status: 500,
        errorType: "generation_error",
      },
      "the journal entry must describe the generation error",
    );
    assertContainsMatching(
      await readRequestRecords(logDir),
      {
        requestId: "translated-empty-output",
        responseStatus: 500,
        errorType: "generation_error",
      },
      "the request log must agree",
    );
  });
});

await test("does NOT finalize translated exhaustion twice at the Claude route", async () => {
  await withCapture(async (logDir) => {
    const ctx = createContext("translated-route-exhaustion", async () => ({
      stream: (async function* () {
        yield* [];
      })(),
      toolCalls: [],
      usage: {},
      model: "translated-model",
    })) as ServerContext & { body: Record<string, unknown> };
    ctx.body = {
      model: "claude-routed-model",
      messages: [{ role: "user", content: "hello" }],
    };

    const modelRouter = {
      resolve: () => ({ provider: "openai", model: "translated-model" }),
      getFallbackChain: () => [],
      // Auto-fallback became opt-in in 33bdd141, so a router without this makes
      // one attempt and never reaches the double-finalization path under test.
      isAutoFallbackEnabled: () => true,
    };

    const result = await findMessagesRoute(modelRouter).handler(ctx);
    assertMatches(
      result,
      { type: "error" },
      "exhaustion must surface an error",
    );

    assertMatches(
      getStats(),
      {
        totalAttempts: 2,
        totalAttemptErrors: 2,
        totalRequests: 1,
        totalErrors: 1,
      },
      "two attempts, but still only ONE request finalized",
    );
    assertMatches(
      getTerminalErrors(),
      { totalErrors: 1 },
      "the journal must record the request once, not once per attempt",
    );
    assertContainsMatching(
      getTerminalErrors().recent,
      { status: 502 },
      "the journalled status must be the 502 the client saw",
    );

    const records = (await readRequestRecords(logDir)).filter(
      (record) => record.requestId === "translated-route-exhaustion",
    );
    assertEqual(
      records.length,
      1,
      "exactly one request-log line — a second would be the double-finalization",
    );
    assertMatches(
      records[0],
      { responseStatus: 502, errorType: "generation_error" },
      "the single record must describe the exhaustion",
    );
  });
});

await test("records client cancellation once, without marking the stream successful", async () => {
  await withCapture(async (logDir) => {
    let resolvePendingRead!: (value: IteratorResult<unknown>) => void;
    let markReadStarted!: () => void;
    const readStarted = new Promise<void>((resolve) => {
      markReadStarted = resolve;
    });
    const iterator: AsyncIterator<unknown> = {
      next: () => {
        markReadStarted();
        return new Promise((resolve) => {
          resolvePendingRead = resolve;
        });
      },
      return: async () => {
        resolvePendingRead({ done: true, value: undefined });
        return { done: true, value: undefined };
      },
    };
    const ctx = createContext("translated-client-cancel", async () => ({
      stream: { [Symbol.asyncIterator]: () => iterator },
      toolCalls: [],
      usage: {},
      model: "translated-model",
    }));

    const response = await handleTranslatedStreamRequest({
      ctx,
      format: "claude",
      requestModel: "claude-test",
      parsed: parsedRequest,
      attempts: [{ label: "translated-account" }],
      requestStartTime: Date.now(),
    });
    const reader = response.body!.getReader();
    await reader.read();
    await readStarted;
    await reader.cancel("client disconnected");
    await waitUntil(() => getStats().totalRequests === 1);

    assertMatches(
      getStats(),
      {
        totalAttempts: 1,
        totalAttemptErrors: 0,
        totalRequests: 1,
        totalSuccess: 0,
        totalErrors: 1,
      },
      "the client hanging up is not an upstream attempt failure, and not a success",
    );
    assertMatches(
      getTerminalErrors(),
      { totalErrors: 1, counts: { client_cancelled: 1 } },
      "cancellation must be journalled once under its own outcome",
    );
    assertContainsMatching(
      getTerminalErrors().recent,
      {
        requestId: "translated-client-cancel",
        status: 499,
        errorType: "client_cancelled",
        terminalOutcome: "client_cancelled",
      },
      "the journal entry must describe the cancellation",
    );
    assertContainsMatching(
      await readRequestRecords(logDir),
      {
        requestId: "translated-client-cancel",
        responseStatus: 499,
        errorType: "client_cancelled",
      },
      "the request log must agree",
    );
  });
});

await runSuite();
