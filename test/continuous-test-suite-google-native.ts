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
    name: "prependConversationMessages: drops system + tool_call + tool_result roles",
    fn: async () => {
      const contents = asContents();
      prependConversationMessages(contents, [
        { role: "system", content: "you are helpful" },
        { role: "tool_call", content: "{}" },
        { role: "tool_result", content: "{}" },
        { role: "assistant", content: "ok" },
      ]);
      return contents.length === 1 && contents[0].role === "model";
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
