#!/usr/bin/env tsx
/** Determinism exception: pure request shaping for the Claude-on-Vertex
 * passthrough, proven without credentials or a live endpoint. */
import assert from "node:assert/strict";
import type { VertexPassthroughTerminal } from "../src/lib/types/index.js";
import {
  buildVertexAnthropicPayload,
  buildVertexAnthropicUrl,
  mapVertexOutputConfig,
  observeVertexUsage,
  readJsonUsage,
} from "../src/lib/proxy/vertexAnthropicFallback.js";

let passed = 0;
function test(name: string, run: () => void | Promise<void>) {
  const done = run();
  if (done instanceof Promise) {
    throw new Error("use asyncTest for async cases");
  }
  passed++;
  console.log(`PASS ${name}`);
}
async function asyncTest(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${name}`);
}

function sseStream(events: unknown[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const e of events) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      }
      controller.close();
    },
  });
}

async function drain(stream: ReadableStream<Uint8Array>): Promise<string> {
  let out = "";
  const decoder = new TextDecoder();
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    out += decoder.decode(value, { stream: true });
  }
  return out + decoder.decode();
}

test("drops only what Vertex rejects and pins the API version", () => {
  const body = {
    model: "claude-opus-5",
    context_management: { edits: [] },
    metadata: { user_id: "someone" },
    max_tokens: 64,
    stream: true,
    messages: [{ role: "user", content: "hi" }],
  };
  const out = buildVertexAnthropicPayload(body);
  // Only these two: model rides the URL, and context_management is refused
  // with "Extra inputs are not permitted". Everything else is caller intent.
  for (const gone of ["model", "context_management"]) {
    assert.equal(gone in out, false, `${gone} must not reach Vertex`);
  }
  // Vertex accepts metadata; dropping it would discard caller attribution.
  assert.deepEqual(out.metadata, { user_id: "someone" });
  assert.equal(out.anthropic_version, "vertex-2023-10-16");
  assert.equal(out.max_tokens, 64);
  assert.equal(out.stream, true);
  assert.deepEqual(out.messages, [{ role: "user", content: "hi" }]);
  // The caller's body is reused for other attempts; shaping must not mutate it.
  assert.equal(body.model, "claude-opus-5");
});

test("maps an effort level Vertex rejects onto the top level it accepts", () => {
  // claude-opus-4-6 refuses xhigh by name: "Supported levels: high, low, max,
  // medium". Dropping effort entirely would silently downgrade the turn.
  const out = buildVertexAnthropicPayload({
    model: "claude-opus-5",
    output_config: { effort: "xhigh" },
    messages: [],
  });
  assert.deepEqual(out.output_config, { effort: "max" });
});

test("passes through effort levels Vertex already accepts", () => {
  for (const level of ["low", "medium", "high", "max"]) {
    assert.deepEqual(mapVertexOutputConfig({ effort: level }), {
      effort: level,
    });
  }
});

test("an unmappable effort loses only that key, never its siblings", () => {
  assert.deepEqual(
    mapVertexOutputConfig({ effort: "nonsense", verbosity: "low" }),
    {
      verbosity: "low",
    },
  );
  assert.equal(mapVertexOutputConfig({ effort: "nonsense" }), undefined);
});

test("carries an agentic turn through untouched", () => {
  const system = [
    { type: "text", text: "policy", cache_control: { type: "ephemeral" } },
  ];
  const messages = [
    {
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: "toolu_1",
          name: "Bash",
          input: { command: "ls" },
        },
      ],
    },
    {
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: "toolu_1", content: "a.txt" },
      ],
    },
  ];
  const tools = [
    { name: "Bash", description: "run", input_schema: { type: "object" } },
  ];
  const out = buildVertexAnthropicPayload({
    model: "claude-opus-5",
    system,
    messages,
    tools,
    tool_choice: { type: "any" },
  });
  // Structure is what the SDK path destroyed: blocks flattened to strings and
  // cache_control stripped. Passthrough keeps all of it byte-identical.
  assert.deepEqual(out.system, system);
  assert.deepEqual(out.messages, messages);
  assert.deepEqual(out.tools, tools);
  assert.deepEqual(out.tool_choice, { type: "any" });
});

test("regional endpoint prefixes the host with the region", () => {
  assert.equal(
    buildVertexAnthropicUrl({
      projectId: "p1",
      location: "us-central1",
      model: "claude-opus-4-6",
      stream: true,
    }),
    "https://us-central1-aiplatform.googleapis.com/v1/projects/p1/locations/" +
      "us-central1/publishers/anthropic/models/claude-opus-4-6:streamRawPredict",
  );
});

test("global endpoint drops the host prefix but keeps locations/global", () => {
  const url = buildVertexAnthropicUrl({
    projectId: "p1",
    location: "global",
    model: "claude-opus-4-6",
    stream: true,
  });
  // `global-aiplatform.googleapis.com` does not resolve — it returned a 404
  // HTML page from Google's frontend rather than any API error.
  assert.equal(url.includes("global-aiplatform"), false);
  assert.equal(
    url,
    "https://aiplatform.googleapis.com/v1/projects/p1/locations/global/" +
      "publishers/anthropic/models/claude-opus-4-6:streamRawPredict",
  );
});

test("non-streaming requests use rawPredict", () => {
  const url = buildVertexAnthropicUrl({
    projectId: "p1",
    location: "us-east5",
    model: "claude-opus-4-6",
    stream: false,
  });
  assert.equal(url.endsWith(":rawPredict"), true);
  assert.equal(url.includes("streamRawPredict"), false);
});

await asyncTest("meters the hop without altering a single byte", async () => {
  const events = [
    {
      type: "message_start",
      message: {
        usage: {
          input_tokens: 1200,
          cache_creation_input_tokens: 50,
          cache_read_input_tokens: 900,
        },
      },
    },
    { type: "content_block_delta", delta: { type: "text_delta", text: "hi" } },
    { type: "message_delta", usage: { output_tokens: 7 } },
    { type: "message_delta", usage: { output_tokens: 42 } },
  ];
  const original = await drain(sseStream(events));
  let seen: VertexPassthroughTerminal | undefined;
  const forwarded = await drain(
    observeVertexUsage(sseStream(events), (t) => {
      seen = t;
    }),
  );
  // A metered hop must still be a passthrough.
  assert.equal(forwarded, original);
  assert.equal(seen?.status, 200);
  assert.equal(seen?.usage.inputTokens, 1200);
  assert.equal(seen?.usage.cacheCreationTokens, 50);
  assert.equal(seen?.usage.cacheReadTokens, 900);
  // The last message_delta restates the running total, so it wins.
  assert.equal(seen?.usage.outputTokens, 42);
});

await asyncTest(
  "reports a terminal even when the stream ends early",
  async () => {
    let seen: VertexPassthroughTerminal | undefined;
    await drain(
      observeVertexUsage(
        sseStream([
          { type: "message_start", message: { usage: { input_tokens: 5 } } },
        ]),
        (t) => {
          seen = t;
        },
      ),
    );
    assert.equal(seen?.status, 200, "the hop must never be left unfinalized");
    assert.equal(seen?.usage.inputTokens, 5);
  },
);

await asyncTest("finalizes once with 499 when the client cancels", async () => {
  // flush() never runs on a cancelled stream, so without explicit handling the
  // tracer would stay open and the tokens already spent would go unrecorded.
  const terminals: VertexPassthroughTerminal[] = [];
  const stream = observeVertexUsage(
    sseStream([
      { type: "message_start", message: { usage: { input_tokens: 77 } } },
      { type: "message_delta", usage: { output_tokens: 3 } },
    ]),
    (t) => {
      terminals.push(t);
    },
  );
  const reader = stream.getReader();
  await reader.read();
  await reader.cancel("client went away");
  assert.equal(terminals.length, 1, "exactly one terminal, never zero or two");
  assert.equal(terminals[0].status, 499);
  assert.equal(terminals[0].usage.inputTokens, 77);
});

await asyncTest(
  "finalizes with 502 when the upstream stream fails",
  async () => {
    const encoder = new TextEncoder();
    const failing = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "message_start", message: { usage: { input_tokens: 11 } } })}\n\n`,
          ),
        );
      },
      pull(controller) {
        controller.error(new Error("upstream reset"));
      },
    });
    let seen: VertexPassthroughTerminal | undefined;
    await assert.rejects(
      drain(
        observeVertexUsage(failing, (t) => {
          seen = t;
        }),
      ),
    );
    assert.equal(seen?.status, 502);
    assert.equal(seen?.errorMessage, "upstream reset");
    assert.equal(seen?.usage.inputTokens, 11);
  },
);

test("reads usage from a non-streaming reply", () => {
  // rawPredict returns one JSON object with no `data:` lines. Running that
  // through the SSE observer would report all-zero usage as though it were real.
  const usage = readJsonUsage(
    JSON.stringify({
      type: "message",
      usage: {
        input_tokens: 654,
        output_tokens: 37,
        cache_read_input_tokens: 12,
        cache_creation_input_tokens: 5,
      },
    }),
  );
  assert.equal(usage.inputTokens, 654);
  assert.equal(usage.outputTokens, 37);
  assert.equal(usage.cacheReadTokens, 12);
  assert.equal(usage.cacheCreationTokens, 5);
});

test("an unreadable non-streaming body reports zero rather than a guess", () => {
  const usage = readJsonUsage("<html>gateway error</html>");
  assert.deepEqual(usage, {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  });
});

// Vertex refuses `role: "system"` outright — "role 'system' is not supported on
// this model" — while the first-party Messages API accepts it anywhere but
// index 0. Claude Code interleaves these as positional notices, so every real
// agentic request carried them and every Vertex fallback died on a 400.
await test("converts interleaved system turns Vertex refuses", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-4-6",
    max_tokens: 32,
    system: [{ type: "text", text: "top-level system prompt" }],
    messages: [
      { role: "user", content: [{ type: "text", text: "first" }] },
      { role: "system", content: "a file changed on disk" },
      { role: "assistant", content: [{ type: "text", text: "noted" }] },
      { role: "system", content: [{ type: "text", text: "a tool appeared" }] },
      { role: "user", content: [{ type: "text", text: "carry on" }] },
    ],
  });
  const messages = payload.messages as Array<{
    role: string;
    content: unknown;
  }>;
  assert.equal(
    messages.filter((message) => message.role === "system").length,
    0,
    "no system turn may survive into the Vertex payload",
  );
  assert.equal(messages.length, 5, "turns are converted, never dropped");
  // Position carries the meaning of these notices, so it must not move.
  assert.equal(messages[1].role, "user");
  assert.deepEqual(messages[1].content, "a file changed on disk");
  assert.equal(messages[3].role, "user");
  assert.deepEqual(messages[3].content, [
    { type: "text", text: "a tool appeared" },
  ]);
  // The top-level system parameter is untouched: it is a different channel.
  assert.deepEqual(payload.system, [
    { type: "text", text: "top-level system prompt" },
  ]);
  assert.equal(payload.anthropic_version, "vertex-2023-10-16");
});

await test("leaves a history without system turns untouched", () => {
  const messages = [
    { role: "user", content: [{ type: "text", text: "hello" }] },
    { role: "assistant", content: [{ type: "text", text: "hi" }] },
  ];
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-4-6",
    max_tokens: 16,
    messages,
  });
  assert.equal(
    payload.messages,
    messages,
    "an untouched history must not be copied",
  );
});

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
