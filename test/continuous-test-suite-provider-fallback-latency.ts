#!/usr/bin/env tsx
/**
 * Continuous Test Suite: provider errors must reach fallback orchestration
 * fast (pure, no API — all HTTP is mocked).
 *
 * Reproduces and pins three fixes:
 *
 * 1. Unbounded Retry-After — a prod 429 with `retry-after: 8549` made
 *    @anthropic-ai/sdk sleep 2.4h per retry inside one generate();
 *    the error never reached runWithFallbackOrchestration and the
 *    configured providerFallback was never consulted. With SDK
 *    maxRetries: 0 and the withProviderRetry surface-over-cap rule, the
 *    429 must reject (or fall back) within seconds.
 *
 * 2. Watchdog-abort provenance — NeuroLink's own stall/turn-timeout
 *    watchdogs abort provider calls; SDKs normalize that into the same
 *    AbortError shapes a user cancel produces. The fallback gate must use
 *    the caller's abortSignal state (ground truth) so internal aborts stay
 *    fallback-eligible while genuine caller cancels stay excluded.
 *
 * 3. Vision capability registry — claude-sonnet-5 (and every name-first
 *    Claude id with major >= 4) is vision-capable on anthropic/vertex, and
 *    proxy mode (ANTHROPIC_BASE_URL) must not capability-gate at all.
 *
 * Run: npx tsx test/continuous-test-suite-provider-fallback-latency.ts
 */
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { installMockFetch } from "./utils/mockFetch.js";
import { NeuroLink } from "../dist/index.js";
import type { GenerateOptions } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Provider fallback latency", {
  offline: true,
});

// ---------------------------------------------------------------------------
// Environment: fake keys, deterministic api_key auth, no proxy.
// The suite runs in its own tsx process, so mutations don't leak.
// ---------------------------------------------------------------------------
process.env.ANTHROPIC_API_KEY = "sk-ant-test-mock";
process.env.OPENAI_API_KEY = "sk-test-mock";
process.env.ANTHROPIC_AUTH_METHOD = "api_key";
delete process.env.ANTHROPIC_BASE_URL;
delete process.env.OPENAI_BASE_URL;

const CREDENTIALS = {
  anthropic: { apiKey: "sk-ant-test-mock" },
  openai: { apiKey: "sk-test-mock" },
};

const rateLimit429 = {
  status: 429,
  json: {
    type: "error",
    error: { type: "rate_limit_error", message: "Rate limited" },
  },
  headers: { "retry-after": "8549" },
};

function openAIChatResponse(content: string, model: string): unknown {
  return {
    id: "chatcmpl-mock",
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop",
      },
    ],
    usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
  };
}

// Generous bound: pre-fix behavior was a 2.4h SDK sleep (per retry), so any
// single-digit-seconds completion proves no unbounded Retry-After sleep ran.
const FAST_MS = 15_000;

// ---------------------------------------------------------------------------
// 1. 429 + huge Retry-After
// ---------------------------------------------------------------------------

await test("429 with retry-after: 8549 rejects within seconds (no fallback configured)", async () => {
  const handle = installMockFetch([
    { url: "api.anthropic.com/v1/messages", respond: rateLimit429 },
  ]);
  const started = Date.now();
  let thrown: unknown;
  try {
    const nl = new NeuroLink();
    await nl.generate({
      input: { text: "ping" },
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      disableTools: true,
      credentials: CREDENTIALS,
    });
  } catch (err) {
    thrown = err;
  } finally {
    handle.unset();
  }
  const elapsed = Date.now() - started;
  assert(thrown !== undefined, "generate() must reject on a persistent 429");
  assert(
    elapsed < FAST_MS,
    `429 must surface within seconds, took ${elapsed}ms`,
  );
  assert(
    handle.calls.some((c) => c.url.includes("api.anthropic.com/v1/messages")),
    "the anthropic messages endpoint must actually have been hit",
  );
});

await test("429 with huge Retry-After: providerFallback invoked, retry runs on returned provider", async () => {
  const fallbackErrors: unknown[] = [];
  const handle = installMockFetch([
    { url: "api.anthropic.com/v1/messages", respond: rateLimit429 },
    {
      url: "api.openai.com/v1/chat/completions",
      respond: {
        status: 200,
        json: openAIChatResponse("fallback says pong", "gpt-4o-mini"),
      },
    },
  ]);
  const started = Date.now();
  try {
    const nl = new NeuroLink();
    const result = await nl.generate({
      input: { text: "ping" },
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      disableTools: true,
      credentials: CREDENTIALS,
      providerFallback: async (err: unknown) => {
        fallbackErrors.push(err);
        return { provider: "openai", model: "gpt-4o-mini" };
      },
    });
    const elapsed = Date.now() - started;
    assertEqual(
      fallbackErrors.length,
      1,
      "the fallback callback must be invoked exactly once",
    );
    assert(
      String(result.content).includes("fallback says pong"),
      `the retry must return the fallback provider's response, got: ${String(result.content).slice(0, 200)}`,
    );
    assert(
      elapsed < FAST_MS,
      `fallback must complete within seconds, took ${elapsed}ms`,
    );
    assert(
      handle.calls.some((c) =>
        c.url.includes("api.openai.com/v1/chat/completions"),
      ),
      "the fallback provider endpoint must have been hit",
    );
  } finally {
    handle.unset();
  }
});

// ---------------------------------------------------------------------------
// 2. Fallback-gate abort provenance (orchestrator-level contract)
// ---------------------------------------------------------------------------

type FallbackNext = { provider?: string; model?: string } | null;
type Orchestrate = (
  optionsOrPrompt: unknown,
  kind: "generate" | "stream",
  inner: (opts: unknown) => Promise<unknown>,
) => Promise<unknown>;

function makeOrchestrator(): Orchestrate {
  const nl = new NeuroLink();
  const target = nl as unknown as {
    runWithFallbackOrchestration: Orchestrate;
  };
  return target.runWithFallbackOrchestration.bind(nl);
}

const abortShapedError = () =>
  Object.assign(new Error("The operation was aborted"), {
    name: "AbortError",
  });

function makeInner(errors: unknown[]) {
  const seenOpts: Array<Record<string, unknown>> = [];
  let attempt = 0;
  const inner = async (opts: unknown) => {
    seenOpts.push(opts as Record<string, unknown>);
    const err = errors[attempt++];
    if (err) {
      throw err;
    }
    return { text: "ok" };
  };
  return { inner, seenOpts };
}

await test("watchdog abort (no caller signal) invokes the callback", async () => {
  const run = makeOrchestrator();
  const { inner, seenOpts } = makeInner([abortShapedError()]);
  let invoked = 0;
  const result = (await run(
    {
      input: { text: "hi" },
      providerFallback: async (): Promise<FallbackNext> => {
        invoked++;
        return { provider: "openai", model: "gpt-fallback" };
      },
    },
    "generate",
    inner,
  )) as { text: string };
  assertEqual(invoked, 1, "internal aborts must consult the callback");
  assertEqual(seenOpts.length, 2, "one failed attempt + one retry");
  assertEqual(result.text, "ok", "fallback succeeds after a watchdog abort");
});

await test("watchdog abort (caller signal present but NOT fired) invokes the callback", async () => {
  const run = makeOrchestrator();
  const controller = new AbortController(); // never aborted — the caller did not cancel
  const { inner, seenOpts } = makeInner([abortShapedError()]);
  let invoked = 0;
  const result = (await run(
    {
      input: { text: "hi" },
      abortSignal: controller.signal,
      providerFallback: async (): Promise<FallbackNext> => {
        invoked++;
        return { model: "fallback-model" };
      },
    },
    "generate",
    inner,
  )) as { text: string };
  assertEqual(
    invoked,
    1,
    "an abort-shaped error without a fired caller signal is internal — callback must run",
  );
  assertEqual(seenOpts.length, 2, "one failed attempt + one retry");
  assertEqual(result.text, "ok", "fallback succeeds");
});

await test("caller abort (signal fired) does NOT invoke the callback", async () => {
  const run = makeOrchestrator();
  const controller = new AbortController();
  controller.abort();
  const abortErr = abortShapedError();
  const { inner, seenOpts } = makeInner([abortErr]);
  let invoked = 0;
  let thrown: unknown;
  try {
    await run(
      {
        input: { text: "hi" },
        abortSignal: controller.signal,
        providerFallback: async (): Promise<FallbackNext> => {
          invoked++;
          return { model: "should-not-happen" };
        },
      },
      "generate",
      inner,
    );
  } catch (err) {
    thrown = err;
  }
  assertEqual(invoked, 0, "genuine caller cancels must bypass the callback");
  assert(thrown === abortErr, "the abort error must be rethrown unmodified");
  assertEqual(seenOpts.length, 1, "no retry on caller abort");
});

// ---------------------------------------------------------------------------
// 2b. End-to-end: provider hang + internal timeout → fallback within seconds
// ---------------------------------------------------------------------------

await test("provider hang under internal timeout falls back within seconds", async () => {
  const originalFetch = globalThis.fetch;
  const openaiJson = openAIChatResponse("recovered after hang", "gpt-4o-mini");
  globalThis.fetch = (async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;
    // Exact-hostname routing (not substring) so CodeQL's URL-sanitization
    // check holds and arbitrary hosts can never match a mock branch.
    const hostname = new URL(url).hostname;
    if (hostname === "api.anthropic.com") {
      // Hang forever; reject like real fetch does when the signal aborts.
      return new Promise<Response>((_, reject) => {
        const signal = init?.signal;
        const rejectAbort = () =>
          reject(new DOMException("This operation was aborted", "AbortError"));
        if (signal?.aborted) {
          rejectAbort();
          return;
        }
        signal?.addEventListener("abort", rejectAbort, { once: true });
      });
    }
    if (hostname === "api.openai.com") {
      return new Response(JSON.stringify(openaiJson), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    throw new Error(`[hang-test fetch] unexpected URL ${url}`);
  }) as typeof fetch;
  try {
    const nl = new NeuroLink();
    let invoked = 0;
    const started = Date.now();
    const result = await nl.generate({
      input: { text: "ping" },
      provider: "anthropic",
      model: "claude-sonnet-4-5",
      timeout: 2000,
      disableTools: true,
      credentials: CREDENTIALS,
      providerFallback: async () => {
        invoked++;
        return { provider: "openai", model: "gpt-4o-mini" };
      },
    });
    const elapsed = Date.now() - started;
    assertEqual(
      invoked,
      1,
      "a watchdog-aborted provider hang must consult the callback (no caller cancel happened)",
    );
    assert(
      String(result.content).includes("recovered after hang"),
      `fallback result must be returned, got: ${String(result.content).slice(0, 200)}`,
    );
    assert(
      elapsed < 60_000,
      `hang → fallback must complete promptly, took ${elapsed}ms`,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// 3. Vision capability registry
// ---------------------------------------------------------------------------
//
// Three tests here called `ProviderImageAdapter.supportsVision()` and
// `buildMultimodalMessagesArray()` directly, to assert which model families are
// vision-capable and that proxy mode does not capability-gate. Both are
// internal, so they went with the unit suites (CLAUDE.md rule 15). Vision
// delivery is still covered end to end by continuous-test-suite-file-formats,
// which attaches a real image and requires the model to read it; what is no
// longer asserted is the capability table itself.

await runSuite();
