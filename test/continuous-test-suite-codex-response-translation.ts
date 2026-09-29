#!/usr/bin/env tsx
/**
 * Continuous Test Suite — Codex response/stream codec (Anthropic -> Codex)
 *
 * ## Determinism exception (CLAUDE.md rule 15)
 *
 * This suite imports `codexResponsesFormat.js`/`codexToAnthropicFallback.js`
 * internals directly rather than driving a shipped surface. What determinism
 * buys: byte-exact SSE frame ordering, a specific mid-stream reader failure,
 * an exact truncated-JSON tool-call argument sequence, and a randomized
 * ordering-invariant sweep over synthetic transcripts. None of that is
 * something a live provider call can be made to emit on demand — a live
 * backend cannot be told to truncate one particular tool-call argument or to
 * fail its socket read after exactly one frame. Mirrors
 * `test/continuous-test-suite-codex-outbound-translation.ts` and
 * `test/continuous-test-suite-vertex-anthropic-fallback.ts`: this suite's
 * whole module graph is `src/`, never `dist/` (the one-module-graph rule in
 * CLAUDE.md's rule 15).
 *
 * Defines its own local HTTP-fixture helpers below rather than importing
 * `withHttpFixture` from `continuous-test-suite-proxy-telemetry.ts`, which
 * does not export it.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  buildCodexResponseItem,
  serializeCodexResponse,
} from "../src/lib/proxy/codexResponsesFormat.js";
import {
  consumeAnthropicFallbackResponse,
  createAnthropicFallbackStream,
} from "../src/lib/proxy/codexToAnthropicFallback.js";
import { extractSSEEvents } from "../src/lib/proxy/sseInterceptor.js";
import type {
  ClaudeResponse,
  ClaudeUsage,
  CodexResponseEnvelope,
} from "../src/lib/types/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, "fixtures");
const MODEL = "gpt-5-codex";

// ---------------------------------------------------------------------------
// Local HTTP-fixture helpers
// ---------------------------------------------------------------------------

/** A `Response` whose body delivers `sseText` in a single chunk. */
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

/**
 * A `Response` whose body yields each string in `chunks` on a separate
 * `reader.read()` call, then errors the stream on the read after the last
 * chunk — for driving the mid-stream reader-failure path, which needs the
 * failure to land on a *later* read than the one `preflightAnthropicStream`
 * itself performs.
 */
function failingMultiChunkResponse(chunks: string[]): Response {
  let index = 0;
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index]));
        index++;
        return;
      }
      controller.error(new Error("simulated upstream read failure"));
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  });
}

async function drive(
  response: Response,
): Promise<{ frames: string[]; result: CodexResponseEnvelope }> {
  const stream = await createAnthropicFallbackStream(response, MODEL);
  const frames: string[] = [];
  let step = await stream.frames.next();
  while (!step.done) {
    frames.push(step.value);
    step = await stream.frames.next();
  }
  return { frames, result: step.value };
}

/**
 * Replaces the random `resp_`/`msg_`/`fc_` ids and the wall-clock
 * `created_at` timestamp with sequential placeholders, so two runs over
 * equivalent input can be compared for structural equality despite carrying
 * fresh random ids each time.
 */
function normalizeIds(text: string): string {
  const counters = new Map<string, number>();
  const seen = new Map<string, string>();
  return text
    .replace(/"created_at":\d+/g, '"created_at":0')
    .replace(/\b(resp|msg|fc)_[A-Za-z0-9_-]+/g, (match, prefix: string) => {
      const existing = seen.get(match);
      if (existing) {
        return existing;
      }
      const n = (counters.get(prefix) ?? 0) + 1;
      counters.set(prefix, n);
      const placeholder = `${prefix}_ID${n}`;
      seen.set(match, placeholder);
      return placeholder;
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

function messageStopFrames(outputTokens: number): string {
  return (
    sseFrame("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: outputTokens },
    }) + sseFrame("message_stop", { type: "message_stop" })
  );
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
// 1. Golden frame byte comparison
// ---------------------------------------------------------------------------

await test("golden frame byte comparison", async () => {
  const raw = readFileSync(
    path.join(FIXTURES_DIR, "anthropic-to-codex-golden.sse"),
    "utf8",
  );
  const marker = "===EXPECTED_CODEX_SSE===\n";
  const markerIndex = raw.indexOf(marker);
  if (markerIndex < 0) {
    throw new Error("golden fixture is missing its section marker");
  }
  const input = raw.slice(0, markerIndex);
  const expected = raw.slice(markerIndex + marker.length);
  const { frames } = await drive(singleChunkResponse(input));
  assert.equal(
    normalizeIds(frames.join("")),
    expected,
    "golden frame sequence mismatch — see anthropic-to-codex-golden.sse",
  );
});

// ---------------------------------------------------------------------------
// 2. message_start populates cache usage
// ---------------------------------------------------------------------------

await test("message_start populates cache usage", async () => {
  const transcript =
    messageStartFrame({
      input_tokens: 500,
      output_tokens: 0,
      cache_read_input_tokens: 900,
      cache_creation_input_tokens: 100,
    }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "hi" },
    }) +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 0 }) +
    messageStopFrames(5);

  const { result } = await drive(singleChunkResponse(transcript));
  assert.deepEqual(result.usage?.input_tokens_details, {
    cached_tokens: 900,
    cache_write_tokens: 100,
  });
});

// Fix pass 2 item 2: the 1-hour cache-write subset (`usage.cache_creation.
// ephemeral_1h_input_tokens`) must be captured at BOTH codec sites, each with
// an absent-breakdown control that keeps today's exact usage shape.
const ONE_HOUR_BREAKDOWN = {
  ephemeral_1h_input_tokens: 60,
  ephemeral_5m_input_tokens: 40,
};

const nonStreamingBody = (usage: Record<string, unknown>): Response =>
  new Response(
    JSON.stringify({
      id: "msg_cache_1h",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5",
      content: [{ type: "text", text: "ok" }],
      stop_reason: "end_turn",
      stop_sequence: null,
      usage,
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

await test("streaming message_start carries the 1-hour cache-write breakdown", async () => {
  const transcript = (
    usage: ClaudeUsage & { cache_creation?: typeof ONE_HOUR_BREAKDOWN },
  ): string =>
    messageStartFrame(usage) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "hi" },
    }) +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 0 }) +
    messageStopFrames(5);

  const withBreakdown = await drive(
    singleChunkResponse(
      transcript({
        input_tokens: 500,
        output_tokens: 0,
        cache_creation_input_tokens: 100,
        cache_creation: ONE_HOUR_BREAKDOWN,
      }),
    ),
  );
  assert.deepEqual(withBreakdown.result.usage?.input_tokens_details, {
    cache_write_tokens: 100,
    cache_write_1h_tokens: 60,
  });

  const control = await drive(
    singleChunkResponse(
      transcript({
        input_tokens: 500,
        output_tokens: 0,
        cache_creation_input_tokens: 100,
      }),
    ),
  );
  assert.deepEqual(
    control.result.usage?.input_tokens_details,
    { cache_write_tokens: 100 },
    "control: an absent breakdown must leave the usage details exactly as before",
  );
});

await test("non-streaming response carries the 1-hour cache-write breakdown", async () => {
  const withBreakdown = await consumeAnthropicFallbackResponse(
    nonStreamingBody({
      input_tokens: 500,
      output_tokens: 5,
      cache_creation_input_tokens: 100,
      cache_creation: ONE_HOUR_BREAKDOWN,
    }),
    MODEL,
  );
  assert.deepEqual(withBreakdown.usage?.input_tokens_details, {
    cache_write_tokens: 100,
    cache_write_1h_tokens: 60,
  });

  const control = await consumeAnthropicFallbackResponse(
    nonStreamingBody({
      input_tokens: 500,
      output_tokens: 5,
      cache_creation_input_tokens: 100,
    }),
    MODEL,
  );
  assert.deepEqual(
    control.usage?.input_tokens_details,
    { cache_write_tokens: 100 },
    "control: an absent breakdown must leave the usage details exactly as before",
  );

  const malformed = await consumeAnthropicFallbackResponse(
    nonStreamingBody({
      input_tokens: 500,
      output_tokens: 5,
      cache_creation_input_tokens: 100,
      cache_creation: { ephemeral_1h_input_tokens: -3 },
    }),
    MODEL,
  );
  assert.deepEqual(
    malformed.usage?.input_tokens_details,
    { cache_write_tokens: 100 },
    "a malformed breakdown is dropped, never trusted",
  );
});

// ---------------------------------------------------------------------------
// 3. Tool-call arguments forward incrementally, not buffered
// ---------------------------------------------------------------------------

await test("tool-call arguments forward incrementally, not buffered", async () => {
  const chunks = ['{"loc', 'ation":', '"NYC"}'];
  const transcript =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_x",
        name: "get_weather",
        input: {},
      },
    }) +
    chunks
      .map((partial_json) =>
        sseFrame("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json },
        }),
      )
      .join("") +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 0 }) +
    messageStopFrames(1);

  const { frames } = await drive(singleChunkResponse(transcript));
  const deltaFrames = frames.filter((frame) =>
    frame.startsWith("event: response.function_call_arguments.delta"),
  );
  assert.equal(
    deltaFrames.length,
    chunks.length,
    "expected one function_call_arguments.delta frame per input_json_delta chunk",
  );
  deltaFrames.forEach((frame, i) => {
    const dataLine = frame.split("\n")[1] ?? "";
    const payload = JSON.parse(dataLine.slice("data: ".length)) as {
      delta: string;
    };
    assert.equal(
      payload.delta,
      chunks[i],
      `delta frame ${i} did not carry its raw chunk unmodified`,
    );
  });
});

// ---------------------------------------------------------------------------
// 4. Malformed tool JSON routes to response.failed
// ---------------------------------------------------------------------------

await test("malformed tool JSON routes to response.failed", async () => {
  const transcript =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "tool_use",
        id: "toolu_bad",
        name: "get_weather",
        input: {},
      },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "input_json_delta", partial_json: '{"a":' },
    }) +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 0 });

  const { frames, result } = await drive(singleChunkResponse(transcript));
  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "invalid_tool_arguments");
  assert.match(result.error?.message ?? "", /^Anthropic fallback /);
  const doneIndex = frames.findIndex((frame) =>
    frame.startsWith("event: response.function_call_arguments.done"),
  );
  assert.equal(
    doneIndex,
    -1,
    "no function_call_arguments.done frame may precede a malformed-JSON failure",
  );
  const failedIndex = frames.findIndex((frame) =>
    frame.startsWith("event: response.failed"),
  );
  assert.equal(failedIndex, frames.length - 1);
});

// ---------------------------------------------------------------------------
// 5. Unmapped events are silently ignored
// ---------------------------------------------------------------------------

await test("unmapped events are silently ignored", async () => {
  const withNoise =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    sseFrame("ping", { type: "ping" }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "a" },
    }) +
    sseFrame("ping", { type: "ping" }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "b" },
    }) +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 0 }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 1,
      content_block: { type: "thinking", thinking: "" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 1,
      delta: { type: "thinking_delta", thinking: "reasoning..." },
    }) +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 1 }) +
    messageStopFrames(2);

  const withoutNoise =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "a" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "b" },
    }) +
    sseFrame("content_block_stop", { type: "content_block_stop", index: 0 }) +
    messageStopFrames(2);

  const withNoiseResult = await drive(singleChunkResponse(withNoise));
  const withoutNoiseResult = await drive(singleChunkResponse(withoutNoise));

  assert.equal(
    normalizeIds(withNoiseResult.frames.join("")),
    normalizeIds(withoutNoiseResult.frames.join("")),
    "ping/thinking frames must not change the emitted Codex-shape output",
  );
});

// ---------------------------------------------------------------------------
// 6. Ordering invariants hold over randomized streams
// ---------------------------------------------------------------------------

/** Seeded PRNG (mulberry32) so a failure reproduces from its logged seed. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildRandomTranscript(rng: () => number): string {
  const blockCount = 1 + Math.floor(rng() * 3);
  let out = messageStartFrame({ input_tokens: 1, output_tokens: 0 });
  if (rng() < 0.5) {
    out += sseFrame("ping", { type: "ping" });
  }
  for (let index = 0; index < blockCount; index++) {
    if (rng() < 0.5) {
      out += sseFrame("content_block_start", {
        type: "content_block_start",
        index,
        content_block: { type: "text", text: "" },
      });
      const deltaCount = 1 + Math.floor(rng() * 3);
      for (let d = 0; d < deltaCount; d++) {
        out += sseFrame("content_block_delta", {
          type: "content_block_delta",
          index,
          delta: { type: "text_delta", text: `t${index}_${d}` },
        });
        if (rng() < 0.3) {
          out += sseFrame("ping", { type: "ping" });
        }
      }
    } else {
      out += sseFrame("content_block_start", {
        type: "content_block_start",
        index,
        content_block: {
          type: "tool_use",
          id: `toolu_${index}`,
          name: `tool_${index}`,
          input: {},
        },
      });
      const argsStr = JSON.stringify({ n: index, block: `b${index}` });
      const splitPoint = Math.max(
        1,
        Math.min(argsStr.length - 1, Math.floor(rng() * argsStr.length)),
      );
      for (const partial_json of [
        argsStr.slice(0, splitPoint),
        argsStr.slice(splitPoint),
      ]) {
        out += sseFrame("content_block_delta", {
          type: "content_block_delta",
          index,
          delta: { type: "input_json_delta", partial_json },
        });
      }
    }
    out += sseFrame("content_block_stop", {
      type: "content_block_stop",
      index,
    });
  }
  out += messageStopFrames(1);
  return out;
}

await test("ordering invariants hold over randomized streams", async () => {
  const seeds = Array.from({ length: 25 }, (_, i) => i + 1);
  for (const seed of seeds) {
    const rng = mulberry32(seed);
    const transcript = buildRandomTranscript(rng);
    const { frames, result } = await drive(singleChunkResponse(transcript));
    const joined = frames.join("");
    const { events, remainder } = extractSSEEvents(joined);
    assert.equal(remainder, "", `seed ${seed}: trailing partial frame`);
    assert.ok(events.length > 0, `seed ${seed}: no events emitted`);

    // Invariant 1: exactly one response.created, first.
    assert.equal(
      events[0]?.event,
      "response.created",
      `seed ${seed}: first event was not response.created`,
    );
    const createdCount = events.filter(
      (e) => e.event === "response.created",
    ).length;
    assert.equal(createdCount, 1, `seed ${seed}: response.created not unique`);

    // Invariant 2 & 3: added precedes its own index's events; items never interleave.
    let openIndex: number | null = null;
    const seenAdded = new Set<number>();
    const closedIds: string[] = [];
    for (const event of events) {
      const payload = JSON.parse(event.data) as Record<string, unknown>;
      const isTerminal =
        event.event === "response.completed" ||
        event.event === "response.incomplete" ||
        event.event === "response.failed";
      if (isTerminal) {
        continue;
      }
      const outputIndex = payload.output_index;
      if (typeof outputIndex !== "number") {
        continue;
      }
      if (event.event === "response.output_item.added") {
        assert.equal(
          openIndex,
          null,
          `seed ${seed}: output_index ${outputIndex} opened before ${openIndex} closed`,
        );
        openIndex = outputIndex;
        seenAdded.add(outputIndex);
        continue;
      }
      assert.ok(
        seenAdded.has(outputIndex),
        `seed ${seed}: event for output_index ${outputIndex} before its output_item.added`,
      );
      assert.equal(
        openIndex,
        outputIndex,
        `seed ${seed}: event for output_index ${outputIndex} while ${openIndex} was open`,
      );
      if (event.event === "response.output_item.done") {
        const item = payload.item as { id: string };
        closedIds.push(item.id);
        openIndex = null;
      }
    }

    // Invariant 4: exactly one terminal event, last.
    const terminalEvents = events.filter(
      (e) =>
        e.event === "response.completed" ||
        e.event === "response.incomplete" ||
        e.event === "response.failed",
    );
    assert.equal(
      terminalEvents.length,
      1,
      `seed ${seed}: expected exactly one terminal event`,
    );
    assert.equal(
      events[events.length - 1]?.event,
      terminalEvents[0]?.event,
      `seed ${seed}: terminal event was not last`,
    );

    // Invariant 5: terminal output[] equals the closed-item id sequence, in order.
    const terminalIds = result.output.map((item) => item.id);
    assert.deepEqual(
      terminalIds,
      closedIds,
      `seed ${seed}: terminal output[] does not match the closed-item sequence`,
    );
  }
});

// ---------------------------------------------------------------------------
// 7. Mid-stream reader failure closes the open item incomplete
// ---------------------------------------------------------------------------

await test("mid-stream reader failure closes the open item incomplete", async () => {
  const firstChunk =
    messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
    sseFrame("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    }) +
    sseFrame("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: { type: "text_delta", text: "partial" },
    });

  const { frames, result } = await drive(
    failingMultiChunkResponse([firstChunk]),
  );
  assert.ok(frames.length > 0, "expected at least one frame before failure");
  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "upstream_read_error");
  assert.equal(result.output.length, 1);
  assert.equal(result.output[0]?.status, "incomplete");
  const failedIndex = frames.findIndex((frame) =>
    frame.startsWith("event: response.failed"),
  );
  assert.equal(
    failedIndex,
    frames.length - 1,
    "response.failed must be the last frame and no further frames may follow it",
  );
});

// ---------------------------------------------------------------------------
// 8. Non-streaming path shares item construction
// ---------------------------------------------------------------------------

await test("non-streaming path shares item construction", async () => {
  const claudeResponse: ClaudeResponse = {
    id: "msg_nonstream",
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: "hello there" },
      {
        type: "tool_use",
        id: "toolu_ns1",
        name: "lookup",
        input: { q: "x" },
      },
    ],
    model: "claude-sonnet-5",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 3, output_tokens: 4 },
  };

  const envelope = serializeCodexResponse(claudeResponse, MODEL);
  assert.equal(envelope.output.length, 2);

  const [messageItem, functionCallItem] = envelope.output;
  const expectedMessageItem = buildCodexResponseItem(
    claudeResponse.content[0],
    messageItem?.id ?? "",
  );
  const expectedFunctionCallItem = buildCodexResponseItem(
    claudeResponse.content[1],
    functionCallItem?.id ?? "",
  );
  assert.deepEqual(messageItem, expectedMessageItem);
  assert.deepEqual(functionCallItem, expectedFunctionCallItem);
});

// ---------------------------------------------------------------------------
// 9. Tool-call id round-trips without a mapping table
// ---------------------------------------------------------------------------

await test("tool-call id round-trips without a mapping table", async () => {
  const claudeResponse: ClaudeResponse = {
    id: "msg_id_roundtrip",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: "toolu_roundtrip_789",
        name: "lookup",
        input: {},
      },
    ],
    model: "claude-sonnet-5",
    stop_reason: "tool_use",
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
  const envelope = serializeCodexResponse(claudeResponse, MODEL);
  const item = envelope.output[0];
  assert.ok(item && item.type === "function_call");
  if (item && item.type === "function_call") {
    assert.equal(item.call_id, "toolu_roundtrip_789");
  }

  const formatSource = readFileSync(
    path.join(
      __dirname,
      "..",
      "src",
      "lib",
      "proxy",
      "codexResponsesFormat.ts",
    ),
    "utf8",
  );
  const driverSource = readFileSync(
    path.join(
      __dirname,
      "..",
      "src",
      "lib",
      "proxy",
      "codexToAnthropicFallback.ts",
    ),
    "utf8",
  );
  const importLines = [
    ...formatSource.matchAll(/^import .*from ["'](.+)["'];?$/gm),
    ...driverSource.matchAll(/^import .*from ["'](.+)["'];?$/gm),
  ].map((m) => m[1] ?? "");
  const mappingImport = importLines.find((specifier) =>
    /mapping/i.test(specifier),
  );
  assert.equal(
    mappingImport,
    undefined,
    "no id-mapping module may be imported — the call_id is the reused tool_use id",
  );
});

// ---------------------------------------------------------------------------
// 10. CI-gating check
// ---------------------------------------------------------------------------

await test("CI-gating check", () => {
  const scriptSource = readFileSync(
    path.join(__dirname, "..", "scripts", "run-proxy-reliability.mjs"),
    "utf8",
  );
  assert.ok(
    scriptSource.includes(
      "test/continuous-test-suite-codex-response-translation.ts",
    ),
    "scripts/run-proxy-reliability.mjs must gate this suite in CI",
  );
});

// ---------------------------------------------------------------------------
// 11. Review fixes
// ---------------------------------------------------------------------------

function toolUseStart(index: number, id: string): string {
  return sseFrame("content_block_start", {
    type: "content_block_start",
    index,
    content_block: { type: "tool_use", id, name: "list_files", input: {} },
  });
}

function eventNames(frames: string[]): string[] {
  return frames.map((frame) => frame.slice(7, frame.indexOf("\n")));
}

await test("the stream opens with response.created then response.in_progress", async () => {
  const { frames } = await drive(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        messageStopFrames(1),
    ),
  );
  assert.deepEqual(eventNames(frames).slice(0, 2), [
    "response.created",
    "response.in_progress",
  ]);
});

await test("a zero-argument tool call emits {} with one delta, not an empty string", async () => {
  const { frames, result } = await drive(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        toolUseStart(0, "toolu_noargs") +
        sseFrame("content_block_stop", {
          type: "content_block_stop",
          index: 0,
        }) +
        messageStopFrames(1),
    ),
  );
  const deltas = frames.filter((frame) =>
    frame.startsWith("event: response.function_call_arguments.delta"),
  );
  assert.equal(deltas.length, 1);
  assert.ok(deltas[0]!.includes('"delta":"{}"'));
  const done = frames.find((frame) =>
    frame.startsWith("event: response.function_call_arguments.done"),
  );
  assert.ok(done?.includes('"arguments":"{}"'));
  const call = result.output[0];
  assert.equal(call?.type, "function_call");
  assert.equal(
    call?.type === "function_call" ? call.arguments : undefined,
    "{}",
  );
});

await test("a mid-stream Anthropic error event ends the turn with response.failed", async () => {
  const { frames, result } = await drive(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        sseFrame("content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        }) +
        sseFrame("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: "partial" },
        }) +
        sseFrame("error", {
          type: "error",
          error: { type: "overloaded_error", message: "Overloaded" },
        }),
    ),
  );
  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "overloaded_error");
  const names = eventNames(frames);
  assert.equal(names[names.length - 1], "response.failed");
  assert.ok(!names.includes("response.completed"));
});

await test("an empty text block yields no item on either path", async () => {
  const emptyText = sseFrame("content_block_start", {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  });
  const { result } = await drive(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        emptyText +
        sseFrame("content_block_stop", {
          type: "content_block_stop",
          index: 0,
        }) +
        toolUseStart(1, "toolu_after_empty") +
        sseFrame("content_block_stop", {
          type: "content_block_stop",
          index: 1,
        }) +
        messageStopFrames(1),
    ),
  );
  assert.deepEqual(
    result.output.map((item) => item.type),
    ["function_call"],
  );
  const nonStreaming = serializeCodexResponse(
    {
      id: "msg_empty",
      type: "message",
      role: "assistant",
      model: "claude-sonnet-5",
      content: [
        { type: "text", text: "" },
        {
          type: "tool_use",
          id: "toolu_after_empty",
          name: "list_files",
          input: {},
        },
      ],
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 1, output_tokens: 1 },
    } as ClaudeResponse,
    MODEL,
  );
  assert.deepEqual(
    nonStreaming.output.map((item) => item.type),
    ["function_call"],
  );
});

await test("non-streaming usage with malformed counts is coerced, not trusted", async () => {
  const envelope = await consumeAnthropicFallbackResponse(
    new Response(
      JSON.stringify({
        id: "msg_bad_usage",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5",
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: "12",
          output_tokens: 3,
          cache_read_input_tokens: "lots",
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
    MODEL,
  );
  assert.equal(envelope.usage?.input_tokens, 0);
  assert.equal(envelope.usage?.output_tokens, 3);
  assert.equal(envelope.usage?.input_tokens_details, undefined);
});

await test("negative usage counts are coerced to 0 or omitted, never subtracted", async () => {
  const envelope = await consumeAnthropicFallbackResponse(
    new Response(
      JSON.stringify({
        id: "msg_negative_usage",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-5",
        content: [{ type: "text", text: "ok" }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: -40,
          output_tokens: 3,
          cache_read_input_tokens: -5,
          cache_creation_input_tokens: 7,
        },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
    MODEL,
  );
  assert.equal(envelope.usage?.input_tokens, 7);
  assert.equal(envelope.usage?.total_tokens, 10);
  assert.deepEqual(envelope.usage?.input_tokens_details, {
    cache_write_tokens: 7,
  });

  const { result } = await drive(
    singleChunkResponse(
      messageStartFrame({
        input_tokens: -40,
        output_tokens: 0,
        cache_read_input_tokens: -5,
      }) +
        sseFrame("message_delta", {
          type: "message_delta",
          delta: { stop_reason: "end_turn" },
          usage: { output_tokens: -3 },
        }) +
        sseFrame("message_stop", { type: "message_stop" }),
    ),
  );
  assert.equal(result.usage?.input_tokens, 0);
  assert.equal(result.usage?.output_tokens, 0);
  assert.equal(result.usage?.total_tokens, 0);
  assert.equal(result.usage?.input_tokens_details, undefined);
});

await test("server_tool_use argument fragments are ignored, not fed to a function call", async () => {
  const { result } = await drive(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        sseFrame("content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: {
            type: "server_tool_use",
            id: "srvtoolu_1",
            name: "web_search",
            input: {},
          },
        }) +
        sseFrame("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '{"query":"x"}' },
        }) +
        sseFrame("content_block_stop", {
          type: "content_block_stop",
          index: 0,
        }) +
        sseFrame("content_block_start", {
          type: "content_block_start",
          index: 1,
          content_block: { type: "text", text: "" },
        }) +
        sseFrame("content_block_delta", {
          type: "content_block_delta",
          index: 1,
          delta: { type: "text_delta", text: "found it" },
        }) +
        sseFrame("content_block_stop", {
          type: "content_block_stop",
          index: 1,
        }) +
        messageStopFrames(2),
    ),
  );
  assert.equal(result.status, "completed");
  assert.deepEqual(
    result.output.map((item) => item.type),
    ["message"],
  );
});

await test("a serializer throw after response.created still ends in response.failed", async () => {
  // Malformed arguments with no content_block_stop: message_stop's close of
  // the open call is what throws, outside the content_block_stop handler.
  const { frames, result } = await drive(
    singleChunkResponse(
      messageStartFrame({ input_tokens: 1, output_tokens: 0 }) +
        toolUseStart(0, "toolu_unclosed") +
        sseFrame("content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "input_json_delta", partial_json: '{"a":' },
        }) +
        messageStopFrames(1),
    ),
  );
  assert.equal(result.status, "failed");
  assert.equal(result.error?.code, "translation_error");
  const names = eventNames(frames);
  assert.equal(names[names.length - 1], "response.failed");
});

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
