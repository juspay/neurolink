#!/usr/bin/env tsx

/**
 * Continuous Test Suite — model-not-found is retryable inside a ModelPool
 *
 * A pool member is an explicit {provider, model} pair, and members exist
 * precisely because they differ. "This provider has no such model" is therefore
 * a fact about ONE member, not about the request — member#2 runs a different
 * model and may well serve it.
 *
 * Before this change the pool treated it as non-retryable and stopped dead. The
 * observed case: a member naming a retired Anthropic model, where the API
 * answered 404 `not_found_error` and the pool gave up instead of failing over
 * to the member that was perfectly healthy.
 *
 * Everything else keeps the general contract — auth failures, malformed
 * payloads and access-denied still stop the pool at once, since those describe
 * the credentials or the request and every member would hit them identically.
 *
 * Run with: npx tsx test/continuous-test-suite-model-not-found-retryable.ts
 */

import {
  isNonRetryableForPool,
  isNonRetryableProviderError,
  looksLikeModelNotFound,
} from "../src/lib/utils/providerErrorClassification.js";
import { AIProviderFactory } from "../src/lib/core/factory.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import {
  InvalidModelError,
  ModelAccessDeniedError,
} from "../src/lib/types/index.js";
import type { AIProvider, ModelPoolMember } from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { spy, stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("Model-Not-Found Retryability");

/**
 * The exact shape Anthropic returns for a retired/unknown model.
 *
 * The `status: 404` matters: it is the numeric status, not the message, that
 * the general classifier keys on. A bare Error carrying only this text is
 * already retryable today, so a fixture without the status would pass whether
 * or not the fix were present.
 */
const anthropicModelNotFound = () =>
  Object.assign(
    new Error(
      'Anthropic error: 404 {"type":"error","error":{"type":"not_found_error",' +
        '"message":"model: claude-definitely-does-not-exist-v99"},' +
        '"request_id":"req_011Cdi7XMwTTmxLCTnHhaVnk"}',
    ),
    { status: 404 },
  );

// ---------------------------------------------------------------------------
// Part 1 — looksLikeModelNotFound
// ---------------------------------------------------------------------------

for (const [label, error] of [
  ["Anthropic 404 not_found_error", anthropicModelNotFound()],
  ["Google NOT_FOUND naming a model", new Error("NOT_FOUND: model gemini-x")],
  ["plain 'model not found'", new Error("model not found: gpt-9")],
  ["'unknown model'", new Error("Unknown model: gpt-9")],
  ["'model ... does not exist'", new Error("The model gpt-9 does not exist")],
  ["typed InvalidModelError", new InvalidModelError("gpt-9", "openai")],
] as const) {
  await test(`recognises model-not-found: ${label}`, () => {
    assert(
      looksLikeModelNotFound(error),
      `must be recognised as model-not-found: ${String(error)}`,
    );
  });
}

for (const [label, error] of [
  ["a bare 404 that names no model", new Error("404 Not Found")],
  ["PERMISSION_DENIED", new Error("PERMISSION_DENIED: model gemini-x")],
  ["UNAUTHENTICATED", new Error("UNAUTHENTICATED: model gemini-x")],
  [
    "LiteLLM team access-denied",
    new Error("team can only access models=[gpt-4o]"),
  ],
  ["a rate limit", new Error("rate limit exceeded")],
  ["a non-Error value", "model not found" as unknown],
] as const) {
  await test(`does NOT treat as model-not-found: ${label}`, () => {
    assert(
      !looksLikeModelNotFound(error),
      `must not be treated as model-not-found: ${String(error)}`,
    );
  });
}

// ---------------------------------------------------------------------------
// Part 2 — the pool-scoped contract vs the general one
// ---------------------------------------------------------------------------

await test("model-not-found is retryable for the pool but stays non-retryable generally", () => {
  const err = anthropicModelNotFound();
  assertEqual(
    isNonRetryableForPool(err),
    false,
    "the pool must keep going — another member runs a different model",
  );
  assertEqual(
    isNonRetryableProviderError(err),
    true,
    "the general contract is unchanged: provider fallback usually carries the " +
      "same model id, so retrying a typo everywhere just fans it out",
  );
});

for (const [label, error] of [
  ["HTTP 401", Object.assign(new Error("Unauthorized"), { status: 401 })],
  ["HTTP 403", Object.assign(new Error("Forbidden"), { status: 403 })],
  [
    "HTTP 400 malformed payload",
    Object.assign(new Error("Bad Request"), { status: 400 }),
  ],
  // The TYPED class, not the bare message: a plain "team can only access …"
  // string is already retryable today, so asserting on it would say nothing
  // about this change.
  ["typed ModelAccessDeniedError", new ModelAccessDeniedError("gpt-4o")],
  ["PERMISSION_DENIED message", new Error("PERMISSION_DENIED: model gemini-x")],
] as const) {
  await test(`still stops the pool: ${label}`, () => {
    assertEqual(
      isNonRetryableForPool(error),
      true,
      `${label} describes the credentials or the request — every member hits it`,
    );
  });
}

await test("a retryable error is retryable under both contracts", () => {
  const err = new Error("too many requests");
  assertEqual(isNonRetryableForPool(err), false, "pool keeps going");
  assertEqual(isNonRetryableProviderError(err), false, "so does fallback");
});

// ---------------------------------------------------------------------------
// Part 3 — end to end through NeuroLink.generate()
// ---------------------------------------------------------------------------

const BASE_CONFIG = {
  conversationMemory: { enabled: false },
  disableTools: true,
} as const;

const M1: ModelPoolMember = {
  provider: "anthropic",
  model: "claude-definitely-does-not-exist-v99",
};
const M2: ModelPoolMember = { provider: "openai", model: "gpt-4o" };

/** Minimal provider stub whose generate() resolves at once. */
function makeProviderStub(providerName: string, content: string) {
  const generate = spy(async () => ({
    content,
    provider: providerName,
    model: "stub-model",
    usage: { inputTokens: 1, outputTokens: 1 },
    finishReason: "stop" as const,
    toolsUsed: [],
    toolExecutions: [],
  }));
  const provider = {
    generate: generate.fn,
    setTraceContext: () => {},
    setupToolExecutor: () => {},
    getAllTools: async () => [],
    getCustomTools: () => ({}),
    setSystemPrompt: () => {},
    clearHistory: () => {},
    registerTool: () => {},
    getTools: () => [],
  } as unknown as AIProvider;
  return { provider, generate };
}

/** Stub createProvider for the duration of `body`, always restoring it. */
function withCreateProvider<T>(
  impl: (providerName: string) => Promise<AIProvider>,
  body: (calls: string[]) => Promise<T>,
): Promise<T> {
  const calls: string[] = [];
  const s = stub(
    AIProviderFactory,
    "createProvider",
    async (providerName: string) => {
      calls.push(providerName);
      return impl(providerName);
    },
  );
  return withStubs([s], () => body(calls));
}

await test("REGRESSION: a member naming a missing model fails over instead of stopping the pool", async () => {
  const m2 = makeProviderStub("openai", "served-by-the-healthy-member");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: { members: [M1, M2], strategy: "priority", cooldownMs: 0 },
  });

  const { result, calls } = await withCreateProvider(
    async (providerName) => {
      if (providerName === "anthropic") {
        throw anthropicModelNotFound();
      }
      return m2.provider;
    },
    async (calls) => {
      const result = await nl.generate({
        input: { text: "ping" },
        disableTools: true,
      });
      return { result, calls };
    },
  );

  assertEqual(
    result.content,
    "served-by-the-healthy-member",
    "the surviving member must serve the request",
  );
  assert(calls.includes("anthropic"), "member#1 must have been attempted");
  assert(
    calls.includes("openai"),
    "member#2 MUST be attempted — this is the regression",
  );
  assert(m2.generate.callCount > 0, "member#2's provider must have generated");
});

await test("an auth failure still short-circuits — member#2 is never attempted", async () => {
  // The other side of the change: without this, making 404 retryable could
  // have been achieved by weakening the short-circuit altogether.
  const m2 = makeProviderStub("openai", "should-never-be-used");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: { members: [M1, M2], strategy: "priority", cooldownMs: 0 },
  });

  const { caught, calls } = await withCreateProvider(
    async (providerName) => {
      if (providerName === "anthropic") {
        throw Object.assign(new Error("Unauthorized"), { status: 401 });
      }
      return m2.provider;
    },
    async (calls) => {
      let caught: unknown;
      try {
        await nl.generate({ input: { text: "ping" }, disableTools: true });
      } catch (error) {
        caught = error;
      }
      return { caught, calls };
    },
  );

  assert(caught !== undefined, "an auth failure must still reject");
  assert(calls.includes("anthropic"), "member#1 must have been attempted");
  assert(
    !calls.includes("openai"),
    "member#2 must NOT be attempted after an auth failure",
  );
  assertEqual(m2.generate.callCount, 0, "member#2 must never have generated");
});

await runSuite();
