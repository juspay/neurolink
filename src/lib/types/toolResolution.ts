/**
 * Tool resolution types — the single tool-policy pipeline that decides which
 * tools are sent to a provider for a given request.
 *
 * One policy object is resolved per request from (a) per-call legacy options
 * (`toolFilter`, `excludeTools`, `enabledToolNames`, `disableTools`) and
 * (b) the instance-level `tools` config, then applied at the single gate in
 * `BaseProvider` that every generate/stream path passes through.
 */

import type { ToolConfig } from "./config.js";
import type { Tool } from "./tools.js";

/**
 * The resolved, merged tool policy for one request. Produced by
 * `resolveToolPolicy()` (src/lib/tools/toolPolicy.ts) and consumed by
 * `applyToolGate()` (src/lib/tools/toolGate.ts).
 */
export type ResolvedToolPolicy = {
  /** false = no tools at all for this request (drops caller-supplied tools too). */
  enabled: boolean;
  /**
   * Allowlist of tool-name patterns (exact names or `*` globs).
   * `undefined` = all tools pass. An empty array means "no tools" — it can
   * only come from the new `tools.include` config surface; legacy
   * `toolFilter: []` is normalized to `undefined` (fail-open, preserving
   * historical behavior) before it reaches here.
   */
  include?: string[];
  /**
   * Secondary allowlist clause ANDed with `include` — set when both a
   * legacy per-call allowlist and the instance `tools.include` are present.
   * Kept as a separate clause because two glob pattern lists cannot be
   * losslessly pre-intersected into a single pattern array (a name must
   * match BOTH lists to pass).
   */
  includeBound?: string[];
  /** Denylist of tool-name patterns (exact names or `*` globs), applied after include. */
  exclude: string[];
  /** Defer external MCP tool schemas behind the search_tools meta-tool. */
  discovery: boolean;
  /** Which option/config sources contributed to this policy (telemetry/debugging). */
  sources: string[];
};

/**
 * Inputs to `resolveToolPolicy()`. Kept as a named type so the mapping is
 * unit-testable as a pure function.
 */
export type ToolPolicyResolutionInput = {
  /** Per-call options (the legacy per-call filtering surface). */
  options: {
    disableTools?: boolean;
    toolFilter?: string[];
    enabledToolNames?: string[];
    excludeTools?: string[];
  };
  /** Instance-level `tools` config passed to the NeuroLink constructor. */
  instanceConfig?: ToolConfig;
  /**
   * Names of the built-in (direct) tools of the calling provider — used to
   * honor `tools.disableBuiltinTools` without this module importing the
   * direct-tools registry.
   */
  builtinToolNames?: string[];
};

/**
 * One entry in the deferred-tool catalog embedded in the `search_tools`
 * meta-tool description when `tools.discovery` is enabled.
 */
export type DeferredToolIndexEntry = {
  name: string;
  /** One-line description (truncated) shown in the search_tools catalog. */
  summary: string;
  /** Originating MCP server id, when known. */
  serverId?: string;
};

/**
 * Resolver attached (under a symbol key, invisible to enumeration) to the
 * hot tool record by `partitionToolsForDiscovery`. Given a deferred tool's
 * name it hydrates that tool into the record, persists the session pin, and
 * returns it — `undefined` when the name is not in the deferred catalog.
 * Native agent loops call it on a dispatch miss so a model that calls a
 * cataloged tool directly (without `search_tools` first) still succeeds.
 */
export type DeferredToolResolver = (name: string) => Tool | undefined;
