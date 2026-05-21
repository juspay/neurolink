#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Google native (@google/genai) helper characterization
 *
 * Locks down the request-shape contract that the native Vertex Gemini and
 * Google AI Studio paths rely on after @ai-sdk/google /
 * @ai-sdk/google-vertex were removed:
 *
 *  - `prependConversationMessages` maps NeuroLink ChatMessage roles
 *    correctly (assistant → model, user → user, system/tool roles dropped)
 *    and skips empty turns.
 *  - `buildNativeConfig` only sets `responseMimeType` / `responseSchema`
 *    when no tools are being sent (Gemini cannot combine function calling
 *    with JSON mime). When tools are present, schema fields must NOT
 *    appear in the request config, even if the caller passes them.
 *  - `buildGeminiResponseSchema` produces a flat schema with every nested
 *    object/array carrying a `type` field — Vertex/Gemini reject schemas
 *    missing nested `type` and the regression check guards that pipeline.
 *
 * Run with: npx tsx test/continuous-test-suite-google-native.ts
 */

import {
  buildGeminiResponseSchema,
  buildNativeConfig,
  createTextChannel,
  prependConversationMessages,
} from "../src/lib/providers/googleNativeGemini3.js";

// ============================================================================
// Test plumbing (matches sibling continuous-test-suite-* style)
// ============================================================================

type TestFunction = {
  name: string;
  fn: () => Promise<boolean | null>;
};

type ColorName = "reset" | "bright" | "red" | "green" | "yellow" | "cyan";

const colors: Record<ColorName, string> = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

const log = (message: string, color: ColorName = "reset"): void => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

const logSection = (title: string): void => {
  log(`\n${"=".repeat(72)}`, "cyan");
  log(`  ${title}`, "bright");
  log(`${"=".repeat(72)}`, "cyan");
};

const logTest = (
  name: string,
  status: "PASS" | "FAIL" | "SKIP",
  detail?: string,
): void => {
  const colorMap: Record<string, ColorName> = {
    PASS: "green",
    FAIL: "red",
    SKIP: "yellow",
  };
  log(`  [${status}] ${name}${detail ? ` — ${detail}` : ""}`, colorMap[status]);
};

// ============================================================================
// Helpers
// ============================================================================

type Content = { role: string; parts: unknown[] };

function asContents(): Content[] {
  return [];
}

// ============================================================================
// Tests
// ============================================================================

const tests: TestFunction[] = [
  {
    name: "prependConversationMessages: noop when history is empty/undefined",
    fn: async () => {
      const a = asContents();
      prependConversationMessages(a, undefined);
      const b = asContents();
      prependConversationMessages(b, []);
      return a.length === 0 && b.length === 0;
    },
  },
  {
    name: "prependConversationMessages: assistant → model, user → user",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
        { role: "user", content: "follow up" },
      ]);
      if (contents.length !== 3) {
        return false;
      }
      return (
        contents[0].role === "user" &&
        contents[1].role === "model" &&
        contents[2].role === "user"
      );
    },
  },
  {
    name: "prependConversationMessages: drops system role (tool rows are reconstructed, not dropped)",
    fn: async () => {
      const contents = asContents();
      // `system` is still dropped — only user/assistant/tool_call/tool_result are
      // reconstructed. tool_call/tool_result are tested separately below.
      prependConversationMessages(contents, [
        { role: "system", content: "you are helpful" },
        { role: "assistant", content: "ok" },
      ]);
      return contents.length === 1 && contents[0].role === "model";
    },
  },
  {
    name: "prependConversationMessages: tool_call rows become functionCall parts under a model turn",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "do the thing" },
        {
          role: "tool_call",
          content: "",
          tool: "myTool",
          args: { x: 1 },
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: '{"ok":true}',
          tool: "myTool",
          metadata: { stepIndex: 0 },
        },
        { role: "assistant", content: "done" },
      ]);
      // Expected segment order: user → model(functionCall) → user(functionResponse) → model("done")
      if (contents.length !== 4) {
        return false;
      }
      if (contents[0].role !== "user") {
        return false;
      }
      const modelCallParts = contents[1].parts as Array<
        Record<string, unknown>
      >;
      const fc = modelCallParts[0]?.functionCall as
        | { name: string; args: Record<string, unknown> }
        | undefined;
      if (
        contents[1].role !== "model" ||
        !fc ||
        fc.name !== "myTool" ||
        (fc.args as { x: number }).x !== 1
      ) {
        return false;
      }
      const userResultParts = contents[2].parts as Array<
        Record<string, unknown>
      >;
      const fr = userResultParts[0]?.functionResponse as
        | { name: string; response: { result: { ok: boolean } } }
        | undefined;
      if (
        contents[2].role !== "user" ||
        !fr ||
        fr.name !== "myTool" ||
        fr.response.result.ok !== true
      ) {
        return false;
      }
      return contents[3].role === "model";
    },
  },
  {
    name: "prependConversationMessages: thoughtSignature attaches as a sibling on the first functionCall",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "go" },
        {
          role: "tool_call",
          content: "",
          tool: "first",
          args: {},
          metadata: { stepIndex: 0, thoughtSignature: "SIG-abc" },
        },
        {
          role: "tool_call",
          content: "",
          tool: "second",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: '{"a":1}',
          tool: "first",
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: '{"b":2}',
          tool: "second",
          metadata: { stepIndex: 0 },
        },
      ]);
      // user, model(calls — first carries thoughtSignature), user(results)
      if (contents.length !== 3) {
        return false;
      }
      const modelCallParts = contents[1].parts as Array<
        Record<string, unknown>
      >;
      if (modelCallParts.length !== 2) {
        return false;
      }
      return (
        modelCallParts[0].thoughtSignature === "SIG-abc" &&
        modelCallParts[1].thoughtSignature === undefined
      );
    },
  },
  {
    name: "prependConversationMessages: parallel calls in the same step group together (single model+user pair)",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "parallel work" },
        {
          role: "tool_call",
          content: "",
          tool: "a",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_call",
          content: "",
          tool: "b",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: "{}",
          tool: "a",
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: "{}",
          tool: "b",
          metadata: { stepIndex: 0 },
        },
      ]);
      // Should be exactly 3 segments: user, model (2 calls), user (2 results)
      if (contents.length !== 3) {
        return false;
      }
      const modelParts = contents[1].parts as unknown[];
      const userParts = contents[2].parts as unknown[];
      return modelParts.length === 2 && userParts.length === 2;
    },
  },
  {
    name: "prependConversationMessages: sequential steps within one turn produce one segment per step",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "do A then B" },
        {
          role: "tool_call",
          content: "",
          tool: "A",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: "{}",
          tool: "A",
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_call",
          content: "",
          tool: "B",
          args: {},
          metadata: { stepIndex: 1 },
        },
        {
          role: "tool_result",
          content: "{}",
          tool: "B",
          metadata: { stepIndex: 1 },
        },
      ]);
      // Expected: user → model(A) → user(A-result) → model(B) → user(B-result)
      return (
        contents.length === 5 &&
        contents[0].role === "user" &&
        contents[1].role === "model" &&
        (contents[1].parts as unknown[]).length === 1 &&
        contents[2].role === "user" &&
        contents[3].role === "model" &&
        (contents[3].parts as unknown[]).length === 1 &&
        contents[4].role === "user"
      );
    },
  },
  {
    name: "prependConversationMessages: same stepIndex across separate turns does NOT collide",
    fn: async () => {
      // turn 1 (step 0) → turn 2 (step 0 again). turnCounter should namespace
      // these so they emit as two distinct model/user pairs, not merged.
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "turn 1" },
        {
          role: "tool_call",
          content: "",
          tool: "T1",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: "{}",
          tool: "T1",
          metadata: { stepIndex: 0 },
        },
        { role: "assistant", content: "first answer" },
        { role: "user", content: "turn 2" },
        {
          role: "tool_call",
          content: "",
          tool: "T2",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: "{}",
          tool: "T2",
          metadata: { stepIndex: 0 },
        },
      ]);
      // user1, model(T1), user(T1-result), model(first answer), user2, model(T2), user(T2-result)
      if (contents.length !== 7) {
        return false;
      }
      const firstModelCall = (
        contents[1].parts as Array<Record<string, unknown>>
      )[0].functionCall as { name: string };
      const secondModelCall = (
        contents[5].parts as Array<Record<string, unknown>>
      )[0].functionCall as { name: string };
      return firstModelCall.name === "T1" && secondModelCall.name === "T2";
    },
  },
  {
    name: "prependConversationMessages: malformed tool_result content falls back to raw string under .result",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "go" },
        {
          role: "tool_call",
          content: "",
          tool: "x",
          args: {},
          metadata: { stepIndex: 0 },
        },
        {
          role: "tool_result",
          content: "not-json-at-all",
          tool: "x",
          metadata: { stepIndex: 0 },
        },
      ]);
      const userResultParts = contents[2].parts as Array<
        Record<string, unknown>
      >;
      const fr = userResultParts[0]?.functionResponse as
        | { response: { result: string } }
        | undefined;
      return fr?.response.result === "not-json-at-all";
    },
  },
  {
    name: "prependConversationMessages: orphan tool_result without matching tool_call is dropped",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "go" },
        // tool_result with no preceding tool_call in the same step —
        // Gemini rejects user(functionResponse) without a model(functionCall),
        // so the reconstructor must drop it.
        {
          role: "tool_result",
          content: '{"answer": 42}',
          tool: "x",
          metadata: { stepIndex: 0 },
        },
      ]);
      // Only the user turn should remain; the orphan segment is dropped.
      if (contents.length !== 1) {
        return false;
      }
      const onlyTurn = contents[0];
      return (
        onlyTurn.role === "user" &&
        Array.isArray(onlyTurn.parts) &&
        onlyTurn.parts.length === 1 &&
        (onlyTurn.parts[0] as { text?: string }).text === "go"
      );
    },
  },
  {
    name: "prependConversationMessages: skips empty content turns",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "user", content: "" },
        { role: "assistant", content: "hi" },
        { role: "user", content: "" },
      ]);
      return contents.length === 1 && contents[0].role === "model";
    },
  },
  {
    name: "buildNativeConfig: omits responseMimeType when tools are present",
    fn: async () => {
      const config = buildNativeConfig(
        {
          temperature: 0.7,
          maxTokens: 1024,
          wantsJsonOutput: true,
          responseSchema: { type: "object", properties: {} },
        },
        [
          {
            functionDeclarations: [{ name: "noop", description: "noop" }],
          },
        ],
      );
      return (
        config.responseMimeType === undefined &&
        config.responseSchema === undefined &&
        Array.isArray(config.tools)
      );
    },
  },
  {
    name: "buildNativeConfig: sets responseMimeType when JSON requested + no tools",
    fn: async () => {
      const config = buildNativeConfig({
        temperature: 0.5,
        maxTokens: 512,
        wantsJsonOutput: true,
      });
      return (
        config.responseMimeType === "application/json" &&
        config.responseSchema === undefined &&
        config.tools === undefined
      );
    },
  },
  {
    name: "buildNativeConfig: sets responseSchema (and implies JSON mime) when no tools",
    fn: async () => {
      const schema = {
        type: "object",
        properties: { ok: { type: "boolean" } },
      };
      const config = buildNativeConfig({
        temperature: 0.5,
        maxTokens: 512,
        responseSchema: schema,
      });
      return (
        config.responseMimeType === "application/json" &&
        config.responseSchema === schema
      );
    },
  },
  {
    name: "buildNativeConfig: forwards systemPrompt as systemInstruction",
    fn: async () => {
      const config = buildNativeConfig({
        temperature: 0.7,
        maxTokens: 256,
        systemPrompt: "you are a tester",
      });
      return config.systemInstruction === "you are a tester";
    },
  },
  {
    name: "buildGeminiResponseSchema: every nested schema carries a type field",
    fn: async () => {
      // Use a plain JSON Schema with intentionally missing nested `type`
      // fields. The pipeline must infer them from `properties` / `items`
      // because Vertex/Gemini reject schemas missing nested `type`.
      const schema = {
        type: "object",
        properties: {
          nested: {
            properties: { flag: { type: "boolean" } },
          },
          items: {
            items: { type: "string" },
          },
        },
        $schema: "http://json-schema.org/draft-07/schema#",
      };
      const out = buildGeminiResponseSchema(schema);
      const props = out.properties as Record<string, { type?: string }>;
      return (
        out.type === "object" &&
        props.nested.type === "object" &&
        props.items.type === "array"
      );
    },
  },
  {
    name: "buildGeminiResponseSchema: drops top-level $schema metadata",
    fn: async () => {
      const schema = {
        type: "object",
        properties: { a: { type: "string" } },
        $schema: "http://json-schema.org/draft-07/schema#",
      };
      const out = buildGeminiResponseSchema(schema);
      return !("$schema" in out);
    },
  },

  // ── createTextChannel: streaming-shape contract for executeNativeAnthropicStream ──
  // These tests lock in the channel semantics that the rewrite of
  // executeNativeAnthropicStream relies on (real-time per-event push from
  // stream.on('text', ...) to channel.push(), consumed via channel.iterable).
  // If any of these break, the Anthropic stream's UX regresses.
  {
    name: "createTextChannel: yields pushed items in FIFO order then terminates on close()",
    fn: async () => {
      const ch = createTextChannel();
      ch.push("Hello");
      ch.push(" ");
      ch.push("world");
      ch.close();
      const collected: string[] = [];
      for await (const chunk of ch.iterable) {
        collected.push(chunk.content);
      }
      return (
        collected.length === 3 &&
        collected[0] === "Hello" &&
        collected[1] === " " &&
        collected[2] === "world"
      );
    },
  },
  {
    name: "createTextChannel: consumer blocks until producer pushes (real-time semantics)",
    fn: async () => {
      // This is the critical property the Anthropic rewrite needs: the
      // consumer's for-await suspends between pushes rather than racing
      // ahead. If this broke, the stream would burst-terminate after the
      // first push instead of streaming.
      const ch = createTextChannel();
      const collected: Array<{ at: number; text: string }> = [];
      const start = Date.now();
      const consume = (async () => {
        for await (const chunk of ch.iterable) {
          collected.push({ at: Date.now() - start, text: chunk.content });
        }
      })();
      ch.push("a");
      await new Promise((r) => setTimeout(r, 30));
      ch.push("b");
      await new Promise((r) => setTimeout(r, 30));
      ch.push("c");
      ch.close();
      await consume;
      // Three chunks captured at three distinct timestamps (>= ~20ms apart).
      // If the consumer burst-collected, the gaps would be ~0.
      const gap1 = collected[1]?.at - collected[0]?.at;
      const gap2 = collected[2]?.at - collected[1]?.at;
      return (
        collected.length === 3 &&
        collected.map((c) => c.text).join("") === "abc" &&
        gap1 >= 20 &&
        gap2 >= 20
      );
    },
  },
  {
    name: "createTextChannel: push() after close() is a no-op",
    fn: async () => {
      const ch = createTextChannel();
      ch.push("first");
      ch.close();
      ch.push("dropped"); // should not appear
      const collected: string[] = [];
      for await (const chunk of ch.iterable) {
        collected.push(chunk.content);
      }
      return collected.length === 1 && collected[0] === "first";
    },
  },
  {
    name: "createTextChannel: error() causes the iterable to throw on next read",
    fn: async () => {
      const ch = createTextChannel();
      ch.push("partial");
      ch.error(new Error("simulated upstream failure"));
      const collected: string[] = [];
      let thrown: string | null = null;
      try {
        for await (const chunk of ch.iterable) {
          collected.push(chunk.content);
        }
      } catch (e) {
        thrown = e instanceof Error ? e.message : String(e);
      }
      // The "partial" chunk that was pushed BEFORE error() must still surface
      // to the consumer (so partial responses aren't lost), then the error
      // throws.
      return (
        collected[0] === "partial" && thrown === "simulated upstream failure"
      );
    },
  },
  {
    name: "createTextChannel: token-level deltas (mirrors Anthropic stream.on('text'))",
    fn: async () => {
      // Models like Claude deliver ~63 deltas of ~10 chars each over the
      // generation window. This test simulates that pattern and asserts the
      // channel preserves every delta unchanged. Concatenation invariant:
      // joining all pushed chunks must equal the full text.
      const ch = createTextChannel();
      const deltas = [
        "I",
        "'m ",
        "Bree",
        "ze ",
        "Aut",
        "oma",
        "tic",
        ", ",
        "your ",
        "e-co",
        "mmerce ",
        "and ",
        "mark",
        "eting ",
        "assi",
        "stant",
        "!",
      ];
      for (const d of deltas) {
        ch.push(d);
      }
      ch.close();
      const collected: string[] = [];
      for await (const chunk of ch.iterable) {
        collected.push(chunk.content);
      }
      return (
        collected.length === deltas.length &&
        collected.join("") === deltas.join("") &&
        collected.join("") ===
          "I'm Breeze Automatic, your e-commerce and marketing assistant!"
      );
    },
  },
];

// ============================================================================
// Runner
// ============================================================================

async function runTests(): Promise<void> {
  logSection("Google Native Helper Tests");
  log(`Running ${tests.length} tests...\n`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;
  const failures: { name: string; error: string }[] = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result === null) {
        logTest(test.name, "SKIP");
        skipped++;
      } else if (result) {
        logTest(test.name, "PASS");
        passed++;
      } else {
        logTest(test.name, "FAIL");
        failed++;
        failures.push({ name: test.name, error: "assertion failed" });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logTest(test.name, "FAIL", msg);
      failed++;
      failures.push({ name: test.name, error: msg });
    }
  }

  logSection("Results");
  log(
    `Total: ${tests.length}  Passed: ${passed}  Failed: ${failed}  Skipped: ${skipped}`,
  );

  if (failed > 0) {
    log("\nFailed tests:", "red");
    for (const f of failures) {
      log(`  - ${f.name}: ${f.error}`, "red");
    }
    process.exit(1);
  }

  log("\nAll tests passed!", "green");
  process.exit(0);
}

runTests().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  log(`\nFatal error: ${msg}`, "red");
  process.exit(1);
});
