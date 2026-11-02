#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Zod 4 tool schemas keep the shape Zod 3 gave them.
 *
 * `convertZodToJsonSchema` turns the Zod schema of a tool into the JSON Schema
 * a provider receives. Zod 4's `z.toJSONSchema` defaults to the OUTPUT side of
 * a schema, so `.transform()`, `z.coerce.date()`, `z.date()` and
 * `z.instanceof()` made it throw. The catch fell back to `zod-to-json-schema`,
 * which cannot read a Zod 4 schema, and the whole tool reached the model as
 * `{ type: "object", properties: {} }`: a tool with no parameters. Where it did
 * not throw, the shape differed from what `zod-to-json-schema` produced for the
 * same Zod 3 schema (open objects, a `required` list that disagreed with what
 * parsing rejects, `oneOf` for discriminated unions, a generated `pattern`
 * next to every
 * `format`), so upgrading Zod changed what every model was told.
 *
 * What is asserted, per construct and for both targets the SDK calls it with
 * (`jsonSchema7`, `openApi3`): the field is still there, objects are closed
 * unless the schema says otherwise, a key is listed as required exactly when
 * parsing rejects the object without it, discriminated unions are `anyOf`
 * (`z.xor()`, which has no Zod 3 counterpart and rejects a value that matches
 * two branches, keeps `oneOf`), standard formats carry no generated pattern,
 * and dates are `date-time` strings.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from
 * `src/lib/` and is on the `neurolink/e2e-tests-only` allow list.
 * `convertZodToJsonSchema` is exported from no package entry point, and what is
 * under test is a fixed table of Zod constructs to exact JSON Schema output. A
 * live `generate()` call could only show it indirectly, through whatever a
 * provider happened to do with a tool it was given, and cannot be made to
 * present a `.transform()` or a `.catch()` on demand. Everything here comes
 * from `src`, never `dist` (one module graph per suite).
 *
 * Offline: no provider is constructed and nothing touches the network.
 *
 * Run: npx tsx test/continuous-test-suite-zod4-tool-schema-shape.ts
 *      pnpm run test:zod4-tool-schema-shape
 */

import { z } from "zod";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import { convertZodToJsonSchema } from "../src/lib/utils/schemaConversion.js";

const { test, runSuite } = defineSuite("Zod 4 tool schema shape", {
  offline: true,
});

type Target = "jsonSchema7" | "openApi3";
const TARGETS: Target[] = ["jsonSchema7", "openApi3"];

type JsonObject = Record<string, unknown>;

function asObject(value: unknown, what: string): JsonObject {
  assert(
    !!value && typeof value === "object" && !Array.isArray(value),
    `${what} is not an object`,
  );
  return value as JsonObject;
}

function propertiesOf(schema: JsonObject): JsonObject {
  return asObject(schema.properties, "properties");
}

function convert(schema: z.ZodType, target: Target): JsonObject {
  return convertZodToJsonSchema(schema, target) as JsonObject;
}

function sorted(values: unknown): string[] {
  return Array.isArray(values) ? [...(values as string[])].sort() : [];
}

for (const target of TARGETS) {
  await test(`${target}: constructs that Zod 4 cannot read on the output side keep their fields`, () => {
    const schema = convert(
      z.object({
        trimmed: z.string().transform((value) => value.trim()),
        count: z.coerce.number(),
        day: z.date(),
        optionalDay: z.coerce.date().optional(),
        wrapped: z.instanceof(Date),
      }),
      target,
    );
    assertEqual(
      Object.keys(propertiesOf(schema)).sort().join(","),
      "count,day,optionalDay,trimmed,wrapped",
      "a field was dropped",
    );
  });

  await test(`${target}: dates are date-time strings`, () => {
    const properties = propertiesOf(
      convert(z.object({ day: z.date(), parsed: z.coerce.date() }), target),
    );
    for (const key of ["day", "parsed"]) {
      const field = asObject(properties[key], key);
      assertEqual(field.type, "string", `${key} type`);
      assertEqual(field.format, "date-time", `${key} format`);
    }
  });

  await test(`${target}: a key is required exactly when parsing rejects the object without it`, () => {
    const schema = convert(
      z.object({
        needed: z.string(),
        nullableButNeeded: z.string().nullable(),
        optional: z.string().optional(),
        defaulted: z.boolean().default(false),
        caught: z.string().catch("fallback"),
        nullish: z.string().nullish(),
      }),
      target,
    );
    assertEqual(
      sorted(schema.required).join(","),
      "needed,nullableButNeeded",
      "required list",
    );
  });

  await test(`${target}: deciding that a catch key is optional does not call its callback again`, () => {
    let calls = 0;
    const schema = convert(
      z.object({
        caught: z.string().catch(() => {
          calls += 1;
          return "fallback";
        }),
        needed: z.string(),
      }),
      target,
    );
    // Zod's own converter calls the callback once, to read the default that
    // this module then drops; a second call would be ours.
    assertEqual(calls, 1, "catch callback calls during one conversion");
    assertEqual(sorted(schema.required).join(","), "needed", "required list");
  });

  await test(`${target}: a key whose schema cannot be parsed synchronously is required`, () => {
    const schema = convert(
      z.object({
        later: z.preprocess(async (value) => value ?? "default", z.string()),
        needed: z.string(),
      }),
      target,
    );
    assertEqual(
      sorted(schema.required).join(","),
      "later,needed",
      "required list",
    );
  });

  await test(`${target}: an object with only optional keys has no required list`, () => {
    const schema = convert(z.object({ a: z.string().optional() }), target);
    assert(!("required" in schema), "required should be absent");
  });

  await test(`${target}: objects are closed unless the schema opens them`, () => {
    assertEqual(
      convert(z.object({ a: z.string() }), target).additionalProperties,
      false,
      "plain object",
    );
    assertEqual(
      convert(z.looseObject({ a: z.string() }), target).additionalProperties,
      true,
      "looseObject",
    );
    assertEqual(
      JSON.stringify(
        convert(z.object({ a: z.string() }).catchall(z.number()), target)
          .additionalProperties,
      ),
      JSON.stringify({ type: "number" }),
      "catchall",
    );
    const nested = propertiesOf(
      convert(z.object({ inner: z.object({ id: z.string() }) }), target),
    );
    assertEqual(
      asObject(nested.inner, "inner").additionalProperties,
      false,
      "nested object",
    );
  });

  await test(`${target}: a discriminated union is anyOf, never oneOf`, () => {
    const schema = convert(
      z.object({
        either: z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("a"), value: z.string() }),
          z.object({ kind: z.literal("b") }),
        ]),
      }),
      target,
    );
    const either = asObject(propertiesOf(schema).either, "either");
    assert(Array.isArray(either.anyOf), "anyOf missing");
    assert(!("oneOf" in either), "oneOf present");
  });

  await test(`${target}: z.xor keeps oneOf, because a value that matches two branches is rejected`, () => {
    const schema = convert(
      z.object({
        pick: z.xor([z.string().min(1), z.string().min(2)]),
      }),
      target,
    );
    const pick = asObject(propertiesOf(schema).pick, "pick");
    assert(Array.isArray(pick.oneOf), "oneOf missing");
    assert(!("anyOf" in pick), "anyOf present");
  });

  await test(`${target}: standard formats carry no generated pattern and other string checks no format`, () => {
    const properties = propertiesOf(
      convert(
        z.object({
          mail: z.string().email(),
          id: z.string().uuid(),
          link: z.string().url(),
          stamp: z.string().datetime(),
          startsWith: z.string().startsWith("gid://"),
          includes: z.string().includes("@"),
        }),
        target,
      ),
    );
    for (const [key, format] of [
      ["mail", "email"],
      ["id", "uuid"],
      ["link", "uri"],
      ["stamp", "date-time"],
    ] as const) {
      const field = asObject(properties[key], key);
      assertEqual(field.format, format, `${key} format`);
      assert(!("pattern" in field), `${key} still has a pattern`);
    }
    for (const key of ["startsWith", "includes"]) {
      const field = asObject(properties[key], key);
      assert(!("format" in field), `${key} gained a non-standard format`);
      assert(typeof field.pattern === "string", `${key} lost its pattern`);
    }
  });

  await test(`${target}: a record of strings carries no propertyNames and a catch carries no default`, () => {
    const properties = propertiesOf(
      convert(
        z.object({
          counts: z.record(z.string(), z.number()),
          caught: z.string().catch("fallback"),
        }),
        target,
      ),
    );
    const counts = asObject(properties.counts, "counts");
    assert(!("propertyNames" in counts), "propertyNames present");
    assertEqual(
      JSON.stringify(counts.additionalProperties),
      JSON.stringify({ type: "number" }),
      "record value schema",
    );
    assert(!("default" in asObject(properties.caught, "caught")), "default");
  });

  await test(`${target}: an explicit default survives`, () => {
    const properties = propertiesOf(
      convert(
        z.object({ order: z.enum(["ASC", "DESC"]).default("DESC") }),
        target,
      ),
    );
    assertEqual(asObject(properties.order, "order").default, "DESC", "default");
  });
}

await runSuite();
