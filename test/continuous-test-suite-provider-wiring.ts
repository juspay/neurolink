#!/usr/bin/env tsx
import "dotenv/config";

/**
 * Continuous Test Suite — Provider Wiring
 *
 * No-API regression coverage for the Tier A provider bug fixes (plan 01):
 * credential-key resolution, HuggingFace sdk forwarding, the public
 * getAvailableProviders()/isValidProvider() surface, the setup wizard's
 * generic fallback, local-runtime health probes, boundary-aware image-model
 * dispatch, Replicate credential naming, and the getBestProvider() health
 * check removal. Each test() block below corresponds to one numbered task
 * in docs/superpowers/plans/2026-08-15-01-tier-a-bug-fixes.md.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-provider-wiring.ts
 *      pnpm run test:provider-wiring
 */
import { createServer, type Server } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type { NeurolinkCredentials } from "../src/lib/types/index.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("Provider Wiring");

// A compile-time-verified enumeration of every NeurolinkCredentials key. If a
// key is renamed/removed in NeurolinkCredentials, this literal fails to
// typecheck, so it can't silently drift from the real type.
const KNOWN_CREDENTIAL_KEYS = {
  openai: undefined,
  anthropic: undefined,
  googleAiStudio: undefined,
  vertex: undefined,
  bedrock: undefined,
  sagemaker: undefined,
  azure: undefined,
  mistral: undefined,
  huggingFace: undefined,
  openrouter: undefined,
  litellm: undefined,
  openaiCompatible: undefined,
  ollama: undefined,
  deepseek: undefined,
  nvidiaNim: undefined,
  lmStudio: undefined,
  llamacpp: undefined,
  xai: undefined,
  groq: undefined,
  cohere: undefined,
  together: undefined,
  fireworks: undefined,
  perplexity: undefined,
  cloudflare: undefined,
  replicate: undefined,
  voyage: undefined,
  jina: undefined,
  stability: undefined,
  ideogram: undefined,
  recraft: undefined,
} satisfies Record<keyof NeurolinkCredentials, undefined>;

await test("every registered AIProviderName resolves to a real NeurolinkCredentials key", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  const { ProviderFactory, resolveCredentialKey } =
    await import("../dist/factories/providerFactory.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");

  const knownKeys = new Set(Object.keys(KNOWN_CREDENTIAL_KEYS));
  const providerNames = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );

  for (const name of providerNames) {
    assert(
      ProviderFactory.hasProvider(name),
      `provider not registered: ${name}`,
    );
    const credKey = resolveCredentialKey(name);
    assert(
      knownKeys.has(credKey),
      `resolveCredentialKey produced an unknown NeurolinkCredentials key for provider ${name}`,
    );
  }
});

await test("HuggingFace factory forwards the sdk instance through to BaseProvider", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();
  const { ProviderFactory } =
    await import("../dist/factories/providerFactory.js");

  const fakeSdk = { __fakeNeuroLinkSdk: true };
  const provider = await ProviderFactory.createProvider(
    "huggingface",
    "some-model",
    fakeSdk,
    undefined,
    { huggingFace: { apiKey: "hf_test_key" } },
  );

  const internal = provider as unknown as { neurolink?: unknown };
  assert(
    internal.neurolink === fakeSdk,
    "expected HuggingFaceProvider to forward the sdk instance to BaseProvider",
  );
});

await test("getAvailableProviders returns all 30 canonical providers, not the historical 10", async () => {
  const { getAvailableProviders } = await import("../dist/index.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");

  const result = getAvailableProviders();
  const expected = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );

  assert(
    result.length === expected.length,
    `expected getAvailableProviders() to list all ${expected.length} canonical providers, got ${result.length}`,
  );
  for (const previouslyMissing of [
    "together-ai",
    "replicate",
    "cohere",
    "voyage",
    "groq",
  ]) {
    assert(
      result.includes(previouslyMissing),
      `expected getAvailableProviders() to include previously-missing provider ${previouslyMissing}`,
    );
  }
});

await test("isValidProvider recognizes a provider the old hardcoded list missed", async () => {
  const { isValidProvider } = await import("../dist/index.js");
  assert(
    isValidProvider("together-ai") === true,
    "expected isValidProvider to recognize together-ai",
  );
  assert(
    isValidProvider("not-a-real-provider") === false,
    "expected isValidProvider to reject an unknown provider name",
  );
});

await test("getBestProvider returns an explicit provider without an extra health check round-trip", async () => {
  const { getBestProvider } = await import("../dist/utils/providerUtils.js");
  const start = Date.now();
  const result = await getBestProvider("openai");
  const elapsedMs = Date.now() - start;
  assert(
    result === "openai",
    "expected getBestProvider to echo back the explicit provider",
  );
  // The removed health check made a connectivity-capable call. Without it
  // this resolves near-instantly. A generous ceiling avoids flakiness
  // while still catching a reintroduced round-trip, which would be
  // orders of magnitude slower in a no-network test environment.
  assert(
    elapsedMs < 500,
    `expected getBestProvider("openai") to resolve quickly, took ${elapsedMs}ms`,
  );
});

async function startFakeModelsServer(
  modelsPayload: unknown,
  status = 200,
): Promise<{ url: string; close: () => Promise<void> }> {
  const server: Server = createServer((req, res) => {
    if (req.url?.endsWith("/models")) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(modelsPayload));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

await test("Ollama validateConfiguration returns true when /models has entries", async () => {
  const { OllamaProvider } = await import("../dist/providers/ollama/client.js");
  const fake = await startFakeModelsServer({ data: [{ id: "llama3.1" }] });
  try {
    const provider = new OllamaProvider(undefined, undefined, undefined, {
      baseURL: fake.url,
    });
    const ok = await provider.validateConfiguration();
    assert(ok === true, "expected validateConfiguration to report reachable");
  } finally {
    await fake.close();
  }
});

await test("Ollama validateConfiguration returns false when the server is unreachable", async () => {
  const { OllamaProvider } = await import("../dist/providers/ollama/client.js");
  const provider = new OllamaProvider(undefined, undefined, undefined, {
    baseURL: "http://127.0.0.1:1",
  });
  const ok = await provider.validateConfiguration();
  assert(ok === false, "expected validateConfiguration to report unreachable");
});

await test("LM Studio validateConfiguration returns true when /models has entries", async () => {
  const { LMStudioProvider } = await import("../dist/providers/lmStudio.js");
  const fake = await startFakeModelsServer({ data: [{ id: "local-model" }] });
  try {
    const provider = new LMStudioProvider(undefined, undefined, undefined, {
      baseURL: fake.url,
    });
    const ok = await provider.validateConfiguration();
    assert(ok === true, "expected validateConfiguration to report reachable");
  } finally {
    await fake.close();
  }
});

await test("LM Studio validateConfiguration returns false when the server is unreachable", async () => {
  const { LMStudioProvider } = await import("../dist/providers/lmStudio.js");
  const provider = new LMStudioProvider(undefined, undefined, undefined, {
    baseURL: "http://127.0.0.1:1",
  });
  const ok = await provider.validateConfiguration();
  assert(ok === false, "expected validateConfiguration to report unreachable");
});

await test("llama.cpp validateConfiguration returns true when /models has entries", async () => {
  const { LlamaCppProvider } = await import("../dist/providers/llamaCpp.js");
  const fake = await startFakeModelsServer({ data: [{ id: "loaded-model" }] });
  try {
    const provider = new LlamaCppProvider(undefined, undefined, undefined, {
      baseURL: fake.url,
    });
    const ok = await provider.validateConfiguration();
    assert(ok === true, "expected validateConfiguration to report reachable");
  } finally {
    await fake.close();
  }
});

await test("llama.cpp validateConfiguration returns false when the server is unreachable", async () => {
  const { LlamaCppProvider } = await import("../dist/providers/llamaCpp.js");
  const provider = new LlamaCppProvider(undefined, undefined, undefined, {
    baseURL: "http://127.0.0.1:1",
  });
  const ok = await provider.validateConfiguration();
  assert(ok === false, "expected validateConfiguration to report unreachable");
});

await test("delegateToProviderSetup falls back to a generic flow for a previously-unhandled provider", async () => {
  const { delegateToProviderSetup } =
    await import("../dist/cli/commands/setup.js");
  // Previously threw "Unknown provider: together-ai". Should now print the
  // generic data-driven setup flow instead of throwing.
  await delegateToProviderSetup("together-ai");
});

await test("delegateToProviderSetup still throws for a genuinely unknown provider id", async () => {
  const { delegateToProviderSetup } =
    await import("../dist/cli/commands/setup.js");
  let threw = false;
  try {
    await delegateToProviderSetup("not-a-real-provider-xyz");
  } catch {
    threw = true;
  }
  assert(
    threw,
    "expected delegateToProviderSetup to still throw for an unrecognized provider id",
  );
});

await test("EXTRA_PROVIDER_CONFIGS covers exactly the 21 providers unhandled by the wizard's switch", async () => {
  const { EXTRA_PROVIDER_CONFIGS } =
    await import("../dist/cli/commands/setup.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");
  const wizardHandled = new Set([
    "google-ai",
    "openai",
    "anthropic",
    "azure",
    "bedrock",
    "vertex",
    "huggingface",
    "mistral",
    "openrouter",
  ]);
  const allProviders = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );
  const expectedExtra = allProviders.filter((name) => !wizardHandled.has(name));

  assert(
    expectedExtra.length === 21,
    `expected 21 providers unhandled by the wizard switch, got ${expectedExtra.length}`,
  );
  for (const providerId of expectedExtra) {
    assert(
      Boolean(EXTRA_PROVIDER_CONFIGS[providerId]),
      `expected EXTRA_PROVIDER_CONFIGS to have an entry for ${providerId}`,
    );
  }
});

await test("isImageGenerationModel rejects a substring match that isn't at a boundary", async () => {
  const { isImageGenerationModel } = await import("../dist/core/constants.js");
  // "eV_10" contains the Ideogram entry "V_1" as a raw substring, but "e"
  // immediately before it is not a boundary character — the old
  // `.includes()`-based dispatch (removed from baseProvider.ts and
  // replicate.ts in this task) would have wrongly matched this as an
  // image-generation model.
  assert(
    isImageGenerationModel("eV_10") === false,
    "expected a non-boundary substring match to be rejected",
  );
  assert(
    isImageGenerationModel("gpt-image-1") === true,
    "expected an exact known entry to still match",
  );
  assert(
    isImageGenerationModel("black-forest-labs/flux-schnell") === true,
    "expected a boundary-separated prefix match to still match",
  );
});

await test("Replicate credentials accept the new apiKey/baseURL naming", async () => {
  const { ReplicateProvider } = await import("../dist/providers/replicate.js");
  const provider = new ReplicateProvider(undefined, undefined, undefined, {
    apiKey: "r8_test_new_style",
    baseURL: "https://example.test/replicate",
  });
  const config = provider.getConfiguration() as { baseURL?: string };
  assert(
    config.baseURL === "https://example.test/replicate",
    "expected baseURL from the new-style credential field to be used",
  );
  const internal = provider as unknown as { apiToken: string };
  assert(
    internal.apiToken === "r8_test_new_style",
    "expected apiKey from the new-style credential field to be used as the token",
  );
});

await test("Replicate credentials still accept the legacy apiToken/baseUrl naming", async () => {
  const { ReplicateProvider } = await import("../dist/providers/replicate.js");
  const provider = new ReplicateProvider(undefined, undefined, undefined, {
    apiToken: "r8_test_legacy_style",
    baseUrl: "https://legacy.example.test/replicate",
  });
  const config = provider.getConfiguration() as { baseURL?: string };
  assert(
    config.baseURL === "https://legacy.example.test/replicate",
    "expected baseURL from the legacy credential field to still work",
  );
  const internal = provider as unknown as { apiToken: string };
  assert(
    internal.apiToken === "r8_test_legacy_style",
    "expected apiToken from the legacy credential field to still work",
  );
});

await runSuite();
