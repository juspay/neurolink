/**
 * Tool policy resolution — the single, pure mapping from every tool-selection
 * surface (per-call legacy options + instance-level `tools` config) to one
 * ResolvedToolPolicy that the gate applies.
 *
 * Legacy semantics are preserved deliberately:
 * - `toolFilter: []` and `enabledToolNames: []` are no-ops (fail-open), as
 *   they always were.
 * - Malformed shapes (non-string-arrays) are ignored with a once-per-process
 *   WARN instead of throwing — some internal callers historically passed
 *   wrong shapes and relied on the silent no-op.
 * - `enabledToolNames` now filters the native tool set (its docs always
 *   promised this; it previously only filtered the system-prompt listing) —
 *   but ONLY when `toolFilter` is absent. When both are set, `toolFilter`
 *   alone bounds the native set, exactly as before this refactor: the native
 *   set must never become WIDER than a caller's `toolFilter`.
 *
 * New semantics:
 * - `tools.include: []` (the instance config surface) means NO tools
 *   (fail-closed); legacy empty arrays stay fail-open as above.
 * - A per-call `toolFilter` is bounded by `tools.include` — it can narrow
 *   the instance allowlist but never widen past it.
 * - Pattern entries containing `*` match as globs (e.g. `"github*"`) on ALL
 *   surfaces. Real tool names cannot contain `*` (MCP names are sanitized),
 *   so a legacy list entry with `*` previously matched nothing (dead entry);
 *   it now matches as a glob. Entries without `*` match exactly, unchanged.
 */

import type {
  ResolvedToolPolicy,
  ToolPolicyResolutionInput,
} from "../types/index.js";
import { logger } from "../utils/logger.js";

const warnedOnce = new Set<string>();

function warnOnce(
  key: string,
  message: string,
  detail?: Record<string, unknown>,
): void {
  if (!warnedOnce.has(key)) {
    warnedOnce.add(key);
    logger.warn(message, detail);
  }
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Compile a list of tool-name patterns into a matcher. Patterns without `*`
 * match exactly (case-sensitive, preserving legacy toolFilter semantics);
 * patterns containing `*` match as globs.
 */
export function toolNameMatcher(patterns: string[]): (name: string) => boolean {
  const exact = new Set<string>();
  const globs: RegExp[] = [];
  for (const pattern of patterns) {
    if (pattern.includes("*")) {
      // Split on RUNS of asterisks: "a**b" must compile to /^a.*b$/, not
      // /^a.*.*b$/ — adjacent .* pairs invite catastrophic backtracking on
      // long non-matching names (ReDoS).
      const source =
        "^" + pattern.split(/\*+/).map(escapeRegExp).join(".*") + "$";
      globs.push(new RegExp(source));
    } else {
      exact.add(pattern);
    }
  }
  return (name: string) => exact.has(name) || globs.some((g) => g.test(name));
}

/**
 * Normalize a possibly-malformed option value to a string array.
 * Returns undefined (and WARNs once per source) for anything that is not a
 * proper string array — preserving the historical silent-no-op behavior for
 * wrong shapes while making it observable. Used for the LEGACY per-call
 * surfaces only; the new config surface uses normalizeConfigList, which does
 * not fail open.
 */
function asStringArray(
  value: unknown,
  sourceName: string,
): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return value as string[];
  }
  warnOnce(
    `shape:${sourceName}`,
    `[ToolPolicy] Ignoring ${sourceName}: expected string[]`,
    { receivedType: typeof value },
  );
  return undefined;
}

/**
 * Normalize a `tools.include`/`tools.exclude` config value. Unlike the
 * legacy surfaces, the NEW config surface must not silently fail open — a
 * caller who fat-fingers `tools.include` intending to lock an instance down
 * must not get every tool exposed:
 * - a bare string is coerced to a one-element list (obvious intent),
 * - an array is salvaged to its string entries (dropping the rest, WARNed —
 *   for `include` this converges toward fewer tools, never more),
 * - anything else fails CLOSED for `include` (empty list = no tools) and is
 *   ignored-with-WARN for `exclude` (a denylist has no safe "closed" other
 *   than excluding everything, which would be equally surprising).
 */
function normalizeConfigList(
  value: unknown,
  sourceName: string,
  failClosed: boolean,
): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    warnOnce(
      `shape:${sourceName}`,
      `[ToolPolicy] ${sourceName} was a bare string; coercing to a one-element list`,
      { received: value },
    );
    return [value];
  }
  if (Array.isArray(value)) {
    const strings = value.filter((v): v is string => typeof v === "string");
    if (strings.length !== value.length) {
      warnOnce(
        `shape:${sourceName}`,
        `[ToolPolicy] Dropped ${value.length - strings.length} non-string entr(ies) from ${sourceName}`,
      );
    }
    return strings;
  }
  warnOnce(
    `shape:${sourceName}`,
    failClosed
      ? `[ToolPolicy] ${sourceName} is malformed (expected string[]); failing CLOSED — no tools will be sent until it is fixed`
      : `[ToolPolicy] Ignoring malformed ${sourceName}: expected string[]`,
    { receivedType: typeof value },
  );
  return failClosed ? [] : undefined;
}

/**
 * Resolve the effective tool policy for one request. Pure function — all
 * inputs are explicit, so the legacy→policy mapping is unit-testable as a
 * table.
 */
export function resolveToolPolicy(
  input: ToolPolicyResolutionInput,
): ResolvedToolPolicy {
  const { options, instanceConfig, builtinToolNames } = input;
  const sources: string[] = [];

  // --- enabled -------------------------------------------------------------
  let enabled = true;
  if (options.disableTools === true) {
    enabled = false;
    sources.push("options.disableTools");
  }
  if (instanceConfig?.enabled === false) {
    enabled = false;
    sources.push("tools.enabled");
  }

  // --- allowlist -----------------------------------------------------------
  // Legacy per-call allowlists: fail-open on empty (historical behavior).
  const toolFilter = asStringArray(options.toolFilter, "options.toolFilter");
  const enabledNames = asStringArray(
    options.enabledToolNames,
    "options.enabledToolNames",
  );
  let legacyInclude: string[] | undefined;
  if (toolFilter && toolFilter.length > 0) {
    // toolFilter alone bounds the native set — merging enabledToolNames in
    // as a union would WIDEN the set beyond toolFilter, breaking the
    // pre-refactor contract in the unsafe direction.
    legacyInclude = [...new Set(toolFilter)];
    sources.push("options.toolFilter");
    if (enabledNames && enabledNames.length > 0) {
      warnOnce(
        "both-allowlists",
        "[ToolPolicy] Both toolFilter and enabledToolNames are set; toolFilter bounds the native tool set and enabledToolNames is ignored for it (pre-existing contract).",
      );
    }
  } else if (enabledNames && enabledNames.length > 0) {
    legacyInclude = [...new Set(enabledNames)];
    sources.push("options.enabledToolNames");
  }

  // New instance allowlist: fail-closed on empty ([] = no tools) AND on
  // malformed shapes — a broken lockdown config must never expose all tools.
  const configInclude = normalizeConfigList(
    instanceConfig?.include,
    "tools.include",
    true,
  );
  if (configInclude !== undefined) {
    sources.push("tools.include");
  }

  let include: string[] | undefined;
  let includeBound: string[] | undefined;
  if (legacyInclude !== undefined && configInclude !== undefined) {
    // Per-call filter is bounded by the instance allowlist: a tool must
    // match BOTH lists. Kept as two matcher clauses (include AND
    // includeBound) because glob pattern lists cannot be losslessly
    // pre-intersected into one pattern array — filtering one list's pattern
    // STRINGS through the other list's matcher would zero out overlapping
    // globs like toolFilter:["github*"] vs include:["github_read*"].
    include = legacyInclude;
    includeBound = configInclude;
  } else {
    include = legacyInclude ?? configInclude;
  }

  // --- denylist ------------------------------------------------------------
  const exclude: string[] = [];
  const optExclude = asStringArray(
    options.excludeTools,
    "options.excludeTools",
  );
  if (optExclude && optExclude.length > 0) {
    exclude.push(...optExclude);
    sources.push("options.excludeTools");
  }
  const cfgExclude = normalizeConfigList(
    instanceConfig?.exclude,
    "tools.exclude",
    false,
  );
  if (cfgExclude && cfgExclude.length > 0) {
    exclude.push(...cfgExclude);
    sources.push("tools.exclude");
  }
  if (
    instanceConfig?.disableBuiltinTools === true &&
    builtinToolNames &&
    builtinToolNames.length > 0
  ) {
    exclude.push(...builtinToolNames);
    sources.push("tools.disableBuiltinTools");
  }

  // --- discovery -----------------------------------------------------------
  const discovery = instanceConfig?.discovery === true;
  if (discovery) {
    sources.push("tools.discovery");
  }

  return { enabled, include, includeBound, exclude, discovery, sources };
}
