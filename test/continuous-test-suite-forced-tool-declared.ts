#!/usr/bin/env tsx

/**
 * Continuous Test Suite — a forced tool must be one the request declares
 *
 * A caller's `prepareStep` hook may return `{ toolChoice: { type: "tool",
 * toolName } }`, and the native loops put that on the wire as the step's
 * `tool_choice`. When the named tool is not among the tools declared on the
 * same request, an OpenAI-compatible or Anthropic API answers HTTP 400 and the
 * whole turn fails. A Lighthouse run hit exactly that: it forced
 * `utility-server_getCurrentTime` for a shop where that platform-gated server
 * was never registered.
 *
 * `resolveStepToolChoice` is the one function every native loop asks for a
 * step's tool choice, so the guard lives there: a forced single-tool choice
 * whose name is not an own key of `declaredTools` is warned about and not sent.
 * A hook's choice is then "no override" and the usual rule decides; the turn's
 * own base choice becomes "auto". This matches how the same function already
 * treats a hook that throws: warn and continue, never fail the turn.
 *
 * DETERMINISM EXCEPTION (Critical Rule 15). This suite imports from `src/lib/`
 * and is on the `neurolink/e2e-tests-only` allow list. `resolveStepToolChoice`
 * is not exported from any package entry point, and what is under test is not
 * visible through `generate()` or `stream()`:
 *   - the exact value returned for each (hook choice, base choice, step,
 *     declared set) combination, including the `declaredTools`-absent branch,
 *     which no shipped call site takes because all of them pass the record;
 *   - that a warning was logged, and what it named, which a live call can only
 *     show as "the turn did not fail";
 *   - the null-prototype and inherited-name shapes of the discovery record.
 * A live model cannot be made to force an undeclared tool on demand, and a
 * real provider's 400 is not something a suite should provoke. Everything here
 * comes from `src`, never `dist` (one module graph per suite); the logger
 * spied on is the same instance the function under test logs through.
 *
 * Offline: no provider is constructed and nothing touches the network.
 *
 * Run: npx tsx test/continuous-test-suite-forced-tool-declared.ts
 */

import { defineSuite, assert, assertEqual } from "./helpers/harness.js";
import {
  resolveStepToolChoice,
  runNativeGenerateLoop,
} from "../src/lib/core/nativeGenerateLoop.js";
import { logger } from "../src/lib/utils/logger.js";
import type { StepToolChoiceInput } from "../src/lib/types/index.js";

type Warning = { message: string; data: Record<string, unknown> };
type PrepareStepHook = NonNullable<StepToolChoiceInput["prepareStep"]>;

const { test, runSuite } = defineSuite("Forced tool must be declared", {
  offline: true,
});

/**
 * Run `fn` with `logger.warn` captured. The guard's effect on the return value
 * is half the contract; that it said so is the other half, and the logger is
 * the only place it is said.
 */
const captureWarnings = async <T>(
  fn: () => Promise<T>,
): Promise<{ result: T; warnings: Warning[] }> => {
  const warnings: Warning[] = [];
  const original = logger.warn;
  (logger as { warn: (...args: unknown[]) => void }).warn = (
    ...args: unknown[]
  ) => {
    const data = args[1];
    warnings.push({
      message: String(args[0]),
      data:
        typeof data === "object" && data !== null
          ? (data as Record<string, unknown>)
          : {},
    });
  };
  try {
    return { result: await fn(), warnings };
  } finally {
    (logger as { warn: unknown }).warn = original;
  }
};

const forceTool = (toolName: string) => ({ type: "tool", toolName }) as const;

/** A hook that answers every step with the given choice. */
const hookReturning =
  (toolChoice: unknown): PrepareStepHook =>
  async () =>
    ({ toolChoice }) as Awaited<ReturnType<PrepareStepHook>>;

const resolve = (overrides: Partial<StepToolChoiceInput>) =>
  resolveStepToolChoice({
    base: undefined,
    step: 0,
    steps: [],
    maxSteps: 5,
    model: "test-model",
    ...overrides,
  });

const DECLARED = { get_time: {}, lookup: {} } as const;

void runSuite(async () => {
  await test("a forced tool the request declares passes through untouched", async () => {
    const forced = forceTool("get_time");
    const { result, warnings } = await captureWarnings(() =>
      resolve({
        prepareStep: hookReturning(forced),
        declaredTools: DECLARED,
      }),
    );
    assert(result === forced, "the hook's choice is returned as is");
    assertEqual(warnings.length, 0, "a declared tool is not warned about");
  });

  await test("a hook forcing an undeclared tool is ignored, warned about, and the rule decides", async () => {
    const { result, warnings } = await captureWarnings(() =>
      resolve({
        prepareStep: hookReturning(forceTool("utility-server_getCurrentTime")),
        declaredTools: DECLARED,
      }),
    );
    assertEqual(
      result,
      undefined,
      "no base choice and no override leaves the step to the model",
    );
    assertEqual(warnings.length, 1, "exactly one warning for the step");
    assertEqual(warnings[0].data.toolName, "utility-server_getCurrentTime");
    assertEqual(warnings[0].data.step, 0);
    assertEqual(warnings[0].data.source, "prepareStep");
    assert(
      warnings[0].message.includes("utility-server_getCurrentTime") &&
        warnings[0].message.includes("step 0"),
      `the message names the tool and the step: ${warnings[0].message}`,
    );
  });

  await test("the warning reports the step the hook was asked about", async () => {
    const { warnings } = await captureWarnings(() =>
      resolve({
        step: 3,
        prepareStep: hookReturning(forceTool("gone")),
        declaredTools: DECLARED,
      }),
    );
    assertEqual(warnings.length, 1);
    assertEqual(warnings[0].data.step, 3);
    assert(warnings[0].message.includes("step 3"), warnings[0].message);
  });

  await test("an ignored override falls through to the turn's own forced choice", async () => {
    const { result, warnings } = await captureWarnings(() =>
      resolve({
        base: "required",
        prepareStep: hookReturning(forceTool("gone")),
        declaredTools: DECLARED,
      }),
    );
    assertEqual(
      result,
      "required",
      "the base choice applies inside its window",
    );
    assertEqual(warnings.length, 1);
    assertEqual(warnings[0].data.source, "prepareStep");
  });

  await test("an ignored override past the forced window yields auto", async () => {
    const { result } = await captureWarnings(() =>
      resolve({
        base: "required",
        step: 1,
        prepareStep: hookReturning(forceTool("gone")),
        declaredTools: DECLARED,
      }),
    );
    assertEqual(result, "auto", "the default one-step window has lapsed");
  });

  await test("a base forced choice for an undeclared tool becomes auto and warns", async () => {
    const { result, warnings } = await captureWarnings(() =>
      resolve({ base: forceTool("gone"), declaredTools: DECLARED }),
    );
    assertEqual(result, "auto");
    assertEqual(warnings.length, 1);
    assertEqual(warnings[0].data.toolName, "gone");
    assertEqual(warnings[0].data.step, 0);
    assertEqual(warnings[0].data.source, "base");
    assert(
      warnings[0].message.includes("gone") &&
        warnings[0].message.includes("step 0"),
      warnings[0].message,
    );
  });

  await test("a base forced choice for a declared tool applies for its window only", async () => {
    const forced = forceTool("lookup");
    const inside = await captureWarnings(() =>
      resolve({ base: forced, declaredTools: DECLARED }),
    );
    assert(inside.result === forced, "inside the window the choice is kept");
    assertEqual(inside.warnings.length, 0);

    const outside = await captureWarnings(() =>
      resolve({ base: forced, step: 1, declaredTools: DECLARED }),
    );
    assertEqual(outside.result, "auto", "past the window the model chooses");
    assertEqual(outside.warnings.length, 0);
  });

  await test("an undeclared base past its window is not sent, so it is not warned about", async () => {
    const { result, warnings } = await captureWarnings(() =>
      resolve({ base: forceTool("gone"), step: 2, declaredTools: DECLARED }),
    );
    assertEqual(result, "auto");
    assertEqual(warnings.length, 0, "nothing undeclared reached the wire");
  });

  await test("choices that do not name a tool are never checked", async () => {
    const empty = {};
    for (const choice of ["auto", "none", "required"] as const) {
      const fromBase = await captureWarnings(() =>
        resolve({ base: choice, step: 0, declaredTools: empty }),
      );
      assertEqual(
        fromBase.result,
        choice,
        `base ${choice} is untouched even with nothing declared`,
      );
      assertEqual(fromBase.warnings.length, 0);

      const fromHook = await captureWarnings(() =>
        resolve({
          prepareStep: hookReturning(choice),
          declaredTools: empty,
        }),
      );
      assertEqual(
        fromHook.result,
        choice,
        `a hook's ${choice} is untouched even with nothing declared`,
      );
      assertEqual(fromHook.warnings.length, 0);
    }

    const requiredObject = { type: "required" };
    const anyObject = { type: "any" };
    for (const choice of [requiredObject, anyObject]) {
      const { result, warnings } = await captureWarnings(() =>
        resolve({
          prepareStep: hookReturning(choice),
          declaredTools: empty,
        }),
      );
      assert(result === choice, `${JSON.stringify(choice)} passes through`);
      assertEqual(warnings.length, 0);
    }
  });

  await test("with no declaredTools nothing is checked, exactly as before", async () => {
    const forced = forceTool("gone");
    const fromHook = await captureWarnings(() =>
      resolve({ prepareStep: hookReturning(forced) }),
    );
    assert(fromHook.result === forced, "an unchecked hook choice is returned");
    assertEqual(fromHook.warnings.length, 0);

    const fromBase = await captureWarnings(() => resolve({ base: forced }));
    assert(fromBase.result === forced, "an unchecked base choice is returned");
    assertEqual(fromBase.warnings.length, 0);

    const lapsed = await captureWarnings(() =>
      resolve({ base: forced, step: 1 }),
    );
    assertEqual(lapsed.result, "auto");
  });

  await test("a hook's declared choice wins over an undeclared base", async () => {
    const forced = forceTool("get_time");
    const { result, warnings } = await captureWarnings(() =>
      resolve({
        base: forceTool("gone"),
        prepareStep: hookReturning(forced),
        declaredTools: DECLARED,
      }),
    );
    assert(result === forced, "the hook decides the step");
    assertEqual(
      warnings.length,
      0,
      "the base is never consulted once the hook has decided",
    );
  });

  await test("a hook and a base that both force undeclared tools each warn, and the step falls to auto", async () => {
    const { result, warnings } = await captureWarnings(() =>
      resolve({
        base: forceTool("gone-base"),
        prepareStep: hookReturning(forceTool("gone-hook")),
        declaredTools: DECLARED,
      }),
    );
    assertEqual(result, "auto");
    assertEqual(
      warnings.map((warning) => warning.data.source).join(","),
      "prepareStep,base",
    );
    assertEqual(
      warnings.map((warning) => warning.data.toolName).join(","),
      "gone-hook,gone-base",
    );
  });

  await test("an empty declared set is a declared set: it offers no tool", async () => {
    const { result, warnings } = await captureWarnings(() =>
      resolve({
        prepareStep: hookReturning(forceTool("get_time")),
        declaredTools: {},
      }),
    );
    assertEqual(result, undefined);
    assertEqual(warnings.length, 1);
  });

  await test("only own keys count: inherited names are not declared tools", async () => {
    for (const inherited of ["constructor", "toString", "__proto__"]) {
      const { result, warnings } = await captureWarnings(() =>
        resolve({
          prepareStep: hookReturning(forceTool(inherited)),
          declaredTools: {},
        }),
      );
      assertEqual(result, undefined, `${inherited} is not declared by {}`);
      assertEqual(warnings.length, 1, `${inherited} is warned about`);
    }
  });

  await test("a null-prototype record, the discovery shape, is read correctly", async () => {
    const hot = Object.create(null) as Record<string, unknown>;
    hot.get_time = {};
    const forced = forceTool("get_time");
    const declared = await captureWarnings(() =>
      resolve({ prepareStep: hookReturning(forced), declaredTools: hot }),
    );
    assert(declared.result === forced, "a tool on the null-prototype record");
    assertEqual(declared.warnings.length, 0);

    const missing = await captureWarnings(() =>
      resolve({
        prepareStep: hookReturning(forceTool("lookup")),
        declaredTools: hot,
      }),
    );
    assertEqual(missing.result, undefined);
    assertEqual(missing.warnings.length, 1);
  });

  await test("the live record is read at each step, so a tool hydrated mid-turn becomes forceable", async () => {
    const live: Record<string, unknown> = { get_time: {} };
    const forced = forceTool("lookup");

    const before = await captureWarnings(() =>
      resolve({ prepareStep: hookReturning(forced), declaredTools: live }),
    );
    assertEqual(before.result, undefined, "not declared yet");
    assertEqual(before.warnings.length, 1);

    live.lookup = {};
    const after = await captureWarnings(() =>
      resolve({
        step: 1,
        prepareStep: hookReturning(forced),
        declaredTools: live,
      }),
    );
    assert(after.result === forced, "declared once hydrated into the record");
    assertEqual(after.warnings.length, 0);
  });

  await test("generate loop: a forced tool hydrated into the live record but absent from the request's tools is not sent", async () => {
    // search_tools executes inside the loop and adds crm_lookup to the live
    // record; the loop's `tools` array was built once, so the request never
    // declares it. The record says "declared", the wire says "not offered".
    const live = Object.create(null) as Record<string, unknown>;
    live.get_time = { description: "time", execute: async () => ({ now: 1 }) };
    live.search_tools = {
      description: "search",
      execute: async () => {
        live.crm_lookup = { description: "crm", execute: async () => ({}) };
        return { found: 1 };
      },
    };
    const requestTools = Object.entries(live).map(([name, entry]) => ({
      type: "function",
      name,
      description: (entry as { description: string }).description,
      inputSchema: { type: "object", properties: {} },
    }));
    const run = async (forcedName: string) => {
      const sent: Array<{ names: string[]; toolChoice: unknown }> = [];
      let call = 0;
      const doGenerate = async (options: Record<string, unknown>) => {
        sent.push({
          names: ((options.tools as Array<{ name: string }>) ?? []).map(
            (declared) => declared.name,
          ),
          toolChoice: options.toolChoice,
        });
        const step = call++;
        return step === 0
          ? {
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call-1",
                  toolName: "search_tools",
                  input: '{"query":"crm"}',
                },
              ],
              finishReason: { unified: "tool-calls" },
              usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
            }
          : {
              content: [{ type: "text", text: "done" }],
              finishReason: { unified: "stop" },
              usage: { inputTokens: { total: 1 }, outputTokens: { total: 1 } },
            };
      };
      const { warnings } = await captureWarnings(() =>
        runNativeGenerateLoop(
          {
            doGenerate,
            conversation: [{ role: "user", content: "hi" }],
            tools: requestTools,
            toolsRecord: live,
            prepareStep: async ({ stepNumber }) =>
              stepNumber === 1
                ? ({ toolChoice: forceTool(forcedName) } as Awaited<
                    ReturnType<PrepareStepHook>
                  >)
                : undefined,
            modelId: "test-model",
            maxSteps: 4,
            runStep: (invoke) => invoke(),
          },
          [],
        ),
      );
      return { second: sent[1], warnings };
    };

    const hydrated = await run("crm_lookup");
    assertEqual(
      hydrated.second.toolChoice,
      undefined,
      "crm_lookup is in the record but not in the request, so it is not forced",
    );
    assertEqual(
      hydrated.warnings.length,
      1,
      "the dropped choice is warned about",
    );
    assertEqual(hydrated.warnings[0].data.toolName, "crm_lookup");

    const offered = await run("get_time");
    const offeredChoice = offered.second.toolChoice as { toolName?: string };
    assertEqual(
      offeredChoice.toolName,
      "get_time",
      "an offered tool is forced",
    );
    assert(
      offered.second.names.includes("get_time"),
      "and it is in the request's tools",
    );
    assertEqual(offered.warnings.length, 0);
  });
});
