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
 * ALL-DIST module graph (rule 15, audited rework batch I): this suite
 * predates CLAUDE.md rule 15 (it landed in the plan-01 tier-A purge,
 * ec68f0a5, before upstream a47c4353 introduced the rule) and never carried
 * a rule-15 header. Auditing it against the rule found it already
 * compliant — every runtime import resolves to `../dist/...`. The single
 * `import type { NeurolinkCredentials } from "../src/lib/types/index.js"`
 * is type-only: TypeScript erases it at compile time, so it emits no JS
 * import and contributes no second runtime module graph — it exists purely
 * so `KNOWN_CREDENTIAL_KEYS` fails to typecheck (not silently drifts) if
 * `NeurolinkCredentials` gains/loses/renames a key. No conversion needed;
 * this header documents that finding for future auditors.
 *
 * Run: pnpm run build && npx tsx test/continuous-test-suite-provider-wiring.ts
 *      pnpm run test:provider-wiring
 */
import { createServer, type Server } from "node:http";
import { defineSuite, assert } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import type {
  NeurolinkCredentials,
  CatalogCredentialKey,
} from "../src/lib/types/index.js";
// Type-only (erased at compile time, no second runtime module graph — see
// the ALL-DIST header above): needed only so the fake sdk below can be
// typed as the real `NeuroLink` class instead of an untyped/`any` value.
// Sourced from dist, not src: `ProviderFactory.createProvider` below is
// also imported from dist, and a class with private fields is only
// assignable to the `NeuroLink` type that originates from the same
// declaration — the src and dist declarations are distinct for this
// purpose even though they compile from identical source.
import type { NeuroLink } from "../dist/neurolink.js";

// Fail loudly rather than silently testing a stale build (see distFreshness.ts).
assertDistFresh();

const { test, runSuite } = defineSuite("Provider Wiring");

// A compile-time-verified enumeration of every NeurolinkCredentials key that
// belongs to a NON-catalog provider. If a key is renamed/removed in
// NeurolinkCredentials, or a provider moves into/out of the JSON catalog,
// this literal fails to typecheck (Exclude<> collapses the omitted key set),
// so it can't silently drift from the real type. The 9 catalog providers'
// credential keys (CatalogCredentialKey) are read from the built catalog at
// runtime instead — see the union below.
const KNOWN_CREDENTIAL_KEYS = {
  openai: undefined,
  anthropic: undefined,
  googleAiStudio: undefined,
  vertex: undefined,
  bedrock: undefined,
  sagemaker: undefined,
  azure: undefined,
  huggingFace: undefined,
  openrouter: undefined,
  litellm: undefined,
  openaiCompatible: undefined,
  ollama: undefined,
  deepseek: undefined,
  nvidiaNim: undefined,
  lmStudio: undefined,
  llamacpp: undefined,
  cohere: undefined,
  replicate: undefined,
  voyage: undefined,
  jina: undefined,
  stability: undefined,
  ideogram: undefined,
  recraft: undefined,
} satisfies Record<
  Exclude<keyof NeurolinkCredentials, CatalogCredentialKey>,
  undefined
>;

await test("every registered AIProviderName resolves to a real NeurolinkCredentials key", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();

  const { ProviderFactory, resolveCredentialKey } =
    await import("../dist/factories/providerFactory.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");
  const { CATALOG_JSON_ENTRIES } =
    await import("../dist/providers/catalog/index.generated.js");
  const { catalogCredentialsKey } =
    await import("../dist/providers/catalog/loader.js");

  const knownKeys = new Set([
    ...Object.keys(KNOWN_CREDENTIAL_KEYS),
    ...CATALOG_JSON_ENTRIES.map(catalogCredentialsKey),
  ]);
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

  // `NeuroLink` has private fields, so no object literal is structurally
  // assignable to it (not even via a single `as NeuroLink` — TS rejects it
  // as "neither type sufficiently overlaps"), and a double assertion
  // through `unknown` is disallowed. `createProvider` only ever forwards
  // this value by reference (see the identity check below) and never calls
  // a method on it, so an opaque placeholder object satisfies the real
  // type without a cast: `Object.create` with no generic type argument
  // returns `any`, which an explicitly-typed `const` accepts.
  const fakeSdk: NeuroLink = Object.create(null);
  Object.defineProperty(fakeSdk, "__fakeNeuroLinkSdk", {
    value: true,
    enumerable: true,
  });
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

await test("getAvailableProviders returns every canonical provider, not a stale historical subset", async () => {
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

await test("EXTRA_PROVIDER_CONFIGS covers exactly the providers unhandled by the wizard's switch", async () => {
  const { EXTRA_PROVIDER_CONFIGS } =
    await import("../dist/cli/commands/setup.js");
  const { AIProviderName } = await import("../dist/constants/enums.js");
  const { CATALOG_PROVIDER_IDS } =
    await import("../dist/providers/catalog/index.generated.js");
  const wizardHandled = new Set([
    "google-ai",
    "openai",
    "anthropic",
    "azure",
    "bedrock",
    "vertex",
    "huggingface",
    "mistral", // catalog provider, but still wizard-handled specially
    "openrouter",
  ]);
  const allProviders = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );

  // Total canonical provider count = the 9 JSON-catalog providers + this
  // literal count of hand-registered non-catalog providers (openai,
  // anthropic, google-ai, vertex, bedrock, sagemaker, azure, huggingface,
  // ollama, openrouter, litellm, openai-compatible, deepseek, nvidia-nim,
  // lm-studio, llamacpp, cohere, replicate, voyage, jina, stability,
  // ideogram, recraft). Onboarding a new catalog provider grows
  // CATALOG_PROVIDER_IDS and needs no change here; onboarding a new
  // hand-written provider bumps this literal.
  const NON_CATALOG_PROVIDER_COUNT = 23;
  const totalProviderCount =
    CATALOG_PROVIDER_IDS.length + NON_CATALOG_PROVIDER_COUNT;
  assert(
    allProviders.length === totalProviderCount,
    `expected ${totalProviderCount} canonical providers, got ${allProviders.length}`,
  );

  const expectedExtra = allProviders.filter((name) => !wizardHandled.has(name));
  const expectedExtraCount = totalProviderCount - wizardHandled.size;

  assert(
    expectedExtra.length === expectedExtraCount,
    `expected ${expectedExtraCount} providers unhandled by the wizard switch, got ${expectedExtra.length}`,
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

await test("catalog-provider enum surfaces are byte-identical to the pre-JSON-migration snapshot", async () => {
  const enums = await import("../dist/constants/enums.js");
  // Captured from dist on 2026-08-28, BEFORE the JSON-catalog migration.
  // If this test fails, generated enums drifted from the frozen public
  // surface — fix the codegen or the enumMember overrides, never this
  // literal.
  const frozen: Record<string, Record<string, string>> = {
    GroqModels: {
      LLAMA_3_3_70B_VERSATILE: "llama-3.3-70b-versatile",
      LLAMA_3_1_8B_INSTANT: "llama-3.1-8b-instant",
      GEMMA_2_9B_IT: "gemma2-9b-it",
      MIXTRAL_8X7B_32768: "mixtral-8x7b-32768",
      LLAMA_GUARD_3_8B: "llama-guard-3-8b",
      LLAMA_3_2_90B_VISION_PREVIEW: "llama-3.2-90b-vision-preview",
      LLAMA_3_2_11B_VISION_PREVIEW: "llama-3.2-11b-vision-preview",
    },
    XaiModels: {
      GROK_3: "grok-3",
      GROK_3_MINI: "grok-3-mini",
      GROK_2_LATEST: "grok-2-latest",
      GROK_2_VISION_LATEST: "grok-2-vision-latest",
      GROK_BETA: "grok-beta",
    },
    TogetherAIModels: {
      LLAMA_3_3_70B_INSTRUCT_TURBO: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      LLAMA_3_1_405B_INSTRUCT_TURBO:
        "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      LLAMA_3_1_70B_INSTRUCT_TURBO:
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
      LLAMA_3_1_8B_INSTRUCT_TURBO:
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      MIXTRAL_8X22B_INSTRUCT: "mistralai/Mixtral-8x22B-Instruct-v0.1",
      MIXTRAL_8X7B_INSTRUCT: "mistralai/Mixtral-8x7B-Instruct-v0.1",
      QWEN_2_5_72B_INSTRUCT_TURBO: "Qwen/Qwen2.5-72B-Instruct-Turbo",
      QWEN_2_5_CODER_32B: "Qwen/Qwen2.5-Coder-32B-Instruct",
      DEEPSEEK_R1: "deepseek-ai/DeepSeek-R1",
      DEEPSEEK_V3: "deepseek-ai/DeepSeek-V3",
      GEMMA_2_27B_IT: "google/gemma-2-27b-it",
      WIZARDLM_2_8X22B: "microsoft/WizardLM-2-8x22B",
    },
    FireworksModels: {
      DEEPSEEK_V4_PRO: "accounts/fireworks/models/deepseek-v4-pro",
      GLM_5P1: "accounts/fireworks/models/glm-5p1",
      GLM_5: "accounts/fireworks/models/glm-5",
      KIMI_K2P6: "accounts/fireworks/models/kimi-k2p6",
      KIMI_K2P5: "accounts/fireworks/models/kimi-k2p5",
      GPT_OSS_120B: "accounts/fireworks/models/gpt-oss-120b",
    },
    PerplexityModels: {
      SONAR: "sonar",
      SONAR_PRO: "sonar-pro",
      SONAR_REASONING: "sonar-reasoning",
      SONAR_REASONING_PRO: "sonar-reasoning-pro",
      SONAR_DEEP_RESEARCH: "sonar-deep-research",
    },
    MistralModels: {
      MISTRAL_LARGE_LATEST: "mistral-large-latest",
      MISTRAL_LARGE_2512: "mistral-large-2512",
      MISTRAL_MEDIUM_LATEST: "mistral-medium-latest",
      MISTRAL_MEDIUM_2508: "mistral-medium-2508",
      MISTRAL_SMALL_LATEST: "mistral-small-latest",
      MISTRAL_SMALL_2506: "mistral-small-2506",
      MAGISTRAL_MEDIUM_LATEST: "magistral-medium-latest",
      MAGISTRAL_SMALL_LATEST: "magistral-small-latest",
      MINISTRAL_14B_2512: "ministral-14b-2512",
      MINISTRAL_8B_2512: "ministral-8b-2512",
      MINISTRAL_3B_2512: "ministral-3b-2512",
      CODESTRAL_LATEST: "codestral-latest",
      CODESTRAL_2508: "codestral-2508",
      CODESTRAL_EMBED: "codestral-embed",
      DEVSTRAL_MEDIUM_LATEST: "devstral-medium-latest",
      DEVSTRAL_SMALL_LATEST: "devstral-small-latest",
      PIXTRAL_LARGE: "pixtral-large",
      PIXTRAL_12B: "pixtral-12b",
      VOXTRAL_SMALL_LATEST: "voxtral-small-latest",
      VOXTRAL_MINI_LATEST: "voxtral-mini-latest",
      DEVSTRAL_2: "devstral-2512",
      DEVSTRAL_SMALL_2: "devstral-small-2512",
      MAGISTRAL_MEDIUM_2509: "magistral-medium-2509",
      MAGISTRAL_SMALL_2509: "magistral-small-2509",
      VOXTRAL_MINI_TRANSCRIBE_2: "voxtral-mini-2602",
      MISTRAL_OCR_3: "mistral-ocr-2512",
      MISTRAL_OCR_LATEST: "mistral-ocr-latest",
      MISTRAL_NEMO: "mistral-nemo",
      MISTRAL_EMBED: "mistral-embed",
      MISTRAL_MODERATION_LATEST: "mistral-moderation-latest",
      MISTRAL_SMALL_4: "mistral-small-2603",
      MISTRAL_SMALL_CREATIVE: "mistral-small-creative",
    },
    CloudflareModels: {
      LLAMA_3_3_70B_FAST: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      LLAMA_3_1_70B_INSTRUCT: "@cf/meta/llama-3.1-70b-instruct",
      LLAMA_3_1_8B_FAST: "@cf/meta/llama-3.1-8b-instruct-fast",
      LLAMA_3_2_11B_VISION: "@cf/meta/llama-3.2-11b-vision-instruct",
      MISTRAL_7B_INSTRUCT_V0_2: "@cf/mistral/mistral-7b-instruct-v0.2",
      QWEN_1P5_14B_CHAT_AWQ: "@cf/qwen/qwen1.5-14b-chat-awq",
      GEMMA_2B_IT_LORA: "@cf/google/gemma-2b-it-lora",
    },
    CerebrasModels: {
      GPT_OSS_120B: "gpt-oss-120b",
      GEMMA_4_31B: "gemma-4-31b",
    },
    SambanovaModels: {
      META_LLAMA_3_3_70B_INSTRUCT: "Meta-Llama-3.3-70B-Instruct",
      GPT_OSS_120B: "gpt-oss-120b",
      DEEPSEEK_V3_1: "DeepSeek-V3.1",
      DEEPSEEK_V3_2: "DeepSeek-V3.2",
      MINIMAX_M2_7: "MiniMax-M2.7",
      MINIMAX_M3: "MiniMax-M3",
      GEMMA_4_31B_IT: "gemma-4-31B-it",
    },
  };
  for (const [enumName, members] of Object.entries(frozen)) {
    const actual = (enums as Record<string, unknown>)[enumName] as Record<
      string,
      string
    >;
    assert(actual !== undefined, `enum missing from dist: ${enumName}`);
    for (const [member, value] of Object.entries(members)) {
      assert(
        actual[member] === value,
        `enum member drifted: ${enumName}.${member}`,
      );
    }
  }
  const providerNames = Object.values(
    (enums as { AIProviderName: Record<string, string> }).AIProviderName,
  );
  for (const id of [
    "groq",
    "xai",
    "together-ai",
    "fireworks",
    "perplexity",
    "mistral",
    "cloudflare",
    "cerebras",
    "sambanova",
  ]) {
    assert(
      providerNames.includes(id),
      `AIProviderName missing catalog id: ${id}`,
    );
  }
});

await runSuite();
