#!/usr/bin/env tsx
/** Determinism exception: fixed context ceilings and recorded tool/media payloads
 * prove pre-dispatch policy without live inference or provider credentials. */
import "./helpers/proxyTestIsolation.js";
import assert from "node:assert/strict";
import {
  prepareProxyRequestContext,
  parseProxyContextPolicy,
} from "../src/lib/proxy/proxyContextPreflight.js";
import {
  clearRuntimeContextWindows,
  clearRuntimeOutputCeilings,
  registerRuntimeContextWindow,
  registerRuntimeOutputCeiling,
} from "../src/lib/constants/contextWindows.js";
let passed = 0;
async function test(name: string, run: () => void | Promise<void>) {
  try {
    await run();
    passed++;
    console.log(`PASS ${name}`);
  } finally {
    clearRuntimeContextWindows();
    clearRuntimeOutputCeilings();
  }
}
const body = { messages: [{ role: "user", content: "hello" }], max_tokens: 20 };
await test("never treats the unknown model default as an authoritative limit", () => {
  const result = prepareProxyRequestContext({
    provider: "codex",
    model: "unknown",
    body: { input: "a".repeat(600000) },
    policy: {},
  });
  assert.equal(result.evidence.contextLimitSource, "unknown");
  assert.equal(result.evidence.contextWindow, undefined);
  assert.equal(result.body.input.length, 600000);
});
await test("enforces discovered input plus output reserve before dispatch", () => {
  registerRuntimeContextWindow("anthropic", "test", 100);
  registerRuntimeOutputCeiling("anthropic", "test", 50);
  assert.throws(
    () =>
      prepareProxyRequestContext({
        provider: "anthropic",
        model: "test",
        body: {
          ...body,
          messages: [{ role: "user", content: "abcdefgh ".repeat(100) }],
        },
        policy: {},
      }),
    /context window/,
  );
  assert.equal(
    prepareProxyRequestContext({
      provider: "anthropic",
      model: "test",
      body,
      policy: {},
    }).evidence.contextLimitSource,
    "discovered",
  );
});
await test("Codex reserves its advertised ceiling rather than unsupported client output limits", () => {
  registerRuntimeOutputCeiling("codex", "test", 1000);
  assert.equal(
    prepareProxyRequestContext({
      provider: "codex",
      model: "test",
      body,
      policy: {},
    }).outputTokensReserve,
    1000,
  );
});
await test("counts tools and instructions in input estimates", () => {
  const small = prepareProxyRequestContext({
    provider: "anthropic",
    model: "test",
    body,
    policy: {},
  });
  const large = prepareProxyRequestContext({
    provider: "anthropic",
    model: "test",
    body: {
      ...body,
      system: "Instructions ".repeat(100),
      tools: [{ name: "large", description: "Schema ".repeat(100) }],
    },
    policy: {},
  });
  assert.ok(large.inputTokensEstimate > small.inputTokensEstimate);
  assert.ok(large.evidence.toolsTokensEstimate > 100);
  assert.ok(large.evidence.instructionsTokensEstimate > 100);
});
await test("only reduces tools by opt-in, retaining history and forced tool references", () => {
  const messages = [
    {
      role: "assistant",
      content: [{ type: "tool_use", name: "history", id: "call" }],
    },
  ];
  const original = {
    ...body,
    messages,
    tool_choice: { type: "tool", name: "forced" },
    tools: [
      { name: "history" },
      { name: "forced" },
      { name: "allowed" },
      { name: "unused" },
      { type: "web_search" },
    ],
  };
  assert.equal(
    prepareProxyRequestContext({
      provider: "anthropic",
      model: "test",
      body: original,
      policy: {},
    }).body,
    original,
  );
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "test",
    body: original,
    policy: { toolAllowlist: ["allowed"] },
  });
  assert.deepEqual(result.body.tools, [
    { name: "history" },
    { name: "forced" },
    { name: "allowed" },
    { type: "web_search" },
  ]);
  assert.equal(result.body.messages, messages);
  assert.equal(original.tools.length, 5);
  assert.equal(result.evidence.historyModified, false);
});
await test("retains OpenAI, Gemini and SDK historical tool names", () => {
  const messages = [
    { tool_calls: [{ type: "function", function: { name: "openai" } }] },
    { parts: [{ functionCall: { name: "gemini" } }] },
    { content: [{ type: "tool-call", toolName: "sdk" }] },
  ];
  const result = prepareProxyRequestContext({
    provider: "openai",
    model: "test",
    body: {
      messages,
      tools: { openai: {}, gemini: {}, sdk: {}, unused: {} },
    },
    policy: { toolAllowlist: [] },
  });
  assert.deepEqual(Object.keys(result.body.tools), ["openai", "gemini", "sdk"]);
});
await test("marks multimodal uncertainty rather than rejecting from an image heuristic", () => {
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "test",
    body: {
      ...body,
      messages: [{ content: [{ type: "image", source: { data: "base64" } }] }],
    },
    policy: { models: { "anthropic/test": { contextWindow: 100 } } },
  });
  assert.equal(result.evidence.multimodalEstimate, true);
});
await test("does not count an Anthropic PDF's base64 encoding as text context", () => {
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "test",
    body: {
      ...body,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: "YQ==".repeat(100000),
              },
            },
          ],
        },
      ],
    },
    policy: { models: { "anthropic/test": { contextWindow: 100 } } },
  });
  assert.equal(result.evidence.multimodalEstimate, true);
  assert.ok(result.inputTokensEstimate < 10000);
  assert.equal(result.body.messages[0].content[0].source.data.length, 400000);
});
for (const raw of [
  "[]",
  '{"maxInputTokens":0}',
  '{"unknown":true}',
  '{"models":{"test":{"contextWindow":100}}}',
]) {
  await test(`rejects invalid protection policy ${raw}`, () => {
    assert.throws(() => parseProxyContextPolicy(raw));
  });
}
await test("enforces explicit input and output limits", () => {
  assert.throws(
    () =>
      prepareProxyRequestContext({
        provider: "anthropic",
        model: "test",
        body,
        policy: { maxInputTokens: 1 },
      }),
    /input/,
  );
  assert.throws(
    () =>
      prepareProxyRequestContext({
        provider: "anthropic",
        model: "test",
        body,
        policy: {
          models: {
            "anthropic/test": { contextWindow: 10000, maxOutputTokens: 10 },
          },
        },
      }),
    /output/,
  );
});
await test("counts Gemini system instructions and structured output schema before dispatch", () => {
  const result = prepareProxyRequestContext({
    provider: "google-ai",
    model: "test",
    body: {
      contents: [],
      systemInstruction: { parts: [{ text: "system ".repeat(100) }] },
      generationConfig: {
        responseSchema: { description: "schema ".repeat(100) },
      },
    },
    policy: {},
  });
  assert.ok(result.evidence.instructionsTokensEstimate > 100);
  assert.ok(result.evidence.schemaTokensEstimate > 100);
  assert.throws(
    () =>
      prepareProxyRequestContext({
        provider: "openai",
        model: "test",
        body: {
          messages: [],
          response_format: {
            schema: { description: "big schema ".repeat(100) },
          },
        },
        policy: { maxInputTokens: 100 },
      }),
    /input/,
  );
});
await test("refuses an invalid output allowance instead of ignoring it", () => {
  assert.throws(
    () =>
      prepareProxyRequestContext({
        provider: "anthropic",
        model: "test",
        body: { ...body, max_tokens: -1 },
        policy: {},
      }),
    /positive safe integer/,
  );
});
await test("keeps SDK tool filters aligned with the reduced definitions", () => {
  const result = prepareProxyRequestContext({
    provider: "openai",
    model: "test",
    body: {
      tools: { keep: {}, drop: {} },
      toolFilter: ["keep", "drop"],
      toolChoice: { type: "tool", toolName: "keep" },
    },
    policy: { toolAllowlist: [] },
  });
  assert.deepEqual(Object.keys(result.body.tools), ["keep"]);
  assert.deepEqual(result.body.toolFilter, ["keep"]);
});
await test("marks SDK images and binary content as media rather than base64 text tokens", () => {
  const result = prepareProxyRequestContext({
    provider: "openai",
    model: "test",
    body: {
      input: {
        text: "image",
        images: ["a".repeat(1000000), new Uint8Array(32)],
      },
    },
    policy: {},
  });
  assert.equal(result.evidence.multimodalEstimate, true);
  assert.ok(result.inputTokensEstimate < 10000);
});

await test("truncates oldest history to the configured target before refusing", () => {
  registerRuntimeContextWindow("codex", "sol", 1_000_000);
  const turn = (n: number) => ({
    role: n % 2 === 0 ? "user" : "assistant",
    content: [
      { type: "input_text", text: `turn ${n} ` + "word ".repeat(4000) },
    ],
  });
  const body = {
    instructions: "system policy",
    tools: [{ name: "keep_me" }],
    input: Array.from({ length: 40 }, (_, n) => turn(n)),
  };
  const untouched = prepareProxyRequestContext({
    provider: "codex",
    model: "sol",
    body,
    policy: { models: { "codex/sol": { contextWindow: 1_000_000 } } },
  });
  assert.equal(untouched.evidence.historyModified, false);
  assert.equal(untouched.body.input.length, 40);

  const result = prepareProxyRequestContext({
    provider: "codex",
    model: "sol",
    body,
    policy: {
      models: {
        "codex/sol": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 10_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  assert.ok((result.evidence.historyUnitsRemoved ?? 0) > 0);
  assert.ok(result.inputTokensEstimate <= 10_000);
  assert.ok(result.inputTokensEstimate < untouched.inputTokensEstimate);
  assert.ok(result.body.input.length < 40);
  // The newest turn and the fixed context always survive.
  assert.deepEqual(
    result.body.input[result.body.input.length - 1],
    body.input[39],
  );
  assert.equal(result.body.instructions, "system policy");
  assert.deepEqual(result.body.tools, [{ name: "keep_me" }]);
  assert.equal(body.input.length, 40);
});
await test("never strands a tool result from its originating call", () => {
  registerRuntimeContextWindow("codex", "sol", 1_000_000);
  const filler = "word ".repeat(4000);
  const input: unknown[] = [];
  for (let n = 0; n < 12; n += 1) {
    input.push({
      role: "user",
      content: [{ type: "input_text", text: filler }],
    });
    input.push({
      type: "function_call",
      call_id: `call-${n}`,
      name: "lookup",
      arguments: "{}",
    });
    input.push({
      type: "function_call_output",
      call_id: `call-${n}`,
      output: filler,
    });
  }
  input.push({
    role: "user",
    content: [{ type: "input_text", text: "latest" }],
  });
  const result = prepareProxyRequestContext({
    provider: "codex",
    model: "sol",
    body: { input },
    policy: {
      models: {
        "codex/sol": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 8_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  const kept = result.body.input as Array<Record<string, unknown>>;
  const calls = new Set(
    kept.filter((i) => i.type === "function_call").map((i) => i.call_id),
  );
  const outputs = kept.filter((i) => i.type === "function_call_output");
  for (const output of outputs) {
    assert.ok(calls.has(output.call_id), "tool result lost its call");
  }
  const newest = kept[kept.length - 1] as { content: Array<{ text: string }> };
  assert.equal(newest.content[0].text, "latest");
});
await test("preserves Claude tool_use and tool_result pairing while truncating", () => {
  registerRuntimeContextWindow("anthropic", "opus", 1_000_000);
  const filler = "word ".repeat(4000);
  const messages: unknown[] = [];
  for (let n = 0; n < 12; n += 1) {
    messages.push({ role: "user", content: [{ type: "text", text: filler }] });
    messages.push({
      role: "assistant",
      content: [{ type: "tool_use", id: `tu-${n}`, name: "search", input: {} }],
    });
    messages.push({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: `tu-${n}`, content: filler },
      ],
    });
  }
  messages.push({ role: "user", content: [{ type: "text", text: "final" }] });
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "opus",
    body: { messages },
    policy: {
      models: {
        "anthropic/opus": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 8_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  const kept = result.body.messages as Array<{
    role: string;
    content: Array<Record<string, unknown>>;
  }>;
  const uses = new Set<string>();
  for (const m of kept) {
    for (const b of m.content) {
      if (b.type === "tool_use") {
        uses.add(b.id as string);
      }
    }
  }
  for (const m of kept) {
    for (const b of m.content) {
      if (b.type === "tool_result") {
        assert.ok(uses.has(b.tool_use_id as string), "orphaned tool_result");
      }
    }
  }
});
await test("does not treat the translated current turn as removable history", () => {
  registerRuntimeContextWindow("vertex", "opus", 1_000_000);
  const result = prepareProxyRequestContext({
    provider: "vertex",
    model: "opus",
    body: {
      systemPrompt: "system",
      conversationMessages: Array.from({ length: 30 }, (_, n) => ({
        role: n % 2 === 0 ? "user" : "assistant",
        content: "word ".repeat(4000),
      })),
      input: { text: "the current question" },
    },
    policy: {
      models: {
        "vertex/opus": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 10_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  assert.deepEqual(result.body.input, { text: "the current question" });
  assert.equal(result.body.systemPrompt, "system");
  assert.ok(result.body.conversationMessages.length < 30);
});
for (const bad of [
  '{"models":{"a/b":{"contextWindow":100,"compactAtTokens":100,"compactToTokens":50}}}',
  '{"models":{"a/b":{"contextWindow":100,"compactAtTokens":80,"compactToTokens":80}}}',
  '{"models":{"a/b":{"contextWindow":100,"compactAtTokens":80}}}',
  '{"models":{"a/b":{"contextWindow":100,"compactToTokens":50}}}',
  '{"models":{"a/b":{"contextWindow":100,"compactAtTokens":0,"compactToTokens":-1}}}',
]) {
  await test(`rejects invalid compaction policy ${bad}`, () => {
    assert.throws(() => parseProxyContextPolicy(bad));
  });
}
await test("accepts a compaction trigger above its target and below the window", () => {
  const parsed = parseProxyContextPolicy(
    '{"models":{"codex/gpt-5.6-sol":{"contextWindow":1000000,"compactAtTokens":700000,"compactToTokens":650000}}}',
  );
  assert.equal(parsed.models?.["codex/gpt-5.6-sol"].compactAtTokens, 700000);
  assert.equal(parsed.models?.["codex/gpt-5.6-sol"].compactToTokens, 650000);
});

// Truncation stops at the budget boundary. It deliberately does not advance to
// the next user turn: an assistant-headed history is accepted upstream, so
// advancing would discard turns the budget never asked for.
await test("stops at the budget boundary when truncating conversationMessages", () => {
  // One huge oldest turn: removing it alone clears the budget, so the loop stops
  // with an assistant turn at the head, and leaves it there.
  const huge = "word ".repeat(20000);
  const body = {
    systemPrompt: "system policy",
    input: { text: "current turn" },
    conversationMessages: [
      { role: "user", content: `oldest ${huge}` },
      { role: "assistant", content: "short reply" },
      { role: "user", content: "short follow up" },
      { role: "assistant", content: "short reply two" },
    ],
  };
  const result = prepareProxyRequestContext({
    provider: "vertex",
    model: "claude-opus-4-6",
    body,
    policy: {
      models: {
        "vertex/claude-opus-4-6": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 10_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  const kept = result.body.conversationMessages as Array<{
    role: string;
    content: string;
  }>;
  assert.ok(
    kept.every((message) => !message.content.startsWith("oldest ")),
    "the oldest turn must be the one removed",
  );
  assert.equal(
    kept.length,
    3,
    "only the oldest turn was needed to clear the budget",
  );
  assert.equal(kept[0].role, "assistant");
  assert.equal(result.body.systemPrompt, "system policy");
  assert.deepEqual(result.body.input, { text: "current turn" });
});

await test("keeps whole tool pairs when truncating Claude messages", () => {
  const huge = "word ".repeat(20000);
  const body = {
    system: "system policy",
    messages: [
      { role: "user", content: `oldest ${huge}` },
      {
        role: "assistant",
        content: [
          { type: "tool_use", id: "call_1", name: "read", input: {} },
          { type: "text", text: "calling read" },
        ],
      },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "call_1", content: "file body" },
        ],
      },
      { role: "user", content: "newest question" },
    ],
  };
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "probe",
    body,
    policy: {
      models: {
        "anthropic/probe": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 10_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  const kept = JSON.stringify(result.body.messages);
  assert.equal(
    kept.includes("tool_result"),
    kept.includes("tool_use"),
    "a tool_result must never outlive its tool_use",
  );
});

// Codex function_call / function_call_output items carry no role at all, so
// removal must be driven purely by unit boundaries.
await test("role-less Codex items are removed only in whole pairs", () => {
  const filler = "word ".repeat(4000);
  const body = {
    instructions: "system policy",
    input: [
      { type: "function_call", call_id: "c1", name: "read", arguments: filler },
      { type: "function_call_output", call_id: "c1", output: filler },
      { type: "function_call", call_id: "c2", name: "read", arguments: filler },
      { type: "function_call_output", call_id: "c2", output: filler },
    ],
  };
  const result = prepareProxyRequestContext({
    provider: "codex",
    model: "sol",
    body,
    policy: {
      models: {
        "codex/sol": {
          contextWindow: 1_000_000,
          // Reachable by design: only one of the two units may be removed here,
          // so the target must sit above what a single removal can achieve.
          compactAtTokens: 20_000,
          compactToTokens: 11_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  // The surviving unit is a complete call/output pair, not a stranded output.
  assert.equal(result.body.input[0].type, "function_call");
  assert.equal(result.body.input.length % 2, 0);
});

// An image that truncation removed must not keep the request flagged multimodal:
// the ceiling check is skipped for multimodal requests, so stale state silently
// disables it.
await test("an image dropped by truncation no longer disables the ceiling check", () => {
  const filler = "word ".repeat(4000);
  const build = () => ({
    system: "system policy",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", data: "iVBOR" } },
          { type: "text", text: `oldest ${filler}` },
        ],
      },
      { role: "assistant", content: `reply ${filler}` },
      { role: "user", content: `newest ${filler}` },
    ],
  });
  const roomy = prepareProxyRequestContext({
    provider: "anthropic",
    model: "probe",
    body: build(),
    policy: {
      models: {
        "anthropic/probe": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 10_000,
        },
      },
    },
  });
  assert.equal(roomy.evidence.historyModified, true);
  assert.equal(roomy.evidence.multimodalEstimate, false);

  assert.throws(
    () =>
      prepareProxyRequestContext({
        provider: "anthropic",
        model: "probe",
        body: build(),
        policy: {
          models: {
            "anthropic/probe": {
              contextWindow: 21_000,
              maxOutputTokens: 15_000,
              compactAtTokens: 20_000,
              compactToTokens: 10_000,
            },
          },
        },
      }),
    (error: unknown) => {
      const typed = error as {
        code?: string;
        evidence?: { multimodalEstimate?: boolean };
      };
      assert.equal(typed.code, "proxy_context_window_exceeded");
      assert.equal(typed.evidence?.multimodalEstimate, false);
      return true;
    },
  );
});

await test("fails typed when compaction cannot reach its target", () => {
  // Fixed context alone blows the target, so no amount of unit removal helps.
  // The design requires a typed local failure over a silent dispatch above the
  // configured bound.
  const huge = "word ".repeat(6000);
  let code: string | undefined;
  try {
    prepareProxyRequestContext({
      provider: "codex",
      model: "sol",
      body: {
        instructions: huge,
        input: [
          { role: "user", content: [{ type: "input_text", text: huge }] },
          { role: "user", content: [{ type: "input_text", text: "latest" }] },
        ],
      },
      policy: {
        models: {
          "codex/sol": {
            contextWindow: 1_000_000,
            compactAtTokens: 5_000,
            compactToTokens: 1_000,
          },
        },
      },
    });
  } catch (error) {
    code = (error as { code?: string }).code;
  }
  assert.equal(code, "proxy_context_compaction_failed");
});

await test("conversationMessages may lose every unit, since the turn is elsewhere", () => {
  // The translated shape carries the current turn in object-valued `input`, so
  // retaining a final history unit is unnecessary — and when that unit is an
  // assistant turn it leaves a history the Messages API rejects.
  const huge = "word ".repeat(9000);
  const result = prepareProxyRequestContext({
    provider: "vertex",
    model: "opus",
    body: {
      input: { text: "current turn" },
      conversationMessages: [
        { role: "user", content: `oldest ${huge}` },
        { role: "assistant", content: `reply ${huge}` },
      ],
    },
    policy: {
      models: {
        "vertex/opus": {
          contextWindow: 1_000_000,
          compactAtTokens: 20_000,
          compactToTokens: 500,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  const kept = result.body.conversationMessages as Array<{ role: string }>;
  assert.equal(
    kept.length,
    0,
    "a trailing assistant turn must not be stranded",
  );
  assert.deepEqual(result.body.input, { text: "current turn" });
});

// Real agentic histories run long stretches of assistant/tool_result turns
// between user turns. Advancing to the next user turn to open the kept history
// discarded the whole stretch, landing far below the target and dropping turns
// the budget never asked to remove.
await test("lands on the target when user turns are sparse", () => {
  const filler = "x".repeat(24_000);
  const messages: unknown[] = [
    { role: "user", content: [{ type: "text", text: `start ${filler}` }] },
  ];
  for (let i = 0; i < 60; i += 1) {
    messages.push({
      role: "assistant",
      content: [
        { type: "text", text: `step ${i}` },
        { type: "tool_use", id: `tu_${i}`, name: "Read", input: { i } },
      ],
    });
    messages.push({
      role: "user",
      content: [
        { type: "tool_result", tool_use_id: `tu_${i}`, content: filler },
      ],
    });
  }
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "sparse",
    body: { messages, max_tokens: 1024 },
    policy: {
      models: {
        "anthropic/sparse": {
          contextWindow: 1_000_000,
          compactAtTokens: 300_000,
          compactToTokens: 250_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  assert.ok(
    result.inputTokensEstimate <= 250_000,
    `expected at or below the target, got ${result.inputTokensEstimate}`,
  );
  // The regression: the only user turn is at index 0, so advancing to a user
  // head used to drop the entire conversation instead of ~20% of it.
  assert.ok(
    result.inputTokensEstimate > 200_000,
    `expected to land near the target, got ${result.inputTokensEstimate}`,
  );
  const kept = result.body.messages as Array<{
    role: string;
    content: Array<{ type: string; id?: string; tool_use_id?: string }>;
  }>;
  const opened = new Set<string>();
  for (const message of kept) {
    for (const block of message.content) {
      if (block.type === "tool_use" && block.id) {
        opened.add(block.id);
      }
    }
  }
  for (const message of kept) {
    for (const block of message.content) {
      if (block.type === "tool_result") {
        assert.ok(
          opened.has(String(block.tool_use_id)),
          "a kept tool_result must keep its tool_use",
        );
      }
    }
  }
});

// Verified against the live API: `messages.0` with role "system" is rejected
// ("use the top-level 'system' parameter"), while an assistant head is served.
// Claude Code interleaves these directives, so a cut can land on one.
await test("skips a leading system directive but keeps the assistant head", () => {
  const filler = "z".repeat(24_000);
  const messages: unknown[] = [
    { role: "user", content: [{ type: "text", text: `start ${filler}` }] },
  ];
  for (let i = 0; i < 40; i += 1) {
    messages.push({ role: "system", content: `directive ${i}` });
    messages.push({
      role: "assistant",
      content: [{ type: "text", text: `step ${i} ${filler}` }],
    });
  }
  const result = prepareProxyRequestContext({
    provider: "anthropic",
    model: "directives",
    body: { messages, max_tokens: 1024 },
    policy: {
      models: {
        "anthropic/directives": {
          contextWindow: 1_000_000,
          compactAtTokens: 300_000,
          compactToTokens: 250_000,
        },
      },
    },
  });
  assert.equal(result.evidence.historyModified, true);
  const kept = result.body.messages as Array<{ role: string }>;
  assert.notEqual(
    kept[0].role,
    "system",
    "a system directive cannot open a history",
  );
  assert.equal(kept[0].role, "assistant");
  assert.ok(
    result.inputTokensEstimate <= 250_000,
    `expected at or below the target, got ${result.inputTokensEstimate}`,
  );
});

console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
