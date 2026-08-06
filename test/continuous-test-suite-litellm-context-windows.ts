#!/usr/bin/env tsx

/**
 * Continuous Test Suite — LiteLLM Runtime Context-Window Discovery
 *
 * Covers the runtime override registry in constants/contextWindows.ts and the
 * LiteLLM provider's fire-and-forget `/model/info` discovery that populates it,
 * so budgets use each model group's real `max_input_tokens` rather than the
 * one-size litellm `_default`.
 *
 * Migrated from test/litellmContextWindows.test.ts — see CLAUDE.md: suites run
 * via tsx, not a Vitest runner. That file had been dead since the provider
 * modularization turned `providers/litellm.ts` into a directory: its import of
 * `providers/litellm.js` no longer resolved (ESM has no directory-index
 * fallback), so the whole file failed to load and every test in it silently
 * stopped running. The import now points at `providers/litellm/index.js`.
 *
 * Run with: npx tsx test/continuous-test-suite-litellm-context-windows.ts
 */

import {
  getContextWindowSize,
  getAvailableInputTokens,
  getRuntimeOutputCeiling,
  registerRuntimeContextWindow,
  clearRuntimeContextWindows,
  clearRuntimeOutputCeilings,
} from "../src/lib/constants/contextWindows.js";
import {
  LiteLLMProvider,
  ensureLiteLLMModelLimits,
  clearLiteLLMModelLimitsCache,
} from "../src/lib/providers/litellm/index.js";
import { getSafeMaxTokens } from "../src/lib/utils/tokenLimits.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { spy, stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("LiteLLM Runtime Context Windows");

/** The static litellm `_default` every unregistered model falls back to. */
const STATIC_DEFAULT = 128_000;

/** Wait until the fire-and-forget discovery promise chain has settled. */
const flushAsync = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 0));

const modelInfoResponse = (
  entries: Array<{
    model_name?: string;
    max_input_tokens?: unknown;
    max_output_tokens?: unknown;
  }>,
): Response =>
  new Response(
    JSON.stringify({
      data: entries.map((e) => ({
        model_name: e.model_name,
        model_info: {
          max_input_tokens: e.max_input_tokens,
          ...(e.max_output_tokens !== undefined
            ? { max_output_tokens: e.max_output_tokens }
            : {}),
        },
      })),
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

/** Reset every piece of module-level state these tests touch. */
function resetRegistries(): void {
  clearLiteLLMModelLimitsCache();
  clearRuntimeContextWindows();
  clearRuntimeOutputCeilings();
}

/**
 * Run `body` with globalThis.fetch replaced, restoring it unconditionally.
 *
 * Discovery is fire-and-forget, so a leaked fetch stub would surface as a
 * baffling failure in whatever test happened to run next.
 */
function withFetch<T>(
  impl: (input: RequestInfo | URL) => Promise<Response>,
  body: (calls: string[]) => Promise<T>,
): Promise<T> {
  const calls: string[] = [];
  const s = stub(globalThis, "fetch", async (input: RequestInfo | URL) => {
    calls.push(typeof input === "string" ? input : String(input));
    return impl(input);
  });
  return withStubs([s], () => body(calls));
}

// Each test uses a unique baseURL so the per-URL discovery dedupe never
// suppresses a later test's discovery.
let baseUrlCounter = 0;
const uniqueBaseURL = (): string =>
  `http://litellm-test-${++baseUrlCounter}.local:4000`;

// ---------------------------------------------------------------------------
// Part 1 — the runtime registry itself
// ---------------------------------------------------------------------------

await test("falls back to the static litellm _default when nothing is registered", () => {
  clearRuntimeContextWindows();
  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    STATIC_DEFAULT,
    "an unregistered model must use the static default",
  );
});

// The alias map pointed at `google-ai-studio`, which this table has never held,
// so all of these fell through to DEFAULT_CONTEXT_WINDOW — an ~8x understatement
// that made the AI Studio loop guard reclaim tool history that still fitted.
// `google-ai` resolved only by raw-provider fallback.
//
// One test per spelling: the failing alias belongs in the test NAME, not in an
// assertion message, where `isExpectedProviderError()` could downgrade it to ⊘.
for (const spelling of [
  "googleAiStudio",
  "google-ai-studio",
  "google-ai",
  "googleai",
]) {
  await test(`AI Studio spelling "${spelling}" resolves to the real Gemini window`, () => {
    clearRuntimeContextWindows();
    assertEqual(
      getContextWindowSize(spelling, "gemini-2.5-pro"),
      1_048_576,
      "the provider alias did not reach the google-ai table",
    );
  });
}

await test("a per-model AI Studio window survives alias normalization", () => {
  clearRuntimeContextWindows();
  // Not merely "bigger than the default": a real per-model entry must win.
  assertEqual(
    getContextWindowSize("googleAiStudio", "gemini-2.5-flash-image"),
    32_768,
    "a small per-model window must survive alias normalization",
  );
});

await test("prefers a runtime-registered window over the static default", () => {
  clearRuntimeContextWindows();
  registerRuntimeContextWindow("litellm", "glm-private", 262_144);
  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    262_144,
    "the discovered window must win",
  );
  assertEqual(
    getContextWindowSize("litellm", "other-model"),
    STATIC_DEFAULT,
    "registering one model must not affect its siblings",
  );
  clearRuntimeContextWindows();
});

await test("feeds discovered windows into available-input budgeting", () => {
  clearRuntimeContextWindows();
  registerRuntimeContextWindow("litellm", "glm-private", 262_144);
  assertEqual(
    getAvailableInputTokens("litellm", "glm-private", 16_000),
    262_144 - 16_000,
    "the budget must be computed from the discovered window",
  );
  clearRuntimeContextWindows();
});

await test("ignores non-positive and non-finite windows", () => {
  clearRuntimeContextWindows();
  registerRuntimeContextWindow("litellm", "glm-private", 0);
  registerRuntimeContextWindow("litellm", "glm-private", -5);
  registerRuntimeContextWindow("litellm", "glm-private", Number.NaN);
  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    STATIC_DEFAULT,
    "garbage must never displace the static default",
  );
  clearRuntimeContextWindows();
});

await test("lets a later registration refresh an earlier one", () => {
  clearRuntimeContextWindows();
  registerRuntimeContextWindow("litellm", "glm-private", 100_000);
  registerRuntimeContextWindow("litellm", "glm-private", 262_144);
  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    262_144,
    "the most recent registration must win",
  );
  clearRuntimeContextWindows();
});

// ---------------------------------------------------------------------------
// Part 2 — /model/info discovery
// ---------------------------------------------------------------------------

await test("registers max_input_tokens per model group from /model/info", async () => {
  resetRegistries();
  const calls = await withFetch(
    async () =>
      modelInfoResponse([
        { model_name: "glm-private", max_input_tokens: 262_144 },
        { model_name: "private-large", max_input_tokens: 1_000_000 },
      ]),
    async (calls) => {
      new LiteLLMProvider("glm-private", undefined, undefined, {
        apiKey: "k",
        baseURL: uniqueBaseURL(),
      });
      await flushAsync();
      return calls;
    },
  );

  assertEqual(calls.length, 1, "discovery must issue exactly one request");
  assert(
    calls[0].endsWith("/model/info"),
    `discovery must hit /model/info, got ${calls[0]}`,
  );
  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    262_144,
    "the model's own window must be registered",
  );
  assertEqual(
    getContextWindowSize("litellm", "private-large"),
    1_000_000,
    "every advertised model group must be registered, not just the constructed one",
  );
  resetRegistries();
});

// Both orderings matter. Advertising the smaller deployment LAST is satisfied
// by plain last-write-wins, so on its own it cannot tell a min-merge from an
// overwrite — replacing Math.min with "take the second" keeps that case green.
// The descending case is the one that actually pins the behaviour.
for (const [label, windows] of [
  ["smaller last", [262_144, 131_072]],
  ["smaller FIRST", [131_072, 262_144]],
] as const) {
  await test(`keeps the SMALLEST advertised window across deployments (${label})`, async () => {
    resetRegistries();
    await withFetch(
      async () =>
        modelInfoResponse(
          windows.map((w) => ({
            model_name: "glm-private",
            max_input_tokens: w,
          })),
        ),
      async () => {
        new LiteLLMProvider("glm-private", undefined, undefined, {
          apiKey: "k",
          baseURL: uniqueBaseURL(),
        });
        await flushAsync();
      },
    );

    assertEqual(
      getContextWindowSize("litellm", "glm-private"),
      131_072,
      `budgets must be safe for the smallest deployment regardless of order (${label})`,
    );
    resetRegistries();
  });
}

await test("skips malformed entries and keeps the valid ones", async () => {
  resetRegistries();
  await withFetch(
    async () =>
      modelInfoResponse([
        { model_name: "glm-private", max_input_tokens: 262_144 },
        { model_name: "bad-model", max_input_tokens: "not-a-number" },
        { model_name: "", max_input_tokens: 9000 },
        { max_input_tokens: 9000 },
      ]),
    async () => {
      new LiteLLMProvider("glm-private", undefined, undefined, {
        apiKey: "k",
        baseURL: uniqueBaseURL(),
      });
      await flushAsync();
    },
  );

  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    262_144,
    "a valid entry must survive alongside malformed ones",
  );
  assertEqual(
    getContextWindowSize("litellm", "bad-model"),
    STATIC_DEFAULT,
    "a non-numeric window must be rejected, not coerced",
  );
  resetRegistries();
});

await test("degrades cleanly to the static default when /model/info fails", async () => {
  resetRegistries();
  await withFetch(
    async () => new Response("nope", { status: 404 }),
    async () => {
      new LiteLLMProvider("glm-private", undefined, undefined, {
        apiKey: "k",
        baseURL: uniqueBaseURL(),
      });
      await flushAsync();
    },
  );

  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    STATIC_DEFAULT,
    "a failed discovery must leave the static default in place",
  );
  resetRegistries();
});

await test("dedupes discovery per base URL within the cache period", async () => {
  resetRegistries();
  const baseURL = uniqueBaseURL();
  const calls = await withFetch(
    async () =>
      modelInfoResponse([
        { model_name: "glm-private", max_input_tokens: 262_144 },
      ]),
    async (calls) => {
      new LiteLLMProvider("glm-private", undefined, undefined, {
        apiKey: "k",
        baseURL,
      });
      new LiteLLMProvider("private-large", undefined, undefined, {
        apiKey: "k",
        baseURL,
      });
      await flushAsync();
      return calls;
    },
  );

  assertEqual(
    calls.length,
    1,
    "two providers on one proxy must share a single discovery request",
  );
  resetRegistries();
});

await test("is awaitable: limits are registered once ensureLiteLLMModelLimits resolves", async () => {
  resetRegistries();
  await withFetch(
    async () =>
      modelInfoResponse([
        {
          model_name: "glm-private",
          max_input_tokens: 262_144,
          max_output_tokens: 31_000,
        },
      ]),
    async () => {
      // No provider constructed and no flushAsync — the await IS the guarantee
      // the generation pipelines rely on before running budget math.
      await ensureLiteLLMModelLimits(uniqueBaseURL(), "k");
    },
  );

  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    262_144,
    "the window must be live the moment the promise resolves",
  );
  assertEqual(
    getRuntimeOutputCeiling("litellm", "glm-private"),
    31_000,
    "the output ceiling must be live too",
  );
  resetRegistries();
});

await test("registers max_output_tokens as the ceiling getSafeMaxTokens consumes", async () => {
  resetRegistries();
  await withFetch(
    async () =>
      modelInfoResponse([
        {
          model_name: "glm-private",
          max_input_tokens: 262_144,
          max_output_tokens: 31_000,
        },
        // Ceiling-only entries register too; the window stays at the default.
        { model_name: "out-only", max_output_tokens: 9_000 },
      ]),
    async () => {
      await ensureLiteLLMModelLimits(uniqueBaseURL(), "k");
    },
  );

  assertEqual(
    getSafeMaxTokens("litellm", "glm-private", 32_000),
    31_000,
    "an over-ceiling request must clamp to the proxy's advertised cap",
  );
  assertEqual(
    getSafeMaxTokens("litellm", "glm-private"),
    31_000,
    "a caller that names no limit must default to the ceiling, not the 128k blanket",
  );
  assertEqual(
    getSafeMaxTokens("litellm", "glm-private", 8_000),
    8_000,
    "a within-ceiling request must pass through untouched",
  );
  assertEqual(
    getRuntimeOutputCeiling("litellm", "out-only"),
    9_000,
    "a ceiling-only entry must still register its ceiling",
  );
  assertEqual(
    getContextWindowSize("litellm", "out-only"),
    STATIC_DEFAULT,
    "a ceiling-only entry must leave the window at the default",
  );
  resetRegistries();
});

// Same reasoning as the window case above: order the ceilings both ways so the
// assertion distinguishes a real min-merge from last-write-wins.
for (const [label, ceilings] of [
  ["smaller last", [31_000, 16_000]],
  ["smaller FIRST", [16_000, 31_000]],
] as const) {
  await test(`keeps the SMALLEST advertised output ceiling across deployments (${label})`, async () => {
    resetRegistries();
    await withFetch(
      async () =>
        modelInfoResponse(
          ceilings.map((c) => ({
            model_name: "glm-private",
            max_input_tokens: 262_144,
            max_output_tokens: c,
          })),
        ),
      async () => {
        await ensureLiteLLMModelLimits(uniqueBaseURL(), "k");
      },
    );

    assertEqual(
      getRuntimeOutputCeiling("litellm", "glm-private"),
      16_000,
      `the ceiling must be safe for the smallest deployment regardless of order (${label})`,
    );
    resetRegistries();
  });
}

await test("min-merges limits across base URLs that share a model-group name", async () => {
  resetRegistries();
  await withFetch(
    async (input) => {
      const url = typeof input === "string" ? input : String(input);
      return url.includes("proxy-a")
        ? modelInfoResponse([
            {
              model_name: "glm-private",
              max_input_tokens: 262_144,
              max_output_tokens: 31_000,
            },
          ])
        : modelInfoResponse([
            {
              model_name: "glm-private",
              max_input_tokens: 131_072,
              max_output_tokens: 16_000,
            },
          ]);
    },
    async () => {
      await ensureLiteLLMModelLimits("http://proxy-a.local:4000", "k");
      assertEqual(
        getContextWindowSize("litellm", "glm-private"),
        262_144,
        "the first proxy's window must register",
      );

      // A second deployment advertising a smaller window must neither be
      // silently overwritten by the first nor overwrite it — the registry keeps
      // the MIN so budgets stay safe for every deployment in the process.
      await ensureLiteLLMModelLimits("http://proxy-b.local:4000", "k");
      assertEqual(
        getContextWindowSize("litellm", "glm-private"),
        131_072,
        "the smaller window must win across proxies (larger discovered first)",
      );
      assertEqual(
        getRuntimeOutputCeiling("litellm", "glm-private"),
        16_000,
        "the smaller ceiling must win across proxies (larger discovered first)",
      );

      // Now the reverse order. Discovering the SMALLER proxy first and the
      // larger second is the case last-write-wins would get wrong, so without
      // it this test passes even with the min-merge removed.
      resetRegistries();
      await ensureLiteLLMModelLimits("http://proxy-b2.local:4000", "k");
      assertEqual(
        getContextWindowSize("litellm", "glm-private"),
        131_072,
        "the smaller proxy's window must register first",
      );
      await ensureLiteLLMModelLimits("http://proxy-a2.local:4000", "k");
    },
  );

  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    131_072,
    "a larger window discovered later must NOT raise the registered window",
  );
  assertEqual(
    getRuntimeOutputCeiling("litellm", "glm-private"),
    16_000,
    "a larger ceiling discovered later must NOT raise the registered ceiling",
  );
  resetRegistries();
});

await test("retries after a failed discovery instead of caching the failure", async () => {
  resetRegistries();
  const baseURL = uniqueBaseURL();
  let attempt = 0;
  const calls = await withFetch(
    async () => {
      attempt += 1;
      return attempt === 1
        ? new Response("nope", { status: 500 })
        : modelInfoResponse([
            { model_name: "glm-private", max_input_tokens: 262_144 },
          ]);
    },
    async (calls) => {
      await ensureLiteLLMModelLimits(baseURL, "k");
      assertEqual(
        getContextWindowSize("litellm", "glm-private"),
        STATIC_DEFAULT,
        "the failed attempt must leave the default in place",
      );
      await ensureLiteLLMModelLimits(baseURL, "k");
      return calls;
    },
  );

  assertEqual(
    calls.length,
    2,
    "a failure must not be cached — the second call must retry",
  );
  assertEqual(
    getContextWindowSize("litellm", "glm-private"),
    262_144,
    "the retry's result must register",
  );
  resetRegistries();
});

await runSuite();
