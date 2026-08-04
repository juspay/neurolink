#!/usr/bin/env tsx

/**
 * Continuous Test Suite — Model-Aware Provider Capabilities
 *
 * Covers registry lookups, alias and provider matching, provider-specific
 * overrides, and the warning emitted when a request's tools are suppressed.
 *
 * Migrated from test/modelCapabilities.test.ts — see CLAUDE.md: suites run via
 * tsx, not a Vitest runner.
 *
 * Run with: npx tsx test/continuous-test-suite-model-capabilities.ts
 */

import { modelSupports } from "../src/lib/models/modelRegistry.js";
import { HuggingFaceProvider } from "../src/lib/providers/huggingFace/index.js";
import { OpenAIProvider } from "../src/lib/providers/openAI/index.js";
import type { StreamResult, Tool } from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";
import { assert, assertEqual, defineSuite } from "./helpers/harness.js";
import { stub, withStubs } from "./helpers/stubs.js";

const { test, runSuite } = defineSuite("Model Capability Registry");

const openAICredentials = {
  apiKey: "test-key",
  baseURL: "https://example.invalid/v1",
};

async function* emptyStream(): AsyncIterable<{ content: string }> {
  yield* [];
}

/** Stops the stream at the provider boundary so no network call is attempted. */
class TestOpenAIProvider extends OpenAIProvider {
  protected override async executeStream(): Promise<StreamResult> {
    return { stream: emptyStream(), provider: "openai" };
  }
}

await test("historical OpenAI reasoning models do not support function calling", () => {
  assert(
    !modelSupports("functionCalling", "openai", "o1-mini"),
    "o1-mini should be registered as not supporting function calling",
  );
  assert(
    !modelSupports("functionCalling", "openai", "o1-preview"),
    "o1-preview should be registered as not supporting function calling",
  );
});

await test("a registered function-calling model is reported as supported", () => {
  assert(
    modelSupports("functionCalling", "openai", "gpt-4o"),
    "gpt-4o supports function calling",
  );
});

await test("defaults to supported when the model is not registered", () => {
  assert(
    modelSupports("functionCalling", "openai", "future-model"),
    "an unknown model should fail open to supported",
  );
});

await test("resolves a model alias before reading the registered capability", () => {
  assert(
    !modelSupports("functionCalling", "openai", "o1-budget"),
    "the alias should resolve to o1-mini's capability",
  );
});

await test("does not apply capability data from a different provider", () => {
  // Capability data is keyed by provider: azure's o1-mini is a different
  // deployment and must not inherit openai's restriction.
  assert(
    modelSupports("functionCalling", "azure", "o1-mini"),
    "azure should not inherit the openai entry",
  );
});

await test("OpenAI chat-completions models read tool support from the registry", () => {
  const unsupported = new OpenAIProvider(
    "o1-mini",
    undefined,
    undefined,
    openAICredentials,
  );
  const supported = new OpenAIProvider(
    "gpt-4o",
    undefined,
    undefined,
    openAICredentials,
  );
  assert(!unsupported.supportsTools(), "o1-mini should report no tool support");
  assert(supported.supportsTools(), "gpt-4o should report tool support");
});

await test("a provider-specific override stays authoritative over the registry default", () => {
  const provider = new HuggingFaceProvider(
    "microsoft/DialoGPT-medium",
    undefined,
    { apiKey: "test-key", baseURL: "https://example.invalid" },
  );
  assert(
    !provider.supportsTools(),
    "the HuggingFace override should beat the registry default",
  );
});

await test("warns exactly once with the provider and model when tools are suppressed", async () => {
  const warn = stub(logger, "warn", () => undefined);
  await withStubs([warn], async () => {
    const provider = new TestOpenAIProvider(
      "o1-mini",
      undefined,
      undefined,
      openAICredentials,
    );
    const lookupTool = {
      description: "Look up a value",
      inputSchema: { type: "object", properties: {} },
      execute: async () => ({}),
    } as unknown as Tool;

    await provider.stream({
      input: { text: "Use the lookup tool" },
      tools: { lookup: lookupTool },
    });

    // Once, not "at least once": a warning per suppressed tool would spam the
    // log for a request carrying a large tool set.
    assertEqual(warn.callCount, 1, "exactly one suppression warning expected");
    const [message, context] = warn.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    assert(
      typeof message === "string" && message.includes("openai/o1-mini"),
      `warning should name provider/model, got: ${String(message)}`,
    );
    assertEqual(context?.provider, "openai", "context.provider");
    assertEqual(context?.model, "o1-mini", "context.model");
  });
});

await runSuite();
