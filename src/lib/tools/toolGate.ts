/**
 * Tool gate — applies a ResolvedToolPolicy to a tools record. This is the
 * ONE place where include/exclude filtering of the native tool set happens;
 * every generate/stream path reaches it via BaseProvider.
 *
 * Generic over the tool value type so it works for AI-SDK Tool records,
 * ToolInfo listings, and provider wire formats alike.
 */

import type { ResolvedToolPolicy } from "../types/index.js";
import { toolNameMatcher } from "./toolPolicy.js";

/**
 * Filter a tools record according to the resolved policy.
 * Order: enabled kill-switch → include allowlist → exclude denylist.
 * Preserves the input record's key order for surviving tools (callers rely
 * on deterministic ordering for provider prompt-cache stability).
 */
export function applyToolGate<T>(
  tools: Record<string, T>,
  policy: ResolvedToolPolicy,
): Record<string, T> {
  if (!policy.enabled) {
    return {};
  }

  const include = policy.include;
  const includeBound = policy.includeBound;
  const hasExclude = policy.exclude.length > 0;
  if (include === undefined && includeBound === undefined && !hasExclude) {
    return tools;
  }

  const includeMatcher =
    include !== undefined ? toolNameMatcher(include) : undefined;
  // Secondary allowlist clause ANDed with `include` (see ResolvedToolPolicy):
  // a name must match BOTH when a per-call filter is bounded by the
  // instance-level tools.include.
  const boundMatcher =
    includeBound !== undefined ? toolNameMatcher(includeBound) : undefined;
  const excludeMatcher = hasExclude
    ? toolNameMatcher(policy.exclude)
    : undefined;

  // Null prototype: a tool named "__proto__" must become an own entry, not
  // a prototype mutation (mirrors BaseProvider.sortToolRecord).
  const result: Record<string, T> = Object.create(null) as Record<string, T>;
  for (const [name, tool] of Object.entries(tools)) {
    if (includeMatcher && !includeMatcher(name)) {
      continue;
    }
    if (boundMatcher && !boundMatcher(name)) {
      continue;
    }
    if (excludeMatcher && excludeMatcher(name)) {
      continue;
    }
    result[name] = tool;
  }
  return result;
}
