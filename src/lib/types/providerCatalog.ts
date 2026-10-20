/**
 * Single-JSON provider catalog — the authoring format for Tier-2
 * (zero-quirk OpenAI-compatible) providers. One
 * src/lib/providers/catalog/<id>.json file per provider is the single
 * source of truth; see docs/superpowers/plans/2026-08-28-provider-json-catalog-spec.md.
 */

import type {
  DecideAmbientKeyGuard,
  DecideCapableModel,
  DecideDialectName,
  DecideMedia,
  DecisionErrorKind,
  DecisionLimits,
} from "./decision.js";

export type CatalogPricingPerMTok = {
  input: number;
  output: number;
  cachedInput?: number;
};

export type CatalogModelStatus = "production" | "preview" | "retired";

/**
 * Descriptor-only per-provider turn-budget override — mirrors
 * ProviderDescriptor.timeouts field-for-field (src/lib/types/providers.ts).
 * Consumed only by buildCatalogDescriptor() (providerDescriptors.ts), never
 * by the OpenAI-compat runtime path (loader.ts's buildCatalogEntries()).
 * Optional and absent for every catalog provider except mistral, whose
 * value preserves its pre-migration hand-typed descriptor exactly.
 */
export type CatalogTimeouts = {
  generateMs?: number;
  streamMs?: number;
};

export type CatalogModelSpec = {
  contextWindow?: number;
  /**
   * The model's own output-token limit. Enforced at runtime: for a provider
   * with no PROVIDER_MAX_TOKENS row, getSafeMaxTokens clamps a larger
   * requested maxTokens to this value. Record only a number the vendor states
   * as a hard limit; omit it when the source is a roster field that looks
   * derived from the context window, because an omitted value leaves the
   * model uncapped while a wrong one silently truncates callers.
   */
  maxOutputTokens?: number;
  pricingPerMTok?: CatalogPricingPerMTok;
  vision: boolean;
  /**
   * Per-model override of the provider-level `capabilities.tools`, for a
   * "model-dependent" provider whose vendor docs name which specific models
   * accept tool definitions (e.g. Reka: its Models table has a Tools column,
   * Yes for reka-edge-2603 and No for reka-flash-3). Absent means "inherit
   * the provider-level answer", same as every model before this field
   * existed. Only meaningful when `capabilities.tools` is
   * `"model-dependent"` — a provider that already declares a plain
   * `true`/`false` has no need for it, since that single value already
   * applies to every model it serves.
   */
  tools?: boolean;
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
  /** Additional env vars validateApiKey() tries, in order, when the primary
   *  apiKeyEnvVar is unset (e.g. HuggingFace's HF_TOKEN alongside
   *  HUGGINGFACE_API_KEY). Consumed by buildCatalogConfigOptions() via
   *  ProviderConfigOptions.fallbackEnvVars. */
  apiKeyFallbackEnvVars?: string[];
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
  /** Restrict the pattern to these HTTP statuses; status matching stays independent. */
  patternStatuses?: number[];
  class: CatalogErrorRuleClass;
  message: string;
};

export type CatalogQuirks = {
  /** Send the caller's fitted maxTokens budget as max_completion_tokens and
   * omit max_tokens. Omitted preserves the ordinary OpenAI-compatible field. */
  maxTokensField?: "max_completion_tokens";
  /** Omit stream_options where the endpoint does not document that extension.
   * Does not discard usage that the endpoint returns without requesting it. */
  omitStreamOptions?: boolean;
  timeoutErrorClass?: "provider";
  /** Vendor speaks OpenAI for chat but restricts how message content is
   *  encoded. "string": `messages[].content` must be a plain string —
   *  the content-parts array and the `null` OpenAI uses on an assistant
   *  message with tool_calls are both rejected with HTTP 400. Normalized by
   *  ConfiguredOpenAICompatProvider so tool round-trips work. */
  messageContentFormat?: "string";
  registryDefaultIgnoresModelEnvVar?: boolean;
  /** Vendor rejects `response_format: { type: "json_schema" }` outright but
   *  accepts `{ type: "json_object" }`. Normalized by
   *  ConfiguredOpenAICompatProvider so `generate({ schema })` keeps working
   *  (mirrors the pre-catalog `supportsStructuredOutputs: false` behavior). */
  responseFormatDowngrade?: "json-schema-to-json-object";
  /** Vendor wants each assistant turn's `reasoning_content` sent back on
   *  every later request of the conversation (DeepSeek documents a 400
   *  without it once tools are in play). ConfiguredOpenAICompatProvider
   *  turns on the replay; every other provider leaves the field off. */
  replayReasoningContent?: boolean;
  /** The endpoint accepts auto/none/named tool choices but not required.
   * Reject that explicit caller intent with nonempty tools before sending;
   * never silently downgrade it to auto. Omitted preserves existing behavior. */
  rejectRequiredToolChoice?: boolean;
  /** Vendor's chat-completions endpoint authenticates with a vendor-specific
   *  header instead of the OpenAI-standard `Authorization: Bearer <key>`.
   *  "x-api-key": send `X-Api-Key: <key>` and omit Authorization entirely —
   *  Reka's OpenAPI spec declares this as its one security scheme (the
   *  OpenAI-SDK-style examples elsewhere in its docs pass the key through a
   *  client that still emits this header under the hood). Normalized by
   *  ConfiguredOpenAICompatProvider.getAuthHeaders(); omitted means the
   *  inherited Bearer default. */
  authHeaderStyle?: "x-api-key";
};

/** Promotional allowance is conditional; setup text must describe eligibility,
 * activation and expiry without implying current account entitlement. */
export type CatalogBillingPolicy =
  | "free-tier"
  | "free-with-card"
  | "no-free-tier"
  | "promotional-credit";

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
  /** Historical dated evidence. Its presence does not reverify an account
   * roster or live execution; the authoring admission command reports those
   * states separately without changing existing catalog records. */
  rosterVerified: CatalogProbeEvidence;
  authProbe?: CatalogProbeEvidence;
  billingProbe?: CatalogProbeEvidence;
  liveMatrix: { date: string; result: string } | null;
  /** Introduction PR identity, or PENDING_PR during local source authoring.
   * A string/URL alone is not proof of PR association, merge or release. */
  addedInPR: string;
};

export type CatalogCapabilities = {
  text: boolean;
  streaming: boolean;
  /** "model-dependent" when tool support varies per served model. Maps to
   *  ProviderDescriptor.toolSupport's own "model-dependent" member and
   *  leaves OpenAICompatCatalogEntry.supportsTools unset, so
   *  ConfiguredOpenAICompatProvider.supportsTools() falls back to whichever
   *  of its two remaining sources applies: a model whose own
   *  models.catalog[id].tools is set (see CatalogModelSpec.tools) answers
   *  from that; any other model falls through further, to the
   *  model-registry default (true for an unregistered id) — the same
   *  behavior every model had before CatalogModelSpec.tools existed, and
   *  still correct for a vendor that doesn't reject `tools` for an
   *  unsupported model (the model just never emits tool_calls), e.g.
   *  HuggingFace's router. */
  tools: boolean | "model-dependent";
  toolsWithStreaming: boolean;
  structuredOutput: boolean;
  /**
   * Whether a live wire probe proved the vendor accepts native tool
   * definitions and `response_format` in the SAME request (a 200, not a
   * schema/tools conflict error). Maps to
   * OpenAICompatCatalogEntry.supportsStructuredOutputWithTools; `true` lets
   * ConfiguredOpenAICompatProvider send both instead of suppressing
   * `response_format` on any request carrying tools (the conservative
   * default for an unknown endpoint). Only an explicit `true` opts in —
   * `false` is the same conservative behavior as leaving it unset.
   */
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
  tier?: 2;
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
    /** Source-supported positive safe integer model ceiling; never a zero
     * placeholder. This does not change caller maxTokens: 0 semantics. */
    defaultContextWindow: number;
    /** Source-supported positive safe integer output ceiling. */
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
  /**
   * Descriptor-only generate/stream turn-budget override — see
   * CatalogTimeouts. Absent = buildCatalogDescriptor() omits
   * ProviderDescriptor.timeouts entirely, matching every catalog provider's
   * behavior before this field existed.
   */
  timeouts?: CatalogTimeouts;
  /**
   * Descriptor-only ascending auto-select priority override — mirrors
   * ProviderDescriptor.autoSelectPriority field-for-field (lower = tried
   * first in getBestProvider()'s fallback chain). Absent = not part of the
   * auto-select chain, matching every catalog provider's behavior before
   * this field existed (only mistral sets it today, preserving its
   * pre-migration hand-typed value).
   */
  autoSelectPriority?: number;
  setup: CatalogSetup;
  evidence: CatalogEvidence;
};

export type DecideFormatterName = "fastapi-validation";
export type DecideBaseURLTransform = "strip-trailing-slash" | "strip-v1-suffix";
/** A check a base URL must pass once normalised; `origin` allows only an https URL (http only for localhost, 127.0.0.1 or [::1]) with no userinfo, query string or fragment. */
export type DecideBaseURLShape = "origin";

export type DecideErrorRule = {
  /** One status or a list of them. A rule sets this or `statusMin`, never both. */
  status?: number | readonly number[];
  /** Matches every status at or above this value. */
  statusMin?: number;
  /**
   * With a status, the rule also needs the error message to match this regular
   * expression (case-insensitive, searched in the first 2,000 characters of the
   * message after the key is removed). Bounded: no unescaped `*`, `+` or
   * `{n,}`, no quantifier on a group, no count above 255, and the counts side
   * by side multiply to at most 4,096 ways (each `?` is 2, each `{n,m}` is
   * m-n+1).
   */
  messagePattern?: string;
  kind: DecisionErrorKind;
  retryable?: boolean;
  /**
   * Text added after the error message, behind a dash, when this rule is the
   * one that matches. For a status the vendor uses for more than one cause,
   * where the body's own words name only one of them. `{apiKeyEnvVar}` is the
   * only placeholder. A `messagePattern` is judged on the message without it,
   * and the key is removed from it as from the message.
   */
  hint?: string;
};

export type DecideBodyShape = {
  /** Dot path into the parsed error body. */
  path: string;
  isArray?: boolean;
  formatter?: DecideFormatterName;
  kind?: DecisionErrorKind;
  retryable?: boolean;
};

export type DecideErrors = {
  rules: readonly DecideErrorRule[];
  default: DecisionErrorKind;
  bodyShapes: readonly DecideBodyShape[];
};

export type DecideModel = {
  placement: "body" | "body-unless-alias";
  /** With `body-unless-alias`: the model name that means "send no model". */
  alias?: string;
};

export type DecideBlock = {
  dialect: DecideDialectName;
  /** Decision order, lower runs first; unique across decide providers. */
  order: number;
  /** True when the provider has no built-in endpoint and the caller must supply one. */
  baseURLRequired?: boolean;
  /** Applied to the base URL in list order. */
  baseURLNormalize?: readonly DecideBaseURLTransform[];
  /** Refuses a base URL of another shape before any request. Omitted means no check. */
  baseURLShape?: DecideBaseURLShape;
  /** Request URL; `{baseURL}` is the only placeholder. */
  endpoint: string;
  model: DecideModel;
  /**
   * How the API key is sent. `bearer`, the default when omitted, sends
   * `Authorization: Bearer <key>`. `x-api-key` sends `x-api-key: <key>` and no
   * `Authorization` header at all. This is the decide request's own setting;
   * `quirks.authHeaderStyle` belongs to the chat path and is not read here.
   */
  authHeader?: "bearer" | "x-api-key";
  /**
   * `text` makes the state that goes out always a string: a string is sent
   * unchanged (not trimmed), any other value is sent as its JSON text, and a
   * state that is blank after trimming is refused before any request, as an
   * `invalid_request`. Omitted means the state goes out as given.
   */
  stateEncoding?: "text";
  /** Body keys for images and video, after `model`, `state` and `questions`. Omitted means the body never carries media. */
  media?: DecideMedia;
  /**
   * A model the request is sent to instead of the default when the call names
   * no model, no model variable is set, and the request carries media or a
   * question of one of `questionTypes`. Its `decisionLimits` row is the one
   * checked. For a text default that cannot read those requests, whose server
   * would otherwise hand them to this model behind its back, with a smaller
   * window than the one checked. Omitted means the default model is always sent.
   */
  capableModel?: DecideCapableModel;
  /**
   * Keeps a key found only in the environment from becoming the default
   * decision provider when it plainly belongs to something else. Omitted means
   * no check.
   */
  ambientKeyGuard?: DecideAmbientKeyGuard;
  requestIdHeaders?: readonly string[];
  response?: { modelPaths?: readonly string[] };
  errors: DecideErrors;
};

export type DecideCatalogJson = {
  $schema?: string;
  id: string;
  displayName: string;
  enumTypeName?: string;
  credentialsKey?: string;
  aliases: string[];
  inferenceKinds: readonly ["decide"];
  tier?: 2;
  wire: CatalogWire;
  models: {
    default: string;
    catalog: Record<string, CatalogModelSpec>;
    topModels?: string[];
    testModel?: string;
  };
  timeouts?: {
    decideMs?: number;
    /** Added to `decideMs` per 1,000 estimated state tokens, for a model whose latency grows with the state. */
    decideMsPerKStateTokens?: number;
  };
  decisionLimits?: DecisionLimits;
  decide: DecideBlock;
  setup: CatalogSetup;
  evidence: CatalogEvidence;
};

export type CatalogEntry = ProviderCatalogJson | DecideCatalogJson;

// The loader helpers read only these fields, so a chat entry, a decide entry
// or a bare object carrying them all fit.
export type CatalogKeySource = Pick<CatalogEntry, "id" | "credentialsKey">;
export type CatalogEnvSource = Pick<CatalogEntry, "id" | "wire">;
export type CatalogSetupSource = Pick<
  CatalogEntry,
  "id" | "displayName" | "wire" | "setup"
>;
