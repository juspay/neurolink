#!/usr/bin/env tsx
/**
 * Continuous Test Suite: LiteLLM / chat-completions parity fixes (no API).
 *
 * Locks in the fixes from the LiteLLM tool-calling + timeout parity work:
 *
 *   Part 1 — Argument handling:
 *     - coerceType: recoverable mismatches ("123" → 123) coerce instead of fail
 *     - buildMCPSchemaValidator: MCP tools get a REAL argument validator (the
 *       AI SDK's jsonSchema() wrapper without one validates nothing)
 *     - ToolDiscoveryService.executeTool: coerces params before the wire call,
 *       rejects missing-required with a model-actionable contract message,
 *       and forwards the timeout as MCP RequestOptions (the SDK's own 60s
 *       default otherwise overrides any larger configured value)
 *
 *   Part 2 — Timeout / abort hygiene:
 *     - isTransientNetworkError: unwraps undici's `error.cause` chain
 *       (TypeError "fetch failed" hid every retryable connection death)
 *     - mergeAbortSignals: no longer leaks one listener per call onto
 *       long-lived caller signals
 *     - composeAbortSignalsScoped: per-step composition with dispose(), so a
 *       multi-step agent loop doesn't accumulate abort listeners
 *
 *   Part 3 — Result parity:
 *     - formatEnhancedResult: stopReason ("completed" / "step-cap" /
 *       "time-limit") and stepsUsed are now populated on the AI-SDK loop
 *       path, matching the native Vertex/Bedrock loops
 *
 * No live AI; pure src-level tests. Run:
 *   npx tsx test/continuous-test-suite-litellm-parity.ts
 *   pnpm run test:litellm-parity
 */
import { getEventListeners } from "node:events";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { defineSuite, assertEqual, assert } from "./helpers/harness.js";
import { coerceType } from "../src/lib/utils/toolCallRepair.js";
import { buildMCPSchemaValidator } from "../src/lib/core/modules/ToolsManager.js";
import {
  GenerationHandler,
  resolveTurnBudget,
} from "../src/lib/core/modules/GenerationHandler.js";
import { ToolDiscoveryService } from "../src/lib/mcp/toolDiscoveryService.js";
import { isTransientNetworkError } from "../src/lib/proxy/proxyFetch.js";
import {
  composeAbortSignalsScoped,
  mergeAbortSignals,
} from "../src/lib/utils/timeout.js";
import {
  clearRuntimeContextWindows,
  clearRuntimeOutputCeilings,
  getContextWindowSize,
  registerRuntimeContextWindow,
  registerRuntimeOutputCeiling,
} from "../src/lib/constants/contextWindows.js";
import { parseProviderOverflowDetails } from "../src/lib/context/errorDetection.js";
import { OpenAIChatCompletionsProvider } from "../src/lib/providers/openaiChatCompletionsBase.js";
import { buildWireToolNameMaps } from "../src/lib/providers/openaiChatCompletionsClient.js";
import { normalizeWireToolSchema } from "../src/lib/utils/schemaConversion.js";
import type {
  AIProviderName,
  OpenAICompatChatMessage,
  OpenAICompatChatRequest,
} from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("LiteLLM parity (tools + timeouts)");

// ---------------------------------------------------------------------------
// Part 1 — Argument handling
// ---------------------------------------------------------------------------

await test("coerceType recovers the GLM-typical mismatches", () => {
  assertEqual(coerceType("123", { type: "number" }), 123, "numeric string");
  assertEqual(coerceType("42", { type: "integer" }), 42, "integer string");
  assertEqual(coerceType("true", { type: "boolean" }), true, "boolean string");
  assertEqual(
    (coerceType('{"a":1}', { type: "object" }) as { a: number }).a,
    1,
    "JSON-encoded object",
  );
  assertEqual(coerceType("abc", { type: "number" }), "abc", "unrecoverable");
});

await test("buildMCPSchemaValidator validates and speaks the contract", async () => {
  const validate = await buildMCPSchemaValidator("pull_request_read", {
    type: "object",
    properties: {
      owner: { type: "string" },
      pullNumber: { type: "number" },
    },
    required: ["pullNumber"],
  });
  assert(validate !== undefined, "validator compiled");
  const ok = validate!({ owner: "juspay", pullNumber: 7 });
  assertEqual(ok.success, true, "valid args pass");

  const missing = validate!({ owner: "juspay" });
  assertEqual(missing.success, false, "missing required rejected");
  const msg = (missing as { error: Error }).error.message;
  assert(msg.includes("pullNumber"), "names the offending field");
  assert(msg.includes("Expected: {"), "restates the contract for the model");
  assert(
    /required property/i.test(msg),
    "root-level required error surfaced in details (not just the contract)",
  );

  const wrongType = validate!({ pullNumber: "seven" });
  assertEqual(wrongType.success, false, "un-coercible type rejected");
});

/** Minimal fake MCP client capturing what executeTool puts on the wire. */
function makeFakeClientWithSchema(
  capture: { args?: unknown; requestOptions?: unknown },
  inputSchema: Record<string, unknown>,
): Client {
  return {
    listTools: async () => ({
      tools: [
        {
          name: "pull_request_read",
          description: "Read a PR",
          inputSchema,
        },
      ],
    }),
    callTool: async (
      params: { arguments?: unknown },
      _schema: unknown,
      options?: unknown,
    ) => {
      capture.args = params.arguments;
      capture.requestOptions = options;
      return { content: [{ type: "text", text: "ok" }] };
    },
  } as unknown as Client;
}

function makeFakeClient(capture: {
  args?: unknown;
  requestOptions?: unknown;
}): Client {
  return makeFakeClientWithSchema(capture, {
    type: "object",
    properties: {
      pullNumber: { type: "number" },
      owner: { type: "string" },
    },
    required: ["pullNumber"],
  });
}

await test("executeTool coerces params and forwards RequestOptions.timeout", async () => {
  const service = new ToolDiscoveryService();
  const capture: { args?: unknown; requestOptions?: unknown } = {};
  const client = makeFakeClient(capture);
  const discovery = await service.discoverTools("parity-server-a", client);
  assertEqual(discovery.success, true, "fake discovery succeeds");

  const result = await service.executeTool(
    "pull_request_read",
    "parity-server-a",
    client,
    { pullNumber: "123" },
    { timeout: 120_000 },
  );
  assertEqual(result.success, true, "coerced call executes");
  assertEqual(
    (capture.args as { pullNumber: unknown }).pullNumber,
    123,
    "numeric string coerced to number before the wire call",
  );
  assertEqual(
    (capture.requestOptions as { timeout?: number })?.timeout,
    120_000,
    "timeout forwarded as MCP RequestOptions (SDK default no longer caps it)",
  );
});

await test("executeTool missing-required error restates the contract", async () => {
  const service = new ToolDiscoveryService();
  const capture: { args?: unknown; requestOptions?: unknown } = {};
  const client = makeFakeClient(capture);
  await service.discoverTools("parity-server-b", client);

  const result = await service.executeTool(
    "pull_request_read",
    "parity-server-b",
    client,
    { owner: "juspay" },
    {},
  );
  assertEqual(result.success, false, "missing required param rejected");
  assert(
    (result.error ?? "").includes("Missing required parameter: pullNumber"),
    "names the missing parameter",
  );
  assert(
    (result.error ?? "").includes("Expected arguments: {"),
    "includes the full contract so the model's retry can succeed",
  );
  assert(
    (result.error ?? "").includes("received keys: [owner]"),
    "echoes what was actually sent",
  );
});

await test("executeTool rejects un-coercible integer params", async () => {
  const service = new ToolDiscoveryService();
  const capture: { args?: unknown; requestOptions?: unknown } = {};
  const client = makeFakeClientWithSchema(capture, {
    type: "object",
    properties: { pullNumber: { type: "integer" } },
    required: ["pullNumber"],
  });
  await service.discoverTools("parity-server-c", client);

  const coerced = await service.executeTool(
    "pull_request_read",
    "parity-server-c",
    client,
    { pullNumber: "42" },
    {},
  );
  assertEqual(coerced.success, true, "integer string coerces and executes");
  assertEqual(
    (capture.args as { pullNumber: unknown }).pullNumber,
    42,
    "coerced to a real integer on the wire",
  );

  const fractional = await service.executeTool(
    "pull_request_read",
    "parity-server-c",
    client,
    { pullNumber: 3.7 },
    {},
  );
  assertEqual(fractional.success, false, "fractional integer rejected");
  assert(
    (fractional.error ?? "").includes("must be an integer"),
    "integer mismatch is named, not silently forwarded",
  );
});

// ---------------------------------------------------------------------------
// Part 2 — Timeout / abort hygiene
// ---------------------------------------------------------------------------

await test("isTransientNetworkError unwraps undici cause chains", () => {
  assert(
    isTransientNetworkError({ code: "ECONNRESET" }),
    "top-level code still recognized",
  );
  const fetchFailed = new TypeError("fetch failed");
  (fetchFailed as TypeError & { cause?: unknown }).cause = {
    code: "UND_ERR_SOCKET",
    message: "other side closed",
  };
  assert(isTransientNetworkError(fetchFailed), "undici wrapper unwrapped");

  const nested = new TypeError("fetch failed");
  (nested as TypeError & { cause?: unknown }).cause = new Error("connect", {
    cause: { code: "ECONNREFUSED" },
  });
  assert(isTransientNetworkError(nested), "two-level cause chain unwrapped");

  const headersTimeout = new TypeError("fetch failed");
  (headersTimeout as TypeError & { cause?: unknown }).cause = {
    code: "UND_ERR_HEADERS_TIMEOUT",
  };
  assertEqual(
    isTransientNetworkError(headersTimeout),
    false,
    "headers-timeout deliberately NOT retried (already waited ~300s)",
  );
  assertEqual(
    isTransientNetworkError(new Error("boom")),
    false,
    "ordinary errors not retried",
  );
});

await test("mergeAbortSignals forwards aborts without leaking listeners", async () => {
  const source = new AbortController();
  const merged = mergeAbortSignals([source.signal, undefined]);
  assertEqual(merged.signal.aborted, false, "not aborted initially");
  source.abort(new Error("stop"));
  await new Promise((r) => setTimeout(r, 0));
  assertEqual(merged.signal.aborted, true, "abort forwarded");

  const longLived = new AbortController();
  for (let i = 0; i < 25; i++) {
    mergeAbortSignals([longLived.signal]);
  }
  assertEqual(
    getEventListeners(longLived.signal, "abort").length,
    0,
    "25 merges add zero plain listeners to the long-lived source",
  );

  const preAborted = new AbortController();
  preAborted.abort();
  const mergedPre = mergeAbortSignals([preAborted.signal]);
  assertEqual(mergedPre.signal.aborted, true, "pre-aborted source propagates");
});

await test("composeAbortSignalsScoped dispose() detaches step listeners", async () => {
  const outer = new AbortController();
  const timeout = new AbortController();

  // Simulate a 12-step loop: every step composes and disposes.
  for (let i = 0; i < 12; i++) {
    const { signal, dispose } = composeAbortSignalsScoped(
      outer.signal,
      timeout.signal,
    );
    assert(signal !== undefined, "composed signal exists");
    dispose();
  }
  assertEqual(
    getEventListeners(outer.signal, "abort").length,
    0,
    "no listeners left on the outer signal after 12 disposed steps",
  );

  // Abort still propagates while a step is live.
  const live = composeAbortSignalsScoped(outer.signal, timeout.signal);
  outer.abort(new Error("outer stop"));
  assertEqual(live.signal!.aborted, true, "abort forwards to the live step");
  live.dispose();

  const single = composeAbortSignalsScoped(undefined, timeout.signal);
  assertEqual(
    single.signal,
    timeout.signal,
    "single-signal case passes through without wrapping",
  );
});

// ---------------------------------------------------------------------------
// Part 3 — Result parity (stopReason / stepsUsed)
// ---------------------------------------------------------------------------

function makeHandler(): GenerationHandler {
  return new GenerationHandler(
    "litellm" as AIProviderName,
    "glm-private",
    () => true,
    () => undefined,
    async () => {},
  );
}

type FakeGenerateResult = Parameters<
  GenerationHandler["formatEnhancedResult"]
>[0];

function fakeResult(overrides: Record<string, unknown>): FakeGenerateResult {
  return {
    text: "answer",
    finishReason: "stop",
    usage: {},
    toolCalls: [],
    toolResults: [],
    steps: [{}, {}],
    ...overrides,
  } as unknown as FakeGenerateResult;
}

await test("formatEnhancedResult reports completed + stepsUsed", () => {
  const result = makeHandler().formatEnhancedResult(
    fakeResult({}),
    {},
    [],
    [],
    {},
  );
  assertEqual(result.stepsUsed, 2, "stepsUsed from AI-SDK steps array");
  assertEqual(result.stopReason, "completed", "natural finish → completed");
});

await test("formatEnhancedResult reports step-cap at the step ceiling", () => {
  const result = makeHandler().formatEnhancedResult(
    fakeResult({ steps: [{}, {}, {}], finishReason: "tool-calls" }),
    {},
    [],
    [],
    { maxSteps: 3 },
  );
  assertEqual(result.stepsUsed, 3, "all steps consumed");
  assertEqual(
    result.stopReason,
    "step-cap",
    "loop ended mid-tool-call at maxSteps → step-cap",
  );
});

await test("formatEnhancedResult reports time-limit after forced wrap-up", () => {
  const generateResult = fakeResult({});
  Object.defineProperty(generateResult, "__nlTurnWrapup", {
    value: true,
    enumerable: false,
  });
  const result = makeHandler().formatEnhancedResult(
    generateResult,
    {},
    [],
    [],
    {},
  );
  assertEqual(
    result.stopReason,
    "time-limit",
    "wrap-up marker → time-limit, matching the native loops",
  );
});

await test("formatEnhancedResult reports provider-error on an error finish", () => {
  const result = makeHandler().formatEnhancedResult(
    fakeResult({ finishReason: "error" }),
    {},
    [],
    [],
    {},
  );
  assertEqual(
    result.stopReason,
    "provider-error",
    "error finish → provider-error, matching resolveTurnStopReason; never 'completed' and never undefined",
  );
});

await test("composeAbortSignalsScoped self-cleans when a source aborts", () => {
  const outer = new AbortController();
  const stepTimeout = new AbortController();
  const composed = composeAbortSignalsScoped(outer.signal, stepTimeout.signal);
  stepTimeout.abort(new Error("step timeout"));
  assertEqual(composed.signal!.aborted, true, "abort forwarded");
  assertEqual(
    getEventListeners(outer.signal, "abort").length,
    0,
    "listener on the OTHER source detached at abort time, without dispose()",
  );
  composed.dispose(); // still safe to call after self-clean
});

// ---------------------------------------------------------------------------
// Part 4 — Dynamic model limits + wire hygiene
// ---------------------------------------------------------------------------

await test("parseProviderOverflowDetails parses the vllm/LiteLLM phrasing", () => {
  const message =
    "litellm.ContextWindowExceededError: litellm.BadRequestError: " +
    'ContextWindowExceededError: Hosted_vllmException - {"error":{"message":' +
    "\"This model's maximum context length is 262144 tokens. However, you " +
    "requested 32000 output tokens and your prompt contains at least 230145 " +
    "input tokens, for a total of at least 262145 tokens. Please reduce the " +
    'length of the input prompt or the number of requested output tokens."}}';
  const details = parseProviderOverflowDetails(message);
  assert(details !== null, "vllm phrasing parsed");
  assertEqual(details!.budgetTokens, 262144, "window extracted");
  assertEqual(details!.actualTokens, 230145, "input tokens extracted");
  assertEqual(
    details!.requestedOutputTokens,
    32000,
    "requested output tokens extracted",
  );
});

await test("normalizeWireToolSchema inlines $defs and strips annotations", () => {
  const out = normalizeWireToolSchema({
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: {
      pr: { $ref: "#/$defs/PrRef" },
      note: { anyOf: [{ type: "string" }, { type: "null" }] },
    },
    required: ["pr"],
    $defs: { PrRef: { type: "number", description: "PR number" } },
  });
  const properties = out.properties as Record<string, Record<string, unknown>>;
  assertEqual(properties.pr.type, "number", "$defs ref inlined");
  assertEqual(properties.pr.description, "PR number", "description preserved");
  assert(!("$defs" in out), "$defs container removed after inlining");
  assert(!("$schema" in out), "$schema annotation stripped");
  assert(
    Array.isArray(properties.note.type) &&
      (properties.note.type as string[]).includes("null"),
    "nullable anyOf collapsed to a type array",
  );
  assertEqual((out.required as string[])[0], "pr", "required preserved");
});

await test("normalizeWireToolSchema is identity for clean schemas", () => {
  const clean = {
    type: "object",
    properties: { a: { type: "string", enum: ["x", "y"] } },
    required: ["a"],
  };
  assertEqual(
    JSON.stringify(normalizeWireToolSchema(clean)),
    JSON.stringify(clean),
    "already-clean schema unchanged",
  );
  assertEqual(
    normalizeWireToolSchema(undefined).type,
    "object",
    "missing schema → permissive object shape",
  );
});

await test("buildWireToolNameMaps maps only when a name is wire-invalid", () => {
  assertEqual(
    buildWireToolNameMaps(["get_pr", "search-code"]),
    undefined,
    "all-valid names → no mapping, wire uses originals",
  );
  const maps = buildWireToolNameMaps([
    "mcp.server/get pr",
    "mcp.server_get_pr",
    "ok_tool",
  ]);
  assert(maps !== undefined, "invalid name materializes the maps");
  const wire1 = maps!.toWire.get("mcp.server/get pr")!;
  assert(
    /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(wire1),
    "sanitized into the OpenAI-compatible alphabet",
  );
  assertEqual(
    maps!.fromWire.get(wire1),
    "mcp.server/get pr",
    "bijective round-trip back to the registered name",
  );
  const wire2 = maps!.toWire.get("mcp.server_get_pr")!;
  assert(wire1 !== wire2, "post-sanitization collisions deduped");
  assertEqual(maps!.toWire.get("ok_tool"), "ok_tool", "valid names untouched");

  // Reviewer-probed edge cases: sanitizeToolName always yields a non-empty,
  // wire-valid name (empty → "_", all-special → "___", leading digit →
  // "_"-prefixed, >64 chars → truncated to 64).
  const edge = buildWireToolNameMaps(["", "!!!", "123tool", "x".repeat(70)]);
  assert(edge !== undefined, "edge-case names materialize the maps");
  for (const [original, wire] of edge!.toWire) {
    assert(
      /^[a-zA-Z_][a-zA-Z0-9_-]{0,63}$/.test(wire),
      `"${original.slice(0, 12)}" sanitizes to a wire-valid non-empty name (got "${wire.slice(0, 12)}")`,
    );
  }
});

/** Minimal concrete subclass exposing the protected/private wire-fit hooks. */
class FakeCompatProvider extends OpenAIChatCompletionsProvider {
  constructor() {
    super("litellm" as AIProviderName, "wire-test-model", undefined, {
      baseURL: "http://localhost:0",
      apiKey: "test",
    });
  }
  protected getProviderName(): AIProviderName {
    return "litellm" as AIProviderName;
  }
  protected getDefaultModel(): string {
    return "wire-test-model";
  }
  public formatProviderError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
  }
  public resolveWireMaxTokensPublic(
    modelId: string,
    requested: number | undefined,
    messages: OpenAICompatChatMessage[],
  ): number | undefined {
    return this.resolveWireMaxTokens(modelId, requested, messages, undefined);
  }
  public correctOverflowPublic(
    body: OpenAICompatChatRequest,
    error: Error & { statusCode?: number; responseBody?: string },
  ): OpenAICompatChatRequest | undefined {
    return (
      this as unknown as {
        correctBodyAfterContextOverflow: (
          b: OpenAICompatChatRequest,
          e: Error & { statusCode?: number; responseBody?: string },
        ) => OpenAICompatChatRequest | undefined;
      }
    ).correctBodyAfterContextOverflow(body, error);
  }
}

await test("resolveWireMaxTokens fits max_tokens to DISCOVERED limits only", () => {
  clearRuntimeContextWindows();
  clearRuntimeOutputCeilings();
  const provider = new FakeCompatProvider();
  const messages: OpenAICompatChatMessage[] = [
    { role: "user", content: "x".repeat(4_000) },
  ];
  assertEqual(
    provider.resolveWireMaxTokensPublic("wire-test-model", 32_000, messages),
    32_000,
    "nothing discovered → caller value untouched (static guesses never enforced)",
  );
  registerRuntimeOutputCeiling("litellm", "wire-test-model", 31_000);
  assertEqual(
    provider.resolveWireMaxTokensPublic("wire-test-model", 32_000, messages),
    31_000,
    "advertised output ceiling clamps",
  );
  registerRuntimeContextWindow("litellm", "wire-test-model", 4_096);
  const fitted = provider.resolveWireMaxTokensPublic(
    "wire-test-model",
    31_000,
    messages,
  )!;
  assert(
    fitted > 0 && fitted < 31_000,
    "discovered window re-fits max_tokens to window − input − margin",
  );
  let typedThrow = false;
  try {
    provider.resolveWireMaxTokensPublic("wire-test-model", 1_000, [
      { role: "user", content: "x".repeat(40_000) },
    ]);
  } catch (error) {
    typedThrow = (error as Error).name === "ContextBudgetExceededError";
  }
  assert(
    typedThrow,
    "input alone over a discovered window → typed pre-dispatch failure",
  );
  clearRuntimeContextWindows();
  clearRuntimeOutputCeilings();
});

await test("overflow 400 self-heals the window registry and re-fits max_tokens", () => {
  clearRuntimeContextWindows();
  clearRuntimeOutputCeilings();
  const provider = new FakeCompatProvider();
  const overflowError = Object.assign(
    new Error(
      "This model's maximum context length is 262144 tokens. However, you " +
        "requested 32000 output tokens and your prompt contains at least " +
        "230145 input tokens, for a total of at least 262145 tokens. Please " +
        "reduce the length of the input prompt or the number of requested " +
        "output tokens.",
    ),
    { statusCode: 400 },
  );
  const body: OpenAICompatChatRequest = {
    model: "wire-test-model",
    messages: [{ role: "user", content: "hi" }],
    max_tokens: 32_000,
  };
  const retryBody = provider.correctOverflowPublic(body, overflowError);
  assert(retryBody !== undefined, "overflow produces a one-shot retry body");
  assertEqual(
    retryBody!.max_tokens,
    262_144 - 230_145 - 512,
    "max_tokens re-fit = window − input − margin, from the provider's own numbers",
  );
  assertEqual(
    getContextWindowSize("litellm", "wire-test-model"),
    262_144,
    "window self-healed into the runtime registry for later budget math",
  );
  assertEqual(
    provider.correctOverflowPublic(
      body,
      Object.assign(new Error("model not found"), { statusCode: 400 }),
    ),
    undefined,
    "non-overflow 400 → undefined (subclass adjustBodyAfter400 hook runs)",
  );
  // Server-defaulted output: the body carried no max_tokens, but the error
  // states what the backend counted — requestedOutputTokens drives the re-fit.
  const bodyNoMax: OpenAICompatChatRequest = {
    model: "wire-test-model",
    messages: [{ role: "user", content: "hi" }],
  };
  const retryNoMax = provider.correctOverflowPublic(bodyNoMax, overflowError);
  assert(
    retryNoMax !== undefined,
    "no-max_tokens body still gets a retry via the error's stated output tokens",
  );
  assertEqual(
    retryNoMax!.max_tokens,
    262_144 - 230_145 - 512,
    "re-fit bound derives from requestedOutputTokens when max_tokens was unset",
  );
  clearRuntimeContextWindows();
});

// ---------------------------------------------------------------------------
// Part 4 — Turn budget vs hard abort separation
// ---------------------------------------------------------------------------
// The hard abort in executeStandardGenerateFlow fires at exactly the generate
// `timeout`. When the turn budget is DERIVED from that same timeout, the turn
// deadline must sit one wrap-up lead EARLIER so the wrap-up's final,
// tools-off generation runs in exclusive margin instead of racing the abort
// (observed on litellm/private-large: wrap-up engaged at T−lead, final answer
// killed at exactly T → TimeoutError with the whole turn discarded).

await test("derived-from-timeout turn deadline ends one wrap-up lead before the hard abort", () => {
  const start = 1_000_000;
  const { callerTimeoutMs, turnBudgetMs, wrapupLeadMs, turnDeadline } =
    resolveTurnBudget({ timeout: "15m" } as never, start);
  assertEqual(callerTimeoutMs, 900_000, "15m parses to 900000ms");
  assertEqual(turnBudgetMs, 780_000, "budget = 15m − 120s default lead");
  assertEqual(wrapupLeadMs, 120_000, "default lead preserved");
  assert(
    (turnDeadline ?? 0) + 120_000 <= start + 900_000,
    "final generation gets a full lead of exclusive margin before the abort",
  );
});

await test("short derived timeouts keep the quarter-budget lead clamp", () => {
  const { turnBudgetMs, wrapupLeadMs } = resolveTurnBudget(
    { timeout: "5m" } as never,
    0,
  );
  // lead clamps to 300s/4 = 75s, budget shrinks to 225s, lead re-clamps to 56s.
  assertEqual(turnBudgetMs, 225_000, "5m budget shrinks by its clamped lead");
  assertEqual(
    wrapupLeadMs,
    56_250,
    "lead re-clamped to a quarter of the reduced budget",
  );
});

await test("an explicit turnTimeoutMs is honored verbatim (caller separated the deadlines)", () => {
  const { turnBudgetMs, wrapupLeadMs } = resolveTurnBudget(
    { timeout: "15m", turnTimeoutMs: 600_000 } as never,
    0,
  );
  assertEqual(turnBudgetMs, 600_000, "explicit turn budget untouched");
  assertEqual(
    wrapupLeadMs,
    120_000,
    "default lead against the explicit budget",
  );
});

await test("no timeout and no turnTimeoutMs → no turn deadline (pre-existing behaviour)", () => {
  const { turnBudgetMs, turnDeadline, wrapupLeadMs } = resolveTurnBudget(
    {} as never,
    0,
  );
  assertEqual(turnBudgetMs, undefined, "no budget without a caller deadline");
  assertEqual(turnDeadline, undefined, "no deadline engaged");
  assertEqual(wrapupLeadMs, 0, "no lead without a budget");
});

await runSuite();
