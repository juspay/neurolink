#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — thinkingConfig survives the SDK option allowlist, LIVE
 *
 * `NeuroLink.generate()` accepts a `thinkingConfig`, and the type documents it
 * as the recommended way to switch extended thinking on. It never reached a
 * provider.
 *
 * `buildGenerateTextOptions` converts the caller's public `GenerateOptions`
 * into the internal `TextGenerationOptions` through an explicit field-by-field
 * allowlist, and `thinkingConfig` was absent from it. Every provider gates
 * thinking on `options.thinkingConfig`, so all of them saw `undefined`: the
 * request went out with no thinking block and nothing was raised to say the
 * option had been discarded. That file already carried a note recording the
 * same failure for `disableInternalFallback`, which makes this a repeat rather
 * than a one-off.
 *
 * WHY THIS ASSERTS ON THE REQUEST, NOT ON `result.reasoning`.
 * The obvious assertion — "reasoning comes back non-empty" — is WRONG here and
 * would fail forever. Whenever a proxy base URL is set, which is always true on
 * the OAuth subscription path this deployment uses, the client requests the
 * beta `redact-thinking-2026-02-12` (anthropic/client.ts:878). Anthropic honours
 * it by returning thinking blocks whose text is redacted and whose signature is
 * intact — captured directly: `blockTypes=[thinking,text]` with the thinking
 * block at 0 characters and a valid signature. So an empty `result.reasoning`
 * is CORRECT on this path and proves nothing either way.
 *
 * The observable fact that does distinguish the fix is whether the outbound
 * request carries a `thinking` field. This suite therefore wraps `fetch` to
 * record what left the process. That is observation, not substitution: the call
 * still goes through the real public `generate()` to the real provider and the
 * real response comes back. Nothing is stubbed.
 *
 * SCOPE. Only `thinkingConfig` is exercised, because it is the only thinking
 * option the public `GenerateOptions` actually declares. `thinking`,
 * `thinkingBudget` and `thinkingLevel` appear in the docs and in CLAUDE.md but
 * exist solely on the internal `TextGenerationOptions`, so no caller can pass
 * them through `generate()`. Declaring them is a public-type decision, tracked
 * separately.
 *
 * THE CLI LEG IS A REGRESSION GUARD, AND IT EARNED ITS PLACE.
 * Forwarding `thinkingConfig` is what first makes a `thinking` field reach the
 * wire, and that immediately collided with a rule nothing had hit before:
 * Anthropic rejects any temperature but 1 while thinking is enabled, and the
 * CLI always sends a default temperature. So this change briefly turned a
 * working `--thinking` invocation into a 400 — a regression introduced by the
 * fix itself, caught only by running the release build first and finding it
 * exited 0. The sampling knobs are now dropped whenever `thinking` is set, on
 * both the generate and stream builders, and these cases pin that.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-sdk-thinking-config.ts
 */

import { NeuroLink } from "../dist/index.js";
import { defineSuite, assert, runCLI } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("SDK thinkingConfig passthrough (live)");

const PROVIDER = "anthropic";
const MODEL = "claude-sonnet-4-5-20250929";
const PROMPT = "What is 17 * 24? Work it out step by step.";
const BUDGET = 5000;

type SeenRequest = {
  hasThinking: boolean;
  budgetTokens: number | undefined;
  hasTemperature: boolean;
};

/**
 * Record every outbound Messages request while `run` executes. Restores the
 * original `fetch` even if the call throws, so one failing test cannot leave a
 * wrapped `fetch` behind for the next one.
 */
const observeRequests = async <T>(
  run: () => Promise<T>,
): Promise<{ result: T; seen: SeenRequest[] }> => {
  const seen: SeenRequest[] = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).includes("/v1/messages")) {
      let body: Record<string, unknown>;
      try {
        body = JSON.parse(String(init?.body ?? "{}")) as Record<
          string,
          unknown
        >;
      } catch {
        body = {};
      }
      const thinking = body.thinking as { budget_tokens?: number } | undefined;
      seen.push({
        hasThinking: thinking !== undefined && thinking !== null,
        budgetTokens: thinking?.budget_tokens,
        hasTemperature: body.temperature !== undefined,
      });
    }
    return original(input, init);
  };
  try {
    const result = await run();
    return { result, seen };
  } finally {
    globalThis.fetch = original;
  }
};

await test("a thinkingConfig passed to generate() reaches the request", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const { result, seen } = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 8000,
      disableTools: true,
      thinkingConfig: { enabled: true, budgetTokens: BUDGET },
    }),
  );

  // PRECONDITION 1: the turn completed. Without it an empty request list
  // could mean the call failed early, and the assertion below would be
  // reporting on something that never ran.
  assert(
    (result.content ?? "").length > 0,
    "precondition failed: the call returned no content, so the turn never completed",
  );

  // PRECONDITION 2: a request was actually observed. An assertion about what
  // a request contained is vacuous if no request was captured.
  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed, so nothing was inspected",
  );

  // The regression. Pre-fix the allowlist discarded thinkingConfig and this
  // field was absent from every outbound request.
  assert(
    seen.some((r) => r.hasThinking),
    "no outbound request carried a thinking field, so thinkingConfig never reached the provider",
  );

  assert(
    seen.some((r) => r.budgetTokens === BUDGET),
    "the thinking field did not carry the budget the caller asked for",
  );
});

await test("omitting thinkingConfig sends no thinking field", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const { result, seen } = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 2000,
      disableTools: true,
    }),
  );

  assert(
    (result.content ?? "").length > 0,
    "precondition failed: the call returned no content, so the turn never completed",
  );
  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed, so nothing was inspected",
  );

  // The other direction: forwarding a new field through the allowlist must
  // not switch thinking on for callers who never asked for it.
  assert(
    seen.every((r) => !r.hasThinking),
    "a request carried a thinking field even though the caller set no thinkingConfig",
  );
});

await test("the CLI still succeeds with thinking enabled", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await runCLI(
    [
      "generate",
      PROMPT,
      "--provider",
      PROVIDER,
      "--model",
      MODEL,
      "--thinking",
      "--thinkingBudget",
      String(BUDGET),
      "--disableTools",
    ],
    { timeoutMs: 180_000 },
  );

  // Exit code is the whole point: before the sampling fix this path returned a
  // 400 because the CLI's default temperature travelled alongside `thinking`.
  assert(
    result.exitCode === 0,
    "the CLI exited non-zero with thinking enabled, so a sampling parameter is still being sent alongside thinking",
  );
  assert(
    result.stdout.trim().length > 0,
    "the CLI produced no output with thinking enabled",
  );
});

await test("the CLI is unaffected when thinking is off", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await runCLI(
    [
      "generate",
      PROMPT,
      "--provider",
      PROVIDER,
      "--model",
      MODEL,
      "--disableTools",
    ],
    { timeoutMs: 180_000 },
  );

  // The other direction: dropping the sampling knobs must happen only on
  // thinking turns, never on ordinary ones.
  assert(
    result.exitCode === 0,
    "the CLI exited non-zero on an ordinary generate with no thinking",
  );
});

await test("an explicit temperature is dropped on a thinking stream turn", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  // `stream()` spreads its options rather than filtering them through an
  // allowlist, so thinkingConfig always reached the wire there — the drop was
  // generate()-only. What the stream path DOES need covering is its own
  // sampling guard: Anthropic rejects any temperature but 1 while thinking is
  // set, so a caller supplying both must have the temperature dropped.
  // Passing `temperature` explicitly is what makes this discriminate; without
  // it there is nothing for the guard to remove and the case passes anywhere.
  const { seen } = await observeRequests(async () => {
    const result = await new NeuroLink().stream({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 8000,
      disableTools: true,
      temperature: 0,
      thinkingConfig: { enabled: true, budgetTokens: BUDGET },
    });
    let text = "";
    for await (const chunk of result.stream) {
      // The chunk union carries audio, TTS and no-output sentinel variants
      // that have no `content`, so narrow before reading it. `tsx` erases
      // types and would run this either way; `check:tools-tests` is what
      // catches it.
      if (
        typeof chunk === "object" &&
        chunk !== null &&
        "content" in chunk &&
        typeof chunk.content === "string"
      ) {
        text += chunk.content;
      }
    }
    return text;
  });

  // PRECONDITION: a request must have been observed, and it must be a thinking
  // turn — otherwise there is no guard under test and the assertion below
  // would pass for the wrong reason.
  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed on the stream path",
  );
  assert(
    seen.some((r) => r.hasThinking),
    "precondition failed: no stream request carried a thinking field, so the sampling guard was never exercised",
  );

  assert(
    seen.every((r) => !r.hasTemperature),
    "a thinking stream request still carried a temperature, which Anthropic rejects",
  );
});

await runSuite();
