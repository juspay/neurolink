/**
 * Provider capability matrix — the single source of truth for what each of
 * NeuroLink's providers supports. Used by the matrix test runner and any
 * suite that needs to skip a test based on provider capability.
 *
 * The 9 Tier-2 catalog providers (cerebras, cloudflare, fireworks, groq,
 * mistral, perplexity, sambanova, together-ai, xai) are NOT hand-written
 * here — their rows are derived below from the built provider catalog
 * (`dist/providers/catalog/`), so onboarding a future catalog provider adds
 * zero lines to this file. Rule-15 exception (allow-listed in
 * eslint.config.js): the rows are an exact enumeration of the built catalog
 * data — determinism no live call can give — and the deep dist import keeps
 * this helper on the same module graph as the dist-importing suites. Adding a new NON-catalog provider still means:
 *   1. Add an entry below
 *   2. Set capability flags (default `false` to be safe — explicitly opt-in)
 *   3. Set the `defaultModel` (the smallest/cheapest reasonable choice)
 *   4. Set the `envVars` array — every var must be set for the provider to be
 *      considered "available" (drives `hasProviderEnv()` checks)
 *
 * Capability flag semantics:
 *   - `text`                       — supports basic text generation
 *   - `streaming`                  — supports streaming via stream()
 *   - `tools`                      — supports tool/function calling
 *   - `toolsWithStreaming`         — tool calls work mid-stream
 *   - `structuredOutput`           — Zod / JSON schema responses
 *   - `structuredOutputWithTools`  — both at once (Gemini = false; CLAUDE.md
 *                                     rule 3 — Vertex/AI-Studio cannot mix)
 *   - `vision`                     — image input
 *   - `embeddings`                 — embed() / embedMany()
 *   - `thinking`                   — extended-thinking / reasoning levels
 *   - `imageGeneration`            — image OUT (Vertex Imagen, OpenAI DALL-E)
 *   - `videoGeneration`            — video OUT (Vertex Veo only at present)
 *   - `tts`                        — text-to-speech (Google Cloud TTS only)
 */

export type Capabilities = {
  text: boolean;
  streaming: boolean;
  tools: boolean;
  toolsWithStreaming: boolean;
  structuredOutput: boolean;
  structuredOutputWithTools: boolean;
  vision: boolean;
  embeddings: boolean;
  thinking: boolean;
  imageGeneration: boolean;
  videoGeneration: boolean;
  tts: boolean;
};

export type ProviderEntry = Capabilities & {
  /** AIProviderName enum value (kebab-case for "google-ai", "openai-compatible"). */
  name: string;
  /** Smallest/cheapest model name to use as default in tests. */
  defaultModel: string;
  /**
   * Optional dedicated embedding model. Most providers ship an embedding model
   * that is *different* from their text-generation model — passing the chat
   * model to `embed()` returns "model does not support embedContent" errors.
   * If unset, the matrix falls back to `defaultModel`.
   */
  embeddingModel?: string;
  /**
   * Vision-capable model for the matrix's vision test, for providers whose
   * defaultModel is text-only. If unset, the vision test uses defaultModel.
   */
  visionModel?: string;
  /** Env vars required to consider this provider available. */
  envVars: string[];
};

// ---------------------------------------------------------------------------
// Tier-2 catalog derivation — cerebras, cloudflare, fireworks, groq, mistral,
// perplexity, sambanova, together-ai, xai. Reads the BUILT catalog (dist),
// not src: continuous-test-suite-provider-matrix*.ts import PROVIDERS
// directly and drive it against dist-built providers, so this helper stays
// on the dist graph too (CLAUDE.md rule 15's "one module graph per suite").
//
// `catalogEnvVar` and `buildCatalogEntries` are imported from the same
// loader the runtime registry uses to construct these providers — not
// reimplemented — because nothing in this file re-asserts the convention
// (unlike the mocked suite, which tests the convention itself and must not
// share it with what it's testing).
import {
  CATALOG_JSON_ENTRIES,
  CATALOG_PROVIDER_IDS,
} from "../../dist/providers/catalog/index.generated.js";
import {
  catalogEnvVar,
  buildCatalogEntries,
} from "../../dist/providers/catalog/loader.js";

const computedBaseURLEnvVarById = new Map<string, string>();
for (const built of buildCatalogEntries()) {
  if (built.computedBaseURL) {
    computedBaseURLEnvVarById.set(
      built.providerName,
      built.computedBaseURL.envVar,
    );
  }
}

/**
 * True when the provider has any vision-capable model, and which model to
 * use for vision tests. Default model order for the "which model" question:
 *   1. models.visionModel, when the JSON sets it explicitly (SambaNova —
 *      the live-verified vision model, since its default model is not the
 *      first vision:true entry in the file).
 *   2. undefined, when the default model is itself vision-capable (Mistral)
 *      — the matrix vision test can just use defaultModel.
 *   3. the first vision:true model in catalog file order (Groq, xAI,
 *      Fireworks) — matches the pre-derivation hand-picked choices.
 */
function deriveVision(entry: (typeof CATALOG_JSON_ENTRIES)[number]): {
  vision: boolean;
  visionModel?: string;
} {
  const models = entry.models.catalog;
  const modelIds = Object.keys(models);
  const anyVisionTrue = modelIds.some((id) => models[id].vision);
  if (!anyVisionTrue) {
    return { vision: false };
  }
  // An explicit visionModel wins even when the default model is itself
  // vision-capable — the catalog contract gives the live-verified pick
  // priority, and checking the default first would silently ignore it.
  if (entry.models.visionModel !== undefined) {
    return { vision: true, visionModel: entry.models.visionModel };
  }
  if (models[entry.models.default]?.vision === true) {
    return { vision: true };
  }
  return {
    vision: true,
    visionModel: modelIds.find((id) => models[id].vision),
  };
}

const CATALOG_PROVIDERS: Record<string, ProviderEntry> = Object.fromEntries(
  CATALOG_JSON_ENTRIES.map((entry): [string, ProviderEntry] => {
    const { vision, visionModel } = deriveVision(entry);
    const extraEnvVar = computedBaseURLEnvVarById.get(entry.id);
    const providerEntry: ProviderEntry = {
      name: entry.id,
      // testModel is the live-verified matrix pin for providers whose
      // catalog default is retired upstream or gated off this account
      // (fireworks, groq) — the runtime default is untouched by it.
      defaultModel: entry.models.testModel ?? entry.models.default,
      ...(visionModel ? { visionModel } : {}),
      envVars: [
        catalogEnvVar(entry, "apiKey"),
        ...(extraEnvVar ? [extraEnvVar] : []),
      ],
      text: entry.capabilities.text,
      streaming: entry.capabilities.streaming,
      tools: entry.capabilities.tools,
      toolsWithStreaming: entry.capabilities.toolsWithStreaming,
      structuredOutput: entry.capabilities.structuredOutput,
      structuredOutputWithTools: entry.capabilities.structuredOutputWithTools,
      vision,
      embeddings: entry.capabilities.embeddings,
      thinking: entry.capabilities.thinking,
      // The JSON catalog schema carries no media-generation capability
      // field — every Tier-2 catalog provider is chat-completion only, so
      // this is always false. This flips together-ai's old hand-picked
      // imageGeneration:true (see task-8 report): no together-ai provider
      // class implements executeImageGeneration, so that was a dead claim —
      // the same class of bug as together-ai's old vision:true claim.
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    };
    return [entry.id, providerEntry];
  }),
);

/**
 * Provider entries indexed by AIProviderName string value.
 * Hand-written rows cover the non-catalog providers only; every catalog
 * provider's row is spread in from `CATALOG_PROVIDERS` after them, so a
 * future catalog JSON appears here (and in both matrix suites) with zero
 * edits to this file. Iteration order is hand rows first, then catalog
 * rows in catalog file order — order is not a contract anywhere.
 */
const PROVIDER_ROWS: Array<[string, ProviderEntry]> = [
  [
    "openai",
    {
      name: "openai",
      defaultModel: "gpt-4o-mini",
      embeddingModel: "text-embedding-3-small",
      envVars: ["OPENAI_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: true,
      embeddings: true,
      thinking: false,
      imageGeneration: true,
      videoGeneration: false,
      tts: true,
    },
  ],
  [
    "anthropic",
    {
      name: "anthropic",
      defaultModel: "claude-haiku-4-5",
      envVars: ["ANTHROPIC_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: true,
      embeddings: false,
      thinking: true,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "vertex",
    {
      name: "vertex",
      defaultModel: "gemini-2.5-flash",
      embeddingModel: "text-embedding-004",
      envVars: ["GOOGLE_VERTEX_PROJECT"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: false, // CLAUDE.md rule 3
      vision: true,
      embeddings: true,
      thinking: true,
      imageGeneration: true,
      videoGeneration: true, // Veo
      tts: false,
    },
  ],
  [
    "google-ai",
    {
      name: "google-ai",
      defaultModel: "gemini-2.5-flash",
      // Google AI Studio (the Generative Language API) doesn't expose
      // text-embedding-004 — it lives only on Vertex. The v1beta endpoint only
      // serves `gemini-embedding-001`/`gemini-embedding-2`, so we pin the
      // matrix to the smallest supported one.
      embeddingModel: "gemini-embedding-001",
      envVars: ["GOOGLE_AI_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: false, // CLAUDE.md rule 3
      vision: true,
      embeddings: true,
      thinking: true,
      imageGeneration: true,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "bedrock",
    {
      name: "bedrock",
      // claude-3-haiku-20240307 is the oldest on-demand Anthropic model on
      // Bedrock and is currently the only one available in every region
      // (including ap-south-1). Newer haiku/sonnet builds require pre-
      // provisioned cross-region inference profile ARNs, and large reasoning
      // models (Sonnet 4.6) can take >4 minutes per stream call which trips
      // the harness per-test timeout.
      //
      // BEDROCK_MATRIX_MODEL env var overrides this for testers whose region
      // exposes a newer cheap model. Intentionally NOT honoring the broader
      // BEDROCK_MODEL env var — that is typically set to a Sonnet-class
      // model for production agentic work, which is overkill (and far too
      // slow to stream) for capability matrix sweeps.
      defaultModel:
        process.env.BEDROCK_MATRIX_MODEL ||
        "anthropic.claude-3-haiku-20240307-v1:0",
      embeddingModel: "amazon.titan-embed-text-v2:0",
      envVars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: true,
      embeddings: true,
      thinking: true,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "azure",
    {
      name: "azure",
      // Azure deployment names are tenant-specific, so we honour
      // AZURE_OPENAI_MODEL if it is set (every other test in the repo respects
      // this env var) and only fall back to "gpt-4o-mini" when the env is
      // empty. The previous hard-coded "gpt-4o-mini" caused 404 "Resource not
      // found" on resources whose deployment is named differently.
      defaultModel: process.env.AZURE_OPENAI_MODEL || "gpt-4o-mini",
      envVars: ["AZURE_OPENAI_API_KEY", "AZURE_OPENAI_ENDPOINT"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: true,
      // Embeddings must be served by a deployment that points at an embedding
      // model (e.g. text-embedding-3-small). Most tenants don't expose that on
      // the same resource as their chat deployment, and the SDK currently does
      // not multiplex embed calls to a separate Azure resource — so we mark it
      // as not-supported here. This SKIPs the embed test for Azure rather than
      // FAILing with "embedding generation is not supported by the azure
      // provider", which was an unactionable error.
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "huggingface",
    {
      name: "huggingface",
      defaultModel: "meta-llama/Llama-3.1-8B-Instruct",
      envVars: ["HUGGINGFACE_API_KEY"],
      text: true,
      streaming: true,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "ollama",
    {
      name: "ollama",
      defaultModel: "llama3.2",
      envVars: ["OLLAMA_BASE_URL"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "openrouter",
    {
      name: "openrouter",
      // OpenRouter's free-tier catalog is unreliable: free models rotate,
      // get rate-limited upstream, or simply reject specific request shapes
      // (e.g. `liquid/lfm-2.5-1.2b-instruct:free` 400s on stream). We pin
      // the matrix to a cheap pay-as-you-go model that supports every
      // capability the matrix exercises — generate, stream, tool calling,
      // and structured output. `meta-llama/llama-3.1-8b-instruct` runs
      // ~1-12s per call and costs fractions of a cent.
      defaultModel: "meta-llama/llama-3.1-8b-instruct",
      envVars: ["OPENROUTER_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "litellm",
    {
      name: "litellm",
      // `open-large` was hanging on the LiteLLM gateway against this team's
      // routing (no response, no timeout), forcing the suite to wait its full
      // 3-min SDK timeout per test. `kimi-latest` is in the team's allowed
      // model list AND responds in ~1s, so the matrix completes deterministically.
      defaultModel: "kimi-latest",
      envVars: ["LITELLM_BASE_URL"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "sagemaker",
    {
      name: "sagemaker",
      defaultModel: "jumpstart-dft-meta-textgeneration-llama-3-1-8b",
      envVars: ["AWS_ACCESS_KEY_ID", "SAGEMAKER_ENDPOINT"],
      text: true,
      streaming: true,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "deepseek",
    {
      name: "deepseek",
      defaultModel: "deepseek-chat",
      envVars: ["DEEPSEEK_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: false,
      embeddings: false,
      thinking: true,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "nvidia-nim",
    {
      name: "nvidia-nim",
      defaultModel: "meta/llama-3.1-8b-instruct",
      envVars: ["NVIDIA_NIM_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "lm-studio",
    {
      name: "lm-studio",
      defaultModel: "local-model",
      envVars: ["LM_STUDIO_BASE_URL"],
      text: true,
      streaming: true,
      // Tool calling depends entirely on the chat template baked into the
      // currently-loaded model. Llama 3.2 3B Instruct (the default test model
      // used here) does not have tool-call grammar wired up in LM Studio's
      // template, and the request 400s with "Bad Request". Until a dedicated
      // tool-capable LM Studio fixture is added, leave tools off so this
      // doesn't FAIL the matrix on environments running unrelated models.
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: true,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "llamacpp",
    {
      name: "llamacpp",
      defaultModel: "local-model",
      envVars: ["LLAMACPP_BASE_URL"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "openai-compatible",
    {
      name: "openai-compatible",
      // Read the configured default first so LiteLLM-style endpoints with a
      // restricted model allowlist (where gpt-4o-mini is not provisioned) can
      // point the matrix at their actual model via OPENAI_COMPATIBLE_MODEL.
      defaultModel: process.env.OPENAI_COMPATIBLE_MODEL || "gpt-4o-mini",
      envVars: ["OPENAI_COMPATIBLE_BASE_URL", "OPENAI_COMPATIBLE_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "cohere",
    {
      name: "cohere",
      // Use the dated variant — the bare `command-r-plus` alias was retired
      // on 2025-09-15 and now returns 404 from the Cohere endpoint.
      defaultModel: "command-r-plus-08-2024",
      embeddingModel: "embed-english-v3.0",
      envVars: ["COHERE_API_KEY"],
      text: true,
      streaming: true,
      tools: true,
      toolsWithStreaming: true,
      structuredOutput: true,
      structuredOutputWithTools: true,
      vision: false,
      embeddings: true,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "voyage",
    {
      name: "voyage",
      defaultModel: "voyage-3.5",
      embeddingModel: "voyage-3.5",
      envVars: ["VOYAGE_API_KEY"],
      text: false, // Voyage is embeddings-only — no chat completion endpoint
      streaming: false,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: true,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "jina",
    {
      name: "jina",
      defaultModel: "jina-embeddings-v3",
      embeddingModel: "jina-embeddings-v3",
      envVars: ["JINA_API_KEY"],
      text: false, // Jina exposes embeddings + reranking — no chat completion
      streaming: false,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: true,
      thinking: false,
      imageGeneration: false,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "stability",
    {
      name: "stability",
      defaultModel: "stable-image-ultra",
      envVars: ["STABILITY_API_KEY"],
      text: false, // Stability is image-generation only
      streaming: false,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: true,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "ideogram",
    {
      name: "ideogram",
      defaultModel: "ideogram-v3",
      envVars: ["IDEOGRAM_API_KEY"],
      text: false, // Ideogram is image-generation only
      streaming: false,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: true,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "recraft",
    {
      name: "recraft",
      defaultModel: "recraft-v3",
      envVars: ["RECRAFT_API_KEY"],
      text: false, // Recraft is image-generation only
      streaming: false,
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: true,
      videoGeneration: false,
      tts: false,
    },
  ],
  [
    "replicate",
    {
      name: "replicate",
      defaultModel: "meta/meta-llama-3-70b-instruct",
      envVars: ["REPLICATE_API_TOKEN"],
      // Replicate runs via the Predictions API; the chat-completion bridge is
      // best-effort and many models simply aren't OpenAI-compatible.
      text: true,
      streaming: false, // Predictions API polls; no SSE stream
      tools: false,
      toolsWithStreaming: false,
      structuredOutput: false,
      structuredOutputWithTools: false,
      vision: false,
      embeddings: false,
      thinking: false,
      imageGeneration: true, // Flux / SDXL etc. via Predictions
      videoGeneration: true, // Veo / Kling / Runway via Predictions
      tts: false,
    },
  ],
  ...Object.entries(CATALOG_PROVIDERS),
];

export const PROVIDERS: Record<string, ProviderEntry> =
  Object.fromEntries(PROVIDER_ROWS);

// Loud guards: Object.fromEntries silently last-wins on a duplicate id
// (a hand row shadowed by a catalog row or vice versa), and a catalog id
// absent from PROVIDERS would silently drop that provider from every
// matrix run — the exact regression class task 8's review caught.
if (Object.keys(PROVIDERS).length !== PROVIDER_ROWS.length) {
  throw new Error(
    "providerMatrix: duplicate provider id between hand-written and catalog rows",
  );
}
for (const catalogId of CATALOG_PROVIDER_IDS) {
  if (!(catalogId in PROVIDERS)) {
    throw new Error(
      `providerMatrix: catalog provider "${catalogId}" missing from PROVIDERS`,
    );
  }
}

export type ProviderName = keyof typeof PROVIDERS;

/** True when every env var listed for a provider is set and non-empty. */
export function hasProviderEnv(providerName: string): boolean {
  const entry = PROVIDERS[providerName];
  if (!entry) {
    return false;
  }
  return entry.envVars.every((v) => Boolean(process.env[v]));
}

/** Returns the list of providers whose env vars are populated. */
export function availableProviders(): ProviderEntry[] {
  return Object.values(PROVIDERS).filter((p) => hasProviderEnv(p.name));
}

/** Returns providers that satisfy ALL given capability requirements. */
export function providersWithCapabilities(
  ...caps: Array<keyof Capabilities>
): ProviderEntry[] {
  return Object.values(PROVIDERS).filter((p) => caps.every((c) => p[c]));
}
