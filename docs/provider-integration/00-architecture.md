# 00 · Architecture & Patterns

This doc captures the patterns a new provider must follow. Read once; the per-provider docs assume this knowledge.

## Pattern 1: Factory + Registry (dynamic imports only)

Every provider is registered in `src/lib/factories/providerRegistry.ts` inside `ProviderRegistry._doRegister()` via:

```ts
ProviderFactory.registerProvider(
  AIProviderName.<NAME>,
  async (modelName?, _providerName?, sdk?, _region?, credentials?) => {
    const creds = credentials as NeurolinkCredentials["<key>"];
    const { <Provider>Provider } = await import("../providers/<file>.js");
    return new <Provider>Provider(modelName, sdk as NeuroLink | undefined, undefined, creds);
  },
  <Models>.DEFAULT_OR_FROM_ENV,
  ["alias1", "alias2"],
);
```

**Critical (CLAUDE.md rule #1):** the import inside the factory must be **dynamic** (`await import(...)`). Static imports create circular dependencies because providers transitively import from the registry's siblings.

## Pattern 2: BaseProvider contract

`src/lib/core/baseProvider.ts:59` defines `abstract class BaseProvider implements AIProvider`. A new provider:

### Required overrides (5 abstract methods)

| Method                | Line | Signature                                                                                                            | Purpose                                                                                              |
| --------------------- | ---- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `executeStream`       | 1203 | `protected abstract executeStream(options: StreamOptions, analysisSchema?: ValidationSchema): Promise<StreamResult>` | The streaming hot path. Use `streamText({ model, messages, tools, ... })` from the AI SDK.           |
| `getProviderName`     | 1211 | `protected abstract getProviderName(): AIProviderName`                                                               | Return the enum value.                                                                               |
| `getDefaultModel`     | 1216 | `protected abstract getDefaultModel(): string`                                                                       | Return env-or-hardcoded default.                                                                     |
| `getAISDKModel`       | 1222 | `protected abstract getAISDKModel(): LanguageModel \| Promise<LanguageModel>`                                        | Build the AI SDK model instance.                                                                     |
| `formatProviderError` | 1376 | `protected abstract formatProviderError(error: unknown): Error`                                                      | Map upstream errors to user-friendly messages. **Must `return`, never `throw`** (CLAUDE.md rule #6). |

### Constructor signature

```ts
constructor(
  modelName?: string,
  sdk?: unknown,                   // NeuroLink instance (cast inside)
  _region?: string,                // ignored for non-AWS providers
  credentials?: NeurolinkCredentials["<key>"]
) {
  super(
    modelName,
    "<provider-name>" as AIProviderName,  // string literal matching the enum value
    sdk as NeuroLink | undefined,
  );
  // ...build SDK client using credentials || env...
}
```

### Inherited helpers (use, don't override)

| Helper                                                   | Line        | Use case                                                                  |
| -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| `validateStreamOptions(options)`                         | 1492        | Throws on invalid options                                                 |
| `buildMessagesForStream(options)`                        | 576         | Constructs the `ModelMessage[]` array (handles multimodal files)          |
| `getAllTools()`                                          | 1341        | Returns all merged tools (MCP + built-in + custom)                        |
| `getAISDKModelWithMiddleware(options)`                   | 1229        | Wraps `getAISDKModel()` with middleware (use this in `executeStream`)     |
| `telemetryHandler.getTelemetryConfig(options, "stream")` | constructor | OTel telemetry config for `streamText`                                    |
| `getToolCallRepairFn(options)`                           | 1181        | Schema-driven tool-call repair                                            |
| `handleToolExecutionStorage(...)`                        | 1944        | Persists tool I/O to memory                                               |
| `createTextStream(result)`                               | 1499        | Adapts `streamText` result → Neurolink stream contract                    |
| `getTimeout(options)`                                    | 1937        | Resolves per-call/instance/default timeout                                |
| `supportsTools()`                                        | 157         | Default `true`; override to `false` for vision-only/embedding-only models |
| `handleProviderError(error)`                             | 1384        | Wraps `formatProviderError` + common-error handling                       |
| `setSessionContext(sessionId, userId)`                   | 1365        | Public; called by NeuroLink instance                                      |

### Optional overrides

| Method                       | Line | Purpose                                                                   |
| ---------------------------- | ---- | ------------------------------------------------------------------------- |
| `supportsTools()`            | 157  | Default `true`; override to `false` if your provider can't call functions |
| `getDefaultEmbeddingModel()` | 1166 | Return embed model name; `undefined` means embeddings unsupported         |
| `validateConfiguration()`    | —    | Public method; usually checks env vars and returns `boolean`              |
| `getConfiguration()`         | —    | Public method; returns `{ provider, model, defaultModel }`                |

### What NOT to override

- `stream()` — base class implements the full lifecycle; only override `executeStream`
- `generate()` / `gen()` — base class delegates to `executeStream` with synthetic chunking when tools present
- `embed()`, `embedMany()` — base class throws "not supported"; override only if your SDK exposes them

## Pattern 3: providerConfig helpers

`src/lib/utils/providerConfig.ts` exports:

- `validateApiKey(config: ProviderConfigOptions): string` — throws if env var missing
- `getProviderModel(envVar, defaultModel)` — `process.env[envVar] || defaultModel`
- `hasProviderCredentials(envVars: string[])` — true if any env var set
- `createMistralConfig()`, `createOpenAIConfig()`, … — return `ProviderConfigOptions`:
  ```ts
  type ProviderConfigOptions = {
    providerName: string;
    envVarName: string;
    setupUrl: string;
    description: string;
    instructions: string[];
    fallbackEnvVars?: string[];
    // Set true when `envVarName` is a base URL with a working default
    // (LM Studio, llama.cpp). Marks the env value as not-required so
    // validateApiKey()/validateApiKeyEnhanced() return "" instead of
    // throwing when it's unset.
    optional?: boolean;
  };
  ```

You must add **one helper per new provider** here. Mirror `createMistralConfig()` at line 322:

```ts
export function createDeepSeekConfig(): ProviderConfigOptions {
  return {
    providerName: "DeepSeek",
    envVarName: "DEEPSEEK_API_KEY",
    setupUrl: "https://platform.deepseek.com/api_keys",
    description: "API key",
    instructions: [
      "1. Visit: https://platform.deepseek.com/api_keys",
      "2. Create or sign in",
      "3. Generate a new API key",
    ],
  };
}
```

For local providers (LM Studio, llama.cpp), the helper still exists but the env var is the **base URL**, not the API key:

```ts
export function createLmStudioConfig(): ProviderConfigOptions {
  return {
    providerName: "LM Studio",
    envVarName: "LM_STUDIO_BASE_URL",
    setupUrl: "https://lmstudio.ai/",
    description: "LM Studio server URL",
    instructions: [
      "1. Install LM Studio: https://lmstudio.ai/",
      "2. Load a model in the LM Studio app",
      "3. Start the local server (default: http://localhost:1234/v1)",
      "4. Set LM_STUDIO_BASE_URL if you use a non-default port",
    ],
    // Base URL is optional — defaults to http://localhost:1234/v1.
    optional: true,
  };
}
```

(See `01-shared-changes.md` §3 for all four helper bodies.)

## Pattern 4: AI SDK wrapping

Every cloud OpenAI-compat provider ultimately calls `streamText({ model, ... })` where `model` is built with the AI SDK:

```ts
import { createOpenAI } from "@ai-sdk/openai";
const client = createOpenAI({
  baseURL: this.config.baseURL,
  apiKey: this.config.apiKey,
  fetch: createProxyFetch(), // Neurolink-specific corp-proxy support
});
// .chat() targets /v1/chat/completions. Calling client(modelId) directly
// targets the Responses API, which OpenAI-compatible providers don't expose.
this.model = client.chat(this.modelName);
```

This works because `@ai-sdk/openai`'s `createOpenAI({ baseURL })` accepts ANY OpenAI-compatible endpoint (LM Studio, llama.cpp, NVIDIA NIM, DeepSeek, OpenRouter, vLLM, etc.).

For provider-specific extra body params (NVIDIA NIM has many), use:

```ts
const result = await streamText({
  model,
  messages,
  tools,
  // ... standard options ...
  providerOptions: {
    openai: {
      // arbitrary extra body fields go here, e.g.:
      reasoning_effort: "high", // for o1-style models
      // For NVIDIA NIM, see 03-nvidia-nim.md for the full extra-body strategy
    },
  },
});
```

## Pattern 5: Per-call vs instance vs env credentials precedence

The factory threads `credentials` through:

```
NeuroLink.generate({ credentials: ... })   // per-call wins
  ↓
NeuroLink constructor credentials          // instance default
  ↓
process.env.<PROVIDER>_API_KEY             // fallback
```

In the provider constructor:

```ts
const apiKey = credentials?.apiKey ?? validateApiKey(createDeepSeekConfig());
```

The `??` does the precedence; `validateApiKey` throws a friendly error when env is also missing.

## Pattern 6: Type-engineering rules (CLAUDE.md 7-13, ESLint-enforced)

| Rule                                                | Meaning for us                                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 7 — no `interface`                                  | Use `type X = { ... }`. Use `&` for extension, never `extends`.                                                 |
| 8 — no "Types" suffix in `src/lib/types/` filenames | We add to `providers.ts`, not `deepseekTypes.ts`.                                                               |
| 9 — globally-unique type names                      | Prefix exported types: `DeepSeekModelInfo`, not `ModelInfo`.                                                    |
| 10 — types-barrel `export *` only                   | Don't selectively re-export from `src/lib/types/index.ts`.                                                      |
| 11 — no local `types/` dirs                         | Don't create `src/lib/providers/<provider>/types/`.                                                             |
| 12 — no type re-exports from non-type files         | Provider class files must not `export type { X } from`.                                                         |
| 13 — barrel-only imports for internal types         | Inside `providers/X.ts`: `import type { ... } from "../types/index.js"` — never `from "../types/providers.js"`. |

These are all enforced by ESLint rules under `eslint-rules/`. Run `pnpm run lint` after edits.

## Pattern 7: Multimodal vision capability map

`src/lib/adapters/providerImageAdapter.ts:70` defines `VISION_CAPABILITIES`. Add an entry for each provider that supports vision:

```ts
"deepseek": { supportsImages: false, supportedFormats: [], maxImagesPerRequest: 0 },
"nvidia-nim": { supportsImages: true, supportedFormats: ["png","jpeg","webp","gif"], maxImagesPerRequest: 8 },
"lm-studio": { supportsImages: true, supportedFormats: ["png","jpeg","webp"], maxImagesPerRequest: 4 },
"llamacpp":  { supportsImages: true, supportedFormats: ["png","jpeg"], maxImagesPerRequest: 4 },
```

Vision availability for local providers depends on the loaded model (LLaVA, Llama 3.2 Vision, etc.) — we mark the provider capable; runtime errors surface if the loaded model isn't vision-capable.

## Pattern 8: CLI integration

`src/cli/factories/commandFactory.ts` requires three edits per new provider:

1. **Line 60** — `provider.choices` array (the `--provider` flag's allowed values).
2. **Line ~1794** — secondary choices array (used by another command).
3. **Line ~3870** — bash-completion `compgen -W` string.

For complex providers with their own subcommands (Ollama has `OllamaCommandFactory`, SageMaker has `SagemakerCommandFactory`), create `src/cli/factories/<name>CommandFactory.ts`. **None of our four need subcommand factories** — they're plain `--provider <name>` providers.

## Pattern 9: Test integration

`test/continuous-test-suite-providers.ts:73` defines `ALL_PROVIDERS = [...] as const`. Add the four new names. The all-provider loop in this file iterates and skips when env vars are absent.

`test/continuous-test-suite-credentials.ts` should get 4 new test blocks for per-call credential overrides.

The canonical coverage for the four new providers is the dedicated suite **`test/continuous-test-suite-new-providers.ts`** with the **`pnpm run test:new-providers`** script — it exercises the full feature surface (generate, stream, tools, structured output, reasoning, vision-where-supported, abort, timeout, per-call creds, telemetry, error formatting) per provider. `test:providers` (ALL_PROVIDERS) and `test:credentials` remain available for cross-provider checks but `test:new-providers` is the canonical entrypoint.

## File-touch checklist (per provider)

| File                                        | Cardinality                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------ |
| `src/lib/providers/<name>.ts`               | NEW — 1 per provider                                                     |
| `src/lib/constants/enums.ts`                | EDIT — add to `AIProviderName` + add `<Name>Models` enum                 |
| `src/lib/types/providers.ts`                | EDIT — extend `NeurolinkCredentials`                                     |
| `src/lib/factories/providerRegistry.ts`     | EDIT — add `registerProvider` block                                      |
| `src/lib/providers/index.ts`                | EDIT — add barrel export (1 line)                                        |
| `src/lib/utils/providerConfig.ts`           | EDIT — add `create<Name>Config()` helper                                 |
| `src/lib/constants/contextWindows.ts`       | EDIT — add `<provider-name>: { ... }` section to `MODEL_CONTEXT_WINDOWS` |
| `src/lib/adapters/providerImageAdapter.ts`  | EDIT — add to `VISION_CAPABILITIES` (line 70)                            |
| `src/cli/factories/commandFactory.ts`       | EDIT — 3 spots (provider choices, secondary, bash completion)            |
| `.env.example`                              | EDIT — append env var section                                            |
| `test/continuous-test-suite-providers.ts`   | EDIT — extend `ALL_PROVIDERS`                                            |
| `test/continuous-test-suite-credentials.ts` | EDIT — add per-call credential test                                      |

**Total: 1 new file, 11 edited files** per provider. Edits are concentrated; many providers can share a single PR.
