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
import { z } from "zod";
import { z as z3 } from "zod/v3";
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

  // A plain z.date() is described to the model as a date-time string, because
  // JSON has no Date, so the model sends a string. The call used to be
  // rejected at validation with "expected date".
  const runDateTool = async (
    inputSchema: unknown,
    args: Record<string, unknown>,
  ) => {
    let received: unknown;
    const rejected: string[] = [];
    let rejectedMessage = "";
    const record = Object.create(null) as Record<string, unknown>;
    record.date_tool = {
      description: "probe",
      inputSchema,
      execute: async (input: unknown) => {
        received = input;
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
                toolName: "date_tool",
                input: JSON.stringify(args),
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
            name: "date_tool",
            description: "probe",
            inputSchema: { type: "object", properties: {} },
          },
        ],
        toolsRecord: record as Record<string, Tool>,
        onRejectedToolCall: (name, failure) => {
          rejected.push(name);
          rejectedMessage = failure;
        },
        modelId: "test-model",
        maxSteps: 3,
        runStep: (invoke) => invoke(),
      },
      [],
    );
    return { received, rejected, rejectedMessage };
  };

  await test("generate loop: a date-time string for a plain z.date() reaches the tool as a Date", async () => {
    const { received, rejected } = await runDateTool(
      z.object({
        day: z.date(),
        items: z.array(z.object({ at: z.date().optional() })),
        name: z.string(),
      }),
      {
        day: "2026-11-07T10:00:00Z",
        items: [{ at: "2026-11-08" }, {}],
        name: "x",
      },
    );
    assertEqual(rejected.length, 0, "the call was rejected");
    const got = received as {
      day: unknown;
      items: Array<{ at?: unknown }>;
      name: string;
    };
    assert(got.day instanceof Date, "day should arrive as a Date");
    assertEqual(
      (got.day as Date).toISOString(),
      "2026-11-07T10:00:00.000Z",
      "day value",
    );
    assert(got.items[0].at instanceof Date, "nested date should be a Date");
    assertEqual(
      (got.items[0].at as Date).toISOString(),
      "2026-11-08T00:00:00.000Z",
      "nested date value",
    );
    assertEqual(got.items[1].at, undefined, "an absent optional stays absent");
    assertEqual(got.name, "x", "other fields are untouched");
  });

  await test("generate loop: a string that is not a date, or another mismatch, is still rejected", async () => {
    const notADate = await runDateTool(z.object({ day: z.date() }), {
      day: "next tuesday",
    });
    assertEqual(notADate.rejected.length, 1, "a non-date string was accepted");
    assertEqual(notADate.received, undefined, "the tool must not run");
    assert(
      /day/i.test(notADate.rejectedMessage) &&
        /date/i.test(notADate.rejectedMessage),
      `the rejection should name the date field, got: ${notADate.rejectedMessage}`,
    );
    const otherField = await runDateTool(
      z.object({ day: z.date(), count: z.number() }),
      { day: "2026-11-07T10:00:00Z", count: "three" },
    );
    assertEqual(otherField.rejected.length, 1, "a bad number was accepted");
    assertEqual(otherField.received, undefined, "the tool must not run");
    assert(
      /count/i.test(otherField.rejectedMessage) &&
        /number/i.test(otherField.rejectedMessage),
      `the rejection should name the count mismatch, got: ${otherField.rejectedMessage}`,
    );
  });

  await test("generate loop: an impossible calendar date is rejected, not rolled over", async () => {
    const r = await runDateTool(z.object({ day: z.date() }), {
      day: "2026-02-31",
    });
    assertEqual(r.rejected.length, 1, "2026-02-31 was accepted");
    assertEqual(r.received, undefined, "the tool must not run");
  });

  await test("generate loop: a date that parses but breaks .min() is rejected for that reason", async () => {
    const r = await runDateTool(
      z.object({ day: z.date().min(new Date("2030-01-01")) }),
      { day: "2026-01-01T00:00:00Z" },
    );
    assertEqual(r.rejected.length, 1, "the early date was accepted");
    assert(
      /too_small|too small|>=/i.test(r.rejectedMessage),
      "the error should name the minimum",
    );
  });

  await test("generate loop: a preprocessed set of dates is converted, and a schema error survives an uncloneable input", async () => {
    const set = await runDateTool(
      z.object({
        days: z.preprocess(
          (v) => (Array.isArray(v) ? new Set(v) : v),
          z.set(z.date()),
        ),
      }),
      { days: ["2026-11-07T10:00:00Z", "2026-11-08"] },
    );
    assertEqual(set.rejected.length, 0, "the set was rejected");
    const days = (set.received as { days: Set<unknown> }).days;
    assert(days instanceof Set && days.size === 2, "two dates expected");
    // The preprocess writes a function onto the input object itself, which
    // structuredClone cannot copy.
    const bad = await runDateTool(
      z.object({
        day: z.date(),
        n: z.preprocess(
          (v) => {
            (v as Record<string, unknown>).f = () => 1;
            return v;
          },
          z.object({ a: z.number() }),
        ),
      }),
      { day: "2026-11-07T10:00:00Z", n: { a: "x" } },
    );
    assertEqual(bad.rejected.length, 1, "the bad call was accepted");
    assert(
      !/threw/i.test(bad.rejectedMessage),
      "the schema error was replaced",
    );
  });

  await test("generate loop: a year below 100 is a valid date", async () => {
    const r = await runDateTool(z.object({ day: z.date() }), {
      day: "0099-11-07T10:00:00Z",
    });
    assertEqual(r.rejected.length, 0, "year 0099 was rejected");
    assertEqual(
      (r.received as { day: Date }).day.toISOString(),
      "0099-11-07T10:00:00.000Z",
      "year 0099 value",
    );
  });

  await test("generate loop: a root z.date() and a date inside a union are converted", async () => {
    const root = await runDateTool(z.date(), "2026-11-07T10:00:00Z" as never);
    assertEqual(root.rejected.length, 0, "a root date was rejected");
    assert(root.received instanceof Date, "a root date should be a Date");
    const union = await runDateTool(
      z.object({ d: z.union([z.date(), z.number()]) }),
      { d: "2026-11-07T10:00:00Z" },
    );
    assertEqual(union.rejected.length, 0, "a union date was rejected");
    assert(
      (union.received as { d: unknown }).d instanceof Date,
      "a union date should be a Date",
    );
    const number = await runDateTool(
      z.object({ d: z.union([z.date(), z.number()]) }),
      { d: 5 },
    );
    assertEqual(number.rejected.length, 0, "the number branch was rejected");
    assertEqual((number.received as { d: unknown }).d, 5, "the number stays");
  });

  await test("generate loop: dates inside a string a preprocess parses are not converted", async () => {
    // The date's path does not exist in the input (it is inside a JSON
    // string), so there is nothing to rewrite; the call fails with the schema's
    // own error, and z.coerce.date() is the way to accept it.
    const r = await runDateTool(
      z.object({
        p: z.preprocess(
          (v) => (typeof v === "string" ? JSON.parse(v) : v),
          z.object({ d: z.date() }),
        ),
      }),
      { p: '{"d":"2026-11-07T10:00:00Z"}' },
    );
    assertEqual(r.rejected.length, 1, "the call should be rejected");
    assertEqual(r.received, undefined, "the tool must not run");
  });

  await test("generate loop: a Zod 3 union of a date and a number accepts a date string", async () => {
    const r = await runDateTool(
      z3.object({ d: z3.union([z3.date(), z3.number()]) }),
      { d: "2026-11-07T10:00:00Z" },
    );
    assertEqual(r.rejected.length, 0, "a Zod 3 union date was rejected");
    assert(
      (r.received as { d: unknown }).d instanceof Date,
      "a Zod 3 union date should be a Date",
    );
  });

  await test("generate loop: converting a date leaves class instances elsewhere in the input intact", async () => {
    class Account {
      constructor(readonly id: string) {}
    }
    const record = Object.create(null) as Record<string, unknown>;
    record.date_tool = {
      description: "probe",
      inputSchema: z.object({
        owner: z.instanceof(Account),
        day: z.date(),
      }),
      execute: async () => ({ ok: true }),
    };
    const { validateToolInput } =
      await import("../src/lib/core/nativeGenerateLoop.js");
    const owner = new Account("a-1");
    const validated = await validateToolInput(record.date_tool as Tool, {
      owner,
      day: "2026-11-07T10:00:00Z",
    });
    assertEqual(validated.error, undefined, "the call was rejected");
    const got = validated.input as { owner: unknown; day: unknown };
    assert(got.owner === owner, "the instance should be the same object");
    assert(got.day instanceof Date, "the date should be converted");
  });

  await test("generate loop: union branches that want dates in different fields are each tried on their own", async () => {
    const schema = z.union([
      z.object({ kind: z.literal("a"), at: z.date() }),
      z.object({ kind: z.literal("b"), until: z.date() }),
    ]);
    const a = await runDateTool(schema, {
      kind: "a",
      at: "2026-11-07T10:00:00Z",
    });
    assertEqual(a.rejected.length, 0, "branch a was rejected");
    assert((a.received as { at: unknown }).at instanceof Date, "a.at");
    const b = await runDateTool(schema, {
      kind: "b",
      until: "2026-11-08T10:00:00Z",
    });
    assertEqual(b.rejected.length, 0, "branch b was rejected");
    assert((b.received as { until: unknown }).until instanceof Date, "b.until");
  });

  await test("generate loop: many independent unions do not lose the one usable conversion to the candidate cap", async () => {
    const branch = z.union([
      z.object({ kind: z.literal("a"), a: z.date() }),
      z.object({ kind: z.literal("b"), b: z.date() }),
    ]);
    const r = await runDateTool(
      z.object({
        u1: branch,
        u2: branch,
        u3: branch,
        u4: branch,
        u5: branch,
        u6: branch,
        u7: branch,
      }),
      Object.fromEntries(
        [1, 2, 3, 4, 5, 6, 7].map((i) => [
          `u${i}`,
          {
            kind: "b",
            a: "2026-11-06T10:00:00Z",
            b: "2026-11-07T10:00:00Z",
          },
        ]),
      ),
    );
    assertEqual(r.rejected.length, 0, "the call was rejected");
    const got = r.received as Record<string, { kind: string; b?: unknown }>;
    for (const i of [1, 2, 3, 4, 5, 6, 7]) {
      const member = got[`u${i}`];
      assertEqual(member.kind, "b", `u${i} should take the second branch`);
      assert(member.b instanceof Date, `u${i}.b should be a Date`);
      assertEqual(
        (member.b as Date).toISOString(),
        "2026-11-07T10:00:00.000Z",
        `u${i}.b value`,
      );
    }
  });

  await test("generate loop: a set that accepts a date or a sentinel converts the dates and keeps the sentinel", async () => {
    const r = await runDateTool(
      z.object({
        days: z.preprocess(
          (v) => (Array.isArray(v) ? new Set(v) : v),
          z.set(z.union([z.date(), z.literal("ongoing")])),
        ),
      }),
      { days: ["2026-11-07T10:00:00Z", "ongoing"] },
    );
    assertEqual(r.rejected.length, 0, "the set was rejected");
    const days = [...(r.received as { days: Set<unknown> }).days];
    assert(
      days.some((d) => d instanceof Date),
      "the date should be converted",
    );
    assert(days.includes("ongoing"), "the sentinel should be kept");
    assertEqual(
      JSON.stringify(
        days
          .filter((d): d is Date => d instanceof Date)
          .map((d) => d.toISOString()),
      ),
      '["2026-11-07T10:00:00.000Z"]',
      "the converted member value",
    );
  });

  await test("generate loop: an unrelated throwing getter on the input does not reject a convertible date", async () => {
    const { validateToolInput } =
      await import("../src/lib/core/nativeGenerateLoop.js");
    const input: Record<string, unknown> = { day: "2026-11-07T10:00:00Z" };
    Object.defineProperty(input, "trap", {
      enumerable: true,
      get() {
        throw new Error("getter ran");
      },
    });
    const validated = await validateToolInput(
      { inputSchema: z.object({ day: z.date() }) } as unknown as Tool,
      input,
    );
    assertEqual(validated.error, undefined, "the call was rejected");
    assert(
      (validated.input as { day: unknown }).day instanceof Date,
      "the date should be converted",
    );
  });

  await test("generate loop: a reading whose retry throws does not stop the readings after it", async () => {
    const r = await runDateTool(
      z.union([
        z.object({ at: z.date(), until: z.string() }).refine(() => {
          throw new Error("cannot take a Date");
        }),
        z.object({ at: z.string(), until: z.date() }),
      ]),
      { at: "2026-11-07T10:00:00Z", until: "2026-11-08T10:00:00Z" },
    );
    assertEqual(r.rejected.length, 0, "the call was rejected");
    assert(
      (r.received as { until: unknown }).until instanceof Date,
      "the second reading should have been used",
    );
  });

  await test("generate loop: a set whose date branch rejects a converted literal keeps the literal", async () => {
    // 2099-01-01 as a Date breaks the max, so the only reading that validates
    // leaves that member as the string the schema accepts as a literal.
    const r = await runDateTool(
      z.object({
        days: z.preprocess(
          (v) => (Array.isArray(v) ? new Set(v) : v),
          z.set(
            z.union([
              z.date().max(new Date("2030-01-01")),
              z.literal("2099-01-01"),
            ]),
          ),
        ),
      }),
      { days: ["2026-11-07T10:00:00Z", "2099-01-01"] },
    );
    assertEqual(r.rejected.length, 0, "the set was rejected");
    const days = [...(r.received as { days: Set<unknown> }).days];
    assert(
      days.some((d) => d instanceof Date),
      "the date should be converted",
    );
    assert(
      days.includes("2099-01-01"),
      "the literal should be kept as a string",
    );
    assertEqual(
      JSON.stringify(
        days
          .filter((d): d is Date => d instanceof Date)
          .map((d) => d.toISOString()),
      ),
      '["2026-11-07T10:00:00.000Z"]',
      "the converted member value",
    );
  });

  await test("generate loop: a frozen property on the input does not stop a date conversion", async () => {
    const { validateToolInput } =
      await import("../src/lib/core/nativeGenerateLoop.js");
    const input = Object.freeze({
      day: "2026-11-07T10:00:00Z",
      note: "x",
    });
    const validated = await validateToolInput(
      {
        inputSchema: z.object({ day: z.date(), note: z.string() }),
      } as unknown as Tool,
      input,
    );
    assertEqual(validated.error, undefined, "the call was rejected");
    assert(
      (validated.input as { day: unknown }).day instanceof Date,
      "the date should be converted",
    );
  });

  await test("generate loop: validating an input leaves the caller's date strings unchanged, whether it passes or fails", async () => {
    const { validateToolInput } =
      await import("../src/lib/core/nativeGenerateLoop.js");
    const tool = {
      inputSchema: z.object({
        day: z.date(),
        items: z.array(z.object({ at: z.date() })),
        count: z.number(),
      }),
    } as unknown as Tool;
    const input = {
      day: "2026-11-07T10:00:00Z",
      items: [{ at: "2026-11-08" }],
      count: 1,
    };
    const ok = await validateToolInput(tool, input);
    assertEqual(ok.error, undefined, "the valid call was rejected");
    assert(
      (ok.input as { day: unknown }).day instanceof Date,
      "the validated copy should hold a Date",
    );
    assertEqual(input.day, "2026-11-07T10:00:00Z", "day changed after success");
    assertEqual(input.items[0].at, "2026-11-08", "at changed after success");
    const bad = { ...input, count: "three" as unknown as number };
    const failed = await validateToolInput(tool, bad);
    assert(failed.error !== undefined, "the invalid call was accepted");
    assertEqual(bad.day, "2026-11-07T10:00:00Z", "day changed after failure");
    assertEqual(bad.items[0].at, "2026-11-08", "at changed after failure");
  });

  await test("agent: a date-time string for a plain z.date() input passes the agent's validation", async () => {
    const { Agent } = await import("../src/lib/agent/agent.js");
    const reached = "stub generate reached";
    const stub = {
      generate: async () => {
        throw new Error(reached);
      },
      stream: async () => {
        throw new Error(reached);
      },
    };
    const agent = new Agent(
      {
        id: "date-agent",
        name: "Date agent",
        description: "takes a date",
        instructions: "x",
        inputSchema: z.object({ day: z.date() }),
      },
      stub as never,
    );
    const accepted = (await agent.execute({
      day: "2026-11-07T10:00:00Z",
    })) as { error?: string };
    assert(
      !(accepted.error ?? "").includes("Input validation failed"),
      "a valid date string was rejected by the agent's validation",
    );
    const rejected = (await agent.execute({ day: "next tuesday" })) as {
      error?: string;
    };
    assert(
      (rejected.error ?? "").includes("Input validation failed"),
      "a non-date string must still be rejected by the agent's validation",
    );
    const lastError = async (day: string): Promise<string> => {
      let error = "";
      for await (const chunk of agent.stream({ day })) {
        if (chunk.type === "agent-error") {
          error = String((chunk as { error?: unknown }).error ?? "");
        }
      }
      return error;
    };
    const streamAccepted = await lastError("2026-11-07T10:00:00Z");
    assert(
      streamAccepted.includes(reached),
      `stream() should pass validation and reach the stub, got: ${streamAccepted}`,
    );
    const streamRejected = await lastError("next tuesday");
    assert(
      streamRejected.includes("Input validation failed"),
      `stream() must reject a non-date string, got: ${streamRejected}`,
    );
  });

  await test("generate loop: a set of more than eight dates converts every member", async () => {
    const days = Array.from(
      { length: 12 },
      (_, i) => `2026-11-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
    );
    const r = await runDateTool(
      z.object({
        days: z.preprocess(
          (v) => (Array.isArray(v) ? new Set(v) : v),
          z.set(z.date()),
        ),
      }),
      { days },
    );
    assertEqual(r.rejected.length, 0, "the set was rejected");
    assertEqual(
      (r.received as { days: Set<unknown> }).days.size,
      12,
      "all twelve members",
    );
  });

  await test("generate loop: several date-shaped literals in a set are all preserved", async () => {
    const r = await runDateTool(
      z.object({
        days: z.preprocess(
          (v) => (Array.isArray(v) ? new Set(v) : v),
          z.set(
            z.union([
              z.date().max(new Date("2030-01-01")),
              z.literal("2099-01-01"),
              z.literal("2098-01-01"),
            ]),
          ),
        ),
      }),
      { days: ["2026-11-07T10:00:00Z", "2099-01-01", "2098-01-01"] },
    );
    assertEqual(r.rejected.length, 0, "the set was rejected");
    const days = [...(r.received as { days: Set<unknown> }).days];
    assert(
      days.some((d) => d instanceof Date),
      "the date should be converted",
    );
    assert(
      days.includes("2099-01-01") && days.includes("2098-01-01"),
      "both literals should be kept",
    );
  });

  await test("generate loop: seven unions whose branches both want a date still find the one reading that validates", async () => {
    const branch = z.union([
      z.object({ kind: z.literal("a"), at: z.date() }),
      z.object({ kind: z.literal("b"), at: z.date() }),
    ]);
    const item = { kind: "b", at: "2026-11-07T10:00:00Z" };
    const r = await runDateTool(
      z.object({
        u1: branch,
        u2: branch,
        u3: branch,
        u4: branch,
        u5: branch,
        u6: branch,
        u7: branch,
      }),
      { u1: item, u2: item, u3: item, u4: item, u5: item, u6: item, u7: item },
    );
    assertEqual(r.rejected.length, 0, "the call was rejected");
  });

  await test("generate loop: an array with a throwing iterator is still converted", async () => {
    const { validateToolInput } =
      await import("../src/lib/core/nativeGenerateLoop.js");
    const days: string[] = ["2026-11-07T10:00:00Z"];
    Object.defineProperty(days, Symbol.iterator, {
      get() {
        throw new Error("iterator ran");
      },
    });
    const validated = await validateToolInput(
      { inputSchema: z.object({ days: z.array(z.date()) }) } as unknown as Tool,
      { days },
    );
    assertEqual(validated.error, undefined, "the call was rejected");
  });

  await test("generate loop: z.coerce.date() and z.string() fields behave as before", async () => {
    const { received, rejected } = await runDateTool(
      z.object({ a: z.coerce.date(), b: z.string() }),
      { a: "2026-11-07T10:00:00Z", b: "2026-11-07T10:00:00Z" },
    );
    assertEqual(rejected.length, 0, "the call was rejected");
    const got = received as { a: unknown; b: unknown };
    assert(got.a instanceof Date, "coerce still yields a Date");
    assertEqual(got.b, "2026-11-07T10:00:00Z", "a string field stays a string");
  });
});
