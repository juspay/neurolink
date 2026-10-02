#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — string-form toolChoice reaches Anthropic, LIVE
 *
 * `toolChoice` accepts four shapes: the strings `"auto"`, `"none"`,
 * `"required"`, and the object `{ type: "tool", toolName }`. On the Anthropic
 * generate path the three string forms never reached the provider.
 *
 * `resolveToolChoice` returns a bare string for those cases, but the request
 * builder read `.type` off the value before translating it. A string has no
 * `.type`, so `toolChoiceToAnthropic` received `undefined`, returned
 * `undefined`, and the field was dropped from the request entirely. A caller
 * asking for a required tool silently got Anthropic's default `auto` — the
 * model was free to answer without calling anything, and nothing was raised.
 * The object form worked, because `.type === "tool"` is truthy.
 *
 * The translator itself was never at fault: it maps `"required"` to
 * `{ type: "any" }` correctly. It simply was not being given the string. The
 * streaming path already passed the value straight through, so this was a
 * generate-only divergence from a sibling that had it right.
 *
 * WHY THIS ASSERTS ON THE REQUEST. Whether a model chooses to call a tool is
 * its decision, so asserting "a tool was called" would be flaky in both
 * directions — a model may call one without being forced, and may be forced
 * and still produce a turn this suite reads as ambiguous. What the fix
 * actually changes is the bytes we send. The suite therefore wraps `fetch` to
 * record the outbound request. That is observation, not substitution: the call
 * goes through the real public `generate()` to the real provider and the real
 * response comes back. Nothing is stubbed.
 *
 * Only the first case discriminates. The other two pass on the release build
 * as well and exist to catch this fix breaking the shape that already worked,
 * or switching tool choice on for callers who never asked.
 *
 * The first four cases cap `maxSteps` deliberately: they pin the wire shape of
 * step 0 and nothing else. The cases under "a forced choice lapses" are the
 * other half of the story — a forced choice used to be baked into EVERY step's
 * request, so the model was compelled to call the tool again on each step and
 * the loop only ended when `maxSteps` ran out. Now a forced choice applies to
 * the first `toolChoiceSteps` steps (default 1) and the model is then free to
 * answer; those cases assert the step-1 request carries no forced choice and
 * the turn ends well short of its cap.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-anthropic-toolchoice.ts
 */

import { z } from "zod";
import { NeuroLink, tool } from "../dist/index.js";
import { defineSuite, assert } from "./helpers/harness.js";
import { skipUnlessProviderAvailable } from "./helpers/skipIf.js";
import { assertDistFresh } from "./helpers/distFreshness.js";

assertDistFresh();

const { test, runSuite } = defineSuite(
  "Anthropic toolChoice passthrough (live)",
);

const PROVIDER = "anthropic";
const MODEL = "claude-sonnet-4-5-20250929";
const PROMPT = "What is the weather in Tokyo?";

// The capture used to coerce every non-object `tool_choice` to `null`, which
// made it blind to exactly the failure it is meant to watch for: a bare string
// reaching the wire looked identical to no tool_choice at all. Record the raw
// value and narrow at the point of use instead.
type SeenRequest = {
  toolChoice: Record<string, unknown> | string | null;
};

/** Narrow a captured tool_choice to its object form, or null. */
const asObject = (
  value: SeenRequest["toolChoice"],
): Record<string, unknown> | null =>
  value !== null && typeof value === "object" ? value : null;

const weatherTool = (counter?: { calls: number }) => ({
  get_weather: tool({
    description: "Returns the current weather for a city",
    inputSchema: z.object({ city: z.string() }),
    execute: async ({ city }: { city: string }) => {
      if (counter) {
        counter.calls++;
      }
      return { city, tempC: 22 };
    },
  }),
});

/** Cheapest live model for the multi-step cases. */
const LOOP_MODEL = "claude-haiku-4-5-20251001";
/** Well above the two or three steps a lapsed forced choice actually takes. */
const LOOP_MAX_STEPS = 6;

/**
 * Record every outbound Messages request while `run` executes, restoring the
 * original `fetch` even if the call throws so one failure cannot leave a
 * wrapped `fetch` behind for the next case.
 */
const observeRequests = async (
  run: () => Promise<unknown>,
): Promise<SeenRequest[]> => {
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
      const choice = body.tool_choice;
      seen.push({
        toolChoice:
          choice === undefined || choice === null
            ? null
            : (choice as Record<string, unknown> | string),
      });
    }
    return original(input, init);
  };
  try {
    await run();
    return seen;
  } finally {
    globalThis.fetch = original;
  }
};

await test('the string form "required" reaches the provider', async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const seen = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 2000,
      maxSteps: 2,
      toolChoice: "required",
      tools: weatherTool(),
    }),
  );

  // PRECONDITION: an assertion about a request's contents is vacuous if no
  // request was captured.
  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed",
  );

  // The regression. Pre-fix the builder read `.type` off the string, the
  // translator got undefined, and the field never left the process.
  assert(
    seen.some((r) => r.toolChoice !== null),
    "no outbound request carried a tool_choice, so the string form never reached the provider",
  );
  assert(
    seen.some((r) => asObject(r.toolChoice)?.type === "any"),
    'the string form did not translate to Anthropic\'s "any" tool choice',
  );
});

await test("the object form still reaches the provider unchanged", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const seen = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 2000,
      maxSteps: 2,
      toolChoice: { type: "tool", toolName: "get_weather" },
      tools: weatherTool(),
    }),
  );

  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed",
  );

  // Control: this shape worked before the fix and must keep working.
  assert(
    seen.some(
      (r) =>
        asObject(r.toolChoice)?.type === "tool" &&
        asObject(r.toolChoice)?.name === "get_weather",
    ),
    "the object form no longer names the requested tool on the wire",
  );
});

await test('a tool choice naming no tool sends no tool_choice rather than a bare "tool"', async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const seen = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 2000,
      maxSteps: 2,
      // Malformed on purpose: `type: "tool"` with no `toolName`. Not
      // reachable from a well-typed caller, but normalisation reads an
      // `unknown`, so the shape has to be handled rather than assumed away.
      toolChoice: { type: "tool" } as unknown as never,
      tools: weatherTool(),
    }),
  );

  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed",
  );

  // `"tool"` is not one of Anthropic's valid auto/none/required strings, so
  // forwarding it would be worse than dropping it: the request is rejected
  // outright instead of falling back to the default.
  assert(
    seen.every((r) => r.toolChoice !== "tool"),
    "a request carried the bare string tool_choice",
  );
  assert(
    seen.every((r) => r.toolChoice === null),
    "a nameless tool choice still reached the wire",
  );
});

await test("omitting toolChoice sends no tool_choice", async () => {
  skipUnlessProviderAvailable(PROVIDER);

  const seen = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: MODEL,
      maxTokens: 2000,
      maxSteps: 2,
      tools: weatherTool(),
    }),
  );

  assert(
    seen.length > 0,
    "precondition failed: no Messages request was observed",
  );

  // Control in the other direction: normalising the value must not invent a
  // tool choice for callers who never supplied one. Anthropic defaults to
  // auto when the field is absent, which is the behaviour to preserve.
  assert(
    seen.every((r) => r.toolChoice === null),
    "a request carried a tool_choice even though the caller supplied none",
  );
});

// ---------------------------------------------------------------------------
// A forced choice lapses after toolChoiceSteps
// ---------------------------------------------------------------------------

await test("a named toolChoice forces the tool once, then step 1 goes out unforced and the turn ends", async () => {
  skipUnlessProviderAvailable(PROVIDER);
  const counter = { calls: 0 };
  let result: { stepsUsed?: number; toolsUsed?: string[] } | null = null;
  const seen = await observeRequests(async () => {
    result = await new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: LOOP_MODEL,
      maxTokens: 2000,
      maxSteps: LOOP_MAX_STEPS,
      toolChoice: { type: "tool", toolName: "get_weather" },
      tools: weatherTool(counter),
    });
  });

  assert(
    seen.length >= 2,
    "precondition failed: a forced tool call must produce at least a tool step and an answer step",
  );
  assert(
    asObject(seen[0].toolChoice)?.type === "tool",
    "step 0 did not carry the forced tool choice",
  );
  // The regression: this used to be `{ type: "tool" }` again, and again on
  // every step after it, until maxSteps.
  assert(
    seen[1].toolChoice === null ||
      asObject(seen[1].toolChoice)?.type === "auto",
    "step 1 still carried a forced tool choice",
  );
  assert(counter.calls === 1, "the forced tool did not run exactly once");
  assert(
    seen.length < LOOP_MAX_STEPS,
    "the turn ran all the way to maxSteps instead of ending on its own",
  );
  const r = result as { stepsUsed?: number; toolsUsed?: string[] } | null;
  assert(
    r?.toolsUsed?.includes("get_weather") === true,
    "the result does not report the forced tool as used",
  );
});

await test("toolChoiceSteps: 2 holds the forced choice for two steps and then releases it", async () => {
  skipUnlessProviderAvailable(PROVIDER);
  const counter = { calls: 0 };
  const seen = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: LOOP_MODEL,
      maxTokens: 2000,
      maxSteps: LOOP_MAX_STEPS,
      toolChoice: { type: "tool", toolName: "get_weather" },
      toolChoiceSteps: 2,
      tools: weatherTool(counter),
    }),
  );

  assert(
    seen.length >= 3,
    "precondition failed: two forced steps must be followed by an answer step",
  );
  assert(
    asObject(seen[0].toolChoice)?.type === "tool" &&
      asObject(seen[1].toolChoice)?.type === "tool",
    "steps 0 and 1 did not both carry the forced tool choice",
  );
  assert(
    seen[2].toolChoice === null ||
      asObject(seen[2].toolChoice)?.type === "auto",
    "step 2 still carried a forced tool choice",
  );
  assert(counter.calls === 2, "the forced tool did not run exactly twice");
  assert(
    seen.length < LOOP_MAX_STEPS,
    "the turn ran all the way to maxSteps instead of ending on its own",
  );
});

await test("a prepareStep toolChoice wins for its step over the toolChoiceSteps rule", async () => {
  skipUnlessProviderAvailable(PROVIDER);
  const counter = { calls: 0 };
  const stepNumbersSeen: number[] = [];
  const seen = await observeRequests(() =>
    new NeuroLink().generate({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: LOOP_MODEL,
      maxTokens: 2000,
      maxSteps: LOOP_MAX_STEPS,
      // Would force the tool on every step of this turn on its own...
      toolChoice: { type: "tool", toolName: "get_weather" },
      toolChoiceSteps: LOOP_MAX_STEPS,
      // ...but the hook releases it from step 1 on, and must win.
      prepareStep: async ({ stepNumber }) => {
        stepNumbersSeen.push(stepNumber);
        return stepNumber === 0 ? undefined : { toolChoice: "auto" };
      },
      tools: weatherTool(counter),
    }),
  );

  assert(
    seen.length >= 2,
    "precondition failed: a forced tool call must produce at least two steps",
  );
  assert(
    stepNumbersSeen[0] === 0 && stepNumbersSeen[1] === 1,
    "prepareStep was not called once per step with the step number",
  );
  assert(
    asObject(seen[0].toolChoice)?.type === "tool",
    "step 0 (hook returned undefined) did not fall back to the forced choice",
  );
  assert(
    seen[1].toolChoice === null ||
      asObject(seen[1].toolChoice)?.type === "auto",
    "the hook's auto did not override the forced choice on step 1",
  );
  assert(counter.calls === 1, "the forced tool did not run exactly once");
  assert(
    seen.length < LOOP_MAX_STEPS,
    "the turn ran all the way to maxSteps instead of ending on its own",
  );
});

await test("the streaming path applies the same per-step rule", async () => {
  skipUnlessProviderAvailable(PROVIDER);
  const counter = { calls: 0 };
  let toolsUsed: string[] | undefined;
  const seen = await observeRequests(async () => {
    const result = await new NeuroLink().stream({
      input: { text: PROMPT },
      provider: PROVIDER,
      model: LOOP_MODEL,
      maxTokens: 2000,
      maxSteps: LOOP_MAX_STEPS,
      toolChoice: { type: "tool", toolName: "get_weather" },
      tools: weatherTool(counter),
    });
    for await (const _chunk of result.stream) {
      // drain
    }
    toolsUsed = result.toolsUsed;
  });

  assert(
    seen.length >= 2,
    "precondition failed: a forced tool call must produce at least two steps",
  );
  assert(
    asObject(seen[0].toolChoice)?.type === "tool",
    "stream step 0 did not carry the forced tool choice",
  );
  assert(
    seen[1].toolChoice === null ||
      asObject(seen[1].toolChoice)?.type === "auto",
    "stream step 1 still carried a forced tool choice",
  );
  assert(counter.calls === 1, "the forced tool did not run exactly once");
  assert(
    seen.length < LOOP_MAX_STEPS,
    "the streamed turn ran all the way to maxSteps instead of ending on its own",
  );
  assert(
    Array.isArray(toolsUsed) && toolsUsed.includes("get_weather"),
    "the stream result does not report the forced tool as used",
  );
});

await runSuite();
