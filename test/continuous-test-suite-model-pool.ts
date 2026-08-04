#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous test suite for the ModelPool + RequestRouter subsystem.
 *
 * Coverage:
 *   A. ModelPool.selectNext — priority / round-robin / weighted strategies.
 *   B. Cooldown — retryable + unknown errors use cooldownMs; auth and
 *      context_window get permanent-for-instance cooldown; recordSuccess clears.
 *   C. classifyProviderError — representative inputs → correct ProviderErrorClass.
 *   D. createDefaultRequestRouter — context-driven tier decisions.
 *   E. Live-gated — pool fallback via a real provider (skips without keys).
 *
 * Run: pnpm run test:model-pool (tsx runner, no API keys required for A–D)
 */

import { defineSuite, Skip, assert, assertEqual } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { isExpectedProviderError } from "./helpers/envGuard.js";

import { ModelPool, classifyProviderError } from "../src/lib/routing/index.js";
import { createDefaultRequestRouter } from "../src/lib/routing/requestRouter.js";
import { AIProviderFactory } from "../src/lib/core/factory.js";
import { NeuroLink } from "../src/lib/neurolink.js";
import type { AIProviderName } from "../src/lib/constants/enums.js";
import type {
  AIProvider,
  ModelPoolMember,
  ModelPoolConfig,
  ProviderErrorClass,
  RequestRouter,
  RouterInputContext,
} from "../src/lib/types/index.js";
import { spy, stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("ModelPool + RequestRouter");

// ─────────────────────────────────────────────────────────────────────────────
// Section A — selectNext strategy tests (deterministic with injected clock)
// ─────────────────────────────────────────────────────────────────────────────

const M1: ModelPoolMember = { provider: "openai", model: "gpt-4o" };
const M2: ModelPoolMember = {
  provider: "anthropic",
  model: "claude-haiku-3-5",
};
const M3: ModelPoolMember = { provider: "vertex", model: "gemini-2.5-flash" };

function makePool(
  config: Omit<ModelPoolConfig, "members"> & { members: ModelPoolMember[] },
  nowMs = 0,
): ModelPool {
  return new ModelPool(config, { now: () => nowMs });
}

await test("priority strategy: always picks first available member", () => {
  const pool = makePool({ members: [M1, M2, M3], strategy: "priority" });
  const picked = pool.selectNext();
  assert(picked !== undefined, "selectNext returned undefined");
  assertEqual(picked!.provider, "openai", "first member is openai");
});

await test("priority strategy: skips cooled member and picks next", () => {
  const clock = 0;
  const pool = new ModelPool(
    { members: [M1, M2, M3], strategy: "priority", cooldownMs: 60_000 },
    { now: () => clock },
  );
  // Cool down M1
  pool.recordFailure(M1, "rate_limit");
  const picked = pool.selectNext();
  assert(
    picked !== undefined,
    "selectNext returned undefined after M1 cooldown",
  );
  assertEqual(picked!.provider, "anthropic", "picks M2 when M1 is cooled");
});

await test("priority strategy: excludedKeys prevents re-selection", () => {
  const pool = makePool({ members: [M1, M2, M3], strategy: "priority" });
  const excluded = new Set([pool.memberKey(M1)]);
  const picked = pool.selectNext(excluded);
  assert(picked !== undefined, "selectNext with exclusion returned undefined");
  assertEqual(picked!.provider, "anthropic", "M2 selected when M1 excluded");
});

await test("priority strategy: returns undefined when all members excluded", () => {
  const pool = makePool({ members: [M1, M2], strategy: "priority" });
  const excluded = new Set([pool.memberKey(M1), pool.memberKey(M2)]);
  const picked = pool.selectNext(excluded);
  assert(picked === undefined, "should return undefined when all excluded");
});

await test("round-robin strategy: rotates through members on successive calls", () => {
  const pool = makePool({ members: [M1, M2, M3], strategy: "round-robin" });
  const picks: string[] = [];
  for (let i = 0; i < 6; i++) {
    const m = pool.selectNext();
    assert(m !== undefined, `selectNext returned undefined at i=${i}`);
    picks.push(m!.provider);
  }
  // Should rotate: openai, anthropic, vertex, openai, anthropic, vertex
  assertEqual(picks[0], "openai", "first pick is openai");
  assertEqual(picks[1], "anthropic", "second pick is anthropic");
  assertEqual(picks[2], "vertex", "third pick is vertex");
  assertEqual(picks[3], "openai", "fourth pick wraps back to openai");
  assertEqual(picks[4], "anthropic", "fifth pick is anthropic");
  assertEqual(picks[5], "vertex", "sixth pick is vertex");
});

await test("round-robin strategy: skips excluded members without breaking rotation", () => {
  const pool = makePool({ members: [M1, M2, M3], strategy: "round-robin" });
  // Exclude M1 on first pick
  const excl = new Set([pool.memberKey(M1)]);
  const first = pool.selectNext(excl);
  assert(first !== undefined, "selectNext returned undefined");
  assertEqual(
    first!.provider,
    "anthropic",
    "first pick with M1 excluded is M2",
  );
  // Next call (no exclusion) should continue rotation
  const second = pool.selectNext();
  assert(second !== undefined, "second selectNext returned undefined");
  // After picking M2 (index 1), cursor moves to 2 (vertex)
  assertEqual(second!.provider, "vertex", "second pick continues rotation");
});

await test("weighted strategy: favors higher-weight member", () => {
  const wM1: ModelPoolMember = {
    provider: "openai",
    model: "gpt-4o",
    weight: 3,
  };
  const wM2: ModelPoolMember = {
    provider: "anthropic",
    model: "claude-haiku-3-5",
    weight: 1,
  };
  const pool = makePool({ members: [wM1, wM2], strategy: "weighted" });
  // With total weight 4 and cursor starting at 0: 0,1,2 → wM1; 3 → wM2; 4 → wM1 again
  const results: string[] = [];
  for (let i = 0; i < 8; i++) {
    const m = pool.selectNext();
    assert(m !== undefined, `pick ${i} is undefined`);
    results.push(m!.provider);
  }
  const openaiCount = results.filter((r) => r === "openai").length;
  const anthropicCount = results.filter((r) => r === "anthropic").length;
  assert(
    openaiCount > anthropicCount,
    `openai (weight=3) should appear more than anthropic (weight=1): got ${openaiCount} vs ${anthropicCount}`,
  );
});

await test("weighted strategy: handles default weight=1 for members without weight", () => {
  const pool = makePool({ members: [M1, M2], strategy: "weighted" });
  // Both weight=1, total=2, should alternate
  const picks: string[] = [];
  for (let i = 0; i < 4; i++) {
    const m = pool.selectNext();
    assert(m !== undefined, `pick ${i} is undefined`);
    picks.push(m!.provider);
  }
  // openai openai anthropic anthropic OR openai anthropic ... depends on cursor
  // As long as both appear
  assert(
    picks.includes("openai") && picks.includes("anthropic"),
    `both members should appear in 4 picks, got: ${picks.join(",")}`,
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section B — Cooldown / availability tests
// ─────────────────────────────────────────────────────────────────────────────

await test("recordFailure(rate_limit) cools member for cooldownMs then re-enables", () => {
  let clock = 1000;
  const pool = new ModelPool(
    { members: [M1, M2], strategy: "priority", cooldownMs: 5_000 },
    { now: () => clock },
  );

  pool.recordFailure(M1, "rate_limit");

  // Before cooldown expires: M1 should be unavailable
  const before = pool.availableMembers();
  assert(
    !before.some((m) => m.provider === "openai"),
    "M1 should be unavailable during cooldown",
  );

  // Advance clock past cooldown
  clock = 1000 + 5_001;
  const after = pool.availableMembers();
  assert(
    after.some((m) => m.provider === "openai"),
    "M1 should be available after cooldown expires",
  );
});

await test("recordFailure(server) cools member for cooldownMs then re-enables", () => {
  let clock = 0;
  const pool = new ModelPool(
    { members: [M1], strategy: "priority", cooldownMs: 10_000 },
    { now: () => clock },
  );

  pool.recordFailure(M1, "server");

  const beforeExpiry = pool.availableMembers();
  assert(beforeExpiry.length === 0, "M1 should be cooled");

  clock = 10_001;
  const afterExpiry = pool.availableMembers();
  assert(afterExpiry.length === 1, "M1 should recover after cooldownMs");
});

await test("recordFailure(network) cools member for cooldownMs then re-enables", () => {
  let clock = 0;
  const pool = new ModelPool(
    { members: [M1], strategy: "priority", cooldownMs: 3_000 },
    { now: () => clock },
  );

  pool.recordFailure(M1, "network");
  assert(
    pool.availableMembers().length === 0,
    "member cooled after network error",
  );

  clock = 3_001;
  assert(
    pool.availableMembers().length === 1,
    "member recovers after cooldown expires",
  );
});

await test("recordFailure(auth) keeps member permanently unavailable within pool lifetime", () => {
  let clock = 0;
  const pool = new ModelPool(
    { members: [M1], strategy: "priority", cooldownMs: 1_000 },
    { now: () => clock },
  );

  pool.recordFailure(M1, "auth");

  // Advance clock a long time — should still be cooled
  clock = 365 * 24 * 60 * 60 * 1000; // 1 year
  assert(
    pool.availableMembers().length === 0,
    "auth failure gives permanent cooldown for pool lifetime",
  );
});

await test("recordFailure(context_window) keeps member permanently unavailable", () => {
  let clock = 0;
  const pool = new ModelPool(
    { members: [M1], strategy: "priority", cooldownMs: 1_000 },
    { now: () => clock },
  );

  pool.recordFailure(M1, "context_window");

  clock = 10 * 365 * 24 * 60 * 60 * 1000 - 1; // just under 10 years
  assert(
    pool.availableMembers().length === 0,
    "context_window failure keeps member cooled",
  );
});

await test("recordFailure(unknown) uses timed cooldown so member can recover", () => {
  // 'unknown' errors use the timed cooldown (not permanent): the classification
  // is uncertain, so a transient error must not permanently retire a member.
  let clock = 0;
  const cooldownMs = 1_000;
  const pool = new ModelPool(
    { members: [M1], strategy: "priority", cooldownMs },
    { now: () => clock },
  );

  pool.recordFailure(M1, "unknown");

  // Still unavailable during the cooldown window
  clock = cooldownMs - 1;
  assert(
    pool.availableMembers().length === 0,
    "unknown failure keeps member cooled during cooldown window",
  );

  // Recovers after cooldown expires
  clock = cooldownMs + 1;
  assert(
    pool.availableMembers().length === 1,
    "unknown failure member recovers after cooldown expires",
  );
});

await test("recordSuccess clears any existing cooldown", () => {
  const clock = 0;
  const pool = new ModelPool(
    { members: [M1], strategy: "priority", cooldownMs: 60_000 },
    { now: () => clock },
  );

  pool.recordFailure(M1, "rate_limit");
  assert(pool.availableMembers().length === 0, "M1 cooled after failure");

  // Record success — should clear cooldown immediately
  pool.recordSuccess(M1);
  assert(
    pool.availableMembers().length === 1,
    "M1 available immediately after recordSuccess",
  );
});

await test("recordSuccess is a no-op when member has no cooldown", () => {
  const pool = makePool({ members: [M1, M2] });
  // recordSuccess on a fresh member should not cause issues
  pool.recordSuccess(M1);
  assert(
    pool.availableMembers().length === 2,
    "both members still available after recordSuccess on fresh member",
  );
});

await test("availableMembers returns all members when none are cooled", () => {
  const pool = makePool({ members: [M1, M2, M3] });
  assertEqual(pool.availableMembers().length, 3, "all three members available");
});

await test("maxAttempts returns config value when set", () => {
  const pool = makePool({ members: [M1, M2, M3], maxAttempts: 5 });
  assertEqual(pool.maxAttempts, 5, "maxAttempts matches config");
});

await test("maxAttempts defaults to member count when not configured", () => {
  const pool = makePool({ members: [M1, M2, M3] });
  assertEqual(pool.maxAttempts, 3, "maxAttempts defaults to members.length");
});

await test("memberKey is stable and unique across different provider/model/region combos", () => {
  const pool = makePool({ members: [M1, M2] });
  const k1 = pool.memberKey(M1);
  const k2 = pool.memberKey(M2);
  assert(k1 !== k2, "different members have different keys");

  // Key is deterministic
  assertEqual(
    pool.memberKey(M1),
    pool.memberKey(M1),
    "same member always gets same key",
  );

  // Region-aware
  const withRegion: ModelPoolMember = {
    provider: "vertex",
    model: "g",
    region: "us-central1",
  };
  const withoutRegion: ModelPoolMember = { provider: "vertex", model: "g" };
  assert(
    pool.memberKey(withRegion) !== pool.memberKey(withoutRegion),
    "region differentiates keys",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section C — classifyProviderError
// ─────────────────────────────────────────────────────────────────────────────

function classify(
  input: unknown,
  expected: ProviderErrorClass,
  label: string,
): void {
  const got = classifyProviderError(input);
  assertEqual(got, expected, `classifyProviderError: ${label}`);
}

await test("classifies HTTP 429 as rate_limit", () => {
  classify(
    Object.assign(new Error("Too Many Requests"), { status: 429 }),
    "rate_limit",
    "HTTP 429",
  );
});

await test("classifies 'rate limit exceeded' message as rate_limit", () => {
  classify(
    new Error("Rate limit exceeded, please slow down"),
    "rate_limit",
    "rate-limit message",
  );
});

await test("classifies 'quota exceeded' message as rate_limit", () => {
  classify(
    new Error("quota exceeded: 1000 req/min"),
    "rate_limit",
    "quota exceeded message",
  );
});

await test("classifies 'too many requests' message as rate_limit", () => {
  classify(
    new Error("too many requests"),
    "rate_limit",
    "too many requests message",
  );
});

await test("classifies HTTP 401 as auth", () => {
  classify(
    Object.assign(new Error("Unauthorized"), { status: 401 }),
    "auth",
    "HTTP 401",
  );
});

await test("classifies HTTP 403 as auth", () => {
  classify(
    Object.assign(new Error("Forbidden"), { status: 403 }),
    "auth",
    "HTTP 403",
  );
});

await test("classifies 'invalid api key' message as auth", () => {
  classify(
    new Error("invalid api key provided"),
    "auth",
    "invalid api key message",
  );
});

await test("classifies 'access denied' message as auth", () => {
  classify(
    new Error("access denied: insufficient permissions"),
    "auth",
    "access denied message",
  );
});

await test("classifies 'unauthorized' message as auth", () => {
  classify(new Error("unauthorized request"), "auth", "unauthorized message");
});

await test("classifies 'authentication failed' message as auth", () => {
  classify(
    new Error("authentication failed"),
    "auth",
    "authentication failed message",
  );
});

await test("classifies ModelAccessDeniedError by name as auth", () => {
  classify(
    Object.assign(new Error("model not whitelisted"), {
      name: "ModelAccessDeniedError",
    }),
    "auth",
    "name=ModelAccessDeniedError (model-access-denied heuristic)",
  );
});

await test("classifies MODEL_ACCESS_DENIED code as auth", () => {
  classify(
    Object.assign(new Error("blocked"), { code: "MODEL_ACCESS_DENIED" }),
    "auth",
    "code=MODEL_ACCESS_DENIED (model-access-denied heuristic)",
  );
});

await test("classifies 'team can only access' message as auth", () => {
  classify(
    new Error("your team can only access models=[gpt-4o-mini]"),
    "auth",
    "team-can-only-access message (model-access-denied heuristic)",
  );
});

await test("classifies context-length message as context_window", () => {
  classify(
    new Error("context length exceeded: 128000 tokens"),
    "context_window",
    "context length exceeded",
  );
});

await test("classifies 'maximum context' message as context_window", () => {
  classify(
    new Error("This model's maximum context window is 4096 tokens"),
    "context_window",
    "maximum context window",
  );
});

await test("classifies 'token limit exceeded' as context_window", () => {
  classify(
    new Error("token limit exceeded: input too large"),
    "context_window",
    "token limit exceeded",
  );
});

await test("classifies HTTP 503 as server", () => {
  classify(
    Object.assign(new Error("Service Unavailable"), { status: 503 }),
    "server",
    "HTTP 503",
  );
});

await test("classifies HTTP 500 as server", () => {
  classify(
    Object.assign(new Error("Internal Server Error"), { status: 500 }),
    "server",
    "HTTP 500",
  );
});

await test("classifies 'overloaded' message as server", () => {
  classify(
    new Error("The model is currently overloaded with requests"),
    "server",
    "overloaded message",
  );
});

await test("classifies 'server error' message as server", () => {
  classify(
    new Error("internal server error"),
    "server",
    "internal server error message",
  );
});

await test("classifies ECONNRESET as network", () => {
  classify(
    new Error("ECONNRESET: connection reset by peer"),
    "network",
    "ECONNRESET",
  );
});

await test("classifies ETIMEDOUT as network", () => {
  classify(
    new Error("ETIMEDOUT: connection timed out"),
    "network",
    "ETIMEDOUT",
  );
});

await test("classifies 'socket hang up' as network", () => {
  classify(new Error("socket hang up"), "network", "socket hang up");
});

await test("classifies 'connection refused' as network", () => {
  classify(new Error("connection refused"), "network", "connection refused");
});

await test("classifies random/unknown error as unknown", () => {
  classify(
    new Error("something went totally wrong"),
    "unknown",
    "random error",
  );
});

await test("classifies null/undefined as unknown", () => {
  classify(null, "unknown", "null error");
  classify(undefined, "unknown", "undefined error");
});

await test("classifies plain string as unknown", () => {
  classify("some string error", "unknown", "string error");
});

await test("rate_limit takes priority over server when status=429", () => {
  // 429 comes before 5xx in check order
  classify(
    Object.assign(new Error("too many requests"), { status: 429 }),
    "rate_limit",
    "429 over server",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section D — createDefaultRequestRouter
// ─────────────────────────────────────────────────────────────────────────────

await test("routes vision request to visionTier", async () => {
  const router = createDefaultRequestRouter({
    visionTier: { provider: "vertex", model: "gemini-2.5-flash" },
    largeTier: { provider: "anthropic", model: "claude-sonnet-4-5" },
    smallTier: { provider: "anthropic", model: "claude-haiku-3-5" },
  });

  const ctx: RouterInputContext = {
    prompt: "describe this image",
    requiresVision: true,
  };
  const decision = await router(ctx);
  assertEqual(decision.provider, "vertex", "vision routes to vertex");
  assertEqual(
    decision.model,
    "gemini-2.5-flash",
    "vision routes to gemini-2.5-flash",
  );
});

await test("routes tool-enabled request to largeTier", async () => {
  const router = createDefaultRequestRouter({
    visionTier: { provider: "vertex", model: "gemini-2.5-flash" },
    largeTier: { provider: "anthropic", model: "claude-sonnet-4-5" },
    smallTier: { provider: "anthropic", model: "claude-haiku-3-5" },
  });

  const ctx: RouterInputContext = {
    prompt: "call the database tool",
    hasTools: true,
  };
  const decision = await router(ctx);
  assertEqual(
    decision.provider,
    "anthropic",
    "tool request routes to anthropic",
  );
  assertEqual(
    decision.model,
    "claude-sonnet-4-5",
    "tool request routes to large model",
  );
});

await test("routes large-token request to largeTier", async () => {
  const router = createDefaultRequestRouter({
    largeTier: { provider: "anthropic", model: "claude-sonnet-4-5" },
    smallTier: { provider: "anthropic", model: "claude-haiku-3-5" },
    largeInputTokenThreshold: 10_000,
  });

  const ctx: RouterInputContext = {
    prompt: "analyze this large document",
    estimatedInputTokens: 15_000,
  };
  const decision = await router(ctx);
  assertEqual(
    decision.provider,
    "anthropic",
    "large input routes to anthropic",
  );
  assertEqual(
    decision.model,
    "claude-sonnet-4-5",
    "large input routes to sonnet",
  );
});

await test("routes small request to smallTier when configured", async () => {
  const router = createDefaultRequestRouter({
    smallTier: { provider: "openai", model: "gpt-4o-mini" },
    largeTier: { provider: "openai", model: "gpt-4o" },
    largeInputTokenThreshold: 32_000,
  });

  const ctx: RouterInputContext = {
    prompt: "hello",
    estimatedInputTokens: 10,
  };
  const decision = await router(ctx);
  assertEqual(decision.provider, "openai", "small request routes to openai");
  assertEqual(
    decision.model,
    "gpt-4o-mini",
    "small request routes to gpt-4o-mini",
  );
});

await test("returns empty decision when nothing matches and no smallTier", async () => {
  const router = createDefaultRequestRouter({
    largeTier: { provider: "anthropic", model: "claude-sonnet-4-5" },
    // no smallTier
  });

  const ctx: RouterInputContext = {
    prompt: "hello",
    estimatedInputTokens: 10,
    hasTools: false,
    requiresVision: false,
  };
  const decision = await router(ctx);
  assertEqual(
    decision.provider,
    undefined,
    "no provider override for tiny prompt without smallTier",
  );
  assertEqual(
    decision.model,
    undefined,
    "no model override for tiny prompt without smallTier",
  );
});

await test("vision takes priority over large-input when both match", async () => {
  const router = createDefaultRequestRouter({
    visionTier: { provider: "vertex", model: "gemini-2.5-flash" },
    largeTier: { provider: "anthropic", model: "claude-sonnet-4-5" },
  });

  const ctx: RouterInputContext = {
    prompt: "describe this large document with an image",
    requiresVision: true,
    estimatedInputTokens: 50_000,
  };
  const decision = await router(ctx);
  assertEqual(
    decision.provider,
    "vertex",
    "vision takes priority over large-input",
  );
});

await test("createDefaultRequestRouter works with no config (built-in defaults)", async () => {
  const router = createDefaultRequestRouter();

  // Vision should hit the built-in vertex default
  const visionCtx: RouterInputContext = {
    prompt: "look at this image",
    requiresVision: true,
  };
  const visionDecision = await router(visionCtx);
  assert(
    typeof visionDecision.provider === "string",
    "vision decision has a provider",
  );
  assert(
    typeof visionDecision.model === "string",
    "vision decision has a model",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section E — NeuroLink integration (deterministic; createProvider stubbed)
//
// Sections A–D exercise ModelPool and the router in isolation. These drive the
// same machinery through NeuroLink.generate()/stream(), which is where the
// wiring actually lives: the pool loop, the non-retryable short-circuit, and
// the router's fail-open behaviour are all properties of that path, not of the
// pool object. AIProviderFactory.createProvider is stubbed, so no credentials
// and no network are involved.
// ─────────────────────────────────────────────────────────────────────────────

/** Build a minimal AIProvider stub whose generate()/stream() resolve at once. */
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
  const streamFn = spy(() => ({
    stream: (async function* () {
      yield { type: "content" as const, content };
    })(),
    metadata: Promise.resolve({
      content,
      provider: providerName,
      model: "stub-model",
      finishReason: "stop" as const,
      toolsUsed: [],
      toolExecutions: [],
    }),
  }));
  const provider = {
    generate: generate.fn,
    stream: streamFn.fn,
    setTraceContext: () => {},
    setupToolExecutor: () => {},
    getAllTools: async () => [],
    getCustomTools: () => ({}),
    setSystemPrompt: () => {},
    clearHistory: () => {},
    registerTool: () => {},
    getTools: () => [],
  } as unknown as AIProvider;
  return { provider, generate, stream: streamFn };
}

/** Minimal NeuroLink config that disables persistence/telemetry side-effects. */
const BASE_CONFIG = {
  conversationMemory: { enabled: false },
  disableTools: true,
} as const;

/** Stub createProvider for the duration of `body`, always restoring it. */
function withCreateProvider<T>(
  impl: (providerName: string, model?: string | null) => Promise<AIProvider>,
  body: (calls: string[]) => Promise<T>,
): Promise<T> {
  const calls: string[] = [];
  const s = stub(
    AIProviderFactory,
    "createProvider",
    async (providerName: string, model?: string | null) => {
      calls.push(providerName);
      return impl(providerName, model);
    },
  );
  return withStubs([s], () => body(calls));
}

const POOL_M1: ModelPoolMember = { provider: "openai", model: "gpt-4o" };
const POOL_M2: ModelPoolMember = {
  provider: "anthropic",
  model: "claude-haiku-3-5",
};

/** Reads the private modelPool field NeuroLink builds from config. */
const poolOf = (nl: NeuroLink): ModelPool | null =>
  (nl as unknown as { modelPool: ModelPool | null }).modelPool;

await test("generate: falls back to member#2 when member#1 hits a rate limit", async () => {
  const m2 = makeProviderStub("anthropic", "hello-from-m2");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "priority",
      cooldownMs: 0,
    },
  });

  const result = await withCreateProvider(
    async (providerName) => {
      if (providerName === "openai") {
        // A plain Error: no status and no typed class, so it is retryable —
        // classifyProviderError still reads it as rate_limit.
        throw new Error("rate limit exceeded, please retry after 60s");
      }
      return m2.provider;
    },
    () => nl.generate({ input: { text: "ping" }, disableTools: true }),
  );

  assertEqual(result.content, "hello-from-m2", "member#2 must serve the call");
  assertEqual(result.provider, "anthropic", "the result must name member#2");
  assert(m2.generate.callCount > 0, "member#2's provider must have been used");
});

await test("generate: a rate-limited member is cooled and its sibling stays available", async () => {
  const m2 = makeProviderStub("anthropic", "m2-ok");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "priority",
      cooldownMs: 30_000,
    },
  });

  await withCreateProvider(
    async (providerName) => {
      if (providerName === "openai") {
        throw new Error("too many requests");
      }
      return m2.provider;
    },
    () => nl.generate({ input: { text: "ping" }, disableTools: true }),
  );

  const available = poolOf(nl)!.availableMembers();
  assert(
    !available.some((m) => m.provider === "openai"),
    "the rate-limited member must be cooled for the configured 30s",
  );
  assert(
    available.some((m) => m.provider === "anthropic"),
    "the member that succeeded must stay available",
  );
});

await test("generate: a plain auth error is retryable, so member#2 is still tried", async () => {
  // "unauthorized" classifies as auth, but isNonRetryableProviderError only
  // short-circuits on typed classes and HTTP status objects — so a bare
  // message must NOT stop the pool. The 401 test below is the other side.
  const m2 = makeProviderStub("anthropic", "auth-fallback-ok");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "priority",
      cooldownMs: 0,
    },
  });

  const result = await withCreateProvider(
    async (providerName) => {
      if (providerName === "openai") {
        throw new Error("unauthorized: invalid api key provided");
      }
      return m2.provider;
    },
    () => nl.generate({ input: { text: "ping" }, disableTools: true }),
  );

  assertEqual(result.content, "auth-fallback-ok", "member#2 must serve it");
  assert(m2.generate.callCount > 0, "member#2's provider must have been used");
});

await test("generate: an auth failure cools the member permanently, past cooldownMs", async () => {
  const m2 = makeProviderStub("anthropic", "ok");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "priority",
      cooldownMs: 1_000,
    },
  });

  await withCreateProvider(
    async (providerName) => {
      if (providerName === "openai") {
        throw new Error("unauthorized access — please check your api key");
      }
      return m2.provider;
    },
    () => nl.generate({ input: { text: "ping" }, disableTools: true }),
  );

  assert(
    !poolOf(nl)!
      .availableMembers()
      .some((m) => m.provider === "openai"),
    "an auth failure must outlive the 1s cooldown configured on the pool",
  );
});

await test("stream: falls back to member#2 when member#1's provider creation fails", async () => {
  // member#1 is a non-default provider so the getBestProvider() call that runs
  // before the pool loop can never be the failing one, whatever the env
  // defaults happen to be.
  const m1: ModelPoolMember = { provider: "mistral", model: "mistral-large" };
  const m2 = makeProviderStub("anthropic", "hello-from-m2-stream");
  const initStub = makeProviderStub("openai", "init-stub");

  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: { members: [m1, POOL_M2], strategy: "priority", cooldownMs: 0 },
  });

  const { result, chunks, calls } = await withCreateProvider(
    async (providerName) => {
      if (providerName === "mistral") {
        throw new Error("rate limit exceeded, please retry after 60s");
      }
      return providerName === "anthropic" ? m2.provider : initStub.provider;
    },
    async (calls) => {
      const result = await nl.stream({
        input: { text: "ping" },
        disableTools: true,
      });
      // Consume the stream so the wrapping generator records success.
      const chunks: unknown[] = [];
      for await (const chunk of result.stream) {
        chunks.push(chunk);
      }
      return { result, chunks, calls };
    },
  );

  assertEqual(result.provider, "anthropic", "the stream must come from m2");
  assert(m2.stream.callCount > 0, "member#2's stream must have been used");
  assert(calls.includes("mistral"), "member#1 must have been attempted");
  assert(calls.includes("anthropic"), "member#2 must have been attempted");
  assert(
    JSON.stringify(chunks).includes("hello-from-m2-stream"),
    "the consumed chunks must carry member#2's content",
  );
});

await test("generate: an HTTP 401 short-circuits the pool — member#2 is never attempted", async () => {
  const m2 = makeProviderStub("anthropic", "should-never-be-used");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "priority",
      cooldownMs: 0,
    },
  });

  const { caught, calls } = await withCreateProvider(
    async (providerName) => {
      if (providerName === "openai") {
        // A real status code → isNonRetryableProviderError → stop the pool.
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

  assert(caught !== undefined, "a non-retryable error must reject the call");
  assert(calls.includes("openai"), "member#1 must have been attempted");
  assert(
    !calls.includes("anthropic"),
    "member#2 must NOT be attempted after a non-retryable failure",
  );
  assertEqual(m2.generate.callCount, 0, "member#2 must never have generated");
});

await test("generate: exhausting every member rejects and leaves none available", async () => {
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "priority",
      cooldownMs: 30_000,
    },
  });

  const caught = await withCreateProvider(
    async () => {
      throw new Error("too many requests");
    },
    async () => {
      let caught: unknown;
      try {
        await nl.generate({ input: { text: "ping" }, disableTools: true });
      } catch (error) {
        caught = error;
      }
      return caught;
    },
  );

  assert(
    caught instanceof Error && /ModelPool/.test(caught.message),
    `exhaustion must reject with a ModelPool error, got: ${String(caught)}`,
  );
  assertEqual(
    poolOf(nl)!.availableMembers().length,
    0,
    "every member must be cooled after a full sweep of failures",
  );
});

await test("router: applies when the caller set neither provider nor model", async () => {
  const target = makeProviderStub("anthropic", "routed-response");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    requestRouter: createDefaultRequestRouter({
      smallTier: { provider: "anthropic", model: "claude-haiku-3-5" },
      largeTier: { provider: "anthropic", model: "claude-sonnet-4-5" },
    }),
  });

  const calls = await withCreateProvider(
    async () => target.provider,
    async (calls) => {
      await nl.generate({ input: { text: "hello" }, disableTools: true });
      return calls;
    },
  );

  assert(calls.length > 0, "a provider must have been created");
  assertEqual(calls[0], "anthropic", "the router's tier must be honoured");
});

await test("router: does NOT override a provider the caller set explicitly", async () => {
  const target = makeProviderStub("openai", "explicit-provider-response");
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    // The router wants everything on vertex; the explicit option must win.
    requestRouter: createDefaultRequestRouter({
      smallTier: { provider: "vertex", model: "gemini-2.5-flash" },
      largeTier: { provider: "vertex", model: "gemini-2.5-pro" },
    }),
  });

  const calls = await withCreateProvider(
    async () => target.provider,
    async (calls) => {
      await nl.generate({
        provider: "openai" as AIProviderName,
        model: "gpt-4o",
        input: { text: "hello" },
        disableTools: true,
      });
      return calls;
    },
  );

  assert(calls.includes("openai"), "the explicit provider must be used");
  assert(
    !calls.includes("vertex"),
    "the router must not override an explicit provider",
  );
});

await test("router: a throwing router fails open — the call still completes", async () => {
  const target = makeProviderStub("openai", "fail-open-ok");
  const throwingRouter: RequestRouter = () => {
    throw new Error("router exploded");
  };
  const nl = new NeuroLink({ ...BASE_CONFIG, requestRouter: throwingRouter });

  // No explicit provider/model, so the router really is invoked (and throws).
  const result = await withCreateProvider(
    async () => target.provider,
    () => nl.generate({ input: { text: "hello" }, disableTools: true }),
  );

  assertEqual(
    result.content,
    "fail-open-ok",
    "a broken router must not abort the request",
  );
});

await test("no pool and no router: the plain generate path is unchanged", async () => {
  const target = makeProviderStub("openai", "plain-response");
  const nl = new NeuroLink({ ...BASE_CONFIG });

  const result = await withCreateProvider(
    async () => target.provider,
    () =>
      nl.generate({
        provider: "openai" as AIProviderName,
        model: "gpt-4o",
        input: { text: "hello" },
        disableTools: true,
      }),
  );

  assertEqual(
    result.content,
    "plain-response",
    "the plain path must still work",
  );
});

await test("modelPool and requestRouter are null when not configured", () => {
  const nl = new NeuroLink({ ...BASE_CONFIG });
  assertEqual(poolOf(nl), null, "modelPool must be null without config");
  assertEqual(
    (nl as unknown as { requestRouter: unknown }).requestRouter,
    null,
    "requestRouter must be null without config",
  );
});

await test("a configured modelPool is constructed with its members and attempt cap", () => {
  const nl = new NeuroLink({
    ...BASE_CONFIG,
    modelPool: {
      members: [POOL_M1, POOL_M2],
      strategy: "round-robin",
      cooldownMs: 5_000,
    },
  });

  const pool = poolOf(nl);
  assert(pool !== null, "a configured pool must be constructed");
  assertEqual(pool!.availableMembers().length, 2, "both members must be live");
  assertEqual(pool!.maxAttempts, 2, "maxAttempts defaults to the member count");
});

await test("a provided requestRouter instance is stored as-is", () => {
  const router = createDefaultRequestRouter({
    smallTier: { provider: "anthropic", model: "claude-haiku-3-5" },
  });
  const nl = new NeuroLink({ ...BASE_CONFIG, requestRouter: router });
  assertEqual(
    (nl as unknown as { requestRouter: unknown }).requestRouter,
    router,
    "the exact router instance must be retained",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Section F — Live-gated integration: real pool fallback via NeuroLink
// ─────────────────────────────────────────────────────────────────────────────

await test("[LIVE] pool falls back from bogus model to real provider", async () => {
  // Guard: skip if no anthropic key available
  skipUnlessProviderAvailable("anthropic");

  // Dynamically import NeuroLink only if we have keys (avoids initialization
  // side-effects when keys are absent)
  const { NeuroLink } = await import("../src/lib/neurolink.js");

  const nl = new NeuroLink({
    conversationMemory: { enabled: false },
    modelPool: {
      members: [
        // Member 1: deliberately bogus model that will fail
        {
          provider: "anthropic",
          model: "claude-definitely-does-not-exist-v99",
        },
        // Member 2: omit the model so the provider's current default is used.
        // Pinning a specific id is brittle — older ids (claude-haiku-3-5,
        // claude-3-5-haiku-*) are now end-of-life and 404 on the live API.
        { provider: "anthropic" },
      ],
      strategy: "priority",
      cooldownMs: 0,
    },
  });

  try {
    const result = await nl.generate({
      input: { text: "Say 'pool-fallback-ok' and nothing else." },
      disableTools: true,
    });

    assert(
      typeof result.content === "string" && result.content.length > 0,
      `Expected non-empty content from pool fallback, got: ${JSON.stringify(result.content)}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isExpectedProviderError(msg)) {
      throw new Skip(
        `provider error (expected in CI without keys): ${msg.slice(0, 100)}`,
      );
    }
    throw err;
  }
});

await runSuite();
