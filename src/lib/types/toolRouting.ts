/**
 * Pre-call tool routing — configuration and catalog types.
 *
 * Host applications can register large numbers of custom tools (typically MCP
 * server tools) whose names are prefixed with their server id
 * (`${serverId}_${toolName}`). When tool routing is enabled, a cheap router
 * LLM call runs once per `stream()` turn, picks the servers relevant to the
 * user query, and the tools of every unpicked server are appended to the
 * request's `excludeTools` denylist before the main model call.
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

/** Constructor-level configuration for pre-call tool routing. */
export type ToolRoutingConfig = {
  /** Master switch. Routing runs only when true AND the server catalog is non-empty. */
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
};
