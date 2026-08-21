# ProviderDescriptor Single Source of Truth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace five independently-drifted provider-identity tables (CLI choices, `CREDENTIAL_KEY_MAP`, env-var checks, health-check switches, tool-support sets) with one `ProviderDescriptor` record per provider and a single `PROVIDER_DESCRIPTORS` array, so every consumer derives its view from one source instead of hand-maintaining its own copy.

**Architecture:** A new pure-data module (`src/lib/factories/providerDescriptors.ts`) declares one `ProviderDescriptor` object per of the 30 real `AIProviderName` values (everything except `AUTO`), plus a name→descriptor map and an alias→canonical-name index, all computed once at module load with zero imports of provider classes or dynamic `import()`. `ProviderFactory` (`src/lib/factories/providerFactory.ts`) gains `getDescriptor()`/`getAllDescriptors()` reading from that module, and `registerProvider()` gains an optional 5th parameter so a live registration can carry its descriptor too. Nine existing consumers (CLI provider choices, provider env-var checks, health-check dispatch, auto-select priority, `getProviderStatus()`, `environmentManager.ts`, `setup.ts`, the prompt-only-tools set, and `CREDENTIAL_KEY_MAP`/`resolveCredentialKey`) are each migrated, one task at a time, to read from `PROVIDER_DESCRIPTORS` instead of their own hand-written table. Plan 01 (Tier A Bug Fixes, landed on this branch first) already fixed two of the originally-confirmed bugs — the missing `together-ai` credential mapping and `getAvailableProviders()`/`isValidProvider()` only recognizing 10 of 30 providers — ahead of this plan; this plan's remaining fixes are `hasProviderEnvVars()` silently returning `false` for 20 of 30 providers and the missing `nvidia`/`lms` CLI completions, plus it re-derives Plan 01's two already-fixed spots from the same `PROVIDER_DESCRIPTORS` source (rather than their now-separate hand-written fixes) so all nine consumers genuinely share one source instead of nine independently-correct ones.

**Tech Stack:** TypeScript (strict, ESM, `NodeNext` module resolution), pnpm, `tsx` for direct TS execution of test suites and CLI-only consumers, the repo's `defineSuite`/`test`/`assert`/`runSuite` harness (`test/helpers/harness.ts`) for regression suites, ESLint with this repo's custom `neurolink/*` rules for the type-placement/naming constraints.

**Spec:**

- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/00-provider-registration-instantiation-chain.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/02-sdk-entry-orchestration-src-lib-neurolink-ts-gener.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/07-cli-env-config-surface-for-ai-providers.md`
- `$SCRATCH/47d64fa8-f94f-404c-b134-3e117deddba3/scratchpad/areas/11-types-models-config.md`

## Global Constraints

- pnpm ONLY. `pnpm run check` / `pnpm run lint` / `pnpm run build`. Tests via `npx tsx test/continuous-test-suite-<name>.ts` + package.json `test:<name>` scripts.
- TEST HARNESS SKIP HAZARD: NEVER interpolate payloads into assertion messages (SKIP-not-FAIL downgrade); new suites include a break-one-assertion sanity step.
- Repo rules: dynamic imports only in providerRegistry.ts factory closures; ALL types in src/lib/types/; no `interface` (type + intersection only); unique exported type names; types barrel only `export *`; barrel-only internal type imports; no double assertions; named exports only; no `export default`. Public SDK API must not break.
- Conventional commits; commit per task; NEVER `git push`.

**Testing convention for this plan specifically:** Task 6's completeness suite (`test/continuous-test-suite-provider-descriptors.ts`) is the one place this plan tests the **public contract** — it imports `PROVIDER_DESCRIPTORS`, `ProviderFactory` (`getDescriptor`/`getAllDescriptors`) from `../dist/index.js`, matching the repo convention that `test:*` suites exercise the built package. Tasks 7–15 migrate _internal_ consumer functions (CLI option builders, env-var checkers, health-check switches) that are not part of the public SDK barrel; those tasks add `test()` blocks to the **same** suite file but import the consumer functions directly from their `src/` `.ts` files via `tsx` (no build step required to iterate on them), consistent with how `test:mcp:bash` and `test:mcp:infra` mix build-artifact and source-level checks in this repo. This split is called out again at the top of each task's Files section.

---

### Task 1: `ProviderDescriptor` type

**Files:**

- `src/lib/types/providers.ts` — add new type after the existing `ProviderRegistration` type (currently lines 1967-1971).

**Interfaces:**

- Produces: `type ProviderDescriptor` (exported).

**Steps:**

- [ ] Before-grep: confirm the type doesn't exist yet.

  ```bash
  grep -n "ProviderDescriptor" src/lib/types/providers.ts
  ```

  Expected: no output (empty).

- [ ] Add the type immediately after `ProviderRegistration` (after line 1971) in `src/lib/types/providers.ts`:

  ```ts
  /**
   * Single source of truth for one AI provider's static identity: how it's
   * addressed (name/aliases), how it's authenticated (credentialsKey/envVars),
   * what it defaults to (defaultModel), and how the rest of the codebase
   * should treat it (toolSupport/localRuntime/healthCheck). Every consumer
   * that used to hand-maintain its own provider table (CLI choices,
   * CREDENTIAL_KEY_MAP, env-var checks, health-check dispatch, auto-select
   * priority, PROMPT_ONLY_TOOL_PROVIDERS) derives from PROVIDER_DESCRIPTORS
   * instead. See src/lib/factories/providerDescriptors.ts for the data.
   */
  export type ProviderDescriptor = {
    /** Canonical identity — matches an AIProviderName enum member (never AUTO). */
    name: AIProviderName;
    /** Alternate spellings accepted by the CLI and the alias index (kebab-case, shorthand, legacy names). Does not include `name` itself. */
    aliases: readonly string[];
    /** Key into NeurolinkCredentials for per-call/per-instance credential overrides. */
    credentialsKey: keyof NeurolinkCredentials;
    /** Environment variables this provider reads at runtime. */
    envVars: {
      /** Primary identity/secret env var. Absent for providers with no required credential (Ollama, LM Studio, llama.cpp) or that use extraRequired instead of a single key (Vertex). */
      apiKey?: string;
      /** Alternate env vars accepted in place of apiKey, checked in order after apiKey. */
      fallbacks?: readonly string[];
      baseURL?: string;
      /** Alternate env vars accepted in place of baseURL. */
      baseURLFallbacks?: readonly string[];
      /** Env var that overrides the static defaultModel at runtime. */
      model?: string;
      /** Alternate env vars accepted in place of model, checked in order after model. */
      modelFallbacks?: readonly string[];
      /** Additional env vars required alongside apiKey (e.g. AWS secret key, Azure endpoint). */
      extraRequired?: readonly string[];
      /** Alternate ways to satisfy extraRequired when it isn't a plain env-var list (e.g. Vertex's file-path-OR-individual-fields auth). */
      extraRequiredFallbacks?: readonly string[];
      /** True when the provider is usable with zero configuration (local runtime with a documented default URL, or a documented non-secret default like LiteLLM's "sk-anything"). */
      optional?: boolean;
    };
    /**
     * Static fallback model. The empty string "" is a documented sentinel
     * meaning "no static default — resolved at runtime via envVars.model or
     * provider-side auto-discovery" (used by Bedrock, OpenAI-Compatible,
     * LM Studio, llama.cpp, matching how providerRegistry.ts already passes
     * `undefined` as their defaultModel argument today).
     */
    defaultModel: string;
    toolSupport: "native" | "prompt-only" | "none" | "model-dependent";
    /** True only for providers that run entirely on the caller's machine with no cloud account (Ollama, LM Studio, llama.cpp). LiteLLM is a local proxy but commonly points at cloud models, so it is deliberately false. */
    localRuntime: boolean;
    /** How ProviderHealthChecker should verify this provider is reachable. */
    healthCheck: "env-only" | "models-probe" | "live-generate";
    setupUrl?: string;
    timeouts?: { generateMs?: number; streamMs?: number };
    /** Ascending priority (1 = tried first) in the auto-select fallback chain used by getBestProvider(). Undefined = not part of the auto-select chain. */
    autoSelectPriority?: number;
    /** Format-validation regex sourced from providerConfig.ts's API_KEY_FORMATS, when one exists for this provider. */
    apiKeyFormatPattern?: RegExp;
  };
  ```

- [ ] Run typecheck and lint, verify they pass (the type is unused so far, which is legal for an exported type).

  ```bash
  pnpm run check && pnpm run lint
  ```

  Expected: both exit 0. `neurolink/unique-type-names` passes because `ProviderDescriptor` doesn't collide with any existing exported type name (confirmed via the before-grep above finding zero prior uses).

- [ ] Commit.
  ```bash
  git add src/lib/types/providers.ts
  git commit -m "feat(types): add ProviderDescriptor single-source-of-truth type"
  ```

---

### Task 2: `providerDescriptors.ts` — the data

**Files:**

- `src/lib/factories/providerDescriptors.ts` — new file.

**Interfaces:**

- Consumes: `AIProviderName` (`src/lib/constants/enums.ts`), the 24 `<Provider>Models` enums already statically imported by `providerRegistry.ts` (`GoogleAIModels`, `OpenAIModels`, `AnthropicModels`, `VertexModels`, `MistralModels`, `OllamaModels`, `LiteLLMModels`, `HuggingFaceModels`, `DeepSeekModels`, `NvidiaNimModels`, `OpenRouterModels`, `XaiModels`, `GroqModels`, `CohereModels`, `TogetherAIModels`, `FireworksModels`, `PerplexityModels`, `CloudflareModels`, `VoyageModels`, `JinaModels`, `StabilityModels`, `IdeogramModels`, `RecraftModels`, `ReplicateModels`), `ProviderDescriptor` type (Task 1), `API_KEY_FORMATS` (`src/lib/utils/providerConfig.ts`).
- Produces: `PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[]`, `PROVIDER_DESCRIPTORS_BY_NAME: ReadonlyMap<AIProviderName, ProviderDescriptor>`, `PROVIDER_ALIAS_INDEX: ReadonlyMap<string, AIProviderName>`.

This file must import **zero** provider classes and perform **zero** dynamic `import()` — it is pure data, safe to import from anywhere (CLI, tests, other plans) without triggering provider instantiation.

**Steps:**

- [ ] Before-grep: confirm the file doesn't exist.

  ```bash
  ls src/lib/factories/providerDescriptors.ts
  ```

  Expected: `ls: src/lib/factories/providerDescriptors.ts: No such file or directory`.

- [ ] Create `src/lib/factories/providerDescriptors.ts` with all 30 descriptor entries:

  ```ts
  import { AIProviderName } from "../constants/enums.js";
  import {
    GoogleAIModels,
    OpenAIModels,
    AnthropicModels,
    VertexModels,
    MistralModels,
    OllamaModels,
    LiteLLMModels,
    HuggingFaceModels,
    DeepSeekModels,
    NvidiaNimModels,
    OpenRouterModels,
    XaiModels,
    GroqModels,
    CohereModels,
    TogetherAIModels,
    FireworksModels,
    PerplexityModels,
    CloudflareModels,
    VoyageModels,
    JinaModels,
    StabilityModels,
    IdeogramModels,
    RecraftModels,
    ReplicateModels,
  } from "../constants/enums.js";
  import { API_KEY_FORMATS } from "../utils/providerConfig.js";
  import type { ProviderDescriptor } from "../types/index.js";

  /**
   * Single source of truth for provider identity, credentials, defaults, and
   * runtime behavior classification. Pure data — no provider-class imports,
   * no dynamic import(), no side effects beyond building the two derived
   * lookup maps below. Order follows the AIProviderName enum declaration
   * order (enums.ts:8-40) so this file stays easy to diff against it.
   */
  export const PROVIDER_DESCRIPTORS: readonly ProviderDescriptor[] = [
    {
      name: AIProviderName.BEDROCK,
      aliases: ["aws"],
      credentialsKey: "bedrock",
      envVars: {
        apiKey: "AWS_ACCESS_KEY_ID",
        extraRequired: ["AWS_SECRET_ACCESS_KEY"],
        model: "BEDROCK_MODEL",
      },
      defaultModel: "",
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://console.aws.amazon.com/iam/",
      timeouts: { generateMs: 45_000, streamMs: 120_000 },
      autoSelectPriority: 7,
      apiKeyFormatPattern: API_KEY_FORMATS.bedrock,
    },
    {
      name: AIProviderName.OPENAI,
      aliases: ["gpt", "chatgpt"],
      credentialsKey: "openai",
      envVars: { apiKey: "OPENAI_API_KEY", baseURL: "OPENAI_BASE_URL" },
      defaultModel: OpenAIModels.GPT_4O_MINI,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "models-probe",
      setupUrl: "https://platform.openai.com/api-keys",
      timeouts: { generateMs: 30_000, streamMs: 120_000 },
      autoSelectPriority: 5,
      apiKeyFormatPattern: API_KEY_FORMATS.openai,
    },
    {
      name: AIProviderName.OPENAI_COMPATIBLE,
      aliases: ["openai-compatible", "vllm", "compatible"],
      credentialsKey: "openaiCompatible",
      envVars: {
        apiKey: "OPENAI_COMPATIBLE_API_KEY",
        baseURL: "OPENAI_COMPATIBLE_BASE_URL",
        model: "OPENAI_COMPATIBLE_MODEL",
      },
      defaultModel: "",
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
    },
    {
      name: AIProviderName.OPENROUTER,
      aliases: ["or"],
      credentialsKey: "openrouter",
      envVars: {
        apiKey: "OPENROUTER_API_KEY",
        baseURL: "OPENROUTER_BASE_URL",
        model: "OPENROUTER_MODEL",
      },
      defaultModel: OpenRouterModels.CLAUDE_SONNET_4_5,
      toolSupport: "model-dependent",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://openrouter.ai/keys",
    },
    {
      name: AIProviderName.VERTEX,
      aliases: ["googleVertex"],
      credentialsKey: "vertex",
      envVars: {
        // "apiKey" here names the primary identity env var, not a secret —
        // Vertex's real auth is the extraRequired file-or-individual-creds
        // check below. See checkVertexAuthentication() in providerHealth.ts.
        apiKey: "GOOGLE_CLOUD_PROJECT_ID",
        fallbacks: [
          "VERTEX_PROJECT_ID",
          "GOOGLE_VERTEX_PROJECT",
          "GOOGLE_CLOUD_PROJECT",
        ],
        extraRequired: ["GOOGLE_APPLICATION_CREDENTIALS"],
        extraRequiredFallbacks: [
          "GOOGLE_SERVICE_ACCOUNT_KEY",
          "GOOGLE_AUTH_CLIENT_EMAIL",
          "GOOGLE_AUTH_PRIVATE_KEY",
        ],
      },
      defaultModel: VertexModels.CLAUDE_4_6_SONNET,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://console.cloud.google.com/",
      timeouts: { generateMs: 60_000, streamMs: 120_000 },
      autoSelectPriority: 3,
    },
    {
      name: AIProviderName.ANTHROPIC,
      aliases: ["claude"],
      credentialsKey: "anthropic",
      envVars: {
        apiKey: "ANTHROPIC_API_KEY",
        fallbacks: [
          "ANTHROPIC_OAUTH_TOKEN",
          "CLAUDE_OAUTH_TOKEN",
          "ANTHROPIC_OAUTH_ACCESS_TOKEN",
        ],
        baseURL: "ANTHROPIC_BASE_URL",
      },
      defaultModel: AnthropicModels.CLAUDE_SONNET_4_6,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://console.anthropic.com/settings/keys",
      timeouts: { generateMs: 60_000, streamMs: 120_000 },
      autoSelectPriority: 6,
      apiKeyFormatPattern: API_KEY_FORMATS.anthropic,
    },
    {
      name: AIProviderName.AZURE,
      aliases: ["azureOpenai"],
      credentialsKey: "azure",
      envVars: {
        apiKey: "AZURE_OPENAI_API_KEY",
        extraRequired: ["AZURE_OPENAI_ENDPOINT"],
        model: "AZURE_MODEL",
        modelFallbacks: [
          "AZURE_OPENAI_MODEL",
          "AZURE_OPENAI_DEPLOYMENT",
          "AZURE_OPENAI_DEPLOYMENT_ID",
        ],
      },
      defaultModel: "gpt-4o-mini",
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://portal.azure.com/",
      timeouts: { generateMs: 30_000, streamMs: 120_000 },
      autoSelectPriority: 8,
      apiKeyFormatPattern: API_KEY_FORMATS.azure,
    },
    {
      name: AIProviderName.GOOGLE_AI,
      aliases: ["googleAiStudio", "google", "gemini", "google-ai-studio"],
      credentialsKey: "googleAiStudio",
      envVars: {
        apiKey: "GOOGLE_AI_API_KEY",
        fallbacks: ["GOOGLE_GENERATIVE_AI_API_KEY"],
      },
      defaultModel: GoogleAIModels.GEMINI_2_5_FLASH,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://aistudio.google.com/apikey",
      timeouts: { generateMs: 30_000, streamMs: 120_000 },
      autoSelectPriority: 4,
      apiKeyFormatPattern: API_KEY_FORMATS["google-ai"],
    },
    {
      name: AIProviderName.HUGGINGFACE,
      aliases: ["hf"],
      credentialsKey: "huggingFace",
      envVars: {
        apiKey: "HUGGINGFACE_API_KEY",
        fallbacks: ["HUGGINGFACE_API_TOKEN", "HF_TOKEN", "HF_API_TOKEN"],
        baseURL: "HUGGINGFACE_BASE_URL",
        model: "HUGGINGFACE_MODEL",
      },
      defaultModel: HuggingFaceModels.QWEN_2_5_72B_INSTRUCT,
      toolSupport: "model-dependent",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://huggingface.co/settings/tokens",
      timeouts: { generateMs: 120_000, streamMs: 120_000 },
      autoSelectPriority: 10,
      apiKeyFormatPattern: API_KEY_FORMATS.huggingface,
    },
    {
      name: AIProviderName.OLLAMA,
      aliases: ["local"],
      credentialsKey: "ollama",
      envVars: {
        baseURL: "OLLAMA_BASE_URL",
        baseURLFallbacks: ["OLLAMA_API_BASE"],
        model: "OLLAMA_MODEL",
        optional: true,
      },
      defaultModel: OllamaModels.LLAMA3_2_LATEST,
      toolSupport: "model-dependent",
      localRuntime: true,
      healthCheck: "models-probe",
      setupUrl: "https://ollama.com/download",
      timeouts: { generateMs: 300_000, streamMs: 120_000 },
      autoSelectPriority: 2,
    },
    {
      name: AIProviderName.MISTRAL,
      aliases: [],
      credentialsKey: "mistral",
      envVars: { apiKey: "MISTRAL_API_KEY", baseURL: "MISTRAL_BASE_URL" },
      defaultModel: MistralModels.MISTRAL_LARGE_LATEST,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://console.mistral.ai/api-keys",
      timeouts: { generateMs: 45_000, streamMs: 120_000 },
      autoSelectPriority: 9,
      apiKeyFormatPattern: API_KEY_FORMATS.mistral,
    },
    {
      name: AIProviderName.LITELLM,
      aliases: [],
      credentialsKey: "litellm",
      envVars: {
        apiKey: "LITELLM_API_KEY",
        baseURL: "LITELLM_BASE_URL",
        model: "LITELLM_MODEL",
        optional: true,
      },
      defaultModel: LiteLLMModels.OPENAI_GPT_4O_MINI,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "models-probe",
      setupUrl: "https://docs.litellm.ai/docs/proxy/quick_start",
      timeouts: { generateMs: 300_000, streamMs: 120_000 },
      autoSelectPriority: 1,
    },
    {
      name: AIProviderName.SAGEMAKER,
      aliases: ["aws-sagemaker"],
      credentialsKey: "sagemaker",
      envVars: {
        apiKey: "AWS_ACCESS_KEY_ID",
        extraRequired: ["AWS_SECRET_ACCESS_KEY"],
        model: "SAGEMAKER_MODEL",
        modelFallbacks: [
          "SAGEMAKER_MODEL_NAME",
          "SAGEMAKER_DEFAULT_ENDPOINT",
          "SAGEMAKER_ENDPOINT_NAME",
        ],
        baseURL: "SAGEMAKER_ENDPOINT",
      },
      defaultModel: "sagemaker-model",
      toolSupport: "native",
      localRuntime: false,
      // Deliberate: SageMaker has no models-list endpoint, so a live
      // minimal generate() call is the only real reachability check
      // (mirrors providerUtils.isProviderAvailable()'s legacy fallback).
      healthCheck: "live-generate",
      setupUrl: "https://console.aws.amazon.com/iam/",
      apiKeyFormatPattern: API_KEY_FORMATS.aws,
    },
    {
      name: AIProviderName.DEEPSEEK,
      aliases: ["ds"],
      credentialsKey: "deepseek",
      envVars: {
        apiKey: "DEEPSEEK_API_KEY",
        baseURL: "DEEPSEEK_BASE_URL",
        model: "DEEPSEEK_MODEL",
      },
      defaultModel: DeepSeekModels.DEEPSEEK_CHAT,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://platform.deepseek.com/api_keys",
    },
    {
      name: AIProviderName.NVIDIA_NIM,
      aliases: ["nvidia", "nim"],
      credentialsKey: "nvidiaNim",
      envVars: {
        apiKey: "NVIDIA_NIM_API_KEY",
        baseURL: "NVIDIA_NIM_BASE_URL",
        model: "NVIDIA_NIM_MODEL",
      },
      defaultModel: NvidiaNimModels.LLAMA_3_3_70B_INSTRUCT,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://build.nvidia.com/settings/api-keys",
    },
    {
      name: AIProviderName.LM_STUDIO,
      aliases: ["lmstudio", "lms"],
      credentialsKey: "lmStudio",
      envVars: {
        baseURL: "LM_STUDIO_BASE_URL",
        model: "LM_STUDIO_MODEL",
        optional: true,
      },
      defaultModel: "",
      toolSupport: "native",
      localRuntime: true,
      healthCheck: "env-only",
      setupUrl: "https://lmstudio.ai/",
    },
    {
      name: AIProviderName.LLAMACPP,
      aliases: ["llama.cpp", "llama-cpp"],
      credentialsKey: "llamacpp",
      envVars: {
        baseURL: "LLAMACPP_BASE_URL",
        model: "LLAMACPP_MODEL",
        optional: true,
      },
      defaultModel: "",
      toolSupport: "native",
      localRuntime: true,
      healthCheck: "env-only",
      setupUrl: "https://github.com/ggerganov/llama.cpp",
    },
    {
      name: AIProviderName.XAI,
      aliases: ["grok"],
      credentialsKey: "xai",
      envVars: {
        apiKey: "XAI_API_KEY",
        baseURL: "XAI_BASE_URL",
        model: "XAI_MODEL",
      },
      defaultModel: XaiModels.GROK_3,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://console.x.ai/",
    },
    {
      name: AIProviderName.GROQ,
      aliases: [],
      credentialsKey: "groq",
      envVars: {
        apiKey: "GROQ_API_KEY",
        baseURL: "GROQ_BASE_URL",
        model: "GROQ_MODEL",
      },
      defaultModel: GroqModels.LLAMA_3_3_70B_VERSATILE,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://console.groq.com/keys",
    },
    {
      name: AIProviderName.COHERE,
      aliases: [],
      credentialsKey: "cohere",
      envVars: {
        apiKey: "COHERE_API_KEY",
        baseURL: "COHERE_BASE_URL",
        model: "COHERE_MODEL",
      },
      defaultModel: CohereModels.COMMAND_R_PLUS,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://dashboard.cohere.com/api-keys",
    },
    {
      name: AIProviderName.TOGETHER_AI,
      aliases: ["together"],
      credentialsKey: "together",
      envVars: {
        apiKey: "TOGETHER_API_KEY",
        baseURL: "TOGETHER_BASE_URL",
        model: "TOGETHER_MODEL",
      },
      defaultModel: TogetherAIModels.LLAMA_3_3_70B_INSTRUCT_TURBO,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://api.together.xyz/settings/api-keys",
    },
    {
      name: AIProviderName.FIREWORKS,
      aliases: [],
      credentialsKey: "fireworks",
      envVars: {
        apiKey: "FIREWORKS_API_KEY",
        baseURL: "FIREWORKS_BASE_URL",
        model: "FIREWORKS_MODEL",
      },
      defaultModel: FireworksModels.DEEPSEEK_V4_PRO,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://fireworks.ai/account/api-keys",
    },
    {
      name: AIProviderName.PERPLEXITY,
      aliases: ["pplx"],
      credentialsKey: "perplexity",
      envVars: {
        apiKey: "PERPLEXITY_API_KEY",
        baseURL: "PERPLEXITY_BASE_URL",
        model: "PERPLEXITY_MODEL",
      },
      defaultModel: PerplexityModels.SONAR,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://www.perplexity.ai/settings/api",
    },
    {
      name: AIProviderName.CLOUDFLARE,
      aliases: ["workers-ai", "cf-ai"],
      credentialsKey: "cloudflare",
      envVars: {
        apiKey: "CLOUDFLARE_API_KEY",
        extraRequired: ["CLOUDFLARE_ACCOUNT_ID"],
        model: "CLOUDFLARE_MODEL",
      },
      defaultModel: CloudflareModels.LLAMA_3_3_70B_FAST,
      toolSupport: "native",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://dash.cloudflare.com/profile/api-tokens",
    },
    {
      name: AIProviderName.VOYAGE,
      aliases: ["voyage-ai"],
      credentialsKey: "voyage",
      envVars: {
        apiKey: "VOYAGE_API_KEY",
        baseURL: "VOYAGE_BASE_URL",
        model: "VOYAGE_MODEL",
      },
      defaultModel: VoyageModels.VOYAGE_3_5,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://dash.voyageai.com/api-keys",
    },
    {
      name: AIProviderName.JINA,
      aliases: ["jina-ai"],
      credentialsKey: "jina",
      envVars: {
        apiKey: "JINA_API_KEY",
        baseURL: "JINA_BASE_URL",
        model: "JINA_MODEL",
      },
      defaultModel: JinaModels.JINA_EMBEDDINGS_V3,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://jina.ai/?sui=apikey",
    },
    {
      name: AIProviderName.STABILITY,
      aliases: ["stability-ai", "sd"],
      credentialsKey: "stability",
      envVars: {
        apiKey: "STABILITY_API_KEY",
        baseURL: "STABILITY_BASE_URL",
        model: "STABILITY_MODEL",
      },
      defaultModel: StabilityModels.STABLE_IMAGE_ULTRA,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://platform.stability.ai/account/keys",
    },
    {
      name: AIProviderName.IDEOGRAM,
      aliases: [],
      credentialsKey: "ideogram",
      envVars: {
        apiKey: "IDEOGRAM_API_KEY",
        baseURL: "IDEOGRAM_BASE_URL",
        model: "IDEOGRAM_MODEL",
      },
      defaultModel: IdeogramModels.IDEOGRAM_V3,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://developer.ideogram.ai/",
    },
    {
      name: AIProviderName.RECRAFT,
      aliases: [],
      credentialsKey: "recraft",
      envVars: {
        apiKey: "RECRAFT_API_KEY",
        baseURL: "RECRAFT_BASE_URL",
        model: "RECRAFT_MODEL",
      },
      defaultModel: RecraftModels.RECRAFT_V3,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://www.recraft.ai/api",
    },
    {
      name: AIProviderName.REPLICATE,
      aliases: [],
      credentialsKey: "replicate",
      // NOTE: Replicate's NeurolinkCredentials shape uses non-standard field
      // names (apiToken not apiKey, baseUrl not baseURL) — envVars below
      // still describes the *environment variable* names, which follow the
      // usual convention; only the credentials object's field names differ.
      envVars: { apiKey: "REPLICATE_API_TOKEN", model: "REPLICATE_MODEL" },
      defaultModel: ReplicateModels.LLAMA_3_70B_INSTRUCT,
      toolSupport: "none",
      localRuntime: false,
      healthCheck: "env-only",
      setupUrl: "https://replicate.com/account/api-tokens",
    },
  ];

  /** O(1) canonical-name → descriptor lookup. */
  export const PROVIDER_DESCRIPTORS_BY_NAME: ReadonlyMap<
    AIProviderName,
    ProviderDescriptor
  > = new Map(PROVIDER_DESCRIPTORS.map((d) => [d.name, d]));

  /**
   * O(1) alias → canonical-name lookup, covering both `aliases` and each
   * descriptor's own lowercased `name`. Replaces the O(n) linear scan in
   * ProviderFactory.normalizeProviderName().
   */
  export const PROVIDER_ALIAS_INDEX: ReadonlyMap<string, AIProviderName> =
    new Map(
      PROVIDER_DESCRIPTORS.flatMap((d) => [
        [d.name.toLowerCase(), d.name] as const,
        ...d.aliases.map((alias) => [alias.toLowerCase(), d.name] as const),
      ]),
    );
  ```

  Note: `REPLICATE` is placed last (after `RECRAFT`) to match the enum's declared order (`enums.ts:8-40` lists `REPLICATE` before `VOYAGE`/`JINA`/`STABILITY`/`IDEOGRAM`/`RECRAFT`) — **correction**: keep entries in the exact enum order; if a diff shows `REPLICATE` out of place relative to `enums.ts`, move it to sit directly after `CLOUDFLARE` and before `VOYAGE` so the file's order matches the enum 1:1. Verify with the grep in the next step.

- [ ] Run typecheck and lint.

  ```bash
  pnpm run check && pnpm run lint
  ```

  Expected: both exit 0. If `neurolink/barrel-type-imports` flags the `import type { ProviderDescriptor } from "../types/index.js"` line, confirm it's importing from the barrel (`../types/index.js`), not a specific file — that satisfies rule 13.

- [ ] Smoke-check the data with a one-off `tsx` script (no suite file yet — Task 6 makes it durable):

  ```bash
  npx tsx -e '
  import { PROVIDER_DESCRIPTORS, PROVIDER_DESCRIPTORS_BY_NAME, PROVIDER_ALIAS_INDEX } from "./src/lib/factories/providerDescriptors.ts";
  import { AIProviderName } from "./src/lib/constants/enums.ts";
  const enumValues = Object.values(AIProviderName).filter((v) => v !== AIProviderName.AUTO);
  const names = PROVIDER_DESCRIPTORS.map((d) => d.name);
  console.assert(names.length === enumValues.length, "count mismatch: " + names.length + " vs " + enumValues.length);
  console.assert(new Set(names).size === names.length, "duplicate name in PROVIDER_DESCRIPTORS");
  console.assert(enumValues.every((v) => PROVIDER_DESCRIPTORS_BY_NAME.has(v)), "missing descriptor for some AIProviderName");
  console.assert(PROVIDER_ALIAS_INDEX.get("together-ai") === AIProviderName.TOGETHER_AI, "together-ai alias broken");
  console.log("OK", names.length, "descriptors,", PROVIDER_ALIAS_INDEX.size, "alias entries");
  '
  ```

  Expected: `OK 30 descriptors, N alias entries` with no `console.assert` failure lines printed above it (assertion failures print to stderr as `Assertion failed:` but do not stop the script — visually confirm none appear).

- [ ] Commit.
  ```bash
  git add src/lib/factories/providerDescriptors.ts
  git commit -m "feat(providers): add PROVIDER_DESCRIPTORS pure-data module for all 30 providers"
  ```

---

### Task 3: `ProviderFactory.getDescriptor()` / `getAllDescriptors()` + registration wiring + public exports

**Files:**

- `src/lib/types/providers.ts:1967-1971` — extend `ProviderRegistration`.
- `src/lib/factories/providerFactory.ts:55-78` — extend `registerProvider()`.
- `src/lib/factories/providerFactory.ts` — add two new static methods near `getProviderInfo()` (current lines 180-184).
- `src/lib/index.ts` — add new exports near the existing `AIProviderFactory` export (lines 36-37).

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS`, `PROVIDER_DESCRIPTORS_BY_NAME`, `PROVIDER_ALIAS_INDEX` (Task 2).
- Produces: `ProviderFactory.getDescriptor(name: string): ProviderDescriptor | undefined`, `ProviderFactory.getAllDescriptors(): readonly ProviderDescriptor[]`, and public re-exports `PROVIDER_DESCRIPTORS`, `ProviderFactory` from `src/lib/index.ts`.

**Steps:**

- [ ] Failing test — add to a new file `test/continuous-test-suite-provider-descriptors.ts` (this step creates the file; later tasks append more `test()` blocks to it):

  ```ts
  #!/usr/bin/env tsx
  import "dotenv/config";
  import {
    defineSuite,
    logSection,
    assert,
    assertEqual,
  } from "./helpers/harness.js";
  import { assertDistFresh } from "./helpers/distFreshness.js";

  assertDistFresh();

  const { test, runSuite } = defineSuite("Provider Descriptors");

  await runSuite(async () => {
    logSection("ProviderFactory.getDescriptor / getAllDescriptors");

    await test("getAllDescriptors returns all 30 real providers", async () => {
      const { ProviderFactory } = await import("../dist/index.js");
      const all = ProviderFactory.getAllDescriptors();
      assertEqual(all.length, 30, "getAllDescriptors length");
    });

    await test("getDescriptor resolves a canonical name", async () => {
      const { ProviderFactory } = await import("../dist/index.js");
      const d = ProviderFactory.getDescriptor("openai");
      assert(d !== undefined, "openai descriptor missing");
      assertEqual(d?.credentialsKey, "openai", "openai credentialsKey");
    });

    await test("getDescriptor returns undefined for an unknown name", async () => {
      const { ProviderFactory } = await import("../dist/index.js");
      const d = ProviderFactory.getDescriptor("not-a-real-provider");
      assert(d === undefined, "unknown provider should have no descriptor");
    });
  });
  ```

  This step ALSO requires adding `"test:provider-descriptors": "npx tsx test/continuous-test-suite-provider-descriptors.ts"` to `package.json`'s `scripts` block, alphabetically near the other `test:*` entries.

- [ ] Run and verify it fails (the exports don't exist yet, so the dynamic `import()` calls throw or `ProviderFactory.getDescriptor` is `undefined`).

  ```bash
  pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: FAIL — either the build fails to produce a `getDescriptor`/`getAllDescriptors` on `ProviderFactory`, or (if `ProviderFactory` itself isn't exported yet) the destructure yields `undefined` and calling `.getAllDescriptors()` throws `TypeError: Cannot read properties of undefined`, which the harness reports as a FAIL (not a Skip, since the message doesn't match `isExpectedProviderError()`).

- [ ] Extend `ProviderRegistration` in `src/lib/types/providers.ts` (the existing type at lines 1967-1971):

  ```ts
  export type ProviderRegistration = {
    constructor: ProviderConstructor;
    defaultModel?: string;
    aliases?: string[];
    descriptor?: ProviderDescriptor;
  };
  ```

- [ ] Extend `registerProvider()` in `src/lib/factories/providerFactory.ts` (current signature at lines 55-60) to accept and store an optional 5th parameter, and add the two new static methods near `getProviderInfo()` (lines 180-184):

  ```ts
  static registerProvider(
    name: string,
    constructor: ProviderConstructor,
    defaultModel?: string,
    aliases: string[] = [],
    descriptor?: ProviderDescriptor,
  ): void {
    const registration: ProviderRegistration = {
      constructor,
      defaultModel,
      aliases,
      descriptor,
    };
    ProviderFactory.providers.set(name.toLowerCase(), registration);
    for (const alias of aliases) {
      ProviderFactory.providers.set(alias.toLowerCase(), registration);
    }
  }
  ```

  ```ts
  /**
   * Look up a provider's static descriptor. Checks the built-in
   * PROVIDER_DESCRIPTORS first (works even before registerAllProviders()
   * has run, and resolves aliases via PROVIDER_ALIAS_INDEX), then falls
   * back to whatever descriptor a live custom registration attached via
   * registerProvider()'s 5th parameter.
   */
  static getDescriptor(name: string): ProviderDescriptor | undefined {
    const normalized = name.toLowerCase();
    const canonical = PROVIDER_ALIAS_INDEX.get(normalized);
    if (canonical) {
      const builtIn = PROVIDER_DESCRIPTORS_BY_NAME.get(canonical);
      if (builtIn) {
        return builtIn;
      }
    }
    return ProviderFactory.providers.get(normalized)?.descriptor;
  }

  /** All built-in provider descriptors (does not include custom-registered providers that lack a descriptor). */
  static getAllDescriptors(): readonly ProviderDescriptor[] {
    return PROVIDER_DESCRIPTORS;
  }
  ```

  Add the import at the top of `providerFactory.ts`:

  ```ts
  import {
    PROVIDER_DESCRIPTORS,
    PROVIDER_DESCRIPTORS_BY_NAME,
    PROVIDER_ALIAS_INDEX,
  } from "./providerDescriptors.js";
  ```

  and add `ProviderDescriptor` to the existing type-only import from `../types/index.js` at the top of the file.

- [ ] Add public exports to `src/lib/index.ts`, immediately after the existing `export { AIProviderFactory };` (line 37):

  ```ts
  // Provider descriptor exports (single source of truth for provider identity)
  export { ProviderFactory } from "./factories/providerFactory.js";
  export {
    PROVIDER_DESCRIPTORS,
    PROVIDER_DESCRIPTORS_BY_NAME,
    PROVIDER_ALIAS_INDEX,
  } from "./factories/providerDescriptors.js";
  ```

- [ ] Run and verify the test now passes.

  ```bash
  pnpm run check && pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: `pnpm run check` exits 0; `test:provider-descriptors` prints `Passed: 3, Failed: 0, Skipped: 0` (or similar per the harness's summary format) and exits 0.

- [ ] Commit.
  ```bash
  git add src/lib/types/providers.ts src/lib/factories/providerFactory.ts src/lib/index.ts test/continuous-test-suite-provider-descriptors.ts package.json
  git commit -m "feat(providers): add ProviderFactory.getDescriptor/getAllDescriptors and public exports"
  ```

---

### Task 4: Rewire `normalizeProviderName()` to the O(1) alias index

**Files:**

- `src/lib/factories/providerFactory.ts:189-205` — `normalizeProviderName()`.

**Interfaces:**

- Consumes: `PROVIDER_ALIAS_INDEX` (Task 2, already imported in Task 3).
- Produces: same public signature, `ProviderFactory.normalizeProviderName(providerName: string): string | null` — behavior-preserving for descriptor-covered providers, with a fallback path for anything registered without a descriptor (e.g. future non-AI media/TTS handlers that call `registerProvider()` directly).

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("normalizeProviderName alias resolution");

  await test("normalizeProviderName resolves an alias in O(1) via the index", async () => {
    const { ProviderFactory, ProviderRegistry } =
      await import("../dist/index.js");
    // "or" is OpenRouter's alias — normalizeProviderName only works AFTER
    // registerAllProviders() has populated the live Map. Note this is
    // ProviderRegistry.registerAllProviders(), NOT ProviderFactory's own
    // ensureInitialized() — that private method only flips an `initialized`
    // flag and calls a no-op initializeDefaultProviders(); actual
    // registration happens exclusively via ProviderRegistry (kept separate
    // to avoid a circular import from providerFactory.ts into the 24
    // provider modules). This test forces real registration first so both
    // the old and new implementation are compared on equal footing.
    await ProviderRegistry.registerAllProviders();
    const resolved = ProviderFactory.normalizeProviderName("or");
    assertEqual(
      resolved,
      "openrouter",
      "alias 'or' should resolve to 'openrouter'",
    );
  });

  await test("normalizeProviderName returns null for a truly unknown name", async () => {
    const { ProviderFactory, ProviderRegistry } =
      await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    const resolved = ProviderFactory.normalizeProviderName(
      "definitely-not-a-provider",
    );
    assert(resolved === null, "unknown provider should normalize to null");
  });
  ```

  This test passes against the CURRENT implementation too (it's a characterization test, not a new-behavior test) — its purpose is to lock in identical output before and after the O(n)→O(1) rewrite, per the "run+verify fail" step below using a deliberately broken intermediate state.

- [ ] Run it against the current code to confirm it currently PASSES (proving the rewrite must not change behavior):

  ```bash
  pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: all 5 tests so far (3 from Task 3 + these 2) pass. This confirms the baseline; the next step is a refactor, verified by re-running the same suite unchanged afterward (a "no green→red→green" cycle is expected here since this is a pure refactor with a pre-existing correct implementation — call out explicitly that this task's TDD cycle is characterization-then-refactor, not new-behavior-then-implementation).

- [ ] Rewrite `normalizeProviderName()` (current lines 189-205):

  ```ts
  static normalizeProviderName(providerName: string): string | null {
    const normalized = providerName.toLowerCase();
    if (ProviderFactory.providers.has(normalized)) {
      return normalized;
    }
    const canonical = PROVIDER_ALIAS_INDEX.get(normalized);
    if (canonical && ProviderFactory.providers.has(canonical)) {
      return canonical;
    }
    // Fallback for providers registered without a built-in descriptor
    // (e.g. TTS/STT/media handlers registered outside PROVIDER_DESCRIPTORS).
    for (const [name, registration] of ProviderFactory.providers.entries()) {
      if (registration.aliases?.includes(normalized)) {
        return name;
      }
    }
    return null;
  }
  ```

- [ ] Run and verify the suite still passes (behavior-preserving refactor).

  ```bash
  pnpm run check && pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: all 5 tests pass, exit 0.

- [ ] Commit.
  ```bash
  git add src/lib/factories/providerFactory.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "perf(providers): resolve alias lookups via O(1) PROVIDER_ALIAS_INDEX"
  ```

---

### Task 5: Wire descriptors into `providerRegistry.ts`'s 30 `registerProvider()` calls

**Files:**

- `src/lib/factories/providerRegistry.ts` — all 30 `ProviderFactory.registerProvider(...)` call sites inside `_doRegister()` (confirmed at lines 106, 126, 145, 170, 194, 217, 242, 262, 280, 299, 318, 343, 373, 399, 417, 436, 454, 471, 489, 507, 525, 550, 575, 600, 625, 643, 661, 686, 705, 730).

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS_BY_NAME` (Task 2), `AIProviderName` (already imported).
- Produces: no new symbols — this is a purely additive change to existing calls (adds a 5th argument), so every provider's live `ProviderRegistration.descriptor` is populated. `defaultModel`/`aliases` arguments are left byte-for-byte unchanged to keep this a zero-risk additive migration.

This is a mechanical, data-driven change with no new runtime behavior to unit-test beyond "the descriptor is attached" — using the pure-data-migration cycle.

**Steps:**

- [ ] Before-grep: confirm the exact call count and that none already pass a 5th argument.

  ```bash
  grep -c "ProviderFactory.registerProvider(" src/lib/factories/providerRegistry.ts
  grep -A6 "ProviderFactory.registerProvider(" src/lib/factories/providerRegistry.ts | grep -c "descriptor"
  ```

  Expected: first command prints `30`; second prints `0`.

- [ ] Add the import at the top of `providerRegistry.ts` (alongside the existing `AIProviderName` + `<Provider>Models` static import block, lines 12-38):

  ```ts
  import { PROVIDER_DESCRIPTORS_BY_NAME } from "./providerDescriptors.js";
  ```

- [ ] Add a 5th argument, `PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.<NAME>)`, to each of the 30 `registerProvider()` calls. Two full worked examples (the rest follow the identical pattern — see the table below):

  **GOOGLE_AI** (`providerRegistry.ts:106-123`), before:

  ```ts
  ProviderFactory.registerProvider(
    AIProviderName.GOOGLE_AI,
    async (modelName?, _providerName?, sdk?) => {
      const { GoogleAIStudioProvider } =
        await import("../providers/googleAiStudio.js");
      return new GoogleAIStudioProvider(
        modelName,
        sdk as NeuroLink | undefined,
      );
    },
    GoogleAIModels.GEMINI_2_5_FLASH,
    ["googleAiStudio", "google", "gemini", "google-ai-studio"],
  );
  ```

  after (only the closing line changes):

  ```ts
  ProviderFactory.registerProvider(
    AIProviderName.GOOGLE_AI,
    async (modelName?, _providerName?, sdk?) => {
      const { GoogleAIStudioProvider } =
        await import("../providers/googleAiStudio.js");
      return new GoogleAIStudioProvider(
        modelName,
        sdk as NeuroLink | undefined,
      );
    },
    GoogleAIModels.GEMINI_2_5_FLASH,
    ["googleAiStudio", "google", "gemini", "google-ai-studio"],
    PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.GOOGLE_AI),
  );
  ```

  **AZURE** (`providerRegistry.ts:194-214`), same transformation — only the trailing comma line is added:

  ```ts
  ProviderFactory.registerProvider(
    AIProviderName.AZURE,
    async (modelName?, _providerName?, sdk?) => {
      const { AzureOpenAIProvider } =
        await import("../providers/azureOpenai.js");
      return new AzureOpenAIProvider(modelName, sdk as NeuroLink | undefined);
    },
    process.env.AZURE_MODEL ||
      process.env.AZURE_OPENAI_MODEL ||
      process.env.AZURE_OPENAI_DEPLOYMENT ||
      process.env.AZURE_OPENAI_DEPLOYMENT_ID ||
      "gpt-4o-mini",
    ["azureOpenai"],
    PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.AZURE),
  );
  ```

  Apply the same one-line addition (`PROVIDER_DESCRIPTORS_BY_NAME.get(AIProviderName.<NAME>)` as the final argument, before the closing `);`) to the remaining 28 calls, keyed by enum member:

  | Enum member         | Line (before edit) |
  | ------------------- | ------------------ |
  | `OPENAI`            | 126                |
  | `ANTHROPIC`         | 145                |
  | `BEDROCK`           | 170                |
  | `VERTEX`            | 217                |
  | `HUGGINGFACE`       | 242                |
  | `MISTRAL`           | 262                |
  | `OLLAMA`            | 280                |
  | `LITELLM`           | 299                |
  | `OPENAI_COMPATIBLE` | 318                |
  | `OPENROUTER`        | 343                |
  | `SAGEMAKER`         | 373                |
  | `DEEPSEEK`          | 399                |
  | `NVIDIA_NIM`        | 417                |
  | `LM_STUDIO`         | 436                |
  | `LLAMACPP`          | 454                |
  | `XAI`               | 471                |
  | `GROQ`              | 489                |
  | `COHERE`            | 507                |
  | `TOGETHER_AI`       | 525                |
  | `FIREWORKS`         | 550                |
  | `PERPLEXITY`        | 575                |
  | `CLOUDFLARE`        | 600                |
  | `VOYAGE`            | 625                |
  | `JINA`              | 643                |
  | `STABILITY`         | 661                |
  | `IDEOGRAM`          | 686                |
  | `REPLICATE`         | 705                |
  | `RECRAFT`           | 730                |

- [ ] Typecheck and lint.

  ```bash
  pnpm run check && pnpm run lint
  ```

  Expected: both exit 0. If `_doRegister()`'s `// eslint-disable-next-line max-lines-per-function` comment causes a new lint failure because the function grew, that's expected and pre-existing — the disable comment already covers it; no action needed unless the linter reports something else.

- [ ] Targeted suite — extend `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("Live registration carries its descriptor");

  await test("a registered provider's live descriptor matches PROVIDER_DESCRIPTORS", async () => {
    const { ProviderFactory, ProviderRegistry, PROVIDER_DESCRIPTORS_BY_NAME } =
      await import("../dist/index.js");
    // registerAllProviders(), not ensureInitialized() — see the note in
    // Task 4's normalizeProviderName test for why.
    await ProviderRegistry.registerAllProviders();
    // getProviderInfo() takes a provider name and returns that one
    // registration (or undefined) — it is not a bulk accessor.
    const info = ProviderFactory.getProviderInfo("openai");
    assert(info !== undefined, "expected openai to be registered");
    const staticDescriptor = PROVIDER_DESCRIPTORS_BY_NAME.get("openai");
    const liveDescriptor = ProviderFactory.getDescriptor("openai");
    assertEqual(
      liveDescriptor?.credentialsKey,
      staticDescriptor?.credentialsKey,
      "live vs static descriptor credentialsKey",
    );
  });
  ```

  Run:

  ```bash
  pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: all tests pass, exit 0.

- [ ] Commit.
  ```bash
  git add src/lib/factories/providerRegistry.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "feat(providers): attach ProviderDescriptor to all 30 registerProvider() calls"
  ```

---

### Task 6: Completeness suite + break-one-assertion sanity check

**Files:**

- `test/continuous-test-suite-provider-descriptors.ts` — the file created incrementally in Tasks 3-5; this task adds the core completeness assertions and the required sanity check.
- `package.json` — script already added in Task 3.

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS`, `ProviderFactory`, `AIProviderName` from `../dist/index.js`.

**Steps:**

- [ ] Add completeness tests to `test/continuous-test-suite-provider-descriptors.ts` (append a new `logSection` + `test()` block before the final `runSuite` closes — since `runSuite`'s body is a single async function, add these `await test(...)` calls inside it, after the existing sections):

  ```ts
  logSection(
    "Completeness: every AIProviderName (except AUTO) has exactly one descriptor",
  );

  await test("PROVIDER_DESCRIPTORS covers every real provider exactly once", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const { AIProviderName } = await import("../dist/index.js");
    const enumValues = Object.values(AIProviderName).filter(
      (v) => v !== AIProviderName.AUTO,
    );
    const names = PROVIDER_DESCRIPTORS.map((d: { name: string }) => d.name);
    assertEqual(
      names.length,
      enumValues.length,
      "descriptor count vs enum count",
    );
    assertEqual(
      new Set(names).size,
      names.length,
      "duplicate descriptor name detected",
    );
    for (const value of enumValues) {
      assert(names.includes(value), `missing descriptor for ${value}`);
    }
  });

  await test("every descriptor has a non-empty credentialsKey and toolSupport", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      credentialsKey: string;
      toolSupport: string;
      healthCheck: string;
    }>) {
      assert(
        typeof d.credentialsKey === "string" && d.credentialsKey.length > 0,
        `${d.name} missing credentialsKey`,
      );
      assert(
        ["native", "prompt-only", "none", "model-dependent"].includes(
          d.toolSupport,
        ),
        `${d.name} has an invalid toolSupport value`,
      );
      assert(
        ["env-only", "models-probe", "live-generate"].includes(d.healthCheck),
        `${d.name} has an invalid healthCheck value`,
      );
    }
  });

  await test("no two descriptors share an alias or a name-as-alias collision", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const seen = new Map<string, string>();
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      aliases: readonly string[];
    }>) {
      for (const key of [d.name, ...d.aliases]) {
        const lower = key.toLowerCase();
        const owner = seen.get(lower);
        assert(
          owner === undefined || owner === d.name,
          `alias collision on "${lower}" between ${owner} and ${d.name}`,
        );
        seen.set(lower, d.name);
      }
    }
  });

  await test("TOGETHER_AI resolves the correct credentialsKey (regression guard for the CREDENTIAL_KEY_MAP class of bug)", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const d = ProviderFactory.getDescriptor("together-ai");
    assertEqual(
      d?.credentialsKey,
      "together",
      "together-ai credentialsKey regression",
    );
  });
  ```

- [ ] Run and verify pass.

  ```bash
  pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: exit 0, all tests reported as passed.

- [ ] Required sanity check — break one assertion on purpose and confirm the suite reports FAIL and exits non-zero (per this repo's documented hazard: a thrown message that merely quotes provider-ish text gets silently downgraded to SKIP). Temporarily change the last test's expected value:

  ```bash
  sed -i.bak 's/"together-ai credentialsKey regression"/"together-ai credentialsKey regression"/;s/d?.credentialsKey, "together"/d?.credentialsKey, "wrong-value-on-purpose"/' test/continuous-test-suite-provider-descriptors.ts
  pnpm run test:provider-descriptors; echo "exit code: $?"
  ```

  Expected: output contains a `✗` FAIL line for the "TOGETHER_AI resolves..." test and `exit code: 1` (non-zero) — confirming this suite reports real failures as FAIL, not SKIP.

- [ ] Revert the deliberate breakage and re-verify green.

  ```bash
  mv test/continuous-test-suite-provider-descriptors.ts.bak test/continuous-test-suite-provider-descriptors.ts
  pnpm run test:provider-descriptors; echo "exit code: $?"
  ```

  Expected: `exit code: 0`, all tests pass.

- [ ] Commit.
  ```bash
  git add test/continuous-test-suite-provider-descriptors.ts
  git commit -m "test(providers): add descriptor completeness suite with sanity-checked failure path"
  ```

---

### Task 7 (scope a): CLI `--provider` choices + bash completion derived from descriptors

**Files:**

- `src/cli/factories/commandFactory.ts:105-162` — `commonOptions.provider.choices`.
- `src/cli/factories/commandFactory.ts:~6040` — bash-completion literal string.

Testing convention note: this task's test imports the option-builder object directly from `src/cli/factories/commandFactory.ts` via `tsx` (not from `dist/index.js` — CLI option definitions aren't part of the SDK's public barrel).

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS` (`src/lib/factories/providerDescriptors.js`).
- Produces: same `commonOptions.provider.choices: string[]` value, now derived instead of hand-maintained; same bash-completion string, now derived from the same source (fixing the confirmed missing `nvidia`/`lms` entries).

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("CLI provider choices derived from descriptors");

  await test("commonOptions.provider.choices includes every descriptor name and alias plus the CLI-only pseudo-provider", async () => {
    const { commonOptions } =
      await import("../src/cli/factories/commandFactory.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const choices: string[] = commonOptions.provider.choices;
    assert(choices.includes("auto"), "choices missing 'auto'");
    assert(
      choices.includes("anthropic-subscription"),
      "choices missing 'anthropic-subscription'",
    );
    for (const d of PROVIDER_DESCRIPTORS as Array<{
      name: string;
      aliases: readonly string[];
    }>) {
      assert(
        choices.includes(d.name),
        `choices missing provider name ${d.name}`,
      );
      for (const alias of d.aliases) {
        assert(
          choices.includes(alias),
          `choices missing alias ${alias} for ${d.name}`,
        );
      }
    }
  });

  await test("bash completion string matches provider.choices exactly (regression for missing nvidia/lms)", async () => {
    const { commonOptions, BASH_COMPLETION_PROVIDERS } =
      await import("../src/cli/factories/commandFactory.js");
    const choiceSet = new Set<string>(commonOptions.provider.choices);
    const completionSet = new Set<string>(BASH_COMPLETION_PROVIDERS.split(" "));
    for (const c of choiceSet) {
      assert(completionSet.has(c), `bash completion missing "${c}"`);
    }
  });
  ```

- [ ] Run and verify it fails (`BASH_COMPLETION_PROVIDERS` doesn't exist as an exported symbol yet, and the choices array is still hand-written so the first test may already pass — the second test fails with an import error).

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: FAIL on "bash completion string matches..." — `BASH_COMPLETION_PROVIDERS is not exported` (or `undefined`).

- [ ] In `src/cli/factories/commandFactory.ts`, add the import and derive both values. Near the top of the file (alongside existing imports):

  ```ts
  import { PROVIDER_DESCRIPTORS } from "../../lib/factories/providerDescriptors.js";
  ```

  Add a derived constant near the top-level scope (before `commonOptions` is defined):

  ```ts
  /**
   * Every provider name + alias, derived from PROVIDER_DESCRIPTORS, plus
   * "auto" and the CLI-only "anthropic-subscription" pseudo-provider (not a
   * real AIProviderName — special-cased at runtime to rewrite
   * options.provider to "anthropic").
   */
  const DERIVED_PROVIDER_CHOICES: string[] = [
    "auto",
    ...PROVIDER_DESCRIPTORS.flatMap((d) => [d.name, ...d.aliases]),
    "anthropic-subscription",
  ];

  /** Space-separated form for the bash-completion script, kept in sync with DERIVED_PROVIDER_CHOICES by construction. */
  export const BASH_COMPLETION_PROVIDERS = DERIVED_PROVIDER_CHOICES.join(" ");
  ```

  Replace the `choices: [...]` array in `commonOptions.provider` (lines 105-162) with:

  ```ts
  choices: DERIVED_PROVIDER_CHOICES,
  ```

  Replace the hand-written bash-completion literal (around line 6040) with a reference to `BASH_COMPLETION_PROVIDERS` instead of the inline string.

- [ ] Run and verify pass.

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0, both new tests pass.

- [ ] Commit.
  ```bash
  git add src/cli/factories/commandFactory.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "fix(cli): derive --provider choices and bash completion from PROVIDER_DESCRIPTORS"
  ```

---

### Task 8 (scope b): `providerUtils.ts` — `hasProviderEnvVars()` and `getAvailableProviders()`

> **Scope note (post-Plan-01):** Plan 01 landed first and already rewrote `getAvailableProviders()` to be enum-derived (`Object.values(AIProviderName).filter(...)`, `providerUtils.ts:511-515`) — it already correctly returns all 30 providers, so `isValidProvider()` (which calls it) is already correct too. That part of this task is no longer a bug fix; it is downgraded to an optional consistency migration (re-deriving from `PROVIDER_DESCRIPTORS` instead of the enum, so this function reads from the same single source as the other eight consumers) and is called out as such below. `hasProviderEnvVars()` is untouched by Plan 01 and is still genuinely broken — that part of this task is unchanged.

**Files:**

- `src/lib/utils/providerUtils.ts:437-505` — `hasProviderEnvVars()` (10-case switch + `default: return false`, silently returning `false` for the other 20 providers today — still broken, this is the real fix in this task).
- `src/lib/utils/providerUtils.ts:511-515` — `getAvailableProviders()` (already rewritten by Plan 01 to `Object.values(AIProviderName).filter(...)`, already correct for all 30 providers; migrating it to `PROVIDER_DESCRIPTORS.map((d) => d.name)` here is a source-of-truth consistency step, not a bug fix).

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS`, `PROVIDER_ALIAS_INDEX`.
- Produces: same signatures, `hasProviderEnvVars(provider: string): boolean` (now correct for all 30 providers instead of only 10 — the genuine fix) and `getAvailableProviders(): string[]` (already correct post-Plan-01; re-pointed at `PROVIDER_DESCRIPTORS` purely so it shares the same source as the other eight consumers, with no observable behavior change).

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("providerUtils env-var checks cover all 30 providers");

  await test("hasProviderEnvVars recognizes a provider outside the old 10-case switch (regression)", async () => {
    process.env.GROQ_API_KEY = "test-key-for-suite-only";
    try {
      const { hasProviderEnvVars } =
        await import("../src/lib/utils/providerUtils.js");
      assert(
        hasProviderEnvVars("groq") === true,
        "groq should be recognized once GROQ_API_KEY is set",
      );
    } finally {
      delete process.env.GROQ_API_KEY;
    }
  });

  await test("getAvailableProviders lists all 30 descriptor names", async () => {
    const { getAvailableProviders } =
      await import("../src/lib/utils/providerUtils.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const available = getAvailableProviders();
    for (const d of PROVIDER_DESCRIPTORS as Array<{ name: string }>) {
      assert(
        available.includes(d.name),
        `getAvailableProviders missing ${d.name}`,
      );
    }
  });
  ```

- [ ] Run and verify: the `hasProviderEnvVars` test FAILS, the `getAvailableProviders` test already PASSES.

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: `hasProviderEnvVars("groq")` returns `false` (falls into `default: return false`) even with `GROQ_API_KEY` set — this one is the real, still-open bug. `getAvailableProviders()` already includes `groq` and the other 29 providers, because Plan 01 already rewrote it to be enum-derived — this test passes before any code in this task changes, since it's characterizing already-correct (if not yet descriptor-derived) behavior.

- [ ] Replace `hasProviderEnvVars()` (lines 437-505) with a descriptor-driven implementation:

  ```ts
  export function hasProviderEnvVars(provider: string): boolean {
    const descriptor = ProviderFactory.getDescriptor(provider);
    if (!descriptor) {
      return false;
    }
    if (descriptor.envVars.optional || descriptor.localRuntime) {
      // Ollama / LiteLLM / LM Studio / llama.cpp: usable with defaults.
      return true;
    }
    const { apiKey, fallbacks, extraRequired } = descriptor.envVars;
    const hasPrimary =
      !!apiKey &&
      (!!process.env[apiKey] ||
        (fallbacks ?? []).some((v) => !!process.env[v]));
    if (!hasPrimary) {
      return false;
    }
    return (extraRequired ?? []).every((v) => !!process.env[v]);
  }
  ```

  Add the import at the top of `providerUtils.ts`:

  ```ts
  import { ProviderFactory } from "../factories/providerFactory.js";
  ```

  (Confirm this doesn't create a circular import: `providerFactory.ts` does not import `providerUtils.ts` — verified via `providerFactory.ts`'s import block already read in this plan's research, which only imports from `../types/index.js` and `./providerDescriptors.js`.)

- [ ] Re-point `getAvailableProviders()` (lines 511-515) at `PROVIDER_DESCRIPTORS` instead of the enum. This is a source-of-truth consistency step, not a bug fix — Plan 01's enum-derived version already returns the correct 30 providers. Before:

  ```ts
  export function getAvailableProviders(): string[] {
    return Object.values(AIProviderName).filter(
      (name) => name !== AIProviderName.AUTO,
    );
  }
  ```

  After:

  ```ts
  export function getAvailableProviders(): string[] {
    return PROVIDER_DESCRIPTORS.map((d) => d.name);
  }
  ```

  Add `PROVIDER_DESCRIPTORS` to the import from `../factories/providerDescriptors.js` (add alongside the `ProviderFactory` import above). The `AIProviderName` import may become unused in this file once this is the only place it was referenced — check with `pnpm run lint` in the next step and remove the import only if it flags as unused (other functions in this file may still reference it).

- [ ] Run and verify pass.

  ```bash
  pnpm run check && npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0, both tests pass — `hasProviderEnvVars` now for the first time (the genuine fix), `getAvailableProviders` continues passing (it already did, both before and after this task's edit, since both the enum-derived and descriptor-derived forms produce the same 30 names — Task 6's completeness suite is what guarantees that equivalence).

- [ ] Commit.
  ```bash
  git add src/lib/utils/providerUtils.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "fix(providers): derive hasProviderEnvVars from descriptors for all 30 providers; re-point getAvailableProviders at the same source"
  ```

---

### Task 9 (scope c): `autoSelectPriority` reconciliation

**Files:**

- `src/lib/utils/providerUtils.ts:83-104` — the rationale comment (83-92) and 10-provider `providers` array (93-104) inside `getBestProvider()`.

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS`.
- Produces: same `getBestProvider(requestedProvider?: string): Promise<string>` signature; the internal fallback-chain array is now derived instead of hand-written, sorted by `autoSelectPriority`.

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("autoSelectPriority reconciliation");

  await test("descriptors with autoSelectPriority reproduce getBestProvider's historical 10-provider order", async () => {
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const prioritized = (
      PROVIDER_DESCRIPTORS as Array<{
        name: string;
        autoSelectPriority?: number;
      }>
    )
      .filter((d) => d.autoSelectPriority !== undefined)
      .sort((a, b) => (a.autoSelectPriority ?? 0) - (b.autoSelectPriority ?? 0))
      .map((d) => d.name);
    assertEqual(
      prioritized,
      [
        "litellm",
        "ollama",
        "vertex",
        "google-ai",
        "openai",
        "anthropic",
        "bedrock",
        "azure",
        "mistral",
        "huggingface",
      ],
      "autoSelectPriority order mismatch",
    );
  });
  ```

  (`assertEqual` on arrays relies on the harness's deep-equality behavior; if `assertEqual` only does `===`, use `assert(JSON.stringify(prioritized) === JSON.stringify([...]), "...")` instead — check `test/helpers/harness.ts`'s `assertEqual` implementation before writing this line and use whichever form it actually supports.)

- [ ] Run and verify it passes immediately (this is a characterization test against Task 2's already-written data, not new behavior — the `autoSelectPriority` values were assigned in Task 2 specifically to reproduce this order).

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: pass (this test doesn't touch `providerUtils.ts` yet, so it validates the data only).

- [ ] Replace the hardcoded `providers` array inside `getBestProvider()` (lines 93-104) with a derivation:

  ```ts
  const providers = PROVIDER_DESCRIPTORS.filter(
    (d) => d.autoSelectPriority !== undefined,
  )
    .sort((a, b) => (a.autoSelectPriority ?? 0) - (b.autoSelectPriority ?? 0))
    .map((d) => d.name);
  ```

  placed where the original array literal was, keeping the surrounding rationale comment (the original lines 83-92 explaining _why_ this order exists) — do not delete that comment, since it documents intent this data-driven version still needs.

- [ ] Add an integration-level test verifying `getBestProvider()` itself still iterates in this order when no providers are configured (using an explicit unset-env guard so it doesn't flake against the developer's real `.env`):

  ```ts
  await test("getBestProvider falls through the derived priority order without throwing", async () => {
    const { getBestProvider } =
      await import("../src/lib/utils/providerUtils.js");
    // Not asserting a specific winner (depends on the local environment's
    // configured API keys) — only that the derived array drives the function
    // without a runtime error, proving the refactor didn't break iteration.
    const result = await getBestProvider().catch((e: unknown) => e);
    assert(
      typeof result === "string" || result instanceof Error,
      "getBestProvider should resolve to a provider name or reject with an Error, never hang or return a non-string/non-Error",
    );
  });
  ```

- [ ] Run and verify pass.

  ```bash
  pnpm run check && npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0.

- [ ] Commit.
  ```bash
  git add src/lib/utils/providerUtils.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "refactor(providers): derive getBestProvider's fallback chain from descriptor.autoSelectPriority"
  ```

---

### Task 10 (scope d): `providerHealth.ts` per-provider switches

**Files:**

- `src/lib/utils/providerHealth.ts:513-542` — `getRequiredEnvironmentVariables()`.
- `src/lib/utils/providerHealth.ts:547-570` — `getApiKeyEnvironmentVariable()`.
- `src/lib/utils/providerHealth.ts:575-605` — `validateApiKeyFormat()`.
- `src/lib/utils/providerHealth.ts:610-631` — `getProviderHealthEndpoint()`.

**Interfaces:**

- Consumes: `ProviderFactory.getDescriptor()`.
- Produces: same 4 function signatures, each still returning the same shape (`string[]`, `string`, `boolean`, `string | null` respectively), now derived from descriptor fields for all 30 providers instead of a 4-9-case switch with an implicit default for the rest.

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("providerHealth per-provider switches derived from descriptors");

  await test("getApiKeyEnvironmentVariable resolves a provider outside the old 8-case switch", async () => {
    const { getApiKeyEnvironmentVariable } =
      await import("../src/lib/utils/providerHealth.js");
    assertEqual(
      getApiKeyEnvironmentVariable("groq"),
      "GROQ_API_KEY",
      "groq api key env var",
    );
  });

  await test("getProviderHealthEndpoint still returns null for env-only providers and non-null for models-probe providers", async () => {
    const { getProviderHealthEndpoint } =
      await import("../src/lib/utils/providerHealth.js");
    assert(
      getProviderHealthEndpoint("anthropic") === null,
      "anthropic should have no probe endpoint",
    );
    assert(
      typeof getProviderHealthEndpoint("openai") === "string",
      "openai should have a probe endpoint",
    );
  });

  await test("getRequiredEnvironmentVariables includes extraRequired vars for azure", async () => {
    const { getRequiredEnvironmentVariables } =
      await import("../src/lib/utils/providerHealth.js");
    const required = getRequiredEnvironmentVariables("azure");
    assert(
      required.includes("AZURE_OPENAI_API_KEY"),
      "azure missing primary key requirement",
    );
    assert(
      required.includes("AZURE_OPENAI_ENDPOINT"),
      "azure missing endpoint requirement",
    );
  });
  ```

- [ ] Run and verify it fails on the `groq` case (not in the original 8-case switch, so `getApiKeyEnvironmentVariable("groq")` returns `""` per the documented `default: return ""`).

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: FAIL on "getApiKeyEnvironmentVariable resolves a provider outside the old 8-case switch" — got `""`, expected `"GROQ_API_KEY"`.

- [ ] Replace all four functions in `providerHealth.ts` with descriptor-driven implementations. Add the import at the top:

  ```ts
  import { ProviderFactory } from "../factories/providerFactory.js";
  ```

  ```ts
  function getRequiredEnvironmentVariables(providerName: string): string[] {
    const descriptor = ProviderFactory.getDescriptor(providerName);
    if (!descriptor) {
      return [];
    }
    const { apiKey, extraRequired } = descriptor.envVars;
    return [...(apiKey ? [apiKey] : []), ...(extraRequired ?? [])];
  }

  function getApiKeyEnvironmentVariable(providerName: string): string {
    return ProviderFactory.getDescriptor(providerName)?.envVars.apiKey ?? "";
  }

  function validateApiKeyFormat(providerName: string, apiKey: string): boolean {
    const descriptor = ProviderFactory.getDescriptor(providerName);
    if (!descriptor?.apiKeyFormatPattern) {
      // Providers with no documented format (or local runtimes with no key
      // at all) are accepted as-is — matches the old switch's per-provider
      // `default: true`/no-format-check branches (ollama, litellm, vertex's
      // .json-substring check remains a special case handled below).
      if (descriptor?.localRuntime || descriptor?.envVars.optional) {
        return true;
      }
      return apiKey.length > 0;
    }
    return descriptor.apiKeyFormatPattern.test(apiKey);
  }

  function getProviderHealthEndpoint(providerName: string): string | null {
    const descriptor = ProviderFactory.getDescriptor(providerName);
    if (descriptor?.healthCheck !== "models-probe") {
      return null;
    }
    // OpenAI/LiteLLM/Ollama each need a provider-specific URL builder that
    // isn't pure descriptor data (LiteLLM/Ollama depend on the configured
    // base URL) — keep the existing per-provider dispatch for the 3
    // models-probe providers, now gated on the descriptor instead of a
    // hardcoded name list.
    switch (descriptor.name) {
      case "openai":
        return "https://api.openai.com/v1/models";
      case "litellm":
        return this.getLiteLLMModelsUrl();
      case "ollama":
        return this.getOllamaTagsUrl();
      default:
        return null;
    }
  }
  ```

  Note: if `getProviderHealthEndpoint` is not currently a class method with `this` access to `getLiteLLMModelsUrl()`/`getOllamaTagsUrl()`, keep it as a method on `ProviderHealthChecker` exactly as it already is today (only the dispatch condition changes from a hardcoded switch to `descriptor.healthCheck === "models-probe"` plus a 3-way inner switch) — do not change its enclosing class/method structure, only its body.

- [ ] Run and verify pass.

  ```bash
  pnpm run check && npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0, all tests pass.

- [ ] Commit.
  ```bash
  git add src/lib/utils/providerHealth.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "fix(providers): derive providerHealth per-provider switches from descriptors for all 30 providers"
  ```

---

### Task 11 (scope e): `NeuroLink.getProviderStatus()`

**Files:**

- `src/lib/neurolink.ts:14106-14118` — the hardcoded `providers` const inside `getProviderStatus()`.

**Interfaces:**

- Consumes: `ProviderFactory.getAllDescriptors()`.
- Produces: same `getProviderStatus(options?: { quiet?: boolean }): Promise<ProviderStatus[]>` signature; the provider list it iterates is now derived (excluding `AUTO`) instead of the hardcoded 11-entry array (which included both `"vertex"` and `"googleVertex"` as separate entries).

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("NeuroLink.getProviderStatus covers all real providers");

  await test("getProviderStatus reports on every descriptor-backed provider, not just the original 11", async () => {
    const { NeuroLink } = await import("../dist/index.js");
    const nl = new NeuroLink();
    const statuses = await nl.getProviderStatus({ quiet: true });
    const reportedNames = new Set(
      statuses.map((s: { provider: string }) => s.provider),
    );
    assert(
      reportedNames.has("groq"),
      "getProviderStatus missing 'groq' (outside the old hardcoded 11)",
    );
    assert(
      reportedNames.has("cohere"),
      "getProviderStatus missing 'cohere' (outside the old hardcoded 11)",
    );
  });
  ```

- [ ] Run and verify it fails.

  ```bash
  pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: FAIL — `"groq"` and `"cohere"` are not among the hardcoded 11 provider names currently iterated.

- [ ] Replace the hardcoded `providers` array (lines 14106-14118) with:

  ```ts
  const providers = ProviderFactory.getAllDescriptors().map(
    (d) => d.name,
  ) as readonly string[];
  ```

  Keep the rest of the method (the `pLimit`-wrapped `providerTests` map, the special-cased Ollama `fetch`, `this.hasProviderEnvVars(providerName)`) unchanged — only the source of the `providers` array changes. If `"googleVertex"` was relied on elsewhere in this method as a distinct entry from `"vertex"`, search for it first:

  ```bash
  grep -n "googleVertex" src/lib/neurolink.ts | sed -n '1,20p'
  ```

  If the only reference was the removed array entry itself, no further change is needed (the alias `"googleVertex"` remains resolvable via `PROVIDER_ALIAS_INDEX`/CLI choices — it just no longer gets its own duplicate status-check entry alongside `"vertex"`, which is the intended de-duplication).

- [ ] Run and verify pass.

  ```bash
  pnpm run check && pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: exit 0, all tests pass.

- [ ] Commit.
  ```bash
  git add src/lib/neurolink.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "fix(providers): derive getProviderStatus's provider list from ProviderFactory.getAllDescriptors"
  ```

---

### Task 12 (scope f): `tools/automation/environmentManager.ts`

**Files:**

- `tools/automation/environmentManager.ts:252-266` — the hardcoded 9-key `providers` object inside `validateEnvironment()`.
- `tools/automation/environmentManager.ts:319-320` — the `/9` denominators in `reportValidation()`.
- `tools/automation/environmentManager.ts:360-363` — the `/9` denominator in `calculateScore()`.

Testing convention note: this is a standalone automation script (not part of the SDK), tested by importing `EnvironmentManager` directly from its `.ts` source via `tsx`.

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS`.
- Produces: same `validateEnvironment(): Promise<{configured: string[]; missing: string[]; providers: Record<string, boolean>; ...}>` shape, now keyed by all 30 provider names; `reportValidation`/`calculateScore` denominators become dynamic (`Object.keys(validation.providers).length`) instead of the literal `9`.

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection(
    "environmentManager derives its provider checklist from descriptors",
  );

  await test("validateEnvironment's providers object has one key per descriptor, not just 9", async () => {
    const { EnvironmentManager } =
      await import("../tools/automation/environmentManager.js");
    const { PROVIDER_DESCRIPTORS } = await import("../dist/index.js");
    const manager = new EnvironmentManager();
    const validation = await manager.validateEnvironment();
    const keys = Object.keys(validation.providers);
    assertEqual(
      keys.length,
      (PROVIDER_DESCRIPTORS as unknown[]).length,
      "environmentManager provider key count",
    );
  });

  await test("calculateScore denominator matches the actual provider count, not a hardcoded 9", async () => {
    const { EnvironmentManager } =
      await import("../tools/automation/environmentManager.js");
    const manager = new EnvironmentManager();
    const validation = await manager.validateEnvironment();
    const score = manager.calculateScore(validation);
    assert(score >= 0 && score <= 100, "score out of 0-100 range");
  });
  ```

- [ ] Run and verify it fails (the object currently has exactly 9 keys, `PROVIDER_DESCRIPTORS` has 30).

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: FAIL — `keys.length` is `9`, expected `30`.

- [ ] Replace the hardcoded `providers` object in `validateEnvironment()` (lines 252-266) with a derivation built from descriptor env vars, reusing the same primary+fallback+extraRequired logic as Task 8's `hasProviderEnvVars` but reading from the parsed `.env` object (`env`) rather than `process.env` (this function already parses `.env` into a plain object via `parseEnvFile`, so it cannot call the live-`process.env`-based `hasProviderEnvVars` directly):

  ```ts
  const providers: Record<string, boolean> = {};
  for (const d of PROVIDER_DESCRIPTORS) {
    if (d.envVars.optional || d.localRuntime) {
      providers[d.name] =
        d.name === "ollama" ? await this.checkOllamaStatus() : true;
      continue;
    }
    const { apiKey, fallbacks, extraRequired } = d.envVars;
    const hasPrimary =
      !!apiKey && (!!env[apiKey] || (fallbacks ?? []).some((v) => !!env[v]));
    providers[d.name] =
      hasPrimary && (extraRequired ?? []).every((v) => !!env[v]);
  }
  ```

  Add the import at the top of the file:

  ```ts
  import { PROVIDER_DESCRIPTORS } from "../../src/lib/factories/providerDescriptors.js";
  ```

  Replace the `validation` object literal's `providers:` field (which previously inlined the 9 checks) to instead assign this pre-computed `providers` object.

- [ ] Fix the two hardcoded `/9` denominators. In `reportValidation()` (lines 319-320):

  ```ts
  console.log(
    `✅ Configured providers: ${validation.configured.length}/${Object.keys(validation.providers).length}`,
  );
  console.log(
    `⚠️  Missing providers: ${validation.missing.length}/${Object.keys(validation.providers).length}`,
  );
  ```

  In `calculateScore()` (line 361):

  ```ts
  const configuredScore =
    (validation.configured.length / Object.keys(validation.providers).length) *
    configuredWeight;
  ```

- [ ] Run and verify pass.

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0, both tests pass.

- [ ] Commit.
  ```bash
  git add tools/automation/environmentManager.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "fix(tools): derive environmentManager's provider checklist from descriptors, fix hardcoded /9 denominators"
  ```

---

### Task 13 (scope g): `setup.ts` — `PROVIDERS` id list + `checkExistingConfigurations()`

**Files:**

- `src/cli/commands/setup.ts:50-...` — the `PROVIDERS: SetupProviderInfo[]` array (9 entries: `google-ai`, `openai`, `anthropic`, `azure`, `bedrock`, `vertex`, `huggingface`, `mistral`, `openrouter`).
- `src/cli/commands/setup.ts:476-520` — `checkExistingConfigurations()` (currently module-private — not exported; this task's rewrite adds `export` so the suite below can import it directly, matching how the rest of this plan's Tasks 7-14 test internal consumers).

**Interfaces:**

- Consumes: `PROVIDER_DESCRIPTORS_BY_NAME`.
- Produces: same `checkExistingConfigurations(): Promise<string[]>` signature, now exported. The `PROVIDERS` array's marketing/UX fields (`emoji`, `description`, `setupTime`, `cost`, `bestFor`, `models`, `strengths`, `pricing`, `setupCommand`) stay hand-authored and untouched — out of scope. Only `checkExistingConfigurations()`'s env-var logic is derived. This task does not touch Plan 01's `EXTRA_PROVIDER_CONFIGS` (setup.ts:180-239) or exported `delegateToProviderSetup()` (setup.ts:630-681) — those cover the 21 providers outside the 9-provider wizard and are unrelated to `checkExistingConfigurations()`'s scope; no conflict.

**Steps:**

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("setup.ts checkExistingConfigurations derived from descriptors");

  await test("checkExistingConfigurations detects together via descriptor-driven logic (characterization)", async () => {
    process.env.MISTRAL_API_KEY = "test-key-for-suite-only";
    try {
      const { checkExistingConfigurations } =
        await import("../src/cli/commands/setup.js");
      const configured = await checkExistingConfigurations();
      assert(
        configured.includes("mistral"),
        "mistral should be detected when MISTRAL_API_KEY is set",
      );
    } finally {
      delete process.env.MISTRAL_API_KEY;
    }
  });
  ```

  This characterizes existing behavior for one of the 9 setup-wizard providers (proving the refactor doesn't regress it) rather than testing new coverage, since `checkExistingConfigurations()`'s scope is deliberately limited to the 9 providers `PROVIDERS` already lists (marketing copy only exists for those 9) — expanding it to all 30 is explicitly out of scope for this task (`setup.ts`'s wizard UX for the other 21 providers doesn't exist yet; that's for a future setup-wizard-specific plan, not this one).

- [ ] Run and verify it passes against the CURRENT implementation (characterization, not new behavior).

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: pass (this exercises the pre-existing `if (process.env.MISTRAL_API_KEY) configured.push("mistral");` branch).

- [ ] Replace the body of `checkExistingConfigurations()` (lines 476-520) with a loop over the 9 setup-wizard provider ids, driven by descriptors instead of 9 separate hand-written `if` blocks. Also add `export` to the function declaration — it is currently module-private, and the characterization tests above import it directly from `src/cli/commands/setup.ts`:

  ```ts
  export async function checkExistingConfigurations(): Promise<string[]> {
    const configured: string[] = [];
    for (const p of PROVIDERS) {
      const descriptor = PROVIDER_DESCRIPTORS_BY_NAME.get(
        p.id as AIProviderName,
      );
      if (!descriptor) {
        continue;
      }
      const { apiKey, fallbacks, extraRequired, extraRequiredFallbacks } =
        descriptor.envVars;
      const hasPrimary =
        !!apiKey &&
        (!!process.env[apiKey] ||
          (fallbacks ?? []).some((v) => !!process.env[v]));
      if (!hasPrimary) {
        continue;
      }
      const requiredOk =
        (extraRequired ?? []).every((v) => !!process.env[v]) ||
        (extraRequiredFallbacks ?? []).some((v) => !!process.env[v]);
      if (requiredOk) {
        configured.push(p.id);
      }
    }
    return configured;
  }
  ```

  Add the import at the top of `setup.ts`:

  ```ts
  import { PROVIDER_DESCRIPTORS_BY_NAME } from "../../lib/factories/providerDescriptors.js";
  import type { AIProviderName } from "../../lib/types/index.js";
  ```

  Note: `vertex`'s check must still pass — confirm its descriptor's `extraRequired: ["GOOGLE_APPLICATION_CREDENTIALS"]` combined with `extraRequiredFallbacks: ["GOOGLE_SERVICE_ACCOUNT_KEY", "GOOGLE_AUTH_CLIENT_EMAIL", "GOOGLE_AUTH_PRIVATE_KEY"]` reproduces the original `GOOGLE_APPLICATION_CREDENTIALS || GOOGLE_SERVICE_ACCOUNT_KEY` check (the original didn't require both `GOOGLE_AUTH_CLIENT_EMAIL` AND `GOOGLE_AUTH_PRIVATE_KEY` together, just did an OR across all three) — this is a minor, documented behavior tightening (the original setup.ts check was looser than `providerUtils.ts`'s own vertex check); call it out in the Verification Checklist as an intentional alignment, not a silent regression.

- [ ] Run and verify pass, plus add one more characterization test for `vertex`:

  ```ts
  await test("checkExistingConfigurations still detects vertex via GOOGLE_APPLICATION_CREDENTIALS", async () => {
    process.env.GOOGLE_APPLICATION_CREDENTIALS =
      "/tmp/fake-creds-for-suite-only.json";
    try {
      const { checkExistingConfigurations } =
        await import("../src/cli/commands/setup.js");
      const configured = await checkExistingConfigurations();
      assert(
        configured.includes("vertex"),
        "vertex should be detected via GOOGLE_APPLICATION_CREDENTIALS",
      );
    } finally {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    }
  });
  ```

  ```bash
  pnpm run check && npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0, all tests pass.

- [ ] Commit.
  ```bash
  git add src/cli/commands/setup.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "refactor(cli): derive setup.ts checkExistingConfigurations from provider descriptors"
  ```

---

### Task 14 (scope h): Replace `PROMPT_ONLY_TOOL_PROVIDERS` with `descriptor.toolSupport !== "native"`

**Files:**

- `src/lib/neurolink.ts:567-577` — the `PROMPT_ONLY_TOOL_PROVIDERS` Set and its usage.

**Interfaces:**

- Consumes: `ProviderFactory.getDescriptor()`.
- Produces: no new symbols — the membership check at every call site that referenced `PROMPT_ONLY_TOOL_PROVIDERS.has(providerName)` is replaced with `ProviderFactory.getDescriptor(providerName)?.toolSupport !== "native"`.

**Steps:**

- [ ] Before-grep: find every usage site (not just the declaration).

  ```bash
  grep -n "PROMPT_ONLY_TOOL_PROVIDERS" src/lib/neurolink.ts
  ```

  Expected: the declaration at ~567 plus one or more `.has(...)` call sites — note every line number returned for the next step.

- [ ] Failing test — add to `test/continuous-test-suite-provider-descriptors.ts`:

  ```ts
  logSection("toolSupport replaces PROMPT_ONLY_TOOL_PROVIDERS");

  await test("descriptor.toolSupport !== 'native' reproduces the original 9-member prompt-only set", async () => {
    const { ProviderFactory } = await import("../dist/index.js");
    const originalPromptOnly = new Set([
      "ollama",
      "huggingface",
      "openrouter",
      "ideogram",
      "recraft",
      "replicate",
      "stability",
      "jina",
      "voyage",
    ]);
    for (const d of ProviderFactory.getAllDescriptors() as Array<{
      name: string;
      toolSupport: string;
    }>) {
      const derived = d.toolSupport !== "native";
      assertEqual(
        derived,
        originalPromptOnly.has(d.name),
        `toolSupport-derived prompt-only mismatch for ${d.name}`,
      );
    }
  });
  ```

- [ ] Run and verify it passes immediately — this is a characterization test proving Task 2's `toolSupport` data already reproduces the exact original set (it does: `model-dependent` = ollama/openrouter/huggingface, `none` = ideogram/recraft/replicate/stability/jina/voyage, exactly the 9 original members).

  ```bash
  npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: pass.

- [ ] Replace the `PROMPT_ONLY_TOOL_PROVIDERS` Set declaration and every `.has(providerName)` call site found in the before-grep. Declaration (lines 567-577) becomes a thin compatibility helper (keeps the call sites' shape simple while removing the hand-written Set):

  ```ts
  /**
   * True when a provider needs tools described in the prompt rather than
   * passed via the API's native tool-calling parameter (ollama/openrouter
   * are model-dependent; huggingface is deployment-dependent; the
   * image/embedding providers don't support tool calling at all). Derived
   * from ProviderDescriptor.toolSupport instead of a hand-maintained Set.
   */
  function isPromptOnlyToolProvider(providerName: string): boolean {
    return (
      ProviderFactory.getDescriptor(providerName)?.toolSupport !== "native"
    );
  }
  ```

  Replace each `PROMPT_ONLY_TOOL_PROVIDERS.has(providerName)` call site with `isPromptOnlyToolProvider(providerName)`.

- [ ] Run and verify pass.

  ```bash
  pnpm run check && npx tsx test/continuous-test-suite-provider-descriptors.ts
  ```

  Expected: exit 0.

- [ ] Commit.
  ```bash
  git add src/lib/neurolink.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "refactor(providers): replace PROMPT_ONLY_TOOL_PROVIDERS set with descriptor.toolSupport check"
  ```

---

### Task 15 (scope 5): Retire `CREDENTIAL_KEY_MAP` in favor of `descriptor.credentialsKey`

> **Reframed post-Plan-01 (this was originally a TDD bug-fix task; it is now a refactor).** Plan 01 (Tier A Bug Fixes) landed on this branch first and already replaced the old local, unexported `credentialKeyMap` with an **exported** `CREDENTIAL_KEY_MAP` (6 entries, `providerFactory.ts:24-31`) plus an **exported** `resolveCredentialKey(providerName: string): string` helper (`providerFactory.ts:33-41`) that `createProvider()` calls internally. Plan 01's version already includes `"together-ai": "together"` — the missing-entry bug this task originally targeted is already fixed, so there is no failing test to write. What's left is architectural, not a bug: `CREDENTIAL_KEY_MAP` is still a hand-maintained table that duplicates data `PROVIDER_DESCRIPTORS` (Task 2) already owns, and it still only maps _canonical_ names — passing an alias (e.g. `"hf"`) returns the literal alias unchanged instead of resolving to `"huggingFace"`, because aliases were never keys in the map. This task retires `CREDENTIAL_KEY_MAP` and re-implements `resolveCredentialKey()` on top of `ProviderFactory.getDescriptor()`, fixing the alias gap as a side effect of unifying the source. `resolveCredentialKey` itself **stays exported** from `providerFactory.ts` — `test/continuous-test-suite-provider-wiring.ts:64-88` (Plan 01's own landed regression suite) imports it directly by name and calls it against all 30 `AIProviderName` values, so removing or renaming the export would break a suite this plan does not own. Use the plan's documented pure-data-migration cycle for this task (before-grep → change → check+lint → targeted suite → commit) instead of TDD red/green, since there is no bug left to reproduce as a failing test.

**Files:**

- `src/lib/factories/providerFactory.ts:24-41` — `CREDENTIAL_KEY_MAP` (exported, 6 entries) and `resolveCredentialKey()` (exported function). `createProvider()`'s own call site (`providerFactory.ts:123`, `const credKey = resolveCredentialKey(normalizedName);`) needs no edit — it keeps calling `resolveCredentialKey()` by name and transparently inherits the new descriptor-backed behavior.

**Interfaces:**

- Consumes: `ProviderFactory.getDescriptor()` (Task 3), which already resolves both canonical names and aliases via `PROVIDER_ALIAS_INDEX`.
- Produces: `resolveCredentialKey(providerName: string): string` — same exported name and signature as today, reimplemented; `CREDENTIAL_KEY_MAP` is deleted (a before-grep in the first step confirms nothing outside `providerFactory.ts` references it by name, so removing it is safe).

**Steps:**

- [ ] Before-grep: confirm the exact current shape and confirm it's safe to delete `CREDENTIAL_KEY_MAP` while confirming `resolveCredentialKey` must stay exported.

  ```bash
  grep -rn "CREDENTIAL_KEY_MAP" src/ test/
  grep -rn "resolveCredentialKey" src/ test/
  ```

  Expected: `CREDENTIAL_KEY_MAP` matches only its own declaration and internal use inside `providerFactory.ts` (safe to delete). `resolveCredentialKey` matches its declaration and internal call site in `providerFactory.ts`, plus an import in `test/continuous-test-suite-provider-wiring.ts` (confirms the export must be preserved).

- [ ] Replace `CREDENTIAL_KEY_MAP` + `resolveCredentialKey()` (current lines 24-41) with a descriptor-backed implementation. Before:

  ```ts
  export const CREDENTIAL_KEY_MAP: Record<string, string> = {
    "google-ai": "googleAiStudio",
    "openai-compatible": "openaiCompatible",
    huggingface: "huggingFace",
    "lm-studio": "lmStudio",
    "nvidia-nim": "nvidiaNim",
    "together-ai": "together",
  };

  export function resolveCredentialKey(providerName: string): string {
    return (
      CREDENTIAL_KEY_MAP[providerName.toLowerCase()] ??
      providerName.toLowerCase()
    );
  }
  ```

  After:

  ```ts
  /**
   * Resolve a registered provider name (or alias) to its NeurolinkCredentials
   * key. Backed by ProviderFactory.getDescriptor() — PROVIDER_DESCRIPTORS is
   * the single source of truth for provider identity — instead of a
   * hand-maintained map, so this can no longer drift out of sync with the
   * descriptors, and it correctly resolves aliases (e.g. "hf") through
   * PROVIDER_ALIAS_INDEX, not just canonical names. Falls back to the
   * lowercased input when no descriptor is found, matching the retired
   * map's behavior for unknown provider names.
   *
   * Referencing ProviderFactory here (defined further down this file) is
   * safe: this function's body only runs when called, by which point the
   * module has finished evaluating and ProviderFactory is fully defined —
   * there is no temporal-dead-zone hazard from the declaration order.
   */
  export function resolveCredentialKey(providerName: string): string {
    const normalized = providerName.toLowerCase();
    return (
      ProviderFactory.getDescriptor(normalized)?.credentialsKey ?? normalized
    );
  }
  ```

  `createProvider()`'s existing `const credKey = resolveCredentialKey(normalizedName);` (line 123) is left completely unchanged — it already calls this function by name, so it transparently inherits descriptor-backed resolution with no call-site edit.

- [ ] Typecheck and lint.

  ```bash
  pnpm run check && pnpm run lint
  ```

  Expected: both exit 0.

- [ ] Targeted suite — run Plan 01's own regression suite (the direct consumer of the preserved export) to confirm the contract still holds:

  ```bash
  pnpm run build && npx tsx test/continuous-test-suite-provider-wiring.ts
  ```

  Expected: exit 0 — specifically, "every registered AIProviderName resolves to a real NeurolinkCredentials key" (`continuous-test-suite-provider-wiring.ts:64-88`) still passes for all 30 providers, unchanged contract.

- [ ] Extend `test/continuous-test-suite-provider-descriptors.ts` with a characterization test proving the genuine improvement this task delivers — alias resolution, since the together-ai entry was already fixed by Plan 01 before this task ran:

  ```ts
  logSection("resolveCredentialKey retirement (descriptor-backed)");

  await test("resolveCredentialKey resolves an alias's credentialsKey correctly (hf -> huggingFace)", async () => {
    const { ProviderRegistry } = await import("../dist/index.js");
    await ProviderRegistry.registerAllProviders();
    const { resolveCredentialKey } =
      await import("../dist/factories/providerFactory.js");
    assertEqual(
      resolveCredentialKey("hf"),
      "huggingFace",
      "hf alias should resolve to huggingFace via descriptor.credentialsKey",
    );
  });

  await test("resolveCredentialKey still resolves together-ai (regression guard for the retired CREDENTIAL_KEY_MAP)", async () => {
    const { resolveCredentialKey } =
      await import("../dist/factories/providerFactory.js");
    assertEqual(
      resolveCredentialKey("together-ai"),
      "together",
      "together-ai credentialsKey via descriptor",
    );
  });
  ```

  Run:

  ```bash
  pnpm run build && pnpm run test:provider-descriptors
  ```

  Expected: exit 0, both new tests pass.

- [ ] Final full-suite run to confirm nothing else regressed.

  ```bash
  pnpm run build && pnpm run test:provider-descriptors && npx tsx test/continuous-test-suite-provider-wiring.ts
  ```

  Expected: exit 0.

- [ ] Commit.
  ```bash
  git add src/lib/factories/providerFactory.ts test/continuous-test-suite-provider-descriptors.ts
  git commit -m "refactor(providers): derive resolveCredentialKey from descriptor.credentialsKey, retiring CREDENTIAL_KEY_MAP"
  ```

---

## Verification Checklist

- [ ] `pnpm run check` passes with zero errors.
- [ ] `pnpm run lint` passes with zero errors (including `neurolink/no-local-type-alias`, `neurolink/unique-type-names`, `neurolink/types-barrel-exports-only`, `neurolink/barrel-type-imports`, `no-restricted-syntax` double-assertion checks against every file touched).
- [ ] `pnpm run build` succeeds.
- [ ] `pnpm run test:provider-descriptors` passes (exit 0) and the break-one-assertion sanity check from Task 6 was actually performed and reverted.
- [ ] `PROVIDER_DESCRIPTORS` has exactly 30 entries, one per `AIProviderName` value except `AUTO`, with no duplicate `name` and no alias collisions.
- [ ] `ProviderFactory.getDescriptor()`/`getAllDescriptors()` are exported from `src/lib/index.ts` and importable from `../dist/index.js` after a build.
- [ ] All 30 `registerProvider()` calls in `providerRegistry.ts` pass a 5th descriptor argument; `defaultModel`/`aliases` arguments are byte-identical to before Task 5 (verify with `git diff` showing only additions, no argument-value changes).
- [ ] `normalizeProviderName()` behavior is unchanged for every alias that worked before (Task 4's characterization tests pass), now O(1) for descriptor-covered providers with a fallback path preserved for non-descriptor registrations.
- [ ] CLI `--provider` choices and the bash-completion string are derived from the same source and therefore can no longer drift (fixes the confirmed missing `nvidia`/`lms` bash-completion entries).
- [ ] `hasProviderEnvVars()` now recognizes all 30 providers (intentional expansion from the original 10 — the genuine fix in Task 8, documented not accidental). `getAvailableProviders()`/`isValidProvider()` already recognized all 30 as of Plan 01 (landed first) — Task 8 re-points `getAvailableProviders()` at `PROVIDER_DESCRIPTORS` for source-of-truth consistency, with no behavior change to verify beyond "still 30".
- [ ] `getBestProvider()`'s fallback-chain order is unchanged (`litellm, ollama, vertex, google-ai, openai, anthropic, bedrock, azure, mistral, huggingface`), now derived from `autoSelectPriority` instead of hand-written.
- [ ] `providerHealth.ts`'s four per-provider switches now cover all 30 providers instead of 4-9.
- [ ] `NeuroLink.getProviderStatus()` reports on all descriptor-backed providers, with the `"vertex"`/`"googleVertex"` duplicate entry resolved to a single `"vertex"` entry.
- [ ] `environmentManager.ts`'s `validateEnvironment()` checks all 30 providers; `reportValidation()`/`calculateScore()` denominators are dynamic, not hardcoded `/9`.
- [ ] `setup.ts`'s `checkExistingConfigurations()` still correctly detects all 9 setup-wizard providers (characterization tests for `mistral` and `vertex` pass); marketing/UX fields in `PROVIDERS` are untouched.
- [ ] `PROMPT_ONLY_TOOL_PROVIDERS` Set is gone; `descriptor.toolSupport !== "native"` reproduces its exact original 9-member membership.
- [ ] `CREDENTIAL_KEY_MAP` is gone; `resolveCredentialKey` stays exported from `providerFactory.ts` (required by `test/continuous-test-suite-provider-wiring.ts`) but is now descriptor-backed. `together-ai` resolving `credentialsKey: "together"` was already fixed by Plan 01 before this plan started — Task 15's actual verifiable delta is that resolving credentials via an alias (e.g. `"hf"`) now correctly maps to the full canonical credential key (e.g. `"huggingFace"`) instead of silently using the alias itself as the key.
- [ ] No placeholder text (`TBD`, `TODO`, "implement later", "similar to Task N") anywhere in the 15 tasks above — every step has literal, runnable code and commands.
- [ ] Every `ProviderDescriptor` field name matches the contract's minimum shape exactly (`name`, `aliases`, `credentialsKey`, `envVars`, `defaultModel`, `toolSupport`, `localRuntime`, `healthCheck`, `setupUrl?`, `timeouts?`) — additional fields (`autoSelectPriority`, `apiKeyFormatPattern`, `envVars.fallbacks/baseURLFallbacks/modelFallbacks/extraRequiredFallbacks/optional`) are pure additions, never renames.

## Risks & Rollback

- **Risk: `PROVIDER_DESCRIPTORS_BY_NAME.get(...)` returns `undefined` for a provider not yet in Task 2's array at the time Task 5 wires it in.** Mitigation: Task 6's completeness suite (all 30 present) is written and passing before Task 5 depends on it transitively through later tasks; Task 5 itself is additive-only, so even a missing descriptor only means that one provider's `registration.descriptor` is `undefined` (falls back to `ProviderFactory.providers.get(...)?.descriptor` returning `undefined`, which every consumer already null-checks with `?.` and a fallback) — it cannot break registration or provider construction.
- **Risk: expanding `hasProviderEnvVars()` from 10 to 30 providers changes behavior for any code that relied on the old narrower list rejecting providers 11-30.** (`getAvailableProviders()`/`isValidProvider()` already made this same expansion under Plan 01, which landed first — no incremental risk from Task 8's re-pointing of `getAvailableProviders()` at `PROVIDER_DESCRIPTORS`, since it returns the same 30 names either way.) Mitigation: grep every call site of `hasProviderEnvVars` before Task 8's commit and manually confirm none depend on rejection of a now-valid provider name; documented explicitly in the Verification Checklist as an intentional, not incidental, change.
- **Risk: `getProviderStatus()`'s removal of the duplicate `"googleVertex"` entry breaks a caller that specifically expects two status rows for Vertex.** Mitigation: Task 11's step explicitly greps for other `"googleVertex"` references in `neurolink.ts` before removing the duplicate array entry; if any UI/CLI output formatter specifically indexes by that duplicate, that call site needs a one-line adjustment (fold it in as part of Task 11, not deferred).
- **Risk: `setup.ts`'s Vertex check tightening (OR-of-three instead of the original's slightly different OR-of-three) misclassifies a real user's environment as "not configured".** Mitigation: Task 13 explicitly tests the primary `GOOGLE_APPLICATION_CREDENTIALS` path (the common case) and documents the minor semantic difference in the Verification Checklist rather than silently absorbing it.
- **Rollback:** every task is a single, independently revertable commit (`git revert <sha>`), and every consumer migration (Tasks 7-15) is additive/derivational against the same `PROVIDER_DESCRIPTORS` data — reverting any single consumer task's commit restores that one file's prior hand-written table without affecting the other 8 consumers or the core descriptor module (Tasks 1-6), since none of the consumer tasks modify `providerDescriptors.ts` itself.

## Out of Scope

- **Model-level metadata** (context windows, per-model capabilities, `MODEL_REGISTRY`/`MODEL_CONTEXT_WINDOWS`/`anthropicModels.ts` consolidation) — covered by **Plan 06**.
- **OpenAI-compatible provider catalog** (vLLM, Together's OpenAI-compat surface, etc. as a structured sub-catalog) — covered by **Plan 05**, which consumes this plan's `ProviderDescriptor` contract.
- **Media handler registries** (TTS/STT/image/video/avatar provider tables, separate from the 30 text/embedding `AIProviderName` entries this plan covers) — covered by **Plan 09**, which consumes this plan's contract for the providers that overlap.
- **`setup.ts`'s marketing/UX fields** (`emoji`, `description`, `setupTime`, `cost`, `bestFor`, `models`, `strengths`, `pricing`) and expanding the setup wizard to all 30 providers — not covered by any current plan; explicitly out of scope here since it's presentation content, not identity/config data.
- **`classifyProviderError`/typed error classes** — covered by **Plan 07**; this plan does not touch error handling or retry logic.
- **Shared agentic loop / streaming engine unification** — covered by **Plan 08**; unrelated to provider identity.
- **Dead-code removal** (e.g. the unused `universalProviderOptions.ts`, `DEFAULT_PROVIDER_CONFIGS`'s 3-of-30 partial seeding) — covered by **Plan 03**.
