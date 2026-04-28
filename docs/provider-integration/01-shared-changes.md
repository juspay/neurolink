# 01 · Shared Changes (Touch Once for All Four Providers)

This document is the master diff list for everything outside `src/lib/providers/<name>.ts`. The per-provider docs (`02-` through `05-`) only describe the per-provider class file; everything else is consolidated here.

Apply these edits **once** for the whole batch. The diffs below show all four providers together.

---

## §1. `src/lib/constants/enums.ts`

### 1a. Extend `AIProviderName` enum (line 8)

Add four entries before `AUTO`:

```ts
export enum AIProviderName {
  // ... existing entries ...
  SAGEMAKER = "sagemaker",
+ DEEPSEEK = "deepseek",
+ NVIDIA_NIM = "nvidia-nim",
+ LM_STUDIO = "lm-studio",
+ LLAMACPP = "llamacpp",
  AUTO = "auto",
}
```

### 1b. Add `DeepSeekModels` enum

Append after `HuggingFaceModels` (around line 900):

```ts
/**
 * Supported Models for DeepSeek
 * Docs: https://api-docs.deepseek.com/quick_start/pricing
 */
export enum DeepSeekModels {
  /** General-purpose chat (DeepSeek-V3) */
  DEEPSEEK_CHAT = "deepseek-chat",
  /** Reasoning model (DeepSeek-R1) — exposes reasoning_content */
  DEEPSEEK_REASONER = "deepseek-reasoner",
}
```

### 1c. Add `NvidiaNimModels` enum

```ts
/**
 * Selected NVIDIA NIM Models
 * Full catalog: https://build.nvidia.com/models
 * Note: NIM hosts hundreds of models; pass arbitrary IDs via --model.
 */
export enum NvidiaNimModels {
  // Meta Llama
  LLAMA_3_3_70B_INSTRUCT = "meta/llama-3.3-70b-instruct",
  LLAMA_3_1_405B_INSTRUCT = "meta/llama-3.1-405b-instruct",
  LLAMA_3_1_70B_INSTRUCT = "meta/llama-3.1-70b-instruct",
  LLAMA_3_2_90B_VISION = "meta/llama-3.2-90b-vision-instruct",
  LLAMA_3_2_11B_VISION = "meta/llama-3.2-11b-vision-instruct",
  // NVIDIA Nemotron (reasoning)
  NEMOTRON_SUPER_49B = "nvidia/llama-3.3-nemotron-super-49b-v1",
  NEMOTRON_NANO_8B = "nvidia/llama-3.1-nemotron-nano-8b-v1",
  NEMOTRON_70B_INSTRUCT = "nvidia/llama-3.1-nemotron-70b-instruct",
  // DeepSeek hosted on NIM
  DEEPSEEK_R1 = "deepseek-ai/deepseek-r1",
  DEEPSEEK_R1_DISTILL_LLAMA_70B = "deepseek-ai/deepseek-r1-distill-llama-70b",
  // Mistral / Mixtral
  MIXTRAL_8X22B_INSTRUCT = "mistralai/mixtral-8x22b-instruct-v0.1",
  MIXTRAL_8X7B_INSTRUCT = "mistralai/mixtral-8x7b-instruct-v0.1",
  // Microsoft Phi
  PHI_4 = "microsoft/phi-4",
  // Google Gemma
  GEMMA_3_27B_IT = "google/gemma-3-27b-it",
  // Z.AI GLM
  GLM_4_5 = "z-ai/glm4.5",
}
```

### 1d. Add `LMStudioModels` enum (placeholder)

```ts
/**
 * LM Studio loads any GGUF model the user has downloaded.
 * Default: empty string → triggers /v1/models auto-discovery.
 */
export enum LMStudioModels {
  /** Sentinel value — triggers auto-discovery from /v1/models */
  AUTO_DISCOVER = "",
}
```

### 1e. Add `LlamaCppModels` enum (placeholder)

```ts
/**
 * llama.cpp serves a single model loaded at server startup.
 * Default: empty string → uses whatever is loaded.
 */
export enum LlamaCppModels {
  /** Sentinel value — uses the model loaded by the llama-server process */
  AUTO_DISCOVER = "",
}
```

---

## §2. `src/lib/types/providers.ts` — extend `NeurolinkCredentials` (line 134)

```ts
export type NeurolinkCredentials = {
  // ... existing entries ...
  ollama?: { baseURL?: string };
+ deepseek?: { apiKey?: string; baseURL?: string };
+ nvidiaNim?: { apiKey?: string; baseURL?: string };
+ // apiKey is optional for LM Studio / llama.cpp; use only when running them
+ // behind a reverse proxy that requires `Authorization: Bearer ...`.
+ lmStudio?: { apiKey?: string; baseURL?: string };
+ llamacpp?: { apiKey?: string; baseURL?: string };
};
```

The matching env vars `LM_STUDIO_API_KEY` and `LLAMACPP_API_KEY` are also honored by both providers (see §9 below). They take effect only when set; if blank, the providers use the public placeholder key as before.

**Note (CLAUDE.md rules 8-13):** do not create new files inside `src/lib/types/`. The `NeurolinkCredentials` extension lives in the existing `providers.ts`.

---

## §3. `src/lib/utils/providerConfig.ts` — append four helpers

Add after `createOpenAICompatibleConfig()` at line 423:

```ts
/**
 * Creates DeepSeek provider configuration
 */
export function createDeepSeekConfig(): ProviderConfigOptions {
  return {
    providerName: "DeepSeek",
    envVarName: "DEEPSEEK_API_KEY",
    setupUrl: "https://platform.deepseek.com/api_keys",
    description: "API key",
    instructions: [
      "1. Visit: https://platform.deepseek.com/api_keys",
      "2. Create or sign in to your DeepSeek account",
      "3. Generate a new API key",
      "4. Set DEEPSEEK_API_KEY in your .env file",
    ],
  };
}

/**
 * Creates NVIDIA NIM provider configuration
 */
export function createNvidiaNimConfig(): ProviderConfigOptions {
  return {
    providerName: "NVIDIA NIM",
    envVarName: "NVIDIA_NIM_API_KEY",
    setupUrl: "https://build.nvidia.com/settings/api-keys",
    description: "API key",
    instructions: [
      "1. Visit: https://build.nvidia.com/",
      "2. Sign in with your NVIDIA developer account",
      "3. Open Settings → API Keys",
      "4. Generate a new API key (Bearer token)",
      "5. Set NVIDIA_NIM_API_KEY in your .env file",
    ],
  };
}

/**
 * Creates LM Studio provider configuration (local server)
 */
export function createLmStudioConfig(): ProviderConfigOptions {
  return {
    providerName: "LM Studio",
    envVarName: "LM_STUDIO_BASE_URL",
    setupUrl: "https://lmstudio.ai/",
    description: "LM Studio server URL",
    instructions: [
      "1. Install LM Studio: https://lmstudio.ai/",
      "2. Open LM Studio and download a model (e.g. Llama 3.2 3B Instruct)",
      '3. Click "Local Server" → Start Server',
      "4. Default URL is http://localhost:1234/v1 (override via LM_STUDIO_BASE_URL)",
    ],
    // Base URL is optional — defaults to http://localhost:1234/v1 if unset.
    optional: true,
  };
}

/**
 * Creates llama.cpp provider configuration (local server)
 */
export function createLlamaCppConfig(): ProviderConfigOptions {
  return {
    providerName: "llama.cpp",
    envVarName: "LLAMACPP_BASE_URL",
    setupUrl: "https://github.com/ggerganov/llama.cpp",
    description: "llama.cpp server URL",
    instructions: [
      "1. Build llama.cpp: https://github.com/ggerganov/llama.cpp#build",
      "2. Run: ./llama-server -m model.gguf --port 8080",
      "3. Default URL is http://localhost:8080/v1 (override via LLAMACPP_BASE_URL)",
    ],
    // Base URL is optional — defaults to http://localhost:8080/v1 if unset.
    optional: true,
  };
}
```

---

## §4. `src/lib/factories/providerRegistry.ts` — register four providers

Add four blocks before the `logger.debug("All providers registered successfully");` line (around line 379), after the existing SageMaker registration:

```ts
// Register DeepSeek provider
ProviderFactory.registerProvider(
  AIProviderName.DEEPSEEK,
  async (
    modelName?: string,
    _providerName?: string,
    sdk?: UnknownRecord,
    _region?: string,
    credentials?: UnknownRecord,
  ) => {
    const deepseekCreds = credentials as NeurolinkCredentials["deepseek"];
    const { DeepSeekProvider } = await import("../providers/deepseek.js");
    return new DeepSeekProvider(
      modelName,
      sdk as unknown as NeuroLink | undefined,
      undefined,
      deepseekCreds,
    );
  },
  process.env.DEEPSEEK_MODEL || DeepSeekModels.DEEPSEEK_CHAT,
  ["deepseek", "ds"],
);

// Register NVIDIA NIM provider
ProviderFactory.registerProvider(
  AIProviderName.NVIDIA_NIM,
  async (
    modelName?: string,
    _providerName?: string,
    sdk?: UnknownRecord,
    _region?: string,
    credentials?: UnknownRecord,
  ) => {
    const nimCreds = credentials as NeurolinkCredentials["nvidiaNim"];
    const { NvidiaNimProvider } = await import("../providers/nvidiaNim.js");
    return new NvidiaNimProvider(
      modelName,
      sdk as unknown as NeuroLink | undefined,
      undefined,
      nimCreds,
    );
  },
  process.env.NVIDIA_NIM_MODEL || NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
  ["nvidia", "nim", "nvidia-nim"],
);

// Register LM Studio provider
ProviderFactory.registerProvider(
  AIProviderName.LM_STUDIO,
  async (
    modelName?: string,
    _providerName?: string,
    sdk?: UnknownRecord,
    _region?: string,
    credentials?: UnknownRecord,
  ) => {
    const lmStudioCreds = credentials as NeurolinkCredentials["lmStudio"];
    const { LMStudioProvider } = await import("../providers/lmStudio.js");
    return new LMStudioProvider(
      modelName,
      sdk as unknown as NeuroLink | undefined,
      undefined,
      lmStudioCreds,
    );
  },
  process.env.LM_STUDIO_MODEL || undefined, // empty → auto-discover
  ["lmstudio", "lm-studio", "lms"],
);

// Register llama.cpp provider
ProviderFactory.registerProvider(
  AIProviderName.LLAMACPP,
  async (
    modelName?: string,
    _providerName?: string,
    sdk?: UnknownRecord,
    _region?: string,
    credentials?: UnknownRecord,
  ) => {
    const llamaCppCreds = credentials as NeurolinkCredentials["llamacpp"];
    const { LlamaCppProvider } = await import("../providers/llamaCpp.js");
    return new LlamaCppProvider(
      modelName,
      sdk as unknown as NeuroLink | undefined,
      undefined,
      llamaCppCreds,
    );
  },
  process.env.LLAMACPP_MODEL || undefined, // empty → use loaded model
  ["llamacpp", "llama.cpp", "llama-cpp"],
);
```

Also update the imports at the top (line 13-23):

```ts
import {
  AIProviderName,
  GoogleAIModels,
  OpenAIModels,
  AnthropicModels,
  VertexModels,
  MistralModels,
  OllamaModels,
  LiteLLMModels,
  HuggingFaceModels,
+ DeepSeekModels,
+ NvidiaNimModels,
} from "../constants/enums.js";
```

(LM Studio and llama.cpp don't need their model-enum imports because we use `process.env.X || undefined`.)

---

## §5. `src/lib/providers/index.ts` — barrel exports

```ts
// ... existing exports ...
export { LiteLLMProvider as LiteLLM } from "./litellm.js";
+ export { DeepSeekProvider as DeepSeek } from "./deepseek.js";
+ export { NvidiaNimProvider as NvidiaNim } from "./nvidiaNim.js";
+ export { LMStudioProvider as LMStudio } from "./lmStudio.js";
+ export { LlamaCppProvider as LlamaCpp } from "./llamaCpp.js";
```

---

## §6. `src/cli/factories/commandFactory.ts` — three spots

### 6a. Line ~60 — primary `provider.choices`

```ts
provider: {
  choices: [
    "auto",
    "openai",
    "openai-compatible",
    "openrouter",
    "or",
    "bedrock",
    "vertex",
    "googleVertex",
    "anthropic",
    "anthropic-subscription",
    "azure",
    "google-ai",
    "google-ai-studio",
    "huggingface",
    "ollama",
    "mistral",
    "litellm",
    "sagemaker",
+   "deepseek",
+   "nvidia-nim",
+   "lm-studio",
+   "llamacpp",
  ],
  // ...
},
```

### 6b. Line ~1794 — secondary choices array (used in another command)

Add the same four strings to that array.

### 6c. Line ~3870 — bash completion compgen string

```ts
- '                    COMPREPLY=( $(compgen -W "auto openai bedrock vertex googleVertex anthropic azure google-ai huggingface ollama mistral litellm" -- ${cur}) )\n' +
+ '                    COMPREPLY=( $(compgen -W "auto openai bedrock vertex googleVertex anthropic azure google-ai huggingface ollama mistral litellm deepseek nvidia-nim ds nim lm-studio lmstudio lms llamacpp llama.cpp" -- ${cur}) )\n' +
```

The matching `provider.choices` arrays in the same file should also include the
CLI alias tokens — `ds` (deepseek), `nim` and `nvidia` (nvidia-nim), `lmstudio`
and `lms` (lm-studio), `llama.cpp` (llamacpp) — alongside the canonical names.
Without them, alias forms typed at the CLI fail validation even though
`AIProviderName` and the bash completion both recognise them.

```ts

```

---

## §7. `src/lib/constants/contextWindows.ts` — append model windows

Insert these blocks inside `MODEL_CONTEXT_WINDOWS` (the order doesn't matter; group with similar providers):

```ts
deepseek: {
  _default: 64_000,
  "deepseek-chat": 64_000,        // DeepSeek-V3
  "deepseek-reasoner": 64_000,    // DeepSeek-R1
},
"nvidia-nim": {
  _default: 128_000,
  "meta/llama-3.3-70b-instruct": 128_000,
  "meta/llama-3.1-405b-instruct": 128_000,
  "meta/llama-3.1-70b-instruct": 128_000,
  "meta/llama-3.2-90b-vision-instruct": 128_000,
  "meta/llama-3.2-11b-vision-instruct": 128_000,
  "nvidia/llama-3.3-nemotron-super-49b-v1": 128_000,
  "nvidia/llama-3.1-nemotron-nano-8b-v1": 128_000,
  "nvidia/llama-3.1-nemotron-70b-instruct": 128_000,
  "deepseek-ai/deepseek-r1": 128_000,
  "deepseek-ai/deepseek-r1-distill-llama-70b": 128_000,
  "mistralai/mixtral-8x22b-instruct-v0.1": 65_536,
  "mistralai/mixtral-8x7b-instruct-v0.1": 32_768,
  "microsoft/phi-4": 16_384,
  "google/gemma-3-27b-it": 8_192,
},
"lm-studio": {
  _default: 8_192,  // depends on loaded model
},
llamacpp: {
  _default: 8_192,  // depends on loaded model
},
```

---

## §8a. `src/lib/utils/modelChoices.ts` — add `TOP_MODELS_CONFIG` + `DEFAULT_MODELS` entries

Without entries here, `getDefaultModel(provider)` returns `undefined` for the new providers, breaking CLI auto-selection and the `getTopModelChoices()` interactive picker. Add a row in `TOP_MODELS_CONFIG` (use `model: ""` for the LM Studio / llama.cpp auto-discovery sentinel — `getTopModelChoices` surfaces it as an explicit "Auto-discover loaded model" option mapped to the value `__auto_discover__`, which the CLI recognises) and a row in `DEFAULT_MODELS` for each new provider. The full diff lives next to this doc; the touch list is just `TOP_MODELS_CONFIG[AIProviderName.DEEPSEEK / NVIDIA_NIM / LM_STUDIO / LLAMACPP]` and `DEFAULT_MODELS[...]` (4 entries each).

---

## §8. `src/lib/adapters/providerImageAdapter.ts` — extend `VISION_CAPABILITIES` (line 70)

```ts
const VISION_CAPABILITIES = {
  // ... existing entries ...
+ "deepseek": {
+   supportsImages: false,
+   supportedFormats: [],
+   maxImagesPerRequest: 0,
+ },
+ "nvidia-nim": {
+   supportsImages: true,
+   supportedFormats: ["png", "jpeg", "webp", "gif"],
+   maxImagesPerRequest: 8,
+ },
+ "lm-studio": {
+   supportsImages: true,  // depends on loaded model (LLaVA, Llama 3.2 Vision)
+   supportedFormats: ["png", "jpeg", "webp"],
+   maxImagesPerRequest: 4,
+ },
+ "llamacpp": {
+   supportsImages: true,  // depends on loaded model
+   supportedFormats: ["png", "jpeg"],
+   maxImagesPerRequest: 4,
+ },
};
```

---

## §9. `.env.example` — append four sections

Append at the end of the file:

```bash
# =============================================================================
# DEEPSEEK CONFIGURATION
# =============================================================================
DEEPSEEK_API_KEY=
# Optional: override default model
DEEPSEEK_MODEL=deepseek-chat
# Optional: override default base URL
# DEEPSEEK_BASE_URL=https://api.deepseek.com

# =============================================================================
# NVIDIA NIM CONFIGURATION
# =============================================================================
NVIDIA_NIM_API_KEY=
# Optional: override default model
NVIDIA_NIM_MODEL=meta/llama-3.3-70b-instruct
# Optional: override default base URL (use for self-hosted NIM)
# NVIDIA_NIM_BASE_URL=https://integrate.api.nvidia.com/v1

# =============================================================================
# LM STUDIO CONFIGURATION (local provider; API key only for proxied deployments)
# =============================================================================
LM_STUDIO_BASE_URL=http://localhost:1234/v1
# Optional: explicit model id (blank = auto-discover from /v1/models)
LM_STUDIO_MODEL=
# Optional: bearer token, only required when LM Studio sits behind an
# auth-proxying reverse proxy. Honored by SDK as `credentials.lmStudio.apiKey`.
LM_STUDIO_API_KEY=

# =============================================================================
# LLAMA.CPP CONFIGURATION (local provider; API key only for proxied deployments)
# =============================================================================
LLAMACPP_BASE_URL=http://localhost:8080/v1
# Optional: explicit model id (blank = use whatever model llama-server has loaded)
LLAMACPP_MODEL=
# Optional: bearer token, only required when llama-server is fronted by an
# auth-proxying reverse proxy. Honored by SDK as `credentials.llamacpp.apiKey`.
LLAMACPP_API_KEY=
```

---

## §10. (Optional) `src/cli/utils/interactiveSetup.ts`

The OpenAI-compatible commit (`3041d26f`) added 24 lines to this file (an interactive wizard step). For the four new providers, add four similar wizard steps so `neurolink setup` walks the user through configuration.

This is OPTIONAL for v1 — providers work without wizard support; users can edit `.env` directly. Add to the polish PR after the core implementation lands.

---

## Validation gates after applying these edits

```bash
pnpm run check     # type-check (must pass before lint)
pnpm run lint      # ESLint — enforces type-engineering rules 7-13
pnpm run build     # full build
```

If `pnpm run lint` complains about:

- "no-interface" → you used `interface` somewhere; convert to `type`
- "unique-type-names" → name collision; add a domain prefix
- "no-local-types-folder" → you created `types/` somewhere outside `src/lib/types/`
- "barrel-type-imports" → import internal types from `../types/index.js`, not `../types/providers.js`

The next four docs (`02-` through `05-`) describe each provider's class file. After implementing one, run all the gates before starting the next.
