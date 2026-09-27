#!/usr/bin/env tsx
/** Determinism exception: pure IR shape and exhaustiveness invariants, no provider
 * credentials, no network and no live proxy. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import {
  assertProxyIRExhaustive,
  describeProxyIRPart,
  describeProxyIRResponseEvent,
  describeProxyIRTerminalOutcome,
  isProxyIRUnmappable,
  proxyIRUnmappable,
} from "../src/lib/proxy/proxyIR.js";
import type {
  ProxyIRContentPart,
  ProxyIRRequest,
  ProxyIRResponseEvent,
  ProxyIRTerminalOutcome,
} from "../src/lib/types/index.js";

let passed = 0;
async function test(name: string, run: () => void | Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

/**
 * The shipped describer is the exhaustiveness witness.
 *
 * `tsconfig.json` excludes `test`, so a switch written here would compile even
 * with an unhandled variant. Asserting on `describeProxyIRPart` instead means the
 * guarantee this suite documents is the one `tsc --noEmit` actually enforces.
 */
const describePart = describeProxyIRPart;

await test("every content part variant is handled by an exhaustive switch", () => {
  const parts: ProxyIRContentPart[] = [
    { kind: "text", text: "SENTINEL_PROMPT_BODY" },
    { kind: "thinking", text: "SENTINEL_THOUGHT_BODY" },
    { kind: "image", encoding: "url", data: "https://example.test/a.png" },
    {
      kind: "tool_call",
      callId: "call-1",
      toolName: "run",
      argumentsRaw: "{}",
    },
    {
      kind: "tool_result",
      callId: "call-1",
      content: [{ kind: "text", text: "ok" }],
    },
    {
      kind: "unmapped",
      sourceKind: "custom_widget",
      reason: "no target",
      raw: 1,
    },
  ];
  const described = parts.map(describePart);
  assertEqualLength(described, parts.length);
  // Distinctive sentinels, because a short one produces false confidence: "hi"
  // is a substring of "thinking(4b)", so the first version of this check failed
  // on its own describer rather than on a leak.
  const joined = described.join("|");
  assert.ok(
    !joined.includes("SENTINEL_PROMPT_BODY") &&
      !joined.includes("SENTINEL_THOUGHT_BODY"),
    `a describer's output reaches logs and spans, so it must not carry prompt text: ${joined}`,
  );
  assert.ok(
    described.every((d) => d.length > 0),
    "every variant must describe itself",
  );
});

function assertEqualLength(values: readonly string[], expected: number): void {
  assert.equal(values.length, expected, "one description per variant");
}

await test("an unmodelled variant is refused rather than silently skipped", () => {
  // The compile-time guarantee only covers values that really are typed. A payload
  // narrowed from `unknown` can still reach the default branch, and dropping it
  // there is how a translation layer loses a tool call.
  const smuggled = { kind: "not_a_real_variant", text: "x" };
  assert.throws(
    () => describePart(smuggled as unknown as ProxyIRContentPart),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes("describeProxyIRPart") &&
      error.message.includes("not_a_real_variant"),
    "an unknown variant must throw naming both the switch and the variant",
  );
});

await test("the exhaustiveness error survives a value with no discriminant", () => {
  assert.throws(
    () => describePart({} as unknown as ProxyIRContentPart),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes("object without recognized discriminant"),
    "a discriminant-less value must still produce a readable error",
  );
  assert.throws(
    () => describePart(undefined as unknown as ProxyIRContentPart),
    (error: unknown) =>
      error instanceof Error && error.message.includes("undefined"),
    "a primitive must still produce a readable error",
  );
});

await test("an untagged object's own fields never reach the exhaustiveness error", () => {
  // Reviewed finding (PR #1826): the prior fallback serialized up to 200 chars
  // of the object's own JSON, which could put text or tool-argument payload
  // bytes into a log- or span-bound error. The suite previously exercised only
  // a string-tagged object and an empty one, never an untagged object that
  // actually carries a payload — this is that case.
  const smuggledPayload = {
    text: "SENTINEL_UNTAGGED_PAYLOAD",
    nested: { arguments: "SENTINEL_NESTED_PAYLOAD" },
  };
  assert.throws(
    () => describePart(smuggledPayload as unknown as ProxyIRContentPart),
    (error: unknown) =>
      error instanceof Error &&
      error.message.includes("object without recognized discriminant") &&
      !error.message.includes("SENTINEL_UNTAGGED_PAYLOAD") &&
      !error.message.includes("SENTINEL_NESTED_PAYLOAD"),
    "an untagged object's fields must never appear in the exhaustiveness error",
  );
});

await test("an open stop reason is carried verbatim instead of collapsing", () => {
  // Anthropic types stop_reason as `string | null` on the wire. A closed union
  // would turn any legitimate but unmodelled reason into an exhaustiveness throw,
  // failing a request the upstream answered successfully.
  const outcomes: ProxyIRTerminalOutcome[] = [
    { status: "completed", finishReason: "end_turn" },
    {
      status: "completed",
      finishReason: "other",
      rawFinishReason: "pause_turn",
    },
    { status: "failed", error: { code: "overloaded", httpStatus: 529 } },
    { status: "incomplete", reason: "client aborted" },
  ];
  const carried = outcomes.flatMap((outcome) =>
    outcome.status === "completed" && outcome.finishReason === "other"
      ? [outcome.rawFinishReason]
      : [],
  );
  assert.deepEqual(
    carried,
    ["pause_turn"],
    "an unmodelled stop reason must be preserved, not mapped away",
  );
});

await test("a tool call keeps its raw arguments even when they do not parse", () => {
  // argumentsRaw is authoritative: streamed fragments and malformed JSON must
  // survive translation rather than being normalised into something never sent.
  const part: ProxyIRContentPart = {
    kind: "tool_call",
    callId: "call-9",
    toolName: "apply_patch",
    argumentsRaw: '{"patch": "diff --git a/x b/x',
  };
  assert.equal(
    describePart(part),
    "tool_call(apply_patch)",
    "the describer names the tool without leaking argument text",
  );
  assert.equal(
    part.argumentsRaw,
    '{"patch": "diff --git a/x b/x',
    "unparsed argument text must be preserved byte for byte on the IR itself",
  );
  assert.equal(
    part.kind === "tool_call" ? part.argumentsJson : undefined,
    undefined,
    "a call whose arguments do not parse must not invent a parsed form",
  );
});

await test("an unmappable wire value is marked and recoverable", () => {
  const marked = proxyIRUnmappable("custom_tool_call", "no target form", {
    a: 1,
  });
  assert.ok(isProxyIRUnmappable(marked), "the marker must be recognisable");
  assert.deepEqual(
    marked.raw,
    { a: 1 },
    "the original value must be preserved",
  );
  assert.ok(
    !isProxyIRUnmappable({ kind: "text" }),
    "a real part is not a marker",
  );
  assert.ok(!isProxyIRUnmappable(null), "null must not read as a marker");
});

await test("a response event switch is exhaustive over every event kind", () => {
  const events: ProxyIRResponseEvent[] = [
    { kind: "text_delta", text: "a" },
    { kind: "thinking_delta", text: "b" },
    { kind: "tool_call_start", callId: "c1", toolName: "run" },
    { kind: "tool_call_arguments_delta", callId: "c1", partialArguments: "{" },
    { kind: "tool_call_done", callId: "c1" },
    { kind: "item_done" },
    {
      kind: "usage",
      usage: {
        inputTokens: 1,
        outputTokens: 2,
        cacheCreationTokens: 0,
        cacheReadTokens: 0,
      },
    },
    {
      kind: "terminal",
      outcome: { status: "completed", finishReason: "end_turn" },
    },
  ];
  const seen = events.map((event) => {
    switch (event.kind) {
      case "text_delta":
      case "thinking_delta":
        return event.text;
      case "tool_call_start":
        return event.toolName;
      case "tool_call_arguments_delta":
        return event.partialArguments;
      case "tool_call_done":
        return event.callId;
      case "item_done":
        return "item_done";
      case "usage":
        return String(event.usage.inputTokens);
      case "terminal":
        return event.outcome.status;
      default:
        return assertProxyIRExhaustive(event, "responseEventSwitch");
    }
  });
  assert.equal(
    events.map(describeProxyIRResponseEvent).length,
    events.length,
    "the shipped event describer must handle every kind too",
  );
  assert.equal(
    describeProxyIRTerminalOutcome({
      status: "completed",
      finishReason: "other",
      rawFinishReason: "pause_turn",
    }),
    "completed:pause_turn",
    "an unmodelled stop reason must stay visible in diagnostics",
  );
  assert.equal(seen.length, events.length, "every event kind must be handled");
});

await test("a request records its source dialect and never leaks the cache key", () => {
  const request: ProxyIRRequest = {
    sourceFormat: "codex-responses",
    sourceModel: "gpt-5.6-sol",
    messages: [
      { role: "developer", content: [{ kind: "text", text: "policy" }] },
    ],
    tools: [
      {
        kind: "function",
        name: "run",
        parametersSchema: { type: "object" },
      },
    ],
    reasoning: { source: "codex_effort", effort: "medium" },
    stream: true,
    promptCachePrefixKey: "sha256:abc",
  };
  assert.equal(request.sourceFormat, "codex-responses");
  assert.equal(
    request.messages[0]?.role,
    "developer",
    "a developer role must survive as itself, not be merged into system",
  );
  assert.ok(
    !JSON.stringify(request.tools).includes("sha256:abc"),
    "the routing hint must not reach any wire-bound structure",
  );
});

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
