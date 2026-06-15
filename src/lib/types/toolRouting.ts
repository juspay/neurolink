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
};

/** Catalog entry pairing a server descriptor with its registered tool names. */
export type ToolRoutingCatalogEntry = {
  id: string;
  description: string;
  /** Registered tool names for this server, i.e. `${serverId}_${toolName}`. */
  toolNames: string[];
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
};
