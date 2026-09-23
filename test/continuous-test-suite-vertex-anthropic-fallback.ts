#!/usr/bin/env tsx
/** Determinism exception: pure request shaping for the Claude-on-Vertex
 * passthrough, proven without credentials or a live endpoint. */
import assert from "node:assert/strict";
import type { VertexPassthroughTerminal } from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";
import {
  buildVertexAnthropicPayload,
  buildVertexAnthropicUrl,
  mapVertexOutputConfig,
  observeVertexUsage,
  readJsonUsage,
  withTransientNetworkRetry,
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

// Claude Code 2.1.x sends a system "directive" turn carrying its own
// `output_config`. The first-party API accepts it at any position but 0;
// Vertex's message schema is exactly {role, content} and rejects the request
// with "messages.1.output_config: Extra inputs are not permitted".
type ShapedMessage = Record<string, unknown> & {
  role: string;
  content: unknown;
};

await test("strips a directive's output_config and drops the empty turn it leaves", () => {
  const directive = {
    role: "system",
    content: [],
    output_config: { effort: "xhigh" },
  };
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    output_config: { effort: "xhigh" },
    messages: [
      { role: "user", content: [{ type: "text", text: "task" }] },
      directive,
      { role: "assistant", content: [{ type: "text", text: "ok" }] },
    ],
  });
  const messages = payload.messages as ShapedMessage[];
  assert.equal(messages.length, 2, "an empty directive turn must not survive");
  assert.deepEqual(
    messages.map((message) => message.role),
    ["user", "assistant"],
  );
  assert.deepEqual(payload.output_config, { effort: "max" });
  // The caller's body is reused by later attempts.
  assert.deepEqual(directive.output_config, { effort: "xhigh" });
});

await test("keeps a system notice's text when stripping its output_config", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    output_config: { effort: "high" },
    messages: [
      { role: "user", content: "task" },
      {
        role: "system",
        content: "a file changed on disk",
        output_config: { effort: "high" },
      },
    ],
  });
  const messages = payload.messages as ShapedMessage[];
  assert.deepEqual(messages[1], {
    role: "user",
    content: "a file changed on disk",
  });
});

await test("reduces every message to role and content at any position", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "a", stray: true },
      { role: "assistant", content: "b" },
      { role: "user", content: "c" },
      { role: "assistant", content: "d", output_config: { effort: "low" } },
    ],
  });
  for (const message of payload.messages as ShapedMessage[]) {
    assert.deepEqual(
      Object.keys(message).sort(),
      ["content", "role"],
      "a message may carry only role and content",
    );
  }
});

// Per-message effort "takes effect from the next user turn and holds until a
// later message changes it". Vertex has no per-message effort, so the level in
// force for the turn being answered becomes the request's top-level effort.
await test("applies a directive's effort from the next user turn", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      { role: "assistant", content: "ok" },
      { role: "system", content: [], output_config: { effort: "xhigh" } },
      { role: "user", content: "next" },
    ],
  });
  assert.deepEqual(payload.output_config, { effort: "max" });
  assert.equal((payload.messages as ShapedMessage[]).length, 3);
});

await test("a directive before the final user turn overrides the top-level effort", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    output_config: { effort: "high" },
    messages: [
      { role: "user", content: "task" },
      { role: "assistant", content: "ok" },
      { role: "system", content: [], output_config: { effort: "low" } },
      { role: "user", content: "next" },
    ],
  });
  assert.deepEqual(payload.output_config, { effort: "low" });
});

await test("the last directive before the final user turn wins", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    output_config: { effort: "high" },
    messages: [
      { role: "user", content: "a" },
      { role: "system", content: [], output_config: { effort: "max" } },
      { role: "user", content: "b" },
      { role: "system", content: [], output_config: { effort: "low" } },
      { role: "user", content: "c" },
    ],
  });
  assert.deepEqual(payload.output_config, { effort: "low" });
});

await test("a directive keeps the top-level settings it does not name", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    output_config: { effort: "high", verbosity: "low" },
    messages: [
      { role: "user", content: "a" },
      { role: "system", content: [], output_config: { effort: "medium" } },
      { role: "user", content: "b" },
    ],
  });
  assert.deepEqual(payload.output_config, {
    effort: "medium",
    verbosity: "low",
  });
});

await test("drops a directive turn that carries no content key at all", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      { role: "system", output_config: { effort: "xhigh" } },
    ],
  });
  assert.deepEqual(payload.messages, [{ role: "user", content: "task" }]);
});

await test("ignores a directive placed after the final user turn", () => {
  const withTopLevel = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    output_config: { effort: "low" },
    messages: [
      { role: "user", content: "task" },
      { role: "system", content: [], output_config: { effort: "xhigh" } },
    ],
  });
  assert.deepEqual(withTopLevel.output_config, { effort: "low" });
  const withoutTopLevel = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      { role: "system", content: [], output_config: { effort: "xhigh" } },
    ],
  });
  assert.equal(
    "output_config" in withoutTopLevel,
    false,
    "a directive for a later turn must not set this one's effort",
  );
});

// A turn-scoped system message "renders only while no role: user message comes
// after it in messages", and a user message carrying only tool_result counts.
// Once cleared it renders nothing, so it must not reach Vertex as a user turn.
await test("drops a turn-scoped system message once a later user message exists", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      {
        role: "system",
        clear_at: "next_user_message",
        content: "per-turn reminder",
      },
      {
        role: "assistant",
        content: [{ type: "tool_use", id: "t1", name: "Read", input: {} }],
      },
      {
        role: "user",
        content: [{ type: "tool_result", tool_use_id: "t1", content: "x" }],
      },
    ],
  });
  const texts = JSON.stringify(payload.messages);
  assert.equal(texts.includes("per-turn reminder"), false);
  assert.equal((payload.messages as ShapedMessage[]).length, 3);
});

await test("keeps a turn-scoped system message that no user message follows yet", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      {
        role: "system",
        clear_at: "next_user_message",
        content: "per-turn reminder",
      },
    ],
  });
  assert.deepEqual((payload.messages as ShapedMessage[])[1], {
    role: "user",
    content: "per-turn reminder",
  });
});

await test("a system message with clear_at never is kept like any other", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      { role: "system", clear_at: "never", content: "standing notice" },
      { role: "assistant", content: "ok" },
      { role: "user", content: "next" },
    ],
  });
  assert.deepEqual((payload.messages as ShapedMessage[])[1], {
    role: "user",
    content: "standing notice",
  });
});

// Claude Code announces a tool that became available mid-conversation with a
// `tool_addition` block. Vertex rejects the tag outright, so each becomes a
// text block in place: same position, same count, meaning preserved.
await test("turns tool_addition blocks into text in place", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      {
        role: "system",
        content: [
          { type: "text", text: "tools changed" },
          { type: "tool_addition", tool: { name: "Read", type: "custom" } },
          { type: "tool_addition", tool: { name: "Write", type: "custom" } },
          { type: "tool_addition", tool: { name: "Bash", type: "custom" } },
        ],
      },
    ],
  });
  const content = (payload.messages as ShapedMessage[])[1].content as Record<
    string,
    unknown
  >[];
  assert.equal(content.length, 4);
  assert.deepEqual(content[0], { type: "text", text: "tools changed" });
  assert.deepEqual(
    content.slice(1).map((block) => block.type),
    ["text", "text", "text"],
  );
  assert.deepEqual(
    content.slice(1).map((block) => block.text),
    [
      "Tool now available: Read",
      "Tool now available: Write",
      "Tool now available: Bash",
    ],
  );
});

await test("carries cache_control from a tool_addition onto its text", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "tool_addition",
            tool: { name: "Grep", type: "custom" },
            cache_control: { type: "ephemeral" },
          },
        ],
      },
    ],
  });
  const block = (
    (payload.messages as ShapedMessage[])[0].content as Record<
      string,
      unknown
    >[]
  )[0];
  assert.deepEqual(block, {
    type: "text",
    text: "Tool now available: Grep",
    cache_control: { type: "ephemeral" },
  });
});

// `tool_removal` is the documented counterpart that withdraws a tool from that
// point on; Vertex refuses it for the same reason.
await test("turns tool_removal blocks into text in place", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      {
        role: "system",
        content: [
          { type: "text", text: "tools changed" },
          {
            type: "tool_removal",
            tool: { type: "tool_reference", name: "Bash" },
          },
        ],
      },
    ],
  });
  const content = (payload.messages as ShapedMessage[])[1].content as Record<
    string,
    unknown
  >[];
  assert.deepEqual(content[1], {
    type: "text",
    text: "Tool no longer available: Bash",
  });
});

await test("names an MCP toolset reference by its server", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "tool_addition",
            tool: { type: "mcp_toolset_reference", server_name: "github" },
          },
        ],
      },
    ],
  });
  const block = (
    (payload.messages as ShapedMessage[])[0].content as Record<
      string,
      unknown
    >[]
  )[0];
  assert.equal(block.text, "Tool now available: github");
});

await test("a tool_addition without a readable name still becomes non-empty text", () => {
  for (const tool of [undefined, {}, "Read", { name: 42 }, { name: "  " }]) {
    const payload = buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      messages: [{ role: "user", content: [{ type: "tool_addition", tool }] }],
    });
    const block = (
      (payload.messages as ShapedMessage[])[0].content as Record<
        string,
        unknown
      >[]
    )[0];
    assert.equal(block.type, "text");
    assert.equal(block.text, "A tool became available.");
  }
});

await test("leaves string content, nested tool_result content and unknown blocks alone", () => {
  const toolResult = {
    type: "tool_result",
    tool_use_id: "toolu_1",
    content: [{ type: "tool_reference", tool_name: "Read" }],
  };
  const future = { type: "future_block", value: 1 };
  const messages = [
    { role: "user", content: "plain string" },
    { role: "user", content: [toolResult, future] },
  ];
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages,
  });
  assert.equal(
    payload.messages,
    messages,
    "nothing to rewrite, so the history must not be copied",
  );
});

// Claude Code stamps its version into the first system block as
// "x-anthropic-billing-header: cc_version=…". That is first-party billing
// plumbing; on Vertex it only triggers a client-version check against a model
// the client never asked for ("Claude Code 2.1.278 does not support this
// model"). The same marker is how oauthFetch.ts recognises the block.
const billingBlock = {
  type: "text",
  text: "x-anthropic-billing-header: cc_version=2.1.278.b8e; cc_entrypoint=cli; cch=00000;",
};

await test("removes the billing block and keeps every other system block as is", () => {
  const prompt = {
    type: "text",
    text: "You are an assistant.",
    cache_control: { type: "ephemeral" },
  };
  const system = [billingBlock, prompt];
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    system,
    messages: [{ role: "user", content: "hi" }],
  });
  assert.deepEqual(payload.system, [prompt]);
  assert.equal(system.length, 2, "the caller's system array must not change");
});

await test("drops system entirely when the billing block was its only entry", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    system: [billingBlock],
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal("system" in payload, false, "an empty system must not be sent");
});

await test("leaves a string system prompt untouched", () => {
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    system: "You are an assistant.",
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal(payload.system, "You are an assistant.");
});

// The generator (anthropicOAuth.ts buildStableClaudeCodeBillingHeader) always
// emits the marker first. Matching anywhere in the text would delete a user's
// own system block that merely talks about the header.
await test("keeps a system block that only mentions the billing marker", () => {
  const system = [
    {
      type: "text",
      text: "Explain what an x-anthropic-billing-header line is.",
    },
  ];
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    system,
    messages: [{ role: "user", content: "hi" }],
  });
  assert.equal(payload.system, system, "a user's block must not be removed");
});

await test("removes a billing block that starts with whitespace", () => {
  const prompt = { type: "text", text: "You are an assistant." };
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    system: [{ type: "text", text: `\n  ${billingBlock.text}` }, prompt],
    messages: [{ role: "user", content: "hi" }],
  });
  assert.deepEqual(payload.system, [prompt]);
});

// Anthropic caches only up to explicit cache_control markers, at most four per
// request. Removing the billing block must not silently remove a breakpoint.
function withWarnings(run: () => void): unknown[][] {
  const warnings: unknown[][] = [];
  const original = logger.warn;
  logger.warn = (...args: unknown[]) => {
    warnings.push(args);
  };
  try {
    run();
  } finally {
    logger.warn = original;
  }
  return warnings;
}

await test("carries a breakpoint from the billing block onto the next system block", () => {
  const marker = { type: "ephemeral", ttl: "1h" };
  const warnings = withWarnings(() => {
    const payload = buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      system: [
        { ...billingBlock, cache_control: marker },
        { type: "text", text: "You are an assistant." },
      ],
      messages: [{ role: "user", content: "hi" }],
    });
    assert.deepEqual(payload.system, [
      { type: "text", text: "You are an assistant.", cache_control: marker },
    ]);
  });
  assert.equal(warnings.length, 0, "a carried breakpoint needs no warning");
});

await test("warns rather than silently losing a breakpoint it cannot carry", () => {
  const alone = withWarnings(() => {
    const payload = buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      system: [{ ...billingBlock, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "hi" }],
    });
    assert.equal("system" in payload, false);
  });
  assert.equal(alone.length, 1, "a breakpoint with nowhere to go must warn");

  const ownMarker = { type: "ephemeral" };
  const occupied = withWarnings(() => {
    const payload = buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      system: [
        { ...billingBlock, cache_control: { type: "ephemeral", ttl: "1h" } },
        { type: "text", text: "prompt", cache_control: ownMarker },
      ],
      messages: [{ role: "user", content: "hi" }],
    });
    assert.deepEqual(payload.system, [
      { type: "text", text: "prompt", cache_control: ownMarker },
    ]);
  });
  assert.equal(occupied.length, 1, "a displaced breakpoint must warn");
});

// Some platforms accept `cache_control` on a message itself. Reducing a
// message to role and content must not drop that breakpoint either: it moves
// onto the message's last content block, which caches the same prefix.
await test("moves a message-level breakpoint onto the last content block", () => {
  const marker = { type: "ephemeral" };
  const warnings = withWarnings(() => {
    const payload = buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      messages: [
        { role: "user", content: "task" },
        {
          role: "system",
          cache_control: marker,
          content: [
            { type: "text", text: "a" },
            { type: "text", text: "b" },
          ],
        },
        { role: "user", content: "next" },
      ],
    });
    assert.deepEqual((payload.messages as ShapedMessage[])[1], {
      role: "user",
      content: [
        { type: "text", text: "a" },
        { type: "text", text: "b", cache_control: marker },
      ],
    });
  });
  assert.equal(warnings.length, 0, "a carried breakpoint needs no warning");
});

await test("wraps string content in a text block to carry a message-level breakpoint", () => {
  const marker = { type: "ephemeral" };
  const payload = buildVertexAnthropicPayload({
    model: "claude-opus-5-5",
    messages: [
      { role: "user", content: "task" },
      { role: "system", cache_control: marker, content: "notice" },
      { role: "user", content: "next" },
    ],
  });
  assert.deepEqual((payload.messages as ShapedMessage[])[1], {
    role: "user",
    content: [{ type: "text", text: "notice", cache_control: marker }],
  });
});

await test("warns when a message-level breakpoint has nowhere to go", () => {
  const ownMarker = { type: "ephemeral" };
  const occupied = withWarnings(() => {
    const payload = buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      messages: [
        { role: "user", content: "task" },
        {
          role: "system",
          cache_control: { type: "ephemeral", ttl: "1h" },
          content: [{ type: "text", text: "a", cache_control: ownMarker }],
        },
        { role: "user", content: "next" },
      ],
    });
    assert.deepEqual((payload.messages as ShapedMessage[])[1].content, [
      { type: "text", text: "a", cache_control: ownMarker },
    ]);
  });
  assert.equal(occupied.length, 1, "a displaced breakpoint must warn");

  const empty = withWarnings(() => {
    buildVertexAnthropicPayload({
      model: "claude-opus-5-5",
      messages: [
        { role: "user", content: "task" },
        {
          role: "system",
          cache_control: { type: "ephemeral" },
          content: [],
          output_config: { effort: "low" },
        },
        { role: "user", content: "next" },
      ],
    });
  });
  assert.equal(empty.length, 1, "a breakpoint on a dropped turn must warn");
});

await test("a captured-shape Claude Code request comes out Vertex-clean", () => {
  const thinking = {
    type: "thinking",
    thinking: "plan",
    signature: "sig-abc",
  };
  const toolUse = {
    type: "tool_use",
    id: "toolu_9",
    name: "Read",
    input: { path: "a.ts" },
  };
  const toolResult = {
    type: "tool_result",
    tool_use_id: "toolu_9",
    content: "file body",
  };
  for (const stream of [true, false]) {
    const payload = buildVertexAnthropicPayload({
      model: "claude-sonnet-5",
      stream,
      output_config: { effort: "xhigh" },
      system: [billingBlock, { type: "text", text: "prompt" }],
      messages: [
        { role: "user", content: [{ type: "text", text: "task" }] },
        { role: "system", content: [], output_config: { effort: "xhigh" } },
        { role: "assistant", content: [thinking, toolUse] },
        { role: "user", content: [toolResult] },
        {
          role: "system",
          content: [
            { type: "text", text: "tools changed" },
            { type: "tool_addition", tool: { name: "Edit", type: "custom" } },
          ],
          output_config: { effort: "xhigh" },
        },
      ],
    });
    const serialized = JSON.stringify(payload);
    assert.equal(serialized.includes("tool_addition"), false);
    assert.equal(serialized.includes("x-anthropic-billing-header"), false);
    const messages = payload.messages as ShapedMessage[];
    for (const message of messages) {
      assert.deepEqual(Object.keys(message).sort(), ["content", "role"]);
      assert.notEqual(message.role, "system");
    }
    assert.deepEqual(messages[1].content, [thinking, toolUse]);
    assert.deepEqual(messages[2].content, [toolResult]);
    assert.equal(payload.stream, stream);
  }
});

// A DNS blip while fetching the Google token failed 61 fallbacks on
// 2026-09-23 (getaddrinfo ENOTFOUND oauth2.googleapis.com). One short retry
// covers a transient resolver failure without masking a real outage.
function networkError(code: string): Error {
  return Object.assign(new Error(`getaddrinfo ${code} oauth2.googleapis.com`), {
    code,
  });
}

await asyncTest(
  "retries a token fetch once on a transient network error",
  async () => {
    let calls = 0;
    const token = await withTransientNetworkRetry(async () => {
      calls++;
      if (calls === 1) {
        throw networkError("ENOTFOUND");
      }
      return "token";
    }, 0);
    assert.equal(token, "token");
    assert.equal(calls, 2);
  },
);

await asyncTest(
  "does not retry an error that is not a transient network failure",
  async () => {
    let calls = 0;
    await assert.rejects(
      withTransientNetworkRetry(async () => {
        calls++;
        throw new Error("invalid_grant");
      }, 0),
    );
    assert.equal(calls, 1);
  },
);

await asyncTest("gives up after one retry", async () => {
  let calls = 0;
  await assert.rejects(
    withTransientNetworkRetry(async () => {
      calls++;
      throw networkError("EAI_AGAIN");
    }, 0),
  );
  assert.equal(calls, 2);
});

// The proxy's shared classifier (proxyFetch.ts) decides what every other
// upstream call retries; the token fetch must agree with it, not keep a list.
await asyncTest(
  "retries what the shared proxy classifier treats as transient",
  async () => {
    let calls = 0;
    const token = await withTransientNetworkRetry(async () => {
      calls++;
      if (calls === 1) {
        throw new TypeError("fetch failed", {
          cause: networkError("UND_ERR_CONNECT_TIMEOUT"),
        });
      }
      return "token";
    }, 0);
    assert.equal(token, "token");
    assert.equal(calls, 2);
  },
);

await asyncTest(
  "recognises a network code named only in the message",
  async () => {
    let calls = 0;
    const token = await withTransientNetworkRetry(async () => {
      calls++;
      if (calls === 1) {
        throw new Error(
          "request to https://oauth2.googleapis.com/token failed, reason: getaddrinfo ENOTFOUND oauth2.googleapis.com",
        );
      }
      return "token";
    }, 0);
    assert.equal(token, "token");
    assert.equal(calls, 2);
  },
);

await asyncTest(
  "recognises a network code carried on the error's cause",
  async () => {
    let calls = 0;
    const token = await withTransientNetworkRetry(async () => {
      calls++;
      if (calls === 1) {
        throw new Error("request failed", {
          cause: networkError("ECONNRESET"),
        });
      }
      return "token";
    }, 0);
    assert.equal(token, "token");
    assert.equal(calls, 2);
  },
);

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
