#!/usr/bin/env tsx

/**
 * Continuous Test Suite — System-Message Hoisting (#1024)
 *
 * `extractSystemMessages` partitions system-role messages out of the `messages`
 * array so they ride generateText's top-level `system` option, plus the
 * integration check that GenerationHandler actually applies that partition.
 *
 * Migrated from test/systemMessages.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-system-messages.ts
 */

import { GenerationHandler } from "../src/lib/core/modules/GenerationHandler.js";
import { extractSystemMessages } from "../src/lib/utils/systemMessages.js";
import type {
  AIProviderName,
  ModelMessage,
  TextGenerationOptions,
} from "../src/lib/types/index.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";

const { test, runSuite } = defineSuite("System Message Hoisting");

const CACHE_OPTS = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
};

/** Compare by value; the assertions here are all structural. */
const eq = (actual: unknown, expected: unknown, msg: string): void =>
  assertEqual(JSON.stringify(actual), JSON.stringify(expected), msg);

await test("hoists a single leading system message, preserving providerOptions", () => {
  const input: ModelMessage[] = [
    {
      role: "system",
      content: "You are helpful.",
      providerOptions: CACHE_OPTS,
    },
    { role: "user", content: "hi" },
  ];
  const { system, messages } = extractSystemMessages(input);
  eq(
    system,
    [
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
    ],
    "system must carry providerOptions through",
  );
  eq(
    messages,
    [{ role: "user", content: "hi" }],
    "messages must lose the system turn",
  );
});

await test("returns system: undefined and the original shape when there is no system message", () => {
  const input: ModelMessage[] = [
    { role: "user", content: "hi" },
    { role: "assistant", content: "hello" },
  ];
  const { system, messages } = extractSystemMessages(input);
  assertEqual(system, undefined, "no system message means no system option");
  eq(messages, input, "messages pass through unchanged");
});

await test("hoists multiple system messages, including mid-array ones, in original order", () => {
  const input: ModelMessage[] = [
    { role: "system", content: "first", providerOptions: CACHE_OPTS },
    { role: "user", content: "q1" },
    { role: "system", content: "second" },
    { role: "assistant", content: "a1" },
    { role: "user", content: "q2" },
  ];
  const { system, messages } = extractSystemMessages(input);
  eq(
    system,
    [
      { role: "system", content: "first", providerOptions: CACHE_OPTS },
      { role: "system", content: "second" },
    ],
    "order must be preserved across non-adjacent system turns",
  );
  eq(
    messages,
    [
      { role: "user", content: "q1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "q2" },
    ],
    "conversation order must be preserved",
  );
});

await test("handles an empty input array", () => {
  const { system, messages } = extractSystemMessages([]);
  assertEqual(system, undefined, "empty input yields no system option");
  eq(messages, [], "empty input yields empty messages");
});

await test("passes an all-system array through untouched", () => {
  // A system-only priming call: hoisting every message would leave
  // messages: [], which the AI SDK rejects with InvalidPromptError. The guard
  // preserves the pre-#1024 behaviour and lets the array reach the provider.
  const input: ModelMessage[] = [
    {
      role: "system",
      content: "You are helpful.",
      providerOptions: CACHE_OPTS,
    },
  ];
  const { system, messages } = extractSystemMessages(input);
  assertEqual(system, undefined, "the guard must decline to hoist");
  eq(messages, input, "the array must reach the provider intact");
});

await test("passes a multi-system, no-conversation array through untouched", () => {
  const input: ModelMessage[] = [
    { role: "system", content: "a" },
    { role: "system", content: "b" },
  ];
  const { system, messages } = extractSystemMessages(input);
  assertEqual(
    system,
    undefined,
    "the guard applies to multiple system turns too",
  );
  eq(messages, input, "the array must reach the provider intact");
});

await test("does not mutate the input array", () => {
  const input: ModelMessage[] = [
    { role: "system", content: "sys" },
    { role: "user", content: "hi" },
  ];
  const snapshot = structuredClone(input);
  extractSystemMessages(input);
  eq(input, snapshot, "the caller's array must be left alone");
  assertEqual(input.length, 2, "no elements may be removed in place");
});

await test("GenerationHandler moves system messages into the system option", async () => {
  // The Vitest original reached generateText with vi.mock on
  // utils/generation.ts. That module is a bare re-export of `ai`, which ESM
  // cannot substitute from a test, so GenerationHandler now takes the call as
  // its last constructor argument — the same injection style as its other six
  // dependencies. Production passes nothing and gets the real import.
  const calls: Array<Record<string, unknown>> = [];
  const handler = new GenerationHandler(
    "openai" as AIProviderName,
    "gpt-test",
    () => false, // supportsToolsFn
    () => undefined, // getTelemetryConfigFn
    async () => {}, // handleToolStorageFn
    {
      getEmitterFn: () => undefined,
      generateTextFn: (async (args: Record<string, unknown>) => {
        calls.push(args);
        return {
          text: "ok",
          content: [],
          toolCalls: [],
          toolResults: [],
          steps: [],
          finishReason: "stop",
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          response: { messages: [] },
        };
      }) as never,
    },
  );

  const messages: ModelMessage[] = [
    {
      role: "system",
      content: "You are helpful.",
      providerOptions: CACHE_OPTS,
    },
    { role: "user", content: "hi" },
  ];

  // Only the generation-call arguments are under test, not downstream result
  // shaping. A pre-call failure is re-thrown so its real stack surfaces rather
  // than hiding behind a bare "was not called" assertion.
  let caught: unknown;
  await handler
    .executeGeneration(
      {} as never, // model — passes straight through to the injected call
      messages,
      {},
      {} as TextGenerationOptions,
    )
    .catch((error) => {
      caught = error;
    });
  if (caught && calls.length === 0) {
    throw caught;
  }

  assert(calls.length > 0, "the generation call must have been reached");
  eq(
    calls[0].system,
    [
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
    ],
    "the system turn must arrive via the `system` option",
  );
  eq(
    calls[0].messages,
    [{ role: "user", content: "hi" }],
    "the system turn must not also remain in `messages`",
  );
});

await runSuite();
