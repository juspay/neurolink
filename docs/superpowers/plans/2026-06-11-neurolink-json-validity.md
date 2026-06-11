# NeuroLink JSON Validity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `neurolink.generate({ schema })` guarantee that `result.content` is syntactically valid JSON (and expose the parsed object as `result.structuredData`) for every provider, so consumers (curator/TARA, lighthouse, etc.) never have to parse fragile hand-escaped model text.

**Architecture:** Three defensive layers, all inside the **neurolink SDK** (nothing in curator):

1. **Root-cause gate fix** — the tools-vs-schema mutual-exclusion is a _Gemini_ limitation, but `GenerationHandler` applies it to _all_ Vertex (including Vertex+Claude, TARA's production config). Narrow the exclusion to Gemini-only so Vertex+Claude+tools uses AI-SDK `experimental_output` → schema-enforced output → `content = JSON.stringify(validatedObject)` (valid by construction).
2. **Robust text-mode coercion** — for the genuinely-unavoidable text-mode paths (real Gemini+tools, or any provider that returned raw text), parse the model text with a balanced-brace scanner + `jsonrepair` fallback, then re-serialize to canonical JSON. Guarantees syntactic validity even when the model mis-escaped its hand-written JSON.
3. **Expose `structuredData`** — thread the parsed object through `GenerateResult` so consumers can skip re-parsing entirely.

Plus a correctness fix to the SDK's public `extractJsonStringFromText` (replace its non-greedy regex with the balanced scanner already present in the same file).

**Tech Stack:** TypeScript (strict, ESM/NodeNext), Vercel AI SDK v6 (`ai@^6`, `@ai-sdk/anthropic@^3`), Zod, `jsonrepair@^3.14.0` (new dep), test harness `test/helpers/harness.ts` run via `npx tsx`.

**Conventions (from CLAUDE.md — non-negotiable):** no `interface` (use `type`); named exports only; no `any` (use `unknown` + narrowing); types belong in `src/lib/types/` and are imported via the barrel `../types/index.js`; comments only when the _why_ is non-obvious. Run `pnpm run lint` (AST ESLint rules enforce these).

**Verified facts this plan relies on:**

- `GenerationHandler.ts` gate: `const useStructuredOutput = wantsStructuredOutput && !(isGoogleProvider && shouldUseTools && Object.keys(tools).length > 0);` where `isGoogleProvider = providerName === "google-ai" || providerName === "vertex"`.
- The file already defines (but does not use here) `isAnthropicProvider = ... || (providerName === "vertex" && modelName?.startsWith("claude-"))`.
- `formatEnhancedResult` sets `content = JSON.stringify(experimental_output)` when present, else strips fences from `generateResult.text` — and **discards** the parsed object.
- `NoObjectGeneratedError` fallback (re-runs without `experimental_output`) already exists → enabling structured output for Vertex+Claude is strictly safe.
- TARA runtime defaults: `neurolink-provider=vertex`, `neurolink-model=claude-sonnet-4-6`, tools registered (curator `registry.ts`).
- `GenerateResult` (src/lib/types/generate.ts) has no `structuredData` field; DTO builder in `neurolink.ts` (`const generateResult: GenerateResult = { content: textResult.content, ... }`) does not set one.
- `options.schema` type is `ValidationSchema = ZodTypeAny | Schema<unknown>` (Zod schema _or_ AI-SDK JSON schema).
- `jsonrepair` is NOT yet a dependency.
- Tests: `import { defineSuite, assert, assertEqual, assertNotNull } from "./helpers/harness.js"`, `const { test, runSuite } = defineSuite("…")`, run via `npx tsx test/<file>.ts`. `tsx` can import `src/**/*.ts` directly (fast TDD, no build).

**Edit anchoring:** This branch will be rebased onto `origin/release` (Task 1), which shifts line numbers. **All edits below anchor on unique code strings, never line numbers.** If an anchor string is not found verbatim after rebase, re-grep for the nearest stable substring before editing.

---

## File Structure

**Create:**

- `src/lib/core/modules/structuredOutputPolicy.ts` — pure predicate: is the tools/schema exclusion in force for this provider+model? (Gemini-only.)
- `src/lib/utils/json/coerce.ts` — pure `coerceJsonToSchema(text, schema)`: balanced-scan + `jsonrepair` → canonical `{ content, structuredData }` or `null`.
- `test/continuous-test-suite-json.ts` — harness suite covering the policy predicate, the extractor fix, and the coercion (no API calls).

**Modify:**

- `src/lib/utils/json/extract.ts` — replace non-greedy regex in `extractJsonStringFromText` with a shared balanced-span scanner; export the scanner for reuse.
- `src/lib/core/modules/GenerationHandler.ts` — (a) use the policy predicate at the gate; (b) in `formatEnhancedResult`, capture `structuredData` and run `coerceJsonToSchema` on the text-mode fallback; (c) add `structuredData` to the returned object.
- `src/lib/types/utilities.ts` — add `JsonCoercionResult` (rule 2: all types live in `src/lib/types/`; exported via the barrel).
- `src/lib/types/generate.ts` — add `structuredData?: unknown` to `GenerateResult`.
- `src/lib/neurolink.ts` — set `structuredData: textResult.structuredData` in the `GenerateResult` DTO builder.
- `package.json` — add `jsonrepair` dependency; add `test:json` script.

---

## Task 1: Rebase branch onto origin/release

**Files:** none (git only). The branch has 0 commits ahead and is behind several releases; this is a fast-forward with zero conflict risk.

- [ ] **Step 1: Confirm clean tree and no local commits**

Run:

```bash
cd /Users/sachinsharma/Developer/temp/neurolink-fork/feat/json-fix
git fetch origin release
git status --short            # expect: empty
git log --oneline origin/release..HEAD   # expect: empty (0 commits ahead)
```

Expected: working tree clean, no commits ahead.

- [ ] **Step 2: Rebase (fast-forward) onto origin/release**

Run:

```bash
git rebase origin/release
git log --oneline -1          # expect: tip now matches origin/release tip
```

Expected: branch advanced to `origin/release` tip; no conflicts.

- [ ] **Step 3: Install deps (lockfile may have advanced)**

Run:

```bash
pnpm install
```

Expected: completes without errors.

---

## Task 2: `structuredOutputPolicy` predicate (pure, TDD)

**Files:**

- Create: `src/lib/core/modules/structuredOutputPolicy.ts`
- Test: `test/continuous-test-suite-json.ts`

- [ ] **Step 1: Write the failing test**

Create `test/continuous-test-suite-json.ts`:

```ts
#!/usr/bin/env tsx
/**
 * Continuous Test Suite: JSON validity (no API).
 *
 * Covers the structured-output policy predicate, the balanced-brace JSON
 * extractor, and schema-coercion of mis-escaped model text. All pure — no
 * provider calls — so it runs in CI without keys.
 *
 * Run: npx tsx test/continuous-test-suite-json.ts
 */
import {
  defineSuite,
  assert,
  assertEqual,
  assertNotNull,
} from "./helpers/harness.js";
import {
  isGeminiProvider,
  isToolsSchemaExclusionInForce,
} from "../src/lib/core/modules/structuredOutputPolicy.js";

const { test, runSuite } = defineSuite("JSON Validity");

await test("isGeminiProvider: google-ai is Gemini", () => {
  assert(
    isGeminiProvider("google-ai", "gemini-2.5-pro") === true,
    "google-ai should be Gemini",
  );
});

await test("isGeminiProvider: vertex+gemini is Gemini", () => {
  assert(
    isGeminiProvider("vertex", "gemini-2.5-pro") === true,
    "vertex+gemini should be Gemini",
  );
});

await test("isGeminiProvider: vertex+claude is NOT Gemini", () => {
  assert(
    isGeminiProvider("vertex", "claude-sonnet-4-6") === false,
    "vertex+claude must not be Gemini",
  );
});

await test("isGeminiProvider: anthropic is NOT Gemini", () => {
  assert(
    isGeminiProvider("anthropic", "claude-sonnet-4-6") === false,
    "anthropic must not be Gemini",
  );
});

await test("exclusion in force only for Gemini + tools present", () => {
  // Vertex+Claude+tools: exclusion must NOT fire (this is the production bug fix).
  assertEqual(
    isToolsSchemaExclusionInForce("vertex", "claude-sonnet-4-6", true, 5),
    false,
    "vertex+claude+tools",
  );
  // Vertex+Gemini+tools: exclusion fires (real API limitation).
  assertEqual(
    isToolsSchemaExclusionInForce("vertex", "gemini-2.5-pro", true, 5),
    true,
    "vertex+gemini+tools",
  );
  // Gemini with NO tools: no exclusion.
  assertEqual(
    isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", false, 0),
    false,
    "gemini no tools",
  );
  // Gemini with shouldUseTools but zero tools registered: no exclusion.
  assertEqual(
    isToolsSchemaExclusionInForce("google-ai", "gemini-2.5-pro", true, 0),
    false,
    "gemini zero tools",
  );
});

await runSuite();
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx tsx test/continuous-test-suite-json.ts
```

Expected: FAIL — module `../src/lib/core/modules/structuredOutputPolicy.js` not found (file does not exist yet).

- [ ] **Step 3: Write the minimal implementation**

Create `src/lib/core/modules/structuredOutputPolicy.ts`:

```ts
/**
 * Policy for when AI-SDK structured output (experimental_output) must be
 * disabled because the provider cannot combine tool calls with JSON-schema
 * enforcement.
 *
 * This is a GEMINI-ONLY API limitation. Anthropic Claude — including when
 * hosted on Vertex (modelName starts with "claude-") — supports tools and
 * structured output simultaneously, so it must NOT be excluded. The previous
 * gate keyed on "any Vertex model", which wrongly disabled structured output
 * for Vertex+Claude (the primary production config) and forced fragile
 * hand-parsed JSON.
 */

/** True when the provider+model is a Gemini model (the only family with the tools↔schema conflict). */
export function isGeminiProvider(
  providerName: string,
  modelName: string | undefined,
): boolean {
  if (providerName === "google-ai") {
    return true;
  }
  if (providerName === "vertex") {
    // Vertex hosts both Gemini and Claude. Only non-Claude (Gemini) models
    // have the tools↔schema conflict.
    return !(modelName?.startsWith("claude-") ?? false);
  }
  return false;
}

/**
 * True when structured output must be disabled for this call because tools are
 * active on a Gemini provider. Mirrors the AI-SDK constraint exactly.
 */
export function isToolsSchemaExclusionInForce(
  providerName: string,
  modelName: string | undefined,
  shouldUseTools: boolean,
  toolCount: number,
): boolean {
  return (
    isGeminiProvider(providerName, modelName) && shouldUseTools && toolCount > 0
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
npx tsx test/continuous-test-suite-json.ts
```

Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/core/modules/structuredOutputPolicy.ts test/continuous-test-suite-json.ts
git commit -m "feat(generation): add Gemini-only structured-output exclusion policy"
```

---

## Task 3: Use the policy at the GenerationHandler gate

**Files:**

- Modify: `src/lib/core/modules/GenerationHandler.ts`

- [ ] **Step 1: Add the import**

Add to the import block at the top of `GenerationHandler.ts` (next to other local module imports):

```ts
import { isToolsSchemaExclusionInForce } from "./structuredOutputPolicy.js";
```

- [ ] **Step 2: Replace the over-broad gate**

Find (anchor — `callGenerateText`):

```ts
const useStructuredOutput =
  wantsStructuredOutput &&
  !(isGoogleProvider && shouldUseTools && Object.keys(tools).length > 0);
```

Replace with:

```ts
// The tools↔schema conflict is a Gemini-only API limitation. Vertex+Claude
// supports both simultaneously, so only exclude for actual Gemini models.
const useStructuredOutput =
  wantsStructuredOutput &&
  !isToolsSchemaExclusionInForce(
    this.providerName,
    this.modelName,
    shouldUseTools,
    Object.keys(tools).length,
  );
```

Note: leave `isGoogleProvider` defined — it is still used elsewhere in this method (thinking config / `providerOptions.google`). Only this gate changes. If ESLint now flags `isGoogleProvider` as unused, that means it had no other use; in that case delete its declaration too. (Verify with `pnpm run lint` in Step 4.)

- [ ] **Step 3: Type-check**

Run:

```bash
pnpm run check
```

Expected: no new type errors.

- [ ] **Step 4: Lint**

Run:

```bash
pnpm run lint
```

Expected: clean. If `isGoogleProvider` is reported unused, remove its `const isGoogleProvider = ...` declaration and re-run.

- [ ] **Step 5: Commit**

```bash
git add src/lib/core/modules/GenerationHandler.ts
git commit -m "fix(generation): enable structured output for Vertex+Claude with tools"
```

---

## Task 4: Balanced-brace scanner for `extractJsonStringFromText`

**Files:**

- Modify: `src/lib/utils/json/extract.ts`
- Test: `test/continuous-test-suite-json.ts`

- [ ] **Step 1: Add the failing tests**

Append to `test/continuous-test-suite-json.ts` BEFORE the final `await runSuite();` line:

````ts
import { extractJsonStringFromText } from "../src/lib/utils/json/extract.js";

await test("extractor: returns the full outer object, not the first inner brace", () => {
  // The string value contains a "}" — a non-greedy regex would stop early.
  const input = 'noise {"a":{"b":"}"},"c":1} trailing';
  const got = extractJsonStringFromText(input);
  assertNotNull(got, "should extract an object");
  assertEqual(
    JSON.parse(got as string).c,
    1,
    "must parse to the full object with c=1",
  );
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
````

- [ ] **Step 2: Run to verify the new tests fail**

Run:

```bash
npx tsx test/continuous-test-suite-json.ts
```

Expected: the "full outer object" test FAILS — the current non-greedy regex returns `{"b":"}"}` (the first balanced-looking inner fragment) or otherwise loses `c:1`.

- [ ] **Step 3: Implement the shared scanner and rewire the function**

In `src/lib/utils/json/extract.ts`, add this exported helper near the top (after the imports):

```ts
/**
 * Find the first balanced JSON object/array span starting at or after
 * `fromIndex`. Quote- and escape-aware: braces inside string literals do not
 * affect depth. Returns the matched substring and the index just past it, or
 * null if no balanced span exists.
 */
export function nextBalancedJsonSpan(
  text: string,
  fromIndex = 0,
): { span: string; end: number } | null {
  for (let start = fromIndex; start < text.length; start++) {
    const openChar = text[start];
    if (openChar !== "{" && openChar !== "[") {
      continue;
    }
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      if (ch === "\\") {
        escapeNext = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) {
        continue;
      }
      if (ch === openChar) {
        depth++;
      } else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          return { span: text.substring(start, i + 1), end: i + 1 };
        }
      }
    }
    // Unbalanced from this start — try the next opening char.
  }
  return null;
}
```

Then replace the non-greedy candidate loop in `extractJsonStringFromText`. Find (anchor):

```ts
// Try to find JSON object or array pattern using non-greedy iterative scan.
// Note: [\s\S]*? is non-greedy but can still produce over-spanning matches
// in texts with many braces. This is acceptable as we try-parse each candidate
// and move to the next on failure. A bracket-balancing parser would be more
// precise but significantly more complex for marginal benefit.
const candidateRegex = /(\{[\s\S]*?\}|\[[\s\S]*?\])/g;
let candidate: RegExpExecArray | null;
while ((candidate = candidateRegex.exec(text)) !== null) {
  try {
    JSON.parse(candidate[1]);
    return candidate[1];
  } catch {
    // Try next candidate
  }
}

return null;
```

Replace with:

```ts
// Scan for balanced JSON object/array spans (quote/escape aware) and return
// the first one that parses. Unlike a non-greedy regex, this never stops at a
// "}" that lives inside a string value, so nested objects are preserved.
let searchFrom = 0;
for (;;) {
  const found = nextBalancedJsonSpan(text, searchFrom);
  if (!found) {
    break;
  }
  try {
    JSON.parse(found.span);
    return found.span;
  } catch {
    // Not valid JSON — resume scanning just past this opening character.
  }
  searchFrom = text.indexOf(found.span[0], searchFrom) + 1;
}

return null;
```

- [ ] **Step 4: Run to verify all extractor tests pass**

Run:

```bash
npx tsx test/continuous-test-suite-json.ts
```

Expected: PASS — including the "full outer object" test.

- [ ] **Step 5: Type-check + lint**

Run:

```bash
pnpm run check && pnpm run lint
```

Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/json/extract.ts test/continuous-test-suite-json.ts
git commit -m "fix(json): use balanced-brace scanner in extractJsonStringFromText"
```

---

## Task 5: `coerceJsonToSchema` — jsonrepair-backed canonicaliser (TDD)

**Files:**

- Modify: `package.json` (add `jsonrepair`)
- Create: `src/lib/utils/json/coerce.ts`
- Test: `test/continuous-test-suite-json.ts`

- [ ] **Step 1: Add the dependency**

Run:

```bash
pnpm add jsonrepair@^3.14.0
```

Expected: `jsonrepair` appears under `dependencies` in `package.json`.

- [ ] **Step 2: Add the failing tests**

Append to `test/continuous-test-suite-json.ts` before `await runSuite();`:

```ts
import { coerceJsonToSchema } from "../src/lib/utils/json/coerce.js";
import { z } from "zod";

const demoSchema = z.object({
  summary: z.string().min(1),
  attachment: z
    .object({ extension: z.string(), content: z.string() })
    .nullable(),
});

await test("coerce: unescaped double-quote inside content is repaired", () => {
  // The model wrote a bare " inside the content value — invalid JSON.
  const bad =
    '{"summary":"done","attachment":{"extension":"txt","content":"He said "hi""}}';
  const out = coerceJsonToSchema(bad, demoSchema);
  assertNotNull(out, "should repair + parse");
  // content must be valid JSON now and round-trip through JSON.parse.
  const obj = JSON.parse((out as { content: string }).content);
  assertEqual(obj.summary, "done", "summary preserved");
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

await test("coerce: already-valid JSON passes through unchanged in meaning", () => {
  const good = '{"summary":"ok","attachment":null}';
  const out = coerceJsonToSchema(good, demoSchema);
  assertNotNull(out, "valid JSON should coerce");
  assertEqual(
    (out as { structuredData: { summary: string } }).structuredData.summary,
    "ok",
    "object exposed",
  );
});

await test("coerce: prose-wrapped object is extracted then canonicalised", () => {
  const wrapped = 'Sure! {"summary":"ok","attachment":null} hope that helps';
  const out = coerceJsonToSchema(wrapped, demoSchema);
  assertNotNull(out, "should extract embedded object");
  assertEqual(
    (out as { content: string }).content[0],
    "{",
    "content is canonical JSON starting with {",
  );
});

await test("coerce: pure prose with no JSON returns null", () => {
  const out = coerceJsonToSchema(
    "just a friendly hello, no json here",
    demoSchema,
  );
  assertEqual(out, null, "no JSON object -> null (caller keeps raw text)");
});
```

- [ ] **Step 3: Run to verify failure**

Run:

```bash
npx tsx test/continuous-test-suite-json.ts
```

Expected: FAIL — module `../src/lib/utils/json/coerce.js` not found.

- [ ] **Step 4: Implement `coerceJsonToSchema`**

Create `src/lib/utils/json/coerce.ts`:

```ts
/**
 * Coerce arbitrary model text into canonical, syntactically-valid JSON.
 *
 * Used on the text-mode path (providers/models that could not use AI-SDK
 * structured output, e.g. real Gemini + tools). The model hand-writes JSON and
 * frequently mis-escapes the content field (bare newline, unescaped quote,
 * invalid escape like \d). A balanced-brace scan finds the object span; if
 * JSON.parse rejects it, jsonrepair fixes common escaping mistakes; the result
 * is re-serialised with JSON.stringify so downstream consumers always receive
 * valid JSON.
 *
 * NOTE: jsonrepair is a heuristic. On content where a lone backslash is
 * meaningful (regex/script/Windows path) it may drop the backslash, producing
 * valid-but-semantically-altered content. This only affects the residual
 * text-mode path — the primary Vertex+Claude path uses experimental_output and
 * never reaches here. When jsonrepair changes the input we log at debug level
 * so the event is observable.
 */
import { jsonrepair } from "jsonrepair";
import type {
  JsonCoercionResult,
  ValidationSchema,
} from "../../types/index.js";
import { logger } from "../../utils/logger.js";
import { nextBalancedJsonSpan } from "./extract.js";

// NOTE: the result type lives in src/lib/types/utilities.ts (repo rule 2 —
// all types in src/lib/types/) and is imported via the barrel. Phase 2 added
// the `repaired`/`truncated` observability flags, so the final shipped shape is:
//   export type JsonCoercionResult = {
//     content: string;
//     structuredData: unknown;
//     repaired: boolean;   // jsonrepair altered the text to make it parse
//     truncated: boolean;  // recovered from an unclosed (token-truncated) span
//   };

/** Narrow a ValidationSchema to "looks like a Zod schema" (has safeParse). */
function hasSafeParse(schema: ValidationSchema): schema is {
  safeParse: (v: unknown) => { success: boolean; data?: unknown };
} {
  return typeof (schema as { safeParse?: unknown }).safeParse === "function";
}

/** Parse `candidate` as JSON, repairing common escaping mistakes on failure. */
function parseOrRepair(candidate: string): unknown | undefined {
  try {
    return JSON.parse(candidate);
  } catch {
    // fall through to repair
  }
  try {
    const repaired = jsonrepair(candidate);
    const value = JSON.parse(repaired);
    if (repaired !== candidate && logger.shouldLog("debug")) {
      logger.debug("[coerceJsonToSchema] jsonrepair altered model output", {
        originalLength: candidate.length,
        repairedLength: repaired.length,
      });
    }
    return value;
  } catch {
    return undefined;
  }
}

/**
 * Try to produce canonical JSON from `text`. Returns null when no JSON object
 * could be recovered (caller should then keep the raw text).
 *
 * When `schema` is a Zod schema, candidates that satisfy it are preferred; a
 * syntactically-valid-but-schema-failing object is still returned (we guarantee
 * JSON *validity*, leaving schema/content checks to the caller's own pipeline).
 */
export function coerceJsonToSchema(
  text: string,
  schema?: ValidationSchema,
): JsonCoercionResult | null {
  if (typeof text !== "string" || text.trim().length === 0) {
    return null;
  }

  let firstValid: unknown | undefined;
  let schemaMatch: unknown | undefined;

  let searchFrom = 0;
  for (;;) {
    const found = nextBalancedJsonSpan(text, searchFrom);
    if (!found) {
      break;
    }
    const parsed = parseOrRepair(found.span);
    if (parsed !== undefined && parsed !== null && typeof parsed === "object") {
      if (firstValid === undefined) {
        firstValid = parsed;
      }
      if (schema && hasSafeParse(schema)) {
        if (schema.safeParse(parsed).success) {
          schemaMatch = parsed;
          break;
        }
      } else {
        // No Zod schema to discriminate — first parseable object wins.
        break;
      }
    }
    searchFrom = found.end;
  }

  const chosen = schemaMatch ?? firstValid;
  if (chosen === undefined) {
    return null;
  }
  // Phase 1 shape shown here; Phase 2 extends the return with the
  // `repaired`/`truncated` flags (see the JsonCoercionResult note above and
  // the Phase 2 section) — the shipped code returns all four fields.
  return { content: JSON.stringify(chosen), structuredData: chosen };
}
```

Note: confirm the logger import path matches the codebase. Find it with:

```bash
grep -rn "export const logger\|export { logger" src/lib/utils/logger.ts src/lib/**/logger.ts 2>/dev/null | head
```

Adjust the `import { logger }` path to the real location if different.

- [ ] **Step 5: Run to verify pass**

Run:

```bash
npx tsx test/continuous-test-suite-json.ts
```

Expected: PASS — all coercion tests green.

- [ ] **Step 6: Type-check + lint**

Run:

```bash
pnpm run check && pnpm run lint
```

Expected: clean. (`ValidationSchema` must be imported from the barrel `../../types/index.js` per CLAUDE.md rule 13.)

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/utils/json/coerce.ts test/continuous-test-suite-json.ts
git commit -m "feat(json): add jsonrepair-backed coerceJsonToSchema for text-mode JSON"
```

---

## Task 6: Populate `structuredData` + coerce text-mode output in `formatEnhancedResult`

**Files:**

- Modify: `src/lib/core/modules/GenerationHandler.ts`

- [ ] **Step 1: Add the import**

Add near the other local imports in `GenerationHandler.ts`:

```ts
import { coerceJsonToSchema } from "../../utils/json/coerce.js";
```

- [ ] **Step 2: Rewrite the structured-output branch to capture `structuredData`**

Find (anchor — the whole `content` resolution block in `formatEnhancedResult`):

````ts
let content: string;
if (useStructuredOutput) {
  try {
    const experimentalOutput = generateResult.experimental_output;
    if (experimentalOutput !== undefined) {
      content = JSON.stringify(experimentalOutput);
    } else {
      // Fall back to text parsing
      const rawText = generateResult.text || "";
      const strippedText = rawText
        .replace(/^```(?:json)?\s*\n?/i, "")
        .replace(/\n?```\s*$/i, "")
        .trim();
      content = strippedText;
    }
  } catch (outputError) {
    // experimental_output is a getter that can throw NoObjectGeneratedError
    // Fall back to text parsing when structured output fails
    logger.debug(
      "[GenerationHandler] experimental_output threw, falling back to text parsing",
      {
        error:
          outputError instanceof Error
            ? outputError.message
            : String(outputError),
      },
    );
    const rawText = generateResult.text || "";
    const strippedText = rawText
      .replace(/^```(?:json)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    content = strippedText;
  }
} else {
  content = generateResult.text;
}
````

Replace with:

````ts
let content: string;
let structuredData: unknown;
// Strip an outer ```json fence and coerce raw model text into canonical
// JSON. Shared by both text-mode fallbacks below so a mis-escaped
// hand-written object still yields valid JSON.
const coerceTextMode = (rawText: string): string => {
  const strippedText = rawText
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  const coerced = coerceJsonToSchema(strippedText, options.schema);
  if (coerced) {
    structuredData = coerced.structuredData;
    return coerced.content;
  }
  return strippedText;
};
if (useStructuredOutput) {
  try {
    const experimentalOutput = generateResult.experimental_output;
    if (experimentalOutput !== undefined) {
      // AI-SDK already parsed + schema-validated the object. Expose it
      // directly and serialise canonically — no hand-parsing needed.
      structuredData = experimentalOutput;
      content = JSON.stringify(experimentalOutput);
    } else {
      content = coerceTextMode(generateResult.text || "");
    }
  } catch (outputError) {
    // experimental_output is a getter that can throw NoObjectGeneratedError.
    logger.debug(
      "[GenerationHandler] experimental_output threw, falling back to text parsing",
      {
        error:
          outputError instanceof Error
            ? outputError.message
            : String(outputError),
      },
    );
    content = coerceTextMode(generateResult.text || "");
  }
} else {
  content = generateResult.text;
}
````

- [ ] **Step 3: Add `structuredData` to the returned object**

Find (anchor — the start of the `formatEnhancedResult` return):

```ts
    return {
      content,
      usage,
      provider: this.providerName,
```

Replace with:

```ts
    return {
      content,
      structuredData,
      usage,
      provider: this.providerName,
```

- [ ] **Step 4: Type-check**

Run:

```bash
pnpm run check
```

Expected: type error — `structuredData` is not assignable to the return type `EnhancedGenerateResult` yet. This is fixed in Task 7. (If you prefer green-at-every-step, do Task 7 Step 1 now, then return here.)

- [ ] **Step 5: Commit (after Task 7 makes it green)**

Defer the commit until Task 7 lands, then:

```bash
git add src/lib/core/modules/GenerationHandler.ts
git commit -m "feat(generation): expose structuredData and coerce text-mode JSON"
```

---

## Task 7: Thread `structuredData` through the result type + DTO

**Files:**

- Modify: `src/lib/types/generate.ts`
- Modify: `src/lib/neurolink.ts`

- [ ] **Step 1: Add the field to `GenerateResult`**

In `src/lib/types/generate.ts`, find (anchor):

```ts
export type GenerateResult = {
  content: string; // Primary output
  outputs?: { text: string }; // Future extensible for multi-modal
```

Replace with:

```ts
export type GenerateResult = {
  content: string; // Primary output
  /**
   * Parsed structured object when a `schema` was requested. Populated from
   * AI-SDK experimental_output, or from text-mode coercion (balanced-scan +
   * jsonrepair). Prefer this over JSON.parse(content) — it never requires the
   * caller to re-parse hand-escaped model text.
   */
  structuredData?: unknown;
  outputs?: { text: string }; // Future extensible for multi-modal
```

- [ ] **Step 2: Set it in the DTO builder**

In `src/lib/neurolink.ts`, find (anchor):

```ts
    const generateResult: GenerateResult = {
      content: textResult.content,
```

Replace with:

```ts
    const generateResult: GenerateResult = {
      content: textResult.content,
      structuredData: textResult.structuredData,
```

- [ ] **Step 3: Type-check**

Run:

```bash
pnpm run check
```

Expected: PASS — `formatEnhancedResult` (Task 6) now type-checks against the extended `GenerateResult`, and `textResult.structuredData` resolves.

- [ ] **Step 4: Lint**

Run:

```bash
pnpm run lint
```

Expected: clean.

- [ ] **Step 5: Commit Task 6 + Task 7 together**

```bash
git add src/lib/types/generate.ts src/lib/neurolink.ts src/lib/core/modules/GenerationHandler.ts
git commit -m "feat(generation): thread structuredData through GenerateResult DTO"
```

---

## Task 8: Wire the new suite into package.json + full verification

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Add the test script**

In `package.json` `scripts`, add next to the other `test:*` entries:

```json
    "test:json": "npx tsx test/continuous-test-suite-json.ts",
```

- [ ] **Step 2: Run the JSON suite from the script**

Run:

```bash
pnpm run test:json
```

Expected: PASS — all tests across policy, extractor, and coercion.

- [ ] **Step 3: Full build (compiles src → dist that consumers import)**

Run:

```bash
pnpm run build
```

Expected: build succeeds (no TS errors).

- [ ] **Step 4: Quality gate**

Run:

```bash
pnpm run check && pnpm run lint
```

Expected: both clean.

- [ ] **Step 5: Run an existing structured/provider suite that exercises generate() (no regressions)**

Run (requires Vertex creds; skips gracefully without):

```bash
pnpm run test:providers-mocked
```

Expected: no new failures vs the pre-change baseline. (Mocked suite runs without live keys.)

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "test(json): wire continuous-test-suite-json into package scripts"
```

---

## Task 9 (optional, recommended): Live end-to-end confirmation against Vertex+Claude+tools

Only if Vertex credentials are available. Confirms the production path now emits valid JSON via `experimental_output` and exposes `structuredData`.

- [ ] **Step 1: One-off live probe**

Run:

```bash
npx tsx -e '
import { NeuroLink } from "./dist/index.js";
import { z } from "zod";
const nl = new NeuroLink();
const schema = z.object({ summary: z.string(), attachment: z.object({ extension: z.string(), content: z.string() }).nullable() });
const r = await nl.generate({
  input: { text: "Return a JSON object: summary plus an attachment whose content is a 5-line bash script that prints quotes and a Windows path C:\\\\Users\\\\me. Use extension sh." },
  provider: "vertex",
  model: "claude-sonnet-4-6",
  schema,
});
console.log("structuredData present:", r.structuredData !== undefined);
console.log("content parses:", (() => { try { JSON.parse(r.content); return true; } catch { return false; } })());
'
```

Expected: `structuredData present: true` and `content parses: true`. (Before the fix, with tools registered, this path produced raw text and could fail to parse.)

- [ ] **Step 2: No commit** — this is a manual verification only.

---

## Self-Review

**Spec coverage:**

- "Fix everything in neurolink, nothing in curator" → all tasks touch only `src/lib/**` and `test/**` in the neurolink repo. ✓
- "Apply jsonrepair in neurolink" → Task 5. ✓
- Root cause (Vertex+Claude wrongly excluded) → Tasks 2-3. ✓
- "Ensure JSON output is always valid" → experimental_output path (Tasks 3,6) for providers that support it; coercion fallback (Tasks 5-6) for the rest; extractor fix (Task 4) for the public util. ✓
- "Rebase if required" → Task 1. ✓
- Expose parsed object so consumers never re-parse → Tasks 6-7 (`structuredData`). ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; every command shows expected output. The only two "verify the real path" notes (logger import location in Task 5; `isGoogleProvider` possibly-unused in Task 3) are explicit grep/lint checks with defined fallbacks, not placeholders.

**Type consistency:** `coerceJsonToSchema(text, schema?) → { content, structuredData } | null` used identically in Task 5 (def) and Task 6 (call). `nextBalancedJsonSpan(text, fromIndex) → { span, end } | null` defined in Task 4, consumed in Tasks 4 and 5. `isToolsSchemaExclusionInForce(providerName, modelName, shouldUseTools, toolCount)` defined Task 2, used Task 3. `structuredData?: unknown` added to `GenerateResult` (Task 7) matches its assignment in `formatEnhancedResult` (Task 6) and the DTO builder (Task 7).

**Residual risks (documented, not gaps):**

- jsonrepair can semantically alter backslash-bearing content on the _text-mode_ path only (Gemini+tools / non-structured providers). The primary Vertex+Claude path bypasses it. A debug log fires when repair changes the input. Extension-scoped skipping can be added later if telemetry shows real corruption.
- finishReason=length truncation can still yield an incomplete attachment; coercion makes it _valid_ JSON but cannot restore missing bytes. Out of scope for "valid JSON" — handled separately by the caller's truncation notice.

```

```

---

## Phase 2 — Huge-text truncation (follow-up)

The Phase 1 residual risk ("finishReason=length can yield an incomplete
attachment") turned out to be the **dominant** real-world failure for large
TARA responses. Root-caused via a 6-probe workflow + live repro.

### Root cause

The native Claude paths hard-coded `max_tokens` to **4096**, bypassing
`getSafeMaxTokens` (which would return the 64K provider default):

- `googleVertex.ts` `executeNativeAnthropicStream` / `...Generate`: `options.maxTokens || 4096`
- `anthropic.ts`: `ANTHROPIC_DEFAULT_MAX_TOKENS = 4096`

Any structured response larger than ~16 KB was silently truncated mid-JSON.
On truncation the AI SDK skips `parseCompleteOutput` (it only runs on
`finishReason==="stop"`), so the path fell to text-mode coercion, which closed
the dangling JSON into a **valid-but-incomplete** object with **no signal** —
the Vertex native generate path didn't even surface `finishReason`.

### Fix (all in NeuroLink)

1. **Model-aware output ceiling** — `resolveClaudeMaxTokens(model, requested)` in
   `tokenLimits.ts`: defaults to the model's real max (Sonnet 4.x → 64K, Opus
   4.x → 32K, older models at their published limits), clamps over-large
   caller values (avoids 400s on the native paths). Used at both Vertex+Claude
   sites and both Anthropic native sites.
2. **Surface `finishReason`** on the Vertex native generate path (map Anthropic
   `stop_reason: "max_tokens"` → `"length"`); it previously hard-coded `"stop"`.
3. **Make truncation observable** — `coerceJsonToSchema` returns `{ repaired,
truncated }`; `GenerateResult`/`TextGenerationResult` expose `jsonRepaired`
   / `jsonTruncated`; `neurolink.ts` + `GenerationHandler.ts` set the flag when
   `finishReason==="length"` and emit a WARN. No more silent data loss.
4. **Anthropic non-streaming guard** — pass an explicit request `timeout` so the
   SDK's "streaming is required for long requests" pre-flight throw doesn't
   reject a large `max_tokens`; the abort signal stays the real duration bound.

### Verification

- Live matrix across Vertex (Claude Sonnet/Opus 4.6 + Gemini 2.5), direct
  Anthropic (Sonnet/Opus 4.6), Google AI Studio, OpenAI, and breadth providers:
  huge-output (260-line script, **no** `maxTokens`) returns **complete** valid
  JSON (20–24 KB) — the old 4096 cap truncated it.
- Dedicated tests on the production cell: "complete (no maxTokens)" and "forced
  truncation is observable" (`jsonTruncated=true, finishReason=length`).
- Unit suite covers the `repaired` / `truncated` flags deterministically.

### Out of scope (flagged, not fixed)

- **OpenAI per-model default** — `getSafeMaxTokens("openai")` returns the
  provider default (128K), which exceeds smaller models' completion limit (e.g.
  `gpt-4o-mini` = 16384) and 400s when a caller omits `maxTokens`. This is a
  pre-existing issue on a non-Claude path; a model-aware OpenAI ceiling is a
  separate follow-up.
- **Auto-continuation** of a truncated JSON generation (stitch partial + resume)
  was deliberately not implemented — fragile JSON-stitching that can produce
  wrong output is worse than a flagged, raised-ceiling truncation. Raising the
  ceiling to ~256 KB output + making any residual truncation observable is the
  robust, correct fix.
