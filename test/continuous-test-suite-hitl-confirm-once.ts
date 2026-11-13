#!/usr/bin/env tsx
/**
 * A tool call that needs human approval is confirmed once, before any attempt
 * timer, retry or circuit breaker starts, and nothing runs unless the human
 * approved it.
 *
 * Earlier versions could resolve the confirmation inside an attempt, so a
 * retry did not always wait for the human.
 *
 * Drives only the shipped surface from `dist/index.js`: `NeuroLink.executeTool`
 * with registered tools, a real stdio MCP server
 * (test/fixtures/mcp-direct-name-repair-server.mjs, tool `search_code`) through
 * `addExternalMCPServer`, and the root `MCPToolRegistry` + `HITLManager` for the
 * direct-caller guards. Cards are answered through the documented
 * `hitl:confirmation-request` / `hitl:confirmation-response` events.
 *
 * Offline: no provider is called, and `credentialFreeEnv` (imported first,
 * before the SDK loads `.env`) strips ambient credentials, so neither this
 * process nor the MCP fixture it spawns sees them. This suite takes no
 * determinism exception.
 */
import "./helpers/credentialFreeEnv.js";
import { getEventListeners } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AIProviderName,
  BiasDetectionScorer,
  Evaluator,
  HITLManager,
  createAIProvider,
  MCPToolRegistry,
  NeuroLink,
  extractMetadata,
  mcpLogger,
  rerank,
  runWorkflow,
} from "../dist/index.js";
import { HITLCancelledError, HITLTimeoutError } from "../dist/hitl/index.js";
import {
  assert,
  assertEqual,
  assertNotNull,
  defineSuite,
  delay,
} from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

// The repo's .mcp-config.json would start a filesystem MCP server through
// npx on a model turn's first tool load, and wait out its client timeout
// offline. The model-turn cases need none of it.
process.env.NEUROLINK_SKIP_MCP = "true";

assertDistFresh();
const { test, runSuite } = defineSuite("HITL confirm once", { offline: true });

const FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "mcp-direct-name-repair-server.mjs",
);

const readRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? Object.fromEntries(Object.entries(value))
    : {};

const readPayload = (event: unknown): Record<string, unknown> =>
  readRecord(readRecord(event).payload);

// executeTool() reports a refused call as { success: false } rather than throwing
const isRefused = (result: unknown): boolean =>
  typeof result === "object" &&
  result !== null &&
  "success" in result &&
  result.success === false;

const textOf = (result: unknown): string => {
  const content = readRecord(result).content;
  return Array.isArray(content) ? String(readRecord(content[0]).text) : "";
};

// Counts only: the observed number is safe to print, a payload is not.
const assertCount = (
  actual: number | undefined,
  expected: number,
  message: string,
): void =>
  assertEqual(
    actual,
    expected,
    `${message} (expected ${expected}, got ${actual})`,
  );

const waitFor = async (
  predicate: () => boolean,
  withinMs: number,
): Promise<boolean> => {
  const until = Date.now() + withinMs;
  while (!predicate()) {
    if (Date.now() > until) {
      return false;
    }
    await delay(10);
  }
  return true;
};

type Settled = { result?: unknown; error?: unknown };

const settle = async (call: Promise<unknown>): Promise<Settled> => {
  try {
    return { result: await call };
  } catch (error) {
    return { error };
  }
};

type Answer = { reason?: string; modifiedArguments?: unknown };

type HitlObserver = {
  cards: string[];
  cancelled: Array<Record<string, unknown>>;
  timeouts: () => number;
  answer: (confirmationId: string, approved: boolean, extra?: Answer) => void;
  onCard: (handler: (confirmationId: string) => void) => void;
};

// Listens on an emitter that carries the documented HITL events.
const observeHitl = (emitter: {
  on: (event: string, listener: (event: unknown) => void) => unknown;
  emit: (event: string, payload: unknown) => unknown;
}): HitlObserver => {
  const cards: string[] = [];
  const cancelled: Array<Record<string, unknown>> = [];
  const handlers: Array<(confirmationId: string) => void> = [];
  let timeouts = 0;
  emitter.on("hitl:confirmation-request", (event) => {
    const confirmationId = String(readPayload(event).confirmationId);
    cards.push(confirmationId);
    for (const handler of handlers) {
      handler(confirmationId);
    }
  });
  emitter.on("hitl:cancelled", (event) => {
    cancelled.push(readPayload(event));
  });
  emitter.on("hitl:timeout", () => {
    timeouts++;
  });
  return {
    cards,
    cancelled,
    timeouts: () => timeouts,
    answer: (confirmationId, approved, extra = {}) => {
      emitter.emit("hitl:confirmation-response", {
        type: "hitl:confirmation-response",
        payload: {
          confirmationId,
          approved,
          ...(approved ? {} : { reason: extra.reason ?? "Rejected by test" }),
          ...(extra.modifiedArguments === undefined
            ? {}
            : { modifiedArguments: extra.modifiedArguments }),
        },
      });
    },
    onCard: (handler) => {
      handlers.push(handler);
    },
  };
};

type RegisteredFixture = HitlObserver & {
  neurolink: NeuroLink;
  executions: () => number;
};

type RegisteredFixtureOptions = {
  /** Turn on the opt-in tool-call batcher (`mcp.batcher`). */
  batcher?: boolean;
  /** Leave NeuroLink's own HITL off; hand an enabled manager to its registry. */
  registryOnlyHitl?: boolean;
};

const createRegisteredFixture = (
  hitlTimeoutMs: number,
  options: RegisteredFixtureOptions = {},
): RegisteredFixture => {
  const hitl = {
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: hitlTimeoutMs,
  };
  const neurolink = new NeuroLink({
    ...(options.registryOnlyHitl ? {} : { hitl }),
    ...(options.batcher
      ? { mcp: { batcher: { enabled: true, maxWaitMs: 10 } } }
      : {}),
  });
  const registryManager = options.registryOnlyHitl
    ? new HITLManager(hitl)
    : undefined;
  if (registryManager) {
    neurolink.getToolRegistry().setHITLManager(registryManager);
  }
  let executions = 0;
  neurolink.registerTool("fixture_write", {
    name: "fixture_write",
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      executions++;
      return "fixture executed";
    },
  });
  return {
    ...observeHitl(registryManager ?? neurolink.getEventEmitter()),
    neurolink,
    executions: () => executions,
  };
};

type ExternalFixture = HitlObserver & {
  neurolink: NeuroLink;
  serverId: string;
  /** Calls the fixture server answered (the manager's own per-server count). */
  serverCalls: () => number;
};

let serverCounter = 0;

/**
 * One NeuroLink and one real stdio fixture server per case. Shuts down with
 * `shutdownExternalMCPServers()` so no child process outlives the case.
 */
const withExternalServer = async (
  hitlTimeoutMs: number,
  body: (fixture: ExternalFixture) => Promise<void>,
): Promise<void> => {
  const serverId = `hitl-confirm-once-${process.pid}-${++serverCounter}`;
  const neurolink = new NeuroLink({
    hitl: {
      enabled: true,
      dangerousActions: ["search_code"],
      timeout: hitlTimeoutMs,
    },
  });
  const added = await neurolink.addExternalMCPServer(serverId, {
    id: serverId,
    name: serverId,
    description: "HITL confirm-once fixture",
    transport: "stdio",
    status: "initializing",
    tools: [],
    command: process.execPath,
    args: [FIXTURE],
  });
  assert(added.success, "fixture server failed to connect");
  try {
    await body({
      ...observeHitl(neurolink.getEventEmitter()),
      neurolink,
      serverId,
      serverCalls: () =>
        neurolink.getExternalMCPServer(serverId)?.metrics.totalToolCalls ?? 0,
    });
  } finally {
    await neurolink.shutdownExternalMCPServers();
  }
};

type RegistryFixture = HitlObserver & {
  registry: MCPToolRegistry;
  executions: () => number;
};

const createRegistryFixture = async (): Promise<RegistryFixture> => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: 5000,
  });
  const registry = new MCPToolRegistry();
  registry.setHITLManager(manager);
  let executions = 0;
  await registry.registerTool(
    "fixture_write",
    {
      name: "fixture_write",
      description: "Harmless local confirmation fixture",
      inputSchema: { type: "object", properties: {} },
      serverId: "confirmation-fixture",
    },
    {
      execute: async () => {
        executions++;
        return "fixture executed";
      },
    },
  );
  return {
    ...observeHitl(manager),
    registry,
    executions: () => executions,
  };
};

// T23-1
await test("a card unanswered past the attempt timeout runs nothing until approved, then exactly once", async () => {
  const fixture = createRegisteredFixture(5000);
  // Default retries: maxRetries is left out on purpose.
  const call = settle(
    fixture.neurolink.executeTool(
      "fixture_write",
      {},
      { timeout: 200, retryDelayMs: 10, bypassBatcher: true },
    ),
  );
  assert(
    await waitFor(() => fixture.cards.length === 1, 1000),
    "no confirmation card was raised",
  );
  // Longer than every attempt the default retry budget allows (4 x 200ms).
  await delay(900);
  assertCount(
    fixture.executions(),
    0,
    "the tool ran while its card was unanswered",
  );
  assertCount(fixture.cards.length, 1, "the call raised more than one card");
  fixture.answer(fixture.cards[0], true);
  const outcome = await call;
  assert(outcome.error === undefined, "the approved call threw");
  assert(!isRefused(outcome.result), "the approved call was refused");
  await delay(100);
  assertCount(
    fixture.executions(),
    1,
    "the approved tool did not run exactly once",
  );
  assertCount(fixture.cards.length, 1, "the call raised more than one card");
});

await test("an external tool's card unanswered past the attempt timeout runs nothing until approved, then exactly once", () =>
  withExternalServer(5000, async (fixture) => {
    const call = settle(
      fixture.neurolink.executeTool(
        "search_code",
        { echo: "late" },
        { timeout: 200, retryDelayMs: 10, bypassBatcher: true },
      ),
    );
    assert(
      await waitFor(() => fixture.cards.length >= 1, 1000),
      "no confirmation card was raised",
    );
    await delay(900);
    assertCount(
      fixture.serverCalls(),
      0,
      "the server ran the tool while its card was unanswered",
    );
    assertCount(fixture.cards.length, 1, "the call raised more than one card");
    fixture.answer(fixture.cards[0], true);
    const outcome = await call;
    assert(outcome.error === undefined, "the approved call threw");
    assertEqual(
      textOf(outcome.result),
      "ran:search_code:late",
      "the approved call did not return the server's answer",
    );
    await delay(100);
    assertCount(
      fixture.serverCalls(),
      1,
      "the server did not run the approved tool exactly once",
    );
  }));

await test("a card denied after the attempt timeout runs nothing and reports the refusal", async () => {
  const fixture = createRegisteredFixture(5000);
  const call = settle(
    fixture.neurolink.executeTool(
      "fixture_write",
      {},
      { timeout: 200, retryDelayMs: 10, bypassBatcher: true },
    ),
  );
  assert(
    await waitFor(() => fixture.cards.length === 1, 1000),
    "no confirmation card was raised",
  );
  await delay(900);
  fixture.answer(fixture.cards[0], false);
  const outcome = await call;
  assert(
    isRefused(outcome.result),
    "a late denial was not reported as a refusal",
  );
  await delay(100);
  assertCount(fixture.executions(), 0, "a late-denied tool ran");
  assertCount(fixture.cards.length, 1, "the call raised more than one card");
});

/**
 * Deny one call, then make the identical call and approve it: a refusal must
 * never be served from the tool-result cache in place of a fresh card.
 */
const deniedThenApproved = async (
  fixture: RegisteredFixture,
  options: { bypassBatcher?: boolean } = {},
): Promise<void> => {
  let answers = 0;
  fixture.onCard((id) => fixture.answer(id, answers++ > 0));
  const denied = await settle(
    fixture.neurolink.executeTool("fixture_write", { path: "/same" }, options),
  );
  assert(isRefused(denied.result), "the first call was not refused");
  const approved = await settle(
    fixture.neurolink.executeTool("fixture_write", { path: "/same" }, options),
  );
  assertCount(
    fixture.cards.length,
    2,
    "the repeated call was answered from the cache instead of a new card",
  );
  assert(!isRefused(approved.result), "the approved repeat was refused");
  assertCount(fixture.executions(), 1, "the approved repeat did not run once");
};

await test("a denied call is never cached: the identical call asks again, and its approval runs it", () =>
  deniedThenApproved(createRegisteredFixture(5000), { bypassBatcher: true }));

await test("with HITL only on the tool registry, a denied call is never cached", () =>
  deniedThenApproved(
    createRegisteredFixture(5000, { registryOnlyHitl: true }),
    { bypassBatcher: true },
  ));

await test("with the batcher on, a denied call is never cached and the identical call asks again", () =>
  deniedThenApproved(createRegisteredFixture(5000, { batcher: true })));

await test("with the batcher on, aborting the call withdraws its card and a later approval runs nothing", async () => {
  const fixture = createRegisteredFixture(2000, { batcher: true });
  const controller = new AbortController();
  const call = settle(
    fixture.neurolink.executeTool(
      "fixture_write",
      {},
      { abortSignal: controller.signal },
    ),
  );
  assert(
    await waitFor(() => fixture.cards.length === 1, 1000),
    "no confirmation card was raised",
  );
  const confirmationId = fixture.cards[0];
  controller.abort("turn cancelled");
  assert(
    await waitFor(() => fixture.cancelled.length === 1, 500),
    "aborting a batched-mode call did not withdraw its card",
  );
  const outcome = await call;
  assert(
    isRefused(outcome.result),
    "a cancelled call was not reported as refused",
  );
  fixture.answer(confirmationId, true);
  await delay(100);
  assertCount(
    fixture.executions(),
    0,
    "a late approval of a cancelled card ran the tool",
  );
});

await test("with the batcher on, a card unanswered past the batch timeout runs nothing until approved, then exactly once", async () => {
  // The batch timer is max(5000, MCP_TOOL_TIMEOUT): pin it to its 5s floor.
  const previous = process.env.MCP_TOOL_TIMEOUT;
  process.env.MCP_TOOL_TIMEOUT = "1";
  try {
    const fixture = createRegisteredFixture(15000, { batcher: true });
    let settledAt: number | undefined;
    const call = settle(
      fixture.neurolink.executeTool("fixture_write", {}),
    ).finally(() => {
      settledAt = Date.now();
    });
    assert(
      await waitFor(() => fixture.cards.length === 1, 1000),
      "no confirmation card was raised",
    );
    await delay(5600);
    assert(
      settledAt === undefined,
      "the caller was told the call ended while its card was still open",
    );
    assertCount(
      fixture.executions(),
      0,
      "the tool ran while its card was unanswered",
    );
    fixture.answer(fixture.cards[0], true);
    const outcome = await call;
    assert(outcome.error === undefined, "the approved call threw");
    assert(!isRefused(outcome.result), "the approved call was refused");
    await delay(100);
    assertCount(fixture.executions(), 1, "the approved tool did not run once");
    assertCount(fixture.cards.length, 1, "the call raised more than one card");
  } finally {
    if (previous === undefined) {
      delete process.env.MCP_TOOL_TIMEOUT;
    } else {
      process.env.MCP_TOOL_TIMEOUT = previous;
    }
  }
});

// T23-2
await test("denial and card timeout run nothing and are not retried (one request)", async () => {
  const denied = createRegisteredFixture(5000);
  denied.onCard((id) => denied.answer(id, false));
  const deniedResult = await denied.neurolink.executeTool(
    "fixture_write",
    {},
    { retryDelayMs: 10, bypassBatcher: true },
  );
  assert(isRefused(deniedResult), "a denied call was reported as success");
  assertCount(denied.executions(), 0, "a denied tool ran");
  assertCount(denied.cards.length, 1, "a denied call was asked again");

  const timedOut = createRegisteredFixture(50);
  const timedOutResult = await timedOut.neurolink.executeTool(
    "fixture_write",
    {},
    { retryDelayMs: 10, bypassBatcher: true },
  );
  assert(
    isRefused(timedOutResult),
    "an unanswered call was reported as success",
  );
  assertCount(timedOut.executions(), 0, "an unanswered tool ran");
  assertCount(timedOut.cards.length, 1, "an unanswered call was asked again");
  assertCount(timedOut.timeouts(), 1, "the card did not time out once");
});

await test("a refused call ends with tool:end success false and records no breaker failure", async () => {
  const fixture = createRegisteredFixture(5000);
  fixture.onCard((id) => fixture.answer(id, false));
  const ends: Array<Record<string, unknown>> = [];
  fixture.neurolink.getEventEmitter().on("tool:end", (event: unknown) => {
    ends.push(readRecord(event));
  });
  const result = await fixture.neurolink.executeTool(
    "fixture_write",
    {},
    { retryDelayMs: 10, bypassBatcher: true },
  );
  assert(isRefused(result), "a denied call was reported as success");
  assertCount(ends.length, 1, "a refused call did not emit one tool:end");
  assertEqual(ends[0].success, false, "tool:end reported a refusal as success");
  const breakerFailures = Object.entries(
    fixture.neurolink.getToolCircuitBreakerStatus(),
  )
    .filter(([key]) => key.endsWith(".fixture_write"))
    .reduce((sum, [, status]) => sum + status.failureCount, 0);
  assertCount(
    breakerFailures,
    0,
    "a refused call was recorded as a breaker failure",
  );
  assertEqual(
    fixture.neurolink.getToolExecutionMetrics().fixture_write?.failedExecutions,
    1,
    "a refused call was not counted as a failed execution",
  );
});

// T23-3
await test("aborting the call cancels the confirmation and emits hitl:cancelled; a later approval runs nothing", async () => {
  const fixture = createRegisteredFixture(2000);
  const controller = new AbortController();
  const call = settle(
    fixture.neurolink.executeTool(
      "fixture_write",
      {},
      {
        abortSignal: controller.signal,
        retryDelayMs: 10,
        bypassBatcher: true,
      },
    ),
  );
  assert(
    await waitFor(() => fixture.cards.length === 1, 1000),
    "no confirmation card was raised",
  );
  const confirmationId = fixture.cards[0];
  controller.abort("turn cancelled");
  assert(
    await waitFor(() => fixture.cancelled.length === 1, 500),
    "no hitl:cancelled event reached the NeuroLink emitter",
  );
  assertEqual(
    fixture.cancelled[0].confirmationId,
    confirmationId,
    "hitl:cancelled named a different confirmation",
  );
  assertEqual(
    fixture.cancelled[0].reason,
    "turn cancelled",
    "hitl:cancelled did not carry the abort reason",
  );
  assertEqual(
    fixture.neurolink.hasPendingHITLConfirmation(confirmationId),
    false,
    "the cancelled confirmation is still pending",
  );
  const outcome = await call;
  assert(
    isRefused(outcome.result),
    "a cancelled call was not reported as refused",
  );
  fixture.answer(confirmationId, true);
  await delay(100);
  assertCount(
    fixture.executions(),
    0,
    "a late approval of a cancelled card ran the tool",
  );
  assertCount(
    fixture.cards.length,
    1,
    "the cancelled call raised another card",
  );
});

await test("a signal aborted before the call raises no card; an abort after the answer cancels nothing", async () => {
  const preAborted = createRegisteredFixture(300);
  const cancelled = await settle(
    preAborted.neurolink.executeTool(
      "fixture_write",
      {},
      {
        abortSignal: AbortSignal.abort("already cancelled"),
        retryDelayMs: 10,
        bypassBatcher: true,
      },
    ),
  );
  // Thrown like an ungated pre-cancelled call, not returned as a refusal.
  assert(
    cancelled.error !== undefined && cancelled.result === undefined,
    "a pre-cancelled gated call did not throw",
  );
  assertCount(preAborted.cards.length, 0, "a pre-cancelled call raised a card");
  assertCount(preAborted.executions(), 0, "a pre-cancelled tool ran");

  const answered = createRegisteredFixture(5000);
  answered.onCard((id) => answered.answer(id, true));
  const controller = new AbortController();
  await answered.neurolink.executeTool(
    "fixture_write",
    {},
    { abortSignal: controller.signal, retryDelayMs: 10, bypassBatcher: true },
  );
  controller.abort("too late");
  await delay(50);
  assertCount(answered.executions(), 1, "the approved tool did not run once");
  assertCount(
    answered.cancelled.length,
    0,
    "an abort after the answer emitted hitl:cancelled",
  );
});

/**
 * A manager with audit logging on, whose `hitl:audit` listener throws on
 * `eventType`, and the uncaught exceptions recorded while `body` runs.
 */
const withThrowingAuditListener = async (
  eventType: string,
  timeoutMs: number,
  body: (manager: HITLManager, observer: HitlObserver) => Promise<void>,
): Promise<unknown[]> => {
  const uncaught: unknown[] = [];
  const record = (error: unknown): void => {
    uncaught.push(error);
  };
  process.on("uncaughtException", record);
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: timeoutMs,
    auditLogging: true,
  });
  manager.on("hitl:audit", (event: unknown) => {
    if (readRecord(event).eventType === eventType) {
      throw new Error("audit sink down");
    }
  });
  try {
    await body(manager, observeHitl(manager));
    // An exception thrown in an AbortSignal listener is reported on a later tick.
    await delay(50);
  } finally {
    process.off("uncaughtException", record);
    manager.cleanup();
  }
  return uncaught;
};

await test("a throwing hitl:audit listener does not leave a cancelled card waiting: the call is rejected, hitl:cancelled fires once", async () => {
  let outcome: Settled | undefined;
  let cancelled = 0;
  const uncaught = await withThrowingAuditListener(
    "confirmation-cancelled",
    1500,
    async (manager, observer) => {
      const controller = new AbortController();
      void settle(
        manager.requestConfirmation(
          "fixture_write",
          {},
          { signal: controller.signal },
        ),
      ).then((settled) => {
        outcome = settled;
      });
      assert(
        await waitFor(() => observer.cards.length === 1, 1000),
        "no confirmation card was raised",
      );
      controller.abort("turn cancelled");
      // Past the card's own 1.5 s timeout: a call left waiting is still
      // pending here.
      await waitFor(() => outcome !== undefined, 2000);
      cancelled = observer.cancelled.length;
    },
  );
  assertNotNull(outcome, "the cancelled call was left waiting");
  assert(
    outcome.error instanceof HITLCancelledError,
    "the cancelled call was not rejected with HITLCancelledError",
  );
  assertCount(cancelled, 1, "hitl:cancelled did not fire once");
  assertCount(uncaught.length, 0, "the listener's throw escaped uncaught");
});

await test("a throwing hitl:audit listener does not leave a timed-out or an answered card waiting", async () => {
  let timedOut: Settled | undefined;
  const timeoutUncaught = await withThrowingAuditListener(
    "confirmation-timeout",
    200,
    async (manager) => {
      void settle(manager.requestConfirmation("fixture_write", {})).then(
        (settled) => {
          timedOut = settled;
        },
      );
      await waitFor(() => timedOut !== undefined, 1000);
    },
  );
  assertNotNull(timedOut, "the timed-out call was left waiting");
  assert(
    timedOut.error instanceof HITLTimeoutError,
    "the timed-out call was not rejected with HITLTimeoutError",
  );
  assertCount(
    timeoutUncaught.length,
    0,
    "the listener's throw escaped the card timer uncaught",
  );

  let answered: Settled | undefined;
  let answerThrew = false;
  const answerUncaught = await withThrowingAuditListener(
    "confirmation-approved",
    5000,
    async (manager, observer) => {
      void settle(manager.requestConfirmation("fixture_write", {})).then(
        (settled) => {
          answered = settled;
        },
      );
      assert(
        await waitFor(() => observer.cards.length === 1, 1000),
        "no confirmation card was raised",
      );
      try {
        observer.answer(observer.cards[0], true);
      } catch {
        answerThrew = true;
      }
      await waitFor(() => answered !== undefined, 1000);
    },
  );
  assert(!answerThrew, "the listener's throw reached the code that answered");
  assertNotNull(answered, "the approved call was left waiting");
  assert(
    readRecord(answered.result).approved === true,
    "the approved call was not resolved as approved",
  );
  assertCount(answerUncaught.length, 0, "the listener's throw escaped");
});

/**
 * A host's own implementation of the `HITLManager` type that ignores
 * `context.signal` and has no timeout: its card stays until `answerAll`.
 */
const createSignalIgnoringManager = (): {
  manager: NonNullable<Parameters<MCPToolRegistry["setHITLManager"]>[0]>;
  cards: () => number;
  answerAll: (approved: boolean) => void;
} => {
  const base = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
  });
  const waiting: Array<
    (result: { approved: boolean; responseTime: number }) => void
  > = [];
  let cards = 0;
  const manager: NonNullable<Parameters<MCPToolRegistry["setHITLManager"]>[0]> =
    {
      isEnabled: () => true,
      requiresConfirmation: (toolName) => toolName === "fixture_write",
      requestConfirmation: () => {
        cards++;
        return new Promise((resolve) => waiting.push(resolve));
      },
      processUserResponse: () => undefined,
      getStatistics: () => base.getStatistics(),
      getConfig: () => base.getConfig(),
      updateConfig: () => undefined,
      cleanup: () => undefined,
      getPendingCount: () => waiting.length,
      hasPendingConfirmation: () => waiting.length > 0,
      on: () => manager,
      emit: () => false,
    };
  return {
    manager,
    cards: () => cards,
    answerAll: (approved) => {
      for (const resolve of waiting.splice(0)) {
        resolve({ approved, responseTime: 0 });
      }
    },
  };
};

await test("a HITL manager that ignores the call's signal: aborting the call still returns it, and a late approval runs nothing", async () => {
  const neurolink = new NeuroLink();
  const host = createSignalIgnoringManager();
  neurolink.getToolRegistry().setHITLManager(host.manager);
  let executions = 0;
  neurolink.registerTool("fixture_write", {
    name: "fixture_write",
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      executions++;
      return "fixture executed";
    },
  });
  const controller = new AbortController();
  let outcome: Settled | undefined;
  void settle(
    neurolink.executeTool(
      "fixture_write",
      {},
      { abortSignal: controller.signal, retryDelayMs: 10, bypassBatcher: true },
    ),
  ).then((settled) => {
    outcome = settled;
  });
  assert(
    await waitFor(() => host.cards() === 1, 1000),
    "no confirmation card was raised",
  );
  controller.abort("turn cancelled");
  const returnedOnAbort = await waitFor(() => outcome !== undefined, 500);
  // The host answers its card late.
  host.answerAll(true);
  await waitFor(() => outcome !== undefined, 1000);
  await delay(100);
  assert(
    returnedOnAbort,
    "the aborted call kept waiting for a manager that ignores its signal",
  );
  assert(isRefused(outcome?.result), "the aborted call was not refused");
  assertCount(executions, 0, "a late approval ran the aborted call's tool");
  assertCount(host.cards(), 1, "the aborted call raised another card");

  // The shipped manager withdraws its own card on the same abort, and its
  // own cancellation is what the call reports.
  const shipped = createRegisteredFixture(5000);
  const shippedController = new AbortController();
  const shippedCall = settle(
    shipped.neurolink.executeTool(
      "fixture_write",
      {},
      {
        abortSignal: shippedController.signal,
        retryDelayMs: 10,
        bypassBatcher: true,
      },
    ),
  );
  assert(
    await waitFor(() => shipped.cards.length === 1, 1000),
    "the shipped manager raised no card",
  );
  shippedController.abort("turn cancelled");
  const shippedOutcome = await shippedCall;
  assertEqual(
    readRecord(shippedOutcome.result).error,
    "Confirmation cancelled for tool: fixture_write",
    "the shipped manager's cancellation is no longer what the call reports",
  );
  assertCount(
    shipped.cancelled.length,
    1,
    "the shipped manager did not withdraw its card once",
  );
});

await test("an aborted external call rejects with the shipped manager's own cancellation, which names the card", () =>
  withExternalServer(5000, async (fixture) => {
    const controller = new AbortController();
    const call = settle(
      fixture.neurolink.executeExternalMCPTool(
        fixture.serverId,
        "search_code",
        { echo: "abort" },
        { abortSignal: controller.signal },
      ),
    );
    assert(
      await waitFor(() => fixture.cards.length === 1, 2000),
      "no confirmation card was raised",
    );
    controller.abort("turn cancelled");
    const { error } = await call;
    assert(
      error instanceof HITLCancelledError,
      "the aborted call did not reject with HITLCancelledError",
    );
    assertEqual(
      error instanceof HITLCancelledError ? error.confirmationId : undefined,
      fixture.cards[0],
      "the call's cancellation is not the manager's own (it names no card)",
    );
    assertCount(
      fixture.serverCalls(),
      0,
      "the aborted call reached the server",
    );
  }));

await test("approved calls on one long-lived signal leave no abort listener on it", async () => {
  const fixture = createRegisteredFixture(5000);
  fixture.onCard((id) => fixture.answer(id, true));
  const turn = new AbortController();
  for (let call = 0; call < 10; call++) {
    await fixture.neurolink.executeTool(
      "fixture_write",
      { call },
      { abortSignal: turn.signal, retryDelayMs: 10, bypassBatcher: true },
    );
  }
  assertCount(fixture.executions(), 10, "an approved call did not run");
  assertCount(
    getEventListeners(turn.signal, "abort").length,
    0,
    "settled calls left abort listeners on the caller's signal",
  );
});

/**
 * Whether the signal in a registered tool's execution context fires when
 * `abortWhich` is aborted while the tool runs. The tool waits up to 400ms for
 * its context signal; the test aborts `abortWhich` 50ms in.
 */
const contextSignalFiresOn = async (
  neurolink: NeuroLink,
  abortWhich: AbortController,
  options: Record<string, unknown>,
): Promise<"aborted" | "not-aborted" | "none"> => {
  let outcome: "aborted" | "not-aborted" | "none" = "none";
  neurolink.registerTool("fixture_read", {
    name: "fixture_read",
    description: "Waits on the signal in its execution context",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async (_args: unknown, context?: unknown) => {
      const signal = readRecord(context).abortSignal;
      outcome = await new Promise((resolve) => {
        if (!(signal instanceof AbortSignal)) {
          resolve("none");
          return;
        }
        signal.addEventListener("abort", () => resolve("aborted"), {
          once: true,
        });
        setTimeout(() => resolve("not-aborted"), 400);
      });
      return "fixture executed";
    },
  });
  setTimeout(() => abortWhich.abort(), 50);
  await settle(
    neurolink.executeTool(
      "fixture_read",
      {},
      {
        disableToolCache: true,
        bypassBatcher: true,
        ...options,
      },
    ),
  );
  return outcome;
};

await test("executeTool's abortSignal reaches a registered tool's context; one already in authContext wins", async () => {
  const option = new AbortController();
  assertEqual(
    await contextSignalFiresOn(new NeuroLink({}), option, {
      abortSignal: option.signal,
    }),
    "aborted",
    "the tool's context signal did not follow executeTool's abortSignal",
  );
  const losing = new AbortController();
  assertEqual(
    await contextSignalFiresOn(new NeuroLink({}), losing, {
      abortSignal: losing.signal,
      authContext: { abortSignal: new AbortController().signal },
    }),
    "not-aborted",
    "executeTool's abortSignal replaced the one authContext carried",
  );
  const winning = new AbortController();
  assertEqual(
    await contextSignalFiresOn(new NeuroLink({}), winning, {
      abortSignal: new AbortController().signal,
      authContext: { abortSignal: winning.signal },
    }),
    "aborted",
    "the tool's context signal did not follow the one authContext carried",
  );
});

await test("executeTool's abortSignal wins over one in the instance's tool context, which still applies without it", async () => {
  const stored = new AbortController();
  const withOption = new NeuroLink({});
  withOption.setToolContext({ abortSignal: stored.signal });
  assertEqual(
    await contextSignalFiresOn(withOption, stored, {
      abortSignal: new AbortController().signal,
    }),
    "not-aborted",
    "the instance's stored signal replaced the call's abortSignal",
  );
  const call = new AbortController();
  const withBoth = new NeuroLink({});
  withBoth.setToolContext({ abortSignal: new AbortController().signal });
  assertEqual(
    await contextSignalFiresOn(withBoth, call, { abortSignal: call.signal }),
    "aborted",
    "the call's abortSignal did not reach the tool while a stored one existed",
  );
  const storedOnly = new AbortController();
  const withoutOption = new NeuroLink({});
  withoutOption.setToolContext({ abortSignal: storedOnly.signal });
  assertEqual(
    await contextSignalFiresOn(withoutOption, storedOnly, {}),
    "aborted",
    "the instance's stored signal was dropped when the call passed none",
  );
});

// T23-4 (behavioural: the HITL error classes are not root exports)
await test("HITLCancelledError and HITLTimeoutError are not retriable: an external tool's denial, card timeout and cancellation ask once", async () => {
  await withExternalServer(5000, async (fixture) => {
    fixture.onCard((id) => fixture.answer(id, false));
    const outcome = await settle(
      fixture.neurolink.executeTool(
        "search_code",
        { echo: "deny" },
        { retryDelayMs: 10, bypassBatcher: true },
      ),
    );
    assertCount(fixture.cards.length, 1, "a denied external call was re-asked");
    assertCount(
      fixture.serverCalls(),
      0,
      "a denied external call reached the server",
    );
    assert(
      isRefused(outcome.result),
      "a denied external call was not reported as refused",
    );
  });

  await withExternalServer(50, async (fixture) => {
    const outcome = await settle(
      fixture.neurolink.executeTool(
        "search_code",
        { echo: "timeout" },
        { retryDelayMs: 10, bypassBatcher: true },
      ),
    );
    assertCount(
      fixture.cards.length,
      1,
      "a timed-out external call was re-asked",
    );
    assertCount(fixture.timeouts(), 1, "the card did not time out once");
    assertCount(
      fixture.serverCalls(),
      0,
      "a timed-out external call reached the server",
    );
    assert(
      isRefused(outcome.result),
      "a timed-out external call was not reported as refused",
    );
  });

  await withExternalServer(2000, async (fixture) => {
    const controller = new AbortController();
    fixture.onCard(() => {
      setTimeout(() => controller.abort("turn cancelled"), 20);
    });
    const outcome = await settle(
      fixture.neurolink.executeTool(
        "search_code",
        { echo: "cancel" },
        {
          abortSignal: controller.signal,
          retryDelayMs: 10,
          bypassBatcher: true,
        },
      ),
    );
    assertCount(
      fixture.cards.length,
      1,
      "a cancelled external call was re-asked",
    );
    assertCount(
      fixture.cancelled.length,
      1,
      "a cancelled external call did not emit hitl:cancelled once",
    );
    assertCount(
      fixture.serverCalls(),
      0,
      "a cancelled external call reached the server",
    );
    assert(
      isRefused(outcome.result),
      "a cancelled external call was not reported as refused",
    );
  });
});

await test("an external tool approved through executeTool is asked once and runs with the approved arguments", () =>
  withExternalServer(5000, async (fixture) => {
    fixture.onCard((id) =>
      fixture.answer(id, true, { modifiedArguments: { echo: "edited" } }),
    );
    const result = await fixture.neurolink.executeTool(
      "search_code",
      { echo: "asked" },
      { retryDelayMs: 10, bypassBatcher: true },
    );
    assertEqual(
      textOf(result),
      "ran:search_code:edited",
      "the server did not receive the approved arguments",
    );
    assertCount(fixture.cards.length, 1, "the external call was asked twice");
    assertCount(fixture.serverCalls(), 1, "the server ran the tool twice");
  }));

/**
 * Collect what the shared NeuroLink logger reports at ERROR while `body`
 * runs. `mcpLogger` is the one logger instance the registry, the external
 * manager and NeuroLink all write to.
 */
const errorsLoggedDuring = async (
  body: () => Promise<unknown>,
): Promise<number> => {
  let errors = 0;
  const original = mcpLogger.error;
  mcpLogger.error = () => {
    errors++;
  };
  try {
    await body();
  } finally {
    mcpLogger.error = original;
  }
  return errors;
};

await test("an inline HITL refusal is logged as information, not as an error", async () => {
  const registry = await createRegistryFixture();
  registry.onCard((id) => registry.answer(id, false));
  const registryErrors = await errorsLoggedDuring(() =>
    registry.registry.executeTool("fixture_write", {}),
  );
  assertCount(registryErrors, 0, "a registry denial was logged as an error");

  await withExternalServer(5000, async (fixture) => {
    fixture.onCard((id) => fixture.answer(id, false));
    const externalErrors = await errorsLoggedDuring(() =>
      settle(
        fixture.neurolink.executeExternalMCPTool(
          fixture.serverId,
          "search_code",
          { echo: "deny" },
        ),
      ),
    );
    assertCount(
      externalErrors,
      0,
      "a direct external denial was logged as an error",
    );
  });
});

await test("an external tool's denial or card timeout is not counted as a server error; a failed call still is", () =>
  withExternalServer(300, async (fixture) => {
    let answer: "approve" | "deny" | "none" = "deny";
    fixture.onCard((id) => {
      if (answer !== "none") {
        fixture.answer(id, answer === "approve");
      }
    });
    const serverErrors = (): number | undefined =>
      fixture.neurolink.getExternalMCPServer(fixture.serverId)?.metrics
        .totalErrors;
    const denied = await settle(
      fixture.neurolink.executeExternalMCPTool(
        fixture.serverId,
        "search_code",
        { echo: "deny" },
      ),
    );
    assert(denied.error !== undefined, "the denied call was not refused");
    answer = "none";
    const timedOut = await settle(
      fixture.neurolink.executeExternalMCPTool(
        fixture.serverId,
        "search_code",
        { echo: "unanswered" },
      ),
    );
    assert(timedOut.error !== undefined, "the timed-out call was not refused");
    const afterRefusals = serverErrors();
    // Control: an approved call the server rejects (its echo must be a
    // string) is a failure of the server call, and counts.
    answer = "approve";
    await settle(
      fixture.neurolink.executeExternalMCPTool(
        fixture.serverId,
        "search_code",
        { echo: 123 },
      ),
    );
    assertCount(fixture.serverCalls(), 1, "the server was not called once");
    assertCount(afterRefusals, 0, "a refusal was counted as a server error");
    assertCount(
      serverErrors(),
      1,
      "a failed server call was not counted; the case measures nothing",
    );
  }));

// T23-5 (guard: passes before and after the fix)
await test("a direct executeExternalMCPTool asks once", () =>
  withExternalServer(5000, async (fixture) => {
    fixture.onCard((id) => fixture.answer(id, true));
    const result = await fixture.neurolink.executeExternalMCPTool(
      fixture.serverId,
      "search_code",
      { echo: "direct" },
    );
    assertEqual(
      textOf(result),
      "ran:search_code:direct",
      "the approved direct call did not run",
    );
    assertCount(fixture.cards.length, 1, "a direct call was not asked once");
    assertCount(fixture.serverCalls(), 1, "a direct call ran more than once");
  }));

// T23-6 (guard: passes before and after the fix)
await test("a direct ToolRegistry.executeTool caller with no state keeps the inline check", async () => {
  const approved = await createRegistryFixture();
  approved.onCard((id) => approved.answer(id, true));
  await approved.registry.executeTool("fixture_write", {});
  assertCount(approved.cards.length, 1, "a direct registry call was not asked");
  assertCount(approved.executions(), 1, "an approved direct call did not run");

  const denied = await createRegistryFixture();
  denied.onCard((id) => denied.answer(id, false));
  const result: unknown = await denied.registry.executeTool(
    "fixture_write",
    {},
  );
  assert(isRefused(result), "a denied direct call was reported as success");
  assertCount(denied.cards.length, 1, "a denied direct call was not asked");
  assertCount(denied.executions(), 0, "a denied direct call ran");
});

await test("a state that already records a refusal is never run or asked again", async () => {
  for (const decision of ["denied", "timeout", "cancelled"] as const) {
    const fixture = await createRegistryFixture();
    fixture.onCard((id) => fixture.answer(id, true));
    const result: unknown = await fixture.registry.executeTool(
      "fixture_write",
      {},
      { hitlState: { decision } },
    );
    assert(isRefused(result), `${decision}: a refused call was run`);
    assertCount(fixture.cards.length, 0, `${decision}: the call was re-asked`);
    assertCount(fixture.executions(), 0, `${decision}: the tool ran`);
  }
});

// T23-7
await test("triggered stays false until approval and on denial", async () => {
  for (const approve of [true, false]) {
    const fixture = await createRegistryFixture();
    // A caller can pass a plain object; triggered is never set on it before
    // the human answers, and the outcome is recorded as `decision`.
    const state: Record<string, unknown> = {};
    const whilePending: Array<{ decision: unknown; triggered: unknown }> = [];
    fixture.onCard((id) => {
      whilePending.push({
        decision: state.decision,
        triggered: state.triggered,
      });
      setTimeout(() => fixture.answer(id, approve), 20);
    });
    await fixture.registry.executeTool(
      "fixture_write",
      {},
      { hitlState: state },
    );
    const label = approve ? "approval" : "denial";
    assertCount(
      whilePending.length,
      1,
      `${label}: the call was not asked once`,
    );
    assert(
      whilePending[0].triggered !== true,
      `${label}: triggered was set before the human answered`,
    );
    assertEqual(
      whilePending[0].decision,
      undefined,
      `${label}: a decision was recorded before the human answered`,
    );
    assertEqual(
      state.decision,
      approve ? "approved" : "denied",
      `${label}: the decision was not recorded after the answer`,
    );
    assert(
      approve || state.triggered !== true,
      "denial: triggered was true after a denial",
    );
    assertCount(
      fixture.executions(),
      approve ? 1 : 0,
      `${label}: the tool ran the wrong number of times`,
    );
  }
});

await test("a reused hitlState runs only the arguments it approved: other arguments raise a new card", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: 5000,
    allowArgumentModification: true,
  });
  const registry = new MCPToolRegistry();
  registry.setHITLManager(manager);
  const ran: unknown[] = [];
  await registry.registerTool(
    "fixture_write",
    {
      name: "fixture_write",
      description: "Harmless local confirmation fixture",
      inputSchema: { type: "object", properties: {} },
      serverId: "confirmation-fixture",
    },
    {
      execute: async (args: unknown) => {
        ran.push(readRecord(args).dest);
        return "fixture executed";
      },
    },
  );
  const observer = observeHitl(manager);
  // The first card is approved with the approver's own arguments; any later
  // card is denied.
  observer.onCard((id) =>
    observer.cards.length === 1
      ? observer.answer(id, true, { modifiedArguments: { dest: "staging" } })
      : observer.answer(id, false),
  );
  const state: Record<string, unknown> = {};
  await registry.executeTool(
    "fixture_write",
    { dest: "prod" },
    { hitlState: state },
  );
  // The arguments the human approved, passed again: no new card.
  await registry.executeTool(
    "fixture_write",
    { dest: "staging" },
    { hitlState: state },
  );
  const other: unknown = await registry.executeTool(
    "fixture_write",
    { dest: "prod" },
    { hitlState: state },
  );
  assertCount(
    observer.cards.length,
    2,
    "a reused state ran arguments nobody approved without a new card",
  );
  assertEqual(
    ran.join(","),
    "staging,staging",
    "the reused state did not run exactly the approved arguments",
  );
  assert(isRefused(other), "the denied arguments were reported as success");
});

await test("through executeTool, every attempt of one approved call runs the approver's arguments after one card", async () => {
  const neurolink = new NeuroLink({
    hitl: {
      enabled: true,
      dangerousActions: ["fixture_write"],
      timeout: 5000,
      allowArgumentModification: true,
    },
  });
  const observer = observeHitl(neurolink.getEventEmitter());
  observer.onCard((id) =>
    observer.answer(id, true, { modifiedArguments: { dest: "staging" } }),
  );
  const seen: unknown[] = [];
  neurolink.registerTool("fixture_write", {
    name: "fixture_write",
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async (args: unknown) => {
      seen.push(readRecord(args).dest);
      if (seen.length === 1) {
        // The first attempt outlives its timeout, so the retry runs it again.
        await delay(400);
      }
      return "fixture executed";
    },
  });
  const result = await neurolink.executeTool(
    "fixture_write",
    { dest: "prod" },
    { timeout: 150, maxRetries: 2, retryDelayMs: 10, bypassBatcher: true },
  );
  assert(!isRefused(result), "the approved call was refused");
  assertCount(observer.cards.length, 1, "the call was not asked once");
  assertEqual(
    seen.join(","),
    "staging,staging",
    "an attempt did not run the approver's arguments",
  );
});

await test("through executeTool, middleware that changes the arguments between attempts raises no second card", async () => {
  const neurolink = new NeuroLink({
    hitl: {
      enabled: true,
      dangerousActions: ["fixture_write"],
      timeout: 5000,
    },
  });
  const observer = observeHitl(neurolink.getEventEmitter());
  observer.onCard((id) => observer.answer(id, true));
  // Changes the approved arguments object in place on every attempt.
  neurolink.useToolMiddleware(async (_tool, params, _context, next) => {
    if (typeof params === "object" && params !== null) {
      Reflect.set(
        params,
        "attempt",
        Number(readRecord(params).attempt ?? 0) + 1,
      );
    }
    return next();
  });
  let attempts = 0;
  neurolink.registerTool("fixture_write", {
    name: "fixture_write",
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      attempts++;
      if (attempts === 1) {
        // The first attempt outlives its timeout, so the retry runs it again.
        await delay(400);
      }
      return "fixture executed";
    },
  });
  const result = await neurolink.executeTool(
    "fixture_write",
    { dest: "staging" },
    { timeout: 150, maxRetries: 2, retryDelayMs: 10, bypassBatcher: true },
  );
  assert(!isRefused(result), "the approved call was refused");
  assertCount(attempts, 2, "the retry did not run the tool again");
  assertCount(observer.cards.length, 1, "one call raised a second card");
});

/**
 * A direct `MCPToolRegistry` and `HITLManager` whose `fixture_write` records
 * the arguments it ran with. `answers` answers the cards in order (approve
 * or deny); a card past the list is denied.
 */
const createReusedStateFixture = async (
  config: {
    dangerousActions: string[];
    customRules?: Array<{
      name: string;
      condition: (toolName: string, args: unknown) => boolean;
      requiresConfirmation: boolean;
    }>;
  },
  answers: boolean[] | null,
): Promise<RegistryFixture & { ran: unknown[] }> => {
  const manager = new HITLManager({
    enabled: true,
    timeout: 5000,
    ...config,
  });
  const registry = new MCPToolRegistry();
  registry.setHITLManager(manager);
  const ran: unknown[] = [];
  await registry.registerTool(
    "fixture_write",
    {
      name: "fixture_write",
      description: "Harmless local confirmation fixture",
      inputSchema: { type: "object", properties: {} },
      serverId: "confirmation-fixture",
    },
    {
      execute: async (args: unknown) => {
        ran.push(readRecord(args).dest);
        return "fixture executed";
      },
    },
  );
  const observer = observeHitl(manager);
  if (answers) {
    observer.onCard((id) =>
      observer.answer(id, answers[observer.cards.length - 1] === true),
    );
  }
  return { ...observer, registry, ran, executions: () => ran.length };
};

await test("a caller's state reused after the approved arguments were changed in place asks again", async () => {
  const fixture = await createReusedStateFixture(
    { dangerousActions: ["fixture_write"] },
    [true, false],
  );
  const state: Record<string, unknown> = {};
  const args: Record<string, unknown> = { dest: "staging" };
  await fixture.registry.executeTool("fixture_write", args, {
    hitlState: state,
  });
  args.dest = "prod";
  const changed: unknown = await fixture.registry.executeTool(
    "fixture_write",
    args,
    { hitlState: state },
  );
  assertCount(
    fixture.cards.length,
    2,
    "arguments changed in place after the approval ran without a new card",
  );
  assertEqual(
    fixture.ran.join(","),
    "staging",
    "the changed arguments ran although their card was denied",
  );
  assert(isRefused(changed), "the denied call was reported as success");
});

await test("a caller's state whose approved arguments cannot be copied asks again", async () => {
  const fixture = await createReusedStateFixture(
    { dangerousActions: ["fixture_write"] },
    [true, false],
  );
  const state: Record<string, unknown> = {};
  // A function value cannot be copied, so the approval cannot be compared.
  const args = { dest: "staging", onDone: () => undefined };
  await fixture.registry.executeTool("fixture_write", args, {
    hitlState: state,
  });
  const again: unknown = await fixture.registry.executeTool(
    "fixture_write",
    args,
    { hitlState: state },
  );
  assertCount(
    fixture.cards.length,
    2,
    "a reused approval that cannot be compared ran without a new card",
  );
  assertEqual(fixture.ran.join(","), "staging", "the denied repeat ran");
  assert(isRefused(again), "the denied repeat was reported as success");
});

await test("a caller's state approved for one tool is not an approval for another tool with the same arguments", async () => {
  const fixture = await createReusedStateFixture(
    { dangerousActions: ["fixture_write", "fixture_other"] },
    [true, false],
  );
  const otherRan: unknown[] = [];
  await fixture.registry.registerTool(
    "fixture_other",
    {
      name: "fixture_other",
      description: "Second harmless local confirmation fixture",
      inputSchema: { type: "object", properties: {} },
      serverId: "confirmation-fixture",
    },
    {
      execute: async (args: unknown) => {
        otherRan.push(readRecord(args).dest);
        return "other executed";
      },
    },
  );
  const state: Record<string, unknown> = {};
  await fixture.registry.executeTool(
    "fixture_write",
    { dest: "staging" },
    { hitlState: state },
  );
  const other: unknown = await fixture.registry.executeTool(
    "fixture_other",
    { dest: "staging" },
    { hitlState: state },
  );
  assertCount(
    fixture.cards.length,
    2,
    "a state approved for one tool ran another tool without a new card",
  );
  assertCount(
    otherRan.length,
    0,
    "the other tool ran although its card was denied",
  );
  assert(isRefused(other), "the denied other tool was reported as success");
  // Control: the tool the state was approved for, with the same arguments,
  // is still not asked again.
  await fixture.registry.executeTool(
    "fixture_write",
    { dest: "staging" },
    { hitlState: state },
  );
  assertCount(fixture.cards.length, 2, "the approved tool was asked again");
});

await test("a registry call whose signal aborted after its decision was recorded does not start the tool", async () => {
  const fixture = await createRegistryFixture();
  const controller = new AbortController();
  controller.abort("cancelled after the decision");
  const result: unknown = await fixture.registry.executeTool(
    "fixture_write",
    {},
    { hitlState: { decision: "approved" }, abortSignal: controller.signal },
  );
  assert(
    isRefused(result),
    "a cancelled registry call was reported as success",
  );
  assertCount(
    fixture.cards.length,
    0,
    "a cancelled registry call raised a card",
  );
  assertCount(
    fixture.executions(),
    0,
    "a cancelled registry call started the tool",
  );

  // Control: the same call with a live signal runs, so the check above measured
  // the abort and not a broken fixture.
  const live = await createRegistryFixture();
  await live.registry.executeTool(
    "fixture_write",
    {},
    {
      hitlState: { decision: "approved" },
      abortSignal: new AbortController().signal,
    },
  );
  assertCount(live.executions(), 1, "the control call did not run the tool");
});

await test("arguments the caller changes while a card waits are not what runs: the approved snapshot is", async () => {
  const fixture = await createReusedStateFixture(
    { dangerousActions: ["fixture_write"] },
    null,
  );
  const args: Record<string, unknown> = { dest: "staging" };
  fixture.onCard((id) => {
    args.dest = "prod";
    fixture.answer(id, true);
  });
  await fixture.registry.executeTool("fixture_write", args);
  assertCount(fixture.cards.length, 1, "the call was not asked once");
  assertEqual(
    fixture.ran.join(","),
    "staging",
    "the tool ran the arguments the caller changed during the wait, not the ones presented",
  );
});

await test("an approver's own arguments still replace the presented ones", async () => {
  const fixture = await createReusedStateFixture(
    { dangerousActions: ["fixture_write"] },
    null,
  );
  fixture.onCard((id) =>
    fixture.answer(id, true, { modifiedArguments: { dest: "approver" } }),
  );
  await fixture.registry.executeTool("fixture_write", { dest: "staging" });
  assertEqual(fixture.ran.join(","), "approver", "modifiedArguments were lost");
});

await test("a caller's state that needed no confirmation, reused with arguments a rule now matches, asks", async () => {
  const fixture = await createReusedStateFixture(
    {
      dangerousActions: ["no_tool_has_this_name"],
      customRules: [
        {
          name: "production writes",
          condition: (_toolName, args) => readRecord(args).dest === "prod",
          requiresConfirmation: true,
        },
      ],
    },
    [false],
  );
  const state: Record<string, unknown> = {};
  await fixture.registry.executeTool(
    "fixture_write",
    { dest: "staging" },
    { hitlState: state },
  );
  assertEqual(
    state.decision,
    "not-required",
    "the first call's decision was not recorded as not-required",
  );
  const matched: unknown = await fixture.registry.executeTool(
    "fixture_write",
    { dest: "prod" },
    { hitlState: state },
  );
  assertCount(
    fixture.cards.length,
    1,
    "arguments the rule matches ran on the earlier not-required decision",
  );
  assertEqual(fixture.ran.join(","), "staging", "the denied call ran");
  assert(isRefused(matched), "the denied call was reported as success");
});

// ---------------------------------------------------------------------------
// Workers that share a HITL host's tool registry
// ---------------------------------------------------------------------------

/**
 * A HITL host and its gated tool, plus a worker from `createWorkerInstance()`
 * (the instance `runIsolatedAgent`, `registerAgentTool` and `delegate_task`
 * run on). The worker has no HITL of its own; its calls reach the host's
 * manager through the shared registry, and the cards reach the host's emitter.
 */
const createWorkerFixture = (
  registration: { timeout: number; maxRetries?: number },
  hitlTimeoutMs = 5000,
): RegisteredFixture & { worker: NeuroLink } => {
  const neurolink = new NeuroLink({
    hitl: {
      enabled: true,
      dangerousActions: ["fixture_write"],
      timeout: hitlTimeoutMs,
    },
  });
  let executions = 0;
  neurolink.registerTool(
    "fixture_write",
    {
      name: "fixture_write",
      description: "Harmless local HITL fixture",
      inputSchema: { type: "object" as const, properties: {} },
      execute: async () => {
        executions++;
        return "fixture executed";
      },
    },
    registration,
  );
  return {
    ...observeHitl(neurolink.getEventEmitter()),
    neurolink,
    worker: neurolink.createWorkerInstance(),
    executions: () => executions,
  };
};

await test("a worker on a HITL host's registry: a card unanswered past the attempt timeout runs nothing until approved, then exactly once", async () => {
  const fixture = createWorkerFixture({ timeout: 200 });
  const call = settle(
    fixture.worker.executeTool(
      "fixture_write",
      {},
      { retryDelayMs: 10, bypassBatcher: true },
    ),
  );
  assert(
    await waitFor(() => fixture.cards.length === 1, 1000),
    "no confirmation card was raised",
  );
  // Longer than every attempt the default retry budget allows (4 x 200ms).
  await delay(900);
  assertCount(
    fixture.executions(),
    0,
    "the tool ran while its card was unanswered",
  );
  assertCount(fixture.cards.length, 1, "each retry raised another card");
  fixture.answer(fixture.cards[0], true);
  const outcome = await call;
  assert(outcome.error === undefined, "the approved call threw");
  assert(!isRefused(outcome.result), "the approved call was refused");
  await delay(100);
  assertCount(
    fixture.executions(),
    1,
    "the approved tool did not run exactly once",
  );
  assertCount(fixture.cards.length, 1, "the call raised more than one card");
});

await test("a worker on a HITL host's registry: one approval runs the tool once even when its attempt timed out during the card", async () => {
  // The card is answered 300ms in: inside the second attempt's window if an
  // attempt timer were running during the wait.
  const fixture = createWorkerFixture({ timeout: 200, maxRetries: 2 });
  fixture.onCard((id) => setTimeout(() => fixture.answer(id, true), 300));
  const outcome = await settle(
    fixture.worker.executeTool(
      "fixture_write",
      {},
      { retryDelayMs: 50, bypassBatcher: true },
    ),
  );
  assert(outcome.error === undefined, "the approved call threw");
  await delay(400);
  assertCount(fixture.cards.length, 1, "the call raised more than one card");
  assertCount(
    fixture.executions(),
    1,
    "one approval did not run the tool exactly once",
  );
});

await test("a worker on a HITL host's registry: a denied call runs nothing and is asked once", async () => {
  const fixture = createWorkerFixture({ timeout: 200 });
  fixture.onCard((id) => setTimeout(() => fixture.answer(id, false), 500));
  const outcome = await settle(
    fixture.worker.executeTool(
      "fixture_write",
      {},
      { retryDelayMs: 10, bypassBatcher: true },
    ),
  );
  await delay(200);
  assert(
    outcome.error !== undefined || isRefused(outcome.result),
    "the denied call reported success",
  );
  assertCount(fixture.cards.length, 1, "the denied call was asked again");
  assertCount(fixture.executions(), 0, "a denied tool ran");
});

// One Anthropic Messages stand-in: the first request asks for one call to
// `fixture_write`, every later one answers with text. A streaming request
// gets SSE, a non-streaming one (generate()) a JSON message.
const startAnthropicToolStandIn = async (
  toolName = "fixture_write",
  toolInput: Record<string, unknown> = {},
): Promise<{
  requests: () => number;
  restore: () => void;
  close: () => Promise<void>;
}> => {
  const event = (name: string, payload: Record<string, unknown>) =>
    `event: ${name}\ndata: ${JSON.stringify({ type: name, ...payload })}\n\n`;
  const toolTurn = [
    event("message_start", {
      message: { id: "msg_1", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    event("content_block_start", {
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_1",
        name: toolName,
        input: {},
      },
    }),
    event("content_block_delta", {
      index: 0,
      delta: {
        type: "input_json_delta",
        partial_json: JSON.stringify(toolInput),
      },
    }),
    event("content_block_stop", { index: 0 }),
    event("message_delta", {
      delta: { stop_reason: "tool_use" },
      usage: { output_tokens: 6 },
    }),
    event("message_stop", {}),
  ].join("");
  const textTurn = [
    event("message_start", {
      message: { id: "msg_2", usage: { input_tokens: 5, output_tokens: 0 } },
    }),
    event("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }),
    event("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text: "done" },
    }),
    event("content_block_stop", { index: 0 }),
    event("message_delta", {
      delta: { stop_reason: "end_turn" },
      usage: { output_tokens: 4 },
    }),
    event("message_stop", {}),
  ].join("");
  const jsonTurn = (first: boolean) =>
    JSON.stringify({
      id: first ? "msg_1" : "msg_2",
      type: "message",
      role: "assistant",
      model: "claude-3-5-sonnet-20241022",
      content: first
        ? [
            {
              type: "tool_use",
              id: "toolu_1",
              name: toolName,
              input: toolInput,
            },
          ]
        : [{ type: "text", text: "done" }],
      stop_reason: first ? "tool_use" : "end_turn",
      stop_sequence: null,
      usage: { input_tokens: 5, output_tokens: 5 },
    });
  let requests = 0;
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const first = requests++ === 0;
      const streaming = readRecord(
        (() => {
          try {
            return JSON.parse(
              Buffer.concat(chunks).toString("utf8"),
            ) as unknown;
          } catch {
            return {};
          }
        })(),
      ).stream;
      if (streaming === true) {
        res.writeHead(200, { "content-type": "text/event-stream" });
        res.end(first ? toolTurn : textTurn);
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(jsonTurn(first));
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const values: Record<string, string> = {
    ANTHROPIC_API_KEY: "test-key",
    ANTHROPIC_BASE_URL: `http://127.0.0.1:${port}`,
    ANTHROPIC_AUTH_METHOD: "api_key",
  };
  const saved = new Map(
    Object.keys(values).map((key) => [key, process.env[key]]),
  );
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  return {
    requests: () => requests,
    restore: () => {
      for (const [key, value] of saved) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

const ISOLATED_AGENT = {
  id: "confirm-once-agent",
  name: "Confirm-once agent",
  description: "Calls fixture_write once",
  instructions: "Call fixture_write once.",
  provider: "anthropic",
  model: "claude-3-5-sonnet-20241022",
  tools: ["fixture_write"],
  maxSteps: 3,
};

await test("runIsolatedAgent on a HITL host: an approved card runs the tool exactly once", async () => {
  const standIn = await startAnthropicToolStandIn();
  try {
    const fixture = createWorkerFixture({ timeout: 200, maxRetries: 1 });
    // Answered well past the attempt timeout.
    fixture.onCard((id) => setTimeout(() => fixture.answer(id, true), 700));
    await settle(fixture.neurolink.runIsolatedAgent(ISOLATED_AGENT, "go"));
    await delay(300);
    assertCount(
      fixture.cards.length,
      1,
      "the run did not raise exactly one card",
    );
    assertCount(
      fixture.executions(),
      1,
      "the approved tool did not run exactly once",
    );
  } finally {
    standIn.restore();
    await standIn.close();
  }
});

await test("runIsolatedAgent on a HITL host: no card outlives an unanswered call, and a late approval runs nothing", async () => {
  const standIn = await startAnthropicToolStandIn();
  try {
    // Nothing answers or aborts. The card's timeout (2s) is far longer than
    // the tool's attempts (200ms, one retry), so the call ends on the card's
    // own timeout, and the run then finishes on its own.
    const fixture = createWorkerFixture({ timeout: 200, maxRetries: 1 }, 2000);
    const outcome = await settle(
      fixture.neurolink.runIsolatedAgent(ISOLATED_AGENT, "go"),
    );
    assert(outcome.error === undefined, "runIsolatedAgent threw");
    assertCount(
      fixture.cards.length,
      1,
      "the run did not raise exactly one card",
    );
    assertCount(fixture.executions(), 0, "the tool ran without an approval");
    for (const id of fixture.cards) {
      assert(
        !fixture.neurolink.hasPendingHITLConfirmation(id),
        "a card was still waiting for an answer after the run returned",
      );
      fixture.answer(id, true);
    }
    await delay(400);
    assertCount(
      fixture.executions(),
      0,
      "a late approval of a card from the finished run ran the tool",
    );
  } finally {
    standIn.restore();
    await standIn.close();
  }
});

await test("runIsolatedAgent on a HITL host: a card still waiting when the run returns is withdrawn, and a late approval runs nothing", async () => {
  const standIn = await startAnthropicToolStandIn();
  try {
    // The card's timeout is far longer than the run. The run is given a
    // parent signal and aborted 1s in while the card is unanswered, the way
    // a host ends a delegation it no longer needs.
    const fixture = createWorkerFixture({ timeout: 200, maxRetries: 1 }, 8000);
    const controller = new AbortController();
    fixture.onCard(() => setTimeout(() => controller.abort(), 1000));
    await settle(
      fixture.neurolink.runIsolatedAgent(ISOLATED_AGENT, "go", {
        abortSignal: controller.signal,
      }),
    );
    assertCount(
      fixture.cards.length,
      1,
      "the run did not raise exactly one card",
    );
    assertCount(fixture.executions(), 0, "the tool ran without an approval");
    assert(
      !fixture.neurolink.hasPendingHITLConfirmation(fixture.cards[0]),
      "the finished run's card was still waiting for an answer",
    );
    assertCount(
      fixture.cancelled.length,
      1,
      "the finished run's card was not withdrawn",
    );
    fixture.answer(fixture.cards[0], true);
    await delay(400);
    assertCount(
      fixture.executions(),
      0,
      "a late approval of the finished run's card ran the tool",
    );
  } finally {
    standIn.restore();
    await standIn.close();
  }
});

// ---------------------------------------------------------------------------
// registerAgentTool: the agent tool's own attempts
// ---------------------------------------------------------------------------

/**
 * A HITL host with a gated tool and an agent tool whose worker calls it,
 * called through the host's `executeTool` with an attempt timeout shorter
 * than the worker's card. Nobody answers until the call has settled.
 */
const runAgentToolPastItsAttempt = async (
  maxRetries: number,
): Promise<{
  fixture: RegisteredFixture;
  pendingAtSettle: number;
  cancelledAtSettle: number;
}> => {
  const fixture = createWorkerFixture({ timeout: 120_000 }, 5000);
  await fixture.neurolink.registerAgentTool({
    ...ISOLATED_AGENT,
    id: "confirm_once_researcher",
  });
  await settle(
    fixture.neurolink.executeTool(
      "confirm_once_researcher",
      { task: "go" },
      { timeout: 700, maxRetries, retryDelayMs: 10, bypassBatcher: true },
    ),
  );
  const pendingAtSettle = fixture.cards.filter((id) =>
    fixture.neurolink.hasPendingHITLConfirmation(id),
  ).length;
  return {
    fixture,
    pendingAtSettle,
    cancelledAtSettle: fixture.cancelled.length,
  };
};

await test("an agent tool's attempt that times out withdraws its worker's card, and a late approval runs nothing", async () => {
  const standIn = await startAnthropicToolStandIn();
  try {
    const { fixture, pendingAtSettle, cancelledAtSettle } =
      await runAgentToolPastItsAttempt(1);
    assert(fixture.cards.length >= 1, "the worker's call raised no card");
    assertCount(
      pendingAtSettle,
      0,
      "a card was still waiting after the agent tool's call ended",
    );
    assertCount(
      cancelledAtSettle,
      fixture.cards.length,
      "not every card the ended call raised was withdrawn",
    );
    for (const id of fixture.cards) {
      fixture.answer(id, true);
    }
    await delay(800);
    assertCount(
      fixture.executions(),
      0,
      "a late approval of the ended call's card ran the tool",
    );
  } finally {
    standIn.restore();
    await standIn.close();
  }
});

await test("an agent tool with no retries: its timed-out attempt withdraws the worker's card, and a late approval runs nothing", async () => {
  const standIn = await startAnthropicToolStandIn();
  try {
    const { fixture, pendingAtSettle, cancelledAtSettle } =
      await runAgentToolPastItsAttempt(0);
    assertCount(
      fixture.cards.length,
      1,
      "the worker's call did not raise exactly one card",
    );
    assertCount(pendingAtSettle, 0, "the card was still waiting");
    assertCount(cancelledAtSettle, 1, "the card was not withdrawn");
    fixture.answer(fixture.cards[0], true);
    await delay(800);
    assertCount(
      fixture.executions(),
      0,
      "a late approval of the ended call's card ran the tool",
    );
  } finally {
    standIn.restore();
    await standIn.close();
  }
});

await test("an agent tool is registered with no retries", async () => {
  const neurolink = new NeuroLink({});
  await neurolink.registerAgentTool({
    ...ISOLATED_AGENT,
    id: "confirm_once_no_retry",
  });
  assertEqual(
    neurolink.getToolRegistry().getToolInfo("confirm_once_no_retry")?.tool
      .maxRetries,
    0,
    "the agent tool is not registered with maxRetries: 0",
  );
});

/**
 * How often one `executeTool` call runs a read-only tool (its name infers a
 * safe-to-retry annotation) registered with `registration`, when middleware
 * fails the call with a retriable error after the tool has returned.
 */
const runsWhenMiddlewareFailsAfterTheTool = async (
  registration: { maxRetries?: number },
  options: { batcher?: boolean; callMaxRetries?: number } = {},
): Promise<number> => {
  const neurolink = new NeuroLink(
    options.batcher
      ? { mcp: { batcher: { enabled: true, maxWaitMs: 10 } } }
      : {},
  );
  let runs = 0;
  neurolink.registerTool(
    "search_docs",
    {
      name: "search_docs",
      description: "Harmless local read fixture",
      inputSchema: { type: "object" as const, properties: {} },
      execute: async () => {
        runs++;
        return "found";
      },
    },
    registration,
  );
  neurolink.useToolMiddleware(async (_tool, _params, _context, next) => {
    await next();
    throw new Error("audit sink network error");
  });
  await settle(
    neurolink.executeTool(
      "search_docs",
      {},
      {
        retryDelayMs: 10,
        ...(options.batcher ? {} : { bypassBatcher: true }),
        ...(options.callMaxRetries === undefined
          ? {}
          : { maxRetries: options.callMaxRetries }),
      },
    ),
  );
  await delay(50);
  return runs;
};

await test("a call with no retries, registered or its own, batched or not, runs the tool once even when a retriable failure follows", async () => {
  assertCount(
    await runsWhenMiddlewareFailsAfterTheTool({ maxRetries: 0 }),
    1,
    "a maxRetries: 0 tool ran more than once in one call",
  );
  assertCount(
    await runsWhenMiddlewareFailsAfterTheTool(
      { maxRetries: 0 },
      { batcher: true },
    ),
    1,
    "a batched maxRetries: 0 tool ran more than once in one call",
  );
  assertCount(
    await runsWhenMiddlewareFailsAfterTheTool(
      {},
      { batcher: true, callMaxRetries: 0 },
    ),
    1,
    "a call made with maxRetries: 0 ran more than once with the batcher on",
  );
  // Control: with retries allowed, the same failure is retried, so the path
  // above is the one that retries.
  assert(
    (await runsWhenMiddlewareFailsAfterTheTool({ maxRetries: 1 })) > 1,
    "a tool that may be retried was not retried; the case measures nothing",
  );
});

// ---------------------------------------------------------------------------
// A worker's own external MCP servers
// ---------------------------------------------------------------------------

/**
 * A HITL host whose rule names `search`, and a worker from
 * `createWorkerInstance()` that connected its own stdio MCP server (the
 * fixture's `search_code`), the state its `.mcp-config.json` would leave.
 */
const withWorkerExternalServer = async (
  body: (fixture: {
    host: NeuroLink;
    worker: NeuroLink;
    observer: HitlObserver;
    serverCalls: () => number;
  }) => Promise<void>,
): Promise<void> => {
  const serverId = `hitl-worker-external-${process.pid}-${++serverCounter}`;
  const host = new NeuroLink({
    hitl: { enabled: true, dangerousActions: ["search"], timeout: 5000 },
  });
  const worker = host.createWorkerInstance();
  const added = await worker.addExternalMCPServer(serverId, {
    id: serverId,
    name: serverId,
    description: "Worker external fixture",
    transport: "stdio",
    status: "initializing",
    tools: [],
    command: process.execPath,
    args: [FIXTURE],
  });
  assert(added.success, "fixture server failed to connect");
  try {
    await body({
      host,
      worker,
      observer: observeHitl(host.getEventEmitter()),
      serverCalls: () =>
        worker.getExternalMCPServer(serverId)?.metrics.totalToolCalls ?? 0,
    });
  } finally {
    await worker.shutdownExternalMCPServers();
  }
};

await test("a worker's own external tool is confirmed once by its host before it runs", () =>
  withWorkerExternalServer(async ({ worker, observer, serverCalls }) => {
    observer.onCard((id) =>
      setTimeout(() => {
        assertCount(serverCalls(), 0, "the tool ran before approval");
        observer.answer(id, true);
      }, 300),
    );
    const outcome = await settle(
      worker.executeExternalMCPTool(
        worker.getExternalMCPTools().find((t) => t.name === "search_code")
          ?.serverId ?? "",
        "search_code",
        { echo: "worker" },
      ),
    );
    assert(outcome.error === undefined, "the approved call threw");
    assertCount(observer.cards.length, 1, "the host did not confirm it once");
    assertCount(serverCalls(), 1, "the approved tool did not run once");
  }));

await test("a worker's own external tool called by its model raises one card on the host and runs nothing unapproved", async () => {
  const standIn = await startAnthropicToolStandIn("search_code", {
    echo: "worker",
  });
  try {
    await withWorkerExternalServer(
      async ({ worker, observer, serverCalls }) => {
        const { stream } = await worker.stream({
          input: { text: "search" },
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          maxTokens: 32,
          maxSteps: 3,
          disableInternalFallback: true,
        });
        const drained = (async () => {
          for await (const chunk of stream) {
            void chunk;
          }
        })();
        assert(
          await waitFor(() => observer.cards.length === 1, 5000),
          "the host raised no card for the worker's external tool",
        );
        await delay(300);
        assertCount(serverCalls(), 0, "the tool ran while its card waited");
        observer.answer(observer.cards[0], false);
        await settle(drained);
        assertCount(observer.cards.length, 1, "the call was not asked once");
        assertCount(serverCalls(), 0, "a denied external tool ran");
      },
    );
  } finally {
    standIn.restore();
    await standIn.close();
  }
});

// ---------------------------------------------------------------------------
// Built-in tools a model loop runs directly
// ---------------------------------------------------------------------------

type BuiltInFixture = HitlObserver & {
  neurolink: NeuroLink;
  /** Where the model's writeFile call lands (inside the tool root). */
  target: string;
  written: () => boolean;
  writtenContent: () => string;
  /** One model turn on the Anthropic stand-in. */
  turn: (abortSignal?: AbortSignal) => Promise<Settled>;
  standInRequests: () => number;
  close: () => Promise<void>;
};

/**
 * A fresh directory as the only file-tool root, and an Anthropic stand-in
 * whose model calls `toolName` once. `hitl` is the instance's HITL config, or
 * undefined for HITL off. `worker` runs the turn on a `createWorkerInstance()`
 * of that instance instead.
 */
const createBuiltInFixture = async (
  toolName: string,
  hitl: { dangerousActions: string[]; timeout: number } | undefined,
  options: { worker?: boolean } = {},
): Promise<BuiltInFixture> => {
  const root = mkdtempSync(join(tmpdir(), "hitl-builtin-"));
  const target = join(root, "confirm-once.txt");
  const input =
    toolName === "writeFile"
      ? { path: target, content: "written once", mode: "append" }
      : { path: root };
  const standIn = await startAnthropicToolStandIn(toolName, input);
  const neurolink = new NeuroLink({
    tools: { fileRoots: [root] },
    ...(hitl ? { hitl: { enabled: true, ...hitl } } : {}),
  });
  const runner = options.worker ? neurolink.createWorkerInstance() : neurolink;
  return {
    ...observeHitl(neurolink.getEventEmitter()),
    neurolink,
    target,
    written: () => existsSync(target),
    writtenContent: () =>
      existsSync(target) ? readFileSync(target, "utf8") : "",
    turn: (abortSignal) =>
      settle(
        (async () => {
          const { stream } = await runner.stream({
            input: { text: "use the tool" },
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 32,
            maxSteps: 3,
            disableTools: false,
            disableInternalFallback: true,
            ...(abortSignal ? { abortSignal } : {}),
          });
          for await (const chunk of stream) {
            void chunk;
          }
        })(),
      ),
    standInRequests: standIn.requests,
    close: async () => {
      standIn.restore();
      await standIn.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
};

const WRITE_HITL = { dangerousActions: ["write"], timeout: 5000 };

await test("a built-in write tool is confirmed once before it runs, and runs exactly once on approval", async () => {
  const fixture = await createBuiltInFixture("writeFile", WRITE_HITL);
  try {
    fixture.onCard((id) =>
      setTimeout(() => {
        assert(!fixture.written(), "the file was written before approval");
        fixture.answer(id, true);
      }, 300),
    );
    await fixture.turn();
    await delay(100);
    assertCount(fixture.cards.length, 1, "the call was not confirmed once");
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the approved write did not happen exactly once",
    );
  } finally {
    await fixture.close();
  }
});

await test("a built-in write tool writes nothing while its card waits, past any attempt timer", async () => {
  const fixture = await createBuiltInFixture("writeFile", WRITE_HITL);
  try {
    const turn = fixture.turn();
    assert(
      await waitFor(() => fixture.cards.length === 1, 5000),
      "no confirmation card was raised",
    );
    await delay(900);
    assert(!fixture.written(), "the file was written while its card waited");
    assertCount(fixture.cards.length, 1, "the call raised more than one card");
    fixture.answer(fixture.cards[0], true);
    await turn;
    await delay(100);
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the approved write did not happen exactly once",
    );
  } finally {
    await fixture.close();
  }
});

await test("a denied built-in write tool writes nothing and is not asked again", async () => {
  const fixture = await createBuiltInFixture("writeFile", WRITE_HITL);
  try {
    fixture.onCard((id) => setTimeout(() => fixture.answer(id, false), 200));
    await fixture.turn();
    await delay(300);
    assertCount(
      fixture.cards.length,
      1,
      "the denied call was not asked exactly once",
    );
    assert(!fixture.written(), "a denied write happened");
    // The tool call, then the request that carries the refusal.
    assertCount(
      fixture.standInRequests(),
      2,
      "the turn did not end after the refusal reached the model",
    );
  } finally {
    await fixture.close();
  }
});

await test("a built-in write tool whose card times out writes nothing, and a late approval writes nothing", async () => {
  const fixture = await createBuiltInFixture("writeFile", {
    dangerousActions: ["write"],
    timeout: 400,
  });
  try {
    await fixture.turn();
    assertCount(fixture.cards.length, 1, "the call was not confirmed once");
    assert(!fixture.written(), "a write happened after its card timed out");
    fixture.answer(fixture.cards[0], true);
    await delay(300);
    assert(!fixture.written(), "a late approval wrote the file");
  } finally {
    await fixture.close();
  }
});

await test("a turn aborted while a built-in write tool's card waits withdraws the card, and a late approval writes nothing", async () => {
  const fixture = await createBuiltInFixture("writeFile", WRITE_HITL);
  try {
    const controller = new AbortController();
    fixture.onCard(() => setTimeout(() => controller.abort(), 300));
    await fixture.turn(controller.signal);
    assertCount(fixture.cards.length, 1, "the call was not confirmed once");
    assertCount(fixture.cancelled.length, 1, "the card was not withdrawn");
    fixture.answer(fixture.cards[0], true);
    await delay(300);
    assert(
      !fixture.written(),
      "a late approval after the abort wrote the file",
    );
  } finally {
    await fixture.close();
  }
});

await test("a read-only built-in tool is not confirmed under a write rule", async () => {
  const fixture = await createBuiltInFixture("listDirectory", WRITE_HITL);
  try {
    await fixture.turn();
    assertCount(fixture.cards.length, 0, "a read-only built-in tool asked");
    assertCount(
      fixture.standInRequests(),
      2,
      "the read-only tool's result did not reach the model",
    );
  } finally {
    await fixture.close();
  }
});

await test("with HITL off, a built-in write tool runs without a card", async () => {
  const fixture = await createBuiltInFixture("writeFile", undefined);
  try {
    await fixture.turn();
    assertCount(fixture.cards.length, 0, "a card was raised with HITL off");
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the write did not happen exactly once with HITL off",
    );
  } finally {
    await fixture.close();
  }
});

await test("a worker's built-in write tool is confirmed once by its host before it runs", async () => {
  const fixture = await createBuiltInFixture("writeFile", WRITE_HITL, {
    worker: true,
  });
  try {
    fixture.onCard((id) =>
      setTimeout(() => {
        assert(!fixture.written(), "the file was written before approval");
        fixture.answer(id, true);
      }, 300),
    );
    await fixture.turn();
    await delay(100);
    assertCount(
      fixture.cards.length,
      1,
      "the host did not confirm the call once",
    );
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the approved write did not happen exactly once",
    );
  } finally {
    await fixture.close();
  }
});

await test("executeTool on a built-in write tool is confirmed once before it runs", async () => {
  const fixture = await createBuiltInFixture("writeFile", WRITE_HITL);
  try {
    fixture.onCard((id) => setTimeout(() => fixture.answer(id, true), 200));
    const outcome = await settle(
      fixture.neurolink.executeTool(
        "writeFile",
        { path: fixture.target, content: "written once", mode: "append" },
        { bypassBatcher: true },
      ),
    );
    assert(outcome.error === undefined, "the approved call threw");
    assertCount(fixture.cards.length, 1, "the call was not confirmed once");
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the approved write did not happen exactly once",
    );
  } finally {
    await fixture.close();
  }
});

// ---------------------------------------------------------------------------
// Built-in tools on a stream's fallback provider
// ---------------------------------------------------------------------------

/**
 * An Anthropic stand-in for a stream that falls back: when `emptyFirst`, the
 * first request answers with an empty turn (the primary yields nothing);
 * every request without a tool result asks for `writeFile`, and a request
 * carrying one answers with text.
 */
const startFallbackStandIn = async (
  write: Record<string, unknown>,
  emptyFirst: boolean,
): Promise<{ requests: () => number; close: () => Promise<void> }> => {
  const event = (name: string, payload: Record<string, unknown>) =>
    `event: ${name}\ndata: ${JSON.stringify({ type: name, ...payload })}\n\n`;
  const start = (id: string) =>
    event("message_start", {
      message: { id, usage: { input_tokens: 5, output_tokens: 0 } },
    });
  const stop = (reason: string) =>
    event("message_delta", {
      delta: { stop_reason: reason },
      usage: { output_tokens: 4 },
    }) + event("message_stop", {});
  const emptyTurn = start("msg_0") + stop("end_turn");
  const toolTurn =
    start("msg_1") +
    event("content_block_start", {
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_1",
        name: "writeFile",
        input: {},
      },
    }) +
    event("content_block_delta", {
      index: 0,
      delta: { type: "input_json_delta", partial_json: JSON.stringify(write) },
    }) +
    event("content_block_stop", { index: 0 }) +
    stop("tool_use");
  const textTurn =
    start("msg_2") +
    event("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    event("content_block_delta", {
      index: 0,
      delta: { type: "text_delta", text: "done" },
    }) +
    event("content_block_stop", { index: 0 }) +
    stop("end_turn");
  let requests = 0;
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const index = requests++;
      const body = Buffer.concat(chunks).toString("utf8");
      res.writeHead(200, { "content-type": "text/event-stream" });
      if (emptyFirst && index === 0) {
        res.end(emptyTurn);
        return;
      }
      res.end(body.includes("tool_result") ? textTurn : toolTurn);
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const saved = new Map(
    ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_METHOD"].map(
      (key) => [key, process.env[key]],
    ),
  );
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  return {
    requests: () => requests,
    close: () =>
      new Promise<void>((resolve) => {
        for (const [key, value] of saved) {
          if (value === undefined) {
            delete process.env[key];
          } else {
            process.env[key] = value;
          }
        }
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

/**
 * One stream that falls back to another provider. "empty": the primary
 * yields nothing. "setup": the primary fails at setup.
 */
const runFallbackTurn = async (
  trigger: "empty" | "setup",
): Promise<{ cards: number; written: boolean; requests: number }> => {
  const root = mkdtempSync(join(tmpdir(), "hitl-fallback-"));
  const target = join(root, "confirm-once.txt");
  const standIn = await startFallbackStandIn(
    { path: target, content: "written once", mode: "append" },
    trigger === "empty",
  );
  try {
    const neurolink = new NeuroLink({
      tools: { fileRoots: [root] },
      hitl: { enabled: true, dangerousActions: ["write"], timeout: 600 },
    });
    const observer = observeHitl(neurolink.getEventEmitter());
    await settle(
      (async () => {
        const { stream } = await neurolink.stream({
          input: { text: "write the file" },
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          maxTokens: 32,
          maxSteps: 3,
          ...(trigger === "empty"
            ? {
                fallbackProvider: "anthropic",
                fallbackModel: "claude-3-5-sonnet-20241022",
              }
            : { executionControl: { requestTimeoutMs: 0 } }),
        });
        for await (const chunk of stream) {
          void chunk;
        }
      })(),
    );
    await delay(200);
    return {
      cards: observer.cards.length,
      written: existsSync(target),
      requests: standIn.requests(),
    };
  } finally {
    await standIn.close();
    rmSync(root, { recursive: true, force: true });
  }
};

await test("a stream whose primary yields nothing: the fallback's built-in write tool is confirmed once and writes nothing unapproved", async () => {
  const outcome = await runFallbackTurn("empty");
  assert(
    outcome.requests >= 2,
    "the stream did not fall back to a second request",
  );
  assertCount(outcome.cards, 1, "the fallback's write was not confirmed once");
  assert(!outcome.written, "the fallback wrote the file with no approval");
});

await test("a stream whose primary fails at setup: the fallback's built-in write tool is confirmed once and writes nothing unapproved", async () => {
  const outcome = await runFallbackTurn("setup");
  assert(outcome.requests >= 1, "the fallback made no model request");
  assertCount(outcome.cards, 1, "the fallback's write was not confirmed once");
  assert(!outcome.written, "the fallback wrote the file with no approval");
});

// ---------------------------------------------------------------------------
// Text-only model roles are given no tools
// ---------------------------------------------------------------------------

/**
 * An OpenAI-compatible stand-in that records whether each request offered
 * the model any tools, and answers by role: a judge gets a JSON verdict,
 * every other request plain text.
 */
const startRoleStandIn = async (): Promise<{
  requests: () => Array<{ model: string; offeredTools: boolean }>;
  close: () => Promise<void>;
}> => {
  const seen: Array<{ model: string; offeredTools: boolean }> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = readRecord(
        (() => {
          try {
            return JSON.parse(
              Buffer.concat(chunks).toString("utf8"),
            ) as unknown;
          } catch {
            return {};
          }
        })(),
      );
      const model = String(body.model ?? "");
      const tools = body.tools;
      seen.push({
        model,
        offeredTools: Array.isArray(tools) && tools.length > 0,
      });
      const content =
        model === "fixture-judge"
          ? JSON.stringify({
              scores: { "fixture-member": 90 },
              ranking: ["fixture-member"],
              bestResponse: "fixture-member",
              reasoning: "fixture",
            })
          : "a plain answer";
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "role",
          object: "chat.completion",
          created: 1,
          model,
          choices: [
            {
              index: 0,
              message: { role: "assistant", content },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  process.env.OPENAI_COMPATIBLE_BASE_URL = `http://127.0.0.1:${port}/v1`;
  process.env.OPENAI_COMPATIBLE_API_KEY = "owned-role-fixture";
  return {
    requests: () => seen,
    close: () =>
      new Promise<void>((resolve) => {
        delete process.env.OPENAI_COMPATIBLE_BASE_URL;
        delete process.env.OPENAI_COMPATIBLE_API_KEY;
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

await test("a workflow's ensemble members, judge and synthesis model are given no tools", async () => {
  const standIn = await startRoleStandIn();
  try {
    await settle(
      runWorkflow(
        {
          id: "confirm-once-roles",
          name: "confirm-once-roles",
          type: "ensemble",
          models: [
            {
              provider: AIProviderName.OPENAI_COMPATIBLE,
              model: "fixture-member",
            },
            {
              provider: AIProviderName.OPENAI_COMPATIBLE,
              model: "fixture-member-2",
            },
          ],
          judge: {
            provider: AIProviderName.OPENAI_COMPATIBLE,
            model: "fixture-judge",
            criteria: ["accuracy"],
            outputFormat: "scores",
            includeReasoning: true,
            scoreScale: { min: 0, max: 100 },
          },
          conditioning: {
            useConfidence: true,
            synthesisModel: {
              provider: "openai-compatible",
              model: "fixture-synthesis",
            },
          },
        },
        { prompt: "answer in text" },
      ),
    );
    const roles = new Set(standIn.requests().map((r) => r.model));
    assert(roles.has("fixture-member"), "the ensemble member was not called");
    assert(roles.has("fixture-judge"), "the judge was not called");
    assert(
      roles.has("fixture-synthesis"),
      "the synthesis model was not called",
    );
    const withTools = standIn
      .requests()
      .filter((r) => r.offeredTools)
      .map((r) => r.model);
    assertEqual(
      withTools.join(","),
      "",
      "a text-only workflow role was offered tools",
    );
  } finally {
    await standIn.close();
  }
});

await test("a guardrails pre-call evaluator is given no tools", async () => {
  const standIn = await startRoleStandIn();
  const target = await startAnthropicToolStandIn("writeFile", {});
  try {
    const neurolink = new NeuroLink({
      hitl: { enabled: true, dangerousActions: ["write"], timeout: 600 },
    });
    await settle(
      neurolink.generate({
        input: { text: "hello" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxTokens: 32,
        disableTools: true,
        disableInternalFallback: true,
        middleware: {
          middlewareConfig: {
            guardrails: {
              enabled: true,
              config: {
                precallEvaluation: {
                  enabled: true,
                  provider: "openai-compatible",
                  evaluationModel: "fixture-evaluator",
                },
              },
            },
          },
        },
      }),
    );
    const evaluator = standIn
      .requests()
      .filter((r) => r.model === "fixture-evaluator");
    assert(evaluator.length >= 1, "the evaluator was not called");
    assert(
      evaluator.every((r) => !r.offeredTools),
      "the evaluator was offered tools",
    );
  } finally {
    target.restore();
    await target.close();
    await standIn.close();
  }
});

await test("the auto-evaluation evaluator is given no tools, and nothing it asks for runs", async () => {
  const standIn = await startRoleStandIn();
  const target = await startAnthropicToolStandIn("writeFile", {});
  try {
    const neurolink = new NeuroLink({
      hitl: { enabled: true, dangerousActions: ["write"], timeout: 600 },
    });
    const observer = observeHitl(neurolink.getEventEmitter());
    await settle(
      neurolink.generate({
        input: { text: "hello" },
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        maxTokens: 32,
        disableTools: true,
        disableInternalFallback: true,
        middleware: {
          middlewareConfig: {
            autoEvaluation: {
              enabled: true,
              config: {
                provider: "openai-compatible",
                evaluationModel: "fixture-evaluator",
                blocking: true,
              },
            },
          },
        },
      }),
    );
    const evaluator = standIn
      .requests()
      .filter((r) => r.model === "fixture-evaluator");
    assert(evaluator.length >= 1, "the evaluator was not called");
    assert(
      evaluator.every((r) => !r.offeredTools),
      "the evaluator was offered tools",
    );
    assertCount(observer.cards.length, 0, "the evaluator raised a card");
  } finally {
    target.restore();
    await target.close();
    await standIn.close();
  }
});

await test("the Evaluator class's evaluation model is given no tools", async () => {
  const standIn = await startRoleStandIn();
  try {
    const evaluator = new Evaluator({
      provider: "openai-compatible",
      evaluationModel: "fixture-evaluator",
    });
    await settle(
      evaluator.evaluate(
        { prompt: [{ role: "user", content: [{ type: "text", text: "q" }] }] },
        { content: "an answer" } as never,
        7,
        {},
      ),
    );
    const calls = standIn
      .requests()
      .filter((r) => r.model === "fixture-evaluator");
    assert(calls.length >= 1, "the evaluation model was not called");
    assert(
      calls.every((r) => !r.offeredTools),
      "the evaluation model was offered tools",
    );
  } finally {
    await standIn.close();
  }
});

await test("an LLM scorer's model is given no tools", async () => {
  const standIn = await startRoleStandIn();
  try {
    const scorer = new BiasDetectionScorer({
      provider: "openai-compatible",
      model: "fixture-scorer",
    });
    await settle(scorer.score({ query: "q", response: "an answer" }));
    const calls = standIn
      .requests()
      .filter((r) => r.model === "fixture-scorer");
    assert(calls.length >= 1, "the scorer model was not called");
    assert(
      calls.every((r) => !r.offeredTools),
      "the scorer model was offered tools",
    );
  } finally {
    await standIn.close();
  }
});

await test("the RAG reranker's model is given no tools", async () => {
  const standIn = await startRoleStandIn();
  try {
    const model = await createAIProvider(
      "openai-compatible",
      "fixture-reranker",
    );
    const results = [
      { id: "a", score: 0.5, text: "first passage", metadata: {} },
      { id: "b", score: 0.4, text: "second passage", metadata: {} },
    ];
    await settle(rerank(results as never, "query", model));
    const calls = standIn
      .requests()
      .filter((r) => r.model === "fixture-reranker");
    assert(calls.length >= 1, "the reranker model was not called");
    assert(
      calls.every((r) => !r.offeredTools),
      "the reranker model was offered tools",
    );
  } finally {
    await standIn.close();
  }
});

await test("the RAG metadata extractor's model is given no tools", async () => {
  const standIn = await startRoleStandIn();
  try {
    await settle(
      extractMetadata(
        [{ id: "c1", text: "a chunk of text", metadata: {} }] as never,
        { summary: true } as never,
        { provider: "openai-compatible", modelName: "fixture-extractor" },
      ),
    );
    const calls = standIn
      .requests()
      .filter((r) => r.model === "fixture-extractor");
    assert(calls.length >= 1, "the extractor model was not called");
    assert(
      calls.every((r) => !r.offeredTools),
      "the extractor model was offered tools",
    );
  } finally {
    await standIn.close();
  }
});

await test("the memory condenser always asks for no tools", async () => {
  // A memory client factory receives the config NeuroLink assembled, whose
  // `neurolink.instance` is the condenser handle. Called with options that
  // leave `disableTools` out, the request it sends still offers no tools.
  const standIn = await startRoleStandIn();
  try {
    let condenser:
      | { generate: (options: Record<string, unknown>) => Promise<unknown> }
      | undefined;
    const neurolink = new NeuroLink({
      conversationMemory: {
        enabled: true,
        memory: {
          enabled: true,
          client: (config: { neurolink?: { instance?: unknown } }) => {
            const instance = config.neurolink?.instance;
            if (
              instance &&
              typeof (instance as { generate?: unknown }).generate ===
                "function"
            ) {
              condenser = instance as typeof condenser;
            }
            return {
              add: async () => "",
              get: async () => null,
              delete: async () => undefined,
              close: async () => undefined,
            };
          },
        },
      },
    });
    await settle(
      neurolink.generate({
        input: { text: "remember this" },
        provider: "openai-compatible",
        model: "fixture-host",
        context: { userId: "user-condenser", sessionId: "session-1" },
        disableTools: true,
        maxSteps: 1,
      }),
    );
    assertNotNull(condenser, "the host built no condenser handle");
    await settle(
      condenser.generate({
        input: { text: "condense" },
        provider: "openai-compatible",
        model: "fixture-condenser",
      }),
    );
    const calls = standIn
      .requests()
      .filter((r) => r.model === "fixture-condenser");
    assert(calls.length >= 1, "the condenser model was not called");
    assert(
      calls.every((r) => !r.offeredTools),
      "the condenser was offered tools when its caller left disableTools out",
    );
  } finally {
    await standIn.close();
  }
});

await test("conversation summarization's model is given no tools", async () => {
  // A low token threshold makes the in-memory store summarize in the
  // background after a few turns, through the configured summarization model.
  const standIn = await startRoleStandIn();
  try {
    const neurolink = new NeuroLink({
      conversationMemory: {
        enabled: true,
        enableSummarization: true,
        tokenThreshold: 150,
        summarizationProvider: "openai-compatible",
        summarizationModel: "fixture-summarizer",
      },
    });
    for (let turn = 0; turn < 14; turn++) {
      await settle(
        neurolink.generate({
          input: { text: `turn ${turn} ${"w ".repeat(10)}` },
          provider: "openai-compatible",
          model: "fixture-host",
          context: { sessionId: "summary-session", userId: "user-summary" },
          disableTools: true,
          maxSteps: 1,
        }),
      );
    }
    assert(
      await waitFor(
        () => standIn.requests().some((r) => r.model === "fixture-summarizer"),
        5000,
      ),
      "the summarization model was not called",
    );
    const calls = standIn
      .requests()
      .filter((r) => r.model === "fixture-summarizer");
    assert(
      calls.every((r) => !r.offeredTools),
      "the summarization model was offered tools",
    );
  } finally {
    await standIn.close();
  }
});

/**
 * A minimal in-process RESP server: enough of Redis for the conversation
 * store to save a first turn (GET misses, writes succeed, MULTI/EXEC queue).
 */
const startRespStandIn = async (): Promise<{
  port: number;
  close: () => Promise<void>;
}> => {
  const encode = (value: unknown): string => {
    if (value === null) {
      return "$-1\r\n";
    }
    if (typeof value === "number") {
      return `:${value}\r\n`;
    }
    if (Array.isArray(value)) {
      return `*${value.length}\r\n${value.map(encode).join("")}`;
    }
    if (value instanceof Error) {
      return `-${value.message}\r\n`;
    }
    if (typeof value === "object" && value !== null && "status" in value) {
      return `+${String((value as { status: string }).status)}\r\n`;
    }
    const text = String(value);
    return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
  };
  const OK = { status: "OK" };
  const answer = (args: string[]): unknown => {
    switch ((args[0] ?? "").toUpperCase()) {
      case "PING":
        return { status: "PONG" };
      case "GET":
      case "HGET":
      case "LINDEX":
        return null;
      case "EXISTS":
      case "DEL":
      case "EXPIRE":
      case "PEXPIRE":
      case "SADD":
      case "SREM":
      case "RPUSH":
      case "LPUSH":
      case "LLEN":
      case "INCR":
      case "TTL":
        return 0;
      case "LRANGE":
      case "SMEMBERS":
      case "KEYS":
      case "MGET":
        return [];
      case "SCAN":
        return ["0", []];
      case "INFO":
        return "redis_version:7.0.0";
      case "HELLO":
        return new Error("ERR unknown command 'HELLO'");
      default:
        return OK;
    }
  };
  const server = createNetServer((socket) => {
    let buffer = Buffer.alloc(0);
    let queued: string[][] | null = null;
    socket.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const text = buffer.toString("latin1");
        if (!text.startsWith("*")) {
          buffer = Buffer.alloc(0);
          return;
        }
        const headerEnd = text.indexOf("\r\n");
        if (headerEnd < 0) {
          return;
        }
        const count = Number.parseInt(text.slice(1, headerEnd), 10);
        let cursor = headerEnd + 2;
        const args: string[] = [];
        for (let index = 0; index < count; index++) {
          const lengthEnd = text.indexOf("\r\n", cursor);
          if (lengthEnd < 0) {
            return;
          }
          const length = Number.parseInt(text.slice(cursor + 1, lengthEnd), 10);
          if (text.length < lengthEnd + 2 + length + 2) {
            return;
          }
          args.push(text.slice(lengthEnd + 2, lengthEnd + 2 + length));
          cursor = lengthEnd + 2 + length + 2;
        }
        buffer = buffer.subarray(cursor);
        const command = (args[0] ?? "").toUpperCase();
        if (command === "MULTI") {
          queued = [];
          socket.write("+OK\r\n");
        } else if (command === "EXEC") {
          socket.write(encode((queued ?? []).map(answer)));
          queued = null;
        } else if (command === "DISCARD") {
          queued = null;
          socket.write("+OK\r\n");
        } else if (queued) {
          queued.push(args);
          socket.write("+QUEUED\r\n");
        } else {
          socket.write(encode(answer(args)));
        }
      }
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
      }),
  };
};

await test("Redis conversation memory's title model is given no tools", async () => {
  // A first turn on Redis-backed memory generates the conversation's title
  // in the background, through the configured summarization model.
  const standIn = await startRoleStandIn();
  const redis = await startRespStandIn();
  const neurolink = new NeuroLink({
    conversationMemory: {
      enabled: true,
      summarizationProvider: "openai-compatible",
      summarizationModel: "fixture-title",
      redisConfig: { host: "127.0.0.1", port: redis.port },
    },
  });
  try {
    await settle(
      neurolink.generate({
        input: { text: "hello there" },
        provider: "openai-compatible",
        model: "fixture-host",
        context: { sessionId: "title-session", userId: "user-title" },
        disableTools: true,
        maxSteps: 1,
      }),
    );
    assert(
      await waitFor(
        () => standIn.requests().some((r) => r.model === "fixture-title"),
        5000,
      ),
      "the title model was not called",
    );
    const calls = standIn.requests().filter((r) => r.model === "fixture-title");
    assert(
      calls.every((r) => !r.offeredTools),
      "the title model was offered tools",
    );
  } finally {
    await settle(neurolink.shutdown());
    await redis.close();
    await standIn.close();
  }
});

// ---------------------------------------------------------------------------
// Agent tools and the opt-in batcher
// ---------------------------------------------------------------------------

/**
 * A HITL host on a shared registry, with the opt-in batcher, a gated tool
 * and an agent tool whose worker calls it. `arrange` decides which instance
 * registers the agent tool and which one calls it (a direct call with no
 * signal, an attempt timeout shorter than the worker's card). Nobody answers
 * until the call has settled.
 */
const runBatchedAgentTool = async (
  arrange: (
    host: NeuroLink,
    register: (on: NeuroLink) => Promise<void>,
  ) => Promise<NeuroLink>,
): Promise<void> => {
  const standIn = await startAnthropicToolStandIn();
  const savedTimeout = process.env.MCP_TOOL_TIMEOUT;
  process.env.MCP_TOOL_TIMEOUT = "5000";
  try {
    const host = new NeuroLink({
      mcp: { batcher: { enabled: true, maxWaitMs: 10 } },
      hitl: {
        enabled: true,
        dangerousActions: ["fixture_write"],
        timeout: 8000,
      },
    });
    let executions = 0;
    host.registerTool("fixture_write", {
      name: "fixture_write",
      description: "Harmless local HITL fixture",
      inputSchema: { type: "object" as const, properties: {} },
      execute: async () => {
        executions++;
        return "fixture executed";
      },
    });
    const name = `confirm_once_batched_researcher_${++serverCounter}`;
    const caller = await arrange(host, async (on) => {
      await on.registerAgentTool({ ...ISOLATED_AGENT, id: name });
    });
    const observer = observeHitl(host.getEventEmitter());
    await settle(caller.executeTool(name, { task: "go" }, { timeout: 700 }));
    const pending = observer.cards.filter((id) =>
      host.hasPendingHITLConfirmation(id),
    ).length;
    assert(observer.cards.length >= 1, "the worker's call raised no card");
    assertCount(pending, 0, "a card was still waiting after the call ended");
    assertCount(
      observer.cancelled.length,
      observer.cards.length,
      "not every card the ended call raised was withdrawn",
    );
    for (const id of observer.cards) {
      observer.answer(id, true);
    }
    await delay(800);
    assertCount(executions, 0, "a late approval ran the tool");
  } finally {
    if (savedTimeout === undefined) {
      delete process.env.MCP_TOOL_TIMEOUT;
    } else {
      process.env.MCP_TOOL_TIMEOUT = savedTimeout;
    }
    standIn.restore();
    await standIn.close();
  }
};

const WORKER_BATCHER = { mcp: { batcher: { enabled: true, maxWaitMs: 10 } } };

await test("with the batcher on, an agent tool's worker card does not outlive the call, and a late approval runs nothing", () =>
  runBatchedAgentTool(async (host, register) => {
    await register(host);
    return host;
  }));

await test("with the batcher on, an agent tool another instance on the registry registered is not batched by the host", () =>
  runBatchedAgentTool(async (host, register) => {
    await register(host.createWorkerInstance({ logTag: "registers" }));
    return host;
  }));

await test("with the batcher on, an agent tool registered after a worker was created is not batched by that worker", () =>
  runBatchedAgentTool(async (host, register) => {
    const worker = host.createWorkerInstance({
      logTag: "calls",
      config: WORKER_BATCHER,
    });
    await register(host);
    return worker;
  }));

await test("with the batcher on, an agent tool is not batched by an instance built on the host's registry", () =>
  runBatchedAgentTool(async (host, register) => {
    await register(host);
    return new NeuroLink({
      toolRegistry: host.getToolRegistry(),
      ...WORKER_BATCHER,
    });
  }));

// ---------------------------------------------------------------------------
// The manager the tool registry holds confirms registered and built-in calls
// ---------------------------------------------------------------------------

/**
 * An instance with HITL of its own whose rule does not match `fixture_write`,
 * and a second enabled manager whose rule does, installed on the instance's
 * tool registry with the public `setHITLManager`. The registry's manager is
 * the one its inline check has always asked, so it is the one that confirms;
 * the instance's own manager raises no card.
 */
const createSwappedRegistryManagerFixture = (
  options: { batcher?: boolean } = {},
): {
  neurolink: NeuroLink;
  own: HitlObserver;
  registry: HitlObserver;
  executions: () => number;
} => {
  const neurolink = new NeuroLink({
    hitl: { enabled: true, dangerousActions: ["delete"], timeout: 15000 },
    ...(options.batcher
      ? { mcp: { batcher: { enabled: true, maxWaitMs: 10 } } }
      : {}),
  });
  const registryManager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: 15000,
  });
  neurolink.getToolRegistry().setHITLManager(registryManager);
  let executions = 0;
  neurolink.registerTool("fixture_write", {
    name: "fixture_write",
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      executions++;
      return "fixture executed";
    },
  });
  return {
    neurolink,
    own: observeHitl(neurolink.getEventEmitter()),
    registry: observeHitl(registryManager),
    executions: () => executions,
  };
};

await test("with HITL of its own, a registered tool is confirmed by the manager its tool registry holds: once, nothing before approval, once after", async () => {
  const fixture = createSwappedRegistryManagerFixture();
  let runsAtAnswer: number | undefined;
  fixture.registry.onCard((id) =>
    setTimeout(() => {
      runsAtAnswer = fixture.executions();
      fixture.registry.answer(id, true);
    }, 300),
  );
  const outcome = await settle(
    fixture.neurolink.executeTool("fixture_write", {}),
  );
  await delay(100);
  assertCount(
    fixture.registry.cards.length,
    1,
    "the registry's manager was not asked exactly once",
  );
  assertCount(
    fixture.own.cards.length,
    0,
    "the instance's own manager raised a card",
  );
  assertCount(runsAtAnswer, 0, "the tool ran before approval");
  assert(outcome.error === undefined, "the approved call threw");
  assert(!isRefused(outcome.result), "the approved call was refused");
  assertCount(
    fixture.executions(),
    1,
    "the approved tool did not run exactly once",
  );

  const denied = createSwappedRegistryManagerFixture();
  denied.registry.onCard((id) => denied.registry.answer(id, false));
  const deniedResult = await denied.neurolink.executeTool("fixture_write", {});
  assert(isRefused(deniedResult), "a denied call was reported as success");
  assertCount(
    denied.registry.cards.length,
    1,
    "the denied call was not asked exactly once",
  );
  assertCount(denied.executions(), 0, "a denied tool ran");
});

await test("with HITL of its own and the batcher on, a call the registry's manager must confirm is not batched", async () => {
  // The batch timer is max(5000, MCP_TOOL_TIMEOUT): pin it to its 5s floor.
  // A batched call would be told it timed out at 5s while its card was open.
  const previous = process.env.MCP_TOOL_TIMEOUT;
  process.env.MCP_TOOL_TIMEOUT = "1";
  try {
    const fixture = createSwappedRegistryManagerFixture({ batcher: true });
    let settledAt: number | undefined;
    const call = settle(
      fixture.neurolink.executeTool("fixture_write", {}),
    ).finally(() => {
      settledAt = Date.now();
    });
    assert(
      await waitFor(() => fixture.registry.cards.length === 1, 1000),
      "the registry's manager raised no card",
    );
    await delay(5600);
    assert(
      settledAt === undefined,
      "the caller was told the call ended while its card was still open",
    );
    assertCount(
      fixture.executions(),
      0,
      "the tool ran while its card was unanswered",
    );
    fixture.registry.answer(fixture.registry.cards[0], true);
    const outcome = await call;
    assert(outcome.error === undefined, "the approved call threw");
    assert(!isRefused(outcome.result), "the approved call was refused");
    await delay(100);
    assertCount(fixture.executions(), 1, "the approved tool did not run once");
    assertCount(
      fixture.registry.cards.length,
      1,
      "the call raised more than one card",
    );
    assertCount(
      fixture.own.cards.length,
      0,
      "the instance's own manager raised a card",
    );
  } finally {
    if (previous === undefined) {
      delete process.env.MCP_TOOL_TIMEOUT;
    } else {
      process.env.MCP_TOOL_TIMEOUT = previous;
    }
  }
});

/**
 * A fresh tool root and an Anthropic stand-in whose model calls `writeFile`
 * once inside it. `turn` runs one model turn on the instance it is given, so
 * a case can build one instance, or a host and its workers, from `tools`.
 */
const createWriteTurnFixture = async (): Promise<{
  tools: { fileRoots: string[] };
  written: () => boolean;
  writtenContent: () => string;
  turn: (runner: NeuroLink) => Promise<Settled>;
  close: () => Promise<void>;
}> => {
  const root = mkdtempSync(join(tmpdir(), "hitl-two-managers-"));
  const target = join(root, "two-managers.txt");
  const standIn = await startAnthropicToolStandIn("writeFile", {
    path: target,
    content: "written once",
    mode: "append",
  });
  return {
    tools: { fileRoots: [root] },
    written: () => existsSync(target),
    writtenContent: () =>
      existsSync(target) ? readFileSync(target, "utf8") : "",
    turn: (runner) =>
      settle(
        (async () => {
          const { stream } = await runner.stream({
            input: { text: "use the tool" },
            provider: "anthropic",
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 32,
            maxSteps: 3,
            disableTools: false,
            disableInternalFallback: true,
          });
          for await (const chunk of stream) {
            void chunk;
          }
        })(),
      ),
    close: async () => {
      standIn.restore();
      await standIn.close();
      rmSync(root, { recursive: true, force: true });
    },
  };
};

await test("with HITL of its own, a built-in writeFile is confirmed by the manager its tool registry holds: once, nothing written before approval, written once after", async () => {
  const fixture = await createWriteTurnFixture();
  try {
    const neurolink = new NeuroLink({
      tools: fixture.tools,
      hitl: {
        enabled: true,
        dangerousActions: ["delete"],
        timeout: 5000,
        confirmBuiltinTools: false,
      },
    });
    const registryManager = new HITLManager({
      enabled: true,
      dangerousActions: ["write"],
      timeout: 5000,
    });
    neurolink.getToolRegistry().setHITLManager(registryManager);
    const own = observeHitl(neurolink.getEventEmitter());
    const registry = observeHitl(registryManager);
    let writtenAtAnswer: boolean | undefined;
    registry.onCard((id) =>
      setTimeout(() => {
        writtenAtAnswer = fixture.written();
        registry.answer(id, true);
      }, 300),
    );
    await fixture.turn(neurolink);
    await delay(100);
    assertCount(
      registry.cards.length,
      1,
      "the registry's manager did not confirm the built-in call once",
    );
    assertCount(
      own.cards.length,
      0,
      "the instance's own manager raised a card",
    );
    assertEqual(writtenAtAnswer, false, "the file was written before approval");
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the approved write did not happen exactly once",
    );
  } finally {
    await fixture.close();
  }
});

await test("a worker with HITL of its own takes over the shared registry's manager: the host's built-in writeFile is confirmed by the worker's manager", async () => {
  const fixture = await createWriteTurnFixture();
  try {
    const host = new NeuroLink({
      tools: fixture.tools,
      hitl: {
        enabled: true,
        dangerousActions: ["delete"],
        timeout: 5000,
        confirmBuiltinTools: false,
      },
    });
    const hostCards = observeHitl(host.getEventEmitter());
    const worker = host.createWorkerInstance({
      config: {
        hitl: { enabled: true, dangerousActions: ["delete"], timeout: 5000 },
      },
    });
    const workerCards = observeHitl(worker.getEventEmitter());
    workerCards.onCard((id) =>
      setTimeout(() => workerCards.answer(id, false), 100),
    );
    await fixture.turn(host);
    await delay(150);
    assertCount(
      workerCards.cards.length,
      1,
      "the registry's manager (the worker's) did not confirm the host's writeFile once",
    );
    assertCount(
      hostCards.cards.length,
      0,
      "the host's own manager raised a card",
    );
    assert(!fixture.written(), "a denied write happened");
  } finally {
    await fixture.close();
  }
});

await test("a worker with HITL of its own that opted out of always-confirm takes over the shared registry's manager: the host's built-in writeFile follows that manager's rule, as on release", async () => {
  const fixture = await createWriteTurnFixture();
  try {
    const host = new NeuroLink({
      tools: fixture.tools,
      hitl: { enabled: true, dangerousActions: ["delete"], timeout: 5000 },
    });
    const hostCards = observeHitl(host.getEventEmitter());
    hostCards.onCard((id) =>
      setTimeout(() => hostCards.answer(id, false), 100),
    );
    const worker = host.createWorkerInstance({
      config: {
        hitl: {
          enabled: true,
          dangerousActions: ["delete"],
          timeout: 5000,
          confirmBuiltinTools: false,
        },
      },
    });
    const workerCards = observeHitl(worker.getEventEmitter());
    workerCards.onCard((id) =>
      setTimeout(() => workerCards.answer(id, false), 100),
    );
    await fixture.turn(host);
    await delay(150);
    assertCount(
      hostCards.cards.length,
      0,
      "the host's own manager raised a card",
    );
    assertCount(
      workerCards.cards.length,
      0,
      "the registry's manager asked although its rule does not match",
    );
    assertEqual(
      fixture.writtenContent(),
      "written once",
      "the write the registry's manager does not gate did not run exactly once",
    );
  } finally {
    await fixture.close();
  }
});

await test("a worker with HITL of its own takes over the shared registry's manager, and the host and a later worker are confirmed by it", async () => {
  const host = new NeuroLink({
    hitl: { enabled: true, dangerousActions: ["delete"], timeout: 5000 },
  });
  const hostCards = observeHitl(host.getEventEmitter());
  const owner = host.createWorkerInstance({
    config: {
      hitl: {
        enabled: true,
        dangerousActions: ["fixture_write"],
        timeout: 5000,
      },
    },
  });
  const ownerCards = observeHitl(owner.getEventEmitter());
  const later = host.createWorkerInstance();
  let executions = 0;
  host.registerTool("fixture_write", {
    name: "fixture_write",
    description: "Harmless local HITL fixture",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      executions++;
      return "fixture executed";
    },
  });
  const runsAtAnswer: number[] = [];
  ownerCards.onCard((id) =>
    setTimeout(() => {
      runsAtAnswer.push(executions);
      ownerCards.answer(id, true);
    }, 200),
  );
  for (const [label, runner] of [
    ["host", host],
    ["later worker", later],
  ] as const) {
    const before = executions;
    const cardsBefore = ownerCards.cards.length;
    const outcome = await settle(
      runner.executeTool("fixture_write", {}, { bypassBatcher: true }),
    );
    assertCount(
      ownerCards.cards.length - cardsBefore,
      1,
      `the ${label}'s call was not confirmed once by the registry's manager`,
    );
    assert(outcome.error === undefined, `the ${label}'s approved call threw`);
    assert(
      !isRefused(outcome.result),
      `the ${label}'s approved call was refused`,
    );
    assertCount(
      runsAtAnswer[runsAtAnswer.length - 1],
      before,
      `the ${label}'s tool ran before approval`,
    );
    assertCount(
      executions,
      before + 1,
      `the ${label}'s approved tool did not run exactly once`,
    );
  }
  assertCount(
    ownerCards.cards.length,
    2,
    "the registry's manager did not confirm each call once",
  );
  assertCount(
    hostCards.cards.length,
    0,
    "the host's own manager raised a card",
  );
});

// ---------------------------------------------------------------------------
// A stream's error fallback follows the call's tool options
// ---------------------------------------------------------------------------

/**
 * A stream whose primary fails at setup, on an instance with an external
 * MCP server (the fixture's `search_code`). Records, per model request,
 * whether the model was offered any tool and whether it was offered
 * `search_code`; a request offered it asks to call it.
 */
const runErrorFallbackWithExternalTool = async (
  callOptions: Record<string, unknown>,
  hitl?: { dangerousActions: string[]; timeout: number },
): Promise<{
  offered: Array<{ any: boolean; searchCode: boolean }>;
  cards: number;
  serverCalls: number;
}> => {
  const event = (name: string, payload: Record<string, unknown>) =>
    `event: ${name}\ndata: ${JSON.stringify({ type: name, ...payload })}\n\n`;
  const turn = (blocks: string, reason: string) =>
    event("message_start", {
      message: { id: "msg", usage: { input_tokens: 5, output_tokens: 0 } },
    }) +
    blocks +
    event("message_delta", {
      delta: { stop_reason: reason },
      usage: { output_tokens: 4 },
    }) +
    event("message_stop", {});
  const toolTurn = turn(
    event("content_block_start", {
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_s",
        name: "search_code",
        input: {},
      },
    }) +
      event("content_block_delta", {
        index: 0,
        delta: { type: "input_json_delta", partial_json: '{"echo":"fb"}' },
      }) +
      event("content_block_stop", { index: 0 }),
    "tool_use",
  );
  const textTurn = turn(
    event("content_block_start", {
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
      event("content_block_delta", {
        index: 0,
        delta: { type: "text_delta", text: "done" },
      }) +
      event("content_block_stop", { index: 0 }),
    "end_turn",
  );
  const offered: Array<{ any: boolean; searchCode: boolean }> = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      const body = readRecord(
        (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return {};
          }
        })(),
      );
      const names = Array.isArray(body.tools)
        ? body.tools.map((t) => String(readRecord(t).name ?? ""))
        : [];
      const searchCode = names.includes("search_code");
      offered.push({ any: names.length > 0, searchCode });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(searchCode && !raw.includes("tool_result") ? toolTurn : textTurn);
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  const saved = new Map(
    ["ANTHROPIC_API_KEY", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_METHOD"].map(
      (key) => [key, process.env[key]],
    ),
  );
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  const serverId = `hitl-error-fallback-${process.pid}-${++serverCounter}`;
  const neurolink = new NeuroLink(
    hitl ? { hitl: { enabled: true, ...hitl } } : {},
  );
  const observer = observeHitl(neurolink.getEventEmitter());
  try {
    const added = await neurolink.addExternalMCPServer(serverId, {
      id: serverId,
      name: serverId,
      description: "Error fallback fixture",
      transport: "stdio",
      status: "initializing",
      tools: [],
      command: process.execPath,
      args: [FIXTURE],
    });
    assert(added.success, "fixture server failed to connect");
    await settle(
      (async () => {
        const { stream } = await neurolink.stream({
          input: { text: "search" },
          provider: "anthropic",
          model: "claude-3-5-sonnet-20241022",
          maxTokens: 32,
          maxSteps: 3,
          executionControl: { requestTimeoutMs: 0 },
          ...callOptions,
        });
        for await (const chunk of stream) {
          void chunk;
        }
      })(),
    );
    await delay(200);
    return {
      offered,
      cards: observer.cards.length,
      serverCalls:
        neurolink.getExternalMCPServer(serverId)?.metrics.totalToolCalls ?? 0,
    };
  } finally {
    await neurolink.shutdownExternalMCPServers();
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
};

await test("a stream with disableTools that falls back after a setup failure offers the fallback no tools", async () => {
  const outcome = await runErrorFallbackWithExternalTool({
    disableTools: true,
  });
  assert(outcome.offered.length >= 1, "the fallback made no model request");
  assert(
    outcome.offered.every((r) => !r.any),
    "the fallback was offered tools though the call disabled them",
  );
  assertCount(outcome.serverCalls, 0, "an external tool ran");
});

await test("a stream that falls back after a setup failure still has its external tools confirmed by the rule", async () => {
  const outcome = await runErrorFallbackWithExternalTool(
    {},
    { dangerousActions: ["search"], timeout: 600 },
  );
  assert(
    outcome.offered.some((r) => r.searchCode),
    "the fallback was not offered the instance's external tool",
  );
  assertCount(outcome.cards, 1, "the external tool was not confirmed once");
  assertCount(outcome.serverCalls, 0, "an unapproved external tool ran");
});

// ---------------------------------------------------------------------------
// The Gemini loops' per-turn dedup of identical calls
// ---------------------------------------------------------------------------

/**
 * An AI Studio (Gemini SSE) stand-in: the first `repeats` requests ask for
 * the same call to `toolName` with the same arguments, every later one
 * answers with text.
 */
const startGeminiRepeatStandIn = async (
  toolName: string,
  args: Record<string, unknown>,
  repeats: number,
): Promise<{
  port: number;
  requests: () => number;
  close: () => Promise<void>;
}> => {
  const sse = (parts: unknown[]): string =>
    `data: ${JSON.stringify({
      candidates: [
        { content: { parts, role: "model" }, finishReason: "STOP", index: 0 },
      ],
      usageMetadata: {
        promptTokenCount: 5,
        candidatesTokenCount: 4,
        totalTokenCount: 9,
      },
    })}\r\n\r\n`;
  let requests = 0;
  const server = createServer((req, res) => {
    req.on("data", () => undefined);
    req.on("end", () => {
      requests++;
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.end(
        requests <= repeats
          ? sse([{ functionCall: { name: toolName, args } }])
          : sse([{ text: "done" }]),
      );
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const address = server.address();
  return {
    port: typeof address === "object" && address ? address.port : 0,
    requests: () => requests,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections();
        server.close(() => resolve());
      }),
  };
};

/**
 * One AI Studio stream turn in which the model makes the identical call to
 * `toolName` twice, every card denied. Returns the cards raised and the model
 * requests made.
 */
const denyIdenticalCallsInOneTurn = async (
  neurolink: NeuroLink,
  toolName: string,
  args: Record<string, unknown>,
): Promise<{ cards: number; requests: number }> => {
  const observer = observeHitl(neurolink.getEventEmitter());
  observer.onCard((id) => observer.answer(id, false));
  const standIn = await startGeminiRepeatStandIn(toolName, args, 2);
  try {
    await settle(
      (async () => {
        const { stream } = await neurolink.stream({
          input: { text: "use the tool" },
          provider: "google-ai",
          model: "gemini-2.0-flash",
          maxTokens: 32,
          maxSteps: 4,
          disableTools: false,
          disableInternalFallback: true,
          credentials: {
            googleAiStudio: {
              apiKey: "test-key",
              baseURL: `http://127.0.0.1:${standIn.port}`,
            },
          },
        });
        for await (const chunk of stream) {
          void chunk;
        }
      })(),
    );
    return { cards: observer.cards.length, requests: standIn.requests() };
  } finally {
    await standIn.close();
  }
};

await test("in one Gemini turn, a denied built-in call repeated with identical arguments asks again", async () => {
  const root = mkdtempSync(join(tmpdir(), "hitl-dedup-"));
  const target = join(root, "dedup.txt");
  try {
    const neurolink = new NeuroLink({
      tools: { fileRoots: [root] },
      hitl: { enabled: true, ...WRITE_HITL },
    });
    const { cards, requests } = await denyIdenticalCallsInOneTurn(
      neurolink,
      "writeFile",
      { path: target, content: "denied", mode: "append" },
    );
    assertCount(requests, 3, "the model did not make both calls in one turn");
    assertCount(
      cards,
      2,
      "the repeated call got the earlier refusal instead of a new card",
    );
    assert(!existsSync(target), "a denied write happened");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

await test("in one Gemini turn, a repeated call whose tool returned another call's refusal asks again", async () => {
  const fixture = createRegisteredFixture(5000);
  fixture.neurolink.registerTool("fixture_wrapper", {
    name: "fixture_wrapper",
    description: "Returns the result of a gated call",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () =>
      fixture.neurolink.executeTool(
        "fixture_write",
        {},
        { bypassBatcher: true },
      ),
  });
  const { cards, requests } = await denyIdenticalCallsInOneTurn(
    fixture.neurolink,
    "fixture_wrapper",
    { path: "/same" },
  );
  assertCount(requests, 3, "the model did not make both calls in one turn");
  assertCount(
    cards,
    2,
    "the repeated call got the earlier refusal instead of a new card",
  );
  assertCount(fixture.executions(), 0, "a denied tool ran");
});

await test("in one Gemini turn, a denied registered call repeated with identical arguments asks again", async () => {
  const fixture = createRegisteredFixture(5000);
  const { cards, requests } = await denyIdenticalCallsInOneTurn(
    fixture.neurolink,
    "fixture_write",
    { path: "/same" },
  );
  assertCount(requests, 3, "the model did not make both calls in one turn");
  assertCount(
    cards,
    2,
    "the repeated call got the earlier refusal instead of a new card",
  );
  assertCount(fixture.executions(), 0, "a denied tool ran");
});

await test("a nested refusal returned by an ungated tool is never cached: the identical outer call asks again", async () => {
  const fixture = createRegisteredFixture(5000);
  fixture.neurolink.registerTool("fixture_wrapper", {
    name: "fixture_wrapper",
    description: "Returns the result of a gated call",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () =>
      fixture.neurolink.executeTool(
        "fixture_write",
        { path: "/same" },
        { bypassBatcher: true },
      ),
  });
  let answers = 0;
  fixture.onCard((id) => fixture.answer(id, answers++ > 0));
  const first = await settle(
    fixture.neurolink.executeTool(
      "fixture_wrapper",
      {},
      { bypassBatcher: true },
    ),
  );
  assert(isRefused(first.result), "the first wrapped call was not refused");
  await settle(
    fixture.neurolink.executeTool(
      "fixture_wrapper",
      {},
      { bypassBatcher: true },
    ),
  );
  assertCount(
    fixture.cards.length,
    2,
    "the repeated outer call was answered from the cache instead of a new card",
  );
  assertCount(fixture.executions(), 1, "the approved repeat did not run once");
});

type DiscoveryAccess = {
  externalServerManager: {
    executeTool: (
      serverId: string,
      toolName: string,
      params: Record<string, unknown>,
      options: { hitlState?: unknown; signal?: AbortSignal },
    ) => Promise<unknown>;
  };
};

await test("a call cancelled after its confirmation is not sent and is not counted as a server error", () =>
  withExternalServer(5000, async (fixture) => {
    const controller = new AbortController();
    const manager = (fixture.neurolink as unknown as DiscoveryAccess)
      .externalServerManager;
    const call = settle(
      manager.executeTool(
        fixture.serverId,
        "search_code",
        { echo: "x" },
        { hitlState: { decision: "approved" }, signal: controller.signal },
      ),
    );
    controller.abort("cancelled after the decision");
    const outcome = await call;
    assert(outcome.error !== undefined, "the cancelled call was not rejected");
    assertCount(
      fixture.serverCalls(),
      0,
      "a cancelled call reached the server",
    );
    assertCount(
      fixture.neurolink.getExternalMCPServer(fixture.serverId)?.metrics
        .totalErrors,
      0,
      "the cancellation was counted as a server error",
    );
  }));

// ---------------------------------------------------------------------------
// Review follow-ups: cleanup, delivery order, breaker order, stream fallback
// ---------------------------------------------------------------------------
await test("cleanup() emits hitl:cancelled for every pending card and audits how many it cleared", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: 5000,
    auditLogging: true,
  });
  const observer = observeHitl(manager);
  const audits: Array<Record<string, unknown>> = [];
  manager.on("hitl:audit", (event: unknown) => {
    audits.push(readRecord(event));
  });
  const first = settle(manager.requestConfirmation("fixture_write", {}));
  const second = settle(manager.requestConfirmation("fixture_write", {}));
  assertCount(observer.cards.length, 2, "the two cards were not raised");
  manager.cleanup();
  const [a, b] = await Promise.all([first, second]);
  assert(
    a.error !== undefined && b.error !== undefined,
    "cleanup left a call waiting",
  );
  assertCount(
    observer.cancelled.length,
    2,
    "cleanup did not emit hitl:cancelled per card",
  );
  assertEqual(
    [...observer.cancelled.map((event) => String(event.confirmationId))]
      .sort()
      .join(","),
    [...observer.cards].sort().join(","),
    "hitl:cancelled did not name the cleared cards",
  );
  const cleanupAudit = audits
    .map((entry) => readRecord(readRecord(entry).details ?? entry))
    .find((entry) => entry.clearedConfirmations !== undefined);
  assertNotNull(cleanupAudit, "no manager-cleanup audit entry was emitted");
  assertCount(
    Number(cleanupAudit.clearedConfirmations),
    2,
    "the cleanup audit read the count after clearing",
  );
});

await test("an abort inside an early request listener delivers hitl:cancelled after every request listener", async () => {
  const manager = new HITLManager({
    enabled: true,
    dangerousActions: ["fixture_write"],
    timeout: 5000,
  });
  const order: string[] = [];
  const controller = new AbortController();
  manager.on("hitl:confirmation-request", () => {
    order.push("request:early");
    controller.abort("turn cancelled");
  });
  manager.on("hitl:confirmation-request", () => {
    order.push("request:late");
  });
  manager.on("hitl:cancelled", () => {
    order.push("cancelled");
  });
  const outcome = await settle(
    manager.requestConfirmation(
      "fixture_write",
      {},
      { signal: controller.signal },
    ),
  );
  assert(
    outcome.error instanceof HITLCancelledError,
    "the aborted request was not cancelled",
  );
  assertEqual(
    order.join(","),
    "request:early,request:late,cancelled",
    "hitl:cancelled was delivered before the later request listener saw the card",
  );
});

await test("an open breaker refuses the call before it asks the human", async () => {
  const neurolink = new NeuroLink({
    hitl: { enabled: true, dangerousActions: ["fixture_flaky"], timeout: 2000 },
  });
  const observer = observeHitl(neurolink.getEventEmitter());
  observer.onCard((id) => observer.answer(id, true));
  let executions = 0;
  neurolink.registerTool("fixture_flaky", {
    name: "fixture_flaky",
    description: "Always fails",
    inputSchema: { type: "object" as const, properties: {} },
    execute: async () => {
      executions++;
      throw new Error("boom");
    },
  });
  const breakerState = (): string | undefined =>
    Object.entries(neurolink.getToolCircuitBreakerStatus()).find(([key]) =>
      key.endsWith("fixture_flaky"),
    )?.[1].state;
  // One call creates the tool's breaker; its failures are then counted until
  // it opens, as a run of failing calls would.
  await settle(
    neurolink.executeTool(
      "fixture_flaky",
      {},
      { maxRetries: 0, bypassBatcher: true },
    ),
  );
  const breakers = Reflect.get(neurolink, "toolCircuitBreakers");
  assert(breakers instanceof Map, "the tool breaker map is not reachable");
  for (const breaker of breakers.values()) {
    for (let i = 0; i < 10; i++) {
      await settle(
        Promise.resolve(
          breaker.execute(() => Promise.reject(new Error("boom"))),
        ),
      );
    }
  }
  assertEqual(
    breakerState(),
    "open",
    "the breaker never opened, so the control measured nothing",
  );
  const cardsBefore = observer.cards.length;
  const executionsBefore = executions;
  const outcome = await settle(
    neurolink.executeTool(
      "fixture_flaky",
      {},
      { maxRetries: 0, bypassBatcher: true },
    ),
  );
  assertCount(
    observer.cards.length - cardsBefore,
    0,
    "an open breaker still raised a card",
  );
  assertCount(executions - executionsBefore, 0, "an open breaker ran the tool");
  assert(
    outcome.error !== undefined ||
      isRefused(outcome.result) ||
      readRecord(outcome.result).isError === true,
    "an open breaker did not refuse the call",
  );
});

await test("a stream-error fallback forwards maxSteps, toolTimeoutMs, turnTimeoutMs and timeout", async () => {
  const seen: Array<Record<string, unknown>> = [];
  const fallbackProvider = {
    setupToolExecutor: () => undefined,
    setFileToolRootPolicy: () => undefined,
    stream: async (options: unknown) => {
      seen.push(readRecord(options));
      return {
        stream: (async function* () {
          yield { content: "ok" };
        })(),
      };
    },
  };
  const neurolink = new NeuroLink();
  const original = Reflect.get(NeuroLink.prototype, "handleStreamError");
  assert(
    typeof original === "function",
    "NeuroLink.handleStreamError is not reachable",
  );
  const providerModule = await import("../dist/index.js");
  const factory = readRecord(providerModule).AIProviderFactory as
    | { createProvider: (...args: unknown[]) => Promise<unknown> }
    | undefined;
  assertNotNull(factory, "AIProviderFactory is not exported");
  const savedCreate = factory.createProvider;
  factory.createProvider = async () => fallbackProvider;
  try {
    await Reflect.apply(original, neurolink, [
      new Error("primary failed"),
      {
        input: { text: "hi" },
        provider: "anthropic",
        maxSteps: 7,
        toolTimeoutMs: 1234,
        turnTimeoutMs: 5678,
        timeout: 4321,
      },
      Date.now(),
      "fallback-test-stream",
    ]);
  } finally {
    factory.createProvider = savedCreate;
  }
  assertCount(seen.length, 1, "the fallback provider was not asked to stream");
  assertEqual(
    seen[0].maxSteps,
    7,
    "maxSteps was not forwarded to the fallback",
  );
  assertEqual(
    seen[0].toolTimeoutMs,
    1234,
    "toolTimeoutMs was not forwarded to the fallback",
  );
  assertEqual(
    seen[0].turnTimeoutMs,
    5678,
    "turnTimeoutMs was not forwarded to the fallback",
  );
  assertEqual(
    seen[0].timeout,
    4321,
    "timeout was not forwarded to the fallback",
  );
});

await runSuite();
