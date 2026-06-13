#!/usr/bin/env tsx
/**
 * Continuous Test Suite: Vertex Gemini responseSchema sanitization (pure, no API).
 *
 * Vertex's `response_schema` (structured output) and function-call validators
 * implement OpenAPI 3.0 strictly and reject JSON-Schema extension keywords.
 * `convertZodToJsonSchema` enables zod-to-json-schema's `errorMessages: true`,
 * so any field carrying a custom message — e.g. curator's
 * `z.string().regex(re, { message })` on filename/extension/mimetype — emits an
 * `errorMessage` keyword. Vertex then rejects the whole structured-output
 * request with `Unknown name "errorMessage" … Cannot find field`, and a recovery
 * loop retries the same poisoned payload.
 *
 * The tool path already sanitized via stripAdditionalPropertiesDeep; the
 * responseSchema path did not, and `errorMessage` was not in the strip list.
 * This suite locks in that stripAdditionalPropertiesDeep removes `errorMessage`
 * (and the other Vertex-rejected keywords) recursively — including from a
 * faithful reproduction of the exact production payload Vertex rejected — while
 * preserving the real schema content (types, patterns, enums, required).
 *
 * Run: npx tsx test/continuous-test-suite-vertex-response-schema-sanitize.ts
 */
import { defineSuite, assertEqual } from "./helpers/harness.js";
import { stripAdditionalPropertiesDeep } from "../src/lib/providers/googleVertex.js";

const { test, runSuite } = defineSuite("Vertex responseSchema sanitization");

/** True if `key` appears anywhere in the (possibly nested) object/array tree. */
const hasKeyDeep = (node: unknown, key: string): boolean => {
  if (Array.isArray(node)) {
    return node.some((v) => hasKeyDeep(v, key));
  }
  if (node && typeof node === "object") {
    return Object.entries(node as Record<string, unknown>).some(
      ([k, v]) => k === key || hasKeyDeep(v, key),
    );
  }
  return false;
};

// Faithful reproduction of the JSON schema `convertZodToJsonSchema` produces for
// curator's StructuredAgentResponseSchema. Curator's schema is authored with
// zod v3; `convertZodToJsonSchema` enables zod-to-json-schema's
// `errorMessages: true`, so each `z.string().regex(re, { message })` field
// (filename/extension/mimetype) emits an `errorMessage` object alongside its
// `pattern`. Vertex's `response_schema` validator then 400s with
// `Unknown name "errorMessage" … Cannot find field`. (Asserted as a literal,
// not via the live converter, because this repo's own zod is v4 — which does not
// emit errorMessage — so a converter-based assertion would not be portable.)
const productionResponseSchema = (): Record<string, unknown> => ({
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    attachment: {
      type: "object",
      nullable: true,
      additionalProperties: false,
      properties: {
        filename: {
          type: "string",
          pattern: "^[A-Za-z0-9._\\- ]+$",
          errorMessage: { pattern: "bad filename" },
        },
        extension: {
          type: "string",
          pattern: "^[A-Za-z0-9]+$",
          errorMessage: { pattern: "bad extension" },
        },
        mimetype: {
          type: "string",
          pattern: "^[\\w.+-]+/[\\w.+-]+$",
          errorMessage: { pattern: "bad mimetype" },
        },
        content: { type: "string" },
      },
      required: ["filename", "extension", "mimetype", "content"],
    },
  },
  required: ["summary", "attachment"],
});

await test("strips errorMessage from the production-shaped responseSchema (the Vertex-400 payload)", () => {
  const js = productionResponseSchema();
  assertEqual(
    hasKeyDeep(js, "errorMessage"),
    true,
    "errorMessage present before sanitize",
  );
  stripAdditionalPropertiesDeep(js);
  assertEqual(
    hasKeyDeep(js, "errorMessage"),
    false,
    "errorMessage must be gone everywhere after sanitize",
  );
});

await test("also clears additionalProperties from the production-shaped responseSchema", () => {
  const js = productionResponseSchema();
  stripAdditionalPropertiesDeep(js);
  assertEqual(
    hasKeyDeep(js, "additionalProperties"),
    false,
    "additionalProperties gone",
  );
  // The real attachment fields and constraints survive.
  const att = (js.properties as Record<string, Record<string, unknown>>)
    .attachment;
  const fn = (att.properties as Record<string, Record<string, unknown>>)
    .filename;
  assertEqual(fn.type, "string", "filename type preserved");
  assertEqual(fn.pattern, "^[A-Za-z0-9._\\- ]+$", "filename pattern preserved");
  assertEqual(
    JSON.stringify(att.required),
    JSON.stringify(["filename", "extension", "mimetype", "content"]),
    "required preserved",
  );
});

await test("also strips additionalProperties and $schema in nested objects/arrays", () => {
  const js = {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    additionalProperties: false,
    properties: {
      a: { type: "string", errorMessage: "x" },
      b: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: true,
          errorMessage: "y",
        },
      },
    },
  } as Record<string, unknown>;
  stripAdditionalPropertiesDeep(js);
  assertEqual(
    hasKeyDeep(js, "additionalProperties"),
    false,
    "additionalProperties gone",
  );
  assertEqual(hasKeyDeep(js, "$schema"), false, "$schema gone");
  assertEqual(
    hasKeyDeep(js, "errorMessage"),
    false,
    "nested errorMessage gone",
  );
});

await test("strips rejected keywords inside anyOf branches", () => {
  const js = {
    type: "object",
    properties: {
      u: {
        anyOf: [
          { type: "string", errorMessage: "m" },
          { type: "number", additionalProperties: false },
        ],
      },
    },
  } as Record<string, unknown>;
  stripAdditionalPropertiesDeep(js);
  assertEqual(
    hasKeyDeep(js, "errorMessage"),
    false,
    "errorMessage in anyOf gone",
  );
  assertEqual(
    hasKeyDeep(js, "additionalProperties"),
    false,
    "additionalProperties in anyOf gone",
  );
});

await test("preserves legitimate schema content (type/description/enum/required)", () => {
  const js = {
    type: "object",
    properties: {
      name: { type: "string", description: "the name", enum: ["a", "b"] },
    },
    required: ["name"],
  } as Record<string, unknown>;
  stripAdditionalPropertiesDeep(js);
  const props = js.properties as Record<string, Record<string, unknown>>;
  assertEqual(props.name.type, "string", "type preserved");
  assertEqual(props.name.description, "the name", "description preserved");
  assertEqual(
    JSON.stringify(props.name.enum),
    JSON.stringify(["a", "b"]),
    "enum preserved",
  );
  assertEqual(
    JSON.stringify(js.required),
    JSON.stringify(["name"]),
    "required preserved",
  );
});

await runSuite();
