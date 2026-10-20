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
import type { StepToolChoiceInput, Tool } from "../src/lib/types/index.js";

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

  // search_tools executes inside the loop and adds crm_lookup to the live
  // record. The loop declares it on the next step by default, for every
  // provider that runs it, so the model can call it and a caller can force it.
  // Each run builds its own record and request tools: the loop appends the new
  // declaration to the caller's array in place.
  const runWithHydration = async (
    forcedName: string,
    options: {
      declareTool?: (name: string, tool: Tool) => Record<string, unknown>;
    } = {},
  ) => {
    const live = Object.create(null) as Record<string, unknown>;
    live.get_time = { description: "time", execute: async () => ({ now: 1 }) };
    live.search_tools = {
      description: "search",
      execute: async () => {
        live.crm_lookup = {
          description: "crm",
          inputSchema: { jsonSchema: { type: "object", properties: {} } },
          execute: async () => ({ found: 1 }),
        };
        return { found: 1 };
      },
    };
    const requestTools: Array<Record<string, unknown>> = Object.entries(
      live,
    ).map(([name, entry]) => ({
      type: "function",
      name,
      description: (entry as { description: string }).description,
      inputSchema: { type: "object", properties: {} },
    }));
    const sent: Array<{ names: string[]; toolChoice: unknown }> = [];
    let call = 0;
    const doGenerate = async (request: Record<string, unknown>) => {
      sent.push({
        names: ((request.tools as Array<{ name: string }>) ?? []).map(
          (declared) => declared.name,
        ),
        toolChoice: request.toolChoice,
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
          provider: "probe",
          doGenerate,
          conversation: [{ role: "user", content: "hi" }],
          tools: requestTools,
          toolsRecord: live as Record<string, Tool>,
          ...(options.declareTool ? { declareTool: options.declareTool } : {}),
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
    return { second: sent[1], warnings, requestTools };
  };

  await test("generate loop: a tool the live record gains mid-turn is declared on the next request without any provider hook, so it can be forced", async () => {
    const run = await runWithHydration("crm_lookup");
    assert(
      run.second.names.includes("crm_lookup"),
      "the next request declares the tool search_tools loaded",
    );
    const choice = run.second.toolChoice as { toolName?: string };
    assertEqual(
      choice.toolName,
      "crm_lookup",
      "a declared tool is forced, as an offered one always is",
    );
    assertEqual(run.warnings.length, 0, "nothing is dropped, so nothing warns");
    assertEqual(run.requestTools.length, 3, "the caller's array grew in place");
    assertEqual(
      JSON.stringify(run.requestTools[2]),
      JSON.stringify({
        type: "function",
        name: "crm_lookup",
        description: "crm",
        inputSchema: { type: "object", properties: {} },
      }),
      "the provider-neutral declaration",
    );
  });

  await test("generate loop: an offered tool is still forced and nothing is declared twice", async () => {
    const run = await runWithHydration("get_time");
    const choice = run.second.toolChoice as { toolName?: string };
    assertEqual(choice.toolName, "get_time", "an offered tool is forced");
    assertEqual(run.warnings.length, 0);
    assertEqual(
      run.second.names.filter((name) => name === "get_time").length,
      1,
      "get_time is declared once",
    );
  });

  await test("generate loop: a provider's own declareTool still takes over the declaration", async () => {
    const run = await runWithHydration("crm_lookup", {
      declareTool: (name) => ({
        type: "function",
        name,
        description: "custom",
        inputSchema: { type: "object", properties: { custom: {} } },
      }),
    });
    assertEqual(
      (run.requestTools[2] as { description?: string }).description,
      "custom",
      "the override built the declaration",
    );
  });

  await test("generate loop: a tool whose lazy input schema throws is declared with an empty object schema instead of failing the step", async () => {
    const live = Object.create(null) as Record<string, unknown>;
    live.search_tools = {
      description: "search",
      execute: async () => {
        live.broken_lazy = {
          description: "broken",
          inputSchema: () => {
            throw new Error("lazy schema failed");
          },
          execute: async () => ({}),
        };
        return { found: 1 };
      },
    };
    const requestTools: Array<Record<string, unknown>> = [
      {
        type: "function",
        name: "search_tools",
        description: "search",
        inputSchema: { type: "object", properties: {} },
      },
    ];
    let call = 0;
    const doGenerate = async () =>
      call++ === 0
        ? {
            content: [
              {
                type: "tool-call",
                toolCallId: "call-1",
                toolName: "search_tools",
                input: '{"query":"x"}',
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
    const { warnings } = await captureWarnings(() =>
      runNativeGenerateLoop(
        {
          provider: "probe",
          doGenerate,
          conversation: [{ role: "user", content: "hi" }],
          tools: requestTools,
          toolsRecord: live as Record<string, Tool>,
          modelId: "test-model",
          maxSteps: 3,
          runStep: (invoke) => invoke(),
        },
        [],
      ),
    );
    assertEqual(requestTools.length, 2, "the tool was still declared");
    assertEqual(
      JSON.stringify(requestTools[1]),
      JSON.stringify({
        type: "function",
        name: "broken_lazy",
        description: "broken",
        inputSchema: { type: "object", properties: {} },
      }),
      "with the empty object schema",
    );
    assert(
      warnings.some((entry) => entry.message.includes("broken_lazy")),
      "and the fallback is warned about, naming the tool",
    );
  });

  // validateToolInput reads `safeParse` off the tool's input schema. A schema
  // that is not an object (a host's hand-built tool, or a lazy schema that
  // resolves to a primitive) used to throw a TypeError on the `in` check and
  // take the whole turn down; the tool has no validator to ask, so it runs.
  for (const [label, inputSchema] of [
    ["a string", "not-a-schema"],
    ["a number", 7],
    ["a lazy schema that resolves to a string", () => "not-a-schema"],
  ] as const) {
    await test(`generate loop: a tool whose input schema is ${label} runs instead of crashing the turn`, async () => {
      let executed = 0;
      const rejected: string[] = [];
      const record = Object.create(null) as Record<string, unknown>;
      record.probe_tool = {
        description: "probe",
        inputSchema,
        execute: async () => {
          executed += 1;
          return { ok: true };
        },
      };
      let call = 0;
      const doGenerate = async () =>
        call++ === 0
          ? {
              content: [
                {
                  type: "tool-call",
                  toolCallId: "call-1",
                  toolName: "probe_tool",
                  input: '{"query":"x"}',
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
      await runNativeGenerateLoop(
        {
          provider: "probe",
          doGenerate,
          conversation: [{ role: "user", content: "hi" }],
          tools: [
            {
              type: "function",
              name: "probe_tool",
              description: "probe",
              inputSchema: { type: "object", properties: {} },
            },
          ],
          toolsRecord: record as Record<string, Tool>,
          onRejectedToolCall: (name) => {
            rejected.push(name);
          },
          modelId: "test-model",
          maxSteps: 3,
          runStep: (invoke) => invoke(),
        },
        [],
      );
      assertEqual(executed, 1, "the tool ran once");
      assertEqual(rejected.length, 0, "the call was not rejected");
    });
  }
});
