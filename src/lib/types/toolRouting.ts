/**
 * Pre-call tool routing — configuration and catalog types.
 *
 * Host applications can register large numbers of custom tools (typically MCP
 * server tools) whose names are prefixed with their server id
 * (`${serverId}_${toolName}`). When a call explicitly sets
 * `useToolRouting: true`, a cheap router LLM call picks the servers
 * relevant to the user query, and the tools of every unpicked server are
 * appended to the request's `excludeTools` denylist before the main model
 * call.
 *
 * Denylist semantics are deliberate: the router only knows the declared
 * server catalog — a strict subset of the real tool set. Excluding unpicked
 * servers leaves NeuroLink's built-in direct tools, always-include servers,
 * and any tools outside the catalog untouched. The whole mechanism fails
 * open: any router failure resolves to an empty exclusion list (all tools),
 * identical to routing being disabled.
 */

import type { GenerateOptions, GenerateResult } from "./generate.js";

/** One routable server as declared by the host application. */
export type ToolRoutingServerDescriptor = {
  /**
   * Server id. Must be the prefix used when the host registered the server's
   * tools (`${id}_${toolName}`) — tool names are grouped by this prefix.
   */
  id: string;
  /** Routing-grade server description shown to the router LLM. */
  description: string;
};

/**
 * LLM settings for the router call. Fields omitted here fall back to the
 * stream call's own provider/model/region, so the router uses the same model
 * as the main chat call unless explicitly overridden.
 */
export type ToolRoutingModelConfig = {
  provider?: string;
  model?: string;
  region?: string;
  /** Router sampling temperature. Default: 0. */
  temperature?: number;
};

/**
 * Weights for the hybrid scoring formula used by `ToolEmbeddingIndex.rank()`.
 * Scores are computed as: `cosine * cosine + bm25 * bm25Score` then
 * normalized before sorting.
 * Default: `{ cosine: 0.8, bm25: 0.2 }`.
 */
export type ToolRetrievalWeights = {
  /** Weight applied to the cosine-similarity (dense) component. */
  cosine: number;
  /** Weight applied to the BM25 (sparse/lexical) component. */
  bm25: number;
};

/**
 * Configuration for the L2 embedding fast-path (ITEM B).
 *
 * When enabled and the catalog's total tool count reaches `minToolsToActivate`,
 * a hybrid cosine + BM25 retriever ranks all tools by relevance to the query
 * and takes the top-`topK` candidates. This is far cheaper than an LLM call
 * (sub-10 ms warm) and fires BEFORE or INSTEAD of the LLM router.
 *
 * Fail-open: any embedding error (missing provider, network failure, wrong
 * model) silently falls back to the existing LLM-router / server-granularity
 * path — the turn is never broken.
 */
export type ToolRoutingEmbeddingConfig = {
  /**
   * Activate the embedding fast-path. Default: false (backward-compatible).
   * Setting this to true without supplying `provider`/`model` causes the SDK
   * to try the stream call's configured provider; if that provider does not
   * support embeddings the layer fails open.
   */
  enabled?: boolean;
  /**
   * Maximum number of top-ranked tool candidates passed to the post-embedding
   * decision stage. Default: 20.
   */
  topK?: number;
  /**
   * Minimum total tool count in the catalog before the embedding path
   * activates. Below this threshold the catalog is small enough that the LLM
   * router alone is cheap and fast. Default: 20.
   */
  minToolsToActivate?: number;
  /**
   * Weights for the hybrid scoring formula:
   *   score = cosine * cosineSim + bm25 * bm25Score  (both normalized to [0,1])
   * Default: `{ cosine: 0.8, bm25: 0.2 }`.
   */
  weights?: ToolRetrievalWeights;
  /**
   * Provider name to use for the embedding call (e.g. "openai", "vertex").
   * Defaults to the stream/generate call's configured provider. The provider
   * must support `embedMany()`.
   */
  provider?: string;
  /**
   * Embedding model name (provider-specific). When omitted the provider's
   * default embedding model is used (e.g. text-embedding-3-small for OpenAI).
   */
  model?: string;
  /**
   * Timeout for embedding calls in milliseconds. Default: 10000.
   */
  timeoutMs?: number;
};

/** Constructor-level configuration for pre-call tool routing. */
export type ToolRoutingConfig = {
  /**
   * Constructor-level master switch. A call still must pass
   * `useToolRouting: true`, and the server catalog must be non-empty.
   */
  enabled: boolean;
  /**
   * Routable server catalog. Hosts that only know their servers after
   * constructing NeuroLink can supply it later via
   * `neurolink.setToolRoutingServers()` instead.
   */
  servers?: ToolRoutingServerDescriptor[];
  /**
   * Server ids whose tools are always kept and never offered to the router
   * (e.g. utility / reasoning / chart servers every turn may need).
   */
  alwaysIncludeServerIds?: string[];
  /** Hard ceiling for the router LLM call before failing open. Default: 15000. */
  timeoutMs?: number;
  /** Router LLM override. Defaults to the stream call's provider/model/region at temperature 0. */
  routerModel?: ToolRoutingModelConfig;
  /**
   * Override for the instruction text placed before the user query in the
   * router prompt (role + task framing). When omitted, the SDK built-in
   * default is used. The server catalog, user query, and output rules are
   * always appended by the SDK regardless of this value.
   */
  routerPromptPrefix?: string;
  /**
   * LRU+TTL cache for routing decisions. When enabled, identical routing
   * queries within the TTL window skip the router LLM entirely and reuse
   * the cached exclusion list.
   */
  cache?: {
    /** Whether the cache is active. Default: false. */
    enabled?: boolean;
    /** Time-to-live in milliseconds for each cached entry. Default: 60000. */
    ttlMs?: number;
    /** Maximum number of entries in the LRU cache. Default: 256. */
    maxEntries?: number;
  };
  /**
   * Session stickiness: once the router picks a set of servers for a session,
   * those servers are kept warm (not excluded) for the next N turns to prevent
   * flapping.
   */
  stickiness?: {
    /** Whether session stickiness is active. Default: false. */
    enabled?: boolean;
    /** Number of turns for which a previously-selected server stays warm. Default: 3. */
    turns?: number;
  };
  /**
   * L2 embedding fast-path (ITEM B). When enabled the SDK ranks tools by
   * semantic + lexical relevance using a hybrid cosine/BM25 score and narrows
   * the candidate set BEFORE (or instead of) the LLM router. Disabled by
   * default for backward compatibility.
   */
  embedding?: ToolRoutingEmbeddingConfig;
  /**
   * Routing granularity (ITEM D).
   *
   * - `"server"` (default) — routing excludes the tools of entire unpicked
   *   servers. This is the original behavior.
   * - `"tool"` — routing excludes individual tools that are not in the
   *   embedding top-K candidate set, regardless of which server they belong
   *   to. Requires `embedding.enabled: true`; if the embedding fast-path is
   *   off (or fails) the granularity falls back to `"server"` automatically.
   */
  granularity?: "server" | "tool";
};

/** Catalog entry pairing a server descriptor with its registered tool names. */
export type ToolRoutingCatalogEntry = {
  id: string;
  description: string;
  /** Registered tool names for this server, i.e. `${serverId}_${toolName}`. */
  toolNames: string[];
};

/** Internal cache entry for `ToolRoutingCache`. */
export type ToolRoutingCacheEntry = {
  excludedToolNames: string[];
  selectedServerIds: string[];
  /** Absolute expiry timestamp (from the injected `now()` clock). */
  expiresAt: number;
  /** LRU eviction order — lower = older. Bumped on each get/set. */
  accessOrder: number;
};

/** Internal stickiness entry for `ToolRoutingCache`. */
export type ToolRoutingStickiness = {
  serverIds: string[];
  /** Turn counter — decremented on each routing turn, removed when it hits 0. */
  turnsRemaining: number;
};

/** Constructor options for `ToolRoutingCache`. */
export type ToolRoutingCacheOptions = {
  /** Time-to-live in milliseconds for each cached entry. Default: 60_000. */
  ttlMs?: number;
  /** Maximum number of entries kept in the LRU before eviction. Default: 256. */
  maxEntries?: number;
  /** Number of turns a selected server remains sticky per session. Default: 3. */
  stickyTurns?: number;
  /**
   * Clock function for TTL calculations. Defaults to `Date.now`.
   * Inject a deterministic function in tests to control time.
   */
  now?: () => number;
};

/**
 * Outcome classifier for a single routing resolution. Used in
 * `ToolRoutingDecision` and emitted as an OTel span attribute.
 */
export type ToolRoutingOutcome =
  | "applied"
  | "skipped-no-query"
  | "skipped-single-server"
  | "empty-pick"
  | "failed-open-parse"
  | "failed-open-timeout"
  | "failed-open-error"
  | "cache-hit";

/**
 * Machine-readable summary of one routing resolution. Emitted via the
 * `emitDecision` callback so the caller can attach it as OTel span attributes
 * or record it in any other telemetry sink.
 */
export type ToolRoutingDecision = {
  /** How the routing turn concluded. */
  outcome: ToolRoutingOutcome;
  /** Server ids the router kept (selected as relevant). */
  selectedServerIds: string[];
  /** Server ids whose tools were excluded (router considered them irrelevant). */
  excludedServerIds: string[];
  /** Server ids the router returned that did not exist in the catalog. */
  hallucinatedIds: string[];
  /** Total number of individual tool names added to the exclusion list. */
  excludedToolCount: number;
  /** Number of servers that were offered to the router (always-include excluded). */
  routableServerCount: number;
  /** True when the result was served from cache, skipping the router LLM. */
  cacheHit: boolean;
  /** Wall-clock time spent in the routing resolution in milliseconds. */
  durationMs: number;
  // ---------------------------------------------------------------------------
  // Optional L2 / tool-granularity telemetry fields (ITEM B + D).
  // All optional so dashboards that don't use the embedding path are unaffected.
  // ---------------------------------------------------------------------------
  /** True when the L2 embedding fast-path ran and produced candidate results. */
  embeddingActivated?: boolean;
  /**
   * Number of tool candidates produced by the embedding retriever before the
   * post-embedding server or tool filtering step.
   */
  candidateToolCount?: number;
  /**
   * Granularity at which exclusions were applied ("server" or "tool").
   * Matches `ToolRoutingConfig.granularity`; present only when routing was
   * applied (outcome === "applied").
   */
  granularity?: "server" | "tool";
};

/** Parameters for `resolveToolRoutingExclusions()`. */
export type ToolRoutingResolutionParams = {
  /** Full catalog; always-include servers are filtered out internally. */
  catalog: ToolRoutingCatalogEntry[];
  /** Server ids never offered to the router. */
  alwaysIncludeServerIds: string[];
  /** Current user query (the stream input text, before memory enrichment). */
  userQuery: string;
  /** Instruction text placed before the user query. Defaults to the SDK built-in. */
  routerPromptPrefix?: string;
  /** Router LLM settings, already resolved against the stream call's options. */
  routerModel: ToolRoutingModelConfig;
  /** Timeout for the router call in milliseconds. */
  timeoutMs: number;
  /** Invokes the router LLM — `NeuroLink.generate` bound by the caller. */
  generateFn: (options: GenerateOptions) => Promise<GenerateResult>;
  /**
   * Optional callback invoked once per resolution with a structured summary of
   * the routing decision. Called on every return path (applied, skipped,
   * failed-open). Must never throw — any error inside is swallowed by
   * the resolver.
   */
  emitDecision?: (decision: ToolRoutingDecision) => void;
  // ---------------------------------------------------------------------------
  // L2 embedding fast-path parameters (ITEM B + D). All optional; omitting
  // them reproduces today's LLM-router-only / server-granularity behavior.
  // ---------------------------------------------------------------------------
  /**
   * Injected async function that converts an array of texts into embedding
   * vectors. Built by the caller (NeuroLink) from the configured embedding
   * provider so the resolver stays pure and free of provider imports.
   * When undefined the embedding fast-path is skipped entirely.
   */
  embedFn?: (texts: string[]) => Promise<number[][]>;
  /**
   * Embedding fast-path configuration forwarded from `ToolRoutingConfig`.
   * Only consulted when `embedFn` is provided.
   */
  embeddingConfig?: ToolRoutingEmbeddingConfig;
  /**
   * Routing granularity forwarded from `ToolRoutingConfig`. Default: "server".
   */
  granularity?: "server" | "tool";
  /**
   * Optional shared vector cache for the L2 embedding fast-path. When
   * supplied, tool embedding vectors computed on prior turns are reused rather
   * than re-fetched from the embedding provider on every call.
   *
   * The NeuroLink instance manages the lifecycle: it creates the Map once and
   * passes the same reference across turns. It clears the reference when the
   * tool catalog changes (via `setToolRoutingServers`) so stale vectors are
   * never used after a catalog update.
   */
  embeddingVectorCache?: Map<string, number[]>;
};

// ---------------------------------------------------------------------------
// L2 embedding fast-path internal result type (ITEM B + D).
// Lives here per Critical Rule 2 — all type aliases must be in src/lib/types/.
// ---------------------------------------------------------------------------

/**
 * Result of running the L2 embedding fast-path inside
 * `runEmbeddingFastPath()` (toolRouting.ts).
 *
 * `embeddingActivated: false` signals "fall back to LLM router". When true,
 * `excludedToolNames` is the final exclusion list and the caller returns it
 * directly without any LLM call.
 *
 * @internal
 */
export type ToolRoutingEmbeddingFastPathResult = {
  excludedToolNames: string[];
  embeddingActivated: boolean;
  candidateToolCount: number;
  granularity: "server" | "tool";
};

// ---------------------------------------------------------------------------
// Embedding-retrieval subsystem types (L2 fast-path — ITEM B)
// ---------------------------------------------------------------------------

/**
 * A single item in the tool retrieval catalog, pairing a tool name with the
 * text (tool description + server context) used to build its embedding vector.
 */
export type ToolRetrievalItem = {
  /** Fully-qualified tool name (e.g. `${serverId}_${toolName}`). */
  name: string;
  /** Descriptive text used as the embedding document for this tool. */
  text: string;
};

/**
 * One ranked result from `ToolEmbeddingIndex.rank()` or
 * `selectRelevantToolNames()`.
 */
export type ToolRetrievalRankedResult = {
  /** Tool name (mirrors `ToolRetrievalItem.name`). */
  name: string;
  /** Combined hybrid score (higher = more relevant). */
  score: number;
};

/**
 * Options passed to `selectRelevantToolNames()` — the high-level convenience
 * wrapper around `ToolEmbeddingIndex`.
 */
export type ToolRetrievalSelectOptions = {
  /** Maximum number of tool names to return. */
  topK: number;
  /** Optional weight override (defaults to `{ cosine: 0.8, bm25: 0.2 }`). */
  weights?: ToolRetrievalWeights;
  /**
   * Async function that converts an array of text strings into embedding
   * vectors. Must return one vector per input text in the same order.
   * Errors thrown here propagate to the caller (so it can fail open).
   */
  embedFn: (texts: string[]) => Promise<number[][]>;
  /**
   * Optional shared vector cache (keyed by text string). When supplied the
   * underlying `ToolEmbeddingIndex` reads from and writes to this Map so that
   * tool vectors computed on a prior call are reused on subsequent calls for
   * the same item text. Callers that want warm-cache behavior across turns
   * should pass the same Map instance each time.
   */
  vectorCache?: Map<string, number[]>;
  /**
   * Timeout for each embedding provider call in milliseconds. Default: 10000.
   */
  timeoutMs?: number;
};

// ---------------------------------------------------------------------------
// Internal BM25 types (used by toolRoutingEmbedding.ts; must live here per
// CLAUDE.md Critical Rule 2 — all type aliases belong in src/lib/types/).
// ---------------------------------------------------------------------------

/**
 * Precomputed per-document data used by the BM25 scorer inside
 * `ToolEmbeddingIndex`. Not part of the public SDK surface.
 *
 * @internal
 */
export type ToolRoutingBm25Doc = {
  tokens: string[];
  /** Frequency map: token → count (built once at index construction). */
  tf: Map<string, number>;
};
