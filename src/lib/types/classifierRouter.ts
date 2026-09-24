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

import type { ValidationSchema } from "./aliases.js";
import type { DecisionCallerFn } from "./decision.js";

/** Coarse difficulty buckets the classifier maps a request into. */
export type ClassifierDifficulty =
  | "trivial"
  | "simple"
  | "moderate"
  | "hard"
  | "expert";

/**
 * Which classification strategy to run.
 *
 * - `heuristic` — keyword/length scoring. Deterministic, zero latency.
 * - `llm` — a cheap classifier model via the injected `generate`.
 * - `jev` — TypeSafe's System One model; one ~400ms round trip that returns a
 *   *calibrated* confidence rather than a self-reported one.
 * - `auto` — `jev` when a decision provider is configured, in the environment
 *   or in SDK credentials (`TYPESAFE_API_KEY`, or `LAYA_API_KEY` with
 *   `LAYA_BASE_URL`), otherwise `heuristic`.
 */
export type ClassifierStrategyKind = "heuristic" | "llm" | "jev" | "auto";

/**
 * How much of the available context a request actually needs, ordered
 * narrowest → widest. This is a *rubric*, not a token count: a decision model
 * is reliable at placing a request on an ordered scale and unreliable at
 * naming a number (it reads digits as text, not as quantities).
 *
 * The index is mapped onto a compaction threshold by the router, and only
 * ever downward — see `ClassifierRouterDecision.compactionThreshold`.
 */
export type ClassifierContextScope =
  | "current-message"
  | "recent-turns"
  | "full-conversation"
  | "everything";

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
  /**
   * Confidence in `selectedModelId`, when the strategy reports one.
   *
   * Separate from `confidence`, which is about the DIFFICULTY verdict: a
   * classifier can be certain a task is hard and unsure which model suits it.
   * The router needs this one on its own, because whether a pick must clear
   * the upgrade bar or the downgrade bar depends on the pick, not the tier.
   *
   * Absent means the strategy does not report one (the LLM classifier), in
   * which case the pick is honoured as it always was.
   */
  selectedModelConfidence?: number;
  /**
   * How much context the request needs. Only the decision strategy produces
   * this — the heuristic has no way to judge it and the LLM classifier is not
   * asked, since for it every extra field costs output tokens. For a decision
   * model the question is very nearly free.
   */
  contextScope?: ClassifierContextScope;
  /** Confidence in `contextScope`, 0-1. Calibrated for the decide strategy. */
  contextScopeConfidence?: number;
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
  /**
   * Maximum input window, in tokens. Read from the model registry when the
   * pool is built from the catalogue. Nothing in routing consulted this
   * before — a request was routed to a model without ever asking whether it
   * could hold the request.
   */
  contextWindow?: number;
  /** USD per 1K input tokens, for the cheapest-that-works judgement. */
  inputCostPer1K?: number;
  /** USD per 1K output tokens. */
  outputCostPer1K?: number;
  /** Registry speed bucket ("fast" | "medium" | "slow"). */
  speed?: string;
  /** Registry quality bucket ("high" | "medium" | "low"). */
  quality?: string;
  /**
   * The registry's per-dimension suitability scores (1–10): coding, analysis,
   * reasoning, conversation, creative, translation, summarization. Present
   * only for registry-backed models.
   */
  useCases?: Readonly<Record<string, number>>;
  /**
   * Deterministic merit score for the difficulty this candidate was built
   * for, higher is better. Computed by `enrichCandidate`; it is what the
   * fallback ranker sorts on and is never sent to the model.
   */
  score?: number;
  /**
   * The host's own `cost` / `quality` from the pool member, if it declared
   * them. These are RELATIVE scales, comparable only against other members
   * of the same pool — never a currency and never a registry bucket.
   *
   * They are carried separately because they take precedence over anything
   * the registry says. A host that writes `quality: 2` next to "cheap and
   * fast; rote edits only" has made a statement about how it wants that
   * model used, and the registry — which may rate the same model highly on
   * its own general benchmarks — does not get to overrule it.
   */
  relativeCost?: number;
  relativeQuality?: number;
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
   * Classification strategy. Default: "auto" — which resolves to "jev" when a
   * decision provider is configured, in the environment or in SDK credentials
   * (`TYPESAFE_API_KEY`, or `LAYA_API_KEY` with `LAYA_BASE_URL`) and
   * "heuristic" otherwise, so configuring one
   * upgrades routing without any code change. Behaviour for callers with no
   * key is unchanged.
   */
  classifier?: ClassifierStrategyKind;
  /** Model used by the "llm" strategy. Defaults to provider/model auto. */
  classifierModel?: ClassifierModelRef;
  /**
   * How sure the classifier must be to route a request UP to a more capable
   * (costlier) model. Being wrong here costs money, so the bar is low.
   * Only meaningful for "jev", whose confidence is calibrated. Default: 0.3.
   */
  minUpgradeConfidence?: number;
  /**
   * How sure it must be to route DOWN to a cheaper model. Being wrong here
   * means a task handled by too small a model, so the bar is high.
   * Default: 0.6.
   */
  minDowngradeConfidence?: number;
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
  /**
   * Widen the pool with every model the registry knows about that this host
   * actually has credentials for.
   *
   * Off by default, and deliberately so: the declared `pool` is a statement
   * about which models a host is *willing* to be billed for, and NeuroLink
   * cannot invent that. Turning this on says "anything I have a key for is
   * fair game", which is exactly right for a CLI and exactly wrong for a
   * service with a negotiated model list.
   */
  catalog?: ClassifierCatalogConfig;
  /**
   * Ask the classifier how much context the request needs and use the answer
   * to lower the compaction threshold. Default: true when the strategy
   * resolves to a decision model, since the question rides along in a batch
   * that is already being sent. Ignored by the other strategies.
   */
  contextBudget?: boolean;
};

/** How the model catalogue widens the declared pool. */
export type ClassifierCatalogConfig = {
  enabled: boolean;
  /**
   * Cap on catalogue-derived members. The binding constraint is the decision
   * model's input ceiling — state plus the longest single question must stay
   * under ~33K tokens, and the model question's `criteria` map is that
   * question. At roughly 40 tokens per rendered model that ceiling is
   * hundreds of models away.
   *
   * Default: 120. The registry currently holds 64 models, so the default
   * never truncates today — it is a guard against a future registry that
   * grows past what one question can carry, not a limit anyone is hitting.
   */
  maxModels?: number;
  /** Restrict the catalogue to these provider names. Omit for all configured. */
  providers?: string[];
  /** Drop models whose context window is below this. Default: 0 (keep all). */
  minContextWindow?: number;
  /** Include models flagged deprecated in the registry. Default: false. */
  includeDeprecated?: boolean;
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
  /**
   * Fraction of the model's window at which compaction should trigger for
   * THIS request, replacing the fixed 0.8 default.
   *
   * **Only ever lower than the default, never higher.** Raising it would let
   * a request through that the model then rejects with a context-window
   * error — and `ModelPool` treats that as a permanent cooldown (10 years),
   * so a single optimistic guess retires the model for the life of the
   * process. Shrinking a budget wastes a little context; growing one is
   * unrecoverable.
   */
  compactionThreshold?: number;
  /** The scope reading `compactionThreshold` was derived from. */
  contextScope?: ClassifierContextScope;
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
  /** Whether this request is tied to a session, independent of the (withheld) session id itself. */
  sessionBound?: boolean;
  /** Number of prior conversation messages the caller supplied, when known. */
  priorMessageCount?: number;
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
  schema?: ValidationSchema;
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

/**
 * Injected decision caller — typically a bound `NeuroLink.tryDecide`, which
 * returns null on any failure. Keeps `ClassifierRouter` free of provider
 * imports, exactly as `ClassifierGenerateFn` does.
 */
export type ClassifierDecideFn = DecisionCallerFn;

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
  /** Decision caller for the "jev" strategy. Omit to disable it. */
  decide?: ClassifierDecideFn;
  /**
   * Whether a decision provider is configured for this caller, counting the
   * credentials it was given as well as the environment. Omit to check the
   * environment alone.
   */
  hasDecisionProvider?: () => boolean;
  logger?: ClassifierLogger;
};
