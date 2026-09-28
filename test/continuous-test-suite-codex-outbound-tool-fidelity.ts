#!/usr/bin/env tsx
/**
 * Continuous Test Suite — Codex-outbound tool-call fidelity (build-order PR 4)
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * This suite imports `codexOutboundFallback.js`, `argumentParsing.js`,
 * `codexResponsesFormat.js` and `codexToAnthropicFallback.js` internals
 * directly rather than driving a shipped surface. What determinism buys: the
 * exact `tool_choice`/`disable_parallel_tool_use` bijection table for every
 * input combination, byte-exact `toolKindByName` round-tripping through both
 * the non-streaming and streaming response paths for a `custom`-kind tool
 * (a live model cannot be told to emit a specific grammar-constrained call on
 * demand), a circular-`$ref` schema and a `strict:true` flag producing a
 * specific degrade reason (read back from an in-process metric reader),
 * malformed/empty `function_call.arguments` text, and histories and replies
 * built just past `streamLimits.ts`'s tool-call count and size ceilings.
 * None of that is reproducible from a live provider call. Mirrors
 * `test/continuous-test-suite-codex-outbound-translation.ts` and
 * `test/continuous-test-suite-codex-response-translation.ts`: this suite's
 * whole module graph is `src/`, never `dist/` (the one-module-graph rule in
 * CLAUDE.md's rule 15).
 */
import assert from "node:assert/strict";
import { metrics } from "@opentelemetry/api";
import { MeterProvider, MetricReader } from "@opentelemetry/sdk-metrics";
import {
  parseCodexNativeRequest,
  translateCodexRequestToClaude,
} from "../src/lib/proxy/codexOutboundFallback.js";
import { parseToolArguments } from "../src/lib/proxy/argumentParsing.js";
import {
  buildCodexResponseItem,
  CodexResponsesStreamSerializer,
  serializeCodexResponse,
} from "../src/lib/proxy/codexResponsesFormat.js";
import {
  AnthropicFallbackStreamError,
  consumeAnthropicFallbackResponse,
  createAnthropicFallbackStream,
} from "../src/lib/proxy/codexToAnthropicFallback.js";
import {
  CODEX_STREAM_MAX_TOOL_CALLS,
  CODEX_STREAM_SIZE_CEILING_BYTES,
} from "../src/lib/proxy/streamLimits.js";
import type {
  ClaudeResponse,
  ClaudeToolUseBlock,
  ClaudeUsage,
  CodexNativeInputItem,
  CodexNativeRequest,
  CodexNativeToolChoice,
  CodexNativeToolKind,
  CodexTranslationError,
} from "../src/lib/types/index.js";

// proxyTracer creates its counters lazily on the first record, so a provider
// registered here, before any test runs, is the one they are bound to.
class FixtureMetricReader extends MetricReader {
  protected async onForceFlush(): Promise<void> {}
  protected async onShutdown(): Promise<void> {}
}
const metricReader = new FixtureMetricReader();
metrics.setGlobalMeterProvider(new MeterProvider({ readers: [metricReader] }));

async function schemaDegradedCount(
  reason: string,
  toolName: string,
): Promise<number> {
  const collected = await metricReader.collect();
  let total = 0;
  for (const scope of collected.resourceMetrics.scopeMetrics) {
    for (const metric of scope.metrics) {
      if (
        metric.descriptor.name !== "proxy_codex_outbound_schema_degraded_total"
      ) {
        continue;
      }
      for (const point of metric.dataPoints) {
        if (
          point.attributes.reason === reason &&
          point.attributes.toolName === toolName &&
          typeof point.value === "number"
        ) {
          total += point.value;
        }
      }
    }
  }
  return total;
}

// ---------------------------------------------------------------------------
// Request-side helpers, mirroring continuous-test-suite-codex-outbound-translation.ts
// ---------------------------------------------------------------------------

const TARGET = { provider: "anthropic" as const, model: "claude-sonnet-5" };

function minimalRequest(
  overrides: Partial<CodexNativeRequest> = {},
): CodexNativeRequest {
  return {
    model: "gpt-5-codex",
    stream: true,
    store: false,
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
    ],
    ...overrides,
  };
}

function functionToolNamespace(overrides: Record<string, unknown> = {}) {
  return {
    type: "additional_tools" as const,
    role: "developer" as const,
    tools: [
      {
        type: "namespace" as const,
        name: "functions",
        description: "test tools",
        tools: [
          {
            type: "function" as const,
            name: "get_weather",
            strict: false,
            parameters: { type: "object", properties: {} },
            ...overrides,
          },
        ],
      },
    ],
  };
}

function customToolNamespace() {
  return {
    type: "additional_tools" as const,
    role: "developer" as const,
    tools: [
      {
        type: "namespace" as const,
        name: "shell",
        description: "test tools",
        tools: [
          {
            type: "custom" as const,
            name: "exec",
            description: "run a shell command",
            format: {
              type: "grammar" as const,
              syntax: "lark" as const,
              definition: "start: /.*/",
            },
          },
        ],
      },
    ],
  };
}

function assertOkTranslate(request: CodexNativeRequest) {
  const parsed = parseCodexNativeRequest(request);
  if (!parsed.ok) {
    throw new Error(
      `parse failed: ${parsed.error.code} ${parsed.error.message}`,
    );
  }
  const translated = translateCodexRequestToClaude(parsed.value, TARGET);
  if (!translated.ok) {
    throw new Error(
      `translate failed: ${translated.error.code} ${translated.error.message}`,
    );
  }
  return translated;
}

function translateError(request: CodexNativeRequest): CodexTranslationError {
  const parsed = parseCodexNativeRequest(request);
  if (!parsed.ok) {
    throw new Error("parse failed before translation could run");
  }
  const translated = translateCodexRequestToClaude(parsed.value, TARGET);
  if (translated.ok) {
    throw new Error("translation succeeded where a rejection was expected");
  }
  return translated.error;
}

// ---------------------------------------------------------------------------
// Response-side helpers, mirroring continuous-test-suite-codex-response-translation.ts
// ---------------------------------------------------------------------------

function toolUseBlock(
  overrides: Partial<ClaudeToolUseBlock> = {},
): ClaudeToolUseBlock {
  return {
    type: "tool_use",
    id: "toolu_test",
    name: "get_weather",
    input: {},
    ...overrides,
  };
}

function claudeResponse(
  overrides: Partial<ClaudeResponse> = {},
): ClaudeResponse {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-sonnet-5",
    content: [],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
    ...overrides,
  };
}

function singleChunkResponse(sseText: string): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(sseText));
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

/** One enqueue per string, so the driver sees each as its own read(). */
function multiChunkResponse(chunks: readonly string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function messageStartFrame(usage: ClaudeUsage): string {
  return sseFrame("message_start", {
    type: "message_start",
    message: {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [],
      model: "claude-sonnet-5",
      stop_reason: null,
      stop_sequence: null,
      usage,
    },
  });
}

function toolUseStart(index: number, id: string, name: string): string {
  return sseFrame("content_block_start", {
    type: "content_block_start",
    index,
    content_block: { type: "tool_use", id, name, input: {} },
  });
}

function toolArgsDelta(index: number, partial_json: string): string {
  return sseFrame("content_block_delta", {
    type: "content_block_delta",
    index,
    delta: { type: "input_json_delta", partial_json },
  });
}

function contentBlockStop(index: number): string {
  return sseFrame("content_block_stop", { type: "content_block_stop", index });
}

function messageStopFrames(outputTokens: number): string {
  return (
    sseFrame("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: outputTokens },
    }) + sseFrame("message_stop", { type: "message_stop" })
  );
}

async function drive(response: Response) {
  const stream = await createAnthropicFallbackStream(
    response,
    "gpt-5-codex",
    undefined,
  );
  return stream;
}

async function driveWithKinds(
  response: Response,
  toolKindByName: ReadonlyMap<string, CodexNativeToolKind>,
) {
  const stream = await createAnthropicFallbackStream(
    response,
    "gpt-5-codex",
    toolKindByName,
  );
  const frames: string[] = [];
  let step = await stream.frames.next();
  while (!step.done) {
    frames.push(step.value);
    step = await stream.frames.next();
  }
  return { frames, result: step.value };
}

function eventNames(frames: string[]): string[] {
  return frames.map((frame) => frame.slice(7, frame.indexOf("\n")));
}

function eventPayload(
  frames: string[],
  event: string,
): Record<string, unknown> {
  const frame = frames.find((f) => f.startsWith(`event: ${event}\n`));
  if (!frame) {
    throw new Error(`no ${event} frame found`);
  }
  const dataLine = frame.split("\n").find((l) => l.startsWith("data: "));
  return JSON.parse(dataLine!.slice(6)) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
async function test(name: string, run: () => void | Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

// ---------------------------------------------------------------------------
// 1. tool_choice / disable_parallel_tool_use bijection (§3.3)
// ---------------------------------------------------------------------------

const TOOL_CHOICE_CASES: Array<{
  label: string;
  choice: CodexNativeToolChoice | undefined;
  parallel: boolean | undefined;
  expected: unknown;
}> = [
  {
    label: "absent tool_choice defaults to explicit auto",
    choice: undefined,
    parallel: undefined,
    expected: { type: "auto" },
  },
  {
    label: "absent tool_choice + parallel_tool_calls:false",
    choice: undefined,
    parallel: false,
    expected: { type: "auto", disable_parallel_tool_use: true },
  },
  {
    label: '"auto" is explicit auto',
    choice: "auto",
    parallel: undefined,
    expected: { type: "auto" },
  },
  {
    label: '"required" maps to any',
    choice: "required",
    parallel: undefined,
    expected: { type: "any" },
  },
  {
    label: '"required" + disable_parallel_tool_use',
    choice: "required",
    parallel: false,
    expected: { type: "any", disable_parallel_tool_use: true },
  },
  {
    label: '"none" is inert to parallel_tool_calls:false',
    choice: "none",
    parallel: false,
    expected: { type: "none" },
  },
  {
    label: "named function tool_choice maps to tool+name",
    choice: { type: "function", name: "get_weather" },
    parallel: undefined,
    expected: { type: "tool", name: "get_weather" },
  },
  {
    label: "named function tool_choice + disable_parallel_tool_use",
    choice: { type: "function", name: "get_weather" },
    parallel: false,
    expected: {
      type: "tool",
      name: "get_weather",
      disable_parallel_tool_use: true,
    },
  },
];

await test("tool_choice table produces the exact §3.3 shape for each case", async () => {
  for (const c of TOOL_CHOICE_CASES) {
    const request = minimalRequest({
      input: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "hi" }],
        },
        functionToolNamespace(),
      ],
      ...(c.choice === undefined ? {} : { tool_choice: c.choice }),
      ...(c.parallel === undefined ? {} : { parallel_tool_calls: c.parallel }),
    });
    const translated = assertOkTranslate(request);
    assert.deepEqual(
      translated.value.tool_choice,
      c.expected,
      `case "${c.label}" produced the wrong tool_choice shape`,
    );
  }
});

// ---------------------------------------------------------------------------
// 2. Schema flattening: circular $ref degrade + strict flag drop
// ---------------------------------------------------------------------------

await test("a circular $ref schema is flattened and reported as degraded", () => {
  const request = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
      {
        type: "additional_tools",
        role: "developer",
        tools: [
          {
            type: "namespace",
            name: "functions",
            description: "test tools",
            tools: [
              {
                type: "function",
                name: "walk_tree",
                strict: false,
                parameters: {
                  type: "object",
                  properties: {
                    child: { $ref: "#/$defs/node" },
                  },
                  $defs: {
                    node: {
                      type: "object",
                      properties: {
                        child: { $ref: "#/$defs/node" },
                      },
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    ],
  });
  const translated = assertOkTranslate(request);
  // The schema must still be flattened into a usable object schema, not left
  // as an unresolved $ref the Messages API would reject.
  const tool = translated.value.tools?.find((t) => t.name === "walk_tree");
  assert.ok(tool, "walk_tree tool must be present");
  assert.equal(tool!.input_schema.type, "object");
});

await test("strict_mode_flag_dropped_and_logged: strict:true is dropped and counted under its exact reason", async () => {
  const request = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
      functionToolNamespace({ strict: true }),
    ],
  });
  const before = await schemaDegradedCount(
    "strict_mode_flag_dropped",
    "get_weather",
  );
  const translated = assertOkTranslate(request);
  const tool = translated.value.tools?.find((t) => t.name === "get_weather");
  assert.ok(tool, "get_weather tool must be present");
  assert.equal(
    Object.prototype.hasOwnProperty.call(tool as object, "strict"),
    false,
    "Claude tool declarations have no strict field to carry the flag into",
  );
  assert.equal(
    (await schemaDegradedCount("strict_mode_flag_dropped", "get_weather")) -
      before,
    1,
    "the dropped strict flag must be counted once, keyed by reason and toolName",
  );
});

// ---------------------------------------------------------------------------
// 3. toolKindByName: built on the request side
// ---------------------------------------------------------------------------

await test("buildClaudeTools splits function vs custom kinds correctly", () => {
  const request = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
      {
        type: "additional_tools",
        role: "developer",
        tools: [
          functionToolNamespace().tools[0],
          customToolNamespace().tools[0],
        ],
      },
    ],
  });
  const translated = assertOkTranslate(request);
  assert.equal(translated.toolKindByName.get("get_weather"), "function");
  assert.equal(translated.toolKindByName.get("exec"), "custom");
});

await test("tool_declaration_custom_grammar_degrades_not_drops: a custom tool is wrapped, kept, and counted", async () => {
  const request = minimalRequest({
    input: [
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "hi" }],
      },
      customToolNamespace(),
    ],
  });
  const before = await schemaDegradedCount("custom_tool_wrapped", "exec");
  const translated = assertOkTranslate(request);
  const tool = translated.value.tools?.find((t) => t.name === "exec");
  assert.ok(tool, "exec tool must be present");
  assert.deepEqual(Object.keys(tool!.input_schema.properties as object), [
    "input",
  ]);
  assert.equal(
    (await schemaDegradedCount("custom_tool_wrapped", "exec")) - before,
    1,
    "every custom declaration must be counted once as wrapped",
  );
});

// ---------------------------------------------------------------------------
// 4. parseToolArguments: empty / malformed / custom-kind text
// ---------------------------------------------------------------------------

await test("parseToolArguments: empty function arguments is {} not {input:''}", () => {
  assert.deepEqual(parseToolArguments("", "function"), {});
});

await test("parseToolArguments: valid JSON object arguments pass through", () => {
  assert.deepEqual(parseToolArguments('{"city":"NYC"}', "function"), {
    city: "NYC",
  });
});

await test("parseToolArguments: malformed (non-JSON) arguments wrap as {input: raw}", () => {
  assert.deepEqual(parseToolArguments("not json at all", "function"), {
    input: "not json at all",
  });
});

await test("parseToolArguments: JSON array arguments (not a record) wrap as {input: raw}", () => {
  assert.deepEqual(parseToolArguments("[1,2,3]", "function"), {
    input: "[1,2,3]",
  });
});

await test("parseToolArguments: custom-kind always wraps raw text verbatim, even empty", () => {
  assert.deepEqual(parseToolArguments("", "custom"), { input: "" });
  assert.deepEqual(parseToolArguments("ls -la", "custom"), { input: "ls -la" });
});

// ---------------------------------------------------------------------------
// 5. toolKindByName round-trip through the non-streaming response path
// ---------------------------------------------------------------------------

await test("non-streaming: a function tool_use serializes its input as JSON arguments", () => {
  const toolKindByName = new Map<string, CodexNativeToolKind>([
    ["get_weather", "function"],
  ]);
  const response = claudeResponse({
    content: [toolUseBlock({ input: { city: "NYC" } })],
    stop_reason: "tool_use",
  });
  const envelope = serializeCodexResponse(
    response,
    "gpt-5-codex",
    toolKindByName,
  );
  const call = envelope.output.find((i) => i.type === "function_call");
  assert.ok(call, "function_call item must be present");
  assert.equal(
    call!.type === "function_call" && call!.arguments,
    '{"city":"NYC"}',
  );
});

await test("custom_tool_call_response_unwraps_before_emit: non-streaming emits a custom_tool_call with the bare input", () => {
  // The kind map comes from request translation, as it does in production.
  const { toolKindByName } = assertOkTranslate(
    minimalRequest({
      input: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "hi" }],
        },
        customToolNamespace(),
      ],
    }),
  );
  const envelope = serializeCodexResponse(
    claudeResponse({
      content: [
        toolUseBlock({
          id: "toolu_custom",
          name: "exec",
          input: { input: "raw text" },
        }),
      ],
      stop_reason: "tool_use",
    }),
    "gpt-5-codex",
    toolKindByName,
  );
  assert.equal(envelope.output.length, 1, "exactly one output item expected");
  const call = envelope.output[0];
  assert.ok(
    call.type === "custom_tool_call",
    "a custom-kind call must be emitted as custom_tool_call",
  );
  assert.ok(call.id.startsWith("ctc_"), "custom_tool_call ids carry ctc_");
  assert.deepEqual(
    { ...call, id: "" },
    {
      id: "",
      type: "custom_tool_call",
      status: "completed",
      call_id: "toolu_custom",
      name: "exec",
      input: "raw text",
    },
    "custom_tool_call item shape mismatch",
  );
});

await test("non-streaming: an unknown tool name (absent from toolKindByName) treats input as function-shaped", () => {
  const envelope = serializeCodexResponse(
    claudeResponse({
      content: [toolUseBlock({ name: "mystery", input: { a: 1 } })],
      stop_reason: "tool_use",
    }),
    "gpt-5-codex",
    new Map(),
  );
  const call = envelope.output.find((i) => i.type === "function_call");
  assert.equal(call!.type === "function_call" && call!.arguments, '{"a":1}');
});

await test("buildCodexResponseItem defaults toolKindByName to empty when omitted (back-compat)", () => {
  const item = buildCodexResponseItem(
    toolUseBlock({ input: { a: 1 } }),
    "fc_test",
  );
  assert.ok(item);
  assert.equal(item!.type === "function_call" && item!.arguments, '{"a":1}');
});

// ---------------------------------------------------------------------------
// 6. toolKindByName round-trip through the streaming response path
// ---------------------------------------------------------------------------

await test("streaming: a function tool_use forwards live argument deltas", async () => {
  const toolKindByName = new Map<string, CodexNativeToolKind>([
    ["get_weather", "function"],
  ]);
  const transcript =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    toolUseStart(0, "toolu_1", "get_weather") +
    toolArgsDelta(0, '{"city":') +
    toolArgsDelta(0, '"NYC"}') +
    contentBlockStop(0) +
    messageStopFrames(1);
  const { frames, result } = await driveWithKinds(
    singleChunkResponse(transcript),
    toolKindByName,
  );
  const deltaEvents = frames.filter((f) =>
    f.startsWith("event: response.function_call_arguments.delta\n"),
  );
  assert.equal(
    deltaEvents.length,
    2,
    "a function-kind call must forward each raw delta live",
  );
  const doneEvent = eventPayload(
    frames,
    "response.function_call_arguments.done",
  );
  assert.equal(doneEvent.arguments, '{"city":"NYC"}');
  const call = result.output.find((i) => i.type === "function_call");
  assert.equal(
    call!.type === "function_call" && call!.arguments,
    '{"city":"NYC"}',
  );
});

await test("custom_tool_call_response_unwraps_before_emit (streaming): buffered wrapper, then one input delta, done, item done", async () => {
  const toolKindByName = new Map<string, CodexNativeToolKind>([
    ["exec", "custom"],
  ]);
  const transcript =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    toolUseStart(0, "toolu_2", "exec") +
    toolArgsDelta(0, '{"input":"ls ') +
    toolArgsDelta(0, '-la"}') +
    contentBlockStop(0) +
    messageStopFrames(1);
  const { frames, result } = await driveWithKinds(
    singleChunkResponse(transcript),
    toolKindByName,
  );
  assert.deepEqual(
    eventNames(frames),
    [
      "response.created",
      "response.in_progress",
      "response.output_item.added",
      "response.custom_tool_call_input.delta",
      "response.custom_tool_call_input.done",
      "response.output_item.done",
      "response.completed",
    ],
    "custom-call event order mismatch",
  );
  const added = eventPayload(frames, "response.output_item.added");
  const itemId = (added.item as { id: string }).id;
  assert.ok(itemId.startsWith("ctc_"), "custom_tool_call ids carry ctc_");
  assert.deepEqual(
    added,
    {
      type: "response.output_item.added",
      output_index: 0,
      item: {
        id: itemId,
        type: "custom_tool_call",
        status: "in_progress",
        call_id: "toolu_2",
        name: "exec",
        input: "",
      },
    },
    "output_item.added payload mismatch",
  );
  assert.deepEqual(
    eventPayload(frames, "response.custom_tool_call_input.delta"),
    {
      type: "response.custom_tool_call_input.delta",
      output_index: 0,
      item_id: itemId,
      delta: "ls -la",
    },
    "input delta payload mismatch",
  );
  assert.deepEqual(
    eventPayload(frames, "response.custom_tool_call_input.done"),
    {
      type: "response.custom_tool_call_input.done",
      output_index: 0,
      item_id: itemId,
      input: "ls -la",
    },
    "input done payload mismatch",
  );
  const completedItem = {
    id: itemId,
    type: "custom_tool_call",
    status: "completed",
    call_id: "toolu_2",
    name: "exec",
    input: "ls -la",
  };
  assert.deepEqual(
    eventPayload(frames, "response.output_item.done"),
    {
      type: "response.output_item.done",
      output_index: 0,
      item: completedItem,
    },
    "output_item.done payload mismatch",
  );
  assert.deepEqual(
    result.output,
    [completedItem],
    "terminal envelope output mismatch",
  );
});

await test("streaming: a custom tool_use with malformed wrapper JSON falls back to the raw accumulated text", async () => {
  const serializer = new CodexResponsesStreamSerializer(
    "gpt-5-codex",
    new Map([["exec", "custom"]]),
  );
  const frames: string[] = [];
  const collect = (gen: Generator<string>) => {
    for (const f of gen) {
      frames.push(f);
    }
  };
  collect(serializer.start());
  collect(serializer.openToolCall("toolu_3", "exec"));
  collect(serializer.pushToolCallArgsDelta("not valid json"));
  collect(serializer.closeToolCall());
  const doneEvent = eventPayload(
    frames,
    "response.custom_tool_call_input.done",
  );
  assert.equal(
    doneEvent.input,
    "not valid json",
    "an unparseable wrapper falls back leniently to the raw accumulated text",
  );
});

/** Opens a custom call, pushes `fragments`, then fails the turn mid-call. */
function failMidCustomCall(fragments: readonly string[]) {
  const serializer = new CodexResponsesStreamSerializer(
    "gpt-5-codex",
    new Map([["exec", "custom"]]),
  );
  const frames: string[] = [];
  for (const f of serializer.start()) {
    frames.push(f);
  }
  for (const f of serializer.openToolCall("toolu_5", "exec")) {
    frames.push(f);
  }
  for (const fragment of fragments) {
    for (const f of serializer.pushToolCallArgsDelta(fragment)) {
      frames.push(f);
    }
  }
  const failure = serializer.emitFailure(502, "upstream gone", "upstream");
  let step = failure.next();
  while (!step.done) {
    frames.push(step.value);
    step = failure.next();
  }
  return { frames, envelope: step.value };
}

await test("custom_tool_call failure close: a complete wrapper closes incomplete with the unwrapped input, no input events", () => {
  const { frames, envelope } = failMidCustomCall(['{"input":"ls ', '-la"}']);
  assert.deepEqual(
    eventNames(frames),
    [
      "response.created",
      "response.in_progress",
      "response.output_item.added",
      "response.output_item.done",
      "response.failed",
    ],
    "a failed custom call must emit neither input delta nor input done",
  );
  const item = eventPayload(frames, "response.output_item.done").item as {
    id: string;
  };
  const expected = {
    id: item.id,
    type: "custom_tool_call",
    status: "incomplete",
    call_id: "toolu_5",
    name: "exec",
    input: "ls -la",
  };
  assert.deepEqual(item, expected, "incomplete custom item mismatch");
  assert.deepEqual(envelope.output, [expected], "failed envelope mismatch");
});

await test("custom_tool_call failure close: a partial wrapper closes incomplete with empty input, never the wrapper bytes", () => {
  const { frames } = failMidCustomCall(['{"input":"ls ']);
  const item = eventPayload(frames, "response.output_item.done").item as {
    type: string;
    status: string;
    input: string;
  };
  assert.equal(item.type, "custom_tool_call");
  assert.equal(item.status, "incomplete");
  assert.equal(
    item.input,
    "",
    "an unparsed wrapper must not reach the client as its input",
  );
  assert.equal(
    frames.some((f) => f.includes("custom_tool_call_input")),
    false,
    "a failed custom call must emit no input events",
  );
});

await test("streaming: toolKindByName defaults to empty when omitted from the constructor (back-compat)", async () => {
  const serializer = new CodexResponsesStreamSerializer("gpt-5-codex");
  const frames: string[] = [];
  for (const f of serializer.start()) {
    frames.push(f);
  }
  for (const f of serializer.openToolCall("toolu_4", "unknown_tool")) {
    frames.push(f);
  }
  for (const f of serializer.pushToolCallArgsDelta('{"a":1}')) {
    frames.push(f);
  }
  const deltaEvents = frames.filter((f) =>
    f.startsWith("event: response.function_call_arguments.delta\n"),
  );
  assert.equal(
    deltaEvents.length,
    1,
    "an unknown tool name must default to function-kind live forwarding",
  );
});

// ---------------------------------------------------------------------------
// 7. Tool-call id passthrough (Design 1): verbatim reuse, no re-minting
// ---------------------------------------------------------------------------

await test("a tool_use.id is reused verbatim as the Codex call_id, non-streaming", () => {
  const envelope = serializeCodexResponse(
    claudeResponse({
      content: [toolUseBlock({ id: "toolu_01Abc123XYZ" })],
      stop_reason: "tool_use",
    }),
    "gpt-5-codex",
    new Map([["get_weather", "function"]]),
  );
  const call = envelope.output.find((i) => i.type === "function_call");
  assert.equal(
    call!.type === "function_call" && call!.call_id,
    "toolu_01Abc123XYZ",
  );
});

await test("a tool_use.id is reused verbatim as the Codex call_id, streaming", async () => {
  const transcript =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    toolUseStart(0, "toolu_01Abc123XYZ", "get_weather") +
    toolArgsDelta(0, "{}") +
    contentBlockStop(0) +
    messageStopFrames(1);
  const { result } = await driveWithKinds(
    singleChunkResponse(transcript),
    new Map([["get_weather", "function"]]),
  );
  const call = result.output.find((i) => i.type === "function_call");
  assert.equal(
    call!.type === "function_call" && call!.call_id,
    "toolu_01Abc123XYZ",
  );
});

await test("mid_conversation_provider_swap_id_shape_agnostic: a non-toolu_ call_id passes through both directions unchanged", () => {
  // An id minted by the OpenAI backend on an earlier turn, before the swap.
  const callId = "call_9f2aB7kLmN0pQ";
  const translated = assertOkTranslate(
    minimalRequest({
      input: [
        functionToolNamespace(),
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "weather?" }],
        },
        {
          type: "function_call",
          call_id: callId,
          name: "get_weather",
          arguments: '{"city":"NYC"}',
        },
        { type: "function_call_output", call_id: callId, output: "sunny" },
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "thanks" }],
        },
      ],
    }),
  );
  const blocks = translated.value.messages.flatMap((m) =>
    Array.isArray(m.content) ? m.content : [],
  );
  const toolUse = blocks.find((b) => b.type === "tool_use");
  const toolResult = blocks.find((b) => b.type === "tool_result");
  assert.ok(
    toolUse?.type === "tool_use" && toolUse.id === callId,
    "history call_id must become the tool_use id byte-for-byte",
  );
  assert.ok(
    toolResult?.type === "tool_result" && toolResult.tool_use_id === callId,
    "history call_id must become the tool_result tool_use_id byte-for-byte",
  );
  const envelope = serializeCodexResponse(
    claudeResponse({
      content: [toolUseBlock({ id: callId })],
      stop_reason: "tool_use",
    }),
    "gpt-5-codex",
    translated.toolKindByName,
  );
  const call = envelope.output[0];
  assert.ok(
    call?.type === "function_call" && call.call_id === callId,
    "a non-toolu_ id must come back as the call_id unchanged",
  );
});

// ---------------------------------------------------------------------------
// 8. Tool-call count and argument-size ceilings (streamLimits.ts), both legs
// ---------------------------------------------------------------------------

function toolHistory(
  calls: number,
  overrides: { arguments?: string; output?: string } = {},
): CodexNativeInputItem[] {
  const ids = Array.from({ length: calls }, (_, i) => `call_${i}`);
  return [
    functionToolNamespace(),
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "hi" }],
    },
    ...ids.map(
      (id): CodexNativeInputItem => ({
        type: "function_call",
        call_id: id,
        name: "get_weather",
        arguments: overrides.arguments ?? "{}",
      }),
    ),
    ...ids.map(
      (id): CodexNativeInputItem => ({
        type: "function_call_output",
        call_id: id,
        output: overrides.output ?? "ok",
      }),
    ),
  ];
}

function isFallbackStreamError(code: string) {
  return (error: unknown): boolean =>
    error instanceof AnthropicFallbackStreamError && error.code === code;
}

await test("arguments_size_ceiling_enforced_both_directions", async () => {
  const oversized = "x".repeat(CODEX_STREAM_SIZE_CEILING_BYTES + 1);

  // Request ingestion: each carrier of tool text is bounded.
  assert.equal(
    translateError(
      minimalRequest({ input: toolHistory(1, { arguments: oversized }) }),
    ).code,
    "REQUEST_TOO_LARGE",
    "oversized function_call arguments must be refused as too large",
  );
  assert.equal(
    translateError(
      minimalRequest({ input: toolHistory(1, { output: oversized }) }),
    ).code,
    "REQUEST_TOO_LARGE",
    "an oversized tool output must be refused as too large",
  );
  assert.equal(
    translateError(
      minimalRequest({
        input: [
          customToolNamespace(),
          {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "hi" }],
          },
          {
            type: "custom_tool_call",
            call_id: "call_c",
            name: "exec",
            input: oversized,
          },
          { type: "custom_tool_call_output", call_id: "call_c", output: "ok" },
        ],
      }),
    ).code,
    "REQUEST_TOO_LARGE",
    "oversized custom_tool_call input must be refused as too large",
  );
  assertOkTranslate(
    minimalRequest({
      input: toolHistory(1, {
        arguments: "x".repeat(CODEX_STREAM_SIZE_CEILING_BYTES),
      }),
    }),
  );

  // Streaming response: the second half pushes one call past the ceiling.
  // Split across reads so no single read trips the unparsed-buffer ceiling.
  const half = "x".repeat(CODEX_STREAM_SIZE_CEILING_BYTES / 2);
  const { frames, result } = await driveWithKinds(
    multiChunkResponse([
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        toolUseStart(0, "toolu_big", "get_weather") +
        toolArgsDelta(0, `{"q":"${half}`),
      toolArgsDelta(0, half),
      toolArgsDelta(0, '"}') + contentBlockStop(0) + messageStopFrames(1),
    ]),
    new Map([["get_weather", "function"]]),
  );
  assert.equal(result.status, "failed", "an oversized call must fail the turn");
  assert.equal(
    result.error?.code,
    "tool_arguments_too_large",
    "the failure must carry the argument-size code",
  );
  assert.equal(
    eventNames(frames).filter(
      (n) => n === "response.function_call_arguments.delta",
    ).length,
    1,
    "the fragment that crosses the ceiling must not be forwarded",
  );
  assert.equal(
    eventNames(frames).includes("response.function_call_arguments.done"),
    false,
    "an oversized call must never be marked done",
  );
  assert.deepEqual(
    result.output.map((item) => item.status),
    ["incomplete"],
    "the oversized call must close incomplete, never completed",
  );

  // Non-streaming response.
  await assert.rejects(
    consumeAnthropicFallbackResponse(
      jsonResponse(
        claudeResponse({
          content: [
            toolUseBlock({
              input: { q: "x".repeat(CODEX_STREAM_SIZE_CEILING_BYTES) },
            }),
          ],
          stop_reason: "tool_use",
        }),
      ),
      "gpt-5-codex",
    ),
    isFallbackStreamError("tool_arguments_too_large"),
    "an oversized non-streaming tool_use must be refused",
  );
});

await test("tool_call_count_ceiling_enforced_both_directions", async () => {
  assert.equal(
    translateError(
      minimalRequest({ input: toolHistory(CODEX_STREAM_MAX_TOOL_CALLS + 1) }),
    ).code,
    "REQUEST_TOO_LARGE",
    "a history over the tool-call limit must be refused as too large",
  );

  const blocks = Array.from(
    { length: CODEX_STREAM_MAX_TOOL_CALLS + 1 },
    (_, i) =>
      toolUseStart(i, `toolu_${i}`, "get_weather") +
      toolArgsDelta(i, "{}") +
      contentBlockStop(i),
  ).join("");
  const { frames, result } = await driveWithKinds(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        blocks +
        messageStopFrames(1),
    ),
    new Map([["get_weather", "function"]]),
  );
  assert.equal(result.status, "failed", "one call too many must fail the turn");
  assert.equal(
    result.error?.code,
    "too_many_tool_calls",
    "the failure must carry the tool-call-count code",
  );
  assert.equal(
    eventNames(frames).filter((n) => n === "response.output_item.added").length,
    CODEX_STREAM_MAX_TOOL_CALLS,
    "the call over the limit must never be opened",
  );
  assert.equal(
    result.output.filter((item) => item.status === "completed").length,
    CODEX_STREAM_MAX_TOOL_CALLS,
    "every call up to the limit must still complete",
  );

  await assert.rejects(
    consumeAnthropicFallbackResponse(
      jsonResponse(
        claudeResponse({
          content: Array.from(
            { length: CODEX_STREAM_MAX_TOOL_CALLS + 1 },
            (_, i) => toolUseBlock({ id: `toolu_${i}` }),
          ),
          stop_reason: "tool_use",
        }),
      ),
      "gpt-5-codex",
    ),
    isFallbackStreamError("too_many_tool_calls"),
    "a non-streaming reply over the tool-call limit must be refused",
  );
});

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
