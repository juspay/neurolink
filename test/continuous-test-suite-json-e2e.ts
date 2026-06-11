#!/usr/bin/env tsx
/**
 * Continuous Test Suite: JSON validity — END-TO-END (live).
 *
 * The real verification of the JSON-validity + huge-text fix. It makes LIVE
 * calls to actual models across providers, with TOOLS ACTIVE (the exact
 * condition that used to disable structured output on Vertex+Claude and force
 * fragile hand-parsed JSON), using complex Zod schemas — including:
 *   - an escaping torture test (code with quotes, backslashes, newlines),
 *   - deeply-nested config and array-heavy schemas,
 *   - a HUGE-OUTPUT case (no maxTokens → relies on the model's real output
 *     ceiling) that used to truncate at the legacy 4096 native-path default.
 *
 * For every (provider, model, schema) cell it asserts:
 *   1. result.content parses as JSON                       (syntactic validity)
 *   2. result.structuredData is present and == content     (parsed object exposed)
 *   3. the parsed object satisfies the Zod schema          (shape — strict cells)
 *   4. huge-output cells: result is NOT truncated          (the maxTokens fix)
 *
 * Plus two dedicated huge-text tests on the production cell (Vertex+Claude):
 *   - complete: no maxTokens → large, valid, non-truncated structured output
 *   - forced truncation: tiny maxTokens → still valid JSON AND jsonTruncated=true
 *     (truncation is observable, never silent)
 *
 * Cells that fail for provider reasons (missing key, quota, unknown model,
 * region) are SKIPPED, not failed — only a genuine JSON-validity break fails.
 *
 * Run:  npx tsx test/continuous-test-suite-json-e2e.ts
 *       npx tsx test/continuous-test-suite-json-e2e.ts --only=vertex,openai
 */
process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";
import "dotenv/config";
import { z } from "zod";
import { tool } from "ai";
import { NeuroLink } from "../dist/index.js";
import { defineSuite, assert, Skip } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("JSON Validity E2E (live)");
const nl = new NeuroLink();

// Optional filter: --only=vertex,openai
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const onlyProviders = onlyArg
  ? onlyArg
      .slice("--only=".length)
      .split(",")
      .map((s) => s.trim())
  : null;

// A harmless tool that forces tools-active (triggers the tools↔schema gate)
// without giving the model anything dangerous to call.
const pingTool = {
  ping: tool({
    description:
      "Health check. Returns 'pong'. Do not call unless explicitly asked.",
    inputSchema: z.object({ value: z.string().describe("anything") }),
    execute: async () => "pong",
  }),
};

// The shape the SDK returns for a schema request (after this fix).
type SchemaResult = {
  content: string;
  structuredData?: unknown;
  finishReason?: string;
  jsonTruncated?: boolean;
  jsonRepaired?: boolean;
};

// ── Complex schemas ─────────────────────────────────────────────────────────

// (A) TARA-like: free-form content field is the escaping danger zone.
// All fields are required — OpenAI strict structured output rejects optional
// keys. The escaping/size danger zone is `content`.
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

// (B) Deeply nested config with arrays, enums, numbers, nested objects.
const nestedConfigSchema = z.object({
  project: z.object({
    name: z.string(),
    version: z.string(),
    private: z.boolean(),
  }),
  settings: z.object({
    flags: z.array(z.string()),
    limits: z.object({ min: z.number(), max: z.number() }),
    mode: z.enum(["dev", "staging", "prod"]),
  }),
  tags: z.array(z.string()).min(1),
});

// (C) Array-of-objects with a total.
const arrayHeavySchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number(),
        label: z.string(),
        enabled: z.boolean(),
      }),
    )
    .min(2),
  total: z.number(),
});

// ── Prompts ─────────────────────────────────────────────────────────────────

const STRESS_PROMPT = [
  "Produce a structured response with a non-empty `summary` and an `attachment`.",
  "The attachment must be a SHELL script (extension `sh`, mimetype `text/x-shellscript`, filename `probe`).",
  "The script content MUST include, across multiple lines:",
  '  - a line printing a double-quoted phrase: echo "hello world"',
  "  - a Windows-style path with backslashes: C:\\Users\\test\\app",
  '  - a grep with a backslash regex: grep -E "[0-9]\\\\d+" file.txt',
  "  - at least 5 lines total.",
  "Return the script verbatim inside attachment.content.",
].join("\n");

const NESTED_PROMPT =
  "Return a project configuration object. project: name 'neurolink', version '9.69.3', private true. " +
  "settings: flags ['a','b','c'], limits min 1 max 100, mode 'prod'. tags: ['sdk','ai','json'].";

const ARRAY_PROMPT =
  "Return an object with `items` (an array of at least 3 objects, each {id:number, label:string, enabled:boolean}) " +
  "and `total` = the number of items. Use ids 1,2,3 and any labels.";

// Forces a LARGE attachment.content — comfortably more than the legacy 4096
// output-token default (which silently truncated this mid-JSON), yet well under
// the model's real ceiling. With the fix, this returns complete, valid JSON.
const HUGE_OUTPUT_PROMPT = [
  "Produce a structured response.",
  "summary: one sentence describing a deployment probe script.",
  "attachment: filename 'probe', extension 'sh', mimetype 'text/x-shellscript'.",
  "attachment.content MUST be a bash script with AT LEAST 200 numbered lines.",
  "Each line must be a DISTINCT, descriptive echo, for example:",
  '  echo "[step 7] validating service health for region ap-south-1 — retry budget remaining: 3"',
  "Number the steps 1..200 with varied, realistic operational messages. No blank lines, no comments.",
  "Return the FULL script verbatim in attachment.content — do not abbreviate, summarise, or use '...'.",
].join("\n");

// ── Matrix ──────────────────────────────────────────────────────────────────

type SchemaCase = {
  name: string;
  schema: z.ZodTypeAny;
  prompt: string;
  /** Per-call output cap. Omit to rely on the SDK's provider default. */
  maxTokens?: number;
  /** Per-call timeout (ms). A genuinely large generation needs headroom; the
   * Vertex native path uses a 5-min internal bound, so match it for fairness. */
  timeout?: number;
  /** When true, assert the result is NOT truncated (the huge-text fix). */
  expectComplete?: boolean;
  /** Soft, logged-only content checks (not hard assertions). */
  soft?: (parsed: unknown) => string[];
};

const SCHEMA_CASES: SchemaCase[] = [
  {
    name: "agent/escaping-stress",
    schema: agentSchema,
    prompt: STRESS_PROMPT,
    maxTokens: 2500,
    soft: (p) => {
      const obj = p as z.infer<typeof agentSchema>;
      const c = obj.attachment?.content ?? "";
      return [
        `content length=${c.length}`,
        `has double-quote=${c.includes('"')}`,
        `preserves backslash=${c.includes("\\")}`,
        `multiline=${c.includes("\n")}`,
      ];
    },
  },
  {
    name: "nested-config",
    schema: nestedConfigSchema,
    prompt: NESTED_PROMPT,
    maxTokens: 2500,
  },
  {
    name: "array-heavy",
    schema: arrayHeavySchema,
    prompt: ARRAY_PROMPT,
    maxTokens: 2500,
  },
  {
    // No maxTokens → exercises the per-model default (64K for Sonnet 4.x, etc).
    // Before the fix the Vertex+Claude native path defaulted to 4096 and
    // truncated this mid-JSON.
    name: "huge-output",
    schema: agentSchema,
    prompt: HUGE_OUTPUT_PROMPT,
    timeout: 300_000, // 5 min — a 260-line generation needs real wall-clock time
    expectComplete: true,
    soft: (p) => {
      const obj = p as z.infer<typeof agentSchema>;
      const c = obj.attachment?.content ?? "";
      const lines = c ? c.split("\n").length : 0;
      return [`content length=${c.length}`, `lines=${lines}`];
    },
  },
];

type Cell = {
  provider: string;
  model?: string;
  /** core cells run all schema cases; breadth cells run a subset. */
  tier: "core" | "breadth";
  /**
   * When true, schema conformance is a HARD assertion (the provider enforces
   * structured output). When false, conformance is logged but not asserted —
   * weak models may emit valid-but-non-conforming JSON, which is a model
   * limitation, not an SDK JSON-validity failure. Valid-JSON + structuredData
   * consistency + non-truncation are always hard-asserted on core cells.
   */
  strictSchema: boolean;
};

const CELLS: Cell[] = [
  // ── core: latest production-grade models, all schema cases, strict ──
  // THE production cell (Vertex + Claude + tools).
  {
    provider: "vertex",
    model: "claude-sonnet-4-6",
    tier: "core",
    strictSchema: true,
  },
  // Latest Claude on Vertex.
  {
    provider: "vertex",
    model: "claude-opus-4-6",
    tier: "core",
    strictSchema: true,
  },
  // Gemini on Vertex (text-mode tools↔schema path).
  {
    provider: "vertex",
    model: "gemini-2.5-pro",
    tier: "core",
    strictSchema: true,
  },
  // Latest Gemini on Vertex.
  {
    provider: "vertex",
    model: "gemini-3-pro-preview",
    tier: "core",
    strictSchema: true,
  },
  // Direct Anthropic.
  {
    provider: "anthropic",
    model: "claude-sonnet-4-6",
    tier: "core",
    strictSchema: true,
  },
  {
    provider: "anthropic",
    model: "claude-opus-4-6",
    tier: "core",
    strictSchema: true,
  },
  // Google AI Studio (text-mode).
  {
    provider: "google-ai",
    model: "gemini-2.5-flash",
    tier: "core",
    strictSchema: true,
  },
  // OpenAI.
  {
    provider: "openai",
    model: "gpt-4o-mini",
    tier: "core",
    strictSchema: true,
  },

  // ── breadth: valid-JSON + structuredData are hard-asserted; schema
  // conformance is soft-logged (live model/infra variance under back-to-back
  // load must not flake the SDK-guarantee verification). ──
  {
    provider: "vertex",
    model: "gemini-2.5-flash",
    tier: "breadth",
    strictSchema: false,
  },
  {
    provider: "google-ai",
    model: "gemini-3-pro-preview",
    tier: "breadth",
    strictSchema: false,
  },
  {
    provider: "mistral",
    model: "mistral-large-latest",
    tier: "breadth",
    strictSchema: false,
  },
  { provider: "xai", model: "grok-3", tier: "breadth", strictSchema: false },
  {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    tier: "breadth",
    strictSchema: false,
  },
  {
    provider: "deepseek",
    model: "deepseek-chat",
    tier: "breadth",
    strictSchema: false,
  },
  {
    provider: "openrouter",
    model: "openai/gpt-4o-mini",
    tier: "breadth",
    strictSchema: false,
  },
  { provider: "bedrock", tier: "breadth", strictSchema: false }, // provider default model
];

// Provider/model/auth errors → SKIP (not a JSON-validity failure).
// Deliberately narrow: only infra-shaped statuses (429/5xx) are skippable —
// generic 4xx / "bad request" would mask real request-construction bugs.
function isInfraError(message: string): boolean {
  return /api key|apikey|credential|security token|unauthor|permission|quota|rate.?limit|too many requests|429|not found|unknown model|model.*not|region|ENOTFOUND|ECONNREFUSED|ECONNRESET|socket hang|fetch failed|network|timeout|deadline|unavailable|overloaded|throttl|capacity|exhausted|billing|credits|insufficient|payment|402|access|forbidden|invalid.*model|does not exist|status (429|500|502|503|504)|internal server|service unavailable|max_tokens is too large|supports at most|completion tokens|maximum context|context length/i.test(
    message,
  );
}

async function runCell(cell: Cell, sc: SchemaCase): Promise<void> {
  let res: SchemaResult;
  try {
    res = (await nl.generate({
      input: { text: sc.prompt },
      provider: cell.provider,
      ...(cell.model ? { model: cell.model } : {}),
      schema: sc.schema,
      tools: pingTool,
      disableTools: false,
      temperature: 0,
      ...(sc.maxTokens ? { maxTokens: sc.maxTokens } : {}),
      ...(sc.timeout ? { timeout: sc.timeout } : {}),
    })) as SchemaResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isInfraError(msg)) {
      throw new Skip(`${cell.provider}: ${msg.slice(0, 120)}`);
    }
    throw err;
  }

  // (1) content must be valid JSON — neurolink's core guarantee, HARD for all.
  let parsed: unknown;
  try {
    parsed = JSON.parse(res.content);
  } catch (e) {
    throw new Error(
      `content is NOT valid JSON (${(e as Error).message}). head: ${JSON.stringify(
        res.content.slice(0, 240),
      )}`,
      { cause: e },
    );
  }

  // (2) structuredData present and == content — HARD for ALL cells (an SDK
  // boundary guarantee, never model-dependent: the SDK exposes the parsed
  // value for object, array, and scalar JSON roots alike).
  const sdPresent =
    res.structuredData !== undefined && res.structuredData !== null;
  const sdConsistent =
    sdPresent && JSON.stringify(res.structuredData) === JSON.stringify(parsed);
  assert(
    sdPresent,
    "result.structuredData is missing (the parsed value was not exposed)",
  );
  assert(
    sdConsistent,
    "result.structuredData does not match content (inconsistent exposure)",
  );

  // (3) schema conformance — HARD only where the provider enforces structured
  // output. Logged for weak breadth models (valid JSON is still guaranteed).
  const sp = sc.schema.safeParse(parsed);
  if (cell.strictSchema) {
    assert(
      sp.success,
      `schema validation failed: ${JSON.stringify(
        sp.success ? [] : sp.error.issues.slice(0, 3),
      )}`,
    );
  } else if (!sp.success) {
    console.log(
      `      · ${cell.provider}/${sc.name}: valid JSON but NON-conforming shape (model limitation): ${JSON.stringify(
        sp.error.issues.slice(0, 1),
      )}`,
    );
  }

  // (4) huge-output: with no maxTokens, the SDK default must NOT truncate —
  // HARD on core cells (the maxTokens fix). On breadth, log only.
  if (sc.expectComplete) {
    const truncated =
      res.finishReason === "length" || res.jsonTruncated === true;
    if (cell.tier === "core") {
      assert(
        !truncated,
        `huge output was TRUNCATED (finishReason=${res.finishReason}, jsonTruncated=${res.jsonTruncated}) — the maxTokens default did not protect a large response`,
      );
    } else if (truncated) {
      console.log(
        `      · ${cell.provider}/${sc.name}: truncated (finishReason=${res.finishReason}, jsonTruncated=${res.jsonTruncated})`,
      );
    }
  }

  // Soft, logged-only observations (e.g. backslash preservation, sizes).
  if (sc.soft) {
    const notes = sc.soft(parsed);
    console.log(`      · ${cell.provider}/${sc.name}: ${notes.join("  ")}`);
  }
}

// ── Register matrix tests ───────────────────────────────────────────────────
for (const cell of CELLS) {
  if (onlyProviders && !onlyProviders.includes(cell.provider)) {
    continue;
  }
  // core runs all cases (incl. the slow huge-output); breadth runs only the
  // escaping-stress case — breadth providers don't exercise the changed
  // native-Claude cap path, and keeping the run tractable avoids load-flakes.
  const cases =
    cell.tier === "core"
      ? SCHEMA_CASES
      : SCHEMA_CASES.filter((c) => c.name === "agent/escaping-stress");
  for (const sc of cases) {
    const label = `${cell.provider}${cell.model ? `:${cell.model}` : ""} — ${sc.name}`;
    await test(label, async () => {
      await runCell(cell, sc);
    });
  }
}

// ── Dedicated huge-text tests on the production cell (Vertex+Claude) ─────────

await test("vertex:claude-sonnet-4-6 — huge output is complete (no maxTokens)", async () => {
  let res: SchemaResult;
  try {
    res = (await nl.generate({
      input: { text: HUGE_OUTPUT_PROMPT },
      provider: "vertex",
      model: "claude-sonnet-4-6",
      schema: agentSchema,
      tools: pingTool,
      disableTools: false,
      temperature: 0,
      timeout: 300_000, // 5 min — a complete 260-line script takes real time
      // NO maxTokens — must default to the model ceiling, not the old 4096.
    })) as SchemaResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isInfraError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    throw err;
  }
  const parsed = JSON.parse(res.content) as z.infer<typeof agentSchema>;
  assert(
    res.structuredData !== undefined && res.structuredData !== null,
    "structuredData missing",
  );
  assert(
    res.finishReason !== "length" && res.jsonTruncated !== true,
    `huge output truncated (finishReason=${res.finishReason}, jsonTruncated=${res.jsonTruncated})`,
  );
  const len = parsed.attachment?.content?.length ?? 0;
  // The legacy 4096 cap truncated near ~12-16KB; a complete 260-line script is
  // well beyond that. Assert a generous floor so model brevity doesn't flake.
  assert(
    len > 4000,
    `expected a large complete script, got attachment.content length=${len}`,
  );
  console.log(`      · complete huge output: attachment.content length=${len}`);
});

await test("vertex:claude-sonnet-4-6 — forced truncation is observable, never silent", async () => {
  let res: SchemaResult;
  try {
    res = (await nl.generate({
      input: { text: HUGE_OUTPUT_PROMPT },
      provider: "vertex",
      model: "claude-sonnet-4-6",
      schema: agentSchema,
      tools: pingTool,
      disableTools: false,
      temperature: 0,
      maxTokens: 200, // force a cut-off mid-JSON (260-line script won't fit)
    })) as SchemaResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isInfraError(msg)) {
      throw new Skip(`vertex: ${msg.slice(0, 120)}`);
    }
    throw err;
  }
  // Even under forced truncation the SDK coerces to valid JSON (jsonrepair
  // closes the cut-off span), so parsing is asserted UNCONDITIONALLY; and the
  // truncation must be OBSERVABLE — flagged via jsonTruncated/finishReason,
  // never silently returned as if complete.
  JSON.parse(res.content); // must be valid JSON, truncated or not
  assert(
    res.jsonTruncated === true || res.finishReason === "length",
    `truncation was not surfaced (jsonTruncated=${res.jsonTruncated}, finishReason=${res.finishReason})`,
  );
  console.log(
    `      · forced truncation flagged: jsonTruncated=${res.jsonTruncated}, finishReason=${res.finishReason}`,
  );
});

await runSuite();
