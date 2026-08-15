#!/usr/bin/env tsx
/**
 * Continuous Test Suite: truncated structured output (pure, no API).
 *
 * The `huge-output` cell of test:json-e2e caught the native Anthropic-direct
 * path returning a STRING as `structuredData` where the schema required an
 * object. The failure is the truncation path: when the response is cut at
 * `max_tokens` the root brace never closes, so
 *
 *   1. the balanced-span scan walks past the unclosed root and matches a
 *      bracket pair that lives INSIDE a string value — `[step 1]` in a shell
 *      script becomes `["step 1"]`, a syntactically fine but semantically
 *      BOGUS array, reported with `truncated: false` (silently wrong), and
 *   2. at some cut points nothing parsed at all, `coerceJsonToSchema` returned
 *      null, and the caller kept the raw text — a string.
 *
 * A prefix sweep over a realistic huge-output payload hit case 1 at ~22% of
 * all cut points and case 2 at a handful more. This suite locks in the
 * contract: whatever the cut point, a schema request yields a PLAIN OBJECT
 * (partial when the model did not finish) and `truncated` is always set.
 *
 * Run: npx tsx test/continuous-test-suite-coerce-truncation.ts
 */
import { z } from "zod";
import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import {
  coerceJsonToSchema,
  schemaAccepts,
} from "../src/lib/utils/json/coerce.js";

const { test, runSuite } = defineSuite("Truncated structured-output recovery");

// The e2e `huge-output` schema: a large free-form `content` is where a
// max_tokens cut lands in practice.
const agentSchema = z.object({
  summary: z.string().min(1).max(4000),
  attachment: z
    .object({
      filename: z.string().min(1),
      extension: z.string().min(1),
      mimetype: z.string().min(1),
      content: z.string().min(1),
    })
    .nullable(),
});

// A shell script full of `[step N]` brackets and Windows backslash paths —
// exactly the payload the e2e huge-output prompt asks for, and exactly what
// makes an unclosed-root scan find bogus inner arrays.
const script = Array.from(
  { length: 30 },
  (_, i) =>
    `echo "[step ${i + 1}] validating C:\\Users\\test\\app — grep -E \\"[0-9]\\d+\\""`,
).join("\n");

const FULL = JSON.stringify({
  summary: "a deployment probe script",
  attachment: {
    filename: "probe",
    extension: "sh",
    mimetype: "text/x-shellscript",
    content: script,
  },
});

const isPlainObject = (v: unknown): boolean =>
  v !== null && typeof v === "object" && !Array.isArray(v);

await test("every truncation point yields a plain object and reports truncated", () => {
  // Structural diagnostics ONLY: a cut position cannot match the harness's
  // isExpectedProviderError() predicate, but a recovered payload fragment can.
  // Never interpolate a value into an assertion message here — see CLAUDE.md
  // "Keep payloads out of assertion messages".
  let hasNonObject = false;
  let firstDegradedCut: number | undefined;
  let hasUnflagged = false;
  let firstUnflaggedCut: number | undefined;
  for (let cut = 1; cut < FULL.length; cut++) {
    const r = coerceJsonToSchema(FULL.slice(0, cut), agentSchema);
    if (r === null || !isPlainObject(r?.structuredData)) {
      hasNonObject = true;
      firstDegradedCut ??= cut;
    }
    if (r !== null && !r.truncated) {
      hasUnflagged = true;
      firstUnflaggedCut ??= cut;
    }
    if (hasNonObject && hasUnflagged) {
      break;
    }
  }
  assertEqual(
    hasNonObject,
    false,
    `each truncated prefix must recover a plain object${firstDegradedCut === undefined ? "" : ` (first degraded at cut ${firstDegradedCut})`}`,
  );
  assertEqual(
    hasUnflagged,
    false,
    `each truncated prefix must report truncation${firstUnflaggedCut === undefined ? "" : ` (first unflagged at cut ${firstUnflaggedCut})`}`,
  );
});

await test("a bracket pair inside a string value never wins over the partial root", () => {
  // Cut just past `"content":"echo \"[step 1]` — the only BALANCED span in the
  // text is the `[step 1]` living inside the (unterminated) string value.
  const cut = FULL.slice(0, FULL.indexOf("[step 1]") + 30);
  const r = coerceJsonToSchema(cut, agentSchema);
  assert(isPlainObject(r?.structuredData), "recovered value is an object");
  const obj = r?.structuredData as Record<string, unknown>;
  assertEqual(obj.summary, "a deployment probe script", "root fields kept");
  assertEqual(r?.truncated, true, "truncation is surfaced");
});

await test("salvages a partial object where jsonrepair alone fails", () => {
  // Cut mid-value at `"mimetype":"text/` — jsonrepair cannot close this on its
  // own and coerceJsonToSchema used to return null here, which left the caller
  // holding the raw text. The structural back-off drops to the last completed
  // field instead.
  const cut = FULL.slice(0, FULL.indexOf("text/x-shellscript") + 5);
  const r = coerceJsonToSchema(cut, agentSchema);
  assert(isPlainObject(r?.structuredData), "partial object recovered");
  const att = (r?.structuredData as { attachment?: Record<string, unknown> })
    .attachment;
  assertEqual(att?.filename, "probe", "completed fields survive the salvage");
  assertEqual(att?.extension, "sh", "all completed fields survive");
  assertEqual(r?.truncated, true, "partial object is flagged truncated");
});

await test("a complete document is never mislabelled truncated", () => {
  const r = coerceJsonToSchema(FULL, agentSchema);
  assertEqual(r?.truncated, false, "complete output not flagged truncated");
  assert(
    agentSchema.safeParse(r?.structuredData).success,
    "complete output satisfies the schema",
  );
});

await test("a root array truncated mid-element still recovers an array", () => {
  const arrSchema = z.array(z.object({ id: z.number(), label: z.string() }));
  const full = JSON.stringify([
    { id: 1, label: "alpha [1]" },
    { id: 2, label: "beta [2]" },
    { id: 3, label: "gamma [3]" },
  ]);
  const r = coerceJsonToSchema(full.slice(0, full.length - 12), arrSchema);
  assertEqual(Array.isArray(r?.structuredData), true, "array root preserved");
  assertEqual(r?.truncated, true, "truncation surfaced for array roots");
});

// ── schemaAccepts: the gate that stops a raw string reaching structuredData ──

await test("schemaAccepts rejects a raw string under an object schema", () => {
  assertEqual(
    schemaAccepts(agentSchema, "the model's raw text answer"),
    false,
    "an object schema must not accept a string",
  );
  assertEqual(
    schemaAccepts(agentSchema, { summary: "ok", attachment: null }),
    true,
    "a conforming object is accepted",
  );
});

await test("schemaAccepts keeps string-root schemas working", () => {
  assertEqual(
    schemaAccepts(z.string(), "hello"),
    true,
    "string schema + string",
  );
  assertEqual(schemaAccepts(z.number(), 42), true, "number schema + number");
});

await test("schemaAccepts is permissive when there is no validatable schema", () => {
  assertEqual(schemaAccepts(undefined, "anything"), true, "no schema → accept");
  assertEqual(
    schemaAccepts({ type: "object" } as unknown as z.ZodTypeAny, "anything"),
    true,
    "a schema without safeParse must not block a value",
  );
});

await runSuite();
