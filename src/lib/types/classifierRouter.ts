/**
 * ClassifierRouter types — generic "classify → pick model + tools → run".
 *
 * A ClassifierRouter inspects an incoming request, classifies it by difficulty
 * (and optional required capabilities / suggested tools), then selects a
 * provider/model from a host-declared "available base" pool — routing harder
 * tasks to more capable models and easier tasks to cheaper/faster ones — and
 * optionally narrows the tool set for that request.
 *
 * It is entirely opt-in (constructor config, `enabled: false` by default) and
 * fails open: any classifier or selection error leaves the call unrouted.
 *
 * Type names are domain-prefixed `Classifier*` to stay globally unique across
 * `src/lib/types/` (see CLAUDE.md rule 9).
 */

/** Coarse difficulty buckets the classifier maps a request into. */
export type ClassifierDifficulty =
  | "trivial"
  | "simple"
  | "moderate"
  | "hard"
  | "expert";

/** Which classification strategy to run. */
export type ClassifierStrategyKind = "heuristic" | "llm";

/**
 * The classifier's verdict for a single request. Strategy-agnostic: produced
 * by both the heuristic and the LLM classifier.
 */
export type ClassifierDecision = {
  /** The classified difficulty bucket. */
  difficulty: ClassifierDifficulty;
  /** Confidence in the classification (0–1). */
  confidence: number;
  /** Capability tags the request needs (e.g. "vision", "tools", "reasoning"). */
  requiredCapabilities?: string[];
  /** Tool names the classifier thinks the task needs (allowlist hint). */
  suggestedTools?: string[];
  /**
   * When the LLM classifier picks a model directly, the chosen candidate id
   * (matches a `ClassifierCandidate.id`). Ignored by the heuristic classifier.
   */
  selectedModelId?: string;
  /** Human-readable explanation, emitted at debug level. */
  reason?: string;
};

/**
 * Lightweight model descriptor handed to the LLM classifier so it can select a
 * model directly from the pool by `id` — the generic path for custom models.
 */
export type ClassifierCandidate = {
  id: string;
  provider: string;
  model?: string;
  description?: string;
  tiers?: ClassifierDifficulty[];
  capabilities?: string[];
};

/**
 * One candidate (provider, model, region) in the available base pool, with
 * optional routing metadata. When `cost`/`quality`/`capabilities` are omitted,
 * the router enriches them from the model registry (by `model` name/alias).
 */
export type ClassifierRouterPoolMember = {
  provider: string;
  model?: string;
  region?: string;
  /**
   * Stable id the LLM classifier references when selecting a model directly.
   * Defaults to `${provider}/${model}` (or just `provider`) when omitted.
   */
  id?: string;
  /**
   * Plain-English description of when to use this model (e.g. "cheap & fast,
   * for simple Q&A" / "powerful reasoning model for complex analysis"). Drives
   * LLM-based model selection — the only metadata needed for custom models that
   * are NOT in the registry (LiteLLM, OpenAI-compatible, self-hosted, …).
   */
  description?: string;
  /** Difficulty tiers this member is eligible for. Omit = eligible for all. */
  tiers?: ClassifierDifficulty[];
  /** Relative cost (lower = cheaper). Preferred for easy tiers. */
  cost?: number;
  /** Relative quality/capability (higher = more capable). Preferred for hard tiers. */
  quality?: number;
  /** Capability tags this member supports (e.g. "vision", "tools"). */
  capabilities?: string[];
  /** Tiebreak weight when scores are equal. Default: 1. */
  weight?: number;
};

/** Per-difficulty tool policy applied to the request. */
export type ClassifierToolDirective = {
  /** Allowlist of tool names to keep (maps to `options.toolFilter`). */
  toolFilter?: string[];
  /** Denylist of tool names to drop (appended to `options.excludeTools`). */
  excludeTools?: string[];
};

/** Provider/model the LLM classifier strategy itself runs on. */
export type ClassifierModelRef = {
  provider?: string;
  model?: string;
  region?: string;
  temperature?: number;
};

/** Constructor-level configuration for the classifier router. */
export type ClassifierRouterConfig = {
  /** Master switch. When false/absent, the router is never built. */
  enabled: boolean;
  /**
   * Classification strategy. Default: "heuristic" (no LLM, zero added latency).
   * "llm" runs a cheap classifier model (see `classifierModel`).
   */
  classifier?: ClassifierStrategyKind;
  /** Model used by the "llm" strategy. Defaults to provider/model auto. */
  classifierModel?: ClassifierModelRef;
  /** The available base pool the router selects a model from. */
  pool: ClassifierRouterPoolMember[];
  /**
   * Explicit difficulty → members map. When a difficulty has entries here they
   * take precedence over metadata scoring of `pool`.
   */
  tierMap?: Partial<Record<ClassifierDifficulty, ClassifierRouterPoolMember[]>>;
  /** Per-difficulty tool directives applied to the request. */
  toolDirectives?: Partial<
    Record<ClassifierDifficulty, ClassifierToolDirective>
  >;
  /** Hard timeout (ms) for the LLM classifier call. Default: 8000. */
  timeoutMs?: number;
};

/**
 * The router's combined decision: a provider/model/region override plus an
 * optional tool narrowing. Any undefined field means "keep what the caller
 * already configured". Returning `null` from the router is a valid no-op.
 */
export type ClassifierRouterDecision = {
  provider?: string;
  model?: string;
  region?: string;
  /** Allowlist applied to `options.toolFilter`. */
  toolFilter?: string[];
  /** Denylist appended to `options.excludeTools`. */
  excludeTools?: string[];
  /** The difficulty this decision was made for (debug/telemetry). */
  difficulty?: ClassifierDifficulty;
  /** Remaining ranked candidates, best-first, for downstream failover. */
  modelFallbacks?: ClassifierRouterPoolMember[];
  /** Human-readable explanation, emitted at debug level. */
  reason?: string;
};

/** Lightweight request snapshot handed to the router. */
export type ClassifierRouterInput = {
  prompt: string;
  estimatedInputTokens?: number;
  hasTools?: boolean;
  requiresVision?: boolean;
  thinkingLevel?: string;
  sessionId?: string;
};

/** Enriched per-model metadata used while ranking pool members. */
export type ClassifierModelMeta = {
  cost?: number;
  quality?: number;
  capabilities?: string[];
};

/** Minimal options accepted by the injected LLM-classifier `generate` fn. */
export type ClassifierGenerateOptions = {
  input: { text: string };
  systemPrompt?: string;
  provider?: string;
  model?: string;
  region?: string;
  temperature?: number;
  maxTokens?: number;
  disableTools?: boolean;
  schema?: unknown;
  timeout?: number | string;
  context?: Record<string, unknown>;
};

/** Minimal result shape the LLM classifier reads back. */
export type ClassifierGenerateResult = {
  content?: string;
  structuredData?: unknown;
};

/** Injected LLM caller — typically a bound `NeuroLink.generate`. */
export type ClassifierGenerateFn = (
  options: ClassifierGenerateOptions,
) => Promise<ClassifierGenerateResult>;

/** Minimal logger surface the router uses (debug/warn). */
export type ClassifierLogger = {
  debug: (message: string, meta?: unknown) => void;
  warn: (message: string, meta?: unknown) => void;
};

/**
 * Injected dependencies — keep `ClassifierRouter` provider-import-free and
 * unit-testable (mirrors the `toolRouting` generateFn-injection pattern).
 */
export type ClassifierRouterDeps = {
  /** LLM caller for the "llm" strategy. Omit to disable LLM classification. */
  generate?: ClassifierGenerateFn;
  logger?: ClassifierLogger;
};
