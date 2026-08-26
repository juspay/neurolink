#!/usr/bin/env tsx
/**
 * Continuous Test Suite: RealtimeProcessor (unit, no API).
 *
 * Mirrors continuous-test-suite-tts-unit.ts / -stt-unit.ts. A live realtime
 * suite needs a real bidirectional connection, so this covers the
 * registry/session/dispatch logic with a stub handler — the parts that can
 * be tested without a network call — as a parity baseline for the
 * HandlerRegistry<THandler> composition refactor (plan-09, Task 4).
 *
 * Unlike TTS/STT, RealtimeProcessor also owns a `sessions` Map that is NOT
 * part of the registry composition — clearHandlers() must drain it before
 * delegating to the generic registry's clear(). Several tests below exist
 * specifically to prove that ordering survives the refactor.
 *
 * Rule 15 compliance, stated plainly because this suite is the one exception
 * among the six. The other five media suites were converted to drive
 * generate()/stream(); this one cannot be, and that is not a shortcut.
 * RealtimeProcessor has no path through generate()/stream() at all — neither
 * ever calls it. So the rule's usual instruction ("construct NeuroLink and
 * call generate()/stream()") has nothing to point at here.
 *
 * What makes this suite compliant is the rule's actual purpose — "exercise a
 * surface this package actually ships … test what callers can reach".
 * RealtimeProcessor IS that surface: it is a runtime export of dist/index.js
 * (verified, unlike RealtimeVoiceAPI which is not exported), and it is the
 * documented consumer entry point in docs/features/real-time-services.md and
 * docs/provider-integration/18-adding-realtime-provider.md. Calling it
 * directly is therefore not reaching past the public API — it IS the public
 * API, and this suite uses it exactly the way a consumer does.
 *
 * The honest caveat: if NeuroLink ever grows a realtime entry point on
 * generate()/stream(), this suite should move onto it, because that would
 * then be the surface callers actually reach.
 *
 * Imports from ../dist/index.js per Rule 15 — the public entry, never a deep
 * ../dist/lib/… path and never ../src/lib/….
 *
 * Run: npx tsx test/continuous-test-suite-realtime-unit.ts
 */
import {
  defineSuite,
  assert,
  assertEqual,
  assertIncludes,
} from "./helpers/harness.js";
import {
  RealtimeProcessor,
  RealtimeError,
  REALTIME_ERROR_CODES,
} from "../dist/index.js";
import type {
  RealtimeHandler,
  RealtimeConfig,
  RealtimeSession,
} from "../dist/index.js";

const { test, runSuite } = defineSuite("RealtimeProcessor (unit)", {
  offline: true,
});

const PROVIDER = "unit-test-realtime-provider";
// RealtimeConfig["provider"] / RealtimeSession["provider"] are narrowed to a
// literal union ("openai-realtime" | "gemini-live"); the *registry key* the
// handler is registered under has no such constraint (any string), so the
// two are deliberately different here — reusing a real config literal keeps
// the stub type-correct while proving the registry key is independent.
const CONFIG_PROVIDER = "openai-realtime" as const;

type StubHandlerCalls = {
  connect: number;
  disconnect: number;
  sendAudio: number;
  sendText: number;
  triggerResponse: number;
  cancelResponse: number;
};

function makeStubHandler(overrides: Partial<RealtimeHandler> = {}): {
  handler: RealtimeHandler;
  calls: StubHandlerCalls;
  isConnected: () => boolean;
} {
  let connected = false;
  let session: RealtimeSession | null = null;
  const calls: StubHandlerCalls = {
    connect: 0,
    disconnect: 0,
    sendAudio: 0,
    sendText: 0,
    triggerResponse: 0,
    cancelResponse: 0,
  };

  const handler: RealtimeHandler = {
    name: PROVIDER,
    isConfigured: () => true,
    isConnected: () => connected,
    getSession: () => session,
    connect: async (config: RealtimeConfig): Promise<RealtimeSession> => {
      calls.connect += 1;
      connected = true;
      session = {
        id: "stub-session-1",
        state: "connected",
        provider: config.provider,
        createdAt: new Date(),
        lastActivityAt: new Date(),
        config,
      };
      return session;
    },
    disconnect: async (): Promise<void> => {
      calls.disconnect += 1;
      connected = false;
      session = null;
    },
    sendAudio: async (): Promise<void> => {
      calls.sendAudio += 1;
    },
    sendText: async (): Promise<void> => {
      calls.sendText += 1;
    },
    triggerResponse: async (): Promise<void> => {
      calls.triggerResponse += 1;
    },
    cancelResponse: async (): Promise<void> => {
      calls.cancelResponse += 1;
    },
    on: () => {},
    off: () => {},
    getSupportedFormats: () => ["pcm16"],
    ...overrides,
  };

  return { handler, calls, isConnected: () => connected };
}

function makeConfig(): RealtimeConfig {
  return { provider: CONFIG_PROVIDER };
}

// ---------------------------------------------------------------------------
// registerHandler / supports / getHandler
// ---------------------------------------------------------------------------

await test("registerHandler makes a provider resolvable via supports/getHandler", () => {
  const { handler } = makeStubHandler();
  RealtimeProcessor.registerHandler(PROVIDER, handler);
  assertEqual(RealtimeProcessor.supports(PROVIDER), true, "supports() sees it");
  assertEqual(
    RealtimeProcessor.getHandler(PROVIDER),
    handler,
    "getHandler() returns the same instance",
  );
});

await test("provider names are normalized to lowercase", () => {
  const { handler } = makeStubHandler();
  const mixedCase = "Unit-Test-Realtime-Mixed-Case";
  RealtimeProcessor.registerHandler(mixedCase, handler);
  assertEqual(
    RealtimeProcessor.supports(mixedCase.toLowerCase()),
    true,
    "lookup is case-insensitive",
  );
  assertEqual(
    RealtimeProcessor.getHandler(mixedCase.toUpperCase()),
    handler,
    "getHandler() is also case-insensitive",
  );
});

await test("re-registering a provider replaces the previous handler", () => {
  const overwriteProvider = "unit-test-realtime-overwrite";
  const { handler: first } = makeStubHandler();
  const { handler: second } = makeStubHandler();
  RealtimeProcessor.registerHandler(overwriteProvider, first);
  RealtimeProcessor.registerHandler(overwriteProvider, second);
  assertEqual(
    RealtimeProcessor.getHandler(overwriteProvider),
    second,
    "the later registration wins",
  );
});

await test("registerHandler without a provider name throws", () => {
  const { handler } = makeStubHandler();
  let threw = false;
  try {
    RealtimeProcessor.registerHandler("", handler);
  } catch (err) {
    threw = err instanceof Error && err.message === "Provider name is required";
  }
  assert(threw, "empty provider name is rejected with the expected message");
});

await test("registerHandler without a handler throws", () => {
  let threw = false;
  try {
    RealtimeProcessor.registerHandler(
      "unit-test-realtime-missing-handler",
      undefined as unknown as RealtimeHandler,
    );
  } catch (err) {
    threw = err instanceof Error && err.message === "Handler is required";
  }
  assert(threw, "missing handler is rejected with the expected message");
});

await test("supports() returns false for an unregistered provider", () => {
  assertEqual(
    RealtimeProcessor.supports("unit-test-realtime-never-registered"),
    false,
    "supports() is false for unknown providers",
  );
  assertEqual(
    RealtimeProcessor.getHandler("unit-test-realtime-never-registered"),
    undefined,
    "getHandler() returns undefined rather than throwing",
  );
});

await test("supports() returns false for an empty provider name", () => {
  assertEqual(
    RealtimeProcessor.supports(""),
    false,
    "empty name is never supported",
  );
});

// ---------------------------------------------------------------------------
// getProviders() — the special case: current behavior already matches spec,
// so red state is proven by a deliberate temporary stub rather than by
// running against pre-refactor code (see task-4-brief.md).
// ---------------------------------------------------------------------------

await test("getProviders lists every registered provider", () => {
  const { handler } = makeStubHandler();
  RealtimeProcessor.registerHandler(PROVIDER, handler);
  const providers = RealtimeProcessor.getProviders();
  assert(
    providers.includes(PROVIDER),
    "getProviders() includes a provider registered earlier in the suite",
  );
});

// ---------------------------------------------------------------------------
// connect() / disconnect() — happy path + session bookkeeping
// ---------------------------------------------------------------------------

await test("connect dispatches to the registered handler and returns its session", async () => {
  const { handler, calls } = makeStubHandler();
  RealtimeProcessor.registerHandler(PROVIDER, handler);
  const session = await RealtimeProcessor.connect(PROVIDER, makeConfig());
  assertEqual(calls.connect, 1, "handler.connect invoked exactly once");
  assertEqual(
    session.id,
    "stub-session-1",
    "session forwarded from the handler",
  );
  await RealtimeProcessor.disconnect(PROVIDER);
});

await test("connect on an already-connected provider raises SESSION_ALREADY_ACTIVE", async () => {
  const activeProvider = "unit-test-realtime-already-active";
  const { handler } = makeStubHandler();
  RealtimeProcessor.registerHandler(activeProvider, handler);
  await RealtimeProcessor.connect(activeProvider, makeConfig());
  let code: string | undefined;
  try {
    await RealtimeProcessor.connect(activeProvider, makeConfig());
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.SESSION_ALREADY_ACTIVE,
    "a second connect on an active session is rejected",
  );
  await RealtimeProcessor.disconnect(activeProvider);
});

await test("connect on an unconfigured provider raises PROVIDER_NOT_CONFIGURED", async () => {
  const unconfiguredProvider = "unit-test-realtime-not-configured";
  const { handler } = makeStubHandler({ isConfigured: () => false });
  RealtimeProcessor.registerHandler(unconfiguredProvider, handler);
  let code: string | undefined;
  try {
    await RealtimeProcessor.connect(unconfiguredProvider, makeConfig());
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_CONFIGURED,
    "unconfigured provider raises REALTIME_PROVIDER_NOT_CONFIGURED",
  );
});

// ---------------------------------------------------------------------------
// PROVIDER_NOT_SUPPORTED — one test per converted call site (6 total), the
// exact set the brief calls out for the this.handlers -> this.registry swap.
// ---------------------------------------------------------------------------

await test("connect on an unsupported provider raises a typed error naming the provider", async () => {
  const unknownProvider = "unit-test-realtime-unknown-connect";
  let code: string | undefined;
  let message = "";
  try {
    await RealtimeProcessor.connect(unknownProvider, makeConfig());
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
    message = err instanceof Error ? err.message : "";
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "unknown provider raises REALTIME_PROVIDER_NOT_SUPPORTED",
  );
  assertIncludes(
    message,
    unknownProvider,
    "the error names the provider that was asked for",
  );
});

await test("disconnect on an unsupported provider raises a typed error", async () => {
  let code: string | undefined;
  try {
    await RealtimeProcessor.disconnect("unit-test-realtime-unknown-disconnect");
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "disconnect on an unknown provider raises REALTIME_PROVIDER_NOT_SUPPORTED",
  );
});

await test("sendAudio on an unsupported provider raises a typed error", async () => {
  let code: string | undefined;
  try {
    await RealtimeProcessor.sendAudio(
      "unit-test-realtime-unknown-sendaudio",
      Buffer.from("x"),
    );
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "sendAudio on an unknown provider raises REALTIME_PROVIDER_NOT_SUPPORTED",
  );
});

await test("sendText on an unsupported provider raises a typed error", async () => {
  let code: string | undefined;
  try {
    await RealtimeProcessor.sendText(
      "unit-test-realtime-unknown-sendtext",
      "hi",
    );
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "sendText on an unknown provider raises REALTIME_PROVIDER_NOT_SUPPORTED",
  );
});

await test("triggerResponse on an unsupported provider raises a typed error", async () => {
  let code: string | undefined;
  try {
    await RealtimeProcessor.triggerResponse(
      "unit-test-realtime-unknown-trigger",
    );
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "triggerResponse on an unknown provider raises REALTIME_PROVIDER_NOT_SUPPORTED",
  );
});

await test("cancelResponse on an unsupported provider raises a typed error", async () => {
  let code: string | undefined;
  try {
    await RealtimeProcessor.cancelResponse("unit-test-realtime-unknown-cancel");
  } catch (err) {
    code = err instanceof RealtimeError ? err.code : undefined;
  }
  assertEqual(
    code,
    REALTIME_ERROR_CODES.PROVIDER_NOT_SUPPORTED,
    "cancelResponse on an unknown provider raises REALTIME_PROVIDER_NOT_SUPPORTED",
  );
});

// ---------------------------------------------------------------------------
// clearHandlers() — must drain active sessions before clearing the registry
// ---------------------------------------------------------------------------

await test("clearHandlers disconnects active sessions before removing handlers", async () => {
  // clearHandlers() wipes the whole process-wide static registry, not just
  // the provider under test here — every provider earlier tests in this
  // file registered goes with it. Snapshot the full pre-clear state so it
  // can be restored afterward, rather than leaving nothing behind for a
  // later test in this file (including the next clearHandlers test below).
  // Restoring a registration does not restore a session — drainProvider's
  // handler correctly comes back disconnected, which is what a fresh
  // registration should look like.
  const preClearProviders = RealtimeProcessor.getProviders();
  const snapshot = preClearProviders.map(
    (name) => [name, RealtimeProcessor.getHandler(name)!] as const,
  );

  const drainProvider = "unit-test-realtime-drain";
  const { handler, calls } = makeStubHandler();
  RealtimeProcessor.registerHandler(drainProvider, handler);
  await RealtimeProcessor.connect(drainProvider, makeConfig());
  assertEqual(
    calls.disconnect,
    0,
    "not yet disconnected before clearHandlers runs",
  );

  RealtimeProcessor.clearHandlers();

  assertEqual(
    calls.disconnect,
    1,
    "clearHandlers() disconnects the active session exactly once",
  );
  assertEqual(
    RealtimeProcessor.supports(drainProvider),
    false,
    "clearHandlers() also removes every registration",
  );

  for (const [name, h] of snapshot) {
    RealtimeProcessor.registerHandler(name, h);
  }
  RealtimeProcessor.registerHandler(drainProvider, handler);
  assertEqual(
    RealtimeProcessor.getProviders().slice().sort().join(","),
    [...preClearProviders, drainProvider].sort().join(","),
    "every pre-test registration is restored, not just drainProvider — proves the restore actually ran",
  );
});

await test("clearHandlers removes every registered Realtime handler", () => {
  // Same rationale as the drain test above — see its comment.
  const preClearProviders = RealtimeProcessor.getProviders();
  const snapshot = preClearProviders.map(
    (name) => [name, RealtimeProcessor.getHandler(name)!] as const,
  );

  const { handler } = makeStubHandler();
  RealtimeProcessor.registerHandler(PROVIDER, handler);
  assertEqual(
    RealtimeProcessor.supports(PROVIDER),
    true,
    "handler is registered",
  );
  RealtimeProcessor.clearHandlers();
  assertEqual(
    RealtimeProcessor.supports(PROVIDER),
    false,
    "clearHandlers() removes every registration",
  );
  // Re-register so any suite run afterward in this process still finds one.
  RealtimeProcessor.registerHandler(PROVIDER, handler);
});

await runSuite();
