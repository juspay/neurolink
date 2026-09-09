#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — reasoning parity between generate() and stream(), LIVE
 *
 * The scripted-endpoint suite pins the accumulation mechanically. This one
 * proves the thing a caller actually experiences, against a real reasoner
 * model: on a multi-step tool turn, `generate()` must not report an empty
 * `reasoning` for a turn where `stream()` reports one.
 *
 * That asymmetry is the defect. On `release` the generate path REPLACED its
 * reasoning each step, so the caller received only whatever the final step
 * happened to think — and once the tool result is in hand the model often
 * thinks nothing at all. A recorded run against the release tip returned
 * 0 characters from `generate()` on a turn where `stream()` returned 131 for
 * the same prompt and the same tool.
 *
 * WHY THE ORDER MATTERS. `stream()` runs FIRST and establishes that this
 * prompt makes the model reason at all; asserting on generate alone would pass
 * vacuously on a turn the model answered without thinking. But the two legs are
 * SEPARATE samplings of a stochastic model, so a reasoning stream does not
 * oblige the next generate to reason — that is why the generate leg samples
 * repeatedly and fails only on a clean sweep, rather than treating one quiet
 * turn as the defect.
 *
 * Byte-equality between the two surfaces is deliberately NOT asserted: these
 * are two live samplings of a stochastic model, so equal text would be luck,
 * not correctness. The mechanical concatenation contract is pinned offline in
 * `continuous-test-suite-native-vendor-recovery.ts`; what belongs here is the
 * asymmetry a user can actually hit.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-reasoning-parity-live.ts
 */

import { z } from "zod";
import { NeuroLink, tool } from "../dist/index.js";
import { defineSuite, assert, runCLI } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite("Reasoning parity (live)");

const PROVIDER = "deepseek";
/**
 * `deepseek-chat` is the matrix default and does not expose reasoning.
 * The reasoner variant is the only DeepSeek model that emits
 * `reasoning_content`, which is the field this contract is about.
 */
const MODEL = "deepseek-reasoner";

const PROMPT =
  "Call get_population for Tokyo, then tell me the population in one sentence.";

type ToolCounter = { calls: number };

const populationTool = (counter: ToolCounter) => ({
  get_population: tool({
    description: "Returns the population of a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }: { city: string }) => {
      counter.calls += 1;
      return { city, population: 13_960_000 };
    },
  }),
});

/** Reasoning observed on the streaming surface, shared as a precondition. */
let streamedReasoningChars = -1;

await test("stream() surfaces reasoning across a live tool loop", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const counter: ToolCounter = { calls: 0 };
  const result = await new NeuroLink().stream({
    input: { text: PROMPT },
    provider: PROVIDER,
    model: MODEL,
    maxTokens: 4000,
    tools: populationTool(counter),
  });

  let reasoning = "";
  for await (const chunk of result.stream) {
    const part = (chunk as { reasoning?: unknown }).reasoning;
    if (typeof part === "string") {
      reasoning += part;
    }
  }

  // PRECONDITION: the tool must have run, or this was a single-step turn and
  // says nothing about multi-step behaviour.
  assert(
    counter.calls > 0,
    "precondition failed: the tool never executed, so no tool loop occurred",
  );

  streamedReasoningChars = reasoning.length;

  assert(
    streamedReasoningChars > 0,
    "the streaming surface reported no reasoning for a reasoner model",
  );
});

await test("generate() does not lose the reasoning stream() reports for the same turn", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  // PRECONDITION: the streaming leg must have established that this prompt
  // makes the model reason. Without it, an empty generate() reasoning is
  // indistinguishable from a turn the model simply did not think about, and
  // the assertion below would pass vacuously.
  assert(
    streamedReasoningChars > 0,
    "precondition failed: the streaming leg did not establish that this turn produces reasoning",
  );

  // A reasoner model is not obliged to think on any given turn, and the
  // streaming leg was a SEPARATE sampling — so one empty generate() is not
  // evidence of the defect, only of a quiet turn. Sample until one of them
  // reasons; only a clean sweep is the asymmetry worth failing on. The
  // deterministic proof of the concatenation contract lives in the scripted
  // suite, which is why this leg can afford to be conservative.
  const ATTEMPTS = 3;
  let reasoningChars = 0;
  let toolRan = false;

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const counter: ToolCounter = { calls: 0 };
    const result = await new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 4000,
      tools: populationTool(counter),
    });
    // Bind the two observations to the SAME sample. Counting `toolRan` from
    // one attempt and `reasoningChars` from another would let a tool-loop turn
    // that thought nothing, followed by a tool-free turn that did, satisfy both
    // assertions without ever seeing reasoning from a multi-step turn — which
    // is the only thing this test exists to check.
    if (counter.calls === 0) {
      continue;
    }
    toolRan = true;
    reasoningChars = (result.reasoning ?? "").length;
    if (reasoningChars > 0) {
      break;
    }
  }

  // PRECONDITION: same tool loop shape as the streaming leg. Without a tool
  // call there is no multi-step turn, and the accumulation this asserts on
  // is trivially the only step's reasoning.
  assert(
    toolRan,
    "precondition failed: the tool never executed on the generate path",
  );

  // This is the regression. Pre-fix, the final step's reasoning replaced the
  // turn's, and a step that answers straight from the tool result thinks
  // nothing — so the caller got an empty string here while the streaming
  // consumer got the whole turn. Three consecutive empty turns against a
  // model that just reasoned on the streaming leg is that defect, not noise.
  assert(
    reasoningChars > 0,
    `generate() reported no reasoning on ${ATTEMPTS} consecutive turns where stream() reported some`,
  );
});

await test("the CLI completes a reasoner-model tool generate without regressing", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const result = await runCLI(
    ["generate", PROMPT, "--provider", PROVIDER, "--model", MODEL],
    { timeoutMs: 180_000 },
  );

  assert(
    result.exitCode === 0,
    "the CLI exited non-zero on a reasoner-model generate",
  );
  assert(
    result.stdout.trim().length > 0,
    "the CLI produced no output for a reasoner-model generate",
  );

  // The CLI is deliberately NOT asserted to show the reasoning itself: the
  // generate command never prints `result.reasoning` (only evaluation
  // reasoning is printed, in commandFactory). So this leg guards the
  // CLI-only failure modes the SDK legs cannot see — argument parsing, env
  // loading, exit codes, and library/binary bundling drift — and the
  // reasoning contract stays asserted on the SDK surface above.
});

await runSuite();
