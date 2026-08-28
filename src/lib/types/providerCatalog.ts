/**
 * Single-JSON provider catalog — the authoring format for Tier-2
 * (zero-quirk OpenAI-compatible) providers. One
 * src/lib/providers/catalog/<id>.json file per provider is the single
 * source of truth; see docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md.
 */

export type CatalogPricingPerMTok = {
  input: number;
  output: number;
  cachedInput?: number;
};

export type CatalogModelStatus = "production" | "preview" | "retired";

export type CatalogModelSpec = {
  contextWindow?: number;
  maxOutputTokens?: number;
  pricingPerMTok?: CatalogPricingPerMTok;
  vision: boolean;
  status: CatalogModelStatus;
  description: string;
  /**
   * Enum member name override. Default is the derived constant-case of the
   * model id; REQUIRED where the derived name differs from a pre-existing
   * exported member (public-surface compatibility).
   */
  enumMember?: string;
};

export type CatalogWire = {
  baseURL?: string;
  baseURLTemplate?: string;
  extraCredentials?: string[];
  missingCredentialMessage?: string;
  envOverrides?: { apiKey?: string; baseURL?: string; model?: string };
};

export type CatalogErrorRuleClass =
  | "authentication"
  | "rate-limit"
  | "invalid-model"
  | "network"
  | "provider";

export type CatalogErrorRuleJson = {
  status?: number;
  pattern?: string;
  class: CatalogErrorRuleClass;
  message: string;
};

export type CatalogQuirks = {
  timeoutErrorClass?: "provider";
  registryDefaultIgnoresModelEnvVar?: boolean;
};

export type CatalogBillingPolicy =
  | "free-tier"
  | "free-with-card"
  | "no-free-tier";

export type CatalogSetup = {
  url: string;
  apiKeyFormat: string | null;
  billingPolicy: CatalogBillingPolicy;
  instructions: string[];
  /**
   * Config-options description shown to callers for this credential.
   * Default: "API key". Set explicitly where the legacy entry's
   * description carries real information a generic "API key" loses
   * (e.g. Cloudflare's "API token (Workers AI Read+Write scope)").
   */
  description?: string;
};

export type CatalogProbeEvidence = {
  date: string;
  status?: number;
  code?: string;
  method?: string;
};

export type CatalogEvidence = {
  rosterVerified: CatalogProbeEvidence;
  authProbe?: CatalogProbeEvidence;
  billingProbe?: CatalogProbeEvidence;
  liveMatrix: { date: string; result: string } | null;
  addedInPR: string;
};

export type CatalogCapabilities = {
  text: boolean;
  streaming: boolean;
  tools: boolean;
  toolsWithStreaming: boolean;
  structuredOutput: boolean;
  structuredOutputWithTools: boolean;
  embeddings: boolean;
  thinking: boolean;
};

export type ProviderCatalogJson = {
  /** Editor-only pointer to provider-catalog.schema.json — accepted and ignored. */
  $schema?: string;
  id: string;
  displayName: string;
  /**
   * Exported <Name>Models enum name override. Default: PascalCase(id) +
   * "Models". REQUIRED where the derived name differs from a pre-existing
   * export ("together-ai" derives "TogetherAiModels"; the legacy export is
   * "TogetherAIModels").
   */
  enumTypeName?: string;
  /**
   * NeurolinkCredentials key override. Default: toCamelCase(id). REQUIRED
   * where the derived key differs from a pre-existing public credential
   * field ("together-ai" derives "togetherAi"; the shipped public key is
   * "together" — renaming it would break any caller passing
   * `credentials: { together: {...} } }`, a public API break rule 5
   * forbids).
   */
  credentialsKey?: string;
  aliases: string[];
  tier: 2;
  wire: CatalogWire;
  models: {
    default: string;
    fallbacks: string[];
    /** Default: fallbacks[1] ?? fallbacks[0]. Set explicitly where the
     *  legacy entry differs (behavior preservation — e.g. Groq). */
    fallbackModelName?: string;
    /** Default: models.default. Set explicitly where the legacy entry's
     *  registry-level default differs (behavior preservation — Mistral's
     *  registryDefaultModel is MISTRAL_LARGE_LATEST while its defaultModel
     *  is not). Must be a models.catalog key (validated). */
    registryDefaultModel?: string;
    defaultContextWindow: number;
    defaultMaxOutputTokens: number;
    catalog: Record<string, CatalogModelSpec>;
    /** Ordered curated subset of `catalog` keys for wizard/choice surfaces
     *  (e.g. the CLI setup wizard's top-N model picker). When absent, choice
     *  surfaces fall back to the full catalog in file order. */
    topModels?: string[];
    /** The live-verified vision-capable model for capability tests, for
     *  providers whose `default` model is text-only. Must be a
     *  models.catalog key with vision: true (validated). When absent, the
     *  first vision:true model in `catalog` file order is used. */
    visionModel?: string;
    /** The live-verified model the capability matrix drives, for providers
     *  whose `default` is retired upstream or gated off the testing account
     *  (Fireworks serverless deployment, Groq's roster purges). May name a
     *  model outside `catalog` — current account reality, not transcribed
     *  history. When absent, the matrix drives `default`. Never affects the
     *  runtime default. */
    testModel?: string;
  };
  capabilities: CatalogCapabilities;
  errorRules: CatalogErrorRuleJson[];
  quirks?: CatalogQuirks;
  setup: CatalogSetup;
  evidence: CatalogEvidence;
};
