/**
 * Unit tests for extractSystemMessages — the partition applied inside
 * GenerationHandler (at the private callGenerateText, reached in the
 * integration test below via the public executeGeneration) so that system
 * prompts ride generateText's top-level `system` option instead of the
 * `messages` array (issue #1024).
 *
 * Run:
 *   pnpm exec vitest run test/systemMessages.test.ts
 */

import { describe, it, expect } from "vitest";
import { extractSystemMessages } from "../src/lib/utils/systemMessages.js";
import type { ModelMessage } from "../src/lib/types/index.js";

const CACHE_OPTS = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
};

describe("extractSystemMessages", () => {
  it("hoists a single leading system message, preserving providerOptions", () => {
    const input: ModelMessage[] = [
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
      { role: "user", content: "hi" },
    ];
    const { system, messages } = extractSystemMessages(input);
    expect(system).toEqual([
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
    ]);
    expect(messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("returns system: undefined and the original array shape when no system message exists", () => {
    const input: ModelMessage[] = [
      { role: "user", content: "hi" },
      { role: "assistant", content: "hello" },
    ];
    const { system, messages } = extractSystemMessages(input);
    expect(system).toBeUndefined();
    expect(messages).toEqual(input);
  });

  it("hoists multiple system messages (incl. mid-array history ones) in original order", () => {
    const input: ModelMessage[] = [
      { role: "system", content: "first", providerOptions: CACHE_OPTS },
      { role: "user", content: "q1" },
      { role: "system", content: "second" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "q2" },
    ];
    const { system, messages } = extractSystemMessages(input);
    expect(system).toEqual([
      { role: "system", content: "first", providerOptions: CACHE_OPTS },
      { role: "system", content: "second" },
    ]);
    expect(messages).toEqual([
      { role: "user", content: "q1" },
      { role: "assistant", content: "a1" },
      { role: "user", content: "q2" },
    ]);
  });

  it("handles an empty input array", () => {
    const { system, messages } = extractSystemMessages([]);
    expect(system).toBeUndefined();
    expect(messages).toEqual([]);
  });

  it("passes an all-system array through untouched (guard against empty messages)", () => {
    // A system-only priming call: hoisting every message would leave
    // messages: [], which the AI SDK rejects with InvalidPromptError. The
    // guard preserves the pre-#1024 behaviour (the array reaches the provider).
    const input: ModelMessage[] = [
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
    ];
    const { system, messages } = extractSystemMessages(input);
    expect(system).toBeUndefined();
    expect(messages).toEqual(input);
  });

  it("passes a multi-system, no-conversation array through untouched", () => {
    const input: ModelMessage[] = [
      { role: "system", content: "a" },
      { role: "system", content: "b" },
    ];
    const { system, messages } = extractSystemMessages(input);
    expect(system).toBeUndefined();
    expect(messages).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input: ModelMessage[] = [
      { role: "system", content: "sys" },
      { role: "user", content: "hi" },
    ];
    const snapshot = structuredClone(input);
    extractSystemMessages(input);
    expect(input).toEqual(snapshot);
    expect(input).toHaveLength(2);
  });
});

// ── integration: GenerationHandler passes system via the system option ──
import { vi } from "vitest";

vi.mock("../src/lib/utils/generation.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/utils/generation.js")>();
  return {
    ...actual,
    generateText: vi.fn().mockResolvedValue({
      text: "ok",
      content: [],
      toolCalls: [],
      toolResults: [],
      steps: [],
      finishReason: "stop",
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      response: { messages: [] },
    }),
  };
});

import { generateText } from "../src/lib/utils/generation.js";
import { GenerationHandler } from "../src/lib/core/modules/GenerationHandler.js";
import type {
  AIProviderName,
  TextGenerationOptions,
} from "../src/lib/types/index.js";

describe("GenerationHandler system-message hoisting (#1024)", () => {
  it("moves system messages out of `messages` into the `system` option, preserving providerOptions", async () => {
    const handler = new GenerationHandler(
      "openai" as AIProviderName,
      "gpt-test",
      () => false, // supportsToolsFn
      () => undefined, // getTelemetryConfigFn
      async () => {}, // handleToolStorageFn
      () => undefined, // getEmitterFn
    );

    const messages: ModelMessage[] = [
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
      { role: "user", content: "hi" },
    ];

    // Only the generateText call arguments are under test, not downstream
    // result shaping. Capture any error but re-throw it if we never reached
    // generateText, so a pre-call failure surfaces its real stack instead of
    // being hidden behind a bare "mock was not called" assertion.
    let caught: unknown;
    await handler
      .executeGeneration(
        {} as never, // model — passes through to the mocked generateText
        messages,
        {},
        {} as TextGenerationOptions,
      )
      .catch((error) => {
        caught = error;
      });

    const mocked = vi.mocked(generateText);
    if (caught && mocked.mock.calls.length === 0) {
      throw caught;
    }
    expect(mocked).toHaveBeenCalled();
    const args = mocked.mock.calls[0][0] as Record<string, unknown>;
    expect(args.system).toEqual([
      {
        role: "system",
        content: "You are helpful.",
        providerOptions: CACHE_OPTS,
      },
    ]);
    expect(args.messages).toEqual([{ role: "user", content: "hi" }]);
  });
});
