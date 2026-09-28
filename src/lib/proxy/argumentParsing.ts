/**
 * Parses a Codex tool call's raw argument text into the record a Claude
 * `tool_use.input` needs, kind-aware: a `function` tool's `arguments` is
 * JSON-Schema-shaped JSON text; a `custom` tool has no JSON at all — only the
 * raw grammar-constrained string that `mapCodexCustomToolToClaude`'s
 * single-field `input_schema` (`codexOutboundFallback.ts` §3.4) expects
 * wrapped as `{ input: raw }`. Centralized so both call sites (a
 * `function_call` item's `arguments` and a `custom_tool_call` item's `input`)
 * go through the same rule rather than two hand-rolled wrappings.
 */
import type { CodexNativeToolKind } from "../types/index.js";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseToolArguments(
  raw: string,
  kind: CodexNativeToolKind,
): Record<string, unknown> {
  if (kind === "custom") {
    return { input: raw };
  }
  // Empty arguments is the documented zero-argument-call shape, not
  // malformed input — it must not be wrapped as `{ input: "" }`.
  if (raw === "") {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isPlainRecord(parsed)) {
      return parsed;
    }
  } catch {
    // fall through — not JSON at all (e.g. a stray shell-command string)
  }
  return { input: raw };
}
