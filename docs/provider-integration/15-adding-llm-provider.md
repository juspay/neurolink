# 15 · Adding a New LLM Provider — Exhaustive Guide

This is the canonical how-to for adding a new chat / text-generation provider (OpenAI-compat, AWS, Vertex, Anthropic, custom REST, etc.) to NeuroLink.

It generalises the patterns shipped in commits `c829f4de` (DeepSeek/NIM/LM Studio/llama.cpp), `8918f8ef` (LiteLLM), `3041d26f` (OpenAI-Compatible), and `9ef4ebee` (SageMaker). Read [`00-architecture.md`](00-architecture.md) first; this document assumes you understand the BaseProvider / Factory / Registry pattern.

> **Scope:** chat / text generation. For TTS / STT / realtime / video / image / new modalities, see the matching guide (`16` … `22`).

---

## Table of Contents

1. [Decision tree — pick your starting point](#decision-tree)
2. [The 12-file checklist](#the-12-file-checklist)
3. [Step 1 — Create the provider class](#step-1--create-the-provider-class)
4. [Step 2 — Add to the AIProviderName enum](#step-2--add-to-the-aiprovidername-enum)
5. [Step 3 — Add a Models enum](#step-3--add-a-models-enum)
6. [Step 4 — Extend NeurolinkCredentials](#step-4--extend-neurolinkcredentials)
7. [Step 5 — Add a providerConfig helper](#step-5--add-a-providerconfig-helper)
8. [Step 6 — Register in providerRegistry.ts](#step-6--register-in-providerregistryts)
9. [Step 7 — Add barrel export](#step-7--add-barrel-export)
10. [Step 8 — Add context window entries](#step-8--add-context-window-entries)
11. [Step 9 — Add modelChoices entries](#step-9--add-modelchoices-entries)
12. [Step 10 — Add vision capability](#step-10--add-vision-capability)
13. [Step 11 — Wire CLI flags](#step-11--wire-cli-flags)
14. [Step 12 — Update .env.example](#step-12--update-envexample)
15. [Step 13 — Pricing table entry](#step-13--pricing-table-entry)
16. [Step 14 — Tests](#step-14--tests)
17. [Step 15 — Documentation](#step-15--documentation)
18. [Step 16 — Validation gates](#step-16--validation-gates)
19. [Variants and edge cases](#variants-and-edge-cases)

---

## Decision tree

```
Is the provider OpenAI-compatible (/v1/chat/completions, Bearer auth)?
├─ Yes → use createOpenAI({ baseURL, apiKey, fetch }).chat(modelId)
│        Examples: DeepSeek, NVIDIA NIM, LM Studio, llama.cpp, OpenRouter
│        Easiest path. Use this guide's main template.
├─ No, but has a first-party AI SDK package (@ai-sdk/<x>)?
│        Examples: Mistral, Anthropic, Google AI Studio
│        Use the SDK's exported model factory. Same pattern, different import.
└─ No SDK and not OpenAI-compatible?
         Examples: Bedrock (uses @ai-sdk/amazon-bedrock), custom REST API
         You may need a custom executeStream override. See SageMaker
         (src/lib/providers/amazonSagemaker.ts) for a custom-protocol example.

Does the provider need its own subcommand surface (e.g., model management)?
├─ Yes → also create src/cli/factories/<name>CommandFactory.ts
│        Examples: Ollama (OllamaCommandFactory), SageMaker (SagemakerCommandFactory)
└─ No  → only commandFactory.ts edits needed (most providers)
```

---

## The 12-file checklist

Every new LLM provider touches exactly 12 files. One is new; eleven are edits.

| #   | File                                       | Action | What changes                                           |
| --- | ------------------------------------------ | ------ | ------------------------------------------------------ |
| 1   | `src/lib/providers/<name>.ts`              | NEW    | The provider class                                     |
| 2   | `src/lib/constants/enums.ts`               | EDIT   | Add to `AIProviderName` + add `<Name>Models`           |
| 3   | `src/lib/types/providers.ts`               | EDIT   | Extend `NeurolinkCredentials`                          |
| 4   | `src/lib/utils/providerConfig.ts`          | EDIT   | Add `create<Name>Config()`                             |
| 5   | `src/lib/factories/providerRegistry.ts`    | EDIT   | Add `registerProvider` block                           |
| 6   | `src/lib/providers/index.ts`               | EDIT   | Add re-export                                          |
| 7   | `src/lib/constants/contextWindows.ts`      | EDIT   | Add `<provider>: { ... }` block                        |
| 8   | `src/lib/utils/modelChoices.ts`            | EDIT   | Add `TOP_MODELS_CONFIG` + `DEFAULT_MODELS` rows        |
| 9   | `src/lib/adapters/providerImageAdapter.ts` | EDIT   | Add `VISION_CAPABILITIES` entry                        |
| 10  | `src/cli/factories/commandFactory.ts`      | EDIT   | 3 spots (provider choices, secondary, bash completion) |
| 11  | `.env.example`                             | EDIT   | Append env-var section                                 |
| 12  | `src/lib/utils/pricing.ts`                 | EDIT   | Add cost-per-1M-token entry                            |

Then tests (1–2 files) and docs (2–3 files). See sections 14 & 15.

---

## Step 1 — Create the provider class

**File:** `src/lib/providers/<name>.ts` — NEW.

Skeleton (OpenAI-compatible cloud provider, the most common case):

```typescript
/**
 * <Provider Display Name> Provider
 *
 * <One-line description of what's special about this provider.>
 *
 * @see <Provider docs URL>
 */

import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "@ai-sdk/provider";
import { streamText } from "ai";

import {
  AIProviderName,
  ErrorCategory,
  ErrorSeverity,
} from "../constants/enums.js";
import { BaseProvider } from "../core/baseProvider.js";
import type {
  NeurolinkCredentials,
  StreamOptions,
  StreamResult,
  ValidationSchema,
} from "../types/index.js";
import { NeuroLinkError } from "../utils/errorHandling.js";
import { createProxyFetch } from "../utils/fetchProxy.js";
import { logger } from "../utils/logger.js";
import {
  validateApiKey,
  create<Name>Config,
} from "../utils/providerConfig.js";
import type { NeuroLink } from "../neurolink.js";

const DEFAULT_BASE_URL = "https://api.<provider>.com/v1";
const DEFAULT_MODEL = "<provider>-default-model";

export class <Name>Provider extends BaseProvider {
  private client: ReturnType<typeof createOpenAI>;

  constructor(
    modelName?: string,
    sdk?: NeuroLink | undefined,
    _region?: string,
    credentials?: NeurolinkCredentials["<key>"],
  ) {
    super(
      modelName ||
        process.env.<NAME>_MODEL ||
        DEFAULT_MODEL,
      AIProviderName.<NAME>,
      sdk,
    );

    // Per-call credentials > env vars > documented defaults
    const apiKey =
      credentials?.apiKey ??
      validateApiKey(create<Name>Config());

    const baseURL =
      credentials?.baseURL ??
      process.env.<NAME>_BASE_URL ??
      DEFAULT_BASE_URL;

    this.client = createOpenAI({
      baseURL,
      apiKey,
      fetch: createProxyFetch(),
      compatibility: "compatible", // Tells AI SDK to use OpenAI-compat dialect
    });
  }

  // ===== Required abstract overrides =====

  protected getProviderName(): AIProviderName {
    return AIProviderName.<NAME>;
  }

  protected getDefaultModel(): string {
    return process.env.<NAME>_MODEL || DEFAULT_MODEL;
  }

  protected getAISDKModel(): LanguageModel {
    return this.client.chat(this.modelName);
  }

  protected async executeStream(
    options: StreamOptions,
    analysisSchema?: ValidationSchema,
  ): Promise<StreamResult> {
    this.validateStreamOptions(options);

    const messages = await this.buildMessagesForStream(options);
    const tools = options.tools ?? (await this.getAllTools());
    const model = await this.getAISDKModelWithMiddleware(options);

    const result = streamText({
      model,
      messages,
      tools,
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      abortSignal: options.abortSignal,
      experimental_telemetry: this.telemetryHandler.getTelemetryConfig(
        options,
        "stream",
      ),
      experimental_repairToolCall: this.getToolCallRepairFn(options),
      // For provider-specific extras, pass via providerOptions.openai.body
    });

    return this.createTextStream(result);
  }

  protected formatProviderError(error: unknown): Error {
    // CLAUDE.md rule #6 — must RETURN, never THROW.
    if (error instanceof NeuroLinkError) return error;

    const msg = error instanceof Error ? error.message : String(error);

    // Map well-known upstream error patterns to friendly messages.
    if (msg.toLowerCase().includes("invalid api key")) {
      return new NeuroLinkError({
        code: "<NAME>_AUTH_FAILED",
        message: "Invalid <Provider> API key. Check <NAME>_API_KEY.",
        category: ErrorCategory.CONFIGURATION,
        severity: ErrorSeverity.HIGH,
        retriable: false,
        originalError: error instanceof Error ? error : undefined,
      });
    }

    if (msg.toLowerCase().includes("rate limit")) {
      return new NeuroLinkError({
        code: "<NAME>_RATE_LIMIT",
        message: "<Provider> rate limit exceeded. Back off and retry.",
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        retriable: true,
        originalError: error instanceof Error ? error : undefined,
      });
    }

    return new NeuroLinkError({
      code: "<NAME>_REQUEST_FAILED",
      message: `<Provider> request failed: ${msg}`,
      category: ErrorCategory.EXECUTION,
      severity: ErrorSeverity.HIGH,
      retriable: true,
      originalError: error instanceof Error ? error : undefined,
    });
  }

  // ===== Optional overrides =====

  // Override only if your provider does NOT support tool calling.
  // Default returns `true`.
  // protected supportsTools(): boolean { return true; }

  // Override only if your provider exposes embeddings.
  // Default throws "not supported".
  // protected getDefaultEmbeddingModel(): string | undefined {
  //   return "<provider>-embed-001";
  // }

  // Public — used by the credentials CLI to validate setup.
  public validateConfiguration(): boolean {
    return Boolean(process.env.<NAME>_API_KEY);
  }
}
```

### Variants

**Local provider with auto-discovery** (LM Studio, llama.cpp): the constructor reads `/v1/models`, picks the first one if `modelName` is empty, and updates `this.modelName` (note: `BaseProvider.modelName` was made non-readonly in commit `c829f4de` to support this). See `src/lib/providers/lmStudio.ts:43-89` and `llamaCpp.ts:62-126` as references.

**Provider with extra body params** (NVIDIA NIM): pass via `providerOptions.openai.body` and add a retry-on-400 path that strips unsupported fields. See `src/lib/providers/nvidiaNim.ts:178-261`.

**Provider with reasoning trace** (DeepSeek-R1, OpenAI o1): the AI SDK surfaces `reasoning` parts automatically when the upstream returns `reasoning_content`. No extra code needed.

**Provider with custom protocol** (Bedrock-style, SageMaker): if you can't use `createOpenAI`, override `getAISDKModel()` to return your own `LanguageModel` from a different `@ai-sdk/<x>` package, or implement a custom protocol module (see `src/lib/providers/sagemaker/` for the multi-file pattern).

---

## Step 2 — Add to the AIProviderName enum

**File:** `src/lib/constants/enums.ts`.

```diff
 export enum AIProviderName {
   OPENAI = "openai",
   ANTHROPIC = "anthropic",
   ...
   SAGEMAKER = "sagemaker",
+  <NAME> = "<provider-name>",
   AUTO = "auto",
 }
```

The string value is the canonical CLI / API token (`provider: "<provider-name>"`).

> **CLAUDE.md rule 9:** if any future provider could share a generic identifier with yours, prefix it. The enum keys are uppercase domain identifiers — collisions there are rare but the model-enum names below need careful prefixing.

---

## Step 3 — Add a Models enum

Same file (`src/lib/constants/enums.ts`). Append:

```typescript
/**
 * <Provider> models.
 * @see <Provider model catalog URL>
 */
export enum <Name>Models {
  /** <Description of model 1> */
  MODEL_ONE = "<provider>-model-1",
  /** <Description of model 2> */
  MODEL_TWO = "<provider>-model-2",
}
```

For local providers that auto-discover the loaded model:

```typescript
export enum LMStudioModels {
  /** Sentinel — triggers auto-discovery from /v1/models */
  AUTO_DISCOVER = "",
}
```

Use a real default when one exists; otherwise document that a `<NAME>_MODEL` env var is required.

---

## Step 4 — Extend NeurolinkCredentials

**File:** `src/lib/types/providers.ts`.

```diff
 export type NeurolinkCredentials = {
   ...
   ollama?: { baseURL?: string };
+  <camelCaseKey>?: { apiKey?: string; baseURL?: string };
 };
```

The key is the camel-case provider name (`deepseek`, `nvidiaNim`, `lmStudio`, `llamacpp`). Always allow `apiKey` and `baseURL` even if the provider doesn't currently use one — future proxy / self-host scenarios benefit.

> **CLAUDE.md rule 11:** do NOT create `src/lib/types/<provider>/`. The credentials extension lives in the existing `providers.ts`.

---

## Step 5 — Add a providerConfig helper

**File:** `src/lib/utils/providerConfig.ts`.

```typescript
/**
 * Creates <Provider> configuration
 */
export function create<Name>Config(): ProviderConfigOptions {
  return {
    providerName: "<Display Name>",
    envVarName: "<NAME>_API_KEY",
    setupUrl: "<API key signup URL>",
    description: "API key",
    instructions: [
      "1. Visit: <signup URL>",
      "2. Sign in / create account",
      "3. Generate API key",
      "4. Set <NAME>_API_KEY in your .env file",
    ],
  };
}
```

For local providers (no API key required by default):

```typescript
export function create<Name>Config(): ProviderConfigOptions {
  return {
    providerName: "<Display Name>",
    envVarName: "<NAME>_BASE_URL", // base URL, not API key
    setupUrl: "<setup docs URL>",
    description: "<Provider> server URL",
    instructions: [
      "1. Install <Provider>: <download URL>",
      "2. Start the local server",
      "3. Default URL is http://localhost:<port>/v1 (override via <NAME>_BASE_URL)",
    ],
    optional: true, // Marks env value as not-required → validateApiKey returns "" instead of throwing
  };
}
```

This helper is consumed by `validateApiKey` (throws helpful errors when env is missing) and by the interactive setup wizard (`src/cli/utils/interactiveSetup.ts`).

---

## Step 6 — Register in providerRegistry.ts

**File:** `src/lib/factories/providerRegistry.ts`.

Add a registration block inside `_doRegister()`, after the last existing provider. **All imports must be dynamic** (CLAUDE.md rule #1):

```typescript
// Register <Provider> provider
ProviderFactory.registerProvider(
  AIProviderName.<NAME>,
  async (
    modelName?: string,
    _providerName?: string,
    sdk?: UnknownRecord,
    _region?: string,
    credentials?: UnknownRecord,
  ) => {
    const creds = credentials as NeurolinkCredentials["<key>"];
    const { <Name>Provider } = await import("../providers/<file>.js");
    return new <Name>Provider(
      modelName,
      sdk as unknown as NeuroLink | undefined,
      undefined,
      creds,
    );
  },
  process.env.<NAME>_MODEL || <Name>Models.<DEFAULT>,
  ["<canonical>", "<alias-1>", "<alias-2>"],
);
```

Also extend the imports at the top of the file:

```diff
 import {
   AIProviderName,
   GoogleAIModels,
   ...
+  <Name>Models,
 } from "../constants/enums.js";
```

> **Why dynamic?** Static imports here transitively pull every provider into the registry's module graph at load time, creating cycles (the providers import from `../core/`, which imports from `../neurolink.js`, which imports from `../factories/...`). Dynamic imports break the cycle.

---

## Step 7 — Add barrel export

**File:** `src/lib/providers/index.ts`.

```diff
 export { LiteLLMProvider as LiteLLM } from "./litellm.js";
+export { <Name>Provider as <DisplayShort> } from "./<file>.js";
```

This is the only place the provider class is statically importable from outside the registry — useful for direct instantiation in tests.

---

## Step 8 — Add context window entries

**File:** `src/lib/constants/contextWindows.ts`.

```typescript
"<provider-name>": {
  _default: 64_000,
  "<provider>-model-1": 64_000,
  "<provider>-model-2": 128_000,
  // ... per-model entries
},
```

The `_default` is used when the model name doesn't match any specific entry. For local providers where the window depends on the loaded model, set `_default` to a conservative value (e.g., `8_192`).

`getOutputReserve()` in this file clamps to 80% of the context window. If you pass `maxTokens === contextWindow`, you get a 0-token input budget and every request fails. The clamp prevents that — but document a sensible `maxTokens` default in the provider's getting-started doc anyway.

---

## Step 9 — Add modelChoices entries

**File:** `src/lib/utils/modelChoices.ts`.

Without entries here, `getDefaultModel(provider)` returns `undefined` and the interactive picker can't surface the provider. Two edits:

```typescript
// 1) TOP_MODELS_CONFIG — controls the interactive picker
[AIProviderName.<NAME>]: [
  { name: "<Display> Model 1", value: "<provider>-model-1", description: "<short blurb>" },
  { name: "<Display> Model 2", value: "<provider>-model-2", description: "<short blurb>" },
  // For LM Studio / llama.cpp use:
  // { name: "Auto-discover loaded model", value: "__auto_discover__", description: "Use whichever model is currently loaded" },
],

// 2) DEFAULT_MODELS — the fallback returned by getDefaultModel()
[AIProviderName.<NAME>]: "<provider>-default-model",
```

---

## Step 10 — Add vision capability

**File:** `src/lib/adapters/providerImageAdapter.ts`.

```typescript
const VISION_CAPABILITIES = {
  // ... existing entries ...
  "<provider-name>": {
    supportsImages: true,
    supportedFormats: ["png", "jpeg", "webp", "gif"],
    maxImagesPerRequest: 8,
  },
};
```

If your provider is text-only, set `supportsImages: false` with empty arrays — this prevents `MessageBuilder` from trying to attach images and getting a useless error. For local providers whose vision support depends on the loaded model (LM Studio, llama.cpp), mark them capable; runtime errors will surface if the loaded model isn't vision-capable.

---

## Step 11 — Wire CLI flags

**File:** `src/cli/factories/commandFactory.ts`. Three edits in this file:

### 11a. Primary `provider.choices` (line ~60)

```diff
 provider: {
   choices: [
     "auto", "openai", "openrouter", "or", "bedrock", "vertex",
     "anthropic", "azure", "google-ai", "google-ai-studio",
     "huggingface", "ollama", "mistral", "litellm", "sagemaker",
+    "<provider-name>", "<alias-1>", "<alias-2>",
   ],
 },
```

### 11b. Secondary choices array (line ~1794)

A second command surface duplicates the choices list. Add the same strings.

### 11c. Bash-completion `compgen -W` string (line ~3870)

```diff
- '          COMPREPLY=( $(compgen -W "auto openai bedrock ... mistral litellm" -- ${cur}) )\n' +
+ '          COMPREPLY=( $(compgen -W "auto openai bedrock ... mistral litellm <provider-name> <alias-1> <alias-2>" -- ${cur}) )\n' +
```

> **Aliases:** if the registry block declares aliases (`["deepseek", "ds"]`), all aliases must appear in 11a/b/c too. Without them, alias forms typed at the CLI fail validation even though the registry recognises them.

### 11d. (Optional) Subcommand factory

If your provider has its own commands (`neurolink ollama list-models`, `neurolink sagemaker create-endpoint`), create:

`src/cli/factories/<name>CommandFactory.ts` — pattern from `OllamaCommandFactory` / `SagemakerCommandFactory`. Then register it in `commandFactory.ts` alongside the others.

---

## Step 12 — Update .env.example

```bash
# =============================================================================
# <PROVIDER DISPLAY NAME> CONFIGURATION
# =============================================================================
<NAME>_API_KEY=
# Optional: override default model
<NAME>_MODEL=<provider>-default-model
# Optional: override default base URL
# <NAME>_BASE_URL=https://api.<provider>.com/v1
```

For local providers, omit the API key line and lead with `_BASE_URL`.

---

## Step 13 — Pricing table entry

**File:** `src/lib/utils/pricing.ts`.

Add a section so cost attribution reports a non-zero value (anything missing here gets dropped in the 6-decimal rounding step, so cost reporting goes silently wrong):

```typescript
"<provider-name>": {
  _default: { input: 0.0001, output: 0.0002 }, // per 1K tokens (USD)
  "<provider>-model-1": { input: 0.00027, output: 0.0011 },
  "<provider>-model-2": { input: 0.00055, output: 0.0022 },
},
```

For local providers, use a small symbolic rate ($1/M tokens) so cost attribution surfaces a non-zero number for ops dashboards. Real cost is electricity / hardware, which Neurolink can't estimate.

The `_default` key is treated as a provider-level fallback (filtered from prefix matches, used as last resort) per commit `c829f4de`.

---

## Step 14 — Tests

### 14a. Add to `ALL_PROVIDERS`

**File:** `test/continuous-test-suite-providers.ts:73`.

```diff
 const ALL_PROVIDERS = [
   "openai", "vertex", "google-ai", "anthropic", "bedrock",
   "azure", "mistral", "huggingface", "ollama", "litellm",
   "openai-compatible", "openrouter", "sagemaker",
+  "<provider-name>",
 ] as const;
```

The all-providers loop in this file iterates and skips when env vars are absent.

### 14b. Add a per-call credentials test

**File:** `test/continuous-test-suite-credentials.ts`.

Mirror existing blocks (each provider has one). Test that `credentials.<key>.apiKey` overrides env vars.

### 14c. Canonical full-feature suite

**File:** `test/continuous-test-suite-new-providers.ts` — extend with sections for the new provider:

| Section              | What it tests                                                            |
| -------------------- | ------------------------------------------------------------------------ |
| Generate basic       | `provider.generate({ input: { text: "..." } })` returns content          |
| Stream basic         | Chunks come through and the final result has `usage`                     |
| Tool calling         | `tools: { time: { ... } }` — model invokes the tool, result is processed |
| Structured output    | `schema: z.object({ ... })` — result.object matches                      |
| Reasoning            | (Skip if not supported) — `reasoning` parts present                      |
| Vision               | (Skip if not supported) — image input produces a response                |
| Abort                | `abortSignal` cuts the request mid-flight                                |
| Timeout              | `timeout: 100` rejects before completion                                 |
| Per-call credentials | `credentials.<key>.apiKey` overrides env                                 |
| Telemetry            | OTel spans exported with `gen_ai.system === "<provider-name>"`           |
| Error formatting     | Wrong API key surfaces a typed error with `<NAME>_AUTH_FAILED`           |

Add a `test:<name>` script to `package.json` if the provider has unique test setup; otherwise it falls under `test:new-providers`.

### 14d. Test infrastructure adjustments

When the new provider has a small context window (≤8 192), check `PROVIDER_MAX_TOKENS` in:

- `test/continuous-test-suite.ts`
- `test/continuous-test-suite-{memory,context,evaluation,mcp,mcp-http,ppt,observability,workflow,tts,media-gen,session-memory-bugs,evaluation-scoring}.ts`

The shared default of `PROVIDER_MAX_TOKENS[provider] || 8192` will set `maxTokens` to the full window for small providers, which under the 80% input-budget clamp produces a 0-token input budget. Lower the fallback to `1024` and add the new provider to the per-suite map. (Commit `c829f4de` did this for DeepSeek/NIM/LM Studio/llama.cpp.)

---

## Step 15 — Documentation

### 15a. Per-provider getting-started guide

**File:** `docs/getting-started/providers/<name>.md` — NEW.

Use `docs/getting-started/providers/deepseek.md` as the template. Required sections:

1. Frontmatter (title, description, keywords)
2. Overview — what the provider is, its niche
3. Key Facts — protocol, base URL, context window, vision, streaming, tools, embeddings
4. Quick Start — get API key, configure env, install, first call
5. Supported Models — table with model ID, family, context, capabilities
6. SDK Usage — basic, streaming, per-call credentials, edge cases
7. CLI Usage — basic commands, aliases
8. Configuration Reference — env var table
9. Feature Support Matrix — table of features × models
10. Troubleshooting — known errors and fixes
11. See Also — links to related providers and the implementation spec

### 15b. Implementation journal (optional but valuable)

**File:** `docs/provider-integration/<NN>-<name>.md` — NEW.

For non-trivial providers, document the wire format, design decisions, and edge cases. See `docs/provider-integration/03-nvidia-nim.md` for the most thorough example (extra body params, retry-on-400 strategy).

### 15c. Cross-reference updates

| File                                               | Update                                                      |
| -------------------------------------------------- | ----------------------------------------------------------- |
| `docs/getting-started/providers/index.md`          | Add link card                                               |
| `docs/getting-started/provider-setup.md`           | Add the provider to the index                               |
| `docs/getting-started/environment-variables.md`    | Document new env vars                                       |
| `docs/reference/provider-comparison.md`            | Add a row                                                   |
| `docs/reference/provider-selection.md`             | Mention in the relevant decision branch                     |
| `docs/reference/provider-feature-compatibility.md` | Tick the right capability columns                           |
| `README.md`                                        | Update the provider count and the supported-providers table |
| `docs-site/sidebars.ts`                            | Add the new doc to the sidebar                              |

The release commit (`docs(release)` in the changelog) typically batches all of these.

---

## Step 16 — Validation gates

```bash
pnpm run check                  # Type-check, must be 0 errors
pnpm run lint                   # ESLint — enforces type rules 7-13
pnpm run build                  # Full SDK + CLI build
pnpm run test:new-providers     # Canonical full-feature suite
pnpm run test:providers         # Cross-provider sanity
pnpm run test:credentials       # Per-call credential overrides
```

If `pnpm run lint` fails:

| Error                          | Fix                                                                    |
| ------------------------------ | ---------------------------------------------------------------------- |
| `no-interface`                 | Convert `interface X { ... }` → `type X = { ... }`                     |
| `unique-type-names`            | Add a domain prefix (e.g., `<Name>ModelInfo`)                          |
| `no-local-types-folder`        | Don't create `src/lib/types/<provider>/`; everything in `providers.ts` |
| `barrel-type-imports`          | Import internal types from `../types/index.js` only                    |
| `no-type-export-outside-types` | Don't `export type { X } from` inside provider files                   |

---

## Variants and edge cases

### A. Provider with reasoning trace (DeepSeek-R1, OpenAI o1)

The AI SDK surfaces upstream `reasoning_content` automatically as `reasoning` parts in the response stream. No Neurolink-side wiring needed.

For per-call thinking-level support (Anthropic Claude, Gemini 2.5+), see `src/lib/types/generate.ts:thinkingConfig` — the option is plumbed by `BaseProvider.handleProviderError` and individual providers map it to the upstream parameter (`thinkingBudget`, `reasoning_effort`, etc.).

### B. Embedding-only / vision-only models

If your provider's model supports embeddings but not chat completions:

- Override `supportsTools()` to return `false`.
- Override `getDefaultEmbeddingModel()` to return the model name.
- Override `embed()` and `embedMany()` (default throws "not supported").
- Document the gap in the per-provider doc.

### C. Provider-specific extra body params (NVIDIA NIM pattern)

```typescript
const result = streamText({
  model,
  messages,
  // ... standard options ...
  providerOptions: {
    openai: {
      // Arbitrary extra body fields — passed through to the upstream as-is.
      reasoning_effort: "high",
      top_k: 50,
      min_p: 0.05,
      repetition_penalty: 1.05,
      reasoning_budget: 4000,
      chat_template: "<custom>",
    },
  },
});
```

If the upstream returns 400 because some fields aren't supported on the selected model, retry with the offending fields stripped. See `src/lib/providers/nvidiaNim.ts:executeStreamWithRetry` for the canonical implementation.

### D. Local provider with auto-discovery (LM Studio, llama.cpp)

When `modelName` is empty, hit `/v1/models`, pick the first one, and update `this.modelName` (the field is no longer `readonly` post-`c829f4de`).

```typescript
private async discoverModel(): Promise<string> {
  const res = await fetch(`${this.baseURL}/models`);
  const data = await res.json() as { data: { id: string }[] };
  if (!data.data?.length) {
    throw new NeuroLinkError({
      code: "NO_MODEL_LOADED",
      message: "No model is loaded in the local server. Load a model first.",
      category: ErrorCategory.CONFIGURATION,
      retriable: false,
    });
  }
  return data.data[0].id;
}
```

For llama.cpp, also probe `/health` with up to 3 retries on transient connection errors — the server can take a few seconds to become ready.

### E. Provider with a non-OpenAI SDK (Anthropic, Vertex, Mistral)

Replace the `createOpenAI` import with the appropriate package:

```typescript
import { createMistral } from "@ai-sdk/mistral";
const client = createMistral({ apiKey, fetch: createProxyFetch() });
this.model = client.chat(this.modelName);
```

The rest of the BaseProvider contract is identical.

### F. Provider with a fully custom protocol (SageMaker)

Don't shoehorn into `createOpenAI`. Either:

- Use the matching first-party AI SDK package if one exists.
- Write a custom `LanguageModel` adapter under `src/lib/providers/<name>/` (multi-file pattern). See `src/lib/providers/sagemaker/` for the reference.

The latter is heavyweight — only do it when the provider has unique semantics worth exposing first-class.

### G. Provider that doesn't support tools

```typescript
protected supportsTools(): boolean {
  return false;
}
```

`BaseProvider.stream()` will skip tool injection for these providers, and the generate path will surface a friendly error if the caller passes tools anyway.

### H. Provider with embeddings + chat (OpenAI, Vertex, Bedrock, Google AI)

```typescript
protected getDefaultEmbeddingModel(): string {
  return "<provider>-embed-001";
}

public async embed(text: string, options?: EmbedOptions): Promise<EmbedResult> {
  // Use AI SDK's embedMany / embed functions or the provider's native embedding endpoint.
  // See src/lib/providers/openAI.ts:embed for the reference.
}
```

Embeddings flow through different surface (no `streamText` involved), but the credential/registration/CLI flow is identical.

---

## End-to-end PR shape

A typical "add new LLM provider" PR contains:

- 1 new provider class file
- 11 edited files (steps 2–13)
- 1–2 new test files (or extensions to existing suites)
- 1 new per-provider doc
- 0–1 implementation-journal doc for non-trivial providers
- 4–6 cross-reference doc updates

For batches of similar providers (the four OpenAI-compat clouds in `c829f4de`), prefer one mega-PR with a single shared-changes section and per-provider sections. For unique providers (Anthropic, Vertex), one provider per PR is cleaner.

---

## See also

- [`00-architecture.md`](00-architecture.md) — patterns and helpers
- [`01-shared-changes.md`](01-shared-changes.md) — the consolidated diff for the four cloud-OpenAI-compat providers (concrete worked example)
- [`06-testing.md`](06-testing.md) — full test methodology
- [`16-adding-tts-provider.md`](16-adding-tts-provider.md) — TTS modality additions
- [`19-adding-video-provider.md`](19-adding-video-provider.md) — video providers (handler refactor needed)
- [`CHECKLIST.md`](CHECKLIST.md) — pasteable PR checklist
