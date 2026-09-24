#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — cached input tokens must not be billed twice
 *
 * `runNativeGenerateLoop` (`src/lib/core/nativeGenerateLoop.ts`) is the shared
 * multi-step tool loop behind the direct-Anthropic and OpenAI-compatible
 * `generate()` paths. It used to accumulate `inputTokens` from each step's
 * shaped `usage.inputTokens.total` — which is cache-INCLUSIVE (uncached +
 * cache-read + cache-write) — while ALSO accumulating `cacheReadTokens` and
 * `cacheWriteTokens` from the same object. `calculateCost` (`pricing.ts`)
 * bills `input` at the full rate and then bills `cacheReadTokens` /
 * `cacheCreationTokens` again on top, so every cached token was priced twice:
 * once folded silently into `input`, once again as its own line item.
 * `tokenUtils.ts`'s "ai@6-shape rebase" was meant to correct exactly this, but
 * its guard only fires when the flat `cacheReadTokens`/`cacheCreationTokens`
 * fields are ABSENT — and the buggy provider-client output always sets them —
 * so the correction never ran for this path.
 *
 * A real run measured this precisely: reported cost $2.91767 against a turn
 * whose actual bill was $0.55, because the reported "input" (789,450) was
 * itself 255 uncached + 762,167 cache-read + 27,028 cache-write, and the
 * cache-read/write were then billed a second time. The fixture below
 * reproduces those exact figures.
 *
 * The fix moves the accumulation onto the step's disjoint `noCache` figure
 * (falling back to today's inclusive total for providers, like SageMaker,
 * that never populate `noCache`/`cacheRead`/`cacheWrite` at all) and restores
 * `usage.total` by adding the cache counters back on top, so `total` is
 * numerically unchanged by the fix — only `input` and hence `cost` are.
 *
 * Two provider families share the loop and use OPPOSITE usage conventions:
 *   - Anthropic: `input_tokens` already excludes cache; `cache_read_input_tokens`
 *     / `cache_creation_input_tokens` are additive on top (non-overlapping).
 *   - OpenAI-compatible: `prompt_tokens` already INCLUDES the cached subset,
 *     reported separately as `prompt_tokens_details.cached_tokens`
 *     (overlapping) — `doGenerate` computes `noCache` as the remainder before
 *     handing it to the loop.
 * Both are exercised here against the same shared loop.
 *
 * Determinism exception (CLAUDE.md rule 15): no live endpoint reproduces a
 * specific cache-read/cache-write split, model and price point on demand.
 * Local stand-ins serve the exact Anthropic Messages API and OpenAI
 * chat-completions wire shapes over `ANTHROPIC_BASE_URL` / a per-call
 * `credentials.openai.baseURL`, so the real providers, the real native loop
 * and the real pricing table all run and only the vendor HTTP is substituted.
 * No credentials, no network egress, deterministic in CI. Follows the same
 * pattern as `continuous-test-suite-anthropic-silent-truncation` (Anthropic
 * fake server) and `continuous-test-suite-native-vendor-recovery` (scripted
 * OpenAI-compat server).
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-cache-cost-accounting.ts
 *      pnpm run test:cache-cost-accounting
 */

import { createServer, type Server } from "node:http";
import { z } from "zod";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import {
  startScriptedChatServer,
  mockOpenAICredentials,
  type ScriptedReply,
} from "./helpers/mockChatServer.js";
import { NeuroLink, tool } from "../dist/index.js";

assertDistFresh();

const { test, runSuite, section } = defineSuite(
  "Cached input tokens billed once",
  { offline: true },
);

// ---------------------------------------------------------------------------
// Anthropic (direct) leg — non-overlapping cache convention
// ---------------------------------------------------------------------------

/**
 * Env vars this suite mutates — saved and restored around every Anthropic
 * case so an ambient dev-machine value cannot leak in or out. Mirrors
 * `continuous-test-suite-anthropic-silent-truncation`'s pattern exactly.
 */
const TOUCHED_ENV_VARS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_BASE_URL",
  "ANTHROPIC_AUTH_METHOD",
  "ANTHROPIC_OAUTH_TOKEN",
  "CLAUDE_OAUTH_TOKEN",
] as const;

type EnvSnapshot = Record<string, string | undefined>;

const snapshotEnv = (): EnvSnapshot => {
  const snapshot: EnvSnapshot = {};
  for (const key of TOUCHED_ENV_VARS) {
    snapshot[key] = process.env[key];
  }
  return snapshot;
};

const restoreEnv = (snapshot: EnvSnapshot): void => {
  for (const key of TOUCHED_ENV_VARS) {
    const prior = snapshot[key];
    if (prior === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = prior;
    }
  }
};

/** claude-3-5-sonnet's table rates ($/token) — mirrors src/lib/utils/pricing.ts. */
const CLAUDE_3_5_SONNET_RATES = {
  input: 3.0 / 1_000_000,
  output: 15.0 / 1_000_000,
  cacheRead: 0.3 / 1_000_000,
  cacheCreation: 3.75 / 1_000_000,
};

const anthropicExpectedCost = (usage: {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}): number => {
  const cost =
    usage.input * CLAUDE_3_5_SONNET_RATES.input +
    usage.output * CLAUDE_3_5_SONNET_RATES.output +
    usage.cacheRead * CLAUDE_3_5_SONNET_RATES.cacheRead +
    usage.cacheCreation * CLAUDE_3_5_SONNET_RATES.cacheCreation;
  return Math.round(cost * 1_000_000) / 1_000_000;
};

type AnthropicUsageFixture = {
  input_tokens: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  output_tokens: number;
};

/**
 * One non-streaming Anthropic Messages API response per script entry,
 * repeating the last once the script runs out — same shape as
 * `startScriptedChatServer`, adapted for the Messages wire format so a
 * tool-using multi-step turn can be reproduced.
 */
const startAnthropicMessagesServer = async (
  script: ReadonlyArray<{
    content: Array<Record<string, unknown>>;
    stopReason: string;
    usage: AnthropicUsageFixture;
  }>,
): Promise<{ server: Server; port: number; requestCount: () => number }> => {
  let requests = 0;
  const server = createServer((_req, res) => {
    const step = script[Math.min(requests, script.length - 1)];
    requests += 1;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: `msg_local_fixture_${requests}`,
        type: "message",
        role: "assistant",
        model: "claude-3-5-sonnet-20241022",
        content: step.content,
        stop_reason: step.stopReason,
        stop_sequence: null,
        usage: step.usage,
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return { server, port, requestCount: () => requests };
};

const pointAtAnthropicFixture = (port: number): void => {
  process.env.ANTHROPIC_API_KEY = "local-fixture-key";
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${port}`;
  process.env.ANTHROPIC_AUTH_METHOD = "api_key";
  delete process.env.ANTHROPIC_OAUTH_TOKEN;
  delete process.env.CLAUDE_OAUTH_TOKEN;
};

const REPORT_SCHEMA = z.object({
  city: z.string(),
  summary: z.string(),
  temperature: z.number(),
});

type AnalyticsShape = {
  tokenUsage?: {
    input: number;
    output: number;
    total: number;
    cacheReadTokens?: number;
    cacheCreationTokens?: number;
  };
  cost?: number;
};

type GenerateResultShape = { analytics?: AnalyticsShape };

void runSuite(async () => {
  section("Anthropic native generate() — single step");

  await test("a cached turn reports the uncached input and the correctly split cost", async () => {
    const envSnapshot = snapshotEnv();
    // The exact figures from a real over-reported run: reported cost was
    // $2.91767 (255 + 762167 + 27028 billed as input, THEN cache billed
    // again); the correct bill is ~$0.55.
    const usage: AnthropicUsageFixture = {
      input_tokens: 255,
      cache_read_input_tokens: 762_167,
      cache_creation_input_tokens: 27_028,
      output_tokens: 14_621,
    };
    const { server, port } = await startAnthropicMessagesServer([
      {
        content: [
          {
            type: "tool_use",
            id: "toolu_local_fixture",
            name: "final_result",
            input: {
              city: "Bengaluru",
              summary: "Warm and overcast.",
              temperature: 27,
            },
          },
        ],
        stopReason: "tool_use",
        usage,
      },
    ]);
    try {
      pointAtAnthropicFixture(port);
      const neurolink = new NeuroLink({
        conversationMemory: { enabled: false },
      });
      const result = (await neurolink.generate({
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        input: { text: "Report the weather." },
        schema: REPORT_SCHEMA,
        maxSteps: 1,
        enableAnalytics: true,
      } as Parameters<
        InstanceType<typeof NeuroLink>["generate"]
      >[0])) as GenerateResultShape;

      const tokenUsage = result.analytics?.tokenUsage;
      assert(tokenUsage !== undefined, "analytics were not populated");
      assert(
        tokenUsage?.input === usage.input_tokens,
        "reported input tokens included the cached portion",
      );
      assert(
        tokenUsage?.cacheReadTokens === usage.cache_read_input_tokens,
        "reported cache-read tokens did not match the fixture",
      );
      assert(
        tokenUsage?.cacheCreationTokens === usage.cache_creation_input_tokens,
        "reported cache-creation tokens did not match the fixture",
      );
      // total must stay billing-complete (uncached + output + both cache
      // counters) — the fix must not change this figure, only `input`/cost.
      const expectedTotal =
        usage.input_tokens +
        usage.output_tokens +
        (usage.cache_read_input_tokens ?? 0) +
        (usage.cache_creation_input_tokens ?? 0);
      assert(
        tokenUsage?.total === expectedTotal,
        "reported total token count drifted from the billing-complete sum",
      );

      const expectedCost = anthropicExpectedCost({
        input: usage.input_tokens,
        output: usage.output_tokens,
        cacheRead: usage.cache_read_input_tokens ?? 0,
        cacheCreation: usage.cache_creation_input_tokens ?? 0,
      });
      assert(result.analytics?.cost !== undefined, "cost was not reported");
      assert(
        Math.abs((result.analytics?.cost ?? 0) - expectedCost) < 1e-9,
        "reported cost did not match the correctly split price",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  section("Anthropic native generate() — multi-step tool use");

  await test("cache tokens across a tool-using turn are summed once, not twice", async () => {
    const envSnapshot = snapshotEnv();
    const step1Usage: AnthropicUsageFixture = {
      input_tokens: 100,
      cache_read_input_tokens: 5_000,
      cache_creation_input_tokens: 1_000,
      output_tokens: 50,
    };
    const step2Usage: AnthropicUsageFixture = {
      input_tokens: 120,
      cache_read_input_tokens: 5_100,
      cache_creation_input_tokens: 0,
      output_tokens: 80,
    };
    const { server, port } = await startAnthropicMessagesServer([
      {
        content: [
          {
            type: "tool_use",
            id: "toolu_step_1",
            name: "get_temperature",
            input: { city: "Bengaluru" },
          },
        ],
        stopReason: "tool_use",
        usage: step1Usage,
      },
      {
        content: [{ type: "text", text: "It is 27 degrees in Bengaluru." }],
        stopReason: "end_turn",
        usage: step2Usage,
      },
    ]);
    try {
      pointAtAnthropicFixture(port);
      const neurolink = new NeuroLink({
        conversationMemory: { enabled: false },
      });
      const result = (await neurolink.generate({
        provider: "anthropic",
        model: "claude-3-5-sonnet-20241022",
        input: { text: "What is the temperature in Bengaluru?" },
        maxSteps: 3,
        enableAnalytics: true,
        tools: {
          get_temperature: tool({
            description: "Look up the current temperature for a city",
            inputSchema: z.object({ city: z.string() }),
            execute: async () => ({ temperature: 27 }),
          }),
        },
      } as Parameters<
        InstanceType<typeof NeuroLink>["generate"]
      >[0])) as GenerateResultShape;

      const expectedInput = step1Usage.input_tokens + step2Usage.input_tokens;
      const expectedOutput =
        step1Usage.output_tokens + step2Usage.output_tokens;
      const expectedCacheRead =
        (step1Usage.cache_read_input_tokens ?? 0) +
        (step2Usage.cache_read_input_tokens ?? 0);
      const expectedCacheCreation =
        (step1Usage.cache_creation_input_tokens ?? 0) +
        (step2Usage.cache_creation_input_tokens ?? 0);

      const tokenUsage = result.analytics?.tokenUsage;
      assert(tokenUsage !== undefined, "analytics were not populated");
      assert(
        tokenUsage?.input === expectedInput,
        "accumulated input tokens across steps included the cached portion",
      );
      assert(
        tokenUsage?.cacheReadTokens === expectedCacheRead,
        "accumulated cache-read tokens across steps did not match",
      );
      assert(
        tokenUsage?.cacheCreationTokens === expectedCacheCreation,
        "accumulated cache-creation tokens across steps did not match",
      );
      assert(
        tokenUsage?.total ===
          expectedInput +
            expectedOutput +
            expectedCacheRead +
            expectedCacheCreation,
        "accumulated total token count drifted from the billing-complete sum",
      );

      const expectedCost = anthropicExpectedCost({
        input: expectedInput,
        output: expectedOutput,
        cacheRead: expectedCacheRead,
        cacheCreation: expectedCacheCreation,
      });
      assert(
        Math.abs((result.analytics?.cost ?? 0) - expectedCost) < 1e-9,
        "reported cost across a tool-using turn did not match the correctly split price",
      );
    } finally {
      server.close();
      restoreEnv(envSnapshot);
    }
  });

  // -------------------------------------------------------------------------
  // OpenAI-compatible leg — overlapping cache convention
  // -------------------------------------------------------------------------

  section("OpenAI-compatible native generate() — overlapping cache convention");

  await test("a cached turn on the overlapping convention still reports a disjoint input", async () => {
    // gpt-4o's table rates ($/token). prompt_tokens_details.cached_tokens is a
    // SUBSET of prompt_tokens on this convention (overlapping), unlike
    // Anthropic's additive fields above.
    // Mirrors src/lib/utils/pricing.ts's "gpt-4o" entry.
    const rates = {
      input: 2.5 / 1_000_000,
      output: 10.0 / 1_000_000,
      cacheRead: 0.625 / 1_000_000,
    };
    const promptTokens = 1_000; // inclusive of the cached subset
    const cachedTokens = 800;
    const completionTokens = 50;
    const reply: ScriptedReply = {
      id: "scripted-completion",
      object: "chat.completion",
      created: 1,
      model: "gpt-4o",
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: "It is 27 degrees." },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
        prompt_tokens_details: { cached_tokens: cachedTokens },
      },
    };
    const server = await startScriptedChatServer([reply]);
    try {
      const nl = new NeuroLink();
      const result = (await nl.generate({
        input: { text: "What is the temperature?" },
        provider: "openai",
        model: "gpt-4o",
        credentials: mockOpenAICredentials(server),
        maxSteps: 1,
        enableAnalytics: true,
      } as Parameters<
        InstanceType<typeof NeuroLink>["generate"]
      >[0])) as GenerateResultShape;

      const expectedInput = promptTokens - cachedTokens;
      const tokenUsage = result.analytics?.tokenUsage;
      assert(tokenUsage !== undefined, "analytics were not populated");
      assert(
        tokenUsage?.input === expectedInput,
        "reported input tokens still included the cached (overlapping) subset",
      );
      assert(
        tokenUsage?.cacheReadTokens === cachedTokens,
        "reported cache-read tokens did not match the overlapping subset",
      );
      assert(
        tokenUsage?.total === promptTokens + completionTokens,
        "reported total token count drifted from the billing-complete sum",
      );

      const expectedCost =
        Math.round(
          (expectedInput * rates.input +
            completionTokens * rates.output +
            cachedTokens * rates.cacheRead) *
            1_000_000,
        ) / 1_000_000;
      assert(result.analytics?.cost !== undefined, "cost was not reported");
      assert(
        Math.abs((result.analytics?.cost ?? 0) - expectedCost) < 1e-9,
        "reported cost on the overlapping convention did not match the correctly split price",
      );
    } finally {
      await server.close();
    }
  });
});
