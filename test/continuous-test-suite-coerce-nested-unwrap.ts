#!/usr/bin/env tsx
/**
 * Continuous Test Suite: coerce deep-unwrap of nested stringified JSON (no API).
 *
 * Models sometimes double-encode a NESTED field as a JSON *string* —
 * `{ "attachment": "{...}" }` instead of `{ "attachment": { ... } }` — which
 * fails schema validation even though the intended object is right there. This
 * was observed in production (Tara's `{summary, attachment}` envelope): the
 * `attachment` came back as a JSON string, so the declared `pdf` was lost and
 * the content degraded to a markdown/text file.
 *
 * coerceJsonToSchema already unwraps a stringified TOP-LEVEL object; this suite
 * locks in the NESTED-field unwrap: when no candidate passes the schema, string
 * fields that are themselves JSON objects/arrays are parsed and the result is
 * re-validated. Crucially, the re-validation gate prevents over-unwrapping a
 * field that should stay a string, and a parsed object is not re-descended into
 * (so an attachment's own `content` is preserved verbatim).
 *
 * Run: npx tsx test/continuous-test-suite-coerce-nested-unwrap.ts
 */
import { z } from "zod";
import { defineSuite, assertEqual } from "./helpers/harness.js";
import { coerceJsonToSchema } from "../src/lib/utils/json/coerce.js";

const { test, runSuite } = defineSuite(
  "Coerce nested stringified-object unwrap",
);

// Mirrors curator's StructuredAgentResponseSchema: attachment must be a nested
// object (or null) with string fields.
const schema = z.object({
  summary: z.string().min(1),
  attachment: z
    .object({
      filename: z.string(),
      extension: z.string(),
      mimetype: z.string(),
      content: z.string(),
    })
    .nullable(),
});

const obj = (
  r: ReturnType<typeof coerceJsonToSchema>,
): Record<string, unknown> =>
  (r?.structuredData ?? {}) as Record<string, unknown>;
const att = (
  r: ReturnType<typeof coerceJsonToSchema>,
): Record<string, unknown> =>
  (obj(r).attachment ?? {}) as Record<string, unknown>;

await test("unwraps a stringified nested attachment object (the production bug)", () => {
  const attachment = {
    filename: "tara_structural_response_test",
    extension: "pdf",
    mimetype: "application/pdf",
    content: "# Report\n\nbody",
  };
  const text = JSON.stringify({
    summary: "done",
    attachment: JSON.stringify(attachment),
  });
  const r = coerceJsonToSchema(text, schema);
  assertEqual(
    typeof att(r).filename,
    "string",
    "attachment became a real object",
  );
  assertEqual(att(r).extension, "pdf", "declared extension recovered");
  assertEqual(att(r).content, "# Report\n\nbody", "content preserved");
});

await test("does not re-descend into the parsed object: JSON-looking content stays a string", () => {
  const attachment = {
    filename: "data",
    extension: "json",
    mimetype: "application/json",
    content: '{"x":1}', // legitimately a JSON string as the file's content
  };
  const text = JSON.stringify({
    summary: "done",
    attachment: JSON.stringify(attachment),
  });
  const r = coerceJsonToSchema(text, schema);
  assertEqual(
    typeof att(r).filename,
    "string",
    "attachment unwrapped to object",
  );
  assertEqual(
    att(r).content,
    '{"x":1}',
    "content kept as a string, not re-parsed",
  );
});

await test("a clean nested object passes through unchanged (no unwrap needed)", () => {
  const clean = {
    summary: "ok",
    attachment: {
      filename: "f",
      extension: "md",
      mimetype: "text/markdown",
      content: "x",
    },
  };
  const r = coerceJsonToSchema(JSON.stringify(clean), schema);
  assertEqual(att(r).filename, "f", "clean object preserved");
  assertEqual(att(r).extension, "md", "clean extension preserved");
});

await test("null attachment is preserved", () => {
  const r = coerceJsonToSchema(
    JSON.stringify({ summary: "hi", attachment: null }),
    schema,
  );
  assertEqual(obj(r).attachment, null, "null attachment preserved");
});

await test("does NOT unwrap a JSON-looking value that is validly a string", () => {
  // summary is a string that happens to look like JSON; the schema wants a
  // string, so the direct parse already validates and deep-unwrap never runs.
  const summaryStr = '{"not":"a real summary object"}';
  const r = coerceJsonToSchema(
    JSON.stringify({ summary: summaryStr, attachment: null }),
    schema,
  );
  assertEqual(
    obj(r).summary,
    summaryStr,
    "JSON-looking summary kept as a string",
  );
});

await test("no schema → nested string is left untouched (first parseable wins)", () => {
  const text = JSON.stringify({ summary: "x", attachment: '{"a":1}' });
  const r = coerceJsonToSchema(text); // no schema to gate an unwrap
  assertEqual(
    typeof obj(r).attachment,
    "string",
    "without a schema, the nested string is not unwrapped",
  );
});

await test("unwraps a single-element array wrapping the object (native-Anthropic [{...}] case)", () => {
  // Models on the native Anthropic path sometimes return `[{...}]` for an
  // object schema under escaping stress. The lone object element must be
  // unwrapped and validated, not returned as an array. Refs #635.
  const inner = {
    summary: "wrapped in an array",
    attachment: null,
  };
  const r = coerceJsonToSchema(JSON.stringify([inner]), schema);
  assertEqual(
    Array.isArray(r?.structuredData),
    false,
    "result is the object, not an array",
  );
  assertEqual(
    obj(r).summary,
    "wrapped in an array",
    "object content recovered",
  );
});

await test("array schema still receives the array directly (no over-unwrap)", () => {
  const arrSchema = z.array(z.object({ id: z.number() }));
  const r = coerceJsonToSchema('[{"id":1}]', arrSchema);
  assertEqual(
    Array.isArray(r?.structuredData),
    true,
    "array-typed schema keeps the array",
  );
});

await test("multi-element array is NOT force-unwrapped for an object schema", () => {
  // Only a lone element is a safe unwrap; a 2+ element array is genuinely not
  // the object the schema wants, so it must fall through unchanged.
  const r = coerceJsonToSchema(
    JSON.stringify([
      { summary: "a", attachment: null },
      { summary: "b", attachment: null },
    ]),
    schema,
  );
  assertEqual(
    Array.isArray(r?.structuredData),
    true,
    "multi-element array not silently reduced to its first element",
  );
});

await runSuite();
