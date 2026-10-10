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
import { defineSuite, assert, Skip, runCLI } from "./helpers/harness.js";
import { assertDistFresh } from "./helpers/distFreshness.js";
import { installMockFetch } from "./utils/mockFetch.js";
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

const { test, runSuite } = defineSuite("Provider Wiring", { offline: true });

// A compile-time-verified enumeration of every NeurolinkCredentials key that
// belongs to a NON-catalog provider. If a key is renamed/removed in
// NeurolinkCredentials, or a provider moves into/out of the JSON catalog,
// this literal fails to typecheck (Exclude<> collapses the omitted key set),
// so it can't silently drift from the real type. The 18 catalog providers'
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
  openrouter: undefined,
  litellm: undefined,
  openaiCompatible: undefined,
  ollama: undefined,
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
  typesafe: undefined,
  laya: undefined,
  xor: undefined,
  perplexityDecider: undefined,
  cloudflareClef: undefined,
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

await test("no catalog's error guidance recommends a model it has retired", async () => {
  const { CATALOG_JSON_ENTRIES } =
    await import("../dist/providers/catalog/index.generated.js");
  const escape = (text: string): string =>
    text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const offenders = CATALOG_JSON_ENTRIES.flatMap((entry) => {
    const retired = Object.entries(entry.models.catalog)
      .filter(([, spec]) => spec.status === "retired")
      .map(([id]) => id);
    return entry.errorRules.flatMap((rule) =>
      retired
        .filter((id) => {
          // Bare names count too ("CodeLlama-34b-Instruct-hf"), but only as a
          // whole name: retired "Llama-3.1-8B" must not match the live
          // "Llama-3.1-8B-Instruct".
          const name = id.slice(id.lastIndexOf("/") + 1);
          return new RegExp(`(?<![\\w./-])${escape(name)}(?![\\w.-])`).test(
            rule.message,
          );
        })
        .map((id) => `${entry.id}: ${id}`),
    );
  });
  assert(
    offenders.length === 0,
    `error guidance names retired models: ${offenders.join(", ")}`,
  );
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
    "expected the huggingface provider to forward the sdk instance to BaseProvider",
  );
});

await test("createProvider resolves an alias to the provider's scoped credentials (hf -> huggingFace)", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();
  const { ProviderFactory } = await import("../dist/index.js");

  // Every other key source is cleared, so the only way the token below can
  // reach the Authorization header is through `credentials.huggingFace` —
  // which `createProvider("hf", ...)` can only find by resolving the alias.
  const isolated = ["HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_BASE_URL"];
  const saved = new Map(isolated.map((name) => [name, process.env[name]]));
  const token = "hf_aliasScopedCredentialForWiringSuite00000";
  isolated.forEach((name) => delete process.env[name]);
  const { unset, calls } = installMockFetch([
    {
      method: "POST",
      url: "router.huggingface.co/v1/chat/completions",
      respond: {
        status: 200,
        json: {
          id: "wiring-hf-alias",
          object: "chat.completion",
          created: 0,
          model: "some-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "pong" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      },
    },
  ]);
  try {
    // Caught and asserted on a boolean: a propagated provider error would be
    // classified as a SKIP by defineSuite, hiding the regression.
    let threw = false;
    try {
      const provider = await ProviderFactory.createProvider(
        "hf",
        "some-model",
        undefined,
        undefined,
        { huggingFace: { apiKey: token } },
      );
      await provider.generate({ input: { text: "ping" }, disableTools: true });
    } catch {
      threw = true;
    }
    assert(!threw, "an alias-built provider did not return a result");
    assert(calls.length > 0, "expected a captured HuggingFace request");
    assert(
      calls[0].headers["authorization"] === `Bearer ${token}`,
      "expected the alias-built provider to send the scoped huggingFace credential",
    );
  } finally {
    unset();
    saved.forEach((value, name) => {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    });
  }
});

await test("providerMatrix's row-selection treats a catalog key fallback as an alternative, not a second requirement", async () => {
  // test/helpers/providerMatrix.ts drives live-matrix.yml's row selection
  // (hasProviderEnv) and is test infrastructure, not a shipped SDK surface
  // — importing it directly (rather than only via ../dist) is the
  // established pattern here (the sibling matrix suites do the same).
  const { hasProviderEnv } = await import("./helpers/providerMatrix.js");

  // huggingface declares HF_TOKEN as a fallback for HUGGINGFACE_API_KEY
  // (src/lib/providers/catalog/huggingface.json's wire.apiKeyFallbackEnvVars)
  // — the same pair the previous test confirms reaches the descriptor.
  const touched = ["HUGGINGFACE_API_KEY", "HF_TOKEN"];
  const saved = new Map(touched.map((name) => [name, process.env[name]]));
  try {
    touched.forEach((name) => delete process.env[name]);
    assert(
      hasProviderEnv("huggingface") === false,
      "expected huggingface to read as unavailable with neither credential env var set",
    );

    process.env.HF_TOKEN = "hf_wiring_suite_fallback_only_000000000";
    assert(
      hasProviderEnv("huggingface") === true,
      "expected the fallback credential alone to satisfy row-selection — a row should not need its primary env var once a declared fallback is set",
    );

    delete process.env.HF_TOKEN;
    process.env.HUGGINGFACE_API_KEY = "hf_wiring_suite_primary_only_0000000";
    assert(
      hasProviderEnv("huggingface") === true,
      "expected the primary credential alone to still satisfy row-selection, unchanged from before this fix",
    );
  } finally {
    for (const name of touched) {
      const prior = saved.get(name);
      if (prior === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = prior;
      }
    }
  }
});

await test("catalog key fallbacks reach the descriptor that routing and availability read", async () => {
  const { CATALOG_JSON_ENTRIES } =
    await import("../dist/providers/catalog/index.generated.js");
  const { PROVIDER_DESCRIPTORS } =
    await import("../dist/factories/providerDescriptors.js");

  const withFallbacks = CATALOG_JSON_ENTRIES.filter(
    (entry) => (entry.wire.apiKeyFallbackEnvVars ?? []).length > 0,
  );
  assert(
    withFallbacks.some((entry) => entry.id === "huggingface"),
    "expected the huggingface catalog entry to declare the HF_TOKEN key fallback",
  );
  for (const entry of withFallbacks) {
    const declared =
      PROVIDER_DESCRIPTORS.find((descriptor) => descriptor.name === entry.id)
        ?.envVars.fallbacks ?? [];
    assert(
      (entry.wire.apiKeyFallbackEnvVars ?? []).every((name) =>
        declared.includes(name),
      ),
      `descriptor for catalog entry ${entry.id} drops a declared key fallback`,
    );
  }
});

await test("HuggingFace authenticates with HF_TOKEN when it is the only key set", async () => {
  const { NeuroLink } = await import("../dist/index.js");

  // HUGGINGFACE_BASE_URL is cleared too so the request reaches the mocked
  // router.huggingface.co route whatever the host environment sets.
  const isolated = ["HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_BASE_URL"];
  const saved = new Map(isolated.map((name) => [name, process.env[name]]));
  const token = "hf_fallbackOnlyTokenForWiringSuite000000000";
  isolated.forEach((name) => delete process.env[name]);
  process.env.HF_TOKEN = token;
  const { unset, calls } = installMockFetch([
    {
      method: "POST",
      url: "router.huggingface.co/v1/chat/completions",
      respond: {
        status: 200,
        json: {
          id: "wiring-hf-token",
          object: "chat.completion",
          created: 0,
          model: "some-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "pong" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      },
    },
  ]);
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    // Caught here and asserted on a boolean: a propagated provider error
    // would be classified as a SKIP by defineSuite, hiding the regression.
    let generateThrew = false;
    try {
      await nl.generate({
        provider: "huggingface",
        model: "some-model",
        input: { text: "ping" },
        disableTools: true,
      });
    } catch {
      generateThrew = true;
    }
    assert(!generateThrew, "fallback-only generate did not return a result");
    assert(calls.length > 0, "expected a captured HuggingFace request");
    assert(
      calls[0].headers["authorization"] === `Bearer ${token}`,
      "expected the Authorization header to carry the HF_TOKEN fallback",
    );
  } finally {
    unset();
    saved.forEach((value, name) => {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    });
  }
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
    "huggingface", // catalog provider, but still wizard-handled specially
    "mistral", // catalog provider, but still wizard-handled specially
    "openrouter",
  ]);
  const allProviders = Object.values(AIProviderName).filter(
    (name) => name !== AIProviderName.AUTO,
  );

  // Total canonical provider count = the JSON-catalog providers (now
  // including deepseek, huggingface and mistral) + this literal count of
  // hand-registered non-catalog providers (openai, anthropic, google-ai,
  // vertex, bedrock, sagemaker, azure, ollama, openrouter, litellm,
  // openai-compatible, nvidia-nim, lm-studio, llamacpp, cohere, replicate,
  // voyage, jina, stability, ideogram, recraft, typesafe, laya, xor,
  // perplexity-decider, cloudflare-clef). Onboarding a new catalog provider
  // grows CATALOG_PROVIDER_IDS and needs no change here; onboarding a new
  // hand-written provider bumps this literal.
  const NON_CATALOG_PROVIDER_COUNT = 26;
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

await test("a schema reaches the wire as response_format only when no tools are attached", async () => {
  // What this pins, and why it needed pinning:
  //
  // `suppressResponseFormatWithTools()` defaults to true, so for every
  // OpenAI-compatible provider except OpenAI, Azure and catalog entries that
  // declare `structuredOutputWithTools: true` a request that carries tools
  // drops `response_format`. The schema is then honoured by a fallback re-ask
  // rather than by the provider. Groq declares false, so it pins that default.
  //
  // That is invisible from a response: a model asked for JSON usually returns
  // JSON whether or not the schema was enforced, so a suite that inspects only
  // the reply cannot tell an honoured schema from a lucky one. The live JSON
  // suite reads replies, and it sets NEUROLINK_DISABLE_BUILTIN_TOOLS=true
  // believing that yields a tool-free configuration.
  //
  // It does not. That flag only drops `directAgentTools`; the repo's tracked
  // `.mcp-config.json` auto-registers a filesystem MCP server, so ~19 tools
  // still reach the wire. Measured here: 26 tools with the flag off, 19 with
  // it on, 0 only when a caller passes `disableTools`. So no cell of that
  // suite has ever exercised the `response_format` branch for a suppressing
  // provider — which is exactly where a silently-ignored schema could hide.
  //
  // Asserting on the request bytes is the only way to see it.
  const { startLocalOpenAICompatible, toolNamesOnWire, responseFormatOnWire } =
    await import("./helpers/openaiCompatibleLocalEndpoint.js");
  const { NeuroLink } = await import("../dist/index.js");
  const { z } = await import("zod");

  const local = await startLocalOpenAICompatible();
  const savedEnv = { ...process.env };
  process.env.GROQ_BASE_URL = local.baseURL;
  process.env.GROQ_API_KEY = "sk-local-endpoint-not-real";

  const schema = z.object({ capital: z.string(), population: z.number() });
  const ask = (extra: Record<string, unknown>) => ({
    input: { text: "Give the capital of France and its population." },
    provider: "groq" as const,
    schema,
    maxTokens: 200,
    ...extra,
  });

  // Declared out here so `finally` can shut both down even when an assertion
  // throws mid-case. Each shutdown catches independently: a rejected one must
  // not skip the cleanup that follows it.
  let nl: NeuroLink | undefined;
  let flagged: NeuroLink | undefined;
  try {
    nl = new NeuroLink({ conversationMemory: { enabled: false } });

    // 1 — tools attached (the default): response_format is suppressed.
    {
      const before = local.requests.length;
      await nl.generate(ask({}));
      const sent = local.requests[before];
      assert(
        toolNamesOnWire(sent).length > 0,
        "the default configuration put no tools on the wire, so this case proves nothing",
      );
      assert(
        responseFormatOnWire(sent) === null,
        "response_format survived alongside tools, which the suppression contract forbids",
      );
    }

    // 2 — no tools: the schema reaches the provider as response_format.
    {
      const before = local.requests.length;
      await nl.generate(ask({ disableTools: true }));
      const sent = local.requests[before];
      assert(
        toolNamesOnWire(sent).length === 0,
        "disableTools left tools on the wire",
      );
      const format = responseFormatOnWire(sent) as { type?: string } | null;
      assert(
        format !== null && typeof format.type === "string",
        "no response_format reached the provider for a tool-free schema request",
      );
    }

    // 3 — the misconception itself, pinned: the env flag does NOT mean
    // "no tools". If this ever starts holding, the live JSON suite's
    // assumption becomes true and this comment should go.
    {
      const before = local.requests.length;
      process.env.NEUROLINK_DISABLE_BUILTIN_TOOLS = "true";
      flagged = new NeuroLink({ conversationMemory: { enabled: false } });
      await flagged.generate(ask({}));
      const sent = local.requests[before];
      assert(
        toolNamesOnWire(sent).length > 0,
        "NEUROLINK_DISABLE_BUILTIN_TOOLS now yields a tool-free wire; the JSON suite's assumption changed",
      );
    }
  } finally {
    await nl?.shutdown?.().catch(() => {});
    await flagged?.shutdown?.().catch(() => {});
    await local.close();
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
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

await test("Bedrock carries the caller's text on the wire across all four public surfaces", async () => {
  // The defect this guards: the native generate path built its user message
  // from `options.prompt` alone, so a caller using the documented
  // `input.text` shape sent Bedrock an empty user message — no error, just a
  // model answering a blank turn.
  //
  // Driving the provider directly would not catch a regression between the
  // caller and the provider, and that gap is most of the distance: option
  // normalization, middleware, tool injection and context handling all sit
  // in between. So these cases go through `NeuroLink` and through the built
  // CLI, and assert on the bytes a local Bedrock endpoint actually receives.
  // Nothing reaches AWS.
  const { startLocalBedrock, userTextOnWire, PLACEHOLDER_AWS_ENV } =
    await import("./helpers/bedrockLocalEndpoint.js");
  const { NeuroLink } = await import("../dist/index.js");
  const { spawn } = await import("node:child_process");

  const PROMPT = "Reply with exactly OK.";
  const MODEL = "amazon.nova-micro-v1:0";
  const local = await startLocalBedrock("OK");

  const savedEnv = { ...process.env };
  Object.assign(process.env, PLACEHOLDER_AWS_ENV, {
    AWS_ENDPOINT_URL_BEDROCK_RUNTIME: local.endpoint,
  });
  delete process.env.AWS_SESSION_TOKEN;

  // The CLI is a separate process, so it needs the same pointing.
  const childEnv = { ...process.env };
  delete childEnv.AWS_SESSION_TOKEN;

  // spawn, never spawnSync: this process is also the endpoint, and a
  // synchronous child blocks the event loop so the request is never served.
  const runCli = (command: string) =>
    new Promise<{ code: number | null; stdout: string; stderr: string }>(
      (resolve) => {
        const child = spawn(
          process.execPath,
          [
            "dist/cli/index.js",
            command,
            PROMPT,
            "--provider",
            "bedrock",
            "--model",
            MODEL,
          ],
          { env: childEnv },
        );
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (d) => (stdout += String(d)));
        child.stderr.on("data", (d) => (stderr += String(d)));
        const kill = setTimeout(() => child.kill("SIGKILL"), 90_000);
        child.on("close", (code) => {
          clearTimeout(kill);
          resolve({ code, stdout, stderr });
        });
      },
    );

  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });

    // 1 — SDK generate.
    //
    // Only the `input.text` shape is asserted here because it is the only
    // one the facade accepts: `generate({ prompt })` is rejected up front
    // with "Input text is required". `prompt` survives as a provider-level
    // alias, which is exactly why the defect hid for so long — the field the
    // Bedrock path read was the one no facade caller can set.
    {
      const before = local.requests.length;
      const result = await nl.generate({
        input: { text: PROMPT },
        provider: "bedrock",
        model: MODEL,
      });
      const sent = local.requests.slice(before);
      assert(
        sent.length === 1,
        `sdk-generate sent an unexpected number of requests (${sent.length})`,
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `sdk-generate user text on the wire did not equal the caller's prompt (length ${userTextOnWire(sent[0].body).length})`,
      );
      assert(
        String(result?.content ?? "").includes("OK"),
        "sdk-generate did not return the endpoint's reply",
      );
    }

    // 2 — the provider called directly with `input.text`.
    //
    // This is the only case that actually reproduces the defect, and the
    // reason it is here rather than folded into the facade cases above: the
    // facade normalizes `input.text` into `prompt` before the provider ever
    // sees it, so a facade caller could never have hit the empty-message bug.
    // A caller reaching for `AIProviderFactory.createProvider()` and passing
    // the documented `input.text` shape could, and did. Reverting the fix
    // must fail here even though every surface above still passes.
    {
      const { ProviderRegistry } = await import("../dist/index.js");
      await ProviderRegistry.registerAllProviders();
      const { ProviderFactory } =
        await import("../dist/factories/providerFactory.js");
      const provider = await ProviderFactory.createProvider(
        "bedrock",
        MODEL,
        undefined,
        undefined,
        {
          bedrock: {
            accessKeyId: PLACEHOLDER_AWS_ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: PLACEHOLDER_AWS_ENV.AWS_SECRET_ACCESS_KEY,
            region: PLACEHOLDER_AWS_ENV.AWS_REGION,
          },
        },
      );
      const before = local.requests.length;
      await provider.generate({ input: { text: PROMPT } });
      const sent = local.requests.slice(before);
      assert(
        sent.length === 1,
        `provider-level input.text sent an unexpected number of requests (${sent.length})`,
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `provider-level input.text did not reach the wire (length ${userTextOnWire(sent[0].body).length})`,
      );
    }

    // 3 — the provider's own `prompt` alias, which no facade call can reach.
    {
      const { ProviderRegistry } = await import("../dist/index.js");
      await ProviderRegistry.registerAllProviders();
      const { ProviderFactory } =
        await import("../dist/factories/providerFactory.js");
      const provider = await ProviderFactory.createProvider(
        "bedrock",
        MODEL,
        undefined,
        undefined,
        {
          bedrock: {
            accessKeyId: PLACEHOLDER_AWS_ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: PLACEHOLDER_AWS_ENV.AWS_SECRET_ACCESS_KEY,
            region: PLACEHOLDER_AWS_ENV.AWS_REGION,
          },
        },
      );
      const before = local.requests.length;
      await provider.generate({ prompt: PROMPT });
      const sent = local.requests.slice(before);
      assert(
        sent.length === 1,
        `provider-level prompt alias sent an unexpected number of requests (${sent.length})`,
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `provider-level prompt alias did not reach the wire (length ${userTextOnWire(sent[0].body).length})`,
      );
    }

    // 3b — both shapes supplied, each with different text. The base contract
    // resolves `prompt` first, so `prompt` must win. This case passes under
    // either `??` or `||` and is a guard, not a discriminator: it fails only
    // if someone later inverts the order to read `input.text` first.
    {
      const { ProviderRegistry } = await import("../dist/index.js");
      await ProviderRegistry.registerAllProviders();
      const { ProviderFactory } =
        await import("../dist/factories/providerFactory.js");
      const provider = await ProviderFactory.createProvider(
        "bedrock",
        MODEL,
        undefined,
        undefined,
        {
          bedrock: {
            accessKeyId: PLACEHOLDER_AWS_ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: PLACEHOLDER_AWS_ENV.AWS_SECRET_ACCESS_KEY,
            region: PLACEHOLDER_AWS_ENV.AWS_REGION,
          },
        },
      );
      const before = local.requests.length;
      await provider.generate({
        prompt: PROMPT,
        input: { text: "different-text-that-must-lose" },
      });
      const sent = local.requests.slice(before);
      assert(
        sent.length === 1,
        `both-shapes precedence sent an unexpected number of requests (${sent.length})`,
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `both-shapes precedence did not send the expected text on the wire (length ${userTextOnWire(sent[0].body).length})`,
      );
    }

    // 3c — an EMPTY `prompt` alongside a populated `input.text`. This is the
    // case that discriminates. `Utilities.normalizeTextOptions` resolves with
    // `||`, so an empty prompt falls through to `input.text`; this provider
    // overrides `generate()` outright, so normalization never runs and the raw
    // options land here. Written with `??` the empty string is not nullish, so
    // it won and an empty user message went to the vendor while the base
    // contract would have sent the caller's text.
    {
      const { ProviderRegistry } = await import("../dist/index.js");
      await ProviderRegistry.registerAllProviders();
      const { ProviderFactory } =
        await import("../dist/factories/providerFactory.js");
      const provider = await ProviderFactory.createProvider(
        "bedrock",
        MODEL,
        undefined,
        undefined,
        {
          bedrock: {
            accessKeyId: PLACEHOLDER_AWS_ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: PLACEHOLDER_AWS_ENV.AWS_SECRET_ACCESS_KEY,
            region: PLACEHOLDER_AWS_ENV.AWS_REGION,
          },
        },
      );
      const before = local.requests.length;
      await provider.generate({
        prompt: "",
        input: { text: PROMPT },
      });
      const sent = local.requests.slice(before);
      assert(
        sent.length === 1,
        `empty-prompt fallthrough sent an unexpected number of requests (${sent.length})`,
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `empty-prompt fallthrough did not send the expected text on the wire (length ${userTextOnWire(sent[0].body).length})`,
      );
    }

    // 4 — SDK stream, drained.
    {
      const before = local.requests.length;
      const streamed = await nl.stream({
        input: { text: PROMPT },
        provider: "bedrock",
        model: MODEL,
      });
      // Chunks are a union — text, audio, sentinels. Narrow rather than cast:
      // the cast that was here did not overlap the union and only compiled
      // because `pnpm run check` does not typecheck tests. CI's types shard
      // does, and caught it.
      let text = "";
      for await (const chunk of streamed.stream) {
        if (
          typeof chunk === "object" &&
          chunk !== null &&
          "content" in chunk &&
          typeof chunk.content === "string"
        ) {
          text += chunk.content;
        }
      }
      const sent = local.requests.slice(before);
      assert(
        sent.length === 1 && sent[0].path.includes("converse-stream"),
        "sdk-stream did not reach the streaming operation exactly once",
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `sdk-stream user text on the wire did not equal the caller's prompt (length ${userTextOnWire(sent[0].body).length})`,
      );
      assert(
        text.includes("OK"),
        "sdk-stream did not drain the endpoint's reply",
      );
    }

    // 5 & 6 — the built CLI, generate and stream.
    for (const [command, operation] of [
      ["generate", "converse"],
      ["stream", "converse-stream"],
    ] as const) {
      const before = local.requests.length;
      const run = await runCli(command);
      const sent = local.requests.slice(before);
      assert(run.code === 0, `cli-${command} exited non-zero (${run.code})`);
      assert(
        sent.length === 1,
        `cli-${command} sent an unexpected number of requests (${sent.length})`,
      );
      assert(
        sent[0].path.includes(operation),
        `cli-${command} did not reach the expected Bedrock operation`,
      );
      assert(
        userTextOnWire(sent[0].body) === PROMPT,
        `cli-${command} user text on the wire did not equal the caller's prompt (length ${userTextOnWire(sent[0].body).length})`,
      );
      assert(
        run.stdout.includes("OK"),
        `cli-${command} did not print the endpoint's reply`,
      );
    }
  } finally {
    await local.close();
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
});

await test("Bedrock reports the tools it actually ran", async () => {
  // The defect this guards: the Bedrock native generate path ran the agentic
  // loop, executed tools and fed their results back to the model correctly —
  // then returned a result carrying only text, usage and finish reason. The
  // loop's own `toolCalls` / `toolExecutions` were computed and dropped, so
  // `baseProvider` fell back to `result.toolsUsed || []` and every turn
  // reported zero tools. Bedrock was the only `runAgenticLoop` consumer that
  // forwarded none of it; anthropic, vertex and google-ai all do.
  //
  // Nothing observable in the answer reveals this — the tools genuinely work.
  // Only analytics, cost attribution, audit and any caller branching on
  // `toolsUsed` see the lie, which is why it survived.
  //
  // The endpoint is scripted to ask for one tool call, so the loop, the tool
  // dispatch and the second round trip are real. Nothing reaches AWS.
  const { startLocalBedrock, toolResultsOnWire, PLACEHOLDER_AWS_ENV } =
    await import("./helpers/bedrockLocalEndpoint.js");
  const { NeuroLink } = await import("../dist/index.js");

  const TOOL = "get_vault_code";
  const NONCE = "VLT4QX9R2K";
  const MODEL = "amazon.nova-micro-v1:0";
  const local = await startLocalBedrock("Done.", {
    toolUse: { name: TOOL, input: {} },
  });

  const savedEnv = { ...process.env };
  Object.assign(process.env, PLACEHOLDER_AWS_ENV, {
    AWS_ENDPOINT_URL_BEDROCK_RUNTIME: local.endpoint,
  });
  delete process.env.AWS_SESSION_TOKEN;

  let executed = 0;
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    nl.registerTool(TOOL, {
      name: TOOL,
      description: "Return the secret vault code.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: async () => {
        executed += 1;
        return { vault_code: NONCE };
      },
    });

    const result = await nl.generate({
      input: { text: "Call the tool, then report the code." },
      provider: "bedrock",
      model: MODEL,
    });

    // The tool really ran, and its output really went back to the model.
    // Without this half, an empty `toolsUsed` would be honest reporting.
    assert(
      executed === 1,
      `tool did not execute exactly once (runs: ${executed})`,
    );
    const delivered = local.requests.flatMap((r) => toolResultsOnWire(r.body));
    assert(
      delivered.some((value) => value.includes(NONCE)),
      "the tool result never reached the model on the wire",
    );

    // So the result must say so.
    assert(
      (result.toolsUsed ?? []).includes(TOOL),
      "toolsUsed omits a tool the provider executed on this turn",
    );
    assert(
      (result.toolExecutions ?? []).length > 0,
      "toolExecutions is empty for a turn that executed a tool",
    );

    // The streamed surface has the same duty. Its analytics derive
    // toolCallCount from the result handed to createAnalytics, and Bedrock
    // passed usage alone — so a streamed turn that ran tools reported none.
    const streamed = await nl.stream({
      input: { text: "Call the tool, then report the code." },
      provider: "bedrock",
      model: MODEL,
    });
    for await (const chunk of streamed.stream) {
      void chunk;
    }
    const analytics = await streamed.analytics;
    // Wire evidence, not an execution counter: the tool middleware caches
    // identical calls, so a second turn with the same name and arguments
    // legitimately replays the first result without calling execute() again.
    // What matters is that the tool took part in the streamed turn.
    const streamedToolResults = local.requests
      .filter((request) => request.path.includes("converse-stream"))
      .flatMap((request) => toolResultsOnWire(request.body));
    assert(
      streamedToolResults.some((value) => value.includes(NONCE)),
      "the streamed turn never carried a tool result back to the model",
    );
    assert(
      (analytics?.toolCallCount ?? 0) > 0,
      "stream analytics reports no tool calls for a turn that used one",
    );
  } finally {
    await local.close();
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
});

await test("Bedrock does not report a tool the model asked for but never ran", async () => {
  // Follow-up to #1697. Forwarding the loop's tool telemetry fixed the "zero
  // tools" lie, but it forwarded EVERY dispatch — including the ones that
  // never reached a tool. `runAgenticLoop` records a name the model invented
  // as an entry with `error` set, so mapping the list verbatim reported an
  // invented tool as used, re-inflating the very counts #1697 existed to make
  // honest: analytics, cost attribution, audit.
  //
  // Scripted so the model "calls" a tool that was never registered. The
  // dispatch is real, the lookup miss is real, the error goes back to the
  // model on the wire. Nothing reaches AWS.
  const { startLocalBedrock, toolResultsOnWire, PLACEHOLDER_AWS_ENV } =
    await import("./helpers/bedrockLocalEndpoint.js");
  const { NeuroLink } = await import("../dist/index.js");

  const REAL_TOOL = "get_vault_code";
  const INVENTED_TOOL = "open_the_vault";
  const MODEL = "amazon.nova-micro-v1:0";
  const local = await startLocalBedrock("Done.", {
    toolUse: { name: INVENTED_TOOL, input: {} },
  });

  const savedEnv = { ...process.env };
  Object.assign(process.env, PLACEHOLDER_AWS_ENV, {
    AWS_ENDPOINT_URL_BEDROCK_RUNTIME: local.endpoint,
  });
  delete process.env.AWS_SESSION_TOKEN;

  let executed = 0;
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    nl.registerTool(REAL_TOOL, {
      name: REAL_TOOL,
      description: "Return the secret vault code.",
      inputSchema: { type: "object", properties: {}, required: [] },
      execute: async () => {
        executed += 1;
        return { vault_code: "VLT4QX9R2K" };
      },
    });

    const result = await nl.generate({
      input: { text: "Call the tool, then report the code." },
      provider: "bedrock",
      model: MODEL,
    });

    // PRECONDITIONS. An empty `toolsUsed` is also what a turn that never
    // called anything produces, so without these the contract below would
    // pass for the wrong reason.
    const delivered = local.requests.flatMap((request) =>
      toolResultsOnWire(request.body),
    );
    assert(
      delivered.some((value) => value.includes(INVENTED_TOOL)),
      "precondition failed: no tool-result for the invented name went back to the model, so nothing was dispatched",
    );
    assert(
      executed === 0,
      `precondition failed: the registered tool ran on a turn that never called it (runs: ${executed})`,
    );
    assert(
      (result.toolExecutions ?? []).length > 0,
      "precondition failed: the failed dispatch was dropped from toolExecutions, which must stay complete",
    );

    // The contract: asked for is not the same as ran.
    assert(
      !(result.toolsUsed ?? []).includes(INVENTED_TOOL),
      "toolsUsed reports a tool the turn never executed",
    );

    // The contract this locks in: `enhancedWithTools` means a tool RAN, not
    // merely that one was dispatched. `NeuroLink.generate()` used to derive
    // it from `toolExecutions.length` (dispatch, including this failed
    // TOOL_NOT_FOUND lookup), overwriting whatever the provider set from
    // `toolsUsed` (ran) — so the same public field meant "dispatched"
    // through the SDK and "ran" through a provider handle. The preconditions
    // above already prove the dispatch happened and failed
    // (`toolExecutions.length > 0`, `executed === 0`), so this is not
    // satisfied merely because nothing was dispatched.
    assert(
      result.enhancedWithTools !== true,
      "enhancedWithTools reports true for a turn whose only tool dispatch failed",
    );

    // The provider-level half. The assertion above reads a value
    // `NeuroLink.generate()` recomputes from `toolsUsed`, so it would still
    // pass if the provider itself went back to deriving the flag from the
    // dispatch list. A handle taken straight from the factory has no facade
    // above it, so this one reads what the provider set. The endpoint scripts
    // the tool call on its FIRST Converse request only, which the turn above
    // has used, so this handle gets an endpoint of its own.
    const localDirect = await startLocalBedrock("Done.", {
      toolUse: { name: INVENTED_TOOL, input: {} },
    });
    try {
      process.env.AWS_ENDPOINT_URL_BEDROCK_RUNTIME = localDirect.endpoint;
      const { ProviderRegistry, ProviderFactory, jsonSchema } =
        await import("../dist/index.js");
      await ProviderRegistry.registerAllProviders();
      const provider = await ProviderFactory.createProvider(
        "bedrock",
        MODEL,
        undefined,
        undefined,
        {
          bedrock: {
            accessKeyId: PLACEHOLDER_AWS_ENV.AWS_ACCESS_KEY_ID,
            secretAccessKey: PLACEHOLDER_AWS_ENV.AWS_SECRET_ACCESS_KEY,
            region: PLACEHOLDER_AWS_ENV.AWS_REGION,
          },
        },
      );
      let executedDirect = 0;
      const direct = await provider.generate({
        input: { text: "Call the tool, then report the code." },
        tools: {
          [REAL_TOOL]: {
            description: "Return the secret vault code.",
            inputSchema: jsonSchema({
              type: "object",
              properties: {},
              required: [],
            }),
            execute: async () => {
              executedDirect += 1;
              return { vault_code: "VLT4QX9R2K" };
            },
          },
        },
      });
      assert(
        (direct?.toolExecutions ?? []).length > 0,
        "precondition failed: the direct handle recorded no dispatch, so the failed lookup never happened",
      );
      assert(
        executedDirect === 0,
        `precondition failed: the registered tool ran on a handle turn that never called it (runs: ${executedDirect})`,
      );
      assert(
        direct?.enhancedWithTools === false,
        "a provider handle reports enhancedWithTools true for a turn whose only tool dispatch failed",
      );
    } finally {
      await localDirect.close();
    }
  } finally {
    await local.close();
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
});

await test("a Vertex model-unavailable error never suggests the model that just failed", async () => {
  // Found by sweeping every feature across Vertex: asking for
  // `gemini-3-pro-preview-11-2025` in a project without access produced
  //
  //   Model 'gemini-3-pro-preview-11-2025' is not available in region global.
  //   Suggested alternatives: Google Models (always available):
  //     • gemini-3-pro-preview-11-2025        <-- the id that just failed
  //
  // The list is static, so it cannot know what a project and region serve.
  // It claimed "always available" and did not exclude the requested model,
  // so the error recommended the exact id the caller had used. A caller
  // following that advice retries the same failing model.
  //
  // Skips when the model IS available to the account — then there is no error
  // to inspect and nothing to assert.
  const { NeuroLink } = await import("../dist/index.js");

  const hasVertex =
    Boolean(process.env.GOOGLE_AUTH_CLIENT_EMAIL) ||
    Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  if (!hasVertex) {
    throw new Skip("no Vertex credentials");
  }

  const requested = "gemini-3-pro-preview-11-2025";
  const nl = new NeuroLink({ conversationMemory: { enabled: false } });
  try {
    await nl.generate({
      input: { text: "Reply with exactly: ready" },
      provider: "vertex",
      model: requested,
      maxTokens: 64,
    });
    throw new Skip("model is available to this account");
  } catch (error) {
    if (error instanceof Skip) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    if (!/not available in region/i.test(message)) {
      throw new Skip("vertex did not report a model-availability error");
    }
    const marker = message.indexOf("Suggested");
    if (marker < 0) {
      throw new Error(
        'vertex error missing the "Suggested alternatives" section',
        { cause: error },
      );
    }
    const suggestionsOnly = message.slice(marker);
    assert(
      !suggestionsOnly.includes(requested),
      "the suggestion list offers the model the caller just asked for",
    );
    assert(
      !/always available/i.test(message),
      "the suggestion list still claims availability it cannot know",
    );
  } finally {
    await nl.shutdown?.().catch(() => {});
  }
});

// The registry has no per-entry removal and clearRegistrations() would drop every
// provider the rest of the suite relies on, so each case below registers its own
// unique lowercase name and these cases stay at the end of the file.
async function loadProviderFactory() {
  const { ProviderFactory } = await import("../dist/index.js");
  return ProviderFactory;
}

// A registered class or factory only has to be what createProvider hands back
// by identity, so the stand-ins skip the full AIProvider surface.
function asProviderConstructor(
  value: unknown,
): Parameters<
  Awaited<ReturnType<typeof loadProviderFactory>>["registerProvider"]
>[1] {
  return value as never;
}

await test("a class registered with registerProvider is constructed with new, once, with the factory arguments", async () => {
  const ProviderFactory = await loadProviderFactory();
  const name = "wiring-class-built-with-new";
  const received: unknown[][] = [];
  class ClassRegisteredProvider {
    constructor(...args: unknown[]) {
      received.push(args);
    }
  }
  ProviderFactory.registerProvider(
    name,
    asProviderConstructor(ClassRegisteredProvider),
    "default-model",
  );
  // Opaque placeholder, forwarded by reference (see the HuggingFace sdk case).
  const sdkMarker: NeuroLink = Object.create(null);

  let threw = false;
  let built: unknown;
  try {
    built = await ProviderFactory.createProvider(
      name,
      "explicit-model",
      sdkMarker,
      "region-x",
      { [name]: { apiKey: "class-scoped" } } as never,
    );
  } catch {
    threw = true;
  }
  assert(!threw, "createProvider threw for a registered class");
  assert(
    built instanceof ClassRegisteredProvider,
    "createProvider did not return an instance of the registered class",
  );
  assert(received.length === 1, "the class was not constructed exactly once");
  const [model, providerName, sdk, region, credentials] = received[0] ?? [];
  assert(model === "explicit-model", "the class did not receive the model");
  assert(providerName === name, "the class did not receive the provider name");
  assert(sdk === sdkMarker, "the class did not receive the sdk instance");
  assert(region === "region-x", "the class did not receive the region");
  assert(
    (credentials as { apiKey?: string } | undefined)?.apiKey === "class-scoped",
    "the class did not receive its scoped credentials",
  );
});

await test("a factory function registered with registerProvider is called once and never constructed with new, sync and async", async () => {
  const ProviderFactory = await loadProviderFactory();
  const syncName = "wiring-factory-sync";
  const asyncName = "wiring-factory-async";
  const stubs = {
    sync: { marker: "sync-stub" },
    async: { marker: "async-stub" },
  };
  const seen = {
    sync: 0,
    async: 0,
    syncConstructed: false,
    asyncConstructed: false,
  };
  // Plain `function` factories, not arrows: a plain function's prototype points
  // back at itself, which is why a prototype test could not tell it from a class.
  // (The async one has no prototype; it only checks that `new` is never used.)
  function syncFactory() {
    seen.sync++;
    seen.syncConstructed = new.target !== undefined;
    return stubs.sync;
  }
  async function asyncFactory() {
    seen.async++;
    seen.asyncConstructed = new.target !== undefined;
    return stubs.async;
  }
  ProviderFactory.registerProvider(
    syncName,
    asProviderConstructor(syncFactory),
    "default-model",
  );
  ProviderFactory.registerProvider(
    asyncName,
    asProviderConstructor(asyncFactory),
    "default-model",
  );

  let threw = false;
  let syncBuilt: unknown;
  let asyncBuilt: unknown;
  try {
    syncBuilt = await ProviderFactory.createProvider(syncName);
    asyncBuilt = await ProviderFactory.createProvider(asyncName);
  } catch {
    threw = true;
  }
  assert(!threw, "createProvider threw for a registered factory");
  assert(
    seen.sync === 1 && seen.async === 1,
    "a factory was not called exactly once",
  );
  assert(
    !seen.syncConstructed && !seen.asyncConstructed,
    "a factory was constructed with new",
  );
  assert(
    syncBuilt === stubs.sync && asyncBuilt === stubs.async,
    "createProvider did not hand back what the factory returned",
  );
});

await test("a registered class whose constructor throws is attempted exactly once", async () => {
  const ProviderFactory = await loadProviderFactory();
  const name = "wiring-class-throws";
  let attempts = 0;
  class ThrowingProvider {
    constructor() {
      attempts++;
      throw new Error("constructor failed");
    }
  }
  ProviderFactory.registerProvider(
    name,
    asProviderConstructor(ThrowingProvider),
    "default-model",
  );
  let message = "";
  let threw = false;
  try {
    await ProviderFactory.createProvider(name);
  } catch (error) {
    threw = true;
    message = error instanceof Error ? error.message : "";
  }
  assert(threw, "createProvider did not reject for a throwing class");
  assert(
    message.startsWith(`Failed to create provider ${name}`),
    "the rejection was not wrapped as a provider creation failure",
  );
  // Before the fix the class was called without new, so its body never ran.
  assert(attempts === 1, "the throwing class was not attempted exactly once");
});

await test("a registered factory that throws or rejects is attempted exactly once and never retried with new", async () => {
  const ProviderFactory = await loadProviderFactory();
  const syncName = "wiring-factory-throws";
  const asyncName = "wiring-factory-rejects";
  const attempts = { sync: 0, async: 0 };
  function throwingFactory() {
    attempts.sync++;
    throw new Error("factory failed");
  }
  async function rejectingFactory() {
    attempts.async++;
    throw new Error("factory rejected");
  }
  ProviderFactory.registerProvider(
    syncName,
    asProviderConstructor(throwingFactory),
    "default-model",
  );
  ProviderFactory.registerProvider(
    asyncName,
    asProviderConstructor(rejectingFactory),
    "default-model",
  );
  const outcomes: Array<{ threw: boolean; wrapped: boolean }> = [];
  for (const name of [syncName, asyncName]) {
    try {
      await ProviderFactory.createProvider(name);
      outcomes.push({ threw: false, wrapped: false });
    } catch (error) {
      outcomes.push({
        threw: true,
        wrapped:
          error instanceof Error &&
          error.message.startsWith(`Failed to create provider ${name}`),
      });
    }
  }
  assert(
    outcomes.every((o) => o.threw && o.wrapped),
    "a failing factory was not wrapped as a provider creation failure",
  );
  // A plain function's prototype.constructor is itself, so a retry-with-new
  // fallback would run the sync factory twice (`new` on an async function
  // throws before its body runs, so the async one only pins the wrapping and
  // the single attempt). This pins that neither is retried.
  assert(
    attempts.sync === 1 && attempts.async === 1,
    "a failing factory was attempted more than once",
  );
});

await test("a class registered with registerProvider can hand back a real provider that generates", async () => {
  const { ProviderRegistry } = await import("../dist/index.js");
  await ProviderRegistry.registerAllProviders();
  const ProviderFactory = await loadProviderFactory();

  const isolated = ["HUGGINGFACE_API_KEY", "HF_TOKEN", "HUGGINGFACE_BASE_URL"];
  const saved = new Map(isolated.map((n) => [n, process.env[n]]));
  const token = "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0000000";
  isolated.forEach((n) => delete process.env[n]);
  const { unset, calls } = installMockFetch([
    {
      method: "POST",
      url: "router.huggingface.co/v1/chat/completions",
      respond: {
        status: 200,
        json: {
          id: "wiring-class-real",
          object: "chat.completion",
          created: 0,
          model: "some-model",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: "pong" },
              finish_reason: "stop",
            },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        },
      },
    },
  ]);
  try {
    const name = "wiring-class-returns-real";
    let threw = false;
    let sameInstance = false;
    let content: unknown;
    try {
      const real = await ProviderFactory.createProvider(
        "huggingface",
        "some-model",
        undefined,
        undefined,
        { huggingFace: { apiKey: token } },
      );
      // A constructor that returns an object hands that object back from `new`.
      class RealProviderHolder {
        constructor() {
          return real;
        }
      }
      ProviderFactory.registerProvider(
        name,
        asProviderConstructor(RealProviderHolder),
        "some-model",
      );
      const built = await ProviderFactory.createProvider(name);
      sameInstance = built === real;
      const result = await built.generate({
        input: { text: "ping" },
        disableTools: true,
      });
      content = result?.content;
    } catch {
      threw = true;
    }
    assert(!threw, "a class that returns a real provider did not work");
    assert(
      sameInstance,
      "createProvider did not return the instance the class returned",
    );
    assert(
      content === "pong",
      "the provider built through the class did not generate",
    );
    assert(calls.length === 1, "expected exactly one captured request");
    assert(
      calls[0]?.headers["authorization"] === `Bearer ${token}`,
      "the provider built through the class did not send its scoped credential",
    );
  } finally {
    unset();
    saved.forEach((value, n) => {
      if (value === undefined) {
        delete process.env[n];
      } else {
        process.env[n] = value;
      }
    });
  }
});

await test("the built OpenRouter setup guide prints supported model examples", async () => {
  const result = await runCLI(
    ["setup", "--provider", "openrouter", "--non-interactive"],
    {
      timeoutMs: 60_000,
      env: { NO_COLOR: "1" },
    },
  );
  assert(result.exitCode === 0, "the setup guide did not exit successfully");
  const output = result.stdout + result.stderr;
  // The ids the guide is allowed to print: the OpenRouterModels catalog entries
  // it is built from, not a live roster check.
  const known = new Set([
    "google/gemini-2.5-flash",
    "anthropic/claude-sonnet-4.6",
    "openai/gpt-4o",
    "meta-llama/llama-3.1-70b-instruct",
  ]);
  const commandModel = /--provider openrouter --model (\S+)/.exec(output)?.[1];
  const examples = [...output.matchAll(/^\s*•\s+(\S+\/\S+)\s+-/gm)].map(
    (m) => m[1],
  );
  assert(
    commandModel !== undefined && known.has(commandModel),
    "the test command names an unsupported model",
  );
  assert(
    examples.length >= 3 && examples.every((id) => known.has(id)),
    "the model examples include unsupported IDs",
  );
});

await test("NeuroLink.stream (openai-compatible) emits tool:start and tool:end events on the event bus", async () => {
  const originalFetch = globalThis.fetch;
  const previousSkipMCP = process.env.NEUROLINK_SKIP_MCP;
  process.env.NEUROLINK_SKIP_MCP = "true";
  let call = 0;
  try {
    globalThis.fetch = (async () => {
      call++;
      if (call === 1) {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            const enc = new TextEncoder();
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({
                  choices: [
                    {
                      index: 0,
                      delta: {
                        tool_calls: [
                          {
                            index: 0,
                            id: "tc1",
                            type: "function",
                            function: { name: "ping", arguments: "{}" },
                          },
                        ],
                      },
                      finish_reason: null,
                    },
                  ],
                })}\n\n`,
              ),
            );
            controller.enqueue(
              enc.encode(
                `data: ${JSON.stringify({
                  choices: [
                    { index: 0, delta: {}, finish_reason: "tool_calls" },
                  ],
                })}\n\n`,
              ),
            );
            controller.enqueue(enc.encode("data: [DONE]\n\n"));
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "text/event-stream" },
        });
      }
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
              })}\n\n`,
            ),
          );
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof fetch;
    // The public surface, not a provider handed a NeuroLink: the fetch
    // stub is global, so it reaches the dist bundle's provider too.
    const { NeuroLink, jsonSchema } = await import("../dist/index.js");
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const events: string[] = [];
    const emitter = nl.getEventEmitter();
    emitter.on("tool:start", () => events.push("start"));
    emitter.on("tool:end", () => events.push("end"));
    let toolRuns = 0;
    const result = await nl.stream({
      input: { text: "ping" },
      provider: "openai-compatible",
      model: "test-model",
      disableInternalFallback: true,
      credentials: {
        openaiCompatible: { apiKey: "k", baseURL: "http://fake.local/v1" },
      },
      disableTools: false,
      tools: {
        ping: {
          description: "p",
          inputSchema: jsonSchema({
            type: "object",
            properties: {},
            required: [],
          }),
          execute: async () => {
            toolRuns++;
            return "pong";
          },
        },
      },
    });
    for await (const _ of result.stream) {
      void _;
    }
    // Exactly one pair per execution, not merely both present. Per-call tools
    // are event-wrapped once, at BaseProvider's merge point, and the provider
    // loop must use that merged record as is: a second wrapper layer (the
    // loop's own emit, or re-instrumenting a recorder-wrapped tool) doubles
    // both counts while still looking "paired". Moved here from
    // continuous-test-suite-bugfixes.ts, which loads src/ and must not also
    // load this dist/ graph.
    const starts = events.filter((e) => e === "start").length;
    const ends = events.filter((e) => e === "end").length;
    assert(
      toolRuns === 1,
      "the public stream must execute the tool exactly once",
    );
    assert(
      starts === 1 && ends === 1,
      `one tool execution must emit exactly one tool:start and one tool:end, saw ${starts} and ${ends}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSkipMCP === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = previousSkipMCP;
    }
  }
});

await test("NeuroLink.stream (litellm) streams text deltas via SSE", async () => {
  const originalFetch = globalThis.fetch;
  const previousSkipMCP = process.env.NEUROLINK_SKIP_MCP;
  process.env.NEUROLINK_SKIP_MCP = "true";
  try {
    globalThis.fetch = (async () => {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                choices: [
                  {
                    index: 0,
                    delta: { content: "hello " },
                    finish_reason: null,
                  },
                ],
              })}\n\n`,
            ),
          );
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({
                choices: [
                  {
                    index: 0,
                    delta: { content: "world" },
                    finish_reason: "stop",
                  },
                ],
              })}\n\n`,
            ),
          );
          controller.enqueue(enc.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "text/event-stream" },
      });
    }) as typeof fetch;
    const { NeuroLink } = await import("../dist/index.js");
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.stream({
      input: { text: "hi" },
      provider: "litellm",
      model: "openai/gpt-4o-mini",
      disableInternalFallback: true,
      credentials: {
        litellm: { apiKey: "k", baseURL: "http://fake.local" },
      },
      disableTools: true,
    });
    let collected = "";
    for await (const chunk of result.stream) {
      if ("content" in chunk && typeof chunk.content === "string") {
        collected += chunk.content;
      }
    }
    assert(
      collected === "hello world",
      "the public stream must preserve all text deltas",
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (previousSkipMCP === undefined) {
      delete process.env.NEUROLINK_SKIP_MCP;
    } else {
      process.env.NEUROLINK_SKIP_MCP = previousSkipMCP;
    }
  }
});

await test("OpenAI sends tools together with an optional-field schema", async () => {
  const { startLocalOpenAICompatible, toolNamesOnWire, responseFormatOnWire } =
    await import("./helpers/openaiCompatibleLocalEndpoint.js");
  const { NeuroLink, jsonSchema } = await import("../dist/index.js");
  const { z } = await import("zod");
  const local = await startLocalOpenAICompatible();
  const savedEnv = { ...process.env };
  process.env.NEUROLINK_SKIP_MCP = "true";
  try {
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });

    const before = local.requests.length;
    await nl.generate({
      input: { text: "Return the capital of France." },
      provider: "openai",
      model: "gpt-4o-mini",
      disableInternalFallback: true,
      credentials: { openai: { apiKey: "fixture", baseURL: local.baseURL } },
      schema: z.object({
        capital: z.string(),
        population: z.number().optional(),
      }),
      disableTools: false,
      tools: {
        ping: {
          description: "Return pong",
          inputSchema: jsonSchema({ type: "object", properties: {} }),
          execute: async () => "pong",
        },
      },
    });
    const sent = local.requests[before];
    assert(
      !!sent && toolNamesOnWire(sent).includes("ping"),
      "the explicit tool must reach the endpoint",
    );
    const format = responseFormatOnWire(sent) as {
      json_schema?: { schema?: { required?: string[] } };
    } | null;
    assert(
      !!format?.json_schema?.schema,
      "the tool-bearing request must also contain a JSON schema",
    );
    assert(
      !format!.json_schema!.schema!.required?.includes("population"),
      "the optional field must stay outside the required list",
    );
  } finally {
    await local.close();
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
});

// Shared by the two redirect cases below. One local server plays the image
// host (`/start.png` answers 302 to `/final.png`) and the OpenAI-compatible
// provider (any POST). Each call binds a fresh port, so a URL cache cannot hide
// a download that was never made.
async function expectRedirectedImageDownload(): Promise<void> {
  const { NeuroLink } = await import("../dist/index.js");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  const savedEnv = { ...process.env };
  process.env.NEUROLINK_SKIP_MCP = "true";
  let finalDownloads = 0;
  const bodies: string[] = [];
  const server = createServer((req, res) => {
    if (req.url === "/start.png") {
      res.writeHead(302, { location: "/final.png" });
      res.end();
    } else if (req.url === "/final.png") {
      if (req.method === "GET") {
        finalDownloads++;
      }
      res.writeHead(200, {
        "content-type": "image/png",
        "content-length": png.length,
      });
      res.end(req.method === "HEAD" ? undefined : png);
    } else if (req.method === "POST") {
      let body = "";
      req.on("data", (chunk) => {
        body += String(chunk);
      });
      req.on("end", () => {
        bodies.push(body);
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            id: "image-fixture",
            object: "chat.completion",
            created: 1,
            model: "gpt-4o-mini",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "image received" },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 2,
              total_tokens: 12,
            },
          }),
        );
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert(
      !!address && typeof address === "object",
      "the fixture must bind a port",
    );
    const origin = `http://127.0.0.1:${(address as { port: number }).port}`;
    const nl = new NeuroLink({ conversationMemory: { enabled: false } });
    const result = await nl.generate({
      input: {
        text: "Describe the image.",
        images: [`${origin}/start.png`],
      },
      provider: "openai",
      model: "gpt-4o-mini",
      disableTools: true,
      disableInternalFallback: true,
      credentials: {
        openai: { apiKey: "fixture", baseURL: `${origin}/v1` },
      },
    });
    assert(
      result.content === "image received",
      "the generation must reach the fixture",
    );
    assert(finalDownloads > 0, "the redirect must reach the final image route");
    assert(
      bodies.some((body) => body.includes(png.toString("base64"))),
      "the downloaded image bytes must reach the provider request",
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    for (const key of Object.keys(process.env)) {
      if (!(key in savedEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, savedEnv);
  }
}

await test("NeuroLink.generate downloads a redirecting image URL on this runtime's native undici branch", async () => {
  // redirectFollowingDispatcher() composes onto Node's global dispatcher only
  // when the built-in undici major equals the package's own (7, see
  // NPM_UNDICI_MAJOR in redirectDispatcher.ts); otherwise onto a fresh Agent.
  // Which one this run takes depends on the runtime, so say so: on a major-6
  // runtime this case and the next both take the mismatch branch and the
  // matching branch is not exercised at all.
  const nativeMajor = Number.parseInt(
    process.versions.undici?.split(".")[0] ?? "",
    10,
  );
  assert(
    Number.isFinite(nativeMajor),
    "the runtime must report a built-in undici version",
  );
  console.log(
    `    [diagnostic] undici native major ${nativeMajor}: redirect branch = ${nativeMajor === 7 ? "matching (global dispatcher)" : "mismatch (fresh Agent)"}`,
  );
  await expectRedirectedImageDownload();
});

await test("NeuroLink.generate downloads a redirecting image URL on the mismatched-undici branch (process.versions.undici forced to 6.28.0)", async () => {
  // Forcing major 6 makes the dispatcher pick its own fresh Agent, which is the
  // branch a real major-6 runtime takes. It does not make a major-6 dispatcher
  // pass for major 7: only the version string the function reads is changed.
  const original = Object.getOwnPropertyDescriptor(process.versions, "undici");
  Object.defineProperty(process.versions, "undici", {
    value: "6.28.0",
    configurable: true,
  });
  try {
    await expectRedirectedImageDownload();
  } finally {
    if (original) {
      Object.defineProperty(process.versions, "undici", original);
    } else {
      Reflect.deleteProperty(process.versions, "undici");
    }
  }
});

await runSuite();
