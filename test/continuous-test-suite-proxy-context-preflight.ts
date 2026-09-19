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
console.log(`Passed: ${passed}; Failed: 0; RESULT: PASS`);
