#!/usr/bin/env tsx
/**
 * Continuous Test Suite: JSON validity — pure helpers (no API).
 *
 * Deterministic unit coverage for the building blocks of the JSON-validity fix:
 *   - structured-output policy predicate (Gemini-only tools↔schema exclusion)
 *   - balanced-brace JSON extractor (nested brace-in-string safety)
 *   - schema coercion of mis-escaped model text (jsonrepair-backed)
 *
 * These run without provider keys. The END-TO-END behaviour (real models
 * hand-writing JSON across providers) is verified by
 * continuous-test-suite-json-e2e.ts, which makes live calls.
 *
 * Run: npx tsx test/continuous-test-suite-json.ts
 */
import { z } from "zod";
import {
  defineSuite,
  assert,
  assertEqual,
  assertNotNull,
} from "./helpers/harness.js";
import {
  isGeminiProvider,
  isToolsSchemaConflictError,
  isToolsSchemaExclusionInForce,
} from "../src/lib/core/modules/structuredOutputPolicy.js";
import { extractJsonStringFromText } from "../src/lib/utils/json/extract.js";
import { coerceJsonToSchema } from "../src/lib/utils/json/coerce.js";

const { test, runSuite } = defineSuite("JSON Validity (pure)");

// ── Policy predicate ────────────────────────────────────────────────────────
await test("isGeminiProvider: google-ai is Gemini", () => {
  assert(
    isGeminiProvider("google-ai", "gemini-2.5-pro") === true,
    "google-ai is Gemini",
  );
});
await test("isGeminiProvider: vertex+gemini is Gemini", () => {
  assert(
    isGeminiProvider("vertex", "gemini-2.5-pro") === true,
    "vertex+gemini is Gemini",
  );
});
await test("isGeminiProvider: vertex+claude is NOT Gemini", () => {
  assert(
    isGeminiProvider("vertex", "claude-sonnet-4-6") === false,
    "vertex+claude is not Gemini",
  );
});
await test("isGeminiProvider: anthropic is NOT Gemini", () => {
  assert(
    isGeminiProvider("anthropic", "claude-sonnet-4-6") === false,
    "anthropic is not Gemini",
  );
});
await test("exclusion fires only for Gemini + tools present", () => {
  // The production bug fix: Vertex+Claude+tools must NOT be excluded.
  assertEqual(
    isToolsSchemaExclusionInForce("vertex", "claude-sonnet-4-6", true, 5),
    false,
    "vertex+claude+tools",
  );
  // Real API limitation: Vertex+Gemini+tools IS excluded.
  assertEqual(
    isToolsSchemaExclusionInForce("vertex", "gemini-2.5-pro", true, 5),
    true,
    "vertex+gemini+tools",
  );
  // No tools → never excluded.
  assertEqual(
    isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", false, 0),
    false,
    "gemini no tools",
  );
  assertEqual(
    isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 0),
    false,
    "gemini zero tools",
  );
  // Non-Gemini providers never excluded.
  assertEqual(
    isToolsSchemaExclusionInForce("openai", "gpt-4.1", true, 5),
    false,
    "openai+tools",
  );
});

await test("conflict detector: recognises Groq json+tools rejection", () => {
  assert(
    isToolsSchemaConflictError(
      new Error(
        "Groq error: json mode cannot be combined with tool/function calling",
      ),
    ),
    "Groq message should be a tools↔schema conflict",
  );
  assert(
    isToolsSchemaConflictError(
      "response_format is not supported with function calling",
    ),
    "response_format+function message should match",
  );
  assertEqual(
    isToolsSchemaConflictError(new Error("rate limit exceeded")),
    false,
    "unrelated error must not match",
  );
  assertEqual(
    isToolsSchemaConflictError(undefined),
    false,
    "undefined must not match",
  );
});

// ── Balanced-brace extractor ────────────────────────────────────────────────
await test("extractor: returns full outer object, not first inner brace", () => {
  const input = 'noise {"a":{"b":"}"},"c":1} trailing';
  const got = extractJsonStringFromText(input);
  assertNotNull(got, "should extract an object");
  assertEqual(JSON.parse(got as string).c, 1, "full object with c=1");
  assertEqual(
    JSON.parse(got as string).a.b,
    "}",
    "nested brace-in-string preserved",
  );
});
await test("extractor: prose preamble then object (Vertex+tools text shape)", () => {
  const input = 'Here is your result:\n{"summary":"ok","attachment":null}';
  const got = extractJsonStringFromText(input);
  assertNotNull(got, "should find object after prose");
  assertEqual(JSON.parse(got as string).summary, "ok", "summary parsed");
});
await test("extractor: fenced json code block", () => {
  const input = '```json\n{"x":2}\n```';
  const got = extractJsonStringFromText(input);
  assertNotNull(got, "should extract from fence");
  assertEqual(JSON.parse(got as string).x, 2, "x parsed");
});

// ── Schema coercion (jsonrepair-backed) ─────────────────────────────────────
const demoSchema = z.object({
  summary: z.string().min(1),
  attachment: z
    .object({ extension: z.string(), content: z.string() })
    .nullable(),
});

await test("coerce: unescaped internal quotes are repaired", () => {
  // Realistic model error: forgot to escape an internal quoted phrase.
  const bad = '{"summary":"He said "hi" today","attachment":null}';
  const out = coerceJsonToSchema(bad, demoSchema);
  assertNotNull(out, "should repair + parse");
  const obj = JSON.parse((out as { content: string }).content);
  assert(
    typeof obj.summary === "string" && obj.summary.includes("hi"),
    "summary text retained",
  );
});
await test("coerce: trailing comma + missing brace are repaired", () => {
  const bad = '{"summary":"ok","attachment":null,';
  const out = coerceJsonToSchema(bad, demoSchema);
  assertNotNull(out, "should close + drop trailing comma");
  assertEqual(
    JSON.parse((out as { content: string }).content).summary,
    "ok",
    "summary parsed",
  );
});
await test("coerce: invalid \\d escape never throws and yields valid JSON", () => {
  // jsonrepair turns an invalid \d escape into "d" (drops the backslash) — a
  // documented residual risk for code content on the text-mode path only; the
  // primary structured-output path never reaches jsonrepair. The contract here
  // is only: never throw, and any returned content must be valid JSON.
  const out = coerceJsonToSchema(
    '{"summary":"use \\d+ here","attachment":null}',
    demoSchema,
  );
  if (out) {
    JSON.parse((out as { content: string }).content); // must not throw
  }
  assert(true, "coercion did not throw on invalid escape");
});
await test("coerce: raw newline inside string is repaired", () => {
  const bad = '{"summary":"line1\nline2","attachment":null}';
  const out = coerceJsonToSchema(bad, demoSchema);
  assertNotNull(out, "should repair raw newline");
  const obj = JSON.parse((out as { content: string }).content);
  assert(
    typeof obj.summary === "string" && obj.summary.includes("line1"),
    "summary text retained",
  );
});
await test("coerce: already-valid JSON exposes parsed object", () => {
  const good = '{"summary":"ok","attachment":null}';
  const out = coerceJsonToSchema(good, demoSchema);
  assertNotNull(out, "valid JSON should coerce");
  assertEqual(
    (out as { structuredData: { summary: string } }).structuredData.summary,
    "ok",
    "object exposed",
  );
});
await test("coerce: prose-wrapped object is canonicalised", () => {
  const wrapped = 'Sure! {"summary":"ok","attachment":null} hope that helps';
  const out = coerceJsonToSchema(wrapped, demoSchema);
  assertNotNull(out, "should extract embedded object");
  assertEqual(
    (out as { content: string }).content[0],
    "{",
    "content is canonical JSON",
  );
});
await test("coerce: pure prose with no JSON returns null", () => {
  const out = coerceJsonToSchema(
    "just a friendly hello, no json here",
    demoSchema,
  );
  assertEqual(out, null, "no JSON object -> null");
});

// ── Truncation / repair flags (huge-text observability) ─────────────────────
await test("coerce: truncated (unclosed) JSON sets truncated + repaired", () => {
  // Output cut off mid-string (finishReason=length shape): no closing brace.
  const truncated =
    '{"summary":"big report","attachment":{"extension":"txt","content":"line1\nline2 and the rest was cut';
  const out = coerceJsonToSchema(truncated, demoSchema);
  assertNotNull(out, "should still recover valid JSON from truncated text");
  const r = out as { truncated: boolean; repaired: boolean; content: string };
  assert(r.truncated === true, "truncated flag set for an unclosed span");
  assert(r.repaired === true, "repaired flag set (jsonrepair closed it)");
  JSON.parse(r.content); // must remain valid JSON
});

await test("coerce: clean JSON sets neither truncated nor repaired", () => {
  const out = coerceJsonToSchema(
    '{"summary":"ok","attachment":null}',
    demoSchema,
  );
  assertNotNull(out, "clean JSON coerces");
  const r = out as { truncated: boolean; repaired: boolean };
  assertEqual(r.truncated, false, "clean JSON is not truncated");
  assertEqual(r.repaired, false, "clean JSON is not repaired");
});

await test("coerce: truncated root array is repaired and flagged", () => {
  const out = coerceJsonToSchema('["alpha","beta","gam', z.array(z.string()));
  assertNotNull(out, "truncated array should be recovered");
  const r = out as { content: string; truncated: boolean };
  assert(
    Array.isArray(JSON.parse(r.content)),
    "recovered content parses to an array",
  );
  assertEqual(r.truncated, true, "unclosed array flagged truncated");
});

await test("coerce: prose-wrapped root array is extracted", () => {
  const out = coerceJsonToSchema(
    'Here you go: ["a","b","c"] enjoy',
    z.array(z.string()),
  );
  assertNotNull(out, "prose-wrapped array should be extracted");
  const r = out as { content: string; truncated: boolean };
  assertEqual(
    JSON.stringify(JSON.parse(r.content)),
    JSON.stringify(["a", "b", "c"]),
    "array extracted verbatim",
  );
  assertEqual(r.truncated, false, "balanced array is not truncated");
});

await runSuite();
