# Tier 2 — Catalog Entry

**When this applies:** the vendor speaks the OpenAI `/v1/chat/completions`
wire format (Bearer auth, standard SSE, standard JSON body) and needs
**zero** behavioral overrides — no custom `adjustRequestBody`, no
`adjustResponseFormat`, no nonstandard auth header, no `adjustBodyAfter400`.
This is the Groq/xAI/Together AI/Fireworks/Perplexity/Cloudflare/Mistral
shape from before the redesign — now expressed as one data row instead of
a hand-written subclass file (see `../adr/0002-catalog-over-subclass-default.md`).

If you're not sure whether your provider is quirk-free, start writing the
catalog entry anyway — if it turns out you need a hook, migrate to
Tier 3 instead of forcing the quirk into the
catalog shape.

## Files touched (end state)

| #   | File                                              | Change                                                                                                               |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/lib/constants/enums.ts`                      | One new `AIProviderName` member                                                                                      |
| 2   | `src/lib/providers/openaiCompatCatalog.ts`        | One `OpenAICompatCatalogEntry` object appended to `OPENAI_COMPAT_CATALOG`                                            |
| 3   | `src/lib/utils/providerConfig.ts`                 | One `create<Name>Config()` helper returning `ProviderConfigOptions` (referenced from Step 1's `configOptions` field) |
| 4   | `src/lib/factories/providerDescriptors.ts`        | One `ProviderDescriptor` object appended to `PROVIDER_DESCRIPTORS`                                                   |
| 5   | `src/lib/types/providers.ts`                      | One new `NeurolinkCredentials["<key>"]` slice                                                                        |
| 6   | `test/continuous-test-suite-providers-mocked.ts`  | One mocked-contract section (happy-path + 401)                                                                       |
| 7   | `docs/provider-integration/manifests/<name>.json` | New manifest (see `../manifests/README.md`)                                                                          |

Notice `src/lib/factories/providerRegistry.ts` isn't in this table. That's
the point of the catalog path, and it's live today: `_doRegister()` already
contains a loop over `OPENAI_COMPAT_CATALOG` that registers every entry
generically (see "Registration" below). Appending your entry in Step 1 is
what gets your provider registered — there is no hand-written
`ProviderFactory.registerProvider()` block to add for a Tier 2 provider.

This list assumes downstream subsystems (`commandFactory.ts`'s main
`--provider` choices, `providerHealth.ts`) read from `PROVIDER_DESCRIPTORS`
automatically — verified true as of 2026-08-18. One confirmed exception:
`commandFactory.ts`'s separate `setup [provider]` subcommand still
hand-hardcodes its own provider-choices array, not yet derived from
`PROVIDER_DESCRIPTORS` — add your provider there by hand too, or check
whether it's been migrated by the time you read this.

## Step 1 — catalog entry

`src/lib/providers/openaiCompatCatalog.ts`, appended to
`OPENAI_COMPAT_CATALOG` (the real shape — every field below is required
unless marked optional; see `type OpenAICompatCatalogEntry` in
`src/lib/types/providers.ts` for the authoritative definition):

```typescript
{
  providerName: AIProviderName.CEREBRAS,
  aliases: ["cerebras"],
  apiKeyEnvVar: "CEREBRAS_API_KEY",
  baseURLEnvVar: "CEREBRAS_BASE_URL",
  defaultBaseURL: "https://api.cerebras.ai/v1",
  configOptions: createCerebrasConfig(), // ProviderConfigOptions — see below
  modelEnvVar: "CEREBRAS_MODEL",
  defaultModel: "llama3.1-70b",
  registryDefaultModel: "llama3.1-70b",
  registryDefaultModelChecksEnvVar: true,
  fallbackModelName: "llama3.1-8b",
  fallbackModels: ["llama3.1-70b", "llama3.1-8b"],
  errorRules: [
    // Add vendor-specific rules only where the vendor's error bodies need a
    // match beyond DEFAULT_ERROR_RULES — most Tier 2 providers only need:
    ...DEFAULT_ERROR_RULES,
  ],
},
```

`configOptions` is a `ProviderConfigOptions` object, conventionally built
by a small `create<Name>Config()` helper in `src/lib/utils/providerConfig.ts`
(see `createGroqConfig()` there for the exact, currently-shipping pattern):

```typescript
export function createCerebrasConfig(): ProviderConfigOptions {
  return {
    providerName: "Cerebras",
    envVarName: "CEREBRAS_API_KEY",
    setupUrl: "https://cloud.cerebras.ai/platform/apikeys",
    description: "API key",
    instructions: [
      "1. Visit: https://cloud.cerebras.ai/platform/apikeys",
      "2. Sign in to your Cerebras account",
      "3. Create a new API key",
      "4. Set CEREBRAS_API_KEY in your .env file",
    ],
  };
}
```

`computedBaseURL` (an alternative to `baseURLEnvVar`/`defaultBaseURL`) is
only needed for a vendor whose base URL is derived from another required
credential value at runtime, like Cloudflare's account id — most Tier 2
providers use the static `baseURLEnvVar`/`defaultBaseURL` pair shown
above instead.

### Escape hatch: `timeoutErrorClass`

`classifyProviderError()` hard-codes `TimeoutError -> NetworkError`
unconditionally, ahead of any rule table, and doesn't make that mapping
overridable per-provider. If your vendor's timeout behavior needs a
different Error subclass, set the optional `timeoutErrorClass` field to
override it for that one entry — omit it otherwise, which is what 6 of
the 7 live catalog entries do (they all take the classifier's `NetworkError`
default).

Groq is the one entry that sets it, because its pre-migration hand-written
subclass predated the shared classifier and intercepted `TimeoutError`
itself, returning a plain `ProviderError`. The catalog entry
(`openaiCompatCatalog.ts`) reproduces that one documented divergence as
data instead of a class-level hook:

```typescript
{
  providerName: AIProviderName.GROQ,
  // ...
  // Groq's pre-migration subclass intercepted TimeoutError itself and
  // returned a plain ProviderError, ahead of classifyProviderError's own
  // non-overridable TimeoutError -> NetworkError default. Expressed here
  // as data — see OpenAICompatCatalogEntry.timeoutErrorClass and
  // ConfiguredOpenAICompatProvider.formatProviderError, which consults
  // this field before ever delegating to the shared classifier. No other
  // entry in this catalog sets it, so every other provider still gets
  // the classifier's unmodified default.
  timeoutErrorClass: ProviderError,
  errorRules: [ /* ... */ ],
},
```

Only reach for this if your vendor genuinely needs a different timeout
Error subclass than the classifier's default — it's a per-entry override
of one specific, otherwise-fixed classifier decision, not a general
escape hatch for other error-mapping quirks (those belong in `errorRules`
instead, or in a Tier 3 subclass if they need real logic).

`test/continuous-test-suite-error-classifier-contract.ts` asserts this
mapping per provider (Groq -> `ProviderError`, every other catalog entry
-> `NetworkError`). If your new entry sets `timeoutErrorClass`, or adds
`errorRules` beyond `DEFAULT_ERROR_RULES`, add a matching case there too —
the mocked-contract test in Step 4 covers auth/timeout status-code
mapping generically, but classifier-level coverage for a provider-specific
rule is its own assertion.

## Step 2 — descriptor entry

`src/lib/factories/providerDescriptors.ts`, appended to
`PROVIDER_DESCRIPTORS`:

```typescript
{
  name: AIProviderName.CEREBRAS,
  aliases: ["cerebras"] as const,
  credentialsKey: "cerebras",
  envVars: {
    apiKey: "CEREBRAS_API_KEY",
    baseURL: "CEREBRAS_BASE_URL",
    model: "CEREBRAS_MODEL",
  },
  defaultModel: "llama3.1-70b",
  toolSupport: "native",
  localRuntime: false,
  healthCheck: "env-only",
},
```

## Step 3 — credentials slice

`src/lib/types/providers.ts`, inside `NeurolinkCredentials`:

```typescript
cerebras?: {
  apiKey?: string;
  baseURL?: string;
};
```

## Registration (no action needed)

Unlike every other tier, Tier 2 has no registration step to write.
`src/lib/factories/providerRegistry.ts`'s `_doRegister()` already contains
one loop that registers every row in `OPENAI_COMPAT_CATALOG` generically:

```typescript
// Register the config-driven OpenAI-compatible catalog providers
// (groq, xai, together-ai, fireworks, perplexity, mistral, cloudflare).
// To add a new zero-quirk OpenAI-compatible provider, add one entry to
// OPENAI_COMPAT_CATALOG (openaiCompatCatalog.ts) — not a new block here.
for (const entry of OPENAI_COMPAT_CATALOG) {
  ProviderFactory.registerProvider(
    entry.providerName,
    async (
      modelName?: string,
      _providerName?: string,
      sdk?: NeuroLink,
      _region?: string,
      credentials?: UnknownRecord,
    ) => {
      const { ConfiguredOpenAICompatProvider } =
        await import("../providers/configuredOpenAICompat.js");
      return new ConfiguredOpenAICompatProvider(
        entry,
        modelName,
        sdk,
        credentials as OpenAICompatCredentials | undefined,
      );
    },
    entry.registryDefaultModelChecksEnvVar
      ? process.env[entry.modelEnvVar] || entry.registryDefaultModel
      : entry.registryDefaultModel,
    entry.aliases,
    PROVIDER_DESCRIPTORS_BY_NAME.get(entry.providerName),
  );
}
```

The Step 1 entry you appended to `OPENAI_COMPAT_CATALOG` is picked up by
this loop the moment `_doRegister()` runs — that's the whole reason
`entry.aliases`, `entry.registryDefaultModel`/`registryDefaultModelChecksEnvVar`,
and `entry.providerName` exist as fields: they're exactly the arguments
`registerProvider()` needs, now supplied as data instead of typed out per
provider. `ConfiguredOpenAICompatProvider` is dynamically imported once
per registration call, same as every other provider factory (Critical
Rule 1 still applies — it's just satisfied by the loop body, not by you).

One thing worth knowing if you go looking at `providerRegistry.ts`
directly: it also exports a `PROVIDER_MODULE_TO_ID` manifest (added by
`0e935499`, unrelated to this migration) that maps _module files_ under
`src/lib/providers/` to the provider ID they register, for static
scanners that can't resolve the dynamic `import()` calls. `groq`, `xai`,
`togetherAi`, `fireworks`, `perplexity`, `mistral`, and `cloudflare` each
still have their own key there — a holdover from when they were separate
subclass files, deliberately kept so each catalog-driven ID still has one
honest manifest entry, since the shared `configuredOpenAICompat.ts`
module that now registers all seven can't be mapped 1:1 to any single ID
(`test/continuous-test-suite-provider-structure.ts` excludes it from that
requirement by name). **You do not need to add a `PROVIDER_MODULE_TO_ID`
entry for a new Tier 2 provider** — the manifest check only walks static
`import("../providers/<name>.js")` strings actually present in
`providerRegistry.ts`, and a new catalog row never produces one (it goes
through the same already-excluded shared import).

## Step 4 — mocked contract test

`test/continuous-test-suite-providers-mocked.ts`, following the existing
`OPENAI_COMPAT_PROVIDERS` array as a template (the shared runner used by
xAI, Groq, Together AI, Fireworks, Perplexity, Cohere, and Cloudflare
today):

```typescript
{
  provider: "cerebras",
  envVar: "CEREBRAS_API_KEY",
  urlMatch: "api.cerebras.ai/v1/chat/completions",
  authPrefix: "Bearer ",
  model: "llama3.1-70b",
  authErrorMatch: /cerebras|401|unauthor|api key/i,
},
```

added as one more entry to the `OPENAI_COMPAT_PROVIDERS` array — the
shared `runOpenAICompatProvider()` function then covers happy-path parse
and 401 mapping for you without any bespoke test code.

## Step 5 — manifest

`docs/provider-integration/manifests/cerebras.json`:

```json
{
  "provider": "cerebras",
  "tier": 2,
  "addedInPR": "https://github.com/juspay/neurolink/pull/<PR-NUMBER>",
  "addedDate": "2026-08-15",
  "filesTouched": [
    "src/lib/constants/enums.ts",
    "src/lib/providers/openaiCompatCatalog.ts",
    "src/lib/utils/providerConfig.ts",
    "src/lib/factories/providerDescriptors.ts",
    "src/lib/types/providers.ts",
    "test/continuous-test-suite-providers-mocked.ts"
  ],
  "mockedContractSection": "LLM cerebras",
  "manualTestStatus": "not-tested"
}
```

## Verification commands

```bash
pnpm run check
pnpm run lint
pnpm run test:providers-mocked
pnpm run test:provider-structure
pnpm run test:error-classifier-contract
pnpm run verify:provider-onboarding
pnpm run build
pnpm run cli generate "hello" --provider cerebras
```

All commands must pass/exit 0 before opening the PR.
`test:providers-mocked`, `test:provider-structure`, and
`test:error-classifier-contract` all run in the `provider-safety-net` CI
job (`.github/workflows/ci.yml`) — they're zero-API, zero-credential
structural/contract checks, so there's no reason to skip them locally.
`test:provider-structure` won't fail on a new Tier 2 entry (it doesn't
require one — see "Registration" above), but it's a fast, useful sanity
check after touching anything registry-adjacent. Add a case to
`test:error-classifier-contract` first if your entry sets
`timeoutErrorClass` or vendor-specific `errorRules` beyond
`DEFAULT_ERROR_RULES` (see "Escape hatch: `timeoutErrorClass`" above).
(`pnpm run verify:provider-onboarding` doesn't exist yet as of 2026-08-19
— it's a follow-up change to this plan (Tasks 8-9). Until it lands, treat
the rest as the enforced minimum.)
