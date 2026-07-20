/**
 * Vitest tests for LiteLLM runtime context-window discovery.
 *
 * Covers the runtime override registry in constants/contextWindows.ts and the
 * LiteLLM provider's fire-and-forget `/model/info` discovery that populates it
 * (real per-model `max_input_tokens` instead of the one-size litellm
 * `_default`).
 *
 * Run:
 *   pnpm exec vitest run test/litellmContextWindows.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getContextWindowSize,
  getAvailableInputTokens,
  registerRuntimeContextWindow,
  clearRuntimeContextWindows,
} from "../src/lib/constants/contextWindows.js";
import { LiteLLMProvider } from "../src/lib/providers/litellm.js";

/** Wait until the fire-and-forget discovery promise chain has settled. */
const flushAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

const modelInfoResponse = (
  entries: Array<{ model_name?: string; max_input_tokens?: unknown }>,
) =>
  new Response(
    JSON.stringify({
      data: entries.map((e) => ({
        model_name: e.model_name,
        model_info: { max_input_tokens: e.max_input_tokens },
      })),
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );

describe("runtime context-window registry", () => {
  beforeEach(() => clearRuntimeContextWindows());
  afterEach(() => clearRuntimeContextWindows());

  it("falls back to the static litellm _default when nothing is registered", () => {
    expect(getContextWindowSize("litellm", "glm-private")).toBe(128_000);
  });

  it("prefers a runtime-registered window over the static default", () => {
    registerRuntimeContextWindow("litellm", "glm-private", 262_144);
    expect(getContextWindowSize("litellm", "glm-private")).toBe(262_144);
    // Other models on the same provider still use the static default.
    expect(getContextWindowSize("litellm", "other-model")).toBe(128_000);
  });

  it("feeds discovered windows into available-input budgeting", () => {
    registerRuntimeContextWindow("litellm", "glm-private", 262_144);
    const available = getAvailableInputTokens("litellm", "glm-private", 16_000);
    expect(available).toBe(262_144 - 16_000);
  });

  it("ignores non-positive and non-finite windows", () => {
    registerRuntimeContextWindow("litellm", "glm-private", 0);
    registerRuntimeContextWindow("litellm", "glm-private", -5);
    registerRuntimeContextWindow("litellm", "glm-private", Number.NaN);
    expect(getContextWindowSize("litellm", "glm-private")).toBe(128_000);
  });

  it("lets a later registration refresh an earlier one", () => {
    registerRuntimeContextWindow("litellm", "glm-private", 100_000);
    registerRuntimeContextWindow("litellm", "glm-private", 262_144);
    expect(getContextWindowSize("litellm", "glm-private")).toBe(262_144);
  });
});

describe("LiteLLMProvider /model/info discovery", () => {
  const originalFetch = globalThis.fetch;
  let baseUrlCounter = 0;

  // Each test uses a unique baseURL so the provider's per-URL fetch dedupe
  // never suppresses a later test's discovery.
  const uniqueBaseURL = () =>
    `http://litellm-test-${++baseUrlCounter}.local:4000`;

  beforeEach(() => clearRuntimeContextWindows());
  afterEach(() => {
    globalThis.fetch = originalFetch;
    clearRuntimeContextWindows();
    vi.restoreAllMocks();
  });

  it("registers max_input_tokens per model group from /model/info", async () => {
    const fetchSpy = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input.toString();
      expect(url.endsWith("/model/info")).toBe(true);
      return modelInfoResponse([
        { model_name: "glm-private", max_input_tokens: 262_144 },
        { model_name: "private-large", max_input_tokens: 1_000_000 },
      ]);
    });
    globalThis.fetch = fetchSpy as typeof fetch;

    new LiteLLMProvider("glm-private", undefined, undefined, {
      apiKey: "k",
      baseURL: uniqueBaseURL(),
    });
    await flushAsync();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(getContextWindowSize("litellm", "glm-private")).toBe(262_144);
    expect(getContextWindowSize("litellm", "private-large")).toBe(1_000_000);
  });

  it("keeps the SMALLEST advertised window when a model group has several deployments", async () => {
    globalThis.fetch = (async () =>
      modelInfoResponse([
        { model_name: "glm-private", max_input_tokens: 262_144 },
        { model_name: "glm-private", max_input_tokens: 131_072 },
      ])) as typeof fetch;

    new LiteLLMProvider("glm-private", undefined, undefined, {
      apiKey: "k",
      baseURL: uniqueBaseURL(),
    });
    await flushAsync();

    expect(getContextWindowSize("litellm", "glm-private")).toBe(131_072);
  });

  it("skips malformed entries and keeps valid ones", async () => {
    globalThis.fetch = (async () =>
      modelInfoResponse([
        { model_name: "glm-private", max_input_tokens: 262_144 },
        { model_name: "bad-model", max_input_tokens: "not-a-number" },
        { model_name: "", max_input_tokens: 9000 },
        { max_input_tokens: 9000 },
      ])) as typeof fetch;

    new LiteLLMProvider("glm-private", undefined, undefined, {
      apiKey: "k",
      baseURL: uniqueBaseURL(),
    });
    await flushAsync();

    expect(getContextWindowSize("litellm", "glm-private")).toBe(262_144);
    expect(getContextWindowSize("litellm", "bad-model")).toBe(128_000);
  });

  it("degrades cleanly to the static default when /model/info fails", async () => {
    globalThis.fetch = (async () =>
      new Response("nope", { status: 404 })) as typeof fetch;

    new LiteLLMProvider("glm-private", undefined, undefined, {
      apiKey: "k",
      baseURL: uniqueBaseURL(),
    });
    await flushAsync();

    expect(getContextWindowSize("litellm", "glm-private")).toBe(128_000);
  });

  it("dedupes discovery per base URL within the cache period", async () => {
    const fetchSpy = vi.fn(
      async () =>
        modelInfoResponse([
          { model_name: "glm-private", max_input_tokens: 262_144 },
        ]) as Response,
    );
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const baseURL = uniqueBaseURL();
    new LiteLLMProvider("glm-private", undefined, undefined, {
      apiKey: "k",
      baseURL,
    });
    new LiteLLMProvider("private-large", undefined, undefined, {
      apiKey: "k",
      baseURL,
    });
    await flushAsync();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
