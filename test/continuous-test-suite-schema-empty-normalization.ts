#!/usr/bin/env tsx
/**
 * Continuous Test Suite: schema-mode empty/echo normalization (pure, no API).
 *
 * ai@6 resolves `output ?? text()` inside generateText, so a result produced
 * WITHOUT an output spec (structured-output fallback retry, tools↔schema
 * exclusion path) no longer throws from `experimental_output` — it echoes the
 * raw model text as a string. formatEnhancedResult must treat that echo as
 * text to coerce, never as parsed schema output; and a JSON-encoded empty
 * string (`""`) must normalize to a TRUE empty so callers' empty-response
 * handling fires instead of a literal '""' reaching the user.
 *
 * Run: npx tsx test/continuous-test-suite-schema-empty-normalization.ts
 */
import { defineSuite, assertEqual } from "./helpers/harness.js";
import { GenerationHandler } from "../src/lib/core/modules/GenerationHandler.js";
import type { TextGenerationOptions } from "../src/lib/types/index.js";

const { test, runSuite } = defineSuite("Schema-mode empty/echo normalization");

const handler = new GenerationHandler(
  "anthropic",
  "claude-sonnet-4-6",
  () => true,
  () => undefined,
  async () => undefined,
  () => undefined,
);

// Any object with a string `summary` validates (mirrors the coerce suite).
const schema = {
  safeParse: (v: unknown) => ({
    success:
      !!v &&
      typeof v === "object" &&
      typeof (v as { summary?: unknown }).summary === "string",
  }),
} as unknown as NonNullable<TextGenerationOptions["schema"]>;

const options = {
  input: { text: "irrelevant" },
  schema,
} as unknown as TextGenerationOptions;

const format = (generateResult: Record<string, unknown>) =>
  handler.formatEnhancedResult(
    generateResult as Parameters<GenerationHandler["formatEnhancedResult"]>[0],
    {},
    [],
    [],
    options,
  );

await test("EMPTY completion via raw-text echo (fallback result) → true empty", () => {
  // Fallback retry result: no output spec, ai@6 text() default echoes ''.
  const r = format({ text: "", experimental_output: "", finishReason: "stop" });
  assertEqual(r.content, "", "content must be '' — never the literal '\"\"'");
  assertEqual(
    r.structuredData === undefined,
    true,
    "structuredData must stay unset on an empty completion",
  );
});

await test("literal '\"\"' completion (no experimental_output) → true empty", () => {
  // Provider-native shape: model emits a JSON empty string as its whole text.
  const r = format({ text: '""', finishReason: "stop" });
  assertEqual(r.content, "", "JSON-encoded empty string normalizes to ''");
  assertEqual(
    r.structuredData === undefined,
    true,
    "'' scalar is an empty completion, not recovered structured data",
  );
});

await test("NON-EMPTY raw-text echo coerces to the schema object (no double-encode)", () => {
  const json = '{"summary":"recovered json"}';
  const r = format({
    text: json,
    experimental_output: json,
    finishReason: "stop",
  });
  assertEqual(r.content, json, "content stays single-encoded JSON text");
  assertEqual(
    (r.structuredData as { summary?: string } | undefined)?.summary,
    "recovered json",
    "echoed JSON text parses into structuredData",
  );
});

await test("genuine Output.object result (object) is preserved untouched", () => {
  const obj = { summary: "native structured output" };
  const r = format({
    text: '{"summary":"native structured output"}',
    experimental_output: obj,
    finishReason: "stop",
  });
  assertEqual(
    (r.structuredData as { summary?: string }).summary,
    "native structured output",
    "parsed object exposed directly",
  );
  assertEqual(
    r.content,
    JSON.stringify(obj),
    "content is the canonical serialisation",
  );
});

await test("parsed STRING that differs from raw text stays structured (z.string() schema)", () => {
  // Output.object with a string schema: text '"hello"' parses to 'hello' —
  // NOT the raw-text echo, so it must remain structured output.
  const r = format({
    text: '"hello"',
    experimental_output: "hello",
    finishReason: "stop",
  });
  assertEqual(r.structuredData, "hello", "parsed scalar string preserved");
  assertEqual(r.content, '"hello"', "canonical JSON serialisation");
});

await runSuite();
