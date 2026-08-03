#!/usr/bin/env tsx

/**
 * Continuous Test Suite — websearchGrounding (@google/genai)
 *
 * Characterizes the pure pieces of the agent's websearchGrounding tool after
 * its migration off @google-cloud/vertexai:
 *
 *  - Location resolution. NEUROLINK_WEBSEARCH_LOCATION, else `global` — and
 *    explicitly NOT the provider's GOOGLE_VERTEX_LOCATION. The search models
 *    are served only from the global/us/eu endpoints, so inheriting a region
 *    such as us-east5 (a Claude-on-Vertex region) made every query fail with
 *    NOT_FOUND for the model.
 *  - Request shape. Grounding is requested natively via
 *    `config.tools = [{ googleSearch: {} }]`, not the Object.defineProperty
 *    workaround the old SDK's types forced.
 *  - Response handling. Grounding chunks map onto search results, blank
 *    `domain` values fall back to the uri hostname, and an unparseable uri
 *    yields "unknown" rather than throwing and discarding the whole search.
 *
 * Migrated from test/websearchGrounding.test.ts — see CLAUDE.md: suites run
 * via tsx, not a Vitest runner. The Vitest version stubbed the @google/genai
 * module to drive execute() end to end; without a module-mocking runner the
 * SDK-facing paths are covered by testing the exported helpers the tool is
 * built from, matching continuous-test-suite-google-native.ts. Two behaviours
 * consequently lose direct coverage and are called out here rather than left
 * to look tested: the withTimeout wrapper around generateContent, and the
 * `result.text` / empty-candidates guards inside execute().
 *
 * Run with: npx tsx test/continuous-test-suite-websearch-grounding.ts
 */

import {
  buildWebsearchRequest,
  buildWebsearchResults,
  directAgentTools,
  resolveGroundingDomain,
  resolveWebsearchLocation,
  resolveWebsearchModel,
} from "../src/lib/agent/directTools.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("websearchGrounding (@google/genai)");

/** Structural comparison — the harness's assertEqual is strict `!==`. */
const assertDeepEqual = (
  actual: unknown,
  expected: unknown,
  msg: string,
): void => assertEqual(JSON.stringify(actual), JSON.stringify(expected), msg);

/** Env keys the tool reads, restored after every mutation. */
const ENV_KEYS = [
  "GOOGLE_APPLICATION_CREDENTIALS",
  "GOOGLE_VERTEX_PROJECT",
  "GOOGLE_VERTEX_LOCATION",
  "NEUROLINK_WEBSEARCH_LOCATION",
  "NEUROLINK_WEBSEARCH_MODEL",
] as const;

/**
 * Run `fn` with the given env, restoring every key afterwards even if an
 * assertion throws — otherwise one failure silently corrupts later tests.
 */
function withEnv<T>(env: Partial<Record<string, string>>, fn: () => T): T {
  const saved = new Map<string, string | undefined>();
  for (const key of ENV_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(env)) {
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

// ============================================================================
// A. Location precedence
// ============================================================================

await test("location: NEUROLINK_WEBSEARCH_LOCATION is honoured", () => {
  const location = withEnv(
    { NEUROLINK_WEBSEARCH_LOCATION: "eu" },
    resolveWebsearchLocation,
  );
  assertEqual(location, "eu", "explicit override must be used verbatim");
});

await test("location: defaults to global when the override is unset", () => {
  assertEqual(
    withEnv({}, resolveWebsearchLocation),
    "global",
    "search models are not served from single regions",
  );
});

await test("location: does NOT inherit a regional GOOGLE_VERTEX_LOCATION", () => {
  // Regression: inheriting us-east5 (the Claude-on-Vertex region) sent every
  // web search to an endpoint that does not carry the search model, and the
  // tool failed with NOT_FOUND on every query.
  const location = withEnv(
    { GOOGLE_VERTEX_LOCATION: "us-east5" },
    resolveWebsearchLocation,
  );
  assertEqual(location, "global", "provider region must not leak into search");
});

await test("location: a whitespace-only override counts as unset", () => {
  const location = withEnv(
    { NEUROLINK_WEBSEARCH_LOCATION: "   " },
    resolveWebsearchLocation,
  );
  assertEqual(location, "global", "blank override must fall back");
});

// ============================================================================
// B. Model resolution
// ============================================================================

await test("model: defaults to gemini-3.1-flash-lite", () => {
  assertEqual(
    withEnv({}, resolveWebsearchModel),
    "gemini-3.1-flash-lite",
    "default model changed without updating .env.example",
  );
});

await test("model: NEUROLINK_WEBSEARCH_MODEL overrides the default", () => {
  const model = withEnv(
    { NEUROLINK_WEBSEARCH_MODEL: "gemini-2.5-flash-lite" },
    resolveWebsearchModel,
  );
  assertEqual(model, "gemini-2.5-flash-lite", "override must be honoured");
});

await test("model: a whitespace-only override counts as unset", () => {
  const model = withEnv(
    { NEUROLINK_WEBSEARCH_MODEL: "  " },
    resolveWebsearchModel,
  );
  assertEqual(model, "gemini-3.1-flash-lite", "blank override must not win");
});

// ============================================================================
// C. Request shape
// ============================================================================

await test("request: asks for Google Search grounding through config.tools", () => {
  const request = buildWebsearchRequest("some-model", "who won", 50);
  assertDeepEqual(
    request.config,
    { tools: [{ googleSearch: {} }] },
    "grounding must be requested natively, not via a defineProperty shim",
  );
});

await test("request: carries the model and a single user turn", () => {
  const request = buildWebsearchRequest("some-model", "who won", 50);
  assertEqual(request.model, "some-model", "model must be passed through");
  assertEqual(request.contents.length, 1, "expected exactly one turn");
  assertEqual(request.contents[0].role, "user", "turn must be a user turn");
});

await test("request: embeds the query and the word budget in the prompt", () => {
  const text = buildWebsearchRequest("m", "who won the cup", 25).contents[0]
    .parts[0].text;
  assert(text.includes("who won the cup"), "prompt must carry the query");
  assert(text.includes("25 words"), "prompt must carry the word budget");
});

// ============================================================================
// D. Grounding domain extraction
// ============================================================================

await test("domain: prefers chunk.web.domain over the uri hostname", () => {
  const domain = resolveGroundingDomain({
    uri: "https://cdn.example.com/a/b",
    domain: "example.com",
  });
  assertEqual(domain, "example.com", "metadata domain must win");
});

await test("domain: falls back to the uri hostname when domain is absent", () => {
  const domain = resolveGroundingDomain({ uri: "https://a.example.com/x" });
  assertEqual(domain, "a.example.com", "must parse the hostname");
});

await test("domain: treats an empty or blank domain as absent", () => {
  assertEqual(
    resolveGroundingDomain({ uri: "https://b.example.com/x", domain: "" }),
    "b.example.com",
    "empty domain must fall through",
  );
  assertEqual(
    resolveGroundingDomain({ uri: "https://c.example.com/x", domain: "   " }),
    "c.example.com",
    "blank domain must fall through",
  );
});

await test("domain: returns unknown when neither domain nor uri is usable", () => {
  assertEqual(resolveGroundingDomain({}), "unknown", "expected the sentinel");
});

await test("domain: a malformed uri yields unknown instead of throwing", () => {
  // Regression: an unguarded new URL() threw here, and the tool's outer catch
  // turned that into a failed search that discarded every valid result too.
  assertEqual(
    resolveGroundingDomain({ uri: "not a url" }),
    "unknown",
    "malformed uri must not throw",
  );
});

// ============================================================================
// E. Result assembly
// ============================================================================

const chunks = (uris: string[]) => ({
  groundingChunks: uris.map((uri) => ({ web: { uri } })),
});

await test("results: maps grounding chunks onto search results", () => {
  const results = buildWebsearchResults(
    { groundingChunks: [{ web: { uri: "https://a.example.com/x" } }] },
    "a summary",
    3,
  );
  assertEqual(results.length, 1, "expected one result");
  assertEqual(results[0].url, "https://a.example.com/x", "url must carry over");
  assertEqual(results[0].snippet, "a summary", "snippet must be the summary");
  assertEqual(results[0].domain, "a.example.com", "domain must be derived");
});

await test("results: defaults a missing title", () => {
  const results = buildWebsearchResults(
    { groundingChunks: [{ web: { uri: "https://a.example.com/x" } }] },
    "a summary",
    3,
  );
  assertEqual(results[0].title, "No title", "expected the title sentinel");
});

await test("results: caps at the requested limit", () => {
  const many = chunks(
    Array.from({ length: 10 }, (_, i) => `https://site${i}.example.com/x`),
  );
  assertEqual(
    buildWebsearchResults(many, "s", 2).length,
    2,
    "must respect the cap",
  );
});

await test("results: a malformed uri does not discard its siblings", () => {
  const results = buildWebsearchResults(
    chunks(["not a url", "https://ok.example.com/x"]),
    "a summary",
    5,
  );
  assertDeepEqual(
    results.map((r) => r.domain),
    ["unknown", "ok.example.com"],
    "both chunks must survive",
  );
});

await test("results: skips chunks that carry no web member", () => {
  const results = buildWebsearchResults(
    { groundingChunks: [{}, { web: { uri: "https://a.example.com/x" } }] },
    "a summary",
    5,
  );
  assertEqual(results.length, 1, "non-web chunks must be skipped");
});

await test("results: returns empty for absent grounding metadata", () => {
  assertEqual(
    buildWebsearchResults(undefined, "a summary", 3).length,
    0,
    "caller synthesises a result from an empty list",
  );
  assertEqual(
    buildWebsearchResults({}, "a summary", 3).length,
    0,
    "metadata without chunks must also be empty",
  );
});

// ============================================================================
// F. Credentials guard (execute(), no SDK contact)
// ============================================================================

await test("credentials: missing project id returns the failure shape", async () => {
  const websearch = directAgentTools.websearchGrounding as unknown as {
    execute: (args: { query: string }) => Promise<Record<string, unknown>>;
  };

  const result = await withEnv(
    { GOOGLE_APPLICATION_CREDENTIALS: "/tmp/fake-creds.json" },
    () => websearch.execute({ query: "anything" }),
  );

  assertEqual(result.success, false, "must not report success");
  assertDeepEqual(
    result.requiredEnvVars,
    ["GOOGLE_APPLICATION_CREDENTIALS", "GOOGLE_VERTEX_PROJECT"],
    "must name both required variables",
  );
});

await runSuite();
