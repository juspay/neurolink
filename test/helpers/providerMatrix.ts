/**
 * Provider capability matrix — the single source of truth for what each of
 * NeuroLink's 13 providers supports. Used by the matrix test runner and any
 * suite that needs to skip a test based on provider capability.
 *
 * Adding a new provider:
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
  /** Env vars required to consider this provider available. */
  envVars: string[];
};

/**
 * Provider entries indexed by AIProviderName string value.
 * Insertion order is the canonical iteration order for matrix runs.
 */
export const PROVIDERS: Record<string, ProviderEntry> = {
  openai: {
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
  anthropic: {
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
  vertex: {
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
  "google-ai": {
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
  bedrock: {
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
  azure: {
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
  mistral: {
    name: "mistral",
    defaultModel: "mistral-small-latest",
    envVars: ["MISTRAL_API_KEY"],
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
  huggingface: {
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
  ollama: {
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
  openrouter: {
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
  litellm: {
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
  sagemaker: {
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
  deepseek: {
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
  "nvidia-nim": {
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
  "lm-studio": {
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
  llamacpp: {
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
  "openai-compatible": {
    name: "openai-compatible",
    defaultModel: "gpt-4o-mini",
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
  xai: {
    name: "xai",
    defaultModel: "grok-3",
    envVars: ["XAI_API_KEY"],
    text: true,
    streaming: true,
    tools: true,
    toolsWithStreaming: true,
    structuredOutput: true,
    structuredOutputWithTools: true,
    vision: true, // grok-2-vision / grok-vision-beta
    embeddings: false,
    thinking: false,
    imageGeneration: false,
    videoGeneration: false,
    tts: false,
  },
  groq: {
    name: "groq",
    defaultModel: "meta-llama/llama-4-scout-17b-16e-instruct",
    envVars: ["GROQ_API_KEY"],
    text: true,
    streaming: true,
    tools: true,
    toolsWithStreaming: true,
    structuredOutput: true,
    structuredOutputWithTools: false, // Groq's JSON-mode + tool-calling can't coexist
    vision: true, // llama-3.2-11b-vision-preview, llama-3.2-90b-vision-preview
    embeddings: false,
    thinking: false,
    imageGeneration: false,
    videoGeneration: false,
    tts: false,
  },
  cohere: {
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
  "together-ai": {
    name: "together-ai",
    defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    envVars: ["TOGETHER_AI_API_KEY"],
    text: true,
    streaming: true,
    tools: true,
    toolsWithStreaming: true,
    structuredOutput: true,
    structuredOutputWithTools: true,
    vision: true, // Llama-3.2-90B-Vision-Instruct-Turbo
    embeddings: false,
    thinking: false,
    imageGeneration: true, // Flux models hosted via Together
    videoGeneration: false,
    tts: false,
  },
  fireworks: {
    name: "fireworks",
    // Fireworks serverless catalog is gated per-account; the previously-
    // deployed `deepseek-v3p1` was retired upstream and `llama-v3p3-70b`
    // returns "Model not found, inaccessible, and/or not deployed" on this
    // team. `kimi-k2p5` is in the account's currently-deployed list and
    // responds reliably for chat + tool calling + structured output.
    defaultModel: "accounts/fireworks/models/kimi-k2p5",
    envVars: ["FIREWORKS_API_KEY"],
    text: true,
    streaming: true,
    tools: true,
    toolsWithStreaming: true,
    structuredOutput: true,
    structuredOutputWithTools: true,
    vision: true, // llama-v3p2-90b-vision-instruct
    embeddings: false,
    thinking: false,
    imageGeneration: false,
    videoGeneration: false,
    tts: false,
  },
  perplexity: {
    name: "perplexity",
    defaultModel: "sonar",
    envVars: ["PERPLEXITY_API_KEY"],
    text: true,
    streaming: true,
    tools: false, // Perplexity Sonar models don't expose tool/function calling
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
  cloudflare: {
    name: "cloudflare",
    defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    envVars: ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN"],
    text: true,
    streaming: true,
    tools: true, // most Workers AI chat models support function calling
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
  voyage: {
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
  jina: {
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
  stability: {
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
  ideogram: {
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
  recraft: {
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
  replicate: {
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
};

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
