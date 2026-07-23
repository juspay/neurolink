/**
 * Vitest tests for model-aware provider capabilities.
 *
 * Covers registry lookups, alias and provider matching, provider-specific
 * overrides, and the warning emitted when a request's tools are suppressed.
 *
 * Run:
 *   pnpm exec vitest run test/modelCapabilities.test.ts
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { modelSupports } from "../src/lib/models/modelRegistry.js";
import { HuggingFaceProvider } from "../src/lib/providers/huggingFace.js";
import { OpenAIProvider } from "../src/lib/providers/openAI.js";
import type { StreamResult, Tool } from "../src/lib/types/index.js";
import { logger } from "../src/lib/utils/logger.js";

const openAICredentials = {
  apiKey: "test-key",
  baseURL: "https://example.invalid/v1",
};

async function* emptyStream(): AsyncIterable<{ content: string }> {
  yield* [];
}

class TestOpenAIProvider extends OpenAIProvider {
  protected override async executeStream(): Promise<StreamResult> {
    return {
      stream: emptyStream(),
      provider: "openai",
    };
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("model capability registry", () => {
  it("reports the historical OpenAI reasoning models as not supporting function calling", () => {
    expect(modelSupports("functionCalling", "openai", "o1-mini")).toBe(false);
    expect(modelSupports("functionCalling", "openai", "o1-preview")).toBe(
      false,
    );
  });

  it("reports a registered function-calling model as supported", () => {
    expect(modelSupports("functionCalling", "openai", "gpt-4o")).toBe(true);
  });

  it("defaults to supported when the model is not registered", () => {
    expect(modelSupports("functionCalling", "openai", "future-model")).toBe(
      true,
    );
  });

  it("resolves a model alias before reading the registered capability", () => {
    expect(modelSupports("functionCalling", "openai", "o1-budget")).toBe(false);
  });

  it("does not apply capability data from a different provider", () => {
    expect(modelSupports("functionCalling", "azure", "o1-mini")).toBe(true);
  });
});

describe("provider tool support", () => {
  it("uses registry capability data for OpenAI chat-completions models", () => {
    const unsupportedProvider = new OpenAIProvider(
      "o1-mini",
      undefined,
      undefined,
      openAICredentials,
    );
    const supportedProvider = new OpenAIProvider(
      "gpt-4o",
      undefined,
      undefined,
      openAICredentials,
    );

    expect(unsupportedProvider.supportsTools()).toBe(false);
    expect(supportedProvider.supportsTools()).toBe(true);
  });

  it("keeps a provider-specific model override authoritative over the registry default", () => {
    const provider = new HuggingFaceProvider(
      "microsoft/DialoGPT-medium",
      undefined,
      {
        apiKey: "test-key",
        baseURL: "https://example.invalid",
      },
    );

    expect(provider.supportsTools()).toBe(false);
  });

  it("warns once with the provider and model when requested tools are suppressed", async () => {
    const warnSpy = vi.spyOn(logger, "warn").mockImplementation(() => {});
    const provider = new TestOpenAIProvider(
      "o1-mini",
      undefined,
      undefined,
      openAICredentials,
    );
    const lookupTool = {
      description: "Look up a value",
      inputSchema: {
        type: "object",
        properties: {},
      },
      execute: async () => ({}),
    } as unknown as Tool;

    await provider.stream({
      input: { text: "Use the lookup tool" },
      tools: { lookup: lookupTool },
    });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("openai/o1-mini"),
      expect.objectContaining({
        provider: "openai",
        model: "o1-mini",
      }),
    );
  });
});
